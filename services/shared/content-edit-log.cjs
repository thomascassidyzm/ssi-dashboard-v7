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
  armIntroMirrorAtExit({ identity, courseCode, operation, scope });
  armDebutPracticeAtExit({ identity, courseCode, operation, scope });
  return data.id;
}

// ─── THE INTRO MIRROR RUNS WHEN A SWEEP EXITS (Kai's ruling, 2026-09-28, job #557·I) ──────────
//
// A recurring defect: a tools/ sweep edits a LEGO or component and its introduction (the
// presentation clip that quotes it) is left saying the old words. The rule lives in
// services/shared/intro-mirror.cjs and the command is tools/check-intro-mirror.cjs. This is
// the wiring: the moment a SERVICE identity (serviceIdentity() — the tools/ sweeps; HTTP routes
// carry human/agent identities and are not touched) records an edit naming seeds or LEGOs, ONE
// process 'exit' hook is armed for that course. At exit it runs the check, synchronously, over the
// union of every seed the process named, in --strict mode, and on a mismatch prints the rows and
// sets the exit code to 2 — so a job that broke a mirror fails loudly even after it called
// process.exit(0) itself (an 'exit' listener may still change process.exitCode: probed 2026-09-28).
//
// Why at exit and not here: the event id this function returns is stamped ONTO the rows the
// caller is about to write, so at this moment the edit has not happened yet and there is nothing
// to check. Exit is the first moment the job's whole outcome is on disk.
//
// Opt out with INTRO_MIRROR_AT_EXIT=0 (a job that knowingly leaves an intro for phase8 to author
// says so in its report instead). Never armed under vitest.
const introMirrorScopes = new Map(); // courseCode -> Set(seed_number)
let introMirrorArmed = false;
const SEED_FROM_LEGO = /^S(\d{4})/;
function armIntroMirrorAtExit({ identity, courseCode, operation, scope }) {
  if (process.env.INTRO_MIRROR_AT_EXIT === '0' || process.env.VITEST) return;
  if (!identity || identity.kind !== 'service') return;
  if (/unapprove|approve|audio|link|flag/i.test(String(operation))) return;
  const seeds = new Set((scope?.seed_numbers || []).map(Number).filter(Number.isFinite));
  for (const id of (scope?.lego_ids || [])) { const m = SEED_FROM_LEGO.exec(String(id)); if (m) seeds.add(Number(m[1])); }
  for (const id of (scope?.phrase_ids || [])) { const m = /S(\d{4})L\d{2}C\d{2}$/.exec(String(id)); if (m) seeds.add(Number(m[1])); }
  if (!seeds.size) return;
  if (!introMirrorScopes.has(courseCode)) introMirrorScopes.set(courseCode, new Set());
  for (const s of seeds) introMirrorScopes.get(courseCode).add(s);
  if (introMirrorArmed) return;
  introMirrorArmed = true;
  process.on('exit', runIntroMirrorAtExit);
}
function runIntroMirrorAtExit() {
  const { spawnSync } = require('child_process');
  const path = require('path');
  const script = process.env.INTRO_MIRROR_CHECK_SCRIPT || path.join(__dirname, '..', '..', 'tools', 'check-intro-mirror.cjs');
  for (const [courseCode, seeds] of introMirrorScopes) {
    const list = [...seeds].sort((a, b) => a - b).join(',');
    const r = spawnSync(process.execPath, [script, courseCode, '--seeds', list, '--strict'], { encoding: 'utf8', timeout: 120000 });
    if (r.status === 0) {
      process.stderr.write(`[intro-mirror] ${courseCode} seeds ${list}: every intro mirrors its text\n`);
      continue;
    }
    process.stderr.write(`\n[intro-mirror] ✗✗✗ THIS JOB LEFT AN INTRODUCTION THAT DOES NOT MIRROR ITS TEXT (${courseCode}, seeds ${list}) — exit code forced to 2.\n`);
    process.stderr.write(`Fix it before reporting: re-author the line (the LEGO's known text, quoted), link a clip that speaks it, or say in the report that phase8 will author it.\n`);
    process.stderr.write(String(r.stdout || '') + String(r.stderr || '') + '\n');
    process.exitCode = 2;
  }
}

