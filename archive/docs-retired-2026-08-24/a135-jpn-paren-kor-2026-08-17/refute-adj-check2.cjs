const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();
(async()=>{
  const c=new Client({connectionString:url});
  await c.connect();
  await c.query('BEGIN TRANSACTION READ ONLY');
  for (const needle of ['다는 것을 알아요', '불친절하게', '조용하게', '어렵게', '긴장하게', '피곤하게']) {
    const r = await c.query(`select min(seed_number) s, count(*) c from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    const l = await c.query(`select count(*) c from course_legos where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    console.log(needle, '| phrase first seed:', r.rows[0].s, 'n='+r.rows[0].c, '| lego count:', l.rows[0].c);
  }
  await c.query('ROLLBACK');
  await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
