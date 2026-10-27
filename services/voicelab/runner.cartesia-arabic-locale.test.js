// A Cartesia audition in Arabic must be steered with a locale Cartesia accepts (job #158).
// The lab fell back to the Azure locale 'ar-EG', which Cartesia refuses outright
// ("unsupported locale 'ar-EG'"), so every Arabic Cartesia audition failed with a 400.
// The course render path already sends bare 'ar' (voice-discovery-service toBcp47).
import { describe, it, expect } from 'vitest'
import runner from './runner.cjs'
import params from './params.cjs'

describe('voicelab Cartesia steer for Arabic', () => {
  it('sends Cartesia "ar", not the Azure locale', () => {
    const lang = params.findLanguage('ara')
    const c = runner.providerConfig({ provider: 'cartesia', voiceId: 'abc', language: 'ara', speed: 1 }, lang)
    expect(c.locale).toBe('ar')
    expect(lang.azureLocale).toBe('ar-EG') // Azure keeps its own locale
  })
})
