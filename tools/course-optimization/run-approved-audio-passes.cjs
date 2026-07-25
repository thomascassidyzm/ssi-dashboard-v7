#!/usr/bin/env node
/**
 * Run APPROVED audio-pass requests through phase8 /generate — the fulfilment
 * side of the audio-pass queue (services/shared/audio-pass-queue.cjs).
 *
 * TTS is approval-gated: this tool refuses to generate for a request that has
 * not been explicitly approved. Approval is recorded on the queue row itself
 * (metadata.approval), so the audit trail lives with the request:
 *
 *   node tools/course-optimization/run-approved-audio-passes.cjs \
 *     --approve --reason-prefix "BUILD template-stamp regeneration" \
 *     --by "Tom (owner-approved, chat 2026-07-24)"
 *
 *   node tools/course-optimization/run-approved-audio-passes.cjs \
 *     --run --reason-prefix "BUILD template-stamp regeneration"
 *
 * --run is SEQUENTIAL (phase8 has one work slot and no busy-lock on
 * /generate) and RESUME-SAFE: phase8 marks a request fulfilled only on a
 * zero-failure pass, and /generate itself only voices missing/unlinked audio,
 * so re-running after an interruption picks up exactly where it stopped.
 * Gate stack note: /generate renders through services/tts-service.cjs
 * (pinned-voice resolution from course voice_config, child-voice blocklist,
 * tail-click detector, xAI phonology gate) — this tool never calls TTS
 * providers itself.
 */
require('dotenv').config()
const http = require('http')
const { createClient } = require('@supabase/supabase-js')
const { isHumanVoiceCourse } = require('../../services/shared/human-voice-courses.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465'

const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const reasonPrefix = flag('--reason-prefix')
const ts = () => new Date().toISOString()

async function pendingRequests() {
  let q = supabase
    .from('audio_pass_requests')
    .select('id, course_code, reason, metadata, created_at')
    .eq('status', 'pending')
    .order('created_at')
  if (reasonPrefix) q = q.like('reason', `${reasonPrefix}%`)
  const { data, error } = await q
  if (error) throw error
  return data
}

// Plain http (not fetch): a big course's /generate can hold the response open
// for well over undici's 300s headers timeout. No client timeout at all —
// completion is however long TTS takes.
function post(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${PHASE8}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let buf = ''
      res.on('data', c => { buf += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }) }
        catch { resolve({ status: res.statusCode, body: { raw: buf.slice(0, 500) } }) }
      })
    })
    req.on('error', reject)
    req.end(JSON.stringify(body || {}))
  })
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${PHASE8}${path}`, res => {
      let buf = ''
      res.on('data', c => { buf += c })
      res.on('end', () => { try { resolve(JSON.parse(buf)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

async function approve() {
  const by = flag('--by')
  if (!reasonPrefix || !by) {
    console.error('Usage: --approve --reason-prefix "<prefix>" --by "<who approved>"')
    process.exit(1)
  }
  const rows = await pendingRequests()
  if (!rows.length) return console.log('No pending requests match.')
  for (const r of rows) {
    const approval = { approved: true, by, at: ts(), reason_at_approval: r.reason }
    const { error } = await supabase
      .from('audio_pass_requests')
      .update({ metadata: { ...r.metadata, approval }, updated_at: ts() })
      .eq('id', r.id)
      .eq('status', 'pending')
    if (error) throw error
    console.log(`approved  ${r.course_code}`)
  }
  console.log(`\nApproved ${rows.length} pending request(s).`)
}

async function run() {
  if (!reasonPrefix) {
    console.error('Usage: --run --reason-prefix "<prefix>" (refuses to run the whole queue blind)')
    process.exit(1)
  }
  const health = await get('/health').catch(() => null)
  if (health?.service !== 'phase8-audio-v13') {
    console.error(`phase8 not healthy at ${PHASE8} — aborting before any TTS`)
    process.exit(1)
  }
  const status = await get('/status').catch(() => ({}))
  if (status?.active) {
    console.error(`phase8 already has active work (${status.operation} ${status.courseCode}) — aborting`)
    process.exit(1)
  }

  const rows = await pendingRequests()
  // Human-voice-only courses (Welsh cym_*) are never synthesised (Tom 2026-07-25).
  // /generate skips them anyway, but drop them here so they never count as work.
  const humanVoice = rows.filter(r => isHumanVoiceCourse(r.course_code))
  if (humanVoice.length) console.log(`Skipping ${humanVoice.length} human-voice-only request(s) — no TTS ever (Tom 2026-07-25): ${humanVoice.map(r => r.course_code).join(', ')}`)
  const eligible = rows.filter(r => !isHumanVoiceCourse(r.course_code))
  const approved = eligible.filter(r => r.metadata?.approval?.approved === true)
  const unapproved = eligible.filter(r => !r.metadata?.approval?.approved)
  if (unapproved.length) console.log(`Skipping ${unapproved.length} matching-but-UNAPPROVED request(s): ${unapproved.map(r => r.course_code).join(', ')}`)
  console.log(`[${ts()}] ${approved.length} approved pending request(s) to fulfil, sequentially.\n`)

  const summary = { fulfilled: [], stillPending: [], errored: [] }
  for (const [i, r] of approved.entries()) {
    console.log(`[${ts()}] (${i + 1}/${approved.length}) ${r.course_code} — POST /generate ...`)
    let result
    try {
      result = await post(`/generate/${r.course_code}`, {})
    } catch (e) {
      console.error(`[${ts()}] ${r.course_code} REQUEST ERROR: ${e.message} — request stays pending, continuing`)
      summary.errored.push(r.course_code)
      continue
    }
    const b = result.body || {}
    console.log(`[${ts()}] ${r.course_code} → HTTP ${result.status} status=${b.status} generated=${b.success ?? '?'}/${b.total ?? '?'} failed=${b.failed ?? '?'} linked=${b.linked ?? 0} copied=${b.copied ?? 0}${b.errors?.length ? ` firstError="${JSON.stringify(b.errors[0]).slice(0, 200)}"` : ''}`)

    const { data: after } = await supabase
      .from('audio_pass_requests')
      .select('status').eq('id', r.id).single()
    if (after?.status === 'fulfilled') summary.fulfilled.push(r.course_code)
    else if (result.status === 200 && b.failed === 0 && b.status === 'completed') summary.fulfilled.push(r.course_code)
    else summary.stillPending.push(r.course_code)
  }

  console.log(`\n[${ts()}] DONE. fulfilled=${summary.fulfilled.length} stillPending=${summary.stillPending.length} errored=${summary.errored.length}`)
  if (summary.stillPending.length) console.log(`Still pending (had failures — re-run to retry the missing remainder): ${summary.stillPending.join(', ')}`)
  if (summary.errored.length) console.log(`Errored (no response): ${summary.errored.join(', ')}`)
}

async function main() {
  if (args.includes('--approve')) return approve()
  if (args.includes('--run')) return run()
  console.error('Usage: run-approved-audio-passes.cjs (--approve --reason-prefix "<p>" --by "<who>") | (--run --reason-prefix "<p>")')
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
