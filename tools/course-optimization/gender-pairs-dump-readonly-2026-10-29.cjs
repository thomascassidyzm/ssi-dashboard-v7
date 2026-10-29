#!/usr/bin/env node
'use strict';
// node tools/course-optimization/gender-pairs-dump-readonly-2026-10-29.cjs <course> <out.json> [text-substring ...]
// READ-ONLY (job #503, eng_for_hin seed 128 re-cut): a course's course_gender_expansions rows as JSON, through the
// sanctioned agent-db login (5 s cap), so a plan that adds gendered known phrases can see which pairs already exist
// (their stored `language`, `text_side`, spelling) before it posts gender.insert ops to Popty's edit-batch door.
// With substring arguments only rows whose original_text/expanded_m/expanded_f contain one of them are written.
// Every query is by course_code (indexed).
const fs = require('fs');
const { connect } = require('../../services/shared/agent-db.cjs');
async function main() {
  const [course, out, ...needles] = process.argv.slice(2);
  if (!course || !out) throw new Error('usage: <course> <out.json> [substring ...]');
  const pg = await connect();
  try {
    const rows = (await pg.query('SELECT * FROM course_gender_expansions WHERE course_code=$1 ORDER BY original_text', [course])).rows;
    const keep = needles.length
      ? rows.filter(r => needles.some(n => [r.original_text, r.expanded_m, r.expanded_f].some(t => String(t || '').includes(n))))
      : rows;
    fs.writeFileSync(out, JSON.stringify(keep));
    console.log(`${course}: ${rows.length} gender expansion rows, ${keep.length} written → ${out}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
