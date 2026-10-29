// Pod 1 English card (Aran, 2026-10-29, job #537): North + South Pod 1 English, one line per spoken words.
// Run: npx vitest run services/voice-engine/pod-english-lines.test.cjs
import { describe, it, expect } from 'vitest'
const pe = require('./pod-english-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { isLineRecorded } = require('./take-selection.cjs')

const ARAN = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'], gender: 'm' }
const CAST = { cym_n_for_eng: { Neighbour: { gender: 'm' } }, cym_s_for_eng: { Neighbour: { gender: 'm' } } }
const POLICY = [{ voiceId: 'human_aran_eng', aliases: [], castOn: [
  { courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue' },
  { courseCode: 'cym_s_for_eng', role: 'known' },
  { courseCode: 'cym_nv2_for_eng', role: 'known' },
] }]
const PODS = [
  { id: 'cym_n_for_eng:pod-1', course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North Pod 1' },
  { id: 'cym_s_for_eng:pod-1', course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South Pod 1' },
]
// Scene 9, not scene 1: scene 1/5 rows of these pods carry a pending Siân swap (pod-text-swaps.cjs, job #551).
const s = (pod, n, known, target, audio = null) => ({
  id: `${pod}:SC09-S00${n}`, pod_id: pod, global_order: n, speaker: 'Neighbour', known_text: known, target_text: target, known_audio_id: audio,
})
const N = 'cym_n_for_eng:pod-1', S = 'cym_s_for_eng:pod-1'

describe('Pod 1 English card', () => {
  it('is for a voice cast on the known side of the pods\' courses, and nobody else', () => {
    expect(pe.podEnglishPodsFor(ARAN, POLICY)).toEqual([N, S])
    expect(pe.podEnglishPodsFor({ voiceId: 'human_dan_cym_s', spellings: ['human_dan_cym_s'] }, POLICY)).toEqual([])
    expect(pe.podEnglishPodsFor(ARAN, [{ ...POLICY[0], castOn: [{ courseCode: 'cym_s_for_eng', role: 'target1' }] }])).toEqual([])
  })

  it('is the union of North and South, deduped by spoken words; one line serves every copy', () => {
    const sentences = [
      s(N, 1, 'Good morning, Sarah!', 'Bore da, Sarah!', 'tts-1'),
      s(N, 2, 'How are you?', 'Sut wyt ti?', 'tts-2'),
      s(S, 1, 'Good morning Sarah', 'Bore da, Sarah!'),
      s(S, 2, 'Fine, thanks.', 'Iawn, diolch.'),
      s(S, 3, '', 'Ta-ra!'),
    ]
    const slotVoiceById = new Map([['tts-1', 'xai_bedd6226'], ['tts-2', 'xai_bedd6226']])
    const lines = pe.podEnglishLinesFor(ARAN, { podIds: [N, S], pods: PODS, sentences, slotVoiceById, podCastByCourse: CAST })
    expect(lines.map((l) => l.text)).toEqual(['Good morning, Sarah!', 'How are you?', 'Fine, thanks.'])
    const [shared, nOnly, sOnly] = lines
    expect(shared.id).toBe(pe.podEnglishLineId(`${N}:SC09-S001`))
    expect(shared.duplicateOf).toEqual([{ sentenceId: `${S}:SC09-S001`, courseCode: 'cym_s_for_eng' }])
    expect(shared.filledBy).toEqual(['xai_bedd6226', null])
    expect(nOnly.duplicateOf).toEqual([])
    expect(sOnly.courseCode).toBe('cym_s_for_eng')
    for (const l of lines) expect(l).toMatchObject({ kind: 'podknown', role: 'known', knownByText: true, podSlug: 'pod-1' })
    expect(shared.knownText).toBe('Bore da, Sarah!')
  })

  it('is ONE card in the booth home, keyed by pod slug, read whole', () => {
    const lines = pe.podEnglishLinesFor(ARAN, { podIds: [N, S], pods: PODS, podCastByCourse: CAST, sentences: [s(N, 1, 'Hi.', 'Haia.'), s(S, 2, 'Bye.', 'Hwyl.')] })
    expect(lines.map((l) => boothHome.trackKeyOf(l))).toEqual(['podknown.pod-1', 'podknown.pod-1'])
    const tracks = boothHome.buildHomeTracks(lines.map((l) => ({ ...l, recorded: false })))
    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({ key: 'podknown.pod-1', kind: 'podknown', total: 2, batches: [{ n: 1, total: 2 }] })
  })

  it('counts as recorded when he has said the words anywhere, or his take fills any copy; synthetic North does not count', () => {
    const [line] = pe.podEnglishLinesFor(ARAN, { podIds: [N, S], pods: PODS,
      sentences: [s(N, 1, 'Good morning, Sarah!', 'Bore da!', 'tts-1'), s(S, 1, 'Good morning, Sarah!', 'Bore da!')],
      slotVoiceById: new Map([['tts-1', 'xai_bedd6226']]), podCastByCourse: CAST })
    const spellings = ARAN.spellings
    expect(isLineRecorded(line, { recordedKeys: new Set(), spellings })).toBe(false)
    expect(isLineRecorded(line, { recordedKeys: new Set(['good morning, sarah!', 'good morning sarah']), spellings })).toBe(true)
    expect(isLineRecorded({ ...line, filledBy: ['xai_bedd6226', 'human_aran_eng'] }, { recordedKeys: new Set(), spellings })).toBe(true)
  })

  it('parses its own line ids (sentence ids carry colons) and nothing else', () => {
    expect(pe.parsePodEnglishLineId(`podeng:${N}:SC01-S001`)).toEqual({ sentenceId: `${N}:SC01-S001` })
    expect(pe.parsePodEnglishLineId(`${N}:SC01-S001`)).toBeNull()
    expect(pe.parsePodEnglishLineId('podeng:')).toBeNull()
  })

  it('resolves a take only on a pod this reader is cast on', () => {
    const row = { id: `${S}:SC09-S001`, pod_id: S, known_text: ' Good morning, Sarah! ' }
    expect(pe.resolvePodEnglish({ ...row, speaker: 'Neighbour' }, ARAN, POLICY, CAST)).toEqual({ courseCode: 'cym_s_for_eng', sentenceId: row.id, text: 'Good morning, Sarah!' })
    expect(pe.resolvePodEnglish({ ...row, pod_id: 'cym_s_for_eng:health' }, ARAN, POLICY)).toBeNull()
    expect(pe.resolvePodEnglish(row, { voiceId: 'x', spellings: ['x'] }, POLICY)).toBeNull()
  })
})
