#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/guess/cut-pieces.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// BEFORE THIS IS NEXT RUN WITH --write: it writes course_audio rows over pg and uploads to S3 itself. That is no longer allowed
// (course content is written only through Popty routes; the agent login refuses course_audio writes, job #388). Route the
// registration through POST /api/production/:courseCode/edit (clip metadata) and the slot through link-clip first. Not swapped
// in #699 because the swap is not mechanical: a pod_atom clip with no course slot has no route that files it today.
/**
 * Cuts every clip the I-love-you mini-lesson plays from ONE whole take per language and ONE English take
 * (Tom 2026-10-06, r-2026-10-06-guess-i-love-you-mini-lesson: "never render single words alone (they get
 * mispronounced) ... take ONE whole-phrase recording in the target and ONE English I love you, and cut every
 * piece needed from those by alignment").
 *
 *   node tools/guess/cut-pieces.mjs                 # dry run: align, plan and check every cut; writes nothing remote
 *   node tools/guess/cut-pieces.mjs --write         # uploads each cut, registers it, writes tools/guess/lesson-cuts.json
 *   node tools/guess/cut-pieces.mjs --only=zho,cym  # just these languages (the English cuts are always made)
 *   --check                                         # also hears every cut back (align-takes.py --hear) and prints the letters heard
 *
 * The target take is the language's own I love you clip in the game (guessData.json: the human recording where
 * there is one, Aran's Welsh 68a9bf47, else the game clip); the English take is Charlotte's "I love you".
 * align-takes.py (Meta's MMS forced aligner, run under FA_PYTHON) times the words and puts each seam at the
 * quietest frame between them. A piece is the take from one seam to the next; a build-up stretch ("I love",
 * "love you", lessonTiling.ts buildSpans) is one contiguous cut across several pieces, so nothing is spliced
 * from separate words and no audio is invented. The first piece keeps the take's lead-in, the last its tail.
 *
 * A cut is registered as a course_audio row of role pod_atom (text "[guess cut] <text> #<hash of its bytes>"); a recut
 * that sounds different is a new row with a new id and S3 key, never an overwrite, as /api/audio caches a year
 * (cut-register.mjs). The row is in the take's own course, language, voice and origin. pod_atom has no configured course voice, so the audio_autolink trigger links it into
 * no course slot, and the library route never offers it for a course LEGO: it plays only where lessons.json names it.
 * No TTS is called: this tool never touches a provider.
 */
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import { appPath } from '../lib/learning-app.mjs'
import { registerCut } from './cut-register.mjs'

// the player's own tiling, so the cuts are the spans the lesson plays (it read ../../packages/... before the move)
const { buildSpans } = await import(pathToFileURL(appPath('packages/player-vue/src/guess/lessonTiling.ts')).href)
const WRITE = process.argv.includes('--write')
const CHECK = process.argv.includes('--check')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const POPTY = process.env.POPTY_DIR || `${homedir()}/ssi-dashboard-v7-clean`
const NODE_MODULES = process.env.POPTY_NODE_MODULES || `${homedir()}/SSi/ssi-dashboard-v7-clean/node_modules`
const FA_PYTHON = process.env.FA_PYTHON || `${homedir()}/.tmpbig/fa-venv/bin/python`
const LAME = process.env.LAME_BIN || (existsSync(`${homedir()}/.local/bin/lame`) ? `${homedir()}/.local/bin/lame` : 'lame')
/** Charlotte, the English voice everywhere (Tom 2026-10-04): her whole "I love you". */
const ENGLISH_TAKE = process.env.GUESS_ENGLISH_TAKE || 'f0e8f268-3ebd-4a2a-a60e-d2da1bb45a2c'
/** A seam this close to the take's loudest frame cuts through voicing: the cut is listed as doubtful. */
const VOICED_SEAM_DB = -12
const FADE_S = 0.008

const req = createRequire(`${NODE_MODULES}/x.js`)
const dotenv = req('dotenv')
dotenv.config({ path: `${POPTY}/.env`, quiet: true }); dotenv.config({ path: `${POPTY}/.env.psql`, quiet: true })
const { Client } = req('pg')
const { S3Client, GetObjectCommand, PutObjectCommand } = req('@aws-sdk/client-s3')

