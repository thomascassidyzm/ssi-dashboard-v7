#!/usr/bin/env node
/**
 * t21-sal-gender-note.cjs — put the "not reliably gendered" ruling into the
 * estate's actual gender store, `voices`.
 *
 * WHY THIS EXISTS. T-21 ruled `sal` NOT RELIABLY GENDERED: the cast metadata
 * calls it both f and m, and the acoustic measurement put it at 140.4 Hz median
 * with an IQR (111-186 Hz) straddling the boundary. The catalogue
 * (tools/pod-voices-xai.json) now says so and tools/pod-voice-coverage.cjs
 * refuses it a gendered seat — but `voices` is where the estate reads gender
 * from, and anyone querying that table directly still sees a bare `m`.
 *
 * WHY IT DOES NOT NULL THE GENDER. Two reasons, and they point the same way.
 * (1) `voices.gender` holds the PROVIDER's own word (Tom 2026-08-11) — xAI's
 *     API really does answer 'm' for sal, and erasing that would be falsifying
 *     the record of what the provider said, not correcting it.
 * (2) `voices_gender_check` constrains the column to exactly 'f' or 'm', so the
 *     table cannot express "unknown" at all except as NULL — and NULL there
 *     already means "the provider stated nothing", which is a different fact.
 * So the provider's word stands, and the ruling goes in `notes`, where the
 * refusal is discoverable by anyone reading the row.
 *
 * WHAT IT WRITES. Exactly one column of exactly one row: voices.notes for
 * voice_id 'sal'. No gender is changed anywhere. No clip is touched. No TTS.
 *
 * Gated: dry-run by default; --apply to write. Per-row before-state assertions
 * abort on ANY drift; the row is re-read afterwards and reconciled against the
 * log. Logs to docs/pods/t21-sal-gender-note-{dryrun,applied}-log.json.
 *
 * Run:  node tools/t21-sal-gender-note.cjs           # dry run
 *       node tools/t21-sal-gender-note.cjs --apply   # write
 */

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { createClient } = require('@supabase/supabase-js')

const APPLY = process.argv.includes('--apply')
const VOICE_ID = 'sal'

const NOTE = [
  'NOT RELIABLY GENDERED (T-21, 2026-08-17).',
  "The gender column above is xAI's own stated word and is left standing as such,",
  'but it must not be relied on: the estate cast metadata calls sal both f and m,',
  'and the T-21 acoustic measurement put it at 140.4 Hz median with an IQR of',
  '111-186 Hz straddling the f/m boundary. This is a property of the voice, not a',
  'label defect. sal must never fill a gendered pod seat; tools/pod-voice-coverage.cjs',
  'enforces that via UNRELIABLE_GENDER, which deliberately overrides this column.',
  'Evidence: docs/pods/t21-voice-gender-forensics-2026-08-17.md.',
].join(' ')

// The state this run is written against. Anything else and we abort rather than
// write over a row somebody else has moved.
const EXPECTED = {
  voice_id: 'sal',
  type: 'tts',
  tts_engine: 'xai',
  display_name: 'Sal',
  gender: 'm',
}

const db = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
)

const COLUMNS = 'voice_id,type,tts_engine,tts_voice_name,display_name,gender,notes,metadata_source,updated_at'

async function readRow() {
  const { data, error } = await db.from('voices').select(COLUMNS).eq('voice_id', VOICE_ID).maybeSingle()
  if (error) throw new Error(`read voices/${VOICE_ID}: ${error.message}`)
  return data
}

function writeLog(name, payload) {
  const dir = path.resolve(__dirname, '../docs/pods')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, name)
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n')
  return file
}

async function run() {
  console.log(`t21-sal-gender-note ${APPLY ? '(APPLY)' : '(DRY RUN)'} — voices.notes for '${VOICE_ID}'`)

  const before = await readRow()
  if (!before) throw new Error(`abort: no voices row for '${VOICE_ID}'`)

  // ---- before-state assertions: abort on ANY drift -------------------------
  const drift = Object.entries(EXPECTED)
    .filter(([k, v]) => before[k] !== v)
    .map(([k, v]) => `${k}: expected ${JSON.stringify(v)}, found ${JSON.stringify(before[k])}`)
  if (drift.length) {
    throw new Error(`abort on drift — the row is not the row this run was written against:\n  ${drift.join('\n  ')}`)
  }
  const existing = (before.notes || '').trim()
  if (existing && existing !== NOTE) {
    throw new Error(`abort on drift — voices.notes for '${VOICE_ID}' already holds something else:\n  ${existing}`)
  }
  if (existing === NOTE) {
    console.log('already applied — notes already carry this exact ruling; nothing to do.')
    return
  }
  console.log('before-state assertions passed (gender stays m; only notes changes).')

  const entry = {
    voice_id: VOICE_ID,
    column: 'notes',
    before: before.notes,
    after: NOTE,
    gender_before: before.gender,
    gender_after: before.gender, // unchanged, by design
  }

  if (!APPLY) {
    const file = writeLog('t21-sal-gender-note-dryrun-log.json', {
      run: 'dry', voice_id: VOICE_ID, rows: 1, changes: [entry],
    })
    console.log(`DRY RUN — nothing written. Log: ${file}`)
    return
  }

  const { error } = await db.from('voices').update({ notes: NOTE }).eq('voice_id', VOICE_ID)
  if (error) throw new Error(`update voices/${VOICE_ID}: ${error.message}`)

  // ---- re-read and reconcile EXACTLY against the log ----------------------
  const after = await readRow()
  const mismatches = []
  if (after.notes !== NOTE) mismatches.push(`notes did not land: found ${JSON.stringify(after.notes)}`)
  if (after.gender !== before.gender) mismatches.push(`gender moved: ${before.gender} -> ${after.gender}`)
  for (const k of ['type', 'tts_engine', 'display_name', 'tts_voice_name', 'metadata_source']) {
    if (after[k] !== before[k]) mismatches.push(`${k} moved: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`)
  }
  if (mismatches.length) throw new Error(`reconcile FAILED:\n  ${mismatches.join('\n  ')}`)

  const file = writeLog('t21-sal-gender-note-applied-log.json', {
    run: 'applied', voice_id: VOICE_ID, rows: 1, changes: [entry],
    reconciled: true, after_row: after,
  })
  console.log(`APPLIED — 1 row, notes only, gender untouched (${after.gender}). Reconciled. Log: ${file}`)
}

run().catch((e) => { console.error(String(e.message || e)); process.exit(1) })
