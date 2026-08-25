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
 * So the ear is the only instrument, and this is it. 331 takes over 225 prompted
 * lines — the 106 that are not the bound clip are invisible from the course side
 * and are exactly where the good audio hides.
 *
 * THE TEXT SHOWN IS THE PROMPTED LINE — what the recording tool asked Sascha to
 * say, out of the take's own provenance — not the text of the course slot the
 * autolinker later bound it to. Where those disagree the take is flagged.
 *
 * Sascha uses they/them. They record the male voice; that describes the part.
 *
 * WHICH FLOW PRODUCED A TAKE IS NOT STORED — the page's start-to-finish /
 * spliced filter is an INFERENCE from the shape of the take, and the page says
 * so above the filter itself. The rule, what was checked, and the confidence all
 * live in manifest.cjs's header and travel to the browser inside the manifest,
 * so the claim can never be shown apart from its basis.
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
 *   manifest-deu_at_for_eng.json    331 takes, grouped (built by manifest.cjs)
 *   verdicts-deu_at_for_eng.json    this tool's only output, written atomically
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
    // The inference disclosure travels with the data it describes, so the page
    // cannot show the split without showing that it is a deduction.
    flow: m.flow || null,
    groups: manifestState.GROUPS,
    verdicts: state.verdicts || {},
  })
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
      verdicts: judged.map((t) => ({ uuid: t.uuid, verdict: v[t.uuid].verdict, at: v[t.uuid].at, recorded_at: t.recorded_at, cadence: t.cadence })),
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

// Only manifest uuids resolve to a key — an arbitrary S3 key is never fetchable.
app.get('/api/audio/:uuid', async (req, res) => {
  const take = manifestState.BY_UUID.get(req.params.uuid)
  if (!take || !take.s3_key) return res.status(404).json({ error: 'unknown take' })
  const range = req.headers.range
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
  console.log(`deu_at_for_eng takes — ${TAKES.length} takes over ${GROUPS.length} lines → http://localhost:${PORT}`)
  console.log(`  data dir: ${DATA_DIR}`)
})
