#!/usr/bin/env node
'use strict';
// tools/course-optimization/demote-duplicate-debuts-2026-10-07.cjs
//
// DRAFT — job #138. Nothing here has been applied. APPLY waits for Tom's go.
//
// THE DEFECT. A LEGO with the same known AND the same target (debut_norm, the normaliser the debut guard uses) is
// is_new=true twice in one course. course_round_index gives every is_new LEGO a round, and all three live player
// paths (cycles API, bundle generateScript, legacy generateLearningScript) emit intro → debut → BUILD → USE for every
// round, deduping only by LEGO id — so the learner is introduced to it, and drills it, twice.
//
// THE RULE (Tom, 2026-10-07): "we do NOT need to introduce and practice LEGOS twice … we don't NEED the practice
// phrases necessarily - we have enough already". Keep the EARLIER debut (round order, i.e. running order in a woven
// course); the later one becomes is_new=false (canon L17, the duplicate ground). Same shape as the going-forward fix
// (#115, services/course-builder/routes/v2.cjs): the flag flips, the basket stays.
//
// WHAT HAPPENS TO THE LATER BASKET. Nothing is deleted. Under canon P25 a not-new LEGO's basket is never played, so
// flipping the flag is what takes it off the learner's path; the rows stay in place, dark, which makes the whole change
// undoable by flipping the flag back. ONE exception, canon P26 (HARD): when the later basket is the only played home of
// its seed's own sentence, that sentence is COPIED (same text, same clips, new id) as a USE row under the seed's last
// remaining new LEGO — the home P26 and the p26-early-placement sweep both name.
//
// HELD, never written (listed in the plan): the later LEGO is its seed's only debut (demoting it silences the seed);
// the earlier debut is missing known/target1/target2 audio, or has no practice of its own; P26's home does not contain
// its LEGO; Welsh (Kai, 2026-09-10: "Welsh needs no fixes"); non-learner courses; judgement exclusions below.
//
//   node tools/course-optimization/demote-duplicate-debuts-2026-10-07.cjs [course …]     # DRY RUN (default): reads, writes nothing to the DB
//   APPLY=1 PLAN=<dry-run json> node …                                                     # writes — NOT TO BE RUN without Tom's go
//   ROLLBACK=1 PLAN=<applied json> node …                                                  # undoes an APPLY from its log
//
// DATABASE_URL, else ROUND_INDEX_ENV_PSQL, else <repo>/.env.psql. Evidence (plan, before-snapshot, logs) goes to
// ~/ssi-evidence/ssi-dashboard-v7/duplicate-debuts/, never the tracked tree.

const fs = require('fs');
const os = require('os');
const path = require('path');

const SWEEP = 'demote-duplicate-debuts-2026-10-07';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#138';
const RULING = 'Tom, 2026-10-07: "we do NOT need to introduce and practice LEGOS twice … we don\'t NEED the practice phrases necessarily - we have enough already" — keep the earlier debut, the later one is_new=false (canon L17); seed sentence kept in a played basket (canon P26)';
const EVIDENCE = path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'duplicate-debuts');

/** Courses never changed by this sweep, and why. */
function excludedCourse(code) {
  if (code.startsWith('cym_')) return 'Welsh — Kai, 2026-09-10: "Welsh needs no fixes"; reported, not changed';
  if (code === 'eng_template') return 'template course (known text = target text), not a learner course';
  if (code.startsWith('zzz_')) return 'test course';
  return null;
}
/** Single LEGOs held on judgement after reading them (job #138). */
const JUDGEMENT_HOLD = {
  'eng_for_ben:S0626L02': 'the later LEGO "না, ... ধন্যবাদ" is a split carrier around "I\'m not thirsty", not the same shape as the earlier "না ধন্যবাদ"',
};

