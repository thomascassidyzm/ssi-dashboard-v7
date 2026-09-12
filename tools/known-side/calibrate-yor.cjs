#!/usr/bin/env node
/**
 * Yoruba-specific calibration for the _known_yor known-side gate.
 *
 * calibrate.cjs already runs the language-independent controls (C1 planted violation, C2 clean
 * negative control, C3 old-gate defect, C4 ASCII regression). These are the controls that are only
 * meaningful for Yoruba, and without them the gate's Yoruba-specific claims are unproven assertions:
 *
 *   Y1  TONE IS LEXICAL          a minimal pair differing ONLY in tone must be dated separately:
 *                                the late-taught member must FIRE at an early seed, and the
 *                                early-taught member must NOT. Proves nothing strips diacritics.
 *   Y2  NFD WOULD BREAK IT       the same prompt in NFD must NOT silently pass — if it did, some
 *                                path is folding combining marks. (Expected: it flags, loudly.)
 *   Y3  REDUPLICATION RESOLVES   a CV-gerund of an ALREADY-taught verb must NOT flag …
 *   Y4  … BUT STILL DATES        … and the SAME gerund checked BEFORE its base verb's debut MUST
 *                                flag. A resolver that always passes is an exemption, not a check.
 *   Y5  EMPTY freeClass IS SAFE  every grammatical particle, checked at its own introduction seed,
 *                                must pass — the decision to leave freeClass empty costs no noise.
 *   Y6  152–157 ADJUDICATION     the tokens a human verifier could not adjudicate, with the gate's
 *                                verdict and the evidence for it.
 *
 * Read-only. Usage: node tools/known-side/calibrate-yor.cjs [course]   (default cym_for_yor)
 */

require('dotenv').config({ quiet: true });
const { supa, loadCourse } = require('./inventory.cjs');
const { buildContext, checkKnownSideV2, STATUS } = require('../../services/course-builder/lib/known-side-gate-v2.cjs');
const { segmentKnown } = require('../../services/course-builder/lib/known-side-script.cjs');

// Minimal pairs that differ ONLY in tone / sub-dot. Each is a real Yoruba word attested in the
// cym_for_yor corpus. Written out by hand rather than derived, so the control cannot be gamed by
// the same code path it is testing.
const TONE_PAIRS = [
  ['mo', 'mọ́'],   // 1sg subject   vs 'any more'
  ['mo', 'mọ̀'],   // 1sg subject   vs 'know'
  ['o', 'ó'],     // 2sg subject   vs 3sg subject
  ['ti', 'tí'],   // perfect       vs relativiser
  ['ni', 'ní'],   // copula        vs 'in/at'
  ['yí', 'yìí'],  // 'change'      vs 'this'
];

const PARTICLES = ['mo', 'láti', 'fẹ́', 'ń', 'ṣe', 'bá', 'máa', 'ní', 'tí', 'pé', 'ò', 'o', 'kí', 'a', 'ti', 'ni', 'kò', 'tó', 'sí', 'kì'];

function fires(text, pos, ctx) {
  const r = checkKnownSideV2(text, pos, ctx);
  return { status: r.status, tokens: r.tokens, why: [...r.violations, ...r.unchecked].map((x) => x.detail) };
}

