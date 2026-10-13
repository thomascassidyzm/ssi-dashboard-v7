import { describe, it, expect } from 'vitest'
import { boothCourseChip, boothPodChip } from './booth-chip-titles.js'

// Catrin's booth, live 2026-10-13: the five chips Aran asked to be readable.
describe('booth chip titles', () => {
  it('names the Welsh courses in plain words, never by code', () => {
    expect(boothCourseChip('cym_n_for_eng', 2)).toBe('Welsh North — current course (live)')
    expect(boothCourseChip('cym_nv2_for_eng', 2)).toBe('Welsh North — new course')
    expect(boothCourseChip('cym_s_for_eng', 2)).toBe('Welsh South — current course (live)')
    expect(boothCourseChip('cym_sv2_for_eng', 2)).toBe('Welsh South — new course')
  })
  it('names the core listening pod in plain words', () => {
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'pod-1', podTitle: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1' }))
      .toBe('Listening pods — North, pod 1')
    expect(boothPodChip({ courseCode: 'cym_s_for_eng', podSlug: 'pod-1', podTitle: 'Southern Welsh (colloquial De Cymru Welsh) Listening Pods — Pod 1' }))
      .toBe('Listening pods — South, pod 1')
  })
  it('leaves an unnamed pod (Tom’s Health sets) on its own title', () => {
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'health', podTitle: 'Health — ward and surgery' })).toBe('Health — ward and surgery')
  })
  it('an unmapped course keeps the old label rather than vanishing', () => {
    expect(boothCourseChip('xyz_for_eng', 1)).toBe('Course')
    expect(boothCourseChip('xyz_for_eng', 2)).toBe('Course xyz_for_eng')
  })
})
