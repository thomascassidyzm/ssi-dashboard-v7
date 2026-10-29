/**
 * The "English LEGOs" cards on Aran's English booth (job #255): the English of every new North/South LEGO still owed
 * for his spliced intros, never a line he is asked for elsewhere, North and South of the same words one line.
 * Run: npx vitest run services/voice-engine/english-lego-lines.test.cjs
 */
import { describe, it, expect } from 'vitest'
const el = require('./english-lego-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { isLineRecorded } = require('./take-selection.cjs')
const { spokenWordsKey } = require('../shared/spoken-words.cjs')

const ARAN = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'] }
// The splice switched ON, as it was from job #210 to job #587; the live config has it off (last test).
const rule = { voiceId: 'human_aran_eng', fragment: 'The Welsh for', joiner: 'is', withTarget: true, splice: true }
const SPLICE_ON = { cym_nv2_for_eng: rule, cym_sv2_for_eng: rule }
const lego = (id, course_code, seed_number, lego_index, known_text, extra = {}) =>
  ({ id, course_code, seed_number, lego_index, lego_id: `S${String(seed_number).padStart(4, '0')}L0${lego_index}`, known_text, is_new: true, presentation_audio_id: null, ...extra })

describe('English LEGO lines', () => {
  const legos = [
    lego('s1', 'cym_sv2_for_eng', 1, 1, 'I want'),          // same words as North's: one line, on North's card
    lego('n1', 'cym_nv2_for_eng', 1, 1, 'I want'),
    lego('n2', 'cym_nv2_for_eng', 1, 2, 'to speak'),
    lego('n3', 'cym_nv2_for_eng', 2, 1, 'Welsh?'),          // a seed's English: already on the sentence card
    lego('n4', 'cym_nv2_for_eng', 2, 2, 'now', { is_new: false }),
    lego('n5', 'cym_nv2_for_eng', 3, 1, 'today', { presentation_audio_id: 'charlotte-intro' }),
    lego('n6', 'cym_nv2_for_eng', 3, 2, 'tonight', { presentation_audio_id: 'aran-intro' }),
    lego('s2', 'cym_sv2_for_eng', 2, 1, 'with you'),
    lego('x1', 'cym_n_for_eng', 1, 1, 'live course'),
  ]
  const lines = el.englishLegoLinesFor(ARAN, { legos, otherKnownTexts: ['welsh'], ownIntroIds: new Set(['aran-intro']) }, SPLICE_ON)

  it('one line per spoken words, North first, seeds/phrases/old/others-intro LEGOs left off', () => {
    expect(lines.map((l) => [l.id, l.courseCode, l.text])).toEqual([
      ['englego:n1', 'cym_nv2_for_eng', 'I want'],
      ['englego:n2', 'cym_nv2_for_eng', 'to speak'],
      ['englego:n6', 'cym_nv2_for_eng', 'tonight'],
      ['englego:s2', 'cym_sv2_for_eng', 'with you'],
    ])
    expect(lines[0].duplicateOf).toEqual([{ legoRowId: 's1', courseCode: 'cym_sv2_for_eng', legoId: 'S0001L01' }])
    expect(lines.every((l) => l.kind === 'lego' && l.role === 'known' && l.knownByText)).toBe(true)
  })

  it('North and South are separate cards', () => {
    const tracks = boothHome.buildHomeTracks(lines)
    expect(tracks.map((t) => [t.key, t.total, t.role])).toEqual([['lego.cym_nv2_for_eng', 3, 'known'], ['lego.cym_sv2_for_eng', 1, 'known']])
  })

  it('anything he has read, on any card, counts as recorded here', () => {
    const recordedKeys = new Set([spokenWordsKey('i want.')])
    expect(isLineRecorded(lines[0], { recordedKeys, spellings: ARAN.spellings })).toBe(true)
    expect(isLineRecorded(lines[1], { recordedKeys, spellings: ARAN.spellings })).toBe(false)
  })

  it('nobody else gets them, and the take route resolves only his', () => {
    expect(el.englishLegoLinesFor({ voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] }, { legos }, SPLICE_ON)).toEqual([])
    expect(el.englishLegoLinesFor({ ...ARAN, castCourses: ['cym_sv2_for_eng'] }, { legos }, SPLICE_ON).map((l) => l.id)).toEqual(['englego:s1', 'englego:s2'])
    expect(el.parseEnglishLegoLineId('englego:abc-123')).toEqual({ legoRowId: 'abc-123' })
    expect(el.parseEnglishLegoLineId('lego:abc:target1')).toBe(null)
    expect(el.resolveEnglishLego(legos[1], ARAN)).toEqual({ courseCode: 'cym_nv2_for_eng', legoId: 'S0001L01', text: 'I want' })
    expect(el.resolveEnglishLego(legos[8], ARAN)).toBe(null)
    expect(el.resolveEnglishLego(legos[1], { voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] })).toBe(null)
  })

  it('with the splice off (Aran 2026-10-29, job #587) the cards are gone, but a take already on his phone still files', () => {
    expect(el.englishLegoLinesFor(ARAN, { legos, otherKnownTexts: ['welsh'] })).toEqual([])
    expect(el.resolveEnglishLego(legos[1], ARAN)).toEqual({ courseCode: 'cym_nv2_for_eng', legoId: 'S0001L01', text: 'I want' })
  })
})
