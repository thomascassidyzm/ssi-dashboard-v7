/**
 * voice-engine/provenance-adapter.cjs — INPUT CONTRACT for the engine.
 *
 * ⚠️ INTEGRATION SEAM — FLAGGED FOR RECONCILIATION ⚠️
 * The engine consumes recording_provenance rows written by the parallel
 * safety/upload-seam build. Per the keystone doc the rows carry:
 *   { course_code, s3_key, phrase identity (seed/phrase text), chunksString,
 *     voice_id, role/slot, cadence, recorded_by }
 * The EXACT live column names land in that parallel build. ALL field-name
 * mapping is isolated in fromProvenanceRow() below — when integration knows
 * the final names, edit that ONE function (and the fetch filter columns in
 * fetchProvenanceRows) and nothing else in the engine changes.
 *
 * Vocabulary: known / target / seed only.
 */

const { normalizeForAudio } = require('../shared/text-normalize.cjs')

/**
 * Map one recording_provenance row to the engine's canonical take object.
 * Keystone snake_case names first; tolerant fallbacks for likely variants.
 *
 * @returns {{
 *   id, courseCode, s3Key, phraseText, chunksString, voiceId, role,
 *   cadence, recordedBy, method, durationMs, recordedAt
 * }}
 */
function fromProvenanceRow(row) {
  if (!row) return null
  return {
    id: row.id ?? row.audio_uuid ?? null,
    courseCode: row.course_code ?? null,
    s3Key: row.s3_key ?? row.recording_s3_key ?? null,
    phraseText: row.phrase_text ?? row.text ?? row.target_text ?? null,
    chunksString: row.chunks_string ?? row.chunksString ?? null,
    voiceId: row.voice_id ?? null,
    role: row.role ?? row.voice_slot ?? row.slot ?? null,
    cadence: row.cadence ?? null,
    recordedBy: row.recorded_by ?? null,
    method: row.method ?? 'take', // 'take' (recorded) vs 'spliced' (engine output)
    durationMs: row.duration_ms ?? null,
    recordedAt: row.recorded_at ?? row.created_at ?? null,
  }
}

/**
 * Fetch provenance rows for (course, voice). Column drift (the parallel
 * build hasn't landed / names differ) returns { rows: [], error } rather
 * than throwing — the job reports "no recorded takes found" honestly.
 */
async function fetchProvenanceRows(supabase, { courseCode, voiceId }) {
  try {
    let query = supabase
      .from('recording_provenance')
      .select('*')
      .eq('course_code', courseCode)
    if (voiceId) query = query.eq('voice_id', voiceId)
    const { data, error } = await query
    if (error) return { rows: [], error: error.message }
    return { rows: (data || []).map(fromProvenanceRow).filter(Boolean), error: null }
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
 * Tolerates column drift silently; the segment-store manifest's `spliced`
 * ledger is the engine's authoritative record either way.
 *
 * ⚠️ INTEGRATION: align the inserted column names with the safety build.
 */
async function recordSplicedProvenance(supabase, { audioId, courseCode, voiceId, role, text, s3Key }, logger = console) {
  try {
    const { error } = await supabase
      .from('recording_provenance')
      .insert({
        audio_uuid: audioId,
        course_code: courseCode,
        voice_id: voiceId,
        role,
        phrase_text: text,
        s3_key: s3Key,
        method: 'spliced',
        recorded_by: 'voice-engine',
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
  fromProvenanceRow,
  fetchProvenanceRows,
  groupTakesByPhrase,
  recordSplicedProvenance,
}
