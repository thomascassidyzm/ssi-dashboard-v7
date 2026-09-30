// The rule a re-record switch must keep: learner slots never move (job #938).
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { planProblems, invert, same } = require('./switch-pod-clip-pointers.cjs')

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c', D = '00000000-0000-0000-0000-00000000000d';
const all = new Set([A, B, C, D]);
const row = (before, after) => ({ podId: 'ita_for_eng:pod-1', rows: [{ id: 'r1', before, after }] });

describe('switch-pod-clip-pointers planProblems', () => {
  it('accepts a same-count re-point of a split turn', () => {
    expect(planProblems(row({ sentence_audio_ids: [A, B] }, { sentence_audio_ids: [C, D] }), all)).toEqual([]);
  });
  it('refuses splitting an unsplit turn — that moves learner slots', () => {
    const p = planProblems(row({ sentence_audio_ids: null }, { sentence_audio_ids: [C, D] }), all);
    expect(p.join()).toMatch(/moves learner slots/);
  });
  it('refuses a different clip count on a split turn', () => {
    expect(planProblems(row({ sentence_audio_ids: [A, B] }, { sentence_audio_ids: [A, B, C] }), all).join()).toMatch(/2 → 3/);
  });
  it('refuses a pointer at a clip that does not exist yet (make before break)', () => {
    expect(planProblems(row({ target_audio_id: A }, { target_audio_id: 'ffffffff-0000-0000-0000-000000000000' }), all).join()).toMatch(/does not exist/);
  });
  it('allows an in-sentence text edit but refuses one that changes the sentence count', () => {
    expect(planProblems(row({ target_text: 'Non sono sicuro. Ciao.' }, { target_text: 'Non sono sicura. Ciao.' }), all)).toEqual([]);
    expect(planProblems(row({ target_text: 'Non sono sicuro. Ciao.' }, { target_text: 'Non sono sicura, ciao.' }), all).join()).toMatch(/sentence count/);
  });
  it('refuses a field it does not switch', () => {
    expect(planProblems(row({ known_audio_id: A }, { known_audio_id: B }), all).join()).toMatch(/not switchable/);
  });
  it('a rollback is the plan with before and after swapped', () => {
    const p = { podId: 'x:pod-1', jobLabel: '#938', speakers: { before: { a: 1 }, after: { a: 2 } }, rows: [{ id: 'r1', before: { target_audio_id: A }, after: { target_audio_id: B } }] };
    const r = invert(p);
    expect(r.rows[0]).toEqual({ id: 'r1', before: { target_audio_id: B }, after: { target_audio_id: A } });
    expect(r.speakers).toEqual({ before: { a: 2 }, after: { a: 1 } });
    expect(r.rollbackOf).toBe('#938');
  });
  it('compares jsonb on content, not key order (Postgres reorders keys; the rollback must still match)', () => {
    expect(same('speakers', { Anna: { target: { name: 'Ara', voice_id: 'ara' }, gender: 'f' } }, { Anna: { gender: 'f', target: { voice_id: 'ara', name: 'Ara' } } })).toBe(true)
    expect(same('speakers', { Anna: { gender: 'f' } }, { Anna: { gender: 'm' } })).toBe(false)
  });
});
