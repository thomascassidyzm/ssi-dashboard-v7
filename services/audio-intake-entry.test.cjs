/**
 * THE IN-TRAY (job #703): a human recording enters the library as a NAMED voice,
 * through the chain, and a wrong name is refused before anything is stored.
 * No network, no DB, no audio: every outside step is a counting stub.
 * Run: npx vitest run services/audio-intake-entry.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { addRecording, IntakeError } = require('./shared/audio-intake-entry.cjs')

const ARAN = { voice_id: 'human_aran_cym_n', human_name: 'Aran', gender: 'm', clip_language: 'cym_n', dialect: 'north' }
const CERYS = { voice_id: 'human_cerys_matthews_cym_s', human_name: 'Cerys Matthews', gender: null, clip_language: 'cym_s', dialect: 'south' }
const COURSE = { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng' }

function deps(over = {}) {
  const calls = { store: [], index: [], register: [] }
  const artists = [ARAN, CERYS]
  return {
    calls,
    findArtist: async q => artists.filter(a => a.voice_id === q || a.human_name.toLowerCase() === q.toLowerCase()),
    registerArtist: async r => { calls.register.push(r); return { voice_id: `human_x_${r.clip_language}`, human_name: r.name, gender: r.gender || null, clip_language: r.clip_language, dialect: r.dialect || null } },
    homeCourse: async () => COURSE,
    libraryHas: async () => null,
    store: async x => { calls.store.push(x); return { audioId: 'A1', s3Key: 'mastered/A1.mp3', durationMs: 900, filing: { filed: true } } },
    index: async id => { calls.index.push(id); return 1 },
    ...over,
  }
}
const base = { artist: 'Aran', text: 'dw i isio siarad', audio: 'AAAA', purpose: 'test', requestedBy: 'vitest' }

describe('add a recording', () => {
  it('files the take under the artist\'s own voice and indexes it', async () => {
    const d = deps()
    const out = await addRecording(base, d)
    expect(out).toMatchObject({ ok: true, source: 'recorded', voiceId: 'human_aran_cym_n', artist: 'Aran', language: 'cym_n', charsSpent: 0 })
    expect(d.calls.store).toHaveLength(1)
    expect(d.calls.store[0]).toMatchObject({ voiceId: 'human_aran_cym_n', role: 'target1', courseCode: 'cym_n_for_eng' })
    expect(d.calls.index).toEqual(['A1'])
  })

  it('is idempotent: words already in the library in that voice are not stored twice', async () => {
    const d = deps({ libraryHas: async () => ({ audioId: 'OLD' }) })
    const out = await addRecording(base, d)
    expect(out).toMatchObject({ ok: true, source: 'library', audioId: 'OLD', filed: false })
    expect(d.calls.store).toHaveLength(0)
  })

  it('--replace stores a new take even when the library has one', async () => {
    const d = deps({ libraryHas: async () => ({ audioId: 'OLD' }) })
    expect((await addRecording({ ...base, replace: true }, d)).source).toBe('recorded')
  })

  it('refuses a gender that disagrees with the registry, before storing', async () => {
    const d = deps()
    await expect(addRecording({ ...base, gender: 'f' }, d)).rejects.toMatchObject({ code: 'GENDER_MISMATCH', status: 409 })
    expect(d.calls.store).toHaveLength(0)
  })

  it('refuses a Southern recording into a Northern artist: a dialect is a different language', async () => {
    const d = deps()
    await expect(addRecording({ ...base, language: 'cym_s' }, d)).rejects.toMatchObject({ code: 'LANGUAGE_MISMATCH' })
    await expect(addRecording({ ...base, language: 'cym' }, d)).resolves.toMatchObject({ ok: true })
    expect(d.calls.store).toHaveLength(1)
  })

  it('refuses an artist nobody has registered, and says how to add one', async () => {
    const d = deps()
    await expect(addRecording({ ...base, artist: 'Nobody' }, d)).rejects.toMatchObject({ code: 'UNKNOWN_ARTIST', status: 404 })
    expect(d.calls.store).toHaveLength(0)
  })

  it('registers a new artist from a register block; gender is never inferred', async () => {
    const d = deps()
    const { artist, ...rest } = base
    const out = await addRecording({ ...rest, register: { name: 'Someone New', clip_language: 'cym_s', dialect: 'south' } }, d)
    expect(out.voiceId).toBe('human_x_cym_s')
    expect(d.calls.register[0].gender).toBeUndefined()
    await expect(addRecording({ ...rest, register: { name: 'X', clip_language: 'cym_s', gender: 'other' } }, d)).rejects.toBeInstanceOf(IntakeError)
  })

  it('says who is asking and why, or does not run', async () => {
    const d = deps()
    await expect(addRecording({ ...base, requestedBy: '' }, d)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(addRecording({ ...base, purpose: undefined }, d)).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(d.calls.store).toHaveLength(0)
  })

  it('a take that was saved but not filed is a loud failure, never a silent success', async () => {
    const d = deps({ store: async () => ({ audioId: null, filing: { filed: false, message: 'no course' } }) })
    await expect(addRecording(base, d)).rejects.toMatchObject({ code: 'NOT_FILED' })
    expect(d.calls.index).toHaveLength(0)
  })
})
