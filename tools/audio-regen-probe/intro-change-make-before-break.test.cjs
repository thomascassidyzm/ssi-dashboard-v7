/**
 * C23: AN INTRO-TEXT CHANGE MUST NEVER SILENCE A SLOT, EVEN IF THE RUN DIES.
 *
 * Run:  node --test tools/audio-regen-probe/intro-change-make-before-break.test.cjs
 *
 * phase8's /regenerate-presentations used to answer "the introduction template
 * changed" by DELETING the LEGO's presentation row — 200 at a time — nulling
 * course_legos.presentation_audio_id, and only then letting /generate re-render.
 * Everything between the delete and the render was a window in which the learner
 * heard nothing. This file kills a run inside that window and counts the silence.
 *
 * Real Postgres (PGlite, in-process wasm), live schema dumped from the estate DB.
 * The planning code under test is the REAL module — services/phases/
 * presentation-refresh-plan.cjs — not a paraphrase of it. The surrounding writes
 * are replicas of the route's write sequence, kept structurally identical to the
 * call sites so a reader can diff them against phase8-audio-v13.cjs.
 *
 * No live database, no S3, no TTS provider, no spend: `fakeRender()` is the only
 * thing that ever "renders" a clip.
 */
const test = require('node:test')
const assert = require('node:assert')
const h = require('./harness.cjs')
const {
  planPresentationRefresh, newestRenderedPresentation,
} = require('../../services/phases/presentation-refresh-plan.cjs')

const COURSE = h.COURSE
const PRES_VOICE = 'azure_en-GB-SoniaNeural'
const LEGO_COUNT = 20
const DIE_AFTER = 7          // the run is killed after this many renders
const line = () => console.log('-'.repeat(78))

// ---------------------------------------------------------------------------
// Fixture: a course whose LEGO introductions are all already rendered and bound.
// One of them is a HUMAN recording — the precious-audio guard must hold.
// ---------------------------------------------------------------------------
const HUMAN_LEGO = 'S0005L01'
const oldIntro = legoId => `In this one you will hear how to say ${legoId}`
const newIntro = legoId => `Here is how to say ${legoId} in Spanish`

async function fixtureAllRendered(db) {
  for (let i = 1; i <= LEGO_COUNT; i++) {
    const legoId = `S${String(i).padStart(4, '0')}L01`
    await db.query(
      `INSERT INTO course_legos (course_code, seed_number, lego_index, lego_id, known_text, target_text, is_new)
       VALUES ($1,$2,1,$3,$4,$5,true)`,
      [COURSE, i, legoId, `word ${i}`, `palabra ${i}`])
    const origin = legoId === HUMAN_LEGO ? 'human' : 'tts'
    const clip = await db.query(
      `INSERT INTO course_audio
         (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, created_at, lego_id)
       VALUES ($1,$2,$3,'eng','presentation',$4,$5,$6,2000,'2026-01-01T00:00:00Z',$7) RETURNING id`,
      [COURSE, oldIntro(legoId), h.normalizeForAudio(oldIntro(legoId)), PRES_VOICE, origin,
       `mastered/OLD-${legoId}.mp3`, legoId])
    await db.query(
      `UPDATE course_legos SET presentation_audio_id = $1 WHERE course_code = $2 AND lego_id = $3`,
      [clip.rows[0].id, COURSE, legoId])
  }
  return Array.from({ length: LEGO_COUNT }, (_, i) => ({
    lego_id: `S${String(i + 1).padStart(4, '0')}L01`,
    presentation_text: newIntro(`S${String(i + 1).padStart(4, '0')}L01`),
  }))
}

// ---------------------------------------------------------------------------
// The only measurement that matters: can the learner hear this slot RIGHT NOW?
// A slot is SILENT if its FK is null, dangles, or names a clip that has not been
// rendered yet (`pending/`). Nothing else counts as audible.
// ---------------------------------------------------------------------------
async function silentSlots(db) {
  const r = await db.query(
    `SELECT l.lego_id, l.presentation_audio_id, a.s3_key
       FROM course_legos l
       LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id
      WHERE l.course_code = $1
      ORDER BY l.lego_id`, [COURSE])
  return r.rows.filter(row =>
    !row.presentation_audio_id || !row.s3_key || row.s3_key.startsWith('pending/'))
}

async function audibleClip(db, legoId) {
  const r = await db.query(
    `SELECT a.s3_key, a.text, a.origin FROM course_legos l
       JOIN course_audio a ON a.id::text = l.presentation_audio_id
      WHERE l.course_code = $1 AND l.lego_id = $2`, [COURSE, legoId])
  return r.rows[0] || null
}

