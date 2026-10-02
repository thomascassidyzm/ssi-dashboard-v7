#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-italian-rules-apply-2026-10-02.cjs
//
// deu_for_eng — APPLY what is CLEARLY the same as Kai's Italian rulings (job #358, 2 Oct 2026), from the read-only
// scan d/b0b4596d (job #350). Everything not obviously the Italian fix, or that would break another canon rule, is
// HELD and listed in the report, never written here. Four classes are written:
//
//   E  a verb-final LEGO (du gesagt hast, ich dich sehen wollte, du es so gut machst …) used as a MAIN clause in a
//      phrase — broken German. The PHRASE is rewritten so the chunk follows its trigger (dass / was / weil / als /
//      nachdem), from words taught by that seed; the LEGO itself is not re-cut (K40 growth is Kai's call).
//   F  "would" after a past frame rendered as wollte ("wanted") — a meaning error. würde is taught (S0201L01
//      component, S0229); only the rows whose subject takes würde are changed — würden is first taught at S0557L02,
//      so the plural rows are held.
//   C  a word NO LEGO in the course teaches (Zeitung, dorthin, daran, richtig, stark) — P27 / the LEGO-vs-phrase
//      rule: the phrase is rewritten from taught words or deleted. Inflections of taught verbs are NOT touched
//      (Kai's standing note: tiny inflection differences are not defects).
//   A  P26: every seed sentence sits in a played basket — the Italian #635·I planner (`plan`, imported unchanged),
//      with the brief's extra HOLD: a seed that HAS a new LEGO of its own, none of whose pairs the sentence contains
//      (the LEGO's gloss is not the seed's wording — often only a contraction, "He is" vs "he's"), is listed rather
//      than parked under some other seed's LEGO. A bare fragment (P7: never a USE row) is listed too.
//
// AUDIO (the one route, Tom 2026-09-29): edited rows keep or re-link their clips through the phrase trigger (A5);
// any slot still empty is asked of POST /api/audio/render with dryRun:true — a library hit is linked (free,
// voice-bound to the course cast), a miss is COUNTED (characters) and left silent for Kai to approve. A row with a
// silent slot is skipped by the player (generateLearningScript.ts phraseHasFullAudio), so a fixed-but-silent row is
// never played wrong. Nothing here renders. P26 rows reuse the seed's own three clips.
//
// Seeds whose phrases are edited or deleted are unapproved (an edit, not a finding); P26 adds do not unapprove
// (P26: adding the seed's own sentence is not a word change). No LEGO is written, so intros cannot drift; the
// strict intro-mirror count is read before and after (INTRO_MIRROR_AT_EXIT=0 because the course already carries
// 1,518 pre-existing strict mismatches, which would fail any job's exit).
//
//   node tools/course-optimization/deu-italian-rules-apply-2026-10-02.cjs          # dry run (plan + guards)
//   APPLY=1 node tools/course-optimization/deu-italian-rules-apply-2026-10-02.cjs  # write E/F/C, then A, then audio
//   AUDIO_ONLY=1 …                                                                  # re-ask the route for empty slots

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
process.env.INTRO_MIRROR_AT_EXIT = '0';

const ITA = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');
const { CHANGES } = require('./deu-italian-rules-apply-2026-10-02.data.cjs');

