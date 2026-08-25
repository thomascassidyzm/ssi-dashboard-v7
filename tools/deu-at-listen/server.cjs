#!/usr/bin/env node
/**
 * Austrian German — every take Sascha recorded, against the line they were asked
 * to say. Judge by ear.
 *
 * Usage:  node tools/deu-at-listen/server.cjs   (DEU_AT_LISTEN_PORT, default 4791)
 *
 * WHY THIS EXISTS, and why it lists TAKES rather than clips.
 *
 * Kai played the live deu_at_for_eng course and heard a clip saying something
 * other than its text. The obvious rule — "bind the newest take" — is WRONG, and
 * job #601 proved it against the live database: Sascha repeatedly read a line
 * correctly and then flubbed the retry seconds later ("Ups!", a laugh, the wrong
 * sentence), and the linker had already taken the later one. Newest is not
 * better; here it is reliably worse.
 *
 * And there is no way to tell the two apart from data. THERE IS NO ACCEPTANCE
 * FLAG ANYWHERE — not on course_audio, not on recording_provenance, not in
 * services/recording-upload-helpers.cjs. The recordist surface only has
 * discardLine(), which discards BEFORE upload, so a take that reached the
 * database is a take nobody ever passed judgement on. In script mode the
 * autocue's own Approve tick never leaves the browser either
 * (useAutocueState.finalizeSession returns early for scriptMode: "Approval in
 * script mode is the recordist's own tick-list, not a gate").
 *
 * So the ear is the only instrument, and this is it. Sascha's takes over their
 * prompted lines — the ones that are not the bound clip are invisible from the
 * course side, and are exactly where the good audio hides. Counts are in the
 * manifest, never restated here where they would rot.
 *
 * THE TEXT SHOWN IS THE PROMPTED LINE — what the recording tool asked Sascha to
 * say, out of the take's own provenance — not the text of the course slot the
 * autolinker later bound it to. Where those disagree the take is flagged.
 *
 * Sascha uses they/them. They record the male voice; that describes the part.
 *
 * WHICH FLOW PRODUCED A TAKE IS NOT STORED, and this tool does not guess it.
 * KAI MARKS THE TAKES HIMSELF (his ruling, 2026-08-25: "give me a button in that
 * last page to mark a set of takes as that"), a set at a time, and his marks are
 * the only record of it that exists anywhere. Nothing is pre-filled, because
 * there is nothing to pre-fill it from — manifest.cjs's header lists what was
 * checked. The marks are a SECOND AXIS, independent of Good/Bad: a take can be
 * start-to-finish and bad, or spliced and good.
 *
 * The sets he marks are the recording SITTINGS, which ARE stored
 * (script_session_id), plus the current line group and everything on screen.
 *
 * IT DOES WRITE TO THE COURSE NOW, and only under one condition: Kai tapped Good
 * on a take, and he then confirmed the plan. /api/apply-plan shows the change
 * first and writes nothing; /api/apply performs one versioned in-place swap per
 * line via services/shared/audio-revision-swap.cjs — the row id never moves,
 * nothing is deleted, the bytes are proven present before the row is repointed,
 * a rollback row is written first and audio_revision bumps so learners actually
 * get the new audio. The whole batch reverses with one command. Everything else
 * here is still read-only. No audio is ever generated.
 *
 * Data (all under DEU_AT_LISTEN_DATA_DIR, default scripts/deu-at-listen/):
 *   manifest-deu_at_for_eng.json    every take, grouped by prompted line (manifest.cjs)
 *   verdicts-deu_at_for_eng.json    Kai's Good/Bad, written atomically
 *   marks-deu_at_for_eng.json       Kai's flow marks + the undo history
 */
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')
const express = require('express')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { buildPlan, applyPlan } = require('./apply.cjs')

const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const COURSE = 'deu_at_for_eng'
// Not PORT= : agent shells on watson-1 carry a stray PORT=4317.
const PORT = process.env.DEU_AT_LISTEN_PORT || 4791
const DATA_DIR = process.env.DEU_AT_LISTEN_DATA_DIR || path.join(REPO, 'scripts', 'deu-at-listen')

