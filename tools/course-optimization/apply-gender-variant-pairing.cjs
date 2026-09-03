#!/usr/bin/env node
/**
 * Apply the two-voice referent-gender mechanism to a course (Tom's ruling, 2026-09-03).
 *
 * Where the known side leaves a third-person referent's gender open and the target
 * must choose, the course answers with BOTH readings: the female target voice speaks
 * the "her" reading, the male target voice speaks the "his" reading. Nothing is
 * explained anywhere — the contrast is the teaching.
 *
 * Two writes per genuinely-ambiguous row, in this order:
 *   1. course_gender_expansions — one target-side row per distinct male reading,
 *      expanded_f = female reading, expanded_m = male reading. This is also the
 *      EVIDENCE that licenses the ZUT collision at the builder gate, so it must
 *      exist before any content contradicts itself.
 *   2. the content row's target_text := the male reading — the male voice (target2)
 *      is the one whose text is on screen.
 *
 * Rows already storing the male reading need no text write at all.
 *
 * ⚠ A text write fires null_{seed,lego,phrase}_audio_on_text_change, which relinks to
 * a same-voice clip for the new text if one exists and otherwise NULLs the link. A
 * cycle with a missing clip drops out of the walk, so every flipped row is silent
 * until the audio pass runs. That pass is required for the mechanism regardless — the
 * female clip has to be re-rendered from expanded_f — so the flip does not create work
 * that was not already owed. Queue it immediately after applying.
 *
 * Usage:
 *   node tools/course-optimization/apply-gender-variant-pairing.cjs <course> <verdicts.tsv> [--apply] [--pairs-only]
 *
 * --pairs-only writes step 1 and skips step 2. That is the safe half: the pairs are
 * inert until a render reads them, while the flips take audio off live rows. Use it
 * when the course cannot be re-rendered yet, then run again without it once it can.
 *
 * Verdict TSV (no header): id \t AMBIGUOUS|DETERMINED \t male_reading \t female_reading \t reason
 * ids are course_seeds.seed_id, course_legos.lego_id or course_practice_phrases.id.
 * Default is a dry run; --apply writes. Both write a per-row log next to the input.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const [courseCode, verdictPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');
const PAIRS_ONLY = process.argv.includes('--pairs-only');
if (!courseCode || !verdictPath) {
  console.error('usage: apply-gender-variant-pairing.cjs <course> <verdicts.tsv> [--apply]');
  process.exit(2);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = [
  { table: 'course_seeds', idCol: 'seed_id', match: /^S\d{4}$/ },
  { table: 'course_legos', idCol: 'lego_id', match: /^S\d{4}L\d{2}$/ },
  { table: 'course_practice_phrases', idCol: 'id', match: /:/ },
];
const tableFor = (id) => TABLES.find(t => t.match.test(id));

const PRONOUN = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
const strip = (s) => (s || '').replace(PRONOUN, '§');

function parseVerdicts(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const [id, verdict, male, female, reason] = line.split('\t');
    rows.push({ id: (id || '').trim(), verdict: (verdict || '').trim(), male: male || '', female: female || '', reason: reason || '' });
  }
  return rows;
}

/** Refuse anything that would rewrite more than the pronouns. */
function checkReadings(r, stored) {
  const problems = [];
  if (!r.male || !r.female) problems.push('missing a reading');
  else {
    if (r.male === r.female) problems.push('the two readings are identical');
    if (strip(r.male) !== strip(r.female)) problems.push('readings differ outside the pronouns');
    if (stored !== undefined && strip(stored) !== strip(r.male)) problems.push('reading rewrites the stored text outside the pronouns');
    if (stored !== undefined && stored !== r.male && stored !== r.female) problems.push('neither reading matches the stored text');
  }
  return problems;
}

