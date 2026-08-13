/**
 * "Is this mapping save actually a request to put the row back?" — PURE.
 *
 * The gloss-alignment editor was a one-way door until 2026-08-12: the save gate
 * refused an empty segment list, so once anyone opened a row and tapped once,
 * that row was marked as hand-segmented for good and only a direct database
 * write could undo it (job #392's live verification had to finish its own
 * restore with SQL). This predicate is the door handle.
 *
 * A revert is spelled by the `segments` field itself — null, or an empty list.
 * Both are honest spellings of "no human has segmented this row"; the route
 * accepts either and stores NULL, and the gloss goes back to whatever the
 * generator derives from the row's own decomposition.
 *
 * The one thing this deliberately does NOT treat as a revert is a body with no
 * `segments` key at all. That is a malformed save, not an intention, and it
 * must keep failing the shape check — a dropped field should never be able to
 * silently wipe a row's alignment.
 *
 * @param {any} body the parsed request body
 * @returns {boolean}
 */
function isRevertRequest (body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  if (!Object.prototype.hasOwnProperty.call(body, 'segments')) return false
  const { segments } = body
  return segments === null || (Array.isArray(segments) && segments.length === 0)
}

module.exports = { isRevertRequest }