async function presRowsFor(db, legoId) {
  const r = await db.query(
    `SELECT id, text, text_normalized, s3_key, voice_id, origin, created_at
       FROM course_audio WHERE course_code = $1 AND role = 'presentation' AND lego_id = $2
      ORDER BY created_at, id`, [COURSE, legoId])
  return r.rows
}

let renderSeq = 0
const fakeRender = legoId => `mastered/NEW-${legoId}-${++renderSeq}.mp3`

// ===========================================================================
// REPLICA A — the OLD route, phase8-audio-v13.cjs @ cf57fe067^ (lines 4010-4058).
// Delete the changed rows in batches of 200, null the FK, then render.
// ===========================================================================
async function oldRouteThenGenerate(db, presentations, { dieAfter = Infinity } = {}) {
  const existing = await existingByLegoId(db, presentations)
  const idsToDelete = []
  const deletedLegoIds = []
  for (const pres of presentations) {
    const rec = existing.get(pres.lego_id)
    if (!rec) continue
    if (rec.origin === 'human') continue
    if (rec.text_normalized === h.normalizeForAudio(pres.presentation_text)) continue
    idsToDelete.push(rec.id)
    deletedLegoIds.push(pres.lego_id)
  }
  // "delete old, insert new" — the bulk delete, then the FK clear.
  await db.query(`DELETE FROM course_audio WHERE id = ANY($1::uuid[])`, [idsToDelete])
  await db.query(
    `UPDATE course_legos SET presentation_audio_id = NULL WHERE course_code = $1 AND lego_id = ANY($2::text[])`,
    [COURSE, deletedLegoIds])
  // pending rows for the re-render
  for (const legoId of deletedLegoIds) await insertPending(db, legoId, newIntro(legoId))

  // ... and now the render pass, which dies partway.
  let done = 0
  for (const legoId of deletedLegoIds) {
    if (done >= dieAfter) throw new Error('KILLED: process died mid-batch')
    await renderAndBind(db, legoId)
    done++
  }
  return { deleted: idsToDelete.length, rendered: done }
}

// ===========================================================================
// REPLICA B — the FIXED route, phase8-audio-v13.cjs @ cf57fe067 (lines 4009-4085).
// Plan with the REAL module; add the pending row beside the old one; touch
// neither the old row nor the FK.
// ===========================================================================
async function newRouteThenGenerate(db, presentations, { dieAfter = Infinity, gateRejects = new Set() } = {}) {
  const existing = await existingByLegoId(db, presentations)
  const plan = planPresentationRefresh(presentations, existing, h.normalizeForAudio)

  // NO delete. NO FK clear. Just the additions.
  let deletes = 0  // counted so the assertion is about behaviour, not about my prose
  for (const pres of presentations) {
    if (plan.unchangedLegoIds.has(pres.lego_id)) continue
    await insertPending(db, pres.lego_id, pres.presentation_text)
  }

  // The relink phase the route runs straight afterwards: newest RENDERED wins.
  await relinkPresentations(db)

  // ... and now /generate, which dies partway.
  let done = 0, quarantined = 0
  for (const legoId of plan.supersededLegoIds) {
    if (done >= dieAfter) throw new Error('KILLED: process died mid-batch')
    if (gateRejects.has(legoId)) {
      // veracity gate quarantines the render: no upload, no swap, nothing bound.
      quarantined++; done++; continue
    }
    await renderAndBind(db, legoId)
    done++
  }
  return { deleted: deletes, rendered: done - quarantined, quarantined, plan }
}

// --- shared pieces, each mirroring one step of the real route ---------------

/** phase8:3994-4013 — newest RENDERED row per lego_id is the one we compare against. */
async function existingByLegoId(db, presentations) {
  const ids = presentations.map(p => p.lego_id)
  const r = await db.query(
    `SELECT id, lego_id, text_normalized, s3_key, origin, created_at
       FROM course_audio
      WHERE course_code = $1 AND role = 'presentation' AND lego_id = ANY($2::text[])`,
    [COURSE, ids])
  const byLego = new Map()
  for (const rec of r.rows) {
    if (!byLego.has(rec.lego_id)) byLego.set(rec.lego_id, [])
    byLego.get(rec.lego_id).push(rec)
  }
  const out = new Map()
  for (const [legoId, rows] of byLego) {
    out.set(legoId, newestRenderedPresentation(rows) || rows[rows.length - 1])
  }
  return out
}

/** phase8:4089-4115 — the pending placeholder row, upserted, duplicates ignored. */
async function insertPending(db, legoId, text) {
  await db.query(
    `INSERT INTO course_audio
       (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id, created_at)
     VALUES ($1,$2,$3,'eng','presentation',$4,'tts',$5,$6, now())
     ON CONFLICT (course_code, text_normalized, language, role, voice_id) DO NOTHING`,
    [COURSE, text, h.normalizeForAudio(text), PRES_VOICE,
     `pending/${legoId}-${Math.abs(hash(text))}.mp3`, legoId])
}
const hash = s => [...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)

