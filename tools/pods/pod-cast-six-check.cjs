#!/usr/bin/env node
/**
 * pod-cast-six-check.cjs — the estate-wide casting audit template (2026-08-24).
 *
 * Runs checks C1-C5 from docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md
 * §"The template check, for the other 20 courses" against any pod-1's
 * `listening_pods` + `listening_pod_sentences` rows. C6 (gender agreement) is a
 * documented stub — it needs a per-language gendered-adjective word list Tom
 * hasn't supplied yet, so it is NOT implemented here; see checkC6Stub() below.
 *
 *   C1 Voice inventory      — exactly 2 target voices + 2 known voices; known
 *                             pair is the clone (xai Tom-style) + Olivia.
 *   C2 Resolution           — every speaker string resolves to a cast entry
 *                             via its canonical name or a `variants[]` alias.
 *   C3 Speaker-stability    — each canonical character never uses more than
 *                             one (target,known) voice pair across the pod.
 *   C4 Scene cast size      — per scene, >2 dialogue characters (Narrator's
 *                             drill line excluded) is flagged.
 *   C5 Adjacent hand-offs   — consecutive same-scene lines with a different
 *                             character but the identical target voice;
 *                             reports the count AND the brute-forced optimal
 *                             two-colouring minimum per scene (exhaustive,
 *                             same objective as exactColourTwoVoices in
 *                             tools/pod-voice-colour.cjs / twoColour() in
 *                             tools/pods/pod1-percall-recast.cjs).
 *
 * READ-ONLY. This is an audit tool: it never writes to the database.
 *
 * Usage:
 *   node tools/pods/pod-cast-six-check.cjs --course=spa_for_eng
 *   node tools/pods/pod-cast-six-check.cjs --all
 *   node tools/pods/pod-cast-six-check.cjs --all --json
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { Client } = require('pg')
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const ALL = process.argv.includes('--all')
const JSON_OUT = process.argv.includes('--json')
const COURSE = arg('course', null)

// Reference cast: known-side clone + Olivia, both xai, voice ids as stored.
const KNOWN_CLONE_VOICE_ID = 'gfzdpspr5fdp' // Tom (clone)
const KNOWN_OLIVIA_VOICE_ID = 'bedd6226'
const norm = (v) => String(v || '').replace(/^(xai_|azure_)/, '')

// ---------------------------------------------------------------------------
// Speaker resolution
// ---------------------------------------------------------------------------

/** Resolve a raw speaker string to its cast entry, via canonical name or a variants[] alias. */
function resolveSpeaker (raw, speakers) {
  const cast = speakers || {}
  const canon = canonicalSpeakerName(raw)
  if (cast[canon]) return { canon, entry: cast[canon] }
  for (const [key, entry] of Object.entries(cast)) {
    if (Array.isArray(entry.variants) && entry.variants.includes(raw)) return { canon: key, entry }
  }
  return null
}

const voicePairKey = (entry) =>
  `${norm(entry?.target?.voice_id)}|${norm(entry?.known?.voice_id)}`

// ---------------------------------------------------------------------------
// C1 — voice inventory
// ---------------------------------------------------------------------------

function checkC1 (speakers) {
  const cast = speakers || {}
  const targetVoices = new Set()
  const knownVoices = new Set()
  for (const entry of Object.values(cast)) {
    if (entry.target?.voice_id) targetVoices.add(norm(entry.target.voice_id))
    if (entry.known?.voice_id) knownVoices.add(norm(entry.known.voice_id))
  }
  const knownPairOk = knownVoices.size === 2 &&
    knownVoices.has(KNOWN_CLONE_VOICE_ID) && knownVoices.has(KNOWN_OLIVIA_VOICE_ID)
  const pass = targetVoices.size === 2 && knownVoices.size === 2 && knownPairOk
  return {
    pass,
    targetVoices: [...targetVoices].sort(),
    knownVoices: [...knownVoices].sort(),
    knownPairOk,
  }
}

// ---------------------------------------------------------------------------
// C2 — resolution
// ---------------------------------------------------------------------------

