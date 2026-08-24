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

/** The thing an ear has to be given once: one voice on one track. */
function voiceTrackKey(item) {
  const v = (item && item.voice) || {}
  return `${item.kind}|${v.provider}|${v.voice_id}|${v.locale || ''}`
}

/**
 * The longest sample an EXCHANGE is allowed to eat. Six lines is enough to
 * hear two people talk and still leaves room under a 10-clip cap for the
 * voices the exchange didn't reach.
 */
const EXCHANGE_MAX = 6

/**
 * Find a contiguous run of consecutive same-track lines of one pod in which
 * two different voices answer each other. Pure; returns [] when the queue
 * holds no such run (a one-voice pod, or a queue with no two same-track
 * neighbours).
 *
 * "Consecutive" means consecutive WITHIN a track: the queue interleaves each
 * sentence's target and known clip, so raw array neighbours are usually the
 * two halves of one line, not two turns of a conversation.
 *
 * The run is anchored so the voice change sits at its END — a window cut off
 * the front of a long monologue would be one voice again.
 */
function selectExchange(workQueue, budget) {
  if (budget < 2) return []
  const streams = new Map() // `${pod_id}|${kind}` → items in queue order
  for (const item of workQueue) {
    const k = `${item.pod_id || ''}|${item.kind}`
    if (!streams.has(k)) streams.set(k, [])
    streams.get(k).push(item)
  }
  for (const stream of streams.values()) {
    for (let i = 0; i + 1 < stream.length; i++) {
      const a = voiceTrackKey(stream[i])
      const b = voiceTrackKey(stream[i + 1])
      if (a === b) continue
      // Extend backwards while the run stays inside these two voices, so the
      // exchange starts where the conversation does rather than mid-turn.
      const pair = new Set([a, b])
      let start = i
      while (start > 0 && pair.has(voiceTrackKey(stream[start - 1]))) start--
      const window = stream.slice(start, i + 2)
      return window.slice(Math.max(0, window.length - budget))
    }
  }
  return []
}

/**
 * Truncate a work queue to `limit` clips so the sample answers the two
 * questions the gate is actually asked.
 *
 * 1. DO THE TWO VOICES WORK TOGETHER? (Tom, 2026-08-11 — the T-14 rejection:
 *    "pods are dialogue — they need distinct speakers".) The sample leads with
 *    a real EXCHANGE: consecutive lines of one pod on one track where the cast
 *    puts two different voices against each other. Ten clips scattered across
 *    ten scenes never let an ear judge a two-hander.
 * 2. IS EVERY VOICE COVERED? Slots are reserved up front for each distinct
 *    (track, provider, voice_id, locale) the exchange does not reach, so a
 *    conversation between two characters can never crowd out the rest of the
 *    cast — the property this function had before the exchange existed.
 *
 * Pure: takes and returns plain work items, generates nothing.
 */
function selectSample(workQueue, limit) {
  const distinct = new Set(workQueue.map(voiceTrackKey))
  // Two of the distinct voices are the exchange's own; every other one needs
  // a slot kept back for it.
  const reserved = Math.max(0, distinct.size - 2)
  const exchange = selectExchange(workQueue, Math.min(EXCHANGE_MAX, limit - reserved))

  const picked = []
  const takenItems = new Set(exchange)
  const seen = new Set(exchange.map(voiceTrackKey))
  picked.push(...exchange)

  const rest = []
  for (const item of workQueue) {
    if (takenItems.has(item)) continue
    const k = voiceTrackKey(item)
    if (seen.has(k)) rest.push(item)
    else { seen.add(k); picked.push(item) }
  }
  return [...picked, ...rest].slice(0, limit)
}

