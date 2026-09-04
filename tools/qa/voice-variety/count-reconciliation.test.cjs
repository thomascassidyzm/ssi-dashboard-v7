/*
 * The reconciliation's whole value is that it fires on real damage and stays
 * silent on the ordinary. The first run convicted twenty courses whose entire
 * audio holding was one shared `welcome` clip — unlinked BY DESIGN — so the
 * role split gets a test of its own, alongside the known positive.
 *
 * Run: npx vitest run tools/qa/voice-variety
 */
import { describe, it, expect } from 'vitest'

const { assess } = require('./count-reconciliation.cjs');

const run = (o) => assess({ content: [], audio: [], linked: [], pods: [], ...o });

describe('the known positive — clips against no content rows', () => {
  it('fires on a course holding audio nothing can reach', () => {
    const r = run({ audio: [{ course_code: 'ara_sy_for_eng', clips: 2974, content_clips: 1685 }] });
    expect(r.content_zero).toHaveLength(1);
    expect(r.content_zero[0].content_clips).toBe(1685);
  });

  it('does not fire on a course mid-build — content ahead of audio is ordinary', () => {
    const r = run({
      content: [{ course_code: 'x_for_eng', seeds: 300, legos: 1200, phrases: 9000 }],
      audio: [{ course_code: 'x_for_eng', clips: 12, content_clips: 12 }],
      linked: [{ course_code: 'x_for_eng', linked: 12 }],
    });
    expect(r.content_zero).toHaveLength(0);
    expect(r.linked_zero).toHaveLength(0);
  });
});

describe('the role split — what is unlinked by design', () => {
  it('a course whose only clip is a shared welcome is not a finding', () => {
    const r = run({
      content: [{ course_code: 'cor_for_eng', seeds: 100, legos: 400, phrases: 883 }],
      audio: [{ course_code: 'cor_for_eng', clips: 1, content_clips: 0 }],
    });
    expect(r.linked_zero).toHaveLength(0);
    expect(r.content_zero).toHaveLength(0);
  });

  it('but real content-role clips with nothing linked still fire', () => {
    const r = run({
      content: [{ course_code: 'y_for_eng', seeds: 10, legos: 0, phrases: 0 }],
      audio: [{ course_code: 'y_for_eng', clips: 500, content_clips: 480 }],
    });
    expect(r.linked_zero).toHaveLength(1);
    expect(r.linked_zero[0].content_clips).toBe(480);
  });

  it('counts the by-design roles separately rather than throwing them away', () => {
    const r = run({ audio: [{ course_code: 'z', clips: 100, content_clips: 60 }] });
    expect(r.courses[0].other_role_clips).toBe(40);
  });
});

describe("phase8's own comparison, standing", () => {
  it('reports a pod whose sentence count disagrees with canon', () => {
    const r = run({ pods: [{ pod_id: 1, course_code: 'fra_for_eng', slug: 'pod-1', pod_sentences: 231, canon_rows: 266 }] });
    expect(r.pod_mismatch).toHaveLength(1);
    expect(r.pod_mismatch[0].delta).toBe(-35);
  });

  it('says nothing when they agree', () => {
    const r = run({ pods: [{ pod_id: 2, course_code: 'cym_s_for_eng', slug: 'pod-0', pod_sentences: 120, canon_rows: 120 }] });
    expect(r.pod_mismatch).toHaveLength(0);
  });
});
