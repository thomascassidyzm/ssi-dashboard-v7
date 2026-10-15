// services/shared/phrase-v4-door.cjs
//
// PHRASE v4 THROUGH POPTY'S DOORS (job #517, Tom 2026-10-14: "phrase v4 is THE
// phrase builder", r-2026-10-14-phrase-v4-is-the-phrase-builder).
//
// v4 used to read a course by psql inline SQL and land gap-fill rows with a raw
// INSERT. The #384 hard rule refuses both: no hand-written code against the
// database. This module is what the v4 tools call instead, through
//   GET  /api/admin/phrase-v4/courses            what v4 may measure
//   GET  /api/admin/phrase-v4/course/:code       one course's seeds, LEGOs, phrases
//   POST /api/admin/phrase-v4/gap-fill           preview (default) or land staged rows
// All three sit under /api/admin, so a signed agent holding admin:all reaches them
// (tools/agent-admin/call.cjs), attributed in the log and on the content-edit event.
//
// The write rides the course-edit engine (course-edit-ops.cjs): one transaction, a
// dry run that is the real transaction rolled back, an undo derived from the
// rows. What this file adds is what the old applier enforced itself:
//   - ADDITIVE ONLY: ids continue each LEGO's own B/U numbering, an id that exists
//     is never overwritten, a pair already on the LEGO is skipped (planInsert);
//   - the Welsh exclusion (r-2026-09-27) and the live-course gate: a beta/released
//     course is served to learners, so an APPLY needs Tom's words (tom_go);
//   - EVERY EXISTING GATE, re-run here instead of trusted from the staged file —
//     Popty's per-phrase gates (bareLego, containment, vocab, zut, knownSide), the
//     no-contract heard-words fallback, and ZUT against the WHOLE course. A staged
//     file is only a request; vocab-only-from-earlier-seeds is enforced at the door
//     (r-2026-10-02-phrase-gen-v4-must-pass-every).

const { makePhraseId, computeLegoPosition } = require('../course-builder/lib/phrase-structure.cjs');
const { knownHeardCheck } = require('./known-heard-check.cjs');

const ROLE = { build: 'B', use: 'U' };
const NO_SPACE_KNOWN = new Set(['zho', 'jpn', 'yue', 'hak', 'nan', 'tha']);
const COURSE_CODE = /^[a-z]{2,4}_for_[a-z]{2,4}$/;
const key = (s) => String(s || '').trim().toLowerCase();

/**
 * Pure planner: staged rows + the live rows of the LEGOs they touch → rows to
 * insert. Never returns an id that exists; skips rows already present.
 */
function planInsert(course, staged, existing) {
  const byLego = new Map();
  const slot = (k) => {
    if (!byLego.has(k)) byLego.set(k, { maxPos: 0, maxNum: { B: 0, U: 0 }, pairs: new Set(), ids: new Set() });
    return byLego.get(k);
  };
  for (const e of existing) {
    const L = slot(`${e.seed_number}:${e.lego_index}`);
    L.maxPos = Math.max(L.maxPos, e.position || 0);
    const m = String(e.id).match(/([A-Z])(\d+)$/);
    if (m && L.maxNum[m[1]] != null) L.maxNum[m[1]] = Math.max(L.maxNum[m[1]], +m[2]);
    L.pairs.add(key(e.known_text) + '|' + key(e.target_text));
    L.ids.add(e.id);
  }
  const rows = [], skipped = [];
  for (const r of staged) {
    const L = slot(`${r.seed_number}:${r.lego_index}`);
    const pair = key(r.known_text) + '|' + key(r.target_text);
    if (L.pairs.has(pair)) { skipped.push({ ...r, why: 'already on this LEGO' }); continue; }
    const letter = ROLE[r.phrase_role];
    if (!letter) throw new Error(`unknown role ${r.phrase_role}`);
    const num = ++L.maxNum[letter];
    const id = makePhraseId(course, r.seed_number, r.lego_index, r.phrase_role, num);
    if (L.ids.has(id)) throw new Error(`refusing: ${id} already exists`);
    L.ids.add(id); L.pairs.add(pair);
    rows.push({
      id, course_code: course, seed_number: r.seed_number, lego_index: r.lego_index, position: ++L.maxPos,
      known_text: r.known_text, target_text: r.target_text,
      word_count: r.target_text.length, lego_count: (r.known_text.match(/\s+/g) || []).length + 1,
      phrase_role: r.phrase_role, connected_lego_ids: [], lego_position: computeLegoPosition(r.target_text, r.lego_target),
      metadata: { format: 'build_use', pipeline: 'v4-gap', job: '924', window: r.window, frames: r.frames },
      status: 'draft', version: 1, introduce: true,
    });
  }
  return { rows, skipped };
}