// ─── EVERY DEBUT KEEPS ITS PRACTICE: CHECKED WHEN A SWEEP EXITS (Tom, 2026-09-30) ─────────────
//
// The defect this catches: job #887·I (2026-09-29) MOVED all five USE phrases of ita_for_eng
// S0190L01 forward to S0202L03 because they used "una domanda" before it was taught. The move was
// right; it left the debut "do you mind if I ask you" with no USE phrase at all, so it never
// reached spaced repetition, and nothing said so. The sweep guarded its DELETES ("keeps at least
// 6") but not the source basket of its MOVES — a guard each sweep has to remember is not a guard.
//
// So the rule is wired here, once, for every tools/ sweep: the moment a SERVICE identity records an
// edit naming seeds, LEGOs or phrases, ONE exit hook is armed for that course; at exit it runs
// tools/check-debut-practice.cjs --strict over every seed the process named, and if any debut LEGO
// there is left unpractised or without a USE phrase it prints them and forces exit code 2 — the
// same shape as the intro mirror above. The sweep must then regenerate the basket
// (tools/course-optimization/regenerate-debut-practice.cjs) or report the gap. There is no opt-out:
// "must regenerate or flag" is the ruling, and a failed exit IS the flag. HTTP routes carry
// human/agent identities and are covered by the release gate (production-api status route) and
// the standing checker instead. Never armed under vitest.
const debutScopes = new Map(); // courseCode -> Set(seed_number)
let debutArmed = false;
const SEED_FROM_ANY_ID = /S(\d{4})L\d{2}/;
function armDebutPracticeAtExit({ identity, courseCode, operation, scope }) {
  if (process.env.VITEST) return;
  if (!identity || identity.kind !== 'service') return;
  if (/unapprove|approve|audio|link|flag/i.test(String(operation))) return;
  const seeds = new Set((scope?.seed_numbers || []).map(Number).filter(Number.isFinite));
  for (const id of [...(scope?.lego_ids || []), ...(scope?.phrase_ids || [])]) {
    const m = SEED_FROM_ANY_ID.exec(String(id)); if (m) seeds.add(Number(m[1]));
  }
  if (!seeds.size) return;
  if (!debutScopes.has(courseCode)) debutScopes.set(courseCode, new Set());
  for (const s of seeds) debutScopes.get(courseCode).add(s);
  if (debutArmed) return;
  debutArmed = true;
  process.on('exit', runDebutPracticeAtExit);
}
function runDebutPracticeAtExit() {
  const { spawnSync } = require('child_process');
  const path = require('path');
  const script = process.env.DEBUT_PRACTICE_CHECK_SCRIPT || path.join(__dirname, '..', '..', 'tools', 'check-debut-practice.cjs');
  for (const [courseCode, seeds] of debutScopes) {
    const list = [...seeds].sort((a, b) => a - b).join(',');
    const r = spawnSync(process.execPath, [script, courseCode, '--seeds', list, '--strict'], { encoding: 'utf8', timeout: 120000 });
    if (r.status === 0) {
      process.stderr.write(`[debut-practice] ${courseCode} seeds ${list}: every debut LEGO still has practice\n`);
      continue;
    }
    process.stderr.write(`\n[debut-practice] ✗✗✗ THIS JOB LEFT A DEBUT LEGO WITHOUT PRACTICE (${courseCode}, seeds ${list}) — exit code forced to 2.\n`);
    process.stderr.write(`Regenerate the basket (node tools/course-optimization/regenerate-debut-practice.cjs ${courseCode} --seeds ${list}) or name the gap in the report.\n`);
    process.stderr.write(String(r.stdout || '') + String(r.stderr || '') + '\n');
    process.exitCode = 2;
  }
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

module.exports = { recordContentEdit, stampEditEvent, recordFromRequest, assertIdentity, armIntroMirrorAtExit, armDebutPracticeAtExit };
