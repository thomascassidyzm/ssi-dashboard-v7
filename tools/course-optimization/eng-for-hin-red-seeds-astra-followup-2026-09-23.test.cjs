// The one test for the Astra follow-up (#943·H after #945·H/#946·H): the rows #943 wrote carry the indicative after
// चाहे जो (the pre-fix state fails the subjunctive rule), the corrected rows do not, every corrected row still contains
// its LEGO on both sides, and the reworded English still tiles from taught chunks. Offline: no DB.
import { describe, it, expect } from 'vitest';
const T = require('./eng-for-hin-red-seeds-astra-followup-2026-09-23.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');

describe('चाहे जो takes the subjunctive', () => {
  it('the six rows as #943 wrote them fail the rule; as corrected they pass', () => {
    const before = T.subjunctiveViolations(T.ROWS.map(r => ({ id: r.id, known: r.expect.known })));
    expect(before).toHaveLength(6);
    expect(T.subjunctiveViolations(T.ROWS.map(r => ({ id: r.id, known: r.set.known })))).toEqual([]);
    expect(T.offlineCheck()).toEqual([]);
  });
  it('हमें is back in 604, and the 355 build phrase tiles from taught chunks and contains "you know"', () => {
    expect(T.ROWS.find(r => r.id.endsWith('S0604L01B01')).set.known).toContain('हमें');
    const r = T.ROWS.find(r => r.id.endsWith('S0355L02B01'));
    const vocab = new Set(['did she', 'need to talk to', 'someone', 'you know']);
    expect(checkVocabViolations([{ target: r.set.target }], vocab, 'eng_for_hin')).toEqual([]);
    expect(checkVocabViolations([{ target: r.expect.target }], vocab, 'eng_for_hin').length).toBe(1);
    expect(T.containsInOrder(r.set.known, 'जिसे आप जानते हैं', true)).toBe(true);
  });
});
