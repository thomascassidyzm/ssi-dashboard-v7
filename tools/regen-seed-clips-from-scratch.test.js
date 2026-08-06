// Unit tests for the target-list reader and the holder map.
//
// These two are what decide which clips a paid TTS run touches and which
// database columns get repointed afterwards. Getting either wrong is either
// money spent on healthy clips or a consumer left pointing at damaged bytes,
// so they are the parts worth pinning.
// Run: npx vitest run tools/regen-seed-clips-from-scratch.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readTargetIds, HOLDERS, SLOT } from './regen-seed-clips-from-scratch.cjs'

let dir
const write = (name, obj) => {
  const p = path.join(dir, name)
  fs.writeFileSync(p, JSON.stringify(obj))
  return p
}

beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-targets-test-')) })
afterAll(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })

describe('readTargetIds', () => {
  it('reads the items[] array a word-loss scan emits', () => {
    const f = write('wordloss.json', {
      course: 'deu_for_eng',
      truncated: 2,
      items: [
        { audioId: 'aaa', id: 'aaa', role: 'known', text: 'a different country' },
        { audioId: 'bbb', id: 'bbb', role: 'target2', text: 'ein anderes Land' },
      ],
    })
    expect(readTargetIds(f)).toEqual(['aaa', 'bbb'])
  })

  it('preserves file order — the scan emits LEGOs before cycles and that IS the repair order', () => {
    const f = write('ordered.json', { items: ['zzz', 'aaa', 'mmm'].map(id => ({ audioId: id })) })
    expect(readTargetIds(f)).toEqual(['zzz', 'aaa', 'mmm'])
  })

  it('de-duplicates: one id must never be rendered and swapped twice in a run', () => {
    const f = write('dupes.json', { items: [{ audioId: 'aaa' }, { audioId: 'aaa' }, { audioId: 'bbb' }] })
    expect(readTargetIds(f)).toEqual(['aaa', 'bbb'])
  })

  it('drops healthy clips when handed a full results[] array — truncated:false is not a target', () => {
    const f = write('results.json', {
      results: [
        { audioId: 'healthy', truncated: false },
        { audioId: 'chopped', truncated: true },
        { audioId: 'unchecked' },
      ],
    })
    expect(readTargetIds(f)).toEqual(['chopped', 'unchecked'])
  })

  it('accepts a bare array of ids, so a hand-written shortlist works', () => {
    const f = write('bare.json', ['aaa', 'bbb'])
    expect(readTargetIds(f)).toEqual(['aaa', 'bbb'])
  })

  it('throws on a file with no recognisable list rather than silently rendering nothing', () => {
    const f = write('junk.json', { course: 'deu_for_eng', items: 'not an array' })
    expect(() => readTargetIds(f)).toThrow(/no items/)
  })

  it('ignores entries with no id at all', () => {
    const f = write('holes.json', { items: [{ role: 'known' }, { audioId: 'aaa' }, null] })
    expect(readTargetIds(f)).toEqual(['aaa'])
  })
})

describe('HOLDERS', () => {
  it('covers every serving column in both content tables plus the intro table', () => {
    const pairs = HOLDERS.map(h => `${h.table}.${h.column}`).sort()
    expect(pairs).toEqual([
      'course_legos.known_audio_id',
      'course_legos.presentation_audio_id',
      'course_legos.target1_audio_id',
      'course_legos.target2_audio_id',
      'course_practice_phrases.known_audio_id',
      'course_practice_phrases.presentation_audio_id',
      'course_practice_phrases.target1_audio_id',
      'course_practice_phrases.target2_audio_id',
      'lego_introductions.presentation_audio_id',
    ])
  })

  it('reaches practice-phrase KNOWN audio — the founder\'s "as often as possible" clip lives there', () => {
    expect(HOLDERS.some(h => h.table === 'course_practice_phrases' && h.column === 'known_audio_id')).toBe(true)
    // and the seed-range SLOT map demonstrably cannot reach it
    expect(Object.values(SLOT).every(s => s.table === 'course_legos')).toBe(true)
  })

  it('carries the duration column wherever the schema has one, so the row does not keep the stale length', () => {
    const withDuration = HOLDERS.filter(h => h.durationColumn).map(h => `${h.table}.${h.durationColumn}`)
    expect(withDuration).toContain('course_legos.target1_duration_ms')
    expect(withDuration).toContain('course_practice_phrases.target2_duration_ms')
    expect(withDuration).toContain('lego_introductions.duration_ms')
  })

  it('moves lego_introductions.audio_uuid with presentation_audio_id — the legacy pointer must not disagree', () => {
    const intro = HOLDERS.find(h => h.table === 'lego_introductions')
    expect(intro.alsoSet).toEqual({ audio_uuid: true })
  })
})
