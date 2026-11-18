// tools/audio/aran-clone-english-fill.cjs — which slots the clone fill asks for, and what it links (job #557).
//   npx vitest run tools/audio/aran-clone-english-fill.test.cjs
import { describe, it, expect } from 'vitest'
import fill from './aran-clone-english-fill.cjs'
const { planEntries, takeSlots, linkRequests, pendingEntries } = fill

const N = 'cym_nv2_for_eng', S = 'cym_sv2_for_eng'
const seedRows = new Map([
  ['n1', { course_code: N, seed_number: 1, known_text: 'I want to speak', known_audio_id: null }],
  ['s1', { course_code: S, seed_number: 1, known_text: 'I want to speak', known_audio_id: null }],
  ['n2', { course_code: N, seed_number: 2, known_text: 'Thank you', known_audio_id: 'aran_take' }],
  ['live', { course_code: 'cym_n_for_eng', seed_number: 1, known_text: 'I want to speak', known_audio_id: null }],
  ['n3', { course_code: N, seed_number: 3, known_text: 'Good night', known_audio_id: null }],
])
const seedLines = [
  { kind: 'seed', role: 'known', seedId: 'n1', duplicateOf: [{ seedId: 's1' }, { seedId: 'live' }] },
  { kind: 'seed', role: 'known', seedId: 'n2', duplicateOf: [] },
  { kind: 'seed', role: 'known', seedId: 'n3', duplicateOf: [] },
  { kind: 'seed', role: 'target1', seedId: 'n1', duplicateOf: [] },
]
const phraseLines = [
  { role: 'known', pass: 2, batch: 1, readingOrder: 0, text: 'as often', copies: [{ phraseId: `${N}:P2`, courseCode: N, text: 'as often', holder: null }] },
  { role: 'known', pass: 1, batch: 3, readingOrder: 5, text: 'as often now', copies: [
    { phraseId: `${N}:P1`, courseCode: N, text: 'as often now', holder: null },
    { phraseId: `${S}:P1`, courseCode: S, text: 'as often now', holder: null },
    { phraseId: `${N}:P1b`, courseCode: N, text: 'as often now', holder: 'human_aran_eng' },
    { phraseId: `${N}:P1c`, courseCode: N, text: 'as often now', holder: null, standIn: 'clone_x' },
  ] },
  { role: 'known', pass: 1, batch: 1, readingOrder: 0, text: 'tonight', copies: [{ phraseId: `${N}:P3`, courseCode: N, text: 'tonight', holder: null }] },
]

describe('planEntries: the empty English known slots of nv2/sv2 the booth serves, minus any he has a take of', () => {
  const hasTake = takeSlots({ byCourse: { [N]: [{ op: { target: 'seed', seed_number: 3 } }, { op: { target: 'phrase', phrase_id: `${N}:P3` } }] } })
  const { entries, skipped } = planEntries({ seedLines, seedRows, phraseLines, hasTake })
  const keys = entries.map((e) => `${e.courseCode}|${e.text}|${e.slots.map((s) => s.seedNumber ?? s.phraseId).join(',')}`)
  it('one entry per (course, words); seeds first, then pass 1 by batch, then pass 2', () => {
    expect(keys).toEqual([
      `${N}|I want to speak|1`, `${S}|I want to speak|1`,
      `${N}|as often now|${N}:P1`, `${S}|as often now|${S}:P1`,
      `${N}|as often|${N}:P2`,
    ])
  })
  it('never the live course, a filled slot, a stand-in already there, a slot he has a take of, or a Welsh role', () => {
    expect(keys.join(' ')).not.toMatch(/cym_n_for_eng|Thank you|P1b|P1c|Good night|tonight/)
    expect(skipped).toMatchObject({ otherCourse: 1, hasTake: 2 })
    expect(skipped.notEmpty).toBe(3) // n2 (his take), P1b (his take), P1c (the clone already)
  })
  it('characters are the text length of each entry', () => {
    expect(entries.reduce((n, e) => n + e.chars, 0)).toBe('I want to speak'.length * 2 + 'as often now'.length * 2 + 'as often'.length)
  })
})

describe('render log → what is still owed, and what links', () => {
  const entries = [
    { courseCode: N, text: 'a', chars: 1, slots: [{ target: 'seed', seedNumber: 1 }, { target: 'phrase', phraseId: `${N}:P9` }] },
    { courseCode: S, text: 'a', chars: 1, slots: [{ target: 'phrase', phraseId: `${S}:P9` }] },
    { courseCode: N, text: 'b', chars: 1, slots: [{ target: 'phrase', phraseId: `${N}:P8` }] },
  ]
  const renders = [
    { courseCode: N, text: 'a', status: 200, body: { audioId: 'clipA', source: 'rendered' } },
    { courseCode: S, text: 'a', status: 200, dry: true, body: { source: 'would-render' } },
    { courseCode: N, text: 'b', status: 402, body: { code: 'DAILY_TOTAL_CAP' } },
  ]
  it('a refusal or a dry run is still owed; a 2xx real answer is done', () => {
    expect(pendingEntries(entries, renders).map((e) => `${e.courseCode}|${e.text}`)).toEqual([`${S}|a`, `${N}|b`])
  })
  it('links only the clips the log holds, per course, role known, every slot of the entry', () => {
    expect(linkRequests(entries, renders)).toEqual([{ courseCode: N, links: [
      { seedNumber: 1, role: 'known', audioId: 'clipA' }, { phraseId: `${N}:P9`, role: 'known', audioId: 'clipA' },
    ] }])
  })
  it('at most 500 links a request', () => {
    const many = [{ courseCode: N, text: 'a', chars: 1, slots: Array.from({ length: 1201 }, (_, i) => ({ target: 'phrase', phraseId: `p${i}` })) }]
    expect(linkRequests(many, renders).map((r) => r.links.length)).toEqual([500, 500, 201])
  })
})
