/**
 * WHICH REPLACEMENT ROUTE ACTUALLY WORKS.
 *
 * unlink-then-generate.test.cjs established that route (b) silently re-links
 * the same bad clip. This file puts the OTHER routes through the identical
 * four questions, so they can be compared on one axis rather than argued about:
 *
 *   Q1  does it call TTS and produce genuinely NEW bytes?
 *   Q2  does the slot end up on new audio, or back on the old row?
 *   Q3  can it change the VOICE?
 *   Q4  does what the operator is told match what happened?
 *
 * Run:  node --test 'tools/audio-regen-probe/*.test.cjs'
 *
 * Real Postgres (PGlite, in-process wasm). No network, no live DB, no S3, no
 * TTS spend — h.fakeTts() is the only thing that ever "renders".
 */
const test = require('node:test')
const assert = require('node:assert')
const h = require('./harness.cjs')
const r = require('./routes.cjs')

const line = () => console.log('-'.repeat(78))
const show = (label, o) => console.log(`  ${label}: ${JSON.stringify(o)}`)

const OLD_BAD = 'mastered/OLD-BAD-0001.mp3'
const ELVIRA = 'azure_es-ES-ElviraNeural'

/** One bad target clip, one lego slot pointing at it. Same fixture as H. */
async function badClipLinked (db, { text = 'Quiero hablar', known = 'I want to speak', s3Key = OLD_BAD, voiceId = ELVIRA, origin = 'tts' } = {}) {
  const bad = await h.seedAudio(db, { text, s3Key, voiceId })
  if (origin === 'human') await db.query(`UPDATE course_audio SET origin='human' WHERE id=$1`, [bad.id])
  await h.seedAudio(db, { text: known, role: 'known', language: 'eng', voiceId: 'azure_en-GB-LibbyNeural', s3Key: 'mastered/KNOWN-OK.mp3' })
  const legoId = await h.seedLego(db, { knownText: known, targetText: text })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])
  return { bad, legoId }
}

// ===========================================================================
test('R0. ROUTE (a) part 1 — FLAG ALONE changes no audio at all', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  line(); console.log('R0. operator presses FLAG and nothing else')
  await r.flagClip(db, { courseCode: h.COURSE, audioUuid: bad.id, reason: 'wrong word' })

  const after = await h.legoRow(db, legoId)
  const rows = await h.audioRows(db)
  const flags = (await db.query('SELECT audio_uuid, status, regen_count FROM audio_flags')).rows
  show('audio_flags now holds', flags)
  show('TTS calls', h.ttsCallCount())
  show('lego still points at', { id: after.target1_audio_id, s3: after.target1_s3_key })

  assert.strictEqual(h.ttsCallCount(), 0, 'flagging spends nothing')
  assert.strictEqual(rows.length, 1, 'no new row')
  assert.strictEqual(after.target1_s3_key, OLD_BAD, 'the learner still hears the bad clip')
  assert.strictEqual(flags.length, 1)
  console.log('R0. Q1 no. Q2 unchanged. Q3 no. Q4 honest — a flag claims only to be a flag.')
  console.log('R0. FLAG IS A TODO MARKER, NOT A REPLACEMENT. It has to be followed by a regenerate.')
})

// ===========================================================================
test('R1. ROUTE (a) part 2 — flag then /regenerate-single: REAL new bytes, same row id', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)
  await r.flagClip(db, { courseCode: h.COURSE, audioUuid: bad.id })

  line(); console.log('R1. BEFORE')
  show('lego points at', { id: bad.id, s3: OLD_BAD })

  const out = await r.regenerateSingle(db, {
    courseCode: h.COURSE, audioUuid: bad.id,
    voiceConfigVoiceId: 'es-ES-ElviraNeural',      // SAME voice: a plain "this is wrong, redo it"
  })
  const after = await h.legoRow(db, legoId)
  const rows = await h.audioRows(db)

  console.log('R1. AFTER /regenerate-single')
  show('response', out)
  show('audio rows', rows.map(x => ({ id: x.id, s3: x.s3_key, voice: x.voice_id })))
  show('lego points at', { id: after.target1_audio_id, s3: after.target1_s3_key })

  assert.strictEqual(out.ttsCalls, 1, 'Q1 YES — TTS ran exactly once')
  assert.strictEqual(rows.length, 1, 'no second row was minted — the swap is in place at the same id')
  assert.strictEqual(after.target1_audio_id, bad.id, 'the FK never moved, so nothing could be orphaned')
  assert.notStrictEqual(after.target1_s3_key, OLD_BAD, 'Q2 YES — the slot serves a DIFFERENT object')
  assert.strictEqual(after.target1_s3_key, out.newS3Key)
  assert.match(after.target1_s3_key, /^mastered\//, 'and it is under mastered/, the public prefix')
  assert.strictEqual(out.regenCount, 1, 'Q4 — the flag row records that a regen happened')
  console.log('R1. Q1 yes (1 TTS). Q2 new object. Q4 the returned newS3Key is the one the slot serves.')
  console.log('R1. This is the route Tom exercised on bul_for_eng. It genuinely re-renders.')
})

