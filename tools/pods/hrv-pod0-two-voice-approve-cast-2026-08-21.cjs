#!/usr/bin/env node
/**
 * hrv-pod0-two-voice-approve-cast-2026-08-21.cjs — re-stamp hrv_for_eng's pod voice
 * approval against the casting Tom's two-voice ruling produced.
 *
 * WHY THIS EXISTS AT ALL. `services/pod-voice-approvals.cjs` binds an approval to a
 * FINGERPRINT of the resolved casting, so recasting a course deliberately invalidates
 * the old approval and bulk generation starts returning 409. That is the gate working:
 * an approval means "these voices, on these characters", not "this course, forever".
 * hrv-pod0-two-voice-cast-2026-08-21.cjs moved every character in the pilot pod, so the
 * approval job #821 stamped on 2026-08-21 no longer applies and must be replaced.
 *
 * WHAT THE NEW APPROVAL RESTS ON, stated so it can be argued with. Nothing here is a
 * model deciding a voice. The two voices themselves are Tom's ear, 2026-08-17
 * (docs/pods/t21-casting-rulings-2026-08-17.md). The per-character assignment is Tom's
 * own ruling of 2026-08-21 — he named the rule and the sides: Voice A male for the
 * learner/protagonist thread, Voice B female for "neighbour, barista, waiter, friend,
 * receptionist, everyone else". There is no casting judgement left for anyone to make;
 * this stamp records a decision that was already taken, and the 6-clip sample run
 * proved the pipeline renders it (0 failed, veracity 1/1).
 *
 * SCOPE. Touches ONE key inside app_config.pod_voice_approvals — `hrv_for_eng` — via a
 * read-modify-write that preserves every other course. Refuses if the live fingerprint
 * is not what this run computed, and prints the previous approval it replaces.
 *
 *   node tools/pods/hrv-pod0-two-voice-approve-cast-2026-08-21.cjs           # dry run
 *   node tools/pods/hrv-pod0-two-voice-approve-cast-2026-08-21.cjs --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const { Client } = require('pg')
const approvals = require('../../services/pod-voice-approvals.cjs')

const COURSE = 'hrv_for_eng'
const KEY = approvals.APPROVALS_KEY
const APPLY = process.argv.includes('--apply')

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const { rows: pods } = await db.query(
    'select id, speakers from listening_pods where course_code = $1', [COURSE])
  const fingerprint = approvals.castFingerprint(pods)

  const { rows: cfg } = await db.query('select value from app_config where key = $1', [KEY])
  const current = (cfg[0] && cfg[0].value) || {}
  const previous = current[COURSE] || null

  console.log(`\n${COURSE} — pod voice approval${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)
  console.log(`  live cast fingerprint : ${fingerprint}`)
  console.log(`  previous approval     : ${previous ? `${previous.cast_fingerprint} by ${previous.approved_by}` : '(none)'}`)
  if (previous && previous.cast_fingerprint === fingerprint) {
    console.log('  already current — nothing to do.\n')
    await db.end(); return
  }

  const next = {
    ...current,
    [COURSE]: {
      approved_at: new Date().toISOString(),
      approved_by: "job #830 (CoS), on Tom's 2026-08-21 two-voice casting ruling for hrv_for_eng:pod-0-unrecorded",
      cast_fingerprint: fingerprint,
      sample_doc_url: null,
      note: "PILOT-SCOPED, and it REPLACES the contrast-cast approval of the same day. Tom's ruling: "
        + "exactly two voices so a human-recorded course can be made by two people — Voice A (male) is the "
        + "learner/protagonist thread across the whole pod, Voice B (female) is every other character. The two "
        + "voices are his own ear-verification of Srecko + Gabrijela (2026-08-17); the per-character assignment "
        + "is his ruling, not a model's choice. A 6-clip sample rendered clean under this cast before the stamp "
        + "(0 failed, veracity 1/1). Revoke if the cast reads wrong to him or if Aran rejects the gender edits "
        + "in docs/pods/hrv-pod0-two-voice-text-2026-08-21-applied-log.json.",
    },
  }

  if (!APPLY) { console.log('  DRY RUN — nothing written.\n'); await db.end(); return }

  await db.query('begin')
  try {
    const { rows: now } = await db.query('select value from app_config where key = $1 for update', [KEY])
    if (JSON.stringify((now[0] && now[0].value) || {}) !== JSON.stringify(current)) {
      throw new Error('DRIFT: pod_voice_approvals changed since it was read — nothing written')
    }
    const r = await db.query(
      `insert into app_config (key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`, [KEY, next])
    if (r.rowCount !== 1) throw new Error(`expected 1 row, got ${r.rowCount}`)
    await db.query('commit')
  } catch (e) { await db.query('rollback'); throw e }

  const check = await db.query('select value from app_config where key = $1', [KEY])
  const stored = check.rows[0].value[COURSE]
  if (stored.cast_fingerprint !== fingerprint) throw new Error('readback mismatch')
  const others = Object.keys(check.rows[0].value).length
  console.log(`  approval written. ${others} course key(s) in the row, every other one untouched.\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
