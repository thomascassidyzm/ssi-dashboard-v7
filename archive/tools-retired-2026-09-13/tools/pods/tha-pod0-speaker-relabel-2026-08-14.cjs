#!/usr/bin/env node
/**
 * tha-pod0-speaker-relabel-2026-08-14.cjs — Tom's ruling of 2026-08-14, option A
 * from the casting page (docs/pods/pod-casting-listening-page-2026-08-14.md §Thai).
 *
 * WHAT THIS IS. `tha_for_eng:pod-0-unrecorded` labels its sentence rows with
 * generic speaker names — Customer 1/2/3, Customer, Passenger — where
 * listening_pods.speakers holds the recorded pod's scene-specific ones. 43 lines
 * therefore had no cast entry at all and resolvePodSpeakerVoice() would have
 * dropped every one of them onto speakers._default (Krit, male). The gate added
 * in 0cda2107 (findUncastSpeakers) refuses the render until that is fixed.
 *
 * This is a RELABEL, not a casting decision. No voice is chosen here. Every
 * target role in the map below already exists in listening_pods.speakers with a
 * distinct, deliberately-cast voice, and is the role the RECORDED pod uses for
 * the very same line.
 *
 * WHY IT IS SAFE TO SAY "THE SAME LINE". The unrecorded pod is a scene-for-scene,
 * sentence_number-for-sentence_number twin of the recorded pod. 44 of the 45 rows
 * below have a recorded counterpart at the identical (scene_number,
 * sentence_number), and in every one of those 44 the recorded counterpart's
 * speaker IS the role this script writes — checked as a hard assertion at run
 * time, not just at authoring time. The 45th (SC02-S005) is a draft line added to
 * the unrecorded pod only: scene 2 is a two-hander, Sarah asks how far it is into
 * town, this line answers her, so it is the bus passenger by content.
 *
 * THE 45 ARE 43 + 2. The 43 are the gate's own list. The extra 2 are scene 4's
 * "Friend (7 pm)" / "Friend", which the gate CANNOT see because "Friend" is a
 * cast name — but it is scene 15/22's friend, a man (ผม), while scene 4's friend
 * is the recorded pod's "Evening friend", a woman (ค่ะ, นะคะ) cast on Eve. Left
 * alone, those two rows render a woman on a male voice silently: exactly the
 * defect Tom's ruling is about, one label spanning two characters. Same fix,
 * same evidence standard, reported as its own line item.
 *
 * NOT A CASTING CHANGE AND NOT A RENDER. listening_pods.speakers is untouched, so
 * the cast fingerprint does not move and no existing approval is invalidated. No
 * audio is generated, no clip is deleted, no audio id is touched. The only column
 * written is listening_pod_sentences.speaker.
 *
 * Usage:
 *   node tools/pods/tha-pod0-speaker-relabel-2026-08-14.cjs            # DRY RUN
 *   node tools/pods/tha-pod0-speaker-relabel-2026-08-14.cjs --apply
 */

const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const POD_ID = 'tha_for_eng:pod-0-unrecorded'
const RECORDED_POD_ID = 'tha_for_eng:pod-0'
const APPLY = process.argv.includes('--apply')
const LOG = path.join(__dirname, '../../docs/pods/tha-pod0-speaker-relabel-2026-08-14-'
  + (APPLY ? 'applied' : 'dryrun') + '-log.json')

// The map, per (scene_number, canonical current label). Deliberately keyed by
// SCENE as well as label: "Customer 1" is a woman ordering coffee in scene 7 and
// a man ordering lamb in scene 9, so a label-only map would be wrong.
const RELABEL = {
  '2|Passenger': 'Bus passenger',
  '4|Friend': 'Evening friend',
  '7|Customer 1': 'Cafe customer 1',
  '7|Customer 2': 'Cafe customer 2',
  '7|Customer 3': 'Cafe customer 3',
  '8|Customer 1': 'Bar customer 1',
  '8|Customer 2': 'Bar customer 2',
  '8|Customer 3': 'Bar customer 3',
  '9|Customer 1': 'Diner 1',
  '9|Customer 2': 'Diner 2',
  '10|Customer': 'Shopper',
  '12|Customer': 'Patient',
  '14|Passenger': 'Taxi passenger',
}

const EXPECTED_ROWS = 45

// Same canonicalisation phase8 and the gate use: "Friend (7 pm)" -> "Friend".
const canonicalSpeaker = s =>
  String(s == null ? '' : s).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

function die(msg) {
  console.error('ABORT: ' + msg)
  process.exit(1)
}

