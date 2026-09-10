#!/usr/bin/env node
/**
 * scan-course Check 20 — seed containment for LEGO text, BOTH SIDES.
 *
 *   node tools/check-seed-containment.cjs <course_code>
 *   node tools/check-seed-containment.cjs <course_code> --json
 *   node tools/check-seed-containment.cjs <course_code> --tier lexical
 *   node tools/check-seed-containment.cjs --known-lang eng        # every eng-known course
 *   node tools/check-seed-containment.cjs --all                   # the whole estate
 *
 * THE RULE (Kai, 2026-09-09): a LEGO is a fragment of its own seed sentence and may
 * contain only words that seed actually says.
 *
 * THIS IS A READING LIST, NOT A VERDICT. Kai, authorising it 2026-09-10: "we shouldn't
 * expect the items it flags to necessarily be wrong, but it'll be good to look at them
 * and why they're different from the seed." So it WARNS and never blocks: it always
 * exits 0 when it has run, whatever it finds, and it prints both sides of every pair
 * (canon K4) so a human can read the row and decide.
 *
 * IT LIVES HERE AND ONLY HERE. It is not in the course builder and not in the build
 * validator, by Kai's explicit instruction: "We shouldn't touch the builder without
 * having something that definitely works, and then only through talking to Tom."
 *
 * BOTH SIDES, and they are counted SEPARATELY. Kai: "this is relevant to both target
 * and known." Note what each side measures: the target side is validated at submit time
 * by checkTiling, so a low target count measures the validator as much as the content
 * (canon WC-F5) and target hits are mostly post-submit drift. The KNOWN side is not
 * validated by anything, which is where the independent signal lives.
 *
 * READ-ONLY. No writes, no audio, no DB mutation of any kind.
 *
 * Rule + tokenisation live in tools/seed-containment/tokenise.cjs, pinned by
 * tools/seed-containment/tokenise.test.cjs.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true });
const { Client } = require('pg');
const { containment, tierOf } = require('./seed-containment/tokenise.cjs');

const TIERS = ['lexical', 'markup', 'variant'];

async function query(sql, params = []) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

const SQL = `
  select l.course_code, l.lego_id, l.seed_number, l.lego_index, l.type, l.is_new,
         l.known_text as lego_known, l.target_text as lego_target,
         s.known_text as seed_known, s.target_text as seed_target
    from course_legos l
    join course_seeds s
      on s.course_code = l.course_code and s.seed_number = l.seed_number
   where l.course_code = any($1)
   order by l.course_code, l.seed_number, l.lego_index
`;

function blankCounts() {
  return {
    rows: 0, analysed: 0, excluded_spaceless: 0, excluded_empty: 0, hits: 0,
    lexical: 0, markup: 0, variant: 0, contraction_only: 0,
  };
}

/** Run the containment rule over already-fetched rows. Pure — no DB, so it is testable. */
function analyse(rows) {
  const known = blankCounts();
  const target = blankCounts();
  const hits = [];
  for (const r of rows) {
    for (const side of ['known', 'target']) {
      const c = side === 'known' ? known : target;
      const legoText = side === 'known' ? r.lego_known : r.lego_target;
      const seedText = side === 'known' ? r.seed_known : r.seed_target;
      c.rows += 1;
      const res = containment(legoText, seedText);
      if (res.status !== 'ok') { c[res.status] += 1; continue; }
      c.analysed += 1;
      if (res.contraction_only) c.contraction_only += 1;
      if (!res.missing.length) continue;
      const tier = tierOf(legoText, res.missing, res.seedTokens);
      c.hits += 1;
      c[tier] += 1;
      hits.push({
        course_code: r.course_code,
        lego_id: r.lego_id,
        seed_number: r.seed_number,
        type: r.type,
        is_new: r.is_new,
        side,
        tier,
        missing: res.missing,
        lego_known: r.lego_known,
        lego_target: r.lego_target,
        seed_known: r.seed_known,
        seed_target: r.seed_target,
      });
    }
  }
  return { known, target, hits };
}

