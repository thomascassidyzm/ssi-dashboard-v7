/**
 * Unit tests for the split-audio inheritance rule (2026-08-24).
 *
 * Why this exists: on 2026-08-22 the 22-course pod-1 fleet was staged and flipped
 * with `target_audio_id` / `known_audio_id` correctly re-derived at every slot and
 * the OTHER split-array slots left standing. The scene running order had changed —
 * ita_for_eng's pod-0 scene 15 became pod-1 scene 22 — so those slots' clips played
 * and, because `podSentenceSplit` reads the on-screen text from the clip's own
 * `course_audio.text`, DISPLAYED a different conversation in the retired pod's cast.
 * 91 of 141 ita rows inherited; 113 were repaired.
 *
 * The two facts pinned here are the two that were not true before:
 *   1. a clone/re-align of a pod whose scene ORDER changed does not carry split
 *      audio across;
 *   2. where there is no correctly-derived split audio for a slot, the answer is
 *      NULL — the player falls back to the verified whole-turn clip — and not a
 *      best-effort array.
 *
 * explainer_audio_id (a sixth audio column) is out of scope: the pod-sentence
 * explainer track is deprecated (2026-08-24) and this module never carries,
 * nulls or flags it, so the fixtures below simply omit it.
 *
 * Pure unit tests. Nothing here opens a database.
 *
 * Root cause and fix: docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md
 */

import { describe, it, expect } from 'vitest'

const {
  carrySplitAudio,
  findInheritedSplitAudio,
  SPLIT_AUDIO_FIELDS,
} = require('./split-audio-inheritance.cjs')

/** A pod-0 row: the "practising Italian with a friend" turn, at scene 15. */
const POD0_S15 = {
  id: 'ita_for_eng:pod-0:SC15-S001',
  scene_number: 15,
  sentence_number: 1,
  target_text: "Le dispiacerebbe se provassi a praticare l'italiano con lei?",
  known_text: 'Would you mind if I tried to practise Italian with you?',
  target_audio_id: 'clip-eve-target',
  known_audio_id: 'clip-sonia-known',
  sentence_audio_ids: ['eve-1', 'eve-2'],
  sentence_known_audio_ids: ['sonia-1', 'sonia-2'],
  takeg_audio_ids: ['eve-g1'],
}

/** The pod-1 canon put a DIFFERENT conversation in that slot. */
const POD1_S15_TEXT = {
  target_text: 'Quanto costa?',
  known_text: 'How much does it cost?',
}

describe('carrySplitAudio', () => {
  it('carries every slot when both texts are byte-identical (the clone case)', () => {
    const kept = carrySplitAudio(POD0_S15, POD0_S15)
    expect(kept).toEqual({
      sentence_audio_ids: ['eve-1', 'eve-2'],
      sentence_known_audio_ids: ['sonia-1', 'sonia-2'],
      takeg_audio_ids: ['eve-g1'],
    })
  })

  it('NULLS every slot when the slot holds a different conversation', () => {
    const kept = carrySplitAudio(POD0_S15, POD1_S15_TEXT)
    for (const f of SPLIT_AUDIO_FIELDS) expect(kept[f]).toBeNull()
  })

  it('carries each side independently — a retranslation drops the target side only', () => {
    const kept = carrySplitAudio(POD0_S15, {
      ...POD0_S15,
      target_text: "Le dispiacerebbe se provassi a parlare l'italiano con lei?",
    })
    expect(kept.sentence_audio_ids).toBeNull()
    expect(kept.takeg_audio_ids).toBeNull()
    expect(kept.sentence_known_audio_ids).toEqual(['sonia-1', 'sonia-2'])
  })

  it('returns nulls, never undefined, when there is no source row at all', () => {
    const kept = carrySplitAudio(null, POD1_S15_TEXT)
    expect(Object.keys(kept).sort()).toEqual([...SPLIT_AUDIO_FIELDS].sort())
    for (const f of SPLIT_AUDIO_FIELDS) expect(kept[f]).toBeNull()
  })

  it('honours an explicit carry decision over comparing text', () => {
    // The aligner knows from its own diff that a side is not carried. Two blank
    // texts compare equal, so a text comparison alone would carry the array onto
    // a slot with no target text — the caller's decision has to win.
    const blank = { ...POD0_S15, target_text: '' }
    expect(carrySplitAudio(blank, { target_text: '', known_text: blank.known_text })
      .sentence_audio_ids).toEqual(['eve-1', 'eve-2'])
    expect(carrySplitAudio(blank, null, { target: false, known: true })
      .sentence_audio_ids).toBeNull()
    expect(carrySplitAudio(blank, null, { target: false, known: true })
      .sentence_known_audio_ids).toEqual(['sonia-1', 'sonia-2'])
  })
})

