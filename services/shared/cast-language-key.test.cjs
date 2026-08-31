/**
 * The cast key is the dialect entity, not the base language.
 *
 * Tom's ruling, 2026-08-31. Every case below is a REAL estate row: the shapes
 * that made a cast on 'deu' reach the Austrian course are exactly the shapes
 * that must now split, and the shapes that were never regional must be
 * byte-identical to what they were.
 */
import { describe, it, expect } from 'vitest'
import pkg from './cast-language-key.cjs'
const {
  targetCastKey, knownCastKey, castKeyForCourse, baseLanguageOfCastKey,
  isDialectCastKey, castKeySource, targetCastEntities,
} = pkg

const course = (over) => ({ course_code: 'x_for_eng', known_lang: 'eng', target_lang: 'x', voice_pool_key: null, dialect: 'standard', ...over })

describe('the explicit ruling wins', () => {
  it('reads courses.voice_pool_key', () => {
    expect(targetCastKey(course({ course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: 'deu_at' }))).toBe('deu_at')
    expect(targetCastKey(course({ course_code: 'spa_mx_for_eng', target_lang: 'spa', voice_pool_key: 'spa_mx' }))).toBe('spa_mx')
  })
  it('is case- and whitespace-insensitive', () => {
    expect(targetCastKey(course({ target_lang: 'deu', voice_pool_key: ' DEU_AT ' }))).toBe('deu_at')
  })
  it('ignores a malformed key rather than making a language out of a typo', () => {
    expect(targetCastKey(course({ target_lang: 'deu', voice_pool_key: 'nope nope nope' }))).toBe('deu')
  })
})

describe('a stated dialect is its own language', () => {
  it('keys Northern Welsh apart from Welsh', () => {
    expect(targetCastKey(course({ course_code: 'cym_n_for_eng', target_lang: 'cym', dialect: 'north' }))).toBe('cym_north')
    expect(targetCastKey(course({ course_code: 'cym_s_for_eng', target_lang: 'cym', dialect: 'south' }))).toBe('cym_south')
  })
  it('gives the two Northern Welsh courses ONE key — same dialect, same voices', () => {
    const a = targetCastKey(course({ course_code: 'cym_n_for_eng', target_lang: 'cym', dialect: 'north' }))
    const b = targetCastKey(course({ course_code: 'cym_nnew_for_eng', target_lang: 'cym', dialect: 'north' }))
    expect(a).toBe(b)
  })
  it('keys the three Irish dialects apart', () => {
    const keys = ['connemara', 'munster', 'ulster'].map((d) => targetCastKey(course({ target_lang: 'gle', dialect: d })))
    expect(new Set(keys).size).toBe(3)
    expect(keys).toEqual(['gle_connemara', 'gle_munster', 'gle_ulster'])
  })
})

describe('nothing stated, nothing changed', () => {
  it('a plain course keys on its base language exactly as before', () => {
    expect(targetCastKey(course({ course_code: 'fra_for_eng', target_lang: 'fra' }))).toBe('fra')
    expect(targetCastKey(course({ course_code: 'deu_for_eng', target_lang: 'deu' }))).toBe('deu')
  })
  it('treats a missing dialect column as standard', () => {
    expect(targetCastKey({ target_lang: 'fra' })).toBe('fra')
  })
  it('never reads the course code — a regional code with no column stated keys on its parent, visibly', () => {
    // deu_ch_for_eng as it stands on 2026-08-31: a Swiss course stating nothing.
    // This is a DATA gap and it is reported as one; guessing from the code here
    // would also make languages out of cym_anthem_for_jpn and zzz_test2_for_eng.
    expect(targetCastKey(course({ course_code: 'deu_ch_for_eng', target_lang: 'deu' }))).toBe('deu')
    expect(targetCastKey(course({ course_code: 'cym_anthem_for_jpn', target_lang: 'cym' }))).toBe('cym')
  })
})

describe('the known side', () => {
  it('keys on known_lang, and nothing regional is invented there', () => {
    expect(knownCastKey(course({ known_lang: 'eng', voice_pool_key: 'deu_at', dialect: 'north' }))).toBe('eng')
    expect(castKeyForCourse(course({ known_lang: 'jpn' }), 'known')).toBe('jpn')
  })
})

describe('base language and provenance', () => {
  it('finds the base a provider knows about', () => {
    expect(baseLanguageOfCastKey('deu_at')).toBe('deu')
    expect(baseLanguageOfCastKey('cym_north')).toBe('cym')
    expect(baseLanguageOfCastKey('fra')).toBe('fra')
  })
  it('knows which rows are dialects', () => {
    expect(isDialectCastKey('deu_at')).toBe(true)
    expect(isDialectCastKey('deu')).toBe(false)
  })
  it('says which column stated it', () => {
    expect(castKeySource(course({ target_lang: 'deu', voice_pool_key: 'deu_at' }))).toBe('voice_pool_key')
    expect(castKeySource(course({ target_lang: 'cym', dialect: 'north' }))).toBe('dialect')
    expect(castKeySource(course({ target_lang: 'fra' }))).toBe(null)
  })
})

describe('the entity list the Voice Lab is built from', () => {
  it('splits a language from its dialects and keeps each entity\'s own courses', () => {
    const rows = [
      course({ course_code: 'deu_for_eng', target_lang: 'deu' }),
      course({ course_code: 'deu_for_jpn', target_lang: 'deu' }),
      course({ course_code: 'deu_at_for_eng', target_lang: 'deu', voice_pool_key: 'deu_at' }),
    ]
    const e = targetCastEntities(rows)
    expect([...e.keys()].sort()).toEqual(['deu', 'deu_at'])
    expect(e.get('deu').courses.map((c) => c.course_code)).toEqual(['deu_for_eng', 'deu_for_jpn'])
    expect(e.get('deu_at').courses.map((c) => c.course_code)).toEqual(['deu_at_for_eng'])
    expect(e.get('deu_at').base).toBe('deu')
    expect(e.get('deu_at').source).toBe('voice_pool_key')
  })
})