function coverageLine(label, c) {
  const pct = c.rows ? ((c.analysed / c.rows) * 100).toFixed(2) : '0.00';
  const ex = [];
  if (c.excluded_spaceless) ex.push(`${c.excluded_spaceless} spaceless-script (EXCLUDED, not clean)`);
  if (c.excluded_empty) ex.push(`${c.excluded_empty} empty text`);
  return `${label} coverage: ${c.analysed}/${c.rows} (${pct}%)${ex.length ? '  —  ' + ex.join('; ') : ''}`;
}

/** One hit, written out so it can be read on a phone. Both sides of the pair, always. */
function renderHit(h, i) {
  const L = [];
  L.push(`${i}. ${h.course_code}  ${h.lego_id}  [${h.side} side, ${h.tier}]`);
  L.push(`   NOT IN THE SEED: ${h.missing.map((w) => `"${w}"`).join(', ')}`);
  L.push(`   seed  known : ${h.seed_known}`);
  L.push(`   seed  target: ${h.seed_target}`);
  L.push(`   lego  known : ${h.lego_known}`);
  L.push(`   lego  target: ${h.lego_target}`);
  return L.join('\n');
}

function report(out, opts) {
  const { known, target, hits } = out;
  console.log('=== Check 20: seed containment — a LEGO may contain only words its own seed says ===');
  console.log('WARN ONLY. A hit is something to LOOK AT, not something known to be wrong.\n');
  console.log(`courses: ${out.courses.length}   lego rows: ${known.rows}`);
  console.log(coverageLine('KNOWN side ', known));
  console.log(coverageLine('TARGET side', target));
  console.log('');
  console.log(`KNOWN-side hits : ${known.hits}   (lexical ${known.lexical}, markup ${known.markup}, variant ${known.variant})`);
  console.log(`TARGET-side hits: ${target.hits}   (lexical ${target.lexical}, markup ${target.markup}, variant ${target.variant})`);
  console.log('  lexical = a word with no relative in the seed at all — read these first');
  console.log('  markup  = the lego carries a bracket or a slash (also Checks 1 and 2)');
  console.log('  variant = every missing word looks like an inflection of a seed word — weakest');
  console.log(`  rows cleared ONLY by contraction expansion (known ${known.contraction_only}, target ${target.contraction_only})`);
  console.log('    — these would be hits under bare string containment; the seed does say those words');
  console.log('');
  const wanted = opts.tier ? hits.filter((h) => h.tier === opts.tier) : hits;
  const shown = opts.all ? wanted : wanted.slice(0, opts.limit);
  if (shown.length) {
    console.log(`--- ${shown.length} of ${wanted.length} shown ---\n`);
    shown.forEach((h, i) => console.log(renderHit(h, i + 1) + '\n'));
  }
  return 0;   // warn-only: this check never blocks
}

async function resolveCourses(args) {
  const knownLangIdx = args.indexOf('--known-lang');
  if (args.includes('--all')) {
    return (await query('select course_code from courses order by course_code')).map((r) => r.course_code);
  }
  if (knownLangIdx >= 0) {
    const lang = args[knownLangIdx + 1];
    return (await query('select course_code from courses where known_lang = $1 order by course_code', [lang]))
      .map((r) => r.course_code);
  }
  const one = args.find((a) => !a.startsWith('--') && !TIERS.includes(a));
  return one ? [one] : [];
}

async function main() {
  const args = process.argv.slice(2);
  const tierIdx = args.indexOf('--tier');
  const limitIdx = args.indexOf('--limit');
  const opts = {
    json: args.includes('--json'),
    all: args.includes('--all-samples'),
    tier: tierIdx >= 0 ? args[tierIdx + 1] : null,
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) : 20,
  };
  if (opts.tier && !TIERS.includes(opts.tier)) {
    console.error(`--tier must be one of ${TIERS.join(', ')}`);
    process.exit(2);
  }
  const courses = await resolveCourses(args);
  if (!courses.length) {
    console.error('usage: check-seed-containment.cjs <course_code> | --known-lang <lang> | --all');
    console.error('       [--json] [--tier lexical|markup|variant] [--limit N] [--all-samples]');
    process.exit(2);
  }
  const rows = await query(SQL, [courses]);
  const out = { courses, ...analyse(rows) };
  if (opts.json) { console.log(JSON.stringify(out, null, 2)); return 0; }
  return report(out, opts);
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(e.stack || e.message); process.exit(2); });
}

module.exports = { analyse, renderHit };
