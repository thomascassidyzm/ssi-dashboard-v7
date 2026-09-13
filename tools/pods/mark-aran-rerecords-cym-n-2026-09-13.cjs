#!/usr/bin/env node
/**
 * mark-aran-rerecords-cym-n-2026-09-13.cjs — queue nine Welsh lines for Aran
 * to re-record, using the estate's EXISTING want lever and nothing else.
 *
 * Tom, by ear, 2026-09-13 20:28Z: two pod-1 lines serve the booth's synthetic
 * "say this instead" TTS voice, not Aran (scene 12 line 8, scene 7 line 4).
 * The speaker-id probe (job #569) labelled six 10-Sep Senedd-committee clips
 * in Aran's voice slot the same way, and the Senedd 'Prynhawn da.' clip (June
 * row 30514028, under human_aran_cym_n_2) is Tom's voice.
 *
 * THE LEVER. Two flags carry a want, and both are read by the booth queue
 * (services/voice-engine/recordist-queue.cjs, header rule 6) and the studio
 * plan (services/voice-engine/pods-plan.cjs):
 *   - listening_pod_sentences.rerecord_wanted  {"target": "<voiceId>"} — the
 *     pod line's own flag, "the make-before-break lever" (pods-plan.cjs);
 *   - course_audio.rerecord_wanted  {reason, marked_at, marked_by, voice_gender}
 *     — the clip's flag, the shape job #533·F wrote on a70756ca today.
 * Both are retired automatically by the take route when Aran's new take lands
 * (clearRerecordWants; commitPodRegistration clears the sentence key in the
 * same write that re-points target_audio_id).
 *
 * WHAT A WANT DOES NOT DO — and this tool does not pretend otherwise. Since
 * Tom's ruling of 2026-09-11 ("a want is a mark, never a reason to serve a
 * recorded line again") a want moves NO line into the outstanding set: every
 * one of these nine has a confirmed upload under Aran's voice id, so his booth
 * still counts them recorded and masks the mark. He reaches them by
 * "Show everything I've already recorded" → "Record it again" on the line.
 * Tom's coverage page (GET /api/recording/coverage) sees the mark and reason.
 *
 * NOTHING IS DELETED, UNLINKED OR SILENCED: every line keeps serving its
 * current bytes until the new take is stored and swapped in (live-pod one-way
 * door, Tom 2026-09-13).
 *
 *   node tools/pods/mark-aran-rerecords-cym-n-2026-09-13.cjs            # dry run
 *   APPLY=1 node tools/pods/mark-aran-rerecords-cym-n-2026-09-13.cjs    # write
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const APPLY = process.env.APPLY === '1'
const COURSE = 'cym_n_for_eng'
const VOICE = 'human_aran_cym_n'
const MARKED_BY = 'job #590 (conv 76a19501-6198-4eb8-82e6-c7885fc963d0)'
const ARAN_SPELLINGS = ['human_aran_cym_n', 'human_aran_cym_n_2']

// sentence id → { clip: serving target_audio_id, reason }
const LINES = [
  { id: 'cym_n_for_eng:pod-1:SC12-S008', clip: 'a70756ca-dd41-4e2c-ae58-5e258ed48371',
    reason: 'Tom, by ear 2026-09-13 20:28Z: serving take is the booth TTS voice, not Aran (probe #569: SynthVoice 0.50)' },
  { id: 'cym_n_for_eng:pod-1:SC07-S004', clip: 'cb6d8ee4-5c20-4c37-9530-5d856d0d5139',
    reason: 'Tom, by ear 2026-09-13 20:28Z: serving take is the booth TTS voice, not Aran (probe #569: SynthVoice 0.63)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC001-S0001', clip: '30514028-0094-40c6-b836-10530e808cfa',
    reason: 'June row 70 is Tom\'s voice, not Aran (job #568/#569, 2026-09-13); also serves s9 l47' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC009-S0047', clip: '30514028-0094-40c6-b836-10530e808cfa',
    reason: 'June row 70 is Tom\'s voice, not Aran (job #568/#569, 2026-09-13); also serves s1 l1' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC011-S0060', clip: 'd891e5a9-63f2-4675-8d3c-d224b27f62e6',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.65)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC007-S0042', clip: '8a3c2572-ec87-4cb8-9c10-41f3ebbd4550',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.56)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC145-S0518', clip: '3a0b5e06-75e4-4f32-b21a-f827f030beb2',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.41)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC151-S0531', clip: '9388b1b0-196f-4368-9196-1d6e678c73c4',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.54)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC152-S0534', clip: 'a8e14ed1-3b41-4684-976d-31d78f4584c5',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.40)' },
  { id: 'cym_n_for_eng:senedd-s4c-steve:SC159-S0565', clip: '1e5a83d2-5d44-4a8e-bc84-3cb49a017474',
    reason: 'Speaker-id probe #569 (2026-09-13): 10-Sep take is the booth TTS voice, not Aran (SynthVoice 0.75)' },
]

/**
 * Pure: the sentence want after marking the TARGET track for `voice`.
 * Every other key (a `known` want, an older `reason`) is preserved; a row that
 * already names this voice on `target` comes back unchanged (idempotent).
 */
function mergeSentenceWant(existing, voice, reason) {
  const cur = existing && typeof existing === 'object' ? existing : {}
  if (cur.target === voice) return { next: cur, changed: false }
  const next = { ...cur, target: voice }
  if (!next.reason && reason) next.reason = reason
  return { next, changed: true }
}

