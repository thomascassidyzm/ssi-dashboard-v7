/**
 * The "Introductions" card on Aran's English booth (Aran 2026-10-29, job #587): every LEGO intro of the new North and
 * South courses read WHOLE, in running order, a card per course (an intro both share on both, recorded once), his take filed and linked as the LEGO's intro.
 * No network, no DB. Run: npx vitest run services/voice-engine/intro-sentence-lines.test.cjs
 */
import { describe, it, expect } from 'vitest'
const is = require('./intro-sentence-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { isLineRecorded } = require('./take-selection.cjs')
const { planScriptTakeFiling } = require('../script-take-filing.cjs')
const { languageForTake } = require('../recording-speech-gate.cjs')

const ARAN = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'] }
const DAN = { voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] }
const lego = (id, course_code, seed_number, lego_index, known_text, target_text, extra = {}) =>
  ({ id, course_code, seed_number, lego_index, lego_id: `S${String(seed_number).padStart(4, '0')}L0${lego_index}`, known_text, target_text, is_new: true, presentation_audio_id: null, ...extra })

const legos = [
  lego('n2', 'cym_nv2_for_eng', 1, 2, 'to speak', 'siarad'),
  lego('s1', 'cym_sv2_for_eng', 1, 1, 'I want', 'dw i isio'),           // same intro as North's S0001L01: folded
  lego('n1', 'cym_nv2_for_eng', 1, 1, 'I want', 'dw i isio'),
  lego('s2', 'cym_sv2_for_eng', 1, 2, 'to speak', 'siarad', { presentation_audio_id: 'aran-splice' }),
  lego('n3', 'cym_nv2_for_eng', 2, 1, 'now', 'nawr', { is_new: false }), // not introduced
  lego('n4', 'cym_nv2_for_eng', 2, 2, 'today', 'heddiw', { presentation_audio_id: 'charlotte-intro' }),
  lego('s3', 'cym_sv2_for_eng', 2, 1, 'with you', 'efo chi', { presentation_audio_id: 'aran-take' }),
  lego('n5', 'cym_nv2_for_eng', 3, 1, 'tonight', ''),                   // no Welsh yet: nothing to introduce
  lego('x1', 'cym_n_for_eng', 1, 1, 'live course', 'cwrs byw'),
]
const introClips = new Map([
  ['aran-splice', { voice: 'human_aran_eng', spliced: true }],
  ['aran-take', { voice: 'human_aran_eng', spliced: false }],
  ['charlotte-intro', { voice: 'charlotte', spliced: false }],
])
const lines = is.introSentenceLinesFor(ARAN, { legos, introClips })

