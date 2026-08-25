#!/usr/bin/env node
/**
 * Austrian German — listen to every one of Sasha's human clips and rule by ear.
 *
 * Usage:  node tools/deu-at-listen/server.cjs      (port DEU_AT_LISTEN_PORT, default 4791)
 *
 * WHY THIS EXISTS. Kai played the live deu_at_for_eng course and heard a clip
 * whose audio says something other than the text it is attached to. Two things
 * then turned out to be true, and together they make a machine verdict
 * worthless here:
 *
 *   1. NOTHING RECORDS ACCEPTANCE. The recorder's Approve tick is client-side
 *      only in script mode — useAutocueState.finalizeSession returns early for
 *      scriptMode with the comment "Approval in script mode is the recordist's
 *      own tick-list, not a gate" — so no accepted flag exists in any column,
 *      table or quality_notes key. All 225 clips are unaccepted.
 *   2. THE BINDING IS ALREADY NEWEST-TAKE. All 225 course_audio rows point at
 *      the newest natural take of their line, so no re-pointing can fix what
 *      Kai heard. A mislabel happens at CAPTURE, and only an ear can see it.
 *
 * So this serves the clips to Kai's phone. READ-ONLY on course data: it never
 * touches course_*, never generates or relinks audio. The only thing it writes
 * is Kai's own verdicts.
 *
 * Data (all under DEU_AT_LISTEN_DATA_DIR, default scripts/deu-at-listen/):
 *   manifest-deu_at_for_eng.json    the 225 live clips (built by manifest.cjs; required)
 *   deu_at_asr_scores.json          optional ASR mismatch ranking (job #620)
 *   verdicts-deu_at_for_eng.json    this tool's only output (written atomically)
 *
 * The ASR ranking is re-read on every /api/clips call, not cached at boot, so a
 * ranking that lands while the server is up takes effect on the next refresh.
 * Every clip is always listed — risky ones first, then the rest — because a
 * ranking Kai cannot disconfirm is worthless.
 */
const path = require('path')
const fs = require('fs')
const express = require('express')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const COURSE = 'deu_at_for_eng'
// Not PORT= : agent shells on watson-1 carry a stray PORT=4317.
const PORT = process.env.DEU_AT_LISTEN_PORT || 4791
const DATA_DIR = process.env.DEU_AT_LISTEN_DATA_DIR || path.join(REPO, 'scripts', 'deu-at-listen')

