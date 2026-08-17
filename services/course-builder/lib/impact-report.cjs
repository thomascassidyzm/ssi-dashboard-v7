/**
 * impact-report — hand the edit-impact verdict back to whoever submitted the edit.
 *
 * PART B of the edit-impact-check work. `tools/edit-impact-check.cjs` predicts what
 * a content edit will break; this module is the thin, deliberately paranoid adapter
 * that lets an HTTP submit path attach that prediction to its own response.
 *
 * KAI'S RULING, 2026-08-17 — the verdict is RETURNED, NEVER ENFORCED.
 * Proposal C (a blocking gate) was rejected. So, as invariants:
 *
 *   1. an edit that earns `reconsider` is still applied, exactly as it is today;
 *   2. if the reporter throws, hangs, or the DB is slow, the submit still succeeds —
 *      every failure mode here resolves to an `impact` block saying so, and NOTHING
 *      in this module is allowed to reject or throw into a route handler;
 *   3. the verdict goes under a NEW response key (`impact`). No existing response
 *      field is changed or removed — agents and the dashboard already parse these.
 *
 * The check runs against the PRE-EDIT state, before the write, because that is what
 * the tool is: a prediction of the effect of a PROPOSED edit. Run after the write and
 * the "old text" it diffs against is the new text, and every finding collapses to
 * `proceed` — a hollow pass, which is worse than no check at all.
 *
 * Latency: the check is a handful of course-wide queries, ~2-9s for one seed edit on
 * a 668-seed course. That is real, so callers can opt out with `?impact=0` and the
 * batch/build-hot paths default to opt-IN (`?impact=1`) rather than paying it 300
 * times over a build.
 */

// Bounded, and overridable per machine. The timeout is the load-bearing one: it is
// what turns "the DB is slow" into a late-but-successful submit rather than a hang.
const DEFAULT_TIMEOUT_MS = Number(process.env.EDIT_IMPACT_TIMEOUT_MS || 20000);
const DEFAULT_MAX_EDITS = Number(process.env.EDIT_IMPACT_MAX_EDITS || 10);

const ADVISORY_NOTE =
  'Advisory only. The edit was applied regardless of this verdict — nothing here blocked, '
  + 'or could block, the write (Kai\'s ruling, 2026-08-17).';

/**
 * Lazily resolve `checkEdits`. Requiring the tool costs a `pg` load and touches
 * .env.psql only when actually called, and a require failure must degrade to
 * "unavailable" rather than taking the service down at boot.
 */
function defaultCheckEdits() {
  // eslint-disable-next-line global-require
  const { checkEdits } = require('../../../tools/edit-impact-check.cjs');
  return checkEdits;
}

/**
 * Did the caller ask for the check?
 *
 *   ?impact=0 / false / no / off   → never run it
 *   ?impact=1 / true / yes / on    → run it
 *   (absent)                       → `defaultOn`, which is per-endpoint policy
 *
 * Also accepts `impact` in the JSON body, for callers that cannot easily add a
 * query param.
 */
function impactRequested(req, defaultOn) {
  const raw = req?.query?.impact ?? req?.body?.impact;
  if (raw === undefined || raw === null || raw === '') return !!defaultOn;
  const s = String(raw).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  return !!defaultOn;
}

function skipped(reason, extra = {}) {
  return {
    tool: 'edit-impact-check',
    checked: false,
    status: 'skipped',
    reason,
    enforced: false,
    note: ADVISORY_NOTE,
    ...extra,
  };
}

/**
 * Run the impact check for a set of proposed edits and render the block that goes
 * under the response's `impact` key.
 *
 * NEVER REJECTS. Every outcome — success, throw, timeout, missing tool, no edits —
 * comes back as a resolved object. A caller may safely write
 *
 *     const impact = await impactFor(code, edits, { requested });
 *     res.json({ ...whatItAlreadyReturned, impact });
 *
 * without a try/catch, and no failure of this module can fail that submit.
 *
 * @param {string} courseCode
 * @param {Array}  edits        proposals in checkEdits() shape: {seed,known,target}, {lego_index}, {id}
 * @param {object} opts
 * @param {boolean} opts.requested   false → returns a `skipped` block, runs nothing
 * @param {number}  opts.timeoutMs
 * @param {number}  opts.maxEdits    cap; anything beyond is reported, never silently dropped
 * @param {string}  opts.state       'pre-edit' (default) or 'post-edit' — recorded in the block
 * @param {Function} opts.checkEdits injection seam for tests
 */
async function impactFor(courseCode, edits, opts = {}) {
  const {
    requested = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxEdits = DEFAULT_MAX_EDITS,
    state = 'pre-edit',
  } = opts;

  if (!requested) {
    return skipped('Not requested — pass ?impact=1 to get the blast-radius verdict for this edit.');
  }
  if (!Array.isArray(edits) || edits.length === 0) {
    return skipped('No content-text edit in this request to check.');
  }

  // No silent caps: if we check fewer than were submitted, the block says so, and
  // says which ones went unchecked. A truncated check that reads like a clean pass
  // is exactly the failure this whole tool exists to prevent.
  const toCheck = edits.slice(0, maxEdits);
  const skippedEdits = edits.slice(maxEdits);

  const started = Date.now();
  let timer = null;
  try {
    const check = opts.checkEdits || defaultCheckEdits();
    const envelope = await Promise.race([
      Promise.resolve().then(() => check(courseCode, toCheck)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`edit-impact-check exceeded ${timeoutMs}ms`)), timeoutMs);
        if (timer.unref) timer.unref();
      }),
    ]);

    const d = envelope?.decision || {};
    return {
      tool: 'edit-impact-check',
      checked: true,
      status: 'ok',
      state,
      verdict: d.verdict || 'unknown',
      headline: d.headline || null,
      required_actions: d.required_actions || [],
      reconsider_edits: d.reconsider_edits || [],
      summary: envelope?.summary || null,
      edits_checked: toCheck.length,
      ...(skippedEdits.length ? {
        edits_not_checked: skippedEdits.length,
        edits_not_checked_note:
          `Only the first ${maxEdits} edit(s) of ${edits.length} were checked (EDIT_IMPACT_MAX_EDITS). `
          + 'The rest were APPLIED but NOT checked — re-run tools/edit-impact-check.cjs on them.',
      } : {}),
      duration_ms: Date.now() - started,
      enforced: false,
      note: ADVISORY_NOTE,
      reports: envelope?.reports || undefined,
    };
  } catch (err) {
    // A reporter failure is a reporter failure. It is never an edit failure, and it
    // must never be mistaken for a clean verdict — hence `checked: false`, no verdict.
    const timedOut = /exceeded \d+ms/.test(err?.message || '');
    return {
      tool: 'edit-impact-check',
      checked: false,
      status: timedOut ? 'timeout' : 'unavailable',
      state,
      reason: err?.message || String(err),
      edits_submitted: edits.length,
      duration_ms: Date.now() - started,
      enforced: false,
      note: `${ADVISORY_NOTE} The check itself did not complete, so this is NOT a clean bill of health — `
        + `run \`node tools/edit-impact-check.cjs --course ${courseCode} ...\` by hand.`,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = { impactFor, impactRequested, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_EDITS, ADVISORY_NOTE };
