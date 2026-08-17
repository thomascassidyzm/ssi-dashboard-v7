const {q}=require('./db.cjs');
(async()=>{
  const p=await q(`select id,seed_number,known_text,target_text from course_practice_phrases where course_code='eng_for_sin'`);
  const l=await q(`select seed_number,lego_index,known_text,target_text,is_new from course_legos where course_code='eng_for_sin'`);
  const s=await q(`select seed_number,known_text,target_text from course_seeds where course_code='eng_for_sin' and known_text is not null`);
  for(const n of process.argv.slice(2)){
    const pp=p.filter(r=>(r.known_text||'').includes(n));
    const ll=l.filter(r=>(r.known_text||'').includes(n));
    const ss=s.filter(r=>(r.known_text||'').includes(n));
    console.log(`\n=== "${n}"  phrases=${pp.length} legos=${ll.length} seeds=${ss.length}`);
    const firstLego = ll.sort((a,b)=>a.seed_number-b.seed_number)[0];
    if(firstLego) console.log('   first lego: s'+firstLego.seed_number+' '+firstLego.known_text+' = '+firstLego.target_text);
    pp.slice(0,6).forEach(r=>console.log('   p s'+r.seed_number+': '+r.known_text+'  =  '+r.target_text));
    ss.slice(0,4).forEach(r=>console.log('   S s'+r.seed_number+': '+r.known_text+'  =  '+r.target_text));
  }
})();
