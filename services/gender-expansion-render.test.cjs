/**
 * Hand-added gender expansion rows are SPOKEN on every render route, whatever the
 * language (job #884, 2026-09-23).
 *
 * The report that started this: Charlotte (eng_for_hin target1, female) "says his
 * name" — 14 clips with "his name" in course_audio.text. The phase8 log for the
 * 2026-09-23 11:00Z render shows 12 of them went to TTS as "her name"; the text
 * column holds the ORIGINAL text by design, because it is the lookup key. The
 * other 2 have no expansion row at all. GENDERED_LANGUAGES was never involved: it
 * gates only the Haiku expander, never the render-time substitution tested here.
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')
const { loadGenderMap, storedGenderReading, GENDERED_LANGUAGES } = require('./gender-haiku-service.cjs')

function supabaseWith(rows) {
  const q = { select: () => q, eq: () => Promise.resolve({ data: rows, error: null }) }
  return { from: () => q }
}

const ENG_FOR_HIN_ROW = {
  original_text: 'I know his name',
  language: 'eng',
  expanded_f: 'I know her name',
  expanded_m: 'I know his name',
}

describe('stored gender readings', () => {
  it('eng_for_hin: target1 (Charlotte) speaks "her name", target2 speaks "his name"', async () => {
    const map = await loadGenderMap('eng_for_hin', supabaseWith([ENG_FOR_HIN_ROW]))
    expect(storedGenderReading(map, 'I know his name', 'eng', 'target1')).toBe('I know her name')
    expect(storedGenderReading(map, 'I know his name', 'eng', 'target2')).toBe('I know his name')
  })

  it('applies regardless of the language list — eng is not gendered and must not need to be', async () => {
    expect(GENDERED_LANGUAGES).not.toContain('eng')
    const map = await loadGenderMap('eng_for_hin', supabaseWith([ENG_FOR_HIN_ROW]))
    expect(storedGenderReading(map, 'I know his name', 'eng', 'target1')).toBe('I know her name')
  })

  it('no row → null, so the clip speaks its own text (the 2 uncovered "his name" lines)', async () => {
    const map = await loadGenderMap('eng_for_hin', supabaseWith([ENG_FOR_HIN_ROW]))
    expect(storedGenderReading(map, 'I know his name now', 'eng', 'target1')).toBeNull()
    expect(storedGenderReading(map, 'I know his name', 'eng', 'known')).toBeNull()
  })
})

describe('every phase8 route that renders target1/target2 resolves through storedGenderReading', () => {
  const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
  const routes = src.split(/\napp\.post\(/).slice(1)
  const routeName = r => r.slice(0, r.indexOf(','))
  const TARGET_RENDER_ROUTES = [
    '/generate/', '/regenerate-role/', '/regenerate-single/',
    '/regenerate-phrase/', '/regenerate-lego/', '/generate-components/',
  ]

  for (const name of TARGET_RENDER_ROUTES) {
    it(name, () => {
      const body = routes.find(r => routeName(r).startsWith(`'${name}`))
      expect(body, `route ${name} not found`).toBeTruthy()
      expect(body).toContain('storedGenderReading(')
    })
  }

  it('no route builds the gender key inline (one key shape, one place)', () => {
    expect(src).not.toMatch(/genderMap\.get\(|gmap\.get\(/)
  })
})
