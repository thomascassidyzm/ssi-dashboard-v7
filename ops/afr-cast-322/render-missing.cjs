const {Client}=require('pg');
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
const S='(10,27,42,51,66,68,69,108,115,122,131,158,199,202,262)';
const {rows}=await c.query(`select target_text t from course_practice_phrases where course_code='afr_for_eng' and seed_number in ${S} and (target1_audio_id is null or target2_audio_id is null) union select target_text from course_legos where course_code='afr_for_eng' and seed_number in ${S} and (target1_audio_id is null or target2_audio_id is null)`);
let spent=0,lib=0,fail=[];
for(const role of ['target1','target2'])for(const {t} of rows){
 const r=await fetch('http://localhost:3470/api/audio/render',{method:'POST',headers:{'Content-Type':'application/json','x-agent-id':'job322-afr-cast'},body:JSON.stringify({courseCode:'afr_for_eng',role,text:t,purpose:'job322: voice re-chunked afr LEGOs/phrases (Tom 2026-10-13)',voiceBound:true})});
 const o=await r.json().catch(()=>({}));
 if(!o.ok){fail.push([role,t,r.status,o.error||o.code]);if(fail.length>5){console.log('STOP',fail);process.exit(2)}continue}
 spent+=o.charsSpent||0;if(o.source==='library')lib++;
}
console.log({spent,lib,total:rows.length*2,fail});await c.end()})()
