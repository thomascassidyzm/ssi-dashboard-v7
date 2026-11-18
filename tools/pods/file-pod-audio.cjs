#!/usr/bin/env node
/**
 * File the app's trial pod clips as pod-only course_audio rows, through Popty (job #628).
 *
 * Reads the learning app's generated pod data — Pod Drill pieces (packages/player-vue/src/data/podDrillPieces/<course>.json)
 * with ops/pod-drill-pieces/recorded.json for each clip's voice and owning course, and Talk Bollocks
 * (tools/talk-bollocks/ita-1-timed.json + ita-1-manifest-checked.json) — and POSTs every trial_ id it finds to
 * POST /api/production/:courseCode/pod-audio/file (services/shared/pod-audio.cjs), 100 clips a call. Each clip is filed
 * under the first course of the run (alphabetically) whose pieces PLAY it, on that course's side — so its language is the side's
 * language there (recorded.json's course can be one where English is the target). A clip several courses share is ONE
 * row: an id already in the mapping is never posted again.
 * Writes nothing but that route's rows and the mapping file; renders nothing.
 *
 *   node tools/pods/file-pod-audio.cjs --app ~/ssi-learning-app [--course ita_for_eng] [--scene 4] [--talk-bollocks] [--apply]
 *
 *   --course       only this course's pieces file (default: every pieces file)
 *   --scene N      only turns of scene N (keys …:SC0N-…; Talk Bollocks: scene_number N)
 *   --talk-bollocks  include the Italian Talk Bollocks Part 1 clips (course ita_for_eng); --no-drill leaves pieces out
 *   --apply        really file (default: dry run)
 *   --accept-existing  map a clip whose identity is already filed (IDENTITY_TAKEN) onto that existing row; listed
 *   --map <path>   the trial→row mapping to merge into (default ops/pod-audio-rows/trial-to-row.json, tracked)
 *
 * The mapping is { "trial_<UUID>": { audioId, course, role } } — what the app's data is rewritten with.
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const flag = (n) => args.includes(n)
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d }

const APP = path.resolve(String(opt('--app', path.join(process.env.HOME, 'ssi-learning-app'))).replace(/^~/, process.env.HOME))
const ONLY_COURSE = opt('--course')
const SCENE = opt('--scene') ? Number(opt('--scene')) : null
const APPLY = flag('--apply')
const ACCEPT_EXISTING = flag('--accept-existing')
const MAP = path.resolve(opt('--map', path.join(__dirname, '..', '..', 'ops', 'pod-audio-rows', 'trial-to-row.json')))
const BASE = process.env.POPTY_API || 'http://localhost:3470'
const AGENT = process.env.POD_AUDIO_AGENT || 'job-628-file-pod-audio'

const isTrial = (id) => typeof id === 'string' && id.startsWith('trial_')
const sceneOfKey = (k) => { const m = /:SC(\d+)-/.exec(k); return m ? Number(m[1]) : null }

function drillClips() {
  const recorded = JSON.parse(fs.readFileSync(path.join(APP, 'ops/pod-drill-pieces/recorded.json'), 'utf8')).clips
  const byId = new Map()
  for (const [k, v] of Object.entries(recorded)) byId.set(v.audioId, { voice: v.voice, text: k.slice(k.indexOf('|') + 1), course: v.course })
  // Italian was recorded first, into its own ledger (ops/pod-drill-pieces/ita/clips.json): the voice is on the turn.
  const itaLedger = path.join(APP, 'ops/pod-drill-pieces/ita/clips.json')
  if (fs.existsSync(itaLedger)) {
    for (const t of JSON.parse(fs.readFileSync(itaLedger, 'utf8')).turns || []) {
      for (const p of t.pieces || []) {
        if (p.it && isTrial(p.it.trialClip) && !byId.has(p.it.trialClip)) byId.set(p.it.trialClip, { voice: t.targetVoice, text: p.it.text, course: 'ita_for_eng' })
        if (p.en && isTrial(p.en.trialClip) && !byId.has(p.en.trialClip)) byId.set(p.en.trialClip, { voice: t.knownVoice, text: p.en.text, course: 'ita_for_eng' })
      }
    }
  }
  const dir = path.join(APP, 'packages/player-vue/src/data/podDrillPieces')
  const files = fs.readdirSync(dir).sort().filter((f) => f.endsWith('.json') && (!ONLY_COURSE || f === `${ONLY_COURSE}.json`))
  const out = [], missing = []
  for (const f of files) {
    const turns = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).turns || {}
    for (const [key, pieces] of Object.entries(turns)) {
      if (SCENE != null && sceneOfKey(key) !== SCENE) continue
      for (const p of pieces) {
        for (const [id, side] of [[p[2], 'target'], [p[3], 'known']]) {
          if (!isTrial(id)) continue
          const r = byId.get(id)
          if (!r) { missing.push({ id, file: f, key }); continue }
          out.push({ trialId: id, text: r.text, voiceId: r.voice, side, course: f.replace(/\.json$/, ''), recordedFor: r.course })
        }
      }
    }
  }
  return { out, missing }
}

function talkBollocksClips() {
  const timed = JSON.parse(fs.readFileSync(path.join(APP, 'tools/talk-bollocks/ita-1-timed.json'), 'utf8')).clips
  const manifest = JSON.parse(fs.readFileSync(path.join(APP, 'tools/talk-bollocks/ita-1-manifest-checked.json'), 'utf8'))
  const out = [], missing = []
  // Which scene a clip plays in comes from the generated rows (scene_number), keyed by the clip id they serve.
  const dataTs = fs.readFileSync(path.join(APP, 'packages/player-vue/src/listening/talkBollocksIta1.data.ts'), 'utf8')
  const sceneOf = new Map()
  for (const m of dataTs.matchAll(/"scene_number":\s*(\d+)[\s\S]*?"target_audio_id":\s*"(trial_[^"]+)"/g)) sceneOf.set(m[2], Number(m[1]))
  for (const [i, c] of Object.entries(timed)) {
    if (!isTrial(c.audioId)) continue
    const m = manifest[Number(i)]
    if (!m || m.text !== c.text || !m.voiceId) { missing.push({ id: c.audioId, index: i }); continue }
    if (SCENE != null && sceneOf.get(c.audioId) !== SCENE) continue
    if (!sceneOf.has(c.audioId)) continue // not served by the app's rows
    out.push({ trialId: c.audioId, text: c.text, voiceId: m.voiceId.startsWith('cartesia_') ? m.voiceId : `cartesia_${m.voiceId}`, side: 'target', course: 'ita_for_eng', })
  }
  return { out, missing }
}

// A transport failure (Popty restarting under a deploy) is retried, at most 4 tries, 30 s apart. Safe because every call is
// idempotent: a clip already filed answers 'already' with its row. An HTTP refusal is never retried.
async function post(course, clips) {
  for (let attempt = 1; ; attempt++) {
    try { return await postOnce(course, clips) } catch (e) {
      if (e.http || attempt >= 4) throw e
      process.stderr.write(`${course}: ${e.message} — retry ${attempt} in 30 s\n`)
      await new Promise((r) => setTimeout(r, 30000))
    }
  }
}

async function postOnce(course, clips) {
  const r = await fetch(`${BASE}/api/production/${course}/pod-audio/file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
    body: JSON.stringify({ clips: clips.map(({ trialId, text, voiceId, side }) => ({ trialId, text, voiceId, side })), dryRun: !APPLY }),
    signal: AbortSignal.timeout(300000),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(`${course}: HTTP ${r.status} ${JSON.stringify(body).slice(0, 300)}`), { http: r.status })
  return body
}

// Written after EVERY batch on --apply, so a run stopped part-way keeps the rows it filed.
function saveMap(map) {
  if (!APPLY) return
  fs.mkdirSync(path.dirname(MAP), { recursive: true })
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(MAP, JSON.stringify(sorted, null, 1) + '\n')
}

async function main() {
  const all = [], missing = []
  if (!flag('--no-drill')) { const d = drillClips(); all.push(...d.out); missing.push(...d.missing) }
  if (flag('--talk-bollocks')) { const t = talkBollocksClips(); all.push(...t.out); missing.push(...t.missing) }
  // One row per trial clip, under its owning course.
  const map = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : {}
  const unique = new Map()
  let mapped = 0
  for (const c of all) {
    if (map[c.trialId]) { mapped++; continue }
    if (!unique.has(c.trialId)) unique.set(c.trialId, c)
  }
  const byCourse = new Map()
  for (const c of unique.values()) { if (!byCourse.has(c.course)) byCourse.set(c.course, []); byCourse.get(c.course).push(c) }

  const tally = { references: all.length, alreadyMapped: mapped, clips: unique.size, filed: 0, already: 0, wouldFile: 0, refused: 0, substituted: 0, timings: 0, unmatched: missing.length }
  const substitutions = []
  const refusals = []
  for (const [course, clips] of byCourse) {
    for (let i = 0; i < clips.length; i += 100) {
      const res = await post(course, clips.slice(i, i + 100))
      for (const r of res.results) {
        // --accept-existing: a clip whose words, voice and pod-only role already have a row in this course is mapped onto
        // THAT row (a different take of the same words in the same voice), and listed under `substituted` — never silently.
        if (r.status === 'refused' && r.code === 'IDENTITY_TAKEN' && ACCEPT_EXISTING && r.existing && r.existing.audioId) {
          tally.substituted++; substitutions.push({ course, trialId: r.trialId, audioId: r.existing.audioId, s3Key: r.existing.s3Key })
          map[r.trialId] = { audioId: r.existing.audioId, course, role: null, substitutedFor: 'IDENTITY_TAKEN' }
          continue
        }
        if (r.status === 'refused') { tally.refused++; refusals.push({ course, ...r }); continue }
        if (r.status === 'would-file') tally.wouldFile++
        if (r.status === 'filed') tally.filed++
        if (r.status === 'already') tally.already++
        if (r.timings) tally.timings++
        if (r.audioId) map[r.trialId] = { audioId: r.audioId, course, role: r.role }
      }
      saveMap(map)
      process.stderr.write(`${course}: ${Math.min(i + 100, clips.length)}/${clips.length} (filed ${tally.filed}, would ${tally.wouldFile}, refused ${tally.refused})\n`)
    }
  }
  saveMap(map)
  console.log(JSON.stringify({ dryRun: !APPLY, course: ONLY_COURSE, scene: SCENE, ...tally, refusals: refusals.slice(0, 50), substitutions, unmatchedIds: missing.slice(0, 20) }, null, 1))
}

main().catch((e) => { console.error(e.message); process.exit(1) })
