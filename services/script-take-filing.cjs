// services/script-take-filing.cjs
//
// FILING A SCRIPT-MODE TAKE — the step that was missing.
//
// The upload seam (POST /api/production/:courseCode/recording/upload) has
// always known what to do with two of its three modes:
//
//   regeneration → repoint the existing course_audio row (versioned swap)
//   pod          → mint/repoint a row and re-point the sentence FK
//                  (voice-engine/pods-registration.cjs)
//   script       → ...nothing. Bytes to S3, a recording_provenance row, and
//                  a server-minted uuid handed back to the browser.
//
// That third case is why a day of Finnish course recording (2026-08-19,
// 50 takes, kai@saysomethingin.com, fin_for_eng) has bytes in S3, provenance
// rows in the database, and ZERO course_audio rows — and why the review
// screen's play button was dead: it resolves a take through
// /api/production/audio/:uuid/stream, which reads course_audio.s3_key.
//
// The architecture's answer used to be "the voice engine files them later"
// (voice-engine/synthesis-job.cjs, PHASE: register whole-phrase natural
// takes). That is still true and still runs. But "later, when someone starts
// a synthesis job" is not an answer a recordist can hear, and it left every
// take unservable and unattributable in the meantime. So a natural-cadence
// take is now filed AT UPLOAD, by exactly the same helper, with exactly the
// same conflict key — db.upsertHumanCourseAudio. A later engine run re-upserts
// the same row rather than creating a second one.
//
// WHAT IS DELIBERATELY NOT FILED: the slow cadence. Script mode records every
// phrase TWICE — natural, then slow — and the slow take is a chunked read
// whose only job is to give the aligner its pause boundaries
// (voice-engine/synthesis-job.cjs PHASE align). course_audio has no cadence
// column, so filing both would collide on the live 5-column unique key
// (course_code, text_normalized, language, role, voice_id) and the slow read
// would overwrite the natural one — putting a deliberately-halting
// lego-by-lego read in front of a learner. Not filing it is the correct
// outcome, and it is reported as a reason rather than as a failure.
//
// NO DDL. NO TTS. One course_audio upsert.

const voiceEngineDb = require('./voice-engine/db.cjs')
const { swapClipInPlace } = require('./shared/audio-revision-swap.cjs')

// Reasons a take was not filed. `deliberate: true` means the outcome is
// correct and the recordist needs no alarm; `deliberate: false` means
// something is wrong and they must be told, loudly, in these words.
const FILING_REASONS = Object.freeze({
  slow_cadence: {
    deliberate: true,
    message: 'Saved as the slow read for this line. Slow reads are kept for assembly, not filed as a clip on their own.',
  },
  no_text: {
    deliberate: false,
    message: 'This take was saved but NOT filed as a clip: the recorder sent no text with it, so there is nothing to file it under. Tell whoever runs the course build.',
  },
  no_role: {
    deliberate: false,
    message: 'This take was saved but NOT filed as a clip: the recorder sent no voice slot with it. Tell whoever runs the course build.',
  },
  no_voice: {
    deliberate: false,
    message: 'This take was saved but NOT filed as a clip: this course has no human voice assigned to the slot you are recording, so the clip has no-one to belong to. Ask for your voice to be assigned to this course, then record the line again.',
  },
  no_course: {
    deliberate: false,
    message: 'This take was saved but NOT filed as a clip: the course record could not be read, so its language is unknown. Tell whoever runs the course build.',
  },
  write_failed: {
    deliberate: false,
    message: 'This take was saved to storage but the database refused to file it as a clip, so it will not play back. Tell whoever runs the course build — the recording itself is safe.',
  },
})

function reasonPayload(reason, detail = null) {
  const spec = FILING_REASONS[reason] || { deliberate: false, message: 'This take was saved but not filed as a clip.' }
  return {
    filed: false,
    courseAudioId: null,
    reason,
    deliberate: spec.deliberate,
    message: detail ? `${spec.message} (${detail})` : spec.message,
  }
}

/**
 * Decide whether — and how — a script-mode take should become a course_audio
 * row. Pure: no I/O, so the rules are cheap to test.
 *
 * @param {object} args
 * @param {object} args.metadata - the upload's client metadata (role, cadence, text)
 * @param {string|null} args.voiceId - the SERVER-resolved voice for the slot
 *   (resolveTakeVoiceId — a slot still holding its TTS voice resolves to null,
 *   which is exactly a take we must refuse to file rather than credit to a
 *   synthetic voice)
 * @param {{target_lang: string, known_lang: string}|null} args.course
 * @returns {{file: true, text, role, language} | {file: false, filing: object}}
 */
