/**
 * THE OPERATOR PATH: unlink the slot (do NOT delete the row), then press generate.
 *
 * Run:  node --test tools/audio-regen-probe/
 *
 * regen.test.cjs answered "what happens if you press generate on a slot that is
 * still linked" — nothing, it is never a candidate. That is not the workflow in
 * use. Operators NULL the FK first, deliberately, as the safer alternative to
 * deleting the row, and then press generate. This file reproduces that path.
 *
 * Real Postgres (PGlite, in-process wasm). link_all_audio_ids is the LIVE
 * function body, dumped by pg_get_functiondef into schema.sql — Postgres itself
 * decides which row the NULL slot gets bound to. No network, no live DB, no S3,
 * no TTS spend.
 */
const test = require('node:test')
const assert = require('node:assert')
const h = require('./harness.cjs')

const line = () => console.log('-'.repeat(78))
const show = (label, o) => console.log(`  ${label}: ${JSON.stringify(o)}`)

/**
 * The fixture every scenario starts from: one bad target clip, one slot pointing
 * at it. The KNOWN side gets a healthy clip too, so every TTS call counted below
 * belongs to the target slot under test and nothing else.
 */
async function badClipLinked(db, { text = 'Quiero hablar', known = 'I want to speak', s3Key = 'mastered/OLD-BAD-0001.mp3', voiceId = 'azure_es-ES-ElviraNeural' } = {}) {
  const bad = await h.seedAudio(db, { text, s3Key, voiceId })
  await h.seedAudio(db, { text: known, role: 'known', language: 'eng', voiceId: 'azure_en-GB-LibbyNeural', s3Key: 'mastered/KNOWN-OK.mp3' })
  const legoId = await h.seedLego(db, { knownText: known, targetText: text })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])
  return { bad, legoId }
}

// ===========================================================================
test('H. HEADLINE — unlink (row kept), then generate: the SAME bad row is re-linked, zero TTS', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  line(); console.log('H. BEFORE — operator has flagged this clip as bad')
  show('audio rows', await h.audioRows(db))
  show('lego points at', await h.legoRow(db, legoId))

  // THE OPERATOR ACTION: unlink, do not delete. The row survives on purpose.
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])
  const unlinked = await h.legoRow(db, legoId)
  console.log('H. AFTER UNLINK (row deliberately NOT deleted)')
  show('lego points at', unlinked)
  show('audio rows still present', await h.audioRows(db))
  assert.strictEqual(unlinked.target1_audio_id, null, 'slot is genuinely NULL')

  // THE OPERATOR ACTION: press generate.
  const run = await h.runGenerate(db, h.COURSE)
  const after = await h.legoRow(db, legoId)
  const rows = await h.audioRows(db)

  console.log('H. AFTER GENERATE')
  show('Step A RPC returned', run.stepA.raw)
  show('slots the RPC actually re-bound', run.stepA.actuallyLinked)
  show('getAudioNeeds toGenerate (would cost TTS)', run.needs.toGenerate)
  show('TTS calls made', run.ttsCalls)
  show('audio rows', rows)
  show('lego points at', after)

  assert.strictEqual(run.ttsCalls, 0, 'NO TTS was called')
  assert.strictEqual(run.rendered.length, 0, 'nothing was rendered')
  assert.strictEqual(rows.length, 1, 'no new course_audio row exists')
  assert.strictEqual(after.target1_audio_id, bad.id, 'the slot points at the SAME row id as before')
  assert.strictEqual(after.target1_s3_key, 'mastered/OLD-BAD-0001.mp3',
    'and at the SAME s3_key — the same physical object, not a copy of it')
  console.log('H. REPRODUCED: unlink-then-generate re-links the identical bad clip. Kai is right.')
})

// ===========================================================================
test('H1. WHICH mechanism does it — Step A RPC, or getAudioNeeds :783-791?', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])

  line(); console.log('H1. Step A (link_all_audio_ids) run ALONE, before getAudioNeeds is asked anything')
  const stepA = await h.linkAudioIdsStepA(db, h.COURSE)
  const afterStepA = await h.legoRow(db, legoId)
  show('RPC returned', stepA.raw)
  show('lego points at, after Step A only', afterStepA)
  assert.strictEqual(afterStepA.target1_audio_id, bad.id,
    'Step A alone already re-bound the slot — before TTS selection is even consulted')

  const needs = await h.getAudioNeeds(db, h.COURSE)
  console.log('H1. getAudioNeeds, run after Step A')
  show('unlinkedCount', needs.unlinkedCount)
  show('toLink', needs.toLink)
  show('toGenerate', needs.toGenerate)
  assert.strictEqual(needs.unlinkedCount, 0,
    'by the time getAudioNeeds looks, there is no NULL slot left to classify')

  console.log('H1. And now the same scenario with Step A SKIPPED (as if the RPC had errored):')
  const db2 = await h.createFixture()
  const f2 = await badClipLinked(db2)
  await db2.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [f2.legoId])
  const needs2 = await h.getAudioNeeds(db2, h.COURSE)
  show('toLink', needs2.toLink)
  show('toGenerate', needs2.toGenerate)
  const t1 = needs2.toLink.filter(l => l.role === 'target1')
  assert.strictEqual(needs2.toGenerate.length, 0, 'still nothing queued for TTS')
  assert.strictEqual(t1.length, 1)
  assert.strictEqual(t1[0].audioId, f2.bad.id,
    'getAudioNeeds :783-791 independently classifies it as a free re-link to the SAME bad row')

  console.log('H1. TWO independent mechanisms reach the same result. Step A fires FIRST and writes the FK;')
  console.log('H1. getAudioNeeds :783-791 would have excluded it from TTS anyway. Removing either does not help.')
})

