// Integration-map fix #1+#2: the server's finalized plan must satisfy the
// canonical contract AND survive the client normalizer with cues/gloss/scene
// intact (the drift this guards against rendered empty cue lines).
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { buildRecordingPlan, finalizeRecordingPlan } = require('../pods-plan.cjs')
const { normalizeRecordingPlan } = require('../../../src/utils/podRecordingPlan.js')

const POD = { id: 'cym_n_for_eng:pod-0', slug: 'pod-0', title: 'Pod 0', metadata: { sections: [{ number: 1, title: 'Yn y caffi' }] } }
const ROWS = [
  { id: 's1', pod_id: POD.id, scene_number: 1, global_order: 1, speaker: 'Elin', target_text: 'Bore da!', known_text: 'Good morning!', explainer_text: null, glue_to_next: false, target_audio_id: 'AUD-OLD', known_audio_id: null, explainer_audio_id: null },
  { id: 's2', pod_id: POD.id, scene_number: 1, global_order: 2, speaker: 'Catrin', target_text: 'Bore da, sut wyt ti?', known_text: 'Good morning, how are you?', explainer_text: null, glue_to_next: false, target_audio_id: 'AUD-HUMAN', known_audio_id: null, explainer_audio_id: null },
  { id: 's3', pod_id: POD.id, scene_number: 1, global_order: 3, speaker: 'Catrin', target_text: 'Braf dy weld di.', known_text: 'Nice to see you.', explainer_text: null, glue_to_next: false, target_audio_id: null, known_audio_id: null, explainer_audio_id: null },
]
const CAST = { Catrin: { voiceId: 'human_catrin_cym', name: 'Catrin' }, Elin: { voiceId: 'human_elin_cym', name: 'Elin' } }

async function makeFinal() {
  const plan = buildRecordingPlan({ pods: [POD], sentences: ROWS, podCast: CAST, voiceId: 'human_catrin_cym', cueCount: 2 })
  return finalizeRecordingPlan({
    plan, sentences: ROWS, voiceId: 'human_catrin_cym',
    fetchAudioRows: async (ids) => {
      expect(ids.sort()).toEqual(['AUD-HUMAN'])  // only Catrin's items' pointers are looked up
      return [{ id: 'AUD-HUMAN', origin: 'human', voice_id: 'human_catrin_cym' }]
    },
  })
}

describe('finalizeRecordingPlan (canonical wire shape + recorded stamping)', () => {
  it('emits canonical cues/line/scene and stamps recorded/audioId', async () => {
    const final = await makeFinal()
    expect(final.items).toHaveLength(2)

    const [first, second] = final.items
    expect(first.cues).toEqual([{ speaker: 'Elin', targetText: 'Bore da!', knownText: 'Good morning!', draft: false }])
    expect(first.line).toEqual({ targetText: 'Bore da, sut wyt ti?', knownText: 'Good morning, how are you?' })
    expect(first.sceneNumber).toBe(1)
    expect(first.sceneTitle).toBe('Yn y caffi')   // boundary item carries the title
    expect(second.sceneTitle).toBe(null)          // non-boundary does not
    expect(first.recorded).toBe(true)
    expect(first.audioId).toBe('AUD-HUMAN')
    expect(second.recorded).toBe(false)
    expect(second.audioId).toBe(null)
    expect(final.totals).toEqual({ items: 2, recorded: 1, remaining: 1 })
  })

  it('survives the client normalizer with nothing lost', async () => {
    const final = await makeFinal()
    const normalized = normalizeRecordingPlan({ courseCode: 'cym_n_for_eng', voiceId: 'human_catrin_cym', ...final })
    expect(normalized.items).toHaveLength(2)
    expect(normalized.items[0].cues[0].targetText).toBe('Bore da!')
    expect(normalized.items[0].cues[0].knownText).toBe('Good morning!')
    // the normalizer flattens line {targetText,knownText} → lineText/lineGloss
    expect(normalized.items[0].lineText).toBe('Bore da, sut wyt ti?')
    expect(normalized.items[0].lineGloss).toBe('Good morning, how are you?')
    expect(normalized.items[0].sceneTitle).toBe('Yn y caffi')
    expect(normalized.items[0].recorded).toBe(true)
    expect(normalized.items[1].recorded).toBe(false)
  })
})