// ===========================================================================
test('R2. ROUTE (a) CAN re-voice — the axis on which unlink-then-generate provably fails', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { voiceId: ELVIRA })

  line(); console.log('R2. voice_config switched Elvira -> Alvaro, then /regenerate-single')
  const out = await r.regenerateSingle(db, {
    courseCode: h.COURSE, audioUuid: bad.id,
    voiceConfigVoiceId: 'es-ES-AlvaroNeural',
  })
  const row = (await r.clipRows(db))[0]
  const after = await h.legoRow(db, legoId)
  show('response', out)
  show('voice the learner now hears', row.voice_id)
  show('s3_key the learner now gets', after.target1_s3_key)

  assert.strictEqual(out.ttsCalls, 1)
  assert.strictEqual(row.voice_id, 'azure_es-ES-AlvaroNeural', 'Q3 YES — the voice really changed')
  assert.notStrictEqual(after.target1_s3_key, OLD_BAD)
  console.log('R2. Compare H3: the identical re-voice through unlink-then-generate made 0 TTS calls')
  console.log('R2. and left voice_id on Elvira. Same intent, opposite outcome. Q3 is the sharpest split.')
})

// ===========================================================================
test('R3. ROUTE (a) trap — on a RE-VOICE with reuse on, it can succeed WITHOUT rendering', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { voiceId: ELVIRA })

  line(); console.log('R3. re-voice, reuse enabled, and a sibling course HAS this line in the new voice')
  const out = await r.regenerateSingle(db, {
    courseCode: h.COURSE, audioUuid: bad.id,
    voiceConfigVoiceId: 'es-ES-AlvaroNeural',
    reuseEnabled: true,
    siblingReuse: () => ({ s3Key: 'mastered/SIBLING-ALVARO.mp3', durationMs: 1400 }),
  })
  const after = await h.legoRow(db, legoId)
  show('response', out)
  show('lego points at', after.target1_s3_key)

  assert.strictEqual(out.ttsCalls, 0, 'no TTS — the bytes came from a sibling course')
  assert.strictEqual(out.reused, true, 'and the response SAYS SO: reused:true')
  assert.strictEqual(after.target1_s3_key, 'mastered/SIBLING-ALVARO.mp3', 'still genuinely different bytes')
  console.log('R3. NOT a silent failure: the bytes DID change, and reused:true is on the response.')
  console.log('R3. But note the boundary (phase8:4452): reuse is attempted ONLY when isRevoice.')

  // The same-voice press — "this clip is wrong" — must never be answered by reuse.
  const db2 = await r.createRouteFixture()
  h.resetTts()
  const f2 = await badClipLinked(db2, { voiceId: ELVIRA })
  const out2 = await r.regenerateSingle(db2, {
    courseCode: h.COURSE, audioUuid: f2.bad.id,
    voiceConfigVoiceId: 'es-ES-ElviraNeural',
    reuseEnabled: true,
    siblingReuse: () => ({ s3Key: 'mastered/SIBLING-ELVIRA.mp3', durationMs: 1400 }),
  })
  show('same-voice press with reuse ON', out2)
  assert.strictEqual(out2.ttsCalls, 1, 'a same-voice repair ALWAYS renders — reuse is not consulted')
  assert.strictEqual(out2.reused, false)
  console.log('R3. Correct by design: when the voice is unchanged the operator wants DIFFERENT bytes,')
  console.log('R3. and only a render can give them. Reuse would have handed back a copy of the fault.')
})

