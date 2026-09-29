#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-312-poteva-lego-2026-09-29.cjs
//
// ita_for_eng seed 312 goes to poteva (Kai, 2026-09-29, job #889·I, follow-on to canon K35/K36). #886·I held it because poteva was
// untaught until S0313L01. Kai's ruling: the seed changes to poteva and it gets its OWN LEGO introducing poteva (both sides meaningful).
//   seed 312  she said that she could use the other room tomorrow night | ha detto che poteva usare l'altra stanza domani sera
//   NEW LEGO S0312L02  she said that she could | ha detto che poteva   (M; she said|ha detto, that|che, she could|poteva) — own basket, own intro
//   S0312L01 B03, U02, U07: potrebbe → poteva (known unchanged; they stay under "the other room")
// S0313L01 "he said that he couldn't | ha detto che non poteva" stays NEW as a whole (different pronoun AND polarity from S0312L02 —
// the both-sides duplicate rule fires on the whole LEGO, not on a component tile); its intro names only the LEGO, so it never
// introduced poteva separately and needs no trimming. Not-new baskets are never played (P25) so nothing is rehomed.
// AUDIO: the ONE route, make-before-break (dry run, one real call, no retries, voiceBound); any refusal → NOTHING is written.
//   node …            dry run     RENDER_DRY=1 node …    + clip costs     APPLY=1 node …    write     CHECK=1 node …    end-state
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#889·I';
const SWEEP = 'ita-312-poteva-lego-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-29 (job #889·I): seed 312 goes to poteva; it gets its own LEGO 'she said that she could | ha detto che poteva' introducing poteva; 312 L01 B03/U02/U07 → poteva; S0313L01 re-checked (stays new).";
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
function containsWords(hay, needle) { const h = words(hay); for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); } return true; }
function legoPosition(p, l) { p = norm(p); l = norm(l); if (p === l) return null; if (p.startsWith(l + ' ')) return 'start'; if (p.endsWith(' ' + l)) return 'end'; return 'middle'; }
const X = (known, target) => ({ known, target });

const SEED = 312;
const SEED_AFTER = X('she said that she could use the other room tomorrow night', "ha detto che poteva usare l'altra stanza domani sera");
const SEED_BEFORE_TARGET = "ha detto che potrebbe usare l'altra stanza domani sera";
const NEW_LEGO = { id: 'S0312L02', index: 2, ...X('she said that she could', 'ha detto che poteva'), type: 'M',
  components: [X('she said', 'ha detto'), X('that', 'che'), X('she could', 'poteva')],
  intro: "The Italian for: 'she said that she could', as in — 'she said that she could use the other room tomorrow night', is:" };
/** L01 rows whose said+could target moves from potrebbe to poteva (known unchanged) */
const L01_EDITS = [
  { id: 'S0312L01B03', known: 'she said she could use the other room', before: "ha detto che potrebbe usare l'altra stanza", after: "ha detto che poteva usare l'altra stanza" },
  { id: 'S0312L01U02', known: 'she said she could use the other room tomorrow night', before: "ha detto che potrebbe usare l'altra stanza domani sera", after: "ha detto che poteva usare l'altra stanza domani sera" },
  { id: 'S0312L01U07', known: 'she said that she could use the other room tomorrow night', before: "ha detto che potrebbe usare l'altra stanza domani sera", after: "ha detto che poteva usare l'altra stanza domani sera" },
];
/** the new LEGO's basket: every build/use contains the LEGO on both sides */
const BASKET = [
  ['B', 'she said that she could', 'ha detto che poteva'],
  ['B', 'she said that she could come', 'ha detto che poteva venire'],
  ['B', 'she said that she could write a story', 'ha detto che poteva scrivere una storia'],
  ['U', 'she said that she could learn Italian', 'ha detto che poteva imparare italiano'],
  ['U', 'she said that she could explain what she wanted', 'ha detto che poteva spiegare quello che voleva'],
  ['U', 'she said that she could write a story about that man', "ha detto che poteva scrivere una storia su quell'uomo"],
  ['U', 'she said that she could show you something important', 'ha detto che poteva mostrarti qualcosa di importante'],
  ['U', 'she said that she could work from home tomorrow', 'ha detto che poteva lavorare da casa domani'],
  ['U', 'she said that she could speak to you yesterday', 'ha detto che poteva parlare con te ieri'],
];
const NEW_ROWS = [
  ...NEW_LEGO.components.map((c, i) => ({ id: `S0312L02C0${i + 1}`, role: 'component', ...c })),
  ...BASKET.map(([k, kn, tg], i) => { const n = BASKET.slice(0, i + 1).filter((b) => b[0] === k).length; return { id: `S0312L02${k}0${n}`, role: k === 'B' ? 'build' : 'use', known: kn, target: tg }; }),
];

