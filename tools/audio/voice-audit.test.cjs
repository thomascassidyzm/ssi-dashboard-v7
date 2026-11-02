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

// A big course's slot join runs past the 5 s cap whole: it must be re-run in seed windows and the groups summed, losing nothing.
describe('voice audit groupedSlots stays under the statement cap', () => {
  it('re-runs a timed-out part in seed_number windows and sums the groups', async () => {
    const windowed = (sql) => /seed_number (>=|is null)/.test(sql)
    const mineSql = (sql) => /from course_practice_phrases/.test(sql) && /'known_audio_id' col/.test(sql)
    let windowCalls = 0
    const pg = { async query(sql) {
      if (mineSql(sql) && !windowed(sql)) throw Object.assign(new Error('cancel'), { code: '57014' })
      if (!mineSql(sql)) return { rows: [] }
      windowCalls++
      return { rows: [{ tbl: 'course_practice_phrases', col: 'known_audio_id', voice_id: 'v', language: 'fra', origin: null, slots: '2', texts: '1', unplayable: '1' }] }
    } }
    const rows = (await audit.groupedSlots(pg, 'big_for_eng')).filter((r) => r.tbl === 'course_practice_phrases' && r.col === 'known_audio_id')
    expect(windowCalls).toBeGreaterThan(5)
    expect(rows).toHaveLength(1)
    expect(rows[0].slots).toBe(2 * windowCalls)
    expect(rows[0].unplayable).toBe(windowCalls)
  })
})

