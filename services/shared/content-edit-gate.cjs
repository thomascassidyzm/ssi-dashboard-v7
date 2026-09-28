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
//   4. If the surface is flagged `legos: true`, it asks — on ANY response, 2xx
//      or not, because those handlers commit legos before they can still fail —
//      for a course_round_index refresh — the round map the learner app
//      walks — so a course cannot ship with a map shorter than its own content
//      (Tom's ruling, 2026-09-20). It fires on res 'close' as well as 'finish',
//      once, so a client that hangs up mid-response still refreshes the map
//      its write already changed. This lives HERE, in the one middleware every
//      content write already passes through, precisely so it cannot be
//      forgotten by the next route somebody adds; the alternative, a call at
//      the bottom of each handler, is the shape that let afr_for_eng sit nine
//      rounds short for weeks. See services/shared/round-index-refresh.cjs.
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
// Required as a MODULE OBJECT, not a destructured binding: the call below is
// dispatched through roundIndex.requestRoundIndexRefresh at fire time, which is
// the seam content-edit-gate.test.cjs swaps to count refresh requests. A
// destructured copy cannot be swapped, and the once-guard could then only be
// asserted by proxy.
const roundIndex = require('./round-index-refresh.cjs');

const UNDECLARED = Object.freeze({
  kind: 'service',
  id: 'undeclared-loopback',
  label: 'undeclared same-host caller',
  email: null,
  role: null,
  verified: false,
});

// WHO MAY SHAPE A COURSE'S TEXT (Tom, 2026-09-25). A cast recorder — a login
// whose dashboard_users row is role 'recorder', which is exactly what saving a
// pod cast provisions for the artist's email — may record, and may correct the
// target words of their own POD lines through the booth or the pods door. They
// may never edit a seed, a LEGO or a practice phrase: "seeds and legos and
// phrases are immutable. The sentences they might say can be flexed in the
// pods." Every surface on the manifest writes seeds, LEGOs or phrases, so a
// recorder is refused here, on all of them, before any handler runs.
//
// And a human writing to a course needs a GRANT on that course (admin, '*', or
// the course in their list). Casting never counts: it admits a person to a
// course's pages, not to its text, and production-api's course gate admits by
// casting first — so without this check an editor of one course who is also
// cast on another could rewrite the second one's phrases.
function mayShapeCourse(identity, courseCode) {
  if (!identity || identity.kind !== 'human') return { ok: true }
  if (identity.role === 'recorder') {
    return {
      ok: false,
      code: 'RECORDER_CANNOT_EDIT_CONTENT',
      error: 'A recording voice cannot change a course\'s sentences, LEGOs or phrases. '
        + 'Record the lines as they stand; the words of your own pod lines can be corrected from your booth.',
    }
  }
  if (!courseCode || courseCode === 'unknown' || identity.role === 'admin') return { ok: true }
  const courses = identity.courses
  const granted = courses === '*' || (Array.isArray(courses) && courses.includes(courseCode))
  if (granted) return { ok: true }
  return {
    ok: false,
    code: 'NO_GRANT_ON_COURSE',
    error: `${identity.email || 'This login'} is not an editor of ${courseCode}, so it cannot change that course's text.`,
  }
}

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
      } else if (surface.recordOnly) {
        // A record-only surface never refuses. With no identity to record there
        // is nothing honest to write, so it passes through unattributed rather
        // than inventing an actor — and the row's NULL says exactly that.
        return next();
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

    const courseCode = courseCodeFrom(params, req.path || req.url, req.body) || 'unknown';

    // A record-only surface is a READ; it never refuses (see above).
    if (!surface.recordOnly) {
      const may = mayShapeCourse(identity, courseCode);
      if (!may.ok) {
        logger.warn?.(`[content-edit-gate] REFUSED ${req.method} ${req.path} — ${identity.email || identity.id}: ${may.code}`);
        return res.status(403).json({ error: may.error, code: may.code, surface: `${surface.service}:${surface.method} ${surface.path}` });
      }
    }

    req.editorIdentity = identity;
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

    // THE ROUND MAP FIRES ON 'close', NOT ON 'finish' (2026-09-20).
    // 'finish' means "the response was fully written to the socket". A client
    // that hangs up mid-response — a dashboard tab closed during a long seed
    // submission, a curl interrupted, a proxy timing out — never emits it, and
    // a cross-family probe of exactly that case saw ZERO refreshes while the
    // lego write had already COMMITTED: the silent stale map again, reached by
    // the disconnect path instead of the error path.
    // 'close' always emits, for every response, and always AFTER 'finish' when
    // there was one. Registering on both with a once-guard keeps the fast,
    // ordinary path unchanged and covers the dropped one, exactly once either
    // way — a second refresh is only coalesced, not free.
    let refreshRequested = false;
    function requestRefreshOnce() {
      if (refreshRequested) return;
      refreshRequested = true;
      // Fire-and-log: the response has already gone, so the ~0.8s refresh costs
      // the caller nothing, and the helper coalesces a burst of seed
      // submissions into one run. It never rejects, so this cannot turn a
      // successful write into a failure.
      //
      // ON ANY RESPONSE, NOT ONLY A 2xx. The lego-writing handlers commit the
      // lego row and THEN write its phrases (seed-complete.cjs /api/lego,
      // /api/batch, /api/seed/complete all have that shape), so a phrase
      // failure answers 500 — or a ZUT check answers 400 — with legos already
      // in the table. Gating the refresh on 2xx skipped exactly those cases and
      // left the map short of content that had landed: the afr_for_eng failure
      // again, reached by the error path. The alternative, a
      // req.contentEdit.legosWritten signal set after each successful lego
      // upsert, means threading a flag through seven route files and every
      // lib/ helper that writes legos (redo-snapshot's restoreSnapshot has no
      // req at all) — and it drifts the moment somebody adds the eighth. A
      // wasted refresh on a failed write costs one coalesced ~0.8s statement
      // off the caller's path; a missed one costs a silently short course.
      roundIndex.requestRoundIndexRefresh(
        courseCodeFrom(params, req.path || req.url, req.body) || courseCode,
        { reason: surfaceLabel },
      ).catch(() => {});
    }
    if (surface.legos) {
      res.on('finish', requestRefreshOnce);
      res.on('close', requestRefreshOnce);
    }

    // Safety net: a 2xx from a handler that never recorded still gets an event.
    // This one stays on 'finish' alone: it asks about res.statusCode, which
    // only means anything once a response was actually sent.
    res.on('finish', () => {
      if (eventId || recording) return;
      // A record-only GET logs only when its handler actually initialised
      // something. Without this, every page load would file an edit.
      if (surface.recordOnly) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      record({ scope: { recorded_by: 'gate-default' } }).catch(err =>
        logger.error?.(`[content-edit-gate] default event failed for ${surfaceLabel}: ${err.message}`));
    });

    next();
  };
}

module.exports = { contentEditGate, mayShapeCourse, UNDECLARED };
