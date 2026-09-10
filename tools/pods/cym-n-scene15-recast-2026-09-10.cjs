#!/usr/bin/env node
/**
 * cym_n_for_eng:pod-1 — LINE-BY-LINE RECAST OF SCENES 15-22 (2026-09-10).
 *
 * Tom's instruction, verbatim: "let us look at the scenes and recast each line
 * sensibly - from Scene 15 onwards". Not a mechanical polarity flip: an
 * editorial read of what each line actually SAYS, with the male voice (Aran)
 * taking the lion's share because he is far more available than Catrin, and
 * because Aran's own judgement is that a learner hearing different voices ask
 * and answer the variations is not interruptive.
 *
 * THE READING, and it is the whole content of this file:
 *   Scenes 15-21 are runs of practice variations, all labelled "Learner". Most
 *   of them ARE the learner's own production and go to Aran. Eleven of them are
 *   plainly the other person talking — the shop answering "Can we pay by card?",
 *   the receptionist asking how you want to pay, the waiter offering drinks —
 *   and those stay with Catrin, so a genuine question-and-answer pair still has
 *   two voices in it. One voice reading both halves of an exchange is the exact
 *   fault the 2026-08-23 per-conversation recast existed to remove.
 *   Scene 22 is a real two-person conversation and Aran has already recorded all
 *   five of his Friend lines, so the learner side stays with Catrin: its casting
 *   does not change at all, only its label.
 *
 * WHY LABELS CHANGE AT ALL: both cast maps are keyed by canonical speaker name,
 * and canonicalSpeakerName() strips parenthesised groups, so a bracketed scene
 * suffix cannot express a scene-scoped cast. The mechanism is the one
 * tools/pods/pod1-percall-recast.cjs established in August — make the labels
 * themselves distinct and write one cast entry per label. Safe under the
 * content-change migration protocol: learner progress is filed under the SLOT id
 * `${podId}:SC{scene}-S{sentence}`, which a relabel does not move.
 *
 * NO TAKE IS TOUCHED. It writes `speaker` and the two cast maps and nothing
 * else: never target_text/known_text, never any *_audio_id, never voice_config
 * .voices (asserted byte-identical before commit). No TTS is generated, ever.
 *
 * Usage:
 *   node tools/pods/cym-n-scene15-recast-2026-09-10.cjs           # dry run
 *   node tools/pods/cym-n-scene15-recast-2026-09-10.cjs --apply   # write
 */
'use strict'

const fs = require('fs')
const { Client } = require('pg')
const { mergePodCast } = require('../../services/voice-engine/pods-cast.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql') })

const APPLY = process.argv.includes('--apply')
const POD_ID = 'cym_n_for_eng:pod-1'
const COURSE = 'cym_n_for_eng'

const ARAN = { name: 'Aran', email: 'aran@hey.com', gender: 'm', voiceId: 'human_aran_cym_n' }
const CATRIN = { name: 'Catrin', email: 'catrinlliar@gmail.com', gender: 'f', voiceId: 'human_catrinlliar_cym_n' }

/** The other person's lines inside scenes 15-21, "scene-sentence". */
const LOCAL_SPEAKER_LINES = new Set([
  '16-9',                                  // "No, we only take cash."
  '17-2', '17-4', '17-5',                  // how would you like to pay?
  '17-9',                                  // "No, it's a little cold today."
  '21-5', '21-6', '21-8',                  // it's down there on the left / right / over there
  '21-11', '21-12', '21-13',               // would you like to order some drinks?
])

const LOCAL_SPEAKER = 'Local Speaker'   // the Welsh speaker the learner is dealing with
const CHAT_LEARNER = 'Chat Learner'     // the learner's side of the scene-22 conversation

/** The label a scene-15+ "Learner" row should carry. */
function relabel(scene, sentence) {
  if (scene === 22) return CHAT_LEARNER
  return LOCAL_SPEAKER_LINES.has(`${scene}-${sentence}`) ? LOCAL_SPEAKER : 'Learner'
}

