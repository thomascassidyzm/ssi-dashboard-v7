require('dotenv').config({path:'/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const URL=process.env.SUPABASE_URL, KEY=process.env.SUPABASE_SERVICE_KEY;
async function q(path){
  const r=await fetch(`${URL}/rest/v1/${path}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,Prefer:'count=exact'}});
  if(!r.ok) throw new Error(r.status+' '+await r.text());
  return {rows: await r.json(), count: r.headers.get('content-range')};
}
async function all(table, params, page=1000){
  let out=[],off=0;
  for(;;){const {rows}=await q(`${table}?${params}&limit=${page}&offset=${off}`);out=out.concat(rows);if(rows.length<page)break;off+=page;}
  return out;
}
module.exports={q,all,URL,KEY};