describe('Introductions lines', () => {
  it('one line per intro PER COURSE, whole sentence, North then South, each in running order; old, other-voice and wordless LEGOs left off', () => {
    expect(lines.map((l) => [l.id, l.text])).toEqual([
      ['introsentence:n1', 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.'],
      ['introsentence:n2', 'The Welsh for <src>to speak</src> is <tgt>siarad</tgt>.'],
      ['introsentence:s1', 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.'],
      ['introsentence:s2', 'The Welsh for <src>to speak</src> is <tgt>siarad</tgt>.'],
      ['introsentence:s3', 'The Welsh for <src>with you</src> is <tgt>efo chi</tgt>.'],
    ])
    expect(lines.every((l) => l.kind === 'introsentence' && l.role === 'presentation')).toBe(true)
  })
  it('ordered by where the seed is SERVED (running order), not by seed number', () => {
    const woven = [lego('a', 'cym_nv2_for_eng', 76, 1, 'he wanted', 'oedd o isio'), lego('b', 'cym_nv2_for_eng', 1036, 2, 'the story', 'y stori')]
    const served = new Map([[76, 40], [1036, 12]])
    const got = is.introSentenceLinesFor(ARAN, { legos: woven, positionOf: (l) => served.get(l.seed_number) })
    expect(got.map((l) => l.legoId)).toEqual(['S1036L02', 'S0076L01'])
  })
  it('an intro identical in North and South is on BOTH cards, each line carrying the other copy, so one take fills both', () => {
    expect(lines[0].duplicateOf).toEqual([{ legoRowId: 's1', courseCode: 'cym_sv2_for_eng', legoId: 'S0001L01', presentationAudioId: null }])
    expect(lines[2].duplicateOf).toEqual([{ legoRowId: 'n1', courseCode: 'cym_nv2_for_eng', legoId: 'S0001L01', presentationAudioId: null }])
    expect(lines[1].duplicateOf).toEqual([{ legoRowId: 's2', courseCode: 'cym_sv2_for_eng', legoId: 'S0001L02', presentationAudioId: 'aran-splice' }])
    expect(lines.map((l) => l.sharedWith)).toEqual([['cym_sv2_for_eng'], ['cym_sv2_for_eng'], ['cym_nv2_for_eng'], ['cym_nv2_for_eng'], []])
  })
  it('recorded on one card = done on the other: a take of his in the North slot counts the South line recorded too', () => {
    const clips = new Map([...introClips, ['aran-n1', { voice: 'human_aran_eng', spliced: false }]])
    const got = is.introSentenceLinesFor(ARAN, { legos: legos.map((l) => (l.id === 'n1' ? { ...l, presentation_audio_id: 'aran-n1' } : l)), introClips: clips })
    const rec = (l) => isLineRecorded(l, { recordedKeys: new Set(), spellings: ARAN.spellings })
    expect(got.map((l) => [l.id, rec(l)])).toEqual([['introsentence:n1', true], ['introsentence:n2', false], ['introsentence:s1', true], ['introsentence:s2', false], ['introsentence:s3', true]])
  })
  it('twice in ONE course folds to that course\'s earliest LEGO', () => {
    const twice = [lego('a', 'cym_nv2_for_eng', 1, 1, 'yes', 'ia'), lego('b', 'cym_nv2_for_eng', 5, 1, 'yes', 'ia')]
    const got = is.introSentenceLinesFor(ARAN, { legos: twice })
    expect(got.map((l) => [l.id, l.duplicateOf.map((d) => d.legoRowId), l.sharedWith])).toEqual([['introsentence:a', ['b'], []]])
  })
  it('TWO cards, North and South separately, each cut in batches of 100; a shared intro counts on both', () => {
    const many = Array.from({ length: 230 }, (_, i) => lego(`r${i}`, i % 2 ? 'cym_sv2_for_eng' : 'cym_nv2_for_eng', i + 1, 1, `word ${i}`, `gair ${i}`))
    const shared = Array.from({ length: 10 }, (_, i) => [lego(`sn${i}`, 'cym_nv2_for_eng', 500 + i, 1, `both ${i}`, `y ddau ${i}`), lego(`ss${i}`, 'cym_sv2_for_eng', 500 + i, 1, `both ${i}`, `y ddau ${i}`)]).flat()
    const tracks = boothHome.buildHomeTracks(is.introSentenceLinesFor(ARAN, { legos: [...many, ...shared] }))
    expect(tracks.map((t) => [t.key, t.kind, t.total, t.batches.map((b) => b.total)])).toEqual([
      ['introsentence.cym_nv2_for_eng', 'introsentence', 125, [100, 25]],
      ['introsentence.cym_sv2_for_eng', 'introsentence', 125, [100, 25]],
    ])
  })
  it('recorded = a whole-sentence take of his in a slot; a splice of his is NOT a recording of the sentence', () => {
    const rec = (l) => isLineRecorded(l, { recordedKeys: new Set([String(l.text).toLowerCase()]), spellings: ARAN.spellings })
    expect(lines.map(rec)).toEqual([false, false, false, false, true])
  })
  it('nobody else gets the card, and the take route resolves only his', () => {
    expect(is.introSentenceLinesFor(DAN, { legos, introClips })).toEqual([])
    expect(is.introSentenceLinesFor({ ...ARAN, castCourses: ['cym_sv2_for_eng'] }, { legos, introClips }).map((l) => l.id)).toEqual(['introsentence:s1', 'introsentence:s2', 'introsentence:s3'])
    expect(is.parseIntroSentenceLineId('introsentence:abc-123')).toEqual({ legoRowId: 'abc-123' })
    expect(is.parseIntroSentenceLineId('englego:abc')).toBe(null)
    expect(is.resolveIntroSentence(legos[2], ARAN)).toEqual({ courseCode: 'cym_nv2_for_eng', legoId: 'S0001L01', text: 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.' })
    expect(is.resolveIntroSentence(legos[2], DAN)).toBe(null)
    expect(is.resolveIntroSentence(legos[8], ARAN)).toBe(null)
    expect(is.resolveIntroSentence(legos[7], ARAN)).toBe(null)
  })
})

describe('his take becomes the intro', () => {
  it('files as a presentation clip of the course\'s KNOWN language (eng), under the intro text, and is checked as English', () => {
    const plan = planScriptTakeFiling({
      metadata: { mode: 'script', cadence: 'natural', role: 'presentation', kind: 'intro-sentence', text: lines[0].text },
      voiceId: 'human_aran_eng', course: { known_lang: 'eng', target_lang: 'cym' },
    })
    expect(plan).toEqual({ file: true, text: lines[0].text, role: 'presentation', language: 'eng', voiceId: 'human_aran_eng' })
    expect(languageForTake('cym_nv2_for_eng', 'intro-sentence')).toBe('eng')
  })
  it('links every copy: fills an empty slot, REPLACES a splice of his (make-before-break: the take exists first, nothing deleted), never displaces another voice', () => {
    const copies = [
      { courseCode: 'cym_nv2_for_eng', legoId: 'S0001L02', presentationAudioId: null },
      { courseCode: 'cym_sv2_for_eng', legoId: 'S0001L02', presentationAudioId: 'aran-splice' },
      { courseCode: 'cym_sv2_for_eng', legoId: 'S0002L02', presentationAudioId: 'charlotte-intro' },
      { courseCode: 'cym_sv2_for_eng', legoId: 'S0003L01', presentationAudioId: 'TAKE' },
    ]
    const heldVoice = new Map([['aran-splice', 'human_aran_eng'], ['charlotte-intro', 'charlotte'], ['TAKE', 'human_aran_eng']])
    const { links, leftAlone } = is.planIntroSentenceLinks(copies, 'TAKE', heldVoice, ARAN.spellings)
    expect([...links]).toEqual([
      ['cym_nv2_for_eng', [{ legoId: 'S0001L02', role: 'presentation', audioId: 'TAKE' }]],
      ['cym_sv2_for_eng', [{ legoId: 'S0001L02', role: 'presentation', audioId: 'TAKE', replace: true, expectCurrent: 'aran-splice' }]],
    ])
    expect(leftAlone).toEqual([expect.objectContaining({ legoId: 'S0002L02', heldBy: 'charlotte' })])
  })
})