async function main() {
  const verdicts = parseVerdicts(verdictPath);
  const ambiguous = verdicts.filter(v => v.verdict === 'AMBIGUOUS');
  console.log(`${verdicts.length} verdicts, ${ambiguous.length} ambiguous — ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  // ── read current state for every ambiguous id ──
  const stored = new Map();
  for (const { table, idCol } of TABLES) {
    const ids = ambiguous.filter(v => tableFor(v.id)?.table === table).map(v => v.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from(table)
        .select(`${idCol}, target_text`).eq('course_code', courseCode).in(idCol, ids.slice(i, i + 200));
      if (error) throw new Error(`${table}: ${error.message}`);
      for (const row of data) stored.set(row[idCol], { table, idCol, target_text: row.target_text });
    }
  }

  const log = { course: courseCode, applied: APPLY, at: new Date().toISOString(), rejected: [], flips: [], already_male: [], pairs: [] };
  const pairByMale = new Map();

  for (const v of ambiguous) {
    const t = tableFor(v.id);
    const cur = stored.get(v.id);
    if (!t) { log.rejected.push({ ...v, why: 'unrecognised id shape' }); continue; }
    if (!cur) { log.rejected.push({ ...v, why: 'row not found in the live DB' }); continue; }

    const problems = checkReadings(v, cur.target_text);
    if (problems.length) { log.rejected.push({ ...v, stored: cur.target_text, why: problems.join('; ') }); continue; }

    const prev = pairByMale.get(v.male);
    if (prev && prev !== v.female) {
      log.rejected.push({ ...v, why: `male reading already paired with a different female reading: "${prev}"` });
      continue;
    }
    pairByMale.set(v.male, v.female);

    if (cur.target_text === v.male) log.already_male.push({ id: v.id, table: t.table, text: v.male });
    else log.flips.push({ id: v.id, table: t.table, idCol: t.idCol, from: cur.target_text, to: v.male });
  }

  log.pairs = [...pairByMale].map(([m, f]) => ({ original_text: m, expanded_m: m, expanded_f: f }));

  // A pairing is keyed by TEXT, so it reaches every row in the course whose target
  // text is that string. If a row the verdicts called DETERMINED happens to store
  // the same English as some other row's male reading, the female voice would speak
  // "her" over a known side that says "his" — the exact defect this whole change
  // exists to remove. Refuse those pairs rather than ship them.
  const ambiguousIds = new Set(ambiguous.map(v => v.id));
  const males = log.pairs.map(p => p.original_text);
  const clashing = new Set();
  for (const { table, idCol } of TABLES) {
    for (let i = 0; i < males.length; i += 100) {
      const { data, error } = await supabase.from(table)
        .select(`${idCol}, target_text`).eq('course_code', courseCode).in('target_text', males.slice(i, i + 100));
      if (error) throw new Error(`clash check ${table}: ${error.message}`);
      for (const row of data) if (!ambiguousIds.has(row[idCol])) clashing.add(row.target_text);
    }
  }
  if (clashing.size) {
    log.clashes = [...clashing];
    log.pairs = log.pairs.filter(p => !clashing.has(p.original_text));
    const before = log.flips.length + log.already_male.length;
    log.flips = log.flips.filter(f => !clashing.has(f.to));
    log.already_male = log.already_male.filter(r => !clashing.has(r.text));
    for (const v of ambiguous) if (clashing.has(v.male)) log.rejected.push({ ...v, why: 'male reading is also the stored text of a row this pass did not call ambiguous' });
    console.log(`  ⚠ ${clashing.size} pair(s) dropped — the male reading is stored elsewhere as a determined answer (${before - log.flips.length - log.already_male.length} rows dropped with them)`);
  }

  console.log(`  pairs to store : ${log.pairs.length}`);
  console.log(`  rows to flip   : ${log.flips.length}  (seeds ${log.flips.filter(f => f.table === 'course_seeds').length}, legos ${log.flips.filter(f => f.table === 'course_legos').length}, phrases ${log.flips.filter(f => f.table === 'course_practice_phrases').length})`);
  console.log(`  already male   : ${log.already_male.length}`);
  console.log(`  rejected       : ${log.rejected.length}`);
  for (const r of log.rejected.slice(0, 15)) console.log(`    ✗ ${r.id}: ${r.why}`);

  if (APPLY) {
    // 1. pairs first — the licence must exist before the content carries two readings.
    const rows = log.pairs.map(p => ({ course_code: courseCode, language: 'eng', text_side: 'target', ...p }));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from('course_gender_expansions')
        .upsert(rows.slice(i, i + 200), { onConflict: 'course_code,original_text,text_side' });
      if (error) throw new Error(`expansions: ${error.message}`);
    }
    console.log(`  ✓ stored ${rows.length} pairs`);

    // 2. flips, one row at a time, each asserting its own before-state.
    let done = 0;
    if (PAIRS_ONLY) {
      log.flips_held = log.flips.length;
      console.log(`  ⏸ ${log.flips.length} text flips HELD (--pairs-only) — re-run without the flag once the course can be re-rendered`);
      log.flips = [];
    }
    for (const f of log.flips) {
      const { data, error } = await supabase.from(f.table)
        .update({ target_text: f.to })
        .eq('course_code', courseCode).eq(f.idCol, f.id).eq('target_text', f.from)
        .select(f.idCol);
      if (error) throw new Error(`${f.id}: ${error.message}`);
      if (!data || data.length !== 1) throw new Error(`${f.id}: before-state moved under us — aborting after ${done} flips`);
      done++;
      if (done % 50 === 0) console.log(`    ${done}/${log.flips.length}`);
    }
    console.log(`  ✓ flipped ${done} rows`);
  }

  const out = verdictPath.replace(/\.tsv$/, '') + (APPLY ? (PAIRS_ONLY ? '-pairs-applied-log.json' : '-applied-log.json') : '-dryrun-log.json');
  fs.writeFileSync(out, JSON.stringify(log, null, 2));
  console.log(`log: ${out}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
