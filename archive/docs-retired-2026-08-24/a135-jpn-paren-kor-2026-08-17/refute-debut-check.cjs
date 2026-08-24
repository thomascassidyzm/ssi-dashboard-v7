const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();

const CHECKS = [
  ['row S0040', '것에 대해'],
  ['row S0040', '기분이 어때요'],
  ['row S0280U04', '가기 전에'],
  ['row S0280U04/05/06', '만 했어요'],
  ['row S0280U05', '있고 싶어하지 않'],
  ['row S0280U06', '갈 준비가 됐어요'],
  ['row S0282U03', '더 많은 시간이 필요하면'],
  ['row S0282U04', '함께 일할 때'],
  ['row S0284', '만나면 좋겠어요'],
  ['row S0284', '만났으면 좋겠어요'],
  ['row S0284', '여동생 친구'],
  ['row S0288', '보는 것을 좋아해요'],
  ['row S0288L02', '괜찮아요'],
  ['row S0288L02', '대부분의 사람들'],
  ['row S0290', '알아야 해요'],
  ['row S0292', '파티에'],
  ['row S0292', '가고 싶어요'],
  ['row S0294', '시간이 충분하지 않'],
  ['row S0294', '전화할 시간'],
  ['row S0296', '다고 말했어요'],
  ['row S0296U01', '더 자주 말해야 한다'],
  ['row S0298', '할 말이 없'],
  ['row S0298', '할 말이 없다고 생각해요'],
  ['row S0300L01', '불친절하게 보이고'],
  ['row S0300L01U02', '불친절하다고 생각했어요'],
  ['row S0300L02', '보이고 싶어하지 않'],
  ['row S0300L02U02', '어렵게 보이고'],
  ['row S0300L02U02', '어렵게'],
  ['row S0300L02U04', '긴장하게'],
  ['row S0300L02U03', '피곤하게 보이고'],
];

(async()=>{
  const c=new Client({connectionString:url});
  await c.connect();
  await c.query('BEGIN TRANSACTION READ ONLY');

  for (const [label, needle] of CHECKS) {
    const legoR = await c.query(`select min(seed_number) as s from course_legos where course_code='eng_for_kor' and known_text ilike '%'||$1||'%'`, [needle]);
    const phraseR = await c.query(`select min(seed_number) as s, count(*) as c from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%'||$1||'%' and phrase_role != 'use' and known_text != target_text`, [needle]);
    const anyPhraseR = await c.query(`select min(seed_number) as s, count(*) as c from course_practice_phrases where course_code='eng_for_kor' and known_text ilike '%'||$1||'%' and known_text != target_text`, [needle]);
    console.log(label, '|', JSON.stringify(needle), '| lego first seed:', legoR.rows[0].s, '| non-use-phrase first seed:', phraseR.rows[0].s, '(n='+phraseR.rows[0].c+')', '| any-phrase first seed:', anyPhraseR.rows[0].s, '(n='+anyPhraseR.rows[0].c+')');
  }

  await c.query('ROLLBACK');
  await c.end();
})().catch(e=>{console.error(e); process.exit(1)});