const SPEC = JSON.parse(readFileSync(appPath('tools/guess/lesson-splits.json'), 'utf8'))
const DATA = JSON.parse(readFileSync(appPath('packages/player-vue/src/guess/guessData.json'), 'utf8'))
const CUTS_JSON = appPath('tools/guess/lesson-cuts.json')   // the app's build-lessons.mjs reads it there
const STORE = existsSync(CUTS_JSON) ? JSON.parse(readFileSync(CUTS_JSON, 'utf8')) : { english: null, lessons: {} }

const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
const s3 = new S3Client({ region: (process.env.AWS_REGION || 'eu-west-1').trim(), credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim() } })
const BUCKET = (process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage').trim()
const tmp = mkdtempSync(join(process.env.CS_SCRATCH || tmpdir(), 'cut-pieces-'))
const report = [], doubtful = []

async function fetchTake(id) {
  const { rows: [t] } = await pg.query('select id, course_code, language, voice_id, origin, s3_key, duration_ms from course_audio where id = $1', [id])
  if (!t) throw new Error(`take ${id} is not in course_audio`)
  t.path = join(tmp, `${id}.mp3`)
  const o = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: t.s3_key }))
  writeFileSync(t.path, Buffer.from(await o.Body.transformToByteArray()))
  return t
}

// the jobs: the English take, then every split language's take, words as the aligner hears them (roman where there is one)
const jobs = [{ key: '_eng', id: ENGLISH_TAKE, words: SPEC.english.split(' '), pieceWords: SPEC.english.split(' ').map(() => 1) }]
for (const [key, spec] of Object.entries(SPEC.lessons)) {
  if (spec.single || (ONLY.length && !ONLY.includes(key))) continue
  const line = DATA.languages.find((l) => l.key === key)?.themed?.love?.sentences?.[0]
  const id = line?.audioId || line?.gameAudioId
  if (!id) { report.push(`${key}: no I love you take in the game, skipped`); continue }
  const said = spec.pieces.map((p) => (p.roman || p.target).split(/\s+/))
  jobs.push({ key, id, words: said.flat(), pieceWords: said.map((w) => w.length), spec })
}
for (const j of jobs) j.take = await fetchTake(j.id)
const jobsFile = join(tmp, 'jobs.json')
writeFileSync(jobsFile, JSON.stringify(jobs.map((j) => ({ key: j.key, path: j.take.path, words: j.words }))))
const fa = spawnSync(FA_PYTHON, [here('./align-takes.py'), jobsFile], { encoding: 'utf8', maxBuffer: 1 << 26 })
if (fa.status !== 0) { console.error('aligner failed:', fa.stderr.slice(-2000)); process.exit(2) }
const ALIGNED = JSON.parse(fa.stdout)

const sh = (c, a) => execFileSync(c, a, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 })
const msOf = (f) => Math.round(Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()) * 1000)
/** ffmpeg decodes and fades, the real lame binary encodes (the iOS-safe pipe Popty's audio-processor uses). */
function cut(src, from, to, total, out) {
  const fades = [from > 0 ? `afade=t=in:d=${FADE_S}` : null, to < total ? `afade=t=out:st=${Math.max(0, (to - from) / 1000 - FADE_S)}:d=${FADE_S}` : null].filter(Boolean)
  const wav = out.replace(/\.mp3$/, '.wav')
  sh('ffmpeg', ['-y', '-v', 'error', '-i', src, '-ss', String(from / 1000), '-to', String(to / 1000), ...(fades.length ? ['-af', fades.join(',')] : []), '-ac', '1', '-ar', '48000', wav])
  sh(LAME, ['-m', 'm', '-b', '96', '--cbr', '--noreplaygain', '-q', '2', '--silent', wav, out])
}
/** The letters the aligner's own acoustic model hears in each file, no language model to complete a fragment. */
function hearAll(files) {
  const r = spawnSync(FA_PYTHON, [here('./align-takes.py'), '--hear', ...files], { encoding: 'utf8', maxBuffer: 1 << 26 })
  return r.status === 0 ? JSON.parse(r.stdout) : {}
}

/** A cut's row: reused only for byte-identical audio, else a fresh id and key (cut-register.mjs, lane review #81·K). */
const register = (take, text, file) => registerCut(pg, (Key, Body) => s3.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body, ContentType: 'audio/mpeg' })).then(() => {}), take, text, readFileSync(file), msOf(file))

/** Seams between pieces (not between the words inside one), from the aligner's word seams. */
function pieceSeams(j, a) {
  const at = []; let w = 0
  for (const n of j.pieceWords.slice(0, -1)) { w += n; at.push(w - 1) }
  return at.map((i) => ({ ms: a.seams[i], db: a.seamDb[i], score: Math.min(a.spans[i].score, a.spans[i + 1].score) }))
}

