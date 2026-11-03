/**
 * boothTakePolicy.js — the booth's take decisions, out of the screen and into the capture path.
 *
 * WHY THIS FILE EXISTS (job #575, Tom's Watson, r-2026-10-31): the off-chain sample gate
 * (services/voice-engine/sample-gate.cjs) re-asks every voice artist for ten takes whenever
 * __RECORDER_BUILD__ changes, and that hash is meant to move on a RECORDER change only. These
 * rules decide WHERE a take ends and WHETHER it is uploaded at all, so a change to any of them
 * is a recorder change. They used to sit inline in RecordistRoom.vue, which changes on almost
 * every booth deploy for layout and buttons; keeping them there meant either hashing the whole
 * screen (every UI deploy re-asks every artist) or not hashing them (a real recorder change
 * slips past the gate). Here, they are hashed and the screen is not.
 *
 * Pure: no Vue, no DOM, no I/O. RecordistRoom.vue calls these at the same points, with the same
 * values, as the inline code they replace.
 */
import { MIN_VOICED_MS } from '@/composables/useTapRecorder'

// ── Moving on by itself ─────────────────────────────────────────────────────
// The recordist reads; when they stop, the studio goes to the next line. No
// tap. This is only safe because the capture no longer ends where the line
// ends: the outgoing recorder runs on for its tail and the incoming one has
// been running since before this decision was made, so advancing a beat too
// early costs nothing but a slightly longer clip. Under the old per-line
// recorder the same feature would have cut every take.
export const AUTO_ADVANCE_QUIET_MS = 1200

/**
 * May a quiet of `quietMs` end this line by itself? Only the speech half of the decision: the
 * screen's own guards (gapped line, auto-advance off, held mic, last line…) are checked by the
 * caller before this, exactly as before.
 *
 * A BLIP IS NOT A READ (Aran, 2026-10-28, job #915): one loud frame sets lineHasSpeech; a quiet
 * may only end the line once MIN_VOICED_MS of it was voiced. Taps are untouched — this is the
 * auto-advance gate alone.
 */
export function autoAdvanceDue({ quietMs, lineHasSpeech, voicedMs }) {
  if (!lineHasSpeech) return false
  if (voicedMs < MIN_VOICED_MS) return false
  return quietMs >= AUTO_ADVANCE_QUIET_MS
}

// The size floor under the speech verdict: a backstop for a capture that failed outright.
export const MIN_TAKE_BLOB_BYTES = 1200

/**
 * Never save silence: a take with nothing said on it didn't happen.
 *
 * This used to be a blob-size test, and that test is now meaningless: every
 * clip carries pre-roll and tail by design, so even a line nobody read comes
 * back as several kilobytes of room. What the recorder KNOWS is whether it
 * ever heard the voice while this line was open, and that is what decides it.
 *
 * `hadSpeech` is TRUE, FALSE or NULL, and null means the recorder does not
 * know — its meter never delivered a sample, so it heard nothing about
 * anything. Only FALSE refuses a take. Not knowing is not the same as knowing
 * there was silence, and on 2026-08-22 the difference was a whole session:
 * every line read, every clip captured, every take refused, because the level
 * meter was reading zero and the meter is the only witness this test has.
 */
export function takeIsSilent(blob, hadSpeech) {
  return !blob || blob.size < MIN_TAKE_BLOB_BYTES || hadSpeech === false
}

/**
 * Is the take closed by stepping on (a tap or auto-advance) filed at all?
 *
 * Nothing heard on this line: he was moving, not reading, so nothing is
 * filed — a line he walked across keeps the take it had. Where the meter
 * cannot say (null), a line with no take yet is filed as before (a lost
 * take is the worse mistake), but a line that HAS one is left alone:
 * walking over saved work must never replace it with room tone.
 *
 * `lineHasTake` is a function so it is only asked when the meter could not say, as before.
 */
export function fileTakeOnAdvance(hadSpeech, lineHasTake) {
  if (hadSpeech === false) return false
  if (hadSpeech === null && lineHasTake()) return false
  return true
}

/**
 * Is the take closed by Stop filed?
 *
 * Stop pressed on a line nobody read is not a failed take — it is the end
 * of the session. Filing it would put a phantom red line on a clean run.
 * But that only holds where the recorder KNOWS nobody read it: if the meter
 * is not reading, a dropped final line is a lost take, and a phantom row on
 * the done screen is the cheaper of the two mistakes.
 */
export function fileTakeOnStop(hadSpeech) {
  return hadSpeech !== false
}
