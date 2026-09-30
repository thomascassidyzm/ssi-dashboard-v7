// Job #912: the daily debut-practice alarm speaks on a NEW empty debut, names it, and is otherwise quiet.
import { describe, it, expect } from 'vitest'
const { compose } = require('./nightly.cjs')

const g = (c, id) => ({ course_code: c, lego_id: id, known_text: 'k', target_text: 't' })
const standing = [g('gle_for_eng', 'S0053L01'), g('gle_for_eng', 'S0053L02')]
const prev = new Set(standing.map((x) => `${x.course_code} ${x.lego_id}`))

describe('debut-practice alarm', () => {
  it('names a debut that went empty since yesterday, course + LEGO', () => {
    const t = compose([...standing, g('ita_for_eng', 'S0190L01')], prev)
    expect(t).toMatch(/^1 debut LEGO\(s\)/)
    expect(t).toContain('ita_for_eng S0190L01')
    expect(t).not.toContain('gle_for_eng S0053L01')
  })
  it('is silent on an unchanged backlog, except Mondays', () => {
    expect(compose(standing, prev)).toBeNull()
    expect(compose(standing, prev, { monday: true })).toMatch(/^Monday: 2 debut/)
    expect(compose([], new Set(), { monday: true })).toBeNull()
  })
  it('first run posts the baseline per course', () => {
    expect(compose(standing, null)).toMatch(/first run: 2 debut[\s\S]*gle_for_eng: 2/)
  })
})