const manifestPath = path.join(DATA_DIR, `manifest-${COURSE}.json`)
const asrPath = path.join(DATA_DIR, 'deu_at_asr_scores.json')
const verdictsPath = path.join(DATA_DIR, `verdicts-${COURSE}.json`)

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath} — run tools/deu-at-listen/manifest.cjs first`)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const CLIPS = manifest.clips || []
const BY_ID = new Map(CLIPS.map((c) => [c.id, c]))

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// ---------- verdicts ----------
function loadVerdicts() {
  try {
    return JSON.parse(fs.readFileSync(verdictsPath, 'utf8'))
  } catch {
    return { course: COURSE, verdicts: {} }
  }
}
function saveVerdicts(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = verdictsPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1))
  fs.renameSync(tmp, verdictsPath)
}

// ---------- ASR suspicion ----------
// Absent or malformed → no ASR tier, and the page says the ranking is takes-only.
function loadAsr() {
  try {
    const raw = JSON.parse(fs.readFileSync(asrPath, 'utf8'))
    const rows = Array.isArray(raw) ? raw : raw.scores || raw.clips || []
    const byId = new Map()
    for (const r of rows) {
      if (!r || !r.audio_id) continue
      if (!(Number(r.margin) > 0)) continue   // only a POSITIVE margin is a suspicion
      byId.set(r.audio_id, r)
    }
    return byId
  } catch {
    return new Map()
  }
}

/**
 * Riskiest first. Three tiers, in Kai's stated order:
 *   0  ASR says the audio matches somebody else's text better than its own
 *   1  the line was recorded more than once (most takes first)
 *   2  everything else, in seed order
 * No clip is ever hidden — the tail is the disconfirming evidence.
 */
function orderedClips() {
  const asr = loadAsr()
  const scored = CLIPS.map((c, i) => {
    const a = asr.get(c.id) || null
    const tier = a ? 0 : (c.take_count > 1 ? 1 : 2)
    return { c, i, a, tier }
  })
  scored.sort((x, y) =>
    x.tier - y.tier ||
    (x.tier === 0 ? Number(y.a.margin) - Number(x.a.margin) : 0) ||
    (x.tier === 1 ? y.c.take_count - x.c.take_count : 0) ||
    ((x.c.seed ?? 1e9) - (y.c.seed ?? 1e9)) ||
    x.i - y.i
  )
  return scored.map(({ c, a, tier }, idx) => ({
    id: c.id,
    text: c.text,
    seed: c.seed,
    take_count: c.take_count,
    accepted: c.accepted,
    duration_ms: c.duration_ms,
    recorded_at: c.recorded_at,
    rank: idx + 1,
    tier,
    // Said in words on the card, because a rank nobody can interrogate is noise.
    why: tier === 0
      ? `sounds more like "${a.best_other_text}"`
      : tier === 1
        ? `${c.take_count} takes of this line`
        : null,
    asr: a && { decode: a.decode ?? null, own_score: a.own_score ?? null, margin: a.margin ?? null },
  }))
}

// ---------- server ----------
const app = express()
app.use(express.json())

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')))

app.get('/api/clips', (_req, res) => {
  const state = loadVerdicts()
  res.json({
    course: COURSE,
    voice_id: manifest.voice_id,
    asr_ranked: fs.existsSync(asrPath),
    // Uniform across the course, so it belongs in the header rather than on
    // every card: NOTHING here was ever accepted, because nothing can be.
    no_acceptance_record: CLIPS.every((c) => c.accepted === false),
    clips: orderedClips(),
    verdicts: state.verdicts || {},
  })
})

// verdict: 'real' | 'wrong' | null (clear)
app.post('/api/verdict', (req, res) => {
  const { id, verdict } = req.body || {}
  if (!id || !BY_ID.has(id)) return res.status(400).json({ error: 'unknown clip id' })
  if (!['real', 'wrong', null].includes(verdict ?? null)) {
    return res.status(400).json({ error: 'verdict must be real|wrong|null' })
  }
  const state = loadVerdicts()
  state.verdicts = state.verdicts || {}
  if (verdict == null) delete state.verdicts[id]
  else state.verdicts[id] = { verdict, at: new Date().toISOString() }
  saveVerdicts(state)
  res.json({ ok: true, verdicts: state.verdicts })
})

/**
 * The export. Actionable by design: a later worker gets the clip id, the s3 key,
 * the text it is bound to and every take of that line, so "this one is wrong"
 * can be turned into a re-point or a re-record without re-deriving anything.
 */
app.get('/api/export', (_req, res) => {
  const state = loadVerdicts()
  const v = state.verdicts || {}
  const rows = CLIPS.filter((c) => v[c.id]).map((c) => ({
    audio_id: c.id,
    verdict: v[c.id].verdict,
    judged_at: v[c.id].at,
    text: c.text,
    s3_key: c.s3_key,
    seed: c.seed,
    take_count: c.take_count,
    takes: c.takes,
  }))
  res.set('Content-Disposition', `attachment; filename="deu-at-verdicts.json"`)
  res.json({
    course: COURSE,
    exported_at: new Date().toISOString(),
    total_clips: CLIPS.length,
    judged: rows.length,
    wrong: rows.filter((r) => r.verdict === 'wrong').length,
    real: rows.filter((r) => r.verdict === 'real').length,
    rows,
  })
})

// Only manifest ids resolve to a key — an arbitrary S3 key is never fetchable.
app.get('/api/audio/:id', async (req, res) => {
  const clip = BY_ID.get(req.params.id)
  if (!clip || !clip.s3_key) return res.status(404).json({ error: 'unknown clip id' })
  const range = req.headers.range
  try {
    const out = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: clip.s3_key,
      ...(range ? { Range: range } : {}),
    }))
    res.status(range && out.ContentRange ? 206 : 200)
    res.set('Content-Type', 'audio/mpeg')
    res.set('Accept-Ranges', 'bytes')
    res.set('Cache-Control', 'no-store')
    if (out.ContentLength != null) res.set('Content-Length', String(out.ContentLength))
    if (out.ContentRange) res.set('Content-Range', out.ContentRange)
    out.Body.pipe(res)
  } catch (err) {
    res.status(502).json({ error: `S3 GET failed: ${err.name}` })
  }
})

app.listen(PORT, () => {
  console.log(`deu_at_for_eng listen — ${CLIPS.length} clips → http://localhost:${PORT}`)
  console.log(`  data dir: ${DATA_DIR}`)
})
