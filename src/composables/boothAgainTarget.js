/**
 * boothAgainTarget.js — which line the booth's Again button re-opens.
 *
 * THE DEFECT (Dan, cym_sv2_for_eng, reported by Kai 2026-11-23, cs #865): Dan fluffs a line,
 * says "aahh", gathers himself — and that pause is longer than AUTO_ADVANCE_QUIET_MS (1.2 s).
 * So the booth MOVES ON BY ITSELF and files the fluffed read, reaction and all, as the take for
 * that line. Then he presses Again. Again only ever re-opened the line on screen, which is now
 * the NEXT line, so his retry landed there (or, tapped within 250 ms of the advance, was
 * swallowed by the shared Next/Again bounce guard) and the fluffed take stayed filed under the
 * line he meant. 285 of his 291 takes from 19-23 Nov moved on by themselves, so this is the
 * normal path for him, not an edge case. The recorder itself was cleared: Again stops the old
 * MediaRecorder and opens on a standby that is respawned after every spoken frame, so a retry
 * never carries the old chunks (useTapRecorder.discardLine / handOver).
 *
 * THE RULE: Again pressed just after the booth moved on BY ITSELF means "that line I just read",
 * so it goes back to the line that was filed and re-opens it, exactly as Back would. The new take
 * supersedes the fluffed one (queueTake drops an earlier take of the same line). "Just after" is
 * either of two facts, because each alone misses a real case:
 *   - nothing has been said on the new line yet — Again on an unread line has nothing of its own
 *     to redo, so it can only mean the line before; or
 *   - it is within AGAIN_AFTER_AUTO_MS of the advance — his "aahh" or a curse often lands on the
 *     NEW line (the old take's tail closes when it hears him start again), which makes the new
 *     line look spoken-on.
 * A tapped Next is a decision he made; Again after it keeps its old meaning (this line).
 *
 * NOT IN THE SAMPLE-GATE HASH on purpose (services/voice-engine/sample-gate.cjs): this decides
 * which line is on screen, like Back. It changes neither where a take ends nor whether it is
 * filed, so it must not re-ask every voice artist for ten checked takes.
 *
 * Pure: no Vue, no DOM, no I/O.
 */

// Kai, 2026-11-23 15:49Z: 1 s, not 4 s — long enough for a tap straight after the
// advance, short enough that a fluff on the NEW line is still re-read where it is.
export const AGAIN_AFTER_AUTO_MS = 1000

/**
 * @param {object} s
 * @param {{from:number,to:number,at:number}|null} s.lastAuto  the last advance, if it was automatic
 * @param {number} s.index            the line on screen now
 * @param {number} s.now              Date.now()
 * @param {boolean} s.lineHasSpeech   has the recorder heard speech on the line on screen
 * @returns {number} the index Again should re-open instead of the current line, or -1 for "this line"
 */
export function againReopensFiledLine({ lastAuto, index, now, lineHasSpeech }) {
  if (!lastAuto || lastAuto.to !== index || !(lastAuto.from >= 0)) return -1
  if (!lineHasSpeech) return lastAuto.from
  if (now - lastAuto.at < AGAIN_AFTER_AUTO_MS) return lastAuto.from
  return -1
}
