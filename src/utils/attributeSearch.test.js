import { describe, it, expect } from 'vitest'
import { fold, filterByAttributes } from './attributeSearch'

// A slice of the real Cartesia catalogue as the Voice Lab builds its haystacks.
const VOICES = [
  { label: 'Skylar', haystack: 'Skylar cartesia female general american en-US US friendly guide Approachable American female' },
  { label: 'Fraser', haystack: 'Fraser cartesia male australian en-AU AU trusted communicator' },
  { label: 'Grace', haystack: 'Grace cartesia female australian en-AU AU helpful hand' },
  { label: 'Élodie', haystack: 'Élodie cartesia female parisian fr-FR FR warm narrator' },
  { label: 'Tom_003', haystack: "Tom_003 cartesia clone this estate's clone" },
]
const names = (q) => filterByAttributes(VOICES, q).map((v) => v.label)

describe('attribute search', () => {
  it('matches across every attribute, not just the name', () => {
    expect(names('australian')).toEqual(['Fraser', 'Grace'])
    expect(names('cartesia')).toHaveLength(5)
  })

  it('narrows as terms are added', () => {
    expect(names('australian male')).toEqual(['Fraser'])
    expect(names('australian female')).toEqual(['Grace'])
  })

  // The bug this rule exists for: "male" is a substring of "female", so a plain
  // includes() returned both Australians for "australian male".
  it('does not let "male" match "female"', () => {
    expect(names('male')).toEqual(['Fraser'])
  })

  it('is forgiving about partial words and case', () => {
    expect(names('AUS')).toEqual(['Fraser', 'Grace'])
    expect(names('paris')).toEqual(['Élodie'])
  })

  it('folds diacritics both ways', () => {
    expect(names('elodie')).toEqual(['Élodie'])
    expect(fold('Élodie')).toBe('elodie')
  })

  it('returns everything for an empty query, and nothing for a miss', () => {
    expect(filterByAttributes(VOICES, '   ')).toHaveLength(5)
    expect(names('austrian')).toEqual([])
  })
})