// ===========================================================================
test('H2. is it the OLD ROW\'S CONTINUED EXISTENCE that does it? Delete it and the same run generates', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db)

  // Identical operator sequence EXCEPT the row is deleted as well as unlinked.
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])
  await db.query('DELETE FROM course_audio WHERE id = $1', [bad.id])

  line(); console.log('H2. unlink AND delete, then the identical generate run')
  const run = await h.runGenerate(db, h.COURSE)
  const after = await h.legoRow(db, legoId)
  show('Step A RPC returned', run.stepA.raw)
  show('TTS calls made', run.ttsCalls)
  show('audio rows', await h.audioRows(db))
  show('lego points at', after)

  assert.strictEqual(run.ttsCalls, 1, 'TTS ran exactly once')
  assert.notStrictEqual(after.target1_audio_id, bad.id, 'a genuinely new row')
  assert.strictEqual(after.target1_s3_key, run.rendered[0].s3Key, 'pointing at genuinely new audio')
  console.log('H2. CONFIRMED: the ONLY difference between H (0 TTS, old bytes) and H2 (1 TTS, new bytes)')
  console.log('H2. is whether the old course_audio row still exists. The row is the whole cause.')
})

// ===========================================================================
test('H3. the text-match key is voice-BLIND — a re-voice unlink still gets the old voice back', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const { bad, legoId } = await badClipLinked(db, { voiceId: 'azure_es-ES-ElviraNeural' })
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])

  line(); console.log('H3. course voice_config has been switched to a DIFFERENT voice, then generate')
  const run = await h.runGenerate(db, h.COURSE, { voiceId: 'azure_es-ES-AlvaroNeural' })
  const after = await h.legoRow(db, legoId)
  const row = (await h.audioRows(db))[0]
  show('TTS calls made', run.ttsCalls)
  show('lego points at', after)
  show('voice_id of the clip the learner now hears', row.voice_id)

  assert.strictEqual(run.ttsCalls, 0, 'no TTS despite the voice change')
  assert.strictEqual(after.target1_audio_id, bad.id)
  assert.strictEqual(row.voice_id, 'azure_es-ES-ElviraNeural',
    'the OLD voice is re-linked — link_all_audio_ids matches on text_normalized+role only, never voice_id')
  console.log('H3. REPRODUCED: unlink-then-generate cannot re-voice anything. The RPC has no voice predicate.')
})

// ===========================================================================
test('H4. the operator is told nothing — the re-link is invisible in the log line', async () => {
  const db = await h.createFixture()
  h.resetTts()
  // Three slots, three bad clips, all unlinked at once — a small sweep.
  const ids = []
  for (const [i, text] of ['Quiero hablar', 'Quiero comer', 'Quiero dormir'].entries()) {
    const bad = await h.seedAudio(db, { text, s3Key: `mastered/OLD-BAD-000${i + 1}.mp3` })
    const legoId = await h.seedLego(db, { seed: i + 1, index: 1, legoId: `S000${i + 1}L01`, knownText: `k${i}`, targetText: text })
    await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])
    ids.push({ bad, legoId })
  }
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE course_code = $1', [h.COURSE])

  line(); console.log('H4. three unlinked slots, then generate')
  const run = await h.runGenerate(db, h.COURSE)
  show('RPC raw return', run.stepA.raw)
  show('slots the RPC REALLY re-bound', run.stepA.actuallyLinked)
  show('the total phase8:1396-1399 computes from that return', run.stepA.loggedTotal)
  show('TTS calls', run.ttsCalls)

  assert.strictEqual(run.stepA.actuallyLinked, 3, 'three slots were re-bound to their old clips')
  assert.strictEqual(run.stepA.loggedTotal, 0,
    'phase8 reads flat keys (legos_target1, …) that this RPC does not return — it computes 0')
  console.log('H4. The RPC returns nested {legos:{target1:3}}; phase8:1396-1398 sums result.legos_target1 etc,')
  console.log('H4. which are all undefined. total=0, so the "Pre-generate link: bound N" line never even prints.')
  console.log('H4. Three slots silently re-bound to bad audio, reported to the operator as nothing at all.')
  for (const { bad, legoId } of ids) {
    assert.strictEqual((await h.legoRow(db, legoId)).target1_audio_id, bad.id)
  }
})

// ===========================================================================
test('H5. the stuck-linkable escape hatch (:2073) cannot save this path — Step A pre-empts it', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const { legoId } = await badClipLinked(db)
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])

  line(); console.log('H5. full run, watching whether the forceGenerate escape hatch fires')
  const run = await h.runGenerate(db, h.COURSE)
  show('escape hatch fired?', run.escapeHatchFired)
  show('toLink at the moment the hatch is tested', run.needs.toLink.length)
  show('TTS calls', run.ttsCalls)

  assert.strictEqual(run.escapeHatchFired, false)
  assert.strictEqual(run.needs.toLink.length, 0)
  console.log('H5. The hatch triggers on toLink > 0 && toGenerate === 0. Step A already consumed the NULL,')
  console.log('H5. so toLink is 0 and the hatch never fires. The one path that would force TTS is closed.')
})
