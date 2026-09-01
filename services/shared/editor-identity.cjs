// services/shared/editor-identity.cjs
//
// WHO IS SAVING THIS EDIT — the one resolver, used by every surface that writes
// course content (Tom's ruling, 2026-09-01).
//
// The rule it enforces: an editor identity is never a form field the caller
// fills in. It is DERIVED — from a Supabase JWT this service verifies itself, or
// from a declared agent/service identity arriving over trusted loopback. A
// browser caller cannot assert who they are; they can only present a token.
//
// Three actor kinds, and the difference between them is recorded, never blurred:
//
//   human   — a verified Supabase session. actor_verified = true. This is the
//             only kind a community editor can ever produce, because the
//             browser's anon key has SELECT-only RLS on the content tables:
//             every write they can reach goes through an HTTP surface that runs
//             this resolver first.
//   agent   — a build/QA agent on the host, declaring itself via x-agent-id /
//             x-agent-role over loopback. actor_verified = false: loopback is
//             trusted transport, not proof of identity, and the log says so.
//   service — a named pipeline or tools/ script, declaring itself via
//             x-service-name over loopback. actor_verified = false.
//
// Resolution order is deliberate: a JWT ALWAYS wins. An agent header on a
// request that also carries a valid human token records the human, because the
// human is the one who pressed the button.

const { resolvePoptyIdentity } = require('./popty-identity.cjs');

class EditorIdentityRequired extends Error {
  constructor(message) {
    super(message);
    this.name = 'EditorIdentityRequired';
    this.status = 401;
    this.code = 'EDITOR_IDENTITY_REQUIRED';
  }
}

// Loopback with no forwarding headers = a same-host call from our own service
// mesh or an agent spawned on this box. ngrok/LAN traffic always carries
// x-forwarded-for or a non-loopback peer, so it cannot claim this.
// (Same test as production-api's isLoopbackDirectRequest — kept here so
// course-builder does not have to import a 13k-line service to ask it.)
function isTrustedLoopback(req) {
  const addr = req.socket?.remoteAddress || '';
  const loopback = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  return loopback && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip'];
}

function bearerToken(req) {
  const h = req.headers?.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

// Verified-identity cache. Writes are rare compared with reads, but a
// decomposition submit can be a burst of calls on one token and there is no
// reason to ask Supabase auth each time.
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX = 500;
const identityCache = new Map(); // token -> { identity, expires }

function cacheGet(token) {
  const hit = identityCache.get(token);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) { identityCache.delete(token); return undefined; }
  return hit.identity;
}

function cacheSet(token, identity) {
  if (identityCache.size >= CACHE_MAX) {
    identityCache.delete(identityCache.keys().next().value);
  }
  identityCache.set(token, { identity, expires: Date.now() + CACHE_TTL_MS });
}

function _clearCache() { identityCache.clear(); }

// Verify a Supabase JWT and resolve it to a Popty identity via the SAME
// authority order production-api uses (dashboard_users first, learners
// fallback) — one rule for who you are, wherever you knocked.
async function resolveHuman(supabase, token) {
  const cached = cacheGet(token);
  if (cached !== undefined) return cached;

  let identity = null;
  try {
    const { data: { user } = {}, error } = await supabase.auth.getUser(token);
    if (!error && user?.email) {
      const [dashboardRow, learnerRow] = await Promise.all([
        supabase.from('dashboard_users').select('name, email, role, courses, voice_id')
          .eq('email', user.email).maybeSingle().then(({ data }) => data).catch(() => null),
        supabase.from('learners')
          .select('id, user_id, display_name, platform_role, educational_role, dashboard_courses')
          .eq('user_id', user.id).maybeSingle().then(({ data }) => data).catch(() => null),
      ]);
      const popty = resolvePoptyIdentity({ email: user.email, dashboardRow, learnerRow });
      if (popty) {
        identity = {
          kind: 'human',
          id: user.id,
          label: popty.name || user.email,
          email: user.email,
          role: popty.role || null,
          verified: true,
        };
      }
    }
  } catch {
    identity = null; // an unreachable auth service is a refusal, never a pass
  }

  cacheSet(token, identity);
  return identity;
}

function resolveDeclared(req) {
  if (!isTrustedLoopback(req)) return null;

  const agentId = (req.headers['x-agent-id'] || '').toString().trim();
  const agentRole = (req.headers['x-agent-role'] || '').toString().trim();
  if (agentId || agentRole) {
    const id = agentId || `agent:${agentRole}`;
    return {
      kind: 'agent',
      id,
      label: agentRole ? `${agentRole} agent (${id})` : id,
      email: null,
      role: agentRole || null,
      verified: false,
    };
  }

  const service = (req.headers['x-service-name'] || '').toString().trim();
  if (service) {
    return { kind: 'service', id: service, label: service, email: null, role: null, verified: false };
  }

  return null;
}

/**
 * Resolve the editor identity for a content-writing request.
 * @returns {Promise<Object|null>} identity, or null if none could be derived.
 */
async function resolveEditorIdentity(req, supabase) {
  const token = bearerToken(req);
  if (token && supabase) {
    const human = await resolveHuman(supabase, token);
    if (human) return human;
  }
  return resolveDeclared(req);
}

/**
 * Same, but refuses instead of returning null. This is the function content
 * writes call: there is no code path from here to a save with a blank editor.
 * @throws {EditorIdentityRequired}
 */
async function requireEditorIdentity(req, supabase) {
  const identity = await resolveEditorIdentity(req, supabase);
  if (!identity) {
    throw new EditorIdentityRequired(
      'This request writes course content and carries no editor identity. '
      + 'Send a Supabase session token (Authorization: Bearer …), or, from a same-host '
      + 'agent or script, declare yourself with x-agent-id / x-agent-role / x-service-name.'
    );
  }
  return identity;
}

/**
 * Express middleware. Mount on a router that writes course content: it attaches
 * req.editorIdentity or answers 401 before any handler touches the database.
 */
function editorIdentityGate(supabase) {
  return async function gate(req, res, next) {
    try {
      req.editorIdentity = await requireEditorIdentity(req, supabase);
      next();
    } catch (err) {
      if (err instanceof EditorIdentityRequired) {
        return res.status(401).json({ error: err.message, code: err.code });
      }
      next(err);
    }
  };
}

/**
 * A non-HTTP actor: a tools/ sweep, a pipeline service, a migration. Named, not
 * anonymous — "unattributed" is not spellable here, and neither is a blank.
 */
function serviceIdentity(name, { role = null } = {}) {
  const clean = (name || '').toString().trim();
  if (!clean) throw new EditorIdentityRequired('serviceIdentity() needs a name — a content write cannot be anonymous.');
  return { kind: 'service', id: clean, label: clean, email: null, role, verified: false };
}

module.exports = {
  EditorIdentityRequired,
  resolveEditorIdentity,
  requireEditorIdentity,
  editorIdentityGate,
  serviceIdentity,
  isTrustedLoopback,
  _clearCache,
};
