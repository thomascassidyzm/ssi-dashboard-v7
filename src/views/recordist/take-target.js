/**
 * take-target.js — A TAKE IS FILED UNDER THE LINE THAT WAS ON THE SCREEN WHEN IT
 * WAS READ, AND UNDER NO OTHER (Aran, 2026-10-15).
 *
 * The blob for a line lands up to a tail-length AFTER the cursor has moved on
 * (useTapRecorder keeps the outgoing recorder running), and the cursor can now
 * move one line, back six or jump anywhere in that time. So the line is
 * captured — id and the words he was shown — at the instant the take is closed,
 * and checked again when the blob lands. A take is never resolved by position.
 *
 * Refused, not guessed: if the line has gone from the batch, or its words were
 * rewritten while the tail was running, the take is of something that no
 * longer exists, and filing it anywhere would put the wrong audio on a line.
 */

/** Freeze which line a take belongs to, at the moment it is closed. */
export function takeTargetAt(lines, i) {
  const l = Array.isArray(lines) ? lines[i] : null
  if (!l || l.id === null || l.id === undefined) return null
  return { id: l.id, text: l.text }
}

/**
 * Re-find the captured line when the blob lands.
 * @returns {{ ok: true, line: object } | { ok: false, reason: string }}
 */
export function resolveTakeTarget(target, lines) {
  if (!target) return { ok: false, reason: 'no-line' }
  const line = (Array.isArray(lines) ? lines : []).find(l => l && l.id === target.id)
  if (!line) return { ok: false, reason: 'line-gone' }
  if (line.text !== target.text) return { ok: false, reason: 'text-changed' }
  return { ok: true, line }
}
