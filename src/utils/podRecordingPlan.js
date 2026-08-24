// src/utils/podRecordingPlan.js
//
// Pure client-side contract module for the pods DIALOGUE AUTOCUE.
//
// The dialogue Record Room consumes
//   GET /api/production/:courseCode/pods/recording-plan?voiceId=
// (keystone: docs/voice-engine/design/pods-recording-model.md §2) — an ordered
// queue (pod → scene → global_order) of every sentence whose cast voice matches,
// each item carrying cue lines, the line itself, identity, and a recorded flag.
//
// The endpoint is built by the parallel casting workstream, so this module is
// deliberately liberal in what it accepts (flat `items` or `pods[].items`,
// camelCase or snake_case, `line` as object or string) and strict in what it
// emits: every consumer downstream sees ONE normalized item shape.
//
// Normalized item shape:
// {
//   podId, podTitle, sentenceId,
//   kind: 'target' | 'known',
//   role: 'target1' | 'known',                      // course_audio role, recon §1
//   speaker, sceneNumber, sceneTitle,               // sceneTitle only on boundaries
//   cues: [{ speaker, targetText, knownText, draft }],  // preceding dialogue lines
//   lineText,                                       // what the human READS
//   lineGloss,                                      // known-language gloss (may be null)
//   glueSentenceIds: [..] | null,                   // glued rows covered by this ONE item
//   draft: boolean,                                 // target words are an unproofread machine draft
//   recorded: boolean,                              // already points at a human row for this voice
//   audioId: uuid | null
// }
//
// No Vue imports — pure functions, unit-tested from services/voice-engine/__tests__.

/**
 * course_audio role per pod line kind. MUST match what phase8's generatePodAudio
 * writes for TTS pod rows (pods-recon-facts.md §1) — never invent a role string:
 *   target line  → 'target1'
 *   known line   → 'known'
 *
 * The pod explainer track was deprecated on 2026-08-24 (Tom's ruling), so
 * 'explainer' is no longer a recordable kind and falls through to null with
 * every other unknown kind — the server never emits one.
 */
export function roleForKind(kind) {
  switch (kind) {
    case 'target': return 'target1'
    case 'known': return 'known'
    default: return null
  }
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

function normalizeCue(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') return { speaker: null, targetText: raw, knownText: null, draft: false }
  return {
    speaker: pick(raw, 'speaker', 'speaker_name', 'speakerName') ?? null,
    targetText: pick(raw, 'targetText', 'target_text', 'text', 'line') ?? '',
    knownText: pick(raw, 'knownText', 'known_text', 'gloss') ?? null,
    draft: Boolean(pick(raw, 'draft', 'target_text_draft') ?? false)
  }
}

function normalizeItem(raw, podCtx = {}) {
  if (!raw || typeof raw !== 'object') return null

  const kind = pick(raw, 'kind', 'track') || 'target'

  // `line` may be { targetText, knownText } / { text, gloss } / a bare string;
  // some shapes put the text top-level instead.
  const lineRaw = pick(raw, 'line')
  let lineText = null
  let lineGloss = null
  if (typeof lineRaw === 'string') {
    lineText = lineRaw
  } else if (lineRaw && typeof lineRaw === 'object') {
    lineText = pick(lineRaw, 'text', 'targetText', 'target_text') ?? null
    lineGloss = pick(lineRaw, 'gloss', 'knownText', 'known_text') ?? null
  }
  if (lineText == null) {
    lineText = pick(raw, 'text', 'targetText', 'target_text') ?? ''
  }
  if (lineGloss == null) {
    lineGloss = pick(raw, 'gloss', 'knownText', 'known_text') ?? null
  }
  // For a known queue the read text IS known-language — no gloss needed.
  if (kind !== 'target' && lineGloss === lineText) lineGloss = null

  const cuesRaw = pick(raw, 'cues', 'context', 'previousLines', 'previous_lines') || []
  const cues = Array.isArray(cuesRaw) ? cuesRaw.map(normalizeCue).filter(Boolean) : []

  const glue = pick(raw, 'glueSentenceIds', 'glue_sentence_ids', 'sentenceIds', 'sentence_ids')

  return {
    podId: pick(raw, 'podId', 'pod_id') ?? podCtx.podId ?? null,
    podTitle: pick(raw, 'podTitle', 'pod_title') ?? podCtx.podTitle ?? null,
    sentenceId: pick(raw, 'sentenceId', 'sentence_id', 'id') ?? null,
    kind,
    role: pick(raw, 'role') ?? roleForKind(kind),
    speaker: pick(raw, 'speaker', 'speakerName', 'speaker_name') ?? null,
    sceneNumber: pick(raw, 'sceneNumber', 'scene_number') ?? null,
    sceneTitle: pick(raw, 'sceneTitle', 'scene_title') ?? null,
    cues,
    lineText,
    lineGloss,
    glueSentenceIds: Array.isArray(glue) && glue.length > 0 ? glue : null,
    // true = the target words on screen are a machine-written DRAFT awaiting a
    // human proofread, not the course's finished text. The studio badges it so a
    // recorder can never read one believing it is final.
    draft: Boolean(pick(raw, 'draft', 'targetTextDraft', 'target_text_draft') ?? false),
    recorded: Boolean(pick(raw, 'recorded', 'isRecorded', 'is_recorded', 'hasHumanAudio', 'has_human_audio') ?? false),
    audioId: pick(raw, 'audioId', 'audio_id', 'audioUuid', 'audio_uuid') ?? null
  }
}

/**
 * Normalize a recording-plan response into { courseCode, voiceId, voiceName,
 * speakers, items, totals }. Accepts a flat ordered `items` array (canonical)
 * or a `pods: [{ podId, title, items }]` grouping; order is preserved exactly
 * as served (the server owns pod → scene → global_order ordering).
 */
export function normalizeRecordingPlan(raw) {
  if (!raw || typeof raw !== 'object') {
    return { courseCode: null, voiceId: null, voiceName: null, speakers: [], items: [], totals: { total: 0, recorded: 0, remaining: 0 } }
  }

  let items = []
  if (Array.isArray(raw.items)) {
    items = raw.items.map(it => normalizeItem(it)).filter(Boolean)
  } else if (Array.isArray(raw.pods)) {
    for (const pod of raw.pods) {
      const podCtx = {
        podId: pick(pod, 'podId', 'pod_id', 'id') ?? null,
        podTitle: pick(pod, 'podTitle', 'pod_title', 'title') ?? null
      }
      const podItems = Array.isArray(pod.items) ? pod.items : []
      for (const it of podItems) {
        const n = normalizeItem(it, podCtx)
        if (n) items.push(n)
      }
    }
  }

  const totalsRaw = pick(raw, 'totals') || {}
  const computed = planTotals(items)

  return {
    courseCode: pick(raw, 'courseCode', 'course_code') ?? null,
    voiceId: pick(raw, 'voiceId', 'voice_id') ?? null,
    voiceName: pick(raw, 'voiceName', 'voice_name', 'name') ?? null,
    speakers: pick(raw, 'speakers', 'characters') ?? [],
    items,
    totals: {
      total: pick(totalsRaw, 'items', 'total') ?? computed.total,
      recorded: pick(totalsRaw, 'recorded') ?? computed.recorded,
      remaining: pick(totalsRaw, 'remaining') ?? computed.remaining
    }
  }
}

/** Honest counts from the items themselves (recorded = plan flag). */
export function planTotals(items) {
  const total = items.length
  const recorded = items.reduce((n, it) => n + (it.recorded ? 1 : 0), 0)
  return { total, recorded, remaining: total - recorded }
}

/**
 * Per-pod progress, in plan order: [{ podId, podTitle, total, recorded }].
 * `extraRecorded` is an optional Set of sentenceIds captured THIS session
 * (not yet reflected in the served plan).
 */
export function podProgress(items, extraRecorded = null) {
  const pods = []
  const byPod = new Map()
  for (const it of items) {
    const key = it.podId ?? '?'
    let entry = byPod.get(key)
    if (!entry) {
      entry = { podId: it.podId, podTitle: it.podTitle, total: 0, recorded: 0 }
      byPod.set(key, entry)
      pods.push(entry)
    }
    entry.total++
    if (it.recorded || (extraRecorded && extraRecorded.has(it.sentenceId))) entry.recorded++
  }
  return pods
}

/**
 * Resume point: index of the first item not yet recorded (plan flag OR this
 * session's captures). Returns -1 when everything is recorded.
 */
export function firstUnrecordedIndex(items, extraRecorded = null) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const done = it.recorded || (extraRecorded && extraRecorded.has(it.sentenceId))
    if (!done) return i
  }
  return -1
}

