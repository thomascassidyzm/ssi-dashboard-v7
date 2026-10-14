/**
 * COURSE DATA for the v4 frame tools — READ through Popty, never SQL.
 *
 * Job #517 (Tom 2026-10-14, hard rule #384): no hand-written code against the
 * shared database. This used to be psql with inline SELECTs, which the guard
 * refuses. Reads now come from Popty's phrase-v4 read routes
 * (services/shared/phrase-v4-door.cjs), and writes land through the gap-fill door
 * (apply-gap-fill.cjs), as the logged agent named by V4_AGENT_ID (default
 * "phrase-v4"). The call is signed by tools/agent-admin/call.cjs, so the key
 * never reaches this process.
 *
 * Kept SYNCHRONOUS on purpose: every v4 tool calls loadCourse() inline, and the
 * signing helper is a child process anyway. The result shape is unchanged.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CALL = path.join(__dirname, '..', '..', 'agent-admin', 'call.cjs');
const agentId = () => process.env.V4_AGENT_ID || 'phrase-v4';

/** One signed call to Popty. Throws with Popty's own words on a non-2xx. */
function popty(method, urlPath, body) {
  const args = [CALL, '--agent', agentId()];
  // A body goes by file: a staged gap fill is far past the ~128 KB one argv entry may carry.
  let bodyFile = null;
  if (body !== undefined) {
    bodyFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'v4-popty-')), 'body.json');
    fs.writeFileSync(bodyFile, JSON.stringify(body));
    args.push('--body-file', bodyFile);
  }
  args.push(method, urlPath);
  let out;
  try {
    out = execFileSync('node', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // call.cjs prints the response body to stdout and exits 1 on a refusal: that body is the answer.
    const text = String(e.stdout || '').trim();
    let parsed = null; try { parsed = JSON.parse(text); } catch { /* not json */ }
    const err = new Error(`Popty ${method} ${urlPath}: ${parsed && parsed.error ? parsed.error : (text || e.stderr || e.message).toString().slice(0, 400)}`);
    err.body = parsed;
    throw err;
  } finally {
    if (bodyFile) fs.rmSync(path.dirname(bodyFile), { recursive: true, force: true });
  }
  return JSON.parse(out.trim() || 'null');
}

/** Every course with status and BUILD+USE phrase count. */
function listCourses() {
  return popty('GET', '/api/admin/phrase-v4/courses').courses;
}

function loadCourse(course, { maxSeed = 9999 } = {}) {
  const qs = maxSeed === 9999 ? '' : `?maxSeed=${+maxSeed}`;
  const d = popty('GET', `/api/admin/phrase-v4/course/${encodeURIComponent(course)}${qs}`);
  return { course, seeds: d.seeds, legos: d.legos,
    components: d.phrases.filter(p => p.phrase_role === 'component'),
    phrases: d.phrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use') };
}

module.exports = { popty, loadCourse, listCourses };
