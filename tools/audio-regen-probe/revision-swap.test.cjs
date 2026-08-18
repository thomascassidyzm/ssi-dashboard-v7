/**
 * THE CACHE-BUST FIX, TESTED AGAINST THE REAL MODULE.
 *
 * replacement-routes.test.cjs established the defect: six in-place writers
 * change a clip's bytes without moving `audio_revision`, so the learner-facing
 * ref `<uuid>.vN` never changes and any device that already played the clip
 * keeps the old audio behind `max-age=31536000, immutable` and in player-vue's
 * IndexedDB AudioCache. This file tests the fix.
 *
 * WHAT IS UNDER TEST HERE IS THE SHIPPING CODE, NOT A SIMULATION. Unlike
 * routes.cjs — which mirrors phase8's write shapes so routes can be compared —
 * these tests `require()` services/shared/audio-revision-swap.cjs itself and run
 * it against real PostgreSQL (PGlite, in-process wasm) carrying the live schema.
 * A regression in that module fails these tests.
 *
 * The six call sites are then held by a static guard (S1) that reads the two
 * service files and fails if any in-place `s3_key` write reappears without a
 * revision bump. That is deliberately a source check: standing phase8 up in a
 * test would need Azure, S3 and a live Supabase, which is exactly the spend the
 * probe harness exists to avoid.
 *
 * Run:  node --test 'tools/audio-regen-probe/*.test.cjs'
 * No network, no live DB, no S3, no TTS spend.
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const r = require('./routes.cjs')

// The real thing.
const { swapClipInPlace, writeOrSwapClip } = require('../../services/shared/audio-revision-swap.cjs')

const REPO = path.join(__dirname, '..', '..')
const PHASE8 = path.join(REPO, 'services', 'phases', 'phase8-audio-v13.cjs')
const PROD_API = path.join(REPO, 'services', 'production-api.cjs')

const line = () => console.log('-'.repeat(78))
const show = (label, o) => console.log(`  ${label}: ${JSON.stringify(o)}`)

const COURSE = 'xxx_for_test'
const OLD_BAD = 'mastered/OLD-BAD-0001.mp3'
const NEW_GOOD = 'mastered/NEW-GOOD-0001.mp3'

/**
 * The supabase-js surface swapClipInPlace actually uses, over PGlite.
 * Deliberately minimal: .from().select().eq().single()/maybeSingle(),
 * .from().update().eq(), .from().upsert(..., {onConflict}). Anything the module
 * starts using that is not here will throw rather than silently pass.
 */
function supabaseOver (db) {
  const run = async (sql, params) => db.query(sql, params)

  return {
    from (table) {
      const state = { table, filters: [], op: null, payload: null, onConflict: null, columns: '*' }

      const where = () => state.filters.length
        ? ' WHERE ' + state.filters.map((f, i) => `${f.col} = $${i + 1}`).join(' AND ')
        : ''
      const params = () => state.filters.map(f => f.val)

      const api = {
        select (cols) { state.columns = cols || '*'; if (!state.op) state.op = 'select'; return api },
        eq (col, val) { state.filters.push({ col, val }); return api },

        update (payload) { state.op = 'update'; state.payload = payload; return api },
        insert (payload) { state.op = 'insert'; state.payload = payload; return api },
        upsert (payload, opts) {
          state.op = 'upsert'; state.payload = payload
          state.onConflict = opts?.onConflict || null
          return api
        },

        async single () { return finish(true) },
        async maybeSingle () { return finish(false) },
        // Awaiting without .single() — used by plain updates.
        then (resolve, reject) { finish(null).then(resolve, reject) },
      }

      async function finish (mustExistOne) {
        try {
          if (state.op === 'select') {
            const res = await run(`SELECT ${state.columns} FROM ${state.table}${where()}`, params())
            if (mustExistOne === true) {
              if (res.rows.length !== 1) {
                return { data: null, error: { message: `expected 1 row, got ${res.rows.length}`, code: 'PGRST116' } }
              }
              return { data: res.rows[0], error: null }
            }
            if (mustExistOne === false) return { data: res.rows[0] || null, error: null }
            return { data: res.rows, error: null }
          }

          if (state.op === 'update') {
            const cols = Object.keys(state.payload)
            const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ')
            const vals = cols.map(c => state.payload[c])
            const filterSql = state.filters.length
              ? ' WHERE ' + state.filters.map((f, i) => `${f.col} = $${cols.length + i + 1}`).join(' AND ')
              : ''
            await run(`UPDATE ${state.table} SET ${sets}${filterSql}`, [...vals, ...params()])
            return { data: null, error: null }
          }

          if (state.op === 'insert' || state.op === 'upsert') {
            const cols = Object.keys(state.payload)
            const vals = cols.map(c => state.payload[c])
            let sql = `INSERT INTO ${state.table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`
            if (state.op === 'upsert' && state.onConflict) {
              const target = state.onConflict.split(',').map(s => s.trim()).join(', ')
              sql += ` ON CONFLICT (${target}) DO UPDATE SET ` + cols.map(c => `${c} = EXCLUDED.${c}`).join(', ')
            }
            sql += ' RETURNING *'
            const res = await run(sql, vals)
            return { data: mustExistOne === true ? res.rows[0] : res.rows, error: null }
          }

          throw new Error(`adapter: unsupported op ${state.op}`)
        } catch (e) {
          // Surface the PG SQLSTATE the way supabase-js does, so 23505 handling
          // in the callers can be exercised for real.
          return { data: null, error: { message: e.message, code: e.code || undefined } }
        }
      }

      return api
    },
  }
}

