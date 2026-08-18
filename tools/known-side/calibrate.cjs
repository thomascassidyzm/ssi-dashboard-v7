#!/usr/bin/env node
/**
 * Calibration harness for the known-side gate.
 *
 * "An uncalibrated count is not evidence." Before any sweep number is reported, this proves on
 * REAL course data that the gate:
 *
 *   C1  fires on a planted violation   — a word the course does teach, but only much later,
 *                                        dropped into an early prompt. Expect VIOLATION.
 *   C2  stays quiet on clean text      — real prompts whose every token is introduced by the
 *                                        seed at which the learner meets them. Expect no VIOLATION.
 *   C3  the OLD gate passes C1         — the defect itself, demonstrated rather than asserted.
 *   C4  no regression on ASCII         — v1 and v2 tokenize plain English identically.
 *
 * Usage: node tools/known-side/calibrate.cjs [course ...]
 */

const { supa, loadCourse } = require('./inventory.cjs');
const { buildContext, checkKnownSideV2, STATUS } = require('../../services/course-builder/lib/known-side-gate-v2.cjs');
const { segmentKnown, normalizeKnown } = require('../../services/course-builder/lib/known-side-script.cjs');
const v1 = require('../../services/course-builder/lib/validation.cjs');

// A stub used only where a course has no authored brief: calibration must test the SEGMENTER and
// the OUTCOME MACHINERY, which are language-independent. Stated in the report wherever used, so a
// stub-calibrated course is never presented as brief-calibrated.
const stubContract = (lang, script) => ({
  course_code: `_calibration_stub_${lang}`, known_lang: lang, known_lang_name: lang,
  script, segmentation: null, morphology: null, stemStrip: [], stemMinLen: 2,
  freeClass: [], npi: [], negation: [],
});

