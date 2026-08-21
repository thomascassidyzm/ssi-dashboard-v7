#!/usr/bin/env node
/**
 * zut-crosscheck.cjs — the COURSE-WIDE, PHRASE-AWARE ZUT check.
 *
 * WHY THIS EXISTS
 * ---------------
 * Both the server gate and the two local pre-checkers had the same two holes, and between them
 * they produced every cross-band collision found in gle_cn_for_eng on 20-21 Aug 2026:
 *
 *   1. A new LEGO's English gloss is checked against earlier LEGOS ONLY.
 *      `checkLegoConflict` (services/course-builder/lib/validation.cjs) queries `course_legos`
 *      and nothing else, so a new teaching unit can be handed the same English as a PRACTICE
 *      PHRASE written an hour ago and no gate anywhere sees it.
 *
 *   2. Every check is filtered `.lt('seed_number', currentSeed)` — "consistent with what is
 *      BELOW me". Workers decomposing non-contiguous bands in parallel are therefore blind to
 *      each other by construction: a clean local pass at seed 68 says nothing about seed 194,
 *      which is being written at the same moment by someone else.
 *
 * This module closes both: every submitted LEGO gloss and every submitted PHRASE known-side is
 * checked against the English of ALL existing LEGOS **and** ALL existing PRACTICE PHRASES,
 * COURSE-WIDE — above and below — plus against the rest of the same submission.
 *
 * It is deliberately a separate, committed tool rather than an edit to the server's validation
 * library: the server gate is shared by every course on the estate and holding a phrase out is
 * its business, whereas a worker needs to SEE the collision before they post. Wire it into
 * whatever pre-checker you run (see WIRING at the foot of this file).
 *
 * USAGE
 *   node tools/gle-cn/zut-crosscheck.cjs <seedNNN.md> [more.md ...]   # pre-submit check
 *   node tools/gle-cn/zut-crosscheck.cjs --audit                      # census of what is ALREADY in
 *   node tools/gle-cn/zut-crosscheck.cjs --audit --dupes              # + repeated phrase targets
 *   ... --course <code>                                               # default gle_cn_for_eng
 *
 * Exit code 1 if any hard collision is reported.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const CB = path.join(ROOT, 'services/course-builder');
const { normalizeForZUT } = require(path.join(CB, 'lib/text-normalization.cjs'));

const DEFAULT_COURSE = 'gle_cn_for_eng';

function client() {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  const { createClient } = require(path.join(ROOT, 'node_modules/@supabase/supabase-js'));
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');
  return createClient(url, key);
}

// Page through a table — PostgREST caps a request at 1000 rows and a silent truncation here would
// turn a real collision into a clean pass, which is the one failure mode this tool must not have.
async function fetchAll(sb, table, course, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols)
      .eq('course_code', course).order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Build the course-wide known→target index. NO seed_number filter: that filter is the defect.
 * Returns Map<normalisedKnown, Array<{ source, seed, lego_index, known, target }>>.
 */
async function buildIndex(sb, course = DEFAULT_COURSE) {
  const legos = await fetchAll(sb, 'course_legos', course, 'id,seed_number,lego_index,known_text,target_text');
  const phrases = await fetchAll(sb, 'course_practice_phrases', course, 'id,seed_number,known_text,target_text');
  const index = new Map();
  const add = (source, r) => {
    const k = normalizeForZUT(r.known_text);
    if (!k) return;
    if (!index.has(k)) index.set(k, []);
    index.get(k).push({
      source, seed: r.seed_number, lego_index: r.lego_index,
      known: r.known_text, target: r.target_text,
    });
  };
  for (const l of legos) add('lego', l);
  for (const p of phrases) add('phrase', p);
  return { index, counts: { legos: legos.length, phrases: phrases.length }, course };
}

/**
 * Check one submission against the index.
 *
 * submission: { seed_number, legos: [{ idx, known, target, build:[], use:[], phrases:[] }] }
 * Rows already banked for THIS seed number are ignored (a resubmit is not a collision with itself).
 *
 * Returns { collisions: [...], selfCollisions: [...] }, each entry naming both sides so the
 * worker can see whether to consolidate or differentiate the English.
 */