async function oneClip (db, { s3Key = OLD_BAD, revision = null } = {}) {
  const res = await db.query(
    `INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
     VALUES ($1,'Quiero hablar','quiero hablar','spa','target1','azure_es-ES-ElviraNeural','tts',$2,1000)
     RETURNING id, audio_revision`,
    [COURSE, s3Key]
  )
  const row = res.rows[0]
  if (revision !== null) {
    await db.query('UPDATE course_audio SET audio_revision=$1 WHERE id=$2', [revision, row.id])
  }
  return row.id
}

const clip = async (db, id) =>
  (await db.query('SELECT id, s3_key, duration_ms, audio_revision, origin, voice_id FROM course_audio WHERE id=$1', [id])).rows[0]

const history = async (db, id) =>
  (await db.query('SELECT revision, previous_revision, previous_s3_key, new_s3_key, source, accepted_by FROM course_audio_revisions WHERE audio_id=$1 ORDER BY revision', [id])).rows

// ===========================================================================
test('V1. the swap moves the learner ref — revision bumps, id does not', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)
  const before = await clip(db, id)

  line(); console.log('V1. an in-place byte replacement through the fixed path')
  show('before', { id: before.id.slice(0, 8), s3: before.s3_key, rev: before.audio_revision })

  const out = await swapClipInPlace({
    supabase: supabaseOver(db),
    audioId: id,
    newS3Key: NEW_GOOD,
    durationMs: 1800,
    patch: { origin: 'tts' },
    source: 'phase8-regenerate-single',
    acceptedBy: 'test',
    reason: 'V1',
  })

  const after = await clip(db, id)
  show('after', { id: after.id.slice(0, 8), s3: after.s3_key, rev: after.audio_revision })
  show('returned', { revision: out.revision, previousRevision: out.previousRevision, previousS3Key: out.previousS3Key })

  assert.strictEqual(after.id, before.id, 'row id must NOT move — that is what keeps holder FKs intact')
  assert.strictEqual(after.s3_key, NEW_GOOD, 'new bytes are in the slot')
  assert.strictEqual(after.audio_revision, 2, 'THE FIX: revision moved 1 -> 2')
  assert.strictEqual(after.duration_ms, 1800)
  assert.strictEqual(out.previousS3Key, OLD_BAD)

  console.log(`V1. learner ref went ${id.slice(0, 8)}….v1 -> ${id.slice(0, 8)}….v2 — a NEW url and a NEW IndexedDB key.`)
  console.log('V1. A RETURNING LEARNER NOW MISSES BOTH CACHES AND REFETCHES.')
})

// ===========================================================================
test('V2. the rollback ledger is written — the swap is undoable and auditable', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  await swapClipInPlace({
    supabase: supabaseOver(db), audioId: id, newS3Key: NEW_GOOD, durationMs: 1800,
    source: 'recordist-retake', acceptedBy: 'production-api /upload (recording)', reason: 'V2',
  })

  const h = await history(db, id)
  line(); console.log('V2. course_audio_revisions after one swap')
  show('history', h)

  assert.strictEqual(h.length, 1, 'exactly one history row')
  assert.strictEqual(h[0].revision, 2)
  assert.strictEqual(h[0].previous_revision, 1)
  assert.strictEqual(h[0].previous_s3_key, OLD_BAD, 'the superseded key is recorded, so the take is recoverable')
  assert.strictEqual(h[0].new_s3_key, NEW_GOOD)
  assert.strictEqual(h[0].source, 'recordist-retake')

  console.log('V2. The old key is retained AND recorded — nothing is deleted, and revert has something to aim at.')
})

