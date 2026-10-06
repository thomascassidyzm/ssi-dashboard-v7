#!/usr/bin/env node
'use strict';
// tools/course-optimization/p26-early-placement-sweep-2026-10-06.cjs
//
// Cross-course repair of one defect of the P26 pass (canon P26: each seed's own sentence added as a USE row under a
// NEW LEGO). Job #363 for Kai, 2026-10-06, generalising #327·K's deu fix (planP26Moves in
// deu-deborah-oct-findings-2026-10-06.cjs on branch cs/327-deu-deborah-oct-findings).
//
// THE DEFECT. The P26 home-picker (chooseHome in ita-seed-sentences-in-played-baskets-2026-09-28.cjs and its copies)
// required the seed sentence to contain a LEGO on BOTH sides. When the seed's English was contracted ("she's worried"
// against the LEGO's "is worried"), its later LEGO failed the known-side test and the row was filed under an EARLIER
// LEGO of the seed — or, when no own LEGO passed, under another seed's LEGO. A seed sentence tiles its own seed's
// LEGOs, so filed before the seed's last NEW LEGO it plays before that LEGO teaches its words.
//
// THE RULE APPLIED (P2 + P25 + P17):
//   home(row) = the seed's own NEW LEGO that plays last (round order). Never a not-new LEGO (P25: its basket never plays).
//   A row already under home → fine.
//   EARLY   — under an own LEGO that plays before home.
//   FOREIGN — under another seed's LEGO (the brief counts these whatever their round).
//   A flagged row MOVES (same text, same clips, new id under home) only when it is clear:
//     • home's TARGET text is in the sentence (word multiset — the gate's "phrase contains its LEGO", P17; the known
//       side is the contraction this defect is made of, so it is not asked);
//     • at home the sentence uses no untaught target word it does not already use where it sits (first introduction
//       by (seed, lego_index), the unintroduced-word-detector's rule) — a move may never ADD an early word; words a
//       later seed teaches stay early either way and are reported (#327·K moved S0122 "fängt" the same way);
//     • the source basket keeps a real practice phrase (debut_keeps_practice would refuse otherwise);
//     • the same holds on the KNOWN side (the known side is a controlled language too) — it only bites on a move to
//       an EARLIER round, i.e. a row the P26 picker parked under a later seed's LEGO;
//     • home holds no row with the same two sides already, and home is not itself the whole sentence (then the row
//       is redundant — a delete is Kai's call, not a move);
//     • the row still says its seed's sentence (a seed re-texted since P26 makes the row someone else's question).
//   Anything else is HELD and listed for Kai with the reason. A seed with no NEW LEGO of its own has no home → held.
//   For fra_for_eng (job #329·K is editing text there) this tool only ever moves; it never edits text anywhere.
//
// Moves change no wording, so no seed is unapproved (no trigger on course_practice_phrases unapproves either).
//
//   node tools/course-optimization/p26-early-placement-sweep-2026-10-06.cjs [course,...]          # report; exit 2 while a clear move stands
//   OUT=/path.json node …                                                                         # full JSON (flagged, held, word hits)
//   APPLY=1 node … <course>                                                                       # move the clear cases, then report
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const SWEEP = 'p26-early-placement-sweep-2026-10-06';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#363';
const COURSES = ['deu_for_eng', 'fra_for_eng', 'ita_for_eng', 'spa_for_eng', 'por_for_eng', 'por_br_for_eng'];

