#!/usr/bin/env node
/**
 * mark-splice-refusals-cym-n-2026-09-13.cjs — mark the 36 cym_n pod-1 turns the
 * per-sentence splicer still refuses AFTER blip healing (job #599) as wants for
 * a booth re-record, using the estate's EXISTING want lever and nothing else.
 *
 * Tom, 2026-09-13 21:40Z: heal sub-ms blips inside a pause, re-run on the 39
 * refused turns, and anything still refused goes to the booth as a
 * per-sentence re-record. After healing 3 turns split (orders 6, 67, 73); 35
 * stay refused by the gates, and order 4 is refused BY HAND: the gates accept
 * its cut, but the listening leg (whisper, Welsh forced) shows piece 2 carrying
 * two sentences and piece 3 a 0.2 s breath — a bad split is worse than no
 * split. Each line's reason below carries the splicer's own numbers.
 *
 * WHOSE VOICE. The brief says "to Aran", and 15 of the 36 are Aran's takes. The
 * other 21 are Catrin Lliar's. A re-record want names the voice that RECORDED
 * the line (rerecord_wanted.target = the serving clip's voice_id), so Catrin's
 * lines are marked to Catrin: marking them to Aran would be a voice swap, which
 * is a casting decision and not this tool's to make.
 *
 * THE LEVER — same as tools/pods/mark-aran-rerecords-cym-n-2026-09-13.cjs (#590):
 *   - listening_pod_sentences.rerecord_wanted {target: <voiceId>} — read by
 *     recordist-queue.cjs and pods-plan.cjs for the voice id only;
 *   - course_audio.rerecord_wanted {reason, marked_at, marked_by, voice_gender}
 *     — the clip's flag; its `reason` is what the booth shows. An existing
 *     clip want is a fact to keep and is never overwritten (three of these
 *     clips already carry Tom's "clipped at the boundary" ruling); the splice
 *     reason then lives only on the sentence flag under `splice_refusal`.
 * Both are retired automatically when the new take lands. A want is a mark,
 * never a reason to serve a recorded line again (Tom, 2026-09-11): nothing is
 * deleted, unlinked or silenced, and every line keeps serving its current
 * bytes until a new take is stored and swapped in.
 *
 *   node tools/pods/mark-splice-refusals-cym-n-2026-09-13.cjs            # dry run
 *   APPLY=1 node tools/pods/mark-splice-refusals-cym-n-2026-09-13.cjs    # write
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')
const APPLY = process.env.APPLY === '1'
const COURSE = 'cym_n_for_eng'
const POD = 'cym_n_for_eng:pod-1'
const MARKED_BY = 'job #599 (conv 59deaa7e-7e50-41c0-b66d-c0d8eed08071)'
const VOICE_GENDER = { human_aran_cym_n: 'm', human_catrinlliar_cym_n: 'f' }
// order → { id, serving clip, voice that recorded it, the splicer's reason }
const LINES = [
  { order: 4, id: "cym_n_for_eng:pod-1:SC01-S004", clip: "91df1b05-332e-484b-8d5d-cf730caafec7", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 gates accept a cut but the listening leg (whisper, Welsh forced) proves it wrong: piece 2 carries both 'Gobeithio\u2026 cei di ddiwrnod da.' and 'Wela i di wedyn.', piece 3 is a 0.2 s breath; no detectable pause between 'da.' and 'Wela'. Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 21, id: "cym_n_for_eng:pod-1:SC04-S002", clip: "91f9e7aa-75f7-4e58-8c70-ad6411d9b32f", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 6 pause cues, the take has 5 detectable pauses >=100 ms at -35 dB (gaps ms [574, 262, 520, 111, 766]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 22, id: "cym_n_for_eng:pod-1:SC04-S003", clip: "431b80dd-76d1-48f5-9dd0-baa5206ca3ac", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 seam_not_silent: the cut would land on sound (-32 dB at the seam; gaps ms [183, 136, 167]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 24, id: "cym_n_for_eng:pod-1:SC05-S002", clip: "66287643-4c8f-47f9-9aa7-4c8424af1309", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 margin_below_floor: sentence pauses not distinct from comma pauses (margin 1.2, floor 1.5; gaps ms [366, 686, 125, 7407, 477, 493, 148, 732, 594]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 29, id: "cym_n_for_eng:pod-1:SC06-S005", clip: "4fd3603e-659a-4108-9b11-e404d8bee5fc", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [195]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 34, id: "cym_n_for_eng:pod-1:SC06-S010", clip: "4567c511-c36d-4677-89ad-8edd24b0eb7a", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 5 pause cues, the take has 4 detectable pauses >=100 ms at -35 dB (gaps ms [390, 494, 728, 715]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 35, id: "cym_n_for_eng:pod-1:SC06-S011", clip: "52892b49-30d9-46f9-85e9-d1ca9d157b58", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 6 pause cues, the take has 4 detectable pauses >=100 ms at -35 dB (gaps ms [189, 507, 267, 182]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 41, id: "cym_n_for_eng:pod-1:SC07-S004", clip: "cb6d8ee4-5c20-4c37-9530-5d856d0d5139", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 0 detectable pauses >=100 ms at -35 dB (gaps ms []). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 48, id: "cym_n_for_eng:pod-1:SC07-S011", clip: "29fda3d6-4f62-40af-8b59-ed20841617bd", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [142]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 50, id: "cym_n_for_eng:pod-1:SC07-S013", clip: "9a383a03-fc26-4096-b02e-81e0e557b6a5", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [258]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 51, id: "cym_n_for_eng:pod-1:SC07-S014", clip: "ac81070c-71bc-4159-9292-e7ba5801a405", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [421]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 54, id: "cym_n_for_eng:pod-1:SC08-S002", clip: "3fbc3e6c-9ed9-4988-913e-b0adf0b0180a", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 2 detectable pauses >=100 ms at -35 dB (gaps ms [774, 129]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 64, id: "cym_n_for_eng:pod-1:SC08-S012", clip: "9425bac0-1a99-4399-b4ff-bd01c6bdad58", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [411]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 65, id: "cym_n_for_eng:pod-1:SC08-S013", clip: "d595675f-e34f-4a12-b156-81e2f563cbbf", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 2 detectable pauses >=100 ms at -35 dB (gaps ms [230, 374]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 66, id: "cym_n_for_eng:pod-1:SC08-S014", clip: "6c796c7f-9e7c-4f8b-95cc-e80c012acba0", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [317]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 70, id: "cym_n_for_eng:pod-1:SC09-S002", clip: "7f3c3fff-ebba-4609-8a48-15f6831a0ef7", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 2 detectable pauses >=100 ms at -35 dB (gaps ms [391, 370]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 74, id: "cym_n_for_eng:pod-1:SC09-S006", clip: "f070f10f-a04c-4437-9230-a0bd44b95048", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 5 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [425]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 76, id: "cym_n_for_eng:pod-1:SC09-S008", clip: "09ba841f-2fbb-459c-aa2a-ea418a4f4de4", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [437]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 77, id: "cym_n_for_eng:pod-1:SC09-S009", clip: "b4cae34c-44d8-44af-8162-f96dde92d148", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [634]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 78, id: "cym_n_for_eng:pod-1:SC09-S010", clip: "06643e05-526b-489f-99a0-2b2d79c8ba07", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [467]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 79, id: "cym_n_for_eng:pod-1:SC09-S011", clip: "167d5c79-4304-4690-905a-80dfc7aa0858", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [444]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 84, id: "cym_n_for_eng:pod-1:SC09-S016", clip: "83ed4e8a-8136-44c3-8d0a-5c3b3bc786e3", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [577]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 85, id: "cym_n_for_eng:pod-1:SC09-S017", clip: "8f3eed5c-af9f-481e-a4c3-2488bdeebc53", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [628]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 87, id: "cym_n_for_eng:pod-1:SC10-S001", clip: "dc1012d0-5f9f-4e7b-aa73-1e4aefbeeb0c", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 margin_below_floor: sentence pauses not distinct from comma pauses (margin 1.03, floor 1.5; gaps ms [111, 354, 106, 114]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 89, id: "cym_n_for_eng:pod-1:SC10-S003", clip: "256d102b-56f4-4bd2-b1e4-7ac93dc74110", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [702]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 96, id: "cym_n_for_eng:pod-1:SC10-S010", clip: "3c090ca7-4ca3-4b38-86a6-0d7dc4d79f1f", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 seam_not_silent: the cut would land on sound (-23.4 dB at the seam; gaps ms [394, 587, 688, 365]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 97, id: "cym_n_for_eng:pod-1:SC11-S001", clip: "7e903050-d40a-4e1d-9c85-028b8da78a0b", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [399]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 98, id: "cym_n_for_eng:pod-1:SC11-S002", clip: "e695e6f0-4f2e-40bc-84ae-4cf99879e764", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 5 pause cues, the take has 3 detectable pauses >=100 ms at -35 dB (gaps ms [491, 115, 660]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 100, id: "cym_n_for_eng:pod-1:SC11-S004", clip: "e49bf0be-5bff-4f7d-a3d9-3421e3a3f9ad", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 2 detectable pauses >=100 ms at -35 dB (gaps ms [399, 343]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 108, id: "cym_n_for_eng:pod-1:SC11-S012", clip: "5d26cbcd-cd28-4d37-bd86-ac1c94acd0f6", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [500]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 110, id: "cym_n_for_eng:pod-1:SC12-S001", clip: "4b26834a-7b4c-434e-a18f-cccc0e10ff7f", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 2 detectable pauses >=100 ms at -35 dB (gaps ms [321, 450]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 118, id: "cym_n_for_eng:pod-1:SC12-S009", clip: "51af02e5-0399-4e9d-8599-9758d21914d8", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [714]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 121, id: "cym_n_for_eng:pod-1:SC13-S002", clip: "1f3bea80-3c5c-49eb-a3d2-e9f0b0b77da4", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 4 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [460]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 127, id: "cym_n_for_eng:pod-1:SC13-S008", clip: "224cc7ac-9452-4dc6-ab00-6569efb91925", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [554]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 131, id: "cym_n_for_eng:pod-1:SC14-S001", clip: "4bf4c004-b03d-492d-9fe7-57c19fd8805a", voice: "human_aran_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 3 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [137]). Re-record as ONE take, leaving a clear pause between sentences." },
  { order: 137, id: "cym_n_for_eng:pod-1:SC14-S007", clip: "98e5fbdb-98bf-40af-886f-124c5f3d8565", voice: "human_catrinlliar_cym_n",
    reason: "job #599 (2026-09-13): per-sentence splice refused after blip healing \u2014 too_few_gaps: text has 2 pause cues, the take has 1 detectable pauses >=100 ms at -35 dB (gaps ms [482]). Re-record as ONE take, leaving a clear pause between sentences." }
]

/**
 * Pure: the sentence want after marking the TARGET track for `voice`. Other
 * keys survive. `reason` is set only when the row has none; otherwise the
 * splice reason goes under `splice_refusal` so nothing already written is
 * lost. A row already naming this voice on `target` AND carrying this reason
 * comes back unchanged (idempotent).
 */