/** End-state rule: seed 312 says poteva wherever it reports "said … could"; S0312L02 exists and every played row contains it. */
function endStateProblems(rows) {
  const out = [];
  const seed = rows.find((r) => r.kind === 'seed' && r.sn === SEED);
  if (!seed || norm(seed.target) !== norm(SEED_AFTER.target)) out.push(`seed 312 says "${seed && seed.target}"`);
  for (const r of rows.filter((r) => r.sn === SEED && r.kind !== 'lego' && r.kind !== 'component' && /\bsaid\b.*\bcould\b/.test(norm(r.known))))
    if (!/\bpoteva\b/.test(norm(r.target))) out.push(`${r.id}: said + could says "${r.target}" — rule: poteva`);
  const l = rows.find((r) => r.kind === 'lego' && r.id === NEW_LEGO.id);
  if (!l || norm(l.known) !== norm(NEW_LEGO.known) || norm(l.target) !== norm(NEW_LEGO.target)) out.push(`${NEW_LEGO.id} is not "${NEW_LEGO.known} | ${NEW_LEGO.target}"`);
  else for (const p of rows.filter((r) => ['build', 'use'].includes(r.kind) && r.id.startsWith(NEW_LEGO.id)))
    if (!containsWords(p.known, l.known) || !containsWords(p.target, l.target)) out.push(`${p.id} does not contain ${NEW_LEGO.id}`);
  return out;
}
function applyPlanToRows(rows) {
  const ed = new Map(L01_EDITS.map((e) => [e.id, e.after]));
  const out = rows.map((r) => (r.kind === 'seed' && r.sn === SEED ? { ...r, ...SEED_AFTER } : ed.has(r.id) ? { ...r, target: ed.get(r.id) } : r));
  out.push({ kind: 'lego', sn: SEED, id: NEW_LEGO.id, known: NEW_LEGO.known, target: NEW_LEGO.target });
  for (const n of NEW_ROWS) out.push({ kind: n.role, sn: SEED, id: n.id, known: n.known, target: n.target });
  return out;
}

