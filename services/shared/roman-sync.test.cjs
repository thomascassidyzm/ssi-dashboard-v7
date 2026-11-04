// target_text_roman must spell the current target_text (job #252, zho_for_eng 4 Nov 2026:
// 58 rows showed learners pinyin for a sentence that no longer existed).

import { describe, it, expect } from 'vitest'

const { romanGoesStale, clearStaleRoman } = require('./roman-sync.cjs')

const row = { target_text: '你知道我父亲吗？', target_text_roman: 'nǐ zhīdào wǒ fùqīn ma？' }

describe('romanGoesStale', () => {
  it('a new target text with no romanisation leaves the old pinyin stale', () => {
    expect(romanGoesStale(row, { target_text: '你认识我父亲吗？' })).toBe(true)
  })
  it('sending the new romanisation (or null on purpose) is fine', () => {
    expect(romanGoesStale(row, { target_text: '你认识我父亲吗？', target_text_roman: 'nǐ rènshi wǒ fùqīn ma？' })).toBe(false)
    expect(romanGoesStale(row, { target_text: '你认识我父亲吗？', target_text_roman: null })).toBe(false)
  })
  it('an unchanged target text, a known-only edit, or a row with no romanisation never trips it', () => {
    expect(romanGoesStale(row, { target_text: row.target_text })).toBe(false)
    expect(romanGoesStale(row, { known_text: 'Do you know my father?' })).toBe(false)
    expect(romanGoesStale({ target_text: '你好', target_text_roman: null }, { target_text: '您好' })).toBe(false)
    expect(romanGoesStale({ target_text: 'hola', target_text_roman: '' }, { target_text: 'adiós' })).toBe(false)
  })
})

describe('clearStaleRoman (the single-row human edit routes)', () => {
  it('clears the stale romanisation so the learner sees the characters, not the wrong words', () => {
    expect(clearStaleRoman(row, { target_text: '你认识我父亲吗？' })).toEqual({
      patch: { target_text: '你认识我父亲吗？', target_text_roman: null }, romanCleared: true })
  })
  it('passes a patch through untouched when nothing would go stale', () => {
    const set = { target_text: '你认识我父亲吗？', target_text_roman: 'nǐ rènshi wǒ fùqīn ma？' }
    expect(clearStaleRoman(row, set)).toEqual({ patch: set, romanCleared: false })
  })
})

describe('the course-edit engine refuses ROMAN_STALE', () => {
  it('runPlans throws before writing when a target edit drops the romanisation', async () => {
    const { planOps, runPlans } = require('./course-edit-ops.cjs')
    const C = 'zho_for_eng'
    const plans = planOps([{ op: 'phrase.update', phrase_id: `${C}:S0266L01U03`, set: { target_text: '你认识我父亲吗？' } }], C)
    const before = { id: `${C}:S0266L01U03`, course_code: C, seed_number: 266, ...row }
    const writes = []
    const client = {
      query: async (sql, params) => {
        if (/^\s*(BEGIN|ROLLBACK|COMMIT|SET LOCAL|SELECT set_config)/i.test(sql)) return { rows: [] }
        if (/information_schema/i.test(sql)) return { rows: Object.keys(before).map(c => ({ column_name: c, data_type: 'text' })) }
        if (/^\s*SELECT/i.test(sql)) return { rows: [before] }
        writes.push(sql); return { rows: [] }
      },
      end: async () => {}, release: () => {},
    }
    await expect(runPlans({ connect: async () => client, courseCode: C, plans, apply: false })).rejects.toThrow(/target_text_roman/)
    expect(writes.filter(s => /^\s*UPDATE/i.test(s))).toEqual([])
  })
})
