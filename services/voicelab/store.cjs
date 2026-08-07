/**
 * VOICELAB store — experiments, clips and the spend ledger, on disk.
 *
 * ── WHY DISK AND NOT A TABLE ────────────────────────────────────────────────────────
 * The clips have to be on this box's disk regardless: they are mastered mp3 bytes that
 * get served straight back to a browser, and nothing sane puts audio in Postgres or pays
 * S3 for a throwaway audition. Once the audio is on disk, putting the experiment record
 * beside it costs one JSON file and gives an atomic unit — delete the folder and the
 * experiment is gone, copy it and it moves. A table would add a migration, a schema to
 * keep in step, a second place for the same run to half-exist, and a reason for a lab to
 * hold a connection to the production database it must never write to.
 *
 * Cheaper (no migration, no rows, no client), simpler (one directory is the whole state),
 * and better (the record and its audio cannot get separated).
 *
 * NOTHING HERE TOUCHES course_audio. The only database this module reads is none.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const LAB_DIR = process.env.VOICELAB_LAB_DIR || path.join(__dirname, '../../scripts/voicelab-lab')
const EXPERIMENT_DIR = path.join(LAB_DIR, 'experiments')
const CLIP_DIR = path.join(LAB_DIR, 'clips')
const LEDGER = path.join(LAB_DIR, 'ledger.jsonl')

/** 64 bits of id. Unguessable enough that a clip URL is not a directory listing. */
const ID_RE = /^[a-f0-9]{16}$/

function ensureDirs () {
  fs.mkdirSync(EXPERIMENT_DIR, { recursive: true })
  fs.mkdirSync(CLIP_DIR, { recursive: true })
}

function newId () { return crypto.randomBytes(8).toString('hex') }

function experimentPath (id) { return path.join(EXPERIMENT_DIR, `${id}.json`) }
function clipPath (id) { return path.join(CLIP_DIR, `${id}.mp3`) }

/**
 * Write-then-rename. A poll landing mid-write must never read half a JSON file, and the
 * UI polls this record every second or so while a run is in flight.
 */
function writeExperiment (exp) {
  ensureDirs()
  const target = experimentPath(exp.id)
  const tmp = `${target}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(exp, null, 2))
  fs.renameSync(tmp, target)
  return exp
}

function readExperiment (id) {
  if (!ID_RE.test(String(id || ''))) return null
  try { return JSON.parse(fs.readFileSync(experimentPath(id), 'utf8')) } catch { return null }
}

/**
 * Read-modify-write under one call, so a background clip finishing and a rerun cannot
 * interleave into a lost update. Single process, single tick — that is all the
 * serialisation this needs, and pretending otherwise would be theatre.
 */
function updateExperiment (id, mutate) {
  const exp = readExperiment(id)
  if (!exp) return null
  const next = mutate(exp) || exp
  return writeExperiment(next)
}

function listExperiments (limit = 50) {
  ensureDirs()
  const files = fs.readdirSync(EXPERIMENT_DIR).filter((f) => /^[a-f0-9]{16}\.json$/.test(f))
  const out = []
  for (const f of files) {
    const exp = readExperiment(f.slice(0, 16))
    if (exp) out.push(exp)
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit)
}

function writeClip (id, buffer) {
  ensureDirs()
  fs.writeFileSync(clipPath(id), buffer)
  return clipPath(id)
}

function readClip (id) {
  if (!ID_RE.test(String(id || ''))) return null
  const file = clipPath(id)
  if (!fs.existsSync(file)) return null
  return file
}

// ── Spend ledger ───────────────────────────────────────────────────────────────────
// Appended the moment the money is spent, not when the gates finish — a run that
// crashes in the whisper pass still cost what it cost, and the ceiling must know.

function todayKey (now = new Date()) { return now.toISOString().slice(0, 10) }

function appendLedger (row) {
  ensureDirs()
  fs.appendFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n')
}

function readLedger () {
  if (!fs.existsSync(LEDGER)) return []
  return fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function charsSpentToday (now = new Date()) {
  const day = todayKey(now)
  return readLedger()
    .filter((r) => String(r.at || '').slice(0, 10) === day)
    .reduce((n, r) => n + (r.chars || 0), 0)
}

module.exports = {
  LAB_DIR,
  EXPERIMENT_DIR,
  CLIP_DIR,
  LEDGER,
  ID_RE,
  ensureDirs,
  newId,
  experimentPath,
  clipPath,
  writeExperiment,
  readExperiment,
  updateExperiment,
  listExperiments,
  writeClip,
  readClip,
  appendLedger,
  readLedger,
  charsSpentToday,
  todayKey,
}
