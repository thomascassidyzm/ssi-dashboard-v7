#!/usr/bin/env node
/**
 * POD DRILL STANDALONE KNOWN PIECES (job #707). Every known piece score.mjs calls TIGHT, and every piece
 * known-rerecord.mjs lists as re-record (never cut), is made as ITS OWN clip in the same voice as the
 * English take it would have been cut from, and wired into the cut file so Drill plays it in place of
 * the cut. Clean cuts are left exactly as they are (Tom r-2026-11-03-pod-1-drill-cuts-do-not: "re-bake
 * that short piece as its own clip"; and NOT a fresh recording of every piece: "Many of them will work
 * fine").
 *
 *   node tools/pods/pod-drill/render.mjs <course>            dry run: asks the route what each would cost
 *   node tools/pods/pod-drill/render.mjs <course> --render   for real, then verifies and wires
 *        [--rejected]   only the pieces a person did not accept in <course>.ear.json (reject or borderline, job #750)
 *        [--approval=kai:YYYY-MM-DD:<reason>]  Kai's own approval token, passed to the route as he gave it
 *        (r-2026-10-30-kai-can-authorise-any-audio-work). Most English pieces are already recorded in some
 *        OTHER voice, which the route refuses as a second performance (EXISTS_IN_LANGUAGE) without it.
 *        Never invented here: no token, no field.
 *
 * AUDIO GOES ONE WAY (Tom 2026-09-29): POST http://localhost:3470/api/audio/render, library first, the
 * spend guard, one render. This file only ASKS that route; it holds no key and imports no provider. A
 * refusal (402, NOT_IN_CHAIN, DAILY_TOTAL_CAP, REPEAT, EXISTS_IN_LANGUAGE, ...) is recorded as the
 * answer for that piece and never retried; the piece keeps its cut.
 *
 * MAKE BEFORE BREAK: a clip is wired only after it is fetched back over the app's audio proxy and
 * decodes to sound. Wiring ADDS the clip id as a 7th element of the chunk, [target, ts, te, known, ks,
 * ke, standaloneClipId], keeping the cut's own span: the player (fusionDrill.verifiedCutGroups, #707)
 * plays the standalone clip when it is there, and the cut stays on record so both can be heard.
 * A re-record piece with no known span is written [target, ts, te, known, null, null, clipId]. A
 * re-record piece on a card with no cut at all has no chunk to wire: the player finds its clip by its
 * known text in the line's voice (ListeningOverlay lookupFineKnown), which is what this render makes.
 *
 * A PIECE A PERSON HEARD AS FINE KEEPS ITS CUT (job #750: "keep accepted cuts"): where <course>.ear.json
 * marked a piece accept and an earlier run wired a standalone clip over it, --render takes
 * the clip id off the chunk again, so Drill plays the cut that was heard. Nothing is deleted: the clip
 * stays in the library and its answer stays in score.json under `unwired`.
 *
 * Reads <course>.score.json (score.mjs --write), <course>.known-rerecord.json, the cut file, and the
 * pod's clip voices from Popty GET /api/pod-scripts/<course>?track=known. Writes (with --render)
 * <course>.score.json (each piece's render answer), <course>.standalone.json (the re-record pieces'
 * answers) and the cut file. The cut file never shrinks: every id it changes is one this run wired.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { OPS, cutsPath } from './paths.mjs'
import { noShrink } from './lib.mjs'

const argv = process.argv.slice(2)
const course = argv.find((a) => !a.startsWith('--'))
if (!course) { console.error('usage: render.mjs <course> [--render]'); process.exit(1) }
const REAL = argv.includes('--render')
// The slot: pod_fine_known, the role the player reads a pod known piece from (ListeningOverlay
// crossFetchKnowns: role in pod_fine_known/known, in the line's own voice). Not 'known': that is the
// course's LEGO known slot, one cast voice, and the route refuses a pod speaker's voice there
// (VOICE_POLICY). The route resolves a role it does not list to the TARGET language, so the known
// language is named.
const KNOWN_LANG = course.split('_for_')[1]
const APPROVAL = (argv.find((a) => a.startsWith('--approval=')) || '').slice('--approval='.length) || null
const POPTY = process.env.POPTY_API || 'http://localhost:3470'
const AUDIO = 'https://saysomethingin.app/api/audio'
const AGENT = 'tools/pods/pod-drill/render.mjs (#707)'
const scratch = path.join(process.env.CS_SCRATCH || os.tmpdir(), 'pod-drill-render', course); mkdirSync(scratch, { recursive: true })

const scoreF = path.join(OPS, `${course}.score.json`)
if (!existsSync(scoreF)) { console.error(`no ${scoreF}: run score.mjs ${course} --write first`); process.exit(1) }
const score = JSON.parse(readFileSync(scoreF, 'utf8'))
const rr = existsSync(path.join(OPS, `${course}.known-rerecord.json`)) ? JSON.parse(readFileSync(path.join(OPS, `${course}.known-rerecord.json`), 'utf8')).rerecord : []
const cutF = cutsPath(course)
const cutFile = JSON.parse(readFileSync(cutF, 'utf8'))
const prev = JSON.parse(JSON.stringify(cutFile.sentences))
const dump = JSON.parse(readFileSync(path.join(OPS, `${course}.dump.json`), 'utf8'))
const cardById = new Map(dump.cards.map((d) => [d.id, d]))
const saF = path.join(OPS, `${course}.standalone.json`)
const sa = existsSync(saF) ? JSON.parse(readFileSync(saF, 'utf8')) : { course, tool: AGENT, pieces: [] }

/** Every known clip's voice, from Popty's own pod-scripts route (no hand-written database read). */
const bare = (id) => String(id || '').replace(/\.v\d+$/, '')
const voiceOf = new Map()
{
  const r = await fetch(`${POPTY}/api/pod-scripts/${course}?track=known`, { headers: { 'x-agent-id': AGENT } })
  if (!r.ok) { console.error(`pod-scripts ${course}: HTTP ${r.status}`); process.exit(1) }
  const j = await r.json()
  for (const s of j.scenes || []) for (const l of s.lines || []) {
    for (const a of [l.audio?.known, ...(l.audio?.known_splits || [])]) if (a?.id && a.voice_id) voiceOf.set(bare(a.id), a.voice_id)
  }
}
/** The words a standalone piece says: the piece as written, its trailing comma/semicolon/colon dropped
 *  (said on its own it ends; "Excuse me," would be read as running on). */
