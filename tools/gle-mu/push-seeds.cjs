#!/usr/bin/env node
/**
 * Push translated Munster seeds from scripts/gle-mu/out/*.json into gle_mu_for_eng.
 *
 * SAFETY: this writes ONLY target_text, and ONLY to course_code=gle_mu_for_eng.
 * It never touches gle_for_eng (released standard Irish), gle_cn_for_eng (Connemara)
 * or gle_ul_for_eng (the sister Ulster job), all of which are out of scope for writes.
 * It never touches known_text — the English is shared with the Connemara course by
 * ruling and must stay byte-identical.
 *
 * It also refuses to run if the file's known_text does not match the row's known_text,
 * which is the cheap guard against a range file drifting out of alignment with the DB.
 */
require('dotenv').config();
const fs = require('fs');

const COURSE = 'gle_mu_for_eng';
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

(async () => {
  const dry = process.argv.includes('--dry');

  let rows = [];
  for (const f of fs.readdirSync('scripts/gle-mu/out').filter(x => x.endsWith('.json')).sort()) {
    rows = rows.concat(JSON.parse(fs.readFileSync(`scripts/gle-mu/out/${f}`, 'utf8')));
  }
  rows = rows.filter(r => r.target_text && r.target_text.trim());
  console.log(`${rows.length} translated seeds in files`);

  // pull the live English so we can prove we are writing against the right rows
  const live = new Map();
  for (let off = 0; off < 2000; off += 500) {
    const r = await fetch(`${url}/rest/v1/course_seeds?course_code=eq.${COURSE}` +
      `&select=seed_number,known_text&order=seed_number&limit=500&offset=${off}`, { headers: H });
    const j = await r.json();
    j.forEach(x => live.set(x.seed_number, x.known_text));
    if (j.length < 500) break;
  }

  const bad = rows.filter(r => live.get(r.seed_number) !== r.known_text);
  if (bad.length) {
    console.log(`REFUSING TO WRITE — ${bad.length} row(s) whose English does not match the DB:`);
    bad.slice(0, 5).forEach(b => console.log(`  S${b.seed_number}\n    file: ${b.known_text}\n    db:   ${live.get(b.seed_number)}`));
    process.exit(1);
  }
  console.log('English side verified identical on every row.');
  if (dry) { console.log('--dry: nothing written.'); return; }

  let ok = 0, fail = 0;
  for (const r of rows) {
    const res = await fetch(
      `${url}/rest/v1/course_seeds?course_code=eq.${COURSE}&seed_number=eq.${r.seed_number}`,
      { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ target_text: r.target_text }) });
    if (res.ok) ok++; else { fail++; console.log(`  S${r.seed_number} FAILED ${res.status} ${await res.text()}`); }
  }
  console.log(`wrote ${ok}, failed ${fail}`);

  // read back, never trust the write
  const back = await fetch(`${url}/rest/v1/course_seeds?course_code=eq.${COURSE}` +
    `&select=seed_number,target_text&target_text=neq.&order=seed_number`, { headers: H });
  const got = await back.json();
  console.log(`read back: ${got.length} rows now carry Irish`);
})();
