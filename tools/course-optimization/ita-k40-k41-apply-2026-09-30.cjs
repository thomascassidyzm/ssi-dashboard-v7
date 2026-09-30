#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-k40-k41-apply-2026-09-30.cjs — job #937·I, ita_for_eng.
//
// Applies the plan in ita-k40-k41-plan-2026-09-30.cjs (K40 bare subjunctives, #931 parlando, K41 infinitive "to")
// in ONE transaction, then fills every emptied slot through the ONE audio route.
//
//   node tools/course-optimization/ita-k40-k41-apply-2026-09-30.cjs            # dry run: plan, guards, audio dry run
//   APPLY=1 node …                                                              # content (one transaction) + audio
//   AUDIO_ONLY=1 node …                                                         # fill the emptied slots again (idempotent)
//   CHECK=1 node …                                                              # verify every planned slot
//
// AUDIO: POST /api/audio/render on production Popty, voiceBound:true on EVERY call (without it the route answers a
// target2 request with the target1 clip of the same words — proven on seed 72 the same day), the course's stored
// Azure voices named, dry run first; a refusal is recorded, never retried. A returned clip whose voice or text is
// not the slot's is NOT linked. target1 (Elsa) speaks the row's female reading when course_gender_expansions has one.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const P = require('./ita-k40-k41-plan-2026-09-30.cjs');

