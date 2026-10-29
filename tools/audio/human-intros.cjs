#!/usr/bin/env node
/**
 * HUMAN-SPLICED LEGO INTROS — the one command that counts and builds them (Aran 2026-10-27, job #210).
 * The courses, voice and words are voicing-policy humanSplicedIntros (cym_nv2_for_eng, cym_sv2_for_eng → human_aran_eng);
 * the rule is services/shared/human-intro-splice.cjs, the same module the render route builds with, so this census and
 * the route can never disagree about what is ready.
 *
 *   node tools/audio/human-intros.cjs                       census: every new LEGO with no intro — ready, or waiting on what
 *   node tools/audio/human-intros.cjs --list waiting        …plus one line per LEGO (ready | waiting | all)
 *   node tools/audio/human-intros.cjs --build [--limit N] [--lego S0001L01] [--course C]
 *                                                           DRY RUN through POST /api/audio/render for every ready LEGO
 *   node tools/audio/human-intros.cjs --build --apply …     the same, for real: splices, stores, fills presentation_audio_id
 *
 * Re-run it whenever takes land: a LEGO becomes ready the moment its English take, the two intro pieces and its Welsh
 * take all exist; an intro already linked is never touched (the route fills empty slots only). Reads by key through
 * services/shared/agent-db.cjs; writes nothing itself — every intro is made by the one audio route, which renders nothing
 * for these courses (a missing piece is INTRO_WAITING, never a TTS fallback). Env: POPTY_URL, AGENT_ID.
 *
 * SPLICE OFF (Aran 2026-10-29, job #587): with `splice: false` (the config now) intros are his whole-sentence takes from
 * the Introductions card, filed and linked by the booth take route itself — this census's piece counts then describe a
 * splice that is not going to run, and --build answers INTRO_WAITING (kind 'sentence') for every LEGO without a take.
 */
'use strict'
const db = require('../../services/shared/agent-db.cjs')
const hi = require('../../services/shared/human-intro-splice.cjs')
const { normalizeForAudio, audioKeyCandidates } = require('../../services/shared/text-normalize.cjs')
const { voiceSpellings } = require('../../services/shared/clip-identity-lookup.cjs')
const config = require('../../services/shared/voicing-policy.config.json')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const has = (f) => argv.includes(f)

/** Pure: one LEGO's state. `takes` key → clip; `clips` id → target clip; `queued` set of normalised English already queued. */
function classify(cfg, lego, { takes, clips, queued }) {
  const { waitingOn } = hi.resolvePieces(cfg, lego, { takes, targetClip: clips.get(String(lego.target1_audio_id)) || null })
  const xQueued = waitingOn.some((w) => w.kind === 'x') && audioKeyCandidates(normalizeForAudio(lego.known_text || '')).some((k) => queued.has(k))
  return { legoId: lego.lego_id, text: hi.humanIntroText(cfg, lego), ready: waitingOn.length === 0, waitingOn, xQueued }
}

/** Pure: the census totals. */
function summarise(courseCode, rows) {
  const by = { fragment: 0, x: 0, joiner: 0, target: 0 }
  let ready = 0, onlyFixed = 0, xQueued = 0, xNotQueued = 0
  for (const r of rows) {
    if (r.ready) { ready++; continue }
    for (const w of r.waitingOn) by[w.kind] = (by[w.kind] || 0) + 1
    if (r.waitingOn.every((w) => w.kind === 'fragment' || w.kind === 'joiner')) onlyFixed++
    if (r.waitingOn.some((w) => w.kind === 'x')) { if (r.xQueued) xQueued++; else xNotQueued++ }
  }
  return { courseCode, missingIntros: rows.length, readyNow: ready, waiting: rows.length - ready,
    waitingOnlyOnTheTwoIntroPieces: onlyFixed, waitingOnPiece: by,
    englishTakeMissing: { inHisQueueAlready: xQueued, notInAnyQueue: xNotQueued } }
}

