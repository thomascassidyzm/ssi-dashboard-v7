/**
 * The speaker-gender detector's mechanical checks (#883·H). No CLI is called here.
 * Run: npx vitest run services/known-gender/detect-known-speaker-gender
 */
import { describe, it, expect } from 'vitest'
const d = require('./detect-known-speaker-gender.cjs')

describe('verifyAnswer believes only what it can check', () => {
  it('accepts a pair where the input is one form and word counts agree', () => {
    expect(d.verifyAnswer('मैं चाहता हूँ', 'मैं चाहता हूँ', 'मैं चाहती हूँ')).toEqual({ status: 'gendered', m: 'मैं चाहता हूँ', f: 'मैं चाहती हूँ' })
    expect(d.verifyAnswer('sono stanca', 'sono stanco', 'sono stanca').status).toBe('gendered')
  })
  it('treats identical forms as neutral, keeping the original text', () => {
    expect(d.verifyAnswer('आपके साथ', 'आपके साथ', 'आपके साथ')).toEqual({ status: 'neutral', m: 'आपके साथ', f: 'आपके साथ' })
  })
  it('refuses a "neutral" answer that rewrote the line', () => {
    expect(d.verifyAnswer('आपके साथ', 'आप के साथ', 'आप के साथ').status).toBe('unverified')
  })
  it('refuses a pair where neither form is the input (the model rewrote it)', () => {
    expect(d.verifyAnswer('मैं चाहता हूँ।', 'मैं चाहता हूं', 'मैं चाहती हूं').status).toBe('unverified')
  })
  it('refuses a pair whose forms differ in word count', () => {
    expect(d.verifyAnswer('मैं चाहता हूँ', 'मैं चाहता हूँ', 'मैं यह चाहती हूँ').status).toBe('unverified')
  })
  it('refuses missing forms', () => {
    expect(d.verifyAnswer('x y', undefined, 'x y').status).toBe('unverified')
  })
})

describe('the prompt is about the SPEAKER only', () => {
  it('names the language, forbids listener and third-person changes, demands byte-identical input form', () => {
    const p = d.buildSpeakerGenderPrompt(['मैं चाहता हूँ', 'क्या आप थकी हुई हैं?'], 'Hindi')
    expect(p).toContain('Hindi')
    expect(p).toMatch(/LISTENER/)
    expect(p).toMatch(/THIRD PERSON/)
    expect(p).toMatch(/byte-identical/)
    expect(p).toContain('1. मैं चाहता हूँ')
    expect(p).toContain('2. क्या आप थकी हुई हैं?')
  })
  it('parses JSON inside prose or fences', () => {
    expect(d.parseJson('Here you go:\n```json\n{"results":[{"i":1,"m":"a","f":"b"}]}\n```')).toEqual({ results: [{ i: 1, m: 'a', f: 'b' }] })
    expect(d.parseJson('no json')).toBeNull()
  })
})

describe('toKnownPairRows', () => {
  it('emits one known-side row per gendered text and nothing for neutral/unverified', () => {
    const rows = d.toKnownPairRows('eng_for_hin', 'hin', [
      { text: 'मैं चाहता हूँ', status: 'gendered', m: 'मैं चाहता हूँ', f: 'मैं चाहती हूँ' },
      { text: 'मैं चाहता हूँ', status: 'gendered', m: 'मैं चाहता हूँ', f: 'मैं चाहती हूँ' },
      { text: 'अब', status: 'neutral', m: 'अब', f: 'अब' },
      { text: '???', status: 'unverified' },
    ])
    expect(rows).toEqual([{ course_code: 'eng_for_hin', original_text: 'मैं चाहता हूँ', language: 'hin', expanded_m: 'मैं चाहता हूँ', expanded_f: 'मैं चाहती हूँ', text_side: 'known' }])
  })
})
