// The five "I'm learning <language>" lines (33, 94, 95, 221, 226) of a canonical 231 pod.
// Job #952: a pod built from a sibling can name the WRONG language at a learner, so the gate
// refuses a placeholder, a blank, a line that misses this course's name, and a line identical to a
// sibling that teaches a different language — at the builder and at BOTH promotion doors.
import { describe, it, expect } from 'vitest'

const {
  LANGUAGE_NAME_LINES, languageNameFor, splitCourse, checkLanguageNameLines, nameLineProblemsForRows,
} = require('./pod-language-names.cjs')
const { readinessBlockers } = require('./pod-switchover.cjs')
const { promotionBlockers } = require('./promote-pod.cjs')

const five = (name) => Object.fromEntries(LANGUAGE_NAME_LINES.map(g => [g, `Line ${g}: I'm learning ${name}.`]))

describe('lookup', () => {
  it('knows dialects by the course code', () => {
    expect(languageNameFor('ara_eg_for_eng')).toBe('Egyptian Arabic')
    expect(languageNameFor('fra_ca_for_eng')).toBe('Canadian French')
    expect(languageNameFor('spa_mx_for_eng')).toBe('Mexican Spanish')
    expect(languageNameFor('eng_for_spa')).toBe('inglés')
    expect(languageNameFor('xxx_for_eng')).toBeNull()
  })
  it('parses one-letter dialect keys', () => expect(splitCourse('cym_n_for_eng')).toEqual({ targetKey: 'cym_n', knownLang: 'eng' }))
})

describe('gate', () => {
  const ok = { course: 'ara_eg_for_eng', lines: five('Egyptian Arabic') }
  it('passes a pod that names its own language', () => expect(checkLanguageNameLines(ok)).toEqual([]))
  it('refuses [target language]', () => {
    const p = checkLanguageNameLines({ ...ok, lines: { ...ok.lines, 94: 'You speak very good [target language].' } })
    expect(p.join('|')).toMatch(/line 94: still carries \[target language\]/)
  })
  it('refuses a blank line', () => {
    expect(checkLanguageNameLines({ ...ok, lines: { ...ok.lines, 226: '  ' } }).join('|')).toMatch(/line 226: blank/)
    expect(checkLanguageNameLines({ ...ok, lines: { 33: ok.lines[33] } }).length).toBe(4)
  })
  it('refuses a line naming the wrong language', () => {
    expect(checkLanguageNameLines({ ...ok, lines: { ...ok.lines, 95: "I'm learning German." } }).join('|'))
      .toMatch(/line 95: does not name "Egyptian Arabic"/)
  })
  it('refuses lines identical to a sibling that teaches a different language', () => {
    const p = checkLanguageNameLines({ ...ok, siblings: [{ course: 'ara_sy_for_eng', lines: ok.lines }] })
    expect(p.filter(x => /identical to ara_sy_for_eng/.test(x)).length).toBe(5)
  })
  it('lets two targets the lookup names identically share lines (Welsh north/south)', () => {
    const w = { course: 'cym_n_for_eng', lines: five('Welsh') }
    expect(checkLanguageNameLines({ ...w, siblings: [{ course: 'cym_s_for_eng', lines: w.lines }] })).toEqual([])
  })
  it('refuses a course with no lookup entry instead of guessing', () => {
    expect(checkLanguageNameLines({ course: 'xxx_for_eng', lines: five('Xish') }).join('|')).toMatch(/no entry in tools\/pods\/pod-language-names/)
  })
  it('matches vowelled Arabic and particled Japanese by stem', () => {
    expect(checkLanguageNameLines({ course: 'eng_for_ara', lines: Object.fromEntries(LANGUAGE_NAME_LINES.map(g => [g, 'التَّحَدُّثَ بِالإِنْجِليزِيَّةِ'])) })).toEqual([])
    expect(checkLanguageNameLines({ course: 'spa_for_jpn', lines: Object.fromEntries(LANGUAGE_NAME_LINES.map(g => [g, 'スペイン語を話す'])) })).toEqual([])
  })
  it('only judges a canonical 231', () => {
    expect(nameLineProblemsForRows({ course: 'ara_eg_for_eng', rows: [{ global_order: 33, known_text: '[target language]' }] })).toEqual([])
  })
})

describe('both promotion doors refuse', () => {
  const rows = Array.from({ length: 231 }, (_, i) => ({
    id: `ara_eg_for_eng:pod-1-231:SC01-S${String(i + 1).padStart(3, '0')}`, global_order: i + 1,
    target_text: 'x', target_audio_id: 'a', known_text: LANGUAGE_NAME_LINES.includes(i + 1) ? 'I am learning [target language].' : 'hello', known_audio_id: 'k',
  }))
  it('readinessBlockers (switchover) names the lines', () => {
    const p = nameLineProblemsForRows({ course: 'ara_eg_for_eng', rows })
    expect(readinessBlockers({ n: 231, name_line_problems: p }).join('|')).toMatch(/language-name lines: line 33/)
  })
  it('promotionBlockers (promote-pod) refuses', () => {
    const nameLineProblems = nameLineProblemsForRows({ course: 'ara_eg_for_eng', rows })
    const b = promotionBlockers({ rows, srcId: 'ara_eg_for_eng:pod-1-231', course: 'ara_eg_for_eng', fromSlug: 'pod-1-231', nameLineProblems })
    expect(b.join('|')).toMatch(/\[target language\]/)
  })
})
