/**
 * voice-engine/provenance-adapter.cjs — INPUT CONTRACT for the engine.
 *
 * RECONCILED (integration, 2026-06-10) with the upload seam's writer:
 * the live recording_provenance table has NO dedicated columns for course,
 * phrase identity, chunks_string or voice — recording-upload-helpers.cjs
 * `buildProvenanceContext` JSON-serialises that context into the
 * `quality_notes` column (DDL is out of scope). Rows are keyed by
 * `audio_uuid` (the take's fresh S3 uuid → mastered/{audio_uuid}.mp3).
 *
 * So: select rows wholesale, parse quality_notes per row, filter client-side.
 * Rows written before the server stamped voice_id fall back to slot-role
 * matching (the writer has always captured metadata.role).
 *
 * Vocabulary: known / target / seed only.
 */

const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const { pageThrough } = require('./db.cjs')

/** Guarded parse of the quality_notes JSON context (old rows may hold plain text). */
function parseContext(row) {
  const raw = row?.quality_notes
  if (typeof raw !== 'string' || raw[0] !== '{') return {}
  try {
    const ctx = JSON.parse(raw)
    return ctx && typeof ctx === 'object' ? ctx : {}
  } catch {
    return {}
  }
}

/**
 * Map one recording_provenance row (+ its quality_notes context) to the
 * engine's canonical take object.
 *
 * @returns {{
 *   id, courseCode, s3Key, phraseText, chunksString, voiceId, role,
 *   cadence, recordedBy, method, durationMs, recordedAt
 * }}
 */
function fromProvenanceRow(row) {
  if (!row) return null
  const ctx = parseContext(row)
  return {
    id: row.audio_uuid ?? row.id ?? null,
    courseCode: ctx.course_code ?? row.course_code ?? null,
    s3Key: ctx.s3_key ?? row.s3_key ?? null,
    phraseText: ctx.text ?? row.phrase_text ?? row.text ?? null,
    chunksString: ctx.chunks_string ?? row.chunks_string ?? null,
    // The recorder's own pause timings for this take, when it sent them
    // ([{ startMs, endMs }], ms from the start of the take). Absent on every
    // take recorded before 2026-08-11 and on natural-speed takes, so every
    // consumer must still work without it.
    chunkBoundariesMs: ctx.chunk_boundaries_ms ?? null,
    voiceId: ctx.voice_id ?? row.voice_id ?? null,
    role: ctx.role ?? row.role ?? null,
    cadence: ctx.cadence ?? row.cadence ?? null,
    recordedBy: row.recorded_by ?? null,
    // 'take' (recorded) vs 'spliced' (engine output); absence = a real take.
    method: ctx.method ?? row.method ?? 'take',
    durationMs: row.duration_ms ?? null,
    recordedAt: row.recorded_at ?? row.created_at ?? null,
    // The take that replaced this one, when the recordist redid the line
    // (services/take-supersede.cjs). Absent on every take recorded before
    // 2026-08-21 and on every take that was never redone, so recency still
    // decides those — see groupTakesByPhrase.
    supersededBy: ctx.superseded_by ?? null,
  }
}

/**
 * Fetch takes for (course, voice slot). The table has no course/voice
 * columns, so this selects and filters on the parsed context:
 *   voice match = ctx.voice_id === voiceId, falling back to slot-role match
 *   for rows written before the server stamped voice_id.
 * Errors return { rows: [], error } rather than throwing — the job reports
 * "no recorded takes found" honestly.
 */
async function fetchProvenanceRows(supabase, { courseCode, voiceId, role = null }) {
  try {
    // Paginated — PostgREST max-rows silently truncates un-paginated selects
    // (the INF PLAY lesson, banked in db.cjs). One course at design scale
    // (2 voices × ~150 phrases × 2 cadences + known voice + re-records)
    // crosses 1000 rows on its own. The live table has no id column; order
    // by (created_at, audio_uuid) for a stable page walk.
    const data = await pageThrough((from, to) => supabase
      .from('recording_provenance')
      .select('*')
      .order('created_at', { ascending: true })
      .order('audio_uuid', { ascending: true })
      .range(from, to))
    const rows = (data || [])
      .map(fromProvenanceRow)
      .filter(Boolean)
      .filter(t => t.courseCode === courseCode)
      .filter(t => {
        if (!voiceId) return true
        if (t.voiceId) return t.voiceId === voiceId
        return Boolean(role) && t.role === role
      })
    return { rows, error: null }
  } catch (err) {
    return { rows: [], error: err.message }
  }
}

/**
 * Group canonical take objects by phrase identity (normalizeForAudio of the
 * phrase text), pairing cadences:
 *   Map<phraseNorm, { phraseText, chunksString, natural, slow }>
 * Latest take per (phrase, cadence) wins (re-records supersede).
 */
function groupTakesByPhrase(takes) {
  const groups = new Map()
  for (const take of takes || []) {
    if (!take?.phraseText || !take.s3Key) continue
    if (take.method && take.method !== 'take') continue // never re-splice splices
    // The recordist redid this line and a later take replaced this one. That is
    // a DECISION, and it outranks the recency comparison below — which is
    // ordered by a client-supplied `recorded_at` off the recordist's phone, so
    // a skewed clock could otherwise re-promote the take they rejected.
    // Marked, never deleted: the bytes are still in the bucket.
    if (take.supersededBy) continue
    const key = normalizeForAudio(take.phraseText)
    if (!groups.has(key)) {
      groups.set(key, { phraseText: take.phraseText, chunksString: take.chunksString ?? null, natural: null, slow: null })
    }
    const g = groups.get(key)
    if (take.chunksString && !g.chunksString) g.chunksString = take.chunksString
    const slot = take.cadence === 'slow' ? 'slow' : 'natural'
    const existing = g[slot]
    if (!existing || String(take.recordedAt ?? '') >= String(existing.recordedAt ?? '')) {
      g[slot] = take
    }
  }
  return groups
}

/**
 * Best-effort provenance write for a spliced output (method: 'spliced', per
 * keystone decision 6 — distinguishes splices from precious whole takes).
 * Uses the live column set: identity rides as quality_notes JSON, matching
 * the upload seam's buildProvenanceContext shape. Tolerates failure silently;
 * the segment-store manifest's `spliced` ledger is the engine's
 * authoritative record either way.
 */
async function recordSplicedProvenance(supabase, { audioId, courseCode, voiceId, role, text, s3Key }, logger = console) {
  try {
    const { error } = await supabase
      .from('recording_provenance')
      .insert({
        audio_uuid: audioId,
        recorded_by: 'voice-engine',
        quality_notes: JSON.stringify({
          course_code: courseCode,
          mode: 'synthesis',
          method: 'spliced',
          voice_id: voiceId,
          role,
          text,
          s3_key: s3Key,
        }),
      })
    if (error) {
      logger.warn?.(`[voice-engine] spliced provenance not written (${error.message}) — manifest ledger still records it`)
      return false
    }
    return true
  } catch (err) {
    logger.warn?.(`[voice-engine] spliced provenance not written (${err.message}) — manifest ledger still records it`)
    return false
  }
}

module.exports = {
  parseContext,
  fromProvenanceRow,
  fetchProvenanceRows,
  groupTakesByPhrase,
  recordSplicedProvenance,
}
