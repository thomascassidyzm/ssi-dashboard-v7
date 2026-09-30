#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-72-parlando-2026-09-30.cjs
//
// ita_for_eng — Kai's ruling, 2026-09-30 (job #925·I): seed 72 is rewritten from
//   "I think that you're doing very well | penso che tu stia andando molto bene"   (andare bene, an idiom)
// to
//   "I think that you're speaking very well | penso che tu stia parlando molto bene" (performance meaning).
//
// THE CUT (canon K39). L01 "I think that | penso che" stays with its four phrases. L02 is RE-CUT in place (a LEGO is never
// deleted): "I think that you're speaking | penso che tu stia parlando" — the subjunctive carries its trigger inside it
// (K38: a LEGO for a subjunctive with no context is not acceptable). L03 is NEW ROW, NOT NEW: "very well | molto bene" is
// already taught with both sides identical at S0013L02 (and S0055L03 is the not-new precedent: one self-component, no
// basket, no intro), so it needs no LEGO of its own. The alternative cut (separate "well | bene" + "very | molto") was
// rejected: it would make "well | bene" a second LEGO that overlaps S0013L02 on both words and needs a basket nobody
// needs, while the not-new pair has no ZUT clash (one English, one Italian) and no new basket.
//
//   node tools/course-optimization/ita-seed-72-parlando-2026-09-30.cjs            # dry run: plan + guards
//   APPLY=1 node tools/course-optimization/ita-seed-72-parlando-2026-09-30.cjs    # content in ONE transaction, then audio (the ONE route)
//   AUDIO_ONLY=1 node …                                                            # audio step alone
//   CHECK=1 node …                                                                 # verify the live state
//
// AUDIO: only through POST /api/audio/render on production Popty — dry run first, one real call per (role,text), never a
// retry; a refusal is recorded as a gap. A returned clip in the wrong voice is NOT linked.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#925·I';
const SWEEP = 'ita-seed-72-parlando-2026-09-30';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-30 (job #925·I): seed 72 = 'I think that you're speaking very well | penso che tu stia parlando molto bene'; L01 kept, L02 'I think that you're speaking | penso che tu stia parlando', 'very well | molto bene' not new (S0013L02)";
const SEED = 72;
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
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
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');

// ── The plan ───────────────────────────────────────────────────────────────────────────────
const SEED_FROM = { known: "I think that you're doing very well", target: 'penso che tu stia andando molto bene' };
const SEED_TO = { known: "I think that you're speaking very well", target: 'penso che tu stia parlando molto bene' };
const L02 = {
  id: 'S0072L02',
  from: { known: "I think that you're doing", target: 'penso che tu stia andando', components: [{ known: 'I think that', target: 'penso che' }, { known: "you're doing", target: 'tu stia andando' }] },
  to: { known: "I think that you're speaking", target: 'penso che tu stia parlando', components: [{ known: 'I think that', target: 'penso che' }, { known: "you're speaking", target: 'tu stia parlando' }] },
  intro: "The Italian for: 'I think that you're speaking', as in — 'I think that you're speaking very well', is:",
};
const L03 = { id: 'S0072L03', type: 'M', is_new: false, known: 'very well', target: 'molto bene', components: [{ known: 'very well', target: 'molto bene' }] };
// L02's basket: every row holds the whole LEGO; subjunctive throughout (no future, no conditional); words all taught by seed 72
const E = (id, before, after) => ({ id, lego: 'S0072L02', before, after });
const EDITS = [
  E('S0072L02B01', { known: "you're doing", target: 'tu stia andando' }, { known: "I think that you're speaking", target: 'penso che tu stia parlando' }),
  E('S0072L02B02', { known: "I think that you're doing well", target: 'penso che tu stia andando bene' }, { known: "I think that you're speaking well", target: 'penso che tu stia parlando bene' }),
  E('S0072L02U01', { known: "I think that you're doing very well", target: 'penso che tu stia andando molto bene' }, { known: "I think that you're speaking very well", target: 'penso che tu stia parlando molto bene' }),
  E('S0072L02U02', { known: "I think that you're doing well now", target: 'penso che tu stia andando bene adesso' }, { known: "I think that you're speaking well now", target: 'penso che tu stia parlando bene adesso' }),
  E('S0072L02U03', { known: "I think that you're doing well with Italian", target: 'penso che tu stia andando bene con italiano' }, { known: "I think that you're speaking Italian very well", target: 'penso che tu stia parlando italiano molto bene' }),
  E('S0072L02U04', { known: "I think that you're doing very well today", target: 'penso che tu stia andando molto bene oggi' }, { known: "I think that you're speaking with me today", target: 'penso che tu stia parlando con me oggi' }),
];
const L03_COMPONENT = { id: 'S0072L03C01', known: 'very well', target: 'molto bene' };
// L01's four existing phrases are untouched in TEXT; they were added 2026-09-29 with no clips at all — their slots are filled here.
const L01_SILENT = ['S0072L01U01', 'S0072L01U02', 'S0072L01U03', 'S0072L01U04'];
const FUTURE_OR_COND = /(er[àò]|ir[àò]|rebbe|rebbero|rei|remmo)( |$)/;

/** Static guards on the plan itself (used by the dry run and the test). */
function planProblems() {
  const probs = [];
  for (const e of EDITS) {
    if (!containsWords(e.after.target, L02.to.target)) probs.push(`${e.id}: target does not contain the whole LEGO "${L02.to.target}"`);
    if (!containsWords(e.after.known, L02.to.known)) probs.push(`${e.id}: known does not contain the whole LEGO "${L02.to.known}"`);
    if (FUTURE_OR_COND.test(norm(e.after.target))) probs.push(`${e.id}: future/conditional in a new phrase`);
    if (!/\bstia\b/.test(norm(e.after.target))) probs.push(`${e.id}: no subjunctive stia`);
    if (/andando|doing/.test(norm(e.after.target + ' ' + e.after.known))) probs.push(`${e.id}: still the andare bene idiom`);
  }
  if (!EDITS.some((e) => norm(e.after.target) === norm(SEED_TO.target))) probs.push('the seed sentence is not in L02\'s played basket (P26)');
  const tiled = `${L02.to.target} ${L03.target}`;
  if (norm(tiled) !== norm(SEED_TO.target)) probs.push(`LEGOs do not tile the seed target: "${tiled}"`);
  if (norm(`${L02.to.known} ${L03.known}`) !== norm(SEED_TO.known)) probs.push('LEGOs do not tile the seed known');
  if (!norm(L02.intro).includes(norm(`'${L02.to.known}'`)) && !L02.intro.includes(`'${L02.to.known}'`)) probs.push('intro does not quote the LEGO');
  return probs;
}

async function liveProblems(pg) {
  const probs = [];
  // untaught words: everything taught in seeds/LEGOs up to seed 72 (new seed text included, since it is edited in the same transaction)
  const { rows } = await pg.query(`SELECT seed_number, target_text FROM course_seeds WHERE course_code=$1 AND seed_number<=$2 AND seed_number<>$2
    UNION ALL SELECT seed_number, target_text FROM course_legos WHERE course_code=$1 AND seed_number<=$2 AND seed_number<>$2`, [COURSE, SEED]);
  const taught = new Set(rows.flatMap((r) => words(r.target_text)));
  for (const w of words(SEED_TO.target)) taught.add(w);            // the seed's own words are taught by its LEGOs
  for (const e of EDITS) for (const w of words(e.after.target)) if (!taught.has(w)) probs.push(`${e.id}: "${w}" is not taught by seed ${SEED}`);
  // ZUT: one English → two Italians against the live course
  const pairs = [...EDITS.map((e) => ({ id: e.id, ...e.after })), { id: 'seed', ...SEED_TO }, { id: L02.id, ...L02.to }, { id: L03.id, known: L03.known, target: L03.target }];
  const ours = new Set(EDITS.map((e) => full(e.id)));
  for (const p of pairs) {
    const { rows: cl } = await pg.query(
      `SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)
       UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)
       UNION ALL SELECT 'seed'||seed_number, target_text FROM course_seeds WHERE course_code=$1 AND lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)`, [COURSE, p.known, p.target]);
    for (const r of cl.filter((r) => !ours.has(r.id))) probs.push(`ZUT: ${p.id} "${p.known}" → "${p.target}" vs ${short(r.id)} → "${r.target_text}"`);
  }
  // L03 must duplicate S0013L02 on BOTH sides (not-new is legitimate only then)
  const { rows: [t] } = await pg.query(`SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id='S0013L02'`, [COURSE]);
  if (!t || norm(t.known_text) !== norm(L03.known) || norm(t.target_text) !== norm(L03.target)) probs.push('S0013L02 is not "very well | molto bene" on both sides — L03 may not be not-new');
  return probs;
}

async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const Ev = {};
  Ev.seed = await ev('seed-edit', { seed_numbers: [SEED], rows: 1 }, { ruling: RULING, job: JOB, from: SEED_FROM, to: SEED_TO });
  Ev.lego = await ev('lego-edit', { seed_numbers: [SEED], lego_ids: [L02.id, L03.id], rows: 2 }, { ruling: RULING, job: JOB, changes: [{ id: L02.id, from: L02.from, to: L02.to }, { id: L03.id, added: L03 }] });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [SEED], phrase_ids: EDITS.map((e) => full(e.id)), rows: EDITS.length }, { ruling: RULING, job: JOB, changes: EDITS.map((e) => ({ id: full(e.id), from: e.before, to: e.after })) });
  Ev.add = await ev('phrase-add', { seed_numbers: [SEED], phrase_ids: [full(L03_COMPONENT.id)], rows: 1 }, { ruling: RULING, job: JOB, rows: [{ id: full(L03_COMPONENT.id), lego: L03.id, known: L03.known, target: L03.target }] });
  Ev.unapprove = await ev('unapprove', { seed_numbers: [SEED], rows: 1 }, { job: JOB, why: 'seed 72 rewritten — Kai should read it', approved_at_before: null });
  log.events = Ev;
  await pg.query('BEGIN');
  try {
    const s = await pg.query(`UPDATE course_seeds SET known_text=$1, target_text=$2, approved_at=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND seed_number=$5 AND known_text=$6 AND target_text=$7`,
      [SEED_TO.known, SEED_TO.target, Ev.seed, COURSE, SEED, SEED_FROM.known, SEED_FROM.target]);
    if (s.rowCount !== 1) throw new Error(`seed ${SEED}: ${s.rowCount} rows`);
    const l = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, presentation_audio_id=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8`,
      [L02.to.known, L02.to.target, JSON.stringify(L02.to.components), Ev.lego, COURSE, L02.id, L02.from.known, L02.from.target]);
    if (l.rowCount !== 1) throw new Error(`${L02.id}: ${l.rowCount} rows`);
    // the stale intro ("…you're doing…") no longer mirrors the LEGO: detach it (the asset is kept, nothing is deleted)
    await pg.query(`UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2`, [COURSE, L02.id]);
    // L03: a new ROW, not a new LEGO (very well | molto bene is S0013L02) — the S0055L03 shape: self-component, no basket, no intro
    const ins = await pg.query(`INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, last_edit_event_id) VALUES ($1,$2,3,$3,false,$4,$5,$6,'draft',$7)`,
      [COURSE, SEED, L03.type, L03.known, L03.target, JSON.stringify(L03.components), Ev.lego]);
    if (ins.rowCount !== 1) throw new Error('L03 insert failed');
    // trg_null_phrase_audio_on_text_change drops the clip of a changed side (assets kept)
    for (const e of EDITS) {
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=$5, lego_id=$6, last_edit_event_id=$7, updated_at=now() WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [e.after.known, e.after.target, e.after.target.length, e.after.target.split(/\s+/).length, legoPosition(e.after.target, L02.to.target), e.lego, Ev.phrase, COURSE, full(e.id), e.before.known, e.before.target]);
      if (r.rowCount !== 1) throw new Error(`${e.id}: ${r.rowCount} rows`);
    }
    const c = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_id, introduce, last_edit_event_id)
      VALUES ($1,$2,$3,3,1,$4,$5,$6,$7,$8,'draft','component','{}',$9,true,$10)`,
      [full(L03_COMPONENT.id), COURSE, SEED, L03_COMPONENT.known, L03_COMPONENT.target, L03_COMPONENT.target.length, 2, JSON.stringify({ source: SWEEP, job: JOB }), L03.id, Ev.add]);
    if (c.rowCount !== 1) throw new Error('L03 component insert failed');
    const { rows: [cnt] } = await pg.query('SELECT count(*)::int n FROM course_legos WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
    if (cnt.n !== 3) throw new Error(`LEGO count ${cnt.n}, expected 3`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 72 rewritten to parlando — seed, L02 re-cut, ${EDITS.length} phrases edited; slots filled through /api/audio/render`, metadata: { job: JOB, seeds: [SEED] } });
}

// ── Audio: the ONE route ───────────────────────────────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
async function emptySlots(pg) {
  const ids = [...EDITS.map((e) => e.id), ...L01_SILENT].map(full);
  const { rows: phr } = await pg.query('SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, ids]);
  const { rows: leg } = await pg.query('SELECT lego_id AS id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, [L02.id, L03.id]]);
  const { rows: [sd] } = await pg.query('SELECT known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  const out = [];
  const rowsAll = [...phr.map((p) => ({ ...p, table: 'course_practice_phrases' })), ...leg.map((l) => ({ ...l, table: 'course_legos' })), { ...sd, id: `S${String(SEED).padStart(4, '0')}`, table: 'course_seeds' }];
  for (const r of rowsAll) {
    if (!r.known_audio_id) out.push({ table: r.table, id: r.id, slot: 'known', text: r.known_text });
    if (!r.target1_audio_id) out.push({ table: r.table, id: r.id, slot: 'target1', text: r.target_text });
    if (!r.target2_audio_id) out.push({ table: r.table, id: r.id, slot: 'target2', text: r.target_text });
  }
  const l2 = leg.find((l) => l.id === L02.id);
  if (!l2.presentation_audio_id) out.push({ table: 'course_legos', id: L02.id, slot: 'presentation', text: L02.intro });
  return out;
}
const linkWhere = { course_legos: 'lego_id=$3', course_practice_phrases: 'id=$3', course_seeds: 'seed_id=$3' };
async function fillAudio(pg, log) {
  const slots = await emptySlots(pg);
  log.audio = [];
  const keyOf = (s) => `${s.slot}\u0000${s.text}`;
  const jobs = [...new Map(slots.map((s) => [keyOf(s), s])).values()];
  for (const s of jobs) {
    const body = { courseCode: COURSE, role: s.slot, text: s.text, voiceId: VOICES[s.slot], purpose: `Kai 2026-09-30 seed 72 parlando (${short(s.id)})`, ...(s.slot === 'presentation' ? { legoId: L02.id } : {}) };
    const dry = await render({ ...body, dryRun: true });
    const entry = { role: s.slot, text: s.text, dry: { status: dry.status, source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars, audioId: dry.audioId } };
    log.audio.push(entry);
    if (!dry.ok) { entry.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    const real = await render(body);
    entry.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { entry.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    // a 'rendered' answer that spent nothing handed back another clip's bytes (seen 2026-09-29) — never link it
    if (real.source === 'rendered' && !real.charsSpent) { entry.result = `NOT LINKED — 'rendered' with 0 chars spent`; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms FROM course_audio WHERE id=$1', [real.audioId]);
    entry.clip = clip;
    if (!clip || !voiceOk(VOICES[s.slot], clip.voice_id)) { entry.result = `NOT LINKED — route returned a ${clip?.voice_id} clip for ${s.slot} (wanted ${VOICES[s.slot]})`; continue; }
    if (norm(clip.text) !== norm(s.text)) { entry.result = `NOT LINKED — route returned a clip whose text is "${clip.text}"`; continue; }
    entry.result = real.source;
  }
  const good = new Map(log.audio.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.role}\u0000${a.text}`, a.clip.id]));
  const linked = [];
  for (const s of slots) {
    const id = good.get(keyOf(s)); if (!id) continue;
    if (s.slot === 'presentation') {
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [id, COURSE, L02.id]);
      const up = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [id, COURSE, L02.id]);
      if (!up.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, L02.id, id]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND lego_id IS NULL', [L02.id, id]);
    } else {
      const col = `${s.slot}_audio_id`;
      await pg.query(`UPDATE ${s.table} SET ${col}=$1 WHERE course_code=$2 AND ${linkWhere[s.table]} AND ${col} IS NULL`, [id, COURSE, s.id]);
    }
    linked.push(`${short(s.id)}.${s.slot}`);
  }
  log.linked = linked;
}
async function verifyAudio(pg) {
  const probs = [];
  const q = async (sql, args) => (await pg.query(sql, args)).rows;
  const rows = [
    ...await q(`SELECT id, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, [...EDITS.map((e) => e.id), ...L01_SILENT].map(full)]),
    ...await q(`SELECT lego_id id, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, [L02.id, L03.id]]),
    ...await q(`SELECT seed_id id, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_seeds WHERE course_code=$1 AND seed_number=$2`, [COURSE, SEED]),
  ];
  for (const r of rows) {
    const c = async (id) => (id ? (await q('SELECT voice_id, text, duration_ms FROM course_audio WHERE id=$1', [id]))[0] : null);
    const [k, a, b] = [await c(r.k), await c(r.t1), await c(r.t2)];
    const id = short(r.id);
    if (!k || !a || !b) { probs.push(`${id}: NULL slot (${[!k && 'known', !a && 'target1', !b && 'target2'].filter(Boolean).join(', ')})`); continue; }
    if (r.t1 === r.t2 || a.duration_ms === b.duration_ms) probs.push(`${id}: target1 and target2 are the same clip or duration`);
    if (!voiceOk(VOICES.target1, a.voice_id)) probs.push(`${id}: target1 voice ${a.voice_id}`);
    if (!voiceOk(VOICES.target2, b.voice_id)) probs.push(`${id}: target2 voice ${b.voice_id}`);
    if (norm(a.text) !== norm(r.target_text)) probs.push(`${id}: target1 clip says "${a.text}"`);
    if (norm(b.text) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${b.text}"`);
  }
  const [p] = await q(`SELECT a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2`, [COURSE, L02.id]);
  if (!p?.text) probs.push(`${L02.id}: intro SILENT`); else if (p.text !== L02.intro) probs.push(`${L02.id}: intro clip says "${p.text}"`);
  return { rows, probs };
}

