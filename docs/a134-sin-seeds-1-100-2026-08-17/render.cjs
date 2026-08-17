// A-134 seeds 1-100 — render the 19 repaired clips (16 seed known-side + 3 presentation).
//
// MAKE-BEFORE-BREAK: this step renders, masters and gates LOCALLY only. Nothing reaches S3,
// nothing reaches the DB, no live row is repointed and NO OLD CLIP IS DELETED — the old rows
// are the only evidence of what learners heard. Upload + relink is a separate, later step.
//
// Compressor-free chain: masterAudio() -> normalizeAudioClean() (verified live at
// services/phases/phase8-audio-v13.cjs:1214). PHASE8_NO_LISTEN=1 so no whisper leg runs.
process.env.PHASE8_NO_LISTEN = '1'
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const ttsService = require('../../services/tts-service.cjs')
const phase8 = require('../../services/phases/phase8-audio-v13.cjs')
const { runGates } = require('./gates.cjs')

const COURSE = 'eng_for_sin'
const SHIP_DIR = path.join(__dirname, 'ship')
const SPARE_DIR = path.join(__dirname, 'spares')
const MAX_ATTEMPTS = 3
const SPARES_PER_CLIP = 2   // insurance takes, gated identically

function dbUrl() {
  return fs.readFileSync(path.resolve(__dirname, '../../.env.psql'), 'utf8').match(/DATABASE_URL=(.+)/)[1].trim()
}