function planScriptTakeFiling({ metadata = {}, voiceId = null, course = null }) {
  const cadence = metadata.cadence || 'natural'
  // A slow take is a measurement, not a clip — it exists to give the aligner
  // pause boundaries and is deliberately never filed.
  if (cadence === 'slow') return { file: false, filing: reasonPayload('slow_cadence') }
  // 'gapped' (the minimal phrase set) DOES file, and is named here rather than
  // left to fall through, for the reason the paragraph below gives. A gapped
  // piece is a covering LEGO or a fallback word read slowly with dead space
  // around the words: it is splice quarry, so it must exist as a clip, and it
  // must NOT be filed as 'natural' or the estate's natural pool silently gains
  // a recording nobody would call natural.
  // 'isolated' (Pool A) DOES file, and deliberately so: it is the teaching clip
  // for that LEGO or component, and the whole point of the two-pool split is
  // that it exists as a clip in its own right. It reaches the splicer never —
  // that guard is in voice-engine/provenance-adapter.cjs, not here. Spelled out
  // rather than left to fall through the ELSE branch, because "anything that
  // isn't the string 'slow' gets filed" is how a cadence nobody meant to file
  // would file itself.

  const text = typeof metadata.text === 'string' ? metadata.text.trim() : ''
  if (!text) return { file: false, filing: reasonPayload('no_text') }

  const role = metadata.role || null
  if (!role) return { file: false, filing: reasonPayload('no_role') }

  if (!course) return { file: false, filing: reasonPayload('no_course') }

  if (!voiceId) return { file: false, filing: reasonPayload('no_voice', `slot ${role}`) }

  // Same split the engine makes (synthesis-job.cjs): the known slot speaks the
  // course's known language, every target slot speaks its target language.
  const language = role === 'known' ? course.known_lang : course.target_lang
  if (!language) return { file: false, filing: reasonPayload('no_course', `no ${role === 'known' ? 'known_lang' : 'target_lang'} on the course row`) }

  return { file: true, text, role, language, voiceId }
}

/**
 * File the take. Upserts through the voice engine's own helper so a later
 * synthesis run re-points THIS row instead of minting a rival one.
 *
 * Never throws: a filing failure must not lose bytes that are already safely
 * in S3, so it comes back as a `filed: false` verdict the caller hands to the
 * recordist verbatim.
 *
 * @returns {Promise<{filed: boolean, courseAudioId: string|null, reason: string|null, deliberate: boolean, message: string|null}>}
 */
async function fileScriptTake({ supabase, courseCode, plan, s3Key, durationMs = null, recordedBy = null, logger = console }) {
  if (!plan.file) return plan.filing
  try {
    const key = {
      courseCode, text: plan.text, language: plan.language,
      role: plan.role, voiceId: plan.voiceId,
    }

    // Is this the FIRST take of this line, or a re-record superseding one?
    //
    // It used to make no difference: both went through a bare upsert, so a
    // re-record silently repointed the row's s3_key with NO revision bump and
    // NO ledger row. Two things followed from that, both bad.
    //
    //   1. Nothing anywhere recorded that a take had been superseded — no
    //      history, nothing to roll back to, no name against the decision.
    //   2. audio_revision is the LEARNER'S CACHE KEY (<uuid>.v<rev>, served
    //      immutable and held in the player's IndexedDB). Without the bump the
    //      clip's address never changes, so a learner who had already played
    //      the bad take went on hearing the bad take — the retake could not
    //      reach them. The superseded take survived as the take that gets used,
    //      which is precisely what Kai asked us to stop.
    //
    // The versioned path is the estate's standard mechanism and the
    // regeneration branch of this same upload seam already uses it. It is
    // make-before-break and it DELETES NOTHING: the previous object stays in
    // the bucket and course_audio_revisions.previous_s3_key names it, so the
    // swap is reversible.
    const existing = await voiceEngineDb.findHumanCourseAudio(supabase, key)

    if (existing && existing.s3_key !== s3Key) {
      const out = await swapClipInPlace({
        supabase,
        audioId: existing.id,
        newS3Key: s3Key,
        durationMs,
        patch: { origin: 'human' },
        source: 'recordist-retake',
        // NOT NULL in the history table. 'recordist' is an honest fallback when
        // the upload carried no identity — better than failing the swap and
        // dropping back to an unversioned overwrite.
        acceptedBy: recordedBy || 'recordist',
        reason: `re-record superseding ${existing.s3_key}`,
        logger,
      })
      logger.log(
        `[ScriptTake] re-record swapped course_audio ${existing.id} to revision ${out.revision} — ` +
        `${courseCode} ${plan.role} s3=${s3Key} (previous ${existing.s3_key} kept) ` +
        `"${plan.text.slice(0, 40)}"`
      )
      return { filed: true, courseAudioId: existing.id, reason: null, deliberate: false, message: null }
    }

    const courseAudioId = await voiceEngineDb.upsertHumanCourseAudio(supabase, { ...key, s3Key, durationMs })
    logger.log(
      `[ScriptTake] filed course_audio ${courseAudioId} — ${courseCode} ${plan.role} ` +
      `${plan.language} voice=${plan.voiceId} s3=${s3Key} "${plan.text.slice(0, 40)}"`
    )
    return { filed: true, courseAudioId, reason: null, deliberate: false, message: null }
  } catch (err) {
    // LOUD. This is the exact silence that lost 2026-08-19: bytes landed, the
    // browser was told success, and nothing existed that could serve them.
    logger.error(
      `[ScriptTake] FILING FAILED for ${courseCode} ${plan.role} "${plan.text.slice(0, 60)}" ` +
      `(s3 ${s3Key}): ${err.message} — the take's bytes are safe, but it has no course_audio row`
    )
    return reasonPayload('write_failed', err.message)
  }
}

module.exports = {
  FILING_REASONS,
  planScriptTakeFiling,
  fileScriptTake,
}