const COURSE = 'deu_for_eng';
const SWEEP = 'deu-italian-rules-apply-2026-10-02';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#358';
const AGENT = 'deu-italian-rules-apply-#358';
const RULING = "Kai via job #358 (2026-10-02): apply to deu_for_eng what is clearly the same as the Italian rulings — E broken verb-final main clauses rewritten (K40's phrase half), F would→wollte to würde (future-in-the-past, meaning error), C untaught words rewritten/deleted (P27 / LEGO-vs-phrase), A seed sentences into played baskets (P26); everything else held";
const RENDER_URL = process.env.RENDER_URL || 'http://localhost:3470/api/audio/render';

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const { norm, containsWords } = ITA;
const SUBORDINATORS = new Set(['dass', 'was', 'warum', 'wenn', 'weil', 'ob', 'als', 'während', 'wie', 'bis', 'wo', 'wer', 'wann', 'nachdem', 'bevor', 'damit', 'obwohl', 'der', 'die', 'das', 'den', 'dem', 'worüber']);
/** E: does the phrase use a verb-final chunk as a main clause (nothing that selects verb-last in front of it)? */
function verbFinalAsMainClause(target, chunk) {
  const t = ' ' + norm(target) + ' ', c = ' ' + norm(chunk) + ' ';
  const i = t.indexOf(c); if (i < 0) return false;
  const before = t.slice(0, i).trim().split(' ').filter(Boolean);
  if (!before.length) return norm(target) !== norm(chunk); // the bare LEGO as its own build is the LEGO's question (held), not a phrase defect
  if (SUBORDINATORS.has(before[before.length - 1])) return false;
  // only an interjection or a bare subject pronoun in front: the chunk is standing as a main clause
  return before.length === 1 && /^(ja|nein|aber|und|also|er|sie|es|ich|du|wir|ihr)$/.test(before[0]);
}
/** F: English "would" over German wollte/wolltest/wollten with no würde. */
const wollteForWould = (known, target) => /\bwould\b/i.test(known) && /\bwollte\w*\b/i.test(target) && !/\bwürde\w*\b/i.test(target);
/** C: the five words no LEGO in deu_for_eng teaches (verified 2026-10-02 over every LEGO and component). */
const UNTAUGHT_LEXEMES = /(^|[^\p{L}])(zeitung|dorthin|daran|richtig|stark\p{L}*)(?=$|[^\p{L}])/iu;
const hasUntaughtLexeme = (target) => UNTAUGHT_LEXEMES.test(String(target || ''));
/** Is a given (before or after) text a defect of its class? */
function isDefect(cls, text, legoTarget) {
  if (cls === 'E') return verbFinalAsMainClause(text.target, legoTarget) || /\?\s*$/.test(text.known) && !/\?\s*$/.test(text.target);
  if (cls === 'F') return wollteForWould(text.known, text.target) || hasUntaughtLexeme(text.target);
  if (cls === 'C') return hasUntaughtLexeme(text.target);
  throw new Error(`class ${cls}`);
}
/**
 * A: the brief's hold on top of the Italian planner. A seed with a NEW LEGO of its own whose pair its sentence does
 * not contain is a "LEGO gloss ≠ seed wording" case: listed, never parked under another seed's LEGO. A sentence
 * that is a bare fragment (no finite clause: P7) is listed too.
 */
function p26Hold(row, legos) {
  const ownNew = legos.filter(l => l.seed_number === row.seed && l.is_new);
  if (!/^own last/.test(row.why) && ownNew.length) return `LEGO gloss ≠ seed wording: the seed's own new LEGO${ownNew.length > 1 ? 's' : ''} ${ownNew.map(l => `${l.lego_id} "${l.known_text} | ${l.target_text}"`).join(', ')} not contained in the sentence; the planner would park it under ${row.lego_id} "${row.lego_known}" (seed ${row.lego_seed})`;
  if (FRAGMENT_SEEDS.has(row.seed)) return 'the seed sentence is a fragment (P7: a fragment is never a USE row)';
  return null;
}
const FRAGMENT_SEEDS = new Set([639]); // "with you sir | mit Ihnen, mein Herr" — read by hand: the only fragment among the planned rows

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const { rows: seeds } = await pg.query('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number', [COURSE]);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index', [COURSE]);
  const { rows: phrases } = await pg.query(`SELECT p.id, p.seed_number, p.lego_index, p.position, p.phrase_role, p.known_text, p.target_text, p.known_audio_id, p.target1_audio_id, p.target2_audio_id, l.is_new, l.lego_id FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1`, [COURSE]);
  const first = { known: new Map(), target: new Map() };
  const feed = (side, n, text) => { for (const w of new Set(norm(text).split(' ').filter(Boolean))) { const m = first[side]; if (!m.has(w) || m.get(w) > n) m.set(w, n); } };
  for (const x of [...seeds, ...legos, ...phrases]) { feed('known', x.seed_number, x.known_text); feed('target', x.seed_number, x.target_text); }
  const wordTaught = (w, side) => first[side].has(w) ? first[side].get(w) : Infinity;
  return { seeds, legos, phrases, wordTaught };
}

