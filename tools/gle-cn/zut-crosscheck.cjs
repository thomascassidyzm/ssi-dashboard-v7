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
  const duplicates = [];
  const submitted = new Map(); // normKnown -> { kind, tag, known, target }

  const consider = (kind, tag, known, target) => {
    if (!known || !target) return;
    const k = normalizeForZUT(known);
    const nt = normalizeForZUT(target);

    // (a) against everything already in the course, ABOVE and BELOW.
    for (const e of index.get(k) || []) {
      if (e.seed === seed) continue;
      if (normalizeForZUT(e.target) === nt) {
        // Same English AND same target is NOT a ZUT collision — it is a DUPLICATE, the learner
        // being taught one sentence twice. A different defect with no gate of its own, and one
        // that a phrase-level check looking only for *conflicting* targets will happily wave
        // through. Warn rather than fail: a phrase equal to a taught chunk is a legitimate
        // debut row, so only whole sentences are worth flagging.
        if (kind === 'phrase' && e.source === 'phrase' && String(target).trim().split(/\s+/).length >= 4) {
          duplicates.push({ tag, known, target, against_seed: e.seed });
        }
        continue;
      }
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
  // Dedupe: one warning per repeated sentence, not one per matching row.
  const seenDup = new Set();
  const dedupedDuplicates = duplicates.filter(d => {
    const key = normalizeForZUT(d.target);
    if (seenDup.has(key)) return false;
    seenDup.add(key); return true;
  });
  return { collisions, selfCollisions, duplicates: dedupedDuplicates };
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

/**
 * Repeated practice-phrase TARGET strings, TRIAGED. Not every repeat is a defect, and a flat
 * count of "excess rows" reads as far worse than the course actually is:
 *
 *   CHUNK       the repeated target IS a taught lego or component target — a debut/bare row.
 *               Benign: the learner is drilling a chunk, not being taught a sentence twice.
 *   SAME-SEED   both rows sit in one seed. A within-seed duplicate, cheap to drop.
 *   KNOWN-SPLIT one Irish, two DIFFERENT English prompts. Legal under ZUT (which governs
 *               known→target, not target→known) but usually a synonym-choice decision worth
 *               a look — and in this course most of them are the want/trying alternation.
 *   ADJACENT    same sentence in consecutive seeds — normally a deliberate carry-over.
 *   REAL-DUP    same Irish AND same English in seeds far apart. The learner is taught the
 *               identical sentence twice. This is the category that needs a ruling.
 */
async function auditRepeatedTargets(sb, course = DEFAULT_COURSE) {
  const phrases = await fetchAll(sb, 'course_practice_phrases', course, 'id,seed_number,lego_id,known_text,target_text');
  const legos = await fetchAll(sb, 'course_legos', course, 'id,seed_number,lego_index,known_text,target_text,components');
  // A "chunk" is any whole taught unit — lego target OR component target. Components matter:
  // classifying on lego targets alone mislabels bare-chunk drills like "ag iarraidh" as duplicates.
  const chunk = new Set();
  for (const l of legos) {
    chunk.add(normalizeForZUT(l.target_text));
    for (const c of l.components || []) if (c && c.target) chunk.add(normalizeForZUT(c.target));
  }
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
    const knowns = [...new Set(rows.map(r => r.known_text))];
    const normKnowns = new Set(rows.map(r => normalizeForZUT(r.known_text)));
    let cls;
    if (chunk.has(t)) cls = 'CHUNK';
    else if (seeds.length === 1) cls = 'SAME-SEED';
    else if (normKnowns.size > 1) cls = 'KNOWN-SPLIT';
    else if (seeds[seeds.length - 1] - seeds[0] <= 1) cls = 'ADJACENT';
    else cls = 'REAL-DUP';
    dupes.push({ target: rows[0].target_text, cls, count: rows.length, seeds, knowns, rows });
  }
  const order = ['REAL-DUP', 'ADJACENT', 'KNOWN-SPLIT', 'SAME-SEED', 'CHUNK'];
  dupes.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || b.count - a.count);
  return dupes;
}

/**
 * Known-side splits at RAW case/diacritic sensitivity. normalizeForZUT lowercases and strips
 * fadas, so a capitalisation-only split is invisible to the normalised audit — but the SERVER
 * compares `known_text`/`target_text` raw, so it is a live gate risk, not a cosmetic nothing.
 */
function auditRawSplits(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = (r.known_text || '').trim();
    if (!m.has(k)) m.set(k, new Map());
    const t = (r.target_text || '').trim();
    if (!m.get(k).has(t)) m.get(k).set(t, []);
    m.get(k).get(t).push(r);
  }
  return [...m.entries()].filter(([, ts]) => ts.size > 1)
    .map(([known, ts]) => ({ known, variants: [...ts.entries()].map(([target, rows]) => ({ target, rows })) }));
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
    const legos = await fetchAll(sb, 'course_legos', course, 'id,seed_number,lego_index,known_text,target_text');
    const phrases = await fetchAll(sb, 'course_practice_phrases', course, 'id,seed_number,known_text,target_text');
    const raw = auditRawSplits([...legos.map(r => ({ ...r, src: 'L' })), ...phrases.map(r => ({ ...r, src: 'P' }))]);
    console.log(`\nRAW (case/fada-sensitive) KNOWN-SIDE SPLITS: ${raw.length} — the server compares raw, so these are live gate risks\n`);
    for (const g of raw) {
      console.log(`  "${g.known}"`);
      for (const v of g.variants) console.log(`      → "${v.target}"   [${v.rows.map(r => r.src + r.seed_number).join(' ')}]`);
    }

    if (argv.includes('--dupes')) {
      const dupes = await auditRepeatedTargets(sb, course);
      const tally = {};
      for (const d of dupes) tally[d.cls] = (tally[d.cls] || 0) + 1;
      console.log(`\nREPEATED PHRASE TARGETS: ${dupes.length} distinct strings, ` +
        `${dupes.reduce((n, d) => n + d.count - 1, 0)} excess rows`);
      console.log(`  ` + Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ') + '\n');
      for (const d of dupes) {
        console.log(`  [${d.cls}] x${d.count} seeds ${d.seeds.join(',')}  "${d.target}"`);
        if (d.knowns.length > 1) for (const k of d.knowns) console.log(`        EN: ${k}`);
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
    const { collisions, selfCollisions, duplicates } = crossCheck(parsed, built);
    console.log(`\n=== ${path.basename(file)} — seed ${parsed.seed_number} — course-wide phrase-aware ZUT ===`);
    for (const d of duplicates) {
      console.log(`  ⚠ DUPLICATE ${d.tag}: "${d.target}" is already taught at seed ${d.against_seed}, same English`);
    }
    if (!collisions.length && !selfCollisions.length) {
      console.log(duplicates.length
        ? `  PASS on ZUT — but ${duplicates.length} sentence(s) above are already taught elsewhere.`
        : '  PASS — no collision against any lego or phrase, any seed.');
      continue;
    }
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
module.exports = { buildIndex, crossCheck, auditIndex, auditRepeatedTargets, auditRawSplits, fetchAll, client, DEFAULT_COURSE };

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
