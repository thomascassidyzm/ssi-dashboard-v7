// services/take-supersede.cjs
//
// SUPERSEDING A REDONE TAKE — marking, never deleting.
//
// Kai, 2026-08-19: bad takes — the ones the recordist decided to redo — are
// being kept. The client only ever dropped a superseded take while it was
// STILL SITTING IN THE UPLOAD QUEUE; once the bytes had gone up, the take
// lived forever, and a redone line could still be represented by the take the
// recordist rejected.
//
// WHAT IS ACTUALLY TRUE OF THE SERVER (established 2026-08-21 against the live
// database, not assumed):
//
//   * The upload seam INSERTs a fresh recording_provenance row per take, keyed
//     by a newly-minted S3 uuid. It never upserts. deu_at_for_eng alone holds
//     59 rows that are second-or-later takes of a line already recorded; one
//     line ("wia ma so oft wia möglich redt", slow) has TWENTY takes.
//   * A NATURAL-cadence take is additionally upserted into course_audio on
//     (course_code, text_normalized, language, role, voice_id), so the newest
//     natural take does already win as the clip.
//   * A SLOW-cadence take is deliberately never filed as course_audio
//     (services/script-take-filing.cjs) — it exists only as a provenance row.
//   * Which take the engine then uses is decided by provenance-adapter's
//     groupTakesByPhrase: "latest per (phrase, cadence) wins", ordered by
//     `recorded_at` — a CLIENT-SUPPLIED timestamp off the recordist's phone.
//
// That last point is the hole. Supersession is inferred from a clock we do not
// own rather than recorded as the decision it actually was. Estate-wide the
// clock currently disagrees with server insert order on one line
// (cym_n_for_eng), so this is a small live defect and a large latent one: a
// phone with a skewed clock silently re-promotes a rejected take.
//
// SO: when a take supersedes an earlier take of the same line, say so. This
// writes `superseded_by` / `superseded_at` into the earlier rows' quality_notes
// context and nothing else. It is ADDITIVE and REVERSIBLE:
//
//   * NO BYTES ARE DELETED. The S3 objects of superseded takes stay exactly
//     where they are, at their own keys. Deleting audio is a gated act and a
//     redo on a phone is not that (CLAUDE.md, approval gates).
//   * No row is deleted. Every field a superseded row already carried keeps its
//     exact name and value; two fields are added.
//   * Nothing already in the database carries the flag, so on the day this
//     lands it changes the selected take for nobody. It only starts recording
//     intent from the next redo onwards.
//
// The reader half is provenance-adapter.cjs groupTakesByPhrase, which skips a
// take carrying `superseded_by` outright, ahead of any timestamp comparison —
// so an explicit decision beats a clock, which is the whole point.

const { normalizeForAudio } = require('./shared/text-normalize.cjs')

/** Guarded parse of a quality_notes context (old rows may hold plain text). */
function parseContext(raw) {
  if (typeof raw !== 'string' || raw[0] !== '{') return null
  try {
    const ctx = JSON.parse(raw)
    return ctx && typeof ctx === 'object' ? ctx : null
  } catch {
    return null
  }
}

/**
 * Does `ctx` describe an earlier take of the same line, in the same cadence,
 * by the same voice, in the same course?
 *
 * Voice matching mirrors the read path (provenance-adapter.fetchProvenanceRows):
 * match on voice_id when the row has one, and fall back to the slot role for
 * rows written before the server stamped voice_id. A row with neither is NOT
 * matched — refusing to guess is the point; the worst outcome here would be
 * marking a DIFFERENT speaker's good take as superseded.
 */
function isSameSlot(ctx, { courseCode, textNorm, cadence, voiceId, role }) {
  if (!ctx) return false
  if (ctx.course_code !== courseCode) return false
  if (!ctx.text || normalizeForAudio(ctx.text) !== textNorm) return false
  // A take with no cadence recorded cannot be proven to be the same read.
  if ((ctx.cadence || null) !== (cadence || null)) return false
  // Never supersede across methods: a spliced engine output is not a take.
  if ((ctx.method || 'take') !== 'take') return false
  if (ctx.voice_id) return Boolean(voiceId) && ctx.voice_id === voiceId
  return Boolean(role) && ctx.role === role
}

/**
 * Mark every earlier take of this line/cadence/voice as superseded by `audioUuid`.
 *
 * Best-effort by contract: it returns a result, it never throws, and the caller
 * must not fail an upload because of it. A take whose bytes are safely stored
 * is worth more than a tidy supersede ledger, and the reader still falls back
 * to recency for anything this did not manage to mark.
 *
 * @returns {{ superseded: string[], error: string|null, skipped: string|null }}
 *   `superseded` is the audio_uuids marked; `skipped` names why nothing was
 *   attempted (missing identity), which is a normal outcome, not a failure.
 */
async function supersedeEarlierTakes(supabase, {
  courseCode, text, cadence, voiceId, role, audioUuid
}) {
  const empty = { superseded: [], error: null, skipped: null }
  if (!supabase || !courseCode || !audioUuid) return { ...empty, skipped: 'no identity' }
  // Without the line's text there is nothing to match an earlier take on, and
  // without a voice or a role there is nothing to keep us off another speaker.
  if (!text) return { ...empty, skipped: 'no text' }
  if (!voiceId && !role) return { ...empty, skipped: 'no voice or role' }

  const textNorm = normalizeForAudio(text)
  if (!textNorm) return { ...empty, skipped: 'no text' }

  try {
    // The table has no course/text/cadence columns — identity rides in the
    // quality_notes JSON — so the match has to happen here. Narrow the read as
    // far as PostgREST allows first: only rows whose notes mention this course
    // and are not already marked.
    const { data, error } = await supabase
      .from('recording_provenance')
      .select('audio_uuid, quality_notes')
      .like('quality_notes', `%"course_code":"${courseCode}"%`)

    if (error) return { ...empty, error: error.message }

    const targets = []
    for (const row of data || []) {
      if (!row?.audio_uuid || row.audio_uuid === audioUuid) continue
      const ctx = parseContext(row.quality_notes)
      if (!ctx) continue
      // Already superseded by something — leave the first decision standing.
      if (ctx.superseded_by) continue
      if (!isSameSlot(ctx, { courseCode, textNorm, cadence: cadence || null, voiceId, role })) continue
      targets.push({ audioUuid: row.audio_uuid, ctx })
    }

    if (targets.length === 0) return empty

    const supersededAt = new Date().toISOString()
    const marked = []
    for (const t of targets) {
      // Rewrite the whole context rather than patching JSON textually: every
      // existing key keeps its name and value, and two are added.
      const next = { ...t.ctx, superseded_by: audioUuid, superseded_at: supersededAt }
      const { error: upErr } = await supabase
        .from('recording_provenance')
        .update({ quality_notes: JSON.stringify(next) })
        .eq('audio_uuid', t.audioUuid)
      if (!upErr) marked.push(t.audioUuid)
    }

    return { superseded: marked, error: null, skipped: null }
  } catch (err) {
    return { ...empty, error: err.message }
  }
}

module.exports = { supersedeEarlierTakes, isSameSlot, parseContext }