// ---------------------------------------------------------------------------
// WHICH POD HOLDS THE CURRENT CONTENT
// ---------------------------------------------------------------------------
// Tom's T-14 rejection, 2026-08-11: "The samples were generated from an older
// snapshot of pod-0 (~140 sentences). Aran has since done substantial
// proofreading/authoring work and pod-0 now holds MORE THAN 200 sentences."
//
// That is not a stale cache — it is the wrong pod. Three courses carry a
// `pod-0-unrecorded` working copy alongside `pod-0`, and the current content
// lives in the working copy:
//   spa_for_eng   pod-0 = 142 sentences   pod-0-unrecorded = 232   (the ~140)
//   cym_n_for_eng pod-0 =   0             pod-0-unrecorded = 232
//   cym_s_for_eng pod-0 =   0             pod-0-unrecorded = 232
// The Welsh `pod-0` rows are [GATED 2026-08-06] placeholders, deliberately
// emptied so no learner sees an unrecorded pod. Anything that hard-codes
// `<course>:pod-0` therefore reads either a stale snapshot or nothing at all.
//
// SECOND, Tom's ruling of 2026-08-22: "We want to not have a Pod 0 from now on.
// We want this first one to be called Pod 1." hrv_for_eng is the first course
// across — after its cutover it has NO `pod-0` and NO `pod-0-unrecorded`; the
// live pod is `hrv_for_eng:pod-1` (231 lines) and the old content is parked on
// `pod-0-retired-2026-08-22` / `pod-1-retired-2026-08-22`. The other ~68
// courses stay on `pod-0`. So the serving slug is a PER-COURSE fact, and this
// resolver had two bugs against it: a course with only `pod-1` resolved to
// null, and the `startsWith('pod-0')` family match happily picked an ARCHIVED
// `pod-0-retired-…` pod (they keep pod_type='core' through the rename).
//
// Hence: an explicit allowlist of serving slugs in preference order, rather
// than a prefix match plus a sentence-count sort. Retired/experimental slugs
// can never win by being big.
//
// HELD PODS (Tom, 2026-08-23). `listening_pods.visibility` gates learner
// reachability: 'held' pods are invisible to the learner app through RLS. The
// browser-side twin (src/lib/servingPod.js) EXCLUDES held pods by default,
// because its callers sit on pages that describe what a learner gets.
//
// This one does the opposite, on purpose. Every caller of resolveCurrentPod0 is
// voice approval or PodLab casting — api/pod-voice-approval.js and
// api/pod-cast-voices.js — and both exist to review content BEFORE it is
// released. That is precisely what a held pod is. Excluding held pods here
// would break the workflow the hold was invented to protect: you would be
// unable to approve the voices of the pod you are holding, so the only way to
// get a pod approved would be to make it live first — an automatic-live
// pressure, which is the exact thing Tom's ruling forbids.
//
// So the option exists and is shaped identically (`{ includeHeld }`), and the
// DEFAULT is `true` here and `false` there. Same word, opposite default,
// because the two resolvers answer different questions: "what may a learner
// reach?" vs "what is this course's current content?". A future caller that
// wants the learner-facing answer from this module passes
// `{ includeHeld: false }` and gets it.
//
// Pure. `pods` is [{ id, slug?, sentence_count, pod_type?, visibility? }].

// Preference order, most-preferred first:
//   pod-0-unrecorded — the working copy three courses review before release
//   pod-1            — the 1-based serving slug (Tom, 2026-08-22)
//   pod-0            — the fleet's legacy serving slug
const SERVING_SLUGS = ['pod-0-unrecorded', 'pod-1', 'pod-0']

function slugOf(pod) {
  if (pod.slug) return pod.slug
  const i = String(pod.id || '').indexOf(':')
  return i < 0 ? String(pod.id || '') : String(pod.id).slice(i + 1)
}

// pod_type is absent from some callers' projections; absence is not evidence of
// a non-core pod, so only an explicit non-'core' value disqualifies.
function isCore(pod) {
  return pod.pod_type == null || pod.pod_type === 'core'
}

/**
 * The pod whose sentences are the course's CURRENT core-pod content.
 * Working copy first when it actually holds lines, then pod-1, then pod-0.
 * Returns null when the course has no serving core pod at all.
 *
 * @param {Array} pods
 * @param {{includeHeld?:boolean}} [opts] defaults to INCLUDING held pods — see
 *   the note above. Pass `{ includeHeld: false }` for a learner-facing answer,
 *   and select `visibility` when you do: the exclusion fails closed, so a row
 *   without the column does not count as live.
 */
