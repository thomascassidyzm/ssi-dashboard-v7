const {q}=require('./db.cjs');
(async()=>{
 for(const s of process.argv.slice(2).map(Number)){
  const l=await q(`select lego_index,known_text,target_text,is_new from course_legos where course_code='eng_for_sin' and seed_number=$1 order by lego_index`,[s]);
  const sd=await q(`select known_text,target_text from course_seeds where course_code='eng_for_sin' and seed_number=$1`,[s]);
  const p=await q(`select id,known_text,target_text from course_practice_phrases where course_code='eng_for_sin' and seed_number=$1 order by id`,[s]);
  console.log('\n########## SEED '+s);
  sd.forEach(r=>console.log('SEED: '+r.known_text+'  =  '+r.target_text));
  l.forEach(r=>console.log('CARD L'+r.lego_index+' new='+r.is_new+': '+r.known_text+'  =  '+r.target_text));
  p.forEach(r=>console.log('  '+r.id.replace('eng_for_sin:','')+': '+r.known_text+'  =  '+r.target_text));
 }
})();
