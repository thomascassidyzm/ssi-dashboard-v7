#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-lego-downstream-audit-2026-09-28.cjs
//
// ita_for_eng — Kai's ruling, 2026-09-28 19:30Z: whenever a LEGO changes, ALL LATER phrases must be
// checked for knock-on; where that was not done, go back over every change. This is that pass for every
// LEGO changed on 2026-09-27/28 (jobs #572/#573/#574/#576/#577/#579/#559/#543/#520/#522/#529 and group A).
//
// The change list is read from the LIVE record (content_edit_events), never from memory: every event shape
// the day's tools wrote (edits[], from/to, changes[].legos.update, known_from/known_to, legos[]) is folded
// into one before→after per LEGO, and the AFTER is checked against the live course_legos row.
//
// For each changed LEGO (old pair → new pair) the audit reads every row LATER in the course:
//   C  old target chunk still used later when the old target is NOT inside the new one (a moved piece);
//   C2 expanded LEGOs (old target inside new): later rows using the old sub-chunk WITHOUT the new frame,
//      and whether any other LEGO still teaches the sub-chunk on its own;
//   D  old known gloss still over the same target in a later row (O12 — "make them match the new gloss");
//   E  any intro in the course quoting the old known text;
//   F  every non-component row under the changed LEGO contains it on both sides (P17/O12);
//   A/B pair groups course-wide: first occurrence is_new, later ones not-new (duplicate = BOTH sides match,
//      Kai 2026-09-23), and every not-new LEGO has an earlier exact pair.
// Noun-subject rows under a K28 LEGO ("the children were tired | i bambini erano stanchi" under "they were
// tired") are NOT findings: one Italian under two Englishes is not a defect (Kai, 2026-09-28).
//
// WHAT IT FIXES (APPLY=1): the one clear-cut knock-on the audit found — S0261L01B01 "I think | penso che",
// the bare-fragment build row under S0261L01, which #520·I re-glossed to "I think that | penso che" and
// whose B02 already carries the new gloss word for word. The stale row goes; the row that already matches
// stays with its clips (a phrase may go, a LEGO never — Kai, 2026-09-23). This also removes one strict ZUT
// conflict ("i think" → penso / penso che): 57 → 56. Seed 261 is already unapproved (#577·I).
// Everything else the audit surfaced is a taste call and is published for Kai, not applied.
//
//   node tools/course-optimization/ita-lego-downstream-audit-2026-09-28.cjs            # audit, read-only
//   APPLY=1 node tools/course-optimization/ita-lego-downstream-audit-2026-09-28.cjs    # + the one fix
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#591·I';
const SWEEP = 'ita-lego-downstream-audit-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const SINCE = '2026-09-27';
const RULING = 'Kai, 2026-09-28 19:30Z: whenever a LEGO changes, all later phrases are checked for knock-on; a build row that still carries the pre-change gloss of its own LEGO is stale and goes when a sibling row already carries the new gloss word for word';

const norm = (s) => (s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.?!,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
const containsWords = (hay, needle) => !!needle && (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');
const pairKey = (k, t) => norm(k) + ' || ' + norm(t);
const legoIdOf = (seed, idx) => `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`;
const pos = (seed, idx, p = 0) => seed * 1e6 + idx * 1e3 + p;
const isComponent = (row) => row.phrase_role === 'component' || /C\d\d$/.test(row.id);

/** Build rows at the LEGO's own level (target == LEGO target, no extra words) whose English no longer says what the LEGO says. */
function staleBareFragments(lego, rows) {
  return rows.filter((r) => !isComponent(r) && norm(r.target_text) === norm(lego.target_text) && norm(r.known_text) !== norm(lego.known_text));
}
/** The stale row goes only when another row under the same LEGO already carries the LEGO's pair word for word; else it is a rewrite, not a delete. */
function rowToDrop(lego, rows) {
  const stale = staleBareFragments(lego, rows);
  const keeper = rows.find((r) => !isComponent(r) && norm(r.known_text) === norm(lego.known_text) && norm(r.target_text) === norm(lego.target_text));
  if (stale.length !== 1 || !keeper) return null;
  return { drop: stale[0], keep: keeper };
}

/** Fold every 2026-09-28 event shape into one before→after per LEGO. */
function foldChanges(events, liveLegos) {
  const chain = {};
  const rec = (id, b, a, surface) => {
    if (!id || !b || !a) return;
    const c = chain[id] || (chain[id] = { id, seed: +id.slice(1, 5), first: { known: b.known, target: b.target }, ops: [] });
    c.last = { known: a.known, target: a.target };
    c.ops.push(surface.replace('tools/course-optimization/', '').replace('-2026-09-28.cjs', ''));
  };
  for (const e of events) {
    const d = e.detail || {}, sc = e.scope || {};
    const single = Array.isArray(sc.lego_ids) && sc.lego_ids.length === 1 ? sc.lego_ids[0] : null;
    if (Array.isArray(d.from) && Array.isArray(d.to)) { // seed re-cut: arrays by idx
      const seed = sc.seed_numbers[0]; const F = Object.fromEntries(d.from.map((x) => [x.idx, x]));
      for (const t of d.to) rec(legoIdOf(seed, t.idx), F[t.idx] || { known: null, target: null }, t, e.surface);
    } else if (d.from && d.to && d.from.known !== undefined) rec(d.to.id || d.from.id || single, d.from, d.to, e.surface);
    else if (d.edits) for (const x of d.edits) rec(x.id, x.before, x.after, e.surface);
    else if (d.changes && d.changes[0] && d.changes[0].legos) for (const ch of d.changes) for (const u of ch.legos.update) rec(legoIdOf(ch.seed, u.idx), u.from, u.to, e.surface);
    else if (d.changes && d.changes[0] && d.changes[0].known_from !== undefined) for (const c of d.changes) { if (c.kind === 'components') continue; rec(c.id, { known: c.known_from, target: c.target }, { known: c.known_to, target: c.target }, e.surface); }
    else if (d.legos && d.legos[0] && d.legos[0].known_from !== undefined) for (const c of d.legos) { const L = liveLegos[c.id]; if (L) rec(c.id, { known: c.known_from, target: L.target_text }, { known: c.known_to, target: L.target_text }, e.surface); }
  }
  return Object.values(chain).map((c) => {
    const L = liveLegos[c.id];
    const now = L ? { known: L.known_text, target: L.target_text, is_new: L.is_new } : null;
    return { ...c, now, net: !!now && pairKey(c.first.known, c.first.target) !== pairKey(now.known, now.target), liveDiffersFromLastEvent: !!now && pairKey(c.last.known, c.last.target) !== pairKey(now.known, now.target) };
  }).sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id));
}