const { COURSE } = P;
const JOB = '#937·I';
const SWEEP = 'ita-k40-k41-apply-2026-09-30';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai 2026-09-30: K40 (job #932·I, 36 clear seeds, 70 L03 'to tell me where it was | dirmi dove fosse'), #931·I parlando for 655/129/114 + 139 knock-on, K41 (job #936·I) minus his holds";
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const MAX_CLIPS = 1000;
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const seedOf = (id) => Number(/^S(\d{4})/.exec(short(id))[1]);
const legoOfPhrase = (id) => /^(S\d{4}L\d{2})/.exec(short(id))[1];
function containsWords(hay, needle, ignore = []) {
  const h = words(hay);
  for (const w of words(needle)) { if (ignore.includes(w)) continue; const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return 'middle';
}
const introFrame = (known, demo) => (demo ? `The Italian for: '${known}', as in — '${demo}', is:` : `The Italian for: '${known}', is:`);
function demoOf(introText) { const m = /as in — '(.*)', is:$/.exec(introText || ''); return m ? m[1] : null; }

// ── read everything the plan touches ─────────────────────────────────────────────────────────────────
async function readLive(pg) {
  const phraseIds = new Set([...Object.keys(P.K40_PHRASES), ...P.DOING_TO_SPEAKING, ...P.K41_BUILD_IDS, ...Object.keys(P.K41_BUILD_OVERRIDE), ...Object.keys(P.K40_DELETES), ...Object.keys(P.K41_TILE_ROWS),
    ...Object.values(P.K40_LEGOS).flatMap((l) => Object.keys(l.crow || {}))]);
  const legoIds = [...new Set([...Object.keys(P.K40_LEGOS), ...Object.keys(P.K41_LEGOS)])];
  const { rows: ph } = await pg.query(`SELECT id, seed_number, lego_index, phrase_role, known_text, target_text, presentation_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, [...phraseIds].map(full)]);
  const { rows: lg } = await pg.query(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.components, l.presentation_audio_id, a.text AS intro
    FROM course_legos l LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id = ANY($2)`, [COURSE, legoIds]);
  const { rows: sd } = await pg.query(`SELECT seed_number, known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)`, [COURSE, Object.keys(P.SEEDS).map(Number)]);
  const { rows: guarded } = await pg.query('SELECT lego_id FROM human_authored_presentations WHERE course_code=$1', [COURSE]);
  const live = {};
  for (const r of ph) live[short(r.id)] = { known: r.known_text, target: r.target_text, role: r.phrase_role, seed: r.seed_number, lego_index: r.lego_index, pres: r.presentation_audio_id };
  const legos = {}; for (const r of lg) legos[r.lego_id] = r;
  const seeds = {}; for (const r of sd) seeds[r.seed_number] = r;
  return { live, legos, seeds, guarded: new Set(guarded.map((g) => g.lego_id)), missing: [...phraseIds].filter((id) => !live[id]), missingLegos: legoIds.filter((id) => !legos[id]) };
}

/** Resolve the plan against live rows: LEGO targets, JSON components, intros; phrase "before" snapshot. */
function resolve(L) {
  const plan = P.buildPlan(L.live);
  const legos = {};
  for (const [id, l] of Object.entries(plan.legos)) {
    const cur = L.legos[id];
    const target = l.targetFromLive ? cur.target_text : l.target;
    let comps = l.comps;
    if (!comps) {
      const map = P.K41_TILES_JSON[id] || {};
      comps = (cur.components || []).map((c) => ({ ...c, known: map[c.known] || c.known }));
      for (const k of Object.keys(map)) if (!(cur.components || []).some((c) => c.known === k)) throw new Error(`${id}: JSON tile "${k}" not found`);
    }
    let intro = l.intro;
    if (!intro) {
      const oldDemo = demoOf(cur.intro);
      const demo = l.k41.demo || (oldDemo && containsWordsSeq(oldDemo, l.known) ? oldDemo : null);
      intro = introFrame(l.known, demo);
    }
    legos[id] = { id, rule: l.rule, before: { known: cur.known_text, target: cur.target_text, components: cur.components, intro: cur.intro }, after: { known: l.known, target, components: comps }, intro, seed: cur.seed_number, lego_index: cur.lego_index, is_new: cur.is_new, guarded: L.guarded.has(id) };
  }
  const phrases = {};
  for (const [id, a] of Object.entries(plan.phrases)) phrases[id] = { id, rule: a.rule, role: L.live[id].role, seed: L.live[id].seed, lego_index: L.live[id].lego_index, before: { known: L.live[id].known, target: L.live[id].target }, after: { known: a.known, target: a.target }, pres: L.live[id].pres };
  const deletes = {};
  for (const [id, why] of Object.entries(plan.deletes)) deletes[id] = { id, why, role: L.live[id].role, seed: L.live[id].seed, before: { known: L.live[id].known, target: L.live[id].target } };
  const seeds = {};
  for (const [n, s] of Object.entries(plan.seeds)) seeds[n] = { seed: Number(n), before: { known: L.seeds[n].known_text, target: L.seeds[n].target_text }, after: s, approved: !!L.seeds[n].approved_at };
  return { legos, phrases, deletes, seeds };
}
/** whole words, in order and contiguous (what the intro mirror asks of a demo sentence). */
function containsWordsSeq(hay, needle) { const h = ` ${norm(hay)} `; return h.includes(` ${norm(needle)} `); }

// ── guards ───────────────────────────────────────────────────────────────────────────────────────────
async function guards(pg, R) {
  const probs = [], notes = [];
  const { countSyllables } = require('../lib/syllable-counters.cjs');
  // 1. LEGO size, intros quote the LEGO, no no-op edits
  for (const l of Object.values(R.legos)) {
    const syl = countSyllables(l.after.target, 'ita');
    const sylBefore = countSyllables(l.before.target, 'ita');
    if (syl > 8 && syl > sylBefore) probs.push(`${l.id}: ${syl} syllables > 8 (was ${sylBefore})`);
    if (syl > 8 && syl <= sylBefore) notes.push(`${l.id}: ${syl} syllables — no bigger than before (${sylBefore}); already over the cap, not grown by this pass`);
    if (!l.intro.includes(`'${l.after.known}'`)) probs.push(`${l.id}: intro does not quote the LEGO`);
    const d = demoOf(l.intro); if (d && !containsWordsSeq(d, l.after.known)) probs.push(`${l.id}: intro demo "${d}" does not contain "${l.after.known}"`);
    if (l.guarded) probs.push(`${l.id}: human-authored intro — plan must not rewrite it`);
    if (norm(l.before.known) === norm(l.after.known) && norm(l.before.target) === norm(l.after.target)) probs.push(`${l.id}: no-op`);
  }
  for (const p of Object.values(R.phrases)) if (p.before.known === p.after.known && p.before.target === p.after.target) probs.push(`${p.id}: no-op`);
  // 2. every non-component phrase under a changed LEGO (after the pass) contains the whole LEGO (P17)
  const legoIds = Object.keys(R.legos);
  const { rows: under } = await pg.query(`SELECT p.id, p.phrase_role, p.known_text, p.target_text, l.lego_id FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index
    WHERE p.course_code=$1 AND l.lego_id = ANY($2) AND p.phrase_role <> 'component'`, [COURSE, legoIds]);
  for (const r of under) {
    const id = short(r.id); if (R.deletes[id]) continue;
    const a = R.phrases[id]?.after || { known: r.known_text, target: r.target_text };
    const L = R.legos[r.lego_id].after;
    const tChanged = norm(R.legos[r.lego_id].before.target) !== norm(L.target) || norm(a.target) !== norm(r.target_text);
    if (tChanged && !containsWords(a.target, L.target)) probs.push(`P17 target: ${id} "${a.target}" lacks "${L.target}"`);
    if (!containsWords(a.known, L.known, ['to'])) notes.push(`P17 known (loose): ${id} "${a.known}" vs LEGO "${L.known}"`);
  }
  // 3. edited rows elsewhere still hold their own LEGO
  const { rows: legoAll } = await pg.query('SELECT lego_id, known_text, target_text, is_new FROM course_legos WHERE course_code=$1', [COURSE]);
  const legoNow = Object.fromEntries(legoAll.map((l) => [l.lego_id, R.legos[l.lego_id]?.after || { known: l.known_text, target: l.target_text }]));
  for (const p of Object.values(R.phrases)) {
    if (p.role === 'component' || norm(p.before.target) === norm(p.after.target)) continue;
    const L = legoNow[legoOfPhrase(p.id)];
    if (!containsWords(p.after.target, L.target)) probs.push(`P17 target: ${p.id} "${p.after.target}" lacks its LEGO "${L.target}"`);
  }
  // 4. component rows: target a contiguous slice of the seed sentence
  const seedT = {};
  for (const { seed_number, target_text } of (await pg.query('SELECT seed_number, target_text FROM course_seeds WHERE course_code=$1', [COURSE])).rows) seedT[seed_number] = R.seeds[seed_number]?.after.target || target_text;
  for (const p of Object.values(R.phrases)) if (p.role === 'component' && norm(p.before.target) !== norm(p.after.target) && !` ${norm(seedT[p.seed])} `.includes(` ${norm(p.after.target)} `)) probs.push(`component ${p.id} "${p.after.target}" not in seed ${p.seed}`);
  for (const l of Object.values(R.legos)) for (const c of l.after.components) if (!` ${norm(seedT[l.seed])} `.includes(` ${norm(c.target)} `)) notes.push(`JSON tile ${l.id} "${c.target}" not a slice of seed ${l.seed}`);
  // 5. ZUT: one known → two targets, against the live course with the plan overlaid
  const { rows: all } = await pg.query(`SELECT split_part(id,':',2) AS id, known_text, target_text, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND phrase_role <> 'component'`, [COURSE]);
  const pairs = new Map(); // known → Map(target → [ids])
  const add = (id, k, t) => { const K = norm(k), T = norm(t); if (!K) return; if (!pairs.has(K)) pairs.set(K, new Map()); const m = pairs.get(K); if (!m.has(T)) m.set(T, []); m.get(T).push(id); };
  for (const r of all) { if (R.deletes[r.id]) continue; const a = R.phrases[r.id]?.after; add(r.id, a ? a.known : r.known_text, a ? a.target : r.target_text); }
  for (const l of legoAll) { const a = legoNow[l.lego_id]; add(l.lego_id, a.known, a.target); }
  for (const { seed_number, known_text, target_text } of (await pg.query('SELECT seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1', [COURSE])).rows) { const a = R.seeds[seed_number]?.after; add(`seed${seed_number}`, a ? a.known : known_text, a ? a.target : target_text); }
  const touched = new Set([...Object.keys(R.phrases), ...Object.keys(R.legos), ...Object.keys(R.seeds).map((n) => `seed${n}`)]);
  const zut = [];
  for (const [k, m] of pairs) if (m.size > 1 && [...m.values()].flat().some((id) => touched.has(id))) zut.push(`"${k}" → ${[...m.entries()].map(([t, ids]) => `${t} [${ids.join(',')}]`).join(' / ')}`);
  // 6. exact LEGO duplicates created (both sides) — a later duplicate would have to go not-new
  for (const l of Object.values(R.legos)) for (const o of legoAll) if (o.lego_id !== l.id && norm(legoNow[o.lego_id].known) === norm(l.after.known) && norm(legoNow[o.lego_id].target) === norm(l.after.target)) probs.push(`duplicate LEGO: ${l.id} = ${o.lego_id}`);
  // 7. untaught target words in edited phrases (LEGOs + components up to the phrase's seed, seed sentences before it)
  const { rows: taughtRows } = await pg.query(`SELECT seed_number, target_text, components FROM course_legos WHERE course_code=$1`, [COURSE]);
  const taughtBy = (seed) => { const s = new Set(); for (const r of taughtRows) if (r.seed_number <= seed) { for (const w of words(r.target_text)) s.add(w); for (const c of r.components || []) for (const w of words(c.target)) s.add(w); } for (const l of Object.values(R.legos)) if (l.seed <= seed) for (const w of words(l.after.target)) s.add(w); for (const [n, t] of Object.entries(seedT)) if (Number(n) <= seed) for (const w of words(t)) s.add(w); return s; };
  const cache = {};
  for (const p of [...Object.values(R.phrases), ...Object.values(R.seeds).map((s) => ({ id: `seed${s.seed}`, seed: s.seed, after: s.after, before: s.before }))]) {
    if (norm(p.before.target) === norm(p.after.target)) continue;
    const t = cache[p.seed] || (cache[p.seed] = taughtBy(p.seed));
    for (const w of words(p.after.target)) if (!t.has(w) && !/^(l|un|dell|all|nell|c|d|dov|com)'/.test(w)) notes.push(`untaught? ${p.id}: "${w}"`);
  }
  // 8. gendered speaker forms in new Italian (target1 speaks the female reading)
  for (const p of [...Object.values(R.phrases), ...Object.values(R.seeds).map((s) => ({ id: `seed${s.seed}`, ...s }))]) if (norm(p.before.target) !== norm(p.after.target) && /\b(sono|ero|sarò|stato|sicuro|pronto|stanco|contento|solo|occupato|nervoso|preoccupato|andato|venuto)\b/.test(norm(p.after.target))) notes.push(`gender? ${p.id}: "${p.after.target}"`);
  return { probs, notes, zut };
}

// ── content: one transaction ─────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, R, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const phr = Object.values(R.phrases), del = Object.values(R.deletes), leg = Object.values(R.legos), sds = Object.values(R.seeds);
  const touchedSeeds = [...new Set([...phr.map((p) => p.seed), ...del.map((d) => d.seed), ...leg.map((l) => l.seed), ...sds.map((s) => s.seed)])].sort((a, b) => a - b);
  const Ev = {};
  Ev.seed = await ev('seed-edit', { seed_numbers: sds.map((s) => s.seed), rows: sds.length }, { ruling: RULING, job: JOB, changes: sds.map((s) => ({ seed: s.seed, from: s.before, to: s.after })) });
  Ev.lego = await ev('lego-edit', { seed_numbers: [...new Set(leg.map((l) => l.seed))], lego_ids: leg.map((l) => l.id), rows: leg.length }, { ruling: RULING, job: JOB, changes: leg.map((l) => ({ id: l.id, rule: l.rule, from: l.before, to: l.after, intro: l.intro })) });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(phr.map((p) => p.seed))], phrase_ids: phr.map((p) => full(p.id)), rows: phr.length }, { ruling: RULING, job: JOB, changes: phr.map((p) => ({ id: full(p.id), rule: p.rule, from: p.before, to: p.after })) });
  Ev.del = await ev('phrase-delete', { seed_numbers: [...new Set(del.map((d) => d.seed))], phrase_ids: del.map((d) => full(d.id)), rows: del.length }, { ruling: RULING, job: JOB, deleted: del.map((d) => ({ id: full(d.id), known: d.before.known, target: d.before.target, why: d.why })) });
  const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, touchedSeeds]);
  Ev.unapprove = await ev('unapprove', { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, { job: JOB, why: 'edited in the K40/K41 pass — Kai should read them', approved_at_before: appr });
  log.events = Ev; log.touchedSeeds = touchedSeeds; log.unapproved = appr.map((a) => a.seed_number);
  await pg.query('BEGIN');
  try {
    for (const s of sds) {
      const r = await pg.query(`UPDATE course_seeds SET known_text=$1, target_text=$2, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND seed_number=$5 AND known_text=$6 AND target_text=$7`,
        [s.after.known, s.after.target, Ev.seed, COURSE, s.seed, s.before.known, s.before.target]);
      if (r.rowCount !== 1) throw new Error(`seed ${s.seed}: ${r.rowCount} rows`);
    }
    for (const l of leg) {
      const r = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, presentation_audio_id=NULL, last_edit_event_id=$4, updated_at=now()
        WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8`, [l.after.known, l.after.target, JSON.stringify(l.after.components), Ev.lego, COURSE, l.id, l.before.known, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`${l.id}: ${r.rowCount} rows`);
      // the old intro no longer quotes the LEGO: detach (asset kept); the new one is linked by the audio step
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
    }
    for (const d of del) {
      const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.before.known, d.before.target]);
      if (r.rowCount !== 1) throw new Error(`delete ${d.id}: ${r.rowCount} rows`);
    }
    for (const p of phr) {
      const L = (await pg.query('SELECT target_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, p.seed, p.lego_index])).rows[0];
      const comp = p.role === 'component';
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=CASE WHEN $4 THEN lego_count ELSE $5 END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=CASE WHEN $4 THEN lego_position ELSE $6 END, presentation_audio_id=CASE WHEN $4 THEN NULL ELSE presentation_audio_id END,
          last_edit_event_id=$7, updated_at=now() WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [p.after.known, p.after.target, p.after.target.length, comp, p.after.target.split(/\s+/).length, legoPosition(p.after.target, L.target_text), Ev.phrase, COURSE, full(p.id), p.before.known, p.before.target]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=COALESCE(last_edit_event_id,$3) WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), Ev.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: K40/K41/#931 pass — ${leg.length} LEGOs, ${phr.length} phrases edited, ${del.length} deleted, ${sds.length} seeds; slots filled through /api/audio/render`, metadata: { job: JOB, seeds: touchedSeeds } });
}

