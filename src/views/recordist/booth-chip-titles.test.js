import { describe, it, expect } from 'vitest'
import { boothCourseChip, boothPodChip, boothPodHeading, boothCourseWords } from './booth-chip-titles.js'

// Aran's chosen titles, 2026-10-13.
describe('booth chip titles', () => {
  it('a North booth reads Old Welsh / New Welsh / Pod 1', () => {
    const codes = ['cym_n_for_eng', 'cym_nv2_for_eng']
    expect(boothCourseChip('cym_n_for_eng', codes)).toBe('Old Welsh')
    expect(boothCourseChip('cym_nv2_for_eng', codes)).toBe('New Welsh')
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'pod-1', podTitle: 'Northern Welsh (colloquial Gogledd Cymru Welsh) Listening Pods — Pod 1' }))
      .toBe('Pod 1')
  })
  it('a South booth uses the same words', () => {
    const codes = ['cym_s_for_eng', 'cym_sv2_for_eng']
    expect(boothCourseChip('cym_s_for_eng', codes)).toBe('Old Welsh')
    expect(boothCourseChip('cym_sv2_for_eng', codes)).toBe('New Welsh')
    expect(boothPodChip({ courseCode: 'cym_s_for_eng', podSlug: 'pod-1' })).toBe('Pod 1')
  })
  it('a booth holding North and South courses says which is which', () => {
    const codes = ['cym_n_for_eng', 'cym_nv2_for_eng', 'cym_sv2_for_eng', 'cym_s_for_eng']
    expect(codes.map(c => boothCourseChip(c, codes)))
      .toEqual(['Old Welsh — North', 'New Welsh — North', 'New Welsh — South', 'Old Welsh — South'])
  })
  it('names the Health pods Health (scripts) / Health (test)', () => {
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'health', podTitle: 'Health — ward and surgery' })).toBe('Health (scripts)')
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'health-ladder-pilot', podTitle: 'Health ladder pilot — seed-and-splice (job #993)' })).toBe('Health (test)')
  })
  it('an unnamed pod keeps its own title', () => {
    expect(boothPodChip({ courseCode: 'cym_n_for_eng', podSlug: 'guess', podTitle: 'Guess' })).toBe('Guess')
  })
  it('an unmapped course keeps the old label rather than vanishing', () => {
    expect(boothCourseChip('xyz_for_eng', ['xyz_for_eng'])).toBe('Course')
    expect(boothCourseChip('xyz_for_eng', ['xyz_for_eng', 'abc'])).toBe('Course xyz_for_eng')
  })
})

describe('booth section headings use the same names as the chips', () => {
  it('Health pods read Health (scripts) / Health (test) as headings too', () => {
    expect(boothPodHeading({ courseCode: 'cym_n_for_eng', podSlug: 'health' })).toBe('Health (scripts)')
    expect(boothPodHeading({ courseCode: 'cym_n_for_eng', podSlug: 'health-ladder-pilot' })).toBe('Health (test)')
  })
  it('the core pod reads Pod 1, without a dialect', () => {
    expect(boothPodHeading({ courseCode: 'cym_s_for_eng', podSlug: 'pod-1' })).toBe('Pod 1')
  })
  it('an unnamed pod has no booth heading, so it keeps its own', () => {
    expect(boothPodHeading({ courseCode: 'x', podSlug: 'guess' })).toBeNull()
  })
  it('course words in a sentence carry the dialect', () => {
    expect(boothCourseWords('cym_nv2_for_eng', 'North')).toBe('New Welsh — North')
    expect(boothCourseWords('zzz', 'Zed')).toBe('Zed')
  })
})
