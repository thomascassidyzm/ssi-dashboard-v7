// The one test that proves the change (Kai's ruling, 2026-09-24 09:38Z, job #17·I): "as often as possible" sits over
// ज़्यादा से ज़्यादा बार, never over bare ज़्यादा से ज़्यादा (which is the quantity sense S0437L03 keeps for "as much money as
// possible"). Pre-fix: every one of the 19 live rows breaks the rule. Post-fix: none does, every phrase still contains its
// LEGO, the gender form on every line is byte-identical, the money sense is untouched, and the rewrite is idempotent.
// Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-as-often-as-possible-baar-2026-09-24.cjs');

describe('eng_for_hin S0003L02: as often as possible = ज़्यादा से ज़्यादा बार', () => {
  it('pre-fix: all 19 live rows pair the English with bare ज़्यादा से ज़्यादा (fails the rule)', () => {
    expect(T.frequencyRuleViolations(T.oldRows())).toHaveLength(19);
  });
  it('post-fix: no row breaks the rule; every phrase contains the LEGO; the seed keeps its English', () => {
    expect(T.frequencyRuleViolations(T.allRows())).toEqual([]);
    expect(T.NEW_LEGO.known).toBe('ज़्यादा से ज़्यादा बार');
    expect(T.NEW_LEGO.target).toBe(T.OLD_LEGO.target);
    expect(T.NEW_LEGO.components).toEqual([{ known: 'ज़्यादा से ज़्यादा बार', target: 'as often as possible' }]);
    for (const p of T.NEW_PHRASES) expect(p.known).toContain(T.NEW);
    expect(T.NEW_SEED.known).toBe('कि ज़्यादा से ज़्यादा बार कैसे बोलूँ।');
    expect(T.NEW_SEED.target).toBe(T.OLD_SEED.target);
  });
  it('the gender form of every line survives: the rewrite only adds बार', () => {
    for (let i = 0; i < T.OLD_PHRASES.length; i++) {
      const a = T.OLD_PHRASES[i].known, b = T.NEW_PHRASES[i].known;
      expect(b.replace(' बार', '')).toBe(a);
      expect(T.NEW_PHRASES[i].target).toBe(T.OLD_PHRASES[i].target);
    }
  });
  it('the money sense (seed 437) and already-fixed text are left alone; the rewrite is idempotent', () => {
    const money = 'वे दान के लिए ज़्यादा से ज़्यादा राशि जुटाना चाहते थे।';
    expect(T.withBaar(money)).toBe(money);
    expect(T.carriesOld(money)).toBe(false);
    expect(T.withBaar(T.withBaar(T.OLD_SEED.known))).toBe(T.NEW_SEED.known);
    expect(T.frequencyRuleViolations([{ id: 'S0437L03', known: 'ज़्यादा से ज़्यादा राशि', target: 'as much money as possible' }])).toEqual([]);
  });
  it('decomposition entries for the LEGO are updated and nothing else moves', () => {
    const d = [{ known: 'कैसे बोलना', legoId: 'S0003L01', target: 'how to speak', isGhost: false }, { known: 'ज़्यादा से ज़्यादा', legoId: 'S0003L02', target: ' as often as possible', isGhost: false }];
    const r = T.fixDecomposition(d);
    expect(r.changed).toBe(true);
    expect(r.value[0]).toBe(d[0]);
    expect(r.value[1]).toEqual({ ...d[1], known: 'ज़्यादा से ज़्यादा बार' });
    expect(T.fixDecomposition(null)).toEqual({ changed: false, value: null });
    expect(T.fixDecomposition(r.value).changed).toBe(false);
  });
  it('a gender pair carrying the phrase is rewritten on all three texts; a money pair is not', () => {
    const pair = { original_text: 'मैं ज़्यादा से ज़्यादा बात करना चाहता हूँ।', expanded_f: 'मैं ज़्यादा से ज़्यादा बात करना चाहती हूँ।', expanded_m: 'मैं ज़्यादा से ज़्यादा बात करना चाहता हूँ।' };
    expect(T.fixPair(pair)).toEqual({ changed: true, to: { original_text: 'मैं ज़्यादा से ज़्यादा बार बात करना चाहता हूँ।', expanded_f: 'मैं ज़्यादा से ज़्यादा बार बात करना चाहती हूँ।', expanded_m: 'मैं ज़्यादा से ज़्यादा बार बात करना चाहता हूँ।' } });
    const money = { original_text: 'मैं ज़्यादा से ज़्यादा राशि जुटाना चाहता हूँ।', expanded_f: 'मैं ज़्यादा से ज़्यादा राशि जुटाना चाहती हूँ।', expanded_m: 'मैं ज़्यादा से ज़्यादा राशि जुटाना चाहता हूँ।' };
    expect(T.fixPair(money).changed).toBe(false);
  });
  it('the intro is the bare Frame A line quoting the new LEGO', () => {
    const { renderIntro } = require('../../services/phases/presentation-author.cjs');
    const intro = T.frameAIntro(T.NEW_LEGO.known, renderIntro);
    expect(intro).toContain("'ज़्यादा से ज़्यादा बार'");
    expect(intro).not.toMatch(/जैसे|जितनी बार हो सके/);
  });
});
