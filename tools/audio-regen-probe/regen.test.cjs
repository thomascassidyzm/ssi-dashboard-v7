/**
 * Does pressing "generate" replace bad audio, or silently re-link the old clip?
 *
 * Run:  node --test tools/audio-regen-probe/
 *
 * REAL Postgres (PGlite, in-process wasm). Real UNIQUE constraint, real BEFORE
 * UPDATE triggers, real AFTER INSERT autolink — all dumped verbatim from the
 * live DB into schema.sql. No network, no live DB, no S3, no TTS spend.
 *
 * Every test prints the before/after state it is asserting on, so the raw output
 * is itself the evidence.
 */
const test = require('node:test')
const assert = require('node:assert')
const h = require('./harness.cjs')

const line = () => console.log('-'.repeat(78))
const show = (label, o) => console.log(`  ${label}: ${JSON.stringify(o)}`)

// ===========================================================================
test('A. HEADLINE — bad clip exists, regenerate SAME text SAME voice via the ignoreDuplicates:true path', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const TEXT = 'Quiero hablar'

  const bad = await h.seedAudio(db, { text: TEXT, s3Key: 'mastered/OLD-BAD-0001.mp3' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: TEXT })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])

  line(); console.log('A. BEFORE')
  show('audio rows', await h.audioRows(db))
  show('lego points at', await h.legoRow(db, legoId))

  const r = await h.phase8IgnoreDuplicatesUpsert(db, {
    courseCode: h.COURSE, text: TEXT, language: 'es', role: 'target1',
    voiceId: 'azure_es-ES-ElviraNeural', tag: 'newgood',
  })

  const after = await h.audioRows(db)
  const lego = await h.legoRow(db, legoId)
  console.log('A. AFTER (upsert ignoreDuplicates:true)')
  show('TTS was invoked, minting s3_key', r.s3Key)
  show('rows returned by the upsert', r.rows)
  show('audio rows', after)
  show('lego points at', lego)

  assert.strictEqual(after.length, 1, 'no new course_audio row was created')
  assert.strictEqual(after[0].id, bad.id, 'the OLD row survived')
  assert.strictEqual(after[0].s3_key, 'mastered/OLD-BAD-0001.mp3', 'the OLD s3_key survived')
  assert.strictEqual(lego.target1_audio_id, bad.id, 'the lego still points at the OLD clip')
  console.log('A. REPRODUCED: write was a silent no-op; the freshly rendered clip was discarded.')
})

// ===========================================================================
test('B. same situation through the MAIN generate path (ignoreDuplicates:false)', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const TEXT = 'Quiero hablar'

  const bad = await h.seedAudio(db, { text: TEXT, s3Key: 'mastered/OLD-BAD-0001.mp3' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: TEXT })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])

  line(); console.log('B. BEFORE')
  show('audio rows', await h.audioRows(db))
  show('lego points at', await h.legoRow(db, legoId))

  const r = await h.phase8MainGenerateUpsert(db, {
    courseCode: h.COURSE, text: TEXT, language: 'es', role: 'target1',
    voiceId: 'azure_es-ES-ElviraNeural', tag: 'newgood',
  })

  const after = await h.audioRows(db)
  const lego = await h.legoRow(db, legoId)
  console.log('B. AFTER (upsert merge-duplicates)')
  show('TTS minted s3_key', r.s3Key)
  show('audio rows', after)
  show('lego points at', lego)

  assert.strictEqual(after.length, 1, 'still one row — same identity key')
  assert.strictEqual(after[0].id, bad.id, 'row id is UNCHANGED (UPDATE in place, not a new row)')
  assert.strictEqual(after[0].s3_key, r.s3Key, 'but the s3_key WAS overwritten with the new clip')
  assert.strictEqual(lego.target1_audio_id, bad.id, 'lego link unchanged — it now resolves to new audio')
  // The sting in the tail: created_at is not in the upsert payload, so a clip
  // whose audio was replaced today still reads as minted on the original date.
  assert.strictEqual(after[0].created_at.toISOString(), '2026-01-01T00:00:00.000Z',
    'created_at was NOT bumped — brand-new audio still dates from the old row')
  const rev = await db.query('SELECT audio_revision FROM course_audio WHERE id = $1', [bad.id])
  show('audio_revision after the replacement', rev.rows[0])
  assert.strictEqual(rev.rows[0].audio_revision, 1, 'audio_revision was not bumped either')
  console.log('B. NOT REPRODUCED on this path: audio genuinely replaced in place, id and link stable.')
  console.log('B. BUT: created_at and audio_revision both unchanged — new audio wearing old metadata.')
})