// ── RE-RECORD WANTED reads as OUTSTANDING (make-before-break, 2026-08-14) ────
// The line's own human take is linked, real and playable — and it still has to
// appear as work to do, because "record this again" must not mean "unlink the
// audio the learner is currently hearing".
describe('finalizeRecordingPlan — rerecord_wanted', () => {
  const WANT_ROWS = ROWS.map(r =>
    r.id === 's2' ? { ...r, rerecord_wanted: { target: 'human_catrin_cym' } } : r)

  const fetchLiveTake = async (ids) => ids.includes('AUD-HUMAN')
    ? [{ id: 'AUD-HUMAN', origin: 'human', voice_id: 'human_catrin_cym', file_size_bytes: 48000 }]
    : []

  it('a wanted target is outstanding though a real human take is still linked', async () => {
    const plan = buildRecordingPlan({ pods: [POD], sentences: WANT_ROWS, podCast: CAST, voiceId: 'human_catrin_cym' })
    const final = await finalizeRecordingPlan({
      plan, sentences: WANT_ROWS, voiceId: 'human_catrin_cym', fetchAudioRows: fetchLiveTake,
    })
    const s2 = final.items.find(i => i.sentenceId === 's2' && i.kind === 'target')
    expect(s2.recorded).toBe(false)
    expect(s2.audioId).toBe('AUD-HUMAN')      // audio stays LINKED — nothing unlinked
    expect(final.totals).toEqual({ items: 2, recorded: 0, remaining: 2 })
  })

  it('without the want, that same take counts as recorded', async () => {
    const plan = buildRecordingPlan({ pods: [POD], sentences: ROWS, podCast: CAST, voiceId: 'human_catrin_cym' })
    const final = await finalizeRecordingPlan({
      plan, sentences: ROWS, voiceId: 'human_catrin_cym', fetchAudioRows: fetchLiveTake,
    })
    expect(final.items.find(i => i.sentenceId === 's2').recorded).toBe(true)
    expect(final.totals.remaining).toBe(1)
  })

  it('a wanted KNOWN line reaches a non-explainer voice and reads as outstanding', async () => {
    const rows = ROWS.map(r =>
      r.id === 's1' ? { ...r, rerecord_wanted: { known: 'human_catrin_cym' }, known_audio_id: 'AUD-KNOWN' } : r)
    const plan = buildRecordingPlan({ pods: [POD], sentences: rows, podCast: CAST, voiceId: 'human_catrin_cym' })
    const final = await finalizeRecordingPlan({
      plan, sentences: rows, voiceId: 'human_catrin_cym',
      fetchAudioRows: async () => [
        { id: 'AUD-KNOWN', origin: 'human', voice_id: 'human_catrin_cym', file_size_bytes: 48000 },
        { id: 'AUD-HUMAN', origin: 'human', voice_id: 'human_catrin_cym', file_size_bytes: 48000 },
      ],
    })
    const known = final.items.find(i => i.kind === 'known')
    expect(known.sentenceId).toBe('s1')
    expect(known.line).toEqual({ targetText: null, knownText: 'Good morning!' })
    expect(known.recorded).toBe(false)
    expect(known.audioId).toBe('AUD-KNOWN')
  })

  it('a want named for a collapsed-away alias counts for its survivor queue', async () => {
    const rows = ROWS.map(r => r.id === 's2' ? { ...r, rerecord_wanted: { target: 'human_catrin_cym_old' } } : r)
    const plan = buildRecordingPlan({ pods: [POD], sentences: rows, podCast: CAST, voiceId: 'human_catrin_cym' })
    const final = await finalizeRecordingPlan({
      plan, sentences: rows, voiceId: 'human_catrin_cym',
      acceptVoiceIds: new Set(['human_catrin_cym', 'human_catrin_cym_old']),
      fetchAudioRows: fetchLiveTake,
    })
    expect(final.items.find(i => i.sentenceId === 's2').recorded).toBe(false)
  })
})
