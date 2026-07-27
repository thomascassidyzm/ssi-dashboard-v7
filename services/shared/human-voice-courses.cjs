/**
 * Human-voice-only courses — TTS is NEVER generated for these.
 *
 * OWNER RULING (Tom 2026-07-25): the Welsh courses cym_n_for_eng and
 * cym_s_for_eng are HUMAN-VOICED ONLY. No TTS may ever be minted for them —
 * their voices are real recordings, and a synthesised Welsh clip reaching a
 * learner is a quality defect the same way a child voice is. Their pending
 * audio_pass_requests were dismissed on the same day.
 *
 * The ruling is enforced two ways, the same defence pattern as the child-voice
 * blocklist (services/tts-service.cjs):
 *   1. CHOKEPOINT — tts-service.generate() refuses any call whose config
 *      carries a human-voice course code (fails non-retriably, "(403)").
 *   2. ENTRY GUARDS — pipeline entry points (phase8 /generate, the approved-
 *      audio-pass runner, the rescue/regen sweeps) skip these courses up front
 *      with a logged notice, so no work is even attempted downstream.
 *
 * All `cym_*` courses are treated as human-voiced: every Welsh course we ship
 * is human-recorded, so the prefix rule is the safe default and new Welsh
 * courses are covered without a code change. The explicit set documents the two
 * courses the ruling named.
 *
 * OWNER RULING (Tom 2026-07-27): bre_for_fra (Breton) is also HUMAN-VOICED
 * ONLY — Azure has no Breton voice, same policy as the cym_* courses. Its
 * pending audio_pass_request was dismissed the same day.
 */

const HUMAN_VOICE_COURSES = new Set([
  'cym_n_for_eng',
  'cym_s_for_eng',
  'bre_for_fra',
]);

/**
 * @param {string} courseCode
 * @returns {boolean} true if the course is human-voiced only (no TTS ever)
 */
function isHumanVoiceCourse(courseCode) {
  const code = String(courseCode || '');
  return HUMAN_VOICE_COURSES.has(code) || /^cym_/.test(code);
}

module.exports = { HUMAN_VOICE_COURSES, isHumanVoiceCourse };
