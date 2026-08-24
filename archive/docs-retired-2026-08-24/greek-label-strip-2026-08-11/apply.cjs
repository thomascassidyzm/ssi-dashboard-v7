const {URL,KEY}=require('./db.cjs');
const plan=require('../../docs/greek-label-strip-2026-08-11/before-image.json').plan;
const DRY=!process.argv.includes('--apply');
(async()=>{
 let ok=0,fail=0;
 for(const r of plan){
   if(DRY){console.log('DRY',r.lego_id,JSON.stringify(r.before),'->',JSON.stringify(r.after));ok++;continue;}
   const res=await fetch(`${URL}/rest/v1/course_audio?id=eq.${r.audio_id}`,{method:'PATCH',
     headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},
     body:JSON.stringify({text:r.after})});
   if(!res.ok){fail++;console.error('FAIL',r.lego_id,res.status,await res.text());continue;}
   const [row]=await res.json();
   if(row.text!==r.after){fail++;console.error('MISMATCH',r.lego_id,row.text);continue;}
   ok++;
 }
 console.log(DRY?'DRY RUN':'APPLIED','ok',ok,'fail',fail);
})();