// ===========================================================================
test('R4. ROUTE (a) refuses human recordings — 409, no spend, nothing touched', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { origin: 'human' })

  line(); console.log('R4. /regenerate-single on a human take')
  const out = await r.regenerateSingle(db, {
    courseCode: h.COURSE, audioUuid: bad.id, voiceConfigVoiceId: 'es-ES-ElviraNeural',
  })
  show('response', out)
  const after = await h.legoRow(db, legoId)

  assert.strictEqual(out.status, 409)
  assert.strictEqual(out.ttsCalls, 0, 'refused BEFORE paying')
  assert.strictEqual(after.target1_s3_key, OLD_BAD, 'the human take is untouched')
  console.log('R4. Q4 honest — it returns an error rather than a success. The precious-audio guard holds.')
  console.log('R4. GAP for operators: a bad HUMAN clip cannot be fixed on this route at all. Route (d) can.')
})

// ===========================================================================
test('R5. ROUTE (d) repair propose -> accept: new bytes, same id, and it is UNDOABLE', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  line(); console.log('R5. PROPOSE (production must not move)')
  const prop = await r.repairPropose(db, { courseCode: h.COURSE, audioId: bad.id, source: 'tts' })
  const midway = await h.legoRow(db, legoId)
  show('candidate', { id: prop.candidateId, s3: prop.s3Key })
  show('TTS spent on the proposal', prop.ttsCalls)
  show('lego STILL points at', midway.target1_s3_key)
  assert.strictEqual(prop.ttsCalls, 1, 'the candidate is a real render')
  assert.strictEqual(midway.target1_s3_key, OLD_BAD,
    'make-before-break: after propose, the learner is still on the OLD clip')
  assert.match(prop.s3Key, /^repair-candidates\//, 'candidate lives under its own prefix, never over mastered/')

  console.log('R5. ACCEPT (the human pass)')
  const acc = await r.repairAccept(db, { courseCode: h.COURSE, audioId: bad.id, candidateId: prop.candidateId })
  const after = await h.legoRow(db, legoId)
  const row = (await r.clipRows(db))[0]
  show('response', acc)
  show('lego now points at', { id: after.target1_audio_id, s3: after.target1_s3_key })
  show('audio_revision', row.audio_revision)

  assert.strictEqual(acc.ttsCalls, 0, 'accept renders nothing — the bytes already existed')
  assert.strictEqual(after.target1_audio_id, bad.id, 'Q2 — same row id, FK never moved')
  assert.strictEqual(after.target1_s3_key, prop.s3Key, 'Q1 — serving the newly rendered object')
  assert.strictEqual(row.audio_revision, 2, 'revision bumped 1 -> 2')
  assert.strictEqual(acc.supersededS3Key, OLD_BAD, 'and the old key is RECORDED, not lost')

  const hist = (await db.query('SELECT revision, previous_s3_key, new_s3_key, accepted_by FROM course_audio_revisions ORDER BY revision')).rows
  show('course_audio_revisions', hist)
  assert.strictEqual(hist.length, 1)

  console.log('R5. REVERT (the safety net)')
  const rev = await r.repairRevert(db, { courseCode: h.COURSE, audioId: bad.id })
  const back = await h.legoRow(db, legoId)
  const row3 = (await r.clipRows(db))[0]
  show('response', rev)
  show('lego points at', back.target1_s3_key)
  show('audio_revision', row3.audio_revision)
  assert.strictEqual(rev.ttsCalls, 0, 'undo costs nothing and renders nothing')
  assert.strictEqual(back.target1_s3_key, OLD_BAD, 'back on the object it served before')
  assert.strictEqual(row3.audio_revision, 3, 'as revision 3 — the number never goes backwards')
  console.log('R5. Route (d) is the only route with an undo. /regenerate-single writes no history row,')
  console.log('R5. so once it overwrites s3_key the previous key is gone from the database entirely.')
})

