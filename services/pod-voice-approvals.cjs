/**
 * Pod voice approvals — the sample-first hard gate.
 *
 * Tom's ruling, 2026-08-07:
 *   "SAMPLE-FIRST IS A HARD GATE: build the gate so bulk generation CANNOT run
 *    for a course until its voices are verified."
 *
 * Why this exists: 16 eng_for_* courses are cast with Chinese voices in
 * listening_pods.speakers today (docs/pods/pod-redo-scope-2026-08-07.md §4a).
 * Nothing stopped a ~4,000-clip run on that casting; it would have burned ~19
 * hours of whisper to produce nothing. The gate is the thing that stops it.
 *
 * The design in one line: an approval is only valid for the EXACT casting it
 * was granted against. Recast a course and the fingerprint moves, so the old
 * approval stops counting by itself — no revocation step to forget.
 *
 * Storage: app_config row, key 'pod_voice_approvals'. No migration needed.
 *   { "<course_code>": { approved_by, approved_at, cast_fingerprint,
 *                        sample_doc_url, note } }
 *
 * No DB, no network, no spend in castFingerprint() — it is pure, and the tests
 * in pod-voice-approvals.test.cjs hold its two load-bearing properties:
 * order-independence and self-invalidation.
 */

const crypto = require('crypto')

const APPROVALS_KEY = 'pod_voice_approvals'

// Canonical speaker name = parens stripped, whitespace collapsed.
// "Susjed (08:00) (M)" → "Susjed". Deliberately a local 2-line copy of
// tools/pod-sync.cjs#canonicalSpeakerName rather than an import: requiring
// pod-sync pulls in dotenv + a live Supabase client at module load, and this
// module is imported by a CLI and by unit tests that must touch neither.
function canonicalSpeaker(speaker) {
  return String(speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

// One track (target|known) of one speaker, rendered as a stable string.
// Mirrors what resolvePodSpeakerVoice() in phase8 actually hands the TTS
// provider — including the legacy top-level shape, where only the target voice
// exists and the provider defaults to xai. If the fingerprint disagreed with
// the resolver, an approval could be valid for casting that never renders.
function trackKey(entry, track) {
  if (!entry || typeof entry !== 'object') return 'none'
  if (entry.deferred) return 'deferred'
  const t = entry[track]
  if (t && t.voice_id) {
    return [t.provider || 'azure', t.voice_id, t.locale || ''].join(':')
  }
  if (track === 'target' && entry.voice_id) {
    return [entry.provider || 'xai', entry.voice_id, entry.locale || ''].join(':')
  }
  return 'none'
}

/**
 * Fingerprint the RESOLVED casting of a course.
 *
 * @param {Array<{id: string, speakers: object}>} pods
 * @returns {string} 16-hex-char stable digest, order-independent.
 */
function castFingerprint(pods) {
  const lines = []
  for (const pod of pods || []) {
    const speakers = pod.speakers || {}
    for (const rawName of Object.keys(speakers)) {
      lines.push([
        pod.id,
        canonicalSpeaker(rawName),
        trackKey(speakers[rawName], 'target'),
        trackKey(speakers[rawName], 'known'),
      ].join('|'))
    }
  }
  // Sort AFTER rendering, so neither pod order nor JSON key order can move the
  // digest. Dedup: two raw speaker labels that canonicalise to the same name
  // with identical voices are one casting fact, not two.
  const body = [...new Set(lines)].sort().join('\n')
  return crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)
}

/** The lines that went into the digest — for CLI diffing, never for storage. */
function castLines(pods) {
  const lines = []
  for (const pod of pods || []) {
    const speakers = pod.speakers || {}
    for (const rawName of Object.keys(speakers)) {
      lines.push([pod.id, canonicalSpeaker(rawName),
        trackKey(speakers[rawName], 'target'), trackKey(speakers[rawName], 'known')].join('|'))
    }
  }
  return [...new Set(lines)].sort()
}

// ---------------------------------------------------------------------------
// Sample mode
// ---------------------------------------------------------------------------

const SAMPLE_LIMIT_MAX = 10

/**
 * Parse body.sample_limit into a mode decision. Pure.
 *
 * Strict on purpose: a malformed sample_limit must never fall through to bulk,
 * because that is the gate's own bypass. `true`, `"5"`, `0`, `2.5` are all
 * refusals, not a mode.
 *
 * @returns {{mode: 'bulk'} | {mode: 'sample', limit: number} | {mode: 'error', message: string}}
 */
function parseSampleLimit(raw, max = SAMPLE_LIMIT_MAX) {
  if (raw === undefined || raw === null) return { mode: 'bulk' }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    return {
      mode: 'error',
      message: `sample_limit must be a positive integer (max ${max}); got ${JSON.stringify(raw)}`,
    }
  }
  return { mode: 'sample', limit: Math.min(max, raw) }
}

