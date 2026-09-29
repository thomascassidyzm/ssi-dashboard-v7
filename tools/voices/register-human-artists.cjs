#!/usr/bin/env node
/**
 * One voices-registry entry per human artist (job #703, Tom 2026-09-29).
 *
 *   node tools/voices/register-human-artists.cjs            # dry run — prints what it would write
 *   node tools/voices/register-human-artists.cjs --apply
 *
 * The artists are read from language_recording_policy.voices — Tom's own cast
 * list, which already carries name, gender key, dialect and old spellings — so
 * this file names nobody itself. The one addition is EXTRA_ARTISTS: people Tom
 * has named as recorded artists who are not (yet) in the cast policy. They go in
 * the registry only; adding them to the policy would change recording-queue
 * routing, which is Kai's and Tom's call.
 *
 * Writes only name / gender / language / clip_language / dialect on `voices`.
 * consent_* is never touched (a recording existing is not a permission).
 * Idempotent; reversible with DELETE FROM voices WHERE voice_id IN (...) — the
 * rows it created are printed.
 */
const path = require('path')
const fs = require('fs')
const { Client } = require('pg')
const { tryCanonicalLanguage } = require('../../services/shared/clip-identity.cjs')

/** Named by Tom 2026-09-29 as known artists. Gender NULL until someone who knows says. */
const EXTRA_ARTISTS = [
  { voice_id: 'human_cerys_matthews_cym_s', name: 'Cerys Matthews', gender: null, dialect: 'south', clip_language: 'cym_s', language: 'cym',
    notes: 'Named by Tom 2026-09-29 as a Welsh South artist. No clips attributed yet — waiting on the listening sheet. Gender deliberately blank: not inferred from a name.' },
]

/** Per-voice evidence notes worth keeping beside the registry entry. */
const NOTES = {
  human_sasha_wanasky_deu_at: 'Gender f is the cast policy\'s (every estate record refers to Sasha as she). Measured median pitch of her takes is ~114 Hz (job #703, 20 clips) — the typical male range; confirm.',
}

const isTestEntry = e => /test|not a person|e2e/i.test(e.name || '') || e.dialect === 'e2e'

function clipLanguageOf(voiceId) {
  const m = String(voiceId).match(/^human_.+?_([a-z]{3}(?:_[a-z]{1,3})?)$/)
  return m ? m[1] : null
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found')
  return m[1]
}

async function plan(client) {
  const { rows } = await client.query('SELECT language, voices FROM language_recording_policy')
  const out = new Map()
  for (const p of rows) {
    for (const [key, e] of Object.entries(p.voices || {})) {
      if (!e || !/^human_/.test(e.voiceId || '') || isTestEntry(e) || key === 'test') continue
      const gender = e.gender || (/^f(:|$)/.test(key) ? 'f' : /^m(:|$)/.test(key) ? 'm' : null)
      out.set(e.voiceId, {
        voice_id: e.voiceId, name: e.name, gender, dialect: e.dialect || null,
        clip_language: clipLanguageOf(e.voiceId), language: tryCanonicalLanguage(p.language) || p.language, notes: NOTES[e.voiceId] || null,
      })
    }
  }
  for (const a of EXTRA_ARTISTS) if (!out.has(a.voice_id)) out.set(a.voice_id, a)
  return [...out.values()]
}

async function main() {
  const apply = process.argv.includes('--apply')
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 15000 })
  await client.connect()
  try {
    const artists = await plan(client)
    for (const a of artists) {
      const { rows: [had] } = await client.query('SELECT voice_id FROM voices WHERE voice_id = $1', [a.voice_id])
      console.log(`${apply ? (had ? 'update' : 'insert') : 'would ' + (had ? 'update' : 'insert')}  ${a.voice_id.padEnd(34)} ${String(a.name).padEnd(20)} gender=${a.gender || '-'} clip_language=${a.clip_language} dialect=${a.dialect || '-'}`)
      if (!apply) continue
      await client.query(
        `INSERT INTO voices (voice_id, type, human_name, display_name, gender, languages, clip_language, dialect, notes, is_active)
         VALUES ($1, 'human', $2, $2, $3, ARRAY[$4]::text[], $5, $6, $7, true)
         ON CONFLICT (voice_id) DO UPDATE SET human_name = excluded.human_name, display_name = excluded.display_name,
           gender = excluded.gender, languages = excluded.languages, clip_language = excluded.clip_language,
           dialect = excluded.dialect, notes = COALESCE(excluded.notes, voices.notes), updated_at = now()`,
        [a.voice_id, a.name, a.gender, a.language, a.clip_language, a.dialect, a.notes])
    }
    if (!apply) console.log('\ndry run — nothing written. --apply to write.')
  } finally { await client.end() }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })
module.exports = { plan, clipLanguageOf, isTestEntry, EXTRA_ARTISTS }