/**
 * The route answered every target2 request 'rendered' with 0 chars spent (2026-09-30 13:33–13:35Z): the door found the Elsa clip it had
 * just made for target1 and the route stored those bytes as a Benigno row and linked it (same duration to the millisecond as its target1
 * twin — a real Benigno clip never matches). Same defect and same repair as job #733·I: unlink from every slot, relabel the row to the voice
 * it really is, drop its false Benigno clip_index entry, flag it 'bad'. Assets are kept; nothing is deleted.
 */
async function fenceMislabelledTarget2(pg, log) {
  const ELSA = 'azure_it-IT-ElsaNeural';
  const { rows: twins } = await pg.query(`SELECT DISTINCT a2.id FROM (
      SELECT target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2
      UNION ALL SELECT target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
      UNION ALL SELECT target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=$2) x
    JOIN course_audio a1 ON a1.id=x.t1 JOIN course_audio a2 ON a2.id=x.t2 WHERE a2.voice_id LIKE '%Benigno%' AND a2.duration_ms=a1.duration_ms AND a2.created_at > now() - interval '3 hours'`, [COURSE, SEED]);
  const ids = twins.map((r) => r.id);
  await pg.query('BEGIN');
  try {
    const drops = [];
    for (const t of ['course_practice_phrases', 'course_legos', 'course_seeds']) {
      const key = t === 'course_legos' ? 'lego_id' : t === 'course_seeds' ? 'seed_id' : 'id';
      const { rows } = await pg.query(`UPDATE ${t} SET target2_audio_id=NULL WHERE course_code=$1 AND target2_audio_id = ANY($2::uuid[]) RETURNING ${key} AS row_id`, [COURSE, ids]);
      drops.push(...rows.map((r) => r.row_id));
    }
    const rl = await pg.query(`UPDATE course_audio SET voice_id=$1 WHERE id = ANY($2::uuid[]) AND voice_id LIKE '%Benigno%'`, [ELSA, ids]);
    const ci = await pg.query(`DELETE FROM clip_index WHERE audio_id = ANY($1::uuid[]) AND voice_id LIKE '%Benigno%'`, [ids]);
    for (const id of ids) await pg.query(`INSERT INTO audio_clip_flags (audio_id, course_code, source, detector, severity, reason, metrics, raised_by) VALUES ($1,$2,'detector','duration-twin','bad',$3,$4,$5)`,
      [id, COURSE, `written by POST /api/audio/render as it-IT-BenignoNeural target2 with 0 chars spent: the bytes are the Elsa clip made for target1 a moment earlier (identical duration). Relabelled ${ELSA}, Benigno clip_index entry removed, unlinked from every slot (job ${JOB}).`, JSON.stringify({ twin_duration_equal: true }), SWEEP]);
    await pg.query('COMMIT');
    log.fenced = { clips: ids.length, relabelled: rl.rowCount, clipIndex: ci.rowCount, slotsUnlinked: drops.length };
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    if (process.env.CHECK === '1') {
      const a = await verifyAudio(pg);
      console.log(a.probs.length ? 'AUDIO PROBLEMS:\n  ' + a.probs.join('\n  ') : `audio: ${a.rows.length} rows, no NULL slot, target1 ≠ target2, intro mirrors`);
      process.exitCode = a.probs.length ? 2 : 0; return;
    }
    if (process.env.FENCE === '1') { await fenceMislabelledTarget2(pg, log); console.log(JSON.stringify(log.fenced)); save('fence'); return; }
    if (process.env.AUDIO_ONLY === '1') {
      await fillAudio(pg, log);
      for (const a of log.audio) console.log(`  ${a.role} "${a.text}": dry ${a.dry.source || a.dry.code} → ${a.result}${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms]` : ''}`);
      const v = await verifyAudio(pg); log.verify = v.probs;
      console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : 'audio verified'); save('audio-only'); return;
    }
    const probs = [...planProblems(), ...await liveProblems(pg)];
    console.log(probs.length ? 'PROBLEMS:\n  ' + probs.join('\n  ') : 'guards hold: every basket row holds the whole LEGO, subjunctive, no future/conditional, no untaught word, no ZUT clash, LEGOs tile the seed');
    if (process.env.APPLY !== '1') { for (const e of EDITS) console.log(`  ${e.id}: ${e.after.known} | ${e.after.target}`); return; }
    if (probs.length) throw new Error('refusing to apply');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    await applyContent(pg, supabase, log);
    console.log('content applied in one transaction');
    save('content');
    await fillAudio(pg, log);
    for (const a of log.audio) console.log(`  ${a.role} "${a.text}": → ${a.result}${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms]` : ''}`);
    const v = await verifyAudio(pg); log.verify = v.probs;
    console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : 'audio verified'); save('final');
  } finally { await pg.end(); }
}
module.exports = { SEED_TO, L02, L03, EDITS, planProblems, containsWords };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
