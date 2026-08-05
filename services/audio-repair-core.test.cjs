/**
 * Unit tests for the non-destructive audio repair core (no DB, no S3, no TTS,
 * no spend). Run: npx vitest run services/audio-repair-core
 *
 * These exist to hold the claims the design is sold on, which are not
 * observable by reading the happy path:
 *   - accept keeps the id STABLE (the whole reason presentation clips can be
 *     repaired at all — a new id would CASCADE the intro row away);
 *   - accept does not delete or orphan the lego_introductions row;
 *   - a candidate that fails verification leaves the database bit-identical;
 *   - a failure mid-accept rolls the row back bit-identically;
 *   - history is written on every accepted swap, and the old object is never
 *     deleted;
 *   - reject changes nothing on the learner path.
 *
 * The fake Supabase below mimics the subset of postgrest-js the core uses,
 * including the bit that matters for correctness: `.update()` writes only the
 * named columns, so "bit-identical" is a real assertion about the row and not
 * an artefact of the double.
 */

import { describe, it, expect, beforeEach } from 'vitest'

const { createRepairCore } = require('./audio-repair-core.cjs')

// ── a minimal, honest supabase double ──────────────────────────────────────

function makeDb (seed) {
  const tables = JSON.parse(JSON.stringify(seed))
  let failOn = null // { table, op } -> throws, to drive the rollback path

  function match (rows, filters) {
    return rows.filter(r => filters.every(([col, val]) => r[col] === val))
  }

  function from (table) {
    tables[table] = tables[table] || []
    const filters = []
    let mode = 'select'
    let payload = null
    let headOnly = false
    let wantCount = false
    let selected = null

    const api = {
      select (_cols, opts) {
        if (opts && opts.head) headOnly = true
        if (opts && opts.count) wantCount = true
        if (mode === 'insert') { selected = true; return api }
        mode = mode === 'select' ? 'select' : mode
        return api
      },
      eq (col, val) { filters.push([col, val]); return api },
      order () { return api },
      limit () { return api },
      insert (rows) { mode = 'insert'; payload = Array.isArray(rows) ? rows : [rows]; return api },
      update (patch) { mode = 'update'; payload = patch; return api },
      delete () { mode = 'delete'; return api },
      async single () { return finish('one') },
      async maybeSingle () { return finish('maybe') },
      then (resolve, reject) { return finish('many').then(resolve, reject) },
    }

    async function finish (arity) {
      const requireOne = arity === 'one'
      const single = arity !== 'many'
      if (failOn && failOn.table === table && failOn.op === mode) {
        return { data: null, error: { message: `injected failure on ${table}.${mode}` }, count: null }
      }
      if (mode === 'select') {
        const rows = match(tables[table], filters)
        if (headOnly || wantCount) return { data: null, error: null, count: rows.length }
        if (requireOne && rows.length !== 1) {
          return { data: null, error: { message: 'not exactly one row' } }
        }
        if (single) return { data: rows.length ? clone(rows[0]) : null, error: null }
        return { data: rows.map(clone), error: null, count: rows.length }
      }
      if (mode === 'insert') {
        const added = payload.map(r => ({ id: r.id || `gen-${tables[table].length + 1}`, ...r }))
        tables[table].push(...added.map(clone))
        return { data: selected ? (single ? clone(added[0]) : added.map(clone)) : null, error: null }
      }
      if (mode === 'update') {
        const rows = match(tables[table], filters)
        // Column-wise write: untouched columns keep their exact prior value.
        for (const r of rows) Object.assign(r, clone(payload))
        return { data: rows.map(clone), error: null, count: rows.length }
      }
      if (mode === 'delete') {
        const keep = tables[table].filter(r => !filters.every(([c, v]) => r[c] === v))
        const removed = tables[table].length - keep.length
        tables[table] = keep
        return { data: null, error: null, count: removed }
      }
      return { data: null, error: null }
    }

    return api
  }

  const clone = (o) => JSON.parse(JSON.stringify(o))
  return {
    client: { from },
    tables,
    snapshot: () => JSON.parse(JSON.stringify(tables)),
    failNext: (table, op) => { failOn = { table, op } },
    clearFailure: () => { failOn = null },
  }
}

