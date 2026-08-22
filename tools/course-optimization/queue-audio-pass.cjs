#!/usr/bin/env node
/**
 * Queue an audio-pass request for a course — the standing END STEP of every
 * content pass (see services/shared/audio-pass-queue.cjs). Queues only; TTS
 * itself stays approval-gated.
 *
 * Usage:
 *   node tools/course-optimization/queue-audio-pass.cjs <course_code> --reason "<pass name>" [--by "@agent"] [--rows N]
 *   node tools/course-optimization/queue-audio-pass.cjs --list          # show pending requests
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--list')) {
    const { data, error } = await supabase
      .from('audio_pass_requests')
      .select('course_code, reason, requested_by, metadata, created_at, updated_at')
      .eq('status', 'pending')
      .order('created_at')
    if (error) throw error
    if (!data.length) return console.log('No pending audio-pass requests.')
    for (const r of data) console.log(`${r.course_code}  since ${r.created_at}  — ${r.reason} (${r.requested_by || 'unknown'})${r.metadata?.rowsTouched ? ` rows=${r.metadata.rowsTouched}` : ''}`)
    return
  }

  const courseCode = args.find(a => !a.startsWith('-'))
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
  const reason = flag('--reason')
  if (!courseCode || !reason) {
    console.error('Usage: queue-audio-pass.cjs <course_code> --reason "<pass name>" [--by "@agent"] [--rows N]')
    process.exit(1)
  }
  const rows = flag('--rows')
  const result = await queueAudioPass(supabase, {
    courseCode,
    reason,
    requestedBy: flag('--by'),
    metadata: rows ? { rowsTouched: Number(rows) } : {}
  })
  if (result.error) { console.error(`FAILED: ${result.error}`); process.exit(1) }
  if (result.refused) {
    console.error(
      `REFUSED: ${courseCode} is a human-voice course — no TTS is ever queued for it ` +
      '(Tom 2026-08-13). Changed content there is a recording task for Aran and Catrin.'
    )
    process.exit(2)
  }
  console.log(result.queued ? `Queued audio-pass request for ${courseCode}.` : `Pending request for ${courseCode} already existed — touched it.`)
}

main().catch(e => { console.error(e); process.exit(1) })