// ===========================================================================
test('C. text EDITED T -> T2, then generate', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const T = 'Quiero hablar'
  const T2 = 'Quiero charlar'

  const oldClip = await h.seedAudio(db, { text: T, s3Key: 'mastered/OLD-T-0001.mp3', createdAt: '2026-01-01T00:00:00Z' })
  // A clip for the NEW text already exists on the SAME voice (e.g. rendered
  // earlier for another slot) — this is what audio_id_for_text_same_voice finds.
  const preexistingT2 = await h.seedAudio(db, { text: T2, s3Key: 'mastered/PREEXISTING-T2.mp3', createdAt: '2026-02-01T00:00:00Z' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: T })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [oldClip.id, legoId])

  line(); console.log('C. BEFORE')
  show('audio rows', await h.audioRows(db))
  show('lego points at', await h.legoRow(db, legoId))

  await db.query('UPDATE course_legos SET target_text = $1 WHERE id = $2', [T2, legoId])
  const afterEdit = await h.legoRow(db, legoId)
  console.log('C. AFTER the text edit (BEFORE UPDATE trigger has run)')
  show('lego points at', afterEdit)
  show('link drops logged', (await db.query('SELECT column_name, reason, old_audio_id, new_audio_id FROM content_audio_link_drops')).rows)

  const needs = await h.getAudioNeeds(db, h.COURSE)
  console.log('C. getAudioNeeds after the edit')
  show('toGenerate', needs.toGenerate)
  show('toLink', needs.toLink)

  assert.strictEqual(afterEdit.target1_audio_id, preexistingT2.id,
    'the trigger re-linked to the PRE-EXISTING T2 clip, not NULL')
  assert.strictEqual(afterEdit.target1_s3_key, 'mastered/PREEXISTING-T2.mp3')
  assert.strictEqual(needs.toGenerate.filter(g => g.role === 'target1').length, 0,
    'generate has nothing to do for this slot — the slot is not NULL')
  console.log('C. REPRODUCED: edit re-links to a pre-existing clip and generate then does nothing at all.')
})

// ===========================================================================
test('C2. text EDITED T -> T2 with NO pre-existing T2 clip', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const T = 'Quiero hablar', T2 = 'Quiero charlar'
  const oldClip = await h.seedAudio(db, { text: T, s3Key: 'mastered/OLD-T-0001.mp3' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: T })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [oldClip.id, legoId])

  await db.query('UPDATE course_legos SET target_text = $1 WHERE id = $2', [T2, legoId])
  const afterEdit = await h.legoRow(db, legoId)
  line(); console.log('C2. AFTER the text edit, nothing pre-exists for T2')
  show('lego points at', afterEdit)

  const needs = await h.getAudioNeeds(db, h.COURSE)
  show('toGenerate', needs.toGenerate)

  const gen = await h.phase8MainGenerateUpsert(db, {
    courseCode: h.COURSE, text: T2, language: 'es', role: 'target1',
    voiceId: 'azure_es-ES-ElviraNeural', tag: 'newT2',
  })
  const after = await h.legoRow(db, legoId)
  console.log('C2. AFTER generate')
  show('audio rows', await h.audioRows(db))
  show('lego points at', after)

  assert.strictEqual(afterEdit.target1_audio_id, null, 'link nulled — nothing to re-link to')
  assert.strictEqual(needs.toGenerate.filter(g => g.role === 'target1').length, 1, 'slot IS queued for TTS')
  assert.strictEqual(after.target1_s3_key, gen.s3Key, 'autolink bound the brand-new clip')
  console.log('C2. Healthy path: NULL slot -> real TTS -> new row -> autolink. Works.')
})

// ===========================================================================
test('D. the documented workaround: delete the row, then regenerate', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const TEXT = 'Quiero hablar'
  const bad = await h.seedAudio(db, { text: TEXT, s3Key: 'mastered/OLD-BAD-0001.mp3' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: TEXT })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])

  line(); console.log('D. BEFORE')
  show('lego points at', await h.legoRow(db, legoId))

  // scan-course.md's sequence: null the link, delete the row, regenerate.
  await db.query('UPDATE course_legos SET target1_audio_id = NULL WHERE id = $1', [legoId])
  await db.query('DELETE FROM course_audio WHERE id = $1', [bad.id])

  const silent = await h.legoRow(db, legoId)
  console.log('D. WINDOW (link nulled + row deleted, before regeneration)')
  show('lego points at', silent)
  show('audio rows', await h.audioRows(db))
  const needs = await h.getAudioNeeds(db, h.COURSE)
  show('toGenerate', needs.toGenerate)

  const gen = await h.phase8MainGenerateUpsert(db, {
    courseCode: h.COURSE, text: TEXT, language: 'es', role: 'target1',
    voiceId: 'azure_es-ES-ElviraNeural', tag: 'newgood',
  })
  const after = await h.legoRow(db, legoId)
  console.log('D. AFTER regenerate')
  show('audio rows', await h.audioRows(db))
  show('lego points at', after)

  assert.strictEqual(silent.target1_audio_id, null, 'the slot IS silent during the window')
  assert.strictEqual(needs.toGenerate.filter(g => g.role === 'target1').length, 1)
  assert.notStrictEqual(after.target1_audio_id, bad.id, 'a genuinely NEW row')
  assert.strictEqual(after.target1_s3_key, gen.s3Key, 'pointing at genuinely NEW audio')
  console.log('D. Workaround WORKS, and it costs a real silent window (break-before-make).')
})

