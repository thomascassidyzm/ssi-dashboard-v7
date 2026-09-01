// services/shared/content-edit-gate.cjs
//
// The one middleware that makes "who made this edit" structural
// (Tom's ruling, 2026-09-01).
//
// Mounted app-level on course-builder-api and production-api. For every request
// it asks content-write-surfaces.cjs "is this a surface that writes course
// content?". If it isn't, it does nothing. If it is:
//
//   1. It resolves an editor identity (verified Supabase JWT, or a declared
//      agent/service over trusted loopback) and REFUSES THE REQUEST with 401 if
//      it cannot. The handler never runs; nothing reaches the database.
//   2. It hands the handler req.contentEdit, whose .record() writes the
//      content_edit_events row and returns the event id to stamp onto the rows
//      being written (last_edit_event_id), riding along in the payload the
//      handler was already sending.
//   3. If a handler returns 2xx without having called .record(), the gate
//      records a default event on response finish. Coverage is not left to a
//      handler remembering.
//
// TRANSITION MODE (CONTENT_EDIT_IDENTITY_MODE)
//   'enforce' — no identity, no write. Full stop.
//   'observe' (default for the first deploy) — a SAME-HOST LOOPBACK caller that
//      declares nothing is recorded as the named actor 'undeclared-loopback'
//      instead of being refused, so an in-flight build or an unrevised pipeline
//      script cannot be broken by this deploy (Tom's constraint: don't break a
//      write path that hasn't been updated yet).
//      This is NOT a blank-identity loophole for the case the ruling is about:
//      a browser request — internal colleague or community member — never
//      arrives on bare loopback (ngrok / tailscale / nginx all set
//      x-forwarded-for or a non-loopback peer), so it is refused in BOTH modes.
//      Census before flipping to enforce:
//        SELECT surface, count(*) FROM content_edit_events
//        WHERE actor_id = 'undeclared-loopback' GROUP BY 1 ORDER BY 2 DESC;

const { resolveEditorIdentity, isTrustedLoopback } = require('./editor-identity.cjs');
const { recordContentEdit } = require('./content-edit-log.cjs');
const { findSurface, courseCodeFrom } = require('./content-write-surfaces.cjs');

const UNDECLARED = Object.freeze({
  kind: 'service',
  id: 'undeclared-loopback',
  label: 'undeclared same-host caller',
  email: null,
  role: null,
  verified: false,
});

function mode() {
  return process.env.CONTENT_EDIT_IDENTITY_MODE === 'enforce' ? 'enforce' : 'observe';
}

function contentEditGate({ supabase, service, logger = console }) {
  if (!supabase) throw new Error('contentEditGate needs a supabase client');
  if (!service) throw new Error('contentEditGate needs a service name');

  return async function gate(req, res, next) {
    let hit;
    try {
      hit = findSurface(req.method, req.path || req.url, service);
    } catch (err) {
      return next(err);
    }
    if (!hit) return next();

    const { surface, params } = hit;

    let identity;
    try {
      identity = await resolveEditorIdentity(req, supabase);
    } catch (err) {
      logger.error?.('[content-edit-gate] identity resolution failed:', err.message);
      identity = null;
    }

    if (!identity) {
      if (mode() === 'observe' && isTrustedLoopback(req)) {
        identity = { ...UNDECLARED, label: `undeclared same-host caller (${req.headers['user-agent'] || 'no user-agent'})` };
        logger.warn?.(`[content-edit-gate] UNDECLARED loopback write: ${req.method} ${req.path} — declare x-agent-id / x-agent-role / x-service-name`);
      } else {
        logger.warn?.(`[content-edit-gate] REFUSED ${req.method} ${req.path} — no editor identity`);
        return res.status(401).json({
          error: 'This request writes course content and carries no editor identity. '
            + 'Send a Supabase session token (Authorization: Bearer …), or, from a same-host agent '
            + 'or script, declare yourself with x-agent-id / x-agent-role / x-service-name.',
          code: 'EDITOR_IDENTITY_REQUIRED',
          surface: `${surface.service}:${surface.method} ${surface.path}`,
        });
      }
    }

    req.editorIdentity = identity;

    const courseCode = courseCodeFrom(params, req.path || req.url, req.body) || 'unknown';
    const surfaceLabel = `${surface.service}:${surface.method} ${surface.path}`;

    // An internal hop (edit-cascade re-posting to /seed/complete, say) is part of
    // ONE action, not two. A same-host caller may therefore carry the event it
    // already recorded and have this request join it instead of opening a second
    // one. Only over trusted loopback, and only a well-formed uuid: a remote
    // caller must never get to point an edit at somebody else's event.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const inherited = (req.headers['x-content-edit-event'] || '').toString().trim();
    let eventId = (isTrustedLoopback(req) && UUID_RE.test(inherited)) ? inherited : null;
    let recording = null;

    async function record({ scope = {}, detail = {}, operation } = {}) {
      if (eventId) return eventId;              // idempotent — call it freely
      if (recording) return recording;
      recording = recordContentEdit(supabase, {
        identity,
        courseCode: courseCodeFrom(params, req.path || req.url, req.body) || courseCode,
        surface: surfaceLabel,
        operation: operation || surface.operation,
        scope,
        detail,
        requestId: req.headers['x-request-id'] || null,
      }).then(id => { eventId = id; return id; })
        .catch(err => { recording = null; throw err; });
      return recording;
    }

    req.contentEdit = {
      surface: surfaceLabel,
      operation: surface.operation,
      courseCode,
      identity,
      record,
      get eventId() { return eventId; },
    };

    // Safety net: a 2xx from a handler that never recorded still gets an event.
    res.on('finish', () => {
      if (eventId || recording) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      record({ scope: { recorded_by: 'gate-default' } }).catch(err =>
        logger.error?.(`[content-edit-gate] default event failed for ${surfaceLabel}: ${err.message}`));
    });

    next();
  };
}

module.exports = { contentEditGate, UNDECLARED };
