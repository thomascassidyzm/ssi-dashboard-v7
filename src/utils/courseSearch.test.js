import { describe, it, expect } from 'vitest'
import {
  searchCourses,
  normalise,
  tokenise,
  boundedDistance,
  editBudget,
  RANK_EXACT_CODE,
  RANK_CODE_PREFIX,
  RANK_WORD_START,
  RANK_FUZZY,
  rankCourse,
} from './courseSearch'

// A slice of the real estate, with the names getCourseName() actually renders.
const COURSES = [
  { code: 'cym_n_for_eng', name: 'Welsh (North) for English Speakers' },
  { code: 'cym_s_for_eng', name: 'Welsh (South) for English Speakers' },
  { code: 'spa_for_eng', name: 'Spanish for English Speakers' },
  { code: 'spa_mx_for_eng', name: 'Spanish (Mexico) for English Speakers' },
  { code: 'fra_for_eng', name: 'French for English Speakers' },
  { code: 'deu_for_eng', name: 'German for English Speakers' },
  { code: 'eng_for_cym', name: 'English for Welsh Speakers' },
  { code: 'ara_sy_for_eng', name: 'Arabic (Syria) for English Speakers' },
]

const codes = (result) => result.map((c) => c.code)
const welshCourses = ['cym_n_for_eng', 'cym_s_for_eng']

describe('normalise / tokenise', () => {
  it('treats space, underscore and hyphen as one separator', () => {
    expect(normalise('cym_n_for_eng')).toBe('cym n for eng')
    expect(normalise('cym-n-for-eng')).toBe('cym n for eng')
    expect(normalise('  CYM N  ')).toBe('cym n')
  })

  it('strips parentheses and punctuation when tokenising a name', () => {
    expect(tokenise('Welsh (North) for English Speakers')).toEqual([
      'welsh',
      'north',
      'for',
      'english',
      'speakers',
    ])
  })

  it('does not throw on null or undefined', () => {
    expect(normalise(undefined)).toBe('')
    expect(normalise(null)).toBe('')
    expect(tokenise(undefined)).toEqual([])
  })
})

describe("Tom's headline failing example", () => {
  it('"cym " (with the trailing space) returns the Welsh courses', () => {
    const result = codes(searchCourses('cym ', COURSES))
    expect(result).toEqual(expect.arrayContaining(welshCourses))
    // Prefix-of-code beats a token hit elsewhere, so the cym_* courses lead.
    expect(result.slice(0, 2)).toEqual(welshCourses)
    expect(result).not.toContain('fra_for_eng')
  })
})

describe('separator equivalence', () => {
  it('"cym", "cym_", "cym-" and "cym " all return the same set', () => {
    const expected = codes(searchCourses('cym', COURSES))
    expect(expected.slice(0, 2)).toEqual(welshCourses)
    expect(codes(searchCourses('cym_', COURSES))).toEqual(expected)
    expect(codes(searchCourses('cym-', COURSES))).toEqual(expected)
    expect(codes(searchCourses('cym ', COURSES))).toEqual(expected)
  })
})

describe('matching on the display name', () => {
  it('"welsh" returns the Welsh courses by name', () => {
    const result = codes(searchCourses('welsh', COURSES))
    expect(result).toEqual(expect.arrayContaining(welshCourses))
    // eng_for_cym is "English for Welsh Speakers" — a legitimate name hit.
    expect(result).toContain('eng_for_cym')
    expect(result).not.toContain('fra_for_eng')
  })
})

describe('multi-token queries are conjunctive and order-free', () => {
  it('"welsh north" ranks cym_n_for_eng first', () => {
    const result = codes(searchCourses('welsh north', COURSES))
    expect(result[0]).toBe('cym_n_for_eng')
    expect(result).not.toContain('cym_s_for_eng')
  })

  it('"north welsh" does the same — token order is irrelevant', () => {
    expect(codes(searchCourses('north welsh', COURSES))).toEqual(
      codes(searchCourses('welsh north', COURSES))
    )
  })

  it('does not return every Welsh course plus everything northern', () => {
    expect(codes(searchCourses('welsh north', COURSES))).toEqual(['cym_n_for_eng'])
  })
})

describe('typo tolerance', () => {
  it('"welch" (typo) still reaches the Welsh courses', () => {
    const result = codes(searchCourses('welch', COURSES))
    expect(result).toEqual(expect.arrayContaining(welshCourses))
  })

  it('"wel" reaches them by prefix, without any fuzz', () => {
    expect(codes(searchCourses('wel', COURSES))).toEqual(
      expect.arrayContaining(welshCourses)
    )
  })

  it('short tokens get no fuzz — a 1-3 char token must match exactly or by prefix', () => {
    expect(editBudget('n')).toBe(0)
    expect(editBudget('spa')).toBe(0)
    expect(editBudget('welsh')).toBe(1)
    expect(editBudget('speakers')).toBe(2)
    // "fro" is one edit from "for", but 3 chars means no fuzz, so it matches nothing.
    expect(searchCourses('fro', COURSES)).toEqual([])
  })

  it('bounded distance abandons early instead of scoring unboundedly', () => {
    expect(boundedDistance('welch', 'welsh', 1)).toBe(1)
    expect(boundedDistance('welch', 'french', 1)).toBe(2) // = max + 1
    expect(boundedDistance('abc', 'abc', 0)).toBe(0)
  })
})

