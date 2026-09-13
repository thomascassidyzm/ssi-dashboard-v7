#!/usr/bin/env node
/**
 * Mark every Aran take attached to cym_n_for_eng:pod-0 (Welsh north Pod 1) as
 * bad-for-rerecord in PROVENANCE ONLY.
 *
 * Tom listened to them on 2026-08-23 and ruled:
 *
 *   "Aran's are all junk. All clipped badly at either or both ends"
 *
 * and, when asked whether any were worth keeping:
 *
 *   "None are salvageable. It's not even worth looking. We have a better
 *    process now. Let's be sure this time though."
 *
 * THE REASON RECORDED ON EVERY ROW IS THAT RULING, NOT A MEASUREMENT. No
 * per-clip audit was run and none should be read into these marks. A boundary
 * measurement WAS taken on eighteen of the clips while building the gate that
 * now catches this defect (services/recording-speech-gate.cjs,
 * checkTakeBoundaries) and it agrees with him — lead margins of 0.00-0.08 s
 * against 0.35 s on the read he called perfect — but that sample is corroboration
 * of his ear, not the basis of the mark, and the mark says so on each row.
 *
 * WHAT THIS DOES NOT DO, deliberately and by Tom's instruction, carried
 * unchanged from tools/recording/mark-empty-takes-2026-08-23.cjs:
 *   - deletes no audio and no rows;
 *   - moves no pointer — listening_pod_sentences is not touched, course_audio
 *     is not touched;
 *   - triggers no re-record and no regeneration. In particular
 *     listening_pod_sentences.rerecord_wanted is NOT written here.
 *
 * WHERE THE MARK GOES: quality_notes.take_quality, the same key and the same
 * shape as the Catrin marks, so both sets read alike.
 *
 * TWO DEVIATIONS FROM THE CATRIN PRECEDENT, both flagged in the run summary:
 *
 *  1. THE JOIN. recording_provenance.audio_uuid is the take's S3-KEY uuid
 *     (mastered/{UUID}.mp3), which for these clips is NOT course_audio.id —
 *     e.g. course_audio 09BA841F-… is served from mastered/57AF73F2-….mp3. A
 *     join on upper(course_audio.id) finds zero rows and reports, wrongly, that
 *     Aran has no provenance at all. He has 92 of the 100.
 *
 *  2. EIGHT INSERTS. Eight attached clips genuinely have no provenance row, so
 *     for those this CREATES one rather than updating it — a different act on a
 *     table that is otherwise only ever appended to by the recorder. Those rows
 *     are minimal and every field in them is evidenced: recorded_at from the
 *     clip's own course_audio.created_at, recorded_by from the address the
 *     other 92 rows of the same sessions carry.
 *
 *   DRY_RUN=1 node tools/recording/mark-aran-clipped-takes-2026-08-23.cjs   # default
 *   DRY_RUN=0 node tools/recording/mark-aran-clipped-takes-2026-08-23.cjs   # write
 *
 * Every row is read first and its before-state asserted; any drift aborts the
 * whole run before a single write. A per-row log lands next to this file.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = process.env.DRY_RUN !== '0'
const POD_ID = 'cym_n_for_eng:pod-0'
const MARKED_AT = '2026-08-23T17:15:00Z'

/**
 * The address on the other 92 provenance rows from Aran's own sessions, used
 * for the eight inserts. Evidenced, not invented — if it ever stops matching,
 * the assertion below aborts rather than filing a take under a guess.
 */
const ARAN_RECORDED_BY = 'aran@hey.com'

const chunk = (a, n) => a.reduce((r, v, i) => (i % n ? r[r.length - 1].push(v) : r.push([v]), r), [])

