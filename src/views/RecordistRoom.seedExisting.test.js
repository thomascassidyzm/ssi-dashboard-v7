import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

// Aran recorded 305 already-released North Welsh seeds believing they were new.
// The room must name them apart. (Source-level check: the section list and the
// stage words are module-local to the SFC.)
const src = readFileSync(new URL('./RecordistRoom.vue', import.meta.url), 'utf8')

describe('RecordistRoom: seeds already in the course', () => {
  it('has its own section, distinct from NEW SEEDS, in plain words', () => {
    expect(src).toMatch(/key: 'seedexisting', heading: 'Whole sentences — seeds already in the course'/)
    expect(src).toMatch(/key: 'seed', heading: 'NEW SEEDS'/)
  })
  it('routes a released seed to that section and anything else to its kind', () => {
    expect(src).toMatch(/kind === 'seed' && l\.seedExisting \? 'seedexisting' : kind/)
  })
})
