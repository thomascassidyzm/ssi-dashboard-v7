// A-135 — render the repaired known-side clips. LOCAL ONLY.
//
// MAKE-BEFORE-BREAK (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b): this step renders,
// masters and gates on local disk and NOTHING ELSE. Nothing reaches S3, nothing reaches the DB,
// no live row is repointed, and NO OLD CLIP IS DELETED — the old rows are the only evidence of
// what learners actually heard. Upload + relink is apply.cjs, a separate step that runs only
// after every take here has passed all seven gates.
//
// Compressor-free chain: masterAudio() -> normalizeAudioClean(), the A-131 change
// (services/phases/phase8-audio-v13.cjs, cherry-picked onto this branch as 667a6e09).
// PHASE8_NO_LISTEN=1 so no whisper leg runs — the gates here are the check, and whisper's
// last-word rule is a known false-positive generator on short clips.
//
// SPARES: every clip renders SPARES_PER_CLIP insurance takes beyond the shipping one, gated
// identically. A gate failure on the ship take promotes a spare rather than costing a round trip.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates.cjs')

const SHIP_DIR = path.join(__dirname, 'ship')
const SPARE_DIR = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3
const SPARES_PER_CLIP = 2

const dbUrl = () => fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8')
  .match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)[1].trim()

// The worklist is every row that needs a NEW clip — i.e. a patch whose repaired text has no
// existing clip to rebind to. Rows that rebind for free are not rendered at all; that is the
// cheapest possible outcome and the reason apply.cjs re-checks the rebind live.
async function buildWorklist(db) {
  const work = []
  const voiceCache = new Map()
  async function voiceFor(course) {
    if (!voiceCache.has(course)) {
      const r = await db.query(`select voice_config->'voices'->'known' v from courses where course_code=$1`, [course])
      voiceCache.set(course, r.rows[0].v)
    }
    return voiceCache.get(course)
  }

  const kor = require('./kor-final-plan.json').filter(r => r.action === 'patch' && !r.relinks_to)
  for (const r of kor) {
    work.push({ id: r.row_uuid, course: 'eng_for_kor', table: 'course_practice_phrases',
                ttsText: r.new_known_text, old_clip: r.clip_id, voice: await voiceFor('eng_for_kor') })
  }
  // Round 2: the four rows held at the first pass and released by Kai's
  // ship-if-likely-an-improvement ruling. The 33 already applied will self-skip
  // below, because their repaired text now owns a clip.
  for (const r of require('./kor-round2-plan.json').filter(r => r.action === 'patch')) {
    work.push({ id: r.row_uuid, course: 'eng_for_kor', table: 'course_practice_phrases',
                ttsText: r.new_known_text, old_clip: r.clip_id, voice: await voiceFor('eng_for_kor') })
  }
  const jpn = require('./engjpn-4-plan.json').filter(r => r.action === 'patch')
  for (const r of jpn) {
    work.push({ id: r.row_uuid, course: 'eng_for_jpn', table: 'course_practice_phrases',
                ttsText: r.new_known_text, old_clip: r.clip_id, voice: await voiceFor('eng_for_jpn') })
  }

  // A repaired text may ALREADY have a clip that the plan did not know about — re-ask the live
  // DB with the same function the trigger uses, so we never render something we already own.
  const out = []
  for (const w of work) {
    const ex = await db.query(`select audio_id_for_text($1,$2,'known') id`, [w.course, w.ttsText])
    if (ex.rows[0].id) { w.skip_reason = `already owned: ${ex.rows[0].id}`; out.push(w); continue }
    out.push(w)
  }
  return out
}

async function renderOnce(text, voice, attempt) {
  const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, voice.provider || 'azure', {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    voiceName: voice.voiceId,
    speed: voice.settings?.speed ?? 1,
    regenerationAttempt: attempt,
  })
  const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text)
  return { buffer, durationMs, wordBoundaries }
}

async function main() {
  fs.mkdirSync(SHIP_DIR, { recursive: true })
  fs.mkdirSync(SPARE_DIR, { recursive: true })
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const work = await buildWorklist(db)
  await db.end()

  console.log(`worklist: ${work.length} clip(s) to render (${work.filter(w => w.skip_reason).length} already owned and skipped)`)
  const log = []

  for (const w of work) {
    if (w.skip_reason) {
      log.push({ id: w.id, course: w.course, text: w.ttsText, skipped: w.skip_reason, shipped: null, spares: [] })
      console.log(`SKIP ${w.id}  ${w.skip_reason}`)
      continue
    }
    const voiceId = `${w.voice.provider || 'azure'}_${w.voice.voiceId}`
    const row = { id: w.id, course: w.course, voice_id: voiceId, ttsText: w.ttsText }
    const takes = []
    for (let attempt = 1; attempt <= MAX_ATTEMPTS + SPARES_PER_CLIP && takes.filter(t => t.pass).length < 1 + SPARES_PER_CLIP; attempt++) {
      let t
      try {
        t = await renderOnce(w.ttsText, w.voice, attempt)
      } catch (e) {
        takes.push({ attempt, error: e.message, pass: false }); continue
      }
      const isShip = takes.filter(x => x.pass).length === 0
      const file = path.join(isShip ? SHIP_DIR : SPARE_DIR, `${w.id.replace(/[:/]/g, '_')}__a${attempt}.mp3`)
      fs.writeFileSync(file, t.buffer)
      const g = runGates(row, w.ttsText, t.wordBoundaries, t.durationMs, file)
      takes.push({ attempt, file, ms: t.durationMs, pass: g.fail.length === 0, gates: g, wordBoundaries: t.wordBoundaries })
      console.log(`  ${w.id} a${attempt} ${g.fail.length === 0 ? 'PASS' : 'FAIL'} ${g.fail.join('; ')} (z=${g.z == null ? '-' : g.z.toFixed(2)}, tail=${g.tail == null ? '-' : g.tail.toFixed(1)}dB)`)
    }
    const passing = takes.filter(t => t.pass)
    log.push({
      id: w.id, course: w.course, voice_id: voiceId, text: w.ttsText, old_clip: w.old_clip,
      shipped: passing[0] ? { file: passing[0].file, ms: passing[0].ms, gates: passing[0].gates, word_boundaries: passing[0].wordBoundaries } : null,
      spares: passing.slice(1).map(t => ({ file: t.file, ms: t.ms })),
      all_takes: takes.map(t => ({ attempt: t.attempt, pass: t.pass, ms: t.ms, fail: t.gates?.fail, error: t.error })),
    })
    console.log(`${passing.length ? 'SHIP' : 'FAIL'} ${w.id}  ${passing.length} passing take(s)`)
  }

  fs.writeFileSync(path.join(__dirname, 'render-ship-log.json'), JSON.stringify(log, null, 1))
  const shipped = log.filter(l => l.shipped).length, skipped = log.filter(l => l.skipped).length
  console.log(`\n${shipped} shipped, ${skipped} skipped (already owned), ${log.length - shipped - skipped} FAILED`)
  console.log('Nothing uploaded, nothing linked, nothing deleted. apply.cjs is the next step.')
}

main().catch(e => { console.error(e); process.exit(1) })