describe('findInheritedSplitAudio — the promotion gate', () => {
  /** pod-0: the friend conversation at 15, the shop conversation at 22. */
  const OLD = [
    POD0_S15,
    {
      id: 'ita_for_eng:pod-0:SC22-S001',
      scene_number: 22, sentence_number: 1,
      target_text: 'Buonasera.', known_text: 'Good evening.',
      sentence_audio_ids: ['eve-9'], sentence_known_audio_ids: null,
      takeg_audio_ids: null,
    },
  ]

  it('catches split audio left behind when the scene order changed', () => {
    // The staged pod put "Quanto costa?" in slot 15 and kept slot 15's old arrays.
    const staged = [{
      id: 'ita_for_eng:pod-0-unrecorded:SC15-S001',
      scene_number: 15, sentence_number: 1,
      ...POD1_S15_TEXT,
      sentence_audio_ids: ['eve-1', 'eve-2'],
      sentence_known_audio_ids: ['sonia-1', 'sonia-2'],
      takeg_audio_ids: ['eve-g1'],
    }]
    const found = findInheritedSplitAudio(OLD, staged)
    expect(found.map(f => f.field).sort()).toEqual([...SPLIT_AUDIO_FIELDS].sort())
    expect(found[0].scene_number).toBe(15)
    expect(found[0].changed).toBe('target_text+known_text')
  })

  it('passes a staged pod that was aligned with the fix in place', () => {
    const staged = [{
      id: 'ita_for_eng:pod-0-unrecorded:SC15-S001',
      scene_number: 15, sentence_number: 1,
      ...POD1_S15_TEXT,
      ...carrySplitAudio(POD0_S15, POD1_S15_TEXT),
    }]
    expect(findInheritedSplitAudio(OLD, staged)).toEqual([])
  })

  it('does not flag a slot whose text did not change', () => {
    const staged = [{ ...POD0_S15, id: 'ita_for_eng:pod-0-unrecorded:SC15-S001' }]
    expect(findInheritedSplitAudio(OLD, staged)).toEqual([])
  })

  it('does not flag split audio that was genuinely re-derived', () => {
    const staged = [{
      id: 'ita_for_eng:pod-0-unrecorded:SC15-S001',
      scene_number: 15, sentence_number: 1,
      ...POD1_S15_TEXT,
      sentence_audio_ids: ['ara-1'], sentence_known_audio_ids: ['olivia-1'],
      takeg_audio_ids: null,
    }]
    expect(findInheritedSplitAudio(OLD, staged)).toEqual([])
  })

  it('does not flag a slot the retired pod never had — scenes past the old canon', () => {
    const staged = [{
      id: 'ita_for_eng:pod-0-unrecorded:SC30-S001',
      scene_number: 30, sentence_number: 1,
      target_text: 'Nuovo.', known_text: 'New.',
      sentence_audio_ids: ['eve-1', 'eve-2'],
      sentence_known_audio_ids: null, takeg_audio_ids: null,
    }]
    expect(findInheritedSplitAudio(OLD, staged)).toEqual([])
  })

  it('is script-safe: it never compares text for similarity, only for identity', () => {
    // The first blast-radius pass read a false 0% for jpn/zho because it stripped
    // non-Latin script. Identity works on any script.
    const old = [{
      id: 'jpn:pod-0:SC01-S001', scene_number: 1, sentence_number: 1,
      target_text: 'いくらですか。', known_text: 'How much is it?',
      sentence_audio_ids: ['jp-1', 'jp-2'],
    }]
    const staged = [{
      id: 'jpn:pod-0-unrecorded:SC01-S001', scene_number: 1, sentence_number: 1,
      target_text: 'お元気ですか。', known_text: 'How are you?',
      sentence_audio_ids: ['jp-1', 'jp-2'],
    }]
    expect(findInheritedSplitAudio(old, staged)).toHaveLength(1)
  })

  it('handles empty and absent inputs without throwing', () => {
    expect(findInheritedSplitAudio(null, null)).toEqual([])
    expect(findInheritedSplitAudio([], [])).toEqual([])
    expect(findInheritedSplitAudio(OLD, [])).toEqual([])
  })
})
