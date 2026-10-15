// TAKES THAT SAVED BUT DID NOT MATCH THEIR WORDS (job #842, Tom's condition on Aran's faster
// uploads). The server's whisper script check now runs AFTER the upload has answered
// (services/take-text-check-queue.cjs), so a mismatch cannot ride on the take's response. The
// server keeps the list per voice (GET /api/recording/voice/:voiceId/text-check-failures) and the
// booth polls it while he records, so a take that did not match comes back to him in the same
// session: on the slim bar and the rail in a batch, and on the one Re-record card at home.
//
// THE ONE RACE THAT MATTERS: he re-reads a flagged line, and a poll that LEFT before that new take
// was queued answers after it has uploaded. That answer still names the old failed take, and
// trusting it would put the line he has just fixed back on the bar. So every line read again is
// stamped, and a poll answer only speaks for a line it left AFTER that stamp.

/** "didn't match the words", the card's reason, beside the other three. */
export const MISMATCH_WORDS = "didn't match the words"

/**
 * The live mismatches from one poll answer.
 * @param {object[]} items the answer's items: {lineId, takeId, heard, reason, checkedAt}
 * @param {number} sentAt when that poll left (ms, this device's clock)
 * @param {Map<string,number>} retakenAt lineId -> when he last queued a take of it (same clock)
 * @param {Map<string,object>} [current] the mismatches held before this answer
 * @returns {Map<string,object>} lineId -> {takeId, heard, reason}
 */
export function applyFailures(items, sentAt, retakenAt, current = new Map()) {
  const out = new Map()
  for (const it of items || []) {
    if (!it || !it.lineId) continue
    const t = retakenAt && retakenAt.get(it.lineId)
    if (t && t >= sentAt) continue // read again since this poll left: the answer is about the old take
    out.set(it.lineId, { takeId: it.takeId || null, heard: it.heard || null, reason: it.reason || null })
  }
  // A line read again after this poll left keeps whatever it had (normally nothing: it was
  // cleared when the new take was queued).
  for (const [id, m] of current) {
    const t = retakenAt && retakenAt.get(id)
    if (t && t >= sentAt && !out.has(id)) out.set(id, m)
  }
  return out
}

/** The one small line under a flagged line on the recording screen. */
export function mismatchLineWords(m) {
  const heard = m && m.heard ? String(m.heard).trim() : ''
  if (!heard) return `Last take ${MISMATCH_WORDS} — read it again`
  const h = heard.length > 60 ? `${heard.slice(0, 57).trimEnd()}…` : heard
  return `Last take ${MISMATCH_WORDS} — we heard “${h}”`
}
