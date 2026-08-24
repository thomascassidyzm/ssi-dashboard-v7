#!/usr/bin/env node
/**
 * Mark Catrin's three empty cym_n_for_eng:pod-0 takes of 2026-08-23 as bad in
 * PROVENANCE ONLY.
 *
 * Tom listened to all four and ruled: take 1 is a perfect read, takes 2, 3 and
 * 4 "are just not even voice recordings. They're long bits of background noise.
 * There was even a sheep in one of them."
 *
 * WHAT THIS DOES NOT DO, deliberately and by Tom's instruction:
 *   - deletes no audio and no rows;
 *   - moves no pointer — listening_pod_sentences is not touched, course_audio
 *     is not touched. A pointer-move repair is not a repair, and re-recording
 *     stays human-triggered in Popty;
 *   - triggers no re-record and no regeneration.
 *
 * WHERE THE MARK GOES. recording_provenance has no status, quality-flag or
 * rejected column (full column list checked 2026-08-23 — audio_uuid,
 * recorded_by, speaker_*, recorded_at, recording_location, recording_device,
 * recording_environment, speaker_consent, consent_form_ref, usage_rights,
 * quality_notes, retake_count, created_at, updated_at). Rather than invent a
 * column, the mark rides in the quality_notes JSON under its own `take_quality`
 * key, alongside the capture context already stored there — no existing key is
 * read, written or displaced.
 *
 *   DRY_RUN=1 node tools/recording/mark-empty-takes-2026-08-23.cjs   # default
 *   DRY_RUN=0 node tools/recording/mark-empty-takes-2026-08-23.cjs   # write
 *
 * Every row is read first and its before-state asserted; any drift aborts the
 * whole run before a single write. A per-row log lands next to this file.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = process.env.DRY_RUN !== '0'

/**
 * The three takes, with the measurement that convicts each one. Numbers from
 * tools/recording/validate-speech-gate-catrin-four.cjs, run 2026-08-23.
 */
const BAD_TAKES = [
  {
    audio_uuid: '9F2F77F2-7FCD-4C85-AB4B-C462E1D3DBE3',
    sentence_id: 'cym_n_for_eng:pod-0:SC01-S004',
    durationSec: 96.80, speechSpanSec: 96.50, syllables: 24,
    secPerSyllable: 4.02, dynamicRangeDb: 37.4,
  },
  {
    audio_uuid: '8D1F0B06-27F4-44A6-9712-2557D1CA26F2',
    sentence_id: 'cym_n_for_eng:pod-0:SC02-S001',
    durationSec: 46.65, speechSpanSec: 46.16, syllables: 14,
    secPerSyllable: 3.30, dynamicRangeDb: 19.9,
  },
  {
    audio_uuid: 'C18BD31B-8AED-4681-9C42-75595C829304',
    sentence_id: 'cym_n_for_eng:pod-0:SC02-S002',
    durationSec: 31.46, speechSpanSec: 31.45, syllables: 12,
    secPerSyllable: 2.62, dynamicRangeDb: 32.5,
  },
]

/** The good take. Read and asserted, never written — it proves the scope held. */
const GOOD_TAKE = 'EA7C2D31-6D64-4856-BB81-690F7C5EBEE7'

const MARKED_AT = '2026-08-23T16:30:00Z'

function markFor (take) {
  return {
    verdict: 'bad',
    status: 'superseded-pending-rerecord',
    reason: 'No speech in the take. The recorder captured the room between lines: '
      + `${take.durationSec}s of audio for a ${take.syllables}-syllable line, `
      + `${take.secPerSyllable}s per syllable of speech span against 0.45s on the same `
      + 'session\'s genuine read. Nobody speaks at that rate.',
    found_by: 'Tom Cassidy, by ear, 2026-08-23',
    marked_at: MARKED_AT,
    marked_by: 'recorder-empty-take-speech-gate (job #101)',
    evidence: {
      durationSec: take.durationSec,
      speechSpanSec: take.speechSpanSec,
      scriptSyllables: take.syllables,
      secPerSyllableOfSpeechSpan: take.secPerSyllable,
      dynamicRangeDb: take.dynamicRangeDb,
      note: 'Dynamic range 20-37 dB against 62.7 dB on the good take, and a noise '
        + 'floor 23-39 dB hotter — the signature of automatic gain control '
        + 'lifting an empty room to voice level (capture:voice profile, '
        + 'confirmed in this row\'s own recording_device string).',
      gate: 'services/recording-speech-gate.cjs — would now refuse this take at save time',
    },
    action_taken: 'Provenance mark only. No audio deleted, no pointer moved, '
      + 'no re-record or regeneration triggered. Re-recording stays human-triggered.',
  }
}

