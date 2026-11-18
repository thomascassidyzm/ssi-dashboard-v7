/**
 * THE ATTESTED RE-RECORD GRANT DOOR: the one way a re-record permission reaches live from an agent.
 *
 * WHY THE GATE EXISTS (services/shared/rerecord-gate.cjs, #224, 2026-10-11): the ara_lb_for_eng resume
 * planned 13,881 paid renders over a course that already played, and Tom ruled "there shouldn't be any
 * re-recording done without express permission by me." So no worker may replace working audio on its
 * own decision.
 *
 * WHY THIS DOOR (job #772, 2026-11-13): Tom, "how express does my permission have to be to defeat my own
 * checks and balances???!!!" Every grant until now ended with "Tom or Kai, run this command by hand", and
 * the only check on the CLI was TOM_SAID_RERECORD=yes, which any agent can type. Decision (not to be
 * re-opened): a message Tom typed himself in his own Watson room, which the Command Surface attests he
 * authored, IS express permission.
 *
 * THE SHAPE. This door holds no secret and trusts nothing in the request except a one-time nonce:
 *   1. Tom's Watson calls the surface (POST /api/rerecord-grant, command-surface rerecord-grant.js). The
 *      surface refuses unless the caller's conversation token is one of Tom's own Watson rooms and the
 *      quoted message is stamped human, authored by Tom. It files an attestation under a random nonce
 *      and calls this door with only that nonce.
 *   2. This door asks the SURFACE (loopback :4317, which no agent can bind) for the attestation the nonce
 *      names. The surface hands it out once, within two minutes of filing. Whatever a caller puts in the
 *      body other than the nonce is ignored, so a worker calling this route directly gets nothing.
 *   3. It inserts the one tts_rerecord_permissions row, with Tom's exact words, the message's room, seq
 *      and time in `why` (no schema change), and answers with the id.
 * It does only this: no revoke, no update, no other table.
 */
const SURFACE = process.env.CS_SURFACE_URL || 'http://127.0.0.1:4317'
const COURSE = /^[a-z]{2,3}(_[a-z0-9]{2,3})?_for_[a-z]{2,3}(_[a-z0-9]{2,3})?$/
const MAX_DAYS = 31

/** The row the attestation licenses, or { refuse } — pure, so the rule is readable in one place. */
function grantRow(a) {
  if (!a || typeof a !== 'object') return { refuse: 'no attestation' }
  if (!COURSE.test(String(a.course || ''))) return { refuse: `bad course ${a.course}` }
  const days = Number(a.days)
  if (!(Number.isInteger(days) && days > 0 && days <= MAX_DAYS)) return { refuse: `days must be 1..${MAX_DAYS}` }
  const max = a.max == null ? null : Number(a.max)
  if (max != null && !(Number.isInteger(max) && max > 0)) return { refuse: 'max must be a positive whole number of clips' }
  const roles = Array.isArray(a.roles) && a.roles.length ? a.roles.map(String) : null
  if (roles && roles.some(r => !/^[a-z0-9_]+$/.test(r))) return { refuse: 'bad role' }
  const words = String(a.words || '').trim()
  if (!words || a.source !== 'human' || a.author !== 'tom') return { refuse: 'the attested message is not Tom\'s own words' }
  if (!a.conv || !Number.isInteger(Number(a.seq)) || !a.msgTs) return { refuse: 'attestation lacks the message id and time' }
  const when = new Date(Number(a.msgTs)).toISOString().replace(/:\d\d\.\d+Z$/, 'Z')
  const why = `${words.slice(0, 1500)} — Tom, typed in his Watson room ${String(a.conv).slice(0, 8)} message #${a.seq} at ${when}, attested human by the Command Surface; recorded by Watson ${String(a.callerConv || '').slice(0, 8)} (attested door, job #772)`
  return {
    row: {
      course_code: a.course, roles, by: 'Tom (attested message)', why,
      until: new Date(Date.now() + days * 86400e3).toISOString(), max_clips: max,
    },
  }
}

async function claimAttestation(nonce, { fetchImpl = fetch } = {}) {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(String(nonce || ''))) return { refuse: 'nonce missing or malformed' }
  const r = await fetchImpl(`${SURFACE}/api/rerecord-grant/attestation?nonce=${encodeURIComponent(nonce)}`, { headers: { 'x-service-name': 'popty-rerecord-grant-door' } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || !body.ok) return { refuse: `the Command Surface does not attest this nonce (${body.error || r.status})` }
  return { attestation: body.attestation }
}

function supabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set')
  const { createClient } = require('@supabase/supabase-js')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
}

/** POST /api/rerecord-permission/attested { nonce } — the whole door. */
async function handleAttestedGrant(body, { fetchImpl, db = supabase } = {}) {
  const c = await claimAttestation(body && body.nonce, { fetchImpl })
  if (c.refuse) return { status: 403, json: { ok: false, code: 'NOT_ATTESTED', error: c.refuse } }
  const g = grantRow(c.attestation)
  if (g.refuse) return { status: 400, json: { ok: false, code: 'BAD_ATTESTATION', error: g.refuse } }
  const { data, error } = await db().from('tts_rerecord_permissions').insert(g.row).select('id, course_code, roles, until, max_clips').single()
  if (error) return { status: 500, json: { ok: false, error: `insert failed: ${error.message}` } }
  return { status: 200, json: { ok: true, permission: data } }
}

module.exports = { handleAttestedGrant, grantRow, claimAttestation }
