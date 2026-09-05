// services/shared/content-write-surfaces.cjs
//
// EVERY SURFACE THAT WRITES COURSE CONTENT, in one list (Tom's ruling,
// 2026-09-01: cover them all in one pass, don't retrofit surface by surface).
//
// This is not documentation — it is the input to the identity gate. A route
// listed here cannot run without a resolved editor identity, and a route that
// writes course_seeds / course_legos / course_practice_phrases without being
// listed here is caught by services/shared/content-write-surfaces.test.cjs,
// which re-derives the list from the route sources and fails on a mismatch.
//
// `operation` is what goes in content_edit_events.operation. `service` names the
// process, so the log distinguishes the same-looking path on 3470 from 3471.

// Course-code shape, e.g. spa_for_eng / eng_for_jpn / fra_ca_for_eng. ONE
// grammar, shared with the proxy course-scope gate — a private copy here filed
// every suffixed course's edit events as 'unknown'.
const { COURSE_CODE_RE } = require('./course-code-grammar.cjs');

// ─── course-builder-api (port 3471) ───────────────────────────────────────
const COURSE_BUILDER = [
  // The seed editor — the surface the ruling came from.
  { method: 'POST',   path: '/api/course/:courseCode/edit-cascade',        operation: 'seed-retranslate' },
  { method: 'POST',   path: '/api/course/:courseCode/approve-seeds',       operation: 'approve' },
  { method: 'POST',   path: '/api/course/:courseCode/translate',           operation: 'translate' },
  { method: 'POST',   path: '/api/course/:courseCode/reset-translations',  operation: 'reset-translations' },
  { method: 'PATCH',  path: '/api/seed/:courseCode/:seedNumber',           operation: 'seed-update' },

  // Decomposition submit — the agent build path.
  { method: 'POST',   path: '/api/seed/complete',                          operation: 'decomposition-submit' },
  { method: 'POST',   path: '/api/lego',                                   operation: 'lego-submit' },
  { method: 'POST',   path: '/api/batch',                                  operation: 'batch-submit' },
  { method: 'POST',   path: '/api/v2/decompose/finalize/:courseCode',      operation: 'decomposition-finalize' },
  { method: 'POST',   path: '/api/v2/phrases/:courseCode',                 operation: 'phrases-write' },
  { method: 'POST',   path: '/api/course/:code/finalize',                  operation: 'draft-finalize' },
  { method: 'POST',   path: '/api/course/:courseCode/components/backfill', operation: 'component-backfill' },

  // Build-lane mutations that destroy or re-approve content.
  { method: 'POST',   path: '/api/build/rebuild/:courseCode',              operation: 'rebuild-wipe' },
  { method: 'POST',   path: '/api/build/redo/:courseCode',                 operation: 'redo-wipe' },
  { method: 'POST',   path: '/api/build/redo-undo/:courseCode',            operation: 'redo-undo' },
  { method: 'POST',   path: '/api/build/mass-approve/:courseCode',         operation: 'approve' },
  { method: 'POST',   path: '/api/build/set-flags/:courseCode',            operation: 'flag' },
  { method: 'POST',   path: '/api/build/clear-flags/:courseCode',          operation: 'unflag' },
  { method: 'POST',   path: '/api/build/backfill-submit/:courseCode',      operation: 'backfill-submit' },

  // QA surfaces that edit or delete phrases.
  { method: 'PATCH',  path: '/api/phrases/:id',                            operation: 'phrase-edit' },
  { method: 'POST',   path: '/api/qa/flag',                                operation: 'flag' },
  { method: 'POST',   path: '/api/qa/bulk-flag',                           operation: 'flag' },
  { method: 'POST',   path: '/api/qa/mark-checked',                        operation: 'qa-mark-checked' },
  { method: 'POST',   path: '/api/qa/bulk-mark-checked',                   operation: 'qa-mark-checked' },
  { method: 'POST',   path: '/api/qa/reset/:courseCode',                   operation: 'qa-reset' },
  { method: 'POST',   path: '/api/qa/approve/:courseCode',                 operation: 'approve' },
  { method: 'DELETE', path: '/api/qa/phrase/:phraseId',                    operation: 'phrase-delete' },
  { method: 'DELETE', path: '/api/qa/flagged-phrases/:courseCode',         operation: 'phrase-delete' },

  // Whole-course destruction.
  { method: 'POST',   path: '/api/course/:courseCode/wipe',                operation: 'course-wipe' },
  { method: 'DELETE', path: '/api/course/:courseCode',                     operation: 'course-delete' },

  // Agent chat that can rewrite a seed's target text.
  { method: 'POST',   path: '/api/orchestrator/chat/:courseCode',          operation: 'orchestrator-seed-edit' },
].map(r => ({ ...r, service: 'course-builder' }));

