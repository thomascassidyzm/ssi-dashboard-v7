// src/components/production/autocue/advanceGate.js
/**
 * WHEN THE AUTOCUE IS ALLOWED TO MOVE ON.
 *
 * The recorder used to treat "the VAD closed a take" and "show the recordist
 * the next line" as one event: useVAD fired onSpeechEnd, useContinuousRecorder
 * assembled the blob, and AutocueStudio called advanceToNext() in the same
 * synchronous breath. So EVERY end-of-speech misjudgement became a line
 * advance, and a line advance is the one consequence that cannot be undone
 * afterwards. Two things follow from it, and both were seen for real on
 * 2026-08-19 (Sascha, German; Kai, Finnish):
 *
 *  1. THE PERFORMANCE CHANGES. Being moved on mid-sentence looks, to the person
 *     reading, exactly like finishing a line normally — the script scrolls
 *     either way. The only thing they can infer is "I am too slow", so they
 *     speed up, and every line after that is read by a rattled person. Kai,
 *     sitting with Sascha: "the tool kept auto-advancing before they were done,
 *     so the anxiety set in." That is worse than losing a clip, because nothing
 *     in the data says it happened.
 *
 *  2. THE AUDIO IS MISLABELLED. The recordist who was cut off is still talking.
 *     The VAD hears that continuing speech as a NEW take — but the line index
 *     has already moved, so the tail of line N is filed, uploaded and stored as
 *     a take of line N+1. Nothing errors. Nothing is flagged. A clip whose
 *     audio is the wrong sentence is the most expensive failure this tool has,
 *     because it survives every later audit that counts rows.
 *
 * The root cause of the bad cuts — end-of-speech judged against an ABSOLUTE
 * level that calibrate() had clamped INSIDE ordinary speech — is fixed in
 * useVAD (SPEECH_DROP_RATIO). This module fixes the thing that turned that
 * misjudgement into unrecoverable damage: it separates the two decisions, so a
 * cut is a cut and an advance is a separate, later, defensible act.
 *
 * THE RULE, in two parts:
 *
 *   A. AN ADVANCE IS NEVER IMMEDIATE. Closing a take arms the advance; it does
 *      not perform it. The line moves only after CONFIRM_SILENCE_MS of further
 *      quiet. If speech begins in that window, the person was still reading:
 *      the advance is cancelled, the line stays put, and what they say next is
 *      filed against the line they were actually reading. This is a structural
 *      guarantee, not a tuned threshold — no value of any VAD constant can put
 *      the tail of one line under the next line's name.
 *
 *   B. A TAKE WE KNOW WE TRUNCATED DOES NOT ADVANCE AT ALL. useVAD now reports
 *      how far the signal had fallen when it called the ending (dropAtCutDb,
 *      endedWhileLoud). A cut made while the signal was still at this speaker's
 *      own speech level is not evidence that they finished; it is evidence that
 *      we interrupted them. The autocue holds, and says so out loud, until the
 *      recordist either reads the line again or explicitly says it was fine.
 *
 * THE TRADE, written out rather than hidden. Part A costs every recordist
 * CONFIRM_SILENCE_MS of extra wait before the next line appears, and it can be
 * tripped by a fast reader: the VAD needs 800ms of silence to close a take, so
 * a recordist who begins the NEXT line between 800ms and 800+CONFIRM_SILENCE_MS
 * after finishing the previous one gets that read filed against the previous
 * line and is told to read it again. That band is narrow (a gap any shorter and
 * the two lines merge into one take regardless, which is the pre-existing
 * behaviour), the loss is one re-read, and the recordist is TOLD. The failure
 * it replaces is silent and permanent. We take the loud, recoverable one.
 *
 * Part B can also fire on a recordist who genuinely ends a line at full volume
 * with no decay — they lose one line to a re-read they did not need. Same
 * trade, same direction: we would rather interrupt the session visibly than
 * corrupt it invisibly.
 *
 * Deliberately NOT done: requiring an explicit tap to advance after EVERY take.
 * Continuous flow mode exists so a recordist can read a script without touching
 * the machine between lines; a tap per line is a different tool, and it would
 * have its own version of this bug (a mis-tap is also unrecoverable). The
 * confirmation is spent only where there is reason to doubt the cut.
 */

