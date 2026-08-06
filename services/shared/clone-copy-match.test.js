// Unit tests for the clone-once-copy-everywhere matching precondition.
// Run: npx vitest run services/shared/clone-copy-match.test.js
import { describe, it, expect } from 'vitest'
import { computeAudioKey, decideCopy, isTrusted1xEngine, CLONE_VOICE_ID } from './clone-copy-match.cjs'

const row = (courseCode, overrides = {}) => ({
  courseCode,
  s3Key: `mastered/${courseCode}.mp3`,
  text: 'please',
  role: 'known',
  id: courseCode,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

function indexOf(rows) {
  const index = new Map()
  for (const r of rows) {
    const key = computeAudioKey({ text: r.text, language: 'eng', voiceId: CLONE_VOICE_ID })
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(r)
  }
  return index
}

describe('computeAudioKey', () => {
  it('is exact-text + language + voice_id (case/whitespace/trailing punctuation normalized)', () => {
    const a = computeAudioKey({ text: 'Please.', language: 'eng', voiceId: CLONE_VOICE_ID })
    const b = computeAudioKey({ text: '  please  ', language: 'eng', voiceId: CLONE_VOICE_ID })
    expect(a).toBe(b)
  })

  it('different text produces a different key (ZUT-safe: no fuzzy matching)', () => {
    const a = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID })
    const b = computeAudioKey({ text: 'please now', language: 'eng', voiceId: CLONE_VOICE_ID })
    expect(a).not.toBe(b)
  })

  it('role is NOT part of the key: known-role and target1-role of the same text+voice are the same clip', () => {
    const known = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, role: 'known' })
    const target1 = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, role: 'target1' })
    expect(known).toBe(target1)
  })

  it('different voice_id produces a different key even for identical text', () => {
    const clone = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID })
    const azure = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural' })
    expect(clone).not.toBe(azure)
  })

  it('speed is NOT part of the key (all audio is 1x; the player renders pace live)', () => {
    // computeAudioKey doesn't even accept a speed param — passing one is a no-op.
    const a = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, speed: 0.8 })
    const b = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    expect(a).toBe(b)
  })
})

describe('isTrusted1xEngine', () => {
  it('trusts xai and elevenlabs (verified speed-invariant at render)', () => {
    expect(isTrusted1xEngine('xai')).toBe(true)
    expect(isTrusted1xEngine('elevenlabs')).toBe(true)
  })

  it('does not trust azure (bakes prosody rate into the render) or unknown engines', () => {
    expect(isTrusted1xEngine('azure')).toBe(false)
    expect(isTrusted1xEngine(null)).toBe(false)
    expect(isTrusted1xEngine(undefined)).toBe(false)
  })
})

describe('decideCopy — the matching precondition end to end', () => {
  it('exact match in another course, different role: COPY (role is irrelevant to matching)', () => {
    const index = indexOf([row('fra_for_eng', { role: 'known' })])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'eng_for_spa', role: 'target1' }, index)
    expect(decision.action).toBe('COPY')
    expect(decision.source.courseCode).toBe('fra_for_eng')
  })

  it('voice_id mismatch: must NOT copy', () => {
    const index = indexOf([row('fra_for_eng')])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural', courseCode: 'spa_for_eng', role: 'known' }, index)
    expect(decision.action).toBe('SKIP_NO_SOURCE')
  })

  it('a configured "speed" difference never blocks the copy (speed is not identity)', () => {
    const index = indexOf([row('fra_for_eng', { speed: 0.75 })])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'spa_for_eng', role: 'known', speed: 1.5 }, index)
    expect(decision.action).toBe('COPY')
  })

  it('different course, same text: produces a candidate for a NEW logical row (source object is only ever referenced, never overwritten)', () => {
    const index = indexOf([row('fra_for_eng', { s3Key: 'mastered/ORIGINAL-UUID.mp3' })])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'eng_for_ita', role: 'target2' }, index)
    expect(decision.action).toBe('COPY')
    // The tool inserts a new course_audio row pointing at the SAME s3Key
    // (shared physical storage) — it must never mint a new object here.
    expect(decision.source.s3Key).toBe('mastered/ORIGINAL-UUID.mp3')
    expect(decision.source.courseCode).not.toBe('eng_for_ita')
  })

  it('a match already owned by the destination course itself: SKIP_ALREADY_OWNED, not COPY (idempotent — no duplicate row)', () => {
    const index = indexOf([row('spa_for_eng', { role: 'known' }), row('fra_for_eng', { role: 'known' })])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'spa_for_eng', role: 'known' }, index)
    expect(decision.action).toBe('SKIP_ALREADY_OWNED')
  })

  it('no source anywhere: SKIP_NO_SOURCE', () => {
    const index = indexOf([])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'spa_for_eng', role: 'known' }, index)
    expect(decision.action).toBe('SKIP_NO_SOURCE')
  })

  it('deterministic pick across multiple source courses: newest created_at wins', () => {
    const index = indexOf([
      row('fra_for_eng', { createdAt: '2026-01-01T00:00:00Z' }),
      row('eng_for_ita', { role: 'target1', createdAt: '2026-06-01T00:00:00Z' }),
    ])
    const decision = decideCopy({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID, courseCode: 'spa_for_eng', role: 'known' }, index)
    expect(decision.source.courseCode).toBe('eng_for_ita')
  })
})