// ===========================================================================
test('V3. repeated swaps keep climbing — v2, v3, v4, never a reused address', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  line(); console.log('V3. three regenerations of the same clip, as an operator would')
  const seen = []
  for (const n of [1, 2, 3]) {
    const out = await swapClipInPlace({
      supabase: supabaseOver(db), audioId: id, newS3Key: `mastered/TAKE-${n}.mp3`,
      durationMs: 1000 + n, source: 'phase8-regenerate-role', acceptedBy: 'test', reason: `take ${n}`,
    })
    seen.push(out.revision)
  }
  show('revisions handed out', seen)

  assert.deepStrictEqual(seen, [2, 3, 4], 'every swap gets its own address')
  assert.strictEqual((await clip(db, id)).audio_revision, 4)
  assert.strictEqual((await history(db, id)).length, 3, 'one ledger row per swap')

  const refs = seen.map(v => `${id}.v${v}`)
  assert.strictEqual(new Set(refs).size, 3, 'no learner ref is ever reissued')
  console.log('V3. Three replacements, three distinct learner refs. No cache can serve a stale one.')
})

// ===========================================================================
test('V4. an interrupted swap can be retried — the 2026-08-08 poison pill stays dead', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  line(); console.log('V4. simulate a run killed BETWEEN the history write and the row update')
  // Exactly the wreckage the incident left: history says revision 2, the clip
  // still says 1. Under a plain INSERT every retry recomputes revision 2 and
  // dies on UNIQUE (audio_id, revision) — permanently.
  await db.query(
    `INSERT INTO course_audio_revisions (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key, accepted_by)
     VALUES ($1,$2,2,1,$3,'mastered/INTERRUPTED.mp3','killed run')`,
    [id, COURSE, OLD_BAD]
  )
  show('wreckage', { clipRevision: (await clip(db, id)).audio_revision, historyRows: (await history(db, id)).length })

  // The retry. Must succeed, not die on the unique constraint.
  const out = await swapClipInPlace({
    supabase: supabaseOver(db), audioId: id, newS3Key: NEW_GOOD, durationMs: 1800,
    source: 'phase8-regenerate-single', acceptedBy: 'retry', reason: 'V4 retry',
  })

  const after = await clip(db, id)
  const h = await history(db, id)
  show('after retry', { rev: after.audio_revision, s3: after.s3_key, historyRows: h.length })

  assert.strictEqual(out.revision, 2)
  assert.strictEqual(after.audio_revision, 2, 'the retry lands')
  assert.strictEqual(after.s3_key, NEW_GOOD)
  assert.strictEqual(h.length, 1, 'the stale ledger row was rewritten, not duplicated')
  assert.strictEqual(h[0].new_s3_key, NEW_GOOD, 'and it now describes the swap that actually happened')
  assert.strictEqual(h[0].previous_s3_key, OLD_BAD, 'previous_s3_key is still the real predecessor')

  console.log('V4. UPSERT on (audio_id, revision) means an interrupted clip is retryable, not bricked.')
})

// ===========================================================================
test('V5. make-before-break — the row is not pointed at bytes that are not there', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  line(); console.log('V5. verifyObject says the new object is missing')
  await assert.rejects(
    () => swapClipInPlace({
      supabase: supabaseOver(db), audioId: id, newS3Key: NEW_GOOD, durationMs: 1800,
      source: 'test', acceptedBy: 'test', verifyObject: async () => false,
    }),
    /not in bucket/,
    'it must refuse'
  )

  const after = await clip(db, id)
  show('clip after refusal', { s3: after.s3_key, rev: after.audio_revision })
  assert.strictEqual(after.s3_key, OLD_BAD, 'the learner still has working audio')
  assert.strictEqual(after.audio_revision, 1, 'and no revision was burned')
  assert.strictEqual((await history(db, id)).length, 0, 'no ledger row for a swap that did not happen')

  console.log('V5. A failed swap leaves the old clip serving. No silent window.')
})

// ===========================================================================
test('V6. the swap refuses to move clip identity — text and id are never patched', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  line(); console.log('V6. a caller passes text/id in the patch by mistake')
  await swapClipInPlace({
    supabase: supabaseOver(db), audioId: id, newS3Key: NEW_GOOD, durationMs: 1800,
    patch: { text: 'SOMETHING ELSE', text_normalized: 'something else', origin: 'tts' },
    source: 'test', acceptedBy: 'test',
  })

  const after = await clip(db, id)
  const raw = (await db.query('SELECT text, text_normalized FROM course_audio WHERE id=$1', [id])).rows[0]
  show('text after swap', raw)

  assert.strictEqual(raw.text, 'Quiero hablar', 'text is NOT the swap helper\'s to move')
  assert.strictEqual(after.audio_revision, 2, 'the swap itself still happened')

  console.log('V6. Leaving text/identity alone is what keeps unique_course_audio_per_voice satisfied')
  console.log('V6. and the row id stable — a stable id is why no holder FK is ever orphaned.')
})

