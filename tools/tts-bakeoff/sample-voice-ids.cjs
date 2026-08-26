require('dotenv').config({quiet:true});
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_KEY;
const H={apikey:k,Authorization:'Bearer '+k};
(async()=>{
const courses=JSON.parse(require('fs').readFileSync(process.env.CS_SCRATCH+'/audiocounts.json','utf8')).filter(c=>c.audio>0);
const res=[];
for(const c of courses){
  // sample voice_ids: use PostgREST to get distinct-ish by pulling a capped page
  const r=await fetch(`${u}/rest/v1/course_audio?course_code=eq.${c.course}&select=voice_id&limit=4000&order=id`,{headers:H});
  const rows=await r.json();
  const tally={};
  for(const x of rows){const v=x.voice_id||'(null)';tally[v]=(tally[v]||0)+1;}
  res.push({course:c.course,tgt:c.tgt,status:c.status,audio:c.audio,sampled:rows.length,voices:tally});
  process.stderr.write('.');
}
require('fs').writeFileSync(process.env.CS_SCRATCH+'/voicesplit.json',JSON.stringify(res,null,1));
console.error('\ndone',res.length);
})();
