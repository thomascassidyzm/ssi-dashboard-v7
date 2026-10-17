/** tools/audio/voice-audit.cjs — the pure classifier the audit (and its nightly) reports from. */
import { describe, it, expect } from 'vitest'
import audit from './voice-audit.cjs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import rv from '../../services/shared/resolve-voice.cjs'
const { classify, render, unplayableWhy, targetCoverage } = audit

// job #788: --list-unplayable names WHY a slot cannot play; the reasons mirror the SQL usable() test
describe('voice audit unplayableWhy', () => {
  it('names no file, pending key and <=200ms, and passes a playable clip', () => {
    expect(unplayableWhy(null)).toMatch(/^no file/)
    expect(unplayableWhy({ s3_key: null, duration_ms: 900 })).toMatch(/^no file/)
    expect(unplayableWhy({ s3_key: 'pending/abc.mp3', duration_ms: 900 })).toBe('pending key')
    expect(unplayableWhy({ s3_key: 'a/b.mp3', duration_ms: 200 })).toBe('<=200ms')
    expect(unplayableWhy({ s3_key: 'a/b.mp3', duration_ms: null })).toBe('<=200ms')
    expect(unplayableWhy({ s3_key: 'a/b.mp3', duration_ms: 201 })).toBeNull()
  })
})