function guardHand(db, problems) {
  const byId = Object.fromEntries(db.phrases.map(p => [p.id.replace(/^.*:/, ''), p]));
  const legoOf = (p) => db.legos.find(l => l.seed_number === p.seed_number && l.lego_index === p.lego_index);
  for (const c of CHANGES) {
    const p = byId[c.id];
    if (!p) { problems.push(`${c.id} not live`); continue; }
    if (p.known_text !== c.before.known || p.target_text !== c.before.target || p.phrase_role !== c.before.role) problems.push(`${c.id} reads "${p.known_text}" → "${p.target_text}" (${p.phrase_role}) — expected the planned before`);
    const l = legoOf(p); c.lego = { id: l.lego_id, known: l.known_text, target: l.target_text, is_new: l.is_new }; c.seed = p.seed_number;
    if (!isDefect(c.cls, c.before, l.target_text)) problems.push(`${c.id}: the before text is not a class-${c.cls} defect by the tool's own detector`);
    if (c.after) {
      if (isDefect(c.cls, c.after, l.target_text)) problems.push(`${c.id}: the after text is still a class-${c.cls} defect`);
      if (!containsWords(c.after.target, l.target_text)) problems.push(`${c.id}: after target does not contain ${l.lego_id} "${l.target_text}"`);
      for (const side of ['known', 'target']) {
        const u = [...new Set(norm(c.after[side]).split(' ').filter(Boolean))].filter(w => side === 'target' ? !legoOrComponentTaught(db, w, p.seed_number) : db.wordTaught(w, 'known') > p.seed_number);
        if (u.length) problems.push(`${c.id}: ${side} words not yet taught at seed ${p.seed_number}: ${u.join(', ')}`);
      }
    }
  }
  // ZUT (P16): an after English must not already stand over a different German anywhere (other than rows this pass rewrites)
  const rewritten = new Set(CHANGES.map(c => c.id));
  const idx = new Map();
  for (const x of [...db.legos.map(l => ({ id: l.lego_id, known_text: l.known_text, target_text: l.target_text })), ...db.phrases.filter(p => p.phrase_role !== 'component')]) {
    const id = x.id.replace(/^.*:/, ''); if (rewritten.has(id)) continue;
    const k = norm(x.known_text); if (!idx.has(k)) idx.set(k, []); idx.get(k).push({ id, t: norm(x.target_text) });
  }
  for (const c of CHANGES) if (c.after) for (const o of idx.get(norm(c.after.known)) || []) if (o.t !== norm(c.after.target)) problems.push(`${c.id}: ZUT — "${c.after.known}" already stands over "${o.t}" (${o.id})`);
}
function legoOrComponentTaught(db, w, n) {
  if (!db._lc) { db._lc = new Map(); const f = (seed, t) => { for (const x of new Set(norm(t).split(' ').filter(Boolean))) if (!db._lc.has(x) || db._lc.get(x) > seed) db._lc.set(x, seed); }; for (const l of db.legos) f(l.seed_number, l.target_text); for (const p of db.phrases) if (p.phrase_role === 'component') f(p.seed_number, p.target_text); }
  return db._lc.has(w) && db._lc.get(w) <= n;
}

function planP26(db) {
  const r = ITA.plan(db, { skip: [] });
  const rows = [], held = [...r.listed.map(l => ({ seed: l.seed, known: l.known, target: l.target, why: l.why }))];
  for (const x of r.rows) { const h = p26Hold(x, db.legos); if (h) held.push({ seed: x.seed, known: x.known, target: x.target, why: h }); else rows.push(x); }
  // re-sequence ids/positions per LEGO without the held rows
  const per = new Map();
  for (const p of db.phrases) { if (!per.has(p.lego_id)) per.set(p.lego_id, []); per.get(p.lego_id).push(p); }
  const pending = new Map();
  // ids are unique course-wide, and a rehomed row keeps its old id under another LEGO (S0190L03U05, 2026-10-02) — skip any taken id
  const taken = new Set([...db.phrases.map(p => p.id.replace(/^.*:/, '')), ...CHANGES.filter(c => !c.after).map(c => c.id)]); // a deleted row's id is never re-issued (S0266L01U08, 2026-10-02)
  for (const x of rows) {
    const lego = db.legos.find(l => l.lego_id === x.lego_id);
    const existing = [...(per.get(x.lego_id) || []), ...(pending.get(x.lego_id) || [])];
    const slot = ITA.nextUseSlot(lego, existing);
    let id = slot.id; while (taken.has(id)) id = id.replace(/U(\d+)$/, (m, n) => `U${String(+n + 1).padStart(2, '0')}`);
    taken.add(id); x.id = id; x.position = slot.position;
    if (!pending.has(x.lego_id)) pending.set(x.lego_id, []); pending.get(x.lego_id).push({ id: `${COURSE}:${x.id}`, position: x.position });
  }
  return { census: r.census, rows, held };
}

async function render(role, text, dryRun = true) {
  const res = await fetch(RENDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ courseCode: COURSE, role, text, purpose: `job ${JOB}: deu Italian-rule fixes (E/F/C) — slot emptied by a text fix`, dryRun, job: JOB }) });
  return res.json();
}