const sayText = (t) => String(t || '').trim().replace(/[,;:–—-]+$/u, '').trim()

// ---- the work list: tight scored pieces, then re-record pieces
const jobs = []
const REJECTED = argv.includes('--rejected')
for (const r of score.pieces) if (r.verdict === 'tight' && (!REJECTED || (r.ear && r.ear.mark !== 'accept'))) jobs.push({ kind: 'tight', row: r, card: r.id, line: r.line, chunk: r.chunk, known: r.known, voice: voiceOf.get(bare(r.knownClip)) || null, why: r.why })
for (const x of REJECTED ? [] : rr) {
  const d = cardById.get(x.card)
  const e = cutFile.sentences[x.card]
  const l = e?.lines?.[x.line]
  const ci = l ? l.chunks.findIndex((c) => c[0] === x.target && c[3] === x.known) : -1
  jobs.push({ kind: 're-record', row: x, card: x.card, line: x.line, chunk: ci >= 0 ? ci : null, known: x.known, voice: voiceOf.get(bare(e?.knownClip || d?.knownAudioId)) || null, why: x.why })
}
process.stderr.write(`${course}: ${jobs.filter((j) => j.kind === 'tight').length} tight + ${jobs.filter((j) => j.kind === 're-record').length} re-record pieces; ${REAL ? 'RENDERING' : 'dry run'}\n`)

async function ask(job) {
  const body = { courseCode: course, role: 'pod_fine_known', language: KNOWN_LANG, text: sayText(job.known), voiceId: job.voice, purpose: `Pod Drill standalone known piece (#707, r-2026-11-03): ${job.kind === 'tight' ? 'cut too tight' : 'cannot be cut'} — ${job.why}`.slice(0, 300), ...(APPROVAL ? { approval: APPROVAL } : {}), ...(REAL ? {} : { dryRun: true }) }
  const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) })
  let j = null; try { j = await r.json() } catch { j = { ok: false, error: `HTTP ${r.status}, no JSON` } }
  return { status: r.status, ...j, text: body.text, voiceId: body.voiceId }
}
/** Make-before-break: the clip comes back over the player's own proxy and decodes to sound. */
function verify(audioId) {
  const f = path.join(scratch, `${audioId}.mp3`)
  const got = spawnSync('curl', ['-sfL', '-o', f, `${AUDIO}/${audioId}`])
  if (got.status !== 0) return { ok: false, why: `could not fetch ${AUDIO}/${audioId}` }
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' })
  const dur = Number(p.stdout.trim())
  return dur > 0.15 ? { ok: true, durationMs: Math.round(dur * 1000) } : { ok: false, why: `decodes to ${dur || 0} s` }
}