// ===========================================================================
test('R6. ROUTE (d) is the ONLY route that can replace a bad HUMAN clip', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { origin: 'human' })

  line(); console.log('R6. a human recording with a fluff in it; producer has a better take')
  const prop = await r.repairPropose(db, { courseCode: h.COURSE, audioId: bad.id, source: 'upload' })
  const acc = await r.repairAccept(db, { courseCode: h.COURSE, audioId: bad.id, candidateId: prop.candidateId })
  const after = await h.legoRow(db, legoId)
  const row = (await r.clipRows(db))[0]
  show('propose (upload) TTS spend', prop.ttsCalls)
  show('lego points at', after.target1_s3_key)
  show('origin after accept', row.origin)

  assert.strictEqual(prop.ttsCalls, 0, 'an upload spends nothing')
  assert.strictEqual(after.target1_s3_key, prop.s3Key, 'the better take is live')
  assert.strictEqual(row.origin, 'human', 'and it is still marked precious, so no later TTS pass eats it')
  console.log('R6. Contrast R4: /regenerate-single 409s on this clip. Route (d) handles it and keeps it precious.')
})

// ===========================================================================
test('R7. ROUTE (c) delete-then-generate: it DOES re-render, and it destroys the record', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  // Give the clip the history any real clip accumulates.
  await r.flagClip(db, { courseCode: h.COURSE, audioUuid: bad.id })
  await db.query(`INSERT INTO audio_clip_flags (audio_id, reason) VALUES ($1,'clipped tail')`, [bad.id])
  await db.query(
    `INSERT INTO course_audio_revisions
       (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key, accepted_by)
     VALUES ($1,$2,2,1,'mastered/EVEN-OLDER.mp3',$3,'catrin')`, [bad.id, h.COURSE, OLD_BAD])
  await db.query(
    `INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, intro_script)
     VALUES ($1,'S0001L01',$2,'the authored intro script')`, [h.COURSE, bad.id])

  line(); console.log('R7. BEFORE the delete')
  show('audio_clip_flags rows', (await db.query('SELECT count(*)::int n FROM audio_clip_flags')).rows[0].n)
  show('course_audio_revisions rows', (await db.query('SELECT count(*)::int n FROM course_audio_revisions')).rows[0].n)

  await db.query('DELETE FROM course_audio WHERE id = $1', [bad.id])

  console.log('R7. AFTER the delete, BEFORE generate')
  const orphanFlags = (await db.query('SELECT count(*)::int n FROM audio_flags')).rows[0].n
  const cascadedFlags = (await db.query('SELECT count(*)::int n FROM audio_clip_flags')).rows[0].n
  const cascadedRevs = (await db.query('SELECT count(*)::int n FROM course_audio_revisions')).rows[0].n
  const intro = (await db.query('SELECT presentation_audio_id, intro_script FROM lego_introductions')).rows[0]
  const orphaned = await h.legoRow(db, legoId)
  show('lego FK after ON DELETE SET NULL', orphaned.target1_audio_id)
  show('audio_clip_flags (FK, CASCADE) survived?', cascadedFlags)
  show('course_audio_revisions (FK, CASCADE) survived?', cascadedRevs)
  show('audio_flags (NO FK — text column) survived?', orphanFlags)
  show('lego_introductions row', intro)

  assert.strictEqual(orphaned.target1_audio_id, null, 'the slot went SILENT — SET NULL, not a swap')
  assert.strictEqual(cascadedFlags, 0, 'the flag history CASCADEd away')
  assert.strictEqual(cascadedRevs, 0, 'the revision history CASCADEd away — the undo trail is gone')
  assert.strictEqual(orphanFlags, 1, 'while audio_flags survives as a DANGLING row: no FK, audio_uuid is text')
  assert.strictEqual(intro.intro_script, 'the authored intro script',
    'LIVE ON DELETE is SET NULL, so the authored intro survives')
  assert.strictEqual(intro.presentation_audio_id, null, 'but it is now pointing at nothing')

  console.log('R7. NOTE a documentation defect: audio-repair-core.cjs:26 states that')
  console.log('R7. lego_introductions.presentation_audio_id is ON DELETE CASCADE and that a delete')
  console.log('R7. "takes the authored intro script with it". pg_constraint on the LIVE database says')
  console.log('R7. SET NULL (confdeltype=n), for that FK and for all 11 content-side FKs. The comment')
  console.log('R7. overstates the danger; the real damage is the CASCADEs on the history tables.')

  const run = await h.runGenerate(db, h.COURSE)
  const after = await h.legoRow(db, legoId)
  show('TTS calls', run.ttsCalls)
  show('lego points at', after.target1_s3_key)
  assert.strictEqual(run.ttsCalls, 1, 'Q1 YES — with the row gone, generate really does render')
  assert.notStrictEqual(after.target1_s3_key, OLD_BAD, 'Q2 YES — new bytes')
  console.log('R7. So route (c) WORKS on the audio, and pays for it with the clip\'s whole history')
  console.log('R7. plus a window in which the slot is silent. Route (a)/(d) get the same result')
  console.log('R7. with no silent window and no data loss.')
})

