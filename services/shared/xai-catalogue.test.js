// Unit test for the xAI voice-catalogue helper (2026-08-06): XAI_OFFICIAL
// must read tools/pod-voices-xai.json rather than restate it, so da/fi/sv-SE/th
// (declared in the catalogue but missing from the old hard-coded 17-language
// list) route to xAI correctly.
// Run: npx vitest run services/shared/xai-catalogue.test.js
import { describe, it, expect } from 'vitest'
import { XAI_OFFICIAL } from './xai-catalogue.cjs'
import catalogue from '../../tools/pod-voices-xai.json' with { type: 'json' }

describe('XAI_OFFICIAL', () => {
  const catalogueLanguages = new Set(
    Object.keys(catalogue).filter((k) => k !== 'multilingual').map((k) => k.toLowerCase().split('-')[0])
  )

  it('returns exactly the catalogue languages (minus the multilingual pool)', () => {
    expect(XAI_OFFICIAL).toEqual(catalogueLanguages)
  })

  it('includes the four previously-missing languages', () => {
    expect(XAI_OFFICIAL.has('da')).toBe(true)
    expect(XAI_OFFICIAL.has('fi')).toBe(true)
    expect(XAI_OFFICIAL.has('sv')).toBe(true) // sv-SE in the catalogue, base-language 'sv' here
    expect(XAI_OFFICIAL.has('th')).toBe(true)
  })
})
