/**
 * Scene names (Tom, 2026-11-02): one source in services/shared/pod-scene-names,
 * copied per course in its KNOWN language; never English to a non-English learner.
 */
import { describe, it, expect } from 'vitest'

const { planWrites } = require('./write-scene-names.cjs')
const { sceneShape, loadCuts } = require('../../services/shared/pod-scene-names.cjs')

const POD1 = [4, 5, 10, 3, 2, 13, 15, 16, 18, 10, 13, 10, 11, 10, 11, 11, 11, 11, 11, 11, 14, 11]
const rowsFor = (podId, shape) => shape.flatMap((n, i) => Array.from({ length: n }, () => ({ pod_id: podId, scene_number: i + 1 })))

describe('write-scene-names', () => {
  it('the Pod 1 cut names every scene in every language it lists', () => {
    const cut = loadCuts().find(c => c.cut === 'pod-1-231')
    expect(cut.shape).toEqual(POD1)
    for (let n = 1; n <= 22; n++) {
      for (const [lang, name] of Object.entries(cut.scenes[String(n)])) {
        expect(name.trim().length, `${lang} scene ${n}`).toBeGreaterThan(0)
        expect(name, `${lang} scene ${n} has no parentheses`).not.toMatch(/[()]/)
      }
    }
    expect(cut.scenes['8'].eng).toBe('Ordering Drinks')
  })

  it('gives each course its known-language names, by shape not slug, and skips a language it has no names for', () => {
    const courses = [
      { course_code: 'spa_for_eng', known_lang: 'eng' },
      { course_code: 'eng_for_fra', known_lang: 'fra' },
      { course_code: 'eng_for_spa', known_lang: 'spa' },
      { course_code: 'eng_for_xxx', known_lang: 'xxx' },
    ]
    const pods = [
      { id: 'spa_for_eng:pod-1', course_code: 'spa_for_eng', slug: 'pod-1', scene_names: null },
      { id: 'spa_for_eng:pod-1-retired-2026-08-24', course_code: 'spa_for_eng', slug: 'pod-1-retired-2026-08-24', scene_names: null },
      { id: 'eng_for_fra:pod-1', course_code: 'eng_for_fra', slug: 'pod-1', scene_names: null },
      { id: 'eng_for_spa:pod-1', course_code: 'eng_for_spa', slug: 'pod-1', scene_names: null },
      { id: 'eng_for_spa:pod-1-231', course_code: 'eng_for_spa', slug: 'pod-1-231', scene_names: null },
      { id: 'eng_for_xxx:pod-1', course_code: 'eng_for_xxx', slug: 'pod-1', scene_names: null },
    ]
    const sentenceRows = [
      ...rowsFor('spa_for_eng:pod-1', POD1),
      ...rowsFor('spa_for_eng:pod-1-retired-2026-08-24', POD1),
      ...rowsFor('eng_for_fra:pod-1', POD1),
      ...rowsFor('eng_for_spa:pod-1', [6, 6, 6]), // the older 142-line cut: a different shape, no names yet
      ...rowsFor('eng_for_spa:pod-1-231', POD1),
      ...rowsFor('eng_for_xxx:pod-1', POD1),
    ]
    const { writes, skips } = planWrites({ courses, pods, sentenceRows })
    const by = Object.fromEntries(writes.map(w => [w.podId, w]))
    expect(Object.keys(by).sort()).toEqual(['eng_for_fra:pod-1', 'eng_for_spa:pod-1-231', 'spa_for_eng:pod-1'])
    expect(by['spa_for_eng:pod-1'].names['8']).toBe('Ordering Drinks')
    expect(by['eng_for_fra:pod-1'].names['8']).toBe('Commander à boire')
    expect(by['eng_for_spa:pod-1-231'].names['8']).toBe('Pedir bebidas')
    expect(skips).toEqual([{ podId: 'eng_for_xxx:pod-1', reason: 'cut pod-1-231 has no xxx name for scene 1' }])
  })

  it('a variant cut borrows the base names through its scene map (the 142-line Pod 1)', () => {
    const v142 = [4, 2, 3, 3, 2, 13, 15, 16, 18, 10, 13, 10, 11, 10, 12]
    const { writes } = planWrites({
      courses: [{ course_code: 'eng_for_spa', known_lang: 'spa' }],
      pods: [{ id: 'eng_for_spa:pod-1', course_code: 'eng_for_spa', slug: 'pod-1', scene_names: null }],
      sentenceRows: rowsFor('eng_for_spa:pod-1', v142),
    })
    expect(writes).toHaveLength(1)
    expect(writes[0].names['14']).toBe('Tomar un taxi')
    expect(writes[0].names['15']).toBe('Primera conversación')
    expect(Object.keys(writes[0].names)).toHaveLength(15)
  })

  it('writes nothing for a pod that already carries the same names', () => {
    const courses = [{ course_code: 'spa_for_eng', known_lang: 'eng' }]
    const first = planWrites({ courses, pods: [{ id: 'a:pod-1', course_code: 'spa_for_eng', slug: 'pod-1', scene_names: null }], sentenceRows: rowsFor('a:pod-1', POD1) })
    const again = planWrites({ courses, pods: [{ id: 'a:pod-1', course_code: 'spa_for_eng', slug: 'pod-1', scene_names: first.writes[0].names }], sentenceRows: rowsFor('a:pod-1', POD1) })
    expect(again.writes).toEqual([])
    expect(again.unchanged).toBe(1)
  })

  it('a gap in scene numbering is no shape', () => {
    expect(sceneShape([{ scene_number: 1 }, { scene_number: 3 }])).toBe(null)
    expect(sceneShape([{ scene_number: 2 }, { scene_number: 1 }, { scene_number: 1 }])).toEqual([2, 1])
  })
})
