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
    // Each total is the slot count of the rows above it that earn that status:
    //   ok 15        = 10 English known on Tom-006 (the ruled voice) + 5 fra target1 on the cast voice
    //   drift 7      = English known on Charlotte, where the ruling says Tom-006
    //   human 3      = a human take, never judged against the cast
    //   refused 4    = fra target2 has no male cast voice, so the Azure line has no legal resolution
    //   no-ruling 2  = an English clip on a French slot: resolveVoice has no rule for that pairing
    //   dangling 6   = the pointer names no clip at all
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

// F18a: slots already repointed stay repointed when a later write throws, so the content_version bump must still happen
describe('voice audit repointUnplayable', () => {
  it('bumps content_version for the slots it moved even when a later write throws', async () => {
    const audit = require('./voice-audit.cjs'), rv = require('../../services/shared/resolve-voice.cjs')
    const { repointUnplayable } = audit
    const cv = require('../../services/shared/course-version.cjs')
    const cel = require('../../services/shared/content-edit-log.cjs')
    const saved = { bump: cv.bumpCourseVersion, rec: cel.recordContentEdit, lc: rv.loadCourse, res: rv.resolveVoice, may: rv.mayPoint, set: rv.setSlotPointer }
    const bumps = []
    process.env.SSI_EVIDENCE_ROOT = require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'va-ev-'))
    cv.bumpCourseVersion = async (_db, code, level) => { bumps.push([code, level]); return '1.0.1' }
    cel.recordContentEdit = async () => 'ev1'
    rv.loadCourse = async () => fra
    rv.resolveVoice = () => ({ status: 'voice', voiceId: 'cartesia_fra-f' })
    rv.mayPoint = async () => true
    let writes = 0
    rv.setSlotPointer = async () => { if (++writes === 2) throw new Error('db went away'); return true }
    let first = true
    const pg = { query: async (sql) => {
      if (/order by \(ca\.voice_id/.test(sql)) return { rows: [{ id: 'clip1' }] }
      if (first && /from course_seeds x/.test(sql) && /known_audio_id/.test(sql)) { first = false
        return { rows: [{ key: 's1', aid: 'a1', cid: null, text: 'un', t: 'un', language: 'fra' }, { key: 's2', aid: 'a2', cid: null, text: 'deux', t: 'deux', language: 'fra' }] } }
      return { rows: [] } } }
    try {
      await expect(repointUnplayable(pg, {}, 'fra_for_eng', cast, { dryRun: false, maxChars: 0 })).rejects.toThrow('db went away')
      expect(bumps).toEqual([['fra_for_eng', 'patch']])
    } finally { Object.assign(cv, { bumpCourseVersion: saved.bump }); Object.assign(cel, { recordContentEdit: saved.rec }); Object.assign(rv, { loadCourse: saved.lc, resolveVoice: saved.res, mayPoint: saved.may, setSlotPointer: saved.set }) }
  })
})