function crossCheck(submission, built) {
  const { index } = built;
  const seed = submission.seed_number;
  const collisions = [];
  const selfCollisions = [];
  const submitted = new Map(); // normKnown -> { kind, tag, known, target }

  const consider = (kind, tag, known, target) => {
    if (!known || !target) return;
    const k = normalizeForZUT(known);
    const nt = normalizeForZUT(target);

    // (a) against everything already in the course, ABOVE and BELOW.
    for (const e of index.get(k) || []) {
      if (e.seed === seed) continue;
      if (normalizeForZUT(e.target) === nt) continue;
      collisions.push({
        kind, tag, known, target,
        against: e.source, against_seed: e.seed, against_target: e.target,
        direction: e.seed < seed ? 'below' : 'ABOVE (parallel band)',
        // The pairing the existing gates cannot see at all:
        blind_spot: kind === 'lego' && e.source === 'phrase',
      });
    }
    // (b) against the rest of this same submission.
    const prev = submitted.get(k);
    if (prev && normalizeForZUT(prev.target) !== nt) {
      selfCollisions.push({ kind, tag, known, target, against_tag: prev.tag, against_target: prev.target });
    } else if (!prev) {
      submitted.set(k, { kind, tag, known, target });
    }
  };

  for (const lego of submission.legos || []) {
    const tag = `L${lego.idx}`;
    consider('lego', tag, lego.known, lego.target);
    for (const c of lego.components || []) consider('lego', `${tag}c`, c.known, c.target);
    const basket = [...(lego.build || []), ...(lego.use || []), ...(lego.phrases || [])];
    for (const p of basket) consider('phrase', tag, p.known, p.target);
  }
  return { collisions, selfCollisions };
}

/**
 * Census of collisions ALREADY banked — the same lens turned on the live course.
 * Returns groups of one English with two or more distinct targets.
 */
function auditIndex(built) {
  const groups = [];
  for (const [k, rows] of built.index) {
    const targets = new Map();
    for (const r of rows) {
      const nt = normalizeForZUT(r.target);
      if (!targets.has(nt)) targets.set(nt, []);
      targets.get(nt).push(r);
    }
    if (targets.size < 2) continue;
    groups.push({ known: k, variants: [...targets.entries()].map(([nt, rows]) => ({ target: rows[0].target, rows })) });
  }
  groups.sort((a, b) => b.variants.length - a.variants.length || a.known.localeCompare(b.known));
  return groups;
}

