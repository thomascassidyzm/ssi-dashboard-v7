const {q}=require('./db.cjs');
(async()=>{
 const frags=['අපිේ','ළමාවිල','ममා','ිකියලා','ෙමෙක','දිකින','මMA'];
 for(const f of frags){
  const r=await q(`select ca.id, ca.role, ca.text,
      (select count(*) from course_practice_phrases p where p.known_audio_id = ca.id) pk,
      (select count(*) from course_legos l where l.known_audio_id = ca.id) lk,
      (select count(*) from course_legos l2 where l2.presentation_audio_id = ca.id::text) lp,
      (select count(*) from course_seeds s where s.known_audio_id = ca.id) sk
    from course_audio ca where ca.course_code='eng_for_sin' and ca.text like $1`, ['%'+f+'%']);
  const linked=r.filter(x=>+x.pk + +x.lk + +x.lp + +x.sk > 0);
  console.log(`\n"${f}": ${r.length} clips, ${linked.length} LEARNER-REACHABLE`);
  linked.forEach(x=>console.log(`   [${x.role}] ${x.id} phrase=${x.pk} legoKnown=${x.lk} legoPres=${x.lp} seed=${x.sk}\n        ${x.text.slice(0,120)}`));
 }
})();