const manifestPath = path.join(DATA_DIR, `manifest-${COURSE}.json`)
const verdictsPath = path.join(DATA_DIR, `verdicts-${COURSE}.json`)

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest: ${manifestPath} — run tools/deu-at-listen/manifest.cjs first`)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const GROUPS = manifest.groups || []
const TAKES = GROUPS.flatMap((g) => g.takes)
const BY_UUID = new Map(TAKES.map((t) => [t.uuid, t]))

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// ---------- verdicts ----------
function loadVerdicts() {
  try { return JSON.parse(fs.readFileSync(verdictsPath, 'utf8')) }
  catch { return { course: COURSE, verdicts: {} } }
}
function saveVerdicts(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = verdictsPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1))
  fs.renameSync(tmp, verdictsPath)
}

// ---------- marks: which reading order a take came from ----------
// A SECOND AXIS, deliberately independent of the Good/Bad verdict. A take can be
// start-to-finish and bad, or spliced and good, and collapsing the two into one
// control would make it impossible to say either.
//
// These are Kai's, and they are the ONLY record of the flow that exists
// anywhere: nothing in the schema stores it (see manifest.cjs's header), so
// nothing is pre-filled and this file is not derived from anything.
const marksPath = path.join(DATA_DIR, `marks-${COURSE}.json`)
const FLOWS = ['continuous', 'spliced']
// Enough history that a thumb can walk back out of a wrong session tap, not so
// much that the file grows without bound.
const UNDO_DEPTH = 20

function loadMarks() {
  try { return JSON.parse(fs.readFileSync(marksPath, 'utf8')) }
  catch { return { course: COURSE, marks: {}, undo: [] } }
}
function saveMarks(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = marksPath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1))
  fs.renameSync(tmp, marksPath)
}

// ---------- server ----------
const app = express()
app.use(express.json())

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')))

// The manifest is loaded once at boot and rebuilt in place after an apply, so
// `let` rather than `const`: a page reloaded after a swap must see the new live
// take, not the one it just replaced.
let manifestState = { manifest, GROUPS, TAKES, BY_UUID }

function reloadManifest() {
  const fresh = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const groups = fresh.groups || []
  const takes = groups.flatMap((g) => g.takes)
  manifestState = { manifest: fresh, GROUPS: groups, TAKES: takes, BY_UUID: new Map(takes.map((t) => [t.uuid, t])) }
}

app.get('/api/takes', (_req, res) => {
  const state = loadVerdicts()
  const m = manifestState.manifest
  res.json({
    course: COURSE,
    recordist: m.recordist,
    total_takes: m.total_takes,
    total_lines: m.total_lines,
    live_takes: m.live_takes,
    refused_takes: m.refused_takes || 0,
    // Says, in the data itself, that the flow is not stored and nothing is
    // pre-filled — so the page cannot show the marking control without saying
    // where the marks come from.
    flow: m.flow || null,
    // The recorded sittings, which is what "mark a set" acts on.
    sessions: m.sessions || [],
    unsessioned_takes: m.unsessioned_takes || 0,
    groups: manifestState.GROUPS,
    verdicts: state.verdicts || {},
    marks: loadMarks().marks || {},
  })
})

/**
 * Mark a SET of takes as one reading order or the other. Sets, not singles: the
 * takes cluster by sitting and Kai is doing this with a thumb.
 *
 * flow: 'continuous' | 'spliced' | null (clear). Every call returns an undo
 * token carrying the PREVIOUS value of each take it touched, so undo restores
 * exactly what was there — including "was marked the other way" and "was not
 * marked at all", which a blanket clear could not.
 */
app.post('/api/mark', (req, res) => {
  const { uuids, flow, label } = req.body || {}
  if (!Array.isArray(uuids) || !uuids.length) return res.status(400).json({ error: 'uuids must be a non-empty array' })
  if (!FLOWS.includes(flow ?? null) && flow != null) {
    return res.status(400).json({ error: `flow must be ${FLOWS.join('|')} or null` })
  }
  const known = uuids.filter((u) => manifestState.BY_UUID.has(u))
  if (!known.length) return res.status(400).json({ error: 'none of those takes exist' })

  const state = loadMarks()
  state.marks = state.marks || {}
  state.undo = state.undo || []

  const previous = {}
  for (const u of known) previous[u] = state.marks[u] ? state.marks[u].flow : null
  const token = `u${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
  const at = new Date().toISOString()
  state.undo.unshift({ token, at, label: label || `${known.length} takes`, count: known.length, previous })
  state.undo = state.undo.slice(0, UNDO_DEPTH)

  for (const u of known) {
    if (flow == null) delete state.marks[u]
    else state.marks[u] = { flow, at }
  }
  saveMarks(state)
  res.json({
    ok: true,
    marked: known.length,
    unknown: uuids.length - known.length,
    undo: { token, label: label || `${known.length} takes`, count: known.length },
    marks: state.marks,
  })
})

