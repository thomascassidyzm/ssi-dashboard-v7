const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();
(async()=>{
  const c=new Client({connectionString:url});
  await c.connect();
  await c.query('BEGIN TRANSACTION READ ONLY');
  for (const needle of ['더 많은 시간이 필요', '다고 생각해요', '더 자주', '말해야 한다', '필요하면', '일할 때']) {
    const r = await c.query(`select min(seed_number) s, count(*) c from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    console.log(needle, '| phrase first seed:', r.rows[0].s, 'n='+r.rows[0].c);
  }
  await c.query('ROLLBACK');
  await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
