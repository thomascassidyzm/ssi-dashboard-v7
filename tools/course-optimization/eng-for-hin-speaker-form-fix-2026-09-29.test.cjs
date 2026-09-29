// The one test that proves the change (job #770·H): the speaker-form rule FAILS on the 16 stored lines as they were
// (male form on Kriti, female form on Rehan) and PASSES on the corrected lines; every corrected line also has a pair
// row whose two sides are the male and female forms. Offline: no DB.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ROWS, KRITI, speakerMismatch, pairFor } = require('./eng-for-hin-speaker-form-fix-2026-09-29.cjs');

describe('eng_for_hin speaker form matches the voice', () => {
  it('all 16 old lines are mismatches, none of the new ones', () => {
    expect(ROWS).toHaveLength(16);
    for (const r of ROWS) {
      expect(speakerMismatch(r.old, r.voice), `${r.id} old`).toBe(true);
      expect(speakerMismatch(r.neu, r.voice), `${r.id} new`).toBe(false);
    }
  });
  it('a thing-agreeing "रहा है" clause is not the speaker', () => {
    expect(speakerMismatch('जब से यह काम नहीं कर रहा है, मैं बुरा कर रही हूँ।', KRITI)).toBe(false);
  });
  it('each pair row holds the male form as original and both sides', () => {
    for (const r of ROWS) {
      const p = pairFor(r);
      expect(p.original_text).toBe(p.expanded_m);
      expect(speakerMismatch(p.expanded_f, KRITI)).toBe(false);
      expect(speakerMismatch(p.expanded_m, 'rehan')).toBe(false);
    }
  });
});
