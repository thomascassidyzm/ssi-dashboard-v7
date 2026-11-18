/**
 * THE SOFT GUARD ON HAND-WRITTEN INTROS (Kai, 2026-11-11, job #247·AH).
 *
 * A rebuild that would replace an intro carrying hand-authored wording — an "as in" example, a
 * line no template produces, or a mark — is WARNED about, never blocked, and the warning
 * suggests carrying the old example only when it still contains the LEGO being introduced.
 * Pure functions: no DB, no CLI, no TTS.
 * Run: npx vitest run services/shared/intro-authorship
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ia = require('./intro-authorship.cjs')

const TEMPLATE = "The {target_lang_name} for: '{known}', as in — '{seed}', is:"
const compiled = ia.compileAll([TEMPLATE], 'eng')
const base = { compiled, template: TEMPLATE, targetLangName: 'Spanish', knownLang: 'eng' }

describe('parseAsIn', () => {
  it("reads Kai's #212 line, SSML tail and all", () => {
    const t = "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is: <break time=\"300ms\"/>"
    expect(ia.parseAsIn(t, compiled)).toBe('have you seen my keys anywhere?')
  })
  it('a bare (Frame A) line has no example', () => {
    expect(ia.parseAsIn("The Spanish for: 'anywhere', is: <break time=\"300ms\"/>", compiled)).toBeNull()
  })
  it('an apostrophe inside the example does not cut it short', () => {
    expect(ia.parseAsIn("The Spanish for: 'to', as in — 'I'm trying to', is:", compiled)).toBe("I'm trying to")
  })
  it('finds the example in a free line no template parses (ita S0376L02 shape)', () => {
    const t = `The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:`
    expect(ia.parseAsIn(t, compiled)).toBe("I didn't go anywhere")
  })
  it('works for other known languages without a compiled template', () => {
    expect(ia.parseAsIn("El inglés para: 'ahora', como en — 'quiero hablar ahora', es:")).toBe('quiero hablar ahora')
    expect(ia.parseAsIn("Le gallois pour : 'maintenant', comme dans — 'je veux parler maintenant', est :")).toBe('je veux parler maintenant')
    expect(ia.parseAsIn("スペイン語で — 「今」 — 「今話したい」のように — は：")).toBe('今話したい')
  })
})

describe('rewriteWarning — warns, never blocks', () => {
  it('no warning when the rebuild writes the same words (SSML aside)', () => {
    const old = "The Spanish for: 'now', as in — 'I want to speak now', is: <break time=\"300ms\"/>"
    expect(ia.rewriteWarning({ ...base, legoId: 'S0005L01', oldText: old, newText: "The Spanish for: 'now', as in — 'I want to speak now', is:", knownText: 'now' })).toBeNull()
  })

  it('no warning when the old line is a plain template line with no example', () => {
    expect(ia.rewriteWarning({ ...base, legoId: 'S0005L01', oldText: "The Spanish for: 'now', is:", newText: "The Spanish for: 'now', as in — 'now please', is:", knownText: 'now' })).toBeNull()
  })

  it('no warning when the old example survives word for word', () => {
    const w = ia.rewriteWarning({ ...base, legoId: 'S0182L04',
      oldText: "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:",
      newText: "The Spanish for: 'anywhere at all', as in — 'have you seen my keys anywhere?', is:",
      knownText: 'anywhere at all' })
    expect(w).toBeNull()
  })

  it("Kai's case: a rebuild drops the as-in — warn, show both, suggest carrying the old example", () => {
    const w = ia.rewriteWarning({ ...base, legoId: 'S0182L04',
      oldText: "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is: <break time=\"300ms\"/>",
      newText: "The Spanish for: 'anywhere', is:", knownText: 'anywhere' })
    expect(w).not.toBeNull()
    expect(w.kind).toBe('as-in')
    expect(w.old).toBe("The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:")
    expect(w.new).toBe("The Spanish for: 'anywhere', is:")
    expect(w.example_still_fits).toBe(true)
    expect(w.suggestion).toBe("The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:")
    expect(w.message).toMatch(/Not blocked/)
  })

  it('a rebuild swaps the example for a template one — still warns and suggests the old example', () => {
    const w = ia.rewriteWarning({ ...base, legoId: 'S0182L04',
      oldText: "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:",
      newText: "The Spanish for: 'anywhere', as in — 'I don't want to go anywhere', is:", knownText: 'anywhere' })
    expect(w.new_example).toBe("I don't want to go anywhere")
    expect(w.suggestion).toMatch(/have you seen my keys anywhere\?/)
  })

  it('the LEGO changed and the old example no longer contains it — warn, suggest nothing, say why', () => {
    const w = ia.rewriteWarning({ ...base, legoId: 'S0182L04',
      oldText: "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:",
      newText: "The Spanish for: 'somewhere', is:", knownText: 'somewhere' })
    expect(w.example_still_fits).toBe(false)
    expect(w.suggestion).toBeNull()
    expect(w.message).toMatch(/no longer contains 'somewhere'/)
  })

  it('a free hand-written line with no as-in is warned about; kept as the suggestion while it still quotes the LEGO', () => {
    const old = "The Spanish for 'does', when you're asking a question, is:"
    const w = ia.rewriteWarning({ ...base, legoId: 'S0104L02', oldText: old, newText: "The Spanish for: 'does', is:", knownText: 'does' })
    expect(w.kind).toBe('hand-written')
    expect(w.suggestion).toBe(old)
  })

  it('a soft mark is honoured when the row is gone (the mark keeps the words of record)', () => {
    const mark = { guard: 'soft', author: 'Kai', text: "The Spanish for: 'anywhere', as in — 'have you seen my keys anywhere?', is:" }
    const w = ia.rewriteWarning({ ...base, legoId: 'S0182L04', oldText: null, mark,
      newText: "The Spanish for: 'anywhere', is:", knownText: 'anywhere' })
    expect(w.kind).toBe('marked')
    expect(w.marked).toBe('soft')
    expect(w.message).toMatch(/soft-marked hand-authored line \(Kai\)/)
    expect(w.suggestion).toMatch(/have you seen my keys anywhere/)
  })

  it('a slash-compound LEGO is judged on its first option, like the template', () => {
    const w = ia.rewriteWarning({ ...base, legoId: 'S0010L01',
      oldText: "The Spanish for: 'to listen', as in — 'I want to listen to you', is:",
      newText: "The Spanish for: 'to listen', is:", knownText: 'to listen / to hear' })
    expect(w.example_still_fits).toBe(true)
  })
})

describe('authorshipSignals', () => {
  it('names each signal', () => {
    expect(ia.authorshipSignals("The Spanish for: 'now', is:", { compiled }).handAuthored).toBe(false)
    expect(ia.authorshipSignals("The Spanish for: 'now', as in — 'speak now', is:", { compiled }).asIn).toBe('speak now')
    expect(ia.authorshipSignals("Now, in Spanish, is:", { compiled }).freeForm).toBe(true)
    expect(ia.authorshipSignals("The Spanish for: 'now', is:", { compiled, mark: { guard: 'soft' } }).marked).toBe('soft')
    expect(ia.authorshipSignals("The Spanish for: 'now', is:", { compiled, mark: {} }).marked).toBe('hard')
  })
})
