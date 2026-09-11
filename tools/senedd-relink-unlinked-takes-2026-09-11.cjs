#!/usr/bin/env node
// tools/senedd-relink-unlinked-takes-2026-09-11.cjs
//
// Three Senedd lines (cym_n_for_eng:senedd-s4c-steve) had a stored take of
// Aran's on file but no target_audio_id — the learner slot was empty while the
// booth, which matches by text and voice alias, already counted them recorded
// and never asked him again. Found while answering "did Aran lose recordings?"
// on 2026-09-11 (job #258): nothing was lost; these three were merely unlinked.
//
//   SC001-S0001 / SC009-S0047  "Prynhawn da."  -> course_audio 30514028… (2026-06-16, alias voice human_aran_cym_n_2)
//   SC130-S0452                "Iawn."         -> course_audio 9420c052… (2026-09-10)
//
// Gated: --dry-run (default) asserts every before-state and writes nothing;
// --apply re-asserts per row, links, and records the edit with a service
// identity. Make-before-break: a row that already carries ANY link is skipped,
// never overwritten. Log goes to the evidence store, not the repo tree.
//
//   node tools/senedd-relink-unlinked-takes-2026-09-11.cjs --dry-run
//   node tools/senedd-relink-unlinked-takes-2026-09-11.cjs --apply

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { serviceIdentity } = require('../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs')
const { evidencePath } = require('./lib/evidence-path.cjs')

const COURSE = 'cym_n_for_eng'
const POD = 'cym_n_for_eng:senedd-s4c-steve'
const SURFACE = 'tools:senedd-relink-unlinked-takes-2026-09-11'
const APPLY = process.argv.includes('--apply')

const PLAN = [
  { sentenceId: `${POD}:SC001-S0001`, text: 'Prynhawn da.', audioId: '30514028-0094-40c6-b836-10530e808cfa' },
  { sentenceId: `${POD}:SC009-S0047`, text: 'Prynhawn da.', audioId: '30514028-0094-40c6-b836-10530e808cfa' },
  { sentenceId: `${POD}:SC130-S0452`, text: 'Iawn.', audioId: '9420c052-ccc2-4dc2-b127-5ecafcd94ecc' },
]

function loadEnv() {
  for (const p of [path.join(__dirname, '..', '.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) {
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
  const identity = serviceIdentity('senedd-relink-unlinked-takes-2026-09-11')
  for (const row of PLAN) {
    const entry = { ...row, mode: APPLY ? 'apply' : 'dry-run', at: new Date().toISOString() }
    const { data: s, error: sErr } = await db.from('listening_pod_sentences')
      .select('id, pod_id, target_text, target_audio_id').eq('id', row.sentenceId).maybeSingle()
    if (sErr) throw new Error(`sentence read failed: ${sErr.message}`)
    const { data: a, error: aErr } = await db.from('course_audio')
      .select('id, course_code, voice_id, role, text, s3_key, duration_ms').eq('id', row.audioId).maybeSingle()
    if (aErr) throw new Error(`audio read failed: ${aErr.message}`)
    entry.before = { sentence: s, audio: a }
    const problems = []
    if (!s) problems.push('sentence missing')
    else {
      if (s.pod_id !== POD) problems.push(`wrong pod ${s.pod_id}`)
      if ((s.target_text || '').trim() !== row.text) problems.push(`text drifted: ${JSON.stringify(s.target_text)}`)
      if (s.target_audio_id) problems.push(`already linked to ${s.target_audio_id} — never overwrite`)
    }
    if (!a) problems.push('audio row missing')
    else {
      if (a.course_code !== COURSE) problems.push(`audio is ${a.course_code}`)
      if (a.role !== 'target1') problems.push(`audio role ${a.role}`)
      if (!/^human_aran/.test(a.voice_id)) problems.push(`audio voice ${a.voice_id}`)
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
        detail: { why: 'relink stored Aran takes to their Senedd lines (target_audio_id was NULL); job #258 2026-09-11' },
      })
    }
    const { error: uErr } = await db.from('listening_pod_sentences')
      .update({ target_audio_id: row.audioId }).eq('id', row.sentenceId).is('target_audio_id', null)
    if (uErr) { entry.result = 'update-failed'; entry.error = uErr.message; log.push(entry); console.log('FAIL', row.sentenceId, uErr.message); continue }
    const { data: after } = await db.from('listening_pod_sentences').select('id, target_audio_id').eq('id', row.sentenceId).maybeSingle()
    entry.after = after
    entry.result = after && after.target_audio_id === row.audioId ? 'linked' : 'not-linked-after-update'
    entry.eventId = eventId
    log.push(entry); console.log(entry.result.toUpperCase(), row.sentenceId, '->', row.audioId)
  }
  const out = evidencePath(`docs/pods/senedd-relink-unlinked-takes-2026-09-11-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log: ${out}`)
}

main().catch(err => { console.error(err); process.exit(1) })
