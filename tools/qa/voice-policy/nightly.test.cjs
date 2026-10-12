/** tools/qa/voice-policy/nightly.cjs — the notice the nightly posts, and the English cast check. */
import { describe, it, expect } from 'vitest'
import nightly from './nightly.cjs'
import rv from '../../../services/shared/resolve-voice.cjs'

const t = (drift, refused = 0) => ({ ok: 1, drift, human: 0, refused, 'no-ruling': 0, dangling: 0 })
describe('nightly voice audit notice', () => {
  it('says report-only, totals with the change since last night, the worst courses and the fix command', () => {
    const prev = { courses: { fra_for_eng: { totals: t(100) }, ita_for_eng: { totals: t(50, 4) } } }
    const now = { courses: { fra_for_eng: { totals: t(80), plan: { slots: 80, reuseTexts: 2, reuseSlots: 5, renderTexts: 9, renderChars: 300, presentationRender: 1 } }, ita_for_eng: { totals: t(60, 4) } } }
    const s = nightly.noticeText(now, prev, [])
    expect(s).toMatch(/report only — nothing moved/)
    expect(s).toMatch(/Drift 140 \(-10\)/)
    expect(s).toMatch(/Most drift: fra_for_eng 80 \(-20\), ita_for_eng 60 \(\+10\)/)
    expect(s).toMatch(/reuse 2 texts \(5 slots, free\); render 9 texts \(300 chars\)/)
    expect(s).toMatch(/voice-audit\.cjs --course <code> --fix --dry-run/)
  })
  it('flags an English cast that no longer says Charlotte (f) / Tom-006 (m)', () => {
    const row = (gender, voice_id) => ({ language: 'eng', gender, rank: 0, slot: 'phrase', voice_id, assigned_by: 'tom-ruling-2026-10-12-x' })
    expect(nightly.englishCastDrift({ roles: [row('f', rv.CHARLOTTE), row('m', rv.TOM_006)] })).toEqual([])
    expect(nightly.englishCastDrift({ roles: [row('f', 'cartesia_gemma'), row('m', rv.TOM_006)] })[0]).toMatch(/English f target cast is cartesia_gemma/)
  })
})