async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
function planProblems(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const probs = [];
  const s = byId.S0312; if (!s || s.target !== SEED_BEFORE_TARGET) probs.push(`seed 312 live differs from the plan (${s && s.target})`);
  for (const e of L01_EDITS) { const r = byId[e.id]; if (!r || r.target !== e.before || r.known !== e.known) probs.push(`${e.id} live differs from the plan`); }
  for (const n of [NEW_LEGO.id, ...NEW_ROWS.map((r) => r.id)]) if (byId[n]) probs.push(`${n} already exists`);
  return probs;
}
async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const probs = [];
  for (const n of [{ id: 'seed', ...SEED_AFTER }, ...NEW_ROWS, { id: NEW_LEGO.id, ...NEW_LEGO }]) {
    const u = [...await untaught(pg, SEED, n.known, 'known'), ...await untaught(pg, SEED, n.target, 'target')];
    if (u.length) probs.push(`${n.id} uses words untaught at seed ${SEED}: ${u.join(', ')}`);
  }
  return probs;
}
/** ZUT against the whole course: one English → two Italians among non-component rows is a HOLD. */
function zutProblems(rows) {
  const after = applyPlanToRows(rows).filter((r) => r.kind !== 'component');
  const mine = new Set([...L01_EDITS.map((e) => e.id), ...NEW_ROWS.map((r) => r.id), NEW_LEGO.id, 'S0312']);
  const by = new Map(); for (const r of after) { const k = norm(r.known); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  const out = [];
  for (const r of after.filter((r) => mine.has(r.id)))
    for (const o of by.get(norm(r.known))) if (o.id !== r.id && norm(o.target) !== norm(r.target)) out.push(`${r.id} "${r.known}" → "${r.target}" vs ${o.id} → "${o.target}"`);
  return [...new Set(out)];
}

async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 889-I)` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
function neededClips() {
  const out = [];
  const add = (rowId, slot, text) => out.push({ rowId, slot, text });
  add('S0312', 'target1', SEED_AFTER.target); add('S0312', 'target2', SEED_AFTER.target);
  for (const e of L01_EDITS) { add(e.id, 'target1', e.after); add(e.id, 'target2', e.after); }
  for (const s of ['known', 'target1', 'target2']) add(NEW_LEGO.id, s, s === 'known' ? NEW_LEGO.known : NEW_LEGO.target);
  out.push({ rowId: NEW_LEGO.id, slot: 'presentation', text: NEW_LEGO.intro });
  for (const n of NEW_ROWS) for (const s of ['known', 'target1', 'target2']) add(n.id, s, s === 'known' ? n.known : n.target);
  return out;
}
async function makeClips(pg, log, { dryOnly }) {
  const need = neededClips();
  const keyOf = (n) => `${n.slot}\u0000${n.text}`;
  const jobs = [...new Map(need.map((n) => [keyOf(n), n])).values()];
  log.audio = [];
  for (const n of jobs) {
    const body = { courseCode: COURSE, role: n.slot, text: n.text, voiceId: VOICES[n.slot], voiceBound: true, purpose: `Kai 2026-09-29 seed 312 poteva (${n.rowId})`, ...(n.slot === 'presentation' ? { legoId: NEW_LEGO.id } : {}) };
    const dry = await render({ ...body, dryRun: true });
    const entry = { role: n.slot, text: n.text, dry: { status: dry.status, source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars, error: dry.error } };
    log.audio.push(entry);
    if (!dry.ok) { entry.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    if (dryOnly) { entry.result = 'dry'; continue; }
    const real = await render(body);
    entry.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { entry.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    if (real.source === 'rendered' && !real.charsSpent) { entry.result = "NOT USED — 'rendered' with 0 chars spent"; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms FROM course_audio WHERE id=$1', [real.audioId]);
    entry.clip = clip;
    if (!clip || !voiceOk(VOICES[n.slot], clip.voice_id)) { entry.result = `NOT USED — ${clip?.voice_id} clip for ${n.slot}`; continue; }
    if (norm(clip.text) !== norm(n.text)) { entry.result = `NOT USED — clip text "${clip.text}"`; continue; }
    if (!clip.duration_ms || clip.duration_ms < 200) { entry.result = `NOT USED — duration ${clip.duration_ms}`; continue; }
    entry.result = real.source;
  }
  const good = new Map(log.audio.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.role}\u0000${a.text}`, a.clip.id]));
  return { need, clipFor: (n) => good.get(keyOf(n)), missing: need.filter((n) => !good.get(keyOf(n))) };
}