async function census(pg, courseCodes) {
  const out = []
  for (const courseCode of courseCodes) {
    const cfg = hi.humanIntroConfig(courseCode)
    const { rows: legos } = await pg.query(
      `SELECT lego_id, seed_number, lego_index, status, known_text, target_text, target1_audio_id::text AS target1_audio_id, presentation_audio_id
         FROM course_legos WHERE course_code = $1 AND is_new AND presentation_audio_id IS NULL ORDER BY seed_number, lego_index`, [courseCode])
    const { rows: takeRows } = await pg.query(
      `SELECT id::text AS id, text, text_normalized, s3_key FROM course_audio
        WHERE language = 'eng' AND voice_id = ANY($1::text[]) AND role <> 'presentation' ORDER BY created_at DESC`, [voiceSpellings(cfg.voiceId)])
    const takes = new Map()
    for (const t of takeRows) if (!takes.has(t.text_normalized) && t.s3_key && !t.s3_key.startsWith('pending/')) takes.set(t.text_normalized, t)
    const clips = await db.clipMap(pg, legos.map((l) => l.target1_audio_id))
    // English this voice is already asked for: the known side of these courses' seeds and practice phrases.
    const queued = new Set()
    for (const table of ['course_seeds', 'course_practice_phrases']) {
      const { rows } = await pg.query(`SELECT DISTINCT known_text FROM ${table} WHERE course_code = ANY($1::text[])`, [courseCodes])
      for (const r of rows) for (const k of audioKeyCandidates(normalizeForAudio(r.known_text || ''))) queued.add(k)
    }
    const rows = legos.map((l) => classify(cfg, l, { takes, clips, queued }))
    out.push({ summary: summarise(courseCode, rows), rows })
  }
  return out
}

async function build(courseCode, row, { apply, base, agent }) {
  const res = await fetch(`${base}/api/audio/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': agent },
    body: JSON.stringify({ courseCode, role: 'presentation', legoId: row.legoId, text: row.text, dryRun: !apply,
      purpose: `human-spliced LEGO intro in ${hi.humanIntroConfig(courseCode).voiceId}'s voice (Aran 2026-10-27, job #210)`, job: '#210' }),
  })
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
}

async function main() {
  const courseCodes = opt('--course') ? [opt('--course')] : Object.keys(config.humanSplicedIntros || {})
  for (const c of courseCodes) if (!hi.humanIntroConfig(c)) throw new Error(`${c} has no humanSplicedIntros rule`)
  const pg = await db.connect()
  let result
  try { result = await census(pg, courseCodes) } finally { await pg.end() }
  const list = opt('--list')
  for (const { summary, rows } of result) {
    if (!hi.humanIntroConfig(summary.courseCode).splice) console.log(`${summary.courseCode}: splice OFF — intros come from the whole-sentence Introductions card (job #587); the piece counts below are for the retired splice.`)
    console.log(JSON.stringify(summary, null, 1))
    if (list) for (const r of rows) if (list === 'all' || (list === 'ready') === r.ready) {
      console.log(`${summary.courseCode} ${r.legoId} ${r.ready ? 'READY' : 'waits on ' + r.waitingOn.map((w) => `${w.kind} "${w.text}"`).join(', ')}`)
    }
  }
  if (!has('--build')) return
  const apply = has('--apply'), limit = Number(opt('--limit', Infinity)), only = opt('--lego')
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, ''), agent = process.env.AGENT_ID || 'human-intros'
  const tally = {}
  let n = 0
  for (const { summary, rows } of result) {
    for (const r of rows) {
      if (only ? r.legoId !== only : !r.ready) continue
      if (n++ >= limit) break
      const out = await build(summary.courseCode, r, { apply, base, agent })
      const k = out.ok ? out.source : (out.code || 'error')
      tally[k] = (tally[k] || 0) + 1
      console.log(`${summary.courseCode} ${r.legoId} ${k}${out.audioId ? ' ' + out.audioId : ''}${out.ok ? '' : ' — ' + out.error}`)
    }
  }
  console.log(JSON.stringify({ build: apply ? 'applied' : 'dry run', tally }))
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
module.exports = { classify, summarise }
