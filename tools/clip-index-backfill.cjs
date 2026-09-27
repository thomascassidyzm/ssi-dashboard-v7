#!/usr/bin/env node
/**
 * Fill public.clip_index from course_audio, gently — the live Supabase is
 * shared by learners, staging, Popty and red, and one heavy query stalled it
 * for 12 minutes on 2026-09-26.
 *
 *   node tools/clip-index-backfill.cjs --course eng_for_hin      # one course (the probe)
 *   node tools/clip-index-backfill.cjs --all [--after <uuid>]    # everything, resumable
 *   node tools/clip-index-backfill.cjs --region-rekey [--from <course>]
 *       # job #394: re-key every course whose language has a regional fork.
 *
 * REGION (Tom, 2026-09-26: "region is a different language"). A clip's
 * language key is its course's own language code — clip-index.cjs
 * clipLanguageKey: the course_code before '_for_' for target lines ('spa_mx',
 * 'cym_n'), after it for known lines. --region-rekey
 * walks, one course at a time, every course whose target or known base
 * language is split across course codes anywhere (spa + spa_mx, cym + cym_n …):
 * the REGIONAL courses first — per batch it deletes any entry pointing at one
 * of the batch's rows under a language other than that row's key (the
 * region-free 'spa' entries #391 wrote for Mexican rows) and inserts the right
 * one — then the region-free siblings, whose batches refill any (spa, words,
 * voice) entry that pointed at a Mexican row and was just removed.
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
const { entriesFromRows, clipLanguageKey, COURSE_LANGUAGE_FIELDS } = require('../services/shared/clip-index.cjs')
const { tryCanonicalLanguage } = require('../services/shared/clip-identity.cjs')

const args = process.argv.slice(2)
const arg = (name, dflt = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt }
const COURSE = arg('--course')
const ALL = args.includes('--all')
const REKEY = args.includes('--region-rekey')
const FROM = arg('--from')
const BATCH = Number(arg('--batch', 1000))
const SLEEP_MS = Number(arg('--sleep', 400))
let after = arg('--after', '00000000-0000-0000-0000-000000000000')
const INDEXED_BY = REKEY ? 'region-rekey' : COURSE ? `backfill:${COURSE}` : 'backfill:all'


function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const f = path.join(__dirname, '..', '.env.psql')
  const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found in .env.psql')
  return m[1]
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString(), ...a)

/**
 * The courses to re-key, in order: every course touching a base language that
 * has a regional course, regional ones first. Returns [{ code, regional }].
 */
function rekeyPlan(courses) {
  const sides = c => [[c.target_lang, true], [c.known_lang, false]]
  const forked = new Set()
  for (const c of courses) {
    for (const [lang] of sides(c)) {
      const base = tryCanonicalLanguage(lang)
      if (base && clipLanguageKey(lang, c) !== base) forked.add(base)
    }
  }
  const plan = []
  for (const c of courses) {
    const bases = sides(c).map(([l]) => tryCanonicalLanguage(l))
    if (!bases.some(b => forked.has(b))) continue
    const regional = sides(c).some(([l]) => { const b = tryCanonicalLanguage(l); return b && clipLanguageKey(l, c) !== b })
    plan.push({ code: c.course_code, regional })
  }
  plan.sort((a, b) => (a.regional === b.regional ? a.code.localeCompare(b.code) : a.regional ? -1 : 1))
  return { plan, forked: [...forked].sort() }
}

async function main() {
  if (!COURSE && !ALL && !REKEY) { console.error('usage: --course <code> | --all [--after <uuid>] | --region-rekey [--from <course>]  [--batch n] [--sleep ms]'); process.exit(2) }
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 15000, application_name: 'clip-index-backfill' })
  await client.connect()
  await client.query("SET statement_timeout = '15s'")
  const { rows: courseRows } = await client.query(`SELECT ${COURSE_LANGUAGE_FIELDS} FROM courses`)
  const courses = new Map(courseRows.map(c => [c.course_code, c]))
  const courseOf = code => courses.get(code) || null
  const totals = { read: 0, inserted: 0, upgraded: 0, collisions: 0, dropped: 0, skipped: {}, batches: 0, slowestMs: 0 }
  const started = Date.now()
  let course = COURSE
  try {
    if (REKEY) {
      const { plan, forked } = rekeyPlan(courseRows)
      log(`region-rekey: forked base languages ${forked.join(', ')}; ${plan.length} courses (${plan.filter(p => p.regional).length} regional first)`)
      const start = FROM ? plan.findIndex(p => p.code === FROM) : 0
      if (start < 0) throw new Error(`--from ${FROM} is not in the plan`)
      for (const p of plan.slice(start)) {
        course = p.code
        const before = { ...totals }
        await walk(client, p.code, courseOf, totals, true)
        log(`  ${p.code}${p.regional ? ' (regional)' : ''}: read=${totals.read - before.read} dropped=${totals.dropped - before.dropped} inserted=${totals.inserted - before.inserted}`)
        after = '00000000-0000-0000-0000-000000000000'
      }
    } else {
      await walk(client, COURSE, courseOf, totals, false)
    }
  } catch (e) {
    log(`STOPPED on ${e.code === '57014' ? 'STATEMENT TIMEOUT' : 'ERROR'}: ${e.message}`)
    log(`resume with: ${REKEY ? `--region-rekey --from ${course} (course restarts from its first row; idempotent)` : `--after ${after}`}`)
    log('TOTALS', JSON.stringify(totals))
    await client.end().catch(() => {})
    process.exit(1)
  }
  log(`DONE ${REKEY ? 'region-rekey' : COURSE || 'all'} in ${Math.round((Date.now() - started) / 1000)}s`)
  log('TOTALS', JSON.stringify(totals))
  await client.end()
}

/** One pass over course_audio (one course, or all of it), batch by batch. */
async function walk(client, courseCode, courseOf, totals, dropWrongRegion) {
  for (;;) {
    const t0 = Date.now()
    const { rows } = courseCode
      ? await client.query(
        `SELECT id, course_code, text, language, voice_id, s3_key, origin, veracity_pass FROM course_audio
          WHERE course_code = $1 AND id > $2 ORDER BY id LIMIT $3`, [courseCode, after, BATCH])
      : await client.query(
        `SELECT id, course_code, text, language, voice_id, s3_key, origin, veracity_pass FROM course_audio
          WHERE id > $1 ORDER BY id LIMIT $2`, [after, BATCH])
    if (!rows.length) break
    totals.read += rows.length
    if (dropWrongRegion) {
      // An entry pointing at one of these rows under any language but the
      // row's own (region-bearing) key is wrong: drop it. '' drops every entry
      // for a row that cannot be keyed at all.
      const r = await client.query(
        `DELETE FROM clip_index c USING unnest($1::uuid[], $2::text[]) AS k(id, lang)
          WHERE c.audio_id = k.id AND c.language <> k.lang`,
        [rows.map(x => x.id), rows.map(x => clipLanguageKey(x.language, courseOf(x.course_code)) || '')])
      totals.dropped += r.rowCount
    }
    const { entries, collisions, skipped } = entriesFromRows(rows, INDEXED_BY, courseOf)
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
    if (totals.batches % 25 === 0) log(`batch ${totals.batches} read=${totals.read} inserted=${totals.inserted} dropped=${totals.dropped} last=${ms}ms slowest=${totals.slowestMs}ms watermark=${after}`)
    if (rows.length < BATCH) break
    await sleep(SLEEP_MS)
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { rekeyPlan }
