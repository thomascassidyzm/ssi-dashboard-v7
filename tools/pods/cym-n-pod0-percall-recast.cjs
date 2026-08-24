#!/usr/bin/env node
/**
 * cym_n_for_eng:pod-0 — PER-CONVERSATION two-voice recast (2026-08-23).
 *
 * Background: the #129 audit cast one voice per *named character across the
 * whole pod*, so wherever two of Aran's characters shared a scene he ended up
 * on both sides (45 adjacent-turn collisions under zero tolerance). Tom's
 * ruling: cast PER CONVERSATION, male/female every exchange, two voices only,
 * ZERO same-voice exchanges.
 *
 * `podCast` is keyed by canonical speaker name alone, so "Customer 1" cannot be
 * Aran in scene 7 and Catrin in scene 8. This tool therefore makes the reused
 * labels SCENE-UNIQUE (Cafe Customer 1 / Bar Customer 1 / Diner 1) and writes
 * one cast entry per scene-unique label. It touches `speaker` ONLY — never
 * target_text/known_text, never any *_audio_id. No TTS, no deletes.
 *
 * Edge definition (this is where we differ from #129, deliberately):
 *   buildTurnWeights() in tools/pod-voice-colour.cjs counts every pair of
 *   CONSECUTIVE speaker labels as an edge. In the cafe/bar/restaurant scenes
 *   the customers never address each other — they each address the staff — so
 *   a Customer 1 turn followed by a Customer 2 turn is not an exchange, it is
 *   two consecutive orders to a shared hub. Aran, who reads the lines, disputed
 *   the #129 count on exactly this ground and the line text bears him out
 *   (every customer line uses polite "chi" to the staff; no customer ever
 *   addresses another customer). Those pairs are listed in NON_EXCHANGE below,
 *   line by line, so the judgement is auditable rather than implicit.
 *
 * Usage:
 *   node tools/pods/cym-n-pod0-percall-recast.cjs            # dry run
 *   node tools/pods/cym-n-pod0-percall-recast.cjs --apply    # apply
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { buildTurnWeights, countAdjacentCollisions } = require('../pod-voice-colour.cjs')
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')
const { buildRecordingPlan } = require('../../services/voice-engine/pods-plan.cjs')
const { castVoiceFor, mergePodCast } = require('../../services/voice-engine/pods-cast.cjs')

const POD_ID = 'cym_n_for_eng:pod-0'
const COURSE = 'cym_n_for_eng'
const ARAN = { name: 'Aran', email: 'aran@hey.com', gender: 'm', voiceId: 'human_aran_cym_n' }
const CATRIN = { name: 'Catrin', email: 'catrinlliar@gmail.com', gender: 'f', voiceId: 'human_catrinlliar_cym_n' }

const APPLY = process.argv.includes('--apply')
const OUT_DIR = path.join(__dirname, '../../docs/pods')
const OUT = path.join(OUT_DIR, `cym-n-pod0-percall-recast-2026-08-23-${APPLY ? 'applied' : 'dryrun'}-log.json`)

// ---------------------------------------------------------------------------
// 1. Scene-unique relabelling. Only labels that are reused across scenes AND
//    need different voices in those scenes are split; everything else is left
//    exactly as it is, to keep the write as small as it can honestly be.
// ---------------------------------------------------------------------------
const RELABEL = {
  7: { 'Barista': 'Cafe Barista', 'Customer 1': 'Cafe Customer 1', 'Customer 2': 'Cafe Customer 2', 'Customer 3': 'Cafe Customer 3' },
  8: { 'Customer 1': 'Bar Customer 1', 'Customer 2': 'Bar Customer 2', 'Customer 3': 'Bar Customer 3' },
  9: { 'Customer 1': 'Diner 1', 'Customer 2': 'Diner 2' },
}

/** Post-relabel canonical name for a row. */
function sceneUniqueName(row) {
  const canon = canonicalSpeakerName(row.speaker)
  const map = RELABEL[row.scene_number]
  return (map && map[canon]) || canon
}

