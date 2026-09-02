/*
 * The alarm is the whole point of this job, so it is the thing that gets a test:
 * a rise must be seen, a fall must not be dressed up as one, and a snapshot from
 * before the practice/seed split must not manufacture a rise out of `undefined`.
 *
 * Run: npx vitest run tools/qa/audio-gap
 */
import { describe, it, expect } from 'vitest'

const { delta } = require('./count-audio-gap.cjs');

const side = (missing, stale = 0) => ({
  total: 100, missing, missing_relinkable: 0, missing_unrendered: missing, stale_text: stale, ts_stale: 0,
  practice: { total: 90, missing, missing_relinkable: 0, missing_unrendered: missing, stale_text: stale, coverage: 1 },
  seed: { total: 10, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0, coverage: 1 },
  by_kind: {}, gap_oldest_edit: null, gap_newest_edit: null, coverage: 1,
});
const snap = (courses, headlineMissing) => ({
  generated_at: '2026-09-02T03:00:00.000Z',
  totals: { headline: { missing: headlineMissing, missing_unrendered: headlineMissing } },
  courses,
});
const course = (code, known, target = 0, bucket = 'rendered') =>
  ({ course_code: code, bucket, known: side(known), target: side(target) });

describe('delta — the nightly alarm', () => {
  it('raises the alarm when a course gains silent prompts', () => {
    const d = delta(snap([course('spa_for_eng', 300)], 300), snap([course('spa_for_eng', 329)], 329));
    expect(d.alarm).toBe(true);
    expect(d.headline_missing).toBe(29);
    expect(d.increased).toEqual([{ course_code: 'spa_for_eng', known_missing: 29, stale_text: 0, target_missing: 0, now: 329 }]);
  });

  it('stays quiet when the gap shrinks — a fall is reported, never alarmed', () => {
    const d = delta(snap([course('spa_for_eng', 329)], 329), snap([course('spa_for_eng', 300)], 300));
    expect(d.alarm).toBe(false);
    expect(d.decreased).toHaveLength(1);
    expect(d.headline_missing).toBe(-29);
  });

  it('alarms on a target-side rise alone — a target clip is as load-bearing as a prompt', () => {
    const d = delta(snap([course('ita_for_eng', 5, 0)], 5), snap([course('ita_for_eng', 5, 9)], 5));
    expect(d.alarm).toBe(true);
    expect(d.increased[0].target_missing).toBe(9);
  });

  it('alarms when audio starts saying words the text no longer says', () => {
    const c = course('nld_for_eng', 3);
    c.known.practice.stale_text = 5;
    const d = delta(snap([course('nld_for_eng', 3)], 3), snap([c], 3));
    expect(d.alarm).toBe(true);
    expect(d.increased[0].stale_text).toBe(5);
  });

  it('records a new course as appeared, not as a rise', () => {
    const d = delta(snap([], 0), snap([course('new_for_eng', 12)], 12));
    expect(d.alarm).toBe(false);
    expect(d.new_courses).toEqual([{ course_code: 'new_for_eng', missing: 12, stale_text: 0 }]);
  });

  it('notes a course crossing the rendered/building line rather than letting it look like a jump', () => {
    const d = delta(snap([course('gla_for_eng', 40, 0, 'building')], 40), snap([course('gla_for_eng', 40, 0, 'rendered')], 40));
    expect(d.bucket_moves).toEqual([{ course_code: 'gla_for_eng', from: 'building', to: 'rendered' }]);
  });

  it('does not manufacture a rise from a snapshot written before the practice/seed split', () => {
    const old = snap([course('spa_for_eng', 300)], 300);
    delete old.courses[0].known.practice;
    delete old.courses[0].target.practice;
    const d = delta(old, snap([course('spa_for_eng', 329)], 329));
    expect(d.alarm).toBe(false);
    expect(d.increased).toEqual([]);
  });
});