const fra = { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' }
const cast = { roles: [{ language: 'fra', gender: 'f', rank: 0, slot: 'phrase', voice_id: 'cartesia_fra-f', assigned_by: 'thomas.cassidy+ssi@gmail.com' }], voices: [{ voice_id: 'cartesia_fra-f', is_active: true }] }
const g = (col, voice_id, language, slots, origin = 'tts') => ({ tbl: 'course_practice_phrases', col, voice_id, language, origin, slots, texts: slots })

describe('voice audit classify', () => {
  it('counts ok, drift, human, refused, no-ruling and empty, and names the resolved voice for drift', () => {
    const { totals, groups } = classify(fra, [
      g('known_audio_id', rv.TOM_006, 'eng', 10),
      g('known_audio_id', rv.CHARLOTTE, 'eng', 7),
      g('known_audio_id', 'human_aran', 'eng', 3, 'human'),
      g('target1_audio_id', 'cartesia_fra-f', 'fra', 5),
      g('target2_audio_id', 'azure_fr-FR-HenriNeural', 'fra', 4),   // no male fra cast → refused
      g('target1_audio_id', rv.TOM_006, 'eng', 2),                 // an English line on a French slot → no ruling
      g('known_audio_id', null, null, 6),                          // dangling: the pointer names no clip
    ], cast)
    expect(totals).toEqual({ ok: 15, drift: 7, human: 3, refused: 4, 'no-ruling': 2, dangling: 6, unplayable: 0 })
    expect(groups.find((x) => x.status === 'drift')).toMatchObject({ role: 'known', resolved: rv.TOM_006, reason: 'english-known' })
    expect(groups.find((x) => x.status === 'refused')).toMatchObject({ role: 'target2', reason: 'uncast' })
  })
  it('renders one plain block with the fix plan', () => {
    const a = classify(fra, [g('known_audio_id', rv.CHARLOTTE, 'eng', 7)], cast)
    a.plan = { texts: 3, slots: 7, reuseTexts: 1, reuseSlots: 2, renderTexts: 2, renderChars: 40, presentationRender: 0 }
    const out = render('fra_for_eng', a)
    expect(out).toMatch(/^fra_for_eng: ok 0 · drift 7/)
    expect(out).toMatch(/drift 7 known: .* -> cartesia_d293d509/)
    expect(out).toMatch(/reuse 1 texts \(2 slots, free\), render 2 texts \(40 chars\)/)
  })
})

// job #832: the English known side (Tom-006) is far ahead of the Spanish target side; the headline ok hid that
describe('voice audit target coverage', () => {
  it('counts target-voice coverage per slot role, apart from the known side, and older takes beside the pointer change nothing', () => {
    const a = classify(fra, [
      g('known_audio_id', rv.TOM_006, 'eng', 9000),                 // English side, all in the cast voice
      g('target1_audio_id', 'cartesia_fra-f', 'fra', 100),          // target slots whose pointer is on the cast clip
      g('target1_audio_id', 'azure_fr-FR-DeniseNeural', 'fra', 900),// target slots still pointing at the older voice
    ], cast)
    expect(a.totals.ok).toBe(9100)
    expect(a.byRole.known.ok).toBe(9000)
    expect(targetCoverage(a.byRole)).toMatchObject({ ok: 100, drift: 900, total: 1000, pct: 10 })
    expect(render('fra_for_eng', a)).toMatch(/target voice in the cast: 100 of 1000 target slots \(10\.0%\)/)
    expect(targetCoverage({}).pct).toBeNull()
  })
})

// job #125: undo read only `swap` entries, so a crash after the write-ahead `intent` left moved slots un-undoable
describe('voice audit undo recovers from a surviving intent', () => {
  it('restores slots from an intent with no swap, and only where the pointer still equals `to`', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'va-undo-')), 'l.jsonl')
    const slot = (key) => ({ tbl: 'course_practice_phrases', col: 'target1_audio_id', key, from: 'old-' + key, course: 'fra_for_eng' })
    fs.writeFileSync(file, JSON.stringify({ kind: 'intent', to: 'NEW', slots: [slot('a'), slot('b')] }) + '\n')
    const state = { a: 'NEW', b: 'someone-else' }
    const db = { from: () => { let id, to; const q = { update: (u) => { to = u.target1_audio_id; return q }, eq: (c, v) => { if (c === 'id') id = v; if (c === 'target1_audio_id' && state[id] !== v) id = null; return q },
      select: async () => { if (id) { state[id] = to; return { data: [{ id }], error: null } } return { data: [], error: null } } }; return q } }
    const patchBump = require('../../services/shared/course-version.cjs')
    patchBump.bumpCourseVersion = async () => ({})
    await audit.undo(null, db, file, { dryRun: false })
    expect(state).toEqual({ a: 'old-a', b: 'someone-else' })
  })
  it('pairs a swap with its intent: a slot the swap omits is left alone even if the pointer equals `to`', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'va-undo-')), 'l.jsonl')
    const slot = (key) => ({ tbl: 'course_practice_phrases', col: 'target1_audio_id', key, from: 'old-' + key, course: 'fra_for_eng' })
    // intent lists a,b; another writer moved b to NEW first, so the completed swap lists only a
    fs.writeFileSync(file, [{ kind: 'intent', to: 'NEW', slots: [slot('a'), slot('b')] }, { kind: 'swap', to: 'NEW', slots: [slot('a')] }].map((r) => JSON.stringify(r)).join('\n') + '\n')
    const state = { a: 'NEW', b: 'NEW' }
    const db = { from: () => { let id, to; const q = { update: (u) => { to = u.target1_audio_id; return q }, eq: (c, v) => { if (c === 'id') id = v; if (c === 'target1_audio_id' && state[id] !== v) id = null; return q },
      select: async () => { if (id) { state[id] = to; return { data: [{ id }], error: null } } return { data: [], error: null } } }; return q } }
    require('../../services/shared/course-version.cjs').bumpCourseVersion = async () => ({})
    await audit.undo(null, db, file, { dryRun: false })
    expect(state).toEqual({ a: 'old-a', b: 'NEW' })
  })
})

// job #845: the pointer census reads each table ONCE (3 scans, not an 11-way union all) and never lifts statement_timeout
describe('voice audit pointerIds', () => {
  it('scans each slot table once, unrolling its pointer columns', () => {
    const sql = audit.pointerIds()
    expect(sql.match(/ from course_/g)).toHaveLength(3)
    expect(sql.match(/\(x\.\w+_audio_id(::uuid)?\)/g)).toHaveLength(11)
    expect(sql).toContain('(x.presentation_audio_id::uuid)')
    expect(sql).not.toMatch(/statement_timeout/)
  })
})