const planned = []
for (const j of jobs) {
  const a = ALIGNED[j.key]
  if (!a || a.error) { report.push(`${j.key}: aligner ${a?.error || 'gave nothing'}, skipped`); continue }
  j.total = msOf(j.take.path)
  j.seams = pieceSeams(j, a)
  const seams = j.seams
  // the stretches to cut: every piece, and every build-up stretch short of the whole line
  const units = j.key === '_eng'
    ? [[0, 0], [1, 1], [2, 2], [0, 1], [1, 2]].map(([f, t]) => ({ f, t, text: j.words.slice(f, t + 1).join(' ') }))
    : [...j.spec.pieces.map((p, k) => ({ f: k, t: k, text: p.target })),
       ...buildSpans(j.spec.pieces, SPEC.english).flat().filter((s) => !(s.from === 0 && s.to === j.spec.pieces.length - 1)).map((s) => ({ f: s.from, t: s.to, text: s.target }))]
  for (const u of units) {
    const from = u.f === 0 ? 0 : seams[u.f - 1].ms
    const to = u.t === seams.length ? j.total : seams[u.t].ms
    const edges = [u.f > 0 ? seams[u.f - 1] : null, u.t < seams.length ? seams[u.t] : null].filter(Boolean)
    const worry = [to - from < 120 ? `${to - from} ms long` : null,
      ...edges.filter((e) => e.db > VOICED_SEAM_DB).map((e) => `seam at ${e.ms} ms is only ${e.db} dB below the peak, it cuts through voicing`),
      ...edges.filter((e) => e.score < 0.3).map((e) => `aligner unsure at ${e.ms} ms (${e.score})`)].filter(Boolean)
    const file = join(tmp, `${j.key}-${u.f}-${u.t}.mp3`)
    cut(j.take.path, from, to, j.total, file)
    const name = `${j.key} "${u.text}" ${from}-${to} ms of ${j.id.slice(0, 8)}`
    if (worry.length) doubtful.push(`${name}: ${worry.join('; ')}`)
    planned.push({ j, u, from, to, file, name })
  }
}
const ear = CHECK ? hearAll([...jobs.map((j) => j.take.path), ...planned.map((p) => p.file)]) : {}
if (CHECK) for (const j of jobs) report.push(`${j.key} whole take heard "${ear[j.take.path] ?? '?'}"`)
for (const p of planned) {
  const heard = CHECK ? ` heard "${ear[p.file] ?? '?'}"` : ''
  if (!WRITE) { report.push(`${p.name}${heard}`); continue }
  const c = { ...(await register(p.j.take, p.u.text, p.file)), from: p.from, to: p.to }
  p.j.cuts = { ...(p.j.cuts || {}), [p.u.text]: c }
  report.push(`${p.name} -> ${c.id}${heard}`)
}
// a one-word line plays its whole take as it stands: only its id and length are recorded
if (WRITE) for (const [key, spec] of Object.entries(SPEC.lessons)) {
  if (!spec.single || (ONLY.length && !ONLY.includes(key))) continue
  const line = DATA.languages.find((l) => l.key === key)?.themed?.love?.sentences?.[0]
  const id = line?.audioId || line?.gameAudioId
  const { rows: [t] } = id ? await pg.query('select duration_ms, voice_id from course_audio where id = $1', [id]) : { rows: [] }
  if (t) STORE.lessons[key] = { take: id, ms: t.duration_ms, voice: t.voice_id, single: true }
  else report.push(`${key}: no I love you take in the game, skipped`)
}
if (WRITE) for (const j of jobs.filter((x) => x.cuts)) {
  const entry = { take: j.id, ms: j.total, voice: j.take.voice_id, seams: j.seams.map((s) => s.ms), cuts: j.cuts }
  if (j.key === '_eng') STORE.english = entry
  else STORE.lessons[j.key] = entry
}
await pg.end()
console.log(report.join('\n'))
console.log(`\ndoubtful (${doubtful.length}):\n${doubtful.join('\n') || 'none'}`)
if (WRITE) {
  STORE.note = 'WRITTEN BY tools/guess/cut-pieces.mjs (Tom 2026-10-06): each lesson clip cut from one whole take, keyed by the text it says; build-lessons.mjs reads it.'
  writeFileSync(CUTS_JSON, JSON.stringify(STORE, null, 1) + '\n')
  console.log('wrote', CUTS_JSON)
}
