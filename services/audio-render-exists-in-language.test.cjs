/**
 * RECORDINGS ARE PER LANGUAGE (job #352; Tom 2026-09-13 and 2026-11-02): the render route never pays for a second
 * performance of words already recorded in their language — another voice, another course, either side. It refuses
 * with 409 EXISTS_IN_LANGUAGE naming the clips (dry run too), and the route's existing re-record authority (Tom's
 * permission row, Kai's token) is the one way past. No network, no DB.
 * Run: npx vitest run services/audio-render-exists-in-language.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { renderClip } = require('./shared/audio-render-entry.cjs')
const { existingClipsInLanguage, memoryClipLibrary, indexedMemoryClipLibrary } = require('./shared/clip-library.cjs')

// The line exists only as ANOTHER course's KNOWN-side clip, in ANOTHER voice.
const ROWS = [
  { id: 'c-known', course_code: 'eng_for_jpn', role: 'known', language: 'jpn', voice_id: 'cartesia_hana', text: 'おはようございます', text_normalized: 'おはようございます', s3_key: 'mastered/c-known.mp3', origin: 'tts' },
  { id: 'c-pending', course_code: 'eng_for_kor', role: 'known', language: 'jpn', voice_id: 'cartesia_yui', text: 'おはようございます', text_normalized: 'おはようございます', s3_key: 'pending/x.mp3' },
]

function harness({ rows = ROWS, grant = null } = {}) {
  const calls = { speak: 0, store: 0 }
  const lib = memoryClipLibrary(rows)
  const deps = {
    resolve: async () => ({ language: 'jpn', voiceId: 'cartesia_kenji', provider: 'cartesia', providerConfig: {} }),
    link: async () => null,
    clipsInLanguage: (want) => existingClipsInLanguage(want, lib),
    rerecordGranted: async (want) => (grant ? grant(want) : null),
    speak: async () => { calls.speak++; return { audioBuffer: Buffer.from('x'), existingClip: null, charsSpent: 9, wouldSpendChars: 9 } },
    store: async () => { calls.store++; return { audioId: 'new', s3Key: 'mastered/new.mp3' } },
  }
  return { deps, calls }
}
const ask = (over = {}) => ({ courseCode: 'jpn_for_eng', role: 'target1', text: 'おはようございます', purpose: 'test', requestedBy: 'test', ...over })

describe('the render route refuses a line already recorded in its language', () => {
  it('another course\'s known-side clip in another voice → 409 EXISTS_IN_LANGUAGE naming it, provider never called', async () => {
    const { deps, calls } = harness()
    const err = await renderClip(ask(), deps).catch(e => e)
    expect(err.code).toBe('EXISTS_IN_LANGUAGE')
    expect(err.status).toBe(409)
    expect(err.existing).toEqual([{ audioId: 'c-known', voiceId: 'cartesia_hana', courseCode: 'eng_for_jpn', side: 'known' }])
    expect(err.message).toMatch(/c-known/)
    expect(calls.speak).toBe(0)
  })
  it('a dry run reports the same refusal', async () => {
    const { deps, calls } = harness()
    const err = await renderClip(ask({ dryRun: true }), deps).catch(e => e)
    expect(err.code).toBe('EXISTS_IN_LANGUAGE')
    expect(calls.speak).toBe(0)
  })
  it('the pod-joined " … " form of a multi-sentence turn is the same recording', async () => {
    const rows = [{ ...ROWS[0], id: 'c-pod', text: 'はい。 … そうです。', text_normalized: 'はい。 … そうです。' }]
    const { deps } = harness({ rows })
    const err = await renderClip(ask({ text: 'はい。そうです。' }), deps).catch(e => e)
    expect(err.code).toBe('EXISTS_IN_LANGUAGE')
  })
  it('an approved re-record (Kai\'s token / Tom\'s row, via the existing authority) still renders', async () => {
    const { deps, calls } = harness({ grant: (w) => (w.approval ? { by: 'kai', why: w.approval } : null) })
    const out = await renderClip(ask({ approval: 'kai:2026-11-02:scene 21 re-record' }), deps)
    expect(out.source).toBe('rendered')
    expect(calls.speak).toBe(1)
  })
  it('genuinely new words still render', async () => {
    const { deps, calls } = harness()
    const out = await renderClip(ask({ text: 'こんばんは' }), deps)
    expect(out.source).toBe('rendered')
    expect(calls.speak).toBe(1)
  })
  it('a pending/ placeholder is not a recording', async () => {
    const { deps, calls } = harness({ rows: [ROWS[1]] })
    await renderClip(ask(), deps)
    expect(calls.speak).toBe(1)
  })
  it('this course\'s own other seat (two-voice target1/target2) is not a prior recording of this seat', async () => {
    const rows = [{ ...ROWS[0], id: 'c-t2', course_code: 'jpn_for_eng', role: 'target2', voice_id: 'cartesia_yui' }]
    const { deps, calls } = harness({ rows })
    await renderClip(ask(), deps)
    expect(calls.speak).toBe(1)
  })
})

describe('existingClipsInLanguage', () => {
  it('finds every voice through the clip index path, across courses and sides, language spellings merged', async () => {
    const lib = indexedMemoryClipLibrary({ rows: [
      { ...ROWS[0] },
      { ...ROWS[0], id: 'c-ja', language: 'ja', voice_id: 'azure_ja-JP-NanamiNeural', course_code: 'jpn_for_eng', role: 'target2' },
      { ...ROWS[0], id: 'c-eng', language: 'eng', text: 'good morning', text_normalized: 'good morning' },
    ] })
    const found = await existingClipsInLanguage({ language: 'jpn', text: 'おはようございます' }, lib)
    expect(found.map(c => c.id).sort()).toEqual(['c-ja', 'c-known'])
  })
  it('Basque baq/eu/eus are one language', async () => {
    const lib = memoryClipLibrary([{ id: 'b1', language: 'eu', voice_id: 'v', text: 'kaixo', text_normalized: 'kaixo', s3_key: 'mastered/b1.mp3' }])
    expect((await existingClipsInLanguage({ language: 'baq', text: 'kaixo' }, lib)).map(c => c.id)).toEqual(['b1'])
  })
})