/**
 * Truncate a work queue to `limit` clips, taking the first clip of each
 * distinct (track, provider, voice_id, locale) before any second clip of a
 * voice already covered. A 5-clip sample that happened to be five lines from
 * one character would approve nothing about the rest of the cast.
 *
 * Pure: takes and returns plain work items, generates nothing.
 */
function selectSample(workQueue, limit) {
  const seen = new Set()
  const firstOfVoice = []
  const rest = []
  for (const item of workQueue) {
    const v = item.voice || {}
    const k = `${item.kind}|${v.provider}|${v.voice_id}|${v.locale || ''}`
    if (seen.has(k)) rest.push(item); else { seen.add(k); firstOfVoice.push(item) }
  }
  return [...firstOfVoice, ...rest].slice(0, limit)
}

// ---------------------------------------------------------------------------
// Storage (needs a supabase client passed in — this module owns no connection)
// ---------------------------------------------------------------------------

async function loadCastPods(supabase, courseCode) {
  const { data, error } = await supabase
    .from('listening_pods').select('id, speakers').eq('course_code', courseCode)
  if (error) throw new Error(`load pods for fingerprint: ${error.message}`)
  return data || []
}

async function liveFingerprint(supabase, courseCode) {
  return castFingerprint(await loadCastPods(supabase, courseCode))
}

async function loadApprovals(supabase) {
  const { data, error } = await supabase
    .from('app_config').select('value').eq('key', APPROVALS_KEY).maybeSingle()
  if (error) throw new Error(`load ${APPROVALS_KEY}: ${error.message}`)
  return (data && data.value) || {}
}

/**
 * Read-modify-write of the approvals row. `mutate(approvals)` gets the whole
 * object and returns the whole object — every other course's key survives.
 * Only ever touches the pod_voice_approvals row; pod_voice_pools is not ours.
 */
async function updateApprovals(supabase, mutate) {
  const current = await loadApprovals(supabase)
  const next = mutate({ ...current })
  const { error } = await supabase
    .from('app_config')
    .upsert({ key: APPROVALS_KEY, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(`save ${APPROVALS_KEY}: ${error.message}`)
  return next
}

/**
 * Decide whether bulk generation may run for a course.
 * Pure decision helper — takes the approval record and the live fingerprint,
 * so it is unit-testable without a DB.
 *
 * @returns {{ok: boolean, reason: string, message?: string}}
 */
function evaluateApproval(approval, live) {
  if (!approval) {
    return {
      ok: false,
      reason: 'no_approval',
      message: 'No voice approval on record for this course. Generate a sample first '
        + '(POST /generate-pods/:courseCode with {"sample_limit": 5}), listen to it, then run '
        + 'node tools/pod-approve-voices.cjs --course=<code> --by=<name> --sample-doc=<url>',
    }
  }
  if (approval.cast_fingerprint !== live) {
    return {
      ok: false,
      reason: 'stale_approval',
      message: `Voice approval is STALE: it was granted against casting ${approval.cast_fingerprint} `
        + `but the live casting is ${live} — the course has been recast since ${approval.approved_at}. `
        + 'Re-sample and re-approve: node tools/pod-approve-voices.cjs --course=<code> --by=<name>',
    }
  }
  return { ok: true, reason: 'approved' }
}

/** The full DB-backed check used by the endpoint. */
async function checkApproval(supabase, courseCode) {
  const live = await liveFingerprint(supabase, courseCode)
  const approvals = await loadApprovals(supabase)
  const approval = approvals[courseCode] || null
  return { ...evaluateApproval(approval, live), live_fingerprint: live, approval }
}

module.exports = {
  APPROVALS_KEY,
  SAMPLE_LIMIT_MAX,
  parseSampleLimit,
  selectSample,
  canonicalSpeaker,
  trackKey,
  castFingerprint,
  castLines,
  loadCastPods,
  liveFingerprint,
  loadApprovals,
  updateApprovals,
  evaluateApproval,
  checkApproval,
}
