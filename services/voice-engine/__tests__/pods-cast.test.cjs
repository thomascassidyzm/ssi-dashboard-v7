/**
 * Unit tests: surgical podCast merge (live-shaped fixture) + speaker inventory.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  EXPLAINER_SPEAKER,
  mergePodCast,
  castVoiceFor,
  speakerInventory,
  hasGenerationColouring,
} = require('../pods-cast.cjs')

// Live-shaped fixture — mirrors a real courses.voice_config (voice-slots
// fixture lineage) PLUS the live listening-pods era keys. The merge MUST
// preserve every key outside podCast byte-for-byte: this JSONB drives live
// TTS serving via voices.*.
function liveShapedConfig() {
  return {
    version: '1.0',
    courseCode: 'cym_n_for_eng',
    voices: {
      known: { provider: 'azure', voiceId: 'en-GB-SoniaNeural', language: 'en-GB', settings: { speed: 0.95 } },
      target1: { provider: 'human', voiceId: 'human_aran_cym_n', assignedEmail: 'aran@example.com', settings: { speed: 1.0 }, previousVoice: { provider: 'azure', voiceId: 'cy-GB-NiaNeural' } },
      target2: { provider: 'azure', voiceId: 'cy-GB-AledNeural', settings: { speed: 1.0 } },
      presentation: { provider: 'azure', voiceId: 'en-GB-SoniaNeural', language: 'en-GB', settings: { speed: 0.95 } },
    },
    providers: {
      azure: { enabled: true, apiKeyEnvVar: 'AZURE_SPEECH_KEY', regionEnvVar: 'AZURE_SPEECH_REGION' },
      elevenlabs: { enabled: true, apiKeyEnvVar: 'ELEVENLABS_API_KEY' },
    },
    cadenceProfiles: {
      fast: { speedMultiplier: 1.2, pauseMs: 0, description: 'Slightly faster pace' },
      slow: { speedMultiplier: 0.75, pauseMs: 500, description: 'Slower pace for learning' },
      natural: { speedMultiplier: 1.0, pauseMs: 0, description: 'Normal speaking pace' },
    },
    podCast: {
      'Anna': { voiceId: 'human_catrin_cym', name: 'Catrin', email: 'catrin@example.com' },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  }
}

describe('mergePodCast — surgical additive merge', () => {
  it('adds a speaker without touching ANY other key (byte-for-byte)', () => {
    const input = liveShapedConfig()
    const snapshot = JSON.stringify(input)
    const out = mergePodCast(input, {
      'Waiter': { voiceId: 'human_aran_cym', name: 'Aran', email: 'aran@example.com' },
    })

    // input never mutated
    expect(JSON.stringify(input)).toBe(snapshot)
    // new entry landed
    expect(out.podCast['Waiter']).toEqual({ voiceId: 'human_aran_cym', name: 'Aran', email: 'aran@example.com' })
    // existing cast entry untouched
    expect(out.podCast['Anna']).toEqual(input.podCast['Anna'])
    // every key OUTSIDE podCast byte-identical (voices.* drives live serving)
    const { podCast: _a, ...restIn } = input
    const { podCast: _b, ...restOut } = out
    expect(JSON.stringify(restOut)).toBe(JSON.stringify(restIn))
  })

  it('updates one speaker surgically, preserving entry keys not named', () => {
    const input = liveShapedConfig()
    input.podCast['Anna'].notes = 'soft voice please'
    const out = mergePodCast(input, { 'Anna': { voiceId: 'human_sioned_cym' } })
    expect(out.podCast['Anna'].voiceId).toBe('human_sioned_cym')
    expect(out.podCast['Anna'].name).toBe('Catrin')           // not named → preserved
    expect(out.podCast['Anna'].notes).toBe('soft voice please') // unknown keys ride through
  })

  it('null removes a speaker entry; others survive', () => {
    const input = liveShapedConfig()
    const out = mergePodCast(input, {
      'Anna': null,
      [EXPLAINER_SPEAKER]: { voiceId: 'human_tom_eng', name: 'Tom' },
    })
    expect(out.podCast['Anna']).toBeUndefined()
    expect(out.podCast[EXPLAINER_SPEAKER].voiceId).toBe('human_tom_eng')
  })

  it('creates podCast from a null/empty voice_config', () => {
    const out = mergePodCast(null, { 'Anna': { voiceId: 'human_catrin_cym' } })
    expect(out.podCast['Anna'].voiceId).toBe('human_catrin_cym')
    const out2 = mergePodCast({}, { 'Anna': { voiceId: 'human_catrin_cym' } })
    expect(out2.podCast['Anna'].voiceId).toBe('human_catrin_cym')
  })

  it('rejects entries without a voiceId and empty speaker names', () => {
    expect(() => mergePodCast(liveShapedConfig(), { 'Anna': {} })).toThrow(/voiceId/)
    expect(() => mergePodCast(liveShapedConfig(), { 'Anna': { voiceId: '  ' } })).toThrow(/voiceId/)
    expect(() => mergePodCast(liveShapedConfig(), { '': { voiceId: 'x' } })).toThrow(/speaker/)
    expect(() => mergePodCast(liveShapedConfig(), null)).toThrow(/updates/)
  })

  it('empty-string name/email clears the field; absent leaves it', () => {
    const input = liveShapedConfig()
    const out = mergePodCast(input, { 'Anna': { voiceId: 'human_catrin_cym', email: '' } })
    expect(out.podCast['Anna'].email).toBeUndefined()
    expect(out.podCast['Anna'].name).toBe('Catrin')
  })
})

describe('castVoiceFor', () => {
  const podCast = {
    'Neighbour': { voiceId: 'human_v1_cym', name: 'V1' },
    'Anna (F)': { voiceId: 'human_raw_cym', name: 'Raw' },
  }
  it('collapses raw speaker variants to the canonical cast entry', () => {
    expect(castVoiceFor(podCast, 'Neighbour (8 am)').voiceId).toBe('human_v1_cym')
    expect(castVoiceFor(podCast, 'Neighbour').voiceId).toBe('human_v1_cym')
  })
  it('falls back to a raw-keyed entry, and null when uncast', () => {
    expect(castVoiceFor(podCast, 'Anna (F)').voiceId).toBe('human_raw_cym')
    expect(castVoiceFor(podCast, 'Stranger')).toBe(null)
    expect(castVoiceFor(null, 'Anna')).toBe(null)
  })
})

describe('speakerInventory', () => {
  const pods = [
    { id: 'c:pod-0', speakers: { 'Anna': { gender: 'f', target: { voice_id: 'ara' } }, _default: { gender: 'n' } } },
  ]
  const sentences = [
    { id: 's1', pod_id: 'c:pod-0', scene_number: 1, global_order: 1, speaker: 'Anna', target_text: 'a', known_text: 'k1', explainer_text: 'because…', glue_to_next: false },
    { id: 's2', pod_id: 'c:pod-0', scene_number: 1, global_order: 2, speaker: 'Waiter (M)', target_text: 'b', known_text: 'k2', explainer_text: '', glue_to_next: false },
    { id: 's3', pod_id: 'c:pod-0', scene_number: 1, global_order: 3, speaker: 'Anna', target_text: 'c', known_text: 'k3', explainer_text: null, glue_to_next: false },
  ]

  it('counts lines per canonical character + the __explainer__ known workload', () => {
    const inv = speakerInventory({ pods, sentences })
    expect(inv.speakers.map(s => [s.speaker, s.lineCount])).toEqual([['Anna', 2], ['Waiter', 1]])
    // DEPRECATION 2026-08-24: the __explainer__ cast entry's workload is the
    // KNOWN-LANGUAGE lines and nothing else. explainer_text is never counted,
    // so no explainerLines field is reported even though s1 still carries prose.
    expect(inv.explainer).toMatchObject({ knownLines: 3 })
    expect(inv.explainer.explainerLines).toBeUndefined()
    // Sitting-size estimates ride along (people-first panel shows minutes).
    expect(inv.explainer.estimatedSeconds).toBeGreaterThan(0)
    for (const s of inv.speakers) expect(s.estimatedSeconds).toBeGreaterThan(0)
  })

  it('gender: generation-side speakers entry wins, marker is fallback', () => {
    const inv = speakerInventory({ pods, sentences })
    expect(inv.speakers.find(s => s.speaker === 'Anna').gender).toBe('f')
    expect(inv.speakers.find(s => s.speaker === 'Waiter').gender).toBe('m')
  })

  it('hasGenerationColouring detects slot colouring, ignores _default', () => {
    expect(hasGenerationColouring(pods)).toBe(true)
    expect(hasGenerationColouring([{ id: 'x', speakers: { _default: { target: { voice_id: 'v' } } } }])).toBe(false)
    expect(hasGenerationColouring([{ id: 'x', speakers: null }])).toBe(false)
  })
})

describe('buildSentenceEditPatch (community script editing)', () => {
  const { buildSentenceEditPatch } = require('../pods-cast.cjs')

  it('clears exactly the audio pointers of the edited fields', () => {
    expect(buildSentenceEditPatch({ target_text: ' Bore da! ' })).toEqual({
      target_text: 'Bore da!', target_audio_id: null, target_text_draft: false,
      target_text_approved_at: null, target_text_approved_by: null, target_text_review: null,
    })
    expect(buildSentenceEditPatch({ known_text: 'Hi' })).toEqual({
      known_text: 'Hi', known_audio_id: null,
    })
  })

  // DEPRECATION 2026-08-24 (flipped from 'empty explainer is a deliberate "no
  // explainer"'): explainer_text is no longer editable at all. It is ignored
  // rather than rejected, so an old client sending it edits nothing — and
  // crucially never touches explainer_audio_id, which we do not mutate.
  it('explainer_text is ignored — never written, never clears explainer audio', () => {
    expect(buildSentenceEditPatch({ explainer_text: 'Note the mutation' })).toBe(null)
    expect(buildSentenceEditPatch({ explainer_text: '' })).toBe(null)
    const patch = buildSentenceEditPatch({ known_text: 'Hi', explainer_text: 'x' })
    expect(patch).toEqual({ known_text: 'Hi', known_audio_id: null })
    expect('explainer_audio_id' in patch).toBe(false)
  })

  // Tom 2026-08-06, "opus drafts, Aran proofreads": the human editing the target
  // line IS the proofread, so the DRAFT marker comes off in the same update.
  it('editing target_text clears the DRAFT marker', () => {
    expect(buildSentenceEditPatch({ target_text: 'Faint yw hwnna?' }).target_text_draft).toBe(false)
  })

  // A-109, 2026-08-16: an approval is bound to the words it approved. Clearing
  // the draft flag is what unblocks the line; clearing the approval is what stops
  // a verdict about the OLD text outliving that text.
  it('editing target_text clears any verifier approval of the old words', () => {
    const patch = buildSentenceEditPatch({ target_text: '¿Cuánto cuesta?' })
    expect(patch.target_text_approved_at).toBe(null)
    expect(patch.target_text_approved_by).toBe(null)
    expect(patch.target_text_review).toBe(null)
  })

  it('editing only known leaves the approval alone', () => {
    expect('target_text_approved_at' in buildSentenceEditPatch({ known_text: 'How much is that?' })).toBe(false)
    expect('target_text_review' in buildSentenceEditPatch({ known_text: 'How much is that?' })).toBe(false)
  })

  it('editing only known leaves the DRAFT marker alone', () => {
    expect('target_text_draft' in buildSentenceEditPatch({ known_text: 'How much is that?' })).toBe(false)
  })

  it('nothing editable → null (router 400s)', () => {
    expect(buildSentenceEditPatch({})).toBe(null)
    expect(buildSentenceEditPatch({ speaker: 'Sarah' })).toBe(null)
  })
})
