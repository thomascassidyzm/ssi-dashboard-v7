/**
 * booth-link-keys.cjs — PRIVATE booth links: a per-voice secret on every /api/recording/voice/:voiceId route.
 *
 * Aran, 2026-10-14 (job #380): /r/<voice_id> and every booth API route under it answered on the voice
 * id alone, so anyone who edited the id in their own link got another artist's whole booth and could
 * play their takes (found by #371). The link stays the identity — artists still have no login — but
 * it now carries a secret: /r/<voice>?k=<128-bit token>. Without the right token a booth route is
 * refused, unless the caller is signed in as a God admin (booth-god-admins.cjs) or as the artist who
 * reads that voice (the same voicesForEmail resolution /mine uses).
 *
 * STORED HASHED. booth_link_keys holds sha256(token), never the token (database/changes/
 * 20261014_booth_link_keys.sql: RLS on, service role only). Verification needs only the hash. So that
 * an admin can still SHOW and COPY a link after it was made, the token is not random-and-forgotten:
 * it is HMAC(server secret, voice + ':' + nonce), with the random 128-bit nonce stored beside the
 * hash. The DB alone (a leaked dump) yields no working link; the server re-derives the token to show
 * it, and checks it against the stored hash before it does. Regenerating = a new nonce, and the old
 * link stops working on the next cache expiry (KEY_TTL_MS) or at once in the process that rotated it.
 *
 * GRACE MODE (rollout safety): artists were recording on bare id-only links when this shipped. While
 * grace is ON (the default; BOOTH_LINK_GRACE=off turns it off) a request without the right key is
 * still served, and logged + counted per voice so the admin panel shows who is still on an old link.
 * Turning grace off is Aran's call, after he has re-sent the private links.
 *
 * A SETUP-CHECK PACK (pack-setup-<voice>) is the same artist's booth, so it takes that voice's key.
 */

'use strict'

const crypto = require('crypto')

const TABLE = 'booth_link_keys'
const KEY_TTL_MS = 60 * 1000
// A failed read (Supabase blip: "fetch failed", schema-cache errors) falls back to the last row this
// process read successfully, if it is younger than this. A successful read always replaces it, so a
// rotated or deleted key is refused as soon as a fresh read gets through (job #917, 2026-10-23).
const KEY_GRACE_MS = 10 * 60 * 1000
const SETUP_PACK_PREFIX = 'pack-setup-'
const KEY_HEADER = 'x-booth-key'
const KEY_QUERY = 'k'

/** Which voice's key opens this booth id. */
function boothKeyId(voiceId) {
  const v = String(voiceId == null ? '' : voiceId).trim()
  return v.startsWith(SETUP_PACK_PREFIX) ? v.slice(SETUP_PACK_PREFIX.length) : v
}

