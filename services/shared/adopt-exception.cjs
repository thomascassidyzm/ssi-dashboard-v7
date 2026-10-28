/**
 * ONE-OFF ADOPT EXCEPTION — r-2026-10-28 deu_at Tamara 732.
 *
 * Tom's job #748 rule stands: "test recordings never get connected to a live course". adoptS3Key accepts only a
 * mastered/<UUID>.mp3 key phase8 wrote (paid-write.isAdoptableKey), and every repoint path refuses a trial/ key
 * (audio-trial-mode.assertNotTrial). On 2026-10-28 Kai approved (17:30Z) and Tom said YES (~17:52Z, relayed by his
 * Watson) to ONE exception: exactly the 732 hand-checked Tamara trial clips listed in
 * adopt-exception-r-2026-10-28-deu-at-tamara-732.json, into deu_at_for_eng target1, each slowed to 0.85.
 *
 * This is an ALLOW-LIST, not a trial-key path. A key is adoptable here only if it is on the list AND the request is
 * for that list's course, role, voice and that key's exact words. Everything else is still BAD_ADOPT_KEY. The adopt
 * itself never files the trial object: phase8 slows it, stores the result as a fresh mastered/<UUID>.mp3, and files
 * THAT — so no course_audio row ever points under trial/, and assertNotTrial keeps guarding every other path.
 */
const tamara732 = require('./adopt-exception-r-2026-10-28-deu-at-tamara-732.json')

const EXCEPTIONS = [tamara732]

/** The exception (and the listed clip) covering this key, or null. */
function exceptionFor(s3Key) {
  const k = String(s3Key || '')
  for (const ex of EXCEPTIONS) {
    const clip = ex.clips.find(c => c.key === k)
    if (clip) return { ruling: ex.ruling, courseCode: ex.courseCode, role: ex.role, voiceId: ex.voiceId, speed: ex.speed, clip }
  }
  return null
}

/** Why this request does not match its exception entry, or null when it does. voiceId is checked after resolve. */
function mismatch(ex, { courseCode, role, text, voiceId }) {
  if (courseCode !== ex.courseCode) return `course ${courseCode} — the exception covers ${ex.courseCode} only`
  if (role !== ex.role) return `role ${role} — the exception covers ${ex.role} only`
  if (text !== ex.clip.text) return `text "${text}" — this key was approved as "${ex.clip.text}"`
  if (voiceId != null && voiceId !== ex.voiceId) return `voice ${voiceId} — the exception covers ${ex.voiceId} only`
  return null
}

module.exports = { exceptionFor, mismatch, EXCEPTIONS }