describe('whitespace handling', () => {
  it('"  spa  " behaves as "spa"', () => {
    expect(codes(searchCourses('  spa  ', COURSES))).toEqual(codes(searchCourses('spa', COURSES)))
    expect(codes(searchCourses('  spa  ', COURSES))[0]).toBe('spa_for_eng')
  })

  it('an empty query returns the full list', () => {
    expect(searchCourses('', COURSES)).toEqual(COURSES)
  })

  it('a whitespace-only query returns the full list', () => {
    expect(searchCourses('   ', COURSES)).toEqual(COURSES)
    expect(searchCourses('_-_', COURSES)).toEqual(COURSES)
  })
})

describe('robustness', () => {
  it('a course object with name undefined does not throw', () => {
    const list = [{ code: 'cym_n_for_eng' }, { code: 'spa_for_eng', name: undefined }]
    expect(() => searchCourses('cym ', list)).not.toThrow()
    expect(codes(searchCourses('cym ', list))).toEqual(['cym_n_for_eng'])
  })

  it('falls back to getName when the object carries no name', () => {
    const list = [{ code: 'cym_n_for_eng' }]
    const getName = () => 'Welsh (North) for English Speakers'
    expect(codes(searchCourses('north', list, { getName }))).toEqual(['cym_n_for_eng'])
    // Without the resolver, a name-only query finds nothing rather than throwing.
    expect(searchCourses('north', list)).toEqual([])
  })

  it('survives a getName that throws, and a non-array course list', () => {
    const list = [{ code: 'cym_n_for_eng' }]
    const boom = () => {
      throw new Error('nope')
    }
    expect(() => searchCourses('cym', list, { getName: boom })).not.toThrow()
    expect(searchCourses('cym', null)).toEqual([])
  })
})

describe('ranking bands', () => {
  it('exact > code-prefix > word-start > fuzzy', () => {
    expect(rankCourse({ code: 'spa_for_eng' }, 'spa for eng')).toBe(RANK_EXACT_CODE)
    expect(rankCourse({ code: 'spa_for_eng' }, 'spa')).toBe(RANK_CODE_PREFIX)
    expect(
      rankCourse({ code: 'cym_n_for_eng', name: 'Welsh (North) for English Speakers' }, 'welsh')
    ).toBe(RANK_WORD_START)
    expect(
      rankCourse({ code: 'cym_n_for_eng', name: 'Welsh (North) for English Speakers' }, 'welch')
    ).toBe(RANK_FUZZY)
    expect(RANK_EXACT_CODE).toBeLessThan(RANK_CODE_PREFIX)
    expect(RANK_CODE_PREFIX).toBeLessThan(RANK_WORD_START)
    expect(RANK_WORD_START).toBeLessThan(RANK_FUZZY)
  })

  it('an exact code match sorts above a prefix match of the same query', () => {
    const list = [
      { code: 'spa_mx_for_eng', name: 'Spanish (Mexico) for English Speakers' },
      { code: 'spa_for_eng', name: 'Spanish for English Speakers' },
    ]
    expect(codes(searchCourses('spa_for_eng', list))[0]).toBe('spa_for_eng')
  })

  it('a real prefix hit outranks a typo hit', () => {
    const result = codes(searchCourses('spa', COURSES))
    expect(result.slice(0, 2)).toEqual(['spa_for_eng', 'spa_mx_for_eng'])
  })

  it('within a band, the earliest match wins — the language you typed leads', () => {
    // Both are word-start hits on "welsh"; the course ABOUT Welsh must come
    // first, not the one that merely teaches something to Welsh speakers.
    const list = [
      { code: 'ara_for_cym', name: 'Arabic for Welsh Speakers' },
      { code: 'cym_for_yor', name: 'Welsh for Yoruba Speakers' },
    ]
    expect(codes(searchCourses('welsh', list))).toEqual(['cym_for_yor', 'ara_for_cym'])
  })

  it('a hit in the code outranks a hit of the same band in the name', () => {
    const list = [
      { code: 'deu_for_eng', name: 'German for English Speakers' },
      { code: 'eng_for_deu', name: 'English for German Speakers' },
    ]
    expect(codes(searchCourses('eng', list))[0]).toBe('eng_for_deu')
  })

  it('sorts deterministically within a band: shorter code, then alphabetical', () => {
    const list = [
      { code: 'zzz_for_eng', name: 'Zzz for English Speakers' },
      { code: 'aaa_for_eng', name: 'Aaa for English Speakers' },
      { code: 'bb_for_eng', name: 'Bb for English Speakers' },
    ]
    expect(codes(searchCourses('english', list))).toEqual([
      'bb_for_eng',
      'aaa_for_eng',
      'zzz_for_eng',
    ])
  })
})
