import { describe, it, expect } from 'vitest'
import { boothCourseChip, boothPodChip } from './booth-chip-titles.js'

// Aran's chosen titles, 2026-10-13.
describe('booth chip titles', () => {
  it('a North booth reads Old Welsh / New Welsh / Welsh Pod1', () => {
    const codes = ['cym_n_for_eng', 'cym_nv2_for_eng']
    expect(boothCourseChip('cym_n_for_eng', codes)).toBe('Old Welsh')
    expect(boothCourseChip('cym_nv2_for_eng', codes)).toBe('New Welsh')
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'pod-1', podTitle: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1' }))
      .toBe('Welsh Pod1')
  })
  it('a South booth uses the same words', () => {
    const codes = ['cym_s_for_eng', 'cym_sv2_for_eng']
    expect(boothCourseChip('cym_s_for_eng', codes)).toBe('Old Welsh')
    expect(boothCourseChip('cym_sv2_for_eng', codes)).toBe('New Welsh')
    expect(boothPodChip({ courseCode: 'cym_s_for_eng', podSlug: 'pod-1' })).toBe('Welsh Pod1')
  })
  it('a booth holding North and South courses says which is which', () => {
    const codes = ['cym_n_for_eng', 'cym_nv2_for_eng', 'cym_sv2_for_eng', 'cym_s_for_eng']
    expect(codes.map(c => boothCourseChip(c, codes)))
      .toEqual(['Old Welsh — North', 'New Welsh — North', 'New Welsh — South', 'Old Welsh — South'])
  })
  it('leaves an unnamed pod (the Health sets) on its own title', () => {
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'health', podTitle: 'Health — ward and surgery' })).toBe('Health — ward and surgery')
  })
  it('an unmapped course keeps the old label rather than vanishing', () => {
    expect(boothCourseChip('xyz_for_eng', ['xyz_for_eng'])).toBe('Course')
    expect(boothCourseChip('xyz_for_eng', ['xyz_for_eng', 'abc'])).toBe('Course xyz_for_eng')
  })
})