// ===========================================================================
test('R8. ROUTE (c) cannot re-voice either, unless the operator deletes FIRST', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { voiceId: ELVIRA })

  line(); console.log('R8. delete the row, THEN generate with a new voice configured')
  await db.query('DELETE FROM course_audio WHERE id = $1', [bad.id])
  const run = await h.runGenerate(db, h.COURSE, { voiceId: 'azure_es-ES-AlvaroNeural' })
  const row = (await r.clipRows(db))[0]
  show('TTS calls', run.ttsCalls)
  show('voice_id of the new clip', row.voice_id)
  assert.strictEqual(run.ttsCalls, 1)
  assert.strictEqual(row.voice_id, 'azure_es-ES-AlvaroNeural', 'Q3 YES, but only because the row was DELETED')
  console.log('R8. The delete is doing all the work. Q3 on this route is inseparable from the data loss in R7.')
})

// ===========================================================================
test('R9. after (a) or (d), a later /generate does NOT undo the repair', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  line(); console.log('R9. repair via /regenerate-single, then someone presses the course-wide generate')
  const out = await r.regenerateSingle(db, {
    courseCode: h.COURSE, audioUuid: bad.id, voiceConfigVoiceId: 'es-ES-ElviraNeural',
  })
  const run = await h.runGenerate(db, h.COURSE)
  const after = await h.legoRow(db, legoId)
  show('repaired key', out.newS3Key)
  show('Step A RPC re-bound', run.stepA.actuallyLinked)
  show('TTS calls during /generate', run.ttsCalls)
  show('lego still points at', after.target1_s3_key)

  assert.strictEqual(run.ttsCalls, 0, 'nothing to do — no slot is NULL')
  assert.strictEqual(after.target1_s3_key, out.newS3Key, 'the repair SURVIVES a subsequent /generate')
  console.log('R9. Because the FK was never NULLed, Step A has no NULL slot to grab and cannot')
  console.log('R9. re-bind anything. In-place repair is stable under the bulk pipeline.')
})

