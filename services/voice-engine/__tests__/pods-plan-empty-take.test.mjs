// A human take that is a pointer to silence must not count as recorded.
//
// 2026-06-15 wrote 27 cym_n_for_eng human takes as the SAME 834-byte silent
// MP3 — 27 ids, 27 S3 keys, one empty file. `recorded` asked only
// origin+voice_id, so the recording queue counted every one of them as done
// and would never have served them to Aran again. The takes are unrecoverable
// (no raw/ objects; only the empty mastered/ file), so re-recording is the
// only repair, and it needs the queue to admit they are missing.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { buildRecordingPlan, finalizeRecordingPlan, isEmptyTake } = require('../pods-plan.cjs')

const STUB_BYTES = 834          // the real silent stub, measured
const REAL_BYTES = 40108        // a real zzz_test pod take, measured

describe('isEmptyTake', () => {
  it('calls the 834-byte silent stub empty however its duration reads', () => {
    // 25 of the 27 carry a NULL duration...
    expect(isEmptyTake({ file_size_bytes: STUB_BYTES, duration_ms: null })).toBe(true)
    // ...and two carry a confident duration against the same empty bytes, which
    // is why duration alone is not the test.
    expect(isEmptyTake({ file_size_bytes: STUB_BYTES, duration_ms: 12251 })).toBe(true)
  })

  it('does NOT call a real take empty just because duration_ms is NULL', () => {
    // the zzz_test pod takes are NULL-duration and 40 KB of actual speech
    expect(isEmptyTake({ file_size_bytes: REAL_BYTES, duration_ms: null })).toBe(false)
  })

  it('treats a zero/negative duration as empty', () => {
    expect(isEmptyTake({ file_size_bytes: REAL_BYTES, duration_ms: 0 })).toBe(true)
  })

  it('treats absent columns as unknown, not empty', () => {
    // a caller that has not been taught to select the columns keeps the old
    // behaviour rather than reporting its whole queue as unrecorded
    expect(isEmptyTake({ id: 'A', origin: 'human', voice_id: 'v' })).toBe(false)
  })

  it('calls a missing row empty', () => {
    expect(isEmptyTake(null)).toBe(true)
  })
})

const POD = { id: 'cym_n_for_eng:pod-0', slug: 'pod-0', title: 'Pod 0', metadata: { sections: [{ number: 1, title: 'Scene one' }] } }
const ROWS = [
  { id: 's1', pod_id: POD.id, scene_number: 1, global_order: 1, speaker: 'Aran', target_text: 'Bore da, Sarah!', known_text: 'Good morning, Sarah!', glue_to_next: false, target_audio_id: 'AUD-STUB', known_audio_id: null, explainer_audio_id: null },
  { id: 's2', pod_id: POD.id, scene_number: 1, global_order: 2, speaker: 'Aran', target_text: 'Sut wyt ti?', known_text: 'How are you?', glue_to_next: false, target_audio_id: 'AUD-REAL', known_audio_id: null, explainer_audio_id: null },
]

function finalize(audioRows) {
  const plan = buildRecordingPlan({ pods: [POD], sentences: ROWS, podCast: { Aran: { voiceId: 'human_aran_cym_n', name: 'Aran' } }, voiceId: 'human_aran_cym_n', cueCount: 2 })
  return finalizeRecordingPlan({ plan, sentences: ROWS, voiceId: 'human_aran_cym_n', fetchAudioRows: async () => audioRows })
}

describe('finalizeRecordingPlan vs silent stubs', () => {
  it('re-serves the stubbed line and keeps the real one banked', async () => {
    const final = await finalize([
      { id: 'AUD-STUB', origin: 'human', voice_id: 'human_aran_cym_n', duration_ms: null, file_size_bytes: STUB_BYTES },
      { id: 'AUD-REAL', origin: 'human', voice_id: 'human_aran_cym_n', duration_ms: 1802, file_size_bytes: REAL_BYTES },
    ])
    const byId = Object.fromEntries(final.items.map(i => [i.sentenceId, i]))
    expect(byId.s1.recorded).toBe(false)          // the stub is work to do again
    expect(byId.s1.audioId).toBe('AUD-STUB')      // pointer still echoed as replaces-provenance
    expect(byId.s2.recorded).toBe(true)
    expect(final.totals).toEqual({ items: 2, recorded: 1, remaining: 1 })
  })

  it('catches the stub that carries a plausible duration', async () => {
    const final = await finalize([
      { id: 'AUD-STUB', origin: 'human', voice_id: 'human_aran_cym_n', duration_ms: 12251, file_size_bytes: STUB_BYTES },
      { id: 'AUD-REAL', origin: 'human', voice_id: 'human_aran_cym_n', duration_ms: 1802, file_size_bytes: REAL_BYTES },
    ])
    expect(final.items.find(i => i.sentenceId === 's1').recorded).toBe(false)
  })
})