function checkC2 (rows, speakers) {
  const blanks = []
  const unresolved = []
  for (const r of rows) {
    if (!r.speaker || !String(r.speaker).trim()) { blanks.push(r); continue }
    if (!resolveSpeaker(r.speaker, speakers)) unresolved.push(r.speaker)
  }
  return {
    pass: blanks.length === 0 && unresolved.length === 0,
    blankCount: blanks.length,
    unresolved: [...new Set(unresolved)],
  }
}

// ---------------------------------------------------------------------------
// C3 — speaker-stability
// ---------------------------------------------------------------------------

function checkC3 (rows, speakers) {
  const pairsByCanon = new Map() // canonicalSpeakerName -> Set(voicePairKey)
  for (const r of rows) {
    if (!r.speaker) continue
    const resolved = resolveSpeaker(r.speaker, speakers)
    if (!resolved) continue
    const canon = canonicalSpeakerName(r.speaker)
    if (!pairsByCanon.has(canon)) pairsByCanon.set(canon, new Set())
    pairsByCanon.get(canon).add(voicePairKey(resolved.entry))
  }
  const unstable = [...pairsByCanon.entries()]
    .filter(([, pairs]) => pairs.size > 1)
    .map(([canon, pairs]) => ({ canon, voicePairs: [...pairs] }))
  return { pass: unstable.length === 0, unstable }
}

// ---------------------------------------------------------------------------
// C4 — scene cast size
// ---------------------------------------------------------------------------

function checkC4 (rows) {
  const byScene = new Map()
  for (const r of rows) {
    if (!r.speaker) continue
    const canon = canonicalSpeakerName(r.speaker)
    if (canon === 'Narrator') continue
    if (!byScene.has(r.scene_number)) byScene.set(r.scene_number, new Set())
    byScene.get(r.scene_number).add(canon)
  }
  const scenes = [...byScene.entries()]
    .map(([scene, chars]) => ({ scene, characterCount: chars.size, characters: [...chars].sort() }))
    .sort((a, b) => a.scene - b.scene)
  const flagged = scenes.filter((s) => s.characterCount > 2)
  return { pass: flagged.length === 0, scenes, flagged }
}

// ---------------------------------------------------------------------------
// C5 — adjacent hand-offs (current count + brute-forced optimal per scene)
// ---------------------------------------------------------------------------

const MAX_BRUTE_FORCE_NODES = 20

/** Exhaustive min-cost 2-colouring: minimum weight left "inside" any 2-partition. */
function bruteForceMinCollisions (nodes, weights) {
  const n = nodes.length
  if (n < 2) return 0
  if (n > MAX_BRUTE_FORCE_NODES) return null // too large — not expected in practice
  const idx = new Map(nodes.map((x, i) => [x, i]))
  const pairs = []
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    if (idx.has(a) && idx.has(b)) pairs.push([idx.get(a), idx.get(b), count])
  }
  let best = Infinity
  const limit = 1 << (n - 1) // fix node 0 to side 0 — symmetry halves the space
  for (let m = 0; m < limit; m++) {
    const mask = m << 1
    let cost = 0
    for (const [i, j, c] of pairs) {
      if (((mask >> i) & 1) === ((mask >> j) & 1)) cost += c
    }
    if (cost < best) best = cost
  }
  return best
}

