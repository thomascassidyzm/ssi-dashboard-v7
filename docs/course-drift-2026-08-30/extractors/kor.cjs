const q=require('./q.cjs');
// four unambiguous honorific endings (per the survey's method): 세요/셨/시고/시는 etc.
const HON=/(세요|십니다|셨|시고|시는|시면|실 |십시오|세여)/;
(async()=>{
 const course=process.argv[2];
 const legos=await q("select lego_id,seed_number,lego_index,known_text,target_text,created_at from course_legos where course_code=$1 order by seed_number,lego_index",[course]);
 const phr=await q("select id,seed_number,lego_index,phrase_role,known_text,target_text,created_at from course_practice_phrases where course_code=$1 and phrase_role<>'component'",[course]);
 const key=r=>r.seed_number+'|'+r.lego_index;
 const by={}; for(const p of phr){(by[key(p)]=by[key(p)]||[]).push(p);}
 const hits=[];
 for(const l of legos){
   const lh=HON.test(l.target_text||'');
   const ds=(by[key(l)]||[]);
   const dh=ds.filter(d=>HON.test(d.target_text||''));
   if(!lh && dh.length===0) continue;
   hits.push({lego_id:l.lego_id,seed:l.seed_number,lego_known:l.known_text,lego_target:l.target_text,lego_hon:lh,lego_created:String(l.created_at).slice(0,10),
     n_drills:ds.length,n_drills_hon:dh.length,
     disagreeing:ds.filter(d=>HON.test(d.target_text||'')!==lh).map(d=>({phrase_id:d.id,role:d.phrase_role,known:d.known_text,target:d.target_text,hon:HON.test(d.target_text||''),created:String(d.created_at).slice(0,10)}))});
 }
 console.error(course,'lessons touching honorific:',hits.length,'lessons with disagreement:',hits.filter(h=>h.disagreeing.length).length,'disagreeing drills:',hits.reduce((a,h)=>a+h.disagreeing.length,0));
 process.stdout.write(JSON.stringify(hits,null,1));
})();
