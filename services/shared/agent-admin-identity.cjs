// services/shared/agent-admin-identity.cjs
//
// THE SANCTIONED DOOR FOR AN AGENT AT A POPTY ADMIN ROUTE (job #410, 2026-10-14).
//
// The admin routes want a signed-in admin session, and an agent has none, so
// agents were going round the door (hand-written DB code, owner logins). This is
// the door instead: a same-host caller proves it holds the key in /etc/popty by
// signing the request, names itself, and is held to a short list of scopes.
// Every call is attributed (agent id in the log and in the response) and bound
// to ONE method + path + body, so a captured header cannot be replayed against
// another route or with another payload.
//
// Why a signature and not a bearer token: agents run as the same Unix user as
// Tom and cannot read /etc/popty (0700 popty). The signing helper
// (tools/agent-admin/call.cjs) therefore asks the key's owner to sign:
// `sudo -n -u popty node tools/agent-admin/sign.cjs`. The key never reaches the
// agent's memory, argv or environment.
//
// Header:  x-agent-admin: v1.<agentId>.<unix-seconds>.<hex hmac-sha256>
// Signed:  v1 \n agentId \n ts \n METHOD \n path-with-query \n sha256(body JSON)
//
// Key file (JSON, popty-only):  { "secret": "<hex>", "scopes": ["voice-slot:write", ...] }
// Scopes are held by the KEY, not claimed by the caller; a route names the one
// scope it needs and the key either carries it or the call is refused 403.

'use strict';

const crypto = require('crypto');
const fs = require('fs');

const SCOPES = Object.freeze({
  VOICE_SLOT_WRITE: 'voice-slot:write',
  TAKES_READ: 'takes:read',
  // Kai's agents (Tom 2026-10-14, r-2026-10-14-kai-is-team-his-agents-get): the
  // whole /api/admin and /api/voicelab surface, read and write. A key carrying
  // it satisfies EVERY narrower scope too.
  ADMIN_ALL: 'admin:all',
});

const HEADER = 'x-agent-admin';
const DEFAULT_KEY_FILE = '/etc/popty/agent-admin.key';
const MAX_SKEW_S = 60;
const AGENT_ID = /^[a-z0-9][a-z0-9_.:-]{1,63}$/;

function loopbackDirect(req) {
  const addr = req.socket?.remoteAddress || '';
  const loop = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  return loop && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip'];
}

function bodyDigest(body) {
  const canonical = body && typeof body === 'object' && Object.keys(body).length ? JSON.stringify(body) : '';
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function signingString({ agentId, ts, method, path, body }) {
  return ['v1', agentId, String(ts), String(method).toUpperCase(), path, bodyDigest(body)].join('\n');
}

/** Used by the signing helper, in the popty-owned process that can read the key. */
function signHeader({ secret, agentId, method, path, body, ts = Math.floor(Date.now() / 1000) }) {
  if (!AGENT_ID.test(agentId || '')) throw new Error(`agent id must match ${AGENT_ID} (got ${agentId})`);
  const sig = crypto.createHmac('sha256', secret).update(signingString({ agentId, ts, method, path, body })).digest('hex');
  return `v1.${agentId}.${ts}.${sig}`;
}

function loadKey(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw || typeof raw.secret !== 'string' || raw.secret.length < 32) throw new Error('agent-admin key file has no usable secret');
  return { secret: raw.secret, scopes: Array.isArray(raw.scopes) ? raw.scopes : [] };
}

/** The verified agent user for a request the front door admitted with admin:all, else null. */
function agentFromRequest(req) {
  return req.agentAdmin && keyHasScope(req.agentAdmin.scopes, SCOPES.ADMIN_ALL) ? req.agentAdmin.user : null;
}

function keyHasScope(scopes, scope) {
  return Array.isArray(scopes) && (scopes.includes(scope) || scopes.includes(SCOPES.ADMIN_ALL));
}

/**
 * Build a verifier. `check(req, scope)` answers:
 *   null                         — no x-agent-admin header: not an agent attempt
 *   { ok:true, agent, user }     — verified; `user` is admin-shaped for the route
 *   { ok:false, status, error }  — an attempt that failed; the route answers it
 *                                  and never falls back to another door
 */