// ===========================================================================
test('V7. a missing revision bump is caught, not shrugged off', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)

  line(); console.log('V7. a supabase whose UPDATE silently does nothing (the original bug, mechanised)')
  const real = supabaseOver(db)
  const deaf = {
    from (table) {
      const api = real.from(table)
      if (table !== 'course_audio') return api
      // The UPDATE reports success and writes nothing — a silent no-op, which
      // is the failure mode a caller cannot see and the assertion exists for.
      api.update = () => ({
        eq: () => ({ then: (resolve) => resolve({ data: null, error: null }) }),
      })
      return api
    },
  }

  await assert.rejects(
    () => swapClipInPlace({
      supabase: deaf, audioId: id, newS3Key: NEW_GOOD, durationMs: 1800,
      source: 'test', acceptedBy: 'test',
    }),
    /s3_key did not take|audio_revision is/,
    'the post-swap assertion must fire'
  )

  console.log('V7. The helper verifies its own write. A swap that did not take is an error, not a success.')
})

// ===========================================================================
// writeOrSwapClip — the branch /regenerate-phrase and /regenerate-lego take.
// ===========================================================================

const IDENTITY = {
  course_code: COURSE,
  text_normalized: 'quiero hablar',
  language: 'spa',
  role: 'target1',
  voice_id: 'azure_es-ES-ElviraNeural',
}
const insertRowFor = (s3Key) => ({
  ...IDENTITY, text: 'Quiero hablar', origin: 'tts', s3_key: s3Key, duration_ms: 1500,
})

test('W1. TEXT CHANGED — the key is free, so a NEW row is minted (ref changes by id)', async () => {
  const db = await r.createRouteFixture()
  await oneClip(db)  // an existing clip under a DIFFERENT text key

  line(); console.log('W1. regenerate-phrase with edited text — nothing holds the new key')
  const out = await writeOrSwapClip({
    supabase: supabaseOver(db),
    identity: { ...IDENTITY, text_normalized: 'quiero hablar contigo' },
    insertRow: { ...insertRowFor(NEW_GOOD), text_normalized: 'quiero hablar contigo', text: 'Quiero hablar contigo' },
    swapPatch: { origin: 'tts' },
    newS3Key: NEW_GOOD, durationMs: 1500,
    source: 'phase8-regenerate-phrase', acceptedBy: 'test',
  })
  show('result', out)

  const rows = (await db.query('SELECT id FROM course_audio')).rows
  assert.strictEqual(out.created, true, 'a changed text mints a row')
  assert.strictEqual(out.revision, null, 'a brand-new row needs no bump — its uuid IS new')
  assert.strictEqual(rows.length, 2, 'the old clip is untouched, not overwritten')

  console.log('W1. New uuid = new learner ref. Correct without any versioning, and unchanged by this branch.')
})

test('W2. TEXT UNCHANGED — the key is held, so the bytes are swapped VERSIONED', async () => {
  const db = await r.createRouteFixture()
  const id = await oneClip(db)   // holds exactly IDENTITY

  line(); console.log('W2. regenerate-lego on locked text — the key is already held')
  show('before', await clip(db, id))

  const out = await writeOrSwapClip({
    supabase: supabaseOver(db),
    identity: IDENTITY,
    insertRow: insertRowFor(NEW_GOOD),
    swapPatch: { origin: 'tts' },
    newS3Key: NEW_GOOD, durationMs: 1500,
    source: 'phase8-regenerate-lego', acceptedBy: 'test', reason: 'W2',
  })
  const after = await clip(db, id)
  show('result', out); show('after', after)

  assert.strictEqual(out.created, false, 'no new row — it landed on the existing one')
  assert.strictEqual(out.audioId, id, 'the SAME row id, so no holder FK moves')
  assert.strictEqual(after.s3_key, NEW_GOOD, 'new bytes')
  assert.strictEqual(after.audio_revision, 2, 'THE FIX: the ref moves even though the id did not')
  assert.strictEqual((await db.query('SELECT id FROM course_audio')).rows.length, 1, 'still one row')
  assert.strictEqual((await history(db, id)).length, 1, 'and the swap is in the ledger')

  console.log('W2. THIS IS THE CASE THE OLD UPSERT GOT WRONG — same id, new bytes, ref now v2.')
  console.log('W2. /regenerate-lego LOCKS its text, so for that route this was the NORMAL path.')
})

