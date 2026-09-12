require('dotenv').config({quiet:true});
const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_KEY;
const H={apikey:k,Authorization:'Bearer '+k};
(async()=>{
// count course_audio rows per course, grouped by voice provider prefix
const courses=await (await fetch(`${u}/rest/v1/courses?select=course_code,target_lang,known_lang,new_app_status,seed_count,voice_config&order=course_code`,{headers:H})).json();
console.error('courses',courses.length);
const out=[];
for(const c of courses){
  const r=await fetch(`${u}/rest/v1/course_audio?course_code=eq.${c.course_code}&select=id`,{headers:{...H,Prefer:'count=exact',Range:'0-0'}});
  const cr=r.headers.get('content-range')||'';
  const n=parseInt((cr.split('/')[1]||'0'),10)||0;
  out.push({course:c.course_code,tgt:c.target_lang,known:c.known_lang,status:c.new_app_status,seeds:c.seed_count,audio:n,vc:c.voice_config||{}});
  process.stderr.write('.');
}
require('fs').writeFileSync(process.env.CS_SCRATCH+'/audiocounts.json',JSON.stringify(out,null,1));
console.error('\ndone');
})();