function checkC5 (rows, speakers) {
  const sorted = [...rows].sort((a, b) =>
    (a.global_order - b.global_order) || (a.scene_number - b.scene_number) || (a.sentence_number - b.sentence_number))

  const byScene = new Map() // scene -> { nodes:Set, weights:Map, currentCollisions:number, handoffs:[] }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.scene_number !== cur.scene_number) continue
    if (!prev.speaker || !cur.speaker) continue
    const a = canonicalSpeakerName(prev.speaker)
    const b = canonicalSpeakerName(cur.speaker)
    if (!a || !b || a === b) continue
    // Narrator is a one-line numbers/colours drill, not dialogue (audit §3) —
    // C4 already excludes it from scene cast size; C5 must exclude it from
    // the hand-off graph for the same reason, or a scene-ending Narrator line
    // registers as a same-voice "hand-off" with whichever character spoke
    // last, which is not a conversational collision.
    if (a === 'Narrator' || b === 'Narrator') continue

    if (!byScene.has(cur.scene_number)) {
      byScene.set(cur.scene_number, { nodes: new Set(), weights: new Map(), handoffs: [] })
    }
    const s = byScene.get(cur.scene_number)
    s.nodes.add(a); s.nodes.add(b)
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    s.weights.set(key, (s.weights.get(key) || 0) + 1)

    const rA = resolveSpeaker(prev.speaker, speakers)
    const rB = resolveSpeaker(cur.speaker, speakers)
    const vA = rA && norm(rA.entry.target?.voice_id)
    const vB = rB && norm(rB.entry.target?.voice_id)
    if (vA && vB && vA === vB) {
      s.handoffs.push({ globalOrder: cur.global_order, from: a, to: b, voice: vA })
    }
  }

  const scenes = [...byScene.entries()].map(([scene, s]) => {
    const nodes = [...s.nodes]
    const optimal = bruteForceMinCollisions(nodes, s.weights)
    return {
      scene,
      current: s.handoffs.length,
      optimal,
      avoidable: optimal === null ? null : s.handoffs.length - optimal,
      handoffs: s.handoffs,
    }
  }).sort((a, b) => a.scene - b.scene)

  const totalCurrent = scenes.reduce((sum, s) => sum + s.current, 0)
  const totalOptimal = scenes.reduce((sum, s) => sum + (s.optimal ?? s.current), 0)
  return {
    pass: totalCurrent === 0,
    totalCurrent,
    totalOptimal,
    scenes: scenes.filter((s) => s.current > 0 || (s.optimal ?? 0) > 0),
  }
}

// ---------------------------------------------------------------------------
// C6 — stub, documented not implemented (needs per-language gendered-adjective lists)
// ---------------------------------------------------------------------------

function checkC6Stub () {
  return { pass: null, implemented: false, note: 'C6 needs a per-language gendered-adjective word list — not supplied; skipped by design' }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function auditPod (db, courseCode, podId) {
  const pod = (await db.query('select id, speakers from listening_pods where id = $1', [podId])).rows[0]
  if (!pod) return { courseCode, podId, error: 'pod not found' }
  const rows = (await db.query(
    `select scene_number, sentence_number, global_order, speaker
       from listening_pod_sentences where pod_id = $1
      order by global_order, scene_number, sentence_number`, [podId])).rows

  const c1 = checkC1(pod.speakers)
  const c2 = checkC2(rows, pod.speakers)
  const c3 = checkC3(rows, pod.speakers)
  const c4 = checkC4(rows)
  const c5 = checkC5(rows, pod.speakers)
  const c6 = checkC6Stub()

  return { courseCode, podId, rowCount: rows.length, c1, c2, c3, c4, c5, c6 }
}

function summaryLine (result) {
  if (result.error) return `${result.courseCode.padEnd(16)} ERROR: ${result.error}`
  const f = (label, r) => `${label}=${r.pass === false ? 'FAIL' : r.pass === null ? 'SKIP' : 'PASS'}`
  const c5 = result.c5
  const c5Note = c5.totalCurrent === 0 ? '0' : `${c5.totalCurrent}→${c5.totalOptimal}`
  return `${result.courseCode.padEnd(16)} ${f('C1', result.c1)} ${f('C2', result.c2)} ${f('C3', result.c3)} ${f('C4', result.c4)} C5=${c5Note}`
}

async function main () {
  if (!ALL && !COURSE) {
    console.error('Usage: node tools/pods/pod-cast-six-check.cjs --course=<code> | --all [--json]')
    process.exit(1)
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    let pods
    if (ALL) {
      pods = (await db.query(
        `select course_code, id from listening_pods where slug = 'pod-1' and visibility = 'live' order by course_code`
      )).rows
    } else {
      const row = (await db.query(
        `select course_code, id from listening_pods where course_code = $1 and slug = 'pod-1' and visibility = 'live'`,
        [COURSE]
      )).rows[0]
      if (!row) { console.error(`no live pod-1 found for course ${COURSE}`); process.exit(1) }
      pods = [row]
    }

    const results = []
    for (const p of pods) {
      results.push(await auditPod(db, p.course_code, p.id))
    }

    if (JSON_OUT) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      for (const r of results) console.log(summaryLine(r))
    }
  } finally {
    await db.end()
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1) })
}

module.exports = { checkC1, checkC2, checkC3, checkC4, checkC5, checkC6Stub, resolveSpeaker, bruteForceMinCollisions }
