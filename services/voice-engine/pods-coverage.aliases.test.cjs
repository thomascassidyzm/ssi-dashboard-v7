// The coverage payload names a voice's ALIASES, so a page reading the voice on a
// clip can name the person. cym_n_for_eng carries Aran's takes under
// human_aran_cym_n and human_aran_cym_n_2 (courses.voice_config.podCastAliases
// collapses the second into the first); without the list on the wire the pods
// page read "154 human takes by Aran and Catrin and human_aran_cym_n_2" — a
// database id shown as a third colleague (Tom, 2026-09-10).
import { describe, it, expect } from 'vitest'
import { summarizePodCoverage } from './pods-coverage.cjs'

const podCast = {
  Dyn: { voiceId: 'human_aran_cym_n', name: 'Aran' },
  Learner: { voiceId: 'human_catrinlliar_cym_n', name: 'Catrin' },
}
const podCastAliases = { human_aran_cym_n: ['human_aran_cym_n_2', 'human_aranv3_cym_n'] }
const pods = [{ id: 'cym_n_for_eng:pod-1', slug: 'pod-1', title: 'Pod 1' }]
const sentences = [
  { id: 's1', pod_id: 'cym_n_for_eng:pod-1', speaker: 'Dyn', target_text: 'bore da', target_audio_id: 'a1' },
  { id: 's2', pod_id: 'cym_n_for_eng:pod-1', speaker: 'Dyn', target_text: 'nos da', target_audio_id: 'a2' },
]
const audioById = new Map([
  ['a1', { origin: 'human', voice_id: 'human_aran_cym_n' }],
  ['a2', { origin: 'human', voice_id: 'human_aran_cym_n_2' }],
])

describe('pods coverage — voices carry their aliases', () => {
  it('lists the ids collapsed into each cast voice, empty where there are none', () => {
    const out = summarizePodCoverage({ podCast, podCastAliases, pods, sentences, audioById })
    const aran = out.voices.find(v => v.voiceId === 'human_aran_cym_n')
    const catrin = out.voices.find(v => v.voiceId === 'human_catrinlliar_cym_n')
    expect(aran.aliases).toEqual(['human_aran_cym_n_2', 'human_aranv3_cym_n'])
    expect(catrin.aliases).toEqual([])
  })

  it('leaves the voice ON THE CLIP raw — display resolves, data does not move', () => {
    const out = summarizePodCoverage({ podCast, podCastAliases, pods, sentences, audioById })
    const kinds = out.pods[0].sentences.map(s => s.kinds.target.voiceId)
    expect(kinds).toEqual(['human_aran_cym_n', 'human_aran_cym_n_2'])
  })
})
