// THE RENDER-SIDE REFUSAL, one pod text per target language (Tom, 2026-09-20).
//
// The store makes a fork impossible; this is the door that would have PAID for one —
// ~230 clips per language, charged twice, to produce two versions of French. Pure, so
// the rule is testable without a database or a render.
import { describe, it, expect } from 'vitest'
const { languageTextRefusal } = require('./pod-language-text.cjs')

const base = { courseCode: 'fra_for_jpn', targetLang: 'fra', langHasCanon: true, bound: true, offCanon: 0 }

describe('languageTextRefusal', () => {
  it('lets a bound pod that matches its language render', () => {
    expect(languageTextRefusal(base)).toBeNull()
  })

  it('refuses a pod whose lines have forked from the language', () => {
    const r = languageTextRefusal({ ...base, offCanon: 7 })
    expect(r.reason).toBe('pod_text_forked_from_language')
    expect(r.message).toMatch(/7 line/)
    expect(r.message, 'the refusal must name the language, not just the course').toMatch(/fra/)
  })

  it('refuses a matching-but-unbound pod — unbound is the fork not yet taken', () => {
    const r = languageTextRefusal({ ...base, bound: false })
    expect(r.reason).toBe('pod_text_not_bound_to_language')
    expect(r.message, 'a refusal must say how to clear it').toMatch(/bind-pod-text-to-language/)
  })

  it('allows a language that has no canonical text yet — a gate you cannot open is a wall', () => {
    expect(languageTextRefusal({ ...base, langHasCanon: false, bound: false, offCanon: 0 })).toBeNull()
  })
})