const seen = new Map() // voice|text -> answer (the route is library-first anyway; this just saves calls)
const tally = {}
let chars = 0
for (const job of jobs) {
  if (!job.voice) { job.answer = { ok: false, code: 'NO_VOICE', error: 'the source take\'s voice is not known to pod-scripts' } } else {
    const k = `${job.voice}|${sayText(job.known).toLowerCase()}`
    job.answer = seen.get(k) || await ask(job)
    seen.set(k, job.answer)
  }
  const a = job.answer
  const t = a.ok ? (a.source || 'ok') : (a.code || `HTTP ${a.status}`)
  tally[t] = (tally[t] || 0) + 1
  if (a.ok && !a.dryRun && a.source === 'rendered') chars += a.charsSpent || 0
  if (!a.ok) process.stderr.write(`  refused ${job.card} "${job.known}": ${a.code || a.status} ${String(a.error || a.message || '').slice(0, 160)}\n`)
  else if (!REAL && a.wouldSpendChars) chars += a.wouldSpendChars
}
process.stderr.write(`${course}: ${JSON.stringify(tally)}; ${REAL ? 'spent' : 'would spend about'} ${chars} characters\n`)
if (!REAL) process.exit(0)

// ---- verify, then wire
const verified = new Map()
let wired = 0, unwired = 0, kept = 0
const changed = new Set()
// accepted by ear, standalone wired by an earlier run: back to the cut that was heard (header)
for (const r of score.pieces) {
  if (!r.ear || r.verdict !== 'clean') continue
  const e = cutFile.sentences[r.id]
  const c = e?.lines?.[r.line]?.chunks?.[r.chunk]
  if (!c || c.length < 7 || !c[6]) continue
  r.unwired = { at: new Date().toISOString(), audioId: c[6], why: `${r.ear.label} heard the cut as ${r.ear.mark}: the cut plays` }
  e.lines[r.line].chunks[r.chunk] = c.slice(0, 6)
  if (r.render) r.render.wired = false
  changed.add(r.id); kept++
}
for (const job of jobs) {
  const a = job.answer
  const rec = { at: new Date().toISOString(), text: a.text, voiceId: a.voiceId, ok: !!a.ok, source: a.source || null, audioId: a.audioId || null, code: a.ok ? null : (a.code || `HTTP ${a.status}`), error: a.ok ? null : String(a.error || a.message || '').slice(0, 300) }
  if (a.ok && a.audioId) {
    if (!verified.has(a.audioId)) verified.set(a.audioId, verify(a.audioId))
    const v = verified.get(a.audioId)
    rec.verified = v.ok; if (!v.ok) rec.error = v.why; else rec.durationMs = v.durationMs
  }
  const e = cutFile.sentences[job.card]
  const c = job.chunk != null ? e?.lines?.[job.line]?.chunks?.[job.chunk] : null
  if (rec.verified && c) {
    const nc = c.length >= 6 ? [...c.slice(0, 6)] : [...c.slice(0, 4), null, null]
    nc[6] = rec.audioId
    e.lines[job.line].chunks[job.chunk] = nc
    changed.add(job.card); rec.wired = true; wired++
  } else { rec.wired = false; if (rec.verified) rec.note = 'no cut chunk on this card: the player finds the clip by its known text in the line\'s voice' ; unwired++ }
  if (job.kind === 'tight') job.row.render = rec
  else {
    const key = `${job.card}|${job.line}|${job.known}`
    sa.pieces = sa.pieces.filter((p) => p.key !== key)
    sa.pieces.push({ key, card: job.card, line: job.line, target: job.row.target, known: job.known, why: job.why, render: rec })
  }
}
const guard = noShrink(prev, cutFile.sentences, changed)
if (!guard.ok) { console.error(`REFUSED: the cut file would lose or change something this run did not wire:\n${guard.problems.join('\n')}`); process.exit(2) }
writeFileSync(cutF, JSON.stringify(cutFile) + '\n')
writeFileSync(scoreF, JSON.stringify(score, null, 1) + '\n')
writeFileSync(saF, JSON.stringify(sa, null, 1) + '\n')
process.stderr.write(`${course}: wired ${wired} pieces; ${kept} accepted cuts given back their cut; ${changed.size} cards changed; ${unwired} not wired (see score.json / standalone.json)\n`)
