#!/usr/bin/env node
/**
 * Estate sweep for the known-side untaught-word gate.
 *
 * Reports, per course, THREE outcomes and never two:
 *   checked   — the gate ran and answered (pass or violation)
 *   violation — high-confidence + borderline, kept separate
 *   unchecked — with the reason code, per Kai's requirement 1
 *
 * A course whose rows are mostly UNCHECKED is reported as UNCHECKED, not green. Read-only.
 *
 * Usage:
 *   node tools/known-side/sweep.cjs --set=31          the 31 non-Latin-known courses
 *   node tools/known-side/sweep.cjs --set=all
 *   node tools/known-side/sweep.cjs eng_for_hin ...
 *   env SWEEP_OUT=path.json
 */

const fs = require('fs');
const { supa, loadCourse, knownLangOf } = require('./inventory.cjs');
const { buildContext, checkKnownSideV2, STATUS } = require('../../services/course-builder/lib/known-side-gate-v2.cjs');

// Known languages written in a non-Latin script. The 31-course set of Kai's 2026-08-17 card is
// this list minus Chinese-known (which the card did not name); zho-known is swept separately and
// reported as an addendum rather than silently folded in.
const NON_LATIN_KNOWN = ['ara', 'ben', 'guj', 'hin', 'jpn', 'kan', 'kor', 'mar', 'pan', 'sin', 'tam', 'tel', 'urd'];
const ALSO_NON_LATIN = ['zho'];

async function allCourses(sb) {
  const { data, error } = await sb.from('courses').select('course_code,status').order('course_code');
  if (error) throw new Error(error.message);
  return data.filter((c) => !/^zzz_test|^eng_template$/.test(c.course_code));
}

function sweepCourse(c) {
  const ctx = buildContext(c.contract, c.inventory, { knownLang: c.knownLang, courseCode: c.courseCode });

  const rows = [
    ...c.legos.map((l) => ({ kind: 'lego', id: l.lego_id, seed: l.seed_number, known: l.known_text, target: l.target_text })),
    ...c.phrases.map((p) => ({ kind: 'phrase', id: p.id, seed: p.seed_number, known: p.known_text, target: p.target_text })),
  ].filter((r) => r.known && r.seed != null);

  const R = {
    course: c.courseCode, knownLang: c.knownLang, targetLang: c.targetLang, script: c.script,
    contract: c.contractFile, contractSource: c.contractSource, contractError: c.contractError,
    legos: c.legos.length, phrases: c.phrases.length, inventory: c.inventory.size, rowsChecked: rows.length,
    pass: 0, violationRows: 0, uncheckedRows: 0,
    violationsHigh: 0, violationsBorderline: 0,
    uncheckedReasons: {}, violationReasons: {},
    topTokens: {}, findings: [],
  };
  if (!rows.length) {
    // Distinct from UNCHECKED. An empty course is not a course the gate failed to check —
    // it is a course with nothing in it. Conflating the two would inflate the unchecked count
    // and hide the fact that these are unbuilt shells. (Estate note: corpus absence is not
    // corruption.) Reported in its own category.
    R.status = 'EMPTY';
    R.uncheckedReasons.no_content = 1;
    R.headline = 'course has 0 legos and 0 phrases — nothing to check';
    return R;
  }

  for (const r of rows) {
    const v = checkKnownSideV2(r.known, r.seed, ctx);
    if (v.status === STATUS.PASS) R.pass++;
    else if (v.status === STATUS.VIOLATION) {
      R.violationRows++;
      const high = v.violations.filter((x) => x.confidence === 'high');
      const bord = v.violations.filter((x) => x.confidence !== 'high');
      R.violationsHigh += high.length;
      R.violationsBorderline += bord.length;
      for (const x of v.violations) {
        R.violationReasons[x.reason] = (R.violationReasons[x.reason] || 0) + 1;
        const t = x.token || x.uncovered || '?';
        R.topTokens[t] = (R.topTokens[t] || 0) + 1;
      }
      R.findings.push({
        kind: r.kind, id: r.id, seed: r.seed, known: r.known, target: r.target,
        high: high.map((x) => ({ token: x.token, reason: x.reason, firstPos: x.firstPos, detail: x.detail })),
        borderline: bord.map((x) => ({ token: x.token, reason: x.reason, detail: x.detail })),
      });
    } else {
      R.uncheckedRows++;
      for (const u of v.unchecked) R.uncheckedReasons[u.reason] = (R.uncheckedReasons[u.reason] || 0) + 1;
    }
  }

  const answered = R.pass + R.violationRows;
  R.answeredPct = +(100 * answered / rows.length).toFixed(1);
  // A course is only CHECKED if the gate actually answered for most of it. This is the whole
  // point of requirement 1: high UNCHECKED must never read as green.
  R.status = ctx.blockers.length ? 'UNCHECKED'
    : R.answeredPct >= 90 ? 'CHECKED'
      : R.answeredPct >= 50 ? 'PARTIALLY CHECKED'
        : 'UNCHECKED';
  R.headline = ctx.blockers.length
    ? ctx.blockers.map((b) => b.reason).join(', ')
    : `${R.answeredPct}% of rows answered; ${R.violationsHigh} high-confidence, ${R.violationsBorderline} borderline`;
  R.topTokens = Object.entries(R.topTokens).sort((a, b) => b[1] - a[1]).slice(0, 25);
  R.findings = R.findings.slice(0, 400); // cap the payload; counts above are complete
  R.findingsTruncated = R.violationRows > 400;
  return R;
}

if (require.main === module) {
  (async () => {
    const sb = supa();
    const args = process.argv.slice(2);
    const setArg = (args.find((a) => a.startsWith('--set=')) || '').split('=')[1];
    let codes = args.filter((a) => !a.startsWith('--'));
    if (setArg) {
      const all = await allCourses(sb);
      const langs = setArg === 'all' ? null : setArg === 'zho' ? ALSO_NON_LATIN : NON_LATIN_KNOWN;
      codes = all.map((c) => c.course_code).filter((cc) => !langs || langs.includes(knownLangOf(cc)));
    }
    if (!codes.length) { console.error('nothing to sweep'); process.exit(2); }
    process.stderr.write(`sweeping ${codes.length} courses\n`);
    const out = { generated: new Date().toISOString(), set: setArg || 'explicit', courses: [] };
    for (const cc of codes) {
      process.stderr.write(`  ${cc} ... `);
      try {
        const c = await loadCourse(sb, cc);
        const r = sweepCourse(c);
        out.courses.push(r);
        process.stderr.write(`${r.status} (${r.headline})\n`);
      } catch (err) {
        out.courses.push({ course: cc, status: 'UNCHECKED', headline: `sweep error: ${err.message}`, uncheckedReasons: { sweep_error: 1 } });
        process.stderr.write(`ERROR ${err.message}\n`);
      }
    }
    const p = process.env.SWEEP_OUT || '/tmp/known-side-sweep.json';
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
    process.stderr.write(`\nwrote ${p}\n`);
  })();
}

module.exports = { sweepCourse, NON_LATIN_KNOWN, ALSO_NON_LATIN };
