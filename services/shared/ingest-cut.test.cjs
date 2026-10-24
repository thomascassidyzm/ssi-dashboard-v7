/**
 * ingest-cut: a machine cut from a longer clip, audited, stored, linked, with a rollback line (job #374).
 * Run: npx vitest run services/shared/ingest-cut.test.cjs
 * The cut, the decode and the hash verdict are the REAL ones (ffmpeg on a synthetic two-tone "sentence"); the database,
 * S3, the learner proxy and the tail audit are fakes, so the refusals are tested as decisions.
 */
import { describe, it, expect } from 'vitest'
const { execFileSync } = require('child_process')
const { ingestCut, refuseDescriptor, undoBody } = require('./ingest-cut.cjs')
const { cutSpan } = require('./ingest-cut.cjs')
const { decodeMono } = require('./intro-splice.cjs')
const { hashVerdict } = require('../../tools/audio/dice-splice-zho.cjs')

const SRC = '11111111-1111-4111-8111-111111111111' // 我想说中文 — the longer recording
const CUR = '22222222-2222-4222-8222-222222222222' // the slot's own clip of 我想 (old voice)
const OWN = '33333333-3333-4333-8333-333333333333' // another clip whose words ARE 我想
const COURSE = 'zho_for_eng'

function fakeDb(tables) {
  const writes = []
  return {
    writes,
    from(table) {
      const filters = []
      let patch = null
      const rows = () => (tables[table] || []).filter((r) => filters.every(([k, v]) => (v === null ? r[k] == null : String(r[k]) === String(v))))
      const b = {
        select() { if (patch) return Promise.resolve(apply()); return b },
        eq(k, v) { filters.push([k, v]); return b },
        is(k, v) { filters.push([k, v]); return b },
        not() { return b },
        update(p) { patch = p; return b },
        maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }) },
      }
      function apply() { const hit = rows(); hit.forEach((r) => Object.assign(r, patch)); writes.push({ table, patch }); return { data: hit.map((r) => ({ id: r.id })), error: null } }
      return b
    },
  }
}

const world = () => ({
  course_legos: [{ id: 'l1', course_code: COURSE, seed_number: 662, lego_index: 2, known_text: 'I want', target_text: '我想', target1_audio_id: CUR }],
  course_seeds: [], course_practice_phrases: [],
  course_audio: [
    { id: SRC, course_code: COURSE, text: '我想说中文。', language: 'cmn', role: 'target1', voice_id: 'cartesia_cast', audio_revision: 1 },
    { id: CUR, course_code: COURSE, text: '我想', language: 'cmn', role: 'target1', voice_id: 'cartesia_old', audio_revision: 1 },
    { id: OWN, course_code: COURSE, text: '我想！', language: 'cmn', role: 'target1', voice_id: 'cartesia_other', audio_revision: 1 },
  ],
})

// A 2.0 s "sentence": 0.8 s of one tone, a pause, 1.0 s of another — the cut takes the first "word".
const SOURCE_MP3 = execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=f=220:d=0.8,afade=t=out:st=0.7:d=0.1', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono:d=0.2', '-f', 'lavfi', '-i', 'sine=f=330:d=1.0',
  '-filter_complex', '[0][1][2]concat=n=3:v=0:a=1', '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 24 })

function deps(t, over = {}) {
  const stored = [], rollback = [], events = []
  const d = {
    db: fakeDb(t), stored, rollback, events,
    fetchServed: async () => SOURCE_MP3,
    cut: async (bytes, span) => cutSpan(bytes, span),
    decode: decodeMono,
    hashVerdict,
    tailAudit: async () => ({ click: false, tail_spike: 3, end_abs: 0.001, dur: 0.8 }),
    store: async (s) => { const id = '44444444-4444-4444-8444-444444444444'; t.course_audio.push({ id, course_code: s.courseCode, text: s.text, language: s.language, role: s.role, voice_id: s.voiceId }); stored.push(s); return { audioId: id, s3Key: 'mastered/X.mp3' } },
    servedCheck: async () => null,
    appendRollback: async (line) => { rollback.push(line); return '/evidence/rollback.jsonl' },
    recordEdit: async (e) => { events.push(e); return 'ev1' },
    bump: async () => '1.0.1',
    now: () => '2026-10-24T12:00:00.000Z',
    ...over,
  }
  return d
}

const cut = (extra = {}) => ({ courseCode: COURSE, legoId: 'S0662L02', role: 'target1', text: '我想', sourceAudioId: SRC, startSec: 0, endSec: 0.85, charStart: 0, charEnd: 2,
  replace: true, expectCurrent: CUR, dryRun: false, requestedBy: 'test (job #374)', ...extra })

