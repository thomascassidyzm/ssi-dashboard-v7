// The judge of the elision census: is the elided HEAD heard before its tail?
// Run: npx vitest run tools/course-optimization/ita-elision-census-2026-09-29.test.cjs
import { describe, it, expect } from 'vitest'
const { missingElisions } = require('./ita-elision-census-2026-09-29.cjs')

describe('missingElisions', () => {
  it("flags the swallowed head Kai heard: 'ha detto altro' for qualcos'altro", () => {
    expect(missingElisions("ha detto qualcos'altro?", 'Ha detto altro.')).toEqual(["qualcos'altro"])
  })
  it('accepts whisper spelling the elision closed, spaced or with the apostrophe', () => {
    for (const heard of ["Ha detto qualcos'altro!", 'ha detto qualcosaltro', 'ha detto qualcos altro']) {
      expect(missingElisions("ha detto qualcos'altro?", heard)).toEqual([])
    }
  })
  it("accepts dov'è heard as 'dove è' and c'è with the accent dropped", () => {
    expect(missingElisions("dov'è l'uomo?", "Dove è l'uomo?")).toEqual([])
    expect(missingElisions("c'è un'altra cosa", "c'e un'altra cosa")).toEqual([])
  })
  it('names every missing token and only those', () => {
    expect(missingElisions("c'è l'uomo all'aperto", 'uomo all aperto')).toEqual(["c'è", "l'uomo"])
  })
})