// job #312: --twins-only plans ONLY twin slots (target2 on its own row's target1 file, twin-check's set), relinks any male clip
// before rendering, and never relinks a female clip; the pointer guard's opt-in lets an older MALE voice through and nothing else.
describe('voice audit --twins-only', () => {
  const rv = require('../../services/shared/resolve-voice.cjs'), audit = require('./voice-audit.cjs')
  const ita = { course_code: 'ita_for_eng', known_lang: 'eng', target_lang: 'ita' }
  const LORENZO = 'cartesia_ee16f140-f6dc-490e-a1ed-c1d537ea0086', ALESSANDRA = 'cartesia_0e21713a-5e9a-428a-bed4-90d410b87f13'
  const itaCast = { roles: [{ language: 'ita', gender: 'f', rank: 0, slot: 'phrase', voice_id: ALESSANDRA, assigned_by: 'thomas.cassidy+ssi@gmail.com' },
    { language: 'ita', gender: 'm', rank: 0, slot: 'phrase', voice_id: LORENZO, assigned_by: 'thomas.cassidy+ssi@gmail.com' }],
  voices: [{ voice_id: ALESSANDRA, is_active: true, gender: 'f' }, { voice_id: LORENZO, is_active: true, gender: 'm' }] }

  it('plans the twin slot and not a non-twin drifted male slot; relinks an older male clip, never a female one', async () => {
    const saved = rv.loadCourse
    rv.loadCourse = async () => ita
    // ciao: a twin (target2 plays target1's file). grazie: also a twin, but only a female clip of it exists.
    // buongiorno: a male slot drifted onto an old Azure male voice, NOT a twin — the whole-course fix moves it, twins-only must not.
    const twins = [
      { tbl: 'course_practice_phrases', key: 'ita_for_eng:S0001L01B01', pos: 1, aid: 'tw1', tx: 'ciao', t: 'ciao', language: 'ita', v2: ALESSANDRA, origin: 'tts', v1: ALESSANDRA, s3_key: 'mastered/F1.mp3' },
      { tbl: 'course_practice_phrases', key: 'ita_for_eng:S0002L01B01', pos: 2, aid: 'tw2', tx: 'grazie', t: 'grazie', language: 'ita', v2: ALESSANDRA, origin: 'tts', v1: ALESSANDRA, s3_key: 'mastered/F2.mp3' },
    ]
    const nonTwin = { tbl: 'course_practice_phrases', col: 'target2_audio_id', key: 'ita_for_eng:S0003L01B01', pos: 3, aid: 'az1', t: 'buongiorno', tx: 'buongiorno', language: 'ita' }
    const candidates = [
      { i: 0, id: 'female-old', voice_id: ALESSANDRA, s3_key: 'mastered/F9.mp3', gender: 'f', created_at: '2026-01-01' },
      { i: 0, id: 'tw1', voice_id: ALESSANDRA, s3_key: 'mastered/F1.mp3', gender: 'f', created_at: '2026-02-01' },
      { i: 0, id: 'benigno', voice_id: 'azure_it-IT-BenignoNeural', s3_key: 'mastered/M1.mp3', gender: 'male', created_at: '2026-03-01' },
      { i: 1, id: 'female-only', voice_id: ALESSANDRA, s3_key: 'mastered/F8.mp3', gender: 'f', created_at: '2026-01-01' },
    ]
    const pg = { async query(sql) {
      if (/a1\.s3_key = a2\.s3_key/.test(sql)) return { rows: /course_practice_phrases/.test(sql) ? twins : [] }
      if (/cross join lateral/.test(sql)) return { rows: candidates }
      if (/ca\.voice_id = \$2/.test(sql)) return { rows: [nonTwin] }   // driftSlots: what the whole-course fix would move
      return { rows: [] }
    } }
    try {
      const { items, plan } = await audit.twinAudit(pg, {}, 'ita_for_eng', itaCast)
      const keys = items.flatMap((it) => it.slots.map((s) => s.key))
      expect(keys).toEqual(['ita_for_eng:S0001L01B01', 'ita_for_eng:S0002L01B01'])
      expect(keys).not.toContain(nonTwin.key)
      expect(items.every((it) => rv.sameVoice(it.voice, LORENZO))).toBe(true)
      expect(items[0]).toMatchObject({ reuse: 'benigno', reuseKind: 'other-male' })
      expect(items[1].reuse).toBeFalsy()
      expect(plan).toMatchObject({ slots: 2, relinkCastSlots: 0, relinkOtherSlots: 1, renderSlots: 1, renderChars: 6 })
      // the cast male wins over an older male whenever both exist
      expect(audit.chooseTwinRelink({ voice: LORENZO, twinFiles: [] }, [candidates[2], { id: 'lor', voice_id: LORENZO, s3_key: 'x', gender: null, created_at: '2026-09-01' }])).toMatchObject({ id: 'lor', kind: 'cast' })
    } finally { rv.loadCourse = saved }
  })

  it('the guard opt-in passes an older male clip on a male slot and still refuses a female one', async () => {
    const clips = { benigno: { id: 'benigno', voice_id: 'azure_it-IT-BenignoNeural', language: 'ita', origin: 'tts' }, fem: { id: 'fem', voice_id: 'azure_it-IT-ElsaNeural', language: 'ita', origin: 'tts' }, tw1: { id: 'tw1', voice_id: ALESSANDRA, language: 'ita', origin: 'tts' } }
    const voices = [{ voice_id: 'azure_it-IT-BenignoNeural', gender: 'male' }, { voice_id: 'azure_it-IT-ElsaNeural', gender: 'female' }]
    const db = { from: (tbl) => { const f = []; const q = { select: () => q, eq: (c, v) => { f.push((r) => r[c] === v); return q }, in: (c, vs) => { f.push((r) => vs.includes(r[c])); return q },
      maybeSingle: async () => ({ data: q.rows()[0] || null, error: null }), then: (res) => res({ data: q.rows(), error: null }),
      rows: () => (tbl === 'course_audio' ? Object.values(clips) : tbl === 'voices' ? voices : tbl === 'courses' ? [{ ...ita, course_code: 'ita_for_eng' }] : []).filter((r) => f.every((p) => p(r))) }; return q } }
    rv.useCast(itaCast)
    try {
      const p = (to, sameGenderRepair) => rv.assertPointer(db, { courseCode: 'ita_for_eng', col: 'target2_audio_id', to, tbl: 'course_practice_phrases', key: 'k', from: 'tw1', sameGenderRepair })
      await expect(p('benigno', false)).rejects.toMatchObject({ code: 'VOICE_POLICY' })
      await expect(p('benigno', true)).resolves.toBeUndefined()
      await expect(p('fem', true)).rejects.toMatchObject({ code: 'VOICE_POLICY' })
    } finally { rv.useCast(null) }
  })
})