/** The course-edit engine's ops for planned rows: one phrase.insert each. */
const toInsertOps = (rows) => rows.map(row => ({ op: 'phrase.insert', row }));

async function pageAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

/** Every course v4 may measure: code, status, and its BUILD+USE phrase count. */
async function listCourses(sb) {
  const courses = await pageAll(() => sb.from('courses').select('course_code, status, visibility, new_app_status').order('course_code'));
  const counts = new Map();
  for (const role of ['build', 'use']) {
    const rows = await pageAll(() => sb.from('course_practice_phrases').select('course_code').eq('phrase_role', role).order('id'));
    for (const r of rows) counts.set(r.course_code, (counts.get(r.course_code) || 0) + 1);
  }
  return courses.map(c => ({ ...c, phrases: counts.get(c.course_code) || 0 }));
}

/** One course as the v4 tools read it (db.cjs loadCourse's inputs). */
async function readCourse(sb, courseCode, { maxSeed = 9999, componentsOnly = false, withAudio = false } = {}) {
  const { data: course, error } = await sb.from('courses').select('course_code, status, visibility, new_app_status').eq('course_code', courseCode).maybeSingle();
  if (error) throw error;
  if (!course) return null;
  const seeds = await pageAll(() => sb.from('course_seeds').select('seed_number, known_text, target_text')
    .eq('course_code', courseCode).lte('seed_number', maxSeed).order('seed_number'));
  const legos = await pageAll(() => sb.from('course_legos').select('id, seed_number, lego_index, known_text, target_text, type, is_new')
    .eq('course_code', courseCode).lte('seed_number', maxSeed).order('seed_number').order('lego_index').order('id'));
  // componentsOnly: the gates need only the component rows (the heard-words fallback), not every phrase.
  const raw = await pageAll(() => {
    const q = sb.from('course_practice_phrases').select('id, seed_number, lego_index, position, phrase_role, known_text, target_text, metadata'
      // withAudio (voice-gap-fill, #544): the audio pointers, so a voicing tool sees which slots are still empty.
      + (withAudio ? ', known_audio_id, target1_audio_id, target2_audio_id' : ''))
    return (componentsOnly ? q.eq('phrase_role', 'component') : q)
      .eq('course_code', courseCode).lte('seed_number', maxSeed).order('seed_number').order('lego_index').order('position').order('id');
  });
  const phrases = raw.map(({ metadata, ...p }) => ({ ...p, pipeline: metadata && metadata.pipeline != null ? String(metadata.pipeline) : null }));
  return { course, seeds, legos, phrases };
}

/** The live rows of the LEGOs the staged rows touch. */
async function readTouchedPhrases(sb, courseCode, rows) {
  const seeds = [...new Set(rows.map(r => +r.seed_number))];
  const out = [];
  for (let i = 0; i < seeds.length; i += 100) {
    out.push(...await pageAll(() => sb.from('course_practice_phrases').select('id, seed_number, lego_index, position, known_text, target_text')
      .eq('course_code', courseCode).in('seed_number', seeds.slice(i, i + 100)).order('id')));
  }
  const want = new Set(rows.map(r => `${+r.seed_number}:${+r.lego_index}`));
  return out.filter(e => want.has(`${e.seed_number}:${e.lego_index}`));
}

/**
 * Re-run every gate the staging stage ran, over each staged row. Returns
 * { refused:[{…row, reasons}] } — one refused row blocks the whole request: the
 * door never lands a subset the caller did not preview.
 * `deps` is injected so the test needs no database.
 */
