// Refit the duration models from scratch on this course + voice, rather than
// inherit #874's constants. Two populations, fitted separately because they have
// different frames:
//   presentation — carries the ~3.1s template frame (quotes, 'ඉතින්', pauses)
//   known        — bare phrase text, no frame
// Then measure the '...' sub-population, because Azure voices a literal ellipsis
// as a real pause the char-count model does not know about.
const {q}=require('./db.cjs');
const CORRUPT=/මමා|මමට|මමම|මMA|[ऀ-ॿ]|ඥ|මමතා|ෙවෙනස|දිහා|නනිකු/;

function fit(pts){                       // ordinary least squares on chars -> ms
  const n=pts.length;
  const sx=pts.reduce((a,p)=>a+p.x,0), sy=pts.reduce((a,p)=>a+p.y,0);
  const sxx=pts.reduce((a,p)=>a+p.x*p.x,0), sxy=pts.reduce((a,p)=>a+p.x*p.y,0);
  const slope=(n*sxy-sx*sy)/(n*sxx-sx*sx), intercept=(sy-slope*sx)/n;
  const res=pts.map(p=>p.y-(intercept+slope*p.x));
  const sd=Math.sqrt(res.reduce((a,r)=>a+r*r,0)/(n-2));
  return {intercept:+intercept.toFixed(1), slope:+slope.toFixed(2), sd:Math.round(sd), n};
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const sdev=a=>{const m=mean(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1))};

(async()=>{
  for(const role of ['presentation','known']){
    // page it: ordered full-table course_audio reads time out at 8s
    let rows=[], off=0;
    while(true){
      const b=await q(`select text, duration_ms from course_audio
        where course_code='eng_for_sin' and language='sin' and role=$1
          and voice_id='azure_si-LK-SameeraNeural' and duration_ms is not null
        limit 1000 offset $2`,[role,off]);
      rows=rows.concat(b); if(b.length<1000) break; off+=1000;
    }
    const clean=rows.filter(r=>!CORRUPT.test(r.text));
    const noEll=clean.filter(r=>!r.text.includes('...'));
    const ell=clean.filter(r=>r.text.includes('...'));
    const m=fit(noEll.map(r=>({x:r.text.length,y:r.duration_ms})));
    console.log(`\n=== role='${role}'  total=${rows.length} clean=${clean.length} (excluded ${rows.length-clean.length} corrupt) ===`);
    console.log(`  BASE MODEL (no '...'): ms = ${m.intercept} + ${m.slope} * chars   sd=${m.sd}  n=${m.n}`);
    const z=r=>(r.duration_ms-(m.intercept+m.slope*r.text.length))/m.sd;
    const zn=noEll.map(z), ze=ell.map(z);
    console.log(`  without '...': n=${zn.length} mean z=${mean(zn).toFixed(2)} sd=${sdev(zn).toFixed(2)} |z|>3 in ${(zn.filter(v=>Math.abs(v)>3).length/zn.length*100).toFixed(1)}%`);
    if(ell.length>1)
      console.log(`  with    '...': n=${ze.length} mean z=${mean(ze).toFixed(2)} sd=${sdev(ze).toFixed(2)} |z|>3 in ${(ze.filter(v=>Math.abs(v)>3).length/ze.length*100).toFixed(1)}%`);
    else console.log(`  with    '...': n=${ell.length} (too few to model)`);
  }
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
