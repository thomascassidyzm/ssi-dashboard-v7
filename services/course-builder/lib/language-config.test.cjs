/**
 * language-config: the name a course's {target} placeholder becomes in seed text.
 *
 * Run: npx vitest run services/course-builder/lib/language-config
 */
import { describe, it, expect } from 'vitest'

const { getLanguageName } = require('./language-config.cjs')

describe('getLanguageName', () => {
  it('fry_for_eng says "Frisian", never the raw ISO code (seed 1: "I want to speak {target}")', () => {
    expect(getLanguageName('fry_for_eng')).toBe('Frisian')
  })
})
