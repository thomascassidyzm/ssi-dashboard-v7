/**
 * Pod voice approval endpoint — the write side of the sample-first hard gate.
 *
 *   GET  /api/pod-voice-approval?course=<code>   auth required
 *        → the cast AS STORED (every pod of the course), the gate's own live
 *          fingerprint, and the approval on record.
 *   POST /api/pod-voice-approval                 auth required
 *        body { course_code, decision: 'approve'|'reject', cast_fingerprint, note }
 *        → read-modify-writes app_config.pod_voice_approvals.
 *
 * WHY THE FINGERPRINT IS IMPORTED, NOT COPIED: phase-8's refusal path calls
 * castFingerprint() from services/pod-voice-approvals.cjs. If this route
 * computed the digest its own way and drifted by one character, every approval
 * Tom granted would read as STALE and pod generation would refuse for ever.
 * So this route imports that exact module — one implementation, both sides.
 *
 * REJECT never writes a `cast_fingerprint` key. evaluateApproval() treats a
 * record whose cast_fingerprint doesn't equal the live digest as a refusal, so
 * a rejection cannot be mistaken for an approval by construction — the note
 * survives for the next reader without opening the generation door.
 *
 * Writes ONLY the app_config row keyed 'pod_voice_approvals'. It never touches
 * pod_voice_pools, listening_pods, or any audio.
 */

import { getSupabase } from './lib/supabase.js'
import { verifySupabaseJWT } from './lib/auth.js'
import approvals from '../services/pod-voice-approvals.cjs'

const { castFingerprint, loadCastPods, loadApprovals, updateApprovals, evaluateApproval } = approvals

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No session' })
  const user = await verifySupabaseJWT(token)
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

  try {
    if (req.method === 'GET') return await getState(req, res, supabase)
    return await postDecision(req, res, supabase, user)
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) })
  }
}

async function getState(req, res, supabase) {
  const courseCode = String(req.query.course || '').trim()
  if (!courseCode) return res.status(400).json({ error: 'course is required' })

  // The cast the gate fingerprints spans EVERY pod of the course, not just
  // pod-0 — four courses (spa_for_eng, hrv_for_eng, cym_n/s_for_eng) have more.
  const pods = await loadCastPods(supabase, courseCode)
  const live = castFingerprint(pods)
  const all = await loadApprovals(supabase)
  const record = all[courseCode] || null

  const { data: course } = await supabase
    .from('courses')
    .select('course_code, display_name, target_lang, known_lang')
    .eq('course_code', courseCode)
    .maybeSingle()

  return res.json({
    course_code: courseCode,
    course: course || null,
    pods: pods.map((p) => ({ id: p.id, speakers: p.speakers || {} })),
    cast_fingerprint: live,
    record,
    // The gate's own verdict, so the page states exactly what phase-8 will do.
    gate: evaluateApproval(record && record.cast_fingerprint ? record : null, live),
  })
}

async function postDecision(req, res, supabase, user) {
  const body = req.body || {}
  const courseCode = String(body.course_code || '').trim()
  const decision = String(body.decision || '').trim()
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : ''
  if (!courseCode) return res.status(400).json({ error: 'course_code is required' })
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: "decision must be 'approve' or 'reject'" })
  }

  // A course with no pods still fingerprints (the digest of an empty cast) —
  // check the pods themselves, or an approval could be granted for nothing.
  const pods = await loadCastPods(supabase, courseCode)
  if (!pods.length) return res.status(404).json({ error: `no pods found for ${courseCode}` })
  const live = castFingerprint(pods)

  // The client sends back the fingerprint of the cast it actually rendered and
  // played. If a recast landed between the page load and the click, the
  // approval would be for casting nobody listened to — refuse, don't guess.
  if (body.cast_fingerprint && body.cast_fingerprint !== live) {
    return res.status(409).json({
      error: 'The casting changed since this page loaded — reload and re-listen before approving.',
      seen: body.cast_fingerprint,
      live,
    })
  }

  const by = user.email || 'admin'
  const now = new Date().toISOString()
  const entry =
    decision === 'approve'
      ? { approved_by: by, approved_at: now, cast_fingerprint: live, note }
      : // No cast_fingerprint key: evaluateApproval() cannot read this as an approval.
        { rejected_by: by, rejected_at: now, rejected_cast_fingerprint: live, note }

  // Read-modify-write through the gate module's own helper: every other
  // course's entry survives untouched.
  await updateApprovals(supabase, (all) => ({ ...all, [courseCode]: entry }))

  return res.json({
    ok: true,
    course_code: courseCode,
    decision,
    cast_fingerprint: live,
    record: entry,
    gate: evaluateApproval(decision === 'approve' ? entry : null, live),
  })
}