/** Put back exactly what a given mark action replaced. */
app.post('/api/mark/undo', (req, res) => {
  const { token } = req.body || {}
  const state = loadMarks()
  const entry = (state.undo || []).find((u) => u.token === token)
  if (!entry) return res.status(404).json({ error: 'nothing to undo under that token' })
  state.marks = state.marks || {}
  for (const [u, was] of Object.entries(entry.previous)) {
    if (was == null) delete state.marks[u]
    else state.marks[u] = { flow: was, at: entry.at }
  }
  state.undo = state.undo.filter((u) => u.token !== token)
  saveMarks(state)
  res.json({ ok: true, restored: Object.keys(entry.previous).length, marks: state.marks })
})

// verdict: 'good' | 'bad' | null (clear). Keyed by TAKE, not by line — the whole
// question is which take of a line is the good one.
app.post('/api/verdict', (req, res) => {
  const { uuid, verdict } = req.body || {}
  if (!uuid || !manifestState.BY_UUID.has(uuid)) return res.status(400).json({ error: 'unknown take' })
  if (!['good', 'bad', null].includes(verdict ?? null)) {
    return res.status(400).json({ error: 'verdict must be good|bad|null' })
  }
  const state = loadVerdicts()
  state.verdicts = state.verdicts || {}
  if (verdict == null) delete state.verdicts[uuid]
  else state.verdicts[uuid] = { verdict, at: new Date().toISOString() }
  saveVerdicts(state)
  res.json({ ok: true, verdicts: state.verdicts })
})

/**
 * The export. Actionable by design: for every line Kai judged, it names the take
 * he called good, the take that is live, and whether they differ — which is the
 * exact work-list for a later re-point, without re-deriving anything.
 */
app.get('/api/export', (_req, res) => {
  const v = loadVerdicts().verdicts || {}
  const marks = loadMarks().marks || {}
  const lines = manifestState.GROUPS.map((g) => {
    const judged = g.takes.filter((t) => v[t.uuid])
    if (!judged.length) return null
    const good = judged.filter((t) => v[t.uuid].verdict === 'good')
    const liveTake = g.takes.find((t) => t.is_live) || null
    const chosen = good.find((t) => t.cadence !== 'slow') || good[0] || null
    return {
      prompted_text: g.prompted_text,
      seed: g.seed,
      live_take: liveTake && { uuid: liveTake.uuid, s3_key: liveTake.s3_key, course_audio_id: liveTake.course_audio_id },
      chosen_good_take: chosen && { uuid: chosen.uuid, s3_key: chosen.s3_key, cadence: chosen.cadence },
      // The only field a re-pointer needs to act on.
      needs_repoint: Boolean(chosen && liveTake && chosen.uuid !== liveTake.uuid),
      // Two axes, kept apart: what Kai thought of the take, and which reading
      // order he says produced it.
      verdicts: judged.map((t) => ({ uuid: t.uuid, verdict: v[t.uuid].verdict, at: v[t.uuid].at, recorded_at: t.recorded_at, cadence: t.cadence, flow_mark: marks[t.uuid]?.flow || null })),
    }
  }).filter(Boolean)
  res.set('Content-Disposition', 'attachment; filename="sascha-take-verdicts.json"')
  res.json({
    course: COURSE,
    exported_at: new Date().toISOString(),
    total_takes: manifestState.manifest.total_takes,
    judged_takes: Object.keys(v).length,
    lines_judged: lines.length,
    needs_repoint: lines.filter((l) => l.needs_repoint).length,
    // The flow marks in full — the only record anywhere of which reading order
    // produced which take, so it leaves this tool whole rather than per-line.
    flow_marks: {
      note: 'Kai\'s own marks. The recording flow is not stored in the database; nothing here is derived or pre-filled.',
      continuous: Object.entries(marks).filter(([, m]) => m.flow === 'continuous').map(([u]) => u),
      spliced: Object.entries(marks).filter(([, m]) => m.flow === 'spliced').map(([u]) => u),
    },
    lines,
  })
})

