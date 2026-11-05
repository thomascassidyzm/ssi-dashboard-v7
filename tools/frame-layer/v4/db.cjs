/**
 * COURSE DATA for the v4 frame tools — READ through Popty, never SQL.
 *
 * Job #517 (Tom 2026-10-14, hard rule #384): no hand-written code against the
 * shared database. This used to be psql with inline SELECTs, which the guard
 * refuses. Reads now come from Popty's phrase-v4 read routes
 * (services/shared/phrase-v4-door.cjs), and writes land through the gap-fill door
 * (apply-gap-fill.cjs), as the logged agent named by V4_AGENT_ID (default
 * "phrase-v4"); V4_KEY=kai signs with the Kai-only key (agent id must start kai-). The call is signed by tools/agent-admin/call.cjs, so the key
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

/** Named extra key (V4_KEY, e.g. "kai" -> agent-admin-kai.key), passed to call.cjs as --key. A Kai-only key signs only kai-<id> agents. */
function keyArgs(agent = agentId(), key = process.env.V4_KEY) {
  if (!key) return [];
  if (!/^[a-z0-9]{2,32}$/.test(key)) throw new Error(`V4_KEY must be a key name like "kai" (got ${key})`);
  if (key === 'kai' && !agent.startsWith('kai-')) throw new Error(`V4_KEY=kai signs only agent ids starting kai- (V4_AGENT_ID=${agent})`);
  return ['--key', key];
}

/** One signed call to Popty. Throws with Popty's own words on a non-2xx. */
function popty(method, urlPath, body) {
  const args = [CALL, '--agent', agentId(), ...keyArgs()];
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

/**
 * READ PATH 2 — Popty's public read-only script-view route on :3470 (#438·AD).
 * The admin door above needs a key with scope admin:all; the shared phrase-v4 key does not
 * carry it (#433, #438 — refused AGENT_IDENTITY_REFUSED on 2026-11-05). script-view is the
 * dashboard's own read of seeds → LEGOs → phrases, unchanged, paged at its 50-seed clamp.
 * Selected with V4_READ=script-view; the result has the same shape as the door's. The whole
 * course is cached per day under V4_CACHE (else V4_EVIDENCE, else $CS_SCRATCH), because the route is slow.
 */
function loadCourseViaScriptView(course, { maxSeed = 9999 } = {}) {
  const base = process.env.POPTY_URL || 'http://localhost:3470';
  const cacheDir = process.env.V4_CACHE || process.env.V4_EVIDENCE || process.env.CS_SCRATCH || os.tmpdir();
  const cache = path.join(cacheDir, `script-view-${course}-${new Date().toISOString().slice(0, 10)}.json`);
  let all = null;
  try { all = JSON.parse(fs.readFileSync(cache, 'utf8')); } catch { /* not cached */ }
  if (!all) {
    all = { seeds: [], legos: [], phrases: [] };
    for (let a = 1; ; a += 50) {
      const url = `${base}/api/production/${encodeURIComponent(course)}/script-view?seedStart=S${String(a).padStart(4, '0')}&seedEnd=S${String(a + 49).padStart(4, '0')}`;
      const d = JSON.parse(execFileSync('curl', ['-sf', '-m', '600', url], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }));
      if (!d.seeds || !d.seeds.length) break;
      for (const sd of d.seeds) {
        all.seeds.push({ seed_number: sd.seed_number, known_text: sd.known_text, target_text: sd.target_text });
        for (const l of sd.legos || []) {
          all.legos.push({ seed_number: sd.seed_number, lego_index: l.lego_index, known_text: l.known_text, target_text: l.target_text, type: l.type, is_new: l.is_new });
          for (const ph of l.phrases || []) if (['build', 'use', 'component'].includes(ph.type))
            all.phrases.push({ id: ph.id, seed_number: sd.seed_number, lego_index: l.lego_index, position: ph.position, phrase_role: ph.type, known_text: ph.known_text, target_text: ph.target_text });
        }
      }
    }
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cache, JSON.stringify(all));
  }
  const inRange = (r) => r.seed_number <= maxSeed;
  const phrases = all.phrases.filter(inRange);
  return { course, seeds: all.seeds.filter(inRange), legos: all.legos.filter(inRange),
    components: phrases.filter(p => p.phrase_role === 'component'),
    phrases: phrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use') };
}

function loadCourse(course, { maxSeed = 9999 } = {}) {
  if (process.env.V4_READ === 'script-view') return loadCourseViaScriptView(course, { maxSeed });
  const qs = maxSeed === 9999 ? '' : `?maxSeed=${+maxSeed}`;
  const d = popty('GET', `/api/admin/phrase-v4/course/${encodeURIComponent(course)}${qs}`);
  return { course, seeds: d.seeds, legos: d.legos,
    components: d.phrases.filter(p => p.phrase_role === 'component'),
    phrases: d.phrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use') };
}

module.exports = { popty, keyArgs, loadCourse, loadCourseViaScriptView, listCourses };
