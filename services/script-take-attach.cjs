// services/script-take-attach.cjs
//
// ATTACHING A FILED TAKE TO ITS ITEM — the step that made recorded audio
// invisible to learners.
//
// Filing (services/script-take-filing.cjs) creates the course_audio row. That
// row is a clip in the library; it is not yet the audio OF anything. What makes
// a clip play for a learner is the item's FK: course_seeds.target2_audio_id,
// course_legos.target1_audio_id, course_practice_phrases.known_audio_id, and so
// on. Until 2026-08-21 nothing set those for a recorded take — the counts were
// stark: deu_at_for_eng and fin_for_eng had human clips filed and 0% of them
// linked to any item, waiting on a synthesis job that had never been run
// (docs/recording/natural-vs-short-takes-answer-2026-08-21.md §4).
//
// TTS does not wait. Its clips reach items through phase8's link pass
// (phase8-audio-v13.cjs linkAudioIds → link_all_audio_ids, and the human-first
// linkAudioIdsBatch behind it), which fills those same nine slots by matching
// normalizeForAudio(item text) against the clip's text. This module is that
// same convention applied to ONE clip at the moment it is recorded: same three
// tables, same nine columns, same normalizeForAudio matching, same
// human-beats-TTS preference. Nothing new is invented and no new table,
// column or identity is introduced — from the course's point of view the
// result is indistinguishable from a generated clip for that item.
//
// TWO DIFFERENCES FROM THE BULK PASS, both deliberate:
//   1. It runs per take, immediately, so the recordist's work is live the
//      moment it is uploaded rather than whenever someone next runs the engine.
//   2. It OVERWRITES a non-null FK. The bulk pass only fills NULLs, which is
//      right when it is guessing; here the human take was recorded FOR this
//      item, and a TTS clip sitting in the slot is exactly what it replaces.
//      Nothing is deleted: the displaced course_audio row keeps its id, its
//      bytes and its S3 object, so the swap is reversible by repointing back.

const { normalizeForAudio } = require('./shared/text-normalize.cjs')

// The three tables that carry audio FKs, and how an item of each kind is
// addressed. Mirrors phase8-audio-v13.cjs linkAudioIdsBatch's slot table.
const ITEM_TABLES = Object.freeze({
  seed: { table: 'course_seeds', idColumn: 'id' },
  lego: { table: 'course_legos', idColumn: 'lego_id' },
  phrase: { table: 'course_practice_phrases', idColumn: 'id' },
})

const ROLE_AUDIO_COLUMNS = Object.freeze({
  known: 'known_audio_id',
  target1: 'target1_audio_id',
  target2: 'target2_audio_id',
})

/** Which text column a role speaks. The known slot speaks known_text. */
function textColumnForRole(role) {
  return role === 'known' ? 'known_text' : 'target_text'
}

/**
 * Can this take be attached at all? Pure, so the rules are cheap to test.
 * A take with no item identity is NOT an error — takes recorded in the
 * coverage-order script carry no item, and they are filed exactly as before.
 */
function planAttach({ metadata = {}, courseAudioId = null }) {
  if (!courseAudioId) return { attach: false, reason: 'not_filed' }

  const kind = metadata.itemKind || null
  if (!kind) return { attach: false, reason: 'no_item_identity' }
  if (!ITEM_TABLES[kind]) return { attach: false, reason: 'unknown_item_kind' }

  const itemId = metadata.itemId || null
  if (!itemId) return { attach: false, reason: 'no_item_id' }

  const role = metadata.role || null
  const column = ROLE_AUDIO_COLUMNS[role]
  if (!column) return { attach: false, reason: 'no_role' }

  const text = typeof metadata.text === 'string' ? metadata.text.trim() : ''
  if (!text) return { attach: false, reason: 'no_text' }

  return { attach: true, kind, itemId, role, column, text, ...ITEM_TABLES[kind] }
}

/**
 * Point the item — and every item in the course that says exactly the same
 * thing in the same slot — at this clip.
 *
 * The sibling pass is not a bonus: the reading list deliberately reads each
 * distinct line ONCE (services/course-order-script.cjs), because that is what
 * TTS does, so a line that a seed and a USE phrase share must reach both from
 * the one take. Siblings are matched on the stored text exactly as the item
 * rows hold it, then confirmed with normalizeForAudio — the same key phase8
 * uses — so a trailing-space or case difference can never attach a clip to the
 * wrong sentence.
 *
 * NEVER THROWS. The bytes are already in S3 and the clip is already filed; an
 * attach failure must not turn a good take into a lost one. It comes back as a
 * verdict the caller can log and hand to the recordist.
 */
async function attachScriptTake({ supabase, courseCode, plan, courseAudioId, logger = console }) {
  if (!plan.attach) return { attached: false, linked: 0, reason: plan.reason }

  const { table, idColumn, itemId, column, text, role, kind } = plan
  const textColumn = textColumnForRole(role)
  const wantKey = normalizeForAudio(text)

  try {
    // 1. The item this take was recorded for. Named directly, so it is
    //    attached even if its stored text differs by punctuation or case.
    const targets = new Map([[`${kind}:${itemId}`, { table, idColumn, id: itemId }]])

    // 2. Every other item in the course that says the same thing in the same
    //    slot — the TTS convention: one clip, every matching item.
    for (const [siblingKind, spec] of Object.entries(ITEM_TABLES)) {
      const { data, error } = await supabase
        .from(spec.table)
        .select(`${spec.idColumn}, ${textColumn}`)
        .eq('course_code', courseCode)
        .eq(textColumn, text)
      if (error) {
        logger.warn(`[ScriptAttach] sibling scan of ${spec.table} failed: ${error.message}`)
        continue
      }
      for (const row of data || []) {
        // Belt and braces: the equality above already matched the stored text,
        // and this confirms it under the same key phase8 links by.
        if (normalizeForAudio(row[textColumn]) !== wantKey) continue
        const key = `${siblingKind}:${row[spec.idColumn]}`
        if (!targets.has(key)) targets.set(key, { table: spec.table, idColumn: spec.idColumn, id: row[spec.idColumn] })
      }
    }

    let linked = 0
    const failures = []
    for (const spec of targets.values()) {
      const { error } = await supabase
        .from(spec.table)
        .update({ [column]: courseAudioId })
        .eq('course_code', courseCode)
        .eq(spec.idColumn, spec.id)
      if (error) failures.push(`${spec.table}:${spec.id} ${error.message}`)
      else linked++
    }

    if (failures.length) {
      logger.error(`[ScriptAttach] ${failures.length} link(s) failed for ${courseCode} ${role}: ${failures.join('; ')}`)
    }
    logger.log(
      `[ScriptAttach] ${linked} item(s) now play course_audio ${courseAudioId} — ` +
      `${courseCode} ${role}.${column} (${kind} ${itemId}) "${text.slice(0, 40)}"`
    )

    return {
      attached: linked > 0,
      linked,
      reason: linked > 0 ? null : 'update_failed',
      failures: failures.length ? failures : undefined,
    }
  } catch (err) {
    logger.error(
      `[ScriptAttach] ATTACH FAILED for ${courseCode} ${role} "${text.slice(0, 60)}" ` +
      `(clip ${courseAudioId}): ${err.message} — the clip is filed, but no item points at it yet`
    )
    return { attached: false, linked: 0, reason: 'attach_failed', message: err.message }
  }
}

module.exports = { planAttach, attachScriptTake, ITEM_TABLES, ROLE_AUDIO_COLUMNS, textColumnForRole }
