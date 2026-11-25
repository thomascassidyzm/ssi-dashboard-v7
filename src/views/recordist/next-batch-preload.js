// THE NEXT BATCH, READ WHILE SHE RECORDS THIS ONE (cs #299, Aran's yes, 2026-11-25).
//
// Catrin finished a batch, pressed Done, pressed Next batch, and waited 17.3 s (over a minute
// under load): every take drops the server's cached build of her queue, so the next batch was a
// cold rebuild of all 2,358 lines. The booth now asks for the next batch in the background, once,
// just after the batch on screen loads, with ?preload=1. The server answers that ONLY from the
// cached build it has just served this batch from (recordist-router.cjs), so the preload adds no
// read to the database, and answers 204 when it would have to build.
//
// What it shows is never trusted on its own. The rules, each here because breaking it is the
// failure Aran ruled out ("never show a line as unrecorded that has a take, never skip or repeat a
// line"):
//   1. It is used only for the exact batch address it was read for.
//   2. It is thrown away if any take she made since it was read has the same words as one of its
//      lines: the preload predates that take, so it could show that line as unread.
//   3. It is thrown away on any edit, and once it is older than PRELOAD_MAX_AGE_MS.
//   4. Once shown, the batch is read again, fresh, at once (the booth's reconcile). That answer
//      replaces the lines while she has not started; once she has, it can only ADD ticks, on the
//      same lines in the same order, so nothing she is reading moves under her.
// Pure: no Vue, no fetch, no clock of its own.

export const PRELOAD_MAX_AGE_MS = 15 * 60 * 1000

// Words only: case, punctuation and apostrophes of every shape dropped. Deliberately LOOSER than
// the server's own key: a false match only costs her the instant answer (rule 2 throws the preload
// away and the batch is read as it always was), whereas a missed match could show a read line as unread.
export function wordsKey(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * May this preload be shown for the batch `key` names now? `takenWords` are the wordsKey()s of every take this
 * device made since the preload was asked for (rule 2).
 */
export function preloadUsable(entry, { key, takenWords = new Set(), now = Date.now(), maxAgeMs = PRELOAD_MAX_AGE_MS }) {
  if (!entry || !entry.data || entry.key !== key || entry.dropped) return false
  if (!(now - entry.at < maxAgeMs)) return false
  const lines = Array.isArray(entry.data.lines) ? entry.data.lines : null
  if (!lines) return false
  for (const l of lines) {
    if (takenWords.has(wordsKey(l.text))) return false
    if (l.knownText && takenWords.has(wordsKey(l.knownText))) return false
  }
  return true
}

/**
 * Rule 4 once she has started reading from a preloaded batch: the fresh answer may only add
 * ticks. Returns [{ index, clipUrl }] for each shown line the fresh answer says is recorded and the
 * screen does not, or null when the fresh answer is not the same lines in the same order (then
 * nothing on screen is touched; the next quiet read settles it once she stops).
 */
export function freshTicks(shown, fresh) {
  if (!Array.isArray(shown) || !Array.isArray(fresh) || shown.length !== fresh.length) return null
  for (let i = 0; i < shown.length; i++) if (shown[i].id !== fresh[i].id) return null
  const out = []
  for (let i = 0; i < shown.length; i++) {
    if (!shown[i].recorded && fresh[i].recorded) out.push({ index: i, clipUrl: fresh[i].clipUrl || null })
  }
  return out
}
