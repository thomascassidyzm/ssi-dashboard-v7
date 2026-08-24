const {q}=require('./db.cjs');
(async()=>{
  const l=await q(`select seed_number,lego_index,known_text,target_text,is_new from course_legos
    where course_code='eng_for_sin' order by seed_number,lego_index`);
  const needles=process.argv.slice(2);
  for(const n of needles){
    const hits=l.filter(r=>(r.known_text||'').includes(n));
    console.log('=== '+n+' : '+hits.length+' legos');
    hits.slice(0,12).forEach(r=>console.log('   s'+r.seed_number+' L'+r.lego_index+' new='+r.is_new+'  '+r.known_text+'  = '+r.target_text));
  }
})();
