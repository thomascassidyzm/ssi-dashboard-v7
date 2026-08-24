#!/usr/bin/env node
/**
 * pod1-two-voice-cast.cjs — apply Tom's TWO-VOICE ruling to the pod-1 cast map.
 *
 * THE RULING (Tom, 2026-08-24). Pod 1 standardises to TWO VOICES ONLY per course,
 * because the Welsh and community courses only have two voices and everything
 * should standardise to that pattern. The earlier recommendation — split
 * Interlocutor into Local/Waiter and invent a new Staff voice — is OVERRULED.
 * No third voice is created anywhere, by anything, ever.
 *
 * WHY THERE IS WORK TO DO. `reattribute-pod1-speakers.cjs` (2026-08-24) fixed a
 * two-year-old mis-attribution: 11 drill lines per course that only a shop, a
 * hotel or a waiter could say were labelled `Learner`. Four became `Staff` and
 * seven became `Interlocutor`. Those two names are in no course's
 * `listening_pods.speakers`, so `checkPodCast` correctly reported them uncast and
 * the gate verdict flipped PASS → FAIL on 20 of 22 courses, blocking
 * `unlink-off-cast-pod-clips.cjs` and therefore step 1 of `pod1-render-sweep.cjs`.
 * That tool refused to invent a voice, which was right; this one does the casting,
 * from voices the course already has.
 *
 * WHAT IT DOES, EXACTLY. For each live `<course>:pod-1`:
 *   1. Read the pod's existing cast. It already holds EXACTLY TWO target voices
 *      and two known voices — the two-voice standard is not new, it has been the
 *      shape since the 2026-08-23 per-call recast.
 *   2. Take the Learner's voice as voice A, and the pod's other existing voice as
 *      voice B — the "second voice" of the ruling. Nothing is chosen; both are
 *      read off the pod.
 *   3. Cast every speaker who appears in the script and has NO cast entry to
 *      voice B, on both tracks.
 *   4. Apply the fleet-standard partition to the two roles where spa/spa_mx drift
 *      from the other twenty (see FLEET_ALIGNMENT).
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not move the twenty-odd roles that
 * are already cast. A LITERAL reading of "every non-learner role goes to the
 * second voice" was simulated first and MEASURED: it puts scenes 1-14 — which are
 * two-hander dramas with no Learner in them at all (Anna↔James, Guest↔Receptionist,
 * Sarah↔Neighbour) — entirely onto one voice, producing 27 same-voice exchange
 * pairs per course and a character answering themselves for 11 turns at a stretch.
 * That breaks Tom's OTHER standing acceptance criterion for this very gate
 * ("ZERO same-voice exchange pairs, and EXACTLY TWO voices in the cast",
 * 2026-08-23). Two voices is already satisfied; what the ruling settles here is
 * that the NEW roles draw from the existing pair rather than from a new voice.
 * The fork is written up for Tom in docs/pods/pod1-two-voice-cast-2026-08-24.md.
 *
 * NO TTS. NO RENDERING. NO AUDIO PASS QUEUED. This writes one jsonb column on
 * `listening_pods`. It renders nothing, deletes nothing, relinks nothing and
 * nulls no audio link. The re-render implication is REPORTED (see the log's
 * `reRenderScope`) and is Tom's decision, not this tool's.
 *
 * PROGRESS SAFETY. `learner_pod_state` is keyed by `sentence_id`; the migration
 * protocol (docs/pods/pod-migration-protocol.md) matches survivors on KNOWN TEXT.
 * This tool touches neither — no sentence row is read for writing, no text moves,
 * no slot moves. The protocol does not apply. Asserted, not assumed: the tool
 * writes only `listening_pods.speakers`.
 *
 * SAFETY.
 *   - DRY RUN BY DEFAULT. Pass --apply to write.
 *   - Per-pod before-state assertion inside the UPDATE predicate (the stored
 *     `speakers` must still be byte-identical to what was read); drift aborts.
 *   - Refuses any pod whose existing cast does not resolve to exactly two target
 *     voices, or that has no `Learner` entry — rather than guessing which voice
 *     is the second one.
 *   - Refuses to introduce a voice the pod does not already have. Asserted after
 *     the map is built, before any write.
 *   - Writes a full before/after snapshot log, so every change is reversible.
 *
 * Usage:
 *   node tools/pods/pod1-two-voice-cast.cjs                    # DRY RUN, all 22
 *   node tools/pods/pod1-two-voice-cast.cjs --course=ita_for_eng
 *   node tools/pods/pod1-two-voice-cast.cjs --apply
 *   node tools/pods/pod1-two-voice-cast.cjs --verify           # gate only, no write
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { checkPodCast, loadPodForCastCheck } = require('./pod-cast-gate.cjs')
const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')

const REPO = path.join(__dirname, '..', '..')
const OUT_DIR = path.join(REPO, 'docs', 'pods')
const STAMP = '2026-08-24'

const ARGS = process.argv.slice(2)
const APPLY = ARGS.includes('--apply')
const VERIFY = ARGS.includes('--verify')
const COURSE = (ARGS.find(a => a.startsWith('--course=')) || '').slice('--course='.length) || null

const LEARNER = 'Learner'
const bare = (v) => String(v || '').replace(/^(xai_|azure_)/, '')

/**
 * The two roles where spa_for_eng and spa_mx_for_eng drift from the other twenty
 * courses, and the ONLY reason those two pods failed the gate before the
 * reattribution landed.
 *
 * Measured 2026-08-24: in 20 of 22 courses `Bar Customer 2` and `Diner 2` sit on
 * the LEARNER's voice, which is what makes their exchanges with the Bartender and
 * the Waiter alternate. In spa and spa_mx alone they sit on the second voice, so
 * `Bar Customer 2↔Bartender` and `Diner 2↔Waiter` are a character talking to
 * themselves for four turns. Aligning them to the fleet is the standardisation
 * Tom asked for, and it needs no new voice — it moves two roles onto a voice the
 * pod already has.
 *
 * Keyed by role → which of the pod's own two voices it belongs on.
 */
