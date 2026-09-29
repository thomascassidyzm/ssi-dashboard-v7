#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-couldnt-potere-2026-09-29.cjs
//
// ita_for_eng — plain "couldn't" is potere, not riuscire (Kai, 2026-09-29, job #889·I, on #885·I's plan d/fd483cb3:
// "poteva isn't perfect in many of the other cases either but it's passable").
//   he couldn't → non poteva (S0311L01, seed 311, its 8+ phrases)    I couldn't → non potevo (S0148L02 and seed 148, agreeing with S0384L01)
// The clashes this ends: S0311L01 "he couldn't | non riusciva a" vs S0313L01 build "he couldn't | non poteva";
//                        S0148L02 "I couldn't | non riuscivo a" vs S0384L01 "I couldn't | non potevo".
// riuscire STAYS for genuine "managed to / been able to" rows (433, 518, 525, 563, 564) and for the effort-sense "couldn't"
// rows Kai's plan left alone (RETAINED below) — end-state rule: no OTHER "couldn't" row says riusc-.
// Two phrases do not survive the swap (skill/memory senses) and get new sentences in the same slot; three rows with a
// known/target mismatch or a defective target are fixed at the same time (313 L02 U03, 332 L03 U05) and 312 L01 U05 switches.
//
// Every row is re-texted IN PLACE (progress is filed by slot). Nothing is deleted except the LEGO-less component tile
// S0311L01C03 "to|a" (a phrase row; the LEGO it belonged to is kept). Audio: make-before-break through the ONE route
// (POST /api/audio/render, dry run first, one real call, no retries, voiceBound); if any clip is refused NOTHING is written.
//
//   node tools/course-optimization/ita-couldnt-potere-2026-09-29.cjs          # dry run: guards + plan
//   RENDER_DRY=1 node …                                                       # + ask the route what each clip would cost
//   APPLY=1 node …                                                            # render, verify, write, unapprove, refresh
//   CHECK=1 node …                                                            # end-state rule + audio on the live course
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#889·I';
const SWEEP = 'ita-couldnt-potere-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-29 (job #889·I, plan #885·I d/fd483cb3): plain past-inability 'couldn't' is potere (non poteva / non potevo), not riuscire; riuscire only for genuine 'managed to' rows. 'Poteva isn't perfect in many cases but it's passable.'";
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
const seedOf = (id) => Number(String(short(id)).slice(1, 5));
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/** Elsa (target1) reads the speaker's female forms; only "nervoso" occurs in the rows this job writes. */
const femaleReading = (t) => String(t).replace(/\bnervoso\b/g, 'nervosa');

// ── The rule, as code (tested) ─────────────────────────────────────────────────────────────
/** The rows Kai's plan deliberately leaves on riuscire: managed-to senses and the effort-sense couldn't rows (no clash). */
const RETAINED_SEEDS = new Set([433, 445, 446, 450, 518, 525, 563, 564, 596]);
const RIUSC = /\briusc/;
/** plain "couldn't" (not "couldn't manage to" / "been able to") */
const isPlainCouldnt = (known) => /\bcouldn't\b/.test(norm(known)) && !/\bmanage/.test(norm(known)) && !/\bable to\b/.test(norm(known));
/** riuscire → potere, in the two person/tense forms this course has */
const toPotere = (t) => String(t).replace(/\bnon riusciva a\b/g, 'non poteva').replace(/\bnon riuscivo a\b/g, 'non potevo');
/**
 * End-state rule on rows ({kind, sn, id, known, target}): no plain-"couldn't" row outside RETAINED_SEEDS says riusc-;
 * and one known "he couldn't" / "I couldn't" (LEGO, build, use, seed) never has two different Italians (ZUT).
 */