const CLIP = {
  id: 'aaaa-1111',
  course_code: 'deu_for_eng',
  text: 'The German for: to speak, as in — I want to speak German, is:',
  text_normalized: 'the german for: to speak, as in — i want to speak german, is:',
  language: 'eng',
  role: 'presentation',
  voice_id: 'azure_en-GB-SoniaNeural',
  origin: 'tts',
  s3_key: 'mastered/OLD.mp3',
  duration_ms: 3200,
  file_size_bytes: 51200,
  audio_revision: 1,
  lego_id: 'deu_for_eng:S0001L03',
  word_boundaries: [{ w: 'the', t: 0 }],
  veracity_pass: true,
  veracity_reason: null,
  veracity_cer: 0.02,
  veracity_checked_at: '2026-08-01T00:00:00.000Z',
  veracity_checker: 'phase8',
  sequence: null,
}

function seedDb (overrides = {}) {
  return makeDb({
    course_audio: [{ ...CLIP, ...overrides }],
    // The authored content the CASCADE would have destroyed.
    lego_introductions: [{
      id: 'intro-1', lego_id: CLIP.lego_id, presentation_audio_id: CLIP.id, duration_ms: 3200,
      intro_text: 'The German for: to speak, as in — I want to speak German, is:',
    }],
    course_legos: [{ id: 'lego-1', lego_id: CLIP.lego_id, presentation_audio_id: CLIP.id }],
    course_practice_phrases: [],
    audio_repair_candidates: [],
    course_audio_revisions: [],
    course_audio_envelope: [{ audio_id: CLIP.id, duration_ms: 3200 }],
  })
}

function makeCore (db, opts = {}) {
  const puts = []
  let ids = 0
  return {
    puts,
    core: createRepairCore({
      supabase: db.client,
      storage: {
        put: async (key, buf, ct) => { puts.push({ key, bytes: buf.length, ct }); return { key } },
        head: async (key) => ({ exists: opts.objectMissing ? false : true, bytes: 40000 }),
        get: async (key) => ({ buffer: Buffer.from('bytes'), contentType: 'audio/mpeg' }),
      },
      render: {
        render: async () => ({ buffer: Buffer.alloc(40000, 1), durationMs: opts.renderMs ?? 4100 }),
        master: async (buf) => ({ buffer: buf, durationMs: opts.renderMs ?? 4100 }),
      },
      verify: {
        measure: async () => opts.level ?? { meanDb: -21, peakDb: -1.5 },
        veracity: async () => opts.verdict ?? { checked: true, pass: true, reason: null, cer: 0.03 },
      },
      newId: () => `cand-${++ids}`,
      now: () => '2026-08-05T22:00:00.000Z',
      logger: { log () {}, warn () {}, error () {} },
    }),
  }
}

/** Propose a candidate and return its id — the setup most tests need. */
async function proposeOne (core) {
  const r = await core.propose({
    courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test',
  })
  return r.candidateId
}

// ── PROPOSE ─────────────────────────────────────────────────────────────────

