/** tools/audio/voice-audit.cjs — the pure classifier the audit (and its nightly) reports from. */
import { describe, it, expect } from 'vitest'
import audit from './voice-audit.cjs'
import rv from '../../services/shared/resolve-voice.cjs'
const { classify, render } = audit

const fra = { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' }
const cast = { roles: [{ language: 'fra', gender: 'f', rank: 0, slot: 'phrase', voice_id: 'cartesia_fra-f', assigned_by: 'thomas.cassidy+ssi@gmail.com' }], voices: [{ voice_id: 'cartesia_fra-f', is_active: true }] }
const g = (col, voice_id, language, slots, origin = 'tts') => ({ tbl: 'course_practice_phrases', col, voice_id, language, origin, slots, texts: slots })

describe('voice audit classify', () => {
  it('counts ok, drift, human, refused, no-ruling and empty, and names the resolved voice for drift', () => {
    const { totals, groups } = classify(fra, [
      g('known_audio_id', rv.TOM_006, 'eng', 10),
      g('known_audio_id', rv.CHARLOTTE, 'eng', 7),
      g('known_audio_id', 'human_aran', 'eng', 3, 'human'),
      g('target1_audio_id', 'cartesia_fra-f', 'fra', 5),
      g('target2_audio_id', 'azure_fr-FR-HenriNeural', 'fra', 4),   // no male fra cast → refused
      g('target1_audio_id', rv.TOM_006, 'eng', 2),                 // an English line on a French slot → no ruling
      g('known_audio_id', null, null, 6),                          // dangling: the pointer names no clip
    ], cast)
    expect(totals).toEqual({ ok: 15, drift: 7, human: 3, refused: 4, 'no-ruling': 2, dangling: 6 })
    expect(groups.find((x) => x.status === 'drift')).toMatchObject({ role: 'known', resolved: rv.TOM_006, reason: 'english-known' })
    expect(groups.find((x) => x.status === 'refused')).toMatchObject({ role: 'target2', reason: 'uncast' })
  })
  it('renders one plain block with the fix plan', () => {
    const a = classify(fra, [g('known_audio_id', rv.CHARLOTTE, 'eng', 7)], cast)
    a.plan = { texts: 3, slots: 7, reuseTexts: 1, reuseSlots: 2, renderTexts: 2, renderChars: 40, presentationRender: 0 }
    const out = render('fra_for_eng', a)
    expect(out).toMatch(/^fra_for_eng: ok 0 · drift 7/)
    expect(out).toMatch(/drift 7 known: .* -> cartesia_d293d509/)
    expect(out).toMatch(/reuse 1 texts \(2 slots, free\), render 2 texts \(40 chars\)/)
  })
})
