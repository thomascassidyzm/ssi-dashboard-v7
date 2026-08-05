/**
 * Unit tests for buildLearningAppUrl — the single place a learning-app deep
 * link is constructed. Run: npx vitest run src/utils/learningAppUrl
 */

import { describe, it, expect, afterEach } from 'vitest'
import { buildLearningAppUrl } from './learningAppUrl'

const DEFAULT_BASE = 'https://saysomethingin.app'

function setBase(value: string | undefined) {
  if (value === undefined) {
    delete (import.meta.env as Record<string, unknown>).VITE_LEARNING_APP_URL
  } else {
    ;(import.meta.env as Record<string, unknown>).VITE_LEARNING_APP_URL = value
  }
}

afterEach(() => setBase(undefined))

describe('buildLearningAppUrl', () => {
  it('emits a course-only link when nothing else is given', () => {
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng' }))
      .toBe(`${DEFAULT_BASE}/?course=deu_for_eng`)
  })

  it('appends round when it is a positive integer', () => {
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7 }))
      .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7`)
  })

  it('emits course, round, lego, cycle in that exact order', () => {
    expect(buildLearningAppUrl({
      courseCode: 'deu_for_eng',
      round: 7,
      legoId: 'S0002L02',
      cycle: 3
    })).toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7&lego=S0002L02&cycle=3`)
  })

  it('omits a garbage round rather than emitting a bad param', () => {
    const garbage = [0, -1, NaN, undefined, null, 2.5, '7' as unknown as number]
    for (const round of garbage) {
      expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: round as number }))
        .toBe(`${DEFAULT_BASE}/?course=deu_for_eng`)
    }
  })

  it('omits a garbage cycle rather than emitting a bad param', () => {
    const garbage = [0, -1, NaN, undefined, null, '3' as unknown as number]
    for (const cycle of garbage) {
      expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7, cycle: cycle as number }))
        .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7`)
    }
  })

  it('omits an empty or absent legoId', () => {
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7, legoId: '' }))
      .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7`)
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7, legoId: '   ' }))
      .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7`)
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7, legoId: null }))
      .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=7`)
  })

  it('honours VITE_LEARNING_APP_URL', () => {
    setBase('https://staging.example.com')
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', round: 7 }))
      .toBe('https://staging.example.com/?course=deu_for_eng&round=7')
  })

  it('does not double the slash when the override has a trailing slash', () => {
    setBase('https://staging.example.com/')
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng' }))
      .toBe('https://staging.example.com/?course=deu_for_eng')
    setBase('https://staging.example.com///')
    expect(buildLearningAppUrl({ courseCode: 'deu_for_eng' }))
      .toBe('https://staging.example.com/?course=deu_for_eng')
  })

  it('URL-encodes the course code', () => {
    expect(buildLearningAppUrl({ courseCode: 'a b&c' }))
      .toBe(`${DEFAULT_BASE}/?course=a%20b%26c`)
  })

  it('emits the agreed shape for deu_for_eng round 7 S0002L02', () => {
    const url = buildLearningAppUrl({
      courseCode: 'deu_for_eng',
      round: 7,
      legoId: 'S0002L02'
    })
    // Printed so the learner side can be compared against it byte for byte.
    console.log('DEEPLINK:', url)
    expect(url).toBe('https://saysomethingin.app/?course=deu_for_eng&round=7&lego=S0002L02')
  })

  describe('cycleText — the identity anchor for a per-cycle launch', () => {
    it('appends the clicked row text after the cycle ordinal', () => {
      expect(buildLearningAppUrl({
        courseCode: 'deu_for_eng', round: 11, legoId: 'S0003L03',
        cycle: 13, cycleText: 'I want to speak German'
      })).toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=11&lego=S0003L03&cycle=13&cycleText=I%20want%20to%20speak%20German`)
    })

    it('omits cycleText when there is no cycle to qualify', () => {
      expect(buildLearningAppUrl({
        courseCode: 'deu_for_eng', round: 11, cycleText: 'I want to speak German'
      })).toBe(`${DEFAULT_BASE}/?course=deu_for_eng&round=11`)
    })

    it('omits empty or whitespace-only text rather than emitting a bare param', () => {
      expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', cycle: 3, cycleText: '   ' }))
        .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&cycle=3`)
      expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', cycle: 3, cycleText: null }))
        .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&cycle=3`)
    })

    it('URL-encodes text carrying punctuation an apostrophe or an ampersand', () => {
      expect(buildLearningAppUrl({ courseCode: 'deu_for_eng', cycle: 2, cycleText: "I'm trying & waiting?" }))
        .toBe(`${DEFAULT_BASE}/?course=deu_for_eng&cycle=2&cycleText=I'm%20trying%20%26%20waiting%3F`)
    })
  })
})
