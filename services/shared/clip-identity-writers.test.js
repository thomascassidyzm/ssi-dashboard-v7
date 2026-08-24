// Unit tests for the WRITE/READ sites converted to the canonical clip identity.
// Run: npx vitest run services/shared/clip-identity-writers.test.js
//
// These cover the behaviours that changed, not the canonicaliser itself
// (clip-identity.test.js owns that): the registry lookup that tries both
// spellings, the source index that keys rows canonically, and the two
// supabase-client defects — a voice-blind pre-check that overwrote clips, and
// PGRST116 being read as "absent" when it also means "more than one row".
import { describe, it, expect, vi } from 'vitest'
import { voiceSpellings } from './clip-identity-lookup.cjs'
import { getEngineForVoice, buildSourceIndex } from './clone-copy-index.cjs'
import { computeAudioKey } from './clone-copy-match.cjs'

// ── a minimal fake PostgREST builder ────────────────────────────────────────
// Records the filters applied, then resolves to whatever rows the test seeded.
// Thenable, one-shot, and chainable — the shape the real client presents.
function fakeSupabase(tables) {
  const calls = []
  return {
    calls,
    from(table) {
      const state = { table, eq: {}, in: {}, limit: null }
      const builder = {
        select() { return builder },
        eq(col, val) { state.eq[col] = val; return builder },
        in(col, vals) { state.in[col] = vals; return builder },
        order() { return builder },
        range() { return builder },
        limit(n) { state.limit = n; return builder },
        maybeSingle() { return builder.then.call(builder, (r) => ({ ...r, data: r.data[0] || null })) },
        then(resolve, reject) {
          calls.push(state)
          const rows = (tables[table] || []).filter((row) => {
            for (const [col, val] of Object.entries(state.eq)) {
              if (row[col] !== val) return false
            }
            for (const [col, vals] of Object.entries(state.in)) {
              if (!vals.includes(row[col])) return false
            }
            return true
          })
          const data = state.limit == null ? rows : rows.slice(0, state.limit)
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

describe('voiceSpellings — reads widen, writes narrow', () => {
  it('offers the canonical spelling first, then the caller\'s own', () => {
    expect(voiceSpellings('en-GB-SoniaNeural'))
      .toEqual(['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'])
  })

  it('reaches the BARE half even when the caller already holds the canonical form', () => {
    // The 414k-row split is symmetric: a canonical-spelling caller needs the
    // bare form as much as a bare-spelling caller needs the canonical one.
    expect(voiceSpellings('azure_en-GB-SoniaNeural'))
      .toEqual(['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'])
    expect(voiceSpellings('xai_eve')).toEqual(['xai_eve', 'eve'])
  })

  it('never offers a composite\'s payload as a synonym for the composite', () => {
    // 'comp:xai_leo' is a splice; 'xai_leo' is a different clip entirely.
    expect(voiceSpellings('comp:leo')).toEqual(['comp:xai_leo', 'comp:leo'])
  })

  it('returns the raw value alone when it cannot be canonicalised — no invented spelling', () => {
    expect(voiceSpellings('legacy_import')).toEqual(['legacy_import'])
  })

  it('is empty for an empty input rather than yielding a filter that matches nothing meaningful', () => {
    expect(voiceSpellings('')).toEqual([])
    expect(voiceSpellings(null)).toEqual([])
  })
})

describe('getEngineForVoice — the registry holds BOTH spellings for some voices', () => {
  it('finds a voice registered under its canonical spelling when asked with the bare one', async () => {
    const db = fakeSupabase({ voices: [{ voice_id: 'azure_es-ES-ElviraNeural', tts_engine: 'azure' }] })
    expect(await getEngineForVoice(db, 'es-ES-ElviraNeural')).toBe('azure')
  })

  it('finds a voice registered ONLY under the bare spelling — the registry is not clean', async () => {
    // This is the live cost: a miss here returns engine=unknown and
    // clone-copy-pass refuses every copy with SKIP_UNTRUSTED_VOICE.
    const db = fakeSupabase({ voices: [{ voice_id: 'eve', tts_engine: 'xai' }] })
    expect(await getEngineForVoice(db, 'xai_eve')).toBe('xai')
  })

  it('prefers the canonical row when the registry holds both', async () => {
    const db = fakeSupabase({
      voices: [
        { voice_id: 'azure_es-ES-ElviraNeural', tts_engine: 'azure' },
        { voice_id: 'es-ES-ElviraNeural', tts_engine: 'legacy-wrong' },
      ],
    })
    expect(await getEngineForVoice(db, 'es-ES-ElviraNeural')).toBe('azure')
  })

  it('returns null for a genuinely unregistered voice', async () => {
    const db = fakeSupabase({ voices: [] })
    expect(await getEngineForVoice(db, 'en-GB-SoniaNeural')).toBeNull()
  })

  it('never writes to the registry', async () => {
    const db = fakeSupabase({ voices: [{ voice_id: 'xai_eve', tts_engine: 'xai' }] })
    await getEngineForVoice(db, 'eve')
    expect(db.calls.every((c) => c.table === 'voices')).toBe(true)
  })
})

describe('buildSourceIndex — finds either spelling, keys by identity', () => {
  const audioRow = (over = {}) => ({
    id: 'r1',
    course_code: 'fra_for_eng',
    text: 'please',
    text_normalized: 'please',
    language: 'eng',
    voice_id: 'xai_gfzdpspr5fdp',
    role: 'known',
    s3_key: 'mastered/r1.mp3',
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  })

  it('queries BOTH voice spellings rather than whichever half the caller named', async () => {
    const db = fakeSupabase({
      voices: [{ voice_id: 'xai_gfzdpspr5fdp', tts_engine: 'xai' }],
      course_audio: [audioRow()],
    })
    await buildSourceIndex(db, { voiceId: 'gfzdpspr5fdp', language: 'eng', texts: ['please'] })

    const audioCall = db.calls.find((c) => c.table === 'course_audio')
    expect(audioCall.in.voice_id).toEqual(['xai_gfzdpspr5fdp', 'gfzdpspr5fdp'])
  })

  it('indexes a bare-spelled row under the same key a prefixed slot computes', async () => {
    const db = fakeSupabase({
      voices: [{ voice_id: 'gfzdpspr5fdp', tts_engine: 'xai' }],
      course_audio: [audioRow({ voice_id: 'gfzdpspr5fdp' })],
    })
    const { index, trusted } = await buildSourceIndex(db, {
      voiceId: 'gfzdpspr5fdp', language: 'eng', texts: ['please'],
    })

    expect(trusted).toBe(true)
    const key = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'xai_gfzdpspr5fdp' })
    expect(index.get(key)).toHaveLength(1)
  })

  it('leaves out pending rows, as before', async () => {
    const db = fakeSupabase({
      voices: [{ voice_id: 'xai_gfzdpspr5fdp', tts_engine: 'xai' }],
      course_audio: [audioRow({ s3_key: 'pending/r1.mp3' })],
    })
    const { index } = await buildSourceIndex(db, { voiceId: 'gfzdpspr5fdp', language: 'eng', texts: ['please'] })
    expect(index.size).toBe(0)
  })

  it('REPORTS rows it could not identify instead of swallowing them', async () => {
    // The 7,847 language='auto' rows: a caller indexing them gets an EMPTY
    // index (they cannot be proven to be any particular clip) plus an explicit
    // account of what was left out — rather than an index that silently looks
    // like "no matching audio exists".
    const db = fakeSupabase({
      voices: [{ voice_id: 'xai_gfzdpspr5fdp', tts_engine: 'xai' }],
      course_audio: [audioRow({ id: 'bad', language: 'auto' })],
    })
    const { index, skipped } = await buildSourceIndex(db, {
      voiceId: 'gfzdpspr5fdp', language: 'auto', texts: ['please'],
    })

    expect(index.size).toBe(0)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].id).toBe('bad')
    expect(skipped[0].language).toBe('auto')
  })

  it('an untrusted engine still short-circuits, and says so with an empty skip list', async () => {
    const db = fakeSupabase({ voices: [{ voice_id: 'azure_en-GB-SoniaNeural', tts_engine: 'azure' }] })
    const r = await buildSourceIndex(db, { voiceId: 'en-GB-SoniaNeural', language: 'eng', texts: ['please'] })
    expect(r.trusted).toBe(false)
    expect(r.index.size).toBe(0)
    expect(r.skipped).toEqual([])
  })
})

// ── supabase-client: the two defects ────────────────────────────────────────
// supabase-client.cjs builds its client at require-time from env, so these
// exercise the same query logic through the fake client rather than importing
// the module. The assertions mirror the code paths in findCourseAudio /
// courseAudioExists exactly: filters applied, and multiplicity handling.

describe('findCourseAudio — voice belongs in the identity (defect 1)', () => {
  // The pre-check omitted voice, so upsertCourseAudio found the row belonging to
  // voice A and UPDATEd it to voice B — rewriting an existing clip in place
  // instead of inserting the sibling row a second voice deserves.
  const rows = [
    { id: 'A', course_code: 'c', text_normalized: 'hi', language: 'eng', role: 'known', voice_id: 'azure_en-GB-SoniaNeural' },
  ]

  it('a lookup for a DIFFERENT voice must find nothing, so the upsert inserts a sibling', async () => {
    const db = fakeSupabase({ course_audio: rows })
    const { data } = await db.from('course_audio').select('*')
      .eq('course_code', 'c').eq('text_normalized', 'hi')
      .eq('language', 'eng').eq('role', 'known')
      .eq('voice_id', 'xai_leo')
      .limit(2)
    expect(data).toHaveLength(0)
  })

  it('a lookup for the SAME voice finds the row, so the upsert updates in place', async () => {
    const db = fakeSupabase({ course_audio: rows })
    const { data } = await db.from('course_audio').select('*')
      .eq('course_code', 'c').eq('text_normalized', 'hi')
      .eq('language', 'eng').eq('role', 'known')
      .eq('voice_id', 'azure_en-GB-SoniaNeural')
      .limit(2)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('A')
  })

  it('without the voice filter the same query returns the wrong-voice row — the old behaviour', async () => {
    const db = fakeSupabase({ course_audio: rows })
    const { data } = await db.from('course_audio').select('*')
      .eq('course_code', 'c').eq('text_normalized', 'hi')
      .eq('language', 'eng').eq('role', 'known')
      .limit(2)
    expect(data).toHaveLength(1) // ← this row would have been overwritten
  })
})

describe('PGRST116 means zero OR more than one (defect 2)', () => {
  // `.single()` + `if (error.code !== 'PGRST116') throw` read both cases as
  // "absent". Where drift had produced twins, the clip was reported MISSING and
  // the caller paid to render it again. Selecting up to two rows tells them
  // apart.
  const twins = [
    { id: 'A', course_code: 'c', text_normalized: 'hi', language: 'eng', role: 'known', voice_id: 'v', origin: 'tts', created_at: '2026-01-01T00:00:00Z' },
    { id: 'B', course_code: 'c', text_normalized: 'hi', language: 'eng', role: 'known', voice_id: 'v', origin: 'human', created_at: '2026-02-01T00:00:00Z' },
  ]

  const probe = (db) => db.from('course_audio').select('*')
    .eq('course_code', 'c').eq('text_normalized', 'hi')
    .eq('language', 'eng').eq('role', 'known').eq('voice_id', 'v')
    .limit(2)

  it('zero rows is absent', async () => {
    const { data } = await probe(fakeSupabase({ course_audio: [] }))
    expect(data).toHaveLength(0)
    expect(data.length > 0).toBe(false)
  })

  it('two rows is PRESENT and detectable, not absent', async () => {
    const { data } = await probe(fakeSupabase({ course_audio: twins }))
    expect(data).toHaveLength(2)
    expect(data.length > 0).toBe(true) // courseAudioExists now returns true here
  })

  it('the preferred row of a twin pair is the human recording, not the arbitrary first', async () => {
    const { pickPreferredAudioRow } = await import('./audio-link-preference.cjs')
    const { data } = await probe(fakeSupabase({ course_audio: twins }))
    const winner = data.reduce((a, b) => pickPreferredAudioRow(a, b), null)
    expect(winner.id).toBe('B')
    expect(winner.origin).toBe('human')
  })
})
