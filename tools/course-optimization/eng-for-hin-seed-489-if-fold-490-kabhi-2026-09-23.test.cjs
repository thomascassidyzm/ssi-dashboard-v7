// The one test that proves the change (job #914·H, 2026-09-23). Kai's two rulings: (1) seed 489's frame LEGO carries
// अगर / "if" — alone, आपने मेरे लिए नहीं बनाई is past tense; (2) seed 490's "never" rows carry कभी. Against the LIVE
// rows both rules FAIL; against the new cut they pass, the LEGOs tile the seed on BOTH sides, every phrase contains
// its LEGO on both sides, the 8 frame phrases and all English are preserved byte-for-byte, and the intros are the
// bare Frame A line. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs');
const { renderIntro } = require('../../services/phases/presentation-author.cjs');

describe('eng_for_hin seed 489: अगर folds into the frame LEGO', () => {
  it('the live frame LEGO does not carry if (the pre-fix state fails)', () => {
    expect(T.frameCarriesIf(T.OLD_FRAME)).toBe(false);
    expect(T.OLD_489_LEGOS.some(l => l.target === 'if')).toBe(true);
  });
  it('the new frame carries अगर / if, no separate "if" survives, and three LEGOs tile the seed on both sides', () => {
    expect(T.frameCarriesIf(T.LEGOS_489[2])).toBe(true);
    expect(T.LEGOS_489).toHaveLength(3);
    expect(T.LEGOS_489.some(l => l.target === 'if' || l.known === 'अगर')).toBe(false);
    expect(T.legosTileSeedBothSides(T.LEGOS_489, T.SEED_489)).toBe(true);
    expect(T.legosTileSeedBothSides(T.LEGOS_489.slice(0, 2), T.SEED_489)).toBe(false);
    expect(T.NEW_FRAME).toEqual({ known: 'अगर आपने मेरे लिए नहीं बनाई', target: "if you don't make me" });
  });
  it('every phrase contains its LEGO on both sides; the 8 frame phrases move byte-for-byte; baskets are full', () => {
    for (const l of T.LEGOS_489) for (const p of [...l.build, ...l.use]) expect(T.phraseContainsLego(l, p), `${l.idx}: ${p.target}`).toBe(true);
    // the old label alone would have been contained too — the fold is about the Hindi meaning, not containment
    const oldL04 = T.OLD_489_PHRASES.filter(p => p.id.includes('S0489L04'));
    expect(T.phraseRows('S0489L03', T.LEGOS_489[2].build, T.LEGOS_489[2].use).map(p => [p.role, p.known, p.target])).toEqual(oldL04.map(p => [p.role, p.known, p.target]));
    for (const l of T.LEGOS_489) { expect(l.build.length).toBeGreaterThanOrEqual(3); expect(l.use.length).toBeGreaterThanOrEqual(5); }
  });
  it('Hindi containment allows the frame to wrap other chunks; English containment is contiguous', () => {
    expect(T.containsInOrder('अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मुझे देर हो जाएगी।', 'अगर आपने मेरे लिए नहीं बनाई', true)).toBe(true);
    expect(T.containsInOrder('अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई', 'अगर आपने मेरे लिए नहीं बनाई', false)).toBe(false);
    expect(T.containsInOrder("I'm afraid if you don't make me a strong cup of coffee right now", "if you don't make me", false)).toBe(true);
    expect(T.containsInOrder('मेरे लिए अगर', 'अगर मेरे लिए', true)).toBe(false);
  });
  it('the intro is the bare Frame A line for the new chunk', () => {
    const intro = T.frameAIntro(T.NEW_FRAME.known, renderIntro);
    expect(intro).toBe("अंग्रेज़ी में — 'अगर आपने मेरे लिए नहीं बनाई' — में :");
    expect(intro).not.toMatch(/जैसे|as in/);
  });
});

describe('eng_for_hin seed 490: "never" carries कभी', () => {
  it('the live L01 and its 8 phrases lack कभी (the pre-fix state fails)', () => {
    expect(T.neverRuleViolations([{ id: 'S0490L01', ...T.OLD_490_LEGOS[0] }, ...T.OLD_490_L01_PHRASES])).toHaveLength(9);
  });
  it('the new L01 and every phrase carry exactly one कभी, English unchanged, LEGO contained (the post-fix state passes)', () => {
    expect(T.NEW_490_L01.known).toBe('तो मैं कभी किसी पर भरोसा नहीं करूँगा');
    expect(T.neverRuleViolations(T.allRows())).toEqual([]);
    T.NEW_490_L01_PHRASES.forEach((p, i) => {
      expect(p.target).toBe(T.OLD_490_L01_PHRASES[i].target);
      expect(p.known.match(/कभी/gu)).toHaveLength(1);
      expect(T.containsInOrder(p.known, T.NEW_490_L01.known, false)).toBe(true);
    });
  });
  it('the seed is unchanged and shares its one कभी between L01 and L02; English tiles exactly', () => {
    expect(T.SEED_490.known).toBe('तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।');
    expect(T.legosTileSeed([T.NEW_490_L01, T.OLD_490_LEGOS[1]], T.SEED_490, 'target')).toBe(true);
    expect(T.containsInOrder(T.SEED_490.known, T.NEW_490_L01.known, true)).toBe(true);
    expect(T.withKabhi(T.KABHI_TO)).toBe(T.KABHI_TO);
  });
  it('the whole batch passes the offline rules', () => { expect(T.offlineCheck()).toEqual([]); });
});
