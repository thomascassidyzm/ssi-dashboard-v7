/**
 * relink-split-known-sentence-clips — the planner links a split turn's known sentences only to recordings that
 * already exist in the row's own voice, and refuses everything it would have to guess (job #917, 2026-09-30).
 * The fixture is Italian Pod 1 row 94, one of the two rows whose English was silent in every mode.
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { planRow } = require('./relink-split-known-sentence-clips.cjs')

const row94 = {
  pod_id: 'ita_for_eng:pod-1',
  known_text: "You're welcome. Are you here on holiday? You speak very good Italian.",
  sentence_audio_ids: ['t1', 't2', 't3'],
  sentence_known_audio_ids: null,
}
const clip = (id, text, voice_id, extra = {}) => ({
  id, text, voice_id, language: 'en', course_code: 'ita_for_eng', role: 'pod_fine_known', audio_revision: 1, created_at: '2026-07-24', ...extra,
})
const library = [
  clip('k1', 'you\'re welcome', 'gfzdpspr5fdp'),
  clip('k2', 'Are you here on holiday?', 'xai_gfzdpspr5fdp', { language: 'eng' }),
  clip('k3', 'You speak very good Italian.', 'gfzdpspr5fdp'),
]

describe('planRow', () => {
  it('links every sentence to an existing clip in the same voice identity, whatever the id or language spelling', () => {
    const p = planRow({ row: row94, rowKnownVoice: 'xai_gfzdpspr5fdp', rowKnownLanguage: 'en', candidates: library })
    expect(p.action).toBe('link')
    expect(p.ids).toEqual(['k1', 'k2', 'k3'])
  })

  it('never links a clip in another voice — a voice change never re-renders, and never re-voices either', () => {
    const other = library.map((c, i) => (i === 2 ? { ...c, voice_id: 'xai_bedd6226' } : c))
    const p = planRow({ row: row94, rowKnownVoice: 'xai_gfzdpspr5fdp', rowKnownLanguage: 'en', candidates: other })
    expect(p.action).toBe('skip')
    expect(p.reason).toMatch(/You speak very good Italian/)
  })

  it('prefers the pod\'s own course when the same recording exists in several', () => {
    const p = planRow({
      row: row94, rowKnownVoice: 'gfzdpspr5fdp', rowKnownLanguage: 'en',
      candidates: [clip('elsewhere', "You're welcome.", 'gfzdpspr5fdp', { course_code: 'hrv_for_eng', audio_revision: 2 }), ...library],
    })
    expect(p.ids[0]).toBe('k1')
  })

  it('skips when the known text does not split into as many sentences as there are target clips', () => {
    const p = planRow({ row: { ...row94, sentence_audio_ids: ['t1', 't2'] }, rowKnownVoice: 'gfzdpspr5fdp', rowKnownLanguage: 'en', candidates: library })
    expect(p.action).toBe('skip')
  })

  it('never writes an Arabic pod — Aran leads Arabic', () => {
    const p = planRow({ row: { ...row94, pod_id: 'ara_sy_for_eng:pod-1' }, rowKnownVoice: 'gfzdpspr5fdp', rowKnownLanguage: 'en', candidates: library })
    expect(p.action).toBe('skip')
    expect(p.reason).toMatch(/Arabic/)
  })

  it('leaves an already-linked row alone', () => {
    const p = planRow({ row: { ...row94, sentence_known_audio_ids: ['a', 'b', 'c'] }, rowKnownVoice: 'gfzdpspr5fdp', rowKnownLanguage: 'en', candidates: library })
    expect(p.reason).toBe('already linked')
  })
})
