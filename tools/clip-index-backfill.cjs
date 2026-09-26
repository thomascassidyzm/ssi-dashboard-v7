#!/usr/bin/env node
/**
 * Fill public.clip_index from course_audio, gently — the live Supabase is
 * shared by learners, staging, Popty and red, and one heavy query stalled it
 * for 12 minutes on 2026-09-26.
 *
 *   node tools/clip-index-backfill.cjs --course eng_for_hin      # one course (the probe)
 *   node tools/clip-index-backfill.cjs --all [--after <uuid>]    # everything, resumable
 *
 * Shape, and why:
 *   - read course_audio in primary-key order, BATCH rows at a time
 *     (id > watermark ORDER BY id LIMIT n — a pkey range, never a scan;
 *     --course uses (course_code, id));
 *   - canonicalise language/voice in JS (clip-index.cjs indexEntryFor — the
 *     alias tables live there, so SQL cannot do it) and keep ONE canonical row
 *     per (language, text_key, voice_id): human > veracity-passed > lower id;
 *   - INSERT … ON CONFLICT: an existing entry is replaced only by a human take
 *     over a TTS one, so re-running is idempotent;
 *   - every statement runs under SET statement_timeout = '15s'; the FIRST
 *     timeout or error stops the run (never a hot retry) and prints the
 *     watermark to resume from;
 *   - SLEEP_MS between batches.
 *
 * Counts printed at the end: rows read, entries inserted, canonical upgrades,
 * collisions (rows that share a key with an already-kept row), skipped by reason.
 */
const path = require('path')
const fs = require('fs')
const { Client } = require('pg')
const { entriesFromRows } = require('../services/shared/clip-index.cjs')

const args = process.argv.slice(2)
const arg = (name, dflt = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt }
const COURSE = arg('--course')
const ALL = args.includes('--all')
const BATCH = Number(arg('--batch', 1000))
const SLEEP_MS = Number(arg('--sleep', 400))
let after = arg('--after', '00000000-0000-0000-0000-000000000000')
const INDEXED_BY = COURSE ? `backfill:${COURSE}` : 'backfill:all'

if (!COURSE && !ALL) { console.error('usage: --course <code> | --all [--after <uuid>] [--batch n] [--sleep ms]'); process.exit(2) }

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const f = path.join(__dirname, '..', '.env.psql')
  const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found in .env.psql')
  return m[1]
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString(), ...a)

async function main() {
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 15000, application_name: 'clip-index-backfill' })
  await client.connect()
  await client.query("SET statement_timeout = '15s'")
  const totals = { read: 0, inserted: 0, upgraded: 0, collisions: 0, skipped: {}, batches: 0, slowestMs: 0 }
  const started = Date.now()
  try {
    for (;;) {
      const t0 = Date.now()
      const { rows } = COURSE
        ? await client.query(
          `SELECT id, text, language, voice_id, s3_key, origin, veracity_pass FROM course_audio
            WHERE course_code = $1 AND id > $2 ORDER BY id LIMIT $3`, [COURSE, after, BATCH])
        : await client.query(
          `SELECT id, text, language, voice_id, s3_key, origin, veracity_pass FROM course_audio
            WHERE id > $1 ORDER BY id LIMIT $2`, [after, BATCH])
      if (!rows.length) break
      totals.read += rows.length
      const { entries, collisions, skipped } = entriesFromRows(rows, INDEXED_BY)
      totals.collisions += collisions
      for (const [k, v] of Object.entries(skipped)) totals.skipped[k] = (totals.skipped[k] || 0) + v
      if (entries.length) {
        const col = k => entries.map(e => e[k])
        const r = await client.query(
          `INSERT INTO clip_index (language, text_key, voice_id, audio_id, origin, indexed_by)
           SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::uuid[], $5::text[], $6::text[])
           ON CONFLICT (language, text_key, voice_id) DO UPDATE
             SET audio_id = excluded.audio_id, origin = excluded.origin,
                 indexed_by = excluded.indexed_by, updated_at = now()
             WHERE clip_index.origin = 'tts' AND excluded.origin = 'human'
           RETURNING (xmax = 0) AS inserted`,
          [col('language'), col('text_key'), col('voice_id'), col('audio_id'), col('origin'), col('indexed_by')])
        const ins = r.rows.filter(x => x.inserted).length
        totals.inserted += ins
        totals.upgraded += r.rows.length - ins
        // Entries that neither inserted nor upgraded already had a canonical row.
        totals.collisions += entries.length - r.rows.length
      }
      after = rows[rows.length - 1].id
      totals.batches++
      const ms = Date.now() - t0
      totals.slowestMs = Math.max(totals.slowestMs, ms)
      if (totals.batches % 25 === 0) log(`batch ${totals.batches} read=${totals.read} inserted=${totals.inserted} collisions=${totals.collisions} last=${ms}ms slowest=${totals.slowestMs}ms watermark=${after}`)
      if (rows.length < BATCH) break
      await sleep(SLEEP_MS)
    }
  } catch (e) {
    log(`STOPPED on ${e.code === '57014' ? 'STATEMENT TIMEOUT' : 'ERROR'}: ${e.message}`)
    log(`resume with: --after ${after}`)
    log('TOTALS', JSON.stringify(totals))
    await client.end().catch(() => {})
    process.exit(1)
  }
  log(`DONE ${COURSE || 'all'} in ${Math.round((Date.now() - started) / 1000)}s`)
  log('TOTALS', JSON.stringify(totals))
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
