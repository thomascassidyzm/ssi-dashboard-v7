require('dotenv').config();
const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_KEY;
async function q(path){const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact'}});const t=await r.text();return {status:r.status,range:r.headers.get('content-range'),body:t};}
module.exports={q};
if(require.main===module){q(process.argv[2]).then(r=>{console.log(r.status,r.range);console.log(r.body.slice(0,20000));});}