// ---------------------------------------------------------------------------
// 2. Non-exchange consecutive pairs — the adjudication of Aran's dispute.
//    Each entry is "scene:sentence -> scene:sentence" where two DIFFERENT
//    characters take consecutive turns but are not talking to each other:
//    both are addressing the staff member who runs the scene.
// ---------------------------------------------------------------------------
const NON_EXCHANGE = new Set([
  // Scene 7 (cafe) — Customer 1 finishes their order, Customer 2 starts theirs.
  '7:6->7:7',
  // Scene 8 (bar) — four customers ordering in turn from the bartender.
  '8:4->8:5', '8:5->8:6', '8:8->8:9', '8:9->8:10', '8:14->8:15',
  // Scene 9 (restaurant) — two diners ordering in turn from the waiter.
  // 9:4 answers the waiter's water question; 9:5 re-hails him ("Esgusodwch fi").
  '9:4->9:5', '9:9->9:10', '9:12->9:13', '9:16->9:17',
])

// ---------------------------------------------------------------------------
// 3. The proposed cast, by scene-unique label.
//    Derived by 2-colouring the exchange graph. The Narrator closes 16 of the
//    22 scenes and under zero tolerance is NOT exempt, so it is an edge with
//    each scene's last speaker; that constraint propagates through most of the
//    pod. Narrator=Aran is chosen over Narrator=Catrin because it is the branch
//    that keeps Anna female and James male.
// ---------------------------------------------------------------------------
const CAST = {
  // --- Aran (male) ---
  'Narrator': ARAN,
  '__explainer__': ARAN,
  'Neighbour': ARAN,          // scenes 1, 5 — opposite Sarah
  'Passenger': ARAN,          // scenes 2, 14 — opposite Sarah / Driver
  'Barista': ARAN,            // scene 3 only — opposite Sarah
  'Friend': ARAN,             // scenes 4, 22 — opposite Sarah / Learner
  'James': ARAN,              // scene 6
  'Cafe Customer 1': ARAN,    // scene 7 — hub is Cafe Barista (Catrin)
  'Cafe Customer 2': ARAN,
  'Cafe Customer 3': ARAN,
  'Bartender': ARAN,          // scene 8 hub
  'Waiter': ARAN,             // scene 9 hub
  'Assistant': ARAN,          // scene 10
  'Guest': ARAN,              // scene 11
  'Pharmacist': ARAN,         // scene 12
  'Local': ARAN,              // scene 13
  // --- Catrin (female) ---
  'Sarah': CATRIN,            // scenes 1-5
  'Anna': CATRIN,             // scene 6
  'Cafe Barista': CATRIN,     // scene 7 hub
  'Bar Customer 1': CATRIN,   // scene 8 — hub is Bartender (Aran)
  'Bar Customer 2': CATRIN,
  'Bar Customer 3': CATRIN,
  'Diner 1': CATRIN,          // scene 9 — hub is Waiter (Aran)
  'Diner 2': CATRIN,
  'Customer': CATRIN,         // scenes 10, 12 — opposite Assistant / Pharmacist
  'Receptionist': CATRIN,     // scene 11
  'Tourist': CATRIN,          // scene 13
  'Driver': CATRIN,           // scene 14
  'Learner': CATRIN,          // scenes 15-22
}

// ---------------------------------------------------------------------------

function sceneLists(rows, nameOf) {
  const m = new Map()
  for (const r of rows) {
    if (!m.has(r.scene_number)) m.set(r.scene_number, [])
    m.get(r.scene_number).push(nameOf(r))
  }
  return [...m.values()]
}

/** Turn weights restricted to genuine exchanges (drops the NON_EXCHANGE pairs). */
function buildExchangeWeights(rows, nameOf) {
  const w = new Map()
  const dropped = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i]
    if (prev.scene_number !== cur.scene_number) continue
    const a = nameOf(prev), b = nameOf(cur)
    if (!a || !b || a === b) continue
    const tag = `${prev.scene_number}:${prev.sentence_number}->${cur.scene_number}:${cur.sentence_number}`
    if (NON_EXCHANGE.has(tag)) { dropped.push({ tag, a, b }); continue }
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    w.set(key, (w.get(key) || 0) + 1)
  }
  return { weights: w, dropped }
}

