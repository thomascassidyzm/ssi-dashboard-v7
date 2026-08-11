// Vitest is ESM-only; this file follows services/audio-repair-core.test.cjs and
// imports rather than requires, even under the .cjs name.
import { describe, it, expect } from 'vitest';
import { computeRecordingEstimate, estimateAtCutoff, RATES } from './recording-estimate.cjs';

/**
 * Minimal stand-in for the Supabase client: enough chaining for the three table
 * reads the estimate makes, plus course_audio. Rows are handed back in one page.
 */
function fakeSupabase(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice();
      const q = {
        select() { return q; },
        eq(column, value) {
          rows = rows.filter(r => r[column] === value || column === 'course_code');
          return q;
        },
        range() { return Promise.resolve({ data: rows, error: null }); },
      };
      return q;
    },
  };
}

const COURSE = 'tst_for_eng';

function build(overrides = {}) {
  return fakeSupabase({
    course_seeds: [
      { seed_number: 1, target_text: 'sentence one' },
      { seed_number: 2, target_text: 'sentence two' },
      { seed_number: 3, target_text: '   ' }, // blank: nothing to say, must not be counted
    ],
    course_legos: [
      { seed_number: 1, target_text: 'one', is_new: true },
      { seed_number: 2, target_text: 'two', is_new: true },
    ],
    course_practice_phrases: [
      { seed_number: 1, target_text: 'phrase a', phrase_role: 'build' },
      { seed_number: 1, target_text: 'phrase b', phrase_role: 'use' },
      // Same text as seed 1's build phrase: one clip serves both, so it is one job.
      { seed_number: 2, target_text: 'phrase a', phrase_role: 'build' },
      { seed_number: 2, target_text: 'comp', phrase_role: 'component' },
    ],
    course_audio: [],
    ...overrides,
  });
}

describe('computeRecordingEstimate', () => {
  it('counts rows and distinct utterances separately, skipping blanks', async () => {
    const e = await computeRecordingEstimate(build(), COURSE);
    // 3 seeds + 2 legos + 4 phrase rows = 9 rows.
    expect(e.totals.rows).toBe(9);
    // Distinct: 2 seed sentences (the blank is dropped), 2 legos, 'phrase a',
    // 'phrase b', 'comp' = 7.
    expect(e.totals.distinct).toBe(7);
  });

  it('derives hours from the rate, not from a stored figure', async () => {
    const e = await computeRecordingEstimate(build(), COURSE);
    // Hours are reported to 2dp, which is the resolution a person reads them at.
    const expected = +(e.totals.distinct * RATES.SECONDS_PER_FULL_UTTERANCE / 3600).toFixed(2);
    expect(e.totals.hours).toBe(expected);
    // And it really is a function of the rate: double the rate, double the time.
    expect(e.totals.rows * RATES.SECONDS_PER_FULL_UTTERANCE / 3600)
      .toBeCloseTo(e.totals.hoursIfEveryRow, 2);
  });

  it('scales with the cutoff — seed 1 alone costs less than the whole course', async () => {
    const e = await computeRecordingEstimate(build(), COURSE);
    const atOne = estimateAtCutoff(e, 1);
    // Seed 1: its sentence, one lego, two phrases.
    expect(atOne.distinct).toBe(4);
    expect(atOne.rows).toBe(4);
    expect(atOne.distinct).toBeLessThan(e.totals.distinct);
  });

  it('reports the last seed that actually has content, ignoring empty tail seeds', async () => {
    const e = await computeRecordingEstimate(build(), COURSE);
    expect(e.lastSeed).toBe(3);
    // Seed 3 is a blank placeholder, so the course really stops at 2.
    expect(e.lastContentSeed).toBe(2);
  });

  it('subtracts what this voice has already recorded, and only that voice', async () => {
    const withTakes = build({
      course_audio: [
        { text: 'phrase a', role: 'target1', origin: 'human' },
        { text: 'one', role: 'target1', origin: 'human' },
        // A different voice's take must not shorten target1's job.
        { text: 'phrase b', role: 'target2', origin: 'human' },
        // TTS is not a human recording and cannot stand in for one.
        { text: 'two', role: 'target1', origin: 'tts' },
      ],
    });
    const e = await computeRecordingEstimate(withTakes, COURSE, { role: 'target1' });
    expect(e.totals.distinct).toBe(7);
    expect(e.totals.stillNeeded).toBe(5);
  });

  it('treats a cutoff of 0 or below as off', async () => {
    const e = await computeRecordingEstimate(build(), COURSE);
    expect(estimateAtCutoff(e, 0)).toBeNull();
    expect(estimateAtCutoff(e, null)).toBeNull();
  });

  it('lands a cutoff between seeds on the last seed at or below it', async () => {
    const sparse = fakeSupabase({
      course_seeds: [
        { seed_number: 1, target_text: 'a' },
        { seed_number: 10, target_text: 'b' },
      ],
      course_legos: [], course_practice_phrases: [], course_audio: [],
    });
    const e = await computeRecordingEstimate(sparse, COURSE);
    expect(estimateAtCutoff(e, 5).seed).toBe(1);
    expect(estimateAtCutoff(e, 10).seed).toBe(10);
  });

  it('returns null for a course with no seeds rather than a zero estimate', async () => {
    const empty = fakeSupabase({ course_seeds: [], course_legos: [], course_practice_phrases: [], course_audio: [] });
    expect(await computeRecordingEstimate(empty, COURSE)).toBeNull();
  });
});
