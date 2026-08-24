const {URL,KEY}=require('./db.cjs');
const fs=require('fs');
const plan=require('../../docs/greek-label-strip-2026-08-11/before-image.json').plan;
const after=require('./pres_after.json');
const legos=require('./legos.json');
const legoById=new Map(legos.map(l=>[l.lego_id,l]));
const byId=new Map(after.map(a=>[a.id,a]));
const A=plan.filter(r=>byId.get(r.audio_id)?.text!==r.after);
const DRY=!process.argv.includes('--apply');
const snap=A.map(r=>({lego_id:r.lego_id,before_presentation_audio_id:legoById.get(r.lego_id).presentation_audio_id,after_presentation_audio_id:r.twin_audio_ids[0],dirty_audio_id:r.audio_id,dirty_text:r.before,clean_text:r.after}));
if(!DRY) fs.writeFileSync(__dirname+'/../../docs/greek-label-strip-2026-08-11/lego-link-before-image.json',JSON.stringify({rows:snap.length,snap},null,1));
(async()=>{let ok=0,fail=0;
 for(const s of snap){
  if(DRY){console.log('DRY',s.lego_id,s.before_presentation_audio_id,'->',s.after_presentation_audio_id);ok++;continue;}
  const res=await fetch(`${URL}/rest/v1/course_legos?course_code=eq.ell_for_eng&lego_id=eq.${s.lego_id}`,{method:'PATCH',
    headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},
    body:JSON.stringify({presentation_audio_id:s.after_presentation_audio_id})});
  if(!res.ok){fail++;console.error('FAIL',s.lego_id,res.status,await res.text());continue;}
  const [row]=await res.json();
  if(row.presentation_audio_id!==s.after_presentation_audio_id){fail++;console.error('MISMATCH',s.lego_id);continue;}
  ok++;
 }
 console.log(DRY?'DRY':'APPLIED','ok',ok,'fail',fail);
})();
