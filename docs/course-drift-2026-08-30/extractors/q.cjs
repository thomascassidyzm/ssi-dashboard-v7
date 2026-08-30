const fs=require('fs');const {Client}=require('pg');
const url=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8').match(/DATABASE_URL=(.*)/)[1].trim().replace(/^["']|["']$/g,'');
module.exports=async(sql,params)=>{const c=new Client({connectionString:url});await c.connect();const r=await c.query(sql,params);await c.end();return r.rows;};
