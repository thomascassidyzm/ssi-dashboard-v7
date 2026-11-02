/**
 * presentation-read: the Script Viewer's intro read follows the LEGO's link (job #978).
 * Run: npx vitest run services/shared/presentation-read.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { loadPresentationClip } = require('./presentation-read.cjs')

// Just enough supabase-js: from().select().eq()…maybeSingle() | .order().limit()
function fakeDb(tables) {
  return {
    from(table) {
      const f = []
      const rows = () => (tables[table] || []).filter(r => f.every(([k, v]) => r[k] === v))
      const q = {
        select() { return q },
        eq(k, v) { f.push([k, v]); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows().slice(0, n), error: null }) },
        maybeSingle() {
          const r = rows()
          return Promise.resolve(r.length > 1 ? { data: null, error: new Error('JSON object requested, multiple (or no) rows returned') } : { data: r[0] || null, error: null })
        },
      }
      return q
    },
  }
}

const old = { id: 'old', course_code: 'fin_for_eng', role: 'presentation', lego_id: 'S0001L01', text: "The Finnish for: 'I want', as in — 'I want to speak Finnish with you now', is:" }
const neu = { id: 'new', course_code: 'fin_for_eng', role: 'presentation', lego_id: 'S0001L01', text: "The Finnish for: 'I want', is:" }

describe('loadPresentationClip', () => {
  it('returns the linked clip when a re-render left two presentation rows for one LEGO', async () => {
    const db = fakeDb({ course_legos: [{ course_code: 'fin_for_eng', lego_id: 'S0001L01', presentation_audio_id: 'new' }], course_audio: [old, neu] })
    const clip = await loadPresentationClip(db, 'fin_for_eng', 'S0001L01')
    expect(clip.id).toBe('new')
    expect(clip.text).toBe("The Finnish for: 'I want', is:")
  })
  it('falls back to one stored row when the LEGO is unlinked', async () => {
    const db = fakeDb({ course_legos: [{ course_code: 'fin_for_eng', lego_id: 'S0001L01', presentation_audio_id: null }], course_audio: [old] })
    expect((await loadPresentationClip(db, 'fin_for_eng', 'S0001L01')).id).toBe('old')
  })
  it('returns null when there is nothing', async () => {
    const db = fakeDb({ course_legos: [], course_audio: [] })
    expect(await loadPresentationClip(db, 'fin_for_eng', 'S0009L09')).toBeNull()
  })
})
