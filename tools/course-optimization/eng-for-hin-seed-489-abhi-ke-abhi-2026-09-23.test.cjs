// The one test that proves the change (job #906·H, 2026-09-23). Kai's ruling: English "right now" is answered by
// Hindi अभी के अभी, and plain अभी stays "at the moment". Against the LIVE rows (OLD_LEGOS / OLD_PHRASES / the seed's
// old Hindi) the rule FAILS — every "right now" line sits on plain अभी; against the new cut it passes, the new
// LEGOs still tile the seed's English, every phrase carries its LEGO, the 8 English lines are preserved
// byte-for-byte, and the intros are the bare Frame A line. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-489-abhi-ke-abhi-2026-09-23.cjs');
const { renderIntro } = require('../../services/phases/presentation-author.cjs');

describe('eng_for_hin seed 489: "right now" = अभी के अभी', () => {
  it('the live rows break the rule (the pre-fix state fails)', () => {
    const live = [{ id: 'S0489', known: T.SEED_TEXT.known_old, target: T.SEED_TEXT.target }, ...T.OLD_LEGOS.map(l => ({ id: l.lego_id, ...l })), ...T.OLD_PHRASES, ...T.S0490_FIXES.map(f => ({ id: f.id, known: f.from, target: f.target }))];
    const v = T.rightNowRuleViolations(live);
    expect(v.length).toBe(live.length);
    expect(v.every(x => /without अभी के अभी/.test(x.why))).toBe(true);
  });

  it('every new row obeys the rule, both ways (the post-fix state passes)', () => {
    expect(T.rightNowRuleViolations(T.allRows())).toEqual([]);
    expect(T.allRows().filter(r => /right now/i.test(r.target)).length).toBeGreaterThanOrEqual(1 + 1 + 9 + 8 + 2);
  });

  it('के अभी is added exactly once, after the seed\'s अभी, and never twice', () => {
    expect(T.withAbhiKeAbhi(T.SEED_TEXT.known_old)).toBe(T.SEED_TEXT.known);
    expect(T.withAbhiKeAbhi(T.SEED_TEXT.known)).toBe(T.SEED_TEXT.known);
    expect(T.S0490_FIXES.every(f => f.to.includes('अभी के अभी') && !f.to.includes('अभी के अभी के अभी'))).toBe(true);
  });

  it('the four LEGOs tile the seed\'s English (teaching order is not sentence order)', () => {
    expect(T.legosTileSeedTarget(T.LEGOS, T.SEED_TEXT)).toBe(true);
    expect(T.legosTileSeedTarget(T.LEGOS.slice(0, 3), T.SEED_TEXT)).toBe(false);
    expect(T.LEGOS.map(l => l.target)).toEqual(['a strong cup of coffee', 'right now', 'if', "you don't make me"]);
  });

  it('every build and use phrase contains its LEGO; new LEGOs have full baskets; "if" reuses S0049L03 with none', () => {
    for (const l of T.LEGOS) for (const p of [...l.build, ...l.use]) expect(T.phraseContainsLego(l, p), `${l.idx}: ${p.target}`).toBe(true);
    for (const l of T.LEGOS.filter(l => l.idx !== 3)) { expect(l.build.length).toBeGreaterThanOrEqual(3); expect(l.use.length).toBeGreaterThanOrEqual(5); }
    expect(T.LEGOS[2]).toMatchObject({ known: 'अगर', target: 'if', build: [], use: [] });
  });

  it('the 8 English lines under the old LEGO survive byte-for-byte under "you don\'t make me"', () => {
    const l4 = [...T.LEGOS[3].build, ...T.LEGOS[3].use].map(p => p.target);
    expect(l4).toEqual(T.OLD_PHRASES.map(p => p.target));
  });

  it('the "right now" basket is urgent, not stative', () => {
    const stative = /\b(i'm busy|don't have|i am|it is|i have got)\b.*right now/i;
    for (const p of [...T.LEGOS[1].build, ...T.LEGOS[1].use]) expect(stative.test(p.target), p.target).toBe(false);
  });

  it('the intros are the bare Frame A line, no "as in"', () => {
    for (const l of T.LEGOS.filter(l => l.idx !== 3)) {
      const intro = T.frameAIntro(l.known, renderIntro);
      expect(intro).toBe(`अंग्रेज़ी में — '${l.known}' — में :`);
    }
  });

  it('only the duplicate-"if" floor is a tolerated dry-run artefact', () => {
    expect(T.isDuplicateIfArtefact({ seed: 489, issues: ['L3: BUILD: need 3+, got 0'] })).toBe(true);
    expect(T.isDuplicateIfArtefact({ seed: 489, issues: ['L1: vocab: cup'] })).toBe(false);
    expect(T.isDuplicateIfArtefact({ seed: 490, issues: ['L3: BUILD: need 3+, got 0'] })).toBe(false);
  });
});
