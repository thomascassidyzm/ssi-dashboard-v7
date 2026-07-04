// Unit tests for the clone-once-copy-everywhere matching precondition.
// Run: npx vitest run services/shared/clone-copy-match.test.js
import { describe, it, expect } from 'vitest'
import { computeAudioKey, decideCopy, CLONE_VOICE_ID } from './clone-copy-match.cjs'

const row = (courseCode, overrides = {}) => ({
  courseCode,
  s3Key: `mastered/${courseCode}.mp3`,
  text: 'please',
  id: courseCode,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

function indexOf(rows, { speedMatters = false } = {}) {
  const index = new Map()
  for (const r of rows) {
    const key = computeAudioKey({ text: r.text, language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: r.speed }, speedMatters)
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(r)
  }
  return index
}

describe('computeAudioKey', () => {
  it('is exact-text + role + voice_id (case/whitespace/trailing punctuation normalized)', () => {
    const a = computeAudioKey({ text: 'Please.', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    const b = computeAudioKey({ text: '  please  ', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    expect(a).toBe(b)
  })

  it('different known text produces a different key (ZUT-safe: no fuzzy matching)', () => {
    const a = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    const b = computeAudioKey({ text: 'please now', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    expect(a).not.toBe(b)
  })

  it('different role produces a different key even for identical text/voice', () => {
    const known = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    const target1 = computeAudioKey({ text: 'please', language: 'eng', role: 'target1', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    expect(known).not.toBe(target1)
  })

  it('different voice_id produces a different key even for identical text/role', () => {
    const clone = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0 })
    const azure = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: 'azure_en-GB-SoniaNeural', speed: 1.0 })
    expect(clone).not.toBe(azure)
  })

  it('when speedMatters=true, different speed produces a different key', () => {
    const slow = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: 'azure_en-GB-SoniaNeural', speed: 0.9 }, true)
    const natural = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: 'azure_en-GB-SoniaNeural', speed: 1.0 }, true)
    expect(slow).not.toBe(natural)
  })

  it('when speedMatters=false (xAI: no speed param), differing speed collapses to the same key', () => {
    const a = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 0.75 }, false)
    const b = computeAudioKey({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.25 }, false)
    expect(a).toBe(b)
  })
})

describe('decideCopy — the matching precondition end to end', () => {
  it('exact match in another course: COPY', () => {
    const index = indexOf([row('fra_for_eng')])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.action).toBe('COPY')
    expect(decision.source.courseCode).toBe('fra_for_eng')
  })

  it('voice_id mismatch: must NOT copy', () => {
    const index = indexOf([row('fra_for_eng')])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: 'azure_en-GB-SoniaNeural', speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.action).toBe('SKIP_NO_SOURCE')
  })

  it('speed mismatch (speedMatters=true, e.g. non-xAI voice): must NOT copy', () => {
    const index = indexOf([row('fra_for_eng', { speed: 0.9 })], { speedMatters: true })
    const decision = decideCopy(
      { text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' },
      index,
      true
    )
    expect(decision.action).toBe('SKIP_NO_SOURCE')
  })

  it('speed match (speedMatters=true): copies', () => {
    const index = indexOf([row('fra_for_eng', { speed: 1.0 })], { speedMatters: true })
    const decision = decideCopy(
      { text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' },
      index,
      true
    )
    expect(decision.action).toBe('COPY')
  })

  it('xAI (speedMatters=false): a configured speed difference never blocks the copy', () => {
    const index = indexOf([row('fra_for_eng', { speed: 0.75 })], { speedMatters: false })
    const decision = decideCopy(
      { text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.5, courseCode: 'spa_for_eng' },
      index,
      false
    )
    expect(decision.action).toBe('COPY')
  })

  it('different course, same text: produces a candidate for a NEW row + NEW s3 object (never the source course\'s own row/key)', () => {
    const index = indexOf([row('fra_for_eng', { s3Key: 'mastered/ORIGINAL-UUID.mp3' })])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.action).toBe('COPY')
    // The tool copies decision.source.s3Key to a freshly generated destKey —
    // it must never reuse the source's s3Key verbatim as the destination's.
    expect(decision.source.s3Key).toBe('mastered/ORIGINAL-UUID.mp3')
    expect(decision.source.courseCode).not.toBe('spa_for_eng')
  })

  it('a match already owned by the destination course itself: SKIP_ALREADY_OWNED, not COPY (idempotent — no duplicate row/object)', () => {
    const index = indexOf([row('spa_for_eng'), row('fra_for_eng')])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.action).toBe('SKIP_ALREADY_OWNED')
  })

  it('no source anywhere: SKIP_NO_SOURCE', () => {
    const index = indexOf([])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.action).toBe('SKIP_NO_SOURCE')
  })

  it('deterministic pick across multiple source courses: newest created_at wins', () => {
    const index = indexOf([
      row('fra_for_eng', { createdAt: '2026-01-01T00:00:00Z' }),
      row('ita_for_eng', { createdAt: '2026-06-01T00:00:00Z' }),
    ])
    const decision = decideCopy({ text: 'please', language: 'eng', role: 'known', voiceId: CLONE_VOICE_ID, speed: 1.0, courseCode: 'spa_for_eng' }, index, false)
    expect(decision.source.courseCode).toBe('ita_for_eng')
  })
})
