const {q}=require('./db.cjs'); const props=require('./proposals.json');
(async()=>{
 const olds=[...new Set(props.map(p=>p.old))];
 const frags=['අපිේ','ළමාවිල','මමා','ममා','ිකියලා','ෙමෙක','දිකින','මMA'];
 console.log('=== course_audio rows whose TEXT contains a fragment I am repairing');
 for(const f of frags){
  const r=await q(`select id::text,role,text,lego_id,duration_ms from course_audio
     where course_code='eng_for_sin' and text like $1 limit 200`,['%'+f+'%']);
  const byRole={}; r.forEach(x=>byRole[x.role]=(byRole[x.role]||0)+1);
  console.log(`  "${f}": ${r.length} clips  ${JSON.stringify(byRole)}`);
  r.filter(x=>x.role!=='known').slice(0,6).forEach(x=>console.log(`      [${x.role}] ${x.id} lego=${x.lego_id} :: ${x.text.slice(0,90)}`));
 }
 console.log('\n=== which of those clips are LINKED (learner-reachable)?');
 for(const f of frags){
  const r=await q(`select ca.id, ca.role, ca.text,
      (select count(*) from course_practice_phrases p where p.known_audio_id=ca.id::uuid) pk,
      (select count(*) from course_legos l where l.known_audio_id=ca.id::uuid) lk,
      (select count(*) from course_legos l where l.presentation_audio_id=ca.id::uuid) lp,
      (select count(*) from course_seeds s where s.known_audio_id=ca.id::uuid) sk
    from course_audio ca where ca.course_code='eng_for_sin' and ca.text like $1 limit 200`,['%'+f+'%']);
  const linked=r.filter(x=>+x.pk+ +x.lk+ +x.lp+ +x.sk>0);
  linked.filter(x=>x.role!=='known').forEach(x=>console.log('      LINKED NON-KNOWN ['+x.role+'] '+x.id+' :: '+x.text.slice(0,110)));
  console.log(`  "${f}": ${linked.length}/${r.length} linked  ` +
    JSON.stringify(linked.reduce((a,x)=>{const k=x.role+(+x.lp>0?'/lego-pres':'')+(+x.sk>0?'/seed':'');a[k]=(a[k]||0)+1;return a;},{})));
 }
})();