;(async () => {
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  )

  const { data: pods, error: podErr } = await sb
    .from('listening_pods').select('id,speakers').in('id', [POD_ID, RECORDED_POD_ID])
  if (podErr) die('pod read failed: ' + podErr.message)
  const pod = pods.find(p => p.id === POD_ID)
  if (!pod) die('pod not found: ' + POD_ID)
  const cast = pod.speakers || {}

  // Every destination role must already be cast, with a real target voice. If a
  // relabel pointed at an uncast name it would just move the bug.
  for (const to of new Set(Object.values(RELABEL))) {
    const entry = cast[to]
    if (!entry) die(`destination role "${to}" is not in ${POD_ID}.speakers — this would not fix anything`)
    const voice = (entry.target && entry.target.voice_id) || entry.voice_id
    if (!voice) die(`destination role "${to}" has no target voice_id`)
  }

  const { data: rows, error: rowErr } = await sb
    .from('listening_pod_sentences')
    .select('id,scene_number,sentence_number,speaker,known_text,target_text,target_text_draft')
    .eq('pod_id', POD_ID)
  if (rowErr) die('sentence read failed: ' + rowErr.message)

  const { data: recRows, error: recErr } = await sb
    .from('listening_pod_sentences')
    .select('scene_number,sentence_number,speaker,known_text')
    .eq('pod_id', RECORDED_POD_ID)
  if (recErr) die('recorded sentence read failed: ' + recErr.message)
  const recorded = new Map(recRows.map(r => [r.scene_number + '|' + r.sentence_number, r]))

  const plan = []
  for (const row of rows) {
    const canon = canonicalSpeaker(row.speaker)
    const to = RELABEL[row.scene_number + '|' + canon]
    if (!to) continue
    const rec = recorded.get(row.scene_number + '|' + row.sentence_number) || null

    // The load-bearing before-state assertion: the recorded twin of this exact
    // line must already be spoken by the role we are about to write. Drift in
    // either pod — a re-sync, a renumbering, an earlier partial run — breaks
    // this and stops the whole script rather than writing a guess.
    if (rec && rec.speaker !== to) {
      die(`${row.id}: recorded counterpart is "${rec.speaker}", not "${to}" — the pods have drifted, refusing to relabel`)
    }
    if (!rec && row.id !== 'tha_for_eng:pod-0-unrecorded:SC02-S005') {
      die(`${row.id}: no recorded counterpart and not the one known unrecorded-only line — refusing to relabel on a guess`)
    }

    const entry = cast[to]
    plan.push({
      id: row.id,
      scene: row.scene_number,
      sentence: row.sentence_number,
      from: row.speaker,
      to,
      draft: !!row.target_text_draft,
      known_text: row.known_text,
      target_text: row.target_text,
      recorded_speaker: rec ? rec.speaker : null,
      new_voice: {
        gender: entry.gender,
        target: (entry.target && entry.target.name) || null,
        target_voice_id: (entry.target && entry.target.voice_id) || entry.voice_id || null,
      },
      old_voice_would_have_been: cast[canon]
        ? 'already cast as ' + canon
        : '_default (' + ((cast._default && cast._default.target && cast._default.target.name) || '?') + ')',
    })
  }

  if (plan.length !== EXPECTED_ROWS) {
    die(`expected ${EXPECTED_ROWS} rows to relabel, found ${plan.length} — the pod has changed since this script was written`)
  }

  const byPair = {}
  for (const p of plan) {
    const k = `scene ${p.scene}: ${canonicalSpeaker(p.from)} -> ${p.to}`
    byPair[k] = (byPair[k] || 0) + 1
  }
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN ===')
  for (const [k, n] of Object.entries(byPair)) console.log(`  ${String(n).padStart(2)}  ${k}`)
  console.log(`  ${plan.length} rows total (${plan.filter(p => p.draft).length} of them target_text_draft=true)`)

  const log = { pod_id: POD_ID, apply: APPLY, rows: plan.length, plan }

  if (!APPLY) {
    fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
    console.log('dry-run log: ' + LOG)
    console.log('nothing written. re-run with --apply')
    return
  }

  const results = []
  for (const p of plan) {
    // Conditional write: .eq('speaker', p.from) means a row someone else has
    // already moved returns zero rows instead of being overwritten.
    const { data, error } = await sb
      .from('listening_pod_sentences')
      .update({ speaker: p.to })
      .eq('id', p.id)
      .eq('speaker', p.from)
      .select('id,speaker')
    if (error) die(`${p.id}: update failed: ${error.message}`)
    if (!data || data.length !== 1) {
      die(`${p.id}: expected 1 row updated, got ${data ? data.length : 0} — before-state drift, stopping`)
    }
    if (data[0].speaker !== p.to) die(`${p.id}: write did not take: speaker is "${data[0].speaker}"`)
    results.push({ ...p, applied: true })
    console.log(`  ok ${p.id}: ${p.from} -> ${p.to}`)
  }

  log.plan = results
  fs.writeFileSync(LOG, JSON.stringify(log, null, 1))
  console.log(`applied ${results.length} relabels. log: ${LOG}`)
})().catch(e => { console.error(e); process.exit(1) })