const FLEET_ALIGNMENT = { 'Bar Customer 2': 'learner', 'Diner 2': 'learner' }

/**
 * Build the post-ruling cast for one pod.
 *
 * Pure — rows + existing cast in, new cast + an audit trail out — so the decision
 * is testable without a database and the log can say exactly why each name moved.
 *
 * @returns {{cast:object, changes:Array, voiceA:string, voiceB:string, refusal:string|null}}
 */
function buildTwoVoiceCast ({ rows, speakers }) {
  const cast = speakers || {}
  const inScript = [...new Set((rows || []).map(r => canonicalSpeakerName(r.speaker)).filter(Boolean))]

  // The pod's own voices, per track, with a representative entry object for each
  // so the new entries carry the same name/provider metadata as the old ones.
  const exemplar = (side) => {
    const m = {}
    for (const entry of Object.values(cast)) {
      const id = entry && entry[side] && entry[side].voice_id
      if (id && !m[bare(id)]) m[bare(id)] = entry[side]
    }
    return m
  }
  const exT = exemplar('target'), exK = exemplar('known')

  const learner = cast[LEARNER]
  if (!learner || !learner.target || !learner.target.voice_id) {
    return { refusal: `no ${LEARNER} entry in the cast — cannot tell which voice is the second one`, changes: [] }
  }
  const aT = bare(learner.target.voice_id)
  const aK = bare(learner.known && learner.known.voice_id)
  const bT = Object.keys(exT).find(v => v !== aT)
  const bK = Object.keys(exK).find(v => v !== aK)
  if (Object.keys(exT).length !== 2 || !bT) {
    return { refusal: `cast holds ${Object.keys(exT).length} target voice(s) [${Object.keys(exT)}], not 2 — refusing to guess the second voice`, changes: [] }
  }

  const next = JSON.parse(JSON.stringify(cast))
  const changes = []
  const put = (name, which, why) => {
    const before = next[name]
      ? { target: bare(next[name].target && next[name].target.voice_id), known: bare(next[name].known && next[name].known.voice_id) }
      : null
    next[name] = {
      ...(next[name] || {}),
      target: which === 'learner' ? exT[aT] : exT[bT],
      known: which === 'learner' ? exK[aK] : exK[bK],
    }
    const after = { target: bare(next[name].target.voice_id), known: bare(next[name].known.voice_id) }
    if (!before || before.target !== after.target || before.known !== after.known) {
      changes.push({ speaker: name, before, after, why })
    }
  }

  // (1) The ruling: every speaker in the script with no cast entry — Staff,
  //     Interlocutor, and anything else the reattribution or a script edit
  //     introduced — goes to the pod's SECOND voice, the one the Learner is not on.
  for (const name of inScript) {
    if (cast[name]) continue
    put(name, 'second', 'uncast non-learner role → the pod\'s existing second voice (two-voice ruling)')
  }

  // (2) Fleet alignment: the two roles where spa/spa_mx drift from the other 20.
  for (const [name, which] of Object.entries(FLEET_ALIGNMENT)) {
    if (!next[name] || !inScript.includes(name)) continue
    const now = bare(next[name].target.voice_id)
    const want = which === 'learner' ? aT : bT
    if (now === want) continue
    put(name, which, 'aligned to the fleet-standard partition used by the other 20 courses')
  }

  return { cast: next, changes, voiceA: aT, voiceB: bT, voiceAKnown: aK, voiceBKnown: bK, refusal: null }
}

