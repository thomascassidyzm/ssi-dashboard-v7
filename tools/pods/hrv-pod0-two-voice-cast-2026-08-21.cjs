#!/usr/bin/env node
/**
 * hrv-pod0-two-voice-cast-2026-08-21.cjs — Tom's universal two-voice casting rule,
 * applied to the Croatian pod-0 pilot on BOTH tracks.
 *
 * TOM'S RULING, 2026-08-21, verbatim in substance:
 *   "this pod is cast with EXACTLY TWO VOICES so a human-recorded course can be
 *    produced by two people. Voice A (male, Aran) = the learner/protagonist thread
 *    across the whole pod. Voice B (female) = every other character (neighbour,
 *    barista, waiter, friend, receptionist, everyone else). This is a universal
 *    casting rule, not a one-off fix for scene 22."
 *
 * WHAT THIS SUPERSEDES. hrv-pod0-contrast-cast-2026-08-21.cjs cast for CONTRAST —
 * within a scene, the customer side and the service side take different voices, with
 * gender read off whatever each character happened to say. That produced two voices
 * per scene but NOT one consistent protagonist. Sarah (scenes 1-5), Customer 1/2/3
 * (7-9) and the Tourist (13) were all cast female while the Learner (15-22), the
 * Customer (10, 12), the Guest (11), James (6) and the Passenger (14) were male —
 * the same dramatic role, the learner's own seat, changing voice nine times across
 * the pod. Under Tom's rule the protagonist thread is ONE voice, end to end, and
 * every counterpart is the other. That is what makes it recordable by two people.
 *
 * BOTH TRACKS. The rule is about who records the pod, so it binds the known (English)
 * track as well as the target (Croatian) one. The known track was the worse offender:
 * the Learner's 79 English lines were on Olivia while the Learner's Croatian was
 * Srećko — one character, two genders, depending on which language you were hearing.
 *
 * THE SPEAKER-KEY COLLISION, and the one relabel this needs. Casting resolves per
 * speaker KEY, but `Passenger` is used for two opposite roles: in scene 2 the
 * passenger is the stranger Sarah asks about the seat (counterpart -> Voice B), and
 * in scene 14 the passenger IS the protagonist taking the taxi (-> Voice A). One key
 * cannot be both. Scene 2's speaker is relabelled `Fellow passenger`; scene 14 keeps
 * `Passenger`. Speaker labels are never spoken and are not part of known_text, so
 * this does not disturb the progress mapping, which keys on known text
 * (docs/pods/hrv-pod0-progress-mapping-verification-2026-08-21.md).
 *
 * NOTHING IS DELETED. --null-stale nulls the target_audio_id / known_audio_id
 * POINTERS on rows whose current clip is on a voice this cast no longer resolves.
 * course_audio rows are never touched, never deleted; the run asserts the table's
 * row count is unchanged. Every nulled pointer is written to the applied log with its
 * old id, which is the way back. The nulled rows are then re-rendered by the phase8
 * pod-audio path, which only generates where the id is null.
 *
 *   node tools/pods/hrv-pod0-two-voice-cast-2026-08-21.cjs                  # dry run
 *   node tools/pods/hrv-pod0-two-voice-cast-2026-08-21.cjs --apply
 *   node tools/pods/hrv-pod0-two-voice-cast-2026-08-21.cjs --apply --null-stale
 *
 * Refuses to run against any pod id but the working copy. Vocabulary: known / target / seed.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const LIVE_POD = 'hrv_for_eng:pod-0'

// The two approved target voices (Tom's ear, 2026-08-17, docs/pods/t21-casting-rulings-2026-08-17.md)
const SRECKO = { name: 'Srećko', locale: 'hr-HR', provider: 'azure', voice_id: 'hr-HR-SreckoNeural' }
const GABRIJELA = { name: 'Gabrijela', locale: 'hr-HR', provider: 'azure', voice_id: 'hr-HR-GabrijelaNeural' }
// The two shared English voices every pod-0 in the estate uses (decision B, 2026-08-11,
// docs/pods/pod0-english-shared-cast-2026-08-11.md)
const TOM = { name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp' }
const OLIVIA = { name: 'Olivia', provider: 'xai', voice_id: 'bedd6226' }

/**
 * VOICE A — the learner/protagonist thread. One person, whatever the scene calls them.
 * Every other key in the pod, and the _default, is Voice B.
 */
const VOICE_A = [
  'Sarah',        // scenes 1-5  — the day-of-greetings protagonist
  'James',        // scene 6     — "I'm learning Croatian"
  'Customer 1',   // scenes 7-9  — the customer side of the coffee shop, pub, restaurant
  'Customer 2',
  'Customer 3',
  'Customer',     // scenes 10, 12 — shop and chemist's
  'Guest',        // scene 11    — hotel check-in
  'Tourist',      // scene 13    — asking directions
  'Passenger',    // scene 14 ONLY (scene 2's passenger is relabelled below)
  'Learner',      // scenes 15-22
]

/** scene 2's `Passenger` is a counterpart, not the protagonist — give it its own key. */
const RELABEL = [{ scene: 2, from: 'Passenger', to: 'Fellow passenger' }]