async function applyContent(pg, supabase, clips, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const slotOf = (rowId, slot) => { const n = clips.need.find((x) => x.rowId === rowId && x.slot === slot); return n ? clips.clipFor(n) : undefined; };
  log.approvedBefore = (await pg.query('SELECT approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED])).rows[0];
  const Ev = {};
  Ev.seed = await ev('seed-edit', { seed_numbers: [SEED], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ seed: SEED, from: SEED_BEFORE_TARGET, to: SEED_AFTER }] });
  Ev.lego = await ev('lego-add', { seed_numbers: [SEED], lego_ids: [NEW_LEGO.id], rows: 1 }, { ruling: RULING, job: JOB, lego: { ...NEW_LEGO, why: 'introduces poteva with both sides meaningful (Kai)' } });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: L01_EDITS.map((e) => full(e.id)), rows: L01_EDITS.length }, { ruling: RULING, job: JOB, changes: L01_EDITS.map((e) => ({ id: full(e.id), from: e.before, to: e.after })) });
  Ev.add = await ev('phrase-add', { seed_numbers: [SEED], phrase_ids: NEW_ROWS.map((r) => full(r.id)), rows: NEW_ROWS.length }, { ruling: RULING, job: JOB, rows: NEW_ROWS.map((r) => ({ id: full(r.id), lego: NEW_LEGO.id, known: r.known, target: r.target, role: r.role })) });
  Ev.unapprove = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { why: 'seed 312 text, LEGO and phrases edited — arrives unchecked', job: JOB, approved_at_before: log.approvedBefore });
  log.events = Ev;
  await pg.query('BEGIN');
  try {
    const st = [slotOf('S0312', 'target1'), slotOf('S0312', 'target2')];
    const r = await pg.query('UPDATE course_seeds SET known_text=$1, target_text=$2, target1_audio_id=$3, target2_audio_id=$4, last_edit_event_id=$5, approved_at=NULL, updated_at=now() WHERE course_code=$6 AND seed_number=$7 AND target_text=$8',
      [SEED_AFTER.known, SEED_AFTER.target, st[0], st[1], Ev.seed, COURSE, SEED, SEED_BEFORE_TARGET]);
    if (r.rowCount !== 1) throw new Error(`seed: ${r.rowCount}`);
    const l = await pg.query(`INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, last_edit_event_id)
      VALUES ($1,$2,$3,$4,true,$5,$6,$7,'draft',$8,$9,$10,$11,$12)`, [COURSE, SEED, NEW_LEGO.index, NEW_LEGO.type, NEW_LEGO.known, NEW_LEGO.target, JSON.stringify(NEW_LEGO.components), slotOf(NEW_LEGO.id, 'known'), slotOf(NEW_LEGO.id, 'target1'), slotOf(NEW_LEGO.id, 'target2'), slotOf(NEW_LEGO.id, 'presentation'), Ev.lego]);
    if (l.rowCount !== 1) throw new Error('lego insert');
    const intro = slotOf(NEW_LEGO.id, 'presentation');
    await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, NEW_LEGO.id, intro]);
    await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [NEW_LEGO.id, intro]);
    for (const e of L01_EDITS) {
      const lp = legoPosition(e.after, 'l\'altra stanza');
      const u = await pg.query(`UPDATE course_practice_phrases SET target_text=$1, word_count=$2, lego_count=$3, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, lego_position=$4, last_edit_event_id=$5, updated_at=now()
        WHERE course_code=$6 AND id=$7 AND target_text=$8`, [e.after, e.after.length, e.after.split(/\s+/).length, lp, Ev.phrase, COURSE, full(e.id), e.before]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: ${u.rowCount}`);
      for (const sl of ['target1', 'target2']) { // the phrase trigger drops links set in the same UPDATE: set after
        await pg.query(`UPDATE course_practice_phrases SET ${sl}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND ${sl}_audio_id IS DISTINCT FROM $1`, [slotOf(e.id, sl), COURSE, full(e.id)]);
      }
    }
    // positions: components 1-3, builds 4-6, uses 7-12 (the shape S0313L02 has)
    let pos = 0;
    for (const n of NEW_ROWS) {
      const isComp = n.role === 'component';
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id, known_audio_id, target1_audio_id, target2_audio_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,$14,$15,$16,$17,$18)`,
        [full(n.id), COURSE, SEED, NEW_LEGO.index, ++pos, n.known, n.target, n.target.length, n.target.split(/\s+/).length, JSON.stringify(isComp ? { buildup: 'component' } : { format: 'build_use', source: SWEEP, job: JOB }), n.role, isComp ? null : legoPosition(n.target, NEW_LEGO.target), NEW_LEGO.id, true, Ev.add, slotOf(n.id, 'known'), slotOf(n.id, 'target1'), slotOf(n.id, 'target2')]);
      if (ins.rowCount !== 1) throw new Error(`${n.id}: insert`);
    }
    const probs = endStateProblems(await loadRows(pg));
    if (probs.length) throw new Error('end state does not hold inside the transaction:\n  ' + probs.join('\n  '));
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 312 → poteva, new LEGO ${NEW_LEGO.id} + ${NEW_ROWS.length} rows; every slot filled through /api/audio/render`, metadata: { job: JOB, seeds: [SEED] } });
}
async function verifyAudio(pg) {
  const ids = [...L01_EDITS.map((e) => full(e.id)), ...NEW_ROWS.map((r) => full(r.id))];
  const { rows } = await pg.query(`SELECT x.id, x.known_text, x.target_text, ak.text kx, a1.voice_id v1, a1.text x1, a2.voice_id v2, a2.text x2, x.target1_audio_id t1, x.target2_audio_id t2
    FROM (SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)
      UNION ALL SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$3
      UNION ALL SELECT seed_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=$4) x
    LEFT JOIN course_audio ak ON ak.id=x.known_audio_id LEFT JOIN course_audio a1 ON a1.id=x.target1_audio_id LEFT JOIN course_audio a2 ON a2.id=x.target2_audio_id ORDER BY 1`, [COURSE, ids, NEW_LEGO.id, SEED]);
  const probs = [];
  for (const r of rows) {
    const id = short(r.id);
    if (!r.kx || !r.x1 || !r.x2) probs.push(`${id}: NULL slot`);
    if (r.t1 && r.t1 === r.t2) probs.push(`${id}: target1 = target2`);
    if (r.kx && norm(r.kx) !== norm(r.known_text)) probs.push(`${id}: known clip says "${r.kx}"`);
    if (r.x1 && norm(r.x1) !== norm(r.target_text)) probs.push(`${id}: target1 clip says "${r.x1}"`);
    if (r.x2 && norm(r.x2) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${r.x2}"`);
    if (r.x1 && !/Elsa|xai_|elevenlabs/.test(r.v1 || '')) probs.push(`${id}: target1 voice ${r.v1}`);
    if (r.x2 && !/Benigno|xai_|elevenlabs/.test(r.v2 || '')) probs.push(`${id}: target2 voice ${r.v2}`);
  }
  const { rows: [p] } = await pg.query(`SELECT a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id::text WHERE l.course_code=$1 AND l.lego_id=$2`, [COURSE, NEW_LEGO.id]);
  if (!p?.text) probs.push(`${NEW_LEGO.id}: intro SILENT`); else if (p.text !== NEW_LEGO.intro) probs.push(`${NEW_LEGO.id}: intro clip says "${p.text}"`);
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
    if (process.env.CHECK === '1') {
      const probs = endStateProblems(rows); const a = await verifyAudio(pg);
      console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course');
      console.log(a.probs.length ? 'AUDIO PROBLEMS:\n  ' + a.probs.join('\n  ') : `audio: ${a.rows} rows checked`);
      process.exitCode = probs.length || a.probs.length ? 2 : 0; return;
    }
    const APPLY = process.env.APPLY === '1';
    const before = endStateProblems(rows);
    const probs = [...planProblems(rows), ...(await vocabularyGuards(pg)), ...zutProblems(rows).map((z) => `ZUT: ${z}`), ...endStateProblems(applyPlanToRows(rows)).map((p) => `after-plan: ${p}`)];
    log.before = before; log.problems = probs;
    console.log(`\n══ ${COURSE} — seed 312 poteva — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\nseed 312 + ${L01_EDITS.length} L01 rows + LEGO ${NEW_LEGO.id} + ${NEW_ROWS.length} new rows; rule violations now: ${before.length}`);
    console.log(probs.length ? '\nPROBLEMS:\n  ' + probs.join('\n  ') : '\nguards hold: live text = plan, every new row contains its LEGO, no untaught word, no ZUT clash, end state holds on the planned rows');
    if (probs.length) { process.exitCode = 2; save('dryrun'); return; }
    if (process.env.RENDER_DRY === '1' || APPLY) {
      const clips = await makeClips(pg, log, { dryOnly: !APPLY });
      for (const a of log.audio) console.log(`  ${a.role.padEnd(12)} ${String(a.dry.source || a.dry.code).padEnd(12)} ${a.result.padEnd(10)} "${a.text}"`);
      console.log(`${log.audio.length} distinct clips; would spend ${log.audio.reduce((s, a) => s + (a.dry.wouldSpendChars || 0), 0)} chars on the dry run`);
      if (APPLY) {
        if (clips.missing.length) { log.held = clips.missing.map((n) => `${n.rowId}.${n.slot}`); console.log(`HELD — ${clips.missing.length} slots have no verified clip, NOTHING written:\n  ${log.held.join('\n  ')}`); process.exitCode = 2; save('held'); return; }
        const { createClient } = require('@supabase/supabase-js');
        await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), clips, log);
        console.log(`APPLIED. events=${JSON.stringify(log.events)}`);
        const v = await verifyAudio(pg); log.verify = v.probs;
        console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : `audio verified on ${v.rows} rows`);
      }
    }
    save(APPLY ? 'applied' : 'dryrun');
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { endStateProblems, applyPlanToRows, NEW_LEGO, NEW_ROWS, L01_EDITS, SEED_AFTER };