const pad = (n, w) => String(n).padStart(w, '0');
const legoKey = (seed, idx) => `S${pad(seed, 4)}L${pad(idx, 2)}`;
const words = (t) => (t || '').toLowerCase().match(/[\p{L}\p{N}'’]+/gu) || [];
/** Word-multiset containment — the gate's "phrase contains its LEGO" (canon P17), as the P26 tools use it. */
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
function containsTarget(hay, needle) {
  if (containsWords(hay, needle)) return true;
  const squash = (t) => (t || '').toLowerCase().replace(/[\s\p{P}]+/gu, '');   // CJK/Thai: no spaces to split on
  return squash(needle) !== '' && squash(hay).includes(squash(needle));
}

/**
 * THE PLAN, pure. `db` = one course: { course, legos, order, woven, phrases, seeds }.
 *   legos   — every LEGO: { id, lego_id, seed_number, lego_index, type, is_new, nk, nt, known_text, target_text,
 *             known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id }
 *   order   — Map seed_number → running-order position (woven courses only); woven — the course has a seed weave
 *   phrases — rows of the group LEGOs' baskets AND every build/use row matching an affected seed sentence:
 *             { id, seed_number, lego_index, position, phrase_role, known_text, target_text, pn, …audio ids }
 *   seeds   — Map seed_number → { known_text, target_text, sn }   (sn = debut_norm(target_text))
 * Returns { demote: [...], copies: [...], held: [...], notDoublePlayed: [...] }.
 */
function planCourse(db) {
  const { course, legos, order, woven, phrases, seeds } = db;
  const out = { course, demote: [], copies: [], held: [], notDoublePlayed: [] };
  const courseWhy = excludedCourse(course);
  const playPos = (l) => (woven ? order.get(l.seed_number) : l.seed_number);
  const inIndex = (l) => l.is_new && (!woven || order.has(l.seed_number));     // course_round_index's WHERE clause
  const played = legos.filter(inIndex);
  const bySeed = new Map();
  for (const l of played) { if (!bySeed.has(l.seed_number)) bySeed.set(l.seed_number, []); bySeed.get(l.seed_number).push(l); }
  const basketOf = (l) => phrases.filter((p) => p.seed_number === l.seed_number && p.lego_index === l.lego_index);
  const realPractice = (l) => basketOf(l).filter((p) => (p.phrase_role === 'build' || p.phrase_role === 'use') && p.pn !== l.nt).length;
  const isPlayedKey = (seed, idx) => played.some((l) => l.seed_number === seed && l.lego_index === idx);

  const groups = new Map();
  for (const l of legos.filter((x) => x.is_new)) {
    const k = `${l.nk}\u0000${l.nt}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const demotedKeys = new Set();
  for (const occ of groups.values()) {
    if (occ.length < 2) continue;
    const label = { known: occ[0].known_text, target: occ[0].target_text, occurrences: occ.map((l) => l.lego_id) };
    const inIdx = occ.filter(inIndex).sort((a, b) => playPos(a) - playPos(b) || a.lego_index - b.lego_index);
    if (inIdx.length < 2) { out.notDoublePlayed.push({ ...label, why: 'only one occurrence is in the running order' }); continue; }
    const keep = inIdx[0];
    const later = inIdx.slice(1);
    const why = [];
    if (courseWhy) why.push(courseWhy);
    const missing = ['known', 'target1', 'target2'].filter((r) => !keep[`${r}_audio_id`]);
    if (missing.length) why.push(`HELD-KEEPER-AUDIO: earlier debut ${keep.lego_id} has no ${missing.join('/')} clip`);
    if (realPractice(keep) === 0 && !(keep.seed_number === 1 && keep.lego_index === 1)) why.push(`HELD-KEEPER-NO-PRACTICE: earlier debut ${keep.lego_id} has no practice phrase`);
    const plans = [];
    for (const d of later) {
      if (JUDGEMENT_HOLD[`${course}:${d.lego_id}`]) { why.push(`JUDGEMENT: ${JUDGEMENT_HOLD[`${course}:${d.lego_id}`]}`); continue; }
      const siblings = (bySeed.get(d.seed_number) || []).filter((l) => l.lego_index !== d.lego_index && !later.some((x) => x.id === l.id));
      if (!siblings.length) { why.push(`HELD-SOLE-DEBUT: ${d.lego_id} is the only debut in seed ${d.seed_number}`); continue; }
      const seed = seeds.get(d.seed_number);
      const sentenceRows = basketOf(d).filter((p) => (p.phrase_role === 'build' || p.phrase_role === 'use') && seed && p.pn === seed.sn);
      const sentenceElsewhere = seed && phrases.some((p) => (p.phrase_role === 'build' || p.phrase_role === 'use') && p.pn === seed.sn
        && !(p.seed_number === d.seed_number && p.lego_index === d.lego_index) && isPlayedKey(p.seed_number, p.lego_index));
      let copy = null;
      if (sentenceRows.length && !sentenceElsewhere) {
        const home = siblings.sort((a, b) => b.lego_index - a.lego_index)[0];        // the seed's last remaining new LEGO
        const src = sentenceRows.find((p) => p.phrase_role === 'use') || sentenceRows[0];
        if (!containsTarget(src.target_text, home.target_text)) { why.push(`HELD-P26-HOME: seed sentence does not contain ${home.lego_id} "${home.target_text}"`); continue; }
        copy = { home, src };
      }
      plans.push({ d, copy, siblings });
    }
    if (why.length) { out.held.push({ ...label, keep: keep.lego_id, later: later.map((l) => l.lego_id), why }); continue; }
    for (const { d, copy } of plans) {
      demotedKeys.add(d.id);
      out.demote.push({ id: d.id, lego_id: d.lego_id, seed_number: d.seed_number, lego_index: d.lego_index, known_text: d.known_text,
        target_text: d.target_text, keep: keep.lego_id, basket_ids: basketOf(d).map((p) => p.id), presentation_audio_id: d.presentation_audio_id || null });
      if (copy) out.copies.push({ for: d.lego_id, home: copy.home, src: copy.src });
    }
  }
  // ids/positions for the copies, sequenced per home so two copies under one LEGO never collide
  const homeRows = new Map();
  for (const c of out.copies) {
    const h = c.home; const k = h.lego_id;
    if (!homeRows.has(k)) homeRows.set(k, basketOf(h).map((p) => ({ id: p.id, position: p.position })));
    const rows = homeRows.get(k);
    let maxU = 0; for (const r of rows) { const m = String(r.id).match(/U(\d+)$/); if (m) maxU = Math.max(maxU, +m[1]); }
    const position = rows.reduce((m, r) => Math.max(m, r.position || 0), 0) + 1;
    const id = `${course}:${legoKey(h.seed_number, h.lego_index)}U${pad(maxU + 1, 2)}`;
    rows.push({ id, position });
    Object.assign(c, { id, position, home: { lego_id: h.lego_id, seed_number: h.seed_number, lego_index: h.lego_index, known_text: h.known_text, target_text: h.target_text } });
  }
  return out;
}

// ── live (read-only for the dry run) ─────────────────────────────────────────────────────────────────────────────
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const f = process.env.ROUND_INDEX_ENV_PSQL || path.join(__dirname, '..', '..', '.env.psql');
  const url = (fs.readFileSync(f, 'utf8').match(/postgresql:\/\/[^\s"']+/) || [])[0];
  if (!url) throw new Error(`no DATABASE_URL in ${f}`);
  return url;
}

async function coursesWithDuplicates(pg) {
  const { rows } = await pg.query(`SELECT course_code FROM course_legos WHERE is_new GROUP BY course_code, debut_norm(known_text), debut_norm(target_text) HAVING count(*) > 1`);
  return [...new Set(rows.map((r) => r.course_code))].sort();
}

async function loadCourse(pg, course) {
  const { rows: legos } = await pg.query(`SELECT id, lego_id, seed_number, lego_index, type, is_new, known_text, target_text, debut_norm(known_text) nk, debut_norm(target_text) nt,
      known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, updated_at, to_jsonb(l) AS row
    FROM course_legos l WHERE course_code=$1 ORDER BY seed_number, lego_index`, [course]);
  const { rows: weave } = await pg.query('SELECT 1 FROM course_seed_weave WHERE course_code=$1', [course]);
  const { rows: ord } = await pg.query('SELECT seed_number, position FROM course_running_order WHERE course_code=$1', [course]);
  const counts = new Map(); for (const l of legos.filter((x) => x.is_new)) { const k = `${l.nk}\u0000${l.nt}`; counts.set(k, (counts.get(k) || 0) + 1); }
  const groupLegos = legos.filter((l) => l.is_new && counts.get(`${l.nk}\u0000${l.nt}`) > 1);
  const seedNums = [...new Set(groupLegos.map((l) => l.seed_number))];
  const { rows: seedRows } = await pg.query('SELECT seed_number, known_text, target_text, debut_norm(target_text) sn FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [course, seedNums]);
  const seeds = new Map(seedRows.map((s) => [s.seed_number, s]));
  const allSeedsOfGroup = [...new Set(legos.filter((l) => seedNums.includes(l.seed_number) && l.is_new).map((l) => l.seed_number))];
  const { rows: phrases } = await pg.query(`SELECT p.id, p.seed_number, p.lego_index, p.position, p.phrase_role, p.known_text, p.target_text, debut_norm(p.target_text) pn,
      p.known_audio_id, p.target1_audio_id, p.target2_audio_id, to_jsonb(p) AS row
    FROM course_practice_phrases p
    WHERE p.course_code=$1 AND (p.seed_number = ANY($2) OR (p.phrase_role IN ('build','use') AND debut_norm(p.target_text) = ANY($3)))`,
  [course, allSeedsOfGroup, seedRows.map((s) => s.sn)]);
  const { rows: enrol } = await pg.query('SELECT last_completed_lego_id, highest_completed_lego_id FROM course_enrollments WHERE course_id=$1', [course]);
  const { rows: [ver] } = await pg.query('SELECT version, content_stamp FROM courses WHERE course_code=$1', [course]);
  const { rows: [ri] } = await pg.query('SELECT count(*)::int n FROM course_round_index WHERE course_code=$1', [course]);
  return { course, legos, order: new Map(ord.map((o) => [o.seed_number, o.position])), woven: weave.length > 0, phrases, seeds, enrol, version: ver, roundIndexCount: ri.n };
}

function snapshotFor(db, plan) {
  const lego = Object.fromEntries(db.legos.filter((l) => plan.demote.some((d) => d.id === l.id)).map((l) => [l.id, l.row]));
  const basketIds = new Set(plan.demote.flatMap((d) => d.basket_ids));
  const phrase = Object.fromEntries(db.phrases.filter((p) => basketIds.has(p.id)).map((p) => [p.id, p.row]));
  const cursorOn = db.enrol.filter((e) => plan.demote.some((d) => d.lego_id === e.last_completed_lego_id)).length;
  return { course_version: db.version, round_index_count: db.roundIndexCount, lego, phrase, learners_cursor_on_demoted: cursorOn };
}

async function dryRun(courses) {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();
  await pg.query('SET default_transaction_read_only = on');            // the dry run CANNOT write
  await pg.query("SET statement_timeout = '60s'");
  const list = courses.length ? courses : await coursesWithDuplicates(pg);
  const result = { sweep: SWEEP, job: JOB, mode: 'DRY_RUN', at: new Date().toISOString(), courses: {} };
  for (const c of list) {
    const db = await loadCourse(pg, c);
    const plan = planCourse(db);
    result.courses[c] = { ...plan, copies: plan.copies.map((x) => ({ id: x.id, position: x.position, for: x.for, home: x.home, src_id: x.src.id, known_text: x.src.known_text, target_text: x.src.target_text,
      known_audio_id: x.src.known_audio_id, target1_audio_id: x.src.target1_audio_id, target2_audio_id: x.src.target2_audio_id })), before: snapshotFor(db, plan) };
    const p = result.courses[c];
    console.log(`${c.padEnd(18)} demote ${String(p.demote.length).padStart(3)}  seed-sentence copies ${String(p.copies.length).padStart(2)}  held ${String(p.held.length).padStart(3)}  not-double-played ${String(p.notDoublePlayed.length).padStart(3)}  round_index ${p.before.round_index_count} → ${p.before.round_index_count - p.demote.length}`);
  }
  await pg.end();
  const tot = (k) => Object.values(result.courses).reduce((n, c) => n + c[k].length, 0);
  result.totals = { courses_changed: Object.values(result.courses).filter((c) => c.demote.length).length, demote: tot('demote'), copies: tot('copies'), held: tot('held'), notDoublePlayed: tot('notDoublePlayed') };
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const file = path.join(EVIDENCE, `${SWEEP}-dryrun-${result.at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 1));
  console.log(`TOTAL ${JSON.stringify(result.totals)}\nDRY RUN — nothing written to the database. Plan + before-snapshot: ${file}`);
  return { result, file };
}

// ── APPLY / ROLLBACK — gated; NOT run in job #138 ────────────────────────────────────────────────────────────────
async function apply(planFile) {
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  if (plan.mode !== 'DRY_RUN') throw new Error('PLAN must be a dry-run file');
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();
  const log = { sweep: SWEEP, job: JOB, mode: 'APPLIED', plan: planFile, at: new Date().toISOString(), courses: {} };
  try {
    for (const [course, p] of Object.entries(plan.courses)) {
      if (!p.demote.length) continue;
      // DRIFT: re-plan from live and require the identical change set before anything is written
      const live = planCourse(await loadCourse(pg, course));
      const same = JSON.stringify(live.demote.map((d) => d.id).sort()) === JSON.stringify(p.demote.map((d) => d.id).sort())
        && JSON.stringify(live.copies.map((c) => c.id).sort()) === JSON.stringify(p.copies.map((c) => c.id).sort());
      if (!same) throw new Error(`${course}: live plan differs from ${planFile} — re-run the dry run`);
      const event = await recordContentEdit(supabase, { identity, courseCode: course, surface: SURFACE, operation: 'lego-edit',
        scope: { seed_numbers: [...new Set(p.demote.map((d) => d.seed_number).concat(p.copies.map((c) => c.home.seed_number)))].sort((a, b) => a - b), lego_ids: p.demote.map((d) => d.lego_id), phrase_ids: p.copies.map((c) => c.id), rows: p.demote.length + p.copies.length },
        detail: { ruling: RULING, job: JOB, demote: p.demote.map((d) => ({ lego: d.lego_id, keep: d.keep, from: { is_new: true }, to: { is_new: false } })), add: p.copies.map((c) => ({ id: c.id, under: c.home.lego_id, copy_of: c.src_id })) } });
      await pg.query('BEGIN');
      try {
        const { rows: [ri0] } = await pg.query('SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1', [course]);
        for (const d of p.demote) {
          const b = p.before.lego[d.id];
          const r = await pg.query(`UPDATE course_legos SET is_new=false, last_edit_event_id=$1
            WHERE id=$2 AND course_code=$3 AND is_new AND known_text IS NOT DISTINCT FROM $4 AND target_text=$5 AND version=$6`,
          [event, d.id, course, b.known_text, b.target_text, b.version]);
          if (r.rowCount !== 1) throw new Error(`${course} ${d.lego_id}: before-state drifted (${r.rowCount} rows)`);
        }
        for (const c of p.copies) {
          const clash = await pg.query('SELECT 1 FROM course_practice_phrases WHERE id=$1 OR (course_code=$2 AND seed_number=$3 AND lego_index=$4 AND position=$5)', [c.id, course, c.home.seed_number, c.home.lego_index, c.position]);
          if (clash.rowCount) throw new Error(`${c.id}: slot taken — re-run the dry run`);
          const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
            SELECT $1, course_code, $2, $3, $4, known_text, target_text, word_count, lego_count, $5, status, 'use', '{}', $6, true, known_audio_id, target1_audio_id, target2_audio_id, $7
            FROM course_practice_phrases WHERE id=$8 AND known_text IS NOT DISTINCT FROM $9 AND target_text=$10`,
          [c.id, c.home.seed_number, c.home.lego_index, c.position, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, copy_of: c.src_id, why: 'canon P26: the seed sentence stays in a played basket' }), c.home.lego_id, event, c.src_id, c.known_text, c.target_text]);
          if (ins.rowCount !== 1) throw new Error(`${c.id}: source ${c.src_id} drifted`);
        }
        const { rows: [ri1] } = await pg.query('SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1', [course]);
        if (ri1.n !== ri0.n + p.copies.length) throw new Error(`${course}: phrase count ${ri0.n} → ${ri1.n}, expected +${p.copies.length} — refusing to shrink`);
        await pg.query('UPDATE courses SET version = version + 1 WHERE course_code=$1', [course]);   // is_new does not fire bump_course_version; clients key caches on it
        await pg.query('COMMIT');
      } catch (e) { await pg.query('ROLLBACK'); throw e; }
      log.courses[course] = { event, demoted: p.demote.map((d) => d.id), inserted: p.copies.map((c) => c.id), before_round_index: p.before.round_index_count };
      fs.mkdirSync(EVIDENCE, { recursive: true });
      fs.writeFileSync(path.join(EVIDENCE, `${SWEEP}-applied.json`), JSON.stringify(log, null, 1));   // written after EVERY course: a crash leaves an exact rollback log
    }
  } finally { await pg.end(); }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const check = new Client({ connectionString: databaseUrl() }); await check.connect();
  for (const [course, l] of Object.entries(log.courses)) {
    const { rows: [ri] } = await check.query('SELECT count(*)::int n FROM course_round_index WHERE course_code=$1', [course]);
    l.after_round_index = ri.n;
    if (ri.n !== l.before_round_index - l.demoted.length) console.error(`!! ${course}: round index ${l.before_round_index} → ${ri.n}, expected −${l.demoted.length}`);
  }
  await check.end();
  fs.writeFileSync(path.join(EVIDENCE, `${SWEEP}-applied.json`), JSON.stringify(log, null, 1));
  console.log(`APPLIED ${Object.keys(log.courses).length} courses. Audio: none needed (copies reuse their source clips). Log: ${path.join(EVIDENCE, `${SWEEP}-applied.json`)}`);
}

async function rollback(appliedFile) {
  const log = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
  if (log.mode !== 'APPLIED') throw new Error('PLAN must be the applied log');
  const plan = JSON.parse(fs.readFileSync(log.plan, 'utf8'));
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(`${SWEEP}-rollback`, { role: 'content-sweep' });
  const pg = new Client({ connectionString: databaseUrl() }); await pg.connect();
  try {
    for (const [course, l] of Object.entries(log.courses)) {
      const before = plan.courses[course].before;
      const event = await recordContentEdit(supabase, { identity, courseCode: course, surface: SURFACE, operation: 'lego-edit',
        scope: { lego_ids: l.demoted.map((id) => before.lego[id].lego_id), phrase_ids: l.inserted, rows: l.demoted.length + l.inserted.length }, detail: { job: JOB, rollback_of: l.event } });
      await pg.query('BEGIN');
      try {
        for (const id of l.inserted) {
          const r = await pg.query('DELETE FROM course_practice_phrases WHERE id=$1 AND last_edit_event_id=$2', [id, l.event]);
          if (r.rowCount !== 1) throw new Error(`${id}: changed since apply — not deleting`);
        }
        for (const id of l.demoted) {
          const b = before.lego[id];
          const r = await pg.query('UPDATE course_legos SET is_new=true, last_edit_event_id=$1 WHERE id=$2 AND NOT is_new AND last_edit_event_id=$3 AND target_text=$4', [b.last_edit_event_id, id, l.event, b.target_text]);
          if (r.rowCount !== 1) throw new Error(`${course} ${b.lego_id}: changed since apply — not restoring`);
        }
        await pg.query('UPDATE courses SET version = version + 1 WHERE course_code=$1', [course]);
        await pg.query('COMMIT');
      } catch (e) { await pg.query('ROLLBACK'); throw e; }
      console.log(`${course}: restored ${l.demoted.length} debuts, removed ${l.inserted.length} copies (event ${event})`);
    }
  } finally { await pg.end(); }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
}

async function main() {
  if (process.env.APPLY === '1') {
    if (!process.env.PLAN) throw new Error('APPLY needs PLAN=<dry-run json>');
    return apply(process.env.PLAN);
  }
  if (process.env.ROLLBACK === '1') {
    if (!process.env.PLAN) throw new Error('ROLLBACK needs PLAN=<applied json>');
    return rollback(process.env.PLAN);
  }
  return dryRun(process.argv.slice(2));
}

module.exports = { planCourse, excludedCourse, containsTarget, JUDGEMENT_HOLD };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
