const fs=require('fs');const {Client}=require('pg');
const env=fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(env)[1].trim();
const plan = require('./kor-39-plan.json');
const DELETE_UUIDS = new Set(['eng_for_kor:S0298L01U04','eng_for_kor:S0300L01U03']);
const patches = plan.filter(r=>!DELETE_UUIDS.has(r.row_uuid));

(async()=>{
  const c=new Client({connectionString:url});
  await c.connect();
  await c.query('BEGIN TRANSACTION READ ONLY');

  const phrases = (await c.query(`select known_text, target_text, seed_number, phrase_role from course_practice_phrases where course_code='eng_for_kor'`)).rows;
  const legos = (await c.query(`select known_text, target_text from course_legos where course_code='eng_for_kor'`)).rows;

  const norm = s => (s||'').trim().toLowerCase().replace(/[.?!¿¡。？！]+$/,'');

  const map = new Map();
  for (const p of [...phrases, ...legos]) {
    const k = norm(p.known_text||'');
    if (!k) continue;
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(p.target_text);
  }

  console.log('=== Cross-check against existing DB rows (known/legos) ===');
  for (const r of patches) {
    const k = norm(r.new_known_text);
    const existing = map.get(k);
    if (existing) {
      const differs = [...existing].some(t => norm(t) !== norm(r.old_known_text));
      console.log(r.row_uuid, 'COLLIDES. targets:', JSON.stringify([...existing]), differs ? '*** FORK ***' : '(same target - dup, expected for recovered rows)');
    }
  }

  console.log('=== Cross-check among the 37 proposals themselves ===');
  const byNorm = new Map();
  for (const r of patches) {
    const k = norm(r.new_known_text);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(r);
  }
  for (const [k, rows] of byNorm) {
    if (rows.length > 1) {
      console.log('COLLISION among proposals:', k, rows.map(r=>r.row_uuid+':'+r.old_known_text));
    }
  }

  await c.query('ROLLBACK');
  await c.end();
})().catch(e=>{console.error(e); process.exit(1)});
