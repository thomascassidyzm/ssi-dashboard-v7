#!/usr/bin/env node
// tools/pods/senedd/relink-s0070-known-2026-09-13.cjs
//
// One Senedd line (cym_n_for_eng:senedd-s4c-steve SC013-S0070, Carolyn Thomas,
// "Will you be embedding that as well?") lost its ENGLISH clip on 2026-09-11
// 17:59Z when Aran proofread its Welsh in the pod page (gwreiddio -> embedio).
// The page sends both sides on every save and, before e6d46d6b6 (2026-09-12),
// PATCH /sentence unlinked any side whose text was PRESENT rather than CHANGED —
// so the untouched English lost its slot along with the re-worded Welsh. The
// server fix is on main and in prod; this is the one row it left behind
// (content_audit_log shows no other pod line estate-wide).
//
// The clip never died: course_audio 8499a5ca… is the exact text on the pod's
// cast voice (cartesia_8fef4d59…, same as the other 566), alive in S3. So this
// LINKS, never renders (pointer rule). The Welsh side is deliberately NOT
// touched: the old take 2edfb987… says "gwreiddio", the words changed, and the
// line is already in Aran's booth queue by the ordinary rule (blank
// target_audio_id, non-blank text, draft off).
//
// Gated: --dry-run (default) asserts every before-state and writes nothing;
// --apply re-asserts, links with .is('known_audio_id', null) so an existing
// link is never overwritten, and records the edit with a service identity.
//
//   node tools/pods/senedd/relink-s0070-known-2026-09-13.cjs --dry-run
//   node tools/pods/senedd/relink-s0070-known-2026-09-13.cjs --apply

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { serviceIdentity } = require('../../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../../services/shared/content-edit-log.cjs')
const { evidencePath } = require('../../lib/evidence-path.cjs')

const COURSE = 'cym_n_for_eng'
const POD = 'cym_n_for_eng:senedd-s4c-steve'
const SURFACE = 'tools:senedd-relink-s0070-known-2026-09-13'
const APPLY = process.argv.includes('--apply')
const CAST_KNOWN_VOICE = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'

const PLAN = [
  { sentenceId: `${POD}:SC013-S0070`, text: 'Will you be embedding that as well?', audioId: '8499a5ca-9aaa-42c1-81aa-daf3dda5a837' },
]

function loadEnv() {
  for (const p of [path.join(__dirname, '..', '..', '..', '.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim())
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
    }
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) break
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not found')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

async function main() {
  const db = loadEnv()
  const log = []
  let eventId = null
  const identity = serviceIdentity('senedd-relink-s0070-known-2026-09-13')
  for (const row of PLAN) {
    const entry = { ...row, mode: APPLY ? 'apply' : 'dry-run', at: new Date().toISOString() }
    const { data: s, error: sErr } = await db.from('listening_pod_sentences')
      .select('id, pod_id, known_text, known_audio_id').eq('id', row.sentenceId).maybeSingle()
    if (sErr) throw new Error(`sentence read failed: ${sErr.message}`)
    const { data: a, error: aErr } = await db.from('course_audio')
      .select('id, course_code, voice_id, role, language, text, s3_key, duration_ms').eq('id', row.audioId).maybeSingle()
    if (aErr) throw new Error(`audio read failed: ${aErr.message}`)
    entry.before = { sentence: s, audio: a }
    const problems = []
    if (!s) problems.push('sentence missing')
    else {
      if (s.pod_id !== POD) problems.push(`wrong pod ${s.pod_id}`)
      if ((s.known_text || '').trim() !== row.text) problems.push(`text drifted: ${JSON.stringify(s.known_text)}`)
      if (s.known_audio_id) problems.push(`already linked to ${s.known_audio_id} — never overwrite`)
    }
    if (!a) problems.push('audio row missing')
    else {
      if (a.course_code !== COURSE) problems.push(`audio is ${a.course_code}`)
      if (a.role !== 'known') problems.push(`audio role ${a.role}`)
      if (a.voice_id !== CAST_KNOWN_VOICE) problems.push(`audio voice ${a.voice_id} is not the cast voice`)
      if ((a.text || '').trim().toLowerCase() !== row.text.toLowerCase()) problems.push(`audio text ${JSON.stringify(a.text)}`)
      if (!a.s3_key) problems.push('audio has no s3_key')
    }
    entry.problems = problems
    if (problems.length) { entry.result = 'skipped'; log.push(entry); console.log('SKIP', row.sentenceId, problems.join('; ')); continue }
    if (!APPLY) { entry.result = 'would-link'; log.push(entry); console.log('DRY ', row.sentenceId, '->', row.audioId); continue }
    if (!eventId) {
      eventId = await recordContentEdit(db, {
        identity, courseCode: COURSE, surface: SURFACE, operation: 'update',
        scope: { rows: PLAN.map(p => p.sentenceId) },
        detail: { why: 'relink the English clip dropped by a pre-e6d46d6b6 target-only edit on 2026-09-11 (known_audio_id was NULL, clip alive); job #545 2026-09-13' },
      })
    }
    const { error: uErr } = await db.from('listening_pod_sentences')
      .update({ known_audio_id: row.audioId }).eq('id', row.sentenceId).is('known_audio_id', null)
    if (uErr) { entry.result = 'update-failed'; entry.error = uErr.message; log.push(entry); console.log('FAIL', row.sentenceId, uErr.message); continue }
    const { data: after } = await db.from('listening_pod_sentences').select('id, known_audio_id').eq('id', row.sentenceId).maybeSingle()
    entry.after = after
    entry.result = after && after.known_audio_id === row.audioId ? 'linked' : 'not-linked-after-update'
    entry.eventId = eventId
    log.push(entry); console.log(entry.result.toUpperCase(), row.sentenceId, '->', row.audioId)
  }
  const out = evidencePath(`docs/pods/senedd-relink-s0070-known-2026-09-13-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log: ${out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
