// What a Welsh practice phrase may use (Aran, 2026-10-13, job #504): ANY Welsh taught earlier in
// the running order — a word inside a bigger LEGO counts — plus the current LEGO, and a
// soft-mutated form is the same taught word. Before #504 the gate only tiled whole chunks, so
// "ffrindiau ydyn nhw" was refused although "ffrindiau" was taught inside "gyda fy ffrindiau".
//
// Run: npx vitest run services/course-builder/lib/welsh-taught-scope
import { describe, it, expect } from 'vitest'

const { checkVocabViolations } = require('./validation.cjs');
const { phraseContainsLego } = require('./separable-verbs.cjs');
const C = 'cym_sv2_for_eng';

// Old-course M LEGOs without components (seeds ~1001) ... and the phrase 200 seeds later.
const taught = new Set(['dw i’n trio', 'gyda fy ffrindiau', 'mae hi’n braf', 'cael', 'ydyn nhw']);

describe('Welsh vocab gate — any earlier Welsh, mutation-equivalent', () => {
  it('a word taught 200 seeds earlier, only inside a bigger LEGO, passes', () => {
    expect(checkVocabViolations([{ target: 'ffrindiau ydyn nhw' }], taught, C, { seedNumber: 1201 })).toEqual([]);
    expect(checkVocabViolations([{ target: 'trio cael' }], taught, C, { seedNumber: 1201 })).toEqual([]);
  });
  it('a word never taught before fails, and is named', () => {
    const v = checkVocabViolations([{ target: 'cath ydyn nhw' }], taught, C, { seedNumber: 1201 });
    expect(v).toHaveLength(1);
    expect(v[0].unknown).toBe('cath');
  });
  it('a soft-mutated form of a taught word passes (cael → gael)', () => {
    expect(checkVocabViolations([{ target: 'dw i’n trio gael' }], taught, C, { seedNumber: 1201 })).toEqual([]);
  });
  // Since 2026-10-13 (Aran, confirmed by Tom, job #587) every language reads words, not whole
  // chunks — but only Welsh folds the soft mutation.
  it('a non-Welsh course reads words too, without the soft-mutation fold', () => {
    expect(checkVocabViolations([{ target: 'ffrindiau ydyn nhw' }], taught, 'spa_for_eng', { seedNumber: 1201 })).toEqual([]);
    expect(checkVocabViolations([{ target: 'dw i’n trio gael' }], taught, 'spa_for_eng', { seedNumber: 1201 })).toHaveLength(1);
  });
});

describe('Welsh containment — a mutated or elided spelling still contains the LEGO', () => {
  const has = (lego, phrase, courseCode = C) => phraseContainsLego({ courseCode, seedNumber: 1478, legoTarget: lego, phraseTarget: phrase });
  it('calon mor garedig contains galon mor garedig; cael sgwrs contains gael sgwrs', () => {
    expect(has('galon mor garedig', 'gweld calon mor garedig')).toBe(true);
    expect(has('gael sgwrs', 'dw i’n teimlo fel cael sgwrs')).toBe(true);
  });
  it('ti’n cyfrif contains yn cyfri’ (final f elided, ’n = yn)', () => {
    expect(has('yn cyfri’', 'ti’n cyfrif')).toBe(true);
  });
  it('the LEGO words must stay together: dw i’n gallu cyfrif does not contain yn cyfri’', () => {
    expect(has('yn cyfri’', 'dw i’n gallu cyfrif')).toBe(false);
  });
  it('non-Welsh courses are unchanged', () => {
    expect(has('galon mor garedig', 'calon mor garedig', 'spa_for_eng')).toBe(false);
  });
});