function mergeSentenceWant(existing, voice, reason) {
  const cur = existing && typeof existing === 'object' ? existing : {}
  const next = { ...cur, target: voice }
  if (!next.reason) next.reason = reason
  else if (next.reason !== reason && next.splice_refusal !== reason) next.splice_refusal = reason
  const changed = JSON.stringify(next) !== JSON.stringify(cur)
  return { next: changed ? next : cur, changed }
}

/** Pure: the clip want. An existing want is a fact to keep, never overwritten. */
function clipWant(existing, reason, gender, now) {
  if (existing && typeof existing === 'object') return { next: existing, changed: false }
  return { next: { reason, marked_at: now, marked_by: MARKED_BY, voice_gender: gender }, changed: true }
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const p = path.join(__dirname, '../../.env.psql')
  const m = fs.existsSync(p) && fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m)
  if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  throw new Error('DATABASE_URL not found (.env.psql)')
}

async function main() {
  const db = new Client({ connectionString: loadDatabaseUrl() })
  await db.connect()
  const now = new Date().toISOString()
  const log = { ran: now, apply: APPLY, course: COURSE, pod: POD, marked_by: MARKED_BY, sentences: [], clips: [] }
  try {
    await db.query('BEGIN')
    // BEFORE-STATE: every line is a live line of this pod, still whole-turn
    // (no sentence_audio_ids), serving the clip we expect, under the voice we
    // expect. Drift aborts the whole transaction.
    const { rows: sents } = await db.query(
      `SELECT s.id, s.global_order, s.target_text, s.target_audio_id, s.sentence_audio_ids, s.rerecord_wanted, s.speaker, p.visibility
         FROM listening_pod_sentences s JOIN listening_pods p ON p.id = s.pod_id
        WHERE s.pod_id = $1 AND s.id = ANY($2)`, [POD, LINES.map((l) => l.id)])
    if (sents.length !== LINES.length) throw new Error(`expected ${LINES.length} sentences, found ${sents.length}`)
    const clipIds = [...new Set(LINES.map((l) => l.clip))]
    const { rows: clips } = await db.query(
      `SELECT id, voice_id, origin, text, rerecord_wanted FROM course_audio WHERE id = ANY($1::uuid[])`, [clipIds])
    if (clips.length !== clipIds.length) throw new Error(`expected ${clipIds.length} clips, found ${clips.length}`)
    const clipById = new Map(clips.map((c) => [c.id, c]))
    for (const l of LINES) {
      const s = sents.find((r) => r.id === l.id)
      if (!s) throw new Error(`${l.id} missing`)
      if (s.visibility !== 'live') throw new Error(`${l.id}: pod is ${s.visibility}, expected live`)
      if (Number(s.global_order) !== l.order) throw new Error(`${l.id}: order ${s.global_order}, expected ${l.order}`)
      if (s.sentence_audio_ids && s.sentence_audio_ids.length) throw new Error(`${l.id}: already split (${s.sentence_audio_ids.length} pieces) — not a refusal any more`)
      if (s.target_audio_id !== l.clip) throw new Error(`${l.id}: serving ${s.target_audio_id}, expected ${l.clip} — drift, aborting`)
      const c = clipById.get(l.clip)
      if (c.voice_id !== l.voice) throw new Error(`${l.clip}: voice_id ${c.voice_id}, expected ${l.voice}`)
      if (!VOICE_GENDER[l.voice]) throw new Error(`${l.voice}: no voice_gender known`)
    }
    for (const l of LINES) {
      const s = sents.find((r) => r.id === l.id)
      const { next, changed } = mergeSentenceWant(s.rerecord_wanted, l.voice, l.reason)
      log.sentences.push({ id: l.id, order: l.order, speaker: s.speaker, text: s.target_text, voice: l.voice, before: s.rerecord_wanted, after: next, changed })
      if (!changed) continue
      const r = await db.query(
        `UPDATE listening_pod_sentences SET rerecord_wanted = $2::jsonb
          WHERE id = $1 AND rerecord_wanted IS NOT DISTINCT FROM $3::jsonb`,
        [l.id, JSON.stringify(next), s.rerecord_wanted === null ? null : JSON.stringify(s.rerecord_wanted)])
      if (r.rowCount !== 1) throw new Error(`${l.id}: before-state moved under us (rowCount ${r.rowCount})`)
    }
    for (const l of LINES) {
      const c = clipById.get(l.clip)
      const { next, changed } = clipWant(c.rerecord_wanted, l.reason, VOICE_GENDER[l.voice], now)
      log.clips.push({ id: l.clip, order: l.order, voice_id: c.voice_id, text: c.text, before: c.rerecord_wanted, after: next, changed })
      if (!changed) continue
      const r = await db.query(
        `UPDATE course_audio SET rerecord_wanted = $2::jsonb WHERE id = $1 AND rerecord_wanted IS NULL`,
        [l.clip, JSON.stringify(next)])
      if (r.rowCount !== 1) throw new Error(`${l.clip}: before-state moved under us (rowCount ${r.rowCount})`)
    }
    // AFTER-STATE: no serving pointer moved.
    const { rows: after } = await db.query(
      `SELECT id, target_audio_id, sentence_audio_ids FROM listening_pod_sentences WHERE id = ANY($1)`, [LINES.map((l) => l.id)])
    for (const l of LINES) {
      const a = after.find((r) => r.id === l.id)
      if (!a || a.target_audio_id !== l.clip || (a.sentence_audio_ids && a.sentence_audio_ids.length)) throw new Error(`${l.id}: serving state changed — refusing to commit`)
    }
    if (APPLY) { await db.query('COMMIT'); log.result = 'applied' } else { await db.query('ROLLBACK'); log.result = 'dry-run (rolled back)' }
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    log.result = `aborted: ${err.message}`
    throw err
  } finally {
    await db.end()
    const out = evidencePath(`docs/pods/mark-splice-refusals-cym-n-2026-09-13-${APPLY ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`${log.result} — sentences changed ${log.sentences.filter((s) => s.changed).length}/${log.sentences.length}, ` +
      `clips changed ${log.clips.filter((c) => c.changed).length}/${log.clips.length} — log: ${out}`)
  }
}

module.exports = { mergeSentenceWant, clipWant, LINES, VOICE_GENDER }
if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1) })