// ── canonical identity ──────────────────────────────────────────────────────
// The key IS the dedup mechanism: two clips match iff their keys are
// byte-identical. Interpolating the raw language/voice made the key inherit the
// estate's spelling drift, so the same clip under two spellings produced two
// keys, missed the match, and got rendered (and paid for) twice.
describe('computeAudioKey — canonical identity, not raw strings', () => {
  it('collapses the language spellings of one language', () => {
    const eng = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID })
    expect(computeAudioKey({ text: 'please', language: 'en', voiceId: CLONE_VOICE_ID })).toBe(eng)
    expect(computeAudioKey({ text: 'please', language: 'en-GB', voiceId: CLONE_VOICE_ID })).toBe(eng)
    expect(computeAudioKey({ text: 'please', language: 'EN-US', voiceId: CLONE_VOICE_ID })).toBe(eng)
  })

  it('drops region — the voice carries the accent, so fr-CA and fra are one language', () => {
    const fra = computeAudioKey({ text: 'bonjour', language: 'fra', voiceId: CLONE_VOICE_ID })
    expect(computeAudioKey({ text: 'bonjour', language: 'fr-CA', voiceId: CLONE_VOICE_ID })).toBe(fra)
  })

  it('collapses the bare and prefixed spellings of one voice', () => {
    const bare = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'en-GB-SoniaNeural' })
    const prefixed = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural' })
    expect(bare).toBe(prefixed)
  })

  it('collapses the clone voice written bare and written xai_-prefixed', () => {
    expect(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'gfzdpspr5fdp' }))
      .toBe(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'xai_gfzdpspr5fdp' }))
  })

  it('still separates two genuinely different voices', () => {
    const clone = computeAudioKey({ text: 'please', language: 'eng', voiceId: CLONE_VOICE_ID })
    const azure = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural' })
    expect(clone).not.toBe(azure)
  })

  it('a composite splice never collapses onto a plain single-voice render', () => {
    expect(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'comp:leo' }))
      .not.toBe(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'leo' }))
  })

  it('uses the caller-supplied provider for an opaque voice id with no prefix', () => {
    expect(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'bedd6226', provider: 'xai' }))
      .toBe(computeAudioKey({ text: 'please', language: 'eng', voiceId: 'xai_bedd6226' }))
  })

  it('THROWS rather than keying on a value it would have to guess at', () => {
    expect(() => computeAudioKey({ text: 'please', language: 'auto', voiceId: CLONE_VOICE_ID })).toThrow()
    expect(() => computeAudioKey({ text: 'please', language: 'eng', voiceId: 'legacy_import' })).toThrow()
  })
})

describe('decideCopy — an unidentifiable slot is reported, never guessed', () => {
  it('reports SKIP_UNIDENTIFIABLE instead of throwing into the caller', () => {
    const index = indexOf([row('fra_for_eng')])
    const decision = decideCopy(
      { text: 'please', language: 'auto', voiceId: CLONE_VOICE_ID, courseCode: 'spa_for_eng', role: 'known' },
      index
    )
    expect(decision.action).toBe('SKIP_UNIDENTIFIABLE')
    expect(decision.source).toBeNull()
    expect(decision.reason).toMatch(/cannot be canonicalised/)
  })

  it('a slot spelled differently from the source row now MATCHES it', () => {
    // The whole point: 'en-GB' + bare voice must find the row indexed under
    // 'eng' + the prefixed voice. Before canonicalisation this was SKIP_NO_SOURCE
    // and the clip was re-rendered.
    const index = new Map()
    const key = computeAudioKey({ text: 'please', language: 'eng', voiceId: 'azure_en-GB-SoniaNeural' })
    index.set(key, [row('fra_for_eng')])

    const decision = decideCopy(
      { text: 'please', language: 'en-GB', voiceId: 'en-GB-SoniaNeural', courseCode: 'spa_for_eng', role: 'known' },
      index
    )
    expect(decision.action).toBe('COPY')
    expect(decision.source.courseCode).toBe('fra_for_eng')
  })
})
