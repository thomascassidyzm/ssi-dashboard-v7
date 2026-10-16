import { it, expect } from 'vitest'
const { checkVocabViolations, checkLegoConflict } = require('./validation.cjs')
const C = 'cym_sv2_for_eng'

it('does not teach the verb o’n from the preposition o and particle yn', () => {
  expect(checkVocabViolations([{ target: 'o’n ni angen' }], new Set(['o', 'yn', 'ni', 'angen']), C)).toHaveLength(1)
})

it('links a contracted reading to the already-taught expanded LEGO', async () => {
  const sb = { from(table) {
    const q = {
      select() { return q }, eq() { return q }, in() { return q },
      then(resolve) { return Promise.resolve({ data: table === 'course_legos'
        ? [{ seed_number: 1, lego_index: 1, known_text: 'I am ready', target_text: 'dw i yn barod', type: 'M' }]
        : [], error: null }).then(resolve) },
    }
    return q
  } }
  expect((await checkLegoConflict(sb, C, 'I am ready', 'dw i’n barod')).conflict).toBe('duplicate')
})

it('does not assemble untaught o’n from o and a clitic in another taught phrase', () => {
  const taught = new Set(['o', 'dw i’n trio', 'ni', 'angen'])
  for (const target of ['o’n ni angen', "o'n ni angen"]) {
    expect(checkVocabViolations([{ target }], taught, C)).toHaveLength(1)
    expect(checkVocabViolations([{ target }], new Set([...taught, 'o’n i']), C)).toEqual([])
  }
  expect(checkVocabViolations([{ target: 'o ni angen' }], new Set(['o’n i', 'ni', 'angen']), C)).toHaveLength(1)
})
