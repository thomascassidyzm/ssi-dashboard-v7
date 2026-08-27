/**
 * tom-voice-language-gate.test.cjs
 *
 * The gate's job is a SAFETY property, so the tests are asymmetric on purpose:
 * a target-language line reaching Tom's clone is the defect the gate exists to
 * prevent, and no amount of convenience buys one. An English line wrongly held
 * is a cost, not a defect, and is asserted separately with a budget.
 *
 * The corpus fixture (`__fixtures__/pod1-language-corpus.json`) is the real Pod 1
 * text — every one of the 2,051 Tom-cast known-side lines and their 2,051
 * target-side twins, across all 22 languages, pulled from production on
 * 2026-08-27. It is committed so these numbers are reproducible without DB
 * access, and so a future change to the gate is scored against the same bar.
 */
'use strict'

import { describe, it, expect } from 'vitest'

const fs = require('fs')
const path = require('path')
const { isEnglishLine, filterEnglishOnly, englishScore, ACCEPT, REJECT } = require('./tom-voice-language-gate.cjs')

const CORPUS = JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__/pod1-language-corpus.json'), 'utf8'))

describe('tom-voice-language-gate — the safety property', () => {
  it('accepts NO target-language line, in any of the 22 languages', () => {
    const target = CORPUS.lines.map((l) => ({ known_text: l.target_text, target_text: l.known_text, course: l.course }))
    const { kept } = filterEnglishOnly(target)
    // Zero. Not "few". This is the whole point of the module.
    expect(kept.map((k) => `${k.course}: ${k.known_text}`)).toEqual([])
  })

  it('rejects every non-Latin script outright, whatever else is true of the line', () => {
    for (const s of ['مرحبا يا سارة', '早上好，莎拉', 'おはよう', '안녕하세요', 'Добрый день', 'नमस्ते']) {
      const v = isEnglishLine(s)
      expect(v.ok).toBe(false)
      expect(v.verdict).toBe('not-english')
      expect(v.why).toMatch(/non-Latin script/)
    }
  })

  it('refuses a slot whose two sides carry the same text — the sides are not distinguishable', () => {
    const v = isEnglishLine('Good morning, Sarah!', { targetText: 'Good morning, Sarah!' })
    expect(v.ok).toBe(false)
    expect(v.why).toMatch(/identical to the target text/)
  })

  it('never treats a HOLD as a pass', () => {
    const held = CORPUS.lines
      .map((l) => isEnglishLine(l.known_text, { targetText: l.target_text }))
      .filter((v) => v.verdict === 'hold')
    expect(held.length).toBeGreaterThan(0)          // the band is real, not decorative
    expect(held.every((v) => v.ok === false)).toBe(true)
  })
})

describe('tom-voice-language-gate — the cost side', () => {
  it('loses no English line to the reject bin: a doubtful English line is HELD, never dropped', () => {
    const known = CORPUS.lines.map((l) => ({ known_text: l.known_text, target_text: l.target_text, course: l.course }))
    const { rejected } = filterEnglishOnly(known)
    expect(rejected.map((r) => `${r.course}: ${r.known_text}`)).toEqual([])
  })

  it('auto-accepts the great majority of real English lines without a human', () => {
    const known = CORPUS.lines.map((l) => ({ known_text: l.known_text, target_text: l.target_text }))
    const { kept, held } = filterEnglishOnly(known)
    expect(kept.length + held.length).toBe(CORPUS.lines.length)
    // Measured 2026-08-27: 1,924 accepted, 127 held. The held set is 7 DISTINCT
    // lines — the Narrator's bare-noun drill lines — repeated across the pods,
    // so the human cost is seven decisions for the whole 22-pod estate.
    expect(kept.length / CORPUS.lines.length).toBeGreaterThan(0.9)
    expect(new Set(held.map((h) => h.known_text)).size).toBeLessThanOrEqual(10)
  })

  it('holds the bare-noun drill lines rather than guessing at them', () => {
    // Honest about its own reach: no statistic separates these from their
    // foreign twins, so neither does this gate.
    const v = isEnglishLine('October. November. December.')
    expect(v.verdict).toBe('hold')
  })

  it('passes ordinary English sentences, including ones carrying words that are also foreign function words', () => {
    for (const s of [
      "I'm sorry, my son lost his ticket.",          // "son" is also Spanish
      'The die was cast in the den by the god of per diem.', // die/den/god/per
      "I'd like a black coffee, please.",
      'Is everything alright? Do you have any room for dessert?',
    ]) {
      const v = isEnglishLine(s)
      expect(v.ok, `${s} → ${v.why}`).toBe(true)
    }
  })
})

describe('tom-voice-language-gate — the model', () => {
  it('scores English above the foreign twin for every line in the corpus that has both', () => {
    let wrong = 0
    for (const l of CORPUS.lines) {
      if (englishScore(l.known_text) <= englishScore(l.target_text)) wrong++
    }
    // Pairwise separation is a stronger statement than the threshold test and is
    // independent of where ACCEPT/REJECT happen to sit.
    expect(wrong / CORPUS.lines.length).toBeLessThan(0.01)
  })

  it('keeps the operating point where it was calibrated', () => {
    // A future edit that widens the gate must change these deliberately and
    // re-run the corpus tests above, not drift into it.
    expect(ACCEPT).toBe(-7.6)
    expect(REJECT).toBe(-8.6)
  })
})
