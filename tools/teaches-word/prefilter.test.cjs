/**
 * Frozen tests for STAGE 1 — the conservative, side-aware pre-filter.
 *
 * Two properties, and every test here exists to hold one of them.
 *
 * ONE — IT MAY ONLY EVER SAY "FINE". It may never say "defect", and it may never discard something
 * that might be one. If a change ever lets a real defect be CLEARed, the defect disappears
 * silently and no reader will ever see it.
 *
 * TWO — THE TWO SIDES ARE JUDGED BY DIFFERENT RULES, AND THEY MUST NOT BE SWAPPED. Canon K8: "The
 * TARGET side stays strict, always." Canon K6: the known side "MAY use uninstructed forms of taught
 * words; only genuinely different WORDS are defects". The target side must therefore NOT clear an
 * inflected form, and the known side must. Getting this backwards is not hypothetical: the first
 * run of 2026-08-28 cleared the target side on plain substring, so every target-side inflection
 * defect was discarded before any reader saw it.
 *
 * Run: npx vitest run tools/teaches-word/prefilter
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const { prefilter, VERDICT } = require('./prefilter.cjs')

const known = (t, s) => prefilter(t, s, 'known').verdict
const target = (t, s) => prefilter(t, s, 'target').verdict

describe('the one safety property: it can clear, it can never convict', () => {
  it('has only three possible verdicts, and none of them is a conviction', () => {
    expect(Object.values(VERDICT).sort()).toEqual(['clear', 'read', 'skip'])
    for (const side of ['known', 'target']) {
      for (const [t, s] of [['want', 'I want a coffee'], ['want', 'I would like one'], ['知る', 'わかりません']]) {
        expect(Object.values(VERDICT)).toContain(prefilter(t, s, side).verdict)
      }
    }
  })

  it('refuses to run without being told which side it is judging', () => {
    // A default here would silently pick a rule, and picking the loose one on the target side is
    // exactly the bug this signature exists to make impossible.
    expect(() => prefilter('want', 'I want it')).toThrow(/side/)
    expect(() => prefilter('want', 'I want it', 'either')).toThrow(/side/)
  })
})

describe('TARGET side is strict — exact form only (canon K8)', () => {
  it('clears an exact-form match', () => {
    expect(target('siarad', 'dw i’n siarad Cymraeg')).toBe(VERDICT.CLEAR)
    expect(target('menos', 'eso es menos interesante')).toBe(VERDICT.CLEAR)
  })

  it('does NOT clear an inflected form — teach the form, get the form', () => {
    // The exact case the first run got wrong: "want" is a substring of "wanted", and the old
    // pre-filter cleared it on that basis.
    expect(target('want', 'I wanted a coffee')).toBe(VERDICT.READ)
    expect(target('siarad', 'siaradais i')).toBe(VERDICT.READ)
    expect(target('parle', 'je parlerai demain')).toBe(VERDICT.READ)
  })

  it('clears a multi-word item that has been SPLIT — splitting is allowed', () => {
    expect(target('dw i’n mynd i', 'dw i’n mynd i ddysgu')).toBe(VERDICT.CLEAR)
    expect(target('ychydig o ffrindiau', 'dw i’n mynd mas gyda ychydig o ffrindiau heno')).toBe(VERDICT.CLEAR)
    // words separated by an inserted word, every word still in its taught form
    expect(target('pick up', 'I will pick the children up')).toBe(VERDICT.CLEAR)
  })

  it('does NOT clear when a word of a multi-word item is missing or changed', () => {
    expect(target('pour eux', 'avec eux')).toBe(VERDICT.READ)
    expect(target('look after', 'I look at the children')).toBe(VERDICT.READ)
  })

  it('sends a mild mutation to a reader rather than deciding it itself', () => {
    // "Gymraeg" for "Cymraeg" is the one tolerated variation, but deciding that is a language
    // judgement, so the pre-filter must hand it on rather than clear or convict it.
    expect(target('Cymraeg', 'dw i’n dysgu Gymraeg')).toBe(VERDICT.READ)
  })

  it('uses substring only where the writing system has no word spaces', () => {
    expect(target('会说', '会说中文')).toBe(VERDICT.CLEAR)
    expect(target('見つけ出す', '見つけ出すつもりです')).toBe(VERDICT.CLEAR)
  })
})

describe('KNOWN side is looser, deliberately (canon K6)', () => {
  it('clears a plain containment', () => {
    expect(known('want', 'I want a coffee')).toBe(VERDICT.CLEAR)
    expect(known('mynd', 'Dw i eisiau mynd.')).toBe(VERDICT.CLEAR)
  })

  it('clears a longer form that simply contains the taught word', () => {
    // On this side a different ending is expressly fine, so clearing here discards nothing real.
    expect(known('want', 'I wanted a coffee')).toBe(VERDICT.CLEAR)
    expect(known('話す', '私はドイツ語を話す')).toBe(VERDICT.CLEAR)
  })

  it('clears a separated multi-word gloss', () => {
    expect(known('look after', 'I look after the children')).toBe(VERDICT.CLEAR)
  })

  it('still hands on a genuinely different word', () => {
    expect(known('I still want', 'I still need to remember how to learn')).toBe(VERDICT.READ)
    expect(known('知っている', 'わかりません')).toBe(VERDICT.READ)
  })
})

describe('the sides really are different, on the same pair', () => {
  it('clears an inflection on the known side and refuses to on the target side', () => {
    expect(known('want', 'I wanted a coffee')).toBe(VERDICT.CLEAR)
    expect(target('want', 'I wanted a coffee')).toBe(VERDICT.READ)
  })
})

describe('authoring furniture is furniture, not the word', () => {
  it('drops a parenthesised note, an unclosed one, and the slot marker', () => {
    expect(known('知っている（私が）', '私は知っている')).toBe(VERDICT.CLEAR)
    expect(target('知っている（私が）', '私は知っている')).toBe(VERDICT.CLEAR)
  })

  it('treats the author’s alternatives disjunctively', () => {
    expect(known('嬉しい・満足している', 'とても嬉しいです')).toBe(VERDICT.CLEAR)
    expect(known('お願いする／頼む', '手伝ってくれますか')).toBe(VERDICT.READ)
  })
})

describe('nothing to judge is not a pass', () => {
  it('skips a blank word and a blank sentence, distinctly from clearing', () => {
    expect(known('', 'I want a coffee')).toBe(VERDICT.SKIP)
    expect(target('want', '')).toBe(VERDICT.SKIP)
    expect(known('（形式的）', 'anything at all')).toBe(VERDICT.SKIP)
  })
})

describe('the published confirmed defects all still reach a reader', () => {
  const CONFIRMED = [
    ['知っている', 'わかりません'],
    ['見つけ出す', '知りたいです'],
    ['できる', '話せます'],
    ['最も', '一番好きです'],
    ['大丈夫', 'まあまあです'],
    ['場所', 'どこですか'],
    ['開始する', '始めましょう'],
    ['幸せな', '嬉しいです'],
  ]
  it.each(CONFIRMED)('%s / %s is handed on to be read, never cleared', (t, s) => {
    expect(known(t, s)).toBe(VERDICT.READ)
  })
})

describe('the rebuild rule: no language-specific morphology anywhere in this tool', () => {
  const dir = __dirname
  const CODE = ['prefilter.cjs', 'funnel.cjs', 'reader.cjs', 'confirm.cjs', 'instructions.cjs']
  // The ban is on a named table of endings the code consults. Prose that says "inflection" to a
  // reader is the method working, not a relapse.
  const BANNED = /\b(stemStrip|stemMinLen|suffixes|endings|inflections|okurigana|STEM_|SUFFIX_|ENDING_)\b/

  it.each(CODE)('%s declares no endings, stems or inflection tables', (file) => {
    const src = fs.readFileSync(path.join(dir, file), 'utf8')
    const executable = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    expect(executable).not.toMatch(BANNED)
  })

  it('the pre-filter names no language — only Unicode scripts, which is orthography', () => {
    // Knowing that Han script writes no spaces between words is a fact about the writing system,
    // not about any language's grammar, and no verdict depends on a language being identified.
    const src = fs.readFileSync(path.join(dir, 'prefilter.cjs'), 'utf8')
    const executable = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    for (const lang of ['Japanese', 'Arabic', 'Korean', 'Chinese', 'English', 'Welsh', 'jpn', 'kor', 'ara']) {
      expect(executable).not.toContain(lang)
    }
  })
})