async function gateStagedRows({ sb, courseCode, rows, data, deps }) {
  const { makeCourseCtx, checkPhraseSet, checkPhraseZUT } = deps;
  const ctx = makeCourseCtx(sb, courseCode);
  const legoOf = (r) => data.legos.find(l => l.seed_number === +r.seed_number && +l.lego_index === +r.lego_index);
  const noSpace = NO_SPACE_KNOWN.has(courseCode.split('_for_')[1].split('_')[0]);
  const refused = [];
  for (const r of rows) {
    const reasons = [];
    const lego = legoOf(r);
    if (!lego || lego.target_text !== r.lego_target || (r.lego_known != null && lego.known_text !== r.lego_known)) reasons.push('LEGO changed or gone since generation');
    if (/[()]/.test(String(r.known_text) + String(r.target_text))) reasons.push('parentheses');
    if (!reasons.length) {
      const res = await checkPhraseSet({ courseCode, seedNumber: r.seed_number, legoIndex: r.lego_index, legoKnown: r.lego_known || lego.known_text, legoTarget: r.lego_target,
        phrases: [{ role: r.phrase_role, known: r.known_text, target: r.target_text }] }, ctx);
      for (const g of ['bareLego', 'containment', 'vocab', 'zut']) if (res.gates[g] && res.gates[g].pass === false) reasons.push(`popty:${g} ${JSON.stringify(res.gates[g]).slice(0, 200)}`);
      if (res.gates.knownSide.pass === false) reasons.push(`popty:knownSide ${JSON.stringify(res.gates.knownSide.breaches).slice(0, 200)}`);
      if (res.gates.knownSide.pass === null) {
        const heard = [...data.seeds.filter(x => x.seed_number <= r.seed_number), ...data.legos, ...data.phrases.filter(p => p.phrase_role === 'component')]
          .filter(x => x.seed_number < r.seed_number || (x.seed_number === r.seed_number && (x.lego_index == null || +x.lego_index <= +r.lego_index)))
          .map(x => x.known_text);
        const bad = knownHeardCheck(r.known_text, heard, noSpace);
        if (bad.length) reasons.push(`knownSide (no contract; heard-words fallback): unheard ${bad.join(' ')}`);
      }
      const whole = await checkPhraseZUT(sb, courseCode, [{ known: r.known_text, target: r.target_text }], null);
      if (whole.length) reasons.push(`ZUT whole course: "${whole[0].known}" is "${whole[0].existing_target}" at seed ${whole[0].existing_seed}`);
    }
    if (reasons.length) refused.push({ seed_number: r.seed_number, lego_index: r.lego_index, phrase_role: r.phrase_role, known_text: r.known_text, target_text: r.target_text, reasons });
  }
  return { refused };
}

/** The refusals that need no database: shape, course, Welsh, the live gate on apply. */
function precheck({ courseCode, rows, course, apply, tomGo, kaiGo }) {
  if (!COURSE_CODE.test(String(courseCode || ''))) return { status: 400, error: 'courseCode required (e.g. fra_for_eng)', code: 'BAD_REQUEST' };
  if (/^cym/.test(courseCode)) return { status: 409, error: 'Welsh is excluded (r-2026-09-27)', code: 'WELSH_EXCLUDED' };
  if (!Array.isArray(rows) || !rows.length) return { status: 400, error: '"rows" must be the non-empty accepted rows of staged-<course>.json', code: 'BAD_REQUEST' };
  if (!course) return { status: 404, error: `no course ${courseCode}`, code: 'NOT_FOUND' };
  for (const r of rows) {
    if (!Number.isInteger(+r.seed_number) || !Number.isInteger(+r.lego_index) || !ROLE[r.phrase_role] || !r.known_text || !r.target_text || !r.lego_target) {
      return { status: 400, error: `bad staged row (needs seed_number, lego_index, phrase_role build|use, known_text, target_text, lego_target): ${JSON.stringify(r).slice(0, 200)}`, code: 'BAD_ROW' };
    }
  }
  if (apply && ['beta', 'released'].includes(course.status) && !String(tomGo || '').trim() && !String(kaiGo || '').trim()) {
    return { status: 409, error: `refusing: ${courseCode} is ${course.status} (served to learners); an apply needs "tom_go": "<Tom's words>"`, code: 'TOM_GO_REQUIRED' };
  }
  return null;
}

module.exports = { planInsert, toInsertOps, listCourses, readCourse, readTouchedPhrases, gateStagedRows, precheck, pageAll };
