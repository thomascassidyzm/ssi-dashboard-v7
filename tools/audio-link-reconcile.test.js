// Unit tests for the audio link reconciliation keys and the slot resolver.
// The resolver is the ONE place a link choice is made, so it is the one place
// worth pinning: it decides what gets written to a live course.
// Run: npx vitest run tools/audio-link-reconcile.test.js
import { describe, it, expect } from 'vitest'
import { strictKey, looseKey, resolveSlot, legoVerdict, LEGO_TRIPLE, SLOTS, HEAL_EXCLUDE, healExcludeFor } from './audio-link-reconcile.cjs'
import {
  localisedLangName, buildComponentPresentationText, componentPresentationKey, legoRefFor,
} from '../services/shared/presentation-key.cjs'

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

  it('phrase presentation is reported but never healed BY DEFAULT', () => {
    expect(HEAL_EXCLUDE.has('course_practice_phrases:presentation')).toBe(true)
    expect(healExcludeFor().has('course_practice_phrases:presentation')).toBe(true)
    expect(healExcludeFor({}).has('course_practice_phrases:presentation')).toBe(true)
  })

  it('opting in lifts the phrase-presentation exclusion and nothing else', () => {
    const opted = healExcludeFor({ healPhrasePresentation: true })
    expect(opted.has('course_practice_phrases:presentation')).toBe(false)
    expect(opted.size).toBe(0)
    // The default set is not mutated by opting in — a per-run choice must never
    // leak into the next course in the loop.
    expect(HEAL_EXCLUDE.has('course_practice_phrases:presentation')).toBe(true)
  })
})