/**
 * What a tap of "add my Good takes to the course" would do. Writes NOTHING —
 * it exists so the change is shown before it is made, and so a plan with
 * nothing in it says so instead of pretending to work.
 */
app.get('/api/apply-plan', (_req, res) => {
  try {
    const plan = buildPlan(manifestState.manifest, loadVerdicts().verdicts || {})
    res.json(plan)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Apply it. ONLY takes Kai explicitly marked Good, one versioned in-place swap
 * each, every one reversible by the batch id this returns. After the writes the
 * manifest is rebuilt from the LIVE database, so the page shows what is actually
 * there rather than what this process believes it wrote.
 */
app.post('/api/apply', async (req, res) => {
  if (!req.body?.confirm) return res.status(400).json({ error: 'confirm required' })
  try {
    const plan = buildPlan(manifestState.manifest, loadVerdicts().verdicts || {})
    if (!plan.actions.length) return res.json({ applied: 0, failed: 0, batch: null, summary: plan.summary })
    const out = await applyPlan(plan, { logger: console })
    try {
      execFileSync(process.execPath, [path.join(__dirname, 'manifest.cjs'), '--out', DATA_DIR], { encoding: 'utf8' })
      reloadManifest()
    } catch (err) {
      console.error(`[apply] batch ${out.batch} landed but the manifest rebuild failed: ${err.message}`)
    }
    console.log(`[apply] batch ${out.batch}: ${out.applied.length} applied, ${out.failed.length} failed. Reverse with: node tools/deu-at-listen/apply.cjs --rollback ${out.batch}`)
    res.json({
      batch: out.batch,
      applied: out.applied.length,
      failed: out.failed.length,
      rollback_command: `node tools/deu-at-listen/apply.cjs --rollback ${out.batch}`,
      details: out.applied,
      failures: out.failed,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * The refused takes were never mastered, so most of them are still in the
 * browser container the phone recorded them in (raw/*.webm). Handing those to
 * an iPhone with a Content-Type of audio/mpeg gets silence and no error — iOS
 * Safari plays no WebM at all. So a non-mp3 take is transcoded once, cached on
 * disk, and served from there.
 *
 * ffmpeg only. NOTHING here generates speech — it is a container change on bytes
 * Sascha already recorded, and it costs nothing.
 */
const TRANSCODE_DIR = path.join(DATA_DIR, 'transcoded')

async function transcodedPath(take) {
  const dest = path.join(TRANSCODE_DIR, `${take.uuid}.mp3`)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest
  fs.mkdirSync(TRANSCODE_DIR, { recursive: true })
  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: take.s3_key }))
  const src = path.join(TRANSCODE_DIR, `${take.uuid}.src`)
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(src)
    obj.Body.pipe(w).on('finish', resolve).on('error', reject)
  })
  const tmp = dest + '.tmp'
  // -f mp3 explicitly: the output is written to a .tmp name first (so a killed
  // transcode never leaves a half file that later reads as cached), and ffmpeg
  // cannot guess a container from that extension.
  execFileSync('ffmpeg', ['-y', '-i', src, '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', tmp], { stdio: 'pipe' })
  fs.renameSync(tmp, dest)
  fs.unlinkSync(src)
  return dest
}

// Only manifest uuids resolve to a key — an arbitrary S3 key is never fetchable.
app.get('/api/audio/:uuid', async (req, res) => {
  const take = manifestState.BY_UUID.get(req.params.uuid)
  if (!take || !take.s3_key) return res.status(404).json({ error: 'unknown take' })
  const range = req.headers.range

  if (!take.s3_key.endsWith('.mp3')) {
    try {
      const file = await transcodedPath(take)
      res.set('Content-Type', 'audio/mpeg')
      res.set('Cache-Control', 'no-store')
      res.set('Content-Length', String(fs.statSync(file).size))
      return fs.createReadStream(file).pipe(res)
    } catch (err) {
      return res.status(502).json({ error: `could not transcode ${take.s3_key}: ${err.message}` })
    }
  }

  try {
    const out = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: take.s3_key,
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
  console.log(`deu_at_for_eng takes — ${manifestState.TAKES.length} takes over ${manifestState.GROUPS.length} lines → http://localhost:${PORT}`)
  console.log(`  data dir: ${DATA_DIR}`)
})
