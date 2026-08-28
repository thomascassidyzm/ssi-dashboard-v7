/**
 * Frozen tests for STAGE 1 — the conservative pre-filter.
 *
 * The pre-filter has exactly ONE safety property, and every test here exists to hold it:
 *
 *     IT MAY ONLY EVER SAY "FINE". IT MAY NEVER SAY "DEFECT", AND IT MAY NEVER DISCARD
 *     SOMETHING THAT MIGHT BE ONE.
 *
 * If a change to this file's subject ever lets a real defect be CLEARed, the defect disappears
 * silently and no reader will ever see it — which is precisely the failure the whole rebuild
 * exists to end. So the defects taken from the published confirmed list are pinned here: not to
 * check that the pre-filter catches them (it never catches anything), but to check that it
 * still hands every one of them on to be read.
 *
 * Run: npx vitest run tools/teaches-word/prefilter
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const { prefilter, VERDICT, clean, alternatives } = require('./prefilter.cjs')

const v = (taught, sentence) => prefilter(taught, sentence).verdict

describe('the one safety property: it can clear, it can never convict', () => {
  it('has only three possible verdicts, and none of them is a conviction', () => {
    const samples = [
      ['want', 'I want a coffee'], ['want', 'I would like a coffee'], ['', 'anything'],
      ['知る', 'わかりません'], ['x', ''], ['gwybod', 'dw i ddim yn gwybod'],
    ]
    for (const [t, s] of samples) {
      expect(Object.values(VERDICT)).toContain(v(t, s))
    }
    expect(Object.values(VERDICT).sort()).toEqual(['clear', 'read', 'skip'])
  })

  it('sends anything it cannot match to a reader rather than deciding', () => {
    expect(v('want', 'I would like a coffee')).toBe(VERDICT.READ)
    expect(v('wanted', 'I want a coffee')).toBe(VERDICT.READ)
  })
})

describe('C1 — the taught word sits verbatim in the sentence', () => {
  it('clears a plain containment', () => {
    expect(v('want', 'I want a coffee')).toBe(VERDICT.CLEAR)
  })

  it('clears across punctuation and case', () => {
    expect(v('Want', 'Do you want a coffee?')).toBe(VERDICT.CLEAR)
    expect(v('mynd', 'Dw i eisiau mynd.')).toBe(VERDICT.CLEAR)
  })

  it('clears a longer form that contains the taught word verbatim', () => {
    // Not a morphological claim: the letters are simply there, in order, unbroken.
    expect(v('話す', '私はドイツ語を話す')).toBe(VERDICT.CLEAR)
  })
})

describe('C2 — every part of a multi-word gloss is present as a whole word', () => {
  it('clears a separated multi-word phrase', () => {
    expect(v('look after', 'I look after the children')).toBe(VERDICT.CLEAR)
    expect(v('pick up', 'I will pick the children up')).toBe(VERDICT.CLEAR)
  })

  it('does NOT clear when only some parts are present', () => {
    expect(v('look after', 'I look at the children')).toBe(VERDICT.READ)
    expect(v('go out', 'I go home')).toBe(VERDICT.READ)
  })

  it('never applies to a single-word gloss, where it would collapse into C1', () => {
    expect(v('after', 'I look at it')).toBe(VERDICT.READ)
  })
})

describe('authoring furniture is furniture, not the word', () => {
  it('drops a parenthesised note before comparing', () => {
    expect(clean('知っている（私が）')).toBe('知っている')
    expect(v('知っている（私が）', '私は知っている')).toBe(VERDICT.CLEAR)
  })

  it('drops an annotation whose closing bracket was lost to truncation', () => {
    expect(clean('知っていました（1人称')).toBe('知っていました')
  })

  it('drops the slot marker on a bound form', () => {
    expect(clean('〜の時')).toBe('の時')
  })

  it('treats the author’s alternatives disjunctively — using either one is using the word', () => {
    expect(alternatives(clean('嬉しい・満足している'))).toEqual(['嬉しい', '満足している'])
    expect(v('嬉しい・満足している', 'とても嬉しいです')).toBe(VERDICT.CLEAR)
    expect(v('お願いする／頼む', '手伝ってくれますか')).toBe(VERDICT.READ)
  })
})

describe('nothing to judge is not a pass', () => {
  it('skips a blank lesson word and a blank sentence, distinctly from clearing', () => {
    expect(v('', 'I want a coffee')).toBe(VERDICT.SKIP)
    expect(v('want', '')).toBe(VERDICT.SKIP)
    expect(v('（形式的）', 'anything at all')).toBe(VERDICT.SKIP)
  })
})

describe('the published confirmed defects all reach a reader', () => {
  // Verbatim from the 120-defect list of 2026-08-27: the LEGO's word and one of the prompts
  // that was judged, by three independent reviewers, to use a different word instead. The
  // pre-filter must not swallow any of them.
  const CONFIRMED = [
    ['知っている', 'わかりません'],          // spa S0059L01 — the paradigm case
    ['見つけ出す', '知りたいです'],           // deu S0017L03 — the original specimen
    ['できる', '話せます'],                   // deu S0010L01
    ['助け', '手伝いをありがとう'],           // deu S0142L04
    ['最も', '一番好きです'],                 // zho S0116L01
    ['大丈夫', 'まあまあです'],               // zho S0041L01
    ['場所', 'どこですか'],                   // zho S0138L01
    ['開始する', '始めましょう'],             // ita S0081L01
    ['聞く・頼む', '求めています'],           // ita S0212L02
    ['幸せな', '嬉しいです'],                 // spa S0129L02
    ['望んでいる', '行きたいです'],           // spa S0200L02
    ['正確に', '全く同じようにしてください'], // deu S0153L01
  ]

  it.each(CONFIRMED)('%s / %s is handed on to be read, never cleared', (taught, sentence) => {
    expect(v(taught, sentence)).toBe(VERDICT.READ)
  })
})

describe('the rebuild rule: no language-specific morphology anywhere in this tool', () => {
  // Kai's ruling, 2026-08-28. The old gate needed a hand-authored ending list per language and
  // therefore covered four languages and returned a misleading zero for the other thirty-five.
  // This test is the tripwire: if someone reaches for an ending list again, it fails here.
  const dir = __dirname
  const CODE = ['prefilter.cjs', 'funnel.cjs', 'reader.cjs', 'confirm.cjs']
  // What is banned is a DECLARATION — a named table of endings the code consults. The reading
  // stage's instructions do say the word "inflection" to the model in plain prose, and must:
  // telling a reader that a conjugated form is the same word is the whole method. The tripwire
  // is on the identifier, which is what a relapse would actually look like.
  const BANNED = /\b(stemStrip|stemMinLen|suffixes|endings|inflections|morphology|okurigana|STEM_|SUFFIX_|ENDING_)\b/

  it.each(CODE)('%s declares no endings, stems or inflection tables', (file) => {
    const src = fs.readFileSync(path.join(dir, file), 'utf8')
    // Comments explain WHY the old approach is gone; the executable lines must not bring it back,
    // and neither must the prompt text, which is why only comments are stripped here.
    const executable = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    expect(executable).not.toMatch(BANNED)
  })

  it('the pre-filter names no language at all', () => {
    const src = fs.readFileSync(path.join(dir, 'prefilter.cjs'), 'utf8')
    const executable = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    for (const lang of ['Japanese', 'Arabic', 'Korean', 'Chinese', 'English', 'Welsh', 'jpn', 'kor', 'ara']) {
      expect(executable).not.toContain(lang)
    }
  })
})