/**
 * Next index to record after `fromIndex` (exclusive). Skips items already
 * recorded unless includeRecorded. -1 = nothing left.
 */
export function nextRecordableIndex(items, fromIndex, { extraRecorded = null, includeRecorded = false } = {}) {
  for (let i = fromIndex + 1; i < items.length; i++) {
    const it = items[i]
    const done = it.recorded || (extraRecorded && extraRecorded.has(it.sentenceId))
    if (includeRecorded || !done) return i
  }
  return -1
}

/**
 * Per-item upload metadata for the registration seam
 * (POST /api/production/:courseCode/recording/upload). Contract pinned by the
 * keystone §4 + recon §7: identity { mode:'pod', podId, sentenceId, kind, role,
 * voiceId, text, cadence:'natural' }; the server resolves the canonical
 * voice_id from courses.voice_config.podCast — the client value is advisory.
 */
export function buildPodUploadMetadata(item, { voiceId = null, sessionId = null } = {}) {
  return {
    mode: 'pod',
    podId: item.podId,
    sentenceId: item.sentenceId,
    kind: item.kind,
    role: item.role || roleForKind(item.kind),
    voiceId: voiceId || null,
    speaker: item.speaker || null,
    text: item.lineText,
    cadence: 'natural',
    glueSentenceIds: item.glueSentenceIds || null,
    // Re-record provenance: the row this take replaces (server keeps old row, re-points).
    replacesAudioId: item.audioId || null,
    scriptSessionId: sessionId || null
  }
}

// Deterministic speaker → chip colour (stable across reloads; no server round-trip).
const SPEAKER_PALETTE = [
  '#06ffa5', // emerald
  '#ffa630', // tungsten
  '#7dd3fc', // sky
  '#f0abfc', // orchid
  '#fde047', // gold
  '#fb7185', // rose
  '#a3e635', // lime
  '#c4b5fd'  // violet
]

export function speakerColor(speaker) {
  const s = String(speaker || '')
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return SPEAKER_PALETTE[Math.abs(hash) % SPEAKER_PALETTE.length]
}