/**
 * How many already-rendered clips would need re-rendering if Tom approves the
 * new mapping — the SCOPE, reported and never acted on.
 *
 * A clip is counted when the voice it was actually rendered in is not the voice
 * its speaker now casts to. Note that `checkPodCast` will NOT catch these: its
 * clip check judges membership of the pod's voice SET, and both voices remain in
 * the set, so a role that swaps sides leaves clips that are on-cast and
 * mis-voiced. That is precisely why this number has to be computed here.
 */
function reRenderScope ({ rows, cast, clips }) {
  const per = new Map()
  const bump = (name, k) => {
    if (!per.has(name)) per.set(name, { speaker: name, turns: 0, targetWhole: 0, knownWhole: 0, targetSplit: 0, knownSplit: 0 })
    per.get(name)[k]++
  }
  for (const row of rows || []) {
    const name = canonicalSpeakerName(row.speaker)
    const e = cast[name] || cast._default
    if (!e) continue
    const vT = bare(e.target && e.target.voice_id), vK = bare(e.known && e.known.voice_id)
    let touched = false
    const judge = (id, want, k) => {
      if (!id || !clips[id] || !want) return
      if (bare(clips[id].voice_id) !== want) { bump(name, k); touched = true }
    }
    judge(row.target_audio_id, vT, 'targetWhole')
    judge(row.known_audio_id, vK, 'knownWhole')
    for (const id of (row.sentence_audio_ids || [])) judge(id, vT, 'targetSplit')
    for (const id of (row.sentence_known_audio_ids || [])) judge(id, vK, 'knownSplit')
    if (touched) bump(name, 'turns')
  }
  const byRole = [...per.values()].sort((a, b) => b.turns - a.turns)
  const total = byRole.reduce((acc, r) => ({
    turns: acc.turns + r.turns,
    targetWhole: acc.targetWhole + r.targetWhole,
    knownWhole: acc.knownWhole + r.knownWhole,
    targetSplit: acc.targetSplit + r.targetSplit,
    knownSplit: acc.knownSplit + r.knownSplit,
  }), { turns: 0, targetWhole: 0, knownWhole: 0, targetSplit: 0, knownSplit: 0 })
  return { byRole, total }
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const pods = (await db.query(
    `select id, course_code, speakers from listening_pods
      where id like '%:pod-1' and visibility = 'live'
        ${COURSE ? 'and course_code = $1' : ''}
      order by course_code`, COURSE ? [COURSE] : [])).rows

  const reports = []
  for (const pod of pods) {
    const loaded = await loadPodForCastCheck(db, pod.id)
    const before = checkPodCast({ ...loaded })
    const built = buildTwoVoiceCast({ rows: loaded.rows, speakers: loaded.speakers })

    if (built.refusal) {
      reports.push({ pod: pod.id, course: pod.course_code, refused: built.refusal, beforeOk: before.ok })
      console.log(`REFUSED ${pod.course_code}: ${built.refusal}`)
      continue
    }

    // No voice may be introduced that the pod did not already have.
    const had = new Set(Object.values(loaded.speakers || {}).flatMap(e =>
      ['target', 'known'].map(s => e && e[s] && e[s].voice_id).filter(Boolean).map(bare)))
    const now = new Set(Object.values(built.cast).flatMap(e =>
      ['target', 'known'].map(s => e && e[s] && e[s].voice_id).filter(Boolean).map(bare)))
    const invented = [...now].filter(v => !had.has(v))
    if (invented.length) throw new Error(`${pod.id}: would introduce new voice(s) ${invented.join(', ')} — refusing`)

    const after = checkPodCast({ rows: loaded.rows, speakers: built.cast, clips: loaded.clips, course: pod.course_code })
    const afterKnown = checkPodCast({ rows: loaded.rows, speakers: built.cast, clips: loaded.clips, track: 'known', course: pod.course_code })
    const scope = reRenderScope({ rows: loaded.rows, cast: built.cast, clips: loaded.clips })

    let written = false
    if (APPLY && !VERIFY && built.changes.length) {
      const res = await db.query(
        // The before-state assertion compares JSONB to JSONB, not text to text:
        // jsonb reserialises with sorted keys and its own spacing, so `::text`
        // never matches a JSON.stringify of the same object and aborts every run.
        `update listening_pods set speakers = $2 where id = $1 and speakers = $3::jsonb`,
        [pod.id, JSON.stringify(built.cast), JSON.stringify(loaded.speakers)])
      if (res.rowCount !== 1) throw new Error(`${pod.id}: before-state drift — cast changed under us, aborting`)
      written = true
    }

    reports.push({
      pod: pod.id,
      course: pod.course_code,
      voiceA_learner: built.voiceA,
      voiceB_second: built.voiceB,
      voiceA_learner_known: built.voiceAKnown,
      voiceB_second_known: built.voiceBKnown,
      beforeOk: before.ok,
      beforeFailures: before.failures,
      afterOk: after.ok,
      afterFailures: after.failures,
      afterVoicesInUse: after.voicesInUse,
      afterKnownOk: afterKnown.ok,
      afterKnownFailures: afterKnown.failures,
      changes: built.changes,
      castBefore: loaded.speakers,
      castAfter: built.cast,
      reRenderScope: scope,
      written,
    })

    console.log(`${pod.course_code.padEnd(18)} A(learner)=${built.voiceA}  B(second)=${built.voiceB}  ` +
      `changes=${built.changes.length}  gate ${before.ok ? 'PASS' : 'FAIL'} → ${after.ok ? 'PASS' : 'FAIL'}  ` +
      `re-render turns=${scope.total.turns}${written ? '  [WRITTEN]' : ''}`)
    if (!after.ok) for (const f of after.failures) console.log(`   still failing: ${f}`)
  }

  await db.end()

  const suffix = VERIFY ? 'verify' : (APPLY ? 'applied' : 'dryrun')
  const out = path.join(OUT_DIR, `pod1-two-voice-cast-${STAMP}-${suffix}-log.json`)
  fs.writeFileSync(out, JSON.stringify(reports, null, 2))
  console.log(`\n${suffix.toUpperCase()}: ${reports.length} pod(s). Log: ${path.relative(REPO, out)}`)
  console.log(`Gate after: ${reports.filter(r => r.afterOk).length}/${reports.length} PASS`)
  if (!APPLY && !VERIFY) console.log('DRY RUN — nothing written. Re-run with --apply.')
}

module.exports = { buildTwoVoiceCast, reRenderScope, FLEET_ALIGNMENT }

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