/** Pure: the clip want. An existing want is a fact to keep, never overwritten. */
function clipWant(existing, reason, now) {
  if (existing && typeof existing === 'object') return { next: existing, changed: false }
  return { next: { reason, marked_at: now, marked_by: MARKED_BY, voice_gender: 'm' }, changed: true }
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const p of [path.join(__dirname, '../../.env.psql'), path.join(process.env.HOME || '', 'SSi/ssi-dashboard-v7-clean/.env.psql')]) {
    if (!fs.existsSync(p)) continue
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  throw new Error('DATABASE_URL not found (.env.psql)')
}

async function main() {
  const db = new Client({ connectionString: loadDatabaseUrl() })
  await db.connect()
  const now = new Date().toISOString()
  const log = { ran: now, apply: APPLY, course: COURSE, voice: VOICE, sentences: [], clips: [] }
  try {
    await db.query('BEGIN')

    // BEFORE-STATE: every line is a live-pod line of this course, its serving
    // slot holds the clip we expect, under one of Aran's spellings. Drift aborts.
    const { rows: sents } = await db.query(
      `SELECT s.id, s.target_text, s.target_audio_id, s.rerecord_wanted, s.speaker, p.slug, p.visibility
         FROM listening_pod_sentences s JOIN listening_pods p ON p.id = s.pod_id
        WHERE p.course_code = $1 AND s.id = ANY($2)`, [COURSE, LINES.map((l) => l.id)])
    if (sents.length !== LINES.length) throw new Error(`expected ${LINES.length} sentences, found ${sents.length}`)
    const clipIds = [...new Set(LINES.map((l) => l.clip))]
    const { rows: clips } = await db.query(
      `SELECT id, voice_id, origin, text, s3_key, rerecord_wanted FROM course_audio WHERE id = ANY($1::uuid[])`, [clipIds])
    if (clips.length !== clipIds.length) throw new Error(`expected ${clipIds.length} clips, found ${clips.length}`)
    const clipById = new Map(clips.map((c) => [c.id, c]))
    for (const l of LINES) {
      const s = sents.find((r) => r.id === l.id)
      if (!s) throw new Error(`sentence ${l.id} missing`)
      if (s.visibility !== 'live') throw new Error(`${l.id}: pod ${s.slug} is ${s.visibility}, expected live`)
      if (s.target_audio_id !== l.clip) throw new Error(`${l.id}: serving ${s.target_audio_id}, expected ${l.clip} — drift, aborting`)
      const c = clipById.get(l.clip)
      if (!ARAN_SPELLINGS.includes(c.voice_id)) throw new Error(`${l.clip}: voice_id ${c.voice_id} is not Aran's slot`)
    }

    // SENTENCE WANTS
    for (const l of LINES) {
      const s = sents.find((r) => r.id === l.id)
      const { next, changed } = mergeSentenceWant(s.rerecord_wanted, VOICE, l.reason)
      log.sentences.push({ id: l.id, text: s.target_text, speaker: s.speaker, before: s.rerecord_wanted, after: next, changed })
      if (!changed) continue
      const r = await db.query(
        `UPDATE listening_pod_sentences SET rerecord_wanted = $2::jsonb
          WHERE id = $1 AND rerecord_wanted IS NOT DISTINCT FROM $3::jsonb`,
        [l.id, JSON.stringify(next), s.rerecord_wanted === null ? null : JSON.stringify(s.rerecord_wanted)])
      if (r.rowCount !== 1) throw new Error(`${l.id}: before-state moved under us (rowCount ${r.rowCount})`)
    }

    // CLIP WANTS
    for (const id of clipIds) {
      const c = clipById.get(id)
      const reason = LINES.find((l) => l.clip === id).reason
      const { next, changed } = clipWant(c.rerecord_wanted, reason, now)
      log.clips.push({ id, voice_id: c.voice_id, s3_key: c.s3_key, text: c.text, before: c.rerecord_wanted, after: next, changed })
      if (!changed) continue
      const r = await db.query(
        `UPDATE course_audio SET rerecord_wanted = $2::jsonb WHERE id = $1 AND rerecord_wanted IS NULL`,
        [id, JSON.stringify(next)])
      if (r.rowCount !== 1) throw new Error(`${id}: before-state moved under us (rowCount ${r.rowCount})`)
    }

    // AFTER-STATE: nothing about the serving pointers moved.
    const { rows: after } = await db.query(
      `SELECT id, target_audio_id FROM listening_pod_sentences WHERE id = ANY($1)`, [LINES.map((l) => l.id)])
    for (const l of LINES) {
      const a = after.find((r) => r.id === l.id)
      if (!a || a.target_audio_id !== l.clip) throw new Error(`${l.id}: serving pointer changed — refusing to commit`)
    }

    if (APPLY) { await db.query('COMMIT'); log.result = 'applied' } else { await db.query('ROLLBACK'); log.result = 'dry-run (rolled back)' }
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    log.result = `aborted: ${err.message}`
    throw err
  } finally {
    await db.end()
    const out = evidencePath(`docs/pods/mark-aran-rerecords-cym-n-2026-09-13-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`${log.result} — sentences changed ${log.sentences.filter((s) => s.changed).length}/${log.sentences.length}, ` +
      `clips changed ${log.clips.filter((c) => c.changed).length}/${log.clips.length} — log: ${out}`)
  }
}

module.exports = { mergeSentenceWant, clipWant, LINES }
if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1) })