function markFor (clip) {
  return {
    verdict: 'bad',
    status: 'superseded-pending-rerecord',
    reason: 'Clipped at the boundary. Tom listened to the Welsh north Pod 1 '
      + 'recordings on 2026-08-23 and ruled: "Aran\'s are all junk. All clipped '
      + 'badly at either or both ends" — and, on whether to salvage any: "None '
      + 'are salvageable. It\'s not even worth looking."',
    found_by: 'Tom Cassidy, by ear, 2026-08-23',
    marked_at: MARKED_AT,
    marked_by: 'mark-aran-clipped-takes-2026-08-23 (boundary-truncation job)',
    evidence: {
      basis: 'Tom\'s ear. NO per-clip measurement was made for this mark and none '
        + 'should be read into it — the ruling was course-wide for this recordist '
        + 'and the marking is wholesale.',
      corroboration: 'A boundary measurement taken on 18 of these clips while '
        + 'building the gate found lead margins of 0.00-0.08s and tail margins of '
        + '0.015-0.264s, against 0.35s / 0.41s on the Catrin take Tom called '
        + 'perfect. Every one of Aran\'s takes predates the 2026-08-21 trim-margin '
        + 'fix (5102c0780) and went through the old flush cut.',
      recorded_on: clip.created_at,
      pod_sentence_id: clip.sentence_id,
      pod_side: clip.side,
      voice_id: clip.voice,
      gate: 'services/recording-speech-gate.cjs, checkTakeBoundaries — would now '
        + 'refuse this take at save time',
    },
    action_taken: 'Provenance mark only. No audio deleted, no pointer moved, '
      + 'no re-record or regeneration triggered. rerecord_wanted not written.',
  }
}

