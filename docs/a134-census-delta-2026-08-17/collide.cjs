const {q}=require('./db.cjs'); const props=require('./proposals.json'); const fs=require('fs');
const VOICE='azure_si-LK-SameeraNeural';
(async()=>{
 const out=[];
 for(const p of props){
   const n=(await q('select normalize_text($1) t',[p.new]))[0].t;
   const hit=await q(`select id, text, duration_ms, s3_key from course_audio
      where course_code='eng_for_sin' and text_normalized=$1 and language=canonical_language('sin')
        and role='known' and voice_id=canonical_voice_id($2)`,[n,VOICE]);
   out.push({...p, norm:n, existing: hit[0]||null});
 }
 // internal collisions among my own new texts
 const m={}; out.forEach(o=>(m[o.norm]=m[o.norm]||[]).push(o));
 console.log('=== internal collisions (same normalize_text within my batch) ===');
 Object.entries(m).filter(([k,v])=>v.length>1).forEach(([k,v])=>
   console.log(`  "${k}"\n     ${v.map(x=>x.layer+' '+String(x.id).replace('eng_for_sin:','')).join('\n     ')}\n     -> render ONCE, point all at one clip`));
 console.log('\n=== collisions with an EXISTING healthy clip ===');
 const reuse=out.filter(o=>o.existing);
 if(!reuse.length) console.log('  none');
 reuse.forEach(o=>console.log(`  ${String(o.id).replace('eng_for_sin:','')} -> REUSE ${o.existing.id} (${o.existing.duration_ms}ms) :: ${o.existing.text}`));
 fs.writeFileSync(__dirname+'/collide.json',JSON.stringify(out,null,1));
 console.log(`\ntotal rows ${out.length}; distinct texts to render ${Object.keys(m).length}; reusable ${reuse.length}`);
})();