// ── pure helpers (the test exercises these) ──────────────────────────────────────────
// tokenizer = unintroduced-word-detector's (the gate's normaliser plus the marks it leaves attached)
let normalizeForContainment;
try { ({ normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs')); } catch { normalizeForContainment = (s) => String(s).toLowerCase().replace(/[.,!?;:¿¡()]/g, ' ').replace(/\s+/g, ' ').trim(); }
const words = (t) => normalizeForContainment(String(t || '').replace(/[’‘]/g, "'").replace(/[։।॥…"“”„«»]/g, ' ').replace(/[–—]/g, ' ')).replace(/(^|\s)'+|'+(\s|$)/g, ' ').split(' ').filter(Boolean);
function containsWords(hay, needle) {
  const bag = new Map(); for (const w of words(hay)) bag.set(w, (bag.get(w) || 0) + 1);
  const n = words(needle); if (!n.length) return false;
  for (const w of n) { const c = bag.get(w) || 0; if (!c) return false; bag.set(w, c - 1); }
  return true;
}
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
const sidOf = (course, id) => id.slice(course.length + 1);
const legoOf = (sid) => sid.slice(0, 8);
const pairKey = (k, t) => `${words(k).join(' ')}|${words(t).join(' ')}`;

/** first introduction of every target word: [seed, lego_index] of the earliest LEGO (or M-component) containing it */
function firstIntro(legos) {
  const first = new Map();
  for (const l of legos) {
    const texts = [l.target_text];
    if (l.type === 'M' && Array.isArray(l.components)) for (const c of l.components) if (c && c.target) texts.push(c.target);
    for (const t of texts) for (const w of words(t)) { const pos = [l.seed_number, l.lego_index]; if (!first.has(w) || before(pos, first.get(w))) first.set(w, pos); }
  }
  return first;
}
const untaughtAt = (text, lego, first) => [...new Set(words(text))].filter((w) => !first.has(w) || before([lego.seed_number, lego.lego_index], first.get(w)));
/** known-side first introduction, the same way, over LEGO known texts */
function firstIntroKnown(legos) {
  const first = new Map();
  for (const l of legos) for (const w of words(l.known_text)) { const pos = [l.seed_number, l.lego_index]; if (!first.has(w) || before(pos, first.get(w))) first.set(w, pos); }
  return first;
}
// Read by hand on 2026-10-06 and held: the rule would move them, but the move is not clear.
const HOLD = {
  'spa_for_eng:S0642L01U06': 'seed 653 says "madam" but its only LEGO is glossed "does it matter to you sir" (K32) — the gloss, not the row, is the question',
};
const ord = (l) => (l.round_index != null ? l.round_index : l.seed_number * 100 + l.lego_index); // round order; (seed, index) if the view lacks it

/**
 * Classify every P26 seed-sentence row. legos: course_legos rows (+round_index); phrases: every phrase row of the course
 * (id = short sid); p26: the subset that are P26 seed-sentence rows. Returns { ok, moves, held }.
 */
function plan({ course, legos, phrases, p26, seeds }) {
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const first = firstIntro(legos), firstK = firstIntroKnown(legos);
  const basket = new Map(); for (const p of phrases) { const k = legoOf(p.id); (basket.get(k) || basket.set(k, []).get(k)).push(p); }
  const leaving = new Map(); // source lego → rows planned out of it
  const ok = [], moves = [], held = [];
  for (const r of p26) {
    const seed = r.seed_sentence_of;
    const cur = byId.get(legoOf(r.id));
    const ownNew = legos.filter((l) => l.seed_number === seed && l.is_new).sort((a, b) => ord(a) - ord(b));
    const home = ownNew[ownNew.length - 1];
    const base = { id: r.id, seed, from: cur.lego_id, fromLego: `${cur.known_text} | ${cur.target_text}`, known: r.known_text, target: r.target_text, untaughtHere: untaughtAt(r.target_text, cur, first) };
    if (home && home.lego_id === cur.lego_id) { ok.push(base); continue; }
    const kind = cur.seed_number !== seed ? (home && ord(cur) > ord(home) ? 'foreign-later' : 'foreign-earlier') : 'early';
    const f = { ...base, kind };
    if (!home) { held.push({ ...f, why: `seed ${seed} has no NEW LEGO of its own (P25: never under a not-new LEGO)` }); continue; }
    f.to = home.lego_id; f.toLego = `${home.known_text} | ${home.target_text}`;
    if (!containsWords(r.target_text, home.target_text)) { held.push({ ...f, why: `the seed's last new LEGO ${home.lego_id} "${home.target_text}" is in the sentence only inflected or split (P17)` }); continue; }
    const still = untaughtAt(r.target_text, home, first);
    const added = still.filter((w) => !base.untaughtHere.includes(w));
    if (added.length) { held.push({ ...f, why: `under ${home.lego_id} it would use ${added.join(', ')} before it is taught` }); continue; }
    f.untaughtAtHome = still;
    const addedK = untaughtAt(r.known_text, home, firstK).filter((w) => !untaughtAt(r.known_text, cur, firstK).includes(w));
    if (addedK.length) { held.push({ ...f, why: `under ${home.lego_id} the English would use ${addedK.join(', ')} before it is taught` }); continue; }
    if (words(home.target_text).join(' ') === words(r.target_text).join(' ')) { held.push({ ...f, why: `${home.lego_id} is itself the whole sentence, so the row is redundant there (delete is Kai's call)` }); continue; }
    if (seeds && seeds.has(seed) && words(seeds.get(seed)).join(' ') !== words(r.target_text).join(' ')) { held.push({ ...f, why: `seed ${seed} now reads "${seeds.get(seed)}", not the row's text` }); continue; }
    if (HOLD[`${course}:${r.id}`]) { held.push({ ...f, why: HOLD[`${course}:${r.id}`] }); continue; }
    const dup = (basket.get(home.lego_id) || []).find((p) => pairKey(p.known_text, p.target_text) === pairKey(r.known_text, r.target_text));
    if (dup) { held.push({ ...f, why: `${dup.id} under ${home.lego_id} already says the same on both sides (a delete, not a move)` }); continue; }
    if (cur.is_new) {
      const out = [...(leaving.get(cur.lego_id) || []), r.id];
      const remain = (basket.get(cur.lego_id) || []).filter((p) => !out.includes(p.id) && (p.phrase_role === 'build' || p.phrase_role === 'use') && pairKey(p.known_text, p.target_text) !== pairKey(cur.known_text, cur.target_text));
      if (!remain.length) { held.push({ ...f, why: `${cur.lego_id} would be left with no practice phrase (debut_keeps_practice)` }); continue; }
      leaving.set(cur.lego_id, out);
    }
    moves.push(f);
  }
  return { ok, moves, held };
}

function nextFreeId(lego, role, liveIds, everUsed) {
  const L = role === 'build' ? 'B' : 'U';
  for (let n = 1; n < 100; n++) { const id = `${lego}${L}${String(n).padStart(2, '0')}`; if (!liveIds.has(id) && !everUsed.has(id)) return id; }
  throw new Error(`no free id in ${lego}`);
}

// ── DB ──────────────────────────────────────────────────────────────────────────────
async function load(pg, course) {
  const { rows: legos } = await pg.query(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.type, l.components, l.known_text, l.target_text, r.round_index FROM course_legos l LEFT JOIN course_round_index r ON r.course_code=l.course_code AND r.lego_id=l.lego_id WHERE l.course_code=$1`, [course]);
  const { rows: raw } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1', [course]);
  const phrases = raw.map((p) => ({ ...p, id: sidOf(course, p.id), full_id: p.id }));
  const p26 = phrases.filter((p) => p.phrase_role === 'use' && p.metadata && p.metadata.seed_sentence_of != null).map((p) => ({ ...p, seed_sentence_of: Number(p.metadata.seed_sentence_of) }));
  const { rows: sr } = await pg.query('SELECT seed_number, target_text FROM course_seeds WHERE course_code=$1', [course]);
  return { course, legos, phrases, p26, seeds: new Map(sr.map((x) => [x.seed_number, x.target_text])) };
}

async function everUsedIds(pg, course) {
  const { rows } = await pg.query('SELECT scope, detail FROM content_edit_events WHERE course_code=$1', [course]);
  const s = new Set(); const re = /S\d{4}L\d{2}[BU]\d{2}/g;
  for (const r of rows) for (const m of JSON.stringify([r.scope, r.detail]).match(re) || []) s.add(m);
  return s;
}

async function apply(pg, course, db, moves) {
  if (!moves.length) return [];
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const byId = new Map(db.phrases.map((p) => [p.id, p])); const legoById = new Map(db.legos.map((l) => [l.lego_id, l]));
  const used = await everUsedIds(pg, course); const live = new Set(db.phrases.map((p) => p.id));
  for (const m of moves) {
    m.row = byId.get(m.id);
    m.toId = nextFreeId(m.to, m.row.phrase_role, live, used); live.add(m.toId); used.add(m.toId);
    m.position = Math.max(0, ...db.phrases.filter((p) => legoOf(p.id) === m.to).map((p) => p.position || 0), ...moves.filter((x) => x.to === m.to && x.position).map((x) => x.position)) + 1;
  }
  const ev = await recordContentEdit(supabase, { identity, courseCode: course, surface: SURFACE, operation: 'phrase-move', scope: { seed_numbers: [...new Set(moves.map((m) => m.seed))], phrase_ids: moves.flatMap((m) => [`${course}:${m.id}`, `${course}:${m.toId}`]), rows: moves.length }, detail: { job: JOB, why: 'P26 seed-sentence row filed before (or outside) its seed\'s last new LEGO; moved there, text and clips unchanged', moves: moves.map((m) => ({ from: m.id, to: m.toId, kind: m.kind, known: m.row.known_text, target: m.row.target_text, audio: { known: m.row.known_audio_id, target1: m.row.target1_audio_id, target2: m.row.target2_audio_id } })) } });
  await pg.query('BEGIN');
  try {
    for (const m of moves) {
      const r = m.row, to = legoById.get(m.to);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, introduce, last_edit_event_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [`${course}:${m.toId}`, course, to.seed_number, to.lego_index, m.position, r.known_text, r.target_text, r.word_count, r.lego_count, r.difficulty, r.register, JSON.stringify({ ...(r.metadata || {}), moved_from: m.id, moved_by: `${SWEEP} ${JOB}`, move_why: `P26 row ${m.kind}: home is ${m.to}, the seed's last new LEGO` }), r.status, r.release_batch, r.target_syllable_count, r.phrase_role, r.connected_lego_ids, null, r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.target1_duration_ms, r.target2_duration_ms, m.to, r.target_text_roman, r.introduce, ev]);
      if (ins.rowCount !== 1) throw new Error(`${m.toId}: insert`);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [course, r.full_id, r.known_text, r.target_text]);
      if (del.rowCount !== 1) throw new Error(`${m.id}: delete ${del.rowCount}`);
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  return moves.map((m) => `${m.id} → ${m.toId}`);
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const courses = process.argv[2] ? process.argv[2].split(',') : COURSES;
  const out = {}; let applied = false, open = 0;
  try {
    for (const c of courses) {
      let db = await load(pg, c); let res = plan(db);
      if (process.env.APPLY === '1' && res.moves.length) {
        out[`${c}:applied`] = await apply(pg, c, db, res.moves); applied = true;
        db = await load(pg, c); res = plan(db);
      }
      const k = (xs, kind) => xs.filter((x) => x.kind === kind).length;
      const wordEarly = db.p26.filter((r) => res.ok.concat(res.moves, res.held).find((x) => x.id === r.id).untaughtHere.length).length;
      console.log(`${c.padEnd(15)} P26 rows ${String(db.p26.length).padStart(3)}  at home ${String(res.ok.length).padStart(3)}  clear moves ${String(res.moves.length).padStart(3)} (early ${k(res.moves, 'early')}, foreign ${res.moves.length - k(res.moves, 'early')})  held ${String(res.held.length).padStart(2)} (early ${k(res.held, 'early')}, foreign ${res.held.length - k(res.held, 'early')})  word-level early ${wordEarly}`);
      out[c] = { p26: db.p26.length, ok: res.ok.length, moves: res.moves, held: res.held, wordEarly: db.p26.filter((r) => (res.ok.concat(res.moves, res.held).find((x) => x.id === r.id).untaughtHere.length)).map((r) => r.id) };
      open += res.moves.length;
    }
    if (applied) await require('../../services/shared/round-index-refresh.cjs').refreshNow();
    if (process.env.OUT) require('fs').writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
    process.exitCode = open ? 2 : 0;
  } finally { await pg.end(); }
}
module.exports = { plan, containsWords, words, firstIntro, untaughtAt, nextFreeId };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