;(async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required')
  const db = createClient(url, key)

  // ── Derive the scope live. Never from a cached list. ──────────────────────
  const { data: pod, error: podErr } = await db
    .from('listening_pod_sentences')
    .select('id, target_audio_id, known_audio_id')
    .eq('pod_id', POD_ID)
  if (podErr) throw podErr
  console.log(`${POD_ID}: ${pod.length} sentence rows`)

  const ids = [...new Set(pod.flatMap(r => [r.target_audio_id, r.known_audio_id]).filter(Boolean))]
  const audio = {}
  for (const c of chunk(ids, 150)) {
    const { data, error } = await db.from('course_audio')
      .select('id, voice_id, created_at, text, s3_key').in('id', c)
    if (error) throw error
    for (const a of data) audio[a.id] = a
  }

  /** Every Aran clip the pod points at, on either side, keyed by S3-key uuid. */
  const clips = []
  const seen = new Set()
  for (const r of pod) {
    for (const [side, id] of [['target', r.target_audio_id], ['known', r.known_audio_id]]) {
      const a = id && audio[id]
      if (!a || !/^human_aran/.test(a.voice_id)) continue
      if (!a.s3_key || !a.s3_key.startsWith('mastered/')) {
        throw new Error(`ABORT: ${a.id} has an unexpected s3_key (${a.s3_key}) — cannot derive its provenance key`)
      }
      const uuid = a.s3_key.replace('mastered/', '').replace(/\.mp3$/, '').toUpperCase()
      if (seen.has(uuid)) continue
      seen.add(uuid)
      clips.push({ audio_uuid: uuid, course_audio_id: a.id, voice: a.voice_id, side,
        sentence_id: r.id, created_at: a.created_at, text: a.text })
    }
  }
  const byVoice = {}
  for (const c of clips) byVoice[c.voice] = (byVoice[c.voice] || 0) + 1
  console.log(`Aran clips attached to the pod: ${clips.length} — ${JSON.stringify(byVoice)}`)

  // ── Read and assert every row BEFORE any write ────────────────────────────
  const existing = {}
  for (const c of chunk(clips.map(x => x.audio_uuid), 100)) {
    const { data, error } = await db.from('recording_provenance')
      .select('audio_uuid, recorded_by, recorded_at, quality_notes').in('audio_uuid', c)
    if (error) throw error
    for (const p of data) existing[p.audio_uuid] = p
  }

  const updates = []
  const inserts = []
  let alreadyMarked = 0

  for (const c of clips) {
    const row = existing[c.audio_uuid]
    if (!row) {
      inserts.push({
        audio_uuid: c.audio_uuid,
        recorded_by: ARAN_RECORDED_BY,
        recorded_at: c.created_at,
        quality_notes: {
          sentence_id: c.sentence_id,
          text: c.text,
          note: 'Row CREATED by mark-aran-clipped-takes-2026-08-23 because the take '
            + 'had no provenance row. Only the fields evidenced from course_audio '
            + 'are set; nothing about the capture itself is claimed.',
          take_quality: markFor(c),
        },
        _clip: c,
      })
      continue
    }
    let notes
    try {
      notes = typeof row.quality_notes === 'string' ? JSON.parse(row.quality_notes) : (row.quality_notes || {})
    } catch (e) {
      throw new Error(`ABORT: quality_notes for ${c.audio_uuid} is not JSON — refusing to overwrite it`)
    }
    if (notes.take_quality) { alreadyMarked++; continue }
    updates.push({
      audio_uuid: c.audio_uuid,
      sentence_id: c.sentence_id,
      before_keys: Object.keys(notes).sort(),
      recorded_by: row.recorded_by,
      quality_notes: { ...notes, take_quality: markFor(c) },
    })
  }

  // The address the inserts will file under must be one the existing rows of
  // these very sessions actually carry. Asserted, not assumed.
  const addresses = [...new Set(Object.values(existing).map(r => r.recorded_by))]
  if (inserts.length && !addresses.includes(ARAN_RECORDED_BY)) {
    throw new Error(`ABORT: ${ARAN_RECORDED_BY} appears on none of the ${addresses.length} existing rows (${addresses.join(', ')}) — refusing to file takes under an unevidenced identity`)
  }

  // Scope assertion: Catrin's takes on this pod must be untouched by this run.
  const catrinTouched = clips.filter(c => /catrin/i.test(c.voice))
  if (catrinTouched.length) throw new Error(`ABORT: ${catrinTouched.length} non-Aran clip(s) in scope — scope has been violated`)

  console.log(`\nPlan: ${updates.length} update(s), ${inserts.length} insert(s), ${alreadyMarked} already marked.`)
  console.log(`Provenance keys on recorded_by: ${JSON.stringify(addresses)}`)

  const log = { dryRun: DRY_RUN, markedAt: MARKED_AT, podId: POD_ID,
    clipsInScope: clips.length, byVoice, updates: [], inserts: [], alreadyMarked }

  // ── Write ─────────────────────────────────────────────────────────────────
  for (const u of updates) {
    if (DRY_RUN) {
      console.log(`DRY RUN would MARK ${u.audio_uuid} (${u.sentence_id}) — keys before: ${u.before_keys.join(', ')}`)
      log.updates.push({ ...u, applied: false })
      continue
    }
    const { error } = await db.from('recording_provenance')
      .update({ quality_notes: u.quality_notes }).eq('audio_uuid', u.audio_uuid)
    if (error) throw error
    const { data: after, error: aErr } = await db.from('recording_provenance')
      .select('quality_notes').eq('audio_uuid', u.audio_uuid).maybeSingle()
    if (aErr) throw aErr
    const n = typeof after.quality_notes === 'string' ? JSON.parse(after.quality_notes) : after.quality_notes
    if (n.take_quality?.status !== 'superseded-pending-rerecord') throw new Error(`ABORT: mark did not land on ${u.audio_uuid}`)
    const keysAfter = Object.keys(n).sort().filter(k => k !== 'take_quality')
    if (keysAfter.join('|') !== u.before_keys.join('|')) {
      throw new Error(`ABORT: ${u.audio_uuid} lost or gained a quality_notes key — before [${u.before_keys}] after [${keysAfter}]`)
    }
    console.log(`MARKED ${u.audio_uuid} (${u.sentence_id}) ✅`)
    log.updates.push({ ...u, applied: true })
  }

  for (const i of inserts) {
    const { _clip, ...row } = i
    if (DRY_RUN) {
      console.log(`DRY RUN would CREATE provenance for ${row.audio_uuid} (${_clip.sentence_id}) recorded_by=${row.recorded_by} recorded_at=${row.recorded_at}`)
      log.inserts.push({ ...row, applied: false })
      continue
    }
    const { error } = await db.from('recording_provenance').insert(row)
    if (error) throw error
    const { data: after, error: aErr } = await db.from('recording_provenance')
      .select('audio_uuid, quality_notes').eq('audio_uuid', row.audio_uuid).maybeSingle()
    if (aErr) throw aErr
    // The column hands back a STRING on a freshly inserted row where the update
    // path gets an object. Parse either shape rather than reading a landed write
    // as a failure — measured 2026-08-23, and it aborted a run mid-way.
    const n = after && (typeof after.quality_notes === 'string' ? JSON.parse(after.quality_notes) : after.quality_notes)
    if (!n || n.take_quality?.status !== 'superseded-pending-rerecord') {
      throw new Error(`ABORT: insert did not land for ${row.audio_uuid}`)
    }
    console.log(`CREATED ${row.audio_uuid} (${_clip.sentence_id}) ✅`)
    log.inserts.push({ ...row, applied: true })
  }

  const out = path.join(__dirname, `mark-aran-clipped-takes-2026-08-23-${DRY_RUN ? 'dryrun' : 'applied'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\n${updates.length + inserts.length} row(s) ${DRY_RUN ? 'planned' : 'written'}. Log: ${out}`)
  console.log('course_audio, listening_pod_sentences and rerecord_wanted: NOT TOUCHED.')
})().catch((e) => { console.error(String(e.message || e)); process.exit(1) })
