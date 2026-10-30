/**
 * Tom 2026-10-16/25: "Tom-006 is default voice for English known language" — Sonia is never a default.
 * The two presentation-prep handlers used to fall to a 'azure_en-GB-SoniaNeural' literal when a course held no
 * presentation voice; they now go through presentation-author.resolvePresentationVoiceId.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import pa from './presentation-author.cjs'

describe('presentation voice never defaults to Sonia for English known', () => {
  it('phase8 holds no Sonia fallback literal in its presentation prep', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phase8-audio-v13.cjs'), 'utf8')
    expect(src).not.toMatch(/voiceConfig\.presentation \|\| 'azure_en-GB-SoniaNeural'/)
  })
  it('an English-known course with an empty voice_config resolves to the English presentation voice', () => {
    expect(pa.resolvePresentationVoiceId({ known_lang: 'eng', voice_config: {} })).not.toMatch(/Sonia/)
  })
})
