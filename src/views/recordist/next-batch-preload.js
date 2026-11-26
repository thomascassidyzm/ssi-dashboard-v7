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
 *
 * A TICK NEEDS THE SAME ID AND THE SAME WORDS (cs #306). A line she has just edited keeps its id
 * and has new words: a fresh answer that still carries the old words (read before her edit) says
 * "recorded" about a take of words that are no longer the line, and ticking it would show a line
 * she must read again as done. Same id, different text: no tick.
 */
export function freshTicks(shown, fresh) {
  if (!Array.isArray(shown) || !Array.isArray(fresh) || shown.length !== fresh.length) return null
  for (let i = 0; i < shown.length; i++) if (shown[i].id !== fresh[i].id) return null
  const out = []
  for (let i = 0; i < shown.length; i++) {
    if (shown[i].recorded || !fresh[i].recorded) continue
    if (String(shown[i].text ?? '') !== String(fresh[i].text ?? '')) continue
    out.push({ index: i, clipUrl: fresh[i].clipUrl || null })
  }
  return out
}

/**
 * EDITS ALWAYS WIN (cs #306, Aran's ruling). Every background read of the batch on screen (the
 * reconcile behind a preloaded batch, a quiet re-read) is stamped with the booth's read generation
 * when it STARTS. An edit, Re-record all and a setup submit advance the generation, so an answer
 * that set out before any of them is dropped whole when it lands: it cannot put old words back
 * over a saved edit, nor a tick on a line whose words were changed. The booth reads again after.
 */
export function backgroundAnswerApplies(startedGen, currentGen) {
  return Number.isInteger(startedGen) && startedGen === currentGen
}

/**
 * ONE PRELOAD REQUEST PER BATCH (cs #306). `asked` is the set of batch keys a preload has already
 * been sent for on this page. The key is added BEFORE the request goes out and is never removed,
 * not on a 204, a failure, an abort or an edit, so quiet re-reads, the reconcile and the next-batch
 * address settling cannot send a second request for the same batch. Returns true when the caller
 * may send (and has now marked it), false when it was already asked.
 */
export function claimPreload(asked, key) {
  if (!key || asked.has(key)) return false
  asked.add(key)
  return true
}
