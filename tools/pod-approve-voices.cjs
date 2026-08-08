#!/usr/bin/env node
/**
 * pod-approve-voices — the human half of the pod sample-first gate.
 *
 * Tom's ruling, 2026-08-07: bulk pod generation CANNOT run for a course until
 * its voices are verified. Phase 8 refuses a bulk /generate-pods with HTTP 409
 * unless an approval here matches the course's LIVE casting fingerprint.
 * Recast the course and the fingerprint moves, so the approval self-invalidates
 * — there is no "remember to revoke" step to forget.
 *
 * The workflow this sits in:
 *   1. curl -X POST localhost:3465/generate-pods/<code> -d '{"sample_limit":5}'
 *   2. listen to the sample clips
 *   3. node tools/pod-approve-voices.cjs --course=<code> --by=<name> --sample-doc=<url>
 *   4. bulk generation is now allowed — until someone recasts the course.
 *
 * Usage:
 *   --course=<code> --by=<name> [--sample-doc=<url>] [--note="..."]   record an approval
 *   --list [--course=<code>]                                          show approvals, live/STALE
 *   --revoke=<code>                                                   remove one approval
 *   --fingerprint=<code>                                              print the live cast digest
 *   --show=<code>                                                     print the cast lines behind it
 *
 * Writes ONLY app_config.pod_voice_approvals, read-modify-write, preserving
 * every other course's key. It never touches pod_voice_pools and never
 * generates audio.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const { createClient } = require('@supabase/supabase-js')
const approvals = require('../services/pod-voice-approvals.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function arg(name) {
  const hit = process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return null
  const eq = hit.indexOf('=')
  return eq === -1 ? true : hit.slice(eq + 1)
}

function usage(msg) {
  if (msg) console.error(`\n✗ ${msg}`)
  console.error(`
pod-approve-voices — record/inspect pod voice approvals (the sample-first gate)

  --course=<code> --by=<name> [--sample-doc=<url>] [--note="..."]
                              approve the course's CURRENT casting
  --list [--course=<code>]    list approvals with a live/STALE flag
  --revoke=<code>             remove an approval
  --fingerprint=<code>        print the live cast fingerprint
  --show=<code>               print the cast lines the fingerprint is taken over
`)
  process.exit(msg ? 1 : 0)
}

async function courseExists(courseCode) {
  const pods = await approvals.loadCastPods(supabase, courseCode)
  return pods.length
}

async function cmdApprove(courseCode) {
  const by = arg('by')
  if (!by || by === true) usage('--by=<name> is required: an approval is a person vouching for what they heard')

  const podCount = await courseExists(courseCode)
  if (!podCount) usage(`no listening_pods rows for course "${courseCode}" — nothing to approve`)

  const live = await approvals.liveFingerprint(supabase, courseCode)
  const existing = (await approvals.loadApprovals(supabase))[courseCode]
  if (existing && existing.cast_fingerprint === live) {
    console.log(`ℹ  ${courseCode} was already approved at this exact casting (${live}) by ${existing.approved_by} on ${existing.approved_at}.`)
    console.log('   Re-recording it anyway with your name.')
  }

  const record = {
    approved_by: by,
    approved_at: new Date().toISOString(),
    cast_fingerprint: live,
    sample_doc_url: arg('sample-doc') === true ? null : arg('sample-doc'),
    note: arg('note') === true ? null : arg('note'),
  }
  await approvals.updateApprovals(supabase, all => ({ ...all, [courseCode]: record }))

  console.log(`✓ Approved ${courseCode} at casting ${live} (${podCount} pod(s)) — bulk /generate-pods is now allowed.`)
  if (!record.sample_doc_url) {
    console.log('  ⚠ No --sample-doc recorded. The gate does not require one, but without it')
    console.log('    nobody can later check WHICH clips you listened to.')
  }
  console.log('  This approval dies automatically if the course is recast.')
}

async function cmdList() {
  const all = await approvals.loadApprovals(supabase)
  const only = arg('course')
  const codes = Object.keys(all).filter(c => !only || only === true || c === only).sort()
  if (!codes.length) {
    console.log('No pod voice approvals on record. Every course is currently BULK-BLOCKED.')
    return
  }
  console.log(`${codes.length} approval(s):\n`)
  for (const code of codes) {
    const a = all[code]
    let live
    try { live = await approvals.liveFingerprint(supabase, code) } catch (e) { live = `ERR ${e.message}` }
    const status = a.cast_fingerprint === live ? 'LIVE ' : 'STALE'
    console.log(`  [${status}] ${code}`)
    console.log(`           approved ${a.cast_fingerprint} by ${a.approved_by} at ${a.approved_at}`)
    if (status === 'STALE') console.log(`           live cast is ${live} — course recast since; bulk generation is blocked`)
    if (a.sample_doc_url) console.log(`           sample: ${a.sample_doc_url}`)
    if (a.note) console.log(`           note: ${a.note}`)
  }
}

async function cmdRevoke(courseCode) {
  const all = await approvals.loadApprovals(supabase)
  if (!all[courseCode]) {
    console.log(`ℹ  No approval on record for ${courseCode} — nothing to revoke (it is already blocked).`)
    return
  }
  await approvals.updateApprovals(supabase, cur => {
    const next = { ...cur }
    delete next[courseCode]
    return next
  })
  console.log(`✓ Revoked ${courseCode}. Bulk /generate-pods is blocked again; sample runs still work.`)
}

;(async () => {
  try {
    if (arg('help') || process.argv.length <= 2) usage()

    const revoke = arg('revoke')
    const show = arg('show')
    const fp = arg('fingerprint')

    if (arg('list')) return await cmdList()
    if (revoke && revoke !== true) return await cmdRevoke(revoke)
    if (fp && fp !== true) return console.log(await approvals.liveFingerprint(supabase, fp))
    if (show && show !== true) {
      const lines = approvals.castLines(await approvals.loadCastPods(supabase, show))
      console.log(lines.join('\n'))
      return console.log(`\n${lines.length} cast line(s) → fingerprint ${approvals.castFingerprint(await approvals.loadCastPods(supabase, show))}`)
    }

    const course = arg('course')
    if (course && course !== true) return await cmdApprove(course)
    usage('nothing to do — pass --course=<code> --by=<name>, --list, or --revoke=<code>')
  } catch (err) {
    console.error(`✗ ${err.message}`)
    process.exit(1)
  }
})()
