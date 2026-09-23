// The one test that proves the change (Kai's ruling, 2026-09-23 22:00Z, job #965·H): "he's hurt" is the INJURED sense and never
// sits over the causative उसने चोट पहुँचाई है ("he has hurt someone"). Pre-fix: the live LEGO S0339L02 and 17 of its basket's rows pair
// injured-sense English (he's hurt / hurt himself / hurt) with चोट पहुँचा-. Post-fix: no row does; the one hurt LEGO is उसे चोट लगी है
// → "he's hurt himself"; every phrase contains its LEGO on both sides; no bare row; no duplicate English; the seed's English is
// untouched; the one downstream row the cut breaks (S0345L02U05) tiles from "he's not ready" + "to leave". Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-seed-339-hes-hurt-injured-2026-09-23.cjs');

describe("eng_for_hin seed 339: he's hurt is the injured sense", () => {
  it('pre-fix: the live LEGO and 17 of its rows carry the causative under injured English (fails)', () => {
    const live = [{ id: 'S0339L02', known: T.OLD_LEGOS[1].known, target: T.OLD_LEGOS[1].target }, ...T.OLD_PHRASES];
    expect(T.causativeUnderInjured(live)).toHaveLength(18);
    expect(T.causativeUnderInjured([{ id: 'x', known: 'उसने चोट पहुँचाई है', target: "he's hurt" }])).toEqual(['x']);
    expect(T.OLD_L03_PHRASES.map(p => p.target)).toContain("he's hurt himself");
  });
  it('post-fix: no row pairs injured English with the causative; the one hurt LEGO is उसे चोट लगी है (passes)', () => {
    expect(T.causativeUnderInjured(T.allRows())).toEqual([]);
    expect(T.LEGOS.filter(l => /hurt/.test(l.target))).toEqual([expect.objectContaining({ idx: 2, type: 'A', known: 'उसे चोट लगी है', target: "he's hurt himself" })]);
    expect(T.allRows().filter(r => /\bhurt\b/i.test(r.target)).every(r => /चोट लगी है/u.test(r.known))).toBe(true);
    expect(T.LEGOS.some(l => l.target === 'himself')).toBe(false);
  });
  it('the seed keeps its English, gains काफ़ी on the Hindi side, and both LEGOs sit in it', () => {
    expect(T.NEW_SEED.target).toBe(T.OLD_SEED.target);
    expect(T.NEW_SEED.known).toBe('नहीं, मुझे लगता है उसे काफ़ी बुरी तरह चोट लगी है।');
    for (const l of T.LEGOS) expect(T.legoWordsInSeed(l, T.NEW_SEED)).toBe(true);
    expect(T.legoWordsInSeed(T.LEGOS[0], T.OLD_SEED)).toBe(false); // बहुत, not काफ़ी — why the seed Hindi moves
  });
  it('the whole batch passes the offline rules; L01 moves byte-for-byte; the causative rows are gone, not reworded', () => {
    expect(T.offlineCheck()).toEqual([]);
    expect(T.LEGOS[0].use.map(p => p.known)).toEqual(T.OLD_PHRASES.filter(p => p.id.includes('L01U')).map(p => p.known));
    const kept = T.allRows().map(r => r.target);
    for (const t of ["he's hurt me", "he's hurt you", "he's hurt me badly", "he's hurt you quite badly", "he's hurt me today", "I think he's hurt me", 'hurt himself', 'himself quite badly']) expect(kept).not.toContain(t);
    expect(T.HURT_USE.length).toBeGreaterThanOrEqual(5); expect(T.HURT_BUILD.length).toBeGreaterThanOrEqual(3);
  });
  it('the 345 reword contains its LEGO and is built from "he\'s not ready" + "to leave"', () => {
    expect(T.SEED_345_REWORD.set.target).toBe("I'm sure he's not ready to leave");
    expect(T.containsInOrder(T.SEED_345_REWORD.set.known, 'निकलने के लिए', true)).toBe(true);
    expect(T.allRows().find(r => r.id === 'S0345L02U05')).toBeTruthy();
  });
  it('clip links come back only where the text is what the clip says', () => {
    const old = [{ id: 'a', known_text: 'क', target_text: 'k', known_audio_id: 'K', target1_audio_id: 'T1', metadata: { known_gender: 'f' } }, { id: 'b', known_text: 'ख', target_text: 'x', target1_audio_id: 'TX' }];
    const plan = T.audioRestorePlan(old, [{ id: 'a', known_text: 'क', target_text: 'k', metadata: {} }, { id: 'c', known_text: 'ग', target_text: 'x', metadata: {} }, { id: 'd', known_text: 'घ', target_text: 'y', metadata: {} }]);
    expect(plan.map(p => [p.id, p.kind])).toEqual([['a', 'byte-identical'], ['c', 'english-line']]);
    expect(plan[0].set).toMatchObject({ known_audio_id: 'K', target1_audio_id: 'T1', metadata: { known_gender: 'f' } });
    expect(plan[1].set).toMatchObject({ target1_audio_id: 'TX' }); expect(plan[1].set.known_audio_id).toBeUndefined();
  });
});
