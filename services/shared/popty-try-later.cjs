/**
 * POPTY ITSELF DOWN OR RESTARTING IS "TRY LATER", NEVER AN ANSWER (cs #152, 24 Nov 2026).
 *
 * WHY. cs #43·AL made a Command Surface outage a retryable APPROVAL_CHECK_UNAVAILABLE. But when POPTY was the thing restarting
 * (12:31Z and 12:35Z on 24 Nov), tools/audio/render.cjs's fetch threw (ECONNREFUSED / socket hang up) or got a proxy 502/503
 * with no JSON, printed nothing on stdout and exited 2 — "refused". The #868 item-8 runner logged that as NO_ANSWER, marked the
 * slot done and never asked again: eng_for_pan S0059L01U04 and eng_for_urd S0002L02U03 went silent. The Urdu render had in
 * fact completed server-side before the answer was lost; a re-ask is library-first, so it is free and returns that same clip.
 *
 * THE RULE. A request whose answer never arrived — the fetch threw, or a gateway status (502/503/504) came back carrying no
 * verdict code of the route's own — and the surface-outage code APPROVAL_CHECK_UNAVAILABLE are TRY LATER: back off and ask
 * again (30s, 60s, 120s, then every 240s) inside a budget; past the budget the caller leaves the slot UNANSWERED (no ledger
 * line, or a line runners skip) and the next run asks again. Every real answer, refusals included, is final and printed once.
 */
const GATEWAY = new Set([502, 503, 504])
const TRY_LATER_CODES = new Set(['APPROVAL_CHECK_UNAVAILABLE', 'POPTY_UNAVAILABLE'])

/** Pure: is this outcome "no answer yet"? { error } = the fetch threw; else { status, body }. */
function isTryLater({ error, status, body } = {}) {
  if (error) return true
  if (body && TRY_LATER_CODES.has(body.code)) return true
  if (GATEWAY.has(status) && !(body && body.code)) return true
  return false
}

/** Pure: how long to wait before attempt n+1. */
function backoffMs(attempt, retryAfterSec = 0) {
  return Math.max(Number(retryAfterSec || 0) * 1000, Math.min(30000 * 2 ** attempt, 240000))
}

/** A ledger record runners must treat as UNANSWERED (ask again), not as a verdict on the slot. */
function isUnansweredRecord(rec) {
  if (!rec) return true
  if (rec.tryLater || TRY_LATER_CODES.has(rec.code) || rec.code === 'NO_ANSWER') return true
  return rec.code === 'APPROVAL_UNVERIFIED' && /could not be reached|unavailable/i.test(String(rec.error || ''))
}

/**
 * POST JSON to Popty, backing off while the answer is try-later. Resolves { status, body, tryLater }: tryLater:true means the
 * budget ran out with no answer (body then carries code POPTY_UNAVAILABLE or APPROVAL_CHECK_UNAVAILABLE).
 */
async function postUntilAnswered(url, { headers = {}, body, budgetMs = 900000, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, log = (m) => console.error(m) } = {}) {
  const started = now()
  for (let attempt = 0; ; attempt++) {
    let status = 0, out = null, error = null
    try {
      const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
      status = res.status
      out = await res.json().catch(() => null)
    } catch (e) { error = e }
    if (!isTryLater({ error, status, body: out })) return { status, body: out || { ok: false, error: `HTTP ${status}` }, tryLater: false }
    const why = error ? `Popty unreachable (${(error.cause && error.cause.code) || error.message})` : out && out.code ? out.code : `HTTP ${status}`
    const waitMs = backoffMs(attempt, out && out.retryAfterSec)
    if (now() - started + waitMs > budgetMs) {
      const code = out && out.code === 'APPROVAL_CHECK_UNAVAILABLE' ? out.code : 'POPTY_UNAVAILABLE'
      return { status, tryLater: true, body: { ...(out || {}), ok: false, code, tryLater: true, error: (out && out.error) || `${why}; still no answer after ${Math.round((now() - started) / 1000)}s — try later` } }
    }
    log(`${why}; asking again in ${Math.round(waitMs / 1000)}s`)
    await sleep(waitMs)
  }
}

module.exports = { isTryLater, backoffMs, isUnansweredRecord, postUntilAnswered, TRY_LATER_CODES }
