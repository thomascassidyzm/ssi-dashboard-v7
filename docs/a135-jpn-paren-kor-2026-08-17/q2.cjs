const fs=require('fs');const {Client}=require('pg');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8'))[1].trim();
(async()=>{const c=new Client({connectionString:url});await c.connect();
await c.query('begin read only');
const rs=await c.query(process.argv[2]);
const r=rs[rs.length-1]||rs;
console.log(JSON.stringify(r.rows,null,1));
await c.query('rollback');await c.end();})().catch(e=>{console.error(e.message);process.exit(1)});