async function applyHand(pg, supabase, db, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const edits = CHANGES.filter(c => c.after), dels = CHANGES.filter(c => !c.after);
  const seeds = [...new Set(CHANGES.map(c => c.seed))].sort((a, b) => a - b);
  const approved = db.seeds.filter(s => seeds.includes(s.seed_number) && s.approved_at).map(s => ({ seed: s.seed_number, approved_at: s.approved_at }));
  const ev = {};
  ev.edit = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(edits.map(c => c.seed))], phrase_ids: edits.map(c => `${COURSE}:${c.id}`), rows: edits.length },
    detail: { ruling: RULING, job: JOB, changes: edits.map(c => ({ id: `${COURSE}:${c.id}`, class: c.cls, lego: c.lego.id, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target, why: c.why || null })) } });
  ev.del = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [...new Set(dels.map(c => c.seed))], phrase_ids: dels.map(c => `${COURSE}:${c.id}`), rows: dels.length },
    detail: { ruling: RULING, job: JOB, deleted: dels.map(c => ({ id: `${COURSE}:${c.id}`, class: c.cls, lego: c.lego.id, role: c.before.role, known: c.before.known, target: c.before.target, audio: (() => { const p = db.phrases.find(x => x.id === `${COURSE}:${c.id}`); return { known: p.known_audio_id, target1: p.target1_audio_id, target2: p.target2_audio_id }; })(), why: c.why })) } });
  ev.unapprove = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: approved.map(a => a.seed) },
    detail: { ruling: RULING, job: JOB, why: 'phrases of these seeds were edited or deleted (an edit unapproves; Kai 2026-08-11)', approved_at_before: approved } });
  log.events = ev; log.unapproved = approved;
  await pg.query('BEGIN');
  try {
    for (const c of edits) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now()
        WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`, [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, ev.edit, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: update ${u.rowCount}`);
    }
    for (const c of dels) {
      const d = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (d.rowCount !== 1) throw new Error(`${c.id}: delete ${d.rowCount}`);
    }
    if (approved.length) { const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [ev.unapprove, COURSE, approved.map(a => a.seed)]); if (un.rowCount !== approved.length) throw new Error(`unapprove ${un.rowCount}/${approved.length}`); }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}

async function applyP26(pg, supabase, rows, db, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const event = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: [...new Set(rows.map(r => r.lego_seed))].sort((a, b) => a - b), phrase_ids: rows.map(r => `${COURSE}:${r.id}`), rows: rows.length },
    detail: { ruling: RULING + ' — P26 part (Kai 2026-09-28, #635·I); seeds not unapproved (not a word change)', job: JOB, rows: rows.map(r => ({ id: `${COURSE}:${r.id}`, from_seed: r.seed, lego: r.lego_id, why: r.why, known: r.known, target: r.target })) } });
  log.events.p26 = event;
  await pg.query('BEGIN');
  try {
    for (const r of rows) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
        [`${COURSE}:${r.id}`, COURSE, r.lego_seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, seed_sentence_of: r.seed, why: r.why }), ITA.legoPosition(r.known, r.lego_known), r.lego_id, r.audio.known, r.audio.target1, r.audio.target2, event]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}