;(async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required')
  const db = createClient(url, key)

  const log = []
  const planned = []

  // ── Read and assert every row BEFORE any write ────────────────────────────
  for (const take of BAD_TAKES) {
    const { data, error } = await db
      .from('recording_provenance')
      .select('audio_uuid, quality_notes, recorded_at')
      .eq('audio_uuid', take.audio_uuid)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`ABORT: no recording_provenance row for ${take.audio_uuid}`)

    let notes
    try {
      notes = typeof data.quality_notes === 'string' ? JSON.parse(data.quality_notes) : (data.quality_notes || {})
    } catch (e) {
      throw new Error(`ABORT: quality_notes for ${take.audio_uuid} is not JSON — refusing to overwrite it`)
    }

    // Before-state assertions. Any drift and nothing at all is written.
    if (notes.sentence_id !== take.sentence_id) {
      throw new Error(`ABORT: ${take.audio_uuid} sentence_id is ${notes.sentence_id}, expected ${take.sentence_id}`)
    }
    if (notes.take_quality) {
      console.log(`SKIP ${take.audio_uuid} — already carries take_quality (${notes.take_quality.status})`)
      continue
    }

    planned.push({
      audio_uuid: take.audio_uuid,
      sentence_id: take.sentence_id,
      before_keys: Object.keys(notes).sort(),
      quality_notes: { ...notes, take_quality: markFor(take) },
    })
  }

  // The good take must be untouched and unmarked. Asserted, not assumed.
  const { data: good, error: goodErr } = await db
    .from('recording_provenance')
    .select('audio_uuid, quality_notes')
    .eq('audio_uuid', GOOD_TAKE)
    .maybeSingle()
  if (goodErr) throw goodErr
  if (!good) throw new Error(`ABORT: the good take ${GOOD_TAKE} has no provenance row`)
  const goodNotes = typeof good.quality_notes === 'string' ? JSON.parse(good.quality_notes) : (good.quality_notes || {})
  if (goodNotes.take_quality) throw new Error(`ABORT: the GOOD take ${GOOD_TAKE} carries a take_quality mark — scope has been violated`)
  console.log(`Good take ${GOOD_TAKE}: unmarked, untouched ✅`)

  // ── Write ─────────────────────────────────────────────────────────────────
  for (const p of planned) {
    if (DRY_RUN) {
      console.log(`DRY RUN would mark ${p.audio_uuid} (${p.sentence_id})`)
      console.log('   keys before:', p.before_keys.join(', '))
      console.log('   adding take_quality:', JSON.stringify(p.quality_notes.take_quality).slice(0, 160) + '…')
      log.push({ ...p, applied: false })
      continue
    }
    const { error } = await db
      .from('recording_provenance')
      .update({ quality_notes: p.quality_notes })
      .eq('audio_uuid', p.audio_uuid)
    if (error) throw error

    // Read back — a write that did not land is worse than no write.
    const { data: after, error: afterErr } = await db
      .from('recording_provenance')
      .select('quality_notes')
      .eq('audio_uuid', p.audio_uuid)
      .maybeSingle()
    if (afterErr) throw afterErr
    const n = typeof after.quality_notes === 'string' ? JSON.parse(after.quality_notes) : after.quality_notes
    if (n.take_quality?.status !== 'superseded-pending-rerecord') {
      throw new Error(`ABORT: mark did not land on ${p.audio_uuid}`)
    }
    const keysAfter = Object.keys(n).sort().filter(k => k !== 'take_quality')
    if (keysAfter.join('|') !== p.before_keys.join('|')) {
      throw new Error(`ABORT: ${p.audio_uuid} lost or gained a quality_notes key — before [${p.before_keys}] after [${keysAfter}]`)
    }
    console.log(`MARKED ${p.audio_uuid} (${p.sentence_id}) ✅ — every other key intact`)
    log.push({ ...p, applied: true })
  }

  const out = path.join(__dirname, `mark-empty-takes-2026-08-23-${DRY_RUN ? 'dryrun' : 'applied'}-log.json`)
  fs.writeFileSync(out, JSON.stringify({ dryRun: DRY_RUN, markedAt: MARKED_AT, rows: log }, null, 2))
  console.log(`\n${planned.length} row(s) ${DRY_RUN ? 'planned' : 'marked'}. Log: ${out}`)
  console.log('course_audio and listening_pod_sentences: NOT TOUCHED.')
})().catch((e) => { console.error(String(e.message || e)); process.exit(1) })
