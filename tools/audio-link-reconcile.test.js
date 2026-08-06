// Unit tests for the audio link reconciliation keys and the slot resolver.
// The resolver is the ONE place a link choice is made, so it is the one place
// worth pinning: it decides what gets written to a live course.
// Run: npx vitest run tools/audio-link-reconcile.test.js
import { describe, it, expect } from 'vitest'
import { strictKey, looseKey, resolveSlot, legoVerdict, LEGO_TRIPLE, SLOTS, HEAL_EXCLUDE } from './audio-link-reconcile.cjs'

const audio = (id, origin = 'tts', created_at = '2026-01-01') => ({ id, origin, created_at })

describe('keys', () => {
  it('strict keeps a trailing ? — "what" and "what?" are different clips', () => {
    expect(strictKey('What?')).toBe('what?')
    expect(strictKey('what')).toBe('what')
    expect(strictKey('What?')).not.toBe(strictKey('what'))
  })

  it('strict strips trailing . ! and collapses internal whitespace', () => {
    expect(strictKey('  Hello   there. ')).toBe('hello there')
    expect(strictKey('Stop!')).toBe('stop')
  })

  it('loose collapses the ? distinction the strict key preserves', () => {
    expect(looseKey('What?')).toBe('what')
    expect(looseKey('what')).toBe('what')
  })
})

describe('resolveSlot', () => {
  const aliveIds = new Set(['LIVE'])

  it('a live link is left alone — never re-chosen, never overwritten', () => {
    expect(resolveSlot({ currentId: 'LIVE', aliveIds, strictCands: [audio('X')], looseCands: [] }))
      .toEqual({ status: 'linked' })
  })

  it('NULL link + strict candidate = a free recovery', () => {
    const r = resolveSlot({ currentId: null, aliveIds, strictCands: [audio('X')], looseCands: [audio('Y')] })
    expect(r.status).toBe('strict')
    expect(r.audio.id).toBe('X')
  })

  it('loose is only reached when nothing matches strictly', () => {
    const r = resolveSlot({ currentId: null, aliveIds, strictCands: [], looseCands: [audio('Y')] })
    expect(r.status).toBe('loose')
    expect(r.audio.id).toBe('Y')
  })

  it('human recordings win the candidate set (pickPreferredAudioRow)', () => {
    const r = resolveSlot({
      currentId: null, aliveIds,
      strictCands: [audio('T', 'tts', '2026-06-01'), audio('H', 'human', '2025-01-01')],
      looseCands: [],
    })
    expect(r.audio.id).toBe('H')
  })

  it('nothing anywhere = absent — the only bucket that implies TTS spend', () => {
    expect(resolveSlot({ currentId: null, aliveIds, strictCands: [], looseCands: [] }))
      .toEqual({ status: 'absent' })
  })

  it('a dead link with no replacement is dangling, not absent', () => {
    expect(resolveSlot({ currentId: 'GONE', aliveIds, strictCands: [], looseCands: [] }))
      .toEqual({ status: 'dangling' })
  })

  it('a dead link WITH a replacement is flagged healable, never silently rewritten', () => {
    const r = resolveSlot({ currentId: 'GONE', aliveIds, strictCands: [audio('X')], looseCands: [] })
    expect(r.status).toBe('dangling-healable-strict')
    // The apply pass only ever writes where the column IS NULL, so this status
    // is a report, not an instruction.
  })
})

// Tom, 2026-08-06: completeness is per-ROLE, not per-clip. A LEGO needs intro
// + voice1 + voice2; short of that its whole round dies and everything
// contingent on it breaks downstream.
describe('legoVerdict — the course-breaking rule', () => {
  const all = (s) => ({ intro: s, voice1: s, voice2: s })

  it('the triple is intro + target voice 1 + target voice 2 — the known clip is NOT in it', () => {
    expect(LEGO_TRIPLE).toEqual({ presentation: 'intro', target1: 'voice1', target2: 'voice2' })
    expect(Object.values(LEGO_TRIPLE)).not.toContain('known')
  })

  it('all three linked = complete', () => {
    expect(legoVerdict(all('linked'))).toEqual({ verdict: 'complete', missing: [] })
  })

  it('a voice-2-only gap is COURSE-BREAKING on its own', () => {
    const v = legoVerdict({ intro: 'linked', voice1: 'linked', voice2: 'absent' })
    expect(v.verdict).toBe('broken')
    expect(v.missing).toEqual(['voice2'])
  })

  it('a missing intro alone is COURSE-BREAKING — voices present is not enough', () => {
    const v = legoVerdict({ intro: 'absent', voice1: 'linked', voice2: 'linked' })
    expect(v.verdict).toBe('broken')
    expect(v.missing).toEqual(['intro'])
  })

  it('prompt + voice 1 present does NOT make a LEGO complete (the flattering gate)', () => {
    // The verdict this rule exists to overturn: known-side audio is irrelevant
    // to the triple, and voice2 alone still kills the round.
    expect(legoVerdict({ intro: 'linked', voice1: 'linked' }).verdict).toBe('broken')
  })

  it('gaps that all have a strict clip waiting are free to fix, not broken', () => {
    expect(legoVerdict({ intro: 'strict', voice1: 'linked', voice2: 'strict' }).verdict).toBe('free_strict')
  })

  it('a gap needing a loose match is held separately (opt-in), still not broken', () => {
    expect(legoVerdict({ intro: 'strict', voice1: 'loose', voice2: 'linked' }).verdict).toBe('free_loose')
  })

  it('one unrecoverable gap makes the whole LEGO broken even if the others are free', () => {
    expect(legoVerdict({ intro: 'strict', voice1: 'linked', voice2: 'dangling' }).verdict).toBe('broken')
  })

  it('an unseen part counts as absent, never as present', () => {
    expect(legoVerdict({}).verdict).toBe('broken')
    expect(legoVerdict({}).missing).toEqual(['intro', 'voice1', 'voice2'])
  })
})

describe('slot coverage', () => {
  it('covers every audio link column on all three content tables', () => {
    const cols = SLOTS.map((s) => `${s.table}.${s.col}`)
    for (const c of [
      'course_seeds.known_audio_id', 'course_seeds.target1_audio_id', 'course_seeds.target2_audio_id',
      'course_legos.known_audio_id', 'course_legos.target1_audio_id', 'course_legos.target2_audio_id',
      'course_legos.presentation_audio_id',
      'course_practice_phrases.known_audio_id', 'course_practice_phrases.target1_audio_id',
      'course_practice_phrases.target2_audio_id', 'course_practice_phrases.presentation_audio_id',
    ]) expect(cols).toContain(c)
  })

  it('phrase presentation is reported but never healed', () => {
    expect(HEAL_EXCLUDE.has('course_practice_phrases:presentation')).toBe(true)
  })
})