// The component presentation key. This is the one that decides what narration a
// learner hears, so the cases below are the ones that would actually hurt.
describe('component presentation key', () => {
  // The real deu_for_eng row: template, chunk, and the parent M-LEGO carrier.
  const ENG = "The {target_lang_name} for: '{known}', as in — '{seed}', is:"

  it('rebuilds the narration exactly as phase8 minted it', () => {
    expect(buildComponentPresentationText({
      template: ENG, targetLangName: 'German', knownText: 'You', carrierText: 'to speak with you',
    })).toBe("The German for: 'You', as in — 'to speak with you', is:")
  })

  it('matches a clip whose stored text differs only in case and spacing', () => {
    // Both sides go through normalizeForAudio from RAW text, never the stored
    // text_normalized — see the NORMALISERS note in the tool header.
    const built = componentPresentationKey({
      template: ENG, targetLangName: 'German', knownText: 'You', carrierText: 'to speak with you',
    })
    expect(built).toBe(strictKey("the german for:  'You',  as in — 'to speak with YOU', is:"))
  })

  // THE LANGUAGE-AWARENESS TEST. Japanese narration has no quote delimiters and
  // no recognisable wrapper: any matcher that pattern-matches the English
  // template, or extracts "the quoted bit", scores zero here. Building the
  // string from the language's OWN template does not care.
  it('works on Japanese narration, which has no quote delimiters at all', () => {
    const JPN = '{known}（{seed}）を{target_lang_name}で言うと：'
    const built = buildComponentPresentationText({
      template: JPN, targetLangName: 'フランス語', knownText: 'もうすぐ', carrierText: 'もうすぐ着きます',
    })
    expect(built).toBe('もうすぐ（もうすぐ着きます）をフランス語で言うと：')
    // The failure mode being pinned: nothing in the built string is quoted, so
    // an extract-the-quoted-chunk matcher gets nothing to match on.
    expect(built).not.toMatch(/['"「」]/)
    expect(componentPresentationKey({
      template: JPN, targetLangName: 'フランス語', knownText: 'もうすぐ', carrierText: 'もうすぐ着きます',
    })).toBe(strictKey('もうすぐ（もうすぐ着きます）をフランス語で言うと：'))
  })

  it('a Chinese template keys the same way — no known language is special-cased', () => {
    const ZHO = '{target_lang_name}里 —「{known}」— 如「{seed}」— 是：'
    expect(buildComponentPresentationText({
      template: ZHO, targetLangName: '英语', knownText: '我', carrierText: '我想',
    })).toBe('英语里 —「我」— 如「我想」— 是：')
  })

  // THE AMBIGUITY TEST. This is the 445-of-926 case Stage 1 could not separate.
  // Two components share the chunk "Month" and differ ONLY in the carrier the
  // learner hears. Because the carrier is IN the key, they do not collide.
  it('two components sharing a chunk get different keys — the carrier disambiguates', () => {
    const a = componentPresentationKey({
      template: ENG, targetLangName: 'German', knownText: 'Month', carrierText: 'last month',
    })
    const b = componentPresentationKey({
      template: ENG, targetLangName: 'German', knownText: 'Month', carrierText: 'next month',
    })
    expect(a).not.toBe(b)
    // ...and keying on the chunk alone, which is what collided, WOULD collide.
    expect(strictKey('Month')).toBe(strictKey('month'))
  })

  it('no template, no chunk or no carrier = NO KEY — never a guess', () => {
    const base = { template: ENG, targetLangName: 'German', knownText: 'You', carrierText: 'with you' }
    expect(componentPresentationKey({ ...base, template: null })).toBeNull()
    expect(componentPresentationKey({ ...base, carrierText: undefined })).toBeNull()
    expect(componentPresentationKey({ ...base, knownText: '' })).toBeNull()
    expect(componentPresentationKey({ ...base, targetLangName: null })).toBeNull()
  })

  it('derives the LEGO ref from the row itself, since phrase lego_id is NULL', () => {
    expect(legoRefFor(1, 5)).toBe('S0001L05')
    expect(legoRefFor(264, 1)).toBe('S0264L01')
    expect(legoRefFor(null, 5)).toBeNull()
    expect(legoRefFor(1, null)).toBeNull()
  })

  it('English-known courses use the house language names, not CLDR variants', () => {
    expect(localisedLangName('deu', 'eng')).toBe('German')
    // The house name is the point: intros say "Bengali", CLDR says "Bangla".
    expect(localisedLangName('ben', 'eng')).toBe('Bengali')
  })
})

// The refusal rule, stated as the tool applies it. A candidate set built from
// this key is internally interchangeable by construction (identical narration),
// so preference may settle it; a structural disagreement may not.
describe('component candidates — when to link and when to refuse', () => {
  const cand = (id, lego_id) => ({ id, lego_id, origin: 'tts', created_at: '2026-08-03' })
  const conflicting = (cands, legoRef) => cands.filter((a) => a.lego_id && legoRef && a.lego_id !== legoRef)

  it('one candidate on the right LEGO links', () => {
    expect(conflicting([cand('A', 'S0001L05')], 'S0001L05')).toHaveLength(0)
  })

  it('duplicate renders of identical narration are interchangeable — preference decides', () => {
    // Same key means the same words in the same order, so no learner can tell
    // these apart. This is the mastered/pending duplicate pair seen in German.
    const cands = [cand('A', 'S0001L05'), cand('B', 'S0001L05')]
    expect(conflicting(cands, 'S0001L05')).toHaveLength(0)
    const r = resolveSlot({ currentId: null, aliveIds: new Set(), strictCands: cands, looseCands: [] })
    expect(r.status).toBe('strict')
    expect(['A', 'B']).toContain(r.audio.id)
  })

  it('a candidate naming a DIFFERENT LEGO is a refusal, not a tie to break', () => {
    // Left NULL and counted `ambiguous`. A NULL costs the learner nothing —
    // presentation_id || known_id falls through to a clip that plays — whereas
    // a wrong link puts the wrong narration in their ears with no signal.
    expect(conflicting([cand('A', 'S0009L02')], 'S0001L05')).toHaveLength(1)
  })

  it('a candidate with no lego_id at all is not a conflict — the text key already decided', () => {
    expect(conflicting([cand('A', null)], 'S0001L05')).toHaveLength(0)
  })
})
