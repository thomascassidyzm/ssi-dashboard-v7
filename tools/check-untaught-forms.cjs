#!/usr/bin/env node
/**
 * scan-course Check 20 — UNTAUGHT FORMS, as a runnable check.
 *
 *   node tools/check-untaught-forms.cjs <course_code>
 *   node tools/check-untaught-forms.cjs <course_code> --json
 *   node tools/check-untaught-forms.cjs <course_code> --max-seed 100
 *   node tools/check-untaught-forms.cjs --calibrate     # the jpn_for_eng acceptance test
 *
 * READ-ONLY. It never writes to course content, never generates audio, never fixes.
 *
 * THE RULE IT ENFORCES — canon K14 (Kai, 2026-09-08): a form no seed has taught is
 * UNAVAILABLE, and a prompt that needs one is what is wrong, not the translation.
 * K15: the repair goes DOWNWARD into the phrases, never upward into a new LEGO.
 * K21: availability is keyed on the EXACT SURFACE FORM — no stemming, no lemmatising,
 * no fuzzy matching anywhere in the availability computation. See
 * tools/untaught-forms/availability.cjs for why the variant map there is the opposite
 * operation from the one K21 forbids.
 *
 * WHICH SIDE IT ASKS THE QUESTION OF, AND WHY THAT IS A REAL LIMIT.
 * It reads the PROMPT — the known side — which is English in all nine paid
 * English-known courses and is therefore safely whitespace-tokenisable. It does NOT
 * tokenise the target text, so Japanese, Chinese and Arabic script are not silently
 * mangled. The price is stated plainly: a row whose English is entirely attested but
 * whose TARGET reaches for an untaught form is INVISIBLE to this check. That class is
 * real and large — the jpn_for_eng calibration measured it at roughly three quarters
 * of a hand-derived defect set — and it needs target-side morphology per language,
 * which this check does not have. Never read a green from this check as "no untaught
 * forms in this course".
 *
 * WHAT IT PRINTS BY DEFAULT IS THE CALIBRATED SUBSET, NOT EVERY HIT. The jpn_for_eng
 * hand read of 92 hits measured the classes separately: person / past /
 * person_or_plural / negation / other read ~53% true; ing read ~20%; contraction ~15%;
 * unseen_word is not an untaught-FORM finding at all (it is a known-side vocabulary
 * gap, which is the known-side gate's question, not this one). So the low classes are
 * counted, printed as totals, and kept OUT of the reading list unless you ask for them
 * with --all-classes. A detector that hands over its 15%-true class alongside its
 * 53%-true class has handed over a 26%-true list and destroyed its own credibility.
 *
 * READ THE CLASSES, NOT THE TOTAL. Every hit is classified by the morphological
 * operation the prompt demands, and the classes have measurably different
 * false-positive rates (published in the calibration). A single total is not a finding.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true });
const { Client } = require('pg');
const A = require('./untaught-forms/availability.cjs');
const { classifyDiff, rankOf } = require('./untaught-forms/classify.cjs');

// The classes the calibration justifies reporting as findings. Everything else is
// counted and totalled but never enters the reading list without --all-classes.
const REPORTABLE = new Set(['person', 'past', 'person_or_plural', 'negation', 'other']);

// A teaching event's sort key. LEGOs sit at their own lego_index; the seed SENTENCE is
// filed after every LEGO of its seed, because a phrase drilled under lego k has heard
// the seed and the legos up to k, and a seed is never evidence for itself.
const SEED_EVENT_INDEX = 999;
const SEED_JUDGED_AT = 997;

async function load(course, maxSeed) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const q = async (sql) => (await c.query(sql, [course, maxSeed])).rows;
    return {
      legos: await q(`select seed_number, lego_index, known_text, components from course_legos
                      where course_code=$1 and seed_number<=$2 order by seed_number, lego_index`),
      seeds: await q(`select seed_number, known_text, target_text from course_seeds
                      where course_code=$1 and seed_number<=$2 order by seed_number`),
      phrases: await q(`select id, seed_number, lego_index, phrase_role, known_text, target_text
                        from course_practice_phrases where course_code=$1 and seed_number<=$2
                        order by seed_number, lego_index, position`),
    };
  } finally { await c.end(); }
}

function analyse({ legos, seeds, phrases }) {
  const events = legos
    .map(l => ({ seed_number: l.seed_number, lego_index: l.lego_index, known_text: l.known_text, components: l.components }))
    .concat(seeds.map(s => ({ seed_number: s.seed_number, lego_index: SEED_EVENT_INDEX, known_text: s.known_text, components: null })))
    .sort((a, b) => (a.seed_number * 1000 + a.lego_index) - (b.seed_number * 1000 + b.lego_index));
  const inv = A.buildInventory(events);

  const rows = [];
  for (const s of seeds) {
    rows.push({ id: `SEED${s.seed_number}`, kind: 'seed', seed: s.seed_number,
      cut: s.seed_number * 1000 + SEED_JUDGED_AT, known: s.known_text, target: s.target_text });
  }
  for (const p of phrases) {
    rows.push({ id: String(p.id || '').split(':').pop(), kind: p.phrase_role, seed: p.seed_number,
      cut: p.seed_number * 1000 + p.lego_index, known: p.known_text, target: p.target_text });
  }
  // LEGOs are deliberately NOT judged. A LEGO's gloss IS the teaching event for its own
  // words, so asking whether it was taught earlier is asking the wrong question of it.

  // Walk the rows in curriculum order and grow the inventory as we pass each teaching
  // event, instead of rebuilding it per row — a full 668-seed course is ~13,000 rows
  // and the rebuild is what made the first sweep unusable.
  rows.sort((a, b) => a.cut - b.cut);
  const evOrder = inv.order.map((o, i) => i).sort((a, b) => inv.order[a] - inv.order[b]);
  let evPtr = 0;
  const iv = { chunks: [], words: new Set() };

  const hits = [];
  let clean = 0;
  for (const r of rows) {
    while (evPtr < evOrder.length && inv.order[evOrder[evPtr]] <= r.cut) {
      const c = inv.chunks[evOrder[evPtr]];
      iv.chunks.push(c);
      for (const w of c) iv.words.add(w);
      evPtr++;
    }
    const derived = [], unseen = [];
    for (const w of A.tokens(r.known)) {
      if (iv.words.has(w)) continue;
      const src = A.derivedFrom(w, iv);
      if (src) derived.push({ asked: w, taught: src, cls: classifyDiff(src, w) });
      else unseen.push(w);
    }
    if (!derived.length && !unseen.length) { clean++; continue; }
    const worst = derived.length ? derived.slice().sort((a, b) => rankOf(a.cls) - rankOf(b.cls))[0].cls : 'unseen_word';
    hits.push({ ...r, derived, unseen, worst });
  }
  return { rows: rows.length, clean, hits };
}

function summarise(hits) {
  const byClass = {};
  for (const h of hits) byClass[h.worst] = (byClass[h.worst] || 0) + 1;
  return byClass;
}

async function runCourse(course, maxSeed) {
  const data = await load(course, maxSeed);
  if (!data.seeds.length) return { course, error: 'NO SEEDS — course absent or empty at this seed range' };
  const a = analyse(data);
  return { course, seeds: data.seeds.length, phrases: data.phrases.length,
    rowsJudged: a.rows, clean: a.clean, hits: a.hits, byClass: summarise(a.hits),
    reportable: a.hits.filter(h => REPORTABLE.has(h.worst)) };
}

async function calibrate() {
  const kp = require('./untaught-forms/jpn-known-positive.json');
  const known = new Set([...Object.values(kp.delete).flat(), ...Object.values(kp.reauthor).flat()]);
  const r = await runCourse(kp.course, kp.seed_range[1]);
  const ids = new Set(r.hits.map(h => h.id));
  const caught = [...known].filter(k => ids.has(k));
  const missed = [...known].filter(k => !ids.has(k)).sort();
  console.log(`CALIBRATION — ${kp.course} seeds ${kp.seed_range.join('-')} against the hand-derived set`);
  console.log(`  known positives : ${known.size}`);
  console.log(`  rows judged     : ${r.rowsJudged}   hits: ${r.hits.length}   clean: ${r.clean}`);
  console.log(`  recall          : ${caught.length}/${known.size}`);
  console.log(`  caught          : ${caught.sort().join(' ')}`);
  console.log(`  missed          : ${missed.join(' ')}`);
  console.log(`  by class        : ${JSON.stringify(r.byClass)}`);
  return { known: known.size, caught, missed, run: r };
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const mi = args.indexOf('--max-seed');
  const maxSeed = mi >= 0 ? Number(args[mi + 1]) : 100000;
  if (args.includes('--calibrate')) { await calibrate(); return; }
  const course = args.find(a => !a.startsWith('--') && a !== String(maxSeed));
  if (!course) { console.error('usage: check-untaught-forms.cjs <course_code> [--json] [--max-seed N] | --calibrate'); process.exit(2); }
  const r = await runCourse(course, maxSeed);
  if (json) { console.log(JSON.stringify(r, null, 1)); return; }
  if (r.error) { console.log(`${course}: ${r.error}`); return; }
  const all = args.includes('--all-classes');
  const list = all ? r.hits : r.reportable;
  console.log(`${course}: ${r.rowsJudged} rows judged (${r.seeds} seeds + ${r.phrases} phrases), ${r.hits.length} hits total, ${r.reportable.length} in reportable classes, ${r.clean} clean`);
  for (const [k, v] of Object.entries(r.byClass).sort((a, b) => rankOf(a[0]) - rankOf(b[0]))) console.log(`  ${k.padEnd(14)} ${v}`);
  console.log(`\nTOP 30 of ${list.length} (worst class first):`);
  for (const h of list.slice().sort((a, b) => rankOf(a.worst) - rankOf(b.worst) || a.seed - b.seed).slice(0, 30)) {
    const d = h.derived.map(x => `${x.taught}→${x.asked}`).join(',') || `unseen: ${h.unseen.join(',')}`;
    console.log(`  s${String(h.seed).padStart(3)} ${h.id.padEnd(12)} [${h.worst}] ${d}\n        "${h.known}"  →  ${h.target}`);
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { analyse, runCourse, calibrate };