describe('ingestCut', () => {
  it('refuses a source whose words are the slot\'s own words (#359): nothing stored, nothing linked', async () => {
    const t = world(); const d = deps(t)
    const out = await ingestCut(cut({ sourceAudioId: OWN, charEnd: 2 }), d)
    expect(out).toMatchObject({ ok: false, code: 'OWN_TEXT' })
    expect(d.stored).toHaveLength(0); expect(t.course_legos[0].target1_audio_id).toBe(CUR)
  })

  it('refuses the slot\'s own reference clip as a source', async () => {
    const out = await ingestCut(cut({ sourceAudioId: CUR }), deps(world()))
    expect(out.code).toBe('OWN_CLIP')
  })

  it('refuses a join: more than one source', async () => {
    const out = await ingestCut(cut({ sources: [SRC, OWN] }), deps(world()))
    expect(out.code).toBe('NO_JOIN')
  })

  it('refuses a character span that does not spell the slot\'s words', async () => {
    const out = await ingestCut(cut({ charStart: 1, charEnd: 3 }), deps(world()))
    expect(out.code).toBe('SPAN_TEXT')
  })

  it('refuses a filled slot without replace + expectCurrent (fill-only, as link-clip)', async () => {
    const out = await ingestCut(cut({ replace: undefined, expectCurrent: undefined }), deps(world()))
    expect(out.code).toBe('SLOT_FILLED')
  })

  it('refuses a cut that is the whole recording (hash / waveform match)', async () => {
    const out = await ingestCut(cut({ endSec: 2.0 }), deps(world(), { cut: async (b) => ({ bytes: b, durationSec: 2.0, sourceDurationSec: 2.0 }) }))
    expect(out.code).toBe('IDENTICAL_TO_WHOLE')
  })

  it('refuses a cut whose tail clicks, and one the audit cannot measure, before anything is stored', async () => {
    const t = world(); const d = deps(t, { tailAudit: async () => ({ click: true, tail_spike: 40, end_abs: 0.2 }) })
    expect((await ingestCut(cut(), d)).code).toBe('TAIL_CLICK')
    const d2 = deps(t, { tailAudit: async () => ({ error: 'short' }) })
    expect((await ingestCut(cut(), d2)).code).toBe('TAIL_CLICK')
    expect(d.stored.length + d2.stored.length).toBe(0); expect(t.course_legos[0].target1_audio_id).toBe(CUR)
  })

  it('a dry run (the default) cuts and audits but stores and links nothing', async () => {
    const t = world(); const d = deps(t)
    const out = await ingestCut(cut({ dryRun: undefined }), d)
    expect(out).toMatchObject({ ok: true, dryRun: true, source: 'cut', linked: 0 })
    expect(out.provenance).toMatchObject({ method: 'machine-cut', sourceAudioId: SRC, spanText: '我想' })
    expect(d.stored).toHaveLength(0); expect(d.rollback).toHaveLength(0); expect(t.course_legos[0].target1_audio_id).toBe(CUR)
  })

  it('accepts a clean cut: stores it in the source voice, links it, writes a rollback line, and the undo puts the old clip back', async () => {
    const t = world(); const d = deps(t)
    const out = await ingestCut(cut(), d)
    expect(out).toMatchObject({ ok: true, source: 'cut', linked: 1, before: CUR })
    expect(d.stored[0]).toMatchObject({ text: '我想', role: 'target1', voiceId: 'cartesia_cast', legoId: 'S0662L02' })
    expect(out.provenance.durationSec).toBeGreaterThan(0.7); expect(out.provenance.durationSec).toBeLessThan(0.95)
    expect(t.course_legos[0].target1_audio_id).toBe(out.audioId)
    expect(d.rollback).toEqual([expect.objectContaining({ course: COURSE, legoId: 'S0662L02', role: 'target1', old: CUR, new: out.audioId })])
    expect(d.events[0].detail.cut).toMatchObject({ method: 'machine-cut', sourceAudioId: SRC, charStart: 0, charEnd: 2 })
    expect(out.undo).toEqual({ links: [{ legoId: 'S0662L02', role: 'target1', audioId: CUR, replace: true, expectCurrent: out.audioId }] })
  })

  it('links nothing when the stored cut fails the served check (make-before-break)', async () => {
    const t = world(); const d = deps(t, { servedCheck: async () => 'proxy HTTP 404' })
    const out = await ingestCut(cut(), d)
    expect(out).toMatchObject({ ok: false, code: 'SERVED_CHECK' })
    expect(t.course_legos[0].target1_audio_id).toBe(CUR); expect(d.rollback).toHaveLength(0)
  })

  it('undoBody offers nothing for a slot that was empty (link-clip never clears a slot)', () => {
    expect(undoBody({ legoId: 'S0001L01', role: 'target1', old: null, new: SRC })).toBeNull()
    expect(refuseDescriptor({ sourceAudioId: SRC, role: 'target1', startSec: 0, endSec: 0.1 }, {}, {})[0]).toBe('BAD_SPAN')
  })
})