// How long the quiet after a closed take has to hold before the line moves.
// Sits ON TOP of the VAD's own 800ms end-of-speech timer, so the total silence
// required before the script moves is ~1.1s — comfortably clear of the pauses
// people make inside a sentence, which is what the 800ms was already sized for.
// Kept small on purpose: this is the tax every good take pays, and its job is
// only to outlast "cut mid-word and still talking", where speech resumes within
// a poll or two because it never actually stopped.
export const CONFIRM_SILENCE_MS = 300

// Why the advance did not happen, in the words the studio shows the recordist.
export const HELD_CUT_OFF = 'cut-off'      // useVAD says we ended it while they were still loud
export const HELD_RESUMED = 'resumed'      // they started speaking again before the line moved

/**
 * @param {object} opts
 * @param {(itemIndex:number)=>void} opts.advance   perform the actual advance
 * @param {(hold:{itemIndex:number,reason:string,dropDb:number|null})=>void} [opts.onHold]
 *        called when an advance is withheld, so the studio can say so
 * @param {number} [opts.confirmMs]
 * @param {typeof setTimeout} [opts.setTimeoutFn]   injectable for tests
 * @param {typeof clearTimeout} [opts.clearTimeoutFn]
 */
export function createAdvanceGate({
  advance,
  onHold = null,
  confirmMs = CONFIRM_SILENCE_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}) {
  let timer = null
  // The take whose advance is armed but not yet performed.
  let armed = null
  // The line we are refusing to leave until the recordist acts.
  let holding = null

  function disarm() {
    if (timer !== null) {
      clearTimeoutFn(timer)
      timer = null
    }
    armed = null
  }

  function hold(itemIndex, reason, dropDb) {
    disarm()
    holding = { itemIndex, reason, dropDb: dropDb ?? null }
    if (onHold) onHold(holding)
  }

  /**
   * The VAD closed a take. Decide whether the line may move, and when.
   *
   * @param {number} itemIndex   the line this take was recorded against
   * @param {object} [pauses]    useVAD's TakePauseReport for the cut
   * @returns {'armed'|'held'}
   */
  function takeEnded(itemIndex, pauses = null) {
    // A fresh take on the held line is the answer to the hold — whatever it
    // decides now stands.
    holding = null

    if (pauses?.endedWhileLoud) {
      hold(itemIndex, HELD_CUT_OFF, pauses.dropAtCutDb)
      return 'held'
    }

    disarm()
    armed = { itemIndex }
    timer = setTimeoutFn(() => {
      timer = null
      const due = armed
      armed = null
      if (due) advance(due.itemIndex)
    }, confirmMs)
    return 'armed'
  }

  /**
   * Speech began. If an advance was armed, the take we just closed was not the
   * end of anything — they are still reading. Cancel it.
   *
   * @returns {'cancelled'|'ignored'}
   */
  function speechStarted() {
    if (!armed) return 'ignored'
    const { itemIndex } = armed
    hold(itemIndex, HELD_RESUMED, null)
    return 'cancelled'
  }

  /** The recordist said the held take was fine. Move on, now. */
  function releaseHold() {
    const held = holding
    holding = null
    if (held) advance(held.itemIndex)
  }

  /** The hold is answered some other way (dismissed, line changed, session ended). */
  function clearHold() {
    holding = null
  }

  /** Session teardown / navigation: nothing pending may fire later. */
  function reset() {
    disarm()
    holding = null
  }

  return {
    takeEnded,
    speechStarted,
    releaseHold,
    clearHold,
    reset,
    // Inspectable for the studio's template and for tests.
    get isArmed() { return armed !== null },
    get holding() { return holding }
  }
}