const APPLY = process.argv.includes('--apply')
const NULL_STALE = process.argv.includes('--null-stale')

const normVoice = (v) => String(v || '').replace(/^azure_/, '').replace(/^xai_/, '')
/** Mirrors phase8 resolvePodSpeakerVoice / tools/pod-sync canonicalSpeakerName. */
const canonicalSpeakerName = (s) => (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
const isVoiceA = (key) => VOICE_A.includes(key)

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const log = {
    pod_id: POD_ID,
    ruling: "Tom 2026-08-21 — exactly two voices; Voice A (male) is the learner/protagonist thread across the whole pod, Voice B (female) is every other character",
    applied: APPLY, null_stale: NULL_STALE,
    relabelled: [], cast_changes: [], nulled_target: [], nulled_known: [], kept_target: 0, kept_known: 0,
  }

  const { rows: podRows } = await db.query('select id, speakers from listening_pods where id = $1', [POD_ID])
  if (!podRows.length) throw new Error(`pod not found: ${POD_ID}`)
  const beforeSpeakers = JSON.parse(JSON.stringify(podRows[0].speakers || {}))
  const speakers = JSON.parse(JSON.stringify(podRows[0].speakers || {}))

  const audioCountBefore = (await db.query('select count(*)::int n from course_audio')).rows[0].n

  // ---- 0. the scene-2 relabel ------------------------------------------------
  for (const r of RELABEL) {
    const { rows } = await db.query(
      `select id, scene_number, sentence_number, speaker from listening_pod_sentences
        where pod_id = $1 and scene_number = $2 and speaker = $3 order by sentence_number`,
      [POD_ID, r.scene, r.from])
    for (const row of rows) log.relabelled.push({ id: row.id, scene: row.scene_number, sentence: row.sentence_number, from: r.from, to: r.to })
    if (APPLY && rows.length) {
      const res = await db.query(
        `update listening_pod_sentences set speaker = $1, updated_at = now()
          where pod_id = $2 and scene_number = $3 and speaker = $4`,
        [r.to, POD_ID, r.scene, r.from])
      if (res.rowCount !== rows.length) throw new Error(`drift: relabel expected ${rows.length} rows, updated ${res.rowCount}`)
    }
  }

  // ---- 1. the cast ------------------------------------------------------------
  // Every key present in the pod's stored cast, plus the relabel target, plus _default.
  const keys = new Set([...Object.keys(speakers), ...RELABEL.map(r => r.to)])
  for (const key of keys) {
    const a = key === '_default' ? false : isVoiceA(key)
    const wantT = a ? SRECKO : GABRIJELA
    const wantK = a ? TOM : OLIVIA
    const wantG = a ? 'm' : 'f'
    const entry = speakers[key] || (speakers[key] = {})
    const before = `${normVoice(entry.target && entry.target.voice_id) || '(none)'}/${normVoice(entry.known && entry.known.voice_id) || '(none)'}|${entry.gender || '?'}`
    const after = `${wantT.voice_id}/${wantK.voice_id}|${wantG}`
    if (before === after) { log.cast_changes.push({ speaker: key, voice: a ? 'A-male' : 'B-female', unchanged: before }); continue }
    entry.gender = wantG
    entry.target = { ...wantT }
    entry.known = { ...wantK }
    if (!entry.variants) entry.variants = [key]
    log.cast_changes.push({ speaker: key, voice: a ? 'A-male' : 'B-female', before, after })
  }

  // Exactly two target voices and exactly two known voices may survive this pass.
  const badT = Object.entries(speakers).filter(([, e]) => e && e.target && ![SRECKO.voice_id, GABRIJELA.voice_id].includes(normVoice(e.target.voice_id)))
  const badK = Object.entries(speakers).filter(([, e]) => e && e.known && ![TOM.voice_id, OLIVIA.voice_id].includes(normVoice(e.known.voice_id)))
  if (badT.length || badK.length) {
    throw new Error(`REFUSING: cast holds unapproved voices: ${[...badT, ...badK].map(([k, e]) => k).join(', ')}`)
  }

  console.log(`\n${POD_ID} — two-voice cast${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)
  console.log(`  relabelled rows: ${log.relabelled.length}${log.relabelled.length ? ` (${log.relabelled.map(r => `SC${String(r.scene).padStart(2, '0')}-S${String(r.sentence).padStart(3, '0')} ${r.from}->${r.to}`).join(', ')})` : ''}`)
  for (const c of log.cast_changes.sort((x, y) => x.speaker.localeCompare(y.speaker))) {
    if (c.unchanged) console.log(`  ·  ${c.speaker.padEnd(18)} ${c.voice.padEnd(9)} already ${c.unchanged}`)
    else console.log(`  ✎  ${c.speaker.padEnd(18)} ${c.voice.padEnd(9)} ${c.before}  ->  ${c.after}`)
  }

  if (APPLY) {
    const { rows: now } = await db.query('select speakers from listening_pods where id = $1', [POD_ID])
    if (JSON.stringify(now[0].speakers) !== JSON.stringify(beforeSpeakers)) {
      throw new Error('DRIFT: listening_pods.speakers changed since it was read — nothing written')
    }
    await db.query('update listening_pods set speakers = $1, updated_at = now() where id = $2', [speakers, POD_ID])
    console.log('  cast written.')
  }

  // ---- 2. stale-pointer sweep, both tracks -----------------------------------
  const { rows: sents } = await db.query(
    `select s.id, s.scene_number, s.sentence_number, s.speaker,
            s.target_audio_id, ta.voice_id tv,
            s.known_audio_id,  ka.voice_id kv
       from listening_pod_sentences s
       left join course_audio ta on ta.id = s.target_audio_id
       left join course_audio ka on ka.id = s.known_audio_id
      where s.pod_id = $1
      order by s.global_order`, [POD_ID])

  // In DRY RUN the relabel has not been written, so apply it in memory — otherwise the
  // dry run would resolve scene 2's passenger as the protagonist and under-count the sweep.
  const relabelInMemory = (row) => {
    const hit = RELABEL.find(r => r.scene === row.scene_number && row.speaker === r.from)
    return hit ? hit.to : row.speaker
  }

  for (const r of sents) {
    const key = canonicalSpeakerName(APPLY ? r.speaker : relabelInMemory(r))
    const entry = speakers[key] || speakers._default
    const wantT = entry && entry.target ? entry.target.voice_id : null
    const wantK = entry && entry.known ? entry.known.voice_id : null
    const slot = `SC${String(r.scene_number).padStart(2, '0')}-S${String(r.sentence_number).padStart(3, '0')}`
    if (r.target_audio_id) {
      if (wantT && normVoice(r.tv) === wantT) log.kept_target++
      else log.nulled_target.push({ id: r.id, slot, speaker: r.speaker, was_voice: r.tv, was_audio_id: r.target_audio_id, wanted: wantT })
    }
    if (r.known_audio_id) {
      if (wantK && normVoice(r.kv) === wantK) log.kept_known++
      else log.nulled_known.push({ id: r.id, slot, speaker: r.speaker, was_voice: r.kv, was_audio_id: r.known_audio_id, wanted: wantK })
    }
  }

  console.log(`\n  target clips kept ${log.kept_target}, stale ${log.nulled_target.length}`)
  console.log(`  known  clips kept ${log.kept_known}, stale ${log.nulled_known.length}`)

  if (APPLY && NULL_STALE && (log.nulled_target.length || log.nulled_known.length)) {
    // Every TARGET clip we unlink must still be reachable from the live pod, which is
    // the precedent this pod already runs under: unlinking the only pointer to a clip
    // would be a loss even though the row survives.
    const tIds = log.nulled_target.map(n => n.was_audio_id)
    if (tIds.length) {
      const { rows: live } = await db.query(
        `select distinct target_audio_id from listening_pod_sentences
          where pod_id = $1 and target_audio_id = any($2::uuid[])`, [LIVE_POD, tIds])
      const reachable = new Set(live.map(r => r.target_audio_id))
      const orphans = log.nulled_target.filter(n => !reachable.has(n.was_audio_id))
      // Not fatal for the known track's sake, but state it loudly: these clips keep
      // existing in course_audio and their ids are in this log, which is the way back.
      log.target_orphans_after_unlink = orphans.map(o => ({ slot: o.slot, audio_id: o.was_audio_id }))
      console.log(`  target clips that no other pod still points at: ${orphans.length} (rows kept in course_audio; ids logged)`)
    }
    await db.query('begin')
    try {
      for (const n of log.nulled_target) {
        const r = await db.query(
          `update listening_pod_sentences set target_audio_id = null, updated_at = now()
            where id = $1 and target_audio_id = $2`, [n.id, n.was_audio_id])
        if (r.rowCount !== 1) throw new Error(`drift: target ${n.slot} expected 1 row, got ${r.rowCount}`)
      }
      for (const n of log.nulled_known) {
        const r = await db.query(
          `update listening_pod_sentences set known_audio_id = null, updated_at = now()
            where id = $1 and known_audio_id = $2`, [n.id, n.was_audio_id])
        if (r.rowCount !== 1) throw new Error(`drift: known ${n.slot} expected 1 row, got ${r.rowCount}`)
      }
      const after = (await db.query('select count(*)::int n from course_audio')).rows[0].n
      if (after !== audioCountBefore) throw new Error(`REFUSING: course_audio row count moved ${audioCountBefore} -> ${after}`)
      await db.query('commit')
      console.log(`  unlinked ${log.nulled_target.length} target and ${log.nulled_known.length} known pointers; course_audio unchanged at ${after} rows.`)
    } catch (e) { await db.query('rollback'); throw e }
  } else if (log.nulled_target.length || log.nulled_known.length) {
    console.log('  DRY RUN — no pointer nulled. Re-run with --apply --null-stale.')
  }

  const out = path.join(__dirname, '..', '..', 'docs', 'pods',
    `hrv-pod0-two-voice-cast-2026-08-21-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