/** Consecutive same-voice pairs by DIFFERENT characters, under a cast. */
function sameVoiceRuns(rows, nameOf, voiceOf) {
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i]
    if (prev.scene_number !== cur.scene_number) continue
    const a = nameOf(prev), b = nameOf(cur)
    if (a === b) continue
    if (voiceOf(a) && voiceOf(a) === voiceOf(b)) {
      out.push({
        tag: `${prev.scene_number}:${prev.sentence_number}->${cur.scene_number}:${cur.sentence_number}`,
        a, b, voice: voiceOf(a),
        exchange: !NON_EXCHANGE.has(`${prev.scene_number}:${prev.sentence_number}->${cur.scene_number}:${cur.sentence_number}`),
      })
    }
  }
  return out
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const pod = (await db.query(
    `select id, visibility from listening_pods where id = $1`, [POD_ID])).rows[0]
  if (!pod) throw new Error(`pod ${POD_ID} not found`)
  if (pod.visibility !== 'held') {
    throw new Error(`REFUSING: pod visibility is "${pod.visibility}", expected "held". ` +
      `Content-change migration protocol forbids editing a live pod in place.`)
  }

  const rows = (await db.query(
    `select id, pod_id, scene_number, sentence_number, global_order, speaker,
            target_text, known_text, glue_to_next,
            target_audio_id, known_audio_id
       from listening_pod_sentences where pod_id = $1
      order by scene_number, sentence_number`, [POD_ID])).rows

  const course = (await db.query(
    `select voice_config from courses where course_code = $1`, [COURSE])).rows[0]
  const oldCast = (course.voice_config && course.voice_config.podCast) || {}

  // --- Baseline: the #129 metric on today's labels and today's cast ----------
  const oldName = (r) => canonicalSpeakerName(r.speaker)
  const oldVoice = (n) => { const e = castVoiceFor(oldCast, n); return e && e.voiceId }
  const rawWeightsOld = buildTurnWeights(sceneLists(rows, oldName))
  const baseline = countAdjacentCollisions(rawWeightsOld, oldVoice)

  // --- Proposed: exchange metric on scene-unique labels ----------------------
  const newVoice = (n) => (CAST[n] || {}).voiceId || null
  const { weights: exWeights, dropped } = buildExchangeWeights(rows, sceneUniqueName)
  const proposedExchange = countAdjacentCollisions(exWeights, newVoice)
  const rawWeightsNew = buildTurnWeights(sceneLists(rows, sceneUniqueName))
  const proposedRaw = countAdjacentCollisions(rawWeightsNew, newVoice)
  const runs = sameVoiceRuns(rows, sceneUniqueName, newVoice)

  // Every scene-unique speaker must be cast.
  const uncast = [...new Set(rows.map(sceneUniqueName))].filter(n => !CAST[n])
  if (uncast.length) throw new Error(`uncast speakers: ${uncast.join(', ')}`)

  // --- Row-level relabel plan ------------------------------------------------
  const relabels = []
  for (const r of rows) {
    const to = sceneUniqueName(r)
    if (canonicalSpeakerName(r.speaker) !== to) {
      relabels.push({ id: r.id, scene: r.scene_number, sentence: r.sentence_number, from: r.speaker, to })
    }
  }

  // --- Lines that flip voice (these need re-recording in the other voice) ----
  const flips = rows.map(r => {
    const from = oldVoice(oldName(r)), to = newVoice(sceneUniqueName(r))
    return { id: r.id, scene: r.scene_number, sentence: r.sentence_number,
             speaker: r.speaker, newSpeaker: sceneUniqueName(r), from, to,
             hasTarget: !!r.target_audio_id, hasKnown: !!r.known_audio_id }
  }).filter(f => f.from !== f.to)
  const flippedWithTake = flips.filter(f => f.hasTarget)

  // --- Recording plan, before and after -------------------------------------
  const pods = [{ id: POD_ID, slug: 'pod-0', title: '', course_code: COURSE }]
  const planCount = (cast, sents, voiceId) => {
    const p = buildRecordingPlan({ pods, sentences: sents, podCast: cast, voiceId })
    return { ...p.counts, speakers: p.castSpeakers.sort(), isExplainer: p.isExplainer }
  }
  const newCastByLabel = Object.fromEntries(Object.entries(CAST).map(([k, v]) => [k, { ...v }]))
  // buildRecordingPlan reads rows' own speaker strings, so simulate post-relabel rows.
  const relabelledRows = rows.map(r => ({ ...r, speaker: sceneUniqueName(r) }))

  const report = {
    pod: POD_ID, course: COURSE, mode: APPLY ? 'applied' : 'dryrun',
    podVisibility: pod.visibility,
    rows: rows.length,
    baseline_129_metric: baseline,
    proposed_exchange_metric: proposedExchange,
    proposed_raw_label_adjacency_metric: proposedRaw,
    nonExchangePairsDropped: dropped,
    sameVoiceConsecutiveResidue: runs,
    relabelCount: relabels.length,
    relabels,
    voiceFlips: flips.length,
    voiceFlipsWithExistingTake: flippedWithTake.length,
    flippedLinesNeedingRerecord: flippedWithTake,
    queueBefore: {
      aran: planCount(oldCast, rows, ARAN.voiceId),
      catrin: planCount(oldCast, rows, CATRIN.voiceId),
    },
    queueAfter: {
      aran: planCount(newCastByLabel, relabelledRows, ARAN.voiceId),
      catrin: planCount(newCastByLabel, relabelledRows, CATRIN.voiceId),
    },
    oldCast, newCast: newCastByLabel,
  }

  if (APPLY) {
    await db.query('begin')
    try {
      for (const rl of relabels) {
        const res = await db.query(
          `update listening_pod_sentences set speaker = $1
            where id = $2 and speaker = $3 and pod_id = $4`,
          [rl.to, rl.id, rl.from, POD_ID])
        if (res.rowCount !== 1) {
          throw new Error(`before-state assertion failed on ${rl.id}: expected speaker "${rl.from}"`)
        }
      }
      // Only podCast is touched; voice_config.voices.* must survive byte-identical.
      const merged = mergePodCast(course.voice_config, newCastByLabel)
      // Drop cast keys that no longer name any speaker in this pod, so the cast
      // reads as the pod's cast rather than accumulating dead names.
      const live = new Set([...new Set(relabelledRows.map(r => canonicalSpeakerName(r.speaker))), '__explainer__'])
      for (const k of Object.keys(merged.podCast)) if (!live.has(k)) delete merged.podCast[k]

      const before = JSON.stringify(course.voice_config.voices || null)
      if (JSON.stringify(merged.voices || null) !== before) {
        throw new Error('voice_config.voices changed — aborting')
      }
      const res = await db.query(
        `update courses set voice_config = $1 where course_code = $2`,
        [merged, COURSE])
      if (res.rowCount !== 1) throw new Error('course update did not affect exactly 1 row')
      await db.query('commit')
      report.appliedCast = merged.podCast
    } catch (e) {
      await db.query('rollback')
      throw e
    }

    // Re-derive from live DB after the write.
    const after = (await db.query(
      `select id, pod_id, scene_number, sentence_number, global_order, speaker,
              target_text, known_text, glue_to_next, target_audio_id, known_audio_id
         from listening_pod_sentences where pod_id = $1
        order by scene_number, sentence_number`, [POD_ID])).rows
    const liveCast = (await db.query(
      `select voice_config->'podCast' as c from courses where course_code = $1`, [COURSE])).rows[0].c
    const liveVoice = (n) => { const e = castVoiceFor(liveCast, n); return e && e.voiceId }
    const liveName = (r) => canonicalSpeakerName(r.speaker)
    const { weights: liveEx } = buildExchangeWeights(after, liveName)
    report.verifiedLive = {
      exchangeCollisions: countAdjacentCollisions(liveEx, liveVoice),
      rawLabelCollisions: countAdjacentCollisions(buildTurnWeights(sceneLists(after, liveName)), liveVoice),
      sameVoiceConsecutiveResidue: sameVoiceRuns(after, liveName, liveVoice).length,
      queue: {
        aran: buildRecordingPlan({ pods, sentences: after, podCast: liveCast, voiceId: ARAN.voiceId }).counts,
        catrin: buildRecordingPlan({ pods, sentences: after, podCast: liveCast, voiceId: CATRIN.voiceId }).counts,
      },
      audioLinksIntact: after.filter(r => r.target_audio_id).length,
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, relabels: `${relabels.length} rows`, flippedLinesNeedingRerecord: `${flippedWithTake.length} rows`, oldCast: '…', newCast: '…' }, null, 2))
  console.log(`\nlog: ${OUT}`)
  await db.end()
}

main().catch(e => { console.error(e); process.exit(1) })
