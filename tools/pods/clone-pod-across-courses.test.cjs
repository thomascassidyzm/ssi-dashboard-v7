/**
 * clone-pod across courses (2026-09-14, job #648) — the Senedd/S4C pod on Welsh (South).
 *
 * Recordings are per LANGUAGE, never per course: a course row POINTS at a clip. So the
 * same pod on a second course of the same language is the same sentence rows and the
 * same clip ids under the second course's id prefix — never a re-render, never a
 * re-record. clone-pod.cjs already copied a pod without touching audio, but only
 * within ONE course, refused a destination slug equal to the source slug (which across
 * courses is exactly what is wanted, because the learner app's Listening Mode
 * allow-list is per SLUG), filed the new row under the SOURCE course, and had no way
 * to write `required_role` — so a held-back copy would have needed a second UPDATE, the
 * one thing the live-pod triggers judge.
 *
 * RECORDED RED against the pre-fix tool (a2f1c0c^ state of clone-pod.cjs):
 *   TypeError: destinationOf is not a function  (every case below)
 *   TypeError: podInsert is not a function
 * GREEN after the change.
 */
import { describe, it, expect } from 'vitest'

const { destinationOf, podInsert } = require('./clone-pod.cjs')

describe('destinationOf — where a cross-course copy lands', () => {
  it('keeps the SAME slug on the other course, because the app lists topic pods by slug', () => {
    const d = destinationOf({ course: 'cym_n_for_eng', toCourse: 'cym_s_for_eng', from: 'senedd-s4c-steve', to: 'senedd-s4c-steve' })
    expect(d.refusal).toBeNull()
    expect(d.srcPodId).toBe('cym_n_for_eng:senedd-s4c-steve')
    expect(d.dstPodId).toBe('cym_s_for_eng:senedd-s4c-steve')
    expect(d.dstCourse).toBe('cym_s_for_eng')
  })
  it('still refuses copying a pod onto itself within one course', () => {
    const d = destinationOf({ course: 'spa_for_eng', toCourse: null, from: 'pod-1', to: 'pod-1' })
    expect(d.refusal).toMatch(/must differ/)
  })
  it('defaults to the source course when --to-course is absent or blank', () => {
    expect(destinationOf({ course: 'spa_for_eng', toCourse: '  ', from: 'pod-1', to: 'unrecorded' }).dstPodId).toBe('spa_for_eng:unrecorded')
  })
})

describe('podInsert — the header row is born with its course and its role', () => {
  const src = { pod_type: 'choice', pod_order: 0, scene: 'Senedd', difficulty: 'advanced', speakers: [{ name: 'x' }], source_file: 'f', metadata: { a: 1 } }
  it('writes course_code = destination course and required_role in the SAME statement', () => {
    const { sql, values } = podInsert()
    expect(sql).toMatch(/required_role\)\s*values/)
    const v = values({ dstPodId: 'cym_s_for_eng:senedd-s4c-steve', dstCourse: 'cym_s_for_eng', slug: 'senedd-s4c-steve', src, title: 'T', visibility: 'live', requiredRole: 'previewer_001' })
    expect(v[0]).toBe('cym_s_for_eng:senedd-s4c-steve')
    expect(v[1]).toBe('cym_s_for_eng')
    expect(v[11]).toBe('live')
    expect(v[12]).toBe('previewer_001')
    expect(v).toHaveLength(13)
  })
  it('writes NULL (everyone) when no role is given', () => {
    const v = podInsert().values({ dstPodId: 'a:b', dstCourse: 'a', slug: 'b', src, title: 'T', visibility: 'held', requiredRole: null })
    expect(v[12]).toBeNull()
  })
})
