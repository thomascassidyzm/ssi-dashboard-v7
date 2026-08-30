const {q}=require('./db.cjs');
(async()=>{
 let rows=[],off=0;
 for(;;){ const r=await q(`select text,duration_ms from course_audio
    where course_code='eng_for_sin' and role='known' and language='sin' and duration_ms is not null
    order by id limit 4000 offset ${off}`); rows=rows.concat(r); if(r.length<4000) break; off+=4000; }
 console.log('n raw =',rows.length);
 const d=rows.filter(r=>!r.text.includes('...')).map(r=>({x:r.text.length,y:r.duration_ms}));
 const fit=(d)=>{const n=d.length,sx=d.reduce((a,b)=>a+b.x,0),sy=d.reduce((a,b)=>a+b.y,0),
   sxy=d.reduce((a,b)=>a+b.x*b.y,0),sxx=d.reduce((a,b)=>a+b.x*b.x,0);
   const m=(n*sxy-sx*sy)/(n*sxx-sx*sx), c=(sy-m*sx)/n;
   const res=d.map(p=>p.y-(c+m*p.x)); const mu=res.reduce((a,b)=>a+b,0)/n;
   const sd=Math.sqrt(res.reduce((a,b)=>a+(b-mu)**2,0)/(n-1));
   return {n,intercept:+c.toFixed(1),slope:+m.toFixed(2),sd:+sd.toFixed(1)};};
 let f=fit(d); console.log('pass1 (no ellipsis):',JSON.stringify(f));
 const d2=d.filter(p=>Math.abs(p.y-(f.intercept+f.slope*p.x))<3*f.sd);
 f=fit(d2); console.log('pass2 (3sd trimmed) :',JSON.stringify(f));
 console.log('brief claimed        : {intercept:1398.0, slope:45.58, sd:149.6, n:13301}');
 const ell=rows.filter(r=>r.text.includes('...'));
 if(ell.length){const z=ell.map(r=>(r.duration_ms-(f.intercept+f.slope*r.text.length))/f.sd);
   console.log('ellipsis clips n='+ell.length+' mean z='+(z.reduce((a,b)=>a+b,0)/z.length).toFixed(2));}
 require('fs').writeFileSync(__dirname+'/rate.json',JSON.stringify(f));
})();
