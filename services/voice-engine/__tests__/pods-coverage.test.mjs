// Coverage math for pod human recording (keystone §5) — pure, no DB.
// Run: npx vitest run services/voice-engine
import { describe, it, expect } from 'vitest'
import { summarizePodCoverage, castEntryForLine } from '../pods-coverage.cjs'
import { EXPLAINER_CAST_KEY } from '../pods-registration.cjs'

const podCast = {
  Anna: { voiceId: 'human_catrin_cym', name: 'Catrin' },
  Neighbour: { voiceId: 'human_aran_cym', name: 'Aran' },
  // Two characters can share one human voice — buckets merge by voiceId
  Barista: { voiceId: 'human_aran_cym', name: 'Aran' },
  [EXPLAINER_CAST_KEY]: { voiceId: 'human_tom_eng', name: 'Tom' },
}

const pods = [
  { id: 'c:pod-0', slug: 'pod-0', title: 'Pod 0' },
  { id: 'c:pod-1', slug: 'pod-1', title: 'Pod 1' },
]

function sentence(id, podId, speaker, over = {}) {
  return {
    id, pod_id: podId, speaker,
    target_text: 'tt', known_text: 'kk', explainer_text: '',
    target_audio_id: null, known_audio_id: null, explainer_audio_id: null,
    ...over,
  }
}

describe('castEntryForLine', () => {
  it('routes target lines via canonical speaker, known via __explainer__', () => {
    expect(castEntryForLine(podCast, 'Anna (8 am)', 'target').voiceId).toBe('human_catrin_cym')
    expect(castEntryForLine(podCast, 'Anna', 'known').voiceId).toBe('human_tom_eng')
    expect(castEntryForLine(podCast, 'Stranger', 'target')).toBeNull()
  })
})

describe('summarizePodCoverage', () => {
  it('counts recorded (human) vs tts vs missing per cast voice with per-pod breakdown', () => {
    const sentences = [
      // Anna target: human-recorded by the cast voice
      sentence('s1', 'c:pod-0', 'Anna', { target_audio_id: 'A1' }),
      // Anna target: TTS clip still in place
      sentence('s2', 'c:pod-0', 'Anna (8 am)', { target_audio_id: 'A2' }),
      // Neighbour target in pod-1: nothing yet
      sentence('s3', 'c:pod-1', 'Neighbour'),
      // Barista shares Aran's voice — merges into the same bucket
      sentence('s4', 'c:pod-1', 'Barista', { target_audio_id: 'A4' }),
    ]
    const audioById = new Map([
      ['A1', { origin: 'human', voice_id: 'human_catrin_cym' }],
      ['A2', { origin: 'tts', voice_id: 'ara' }],
      ['A4', { origin: 'human', voice_id: 'human_aran_cym' }],
    ])

    const r = summarizePodCoverage({ podCast, pods, sentences, audioById })

    const catrin = r.voices.find(v => v.voiceId === 'human_catrin_cym')
    expect(catrin.lines).toEqual({ total: 2, recorded: 1, remaining: 1, tts: 1, missing: 0 })
    expect(catrin.castKeys).toEqual(['Anna'])

    const aran = r.voices.find(v => v.voiceId === 'human_aran_cym')
    expect(aran.castKeys).toEqual(['Barista', 'Neighbour'])
    expect(aran.lines).toEqual({ total: 2, recorded: 1, remaining: 1, tts: 0, missing: 1 })
    expect(aran.perPod).toEqual([
      { podId: 'c:pod-1', slug: 'pod-1', total: 2, recorded: 1, remaining: 1 },
    ])

    // Tom (the __explainer__ cast voice) owns every known line: 4 sentences × known
    const tom = r.voices.find(v => v.voiceId === 'human_tom_eng')
    expect(tom.lines.total).toBe(4)
    expect(tom.lines.recorded).toBe(0)
    expect(tom.lines.missing).toBe(4)

    // totals = 4 target + 4 known lines (explainer_text is not a line at all)
    expect(r.totals.lines).toBe(8)
    expect(r.totals.recorded).toBe(2)
    expect(r.totals.tts).toBe(1)
    expect(r.totals.missing).toBe(5)
  })

  it('reports human-vs-tts per sentence kind, incl. voiceMatch', () => {
    const sentences = [
      sentence('s1', 'c:pod-0', 'Anna', {
        target_audio_id: 'H', known_audio_id: 'T',
        explainer_text: 'Bore da means good morning', explainer_audio_id: null,
      }),   // explainer_* deliberately populated: coverage must ignore it
    ]
    const audioById = new Map([
      ['H', { origin: 'human', voice_id: 'human_other_voice' }], // human but NOT the cast voice
      ['T', { origin: 'tts', voice_id: 'en-GB-SoniaNeural' }],
    ])
    const r = summarizePodCoverage({ podCast, pods, sentences, audioById })
    const sent = r.pods.find(p => p.podId === 'c:pod-0').sentences[0]
    expect(sent.kinds.target).toMatchObject({
      origin: 'human', recorded: true, castVoiceId: 'human_catrin_cym', voiceMatch: false,
    })
    expect(sent.kinds.known).toMatchObject({ origin: 'tts', recorded: false })
    // FLIPPED 2026-08-24 (was: 'explainer text present, no audio → a missing
    // line for the explainer voice'). Deprecation: explainer narration is never
    // a line, so populated explainer_text reports nothing and never shows up as
    // work outstanding against anybody's name.
    expect(sent.kinds.explainer).toBeUndefined()
  })

  // FLIPPED 2026-08-24 (was: "explainer_text empty string is NOT a line").
  // Now NO explainer_text is a line, empty or not.
  it('explainer_text is never a line, populated or empty', () => {
    for (const explainer_text of ['', 'Bore da means good morning']) {
      const r = summarizePodCoverage({
        podCast, pods,
        sentences: [sentence('s1', 'c:pod-0', 'Anna', { explainer_text })],
        audioById: new Map(),
      })
      expect(r.pods[0].sentences[0].kinds.explainer).toBeUndefined()
      expect(r.totals.lines).toBe(2) // target + known only
    }
  })

  it('uncast lines count as unassigned (empty podCast = casting not done yet)', () => {
    const r = summarizePodCoverage({
      podCast: {}, pods,
      sentences: [sentence('s1', 'c:pod-0', 'Stranger (M)')],
      audioById: new Map(),
    })
    expect(r.voices).toEqual([])
    expect(r.totals.unassignedLines).toBe(2)
    expect(r.unassignedSpeakers).toEqual(['Stranger', EXPLAINER_CAST_KEY])
    // sentence statuses still come back — the UI chip works pre-casting
    expect(r.pods[0].sentences[0].kinds.target.origin).toBeNull()
  })
})
