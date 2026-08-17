const {q}=require('./db.cjs'); const props=require('./proposals.json');
(async()=>{
 let same=0,drift=0,done=0;
 for(const p of props){
  let cur,link;
  if(p.layer==='phrase'){const r=(await q(`select known_text,known_audio_id::text a from course_practice_phrases where id=$1`,[p.id]))[0];cur=r.known_text;link=r.a;}
  else if(p.layer==='lego'){const r=(await q(`select known_text,known_audio_id::text a from course_legos where id=$1`,[p.id]))[0];cur=r.known_text;link=r.a;}
  else {const r=(await q(`select known_text,known_audio_id::text a from course_seeds where course_code='eng_for_sin' and seed_number=398`))[0];cur=r.known_text;link=r.a;}
  const st = cur===p.old?'UNCHANGED': cur===p.new?'ALREADY-MY-TARGET':'DRIFTED';
  if(st==='UNCHANGED')same++; else if(st==='ALREADY-MY-TARGET')done++; else {drift++;
    console.log(`DRIFT ${String(p.id).replace('eng_for_sin:','')}\n   expected old: ${p.old}\n   found now   : ${cur}\n   my target   : ${p.new}\n   link now    : ${link}`);}
 }
 console.log(`\nunchanged ${same} | drifted ${drift} | already-my-target ${done} | total ${props.length}`);
})();
