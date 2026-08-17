const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();
const sql=process.argv[2]||fs.readFileSync(process.argv[3],'utf8');
(async()=>{const c=new Client({connectionString:url});await c.connect();
const r=await c.query(sql);
if(process.env.JSON) console.log(JSON.stringify(r.rows,null,1));
else{ if(r.rows.length){console.log(r.fields.map(f=>f.name).join('\t'));for(const row of r.rows)console.log(r.fields.map(f=>String(row[f.name]).replace(/\n/g,'\\n')).join('\t'));}
console.error('rows: '+r.rowCount);}
await c.end();})().catch(e=>{console.error(e.message);process.exit(1)});
