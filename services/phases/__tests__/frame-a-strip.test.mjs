/**
 * Frame A (the bare introduction, no "as in" context) is rendered by stripping
 * the {seed} clause out of the known language's Frame B template.
 *
 * THE BUG THIS PINS (2026-09-03, eng_for_hin). The strip was a list of
 * hand-written clauses, one per known language. Templates are GENERATED per
 * known language, so any language nobody added to the list fell through to a
 * bare `{seed}` → '' substitution and left the quotes behind: 479 of
 * eng_for_hin's 1,055 rendered presentation clips speak
 * "अंग्रेज़ी में — 'X' — जैसे — '' — में :" — an empty quotation, out loud,
 * to a learner. The fallback below is structural, so the next language nobody
 * thought of is covered too.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { stripSeedClause, renderIntro } = require('../presentation-author.cjs')

const HINDI = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :"
const ENGLISH = "The {target_lang_name} for — '{known}' — as in — '{seed}' — is:"

describe('stripSeedClause', () => {
  it('leaves no {seed} placeholder and no empty quotes for Hindi', () => {
    const a = stripSeedClause(HINDI)
    expect(a).not.toContain('{seed}')
    expect(a).not.toMatch(/''/)
    expect(a).not.toContain('जैसे')
    expect(a).toContain("'{known}'")
  })

  it('is byte-identical to the old behaviour for a listed language', () => {
    expect(stripSeedClause(ENGLISH)).toBe("The {target_lang_name} for — '{known}' — is:")
  })

  it('a Hindi Frame A intro speaks no empty quotation', () => {
    const text = renderIntro({
      frame: 'A', template: HINDI, targetLangName: 'अंग्रेज़ी', chunk: 'कल', seed: ''
    })
    expect(text).toBe("अंग्रेज़ी में — 'कल' — में :")
    expect(text).not.toMatch(/''/)
  })

  it('Frame B is untouched — the context still lands between its quotes', () => {
    const text = renderIntro({
      frame: 'B', template: HINDI, targetLangName: 'अंग्रेज़ी', chunk: 'कल',
      seed: 'मैं कल आपसे कुछ पूछना चाहता था।'
    })
    expect(text).toBe("अंग्रेज़ी में — 'कल' — जैसे — 'मैं कल आपसे कुछ पूछना चाहता था।' — में :")
  })

  // The other known languages whose live template fell through the list. These
  // are the stored templates as of 2026-09-03; the invariant, not the exact
  // wording, is what is being pinned: no empty quotation ever reaches a clip.
  const FELL_THROUGH = {
    jpn: '{known}、「{seed}」のように、を{target_lang_name}で言うと：',
    kor: "'{known}'. '{seed}'처럼. 를 {target_lang_name}로 하면:",
    cmn: '{target_lang_name}里。「{known}」。如「{seed}」。是：',
    guj: "{target_lang_name}માં — '{known}' — જેમ — '{seed}' — તો:",
    urd: "{target_lang_name} میں — '{known}' — جیسے — '{seed}' — میں:",
    ben: "{target_lang_name}ে — '{known}' — যেমন — '{seed}' — হয়:",
    tel: "{target_lang_name} — '{known}' — '{seed}' —:",
    sin: "{target_lang_name}යෙන්. '{known}'. '{seed}' ඉතින්. :"
  }

  it('no known language renders Frame A with an empty quotation', () => {
    for (const [lang, template] of Object.entries(FELL_THROUGH)) {
      const a = stripSeedClause(template)
      expect(a, lang).not.toContain('{seed}')
      expect(a, lang).not.toMatch(/''|""|「」|（）/)
      expect(a, lang).toContain('{known}')
    }
  })

  it('a particle bound to the seed quote leaves with the clause', () => {
    // Japanese 「…」のように and Korean '…'처럼 are the "as in" itself — a space
    // would have meant a frame word, and those are kept.
    expect(stripSeedClause(FELL_THROUGH.jpn)).toBe('{known}、を{target_lang_name}で言うと：')
    expect(stripSeedClause(FELL_THROUGH.kor)).toBe("'{known}'. 를 {target_lang_name}로 하면:")
  })

  it('a template shaped in a way the fallback cannot read still loses the placeholder', () => {
    // {seed} before {known}: the structural cut would be nonsense, so it declines.
    expect(stripSeedClause('{seed} / {known}')).toBe(' / {known}')
  })
})