function endStateProblems(rows) {
  const out = [];
  for (const r of rows) {
    if (r.kind === 'lego') { if (isPlainCouldnt(r.known) && RIUSC.test(norm(r.target)) && !RETAINED_SEEDS.has(seedOf(r.id))) out.push(`${r.id}: "${r.known}" says "${r.target}"`); continue; }
    if (isPlainCouldnt(r.known) && RIUSC.test(norm(r.target)) && !RETAINED_SEEDS.has(r.sn || seedOf(r.id))) out.push(`${r.id}: "${r.known}" says "${r.target}" — rule: potere`);
  }
  for (const k of ["he couldn't", "i couldn't"]) {
    const t = new Set(rows.filter((r) => r.kind !== 'component' ? norm(r.known) === k : false).map((r) => norm(r.target)));
    const c = new Set(rows.filter((r) => r.kind === 'component' && norm(r.known) === k).map((r) => norm(r.target)));
    if (t.size > 1) out.push(`ZUT: "${k}" → ${[...t].join(' / ')}`);
    if (c.size > 1) out.push(`ZUT (components): "${k}" → ${[...c].join(' / ')}`);
  }
  return out;
}

// ── The plan ───────────────────────────────────────────────────────────────────────────────
const X = (known, target) => ({ known, target });
/** Rows that need a NEW sentence, not a swap (the swap would be the wrong sense, or the row was already broken). */
const SPECIAL = {
  // "speak Italian very well" is a skill claim: poteva reads as "was not allowed/able", the plan wants a fresh sentence
  S0311L01U01: X("he couldn't speak to you yesterday", 'non poteva parlare con te ieri'),
  // "remember" with potere is unnatural
  S0311L02B02: X("he couldn't explain the three most important facts", 'non poteva spiegare tre fatti più importanti'),
  // 332: the target said "ai fatti di costruire" for "she could build" — defective whichever way Kai goes
  S0332L03U05: X("she couldn't believe she could build a new life for her sister", 'non poteva credere di poter costruire una nuova vita per sua sorella'),
  // 313: known "I find it hard to watch…" against a past target — the pair now agrees, and takes potere
  S0313L02U03: X("I couldn't watch all five games in one day", 'non potevo guardare tutte e cinque le partite in un giorno'),
};
/** S0311L01C02 "he managed|riusciva" becomes the LEGO's own "he could|poteva" tile (same id, same slot). */
SPECIAL.S0311L01C02 = X('he could', 'poteva');
const DELETES = ['S0311L01C03']; // "to|a": no longer a tile of the LEGO
const LEGOS = {
  S0311L01: { seed: 311, from: X("he couldn't", 'non riusciva a'), to: X("he couldn't", 'non poteva'),
    components: [X('not', 'non'), X('he could', 'poteva')],
    intro: "The Italian for: 'he couldn't', as in — 'he couldn't show you something important', is:" },
  S0148L02: { seed: 148, from: X("I couldn't answer", 'non riuscivo a rispondere'), to: X("I couldn't answer", 'non potevo rispondere'),
    components: [X("I couldn't", 'non potevo'), X('answer', 'rispondere')], intro: null },
};
const SEED_EDITS = { 311: X("he couldn't believe the three most important facts", 'non poteva credere ai tre fatti più importanti'),
  148: X("he wasn't very patient when I couldn't answer", 'non era molto paziente quando non potevo rispondere') };
/** Seeds whose rows this job edits — all arrive unchecked (unapproved). */
const SEEDS_TO_UNAPPROVE = [148, 311, 312, 313, 332];
/** words a row may use because the LEGOs this job re-cuts introduce them, from the seed onward */
const INTRODUCED = [{ seed: 148, text: 'non potevo rispondere' }, { seed: 311, text: 'non poteva' }];

