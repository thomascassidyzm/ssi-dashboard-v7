import { describe, it, expect } from 'vitest'
import { languageName, courseName, courseNameWithCode } from './languageNames'

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
