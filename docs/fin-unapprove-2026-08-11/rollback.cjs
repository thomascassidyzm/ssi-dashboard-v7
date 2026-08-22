#!/usr/bin/env node
/**
 * Reverse the 2026-08-11 fin_for_eng unapproval, row by row.
 *
 *   node docs/fin-unapprove-2026-08-11/rollback.cjs --dry-run   # show what would be restored
 *   node docs/fin-unapprove-2026-08-11/rollback.cjs --apply     # restore
 *
 * Restores course_seeds.approved_at to the exact value each of the 21 seeds
 * carried before the write, read from before-image.json in this directory.
 * approved_at is the only column the write touched, so it is the only column
 * this restores; every other column is asserted unchanged and the run aborts
 * if any of them has drifted.
 *
 * Scope is pinned to fin_for_eng and to the 21 seed numbers in the before-image.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before-image.json'), 'utf8'));
const COURSE = before.course_code;
if (COURSE !== 'fin_for_eng') throw new Error(`refusing: before-image is for ${COURSE}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Columns the write never touched — drift in any of them means someone else has
// edited the seed since, and a blind restore could bury their change.
const GUARDED = ['seed_id', 'known_text', 'target_text', 'status', 'flagged_at', 'decomposed_at'];

(async () => {
  const { data: live, error } = await sb.from('course_seeds').select('*')
    .eq('course_code', COURSE).in('seed_number', before.target_seed_numbers).order('seed_number', {});
  if (error) throw new Error(error.message);

  const drift = [];
  for (const b of before.rows) {
    const l = live.find((r) => r.seed_number === b.seed_number);
    if (!l) { drift.push(`S${b.seed_number}: row missing live`); continue; }
    for (const c of GUARDED) {
      if ((l[c] ?? null) !== (b[c] ?? null)) drift.push(`S${b.seed_number}.${c}: live=${l[c]} before=${b[c]}`);
    }
  }
  if (drift.length) {
    console.error('ABORT — rows have drifted since the before-image was taken:');
    drift.forEach((d) => console.error('  ' + d));
    process.exit(1);
  }

  const toRestore = before.rows.filter((b) => {
    const l = live.find((r) => r.seed_number === b.seed_number);
    return (l.approved_at ?? null) !== (b.approved_at ?? null);
  });

  console.log(`${before.target_seed_numbers.length} seeds in before-image; ${toRestore.length} need approved_at restored.`);
  for (const b of toRestore) console.log(`  S${String(b.seed_number).padStart(4, '0')} -> ${b.approved_at}`);
  if (!toRestore.length) return console.log('Nothing to do — already matches the before-image.');
  if (!APPLY) return console.log('\nDry run. Re-run with --apply to restore.');

  for (const b of toRestore) {
    const { error: e } = await sb.from('course_seeds').update({ approved_at: b.approved_at })
      .eq('course_code', COURSE).eq('seed_number', b.seed_number);
    if (e) throw new Error(`S${b.seed_number}: ${e.message}`);
  }

  const { data: after, error: e2 } = await sb.from('course_seeds').select('seed_number, approved_at')
    .eq('course_code', COURSE).in('seed_number', before.target_seed_numbers).order('seed_number', {});
  if (e2) throw new Error(e2.message);
  const bad = before.rows.filter((b) => (after.find((r) => r.seed_number === b.seed_number)?.approved_at ?? null) !== (b.approved_at ?? null));
  console.log(bad.length ? `INCOMPLETE — ${bad.length} row(s) did not restore: ${bad.map((b) => b.seed_number)}`
                         : `Restored ${toRestore.length} row(s); all 21 now match the before-image.`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
