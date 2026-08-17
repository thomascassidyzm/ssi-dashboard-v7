// A-134 — the one genuine untaught-vocabulary breach introduced by today's edits.
//
// The edit-impact-check tool (feat/edit-impact-check-2026-08-17) replayed today's
// applied eng_for_sin edits and returned 'reconsider' verdicts for untaught
// vocabulary. Its matcher is unstemmed, exactly as its own caveat says, so the
// verdicts are candidates rather than findings. Adjudicated with a Unicode-aware,
// grapheme-segmented tokenizer (Intl.Segmenter, so Sinhala vowel signs and the ZWJ
// inside conjuncts are never split; exact surface forms, no stemming, so it errs
// STRICT — it over-flags rather than under-flags).
//
// Of 27 candidates reproduced against the live database, exactly ONE is a breach
// this plate introduced: seed 71.
//
//   #851's repair prepended අපිට ("we/us", dative) to seed 71. The course teaches
//   අපි at seed 102 and අපිට as a LEGO at seed 138, and ZERO phrases at or before
//   seed 71 use it. So the edit put the word 31 seeds early. Sinhala drops subject
//   pronouns freely and the pre-edit text carried no subject, so the fix is simply
//   not to add one — #851's two real corrections are kept:
//     සත්‍යය -> සත්‍ය  (matches card S0071L02 'truth')
//     කරන්න  -> දෙන්න  (matches card S0071L04 දෙනවා 'let')
//
// Every word of the replacement is taught at or before seed 71; හිතුනේ is a variant
// of හිතුනා taught at seed 30. No ZUT collision.
//
// THE TRAP THIS SCRIPT EXISTS TO AVOID: course_seeds has NO audio-nulling trigger.
// legos and phrases relink on a text edit; seeds do not. So editing the text alone
// leaves known_audio_id pointing at a clip still speaking the OLD sentence — no
// NULL, no orphan, no alarm. The repoint below is explicit and make-before-break.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { Client } = require('pg')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { normalizeSin, tokenCorpus, wordsPresent, tailFloorDb, ffprobeDurationMs } = require('./gates.cjs')

const APPLY = process.argv.includes('--apply')
const COURSE = 'eng_for_sin', SEED = 71
const OLD = 'අපිට කිසිම කෙනෙකුට සත්‍ය ඇහෙනවා දෙන්න ඕනේ හිතුනේ නෑ.'
const NEW = 'කිසිම කෙනෙකුට සත්‍ය ඇහෙනවා දෙන්න ඕනේ හිතුනේ නෑ.'
// Seed/known rate model, refitted by the seed-repairs worker on this course's 13,301
// known/sin clips: ms ~= 1398.0 + 45.58 x chars, residual sd 149.6. The presentation
// model's 3143ms intercept is a preamble these prompts do not have.
const I = 1398.0, S = 45.58, SD = 149.6
const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()