// ===========================================================================
test('E. cosmetic-only edit — trailing period / casing / whitespace', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const T = 'Quiero hablar'
  const bad = await h.seedAudio(db, { text: T, s3Key: 'mastered/OLD-BAD-0001.mp3' })
  const legoId = await h.seedLego(db, { knownText: 'I want to speak', targetText: T })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, legoId])

  line(); console.log('E. BEFORE')
  show('audio row', (await h.audioRows(db))[0])

  for (const variant of ['Quiero hablar.', '  Quiero Hablar  ', 'QUIERO HABLAR!']) {
    await db.query('UPDATE course_legos SET target_text = $1 WHERE id = $2', [variant, legoId])
    const row = await h.legoRow(db, legoId)
    console.log(`E. after edit to ${JSON.stringify(variant)}`)
    show('lego points at', { target1_audio_id: row.target1_audio_id, s3_key: row.target1_s3_key })
    assert.strictEqual(row.target1_audio_id, bad.id, 'same clip kept — cosmetic edit does not unlink')

    const r = await h.phase8MainGenerateUpsert(db, {
      courseCode: h.COURSE, text: variant, language: 'es', role: 'target1',
      voiceId: 'azure_es-ES-ElviraNeural', tag: 'cosmetic',
    })
    const rows = await h.audioRows(db)
    show('after a generate on the variant: row count / ids', { count: rows.length, ids: rows.map(x => x.id) })
    assert.strictEqual(rows.length, 1, 'variant collides onto the SAME identity key — no second row')
    assert.strictEqual(rows[0].id, bad.id)
    assert.strictEqual(rows[0].s3_key, r.s3Key, 'and it overwrote the s3_key in place')
    assert.strictEqual(rows[0].text, variant, 'course_audio.text now claims the punctuated variant')
  }
  console.log('E. REPRODUCED: normalize_text collapses ".", "!", casing and whitespace onto one identity key.')
})

// ===========================================================================
test('F. THE REAL GATE — a slot that still points at the bad clip is never even offered to TTS', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const TEXT = 'Quiero hablar'
  const bad = await h.seedAudio(db, { text: TEXT, s3Key: 'mastered/OLD-BAD-0001.mp3' })
  const stillLinked = await h.seedLego(db, { legoId: 'S0001L01', knownText: 'I want to speak', targetText: TEXT })
  await db.query('UPDATE course_legos SET target1_audio_id = $1 WHERE id = $2', [bad.id, stillLinked])
  // A second lego with the same target text but a NULL link.
  const unlinked = await h.seedLego(db, { seed: 2, index: 1, legoId: 'S0002L01', knownText: 'I want to speak', targetText: TEXT })

  line(); console.log('F. BEFORE')
  show('audio rows', await h.audioRows(db))
  show('lego S0001L01 (linked to bad clip)', await h.legoRow(db, stillLinked))
  show('lego S0002L01 (NULL link)', await h.legoRow(db, unlinked))

  const needs = await h.getAudioNeeds(db, h.COURSE)
  console.log('F. getAudioNeeds')
  show('unlinkedCount', needs.unlinkedCount)
  show('toGenerate (would cost TTS)', needs.toGenerate)
  show('toLink (bound to the EXISTING row, no TTS)', needs.toLink)

  const target1Gen = needs.toGenerate.filter(g => g.role === 'target1')
  const target1Link = needs.toLink.filter(g => g.role === 'target1')
  assert.strictEqual(target1Gen.length, 0, 'NOTHING is queued for TTS for this text')
  assert.strictEqual(target1Link.length, 1, 'the NULL slot is classified toLink')
  assert.strictEqual(target1Link[0].audioId, bad.id, 'and it is bound to the OLD BAD clip')
  assert.strictEqual(h.ttsCallCount(), 0, 'zero TTS calls in the whole scenario')
  console.log('F. REPRODUCED: generate never sees the bad clip. A NULL slot gets the bad clip linked to it.')
})

// ===========================================================================
test('G. storage-broken escape hatch — a row whose object is gone IS regenerated', async () => {
  const db = await h.createFixture()
  h.resetTts()
  const TEXT = 'Quiero hablar'
  const bad = await h.seedAudio(db, { text: TEXT, s3Key: 'mastered/GONE-FROM-BUCKET.mp3' })
  await h.seedLego(db, { knownText: 'I want to speak', targetText: TEXT })

  const needs = await h.getAudioNeeds(db, h.COURSE, { storageOk: key => key !== 'mastered/GONE-FROM-BUCKET.mp3' })
  line(); console.log('G. getAudioNeeds with the S3 HEAD returning 404 for the stored key')
  show('toGenerate', needs.toGenerate)
  show('toLink', needs.toLink)
  assert.strictEqual(needs.toGenerate.filter(g => g.role === 'target1').length, 1)
  console.log('G. Only a MISSING OBJECT reopens the slot for TTS. "Bad audio" that exists never qualifies.')
  assert.ok(bad.id)
})
