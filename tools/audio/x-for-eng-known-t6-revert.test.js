import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { planRevert } = createRequire(import.meta.url)('./x-for-eng-known-t6-revert.cjs')
const s = (course, key, extra = {}) => ({ tbl: 'course_practice_phrases', col: course.startsWith('eng_for_') ? 'target2_audio_id' : 'known_audio_id', key, course, ...extra })

describe('job #52 revert plan: X_for_eng known slots only, back to Tom-006', () => {
  it('#34 rows go back to their Tom-006 `from`; eng_for_X rows are left alone', () => {
    const p = planRevert({ l34: [{ kind: 'intent', slots: [s('ara_for_eng', 'a', { from: 'T6', to: 'EVE' }), s('eng_for_hin', 'h', { from: 'T6', to: 'EVE' })] }] })
    expect([...p.keys()]).toEqual(['course_practice_phrases|a|known_audio_id'])
    expect(p.get('course_practice_phrases|a|known_audio_id')).toMatchObject({ want: 'T6', wrong: new Set(['EVE']) })
  })
  it('#813 female intents (g:f) are undone by text; male intents are not touched', () => {
    const p = planRevert({ l813: [{ kind: 'intent', g: 'f', t: 'hello', newId: 'CH', slots: [s('jpn_for_eng', 'j', { from: 'SONIA' })] }, { kind: 'intent', g: 'm', t: 'bye', newId: 'T6b', slots: [s('jpn_for_eng', 'k', { from: 'LEO' })] }] })
    expect(p.size).toBe(1); expect(p.get('course_practice_phrases|j|known_audio_id')).toMatchObject({ want: null, wantText: 'hello', wrong: new Set(['CH']) })
  })
})