function resolveCurrentPod0(pods, opts = {}) {
  const includeHeld = opts.includeHeld !== false
  const family = (pods || [])
    .filter((p) => isCore(p) && SERVING_SLUGS.includes(slugOf(p)))
    .filter((p) => includeHeld || p.visibility === 'live')
  if (!family.length) return null
  const populated = family.filter((p) => (p.sentence_count || 0) > 0)
  const pool = populated.length ? populated : family
  for (const slug of SERVING_SLUGS) {
    const hit = pool.find((p) => slugOf(p) === slug)
    if (hit) return hit
  }
  return null
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

// ---------------------------------------------------------------------------
// Uncast-speaker check (Tom's ruling, 2026-08-14 — the Thai cast gap)
// ---------------------------------------------------------------------------
//
// The approval fingerprint above can only see speaker labels that EXIST as keys
// in listening_pods.speakers. A label that appears only in the pod's sentence
// rows is invisible to it — and phase8's resolvePodSpeakerVoice() quietly drops
// such a line onto speakers._default. That is not a shrug, it is the wrong voice
// on a learner-facing line: tha_for_eng:pod-0-unrecorded carries 43 lines under
// 'Customer 1/2/3', 'Customer' and 'Passenger' with no cast entry, 18 of them
// written female, all of which would have rendered on the single male default.
//
// So: an unnamed speaker is an ERROR, and it is an error in BOTH modes. Sample
// mode exists to let an ear approve a casting; a sample that renders an uncast
// role on the default voice is exactly the deception the gate is for. The escape
// is to cast the role (or relabel the rows to a role that IS cast) — which is
// the work that has to happen anyway.
//
// Matching mirrors resolvePodSpeakerVoice(): canonical name first (parens
// stripped, so "Barista (3 pm)" resolves against "Barista"), then the raw label
// for legacy pods. `_default` deliberately does NOT rescue anything — it is the
// failure mode, not a fallback.

/**
 * Find speaker labels used by a pod's sentences that have no cast entry. Pure.
 *
 * @param {Array<{id:string, speakers:object, sentences:Array<{speaker:string}>}>} pods
 * @returns {Array<{pod_id:string, speaker:string, lines:number, labels:string[]}>}
 *   one row per (pod, canonical role), most lines first. Empty = every speaker
 *   in every pod's sentences is cast.
 */
function findUncastSpeakers(pods) {
  const out = []
  for (const pod of pods || []) {
    const speakers = pod.speakers || {}
    const byRole = new Map()
    for (const s of pod.sentences || []) {
      const raw = String(s.speaker == null ? '' : s.speaker)
      const canon = canonicalSpeaker(raw)
      if (canon && Object.prototype.hasOwnProperty.call(speakers, canon)) continue
      if (raw && Object.prototype.hasOwnProperty.call(speakers, raw)) continue
      const key = canon || '(blank speaker)'
      const entry = byRole.get(key) || { pod_id: pod.id, speaker: key, lines: 0, labels: new Set() }
      entry.lines += 1
      entry.labels.add(raw)
      byRole.set(key, entry)
    }
    const rows = [...byRole.values()]
      .sort((a, b) => b.lines - a.lines || a.speaker.localeCompare(b.speaker))
      .map(e => ({ pod_id: e.pod_id, speaker: e.speaker, lines: e.lines, labels: [...e.labels].sort() }))
    out.push(...rows)
  }
  return out
}

/** Human-readable one-liner for the refusal body. Pure. */
function describeUncastSpeakers(uncast) {
  const total = uncast.reduce((n, u) => n + u.lines, 0)
  const roles = uncast.map(u => `${u.speaker} (${u.lines} line${u.lines === 1 ? '' : 's'}, ${u.pod_id})`).join('; ')
  return `${uncast.length} speaker role(s) covering ${total} line(s) have no entry in listening_pods.speakers `
    + `and would render on the pod's _default voice: ${roles}. `
    + 'Cast each role in listening_pods.speakers, or relabel those sentence rows to a role that is already cast, '
    + 'then re-run. An unnamed speaker is never rendered on a guess.'
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
  selectExchange,
  voiceTrackKey,
  EXCHANGE_MAX,
  canonicalSpeaker,
  trackKey,
  castFingerprint,
  castLines,
  resolveCurrentPod0,
  loadCastPods,
  liveFingerprint,
  loadApprovals,
  updateApprovals,
  evaluateApproval,
  checkApproval,
  findUncastSpeakers,
  describeUncastSpeakers,
}
