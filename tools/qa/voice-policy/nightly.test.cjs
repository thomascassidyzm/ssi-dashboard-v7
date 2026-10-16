/** tools/qa/voice-policy/nightly.cjs — the notice the nightly posts (Tom 2026-10-16: variety is not error), and the English roster check. */
import { describe, it, expect } from 'vitest'
import nightly from './nightly.cjs'
import rv from '../../../services/shared/resolve-voice.cjs'

const t = (o = {}) => ({ ok: 1, drift: 0, human: 0, refused: 0, 'no-ruling': 0, dangling: 0, unplayable: 0, ...o })
describe('nightly voice audit notice', () => {
  it('shows cast status and real gaps, never drift, in under four lines', () => {
    const now = { courses: { fra_for_eng: { totals: t({ drift: 9000 }) }, kor_for_eng: { totals: t({ dangling: 2, unplayable: 3, refused: 7 }) }, xyz_for_eng: { totals: t({ refused: 99 }) } } }
    const s = nightly.noticeText(now, [])
    expect(s.split('\n').length).toBeLessThan(4)
    expect(s).toMatch(/cast = spa, spa_mx, deu, ita, fra, por, por_br, zho; still to confirm = jpn, kor, ara/)
    expect(s).toMatch(/Real gaps: kor 5 with no playable audio, 7 in an uncast-language voice\./)
    expect(s).not.toMatch(/drift|9000|xyz/i)
    expect(s).toMatch(/English roster matches/)
  })
  it('says no gaps when there are none', () => {
    expect(nightly.noticeText({ courses: { fra_for_eng: { totals: t({ drift: 5 }) } } }, [])).toMatch(/Real gaps: none/)
  })
  const row = (gender, voice_id) => ({ language: 'eng', gender, rank: 0, slot: 'phrase', voice_id, assigned_by: 'tom-ruling-2026-10-12-x' })
  const good = { roles: [row('f', rv.CHARLOTTE), row('m', rv.TOM_006)] }
  const roster = [{ voice_id: 'cartesia_x', display_name: 'aran-004', is_active: true }, { voice_id: 'azure_en-GB-SoniaNeural', is_active: true }]
  it('roster passes when Charlotte f / Tom-006 m cast and aran-004 + Sonia are live', () => {
    expect(nightly.rosterLines(good, roster)).toEqual([])
  })
  it('flags a changed cast and a missing aran-004 or Sonia', () => {
    expect(nightly.rosterLines({ roles: [row('f', 'cartesia_gemma'), row('m', rv.TOM_006)] }, roster)[0]).toMatch(/English f target cast is cartesia_gemma/)
    const l = nightly.rosterLines(good, [])
    expect(l).toEqual(['aran-004 (second male) is not an active voice', 'Sonia (legacy) is not an active voice'])
    expect(nightly.noticeText({ courses: {} }, l)).toMatch(/English roster off Tom's list: aran-004/)
  })
})
