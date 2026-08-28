import { describe, it, expect } from 'vitest'
import { languageName, courseName, courseNameWithCode, courseLangs, compareCourseCodes, sortCourses } from './languageNames'

// The complaint that started this: Popty showed the Pennsylvania Dutch course
// as "PDC for English Speakers" to the volunteers checking it.
describe('the language a code stands for', () => {
  it('names Pennsylvania Dutch', () => {
    expect(languageName('pdc')).toBe('Pennsylvania Dutch')
    expect(courseName('pdc_for_eng')).toBe('Pennsylvania Dutch for English Speakers')
  })

  it('keeps the house name where the browser would say something else', () => {
    // ICU: "Pennsylvania German", "Hakka Chinese", "Min Nan Chinese".
    expect(languageName('hak')).toBe('Hakka')
    expect(languageName('nan')).toBe('Taiwanese Hokkien')
  })

  it('uses the learner app\'s own words for the languages it names', () => {
    expect(languageName('cym')).toBe('Welsh')
    expect(languageName('cym_n')).toBe('Welsh (North)')
    expect(languageName('nob')).toBe('Norwegian (Bokmål)')
    expect(languageName('eus')).toBe('Basque')
  })

  it('tells the four Arabics and the two Portugueses apart', () => {
    expect(languageName('ara')).toBe('Arabic')
    expect(languageName('ara_eg')).toBe('Egyptian Arabic')
    expect(languageName('ara_lb')).toBe('Lebanese Arabic')
    expect(languageName('ara_sy')).toBe('Syrian Arabic')
    expect(languageName('por')).toBe('Portuguese')
    expect(languageName('por_br')).toBe('Brazilian Portuguese')
  })

  it('falls back to the base language for an uncurated regional code', () => {
    expect(languageName('ara_ma')).toBe('Arabic')
  })

  it('hands back a code it has never met, rather than nothing', () => {
    expect(languageName('zzz_test')).toBe('zzz_test')
    expect(languageName('')).toBe('')
    expect(languageName(null)).toBe('')
  })
})

describe('the course a code stands for', () => {
  it('names both sides', () => {
    expect(courseName('cym_s_for_eng')).toBe('Welsh (South) for English Speakers')
    expect(courseName('eng_for_mar')).toBe('English for Marathi Speakers')
    expect(courseName('zho_for_gle')).toBe('Chinese for Irish Speakers')
  })

  it('leaves anything that is not a course code alone', () => {
    expect(courseName('eng_template')).toBe('eng_template')
    expect(courseName(null)).toBe('')
  })

  it('keeps the identifier alongside the name when a builder needs both', () => {
    expect(courseNameWithCode('pdc_for_eng'))
      .toBe('Pennsylvania Dutch for English Speakers (pdc_for_eng)')
    expect(courseNameWithCode('eng_template')).toBe('eng_template')
  })
})


describe('course ordering', () => {
  it('splits a code on _for_, so a regional target survives', () => {
    expect(courseLangs('ara_eg_for_eng')).toEqual({ target: 'ara_eg', known: 'eng' })
    expect(courseLangs('eng_template')).toEqual({ target: 'eng_template', known: '' })
  })

  it('orders by TARGET NAME, not by code — Chinese before Cornish before Welsh', () => {
    const out = sortCourses(
      [{ code: 'cym_for_eng' }, { code: 'zho_for_eng' }, { code: 'cor_for_eng' }]
    ).map((c) => c.code)
    expect(out).toEqual(['zho_for_eng', 'cor_for_eng', 'cym_for_eng'])
  })

  it('groups one target together and orders the knowns inside it', () => {
    const out = sortCourses(
      [{ code: 'kor_for_tam' }, { code: 'kor_for_eng' }, { code: 'kor_for_hin' }]
    ).map((c) => c.code)
    expect(out).toEqual(['kor_for_eng', 'kor_for_hin', 'kor_for_tam'])
  })

  it('reads course_code as well as code, and does not mutate its input', () => {
    const list = [{ course_code: 'spa_for_eng' }, { course_code: 'deu_for_eng' }]
    expect(sortCourses(list).map((c) => c.course_code)).toEqual(['deu_for_eng', 'spa_for_eng'])
    expect(list[0].course_code).toBe('spa_for_eng')
  })

  it('is a total order — equal names fall back to the code', () => {
    expect(compareCourseCodes('fra_for_eng', 'fra_for_eng')).toBe(0)
    expect(compareCourseCodes('aaa_x', 'aaa_x')).toBe(0)
  })
})
