/**
 * ONE WRITE PATH (job #53, Tom 2026-10-12 16:17Z): every audio tool that moves a slot pointer (*_audio_id) onto a clip asks
 * resolveVoice first (services/shared/resolve-voice.cjs mayPoint / setSlotPointer / assertPointer). A new repoint tool that
 * writes its own pointers without it fails here — the same way tools/check-tts-door.cjs fails a tool that renders around the door.
 */
import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import rv from '../../services/shared/resolve-voice.cjs'

const ROOT = path.join(__dirname, '../..')
const SCAN = [...fs.readdirSync(path.join(ROOT, 'tools/audio')).map((f) => `tools/audio/${f}`), 'tools/revoice-clips.cjs']
  .filter((f) => f.endsWith('.cjs') && !/\.test\./.test(f))

/** Files that write pointers without the guard, each with the reason. Shrink this list; never grow it without one. */
const UNGUARDED = {
  'tools/audio/x-for-eng-known-t6-revert.cjs': 'job #52 revert, running as cs-long-52-revert on 2026-10-12 (never edit a file a running unit executes); it writes only Tom-006 onto X_for_eng known slots, which resolveVoice agrees with. Guard it once that unit has ended.',
}

const writesPointers = (src) => /_audio_id/.test(src) && (/\.update\(/.test(src) || /update\s+[\w${}.]+[\s\S]{0,80}\bset\b/i.test(src))

describe('every pointer-writing audio tool asks resolveVoice', () => {
  it('no tool writes *_audio_id without the guard (or a named reason)', () => {
    const missing = SCAN.filter((f) => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
      return writesPointers(src) && !/resolve-voice\.cjs/.test(src) && !UNGUARDED[f]
    })
    expect(missing, 'these tools move audio pointers without asking resolveVoice — call mayPoint/setSlotPointer (services/shared/resolve-voice.cjs)').toEqual([])
  })
  it('the allowlist names only files that still exist and still write pointers', () => {
    for (const f of Object.keys(UNGUARDED)) {
      const p = path.join(ROOT, f)
      expect(fs.existsSync(p), f).toBe(true)
      expect(writesPointers(fs.readFileSync(p, 'utf8')), f).toBe(true)
    }
  })
})

// A fake Supabase: just enough of from().select().eq().maybeSingle() / .in() for assertPointer.
function fakeDb({ clips, courses }) {
  return {
    from(tbl) {
      const q = { filters: {} }
      const api = {
        select() { return api },
        eq(k, v) { q.filters[k] = v; return api },
        in() { return api },
        async maybeSingle() {
          if (tbl === 'course_audio') return { data: clips[q.filters.id] || null, error: null }
          if (tbl === 'courses') return { data: courses[q.filters.course_code] || null, error: null }
          return { data: null, error: null }
        },
      }
      return api
    },
  }
}

describe('mayPoint: the guard the tools call', () => {
  afterEach(() => rv.useCast(null))
  const courses = { fra_for_eng: { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' } }
  const clips = {
    charlotte: { id: 'charlotte', voice_id: rv.CHARLOTTE, language: 'eng', origin: 'tts' },
    tom006: { id: 'tom006', voice_id: rv.TOM_006, language: 'eng', origin: 'tts' },
  }
  const db = fakeDb({ clips, courses })
  it('refuses Charlotte onto an X_for_eng known slot, allows Tom-006, lets an undo restore, never blocks a null', async () => {
    rv.useCast({ roles: [], voices: [] })
    const said = []
    expect(await rv.mayPoint(db, { courseCode: 'fra_for_eng', col: 'known_audio_id', to: 'charlotte', log: (l) => said.push(l) })).toBe(false)
    expect(said[0]).toMatch(/REFUSED by resolveVoice/)
    expect(await rv.mayPoint(db, { courseCode: 'fra_for_eng', col: 'known_audio_id', to: 'tom006' })).toBe(true)
    expect(await rv.mayPoint(db, { courseCode: 'fra_for_eng', col: 'known_audio_id', to: 'charlotte', restore: true })).toBe(true)
    expect(await rv.mayPoint(db, { courseCode: 'fra_for_eng', col: 'known_audio_id', to: null })).toBe(true)
  })
})