/** Every empty slot on the edited rows: library hit → link (free); miss → counted, left silent. Never renders. */
async function fillFromLibrary(pg, log) {
  const ids = CHANGES.filter(c => c.after).map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, ids]);
  log.audio = []; log.wouldRender = { clips: 0, chars: 0 };
  for (const r of rows) for (const [role, col, text] of [['known', 'known_audio_id', r.known_text], ['target1', 'target1_audio_id', r.target_text], ['target2', 'target2_audio_id', r.target_text]]) {
    if (r[col]) { log.audio.push({ id: r.id, role, result: 'kept/re-linked by the phrase trigger', audioId: r[col] }); continue; }
    const out = await render(role, text, true);
    const entry = { id: r.id, role, text, route: out.source || out.code || out.error };
    if (out.ok && out.source === 'library' && out.audioId) {
      const u = await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id=$3 AND ${col} IS NULL AND ${role === 'known' ? 'known_text' : 'target_text'}=$4`, [out.audioId, COURSE, r.id, text]);
      entry.result = u.rowCount === 1 ? `linked library clip ${out.audioId}` : `library clip ${out.audioId} NOT linked (slot moved)`;
    } else if (out.ok && out.source === 'would-render') { entry.result = `WOULD RENDER ${out.wouldSpendChars} chars — left silent for Kai`; log.wouldRender.clips++; log.wouldRender.chars += out.wouldSpendChars || text.length; }
    else entry.result = `route said: ${JSON.stringify(out).slice(0, 200)}`;
    log.audio.push(entry);
  }
}

async function introMirrorStrict() {
  const { spawnSync } = require('child_process');
  const out = spawnSync(process.execPath, [path.join(__dirname, '..', 'check-intro-mirror.cjs'), COURSE, '--strict'], { encoding: 'utf8', env: { ...process.env, INTRO_MIRROR_AT_EXIT: '0' } });
  const m = /STRICT: (\d+) row/.exec(out.stdout + out.stderr); return m ? +m[1] : (/(0 MISMATCH|no row)/i.test(out.stdout) ? 0 : null);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [] };
  const done = async (code) => {
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : process.env.AUDIO_ONLY ? 'audio' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    await pg.end(); process.exit(code);
  };
  if (process.env.AUDIO_ONLY === '1') { await fillFromLibrary(pg, log); console.log(JSON.stringify(log.wouldRender)); return done(0); }

  console.log(`\n══ ${COURSE} — Italian-rule fixes (job ${JOB}) — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  let db = await load(pg);
  const P26_ONLY = process.env.P26_ONLY === '1'; // after the hand changes are live (their befores no longer read)
  if (!P26_ONLY) guardHand(db, log.problems);
  const byCls = {}; for (const c of CHANGES) byCls[c.cls + (c.after ? ' edit' : ' delete')] = (byCls[c.cls + (c.after ? ' edit' : ' delete')] || 0) + 1;
  if (!P26_ONLY) console.log('HAND CHANGES', JSON.stringify(byCls));
  for (const c of CHANGES) console.log(`  ${c.cls} ${c.id} "${c.before.known}" → "${c.before.target}"  ⇒  ${c.after ? `"${c.after.known}" → "${c.after.target}"` : 'DELETE'}`);
  if (log.problems.length) { console.log('\nPROBLEMS:\n  ' + log.problems.join('\n  ')); return done(2); }
  log.introMirrorBefore = await introMirrorStrict(); console.log(`intro-mirror strict before: ${log.introMirrorBefore}`);

  log.events = {};
  if (APPLY && !P26_ONLY) {
    await applyHand(pg, supabase, db, log);
    console.log(`APPLIED hand changes; events ${JSON.stringify(log.events)}; unapproved ${log.unapproved.length} seeds: ${log.unapproved.map(a => a.seed).join(',')}`);
    db = await load(pg);
  }
  const p = planP26(APPLY ? db : db);
  log.p26 = { census: p.census, planned: p.rows.length, held: p.held };
  const why = {}; for (const r of p.rows) { const k = r.why.replace(/ \(.*$/, ''); why[k] = (why[k] || 0) + 1; }
  console.log(`\nP26: ${JSON.stringify(p.census)}\n  planned ${p.rows.length} ${JSON.stringify(why)}; held ${p.held.length}`);
  for (const h of p.held) console.log(`  HELD seed ${h.seed} "${h.known}" → "${h.target}": ${h.why.slice(0, 220)}`);
  for (const r of p.rows) {
    r.audio = { known: r.audio.known, target1: r.audio.target1, target2: r.audio.target2 };
    if (!r.audio.known || !r.audio.target1 || !r.audio.target2) log.problems.push(`P26 seed ${r.seed}: the seed lacks a clip — ${JSON.stringify(r.audio)}`);
  }
  log.p26.rows = p.rows.map(r => ({ id: r.id, seed: r.seed, lego: r.lego_id, why: r.why, known: r.known, target: r.target }));
  if (APPLY && !log.problems.length) {
    await applyP26(pg, supabase, p.rows, db, log); console.log(`APPLIED P26: ${p.rows.length} rows, event ${log.events.p26}`);
    const { refreshNow } = require('../../services/shared/round-index-refresh.cjs'); await refreshNow();
    await fillFromLibrary(pg, log);
    const linked = log.audio.filter(a => /^linked/.test(a.result || '')).length;
    console.log(`AUDIO: ${linked} slots linked from the library; ${log.wouldRender.clips} slots would need a render (${log.wouldRender.chars} chars) — left silent`);
    const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
    log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: ${CHANGES.filter(c => c.after).length} phrases rewritten (E/F/C); ${log.wouldRender.clips} slots silent pending Kai's spend approval (${log.wouldRender.chars} chars)`, metadata: { job: JOB } });
    log.introMirrorAfter = await introMirrorStrict(); console.log(`intro-mirror strict after: ${log.introMirrorAfter}`);
    if (log.introMirrorAfter !== null && log.introMirrorBefore !== null && log.introMirrorAfter > log.introMirrorBefore) log.problems.push(`intro-mirror strict rose ${log.introMirrorBefore} → ${log.introMirrorAfter}`);
  }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nno problems');
  return done(log.problems.length ? 2 : 0);
}

module.exports = { verbFinalAsMainClause, wollteForWould, hasUntaughtLexeme, isDefect, p26Hold, CHANGES };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