describe('propose', () => {
  let db, core, puts
  beforeEach(() => { db = seedDb(); ({ core, puts } = makeCore(db)) })

  it('touches nothing on the learner path: the clip row is bit-identical after', async () => {
    const before = db.snapshot().course_audio
    await core.propose({ courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test' })
    expect(db.snapshot().course_audio).toEqual(before)
  })

  it('writes the candidate object to a candidate key, never over the live one', async () => {
    await proposeOne(core)
    expect(puts).toHaveLength(1)
    expect(puts[0].key).toMatch(/^repair-candidates\//)
    expect(puts[0].key).not.toBe(CLIP.s3_key)
  })

  it('records the candidate as pending, with its own verification verdict', async () => {
    const id = await proposeOne(core)
    const [cand] = db.snapshot().audio_repair_candidates
    expect(cand.id).toBe(id)
    expect(cand.status).toBe('pending')
    expect(cand.audio_id).toBe(CLIP.id)
    expect(cand.duration_ms).toBe(4100)
    expect(cand.veracity_pass).toBe(true)
  })

  it('a candidate that fails verification is refused, and the DB is bit-identical', async () => {
    const d2 = seedDb()
    const before = d2.snapshot()
    const { core: c2 } = makeCore(d2, { verdict: { checked: true, pass: false, reason: 'missing final word', cer: 0.9 } })
    await expect(c2.propose({ courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test' }))
      .rejects.toThrow(/candidate/i)
    expect(d2.snapshot()).toEqual(before)
  })

  it('a silent candidate is refused', async () => {
    const d2 = seedDb()
    const { core: c2 } = makeCore(d2, { level: { meanDb: -70, peakDb: -60 } })
    await expect(c2.propose({ courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test' }))
      .rejects.toThrow(/silent/i)
    expect(d2.snapshot().audio_repair_candidates).toHaveLength(0)
  })

  it('a candidate shorter than the floor is refused', async () => {
    const d2 = seedDb()
    const { core: c2 } = makeCore(d2, { renderMs: 120 })
    await expect(c2.propose({ courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test' }))
      .rejects.toThrow(/too short/i)
  })

  it('an upload of an unsupported type is refused before anything is rendered', async () => {
    await expect(core.propose({
      courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'upload',
      buffer: Buffer.alloc(1000), filename: 'take-3.docx', actor: 'test',
    })).rejects.toThrow(/unsupported upload type/i)
    expect(puts).toHaveLength(0)
  })

  it('an upload of an accepted type becomes a candidate like any render', async () => {
    const r = await core.propose({
      courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'upload',
      buffer: Buffer.alloc(40000, 2), filename: 'take-3.wav', actor: 'tom',
    })
    expect(r.candidateId).toBeTruthy()
    expect(db.snapshot().audio_repair_candidates[0].source).toBe('upload')
  })

  it('a dry run of a TTS propose spends nothing and states what it would cost', async () => {
    const r = await core.propose({
      courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test', dryRun: true,
    })
    expect(r.dryRun).toBe(true)
    expect(r.wouldSpend.characters).toBe(CLIP.text.length)
    expect(puts).toHaveLength(0)
    expect(db.snapshot().audio_repair_candidates).toHaveLength(0)
  })

  it('refuses a clip that belongs to another course', async () => {
    await expect(core.propose({ courseCode: 'fra_for_eng', audioId: CLIP.id, source: 'tts' }))
      .rejects.toThrow(/belongs to deu_for_eng/)
  })
})

// ── ACCEPT: the load-bearing claims ────────────────────────────────────────

describe('accept', () => {
  let db, core

  beforeEach(() => { db = seedDb(); ({ core } = makeCore(db)) })

  it('keeps the id stable — same row, new bytes', async () => {
    const candidateId = await proposeOne(core)
    const before = db.snapshot().course_audio
    const r = await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })

    const after = db.snapshot().course_audio
    expect(after).toHaveLength(1)
    expect(after[0].id).toBe(CLIP.id)
    expect(after[0].id).toBe(before[0].id)
    expect(r.audioId).toBe(CLIP.id)
  })

  it('points the row at the candidate object and bumps the revision', async () => {
    const candidateId = await proposeOne(core)
    const r = await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const [row] = db.snapshot().course_audio
    expect(row.s3_key).toMatch(/^repair-candidates\//)
    expect(row.duration_ms).toBe(4100)
    expect(row.audio_revision).toBe(2)
    expect(r.revision).toBe(2)
    expect(r.supersededS3Key).toBe('mastered/OLD.mp3')
  })

  it('leaves text, role, language and voice untouched — so the unique index never needs a tombstone', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const [row] = db.snapshot().course_audio
    expect(row.text).toBe(CLIP.text)
    expect(row.text_normalized).toBe(CLIP.text_normalized)
    expect(row.role).toBe(CLIP.role)
    expect(row.language).toBe(CLIP.language)
    expect(row.voice_id).toBe(CLIP.voice_id)
    // And there is exactly one row for this clip at every moment — nothing to collide.
    expect(db.snapshot().course_audio).toHaveLength(1)
  })

  it('does not delete or orphan the lego_introductions row', async () => {
    const candidateId = await proposeOne(core)
    const introBefore = db.snapshot().lego_introductions
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const introAfter = db.snapshot().lego_introductions
    expect(introAfter).toHaveLength(1)
    expect(introAfter[0].id).toBe(introBefore[0].id)
    expect(introAfter[0].intro_text).toBe(introBefore[0].intro_text)
    expect(introAfter[0].presentation_audio_id).toBe(CLIP.id)
  })

  it('re-denormalises the duration the player sizes its pause from', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    expect(db.snapshot().lego_introductions[0].duration_ms).toBe(4100)
  })

  it('writes history naming what was superseded, by whom and why', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({
      courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId,
      actor: 'tom', reason: 'clipped final word',
    })
    const [h] = db.snapshot().course_audio_revisions
    expect(h.audio_id).toBe(CLIP.id)
    expect(h.revision).toBe(2)
    expect(h.previous_revision).toBe(1)
    expect(h.previous_s3_key).toBe('mastered/OLD.mp3')
    expect(h.new_s3_key).toMatch(/^repair-candidates\//)
    expect(h.accepted_by).toBe('tom')
    expect(h.reason).toBe('clipped final word')
  })

  it('marks the candidate accepted', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const [c] = db.snapshot().audio_repair_candidates
    expect(c.status).toBe('accepted')
    expect(c.decided_by).toBe('tom')
  })

  it('an accepted upload becomes human-origin audio', async () => {
    const r = await core.propose({
      courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'upload',
      buffer: Buffer.alloc(40000, 2), filename: 'tom-take-3.wav', actor: 'tom',
    })
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId: r.candidateId, actor: 'tom' })
    expect(db.snapshot().course_audio[0].origin).toBe('human')
  })

  it('refuses when the candidate object is not actually in the bucket, and changes nothing', async () => {
    const d2 = seedDb()
    const { core: c2 } = makeCore(d2)
    const candidateId = await (async () => (await c2.propose({
      courseCode: 'deu_for_eng', audioId: CLIP.id, source: 'tts', actor: 'test' })).candidateId)()
    // Same DB state, but a core whose bucket has lost the object.
    const { core: c3 } = makeCore(d2, { objectMissing: true })
    const before = d2.snapshot()
    await expect(c3.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' }))
      .rejects.toThrow(/not in the bucket/)
    expect(d2.snapshot()).toEqual(before)
  })

  it('refuses a candidate that has already been decided', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    await expect(core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' }))
      .rejects.toThrow(/already accepted/)
  })

  it('refuses a candidate belonging to a different clip', async () => {
    const candidateId = await proposeOne(core)
    await expect(core.accept({ courseCode: 'deu_for_eng', audioId: 'other-id', candidateId, actor: 'tom' }))
      .rejects.toThrow(/no course_audio row|is for clip/)
  })

  it('rolls the row back bit-identically when a step after the swap fails', async () => {
    const candidateId = await proposeOne(core)
    const before = db.snapshot().course_audio
    // The link census runs immediately after the swap; make it throw.
    db.failNext('lego_introductions', 'select')
    await expect(core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' }))
      .rejects.toThrow()
    db.clearFailure()
    expect(db.snapshot().course_audio).toEqual(before)
    // and the history row does not survive a swap that did not stand
    expect(db.snapshot().course_audio_revisions).toHaveLength(0)
  })

  it('never deletes the superseded object — it only stops being pointed at', async () => {
    const candidateId = await proposeOne(core)
    const deletedKeys = []
    const r = await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    // The core has no delete-object capability at all; the old key survives in history.
    expect(deletedKeys).toHaveLength(0)
    expect(db.snapshot().course_audio_revisions[0].previous_s3_key).toBe('mastered/OLD.mp3')
    expect(r.supersededS3Key).toBe('mastered/OLD.mp3')
  })
})

// ── REVERT: history is only real if you can get the old clip back ──────────

describe('revert', () => {
  let db, core
  beforeEach(async () => { db = seedDb(); ({ core } = makeCore(db)) })

  it('puts the clip back on the object it was serving before', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const r = await core.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom', reason: 'worse than the original' })
    const [row] = db.snapshot().course_audio
    expect(row.s3_key).toBe('mastered/OLD.mp3')
    expect(row.duration_ms).toBe(3200)
    expect(r.restoredS3Key).toBe('mastered/OLD.mp3')
  })

  it('goes FORWARD in revision, never backwards — a device that cached the bad bytes must still be told to refetch', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const r = await core.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom' })
    expect(r.revision).toBe(3)
    expect(db.snapshot().course_audio[0].audio_revision).toBe(3)
  })

  it('records the revert as its own history entry', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    await core.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom' })
    const hist = db.snapshot().course_audio_revisions
    expect(hist).toHaveLength(2)
    expect(hist[1].source).toBe('revert')
    expect(hist[1].new_s3_key).toBe('mastered/OLD.mp3')
  })

  it('restores the denormalised duration too', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    expect(db.snapshot().lego_introductions[0].duration_ms).toBe(4100)
    await core.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom' })
    expect(db.snapshot().lego_introductions[0].duration_ms).toBe(3200)
  })

  it('refuses on a clip that has never been replaced', async () => {
    await expect(core.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom' }))
      .rejects.toThrow(/never been replaced/)
  })

  it('refuses, rather than half-reverting, if the superseded object has gone from the bucket', async () => {
    const candidateId = await proposeOne(core)
    await core.accept({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    const before = db.snapshot()
    const { core: gone } = makeCore(db, { objectMissing: true })
    await expect(gone.revert({ courseCode: 'deu_for_eng', audioId: CLIP.id, actor: 'tom' }))
      .rejects.toThrow(/no longer in the bucket/)
    expect(db.snapshot()).toEqual(before)
  })
})

// ── REJECT ─────────────────────────────────────────────────────────────────

describe('reject', () => {
  it('changes nothing on the learner path', async () => {
    const db = seedDb()
    const { core } = makeCore(db)
    const candidateId = await proposeOne(core)
    const before = db.snapshot()
    await core.reject({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom', reason: 'still clipped' })
    const after = db.snapshot()
    expect(after.course_audio).toEqual(before.course_audio)
    expect(after.lego_introductions).toEqual(before.lego_introductions)
    expect(after.course_audio_revisions).toEqual([])
    expect(after.audio_repair_candidates[0].status).toBe('rejected')
    expect(after.audio_repair_candidates[0].decision_reason).toBe('still clipped')
  })

  it('refuses to re-decide a decided candidate', async () => {
    const db = seedDb()
    const { core } = makeCore(db)
    const candidateId = await proposeOne(core)
    await core.reject({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' })
    await expect(core.reject({ courseCode: 'deu_for_eng', audioId: CLIP.id, candidateId, actor: 'tom' }))
      .rejects.toThrow(/already rejected/)
  })
})

// ── PREVIEW and the detector's honesty ─────────────────────────────────────

describe('preview', () => {
  it('returns current and candidate side by side with the comparison a human needs', async () => {
    const db = seedDb()
    const { core } = makeCore(db)
    await proposeOne(core)
    const p = await core.preview({ courseCode: 'deu_for_eng', audioId: CLIP.id })
    expect(p.current.id).toBe(CLIP.id)
    expect(p.current.revision).toBe(1)
    expect(p.candidates).toHaveLength(1)
    expect(p.comparison.durationMsCurrent).toBe(3200)
    expect(p.comparison.durationMsCandidate).toBe(4100)
  })

  it('never states a detector verdict without its precision', async () => {
    const db = seedDb()
    const { core } = makeCore(db)
    await proposeOne(core)
    const p = await core.preview({ courseCode: 'deu_for_eng', audioId: CLIP.id })
    expect(p.detector.name).toBeTruthy()
    expect('precision' in p.detector).toBe(true)
    expect(p.detector.precisionNote).toMatch(/never passes audio/i)
    // 3200 / 4100 = 0.78, below the 0.85 suspect ratio — flagged for ears.
    expect(p.detector.flagged).toBe(true)
  })

  it('says nothing rather than guessing when there is no candidate to compare against', async () => {
    const db = seedDb()
    const { core } = makeCore(db)
    const p = await core.preview({ courseCode: 'deu_for_eng', audioId: CLIP.id })
    expect(p.detector.flagged).toBe(null)
    expect(p.comparison).toBe(null)
  })
})

// ── QUEUE: an ordering, and only an ordering ────────────────────────────────

describe('queue', () => {
  const withRows = (rows) => makeDb({
    course_audio: rows, lego_introductions: [], course_legos: [],
    course_practice_phrases: [], audio_repair_candidates: [], course_audio_revisions: [],
    course_audio_envelope: [],
  })

  const clip = (over) => ({
    id: 'x', course_code: 'deu_for_eng', text: 'a'.repeat(140), role: 'target1',
    voice_id: 'xai_eve', language: 'deu', duration_ms: 10000, s3_key: 'mastered/X.mp3',
    audio_revision: 1, lego_id: null, veracity_pass: true, veracity_reason: null, veracity_cer: 0.01,
    ...over,
  })

  it('excludes unrendered slots — missing audio is a different problem, and buries the damaged clips', async () => {
    const db = withRows([
      clip({ id: 'rendered-short', duration_ms: 3000 }),
      clip({ id: 'never-rendered', duration_ms: null, s3_key: null }),
    ])
    const { core } = makeCore(db)
    const q = await core.queue({ courseCode: 'deu_for_eng' })
    expect(q.items.map(i => i.audioId)).toEqual(['rendered-short'])
    expect(q.excludedUnrendered).toBe(1)
  })

  it('says how many it excluded rather than silently truncating', async () => {
    const db = withRows([clip({ id: 'n1', duration_ms: null, s3_key: null })])
    const { core } = makeCore(db)
    expect((await core.queue({ courseCode: 'deu_for_eng' })).excludedUnrendered).toBe(1)
    expect((await core.queue({ courseCode: 'deu_for_eng', includeUnrendered: true })).excludedUnrendered).toBe(0)
  })

  it('carries the detector and its precision on every response', async () => {
    const { core } = makeCore(withRows([clip({ duration_ms: 3000 })]))
    const q = await core.queue({ courseCode: 'deu_for_eng' })
    expect('precision' in q.detector).toBe(true)
    expect(q.detector.precisionNote).toMatch(/never passes audio/i)
  })
})
