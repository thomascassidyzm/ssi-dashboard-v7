#!/usr/bin/env node
/**
 * Audio half of the empty-seed-clause repair (2026-09-03).
 *
 * Re-renders the presentation clips whose TEXT was repaired by
 * fix-empty-seed-clause.cjs, so the learner stops hearing a dangling connector
 * and an empty quotation. Drives phase8's per-clip route
 * POST /regenerate-single/:courseCode/:audioUuid — chosen over the per-LEGO
 * /regenerate-presentation because 9,515 of the 16,208 affected rows carry
 * lego_id = NULL and that route cannot address them. /regenerate-single is
 * keyed on the course_audio row id, reads the row's (now corrected) text, is
 * make-before-break (renders → uploads a NEW S3 object → swapClipInPlace bumps
 * audio_revision → only then is the old key unreferenced), and carries the
 * PRECIOUS-AUDIO GUARD that 409s on origin='human'.
 *
 * Nothing here deletes. A row that fails to render keeps its old clip and its
 * corrected text — the same as today, never silence.
 *
 * Resumable: every completed row id is appended to a JSONL beside the log, and
 * a restart skips them. A 1,400-clip run WILL be interrupted.
 *
 * Fails loudly rather than burning calls blind: if the first row produces no
 * output, or FAIL_STREAK consecutive HARD failures occur, the course aborts
 * non-zero — and the bulk driver records it and moves to the next course.
 * Transient fetch failures (a phase8 restart drops every in-flight request)
 * back off and retry; veracity-gate quarantines are counted, left quarantined,
 * and never counted towards the abort streak.
 *
 *   node tools/course-optimization/fix-empty-seed-clause-audio.cjs --course fra_for_jpn
 *   node tools/course-optimization/fix-empty-seed-clause-audio.cjs --course eng_for_tel --concurrency 4
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const REPO = path.resolve(__dirname, '../..')
require('dotenv').config({ path: path.join(REPO, '.env') })
const LOG_DIR = path.join(REPO, 'docs/audio-repair-2026-09-03')
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465'
const FAIL_STREAK = 5            // consecutive HARD failures (not quarantines) that abort a course
const QUARANTINE_STREAK = 50     // consecutive failures of ANY kind — a unit failing on everything
const TRANSIENT_ATTEMPTS = 4     // 1 try + 3 retries
const TRANSIENT_BACKOFF_MS = [5000, 15000, 45000]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// A phase8 restart (systemctl restart popty-phase8-audio) drops every in-flight
// request as "fetch failed". That is the network, not the content: it must back
// off and retry, never abort a 21-course run. 2026-09-03: eight of these killed
// 18 untouched courses.
const isTransient = (res, body) => {
  const msg = String(body?.error || '')
  if (!res || res.status === 0) return true
  if ([429, 502, 503, 504].includes(res.status)) return true
  return /fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(msg)
}

// The veracity gate rejecting a clip is a real CONTENT verdict, correctly
// quarantined. It is counted, never retried here, and never trips the
// consecutive-failure guard — a language whose phonology the ASR reads badly
// would otherwise abort itself.
const isQuarantine = (body) => /veracity gate|quarantined/i.test(String(body?.error || ''))

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i !== -1 ? process.argv[i + 1] : dflt
}

async function main() {
  const course = arg('--course')
  if (!course) throw new Error('--course <code> is required')
  const concurrency = Math.max(1, parseInt(arg('--concurrency', '3'), 10))
  const limit = parseInt(arg('--limit', '0'), 10) || 0

  const applied = path.join(LOG_DIR, `${course}-seedclause-text-applied-log.json`)
  if (!fs.existsSync(applied)) throw new Error(`no applied text log for ${course} — run the text pass first`)
  const textLog = JSON.parse(fs.readFileSync(applied, 'utf8'))

  const donePath = path.join(LOG_DIR, `${course}-seedclause-audio-done.jsonl`)
  const done = new Set()
  if (fs.existsSync(donePath)) {
    for (const line of fs.readFileSync(donePath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      const r = JSON.parse(line)
      if (r.ok) done.add(r.id)
    }
  }

  // Deterministic order, so an interrupted run resumes predictably.
  let rows = textLog.rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))
  rows = rows.filter(r => !done.has(r.id))
  if (limit) rows = rows.slice(0, limit)

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  console.log(`[${course}] ${textLog.rows.length} repaired rows, ${done.size} already rendered, ${rows.length} to do (concurrency ${concurrency})`)
  if (!rows.length) { console.log(`[${course}] nothing to do`); return }

  const doneStream = fs.createWriteStream(donePath, { flags: 'a' })
  let ok = 0, failed = 0, quarantined = 0, retried = 0, skippedHuman = 0, streak = 0, anyStreak = 0, first = true, aborted = null
  const t0 = Date.now()

  const renderOne = async (row) => {
    if (aborted) return
    // Pre-flight: the row must still hold the corrected text, and must not be human.
    const { data: live, error } = await sb.from('course_audio')
      .select('id,text,origin,s3_key,audio_revision').eq('id', row.id).eq('course_code', course).maybeSingle()
    if (error) throw new Error(`read ${row.id}: ${error.message}`)
    if (!live) { failed++; doneStream.write(JSON.stringify({ id: row.id, ok: false, reason: 'row gone' }) + '\n'); return }
    if (live.origin === 'human') {
      skippedHuman++
      doneStream.write(JSON.stringify({ id: row.id, ok: false, reason: 'origin=human — precious, skipped' }) + '\n')
      console.warn(`[${course}] SKIP ${row.id}: origin=human`)
      return
    }
    if (live.text !== row.after) {
      failed++
      doneStream.write(JSON.stringify({ id: row.id, ok: false, reason: `text drifted: ${live.text}` }) + '\n')
      return
    }
    const before = { s3_key: live.s3_key, audio_revision: live.audio_revision }

    let res, body, transient = false
    for (let attempt = 0; attempt < TRANSIENT_ATTEMPTS; attempt++) {
      try {
        res = await fetch(`${PHASE8}/regenerate-single/${course}/${row.id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        })
        body = await res.json().catch(() => ({}))
      } catch (e) {
        body = { error: e.message }; res = { ok: false, status: 0 }
      }
      if (res.ok) { transient = false; break }
      transient = isTransient(res, body)
      if (!transient) break
      const wait = TRANSIENT_BACKOFF_MS[Math.min(attempt, TRANSIENT_BACKOFF_MS.length - 1)]
      if (attempt < TRANSIENT_ATTEMPTS - 1) {
        retried++
        console.warn(`[${course}] transient on ${row.id} (${body?.error || 'HTTP ' + res.status}) — retry ${attempt + 1}/${TRANSIENT_ATTEMPTS - 1} in ${wait / 1000}s`)
        await sleep(wait)
      }
    }

    // "Produced output" is a NEW s3_key on the row — not a 200. Verified from
    // the DB, because that is what the learner actually streams.
    const { data: after } = await sb.from('course_audio')
      .select('s3_key,audio_revision,duration_ms').eq('id', row.id).maybeSingle()
    const moved = after && after.s3_key && after.s3_key !== before.s3_key

    if (res.ok && moved) {
      ok++; streak = 0; anyStreak = 0; first = false
      doneStream.write(JSON.stringify({
        id: row.id, ok: true, text: row.after,
        old_s3_key: before.s3_key, new_s3_key: after.s3_key,
        revision: after.audio_revision, duration_ms: after.duration_ms
      }) + '\n')
      if (ok % 25 === 0) {
        const rate = ok / ((Date.now() - t0) / 60000)
        console.log(`[${course}] ${ok} rendered, ${failed} failed — ${rate.toFixed(1)}/min`)
      }
      return
    }

    failed++; anyStreak++
    const quarantine = isQuarantine(body)
    if (quarantine) quarantined++
    else streak++
    const reason = body?.error || `HTTP ${res.status}${moved ? '' : ' (s3_key did not move)'}`
    doneStream.write(JSON.stringify({ id: row.id, ok: false, reason, quarantine, transient, text: row.after }) + '\n')
    console.error(`[${course}] FAIL${quarantine ? ' (quarantined)' : ''} ${row.id}: ${reason}`)

    // Fail loudly rather than burn thousands of calls into a dead unit — but a
    // quarantine is the gate working, not the unit dying.
    if (first && !quarantine) aborted = `first row produced no output: ${reason}`
    else if (streak >= FAIL_STREAK) aborted = `${FAIL_STREAK} consecutive hard failures, last: ${reason}`
    else if (anyStreak >= QUARANTINE_STREAK) aborted = `${QUARANTINE_STREAK} consecutive failures of any kind, last: ${reason}`
    first = false
  }

  for (let i = 0; i < rows.length && !aborted; i += concurrency) {
    await Promise.all(rows.slice(i, i + concurrency).map(renderOne))
  }
  doneStream.end()

  const mins = ((Date.now() - t0) / 60000).toFixed(1)
  console.log(`[${course}] DONE: ${ok} rendered, ${failed} failed (${quarantined} quarantined by the veracity gate), ${retried} transient retries, ${skippedHuman} human-skipped in ${mins} min`)
  if (aborted) { console.error(`[${course}] ABORTED — ${aborted}`); process.exit(2) }
  if (ok === 0) { console.error(`[${course}] produced no output at all`); process.exit(3) }
}

main().catch(e => { console.error(e); process.exit(1) })
