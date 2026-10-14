import { describe, it, expect } from 'vitest'
import plan from './tom006-intros-plan.cjs'
import policy from '../../services/shared/voicing-policy.cjs'
const { defaultRange, langName, newText } = plan
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const SEVEN = ['spa_mx_for_eng', 'zho_for_eng', 'ara_for_eng', 'por_for_eng', 'por_br_for_eng', 'kor_for_eng', 'jpn_for_eng']
const ELEVEN = ['fra_for_eng', 'spa_for_eng', 'deu_for_eng', 'ita_for_eng', ...SEVEN]

describe('Tom-006 intro plan (job #836)', () => {
  it('seeds 1-100 of deu/spa/fra/ita belong to #794; the other seven run 1-668', () => {
    for (const c of ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng']) expect(defaultRange(c)).toEqual({ from: 101, to: 668 })
    for (const c of SEVEN) expect(defaultRange(c)).toEqual({ from: 1, to: 668 })
  })
  it('intro language is the BASE language name', () => {
    expect(Object.fromEntries(['spa', 'zho', 'ara', 'por', 'kor', 'jpn'].map(l => [l, langName(l)]))).toEqual({ spa: 'Spanish', zho: 'Chinese', ara: 'Arabic', por: 'Portuguese', kor: 'Korean', jpn: 'Japanese' })
  })
  it('as-in is kept at score 3-5, stripped at 1-2 and unscored; hand-written text keeps its words plus the break', () => {
    const old = `The Chinese for: 'seem', as in — 'she said she does not want to seem unfriendly', is:`
    expect(newText(old, 'Chinese', 4).text).toBe(`The Chinese for: 'seem', as in — 'she said she does not want to seem unfriendly', is: <break time="300ms"/>`)
    expect(newText(old, 'Chinese', 2).text).toBe(`The Chinese for: 'seem', is: <break time="300ms"/>`)
    expect(newText(old, 'Chinese', null).text).toBe(`The Chinese for: 'seem', is: <break time="300ms"/>`)
    expect(newText('The Spanish for - hello there, is:', 'Spanish', null)).toMatchObject({ hand: true, text: 'The Spanish for - hello there, is: <break time="300ms"/>' })
    expect(newText('Something else', 'Spanish', null)).toBeNull()
  })
})

describe('Tom-006 whole intros are allowed for all eleven premium X_for_eng courses (presentation only)', () => {
  it('each course renders the whole intro in Tom-006; a non-listed course is still refused', () => {
    for (const code of ELEVEN) {
      const tl = code.split('_')[0]; const course = { course_code: code, known_lang: 'eng', target_lang: tl, voice_pool_key: code.replace('_for_eng', '') }
      const text = `The ${langName(tl)} for: 'I want', is: <break time="300ms"/>`
      expect(policy.checkRender({ text, language: 'eng', voiceId: T6, course, role: 'presentation' }).allowed, code).toBe(true)
    }
    expect(policy.checkRender({ text: `The Hindi for: 'I want', is: <break time="300ms"/>`, language: 'eng', voiceId: T6, course: { course_code: 'hin_for_eng', known_lang: 'eng', target_lang: 'hin' }, role: 'presentation' }).allowed).toBe(false)
  })
})