/** Repeated practice-phrase TARGET strings (the same Irish sentence taught twice). */
async function auditRepeatedTargets(sb, course = DEFAULT_COURSE) {
  const phrases = await fetchAll(sb, 'course_practice_phrases', course, 'id,seed_number,lego_id,known_text,target_text');
  const legos = await fetchAll(sb, 'course_legos', course, 'id,seed_number,lego_index,known_text,target_text');
  const legoTargets = new Set(legos.map(l => normalizeForZUT(l.target_text)));
  const byTarget = new Map();
  for (const p of phrases) {
    const t = normalizeForZUT(p.target_text);
    if (!byTarget.has(t)) byTarget.set(t, []);
    byTarget.get(t).push(p);
  }
  const dupes = [];
  for (const [t, rows] of byTarget) {
    if (rows.length < 2) continue;
    const seeds = [...new Set(rows.map(r => r.seed_number))].sort((a, b) => a - b);
    dupes.push({
      target: rows[0].target_text, count: rows.length, seeds, rows,
      // A phrase equal to a lego's own target is the benign "debut row" shape.
      isBareLego: legoTargets.has(t),
      crossSeed: seeds.length > 1,
    });
  }
  dupes.sort((a, b) => b.count - a.count);
  return dupes;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const ci = argv.indexOf('--course');
  const course = ci >= 0 ? argv[ci + 1] : DEFAULT_COURSE;
  // ci is -1 when --course is absent, and `i !== ci + 1` would then silently swallow argv[0] —
  // i.e. drop the first seed file and report a clean pass for a file never read.
  const courseValueAt = ci >= 0 ? ci + 1 : -1;
  const files = argv.filter((a, i) => !a.startsWith('--') && i !== courseValueAt);
  const sb = client();

  if (argv.includes('--audit')) {
    const built = await buildIndex(sb, course);
    console.log(`=== ${course}: ${built.counts.legos} legos, ${built.counts.phrases} phrases ===\n`);
    const groups = auditIndex(built);
    console.log(`KNOWN-SIDE ZUT SPLITS (one English, >1 target): ${groups.length}\n`);
    for (const g of groups) {
      console.log(`  "${g.known}"`);
      for (const v of g.variants) {
        const where = v.rows.map(r => `${r.source[0].toUpperCase()}${r.seed}`).join(' ');
        console.log(`      → "${v.target}"   [${where}]`);
      }
    }
    if (argv.includes('--dupes')) {
      const dupes = await auditRepeatedTargets(sb, course);
      const real = dupes.filter(d => d.crossSeed && !d.isBareLego);
      console.log(`\nREPEATED PHRASE TARGETS: ${dupes.length} distinct strings, ` +
        `${dupes.reduce((n, d) => n + d.count - 1, 0)} excess rows; ` +
        `${real.length} cross-seed and not a bare-lego debut row\n`);
      for (const d of dupes) {
        const flag = d.isBareLego ? 'bare-lego' : (d.crossSeed ? 'CROSS-SEED' : 'same-seed');
        console.log(`  [${flag}] x${d.count} seeds ${d.seeds.join(',')}  "${d.target}"`);
      }
    }
    return;
  }

  if (!files.length) {
    console.error('usage: zut-crosscheck.cjs <seed.md> [...]   |   --audit [--dupes]   [--course <code>]');
    process.exit(2);
  }

  const { parseMarkdownSeed } = require(path.join(CB, 'lib/markdown-parser.cjs'));
  const built = await buildIndex(sb, course);
  let bad = 0;
  for (const file of files) {
    const parsed = parseMarkdownSeed(fs.readFileSync(file, 'utf8'), course);
    const { collisions, selfCollisions } = crossCheck(parsed, built);
    console.log(`\n=== ${path.basename(file)} — seed ${parsed.seed_number} — course-wide phrase-aware ZUT ===`);
    if (!collisions.length && !selfCollisions.length) { console.log('  PASS — no collision against any lego or phrase, any seed.'); continue; }
    bad++;
    for (const c of collisions) {
      console.log(`  ✗ ${c.tag} ${c.kind} "${c.known}"`);
      console.log(`      you:      "${c.target}"`);
      console.log(`      existing: "${c.against_target}"  (${c.against} at seed ${c.against_seed}, ${c.direction})` +
        (c.blind_spot ? '  ← NO EXISTING GATE SEES THIS' : ''));
    }
    for (const c of selfCollisions) {
      console.log(`  ✗ INTERNAL ${c.tag} "${c.known}" → "${c.target}" but ${c.against_tag} → "${c.against_target}"`);
    }
  }
  if (bad) process.exitCode = 1;
}

// WIRING — call it from a pre-checker instead of re-implementing it:
//
//   const { buildIndex, crossCheck } = require('<repo>/tools/gle-cn/zut-crosscheck.cjs');
//   const built = await buildIndex(sb, COURSE);
//   const { collisions, selfCollisions } = crossCheck(parsed, built);
//   for (const c of collisions) fails.push(`ZUT X-BAND ${c.tag}: "${c.known}" -> you "${c.target}" vs ${c.against} S${c.against_seed} "${c.against_target}"`);
//
// Re-run it IMMEDIATELY BEFORE the POST, not once at the start of the seed: the collision you are
// racing is a phrase another worker banks while you write.
module.exports = { buildIndex, crossCheck, auditIndex, auditRepeatedTargets, fetchAll, client, DEFAULT_COURSE };

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