// RECORD-ONLY surfaces. These are GET routes that write course content as a
// side effect — `initializeCourseSeeds` lays down a course's canonical seed
// skeleton the first time anyone opens the translation view or the seed editor
// on an uninitialised course. Found by the 2026-09-01 worker sweep.
//
// They are gated differently on purpose: the gate NEVER refuses them. Refusing a
// GET would break the editor UI for a caller whose only sin is reading, and
// first-fill of the canonical skeleton is initialisation, not an edit. What the
// gate does do is capture the identity that already exists — these routes sit
// behind production-api's course-scope gate, so a remote caller is already a
// resolved dashboard user — and record it, so the skeleton is attributed to
// whoever caused it to exist rather than to nobody.
const RECORD_ONLY = [
  { method: 'GET', path: '/api/course/:courseCode/translate',    operation: 'seed-initialise' },
  { method: 'GET', path: '/api/course/:courseCode/seed-editor',  operation: 'seed-initialise' },
].map(r => ({ ...r, service: 'course-builder', recordOnly: true }));

// ─── production-api (port 3470) — direct content writes, not proxied ──────
const PRODUCTION_API = [
  { method: 'PATCH',  path: '/api/production/:courseCode/phrase/:phraseId',   operation: 'phrase-edit' },
  { method: 'DELETE', path: '/api/production/:courseCode/phrases/:phraseId',  operation: 'phrase-delete' },
  { method: 'POST',   path: '/api/production/:courseCode/phrases/batch-delete', operation: 'phrase-delete' },
  { method: 'POST',   path: '/api/admin/decomposition-backfill',             operation: 'decomposition-backfill' },
].map(r => ({ ...r, service: 'production-api' }));

const SURFACES = [...COURSE_BUILDER, ...RECORD_ONLY, ...PRODUCTION_API];

/** Turn '/api/course/:courseCode/edit-cascade' into a matcher. */
function toMatcher(route) {
  const parts = route.path.split('/').filter(Boolean);
  return {
    ...route,
    match(method, pathname) {
      if (method.toUpperCase() !== route.method) return false;
      const got = pathname.split('?')[0].split('/').filter(Boolean);
      if (got.length !== parts.length) return false;
      const params = {};
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith(':')) { params[parts[i].slice(1)] = decodeURIComponent(got[i]); continue; }
        if (parts[i] !== got[i]) return false;
      }
      this.params = params;
      return true;
    },
  };
}

const MATCHERS = SURFACES.map(toMatcher);

/** @returns {{surface: Object, params: Object}|null} */
function findSurface(method, pathname, service = null) {
  for (const m of MATCHERS) {
    if (service && m.service !== service) continue;
    if (m.match(method, pathname)) return { surface: m, params: { ...m.params } };
  }
  return null;
}

/** Best-effort course code: a route param, then any path segment, then the body. */
function courseCodeFrom(params, pathname, body) {
  for (const key of ['courseCode', 'code', 'course_code']) {
    if (params?.[key] && COURSE_CODE_RE.test(params[key])) return params[key];
  }
  for (const seg of (pathname || '').split('/')) {
    if (COURSE_CODE_RE.test(seg)) return seg;
  }
  const fromBody = body && (body.course_code || body.courseCode);
  if (typeof fromBody === 'string' && COURSE_CODE_RE.test(fromBody)) return fromBody;
  return null;
}

module.exports = { SURFACES, COURSE_BUILDER, RECORD_ONLY, PRODUCTION_API, findSurface, courseCodeFrom, COURSE_CODE_RE };
