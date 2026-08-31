/**
 * The sample picker's two pure decisions — which course, and which line.
 *
 * Both were WRONG on real data the first time they ran, which is why they are
 * tested rather than trusted: the picker offered German an Austrian line and
 * Welsh a Yoruba-known one because those courses were biggest, and it returned
 * nothing at all for Chinese because a 25-character floor is a fact about Latin
 * script and not about how long a sentence takes to say.
 */
import { describe, it, expect } from 'vitest'
import samples from './samples.cjs'

const { chooseFrom, preferCourses, isRenderable } = samples

const line = (text, order = 1) => ({ text, knownText: '', order })

describe('preferCourses — which course the line comes from', () => {
  const courses = [
    { course_code: 'deu_at_for_eng', known_lang: 'eng', seed_count: 900 },
    { course_code: 'deu_for_zho', known_lang: 'zho', seed_count: 400 },
    { course_code: 'deu_for_eng', known_lang: 'eng', seed_count: 300 },
    { course_code: 'deu_for_cym', known_lang: 'cym', seed_count: 0 },
  ]

  it('prefers the plain language over a regional variant, however big', () => {
    expect(preferCourses(courses, 'deu')[0].course_code).toBe('deu_for_eng')
  })

  it('drops courses with no seeds — there is nothing to pick from', () => {
    expect(preferCourses(courses, 'deu').map((c) => c.course_code)).not.toContain('deu_for_cym')
  })

  it('falls back to the biggest when nothing is plainer', () => {
    const only = [
      { course_code: 'cym_s_for_eng', known_lang: 'eng', seed_count: 100 },
      { course_code: 'cym_n_for_eng', known_lang: 'eng', seed_count: 900 },
    ]
    expect(preferCourses(only, 'cym')[0].course_code).toBe('cym_n_for_eng')
  })

  it('is a total order — same input, same answer, every time', () => {
    const a = preferCourses(courses, 'deu').map((c) => c.course_code)
    const b = preferCourses([...courses].reverse(), 'deu').map((c) => c.course_code)
    expect(a).toEqual(b)
  })
})

describe('chooseFrom — which line, in any script', () => {
  it('picks the line nearest the corpus median', () => {
    const rows = [line('a'.repeat(10), 1), line('b'.repeat(40), 2), line('c'.repeat(120), 3)]
    expect(chooseFrom(rows).text.length).toBe(40)
  })

  it('WORKS FOR CHINESE — the bug that made this file exist', () => {
    const rows = [
      line('我不想猜', 1),
      line('我不想猜明天会发生什么', 2),
      line('我不想猜明天会发生什么事情因为那没有意义', 3),
    ]
    expect(chooseFrom(rows).text).toBe('我不想猜明天会发生什么')
  })

  it('refuses lines with brackets, quotes or digits — they read oddly out of context', () => {
    const rows = [line('a normal sentence of ordinary length here', 1), line('a sentence (with an aside) in it too', 2)]
    expect(chooseFrom(rows).text).not.toContain('(')
  })

  it('returns null rather than a bad line when there is nothing usable', () => {
    expect(chooseFrom([line('x'), line('(1)')])).toBe(null)
  })

  it('is deterministic — ties break on the seed order, not on input order', () => {
    const rows = [line('aaaaaaaaaaaaaaaaaaaa', 7), line('bbbbbbbbbbbbbbbbbbbb', 2)]
    expect(chooseFrom(rows).order).toBe(2)
    expect(chooseFrom([...rows].reverse()).order).toBe(2)
  })
})

describe('isRenderable — this lab renders Cartesia and nothing else', () => {
  it('accepts a Cartesia voice', () => {
    expect(isRenderable('cartesia_3597a26f-80ef-4bd5-8101-9699bc764917')).toBe(true)
  })

  it('refuses an Azure voice and a human recordist, which are castable but not renderable here', () => {
    expect(isRenderable('azure_es-ES-TrianaNeural')).toBe(false)
    expect(isRenderable('human_spa_for_eng_target1')).toBe(false)
  })
})
