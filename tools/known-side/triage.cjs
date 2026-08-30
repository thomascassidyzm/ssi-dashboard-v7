#!/usr/bin/env node
/**
 * Triage the sweep's machine hits into classes, so no raw count is ever reported as a finding.
 *
 * Kai's standing rule: never hand over a raw hit count as if it were a finding. This splits every
 * hit into classes that say WHY it fired, most of which are false positives under the known-side
 * allowance (requirement 2: the learner's own language may run ahead where it still makes sense).
 *
 * The classes, in the order they are tested — first match wins:
 *
 *   metalinguistic     the known_text carries authoring scaffolding (〜 placeholders, parenthetical
 *                      grammar tags like (3sg), （対格）). A content defect, NOT an untaught word.
 *                      Out of scope here exactly as the 2026-06 sweeps ruled.
 *   inflection         the flagged token shares a >=2-character prefix with a form ALREADY taught
 *                      by this seed. On an inflecting known side that is the learner's own
 *                      morphology, not new vocabulary. The single largest false-positive class.
 *   ordering           it shares a prefix only with a form taught LATER. A real methodology
 *                      question (the prompt runs ahead of its own introduction) but a much weaker
 *                      claim than "never taught", and often legitimate on the known side.
 *   npi                a negative-polarity item in a positive declarative. Borderline by
 *                      construction; the pilot calibrated on exactly this and it never counts as
 *                      high-confidence.
 *   candidate          no taught form shares even two leading characters. The strongest class —
 *                      and still only a CANDIDATE, because prefix matching cannot see a stem
 *                      change (Japanese 話す/話し) or a prefix-inflecting language (Arabic ال-).
 *
 * Nothing here is a verdict on the language. It is a sort, so a human or an agent reads the
 * strongest 5% instead of all of it.
 *
 * Usage: node tools/known-side/triage.cjs <sweep.json> [--out=path.json]
 */

const fs = require('fs');
const { supa, loadCourse } = require('./inventory.cjs');
const { buildContext, checkKnownSideV2, STATUS } = require('../../services/course-builder/lib/known-side-gate-v2.cjs');
const { normalizeKnown } = require('../../services/course-builder/lib/known-side-script.cjs');

// Authoring scaffolding that leaked into known_text. Parenthetical grammar tags — "(3sg)",
// "（対格）", "(3a persona pasado)" — and the 〜 slot placeholder.
const META_RE = /[〜～]|[（(][^)）]{0,40}[)）]/u;

const commonPrefix = (a, b) => {
  const x = [...a], y = [...b];
  let n = 0;
  while (n < x.length && n < y.length && x[n] === y[n]) n++;
  return n;
};

const CLASSES = ['metalinguistic', 'inflection', 'ordering', 'npi', 'candidate'];

function triageCourse(c) {
  const ctx = buildContext(c.contract, c.inventory, { knownLang: c.knownLang, courseCode: c.courseCode });
  const R = {
    course: c.courseCode, knownLang: c.knownLang, script: c.script,
    blocked: ctx.blockers.map((b) => b.reason),
    rows: 0, hits: 0, classes: {}, examples: {}, topCandidateTokens: {},
  };
  if (ctx.blockers.length) return R;

  const entries = [...c.inventory.entries()];
  const rows = [
    ...c.legos.map((l) => ({ kind: 'lego', id: l.lego_id, s: l.seed_number, k: l.known_text, t: l.target_text })),
    ...c.phrases.map((p) => ({ kind: 'phrase', id: p.id, s: p.seed_number, k: p.known_text, t: p.target_text })),
  ].filter((r) => r.k && r.s != null);
  R.rows = rows.length;

  for (const r of rows) {
    const v = checkKnownSideV2(r.k, r.s, ctx);
    if (v.status !== STATUS.VIOLATION) continue;
    R.hits++;

    const worst = v.violations.find((x) => x.confidence === 'high') || v.violations[0];
    const tok = normalizeKnown(worst.uncovered || worst.token || '');

    let cls;
    if (META_RE.test(r.k)) cls = 'metalinguistic';
    else if (v.violations.every((x) => x.reason === 'npi_unlicensed')) cls = 'npi';
    else if (entries.some(([w, sd]) => sd <= r.s && commonPrefix(w, tok) >= 2)) cls = 'inflection';
    else if (entries.some(([w, sd]) => sd > r.s && commonPrefix(w, tok) >= 2)) cls = 'ordering';
    else cls = 'candidate';

    R.classes[cls] = (R.classes[cls] || 0) + 1;
    if (cls === 'candidate') R.topCandidateTokens[tok] = (R.topCandidateTokens[tok] || 0) + 1;
    const bucket = (R.examples[cls] = R.examples[cls] || []);
    // Spread examples across the seed range rather than taking the first N (seed-ordered).
    if (bucket.length < 40) bucket.push({ id: r.id, seed: r.s, known: r.k, target: r.t, token: tok, reason: worst.reason });
  }
  R.topCandidateTokens = Object.entries(R.topCandidateTokens).sort((a, b) => b[1] - a[1]).slice(0, 20);
  return R;
}

if (require.main === module) {
  (async () => {
    const sweepPath = process.argv[2] || '/tmp/sweep-final.json';
    const outPath = (process.argv.find((a) => a.startsWith('--out=')) || '').split('=')[1] || '/tmp/known-side-triage.json';
    const sweep = JSON.parse(fs.readFileSync(sweepPath, 'utf8'));
    const sb = supa();
    const out = { generated: new Date().toISOString(), source: sweepPath, courses: [] };
    for (const s of sweep.courses) {
      if (s.status === 'EMPTY') continue;
      process.stderr.write(`triaging ${s.course} ... `);
      try {
        const c = await loadCourse(sb, s.course);
        const r = triageCourse(c);
        out.courses.push(r);
        process.stderr.write(r.blocked.length ? `blocked (${r.blocked.join(',')})\n`
          : `${r.hits} hits -> ${CLASSES.map((k) => `${k}:${r.classes[k] || 0}`).join(' ')}\n`);
      } catch (err) { process.stderr.write(`ERROR ${err.message}\n`); }
    }
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    process.stderr.write(`\nwrote ${outPath}\n`);
  })();
}

module.exports = { triageCourse, CLASSES, META_RE };
