const {q}=require('./db.cjs'); const props=require('./proposals.json');
const norm=s=>(s||'').replace(/[.?,!]/g,'').replace(/\s+/g,' ').trim();
(async()=>{
 const P=await q(`select id,seed_number,known_text,target_text from course_practice_phrases where course_code='eng_for_sin'`);
 const L=await q(`select seed_number,lego_index,known_text,target_text,is_new from course_legos where course_code='eng_for_sin'`);
 const S=await q(`select seed_number,known_text,target_text from course_seeds where course_code='eng_for_sin' and known_text is not null`);
 const all=[...P.map(r=>({k:r.known_text,t:r.target_text,w:'phrase '+r.id.slice(12)})),
            ...L.map(r=>({k:r.known_text,t:r.target_text,w:'lego s'+r.seed_number+'L'+r.lego_index})),
            ...S.map(r=>({k:r.known_text,t:r.target_text,w:'seed s'+r.seed_number}))];
 const changedKeys=new Set(props.map(p=>p.layer+':'+p.id));

 console.log('=== A3: does the course re-introduce an already-taught token in later is_new legos?');
 for(const tok of ['අපිට','මම','ඒ']){
   const n=L.filter(r=>r.is_new && (r.known_text||'').split(' ').includes(tok)).length;
   const nAny=L.filter(r=>r.is_new && (r.known_text||'').includes(tok)).length;
   console.log(`   "${tok}": is_new legos containing it as a whole token = ${n}; as a substring = ${nAny}`);
 }
 console.log('\n=== A4/ZUT: new known_text colliding with an existing known_text that has a DIFFERENT target');
 let hard=0, soft=0;
 for(const p of props){
   const nk=norm(p.new);
   const coll=all.filter(r=>norm(r.k)===nk && norm(r.t)!==norm(p.target));
   const same=all.filter(r=>norm(r.k)===nk && norm(r.t)===norm(p.target));
   if(coll.length){hard++; console.log(`   HARD ZUT ${p.id}: "${p.new}" = "${p.target}"  collides with:`);
     coll.forEach(c=>console.log(`        ${c.w}: "${c.k}" = "${c.t}"`));}
   else if(same.length) {soft++; console.log(`   dup-ok  ${String(p.id).slice(12)}: identical known+target already at ${same.map(s=>s.w).join(', ')}`);}
 }
 console.log(`   HARD ZUT hits: ${hard}   benign duplicates: ${soft}`);

 console.log('\n=== also: do the NEW strings collide WITHIN my own proposal set?');
 const m={}; for(const p of props){const k=norm(p.new); (m[k]=m[k]||[]).push(p);}
 Object.entries(m).filter(([k,v])=>v.length>1).forEach(([k,v])=>{
   const ts=new Set(v.map(x=>norm(x.target)));
   console.log(`   "${k}" x${v.length} targets=${JSON.stringify([...ts])} ${ts.size>1?'<-- INTERNAL ZUT HIT':'(ok)'}`);
 });
})();
