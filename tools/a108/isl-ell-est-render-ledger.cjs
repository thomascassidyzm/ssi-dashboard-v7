#!/usr/bin/env node
/**
 * Consolidated ledger for the A-108 isl/ell/est render.
 *
 * The render tool rewrites its applied log per invocation, and this pass ran in
 * four invocations (a one-clip shakedown, the batch, and two re-runs after the
 * ASR word-check was corrected). This rebuilds ONE authoritative ledger for all
 * 36 clips straight from the live DB — course_audio_revisions is the rollback
 * record, so it is the honest source — and folds in the per-clip verification
 * evidence parsed from the run transcripts.
 *
 * Usage: node tools/a108/isl-ell-est-render-ledger.cjs <transcript.txt|log.json>...
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const SOURCE = 'a108-isl-ell-est-register-render'
const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const q = sql => JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
  `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())

// Verification evidence, keyed by clip id, from whatever transcripts were given.
const evidence = new Map()
for (const f of process.argv.slice(2)) {
  const raw = fs.readFileSync(f, 'utf8')
  if (f.endsWith('.json')) {
    for (const c of (JSON.parse(raw).clips || [])) if (c.checks) evidence.set(c.clip_id, { checks: c.checks, asr: c.asr, swapped: !!c.applied })
    continue
  }
  let cur = null
  for (const line of raw.split('\n')) {
    const head = line.match(/^\[(\w+)\] ([0-9a-f-]{36}) (\S+) — (\w+)$/)
    if (head) { cur = { clip_id: head[2], checks: [], swapped: false }; evidence.set(cur.clip_id, cur); continue }
    if (!cur) continue
    const chk = line.match(/^ {3}(OK|FAIL) {2}(\w+): (.*)$/)
    if (chk) { cur.checks.push({ name: chk[2], ok: chk[1] === 'OK', detail: chk[3] }); continue }
    if (/^ {3}-> SWAPPED/.test(line)) cur.swapped = true
  }
}

const clips = q(`
  select r.audio_id as clip_id, a.course_code, a.voice_id, a.language, a.role,
         a.text as spoken_text, a.s3_key as new_s3_key, a.duration_ms as new_duration_ms,
         a.file_size_bytes, a.audio_revision as revision, a.veracity_cer, a.veracity_reason,
         r.previous_s3_key, r.previous_duration_ms, r.previous_revision, r.reason, r.created_at
  from course_audio_revisions r join course_audio a on a.id = r.audio_id
  where r.source = ${"'" + SOURCE + "'"} order by a.course_code, r.created_at`)

const rows = q(`
  select s.target_audio_id as clip_id, s.id, p.slug as pod, s.scene_number as scene,
         s.sentence_number as sentence, s.speaker, s.target_text
  from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
  where s.target_audio_id in (select audio_id from course_audio_revisions where source = ${"'" + SOURCE + "'"})
  order by p.slug, s.scene_number, s.sentence_number`)

const out = clips.map(c => {
  const mine = rows.filter(r => r.clip_id === c.clip_id)
  const ev = evidence.get(c.clip_id) || null
  return {
    ...c,
    chars: c.spoken_text.length,
    cost_usd: +(c.spoken_text.length * 16 / 1e6).toFixed(6),
    text_matches_every_pod_row: mine.every(r => r.target_text === c.spoken_text),
    pod_rows: mine.map(({ clip_id, ...r }) => r),
    verification: ev ? ev.checks : null,
    verification_all_green: ev ? ev.checks.every(k => k.ok) : null,
  }
})

const ledger = {
  job: 'A-108 isl/ell/est register+gender render — consolidated ledger',
  date: '2026-08-14',
  approved_by: 'Tom, 2026-08-14, this thread',
  source: SOURCE,
  clips_swapped: out.length,
  pod_rows_swapped: rows.length,
  chars: out.reduce((a, c) => a + c.chars, 0),
  cost_usd_live_clips: +(out.reduce((a, c) => a + c.chars, 0) * 16 / 1e6).toFixed(4),
  every_clip_text_matches_its_pod_rows: out.every(c => c.text_matches_every_pod_row),
  deletions: 'none — every superseded S3 object is retained and named in previous_s3_key',
  clips: out,
}
const dest = path.join(__dirname, '..', '..', 'docs', 'a108', 'isl-ell-est-register-render-applied-log.json')
fs.writeFileSync(dest, JSON.stringify(ledger, null, 2) + '\n')
console.log(`${out.length} clips, ${rows.length} pod rows, ${ledger.chars} chars, $${ledger.cost_usd_live_clips}`)
console.log(`text matches every pod row: ${ledger.every_clip_text_matches_its_pod_rows}`)
console.log(`clips with parsed verification evidence: ${out.filter(c => c.verification).length}`)
console.log(`written: ${dest}`)
