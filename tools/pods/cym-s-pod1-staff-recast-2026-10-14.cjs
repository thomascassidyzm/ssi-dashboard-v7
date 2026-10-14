#!/usr/bin/env node
/**
 * cym_s_for_eng:pod-1 — the 11 staff/interlocutor lines in scenes 16/17/21 go to
 * Dan, and the one scene-21 Narrator line moves to Eleri (job #508, Kai 14 Oct).
 *
 * WHY A COURSE-SPECIFIC TOOL. tools/pods/reattribute-pod1-speakers.cjs relabels
 * exactly these 11 lines in the live courses, but (a) it only reads pods whose
 * visibility is 'live' and cym_s_for_eng:pod-1 is 'held', and (b) it casts
 * nothing. Casting is the point here: Learner is Eleri (female), Staff and
 * Interlocutor are cast to the course's own male cast entry (Local -> Dan), the
 * same shape tools/pods/cym-n-scene15-recast-2026-09-10.cjs used for cym_n.
 *
 * NO SELF-DIALOGUE (Kai). Scene 21 ends "Would you like to order some drinks? /
 * Do you want to order some drinks first? / Did you want something to drink
 * first?" (Interlocutor, now male) and then the Narrator's "October. November.
 * December." — also male. The pod cast gate counts every pair of consecutive
 * labels as an exchange, Narrator included, so that would be one voice answering
 * itself. That single Narrator line is therefore relabelled "Narrator 2" and
 * cast to the female Learner voice. No take exists on it (asserted).
 *
 * CAST IS NOT WRITTEN HERE. courses.voice_config.podCast is refused to the agent
 * login (COURSE_CONTENT_READ_ONLY) and PUT /api/production/:course/pods/cast needs
 * a dashboard session, so this tool relabels onto labels ALREADY cast: a line
 * goes to 'Staff' / 'Interlocutor' / 'Narrator 2' if podCast has that entry, and
 * otherwise to 'Local' (male) / 'Learner' (female), whose voices are identical.
 * Once someone casts the three names in the Pod Lab, re-running relabels
 * Local -> Staff/Interlocutor only for rows still on the fallback.
 * The apply refuses if the recast would create ANY same-voice pair of
 * consecutive different labels that did not already exist.
 *
 * Writes: listening_pod_sentences.speaker (12 rows) and nothing else. Never text,
 * never any *_audio_id (takes asserted unchanged). No TTS. Progress is filed
 * under the slot id, which a relabel does not move.
 *
 *   node tools/pods/cym-s-pod1-staff-recast-2026-10-14.cjs           # dry run
 *   node tools/pods/cym-s-pod1-staff-recast-2026-10-14.cjs --apply   # write
 */
'use strict'

const fs = require('fs')
const { Client } = require('pg')
const { canonicalSpeakerName } = require('../../services/voice-engine/pods-registration.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { WORK_ORDER, normText } = require('./reattribute-pod1-speakers.cjs')

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql') })

const APPLY = process.argv.includes('--apply')
const COURSE = 'cym_s_for_eng'
const POD_ID = 'cym_s_for_eng:pod-1'

/** scene-sentence of each work-order line in this pod, read line by line 14 Oct. */
const SLOT_OF_TEXT = {
  'no, we only take cash.': [16, 9],
  'do you want to pay by cash or card or put it on the room?': [17, 2],
  'would you like to pay by cash or card or on the room?': [17, 4],
  'did you want to pay by cash or card?': [17, 5],
  "no, it's a little cold today.": [17, 9],
  "it's down there on the left.": [21, 5],
  "it's down there on the right.": [21, 6],
  "yes, i said it's over there.": [21, 8],
  'would you like to order some drinks?': [21, 11],
  'do you want to order some drinks first?': [21, 12],
  'did you want something to drink first?': [21, 13],
}
const NARRATOR_SLOT = { scene: 21, sentence: 14, text: 'October. November. December.' }
const NARRATOR_2 = 'Narrator 2'

/** The already-cast label a wanted label falls back to while it is not cast. */
const FALLBACK = { Staff: 'Local', Interlocutor: 'Local', [NARRATOR_2]: 'Learner' }
const GENDER_WANTED = { Staff: 'm', Interlocutor: 'm', [NARRATOR_2]: 'f' }

/** The label to write: the wanted one if podCast casts it (with the right gender), else its fallback. */
function resolveLabel(podCast, wanted) {
  const own = podCast[wanted]
  if (own) {
    if (own.gender !== GENDER_WANTED[wanted]) throw new Error(`podCast.${wanted} is cast ${own.gender}, expected ${GENDER_WANTED[wanted]} — stopping`)
    return wanted
  }
  const fb = podCast[FALLBACK[wanted]]
  if (!fb || fb.gender !== GENDER_WANTED[wanted]) throw new Error(`fallback ${FALLBACK[wanted]} is not a ${GENDER_WANTED[wanted]} cast entry — stopping`)
  return FALLBACK[wanted]
}

/** Every relabel this tool makes: [{scene, sentence, text, from, to, wanted}]. */
function relabels(podCast) {
  const out = WORK_ORDER.map((w) => {
    const [scene, sentence] = SLOT_OF_TEXT[normText(w.known_text)]
    return { scene, sentence, text: w.known_text, from: 'Learner', wanted: w.to }
  })
  out.push({ scene: NARRATOR_SLOT.scene, sentence: NARRATOR_SLOT.sentence, text: NARRATOR_SLOT.text, from: 'Narrator', wanted: NARRATOR_2 })
  return out.map((r) => ({ ...r, to: resolveLabel(podCast, r.wanted) }))
}

/** Consecutive rows whose labels differ but whose voice (gender) is the same. */
function sameVoicePairs(rows, genderOfLabel) {
  const pairs = []
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]
    const b = rows[i]
    if (a.scene_number !== b.scene_number) continue
    if (canonicalSpeakerName(a.speaker) === canonicalSpeakerName(b.speaker)) continue
    if (genderOfLabel(a.speaker) === genderOfLabel(b.speaker)) pairs.push(`${b.scene_number}-${b.sentence_number} ${a.speaker}>${b.speaker}`)
  }
  return pairs
}

