// services/shared/content-edit-log.cjs
//
// The choke point for "this save happened, and this is who made it"
// (Tom's ruling, 2026-09-01).
//
// One row per SAVE OPERATION, not per content row: a 400-phrase decomposition
// submit is one event naming its scope, so answering "who proofread these 423
// seeds" costs 423 rows, not 423 × every phrase underneath them.
//
// The teeth are in three places and they reinforce each other:
//   1. recordContentEdit() throws on a missing or blank identity, before it
//      builds a row. There is no argument shape that produces an anonymous edit.
//   2. content_edit_events.actor_id / actor_label / actor_kind / actor_verified
//      are NOT NULL with non-blank CHECKs, so even a bug that got past (1) is
//      refused by Postgres.
//   3. stampEditEvent() returns the event id for the route to ride along in the
//      update/insert payload it was already sending, so the row itself points
//      back at the identity at no extra write.
//
// NOT covered, and deliberately so: a NULL last_edit_event_id on a content row
// means "no attribution was captured", and that is all it ever means. Nothing in
// this module backfills, guesses, or infers who made a past edit.

const { EditorIdentityRequired } = require('./editor-identity.cjs');

function assertIdentity(identity) {
  const ok = identity
    && typeof identity === 'object'
    && ['human', 'agent', 'service'].includes(identity.kind)
    && String(identity.id || '').trim() !== ''
    && String(identity.label || '').trim() !== ''
    && typeof identity.verified === 'boolean';
  if (!ok) {
    throw new EditorIdentityRequired(
      'recordContentEdit() refused: a content edit needs a resolved editor identity '
      + '{ kind, id, label, verified }. Get one from requireEditorIdentity(req, supabase) '
      + 'or serviceIdentity("<name>").'
    );
  }
}

/**
 * Write one audit event and return its id.
 *
 * @param {Object} supabase          service-role client
 * @param {Object} args
 * @param {Object} args.identity     from requireEditorIdentity / serviceIdentity
 * @param {string} args.courseCode
 * @param {string} args.surface      'course-builder:POST /course/:courseCode/edit-cascade'
 * @param {string} args.operation    insert | update | delete | approve | flag | …
 * @param {Object} [args.scope]      { seed_numbers, lego_ids, phrase_ids, rows }
 * @param {Object} [args.detail]     small before/after payload
 * @param {string} [args.requestId]
 * @returns {Promise<string>} event id
 */
async function recordContentEdit(supabase, {
  identity, courseCode, surface, operation, scope = {}, detail = {}, requestId = null,
} = {}) {
  assertIdentity(identity);
  if (!courseCode) throw new Error('recordContentEdit() needs a courseCode');
  if (!surface) throw new Error('recordContentEdit() needs a surface');
  if (!operation) throw new Error('recordContentEdit() needs an operation');

  const { data, error } = await supabase
    .from('content_edit_events')
    .insert({
      course_code: courseCode,
      surface,
      operation,
      actor_kind: identity.kind,
      actor_id: String(identity.id).trim(),
      actor_label: String(identity.label).trim(),
      actor_verified: identity.verified,
      actor_role: identity.role || null,
      scope,
      detail,
      request_id: requestId,
    })
    .select('id')
    .single();

  if (error) throw new Error(`content_edit_events insert failed: ${error.message}`);
  return data.id;
}

/**
 * Record the event and hand back the id to stamp onto the rows being written.
 * Callers add `last_edit_event_id: eventId` to the update/insert payload they
 * were already sending — no second round trip.
 */
async function stampEditEvent(supabase, args) {
  return recordContentEdit(supabase, args);
}

/**
 * Convenience for a route handler: resolve identity from req (already done by
 * the gate), record, return the id. Throws if the gate was not mounted, which is
 * the failure we want — a surface that forgot the gate cannot save.
 */
async function recordFromRequest(supabase, req, { courseCode, surface, operation, scope, detail }) {
  return recordContentEdit(supabase, {
    identity: req.editorIdentity,
    courseCode,
    surface,
    operation,
    scope,
    detail,
    requestId: req.headers?.['x-request-id'] || null,
  });
}

module.exports = { recordContentEdit, stampEditEvent, recordFromRequest, assertIdentity };
