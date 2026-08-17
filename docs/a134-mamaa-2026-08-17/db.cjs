const fs=require('fs');
const {Client}=require('pg');
function url(){
  const t=fs.readFileSync(require('path').resolve(__dirname,'../../.env.psql'),'utf8');
  const m=t.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  return m[1].trim();
}
async function q(sql,params){
  const c=new Client({connectionString:url(),ssl:{rejectUnauthorized:false}});
  await c.connect();
  try{ const r=await c.query(sql,params); return r.rows; } finally { await c.end(); }
}
module.exports={q};
if(require.main===module){
  q(process.argv[2]).then(r=>console.log(JSON.stringify(r,null,1))).catch(e=>{console.error('ERR',e.message);process.exit(1)});
}