test('W3. concurrent create — the race lands on the versioned swap, never an unversioned overwrite', async () => {
  const db = await r.createRouteFixture()

  line(); console.log('W3. the key is free at lookup, taken by the time we INSERT')
  let raced = null
  const base = supabaseOver(db)
  const racy = {
    from (table) {
      const api = base.from(table)
      if (table !== 'course_audio') return api
      const insert = api.insert.bind(api)
      api.insert = (payload) => {
        // Someone else creates the row first, between our lookup and our insert.
        if (!raced) {
          raced = 'pending'
          return {
            select: () => ({ single: async () => {
              const res = await db.query(
                `INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
                 VALUES ($1,'Quiero hablar','quiero hablar','spa','target1','azure_es-ES-ElviraNeural','tts',$2,1000) RETURNING id`,
                [COURSE, OLD_BAD]
              )
              raced = res.rows[0].id
              return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } }
            } }),
          }
        }
        return insert(payload)
      }
      return api
    },
  }

  const out = await writeOrSwapClip({
    supabase: racy,
    identity: IDENTITY,
    insertRow: insertRowFor(NEW_GOOD),
    swapPatch: { origin: 'tts' },
    newS3Key: NEW_GOOD, durationMs: 1500,
    source: 'phase8-regenerate-phrase', acceptedBy: 'test',
  })
  const after = await clip(db, raced)
  show('result', out); show('after', after)

  assert.strictEqual(out.created, false)
  assert.strictEqual(out.audioId, raced, 'it found the row the racer created')
  assert.strictEqual(after.s3_key, NEW_GOOD, 'and put our bytes on it')
  assert.strictEqual(after.audio_revision, 2, 'VERSIONED — the old UPSERT would have overwritten at v1')
  assert.strictEqual((await history(db, raced)).length, 1)

  console.log('W3. The 23505 is still caught (no 500), but the collision now moves the learner ref.')
})

// ===========================================================================
test('S1. STATIC GUARD — no in-place s3_key writer may skip the revision bump', async () => {
  line(); console.log('S1. reading the shipping source of the six writers')

  const phase8 = fs.readFileSync(PHASE8, 'utf8')
  const prodApi = fs.readFileSync(PROD_API, 'utf8')

  // Each of the six, named by the checker/marker string that is unique to it,
  // with the call that must now carry it.
  const SIX = [
    { route: '/regenerate-single',       file: 'phase8',   marker: "source: 'phase8-regenerate-single'" },
    { route: '/regenerate-role',         file: 'phase8',   marker: "source: 'phase8-regenerate-role'" },
    { route: '/regenerate-presentation', file: 'phase8',   marker: "source: 'phase8-regenerate-presentation'" },
    { route: '/regenerate-phrase',       file: 'phase8',   marker: "source: 'phase8-regenerate-phrase'" },
    { route: '/regenerate-lego',         file: 'phase8',   marker: "source: 'phase8-regenerate-lego'" },
    { route: 'recordist retake',         file: 'prod-api', marker: "source: 'recordist-retake'" },
  ]

  for (const w of SIX) {
    const src = w.file === 'phase8' ? phase8 : prodApi
    assert.ok(src.includes(w.marker), `${w.route} no longer routes through swapClipInPlace (${w.marker} missing)`)
    console.log(`  ${w.route.padEnd(28)} -> swapClipInPlace  OK`)
  }

  // The regression that would undo this: a bare in-place UPDATE of course_audio
  // that sets s3_key without audio_revision. reuseRenderClip's own swap and the
  // helper itself are the only places s3_key and audio_revision travel together.
  const bareInPlace = []
  for (const [name, src] of [['phase8', phase8], ['production-api', prodApi]]) {
    const re = /\.from\('course_audio'\)\s*\n?\s*\.update\(\{([\s\S]{0,900}?)\}\)/g
    let m
    while ((m = re.exec(src)) !== null) {
      const body = m[1]
      if (/\bs3_key\s*:/.test(body) && !/\baudio_revision\s*:/.test(body)) {
        bareInPlace.push({ file: name, at: src.slice(0, m.index).split('\n').length, body: body.trim().slice(0, 90) })
      }
    }
  }
  show('bare in-place s3_key updates found', bareInPlace)
  assert.deepStrictEqual(bareInPlace, [],
    'an UPDATE course_audio SET s3_key without audio_revision is the bug this branch fixed — route it through swapClipInPlace')

  console.log('S1. All six writers versioned, and no unversioned in-place s3_key write remains in either file.')
})