/** The row-by-row plan, computed from live rows so nothing is typed twice: [{id, kind, before, after}] */
function buildPlan(rows) {
  const plan = [];
  for (const r of rows) {
    if (r.kind === 'lego' || r.kind === 'seed') continue;
    const id = r.id;
    if (DELETES.includes(id)) continue;
    let after = SPECIAL[id];
    if (!after && RIUSC.test(norm(r.target)) && isPlainCouldnt(r.known) && [311, 148].includes(r.sn)) after = X(r.known, toPotere(r.target));
    if (!after && id === 'S0312L01U05') after = X(r.known, toPotere(r.target));
    if (!after && r.sn === 148 && RIUSC.test(norm(r.target))) after = X(r.known, toPotere(r.target)); // C01 "I couldn't|non riuscivo a", U-rows
    if (after) plan.push({ id, kind: r.kind, sn: r.sn, before: X(r.known, r.target), after });
  }
  return plan;
}
function applyPlanToRows(rows) {
  const plan = new Map(buildPlan(rows).map((p) => [p.id, p.after]));
  return rows.filter((r) => !DELETES.includes(r.id)).map((r) => {
    if (plan.has(r.id)) return { ...r, ...plan.get(r.id) };
    if (r.kind === 'lego' && LEGOS[r.id]) return { ...r, known: LEGOS[r.id].to.known, target: LEGOS[r.id].to.target, components: LEGOS[r.id].components };
    if (r.kind === 'seed' && SEED_EDITS[r.sn]) return { ...r, ...SEED_EDITS[r.sn] };
    return r;
  });
}

