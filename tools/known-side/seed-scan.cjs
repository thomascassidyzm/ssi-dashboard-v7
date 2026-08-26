#!/usr/bin/env node
/**
 * Known-side untaught-word scan over a course's SEED SENTENCES (course_seeds.known_text).
 *
 * The estate sweep (sweep.cjs) checks legos and practice phrases. It does NOT check the seed
 * sentence itself, and it silently omits any seed that has no legos — so a course whose seeds run
 * far ahead of its decomposition looks fully checked when most of it has never been looked at.
 * cym_for_yor is exactly that shape: 668 authored seeds, legos through seed 160 only.
 *
 * This scan restores the three-outcome discipline over the WHOLE seed list:
 *
 *   pass       every token of the seed's known text is introduced by that seed
 *   violation  a token is vocabulary the learner has demonstrably not been given
 *   unchecked  NO_VOCAB_INVENTORY — the seed lies past the last decomposed seed, so there is no
 *              introduced-vocabulary inventory to check it against. This is the honest verdict for
 *              an undecomposed tail and it must never be counted or reported as a pass.
 *
 * For the undecomposed tail it also emits a FIRST-APPEARANCE CENSUS: the token types that appear
 * there and are absent from the inventory built so far, with the seed at which each debuts. That is
 * not a defect list — it is the forward vocabulary workload, and it is the thing a decomposition
 * agent can actually act on when its slice comes up.
 *
 * Read-only. Usage: node tools/known-side/seed-scan.cjs <course> [--out=path.json]
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { supa, loadCourse, pageAll } = require('./inventory.cjs');
const { buildContext, checkKnownSideV2, STATUS } = require('../../services/course-builder/lib/known-side-gate-v2.cjs');
const { segmentKnown, REASON, REASON_TEXT } = require('../../services/course-builder/lib/known-side-script.cjs');

async function seedScan(sb, courseCode) {
  const c = await loadCourse(sb, courseCode);
  const seeds = (await pageAll(sb, 'course_seeds', 'seed_number,known_text,target_text,status', courseCode))
    .filter((s) => s.known_text && s.seed_number != null)
    .sort((a, b) => a.seed_number - b.seed_number);

  const lastDecomposed = c.legos.length ? Math.max(...c.legos.map((l) => l.seed_number || 0)) : 0;
  const ctx = buildContext(c.contract, c.inventory, { knownLang: c.knownLang, courseCode });

  const R = {
    course: courseCode, knownLang: c.knownLang, script: c.script,
    contract: c.contractFile, contractSource: c.contractSource, contractError: c.contractError,
    seeds: seeds.length, legos: c.legos.length, inventory: c.inventory.size,
    lastDecomposedSeed: lastDecomposed,
    checkable: 0, pass: 0, violationRows: 0, uncheckedRows: 0,
    uncheckedReasons: {}, findings: [], forwardCensus: [],
  };

  for (const s of seeds) {
    // Past the last decomposed seed there is no inventory covering this position. Refuse, loudly.
    if (s.seed_number > lastDecomposed) {
      R.uncheckedRows++;
      R.uncheckedReasons[REASON.NO_VOCAB_INVENTORY] = (R.uncheckedReasons[REASON.NO_VOCAB_INVENTORY] || 0) + 1;
      continue;
    }
    R.checkable++;
    const v = checkKnownSideV2(s.known_text, s.seed_number, ctx);
    if (v.status === STATUS.PASS) R.pass++;
    else if (v.status === STATUS.VIOLATION) {
      R.violationRows++;
      R.findings.push({
        seed: s.seed_number, known: s.known_text, target: s.target_text, status: s.status,
        violations: v.violations.map((x) => ({ token: x.token, reason: x.reason, firstPos: x.firstPos, lemma: x.lemma, detail: x.detail, confidence: x.confidence })),
      });
    } else {
      R.uncheckedRows++;
      for (const u of v.unchecked) R.uncheckedReasons[u.reason] = (R.uncheckedReasons[u.reason] || 0) + 1;
    }
  }

  // Forward census over the undecomposed tail.
  const census = new Map();
  for (const s of seeds) {
    if (s.seed_number <= lastDecomposed) continue;
    for (const t of segmentKnown(s.known_text, { script: c.script, segmentation: (c.contract && c.contract.segmentation) || null }).tokens) {
      if (c.inventory.has(t)) continue;
      if (!census.has(t)) census.set(t, { token: t, debutSeed: s.seed_number, occurrences: 0 });
      census.get(t).occurrences++;
    }
  }
  R.forwardCensus = [...census.values()].sort((a, b) => a.debutSeed - b.debutSeed);
  R.forwardCensusTypes = R.forwardCensus.length;

  R.answeredPct = R.seeds ? +(100 * (R.pass + R.violationRows) / R.seeds).toFixed(1) : 0;
  R.status = ctx.blockers.length ? 'UNCHECKED'
    : R.answeredPct >= 90 ? 'CHECKED'
      : R.answeredPct >= 50 ? 'PARTIALLY CHECKED' : 'UNCHECKED';
  R.headline = ctx.blockers.length
    ? ctx.blockers.map((b) => b.reason).join(', ')
    : `${R.pass + R.violationRows}/${R.seeds} seeds answered (through seed ${lastDecomposed}); `
      + `${R.violationRows} flagged; ${R.uncheckedRows} UNCHECKED — ${REASON_TEXT.no_vocab_inventory} past seed ${lastDecomposed}`;
  return R;
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const course = args.find((a) => !a.startsWith('--'));
    if (!course) { console.error('usage: seed-scan.cjs <course> [--out=path.json]'); process.exit(2); }
    const out = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1] || process.env.SCAN_OUT;
    const R = await seedScan(supa(), course);
    process.stderr.write(`${R.course}: ${R.status} — ${R.headline}\n`);
    if (out) { fs.writeFileSync(out, JSON.stringify(R, null, 2)); process.stderr.write(`wrote ${out}\n`); }
    else console.log(JSON.stringify(R, null, 2));
  })();
}

module.exports = { seedScan };