async function calibrateYor(sb, courseCode) {
  const c = await loadCourse(sb, courseCode);
  const ctx = buildContext(c.contract, c.inventory, { knownLang: c.knownLang, courseCode });
  const inv = c.inventory;
  const R = { course: courseCode, contract: `${c.contractFile} [${c.contractSource}]`, inventory: inv.size, controls: {} };
  if (ctx.blockers.length) { R.error = ctx.blockers.map((b) => b.detail).join('; '); return R; }

  // ── Y1: tone is lexical ────────────────────────────────────────────────────────────────────
  const y1 = [];
  for (const [a, b] of TONE_PAIRS) {
    const pa = inv.get(a); const pb = inv.get(b);
    if (pa == null || pb == null) { y1.push({ pair: [a, b], skipped: `not both in inventory (${a}=${pa}, ${b}=${pb})` }); continue; }
    const [early, late] = pa <= pb ? [a, b] : [b, a];
    const [earlyPos, latePos] = pa <= pb ? [pa, pb] : [pb, pa];
    if (earlyPos === latePos) { y1.push({ pair: [a, b], skipped: `both introduced at seed ${earlyPos} — no separation to test` }); continue; }
    const lateAtEarly = fires(late, earlyPos, ctx);   // must FIRE
    const earlyAtEarly = fires(early, earlyPos, ctx); // must NOT fire
    y1.push({
      pair: [a, b], early, earlyPos, late, latePos,
      lateFlaggedAtEarlyPos: lateAtEarly.status === STATUS.VIOLATION,
      earlyCleanAtEarlyPos: earlyAtEarly.status === STATUS.PASS,
      ok: lateAtEarly.status === STATUS.VIOLATION && earlyAtEarly.status === STATUS.PASS,
      detail: lateAtEarly.why[0] || null,
    });
  }
  const y1live = y1.filter((x) => !x.skipped);
  R.controls.Y1_tone_is_lexical = {
    n: y1live.length, ok: y1live.filter((x) => x.ok).length,
    verdict: y1live.length && y1live.every((x) => x.ok)
      ? 'PASS — every tone/sub-dot minimal pair is dated as two separate words; nothing in the path strips diacritics'
      : 'FAIL — a tone minimal pair collapsed, which means a diacritic is being normalised away',
    trials: y1,
  };

  // ── Y2: NFD input must not silently pass ───────────────────────────────────────────────────
  const probe = [...inv.entries()].filter(([w, s]) => s >= 100 && /[̀́]/.test(w.normalize('NFD')) && !w.includes(' '))
    .sort((a, b) => b[1] - a[1])[0];
  if (probe) {
    const [w, s] = probe;
    const nfc = fires(w, 1, ctx);
    const nfd = fires(w.normalize('NFD'), 1, ctx);
    R.controls.Y2_nfd_does_not_leak = {
      token: w, introducedAtSeed: s, checkedAtSeed: 1,
      nfcStatus: nfc.status, nfdStatus: nfd.status,
      verdict: nfc.status === STATUS.VIOLATION && nfd.status === STATUS.VIOLATION
        ? 'PASS — the token flags in both NFC and NFD form; NFD input is never silently accepted'
        : `INSPECT — nfc=${nfc.status} nfd=${nfd.status}`,
      note: 'normalizeKnown re-normalises to NFC, so NFD input resolves to the same token. The control exists to prove NFD does not produce a spurious PASS.',
    };
  }

  // ── Y3 / Y4: the CV-reduplication gerund resolver ──────────────────────────────────────────
  // Corpus-derived: gerund-shaped tokens with NO introduction of their own whose base verb IS taught.
  const gerunds = [];
  const allTokens = new Set();
  for (const r of [...c.legos, ...c.phrases]) for (const t of segmentKnown(r.known_text || '', { script: c.script }).tokens) allTokens.add(t);
  for (const t of allTokens) {
    if (inv.has(t)) continue;
    const ch = [...t];
    if (ch.length < 3 || !['í', 'ì', 'i'].includes(ch[1]) || ch[2] !== ch[0]) continue;
    const base = ch.slice(2).join('');
    if (inv.has(base)) gerunds.push({ gerund: t, base, basePos: inv.get(base) });
  }
  const y3 = gerunds.map((g) => {
    const at = fires(g.gerund, g.basePos, ctx);          // at/after the base's debut → must pass
    const before = fires(g.gerund, Math.max(1, g.basePos - 1), ctx); // before it → must flag
    return { ...g, passesAtBaseDebut: at.status === STATUS.PASS, flagsBeforeBaseDebut: before.status === STATUS.VIOLATION, detailBefore: before.why[0] || null };
  });
  R.controls.Y3_reduplication_resolves = {
    n: y3.length, ok: y3.filter((x) => x.passesAtBaseDebut).length,
    verdict: y3.length && y3.every((x) => x.passesAtBaseDebut)
      ? 'PASS — every un-taught CV-gerund of a taught verb resolves to its base instead of reading as new vocabulary'
      : 'FAIL — a gerund of a taught verb still reads as untaught', trials: y3,
  };
  R.controls.Y4_reduplication_still_dates = {
    n: y3.length, ok: y3.filter((x) => x.flagsBeforeBaseDebut).length,
    verdict: y3.length && y3.every((x) => x.flagsBeforeBaseDebut)
      ? 'PASS — the same gerund checked one seed BEFORE its base verb debuts is still flagged; the resolver dates, it does not exempt'
      : 'FAIL — the resolver is a blanket exemption, not a check',
  };

  // ── Y5: an empty freeClass costs no noise ──────────────────────────────────────────────────
  const y5 = PARTICLES.map((p) => {
    const pos = inv.get(p);
    if (pos == null) return { particle: p, skipped: 'not in inventory' };
    return { particle: p, introducedAtSeed: pos, status: fires(p, pos, ctx).status };
  });
  const y5live = y5.filter((x) => !x.skipped);
  R.controls.Y5_empty_free_class_is_safe = {
    n: y5live.length, pass: y5live.filter((x) => x.status === STATUS.PASS).length,
    verdict: y5live.length && y5live.every((x) => x.status === STATUS.PASS)
      ? 'PASS — every Yoruba grammatical particle passes at its own introduction seed, so leaving freeClass empty adds no false positives while keeping all of them examinable'
      : 'FAIL — a particle flags at its own introduction seed', trials: y5,
  };

  // ── Y6: the seeds 152–157 adjudication ─────────────────────────────────────────────────────
  const firstSeen = new Map();
  const rows = [...c.legos.map((l) => ({ s: l.seed_number, t: l.known_text })), ...c.phrases.map((p) => ({ s: p.seed_number, t: p.known_text }))]
    .filter((r) => r.t && r.s != null).sort((a, b) => a.s - b.s);
  for (const r of rows) for (const t of segmentKnown(r.t, { script: c.script }).tokens) if (!firstSeen.has(t)) firstSeen.set(t, r.s);
  const window152 = [...firstSeen.entries()].filter(([, s]) => s >= 152 && s <= 157).sort((a, b) => a[1] - b[1]);
  R.controls.Y6_seeds_152_157 = {
    n: window152.length,
    tokens: window152.map(([t, s]) => {
      const invPos = inv.get(t);
      const v = fires(t, s, ctx);
      return {
        token: t, firstUsedAtSeed: s,
        introducedByLegoAtSeed: invPos ?? null,
        gateVerdict: v.status,
        reading: invPos == null ? 'NOT TAUGHT ANYWHERE — genuine untaught vocabulary'
          : invPos > s ? `USED BEFORE ITS LEGO (lego at seed ${invPos})`
            : invPos === s ? 'NORMAL FIRST INTRODUCTION — a lego at this very seed teaches it'
              : `already taught at seed ${invPos}`,
      };
    }),
  };
  R.controls.Y6_seeds_152_157.verdict = R.controls.Y6_seeds_152_157.tokens.every((t) => t.gateVerdict === STATUS.PASS)
    ? 'All tokens first appearing in seeds 152–157 are NORMAL FIRST INTRODUCTIONS: each is taught by a lego at the same seed it debuts. No untaught vocabulary in that window.'
    : 'At least one token in seeds 152–157 is NOT a normal first introduction — see the rows.';

  return R;
}

if (require.main === module) {
  (async () => {
    const course = process.argv[2] || 'cym_for_yor';
    const R = await calibrateYor(supa(), course);
    const out = process.env.CAL_OUT;
    if (out) { require('fs').writeFileSync(out, JSON.stringify(R, null, 2)); process.stderr.write(`wrote ${out}\n`); }
    else console.log(JSON.stringify(R, null, 2));
  })();
}

module.exports = { calibrateYor };