function hashKey(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

/** 128 bits, base64url (22 chars), derived — see the header for why derived rather than stored. */
function deriveToken(secret, voiceId, nonce) {
  return crypto.createHmac('sha256', secret).update(`${voiceId}:${nonce}`).digest().subarray(0, 16).toString('base64url')
}

function keyMatches(token, storedHash) {
  if (!token || !storedHash) return false
  const a = Buffer.from(hashKey(token), 'hex')
  const b = Buffer.from(String(storedHash), 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Grace is ON unless the environment says off. Shipping with it on is the rollout plan. */
function graceFromEnv(env = process.env) {
  const v = String(env.BOOTH_LINK_GRACE == null ? '' : env.BOOTH_LINK_GRACE).trim().toLowerCase()
  return !['off', '0', 'false', 'no'].includes(v)
}

/**
 * The server secret the tokens are derived from. A dedicated BOOTH_LINK_SECRET wins; otherwise one
 * derived from the service-role key, which every Popty API process already holds and which already
 * opens every row this would protect. Null when neither is set: links can then be verified but not
 * made or shown.
 */
function secretFromEnv(env = process.env) {
  if (env.BOOTH_LINK_SECRET) return String(env.BOOTH_LINK_SECRET)
  if (env.SUPABASE_SERVICE_KEY) return crypto.createHmac('sha256', String(env.SUPABASE_SERVICE_KEY)).update('booth-link-v1').digest('hex')
  return null
}

/** The key the request presents: header first (fetches), then ?k= (audio elements cannot send headers). */
function presentedKey(req) {
  const h = req.headers && req.headers[KEY_HEADER]
  if (typeof h === 'string' && h.trim()) return h.trim()
  const q = req.query && req.query[KEY_QUERY]
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
}

/** Never let a key reach a log or an access-ledger row: strip ?k= from a URL string. */
function stripKeyParam(url) {
  const s = String(url || '')
  const i = s.indexOf('?')
  if (i < 0) return s
  const params = new URLSearchParams(s.slice(i + 1))
  if (!params.has(KEY_QUERY)) return s
  params.delete(KEY_QUERY)
  const rest = params.toString()
  return rest ? `${s.slice(0, i)}?${rest}` : s.slice(0, i)
}

/**
 * THE DECISION, pure. One booth request: may it through?
 *   keyOk     the presented key matches this voice's stored hash
 *   privileged a signed-in God admin, or the signed-in artist who reads this voice
 *   grace     grace mode is on
 * → { allow, reason, graceLogged }
 */
function decideBoothAccess({ keyOk, privileged, grace, presented, hasKey }) {
  if (keyOk) return { allow: true, reason: 'key', graceLogged: false }
  if (privileged) return { allow: true, reason: 'signed_in', graceLogged: false }
  const reason = !presented ? 'no_key' : (hasKey ? 'wrong_key' : 'no_key_issued')
  if (grace) return { allow: true, reason: `grace_${reason}`, graceLogged: true }
  return { allow: false, reason, graceLogged: false }
}

/** The store over booth_link_keys. Service role only; every read is cached KEY_TTL_MS per voice. */
function createBoothKeyStore({ getDb, secret = secretFromEnv(), now = () => Date.now(), graceMs = KEY_GRACE_MS, logger = console } = {}) {
  const cache = new Map() // voiceId → { at, row }
  const db = () => {
    const d = getDb()
    if (!d) throw Object.assign(new Error('Database not initialised'), { status: 503 })
    return d
  }

  async function row(voiceId) {
    const id = boothKeyId(voiceId)
    const hit = cache.get(id)
    if (hit && now() - hit.at < KEY_TTL_MS) return hit.row
    let data
    try {
      const out = await db().from(TABLE).select('voice_id, key_hash, nonce, created_by, created_at').eq('voice_id', id).maybeSingle()
      if (out.error) throw new Error(out.error.message)
      data = out.data
    } catch (err) {
      if (hit && now() - hit.at < graceMs) {
        logger.warn(`[BoothKey] read failed for ${id} (${err.message}); using the key read ${Math.round((now() - hit.at) / 1000)}s ago`)
        return hit.row
      }
      throw new Error(`booth key read failed: ${err.message}`)
    }
    cache.set(id, { at: now(), row: data || null })
    return data || null
  }

  /** The token for a row, re-derived — null if this server's secret did not make it. */
  function tokenFor(r) {
    if (!r || !secret || !r.nonce) return null
    const token = deriveToken(secret, r.voice_id, r.nonce)
    return keyMatches(token, r.key_hash) ? token : null
  }

  async function list() {
    const { data, error } = await db().from(TABLE).select('voice_id, key_hash, nonce, created_by, created_at')
    if (error) throw new Error(`booth keys read failed: ${error.message}`)
    return (data || []).map((r) => ({ voiceId: r.voice_id, key: tokenFor(r), createdBy: r.created_by, createdAt: r.created_at }))
  }

  /** Make (or replace) a voice's key. The previous link stops working. */
  async function rotate(voiceId, createdBy) {
    if (!secret) throw Object.assign(new Error('No BOOTH_LINK_SECRET or SUPABASE_SERVICE_KEY on this server: cannot make links.'), { status: 503 })
    const id = boothKeyId(voiceId)
    if (!id) throw Object.assign(new Error('No voice id'), { status: 400 })
    const nonce = crypto.randomBytes(16).toString('base64url')
    const token = deriveToken(secret, id, nonce)
    const r = { voice_id: id, key_hash: hashKey(token), nonce, created_by: createdBy || 'unknown', created_at: new Date(now()).toISOString() }
    const { error } = await db().from(TABLE).upsert(r, { onConflict: 'voice_id' })
    if (error) throw new Error(`booth key write failed: ${error.message}`)
    cache.set(id, { at: now(), row: r })
    return { voiceId: id, key: token, createdBy: r.created_by, createdAt: r.created_at }
  }

  async function keyFor(voiceId) { return tokenFor(await row(voiceId)) }

  return { row, list, rotate, keyFor }
}

/**
 * The middleware for router.use('/voice/:voiceId', …). `identify(req)` resolves a signed-in caller
 * WITHOUT answering (null when none); `ownsVoice(user, voiceKeyId)` says whether they read it.
 * Grace-mode passes are counted in `graceLog` (voice → { count, lastAt, lastReason }) for the panel.
 */
function createBoothKeyGate({ store, identify = null, isGodAdmin, ownsVoice = null, grace = graceFromEnv(), logger = console, now = () => Date.now() }) {
  const graceLog = new Map()
  const graceOn = typeof grace === 'function' ? grace : () => grace

  async function gate(req, res, next) {
    const voiceId = boothKeyId(req.params.voiceId)
    try {
      const presented = presentedKey(req)
      // The key never reaches the access ledger or a log line from here on.
      if (req.query && KEY_QUERY in req.query) delete req.query[KEY_QUERY]
      req.originalUrl = stripKeyParam(req.originalUrl)
      const r = await store.row(voiceId)
      const keyOk = keyMatches(presented, r && r.key_hash)
      let privileged = false
      if (!keyOk && identify && req.headers && req.headers.authorization) {
        const user = await identify(req).catch(() => null)
        if (user) privileged = !!(isGodAdmin && isGodAdmin(user)) || !!(ownsVoice && await ownsVoice(user, voiceId).catch(() => false))
      }
      const verdict = decideBoothAccess({ keyOk, privileged, grace: graceOn(), presented: !!presented, hasKey: !!r })
      if (verdict.graceLogged) {
        const prev = graceLog.get(voiceId) || { count: 0 }
        graceLog.set(voiceId, { count: prev.count + 1, lastAt: new Date(now()).toISOString(), lastReason: verdict.reason })
        logger.warn(`[BoothKey] GRACE ${verdict.reason} ${req.method} /voice/${voiceId}${req.path === '/' ? '' : req.path}`)
      }
      if (!verdict.allow) {
        logger.warn(`[BoothKey] refused ${verdict.reason} ${req.method} /voice/${voiceId}`)
        return res.status(403).json({
          error: 'This recording link is private and this one is missing its key, or is out of date. Ask Aran for your current link.',
          reason: verdict.reason,
        })
      }
      req.boothAccess = verdict.reason
      next()
    } catch (err) {
      logger.error(`[BoothKey] gate ${voiceId}: ${err.message}`)
      // In grace the booth must keep working through a key-store hiccup; out of grace, fail closed.
      if (graceOn()) return next()
      res.status(503).json({ error: 'Could not check this recording link. Try again in a moment.' })
    }
  }
  gate.graceLog = graceLog
  gate.graceOn = graceOn
  return gate
}

module.exports = {
  TABLE, KEY_TTL_MS, KEY_GRACE_MS, KEY_HEADER, KEY_QUERY,
  boothKeyId, hashKey, deriveToken, keyMatches, graceFromEnv, secretFromEnv,
  presentedKey, stripKeyParam, decideBoothAccess,
  createBoothKeyStore, createBoothKeyGate,
}