/**
 * /generate's per-item finish, phase8:2805-2809 — render, gate, upload, and only
 * THEN bind the FK. One item, one atomic swap; a crash before this point leaves
 * the previous binding untouched.
 */
async function renderAndBind(db, legoId) {
  const pending = await db.query(
    `SELECT id, text FROM course_audio
      WHERE course_code = $1 AND role = 'presentation' AND lego_id = $2 AND s3_key LIKE 'pending/%'`,
    [COURSE, legoId])
  if (!pending.rows.length) return
  const row = pending.rows[0]
  const s3Key = fakeRender(legoId)                       // render + veracity gate + S3 upload
  await db.query(`UPDATE course_audio SET s3_key = $1, duration_ms = 2100 WHERE id = $2`, [s3Key, row.id])
  await db.query(                                        // ... then, and only then, the swap
    `UPDATE course_legos SET presentation_audio_id = $1 WHERE course_code = $2 AND lego_id = $3`,
    [row.id, COURSE, legoId])
}

/** linkPresentationAudio(), phase8:1918-2010 — belt and braces, newest rendered wins. */
async function relinkPresentations(db) {
  const r = await db.query(
    `SELECT id, lego_id, s3_key, voice_id, created_at FROM course_audio
      WHERE course_code = $1 AND role = 'presentation' AND lego_id IS NOT NULL`, [COURSE])
  const byLego = new Map()
  for (const p of r.rows) {
    if (p.voice_id !== PRES_VOICE) continue          // the voice gate
    if (!byLego.has(p.lego_id)) byLego.set(p.lego_id, [])
    byLego.get(p.lego_id).push(p)
  }
  let linked = 0
  for (const [legoId, rows] of byLego) {
    const winner = newestRenderedPresentation(rows)
    if (!winner) continue
    const res = await db.query(
      `UPDATE course_legos SET presentation_audio_id = $1
        WHERE course_code = $2 AND lego_id = $3 AND presentation_audio_id IS DISTINCT FROM $1`,
      [winner.id, COURSE, legoId])
    linked += res.affectedRows || 0
  }
  return linked
}

// ===========================================================================
test('CONTROL — the OLD path, killed after 7 of 19: 12 slots go silent', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  assert.equal((await silentSlots(db)).length, 0, 'fixture must start fully audible')

  await assert.rejects(() => oldRouteThenGenerate(db, presentations, { dieAfter: DIE_AFTER }),
    /KILLED/, 'the run must die mid-batch')

  const silent = await silentSlots(db)
  line()
  console.log(`  OLD path, killed after ${DIE_AFTER}/19 renders`)
  console.log(`  SILENT SLOTS: ${silent.length} — ${silent.slice(0, 5).map(s => s.lego_id).join(', ')}...`)
  line()

  // 19 tts intros changed, 7 got a replacement, the other 12 have nothing at all.
  assert.equal(silent.length, 12, 'this is the bug: deleted, not yet re-rendered, inaudible')
  for (const s of silent) assert.ok(!s.s3_key || s.s3_key.startsWith('pending/'))
  // and the human recording survived even the old path
  assert.equal((await audibleClip(db, HUMAN_LEGO)).origin, 'human')
})

// ===========================================================================
test('HEADLINE — the FIXED path, killed after 7 of 19: ZERO slots go silent', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  const before = await db.query(`SELECT count(*)::int n FROM course_audio WHERE course_code=$1`, [COURSE])

  await assert.rejects(() => newRouteThenGenerate(db, presentations, { dieAfter: DIE_AFTER }),
    /KILLED/, 'the run must die at the same point')

  const silent = await silentSlots(db)
  const after = await db.query(`SELECT count(*)::int n FROM course_audio WHERE course_code=$1`, [COURSE])

  // every slot still playable
  let onNew = 0, onOld = 0
  for (let i = 1; i <= LEGO_COUNT; i++) {
    const legoId = `S${String(i).padStart(4, '0')}L01`
    const clip = await audibleClip(db, legoId)
    assert.ok(clip, `${legoId} must still be bound to a clip`)
    assert.ok(!clip.s3_key.startsWith('pending/'), `${legoId} must be bound to REAL audio`)
    if (clip.s3_key.startsWith('mastered/NEW-')) { onNew++; assert.equal(clip.text, newIntro(legoId)) }
    else { onOld++ }
  }

  line()
  console.log(`  FIXED path, killed after ${DIE_AFTER}/19 renders`)
  console.log(`  SILENT SLOTS: ${silent.length}`)
  console.log(`  on the NEW verified clip: ${onNew}   still on the OLD clip: ${onOld}`)
  console.log(`  course_audio rows ${before.rows[0].n} -> ${after.rows[0].n} (nothing deleted)`)
  line()

  assert.equal(silent.length, 0, 'NOTHING may go silent')
  assert.equal(onNew, DIE_AFTER, 'the renders that completed did swap over')
  assert.equal(onOld, LEGO_COUNT - DIE_AFTER, 'the rest still play the old introduction')
  assert.ok(after.rows[0].n > before.rows[0].n, 'rows were added, never removed')
})

