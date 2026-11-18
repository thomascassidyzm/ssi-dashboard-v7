/**
 * APPROVAL ORIGIN — an approval token on POST /api/audio/render must really come from the seat it names (job #116·AI, 2026-11-16).
 *
 * WHY. Kai may authorise any audio work up to the daily cap (Tom 2026-10-30, r-2026-10-30-kai-can-authorise-any-audio-work) by
 * putting `kai:YYYY-MM-DD:<reason>` on a render request; the route then lets a re-record past RERECORD_NOT_PERMITTED and
 * EXISTS_IN_LANGUAGE. Until this file the token was checked for its SHAPE only (human-take-guard.cjs approverOf), so anything
 * that knew the format could authorise real Cartesia/Azure spend and replace recordings in Kai's name (finding #115·AI, Tom's
 * Watson thread ww-03084ac1; foreign-eyes d/be3ed59f flagged it 2026-10-31). `tom:` tokens were equally shape-only.
 *
 * THE CONTRACT (no new step for Kai, no new cap, no surface change):
 *   A request carrying `approval` must also carry header `x-cs-conv: <the caller's own Command Surface conversation token>`.
 *   Every surface conversation (Kai's assistant and each worker on Kai's seat) already holds one — it is in the preamble and in
 *   env CS_CONV_TOKEN — and the surface already resolves one to its seat: GET http://127.0.0.1:4317/api/whoami with that header
 *   answers {"id":"kai"|"tom"|…}, and 403 on a forged or bad signature. Popty holds no secret: it asks the surface, exactly as
 *   rerecord-grant-door.cjs asks it to attest Tom's grants. The token's approver (`kai:` / `tom:`) must EQUAL the seat that
 *   answered — a Tom-seat caller signs `tom:`, a Kai-seat caller signs `kai:`; neither signs for the other.
 *   CAREFUL: /api/whoami with NO header answers "tom" (loopback default). So a missing or malformed token is refused HERE and
 *   never sent — otherwise a request with no header would read as Tom.
 *
 * FAILS CLOSED: no header, a bad token, a mismatched seat, or a surface that cannot be reached → refused with code
 * APPROVAL_UNVERIFIED (403) and a message naming why and how a genuine approval is sent. Not knowing is not permission.
 *
 * NEVER LOG THE TOKEN: it is a bearer credential for the caller's conversation. Nothing here prints it; it travels only to the
 * loopback surface.
 *
 * NOT CHANGED: Tom-signed tts_rerecord_permissions rows (incl. r-2026-11-03 Aran PRO clone on cym_nv2/cym_sv2), the adopt
 * exception list (adopt-exception.cjs, r-2026-10-28 deu_at Tamara) and the voice rules (resolve-voice.cjs) never read `approval`
 * and pass exactly as before. A request WITHOUT `approval` is untouched.
 */
const { approverOf } = require('./human-take-guard.cjs')

const SURFACE = process.env.CS_SURFACE_URL || 'http://127.0.0.1:4317'
const CONV_TOKEN = /^c1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{20,}$/
const HOW = 'Send the approval from a Command Surface conversation on the seat it names, with header x-cs-conv set to that conversation\'s own token '
  + '(tools pick it up from env CS_CONV_TOKEN). Kai\'s seat signs kai:…, Tom\'s seat signs tom:…. Do not retry or route around this.'

class ApprovalUnverified extends Error {
  constructor(why) { super(`approval refused — its origin could not be verified: ${why}. ${HOW}`); this.name = 'ApprovalUnverified'; this.code = 'APPROVAL_UNVERIFIED'; this.status = 403 }
}

/** Pure decision: does the seat the surface answered speak for this approval? → null (yes) or the reason it does not. */
function originMismatch(approval, seat) {
  const who = approverOf(approval)
  if (!who) return 'approval must look like kai:YYYY-MM-DD:<reason> (or tom:YYYY-MM-DD:<reason>)'
  if (!seat) return 'the Command Surface named no seat for the x-cs-conv token'
  if (seat !== who) return `the approval says ${who}: but the sending conversation is on ${seat}'s seat`
  return null
}

/**
 * Verify `approval` against the caller's conversation token. Resolves { approver, seat } or throws ApprovalUnverified.
 * Call only when an approval is present.
 */
async function verifyApprovalOrigin(approval, convToken, { fetchImpl = fetch, surface = SURFACE } = {}) {
  if (!approverOf(approval)) throw new ApprovalUnverified('approval must look like kai:YYYY-MM-DD:<reason> (or tom:YYYY-MM-DD:<reason>)')
  const tok = typeof convToken === 'string' ? convToken.trim() : ''
  if (!tok) throw new ApprovalUnverified('the request carries no x-cs-conv header, so nothing shows which seat issued the approval')
  if (!CONV_TOKEN.test(tok)) throw new ApprovalUnverified('the x-cs-conv header is not a Command Surface conversation token')
  let r, body
  try {
    r = await fetchImpl(`${surface}/api/whoami`, { headers: { 'x-cs-conv': tok, 'x-service-name': 'popty-approval-origin' }, signal: AbortSignal.timeout(5000) })
    body = await r.json().catch(() => ({}))
  } catch (e) {
    throw new ApprovalUnverified(`the Command Surface could not be reached to confirm the seat (${e.cause ? e.cause.code || e.cause.message : e.message})`)
  }
  if (!r.ok) throw new ApprovalUnverified(`the Command Surface refused the x-cs-conv token (HTTP ${r.status}${body && body.error ? `: ${String(body.error).slice(0, 80)}` : ''})`)
  const seat = body && typeof body.id === 'string' ? body.id : null
  const why = originMismatch(approval, seat)
  if (why) throw new ApprovalUnverified(why)
  return { approver: approverOf(approval), seat }
}

/** Headers a committed tool adds to a render request that carries an approval: its own conversation token, from env. */
function approvalHeaders(body, env = process.env) {
  return body && body.approval && env.CS_CONV_TOKEN ? { 'x-cs-conv': env.CS_CONV_TOKEN } : {}
}

module.exports = { verifyApprovalOrigin, originMismatch, approvalHeaders, ApprovalUnverified, CONV_TOKEN }