function audit({ legos, phrases, changes }) {
  const out = { A: [], B: [], C: [], C2: [], D: [], E: [], F: [] };
  const groups = {};
  for (const l of legos) (groups[pairKey(l.known_text, l.target_text)] ||= []).push(l);
  const changedIds = new Set(changes.map((c) => c.id));
  for (const [k, g] of Object.entries(groups)) if (g.some((l, i) => (i === 0 ? !l.is_new : l.is_new))) out.A.push({ pair: k, legos: g.map((l) => l.lego_id + (l.is_new ? '(new)' : '(notnew)')), touchesChange: g.some((l) => changedIds.has(l.lego_id)) });
  for (const l of legos) if (!l.is_new && groups[pairKey(l.known_text, l.target_text)][0].lego_id === l.lego_id) out.B.push({ id: l.lego_id, known: l.known_text, target: l.target_text, touchesChange: changedIds.has(l.lego_id) });
  const later = (c) => (r) => pos(r.seed_number, r.lego_index, r.position || 0) > pos(c.seed, +c.id.slice(6));
  for (const c of changes) {
    if (!c.net) continue;
    const ot = c.first.target, nt = c.now.target, ok = c.first.known, nk = c.now.known;
    if (ot && norm(ot) !== norm(nt)) {
      if (!containsWords(nt, ot)) out.C.push({ id: c.id, old: c.first, now: c.now, laterPhrases: phrases.filter(later(c)).filter((p) => containsWords(p.target_text, ot)).length, laterLegos: legos.filter(later(c)).filter((l) => containsWords(l.target_text, ot)).map((l) => `${l.lego_id} "${l.known_text}"`) });
      else out.C2.push({ id: c.id, old: c.first, now: c.now, otherLegoTeachingSubChunk: legos.filter((l) => l.lego_id !== c.id && norm(l.target_text) === norm(ot)).map((l) => l.lego_id), laterRowsSubChunkOutsideFrame: phrases.filter(later(c)).filter((p) => !isComponent(p) && containsWords(p.target_text, ot) && !containsWords(p.target_text, nt)).map((p) => `${p.id} ${p.known_text} | ${p.target_text}`) });
    }
    if (ok && norm(ok) !== norm(nk)) {
      const t = norm(ot) === norm(nt) ? nt : ot;
      const rows = [...phrases, ...legos.map((l) => ({ ...l, id: l.lego_id, position: 0 }))].filter((r) => r.id !== c.id).filter(later(c)).filter((r) => containsWords(r.known_text, ok) && !containsWords(r.known_text, nk) && containsWords(r.target_text, t));
      if (rows.length) out.D.push({ id: c.id, old: c.first, now: c.now, rows: rows.length, sample: rows.slice(0, 5).map((r) => `${r.id} ${r.known_text} | ${r.target_text}`) });
      for (const l of legos) if (l.intro && l.lego_id !== c.id && l.intro.toLowerCase().includes(`'${ok.toLowerCase()}'`)) out.E.push({ lego: l.lego_id, intro: l.intro, old: ok, now: nk });
    }
    const L = legos.find((l) => l.lego_id === c.id);
    for (const p of phrases.filter((p) => p.seed_number === c.seed && p.lego_index === +c.id.slice(6) && !isComponent(p))) {
      const okT = containsWords(p.target_text, L.target_text) || (/dire$/.test(L.target_text) && containsWords(p.target_text.replace(/\bdir(lo|la|li|le|mi|ti|ci|vi|gli)\b/g, 'dire'), L.target_text)); // L28: dire + clitic
      const okK = containsWords(p.known_text, L.known_text);
      if (!okT || !okK) out.F.push({ id: p.id, lego: c.id, legoKnown: L.known_text, legoTarget: L.target_text, known: p.known_text, target: p.target_text, miss: `${okK ? '' : 'known '}${okT ? '' : 'target'}`.trim() });
    }
  }
  return out;
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const legos = (await pg.query(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.components, a.text AS intro FROM course_legos l LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id WHERE l.course_code=$1 ORDER BY seed_number, lego_index`, [COURSE])).rows;
  const phrases = (await pg.query(`SELECT id, seed_number, lego_index, position, known_text, target_text, phrase_role FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number, lego_index, position`, [COURSE])).rows;
  const events = (await pg.query(`SELECT occurred_at, surface, operation, scope, detail FROM content_edit_events WHERE course_code=$1 AND occurred_at >= $2 AND (operation LIKE '%lego%' OR operation='seed-edit') ORDER BY occurred_at`, [COURSE, SINCE])).rows;
  const live = Object.fromEntries(legos.map((l) => [l.lego_id, l]));
  const changes = foldChanges(events, live);
  console.log(`[${SWEEP}] ${COURSE}: ${legos.length} LEGOs, ${phrases.length} phrases, ${events.length} lego events since ${SINCE} → ${changes.length} changed LEGOs (${changes.filter((c) => c.net).length} net-changed)`);
  for (const c of changes) console.log(`  ${c.net ? '*' : ' '} ${c.id} ${c.now?.is_new ? 'new' : 'nn '} [${c.first.known} | ${c.first.target}] -> [${c.now?.known} | ${c.now?.target}] (${[...new Set(c.ops)].join(',')})${c.liveDiffersFromLastEvent ? '  !! live differs from last event' : ''}`);
  const r = audit({ legos, phrases, changes });
  const show = (k, title) => { console.log(`\n=== ${k}. ${title}: ${r[k].length}`); for (const x of r[k]) console.log('  ' + JSON.stringify(x)); };
  show('A', 'pair groups with is_new out of order (course-wide; touchesChange marks today\'s LEGOs)');
  show('B', 'not-new LEGOs with no earlier exact pair');
  show('C', 'moved target piece still used later');
  show('C2', 'expanded LEGO: later rows using the sub-chunk outside the new frame');
  show('D', 'old known gloss still over the same target later (noun-subject rows under K28 LEGOs are by ruling)');
  show('E', 'intros quoting an old known text');
  show('F', 'rows under a changed LEGO that do not contain it');
  // The one clear-cut fix.
  const lego = live['S0261L01'];
  const under = phrases.filter((p) => p.seed_number === 261 && p.lego_index === 1);
  const plan = rowToDrop(lego, under);
  console.log(`\nFIX: S0261L01 [${lego.known_text} | ${lego.target_text}] → ${plan ? `drop ${plan.drop.id} "${plan.drop.known_text} | ${plan.drop.target_text}" (keep ${plan.keep.id})` : 'nothing stale (already applied)'}`);
  if (process.env.APPLY !== '1' || !plan) { await pg.end(); return; }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const deleteEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [261], phrase_ids: [plan.drop.id], rows: 1 }, detail: { ruling: RULING, job: JOB, why: `stale bare-fragment build row: still glossed "${plan.drop.known_text}" after S0261L01 was re-glossed to "${lego.known_text}" (#520·I); ${plan.keep.id} already carries the LEGO word for word and keeps its clips; positions not repacked (course convention); removes strict ZUT conflict "i think" → penso / penso che`, deleted_row: plan.drop } });
  await pg.query('BEGIN');
  try {
    const d = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4 AND position=$5', [COURSE, plan.drop.id, plan.drop.known_text, plan.drop.target_text, plan.drop.position]);
    if (d.rowCount !== 1) throw new Error(`${plan.drop.id}: ${d.rowCount} rows deleted`);
    const s = await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=261', [COURSE]);
    if (s.rows[0]?.approved_at) {
      const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [261], rows: 1 }, detail: { job: JOB, why: 'phrase removed under the LEGO; needs Kai\'s read' } });
      await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=261', [ev, COURSE]);
    } else console.log('seed 261 already unapproved (#577·I) — left as is');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  console.log(`APPLIED: ${plan.drop.id} deleted (event ${deleteEvent}); no audio changes (no text was rendered or re-voiced)`);
  await pg.end();
}

module.exports = { norm, containsWords, pairKey, staleBareFragments, rowToDrop, foldChanges, audit, isComponent };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