// ===========================================================================
test('nothing is deleted, and the superseded row keeps its history', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  const oldIds = (await db.query(
    `SELECT id FROM course_audio WHERE course_code=$1 AND role='presentation'`, [COURSE])).rows.map(r => r.id)

  await assert.rejects(() => newRouteThenGenerate(db, presentations, { dieAfter: DIE_AFTER }), /KILLED/)

  const stillThere = (await db.query(
    `SELECT count(*)::int n FROM course_audio WHERE id = ANY($1::uuid[])`, [oldIds])).rows[0].n
  assert.equal(stillThere, oldIds.length, 'every pre-existing presentation row survives')

  // a superseded LEGO carries both rows: the old clip and its replacement
  const rows = await presRowsFor(db, 'S0001L01')
  assert.equal(rows.length, 2)
  assert.ok(rows.some(r => r.s3_key.startsWith('mastered/OLD-')))
  assert.ok(rows.some(r => r.text === newIntro('S0001L01')))
})

// ===========================================================================
test('the relinker does not walk the FK back to the superseded clip', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  await newRouteThenGenerate(db, presentations)                 // full run, no kill

  const beforeRelink = await audibleClip(db, 'S0001L01')
  assert.ok(beforeRelink.s3_key.startsWith('mastered/NEW-'))

  await relinkPresentations(db)                                  // belt and braces, twice
  await relinkPresentations(db)

  const afterRelink = await audibleClip(db, 'S0001L01')
  assert.equal(afterRelink.s3_key, beforeRelink.s3_key, 'must stay on the replacement')
  assert.equal(afterRelink.text, newIntro('S0001L01'))
  assert.equal((await silentSlots(db)).length, 0)
})

// ===========================================================================
test('a quarantined render leaves the old introduction playing', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  const rejects = new Set(['S0002L01', 'S0003L01'])

  await newRouteThenGenerate(db, presentations, { gateRejects: rejects })

  for (const legoId of rejects) {
    const clip = await audibleClip(db, legoId)
    assert.ok(clip.s3_key.startsWith('mastered/OLD-'),
      `${legoId} failed the veracity gate — it must keep the old clip, not go quiet`)
  }
  assert.equal((await silentSlots(db)).length, 0)
})

// ===========================================================================
test('PRECIOUS AUDIO — a human introduction is never superseded or re-rendered', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  const humanBefore = await presRowsFor(db, HUMAN_LEGO)

  const { plan } = await newRouteThenGenerate(db, presentations)

  assert.ok(plan.unchangedLegoIds.has(HUMAN_LEGO), 'the human LEGO is left alone')
  assert.ok(!plan.supersededLegoIds.includes(HUMAN_LEGO))
  assert.equal(plan.humanPreserved, 1, 'and it is counted and reported, not silently skipped')

  const humanAfter = await presRowsFor(db, HUMAN_LEGO)
  assert.deepEqual(humanAfter.map(r => r.s3_key), humanBefore.map(r => r.s3_key),
    'no new row, no changed row — the human recording is untouched')
  const clip = await audibleClip(db, HUMAN_LEGO)
  assert.equal(clip.origin, 'human')
  assert.equal(clip.s3_key, `mastered/OLD-${HUMAN_LEGO}.mp3`)
})

// ===========================================================================
test('re-running after a crash converges — the survivors get their replacement', async () => {
  const db = await h.createFixture()
  const presentations = await fixtureAllRendered(db)
  await assert.rejects(() => newRouteThenGenerate(db, presentations, { dieAfter: DIE_AFTER }), /KILLED/)
  assert.equal((await silentSlots(db)).length, 0)

  await newRouteThenGenerate(db, presentations)   // operator presses the button again

  assert.equal((await silentSlots(db)).length, 0, 'still nothing silent on the second pass')
  let onNew = 0
  for (let i = 1; i <= LEGO_COUNT; i++) {
    const legoId = `S${String(i).padStart(4, '0')}L01`
    const clip = await audibleClip(db, legoId)
    if (clip.s3_key.startsWith('mastered/NEW-')) onNew++
  }
  assert.equal(onNew, LEGO_COUNT - 1, 'all 19 tts intros converge on the new text; the human one does not')
})