// ===========================================================================
test('R10. SIDE BY SIDE — the same bad clip, the same intent, four routes', async () => {
  line(); console.log('R10. one bad clip; operator wants different bytes in a DIFFERENT voice')
  const results = {}

  // (b) unlink then generate
  {
    const db = await r.createRouteFixture(); h.resetTts()
    const { bad, legoId } = await badClipLinked(db)
    await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])
    const run = await h.runGenerate(db, h.COURSE, { voiceId: 'azure_es-ES-AlvaroNeural' })
    const after = await h.legoRow(db, legoId)
    const row = (await r.clipRows(db))[0]
    results['b unlink+generate'] = {
      tts: run.ttsCalls, newBytes: after.target1_s3_key !== OLD_BAD,
      voice: row.voice_id, slotSilentWindow: true, undoable: false,
    }
  }
  // (c) delete then generate
  {
    const db = await r.createRouteFixture(); h.resetTts()
    const { bad, legoId } = await badClipLinked(db)
    await db.query('DELETE FROM course_audio WHERE id = $1', [bad.id])
    const run = await h.runGenerate(db, h.COURSE, { voiceId: 'azure_es-ES-AlvaroNeural' })
    const after = await h.legoRow(db, legoId)
    const row = (await r.clipRows(db))[0]
    results['c delete+generate'] = {
      tts: run.ttsCalls, newBytes: after.target1_s3_key !== OLD_BAD,
      voice: row.voice_id, slotSilentWindow: true, undoable: false,
    }
  }
  // (a) flag then regenerate-single
  {
    const db = await r.createRouteFixture(); h.resetTts()
    const { bad, legoId } = await badClipLinked(db)
    await r.flagClip(db, { courseCode: h.COURSE, audioUuid: bad.id })
    await r.regenerateSingle(db, {
      courseCode: h.COURSE, audioUuid: bad.id, voiceConfigVoiceId: 'es-ES-AlvaroNeural',
    })
    const after = await h.legoRow(db, legoId)
    const row = (await r.clipRows(db))[0]
    results['a flag+regenerate-single'] = {
      tts: h.ttsCallCount(), newBytes: after.target1_s3_key !== OLD_BAD,
      voice: row.voice_id, slotSilentWindow: false, undoable: false,
    }
  }
  // (d) repair propose/accept
  {
    const db = await r.createRouteFixture(); h.resetTts()
    const { bad, legoId } = await badClipLinked(db)
    const prop = await r.repairPropose(db, {
      courseCode: h.COURSE, audioId: bad.id, source: 'tts', voiceId: 'azure_es-ES-AlvaroNeural',
    })
    await r.repairAccept(db, { courseCode: h.COURSE, audioId: bad.id, candidateId: prop.candidateId })
    const after = await h.legoRow(db, legoId)
    const row = (await r.clipRows(db))[0]
    results['d repair propose+accept'] = {
      tts: h.ttsCallCount(), newBytes: after.target1_s3_key !== OLD_BAD,
      // NOTE: accept deliberately does NOT patch voice_id (audio-repair-core :579).
      voice: row.voice_id, slotSilentWindow: false, undoable: true,
    }
  }

  for (const [k, v] of Object.entries(results)) show(k.padEnd(26), v)

  assert.strictEqual(results['b unlink+generate'].tts, 0)
  assert.strictEqual(results['b unlink+generate'].newBytes, false)
  assert.strictEqual(results['c delete+generate'].tts, 1)
  assert.strictEqual(results['a flag+regenerate-single'].tts, 1)
  assert.strictEqual(results['a flag+regenerate-single'].voice, 'azure_es-ES-AlvaroNeural')
  assert.strictEqual(results['d repair propose+accept'].tts, 1)
  assert.strictEqual(results['d repair propose+accept'].undoable, true)
  assert.strictEqual(results['d repair propose+accept'].voice, ELVIRA,
    'route (d) swaps the BYTES but leaves voice_id saying Elvira — see R11')

  console.log('R10. ONE route makes no new bytes at all: (b). It is also the one with no error message.')
})

// ===========================================================================
test('R11. ROUTE (d) DEFECT — a re-voice accept leaves voice_id lying about the clip', async () => {
  const db = await r.createRouteFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { voiceId: ELVIRA })

  line(); console.log('R11. propose a candidate in a DIFFERENT voice, then accept it')
  const prop = await r.repairPropose(db, {
    courseCode: h.COURSE, audioId: bad.id, source: 'tts', voiceId: 'azure_es-ES-AlvaroNeural',
  })
  await r.repairAccept(db, { courseCode: h.COURSE, audioId: bad.id, candidateId: prop.candidateId })
  const row = (await r.clipRows(db))[0]
  const cand = (await db.query('SELECT voice_id FROM audio_repair_candidates')).rows[0]
  show('candidate was rendered in', cand.voice_id)
  show('course_audio.voice_id now says', row.voice_id)
  show('s3_key now serves', row.s3_key)

  assert.strictEqual(cand.voice_id, 'azure_es-ES-AlvaroNeural')
  assert.strictEqual(row.voice_id, ELVIRA,
    'accept omits voice_id from the patch (audio-repair-core :579), by design')
  console.log('R11. The BYTES are Alvaro; the row still SAYS Elvira. Deliberate — patching voice_id')
  console.log('R11. would contend unique_course_audio_per_voice (course_code,text_normalized,language,')
  console.log('R11. role,voice_id) and could collide with a real Alvaro row. But the consequence is that')
  console.log('R11. route (d) is a BYTE repair, not a re-voice: voice_id is no longer evidence of what')
  console.log('R11. is in the file. Consistent with the standing note that voice_id is not a generation')
  console.log('R11. marker. For a genuine re-voice, route (a) is the one that updates both.')
})

