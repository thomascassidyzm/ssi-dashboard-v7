/**
 * Unit tests for the pod TEXT approval gate (no DB, no TTS, no spend).
 * Run: npx vitest run services/pod-text-approval
 *
 * These hold the claims the gate is sold on:
 *
 *   - a machine-written draft is NOT renderable until it is approved. This is
 *     the whole item: 128 unread Spanish drafts were one unscoped bulk call away
 *     from becoming audio a learner hears;
 *   - an approved draft IS renderable, and approval is the timestamp alone —
 *     there is no second boolean that could disagree with it;
 *   - a non-draft line is renderable regardless of approval state, because a
 *     human edit clears the draft flag and THAT edit is the proofread;
 *   - the KNOWN (English) track is never gated. Gating it would block the
 *     English side of 4,852 lines for no reason at all;
 *   - a blocked line is COUNTED, not lost — partitionWorkQueue returns it with a
 *     reason, so the endpoint can report a number instead of going quiet.
 */

import { describe, it, expect } from 'vitest'

const {
  targetTextRenderable, blockReason, partitionWorkQueue, indexSentences,
} = require('./pod-text-approval.cjs')

const draft = (over = {}) => ({ id: 's1', target_text_draft: true, target_text_approved_at: null, ...over })

describe('targetTextRenderable — the rule', () => {
  it('refuses an unapproved draft (the defect this item exists to fix)', () => {
    expect(targetTextRenderable(draft())).toBe(false)
  })

  it('allows an approved draft', () => {
    expect(targetTextRenderable(draft({ target_text_approved_at: '2026-08-16T12:00:00Z' }))).toBe(true)
  })

  it('allows a non-draft line whatever its approval state', () => {
    expect(targetTextRenderable({ target_text_draft: false, target_text_approved_at: null })).toBe(true)
    expect(targetTextRenderable({ target_text_draft: false, target_text_approved_at: '2026-08-16T12:00:00Z' })).toBe(true)
  })

  it('treats a missing draft column as not-a-draft, never as blocked', () => {
    // The column is NOT NULL DEFAULT false in the schema, so undefined only ever
    // means "this projection did not select it" — blocking on that would turn a
    // query change into silent missing audio.
    expect(targetTextRenderable({ id: 's1' })).toBe(true)
  })

  it('approval is the timestamp alone — no second flag to disagree with it', () => {
    expect(targetTextRenderable(draft({ target_text_approved_at: undefined }))).toBe(false)
    expect(targetTextRenderable(draft({ target_text_approved_at: '' }))).toBe(true) // any non-null value counts
  })

  it('is false for a missing row rather than throwing', () => {
    expect(targetTextRenderable(null)).toBe(false)
    expect(targetTextRenderable(undefined)).toBe(false)
  })
})

describe('blockReason', () => {
  it('names the reason for a blocked line and nothing for a clear one', () => {
    expect(blockReason(draft())).toBe('unapproved_draft_target_text')
    expect(blockReason({ target_text_draft: false })).toBe(null)
  })
})

describe('partitionWorkQueue — what the endpoint actually calls', () => {
  const sentences = [
    draft({ id: 'a' }),                                                        // unapproved draft
    draft({ id: 'b', target_text_approved_at: '2026-08-16T12:00:00Z' }),       // approved draft
    { id: 'c', target_text_draft: false, target_text_approved_at: null },      // proofread
  ]
  const byId = indexSentences(sentences)
  const q = (kind, sentence_id) => ({ kind, sentence_id })

  it('withholds only the unapproved draft targets', () => {
    const { allowed, blocked } = partitionWorkQueue(
      [q('target', 'a'), q('target', 'b'), q('target', 'c')], byId)
    expect(allowed.map(i => i.sentence_id)).toEqual(['b', 'c'])
    expect(blocked.map(i => i.sentence_id)).toEqual(['a'])
  })

  it('never gates the KNOWN track — not even for an unapproved draft', () => {
    const { allowed, blocked } = partitionWorkQueue(
      [q('known', 'a'), q('known', 'b'), q('known', 'c')], byId)
    expect(allowed).toHaveLength(3)
    expect(blocked).toHaveLength(0)
  })

  it('annotates blocked items with a reason so the run can report a number', () => {
    const { blocked } = partitionWorkQueue([q('target', 'a')], byId)
    expect(blocked[0].reason).toBe('unapproved_draft_target_text')
    expect(blocked[0].kind).toBe('target')
  })

  it('passes through an item whose sentence row is missing', () => {
    // This gate refuses drafts; it is not a referential-integrity check, and
    // blocking on a lookup miss would turn a bookkeeping gap into missing audio.
    const { allowed, blocked } = partitionWorkQueue([q('target', 'ghost')], byId)
    expect(allowed).toHaveLength(1)
    expect(blocked).toHaveLength(0)
  })

  it('accepts a plain object map as well as a Map', () => {
    const plain = { a: sentences[0], b: sentences[1] }
    const { allowed, blocked } = partitionWorkQueue([q('target', 'a'), q('target', 'b')], plain)
    expect(allowed.map(i => i.sentence_id)).toEqual(['b'])
    expect(blocked.map(i => i.sentence_id)).toEqual(['a'])
  })

  it('handles an empty or absent queue', () => {
    expect(partitionWorkQueue([], byId)).toEqual({ allowed: [], blocked: [] })
    expect(partitionWorkQueue(null, byId)).toEqual({ allowed: [], blocked: [] })
  })

  it('does not mutate the queue it is given', () => {
    const queue = [q('target', 'a')]
    partitionWorkQueue(queue, byId)
    expect(queue[0].reason).toBeUndefined()
  })
})

describe('indexSentences', () => {
  it('indexes by id and skips rows without one', () => {
    const map = indexSentences([{ id: 'a' }, { nope: 1 }, null])
    expect(map.size).toBe(1)
    expect(map.get('a')).toEqual({ id: 'a' })
  })
})