function createAgentAdminVerifier({ keyFile = process.env.POPTY_AGENT_ADMIN_KEY_FILE || DEFAULT_KEY_FILE, key = null, now = () => Date.now(), logger = console } = {}) {
  const seen = new Map(); // signature -> expiry ms (replay window)

  function check(req, scope) {
    const header = String(req.headers[HEADER] || '').trim();
    if (!header) return null;
    const fail = (status, error) => {
      logger.warn?.(`[AgentAdmin] REFUSED ${req.method} ${req.originalUrl}: ${error}`);
      return { ok: false, status, error };
    };
    if (!loopbackDirect(req)) return fail(403, 'agent identity is accepted from the same host only');
    const m = header.match(/^v1\.([^.]+)\.(\d{9,11})\.([0-9a-f]{64})$/);
    if (!m) return fail(401, 'malformed x-agent-admin header');
    const [, agentId, tsRaw, sig] = m;
    if (!AGENT_ID.test(agentId)) return fail(401, 'bad agent id');
    const ts = Number(tsRaw);
    if (Math.abs(now() / 1000 - ts) > MAX_SKEW_S) return fail(401, 'signature expired (clock skew > 60s)');

    let k = key;
    if (!k) {
      try { k = loadKey(keyFile); } catch (e) { return fail(503, `agent identity is not provisioned (${e.code || e.message})`); }
    }
    const path = req.originalUrl;
    const want = crypto.createHmac('sha256', k.secret)
      .update(signingString({ agentId, ts, method: req.method, path, body: req.body })).digest();
    const got = Buffer.from(sig, 'hex');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return fail(401, 'signature does not match this method, path and body');
    if (seen.has(sig)) return fail(401, 'signature already used');
    for (const [s, exp] of seen) if (exp <= now()) seen.delete(s);
    seen.set(sig, now() + (MAX_SKEW_S * 2) * 1000);
    // scope null = judge the signature only and hand back what the key carries,
    // so the front-door middleware can verify ONCE (a signature is single-use)
    // and each gate asks keyHasScope() afterwards.
    if (scope && !keyHasScope(k.scopes, scope)) return fail(403, `the agent key does not carry scope ${scope}`);

    logger.info?.(`[AgentAdmin] ${agentId} ${req.method} ${path} scope=${scope || 'verified'}`);
    return {
      ok: true,
      agent: agentId,
      scope,
      scopes: k.scopes,
      // Admin-shaped so existing handlers that read user.email / role keep working,
      // and the attribution is unmistakable in every log line that prints it.
      user: { kind: 'agent', id: agentId, email: `agent:${agentId}`, name: `agent ${agentId}`, role: 'admin', courses: '*', verified: false, viaAgentKey: true },
    };
  }

  return { check };
}

/**
 * THE FRONT DOOR for whole path prefixes (/api/admin, /api/voicelab): an
 * x-agent-admin request is verified once, here, and — if the key carries
 * admin:all — stamped on req.agentAdmin so every existing gate (requireAdmin,
 * requireDashboardUser, requireAdminOrAgent) admits it as an attributed admin.
 * A request with no header passes through untouched; one that fails verification
 * is answered here and never falls back to another door. The verified agent id
 * becomes x-agent-id so the content-edit gate records it, and every call's
 * outcome is logged with the identity.
 */
function agentFrontDoor(verifier, { prefixes, logger = console }) {
  return function frontDoor(req, res, next) {
    if (!req.headers[HEADER]) return next();
    const p = req.path || '';
    if (!prefixes.some((x) => p === x || p.startsWith(x + '/'))) return next();
    const r = verifier.check(req, null);
    if (!r.ok) return res.status(r.status).json({ error: r.error, code: 'AGENT_IDENTITY_REFUSED' });
    req.agentAdmin = r;
    req.headers['x-agent-id'] = r.agent;
    res.setHeader('x-agent-admin-by', r.agent);
    res.on('finish', () => logger.info?.(`[AgentAdmin] ${r.agent} ${req.method} ${req.originalUrl} -> ${res.statusCode}`));
    next();
  };
}

/**
 * Wrap a route's normal admin gate: an agent attempt is judged here, anything
 * else falls through to `requireAdmin` untouched.
 */
function adminOrAgent(verifier, requireAdmin) {
  return async function gate(req, res, scope) {
    // Already judged by the front-door middleware: use that verdict, never a
    // second check (the signature is single-use).
    if (req.agentAdmin) {
      if (!keyHasScope(req.agentAdmin.scopes, scope)) { res.status(403).json({ error: `the agent key does not carry scope ${scope}`, code: 'AGENT_IDENTITY_REFUSED' }); return null; }
      return req.agentAdmin.user;
    }
    const r = verifier.check(req, scope);
    if (!r) return requireAdmin(req, res);
    if (!r.ok) { res.status(r.status).json({ error: r.error, code: 'AGENT_IDENTITY_REFUSED' }); return null; }
    req.agentAdmin = r;
    return r.user;
  };
}

module.exports = { SCOPES, HEADER, signHeader, createAgentAdminVerifier, adminOrAgent, agentFrontDoor, keyHasScope, agentFromRequest, loadKey, bodyDigest };