// ===========================================================================
test('R12. THE DECIDER — does the learner ever HEAR the replacement?', async () => {
  // buildAudioRef, ssi-learning-app/api/_utils/audioAccess.ts:129-131, verbatim.
  // The learner's URL path segment AND the IndexedDB AudioCache key are this
  // one string (AudioCache.ts:160, keyPath 'id'). If it does not move, a device
  // that already played the clip never re-fetches: /api/audio/<ref> is served
  // `public, max-age=31536000, immutable` ([audioId].ts:150).
  const buildAudioRef = (id, revision) => (revision && revision > 1 ? `${id}.v${revision}` : id)

  line(); console.log('R12. same bad clip, same repair intent, the two in-place routes')

  // ROUTE (a): /regenerate-single. phase8:4576-4590 — the .update({...}) patch
  // carries voice_id, origin, s3_key, duration_ms, word_boundaries and the
  // veracity columns. audio_revision is NOT in it, and grep finds the identifier
  // nowhere in the route body (installed copy, verified 2026-08-18).
  const dbA = await r.createRouteFixture()
  h.resetTts()
  const fa = await badClipLinked(dbA)
  const refBeforeA = buildAudioRef(fa.bad.id, 1)
  await r.regenerateSingle(dbA, {
    courseCode: h.COURSE, audioUuid: fa.bad.id, voiceConfigVoiceId: 'es-ES-ElviraNeural',
  })
  const rowA = (await r.clipRows(dbA))[0]
  const refAfterA = buildAudioRef(rowA.id, rowA.audio_revision)

  // ROUTE (d): repair accept. audio-repair-core.cjs:582 puts audio_revision in
  // the patch and :604 asserts it landed.
  const dbD = await r.createRouteFixture()
  h.resetTts()
  const fd = await badClipLinked(dbD)
  const refBeforeD = buildAudioRef(fd.bad.id, 1)
  const prop = await r.repairPropose(dbD, { courseCode: h.COURSE, audioId: fd.bad.id, source: 'tts' })
  await r.repairAccept(dbD, { courseCode: h.COURSE, audioId: fd.bad.id, candidateId: prop.candidateId })
  const rowD = (await r.clipRows(dbD))[0]
  const refAfterD = buildAudioRef(rowD.id, rowD.audio_revision)

  show('(a) regenerate-single  s3_key', { before: OLD_BAD, after: rowA.s3_key })
  show('(a) regenerate-single  audio_revision', { before: 1, after: rowA.audio_revision })
  show('(a) regenerate-single  LEARNER REF', { before: refBeforeA, after: refAfterA })
  show('(d) repair accept      s3_key', { before: OLD_BAD, after: rowD.s3_key })
  show('(d) repair accept      audio_revision', { before: 1, after: rowD.audio_revision })
  show('(d) repair accept      LEARNER REF', { before: refBeforeD, after: refAfterD })

  // Both genuinely replaced the bytes.
  assert.notStrictEqual(rowA.s3_key, OLD_BAD)
  assert.notStrictEqual(rowD.s3_key, OLD_BAD)

  // Only one of them moved the thing the caches key on.
  assert.strictEqual(rowA.audio_revision, 1, '(a) leaves audio_revision at 1')
  assert.strictEqual(refAfterA, refBeforeA,
    '(a) THE LEARNER REF DOES NOT MOVE — a device holding the old blob keeps it')
  assert.strictEqual(rowD.audio_revision, 2, '(d) bumps audio_revision to 2')
  assert.notStrictEqual(refAfterD, refBeforeD, '(d) the ref moves...')
  assert.match(refAfterD, /\.v2$/, '...to <uuid>.v2, a new URL and a new IndexedDB key')

  console.log('R12. Route (a) changes the bytes and NOT the address. Route (d) changes both.')
  console.log('R12. This is the live shape of Tom\'s bul_for_eng render: course_audio')
  console.log('R12. 829d6387-d6c6-42ff-aa0e-696abd0fca98, s3_key D7B76335 -> 5B169BC0 at 15:08Z,')
  console.log('R12. veracity_checker=phase8-regenerate-single, CER 0 — and audio_revision still 2.')
  console.log('R12. A learner opening that clip fresh gets the new bytes; a learner who had already')
  console.log('R12. played it keeps the old ones. Tom heard the fix because he was checking the file,')
  console.log('R12. not replaying a cached lesson.')
})