async function main() {
  const bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const cur = await db.query(`select known_text, known_audio_id::text aid, target_text from course_seeds where course_code=$1 and seed_number=$2`, [COURSE, SEED])
  if (cur.rows[0].known_text.trim() !== OLD.trim()) throw new Error(`drift: seed ${SEED} reads ${JSON.stringify(cur.rows[0].known_text)}`)
  console.log('seed', SEED, 'english:', cur.rows[0].target_text)
  console.log('  from:', OLD, '\n  to  :', NEW)

  const v = (await db.query(`select voice_config from courses where course_code=$1`, [COURSE])).rows[0].voice_config.voices.known
  console.log('  voice:', JSON.stringify(v))

  // 1. MAKE — render and gate before anything is touched
  const dir = path.join(__dirname, 'seed71'); fs.mkdirSync(dir, { recursive: true })
  let shipped = null
  for (let attempt = 1; attempt <= 3 && !shipped; attempt++) {
    const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(NEW, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceId, speed: v.settings?.speed ?? 1, regenerationAttempt: attempt - 1 })
    const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, NEW)
    const f = path.join(dir, `attempt${attempt}.mp3`); fs.writeFileSync(f, buffer)
    const corpus = tokenCorpus(wordBoundaries)
    const fail = []
    const probe = ffprobeDurationMs(f); if (Math.abs(probe - durationMs) > 60) fail.push(`decode_mismatch ${probe} vs ${durationMs}`)
    const z = (durationMs - (I + S * NEW.length)) / SD; if (Math.abs(z) > 3) fail.push(`duration_z ${z.toFixed(2)}`)
    const w = wordsPresent(NEW, corpus); if (!w.ok) fail.push(`words_not_voiced ${JSON.stringify(w.missing)}`)
    if (corpus.match(/ඒ ගෙ/)) fail.push('filler_regression')
    if (corpus.includes('මමා')) fail.push('mamaa_regression')
    if (corpus.includes('අපිට')) fail.push('the_untaught_word_is_still_voiced')
    const tail = tailFloorDb(f); if (tail > -40) fail.push(`end_click ${tail.toFixed(1)}dB`)
    console.log(`  attempt ${attempt}: ms=${durationMs} z=${z.toFixed(2)} tail=${tail.toFixed(1)}dB fail=${JSON.stringify(fail)}`)
    if (!fail.length) shipped = { buffer, durationMs, wordBoundaries, z, tail, file: f }
  }
  if (!shipped) throw new Error('no passing take after 3 attempts')

  if (!APPLY) { console.log('\nDRY RUN — gates pass, nothing written. Re-run with --apply.'); await db.end(); return }

  // 2. bytes land first, additive
  const newId = crypto.randomUUID(), key = `mastered/${newId.toUpperCase()}.mp3`
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: shipped.buffer, ContentType: 'audio/mpeg' }))
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  if (head.ContentLength !== shipped.buffer.length) throw new Error('upload size mismatch')

  // 3. text, row and repoint together
  await db.query('BEGIN')
  try {
    await db.query(`insert into course_audio (id, course_code, role, voice_id, text, duration_ms, s3_key, language, origin, word_boundaries)
                    values ($1,$2,'known',$3,$4,$5,$6,'sin','tts',$7)`,
      [newId, COURSE, 'azure_' + v.voiceId.replace(/^azure_/, ''), NEW, shipped.durationMs, key, JSON.stringify(shipped.wordBoundaries)])
    const u1 = await db.query(`update course_seeds set known_text=$1 where course_code=$2 and seed_number=$3 and known_text=$4`, [NEW, COURSE, SEED, cur.rows[0].known_text])
    if (u1.rowCount !== 1) throw new Error(`seed text update matched ${u1.rowCount}`)
    const u2 = await db.query(`update course_seeds set known_audio_id=$1 where course_code=$2 and seed_number=$3`, [newId, COURSE, SEED])
    if (u2.rowCount !== 1) throw new Error(`audio repoint matched ${u2.rowCount}`)
    await db.query('COMMIT')
  } catch (e) { await db.query('ROLLBACK'); throw e }

  const after = await db.query(`select known_text, known_audio_id::text aid from course_seeds where course_code=$1 and seed_number=$2`, [COURSE, SEED])
  console.log('\nAPPLIED. seed 71 now:', after.rows[0].known_text)
  console.log('  clip:', after.rows[0].aid, '(old clip', cur.rows[0].aid, 'kept, not deleted)')
  fs.writeFileSync(path.join(__dirname, 'seed71-applied.json'), JSON.stringify({
    seed: SEED, old_text: OLD, new_text: NEW, old_clip: cur.rows[0].aid, new_clip: newId,
    s3_key: key, ms: shipped.durationMs, z: shipped.z, tail: shipped.tail,
    word_boundaries: shipped.wordBoundaries }, null, 1))
  await db.end()
}
main().catch(e => { console.error('ABORT:', e.message); process.exit(1) })
