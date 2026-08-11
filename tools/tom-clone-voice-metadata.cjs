#!/usr/bin/env node
/**
 * Record the gender of the ONE xAI voice the by-id reconciliation could not
 * resolve: `gfzdpspr5fdp` ("Tom"), which sits at pod pool eng.m[0].
 *
 * WHY IT IS RESIDUAL (2026-08-11). `tools/xai-voice-metadata-sync.cjs` resolved
 * 118 of 119 xAI ids against GET /v1/tts/voices/{id}. This one 404s, and the id
 * shape says why: 12 lowercase characters, not the 8-hex of a stock xAI
 * catalogue voice. It is a CLONE — Tom's own recorded voice — so it was never
 * in the catalogue the endpoint serves, and no amount of retrying will put it
 * there.
 *
 * WHY WRITING IT IS NOT A GUESS. The sync tool refuses to invent a gender from
 * a display name, and rightly: "Tom" as a label proves nothing. What proves it
 * here is provenance, not the name — the voice is a clone of a known human,
 * en-GB male, already carried as gender 'm' in the voicelab's own hard-coded
 * handling and cast into the male pool slot. metadata_source records that
 * honestly as human knowledge rather than dressing it up as a provider read,
 * so anyone auditing later can tell the two apart.
 *
 * WHAT IT WRITES. Exactly one UPDATE, keyed on voice_id, of gender /
 * metadata_source / metadata_checked_at. It asserts the row's before-state
 * first and aborts on any drift; it inserts nothing, deletes nothing, calls no
 * provider API, renders no audio. `age` is left NULL: nobody has stated one,
 * and NULL means unknown, never "probably".
 *
 *   node tools/tom-clone-voice-metadata.cjs            # dry run, writes a log
 *   node tools/tom-clone-voice-metadata.cjs --apply    # writes the row
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const VOICE_ID = 'gfzdpspr5fdp'
const GENDER = 'm'
const SOURCE = "human-known: Tom's own voice clone (en-GB male); xAI clone id, absent from the by-id catalogue"

/** The row must look like this before we touch it — otherwise something moved. */
const EXPECTED_BEFORE = { tts_engine: 'xai', tts_voice_name: 'Tom', gender: null }

let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

/** Pure: what the before-state must satisfy. Returns [] when it is safe to write. */
function driftAgainstExpected(row, expected = EXPECTED_BEFORE) {
  if (!row) return [`no voices row for ${VOICE_ID}`]
  return Object.entries(expected)
    .filter(([col, want]) => row[col] !== want)
    .map(([col, want]) => `${col}: expected ${JSON.stringify(want)}, found ${JSON.stringify(row[col])}`)
}

/** Pure: the patch we would apply. */
function patchFor(checkedAt) {
  return { gender: GENDER, metadata_source: SOURCE, metadata_checked_at: checkedAt }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const checkedAt = new Date().toISOString()

  const { data, error } = await db().from('voices').select('*').eq('voice_id', VOICE_ID)
  if (error) throw new Error(`read: ${error.message}`)
  const before = data[0] || null

  const drift = driftAgainstExpected(before)
  const patch = patchFor(checkedAt)
  console.log(`${VOICE_ID} (${before?.tts_voice_name || 'no row'}) — before: gender=${JSON.stringify(before?.gender)}, source=${JSON.stringify(before?.metadata_source)}`)
  console.log(`patch: ${JSON.stringify(patch)}`)

  const out = path.resolve(__dirname, '..', 'docs/voice-engine/pod-cast',
    `tom-clone-voice-metadata-${apply ? 'applied' : 'dryrun'}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const log = { ran_at: checkedAt, mode: apply ? 'applied' : 'dryrun', voice_id: VOICE_ID, before, patch, drift }

  if (drift.length) {
    fs.writeFileSync(out, JSON.stringify({ ...log, aborted: true }, null, 2))
    console.log(`\nlog → ${out}`)
    throw new Error(`ABORT — before-state drift:\n  ${drift.join('\n  ')}`)
  }

  if (!apply) {
    fs.writeFileSync(out, JSON.stringify(log, null, 2))
    console.log(`\nlog → ${out}\nDRY RUN — nothing written. Re-run with --apply.`)
    return
  }

  const { error: uErr } = await db().from('voices').update(patch).eq('voice_id', VOICE_ID)
  if (uErr) throw new Error(`update: ${uErr.message}`)

  const { data: after, error: vErr } = await db().from('voices').select('*').eq('voice_id', VOICE_ID)
  if (vErr) throw new Error(`verify: ${vErr.message}`)
  const row = after[0]
  if (row?.gender !== GENDER || row?.metadata_source !== SOURCE || !row?.metadata_checked_at) {
    throw new Error(`verify: row did not take the patch — ${JSON.stringify(row)}`)
  }
  fs.writeFileSync(out, JSON.stringify({ ...log, after: row }, null, 2))
  console.log(`\nlog → ${out}\nwritten and verified: 1 row updated, gender=${row.gender}, age=${JSON.stringify(row.age)}`)
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { VOICE_ID, GENDER, SOURCE, EXPECTED_BEFORE, driftAgainstExpected, patchFor }