async function buildWorklist() {
  const P = require('./proposal.json')
  const db = new Client({ connectionString: dbUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()
  const work = []
  for (const r of P.seed_repairs) {
    const q = await db.query(
      `select seed_number, seed_id, known_text, target_text, known_audio_id from course_seeds
       where course_code=$1 and seed_number=$2`, [COURSE, r.seed])
    const s = q.rows[0]
    work.push({
      id: `S${String(r.seed).padStart(4, '0')}-known`, kind: 'seed', seed_number: r.seed,
      seed_id: s.seed_id, old_audio_id: s.known_audio_id, old_text: s.known_text,
      ttsText: r.new, fullText: r.new, mustVoice: r.new, tier: r.tier, defect: r.defect,
    })
  }
  for (const a of P.audio_repairs) {
    const q = await db.query(
      `select l.lego_id, l.known_text, l.presentation_audio_id, ca.text as old_text
       from course_legos l left join course_audio ca on ca.id::text = l.presentation_audio_id
       where l.course_code=$1 and l.lego_id=$2`, [COURSE, a.lego])
    const l = q.rows[0]
    work.push({
      id: `${a.lego}-presentation`, kind: 'presentation', lego_id: a.lego,
      old_audio_id: l.presentation_audio_id, old_text: l.old_text,
      ttsText: a.new_text, fullText: a.new_text, headword: l.known_text,
      // the example sentence + headword must both be voiced; strip the template furniture
      mustVoice: a.new_text.replace(/ඉංග්‍රීසිෙන්\.|ඉතින්\. :|['"]/g, ' ').replace(/\s+/g, ' ').trim(),
      tier: a.tier, defect: a.defect,
    })
  }
  const vc = await db.query(`select voice_config from courses where course_code=$1`, [COURSE])
  await db.end()
  const voices = vc.rows[0].voice_config.voices
  return { work, voices }
}

async function renderOnce(text, voiceCfg, attempt) {
  const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(text, 'azure', {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    voiceName: voiceCfg.voiceId,
    speed: voiceCfg.settings?.speed ?? 1,
    regenerationAttempt: attempt,
  })
  const { buffer, durationMs } = await phase8.masterAudio(audioBuffer, text)
  return { buffer, durationMs, wordBoundaries }
}

async function main() {
  fs.mkdirSync(SHIP_DIR, { recursive: true })
  fs.mkdirSync(SPARE_DIR, { recursive: true })
  const { work, voices } = await buildWorklist()
  console.log(`${work.length} clips to render (${work.filter(w=>w.kind==='seed').length} seed known + ${work.filter(w=>w.kind==='presentation').length} presentation)`)

  const log = []
  for (const row of work) {
    const voiceCfg = row.kind === 'presentation' ? voices.presentation : voices.known
    if (voiceCfg.provider !== 'azure') throw new Error(`${row.id}: expected azure, got ${voiceCfg.provider}`)
    let shipped = null
    const attempts = []
    for (let a = 1; a <= MAX_ATTEMPTS && !shipped; a++) {
      const { buffer, durationMs, wordBoundaries } = await renderOnce(row.ttsText, voiceCfg, a - 1)
      const f = path.join(SPARE_DIR, `${row.id}-attempt${a}.mp3`)
      fs.writeFileSync(f, buffer)
      const g = runGates(row, row.ttsText, wordBoundaries, durationMs, f)
      attempts.push({ attempt: a, file: f, bytes: buffer.length, ms: durationMs, word_boundaries: wordBoundaries, ...g })
      console.log(`${row.id} a${a}: ms=${durationMs} z=${g.z.toFixed(2)} tail=${g.tail?.toFixed(1)}dB tok=${g.tokens} fail=${JSON.stringify(g.fail)}`)
      if (!g.fail.length) shipped = attempts[attempts.length - 1]
    }
    // spares: extra insurance takes for a clip that already has a passing take
    const spares = []
    if (shipped) {
      fs.copyFileSync(shipped.file, path.join(SHIP_DIR, `${row.id}.mp3`))
      for (let s = 1; s <= SPARES_PER_CLIP; s++) {
        const { buffer, durationMs, wordBoundaries } = await renderOnce(row.ttsText, voiceCfg, 90 + s)
        const f = path.join(SPARE_DIR, `${row.id}-spare${s}.mp3`)
        fs.writeFileSync(f, buffer)
        const g = runGates(row, row.ttsText, wordBoundaries, durationMs, f)
        spares.push({ spare: s, file: f, bytes: buffer.length, ms: durationMs, ...g })
        console.log(`  ${row.id} spare${s}: ms=${durationMs} z=${g.z.toFixed(2)} fail=${JSON.stringify(g.fail)}`)
      }
    } else {
      console.error(`${row.id}: NO PASSING TAKE after ${MAX_ATTEMPTS}`)
    }
    log.push({
      id: row.id, kind: row.kind, tier: row.tier, defect: row.defect,
      seed_number: row.seed_number ?? null, lego_id: row.lego_id ?? null,
      old_audio_id: row.old_audio_id, old_text: row.old_text, new_text: row.ttsText,
      shipped: shipped ? { file: path.join(SHIP_DIR, `${row.id}.mp3`), bytes: shipped.bytes, ms: shipped.ms,
        z: shipped.z, tail: shipped.tail, tokens: shipped.tokens, attempt: shipped.attempt,
        word_boundaries: shipped.word_boundaries, fail: shipped.fail } : null,
      attempts: attempts.map(a => ({ attempt: a.attempt, ms: a.ms, z: a.z, tail: a.tail, fail: a.fail })),
      spares: spares.map(s => ({ spare: s.spare, file: s.file, ms: s.ms, z: s.z, tail: s.tail, fail: s.fail })),
    })
  }
  fs.writeFileSync(path.join(__dirname, 'ship-log.json'), JSON.stringify(log, null, 1))
  const ok = log.filter(r => r.shipped).length
  console.log(`\n${ok}/${work.length} have a passing shipping take. Spares: ${log.reduce((n,r)=>n+r.spares.length,0)}. NOTHING uploaded, NOTHING relinked, NOTHING deleted.`)
  if (ok !== work.length) process.exit(2)
}
main().catch(e => { console.error('ABORT:', e.stack || e.message); process.exit(1) })
