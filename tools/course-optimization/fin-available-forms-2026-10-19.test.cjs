// Kai's 19 Oct ruling as tests: availability is per exact FORM and per POSITION, a
// rewrite keeps its LEGO, duplicates nothing, clashes with nothing (ZUT).
import { describe, it, expect } from 'vitest';
const A = require('./fin-available-forms-2026-10-19.cjs');

const ph = (id, role, en, fi) => ({ id: 'fin_for_eng:' + id, phrase_role: role, known_text: en, target_text: fi });
const payload = {
  seeds: [
    { seed_number: 71, known_text: 'I want to know the truth', target_text: 'Mä haluun tietää totuutta', legos: [
      { lego_id: 'S0071L01', lego_index: 1, is_new: true, known_text: 'I want to know', target_text: 'mä haluun tietää', basket_phrases: [] },
      { lego_id: 'S0071L02', lego_index: 2, is_new: true, known_text: 'the truth', target_text: 'totuutta', basket_phrases: [
        ph('S0071L02U01', 'use', 'I want to know the truth now', 'mä haluun tietää totuutta nyt')] },
      { lego_id: 'S0071L03', lego_index: 3, is_new: true, known_text: 'now', target_text: 'nyt', basket_phrases: [] },
    ] },
    { seed_number: 170, known_text: 'you tell me what you need', target_text: 'Sä kerrot mulle, mitä sä tarviit', legos: [
      { lego_id: 'S0170L01', lego_index: 1, is_new: true, known_text: 'you tell me', target_text: 'sä kerrot mulle', basket_phrases: [
        ph('S0170L01U08', 'use', 'you tell me the truth', 'sä kerrot mulle totuutta'),
        ph('S0170L01U09', 'use', 'you tell me now', 'sä kerrot mulle nyt')] },
      { lego_id: 'S0170L02', lego_index: 2, is_new: true, known_text: 'you need', target_text: 'sä tarviit',
        components: [{ known: 'need', target: 'tarvitset' }], basket_phrases: [] },
    ] },
  ],
};

describe('fin available forms', () => {
  const ix = A.buildIndex(payload);
  it('keys availability on the exact form: totuutta is taught, totuuden is not (K21)', () => {
    expect(A.formStatus(ix, 'totuutta', A.positionOf(ix, 'S0170L01U08')).status).toBe('taught');
    expect(A.formStatus(ix, 'totuuden', A.positionOf(ix, 'S0170L01U08')).status).toBe('absent');
  });
  it('a later LEGO of the same seed is not yet available; a tile-only form is never taught', () => {
    expect(A.formStatus(ix, 'tarviit', A.positionOf(ix, 'S0170L01U08')).status).toBe('later');
    expect(A.formStatus(ix, 'tarvitset', A.positionOf(ix, 'S0170')).status).toBe('tile');
  });
  it('refuses the corrected-but-untaught fix, passes a reword in available forms', () => {
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'you tell me the truth', fi: 'sä kerrot mulle totuuden' }).problems.join())
      .toMatch(/totuuden" absent/);
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'you tell me what you want to know', fi: 'sä kerrot mulle, mitä sä haluut tietää' }).problems.join())
      .toMatch(/"haluut" absent/); // 'haluut' was never taught in this fixture ('haluun' was)
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'you tell me the truth now', fi: 'sä kerrot mulle totuutta nyt' }).ok).toBe(true);
  });
  it('flags a dropped LEGO, a duplicate and a ZUT clash', () => {
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'the truth now', fi: 'totuutta nyt' }).problems.join()).toMatch(/drops LEGO Finnish/);
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'you tell me something', fi: 'sä kerrot mulle nyt' }).problems.join()).toMatch(/Finnish duplicates S0170L01U09/);
    expect(A.checkRewrite(ix, { row: 'S0170L01U08', en: 'you tell me now', fi: 'sä kerrot mulle totuutta nyt' }).problems.join()).toMatch(/ZUT/);
  });
  it('cascade: changing a seed sentence that taught a form breaks the later rows using it', () => {
    const c = A.cascade({ seeds: [{ ...payload.seeds[0], legos: [payload.seeds[0].legos[0]] }, payload.seeds[1]] }, 'S0071', 'Mä haluun tietää totuuden');
    expect(c.introduces).toEqual(['totuuden']);
    expect(c.newlyBroken.map(b => b.row)).toContain('S0170L01U08');
  });
});

describe('whole-set check (edits judged together, in an in-memory copy)', () => {
  it('a seed fix and the row that mirrors it pass together, though each fails alone', () => {
    const edits = [
      { row: 'S0071L02', en: 'the truth', fi: 'totuuden' },
      { row: 'S0071', en: 'I want to know the truth', fi: 'Mä haluun tietää totuuden' },
      { row: 'S0071L02U01', en: 'I want to know the truth', fi: 'mä haluun tietää totuuden' }, // the seed-copy row
    ];
    expect(A.checkRewrite(A.buildIndex(payload), { row: 'S0071L02U01', en: edits[2].en, fi: edits[2].fi }).ok).toBe(false);
    const w = A.checkWorld(payload, edits);
    expect(w.results.filter(r => !r.ok).map(r => r.row + ": " + r.problems.join("; "))).toEqual([]);
    // ...but the later row that used the old LEGO form is a knock-on the set must answer
    expect(w.knockOn.map(k => k.row)).toContain('S0170L01U08');
  });
  it('a seed that introduces a form no LEGO teaches is refused (tiling)', () => {
    const w = A.checkWorld(payload, [{ row: 'S0071', en: 'I want to know the truth', fi: 'Mä haluun tietää totuuden' }]);
    expect(w.results[0].problems.join()).toMatch(/seed form\(s\) in no LEGO.*totuuden/);
  });
});