function applyRelabels(rows, list) {
  const bySlot = new Map(list.map((r) => [`${r.scene}-${r.sentence}`, r.to]))
  return rows.map((r) => {
    const to = bySlot.get(`${r.scene_number}-${r.sentence_number}`)
    return to ? { ...r, speaker: to } : r
  })
}

const genderFrom = (podCast) => (label) => {
  const e = podCast[canonicalSpeakerName(label)] || podCast[label]
  return e ? e.gender : `uncast:${label}`
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const log = { stamp: '2026-10-14', apply: APPLY, podId: POD_ID, relabels: [] }
  try {
    const rows = (await client.query(
      `SELECT id, scene_number, sentence_number, global_order, speaker, known_text, target_audio_id
         FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [POD_ID])).rows
    if (rows.length !== 231) throw new Error(`expected 231 lines, found ${rows.length}`)
    const course = (await client.query(`SELECT voice_config FROM courses WHERE course_code = $1`, [COURSE])).rows[0]
    const podCast = (course.voice_config || {}).podCast || {}
    const list = relabels(podCast)
    for (const r of list) {
      const row = rows.find((x) => x.scene_number === r.scene && x.sentence_number === r.sentence)
      if (!row) throw new Error(`no row at ${r.scene}-${r.sentence}`)
      if (normText(row.known_text) !== normText(r.text)) throw new Error(`${row.id}: text is not ${JSON.stringify(r.text)}`)
      if (row.speaker === r.to) continue // already done
      // From the original label, or from the fallback when the wanted label has since been cast.
      if (row.speaker !== r.from && row.speaker !== FALLBACK[r.wanted]) throw new Error(`${row.id}: speaker is ${row.speaker}, expected ${r.from}`)
      if (row.speaker === FALLBACK[r.wanted] && r.to === FALLBACK[r.wanted]) continue
      if (row.target_audio_id) throw new Error(`${row.id} already holds a take — stopping`)
      log.relabels.push({ id: row.id, from: row.speaker, to: r.to })
    }
    log.labelsUsed = [...new Set(list.map((r) => r.to))]

    // ── NO SELF-DIALOGUE: the recast may not add a same-voice exchange. ──────
    const before = sameVoicePairs(rows, genderFrom(podCast))
    const after = sameVoicePairs(applyRelabels(rows, list), genderFrom(podCast))
    const added = after.filter((p) => !before.includes(p))
    if (added.length) throw new Error(`recast would add same-voice exchanges: ${added.join('; ')}`)
    log.sameVoicePairsBefore = before
    log.sameVoicePairsAfter = after

    const g = genderFrom(podCast)
    const count = applyRelabels(rows, list).reduce((a, r) => { const k = g(r.speaker); a[k] = (a[k] || 0) + 1; return a }, {})
    log.linesByGenderAfter = count
    console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${log.relabels.length} rows to relabel (labels used: ${log.labelsUsed.join(', ')}); lines by gender after: ${JSON.stringify(count)}; same-voice pairs ${before.length} -> ${after.length}`)

    const takes = async () => (await client.query(
      `SELECT a.voice_id, count(*)::int n FROM listening_pod_sentences s
         JOIN course_audio a ON a.id = s.target_audio_id WHERE s.pod_id = $1 GROUP BY 1 ORDER BY 1`, [POD_ID])).rows
    const takesBefore = await takes()

    if (!APPLY) {
      const out = evidencePath('docs/pods/cym-s-pod1-staff-recast-2026-10-14-dryrun-log.json')
      fs.writeFileSync(out, JSON.stringify(log, null, 1))
      console.log(`  log: ${out}`)
      return
    }

    await client.query('BEGIN')
    for (const r of log.relabels) {
      const res = await client.query(
        `UPDATE listening_pod_sentences SET speaker = $1, updated_at = now() WHERE id = $2 AND speaker = $3`, [r.to, r.id, r.from])
      if (res.rowCount !== 1) throw new Error(`row ${r.id} moved under us — rolling back`)
    }
    if (JSON.stringify(await takes()) !== JSON.stringify(takesBefore)) throw new Error('a take moved — rolling back')
    await client.query('COMMIT')

    const identity = serviceIdentity('cym-s-pod1-staff-recast-2026-10-14', { role: 'content-editor' })
    await client.query(
      `INSERT INTO content_edit_events
         (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [COURSE, 'tools/pods/cym-s-pod1-staff-recast-2026-10-14.cjs', 'pod-recast',
       identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
       { pod_id: POD_ID, rows: log.relabels.length }, { after: count, labels: log.labelsUsed }])
    const out = evidencePath('docs/pods/cym-s-pod1-staff-recast-2026-10-14-applied-log.json')
    fs.writeFileSync(out, JSON.stringify({ ...log, takesBefore }, null, 1))
    console.log(`  applied. takes unchanged. log: ${out}`)
  } catch (e) {
    if (APPLY) { try { await client.query('ROLLBACK') } catch {} }
    throw e
  } finally {
    await client.end()
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })

module.exports = { relabels, resolveLabel, sameVoicePairs, applyRelabels, genderFrom, NARRATOR_2 }
