// The estate map's audio totals are refreshed one course per statement, and one bad course
// must not stop the rest. Also: the swapped estate_map() must not scan course_audio at all.
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')
const { refreshEstateAudioSummary } = require('./estate-audio-summary.cjs')

describe('refreshEstateAudioSummary', () => {
  it('calls the refresh once per course, isolates a failing course, reports what changed', async () => {
    const calls = []
    const rpc = async (fn, args) => {
      calls.push([fn, args.p_course])
      if (args.p_course === 'bad') return { error: { message: 'canceling statement due to statement timeout' } }
      if (fn === 'refresh_estate_audio_dead_stubs') return { data: 26 }
      return { data: { changed: args.p_course === 'b', clips_before: 10, clips_after: 14, veracity_before: 1, veracity_after: 1 } }
    }
    const out = await refreshEstateAudioSummary({ rpc, listCourses: async () => ['a', 'bad', 'b'] })
    expect(calls.filter(c => c[0] === 'refresh_estate_audio_course').map(c => c[1])).toEqual(['a', 'bad', 'b'])
    expect(out.ok).toBe(2)
    expect(out.failed).toEqual([{ course: 'bad', error: 'canceling statement due to statement timeout' }])
    expect(out.changed).toEqual([{ course: 'b', clips: 4, veracity: 0 }])
    expect(out.deadStubs).toBe(26)
  })
})

describe('estate_map() swap migration', () => {
  it('reads only summary tables: no course_audio outside comments', () => {
    const sql = fs.readFileSync(path.join(__dirname, '../../database/changes/20261030_estate_map_precomputed_totals_2_swap.sql'), 'utf8')
    const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    expect(code).not.toMatch(/course_audio\b/)
    expect(code).toMatch(/estate_audio_summary/)
  })
})