/** The cast this recast leaves behind, for the labels it touches. */
const CAST_AFTER = {
  Learner: ARAN,
  [LOCAL_SPEAKER]: CATRIN,
  [CHAT_LEARNER]: CATRIN,
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const log = { stamp: '2026-09-10', apply: APPLY, podId: POD_ID, relabels: [], cast: {}, assertions: [] }
  try {
    const rows = (await client.query(
      `SELECT id, scene_number, sentence_number, speaker, target_audio_id
         FROM listening_pod_sentences
        WHERE pod_id = $1 AND scene_number >= 15
        ORDER BY global_order`, [POD_ID])).rows

    // ── BEFORE-STATE ASSERTIONS. Any drift and nothing is written. ──────────
    if (rows.length !== 91) throw new Error(`expected 91 lines in scenes 15+, found ${rows.length}`)
    const learners = rows.filter(r => r.speaker === 'Learner')
    if (learners.length !== 79) throw new Error(`expected 79 "Learner" lines, found ${learners.length}`)
    if (learners.some(r => r.target_audio_id)) throw new Error('a "Learner" line already holds a take — stopping')
    const others = rows.filter(r => r.speaker !== 'Learner')
    if (!others.every(r => r.speaker === 'Narrator' || r.speaker.startsWith('Friend'))) {
      throw new Error('an unexpected speaker label in scenes 15+ — stopping')
    }
    if (others.some(r => !r.target_audio_id)) throw new Error('a Narrator/Friend line has lost its take — stopping')

    const course = (await client.query(
      `SELECT voice_config FROM courses WHERE course_code = $1`, [COURSE])).rows[0]
    const podCast = (course.voice_config || {}).podCast || {}
    if (!podCast.Learner || podCast.Learner.voiceId !== CATRIN.voiceId) {
      throw new Error('podCast.Learner is not Catrin any more — the ground this plan stands on has moved')
    }
    for (const name of [LOCAL_SPEAKER, CHAT_LEARNER]) {
      if (podCast[name]) throw new Error(`podCast already has a "${name}" entry — stopping`)
    }
    const usedLabels = new Set((await client.query(
      `SELECT DISTINCT speaker FROM listening_pod_sentences WHERE pod_id LIKE $1`,
      [COURSE + ':%'])).rows.map(r => r.speaker))
    for (const name of [LOCAL_SPEAKER, CHAT_LEARNER]) {
      if (usedLabels.has(name)) throw new Error(`"${name}" is already a speaker label in this course — pick another`)
    }
    // The trap this whole design exists to avoid.
    const early = (await client.query(
      `SELECT count(*)::int n FROM listening_pod_sentences
        WHERE pod_id = $1 AND scene_number < 15 AND speaker = 'Learner'`, [POD_ID])).rows[0].n
    if (early !== 0) throw new Error(`"Learner" is used ${early} times in scenes 1-14 — recasting it would move them too`)
    log.assertions.push('91 lines, 79 Learner with no takes, 12 Narrator/Friend takes intact, Learner unused before scene 15')

    const takesBefore = (await client.query(
      `SELECT a.voice_id, count(*)::int n FROM listening_pod_sentences s
         JOIN course_audio a ON a.id = s.target_audio_id
        WHERE s.pod_id = $1 GROUP BY 1 ORDER BY 1`, [POD_ID])).rows

    // ── THE PLAN ────────────────────────────────────────────────────────────
    for (const r of learners) {
      const want = relabel(r.scene_number, r.sentence_number)
      if (want !== r.speaker) log.relabels.push({ id: r.id, from: r.speaker, to: want })
    }
    log.cast = Object.fromEntries(Object.entries(CAST_AFTER).map(([k, v]) => [k, v.name]))
    const counts = rows.reduce((acc, r) => {
      const label = r.speaker === 'Learner' ? relabel(r.scene_number, r.sentence_number) : r.speaker
      const voice = CAST_AFTER[label] ? CAST_AFTER[label].name : 'Aran'
      acc[voice] = (acc[voice] || 0) + 1
      return acc
    }, {})
    log.after = counts
    console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${log.relabels.length} rows relabelled, ` +
      `cast after: ${JSON.stringify(counts)}`)
    console.log(`  takes before: ${JSON.stringify(takesBefore)}`)

    if (!APPLY) {
      const out = evidencePath('docs/pods/cym-n-scene15-recast-2026-09-10-dryrun-log.json')
      fs.writeFileSync(out, JSON.stringify(log, null, 1))
      console.log(`  log: ${out}`)
      return
    }

    // ── THE WRITE ───────────────────────────────────────────────────────────
    await client.query('BEGIN')
    for (const r of log.relabels) {
      const res = await client.query(
        `UPDATE listening_pod_sentences SET speaker = $1, updated_at = now()
          WHERE id = $2 AND speaker = $3`, [r.to, r.id, r.from])
      if (res.rowCount !== 1) throw new Error(`row ${r.id} moved under us — rolling back`)
    }

    const nextConfig = mergePodCast(course.voice_config, CAST_AFTER)
    if (JSON.stringify(nextConfig.voices) !== JSON.stringify((course.voice_config || {}).voices)) {
      throw new Error('voice_config.voices would change — rolling back')
    }
    await client.query(`UPDATE courses SET voice_config = $1 WHERE course_code = $2`,
      [nextConfig, COURSE])

    // The TTS-side map is kept in step, exactly as the August recast did, so the
    // two maps cannot disagree about a label that only exists because of us.
    const pod = (await client.query(
      `SELECT speakers FROM listening_pods WHERE id = $1`, [POD_ID])).rows[0]
    const speakers = JSON.parse(JSON.stringify(pod.speakers || {}))
    for (const [label, who] of Object.entries(CAST_AFTER)) {
      const leg = { name: who.name, provider: 'human', voice_id: who.voiceId }
      speakers[label] = { known: leg, target: leg, gender: who.gender, variants: [label] }
    }
    await client.query(`UPDATE listening_pods SET speakers = $1, updated_at = now() WHERE id = $2`,
      [speakers, POD_ID])

    // ── AFTER-STATE ASSERTIONS, inside the transaction ──────────────────────
    const takesAfter = (await client.query(
      `SELECT a.voice_id, count(*)::int n FROM listening_pod_sentences s
         JOIN course_audio a ON a.id = s.target_audio_id
        WHERE s.pod_id = $1 GROUP BY 1 ORDER BY 1`, [POD_ID])).rows
    if (JSON.stringify(takesAfter) !== JSON.stringify(takesBefore)) {
      throw new Error(`a take moved: ${JSON.stringify(takesBefore)} -> ${JSON.stringify(takesAfter)}`)
    }
    await client.query('COMMIT')

    const identity = serviceIdentity('cym-n-scene15-recast-2026-09-10', { role: 'content-editor' })
    await client.query(
      `INSERT INTO content_edit_events
         (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [COURSE, 'tools/pods/cym-n-scene15-recast-2026-09-10.cjs', 'pod-recast',
       identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
       { pod_id: POD_ID, rows: log.relabels.length }, { cast: log.cast, after: counts }])

    const out = evidencePath('docs/pods/cym-n-scene15-recast-2026-09-10-applied-log.json')
    fs.writeFileSync(out, JSON.stringify({ ...log, takesBefore, takesAfter }, null, 1))
    console.log(`  applied. takes unchanged. log: ${out}`)
  } catch (e) {
    if (APPLY) { try { await client.query('ROLLBACK') } catch {} }
    throw e
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1) })
}

module.exports = { relabel, CAST_AFTER, LOCAL_SPEAKER, CHAT_LEARNER, LOCAL_SPEAKER_LINES }
