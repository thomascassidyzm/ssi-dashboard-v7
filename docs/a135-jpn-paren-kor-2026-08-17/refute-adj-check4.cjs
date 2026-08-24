const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();
(async()=>{
  const c=new Client({connectionString:url});
  await c.connect();
  await c.query('BEGIN TRANSACTION READ ONLY');
  for (const needle of ['많은', '필요하', '더 필요', '시간이 필요']) {
    const r = await c.query(`select min(seed_number) s, count(*) c from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    console.log(needle, '| phrase first seed:', r.rows[0].s, 'n='+r.rows[0].c);
    const l = await c.query(`select known_text, target_text from course_legos where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    for (const row of l.rows) console.log('  [lego]', row.known_text, '=>', row.target_text);
  }
  const r2 = await c.query(`select known_text, target_text, seed_number, phrase_role from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%시간이%필요%' order by seed_number limit 10`);
  console.log('=== 시간이...필요 examples ===');
  for (const row of r2.rows) console.log(' ', row.seed_number, row.phrase_role, row.known_text, '=>', row.target_text);
  await c.query('ROLLBACK');
  await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
