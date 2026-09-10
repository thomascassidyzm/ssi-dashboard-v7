/**
 * The pure halves of the re-slug, pinned.
 *
 * Tom, 2026-09-10: "THERE IS NO POD-0 anymore by name, so giving it that slug
 * name is legacy naming debt, we will trip up over it again at a later date with
 * new agents." Renaming a slug is cheap; renaming it HALFWAY is what costs a
 * learner their progress and a recordist their bad-take marks. These assertions
 * are the halfway cases, each one a mistake this tool actually made on the day.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { reslugId, retitle, rewritePointers } = createRequire(import.meta.url)('./retire-pod-slug.cjs')

describe('reslugId — only the slug segment moves', () => {
  it('renames the slug and leaves the tail alone', () => {
    expect(reslugId('cym_n_for_eng:pod-0:SC07-S006', 'cym_n_for_eng', 'pod-0', 'pod-1'))
      .toBe('cym_n_for_eng:pod-1:SC07-S006')
  })

  // A split-audio progress key is `…:SC01-S001:s2`. Splitting on every colon and
  // taking [2] would drop the `:s2` and silently re-point a learner's progress at
  // the whole sentence.
  it('keeps a tail that contains its own colons', () => {
    expect(reslugId('cym_n_for_eng:pod-0:SC01-S001:s2', 'cym_n_for_eng', 'pod-0', 'pod-1'))
      .toBe('cym_n_for_eng:pod-1:SC01-S001:s2')
  })

  it('refuses rather than guesses when the shape is not what it expects', () => {
    expect(reslugId('cym_n_for_eng:pod-0-unrecorded:SC01-S001', 'cym_n_for_eng', 'pod-0', 'pod-1')).toBeNull()
    expect(reslugId('cym_s_for_eng:pod-0:SC01-S001', 'cym_n_for_eng', 'pod-0', 'pod-1')).toBeNull()
    expect(reslugId('cym_n_for_eng:pod-0', 'cym_n_for_eng', 'pod-0', 'pod-1')).toBeNull()
  })
})

describe('retitle — the digit in a human title', () => {
  it('renames the pod in a title a person wrote', () => {
    expect(retitle('Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 0', 'pod-0', 'pod-1'))
      .toBe('Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1')
  })

  it('keeps the separator and the case the title chose', () => {
    expect(retitle('POD-0 conversations', 'pod-0', 'pod-1')).toBe('POD-1 conversations')
    expect(retitle('Pod0', 'pod-0', 'pod-1')).toBe('Pod1')
  })

  it('leaves a title that never mentions the pod number', () => {
    expect(retitle('Everyday conversations', 'pod-0', 'pod-1')).toBe('Everyday conversations')
  })
})

describe('rewritePointers — every pointer, wherever it sits', () => {
  const FROM = 'cym_n_for_eng:pod-0'
  const TO = 'cym_n_for_eng:pod-1'

  // THE BUG THIS EXISTS FOR. The first apply on 2026-09-10 rewrote only the note's
  // own pod_id and sentence_id and left 100 rows pointing at a dead id from inside
  // take_quality.evidence — where propagate-take-quality-wants.cjs reads it.
  it('reaches a pointer nested inside take_quality.evidence', () => {
    const note = {
      pod_id: FROM,
      sentence_id: `${FROM}:SC01-S004`,
      take_quality: { verdict: 'bad', evidence: { pod_sentence_id: `${FROM}:SC01-S004`, pod_side: 'target' } },
    }
    const { rewritten, hits } = rewritePointers(note, FROM, TO)
    expect(hits).toBe(3)
    expect(rewritten.take_quality.evidence.pod_sentence_id).toBe(`${TO}:SC01-S004`)
    expect(rewritten.take_quality.evidence.pod_side).toBe('target')
  })

  // THE OTHER HALF OF THAT BUG. `hits` has to be counted, because re-stringifying a
  // parsed note changes its whitespace and escaping — so a diff of the serialised
  // strings would flag a row with nothing to move and write it back reformatted.
  it('reports zero hits for a note it has nothing to do to', () => {
    const note = { pod_id: 'cym_n_for_eng:pod-0-unrecorded', sentence_id: 'cym_n_for_eng:pod-0-unrecorded:SC01-S001' }
    expect(rewritePointers(note, FROM, TO).hits).toBe(0)
  })

  // pod-0-unrecorded is a DIFFERENT pod with 61 provenance rows of its own. A
  // prefix match would re-point all of them at a pod they were never part of.
  it('never catches a longer slug that merely starts the same way', () => {
    const { rewritten, hits } = rewritePointers(
      { a: 'cym_n_for_eng:pod-0-unrecorded:SC01-S001', b: 'cym_n_for_eng:pod-0-gated-2026-08-06' }, FROM, TO)
    expect(hits).toBe(0)
    expect(rewritten.a).toBe('cym_n_for_eng:pod-0-unrecorded:SC01-S001')
  })

  it('leaves another course alone, and anything that is not a string', () => {
    const { rewritten, hits } = rewritePointers(
      { other: 'cym_s_for_eng:pod-0:SC01-S001', n: 3, nul: null, arr: [`${FROM}:SC02-S001`] }, FROM, TO)
    expect(hits).toBe(1)
    expect(rewritten.other).toBe('cym_s_for_eng:pod-0:SC01-S001')
    expect(rewritten.n).toBe(3)
    expect(rewritten.nul).toBeNull()
    expect(rewritten.arr).toEqual([`${TO}:SC02-S001`])
  })

  it('matches the pod id on its own, not only a sentence under it', () => {
    expect(rewritePointers({ pod_id: FROM }, FROM, TO)).toEqual({ rewritten: { pod_id: TO }, hits: 1 })
  })
})