// ── audio: the ONE route ─────────────────────────────────────────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
/** Every slot of every planned row that is NULL now (after the content write, or — in a dry run — would be). */
async function slotsToFill(pg, R, { dry }) {
  const out = [];
  const ids = Object.values(R.phrases).filter((p) => p.role !== 'component').map((p) => full(p.id));
  const { rows: ph } = await pg.query('SELECT id, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, ids]);
  const { rows: lg } = await pg.query('SELECT lego_id AS id, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2, presentation_audio_id pres FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(R.legos)]);
  const { rows: sd } = await pg.query('SELECT seed_id AS id, seed_number, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, Object.keys(R.seeds).map(Number)]);
  const rows = [...ph.map((r) => ({ ...r, table: 'course_practice_phrases', key: short(r.id), plan: R.phrases[short(r.id)] })),
    ...lg.map((r) => ({ ...r, table: 'course_legos', key: r.id, plan: R.legos[r.id] })),
    ...sd.map((r) => ({ ...r, table: 'course_seeds', key: `seed${r.seed_number}`, plan: R.seeds[r.seed_number] }))];
  for (const r of rows) {
    const b = r.plan.before, a = r.plan.after;
    const kCh = norm(b.known) !== norm(a.known), tCh = norm(b.target) !== norm(a.target);
    const known = dry ? a.known : r.known_text, target = dry ? a.target : r.target_text;
    if (dry ? kCh : !r.k) out.push({ table: r.table, id: r.id, key: r.key, slot: 'known', text: known });
    if (dry ? tCh : !r.t1) out.push({ table: r.table, id: r.id, key: r.key, slot: 'target1', text: target });
    if (dry ? tCh : !r.t2) out.push({ table: r.table, id: r.id, key: r.key, slot: 'target2', text: target });
    if (r.table === 'course_legos' && (dry || !r.pres) && r.plan.is_new) out.push({ table: r.table, id: r.id, key: r.key, slot: 'presentation', text: r.plan.intro, legoId: r.id });
  }
  return out;
}
async function femaleReadings(pg, texts) {
  const { rows } = await pg.query(`SELECT original_text, expanded_f FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text = ANY($2) AND expanded_f IS NOT NULL`, [COURSE, texts]);
  return new Map(rows.filter((r) => r.expanded_f !== r.original_text).map((r) => [r.original_text, r.expanded_f]));
}
const linkWhere = { course_legos: 'lego_id=$3', course_practice_phrases: 'id=$3', course_seeds: 'seed_id=$3' };
async function fillAudio(pg, R, log, { dry }) {
  const slots = await slotsToFill(pg, R, { dry });
  const fem = await femaleReadings(pg, [...new Set(slots.filter((s) => s.slot === 'target1').map((s) => s.text))]);
  const keyOf = (s) => `${s.slot}\u0000${s.text}`;
  const jobs = [...new Map(slots.map((s) => [keyOf(s), s])).values()];
  log.audio = { slots: slots.length, uniqueRequests: jobs.length, entries: [] };
  if (dry) {
    let wouldRender = 0, library = 0, refused = 0, chars = 0;
    for (const s of jobs) {
      const spoken = s.slot === 'target1' ? (fem.get(s.text) || s.text) : s.text;
      const d = await render({ courseCode: COURSE, role: s.slot, text: spoken, voiceId: VOICES[s.slot], voiceBound: true, purpose: `K40/K41 pass (${s.key})`, job: '#937', dryRun: true, ...(s.legoId ? { legoId: s.legoId } : {}) });
      if (!d.ok) refused++; else if (d.source === 'would-render') { wouldRender++; chars += d.wouldSpendChars || 0; } else library++;
      log.audio.entries.push({ slot: s.slot, key: s.key, text: spoken, dry: { status: d.status, source: d.source, code: d.code, chars: d.wouldSpendChars, error: d.error } });
    }
    Object.assign(log.audio, { wouldRender, library, refused, chars });
    return;
  }
  let rendered = 0;
  for (const s of jobs) {
    const spoken = s.slot === 'target1' ? (fem.get(s.text) || s.text) : s.text;
    const body = { courseCode: COURSE, role: s.slot, text: spoken, voiceId: VOICES[s.slot], voiceBound: true, purpose: `Kai 2026-09-30 K40/K41 pass (${s.key})`, job: '#937', ...(s.legoId ? { legoId: s.legoId } : {}) };
    const e = { slot: s.slot, key: s.key, text: spoken };
    log.audio.entries.push(e);
    const dryR = await render({ ...body, dryRun: true });
    e.dry = { status: dryR.status, source: dryR.source, code: dryR.code };
    if (!dryR.ok) { e.result = `REFUSED on dry run: ${dryR.code || dryR.status} ${dryR.error || ''}`; continue; }
    if (dryR.source === 'would-render' && rendered >= MAX_CLIPS) { e.result = 'NOT REQUESTED — clip ceiling'; continue; }
    const real = await render(body);
    e.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { e.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    if (real.source === 'rendered') rendered++;
    if (real.source === 'rendered' && !real.charsSpent) { e.result = "NOT LINKED — 'rendered' with 0 chars spent"; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms FROM course_audio WHERE id=$1', [real.audioId]);
    e.clip = clip;
    if (!clip || !voiceOk(VOICES[s.slot], clip.voice_id)) { e.result = `NOT LINKED — ${clip?.voice_id} clip for ${s.slot}`; continue; }
    if (norm(clip.text) !== norm(spoken)) { e.result = `NOT LINKED — clip text "${clip.text}"`; continue; }
    e.result = real.source;
  }
  log.audio.rendered = rendered;
  const good = new Map(log.audio.entries.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.slot}\u0000${a.key}`, a.clip.id]));
  const byText = new Map(log.audio.entries.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [a.slot, a]));
  const linked = [];
  // link every slot whose (role, text) request produced a verified clip
  const clipFor = new Map(); for (const a of log.audio.entries) if (a.clip && ['library', 'rendered'].includes(a.result)) clipFor.set(`${a.slot}\u0000${a.text}`, a.clip.id);
  for (const s of slots) {
    const spoken = s.slot === 'target1' ? (fem.get(s.text) || s.text) : s.text;
    const id = clipFor.get(`${s.slot}\u0000${spoken}`); if (!id) continue;
    if (s.slot === 'presentation') {
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [id, COURSE, s.id]);
      const up = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [id, COURSE, s.id]);
      if (!up.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, s.id, id]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND lego_id IS NULL', [s.id, id]);
    } else {
      const col = `${s.slot}_audio_id`;
      await pg.query(`UPDATE ${s.table} SET ${col}=$1 WHERE course_code=$2 AND ${linkWhere[s.table]} AND ${col} IS NULL`, [id, COURSE, s.id]);
    }
    linked.push(`${s.key}.${s.slot}`);
  }
  void good; void byText;
  log.linked = linked;
}

/** Every planned row: no NULL slot, each clip in its voice and saying its text (target1 its female reading), target1 ≠ target2. */
async function verify(pg, R) {
  const probs = [];
  const q = async (sql, a) => (await pg.query(sql, a)).rows;
  const clip = async (id) => (id ? (await q('SELECT id, voice_id, text, duration_ms FROM course_audio WHERE id=$1', [id]))[0] : null);
  const rows = [
    ...await q('SELECT id, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, Object.values(R.phrases).filter((p) => p.role !== 'component').map((p) => full(p.id))]),
    ...await q('SELECT lego_id id, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2, is_new, presentation_audio_id pres FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(R.legos)]),
    ...await q('SELECT seed_id id, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, Object.keys(R.seeds).map(Number)]),
  ];
  const fem = await femaleReadings(pg, rows.map((r) => r.target_text));
  for (const r of rows) {
    const id = short(r.id);
    const [k, a, b] = [await clip(r.k), await clip(r.t1), await clip(r.t2)];
    if (!k || !a || !b) { probs.push(`${id}: NULL ${[!k && 'known', !a && 'target1', !b && 'target2'].filter(Boolean).join('+')}`); continue; }
    if (!voiceOk(VOICES.known, k.voice_id) && !/xai_eve/.test(k.voice_id)) probs.push(`${id}: known voice ${k.voice_id}`);
    if (norm(k.text) !== norm(r.known_text)) probs.push(`${id}: known clip says "${k.text}"`);
    if (r.t1 === r.t2) probs.push(`${id}: target1 = target2 clip`);
    if (!voiceOk(VOICES.target1, a.voice_id) && !/xai_ara/.test(a.voice_id)) probs.push(`${id}: target1 voice ${a.voice_id}`);
    if (!voiceOk(VOICES.target2, b.voice_id) && !/xai_leo/.test(b.voice_id)) probs.push(`${id}: target2 voice ${b.voice_id}`);
    if (norm(a.text) !== norm(fem.get(r.target_text) || r.target_text) && norm(a.text) !== norm(r.target_text)) probs.push(`${id}: target1 clip says "${a.text}"`);
    if (norm(b.text) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${b.text}"`);
    if ('pres' in r && r.is_new) { const p = await clip(r.pres); const want = R.legos[id].intro; if (!p) probs.push(`${id}: intro SILENT`); else if (p.text !== want) probs.push(`${id}: intro says "${p.text}"`); }
  }
  return { rows: rows.length, probs };
}

function zutStrict() {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'audit-phrase-zut.cjs'), COURSE], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
  const m = /bidirectional[\s\S]*?strict:\s*(\d+)/.exec(r.stdout || '');
  return m ? Number(m[1]) : null;
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); return f; };
  try {
    const L = await readLive(pg);
    if (process.env.CHECK === '1' || process.env.AUDIO_ONLY === '1') {
      const snap = JSON.parse(fs.readFileSync(process.env.PLAN_SNAPSHOT, 'utf8'));
      const R = snap.resolved;
      if (process.env.AUDIO_ONLY === '1') { await fillAudio(pg, R, log, { dry: false }); console.log(`audio: ${log.audio.entries.length} requests, ${log.audio.rendered} rendered, ${log.linked.length} slots linked`); }
      const v = await verify(pg, R); log.verify = v;
      console.log(v.probs.length ? `AUDIO PROBLEMS (${v.probs.length}):\n  ` + v.probs.join('\n  ') : `verified ${v.rows} rows`);
      save(process.env.CHECK === '1' ? 'check' : 'audio-only'); process.exitCode = v.probs.length ? 2 : 0; return;
    }
    if (L.missing.length || L.missingLegos.length) throw new Error(`not live: ${[...L.missing, ...L.missingLegos].join(', ')}`);
    const R = resolve(L);
    log.resolved = R;
    const g = await guards(pg, R);
    log.guards = g;
    console.log(`plan: ${Object.keys(R.seeds).length} seeds, ${Object.keys(R.legos).length} LEGOs, ${Object.keys(R.phrases).length} phrase rows edited, ${Object.keys(R.deletes).length} deleted`);
    console.log(g.probs.length ? `PROBLEMS (${g.probs.length}):\n  ` + g.probs.join('\n  ') : 'guards hold');
    console.log(`NOTES (${g.notes.length}):\n  ` + g.notes.join('\n  '));
    console.log(`ZUT on touched rows (${g.zut.length}):\n  ` + g.zut.join('\n  '));
    if (process.env.GUARDS_ONLY === '1') return;
    if (process.env.APPLY !== '1') {
      await fillAudio(pg, R, log, { dry: true });
      console.log(`AUDIO dry run: ${log.audio.slots} slots, ${log.audio.uniqueRequests} requests → would render ${log.audio.wouldRender} (${log.audio.chars} chars), library ${log.audio.library}, refused ${log.audio.refused}`);
      for (const e of log.audio.entries.filter((x) => !x.dry.status || x.dry.status >= 300)) console.log(`  refused: ${e.slot} ${e.key}: ${e.dry.code} ${e.dry.error}`);
      save('dry'); return;
    }
    if (g.probs.length) throw new Error('refusing to apply: guard problems');
    log.zutBefore = zutStrict();
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    await applyContent(pg, supabase, R, log);
    const snapFile = save('content');
    console.log(`content applied in one transaction; ${log.unapproved.length} seeds unapproved; snapshot ${snapFile}`);
    await fillAudio(pg, R, log, { dry: false });
    console.log(`audio: ${log.audio.entries.length} requests, ${log.audio.rendered} rendered, ${log.linked.length} slots linked`);
    for (const e of log.audio.entries.filter((x) => !['library', 'rendered'].includes(x.result))) console.log(`  ${e.slot} ${e.key} "${e.text}": ${e.result}`);
    const v = await verify(pg, R); log.verify = v;
    console.log(v.probs.length ? `AUDIO PROBLEMS (${v.probs.length}):\n  ` + v.probs.join('\n  ') : `verified ${v.rows} rows`);
    log.zutAfter = zutStrict();
    console.log(`ZUT strict: ${log.zutBefore} → ${log.zutAfter}`);
    save('final');
  } finally { await pg.end(); }
}
module.exports = { resolve, containsWords, containsWordsSeq, introFrame, demoOf, legoPosition };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
