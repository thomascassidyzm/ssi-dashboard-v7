/**
 * booth-cursor.js — WHERE HE IS IN A BATCH survives a reload (Aran, 2026-10-15).
 *
 * The booth walks a batch on ONE cursor (RecordistRoom.vue, "THE ONE CURSOR"). A
 * reload, a phone that slept or a laptop lid used to drop him back on the first
 * unrecorded line, wherever he had been. This remembers the line he was standing
 * on, per voice and per scope (one batch, or a course/pod door link), by LINE ID
 * rather than by position: a batch whose lines change between visits must never
 * put the cursor on a different line that happens to sit at the same number.
 *
 * localStorage throws in private mode and inside some in-app browsers, so every
 * access is wrapped: a booth that cannot remember must still record.
 */

const PREFIX = 'recordist.cursor.v1'

/** The scope a cursor belongs to: one batch, or the door link he came in by. */
export function cursorScopeKey({ batch = null, course = '', pod = '' } = {}) {
  if (batch && batch.track) return `batch:${batch.track}#${batch.batch}`
  return `door:${course || ''}|${pod || ''}`
}

function storageKey(voiceId, scope) { return `${PREFIX}:${voiceId}:${scope}` }

/** The line id he was on, or null. */
export function loadCursor(voiceId, scope) {
  try {
    const raw = localStorage.getItem(storageKey(voiceId, scope))
    return raw ? String(raw) : null
  } catch { return null }
}

export function saveCursor(voiceId, scope, lineId) {
  try {
    if (lineId === null || lineId === undefined) localStorage.removeItem(storageKey(voiceId, scope))
    else localStorage.setItem(storageKey(voiceId, scope), String(lineId))
  } catch { /* cannot remember; the booth still records */ }
}

export function clearCursor(voiceId, scope) { saveCursor(voiceId, scope, null) }