// ── DB ─────────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
function planProblems(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const probs = [];
  for (const [id, l] of Object.entries(LEGOS)) { const r = byId[id]; if (!r || r.known !== l.from.known || r.target !== l.from.target) probs.push(`${id} live differs from the plan's before`); }
  for (const [n, s] of Object.entries(SEED_EDITS)) { const r = byId[`S0${n}`]; if (!r || !RIUSC.test(norm(r.target))) probs.push(`seed ${n} live differs from the plan's before`); }
  for (const d of DELETES) if (!byId[d]) probs.push(`${d} missing`);
  const plan = buildPlan(rows);
  const counts = plan.reduce((m, p) => ((m[p.sn] = (m[p.sn] || 0) + 1), m), {});
  for (const p of plan) {
    const lgId = p.id.slice(0, 8); const lg = LEGOS[lgId];
    if (lg && p.kind !== 'component') {
      if (!containsWords(p.after.known, lg.to.known) && !containsWords(p.before.known, lg.from.known)) continue;
      const tgt = lgId === 'S0148L02' ? lg.to.target : lg.to.target;
      if (lgId === 'S0311L01' && !containsWords(p.after.target, tgt)) probs.push(`${p.id} would not contain ${lgId} "${tgt}"`);
      if (lgId === 'S0148L02' && !containsWords(p.after.target, tgt)) probs.push(`${p.id} would not contain ${lgId} "${tgt}"`);
    }
  }
  return { probs, counts, plan };
}
/** A word is taught at seed N if any row at or before N carries it, or a LEGO this job re-cuts introduces it by N. */
async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  const intro = new Set(INTRODUCED.filter((i) => i.seed <= seed).flatMap((i) => words(i.text)));
  for (const w of new Set(words(text))) {
    if (side === 'target' && intro.has(w)) continue;
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg, plan) {
  const probs = [];
  // only rows whose text is NEW to the course need the guard (a swap of riuscire→potere adds only potere forms, introduced above)
  for (const p of plan) {
    const u = [...await untaught(pg, p.sn, p.after.known, 'known'), ...await untaught(pg, p.sn, p.after.target, 'target')];
    if (u.length) probs.push(`${p.id} at seed ${p.sn} uses untaught words: ${u.join(', ')}`);
  }
  return probs;
}
/** ZUT against the live course: one English → two Italians is a HOLD (after-state of every edited row considered). */
function zutAfter(rows) {
  const after = applyPlanToRows(rows);
  const edited = new Set(buildPlan(rows).map((p) => p.id));
  const clashes = [];
  const by = new Map();
  for (const r of after.filter((x) => x.kind !== 'component')) { const k = norm(r.known); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  for (const p of buildPlan(rows).filter((p) => p.kind !== 'component')) {
    for (const r of by.get(norm(p.after.known)) || []) if (norm(r.target) !== norm(p.after.target) && r.id !== p.id) clashes.push(`${p.id} "${p.after.known}" → "${p.after.target}" vs ${r.id} → "${r.target}"`);
  }
  return [...new Set(clashes)];
}

// ── Audio: the ONE route, BEFORE any text moves ───────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 889-I)` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
/** Every clip the new state needs: a changed side gets a new clip; an unchanged side keeps its own. */
function neededClips(plan) {
  const out = [];
  const add = (rowId, table, slot, text) => out.push({ rowId, table, slot, text, speak: slot === 'target1' ? femaleReading(text) : text });
  for (const p of plan) {
    if (norm(p.before.known) !== norm(p.after.known)) add(p.id, 'course_practice_phrases', 'known', p.after.known);
    if (norm(p.before.target) !== norm(p.after.target)) { add(p.id, 'course_practice_phrases', 'target1', p.after.target); add(p.id, 'course_practice_phrases', 'target2', p.after.target); }
  }
  for (const [n, s] of Object.entries(SEED_EDITS)) { add(`S0${n}`, 'course_seeds', 'target1', s.target); add(`S0${n}`, 'course_seeds', 'target2', s.target); }
  for (const [id, l] of Object.entries(LEGOS)) { add(id, 'course_legos', 'target1', l.to.target); add(id, 'course_legos', 'target2', l.to.target); if (l.intro) out.push({ rowId: id, table: 'course_legos', slot: 'presentation', text: l.intro, speak: l.intro }); }
  return out;
}
async function makeClips(pg, log, plan, { dryOnly }) {
  const need = neededClips(plan);
  const keyOf = (n) => `${n.slot}\u0000${n.speak}`;
  const jobs = [...new Map(need.map((n) => [keyOf(n), n])).values()];
  log.audio = [];
  for (const n of jobs) {
    const body = { courseCode: COURSE, role: n.slot, text: n.speak, voiceId: VOICES[n.slot], voiceBound: true, purpose: `Kai 2026-09-29 couldn't→potere (${n.rowId})`, ...(n.slot === 'presentation' ? { legoId: n.rowId } : {}) };
    const dry = await render({ ...body, dryRun: true });
    const entry = { role: n.slot, text: n.speak, dry: { status: dry.status, source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars, error: dry.error } };
    log.audio.push(entry);
    if (!dry.ok) { entry.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    if (dryOnly) { entry.result = 'dry'; continue; }
    const real = await render(body);
    entry.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { entry.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    if (real.source === 'rendered' && !real.charsSpent) { entry.result = "NOT USED — 'rendered' with 0 chars spent"; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id=$1', [real.audioId]);
    entry.clip = clip;
    if (!clip || !voiceOk(VOICES[n.slot], clip.voice_id)) { entry.result = `NOT USED — ${clip?.voice_id} clip for ${n.slot}`; continue; }
    if (norm(clip.text) !== norm(n.speak)) { entry.result = `NOT USED — clip text "${clip.text}"`; continue; }
    if (!clip.duration_ms || clip.duration_ms < 200) { entry.result = `NOT USED — duration ${clip.duration_ms}`; continue; }
    entry.result = real.source;
  }
  const good = new Map(log.audio.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.role}\u0000${a.text}`, a.clip.id]));
  const missing = need.filter((n) => !good.get(keyOf(n)));
  return { need, clipFor: (n) => good.get(keyOf(n)), missing };
}

// ── Content: one transaction, text and links together ─────────────────────────────────────
async function applyContent(pg, supabase, plan, rows, clips, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const slotOf = (rowId, slot) => { const n = clips.need.find((x) => x.rowId === rowId && x.slot === slot); return n ? clips.clipFor(n) : undefined; };
  const setSlots = (rowId, startAt) => {
    const sets = [], vals = [];
    for (const s of ['known', 'target1', 'target2', 'presentation']) { const id = slotOf(rowId, s); if (id) { sets.push(`${s}_audio_id=$${startAt + vals.length}`); vals.push(id); } }
    return { sql: sets.length ? ', ' + sets.join(', ') : '', vals };
  };
  log.approvedBefore = Object.fromEntries((await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, SEEDS_TO_UNAPPROVE])).rows.map((r) => [r.seed_number, r.approved_at]));
  const Ev = {};
  Ev.lego = await ev('lego-edit', { seed_numbers: Object.values(LEGOS).map((l) => l.seed), lego_ids: Object.keys(LEGOS), rows: 2 }, { ruling: RULING, job: JOB, changes: Object.entries(LEGOS).map(([id, l]) => ({ id, from: l.from, to: l.to, components: l.components })) });
  Ev.seed = await ev('seed-edit', { seed_numbers: Object.keys(SEED_EDITS).map(Number), rows: 2 }, { ruling: RULING, job: JOB, changes: Object.entries(SEED_EDITS).map(([n, s]) => ({ seed: Number(n), to: s })) });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(plan.map((p) => p.sn))], phrase_ids: plan.map((p) => full(p.id)), rows: plan.length }, { ruling: RULING, job: JOB, changes: plan.map((p) => ({ id: full(p.id), from: p.before, to: p.after, why: SPECIAL[p.id] ? 'new sentence in the same slot (wrong sense / defective before)' : 'riuscire → potere' })) });
  Ev.del = await ev('phrase-delete', { seed_numbers: [311], phrase_ids: DELETES.map(full), rows: DELETES.length }, { ruling: RULING, job: JOB, deleted: DELETES.map((id) => ({ id: full(id), ...(rows.find((r) => r.id === id) || {}), why: 'tile "to|a" is no longer part of S0311L01 (non poteva); the LEGO itself stays' })) });
  Ev.unapprove = await ev('unapprove', { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, { why: 'seeds whose LEGO, seed text or phrases this job edited — edited rows arrive unchecked', job: JOB, approved_at_before: log.approvedBefore });
  log.events = Ev;
  const legoTarget = (p) => { const lg = LEGOS[p.id.slice(0, 8)]; if (lg) return lg.to.target; return null; };
  await pg.query('BEGIN');
  try {
    for (const [id, l] of Object.entries(LEGOS)) {
      const ls = setSlots(id, 8);
      const u = await pg.query(`UPDATE course_legos SET target_text=$1, components=$2, last_edit_event_id=$3, updated_at=now()${ls.sql} WHERE course_code=$4 AND lego_id=$5 AND target_text=$6 AND known_text=$7`,
        [l.to.target, JSON.stringify(l.components), Ev.lego, COURSE, id, l.from.target, l.from.known, ...ls.vals]);
      if (u.rowCount !== 1) throw new Error(`${id}: ${u.rowCount} rows`);
      if (l.intro) {
        const intro = slotOf(id, 'presentation');
        const li = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [intro, COURSE, id]);
        if (!li.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, id, intro]);
        await pg.query('UPDATE course_audio SET lego_id=NULL WHERE course_code=$1 AND lego_id=$2 AND id<>$3', [COURSE, id, intro]); // old intro kept, no longer keyed
        await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [id, intro]);
      }
    }
    for (const p of plan) {
      const s = setSlots(p.id, 11);
      const lt = legoTarget(p) || (await pg.query('SELECT l.target_text FROM course_legos l JOIN course_practice_phrases c ON c.lego_id=l.lego_id AND c.course_code=l.course_code WHERE c.course_code=$1 AND c.id=$2', [COURSE, full(p.id)])).rows[0]?.target_text;
      const isComp = p.kind === 'component';
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=$5, last_edit_event_id=$6, updated_at=now()${s.sql} WHERE course_code=$7 AND id=$8 AND known_text=$9 AND target_text=$10`,
        [p.after.known, p.after.target, p.after.target.length, p.after.target.split(/\s+/).length, isComp ? null : legoPosition(p.after.target, lt || ''), Ev.phrase, COURSE, full(p.id), p.before.known, p.before.target, ...s.vals]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
      // trg_null_phrase_audio_on_text_change ignores a link set in the same UPDATE: re-set our clips once the text has settled
      for (const sl of ['known', 'target1', 'target2']) {
        const id = slotOf(p.id, sl); if (!id) continue;
        await pg.query(`UPDATE course_practice_phrases SET ${sl}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND ${sl}_audio_id IS DISTINCT FROM $1`, [id, COURSE, full(p.id)]);
      }
    }
    for (const d of DELETES) {
      const r = await pg.query("DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND phrase_role='component'", [COURSE, full(d)]);
      if (r.rowCount !== 1) throw new Error(`${d}: delete ${r.rowCount}`);
    }
    for (const [n, s] of Object.entries(SEED_EDITS)) {
      const st = setSlots(`S0${n}`, 6);
      const r = await pg.query(`UPDATE course_seeds SET known_text=$1, target_text=$2, last_edit_event_id=$3, updated_at=now()${st.sql} WHERE course_code=$4 AND seed_number=$5 AND target_text ~ 'riusc'`, [s.known, s.target, Ev.seed, COURSE, Number(n), ...st.vals]);
      if (r.rowCount !== 1) throw new Error(`seed ${n}: ${r.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [Ev.unapprove, COURSE, SEEDS_TO_UNAPPROVE]);
    log.unapproved = { seeds: SEEDS_TO_UNAPPROVE, rowsThatWereApproved: un.rowCount };
    log.genderRows = [];
    const targets = [...new Set([...plan.map((p) => p.after.target), ...Object.values(SEED_EDITS).map((s) => s.target)])];
    for (const t of targets) {
      if (femaleReading(t) === t) continue;
      const { rows: ex } = await pg.query("SELECT 1 FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text=$2", [COURSE, t]);
      if (ex.length) continue;
      await pg.query("INSERT INTO course_gender_expansions (course_code, original_text, language, expanded_f, expanded_m, text_side, processed_at) VALUES ($1,$2,'ita',$3,$2,'target',now())", [COURSE, t, femaleReading(t)]);
      log.genderRows.push(t);
    }
    for (const [id, l] of Object.entries(LEGOS)) {
      const { rows: [c] } = await pg.query('SELECT count(*)::int AS n FROM course_legos WHERE course_code=$1 AND seed_number=$2', [COURSE, l.seed]);
      log.legoCounts = { ...(log.legoCounts || {}), [l.seed]: c.n };
    }
    const probs = endStateProblems(await loadRows(pg));
    if (probs.length) throw new Error('end state does not hold inside the transaction:\n  ' + probs.join('\n  '));
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: couldn't → potere — ${plan.length} phrase rows, 2 LEGOs, 2 seeds re-texted; every slot filled make-before-break through /api/audio/render`, metadata: { job: JOB, seeds: SEEDS_TO_UNAPPROVE } });
}

/** Verify on the live course: every row this job wrote has all slots, right voices, clip text = row text (target1 = female reading). */
async function verifyAudio(pg, plan) {
  const ids = plan.map((p) => full(p.id));
  const { rows } = await pg.query(`SELECT x.id, x.known_text, x.target_text, ak.voice_id kv, ak.text kx, a1.voice_id v1, a1.text x1, a2.voice_id v2, a2.text x2, x.target1_audio_id t1, x.target2_audio_id t2
    FROM (SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)
          UNION ALL SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($3)
          UNION ALL SELECT seed_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($4)
         ) x
    LEFT JOIN course_audio ak ON ak.id=x.known_audio_id LEFT JOIN course_audio a1 ON a1.id=x.target1_audio_id LEFT JOIN course_audio a2 ON a2.id=x.target2_audio_id ORDER BY 1`, [COURSE, ids, Object.keys(LEGOS), [148, 311]]);
  const probs = [];
  for (const r of rows) {
    const id = short(r.id);
    if (!r.kx || !r.x1 || !r.x2) probs.push(`${id}: NULL slot`);
    if (r.t1 && r.t1 === r.t2) probs.push(`${id}: target1 = target2`);
    if (r.kx && norm(r.kx) !== norm(r.known_text)) probs.push(`${id}: known clip says "${r.kx}"`);
    if (r.x1 && norm(r.x1) !== norm(femaleReading(r.target_text)) && norm(r.x1) !== norm(r.target_text)) probs.push(`${id}: target1 clip says "${r.x1}"`);
    if (r.x2 && norm(r.x2) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${r.x2}"`);
    if (r.x1 && !/Elsa|xai_|elevenlabs/.test(r.v1 || '')) probs.push(`${id}: target1 voice ${r.v1}`);
    if (r.x2 && !/Benigno|xai_|elevenlabs/.test(r.v2 || '')) probs.push(`${id}: target2 voice ${r.v2}`);
  }
  const { rows: [p] } = await pg.query(`SELECT a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id::text WHERE l.course_code=$1 AND l.lego_id='S0311L01'`, [COURSE]);
  if (!p?.text) probs.push('S0311L01: intro SILENT'); else if (p.text !== LEGOS.S0311L01.intro) probs.push(`S0311L01: intro clip says "${p.text}"`);
  return { rows: rows.length, probs };
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    const rows = await loadRows(pg);
    const { probs: pp, counts, plan } = planProblems(rows);
    if (process.env.CHECK === '1') {
      const probs = endStateProblems(rows);
      const a = await verifyAudio(pg, plan.length ? plan : []);
      console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course');
      if (plan.length) console.log(`(plan still finds ${plan.length} rows to edit — not applied yet)`);
      console.log(a.probs.length ? 'AUDIO PROBLEMS:\n  ' + a.probs.join('\n  ') : `audio: ${a.rows} rows checked`);
      process.exitCode = probs.length ? 2 : 0; return;
    }
    const APPLY = process.env.APPLY === '1';
    const before = endStateProblems(rows);
    const probs = [...pp, ...(await vocabularyGuards(pg, plan)), ...zutAfter(rows).map((z) => `ZUT: ${z}`), ...endStateProblems(applyPlanToRows(rows)).map((p) => `after-plan: ${p}`)];
    log.before = before; log.problems = probs; log.plan = plan;
    console.log(`\n══ ${COURSE} — couldn't → potere — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\n${plan.length} phrase rows (by seed ${JSON.stringify(counts)}) + 2 LEGOs + 2 seeds; delete ${DELETES.join(',')}; unapprove ${SEEDS_TO_UNAPPROVE.join(', ')}`);
    console.log(`rule violations on the live course now: ${before.length}`);
    if (process.env.SHOW === '1') for (const p of plan) console.log(`  ${p.id}: "${p.before.known}" | ${p.before.target}\n      → "${p.after.known}" | ${p.after.target}`);
    console.log(probs.length ? '\nPROBLEMS:\n  ' + probs.join('\n  ') : '\nguards hold: live text = plan, every row contains its LEGO, no untaught word, no ZUT clash, end state holds on the planned rows');
    if (probs.length) { process.exitCode = 2; save('dryrun'); return; }
    if (process.env.RENDER_DRY === '1' || APPLY) {
      const clips = await makeClips(pg, log, plan, { dryOnly: !APPLY });
      const chars = log.audio.reduce((s, a) => s + (a.dry.wouldSpendChars || 0), 0);
      for (const a of log.audio) console.log(`  ${a.role.padEnd(12)} ${String(a.dry.source || a.dry.code).padEnd(12)} ${a.result.padEnd(10)} "${a.text}"${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms]` : ''}`);
      console.log(`${log.audio.length} distinct clips; would spend ${chars} chars on the dry run`);
      if (APPLY) {
        if (clips.missing.length) {
          log.held = clips.missing.map((n) => `${n.rowId}.${n.slot}`);
          console.log(`HELD — ${clips.missing.length} slots have no verified clip, NOTHING written (make-before-break):\n  ${log.held.join('\n  ')}`);
          process.exitCode = 2; save('held'); return;
        }
        const { createClient } = require('@supabase/supabase-js');
        await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), plan, rows, clips, log);
        console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} genderRows=${log.genderRows.length}`);
        const v = await verifyAudio(pg, plan); log.verify = v.probs;
        console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : `audio verified on ${v.rows} rows`);
      }
    }
    save(APPLY ? 'applied' : 'dryrun');
  } finally { await pg.end(); }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { endStateProblems, buildPlan, applyPlanToRows, toPotere, isPlainCouldnt, femaleReading, neededClips, LEGOS, SEED_EDITS, SPECIAL, DELETES, RETAINED_SEEDS, SEEDS_TO_UNAPPROVE };
