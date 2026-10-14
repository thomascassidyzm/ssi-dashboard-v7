#!/usr/bin/env node
/**
 * LAND A STAGED GAP FILL — through Popty's phrase-v4 door, never SQL (job #517).
 *
 * Reads staged-<course>.json (gap-fill-course.cjs: every row already passed
 * Popty's seed-complete gates) and POSTs its accepted rows to
 * POST /api/admin/phrase-v4/gap-fill as the logged agent V4_AGENT_ID. The door
 * (services/shared/phrase-v4-door.cjs) does everything this script used to do by
 * raw INSERT, and more:
 *   - re-runs EVERY gate over the rows (a staged file is only a request);
 *   - ADDITIVE: ids continue each LEGO's own B/U numbering, nothing existing is
 *     overwritten, a pair already on the LEGO is skipped (a second apply is a no-op);
 *   - Welsh is refused; a beta/released course (served to learners — there is no
 *     staging copy of course_practice_phrases) needs --tom-go "<his words>";
 *   - one transaction, a PREVIEW that is the real insert rolled back, an UNDO file
 *     the door writes (replay it with edit-batch), a content-edit event with this
 *     agent's identity, and the audio-pass request queued on apply.
 *
 * Default is the PREVIEW: it writes apply-plan-<course>.json and lands nothing.
 *
 * Usage: node tools/frame-layer/v4/apply-gap-fill.cjs <course> [--apply --tom-go "<Tom's words>"]
 *        Env: V4_RUN_DIR, V4_AGENT_ID (default phrase-v4)
 * Undo:  node tools/agent-admin/call.cjs --agent <id> POST /api/production/<course>/edit-batch '{"undo_file":"<name from the apply>","apply":true}'
 */
const fs = require('fs');
const path = require('path');
const { popty } = require('./db.cjs');
const { planInsert } = require('../../../services/shared/phrase-v4-door.cjs');

const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');

function main() {
  const a = process.argv.slice(2);
  const course = a[0];
  if (!course || course.startsWith('--')) throw new Error('usage: apply-gap-fill.cjs <course> [--apply --tom-go "<Tom\'s words>"]');
  const apply = a.includes('--apply');
  const gi = a.indexOf('--tom-go'); const tomGo = gi >= 0 ? a[gi + 1] : null;
  const dir = path.join(RUN_DIR, course);
  const staged = JSON.parse(fs.readFileSync(path.join(dir, `staged-${course}.json`), 'utf8'));
  // The preview first, always: even --apply sees the door's plan before it lands.
  const body = { courseCode: course, rows: staged.rows, staged_at: staged.generated, tom_go: tomGo || undefined };
  let preview;
  try {
    preview = popty('POST', '/api/admin/phrase-v4/gap-fill', { ...body, apply: false });
  } catch (e) {
    // A gate refusal names the rows; keep them so they can be cut from the staged file.
    if (e.body && e.body.refused) {
      fs.writeFileSync(path.join(dir, `apply-refused-${course}.json`), JSON.stringify(e.body, null, 1));
      console.error(`${e.message}\n  refused rows written to apply-refused-${course}.json`);
      process.exit(2);
    }
    throw e;
  }
  fs.writeFileSync(path.join(dir, `apply-plan-${course}.json`), JSON.stringify(preview, null, 1));
  const p = preview.plan || { to_insert: 0, skipped: 0, by_role: {}, status: '?' };
  console.log(`${course} (${p.status}): ${p.to_insert} rows to insert (${p.by_role.build || 0} BUILD / ${p.by_role.use || 0} USE), ${p.skipped} already present`);
  if (!apply) { console.log('PREVIEW — nothing written (the door ran the real insert and rolled it back)'); return; }
  if (!p.to_insert) return;
  const out = popty('POST', '/api/admin/phrase-v4/gap-fill', { ...body, apply: true });
  fs.writeFileSync(path.join(dir, `apply-result-${course}.json`), JSON.stringify(out, null, 1));
  console.log(`APPLIED: ${out.results ? out.results.length : p.to_insert} rows (event ${out.event_id}); undo file ${out.undo_file || 'NONE'}`);
}

module.exports = { planInsert };
if (require.main === module) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
