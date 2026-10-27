/**
 * The "Intro pieces" card on Aran's English booth (job #210): "The Welsh for" and "is", read once, shared by North and
 * South, and only ever his. Run: npx vitest run services/voice-engine/intro-piece-lines.test.cjs
 */
import { describe, it, expect } from 'vitest'
const ip = require('./intro-piece-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { isLineRecorded } = require('./take-selection.cjs')

const ARAN = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'] }

describe('intro piece lines', () => {
  it('Aran gets two lines, front of the queue, one card', () => {
    const lines = ip.introPieceLinesFor(ARAN)
    expect(lines.map((l) => [l.id, l.text])).toEqual([
      ['intropiece:cym_nv2_for_eng:fragment', 'The Welsh for'],
      ['intropiece:cym_nv2_for_eng:joiner', 'is'],
    ])
    expect(lines.every((l) => l.kind === 'intro' && l.role === 'known' && l.knownByText)).toBe(true)
    const tracks = boothHome.buildHomeTracks(lines)
    expect(tracks.map((t) => [t.key, t.total])).toEqual([['intro.cym_nv2_for_eng', 2]])
  })
  it('nobody else gets them, and nobody else can file one', () => {
    expect(ip.introPieceLinesFor({ voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] })).toEqual([])
    // cast only on other courses: no card; cast on South alone: filed under South
    expect(ip.introPieceLinesFor({ ...ARAN, castCourses: ['cym_n_for_eng'] })).toEqual([])
    expect(ip.introPieceLinesFor({ ...ARAN, castCourses: ['cym_sv2_for_eng'] }).map((l) => l.id)).toEqual(['intropiece:cym_sv2_for_eng:fragment', 'intropiece:cym_sv2_for_eng:joiner'])
    const parsed = ip.parseIntroPieceLineId('intropiece:cym_sv2_for_eng:joiner')
    expect(parsed).toEqual({ courseCode: 'cym_sv2_for_eng', key: 'joiner' })
    expect(ip.resolveIntroPiece(parsed, ARAN)).toEqual({ courseCode: 'cym_sv2_for_eng', key: 'joiner', text: 'is' })
    expect(ip.resolveIntroPiece(parsed, { voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] })).toBeNull()
    for (const bad of ['intropiece:cym_nv2_for_eng:x', 'intropiece:spa_for_eng:fragment', 'quarry:a:word:b']) {
      expect(ip.resolveIntroPiece(ip.parseIntroPieceLineId(bad), ARAN)).toBeNull()
    }
  })
  it('a line is recorded once he has any English take of the words', () => {
    const [frag] = ip.introPieceLinesFor(ARAN)
    expect(isLineRecorded(frag, { recordedKeys: new Set(), spellings: ARAN.spellings })).toBe(false)
    expect(isLineRecorded(frag, { recordedKeys: new Set(['the welsh for']), spellings: ARAN.spellings })).toBe(true)
  })
})