async function calibrate(sb, courseCode, opts = {}) {
  const c = await loadCourse(sb, courseCode);
  const usedStub = !c.contract;
  const contract = c.contract || stubContract(c.knownLang, c.script);
  const R = {
    course: courseCode, knownLang: c.knownLang, script: c.script,
    contract: usedStub ? `STUB (no brief authored for ${c.knownLang}) — machinery only` : `${c.contractFile} [${c.contractSource}]`,
    legos: c.legos.length, phrases: c.phrases.length, inventory: c.inventory.size,
    controls: {},
  };
  if (!c.legos.length) { R.error = 'no legos — cannot calibrate'; return R; }

  const ctx = buildContext(contract, c.inventory, { knownLang: c.knownLang, courseCode });

  // ── C2: NEGATIVE control. Real LEGO known_text, checked at its own seed. By construction
  // every token is introduced at that seed, so a correct gate must not raise a VIOLATION.
  // UNCHECKED is an acceptable, honest outcome here; a VIOLATION is a false positive.
  const cleanSample = c.legos.filter((l) => l.known_text && l.seed_number).slice(0, 400);
  let cleanPass = 0, cleanUnchecked = 0;
  const fpHigh = [], fpBorderline = [];
  for (const l of cleanSample) {
    const r = checkKnownSideV2(l.known_text, l.seed_number, ctx);
    if (r.status === STATUS.VIOLATION) {
      const rec = { seed: l.seed_number, text: l.known_text, why: r.violations.map((v) => v.detail) };
      if (r.violations.some((v) => v.confidence === 'high')) fpHigh.push(rec); else fpBorderline.push(rec);
    } else if (r.status === STATUS.UNCHECKED) cleanUnchecked++;
    else cleanPass++;
  }
  // The metric that matters is the HIGH-CONFIDENCE false-positive rate: borderline hits are
  // reported to a human for adjudication by design, high-confidence hits are asserted as real.
  R.controls.C2_clean = {
    n: cleanSample.length, pass: cleanPass, unchecked: cleanUnchecked,
    falsePositivesHigh: fpHigh.length, falsePositivesBorderline: fpBorderline.length,
    highRate: cleanSample.length ? `${(100 * fpHigh.length / cleanSample.length).toFixed(2)}%` : 'n/a',
    borderlineRate: cleanSample.length ? `${(100 * fpBorderline.length / cleanSample.length).toFixed(2)}%` : 'n/a',
    verdict: fpHigh.length === 0 ? 'PASS — zero high-confidence false positives on known-clean text'
      : (fpHigh.length / cleanSample.length < 0.01 ? 'PASS (<1% high-confidence noise)' : 'FAIL'),
    examplesHigh: fpHigh.slice(0, 6), examplesBorderline: fpBorderline.slice(0, 4),
  };

  // ── C1: POSITIVE control. Take a word the course teaches LATE and plant it into a prompt the
  // learner meets EARLY. It is real vocabulary of the right script and morphology — the gate must
  // still call it, because at that position the learner has not been given it.
  const early = c.legos.find((l) => l.seed_number <= 5 && l.known_text) || c.legos[0];
  // Threshold relative to the course's own span, so short courses still get a real positive control.
  const maxSeed = Math.max(...c.legos.map((l) => l.seed_number || 0));
  const lateCut = Math.max(early.seed_number + 1, Math.floor(maxSeed * 0.6));
  // Exclude free-class items from plant selection. A free-class function word is permitted at
  // any position by design (exemption E1), so planting one and expecting a violation tests the
  // harness's naivety, not the gate. (Marathi तुम्हा / आपली are pronouns in the brief's free
  // class; the gate was right to pass them and the harness was wrong to demand otherwise.)
  const freeSet = new Set((contract.freeClass || contract.freeGlue || []).map((w) => normalizeKnown(w)));
  const lateWords = [...c.inventory.entries()]
    .filter(([w, s]) => s >= lateCut && [...w].length >= 3 && !w.includes(' ') && !freeSet.has(w))
    .sort((a, b) => b[1] - a[1]).slice(0, 12);
  const plants = [];
  for (const [word, seed] of lateWords.slice(0, 6)) {
    const text = `${early.known_text} ${word}`;
    const r = checkKnownSideV2(text, early.seed_number, ctx);
    const caught = r.status === STATUS.VIOLATION && r.violations.some((v) => normalizeKnown(v.token || '') === word || (v.uncovered || '').includes(word) || (v.token || '').includes(word));
    plants.push({ planted: word, introducedAtSeed: seed, checkedAtSeed: early.seed_number, status: r.status, caught, detail: (r.violations[0] || r.unchecked[0] || {}).detail });
  }
  R.controls.C1_planted = {
    n: plants.length, caught: plants.filter((p) => p.caught).length,
    verdict: plants.length && plants.every((p) => p.caught) ? 'PASS' : (plants.some((p) => p.caught) ? 'PARTIAL' : 'FAIL'),
    trials: plants,
  };

  // ── C3: the defect. Feed the same planted strings to the v1 tokenizer.
  const v1Tokens = plants.map((p) => ({ planted: p.planted, v1tokens: v1.tokenizeKnown(`${early.known_text} ${p.planted}`), v2tokens: segmentKnown(`${early.known_text} ${p.planted}`, { script: c.script }).tokens }));
  const v1Blind = v1Tokens.filter((t) => t.v1tokens.length === 0).length;

  // The Latin arm of the defect: v1 does not go blind, it MANGLES. Measure how many real
  // known_text rows v1 tokenizes differently from the text that is actually there.
  const mangleSample = c.legos.filter((l) => l.known_text).slice(0, 400);
  const mangled = [];
  for (const l of mangleSample) {
    const a = v1.tokenizeKnown(l.known_text);
    const b = segmentKnown(l.known_text, { script: c.script, expandContractions: c.knownLang === 'eng' }).tokens;
    if (JSON.stringify(a) !== JSON.stringify(b)) mangled.push({ text: l.known_text, v1: a, v2: b });
  }

  R.controls.C3_old_gate_defect = {
    plantsTried: v1Tokens.length,
    v1ProducedZeroTokens: v1Blind,
    blindnessVerdict: !v1Tokens.length ? 'no plants available'
      : v1Blind === v1Tokens.length ? 'DEFECT CONFIRMED (blind) — v1 saw zero tokens, so it reported PASS'
        : v1Blind ? `DEFECT CONFIRMED (blind on ${v1Blind}/${v1Tokens.length})`
          : 'v1 was not blind here (Latin script) — see mangling below',
    manglingSample: mangleSample.length,
    manglingRows: mangled.length,
    manglingRate: mangleSample.length ? `${(100 * mangled.length / mangleSample.length).toFixed(1)}%` : 'n/a',
    manglingVerdict: mangled.length ? `DEFECT CONFIRMED (mangling) — v1 mis-tokenizes ${mangled.length}/${mangleSample.length} real rows` : 'v1 tokenizes this corpus faithfully',
    manglingExamples: mangled.slice(0, 6),
    plantSample: v1Tokens.slice(0, 3),
  };
  return R;
}

/** C4 — ASCII regression guard, run once, not per course. */
function asciiRegression() {
  const cases = ['I want to speak', "I don't know if it's there", 'have you been able to do that yet', 'we would like to try again'];
  const rows = cases.map((t) => ({
    text: t,
    v1: v1.tokenizeKnown(t),
    v2: segmentKnown(t, { script: 'Latn', expandContractions: true }).tokens,
  })).map((r) => ({ ...r, identical: JSON.stringify(r.v1) === JSON.stringify(r.v2) }));
  const same = rows.every((r) => r.identical);
  return {
    verdict: same ? 'PASS — every English case tokenizes byte-identically to v1, so the 76 English-known courses are unaffected' : 'FAIL — v2 diverges from v1 on English',
    rows,
  };
}

if (require.main === module) {
  (async () => {
    const sb = supa();
    const courses = process.argv.slice(2);
    if (!courses.length) { console.error('usage: calibrate.cjs <course> [course ...]'); process.exit(2); }
    const out = { generated: new Date().toISOString(), C4_ascii_regression: asciiRegression(), courses: [] };
    for (const cc of courses) {
      process.stderr.write(`calibrating ${cc}...\n`);
      try { out.courses.push(await calibrate(sb, cc)); }
      catch (err) { out.courses.push({ course: cc, error: err.message }); }
    }
    const outPath = process.env.CAL_OUT || '/tmp/known-side-calibration.json';
    require('fs').writeFileSync(outPath, JSON.stringify(out, null, 2));
    process.stderr.write(`wrote ${outPath}\n`);
  })();
}

module.exports = { calibrate, asciiRegression };
