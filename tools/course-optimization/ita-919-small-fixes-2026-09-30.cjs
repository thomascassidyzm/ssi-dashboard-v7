#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-919-small-fixes-2026-09-30.cjs — ita_for_eng, Kai's rulings of 30 Sept 2026 (job #919·I).
//
//   A  seed 72   L02 'you're doing | tu stia andando' is about PERFORMANCE (stia andando = "going well"): it grows to
//                'you're doing very well | tu stia andando molto bene' (S0072L02, type A). Bare B01 deleted, basket re-made so every
//                phrase holds the whole LEGO (P17), intro re-authored (new clip).
//   B  S0655L01  same fault: 'that you're doing | che stia andando' → 'that you're doing very well, madam | che stia andando molto bene,
//                signora' (K32: the formal LEGO keeps madam; every phrase ends ", madam" — a "sir" under a madam LEGO is a break).
//   C  S0129L01  its two component tiles cited the half-idiom 'happy that you're doing': now 'happy that' + 'you're doing so well'.
//   D  seed 312  S0312L02 'she said that she could' now comes FIRST (L01), the room LEGO second, following the seed sentence's order.
//                No learner progress exists for seed 312 (lego_progress / metrics / enrolments all empty at run time), so the ids are
//                re-keyed: the two LEGO rows swap their payloads, the 24 phrase rows and 2 intros move with their LEGO.
//   E  seed 1    S0001L04B03 'con te voglio parlare' deleted (Kai).
// Every edited seed is unapproved. Audio ONLY through POST /api/audio/render (dry run first, one real call, no retries); any refusal
// or wrong-voice clip → NOTHING is written. All content writes go in ONE transaction (debut_keeps_practice is deferred to commit).
//   node …            dry run (guards + ZUT + vocabulary)    RENDER_DRY=1 node …   + clip costs
//   APPLY=1 node …    render + write                         CHECK=1 node …        end-state on the live course
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#919·I';
const SWEEP = 'ita-919-small-fixes-2026-09-30';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-30 (job #919·I): 72 L02 grows to "you\'re doing very well"; 655 L01 likewise + madam; 129 components re-pointed; 312 reordered (frame LEGO first); 1 L04 B03 deleted.';
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
function containsWords(hay, needle) { const h = words(hay); for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); } return true; }
function legoPosition(p, l) { p = norm(p); l = norm(l); if (p === l) return null; if (p.startsWith(l + ' ')) return 'start'; if (p.endsWith(' ' + l)) return 'end'; return 'middle'; }
const X = (known, target) => ({ known, target });

/** PLAN A/B/C — LEGO edits, with the FULL final basket per LEGO: a row not listed is deleted, a row whose id exists is edited, else added. */
const LEGO_PLANS = [
  { // ── A: seed 72 L02 ──
    seed: 72, id: 'S0072L02', index: 2,
    before: X("I think that you're doing", 'penso che tu stia andando'),
    after: X("you're doing very well", 'tu stia andando molto bene'), type: 'A', components: null,
    intro: "The Italian for: 'you're doing very well', as in — 'I think that you're doing very well now', is:",
    holdWhole: X("you're doing very well", 'tu stia andando molto bene'), tail: null,
    rows: [
      ['B02', 'build', "I think that you're doing very well now", 'penso che tu stia andando molto bene adesso'],
      ['B03', 'build', "I'm not sure that you're doing very well", 'non sono sicuro che tu stia andando molto bene'],
      ['B04', 'build', "I don't think that you're doing very well", 'non penso che tu stia andando molto bene'],
      ['U01', 'use', "I think that you're doing very well", 'penso che tu stia andando molto bene'],
      ['U02', 'use', "I'm not sure that you're doing very well today", 'non sono sicuro che tu stia andando molto bene oggi'],
      ['U03', 'use', "I'm not sure that you're doing very well now", 'non sono sicuro che tu stia andando molto bene adesso'],
      ['U04', 'use', "I think that you're doing very well today", 'penso che tu stia andando molto bene oggi'],
      ['U05', 'use', "I don't think that you're doing very well now", 'non penso che tu stia andando molto bene adesso'],
    ],
  },
  { // ── B: S0655L01 (formal, madam) ──
    seed: 655, id: 'S0655L01', index: 1,
    before: X("that you're doing", 'che stia andando'),
    after: X("that you're doing very well, madam", 'che stia andando molto bene, signora'), type: 'M',
    components: [X('that', 'che'), X("you're doing very well", 'stia andando molto bene'), X('madam', 'signora')],
    intro: "The Italian for: 'that you're doing very well, madam', as in — 'I think that you're doing very well now, madam', is:",
    holdWhole: X("that you're doing very well", 'che stia andando molto bene'), tail: X('madam', 'signora'), // K32: LEGO minus its honorific, honorific added back at the end
    rows: [
      ['B02', 'build', "I'm happy that you're doing very well, madam", 'sono felice che stia andando molto bene, signora'],
      ['B03', 'build', "I'm not sure that you're doing very well, madam", 'non sono sicuro che stia andando molto bene, signora'],
      ['B04', 'build', "I think that you're doing very well today, madam", 'penso che stia andando molto bene oggi, signora'],
      ['U01', 'use', "I think that you're doing very well, madam", 'penso che stia andando molto bene, signora'],
      ['U02', 'use', "I think that you're doing very well now, madam", 'penso che stia andando molto bene adesso, signora'],
      ['U03', 'use', "I don't think that you're doing very well, madam", 'non penso che stia andando molto bene, signora'],
      ['U04', 'use', "I'm so happy that you're doing very well, madam", 'sono così felice che stia andando molto bene, signora'],
      ['U05', 'use', "I'm not sure that you're doing very well today, madam", 'non sono sicuro che stia andando molto bene oggi, signora'],
    ],
  },
];
/** PLAN C — S0129L01's tiles (LEGO text unchanged) */
const S129 = {
  lego: 'S0129L01', seed: 129,
  components: [X('happy that', 'felice che'), X("you're doing so well", 'tu stia andando così bene')],
  before: [X("happy that you're doing", 'felice che tu stia andando'), X('so well', 'così bene')],
  rows: [['S0129L01C01', 'happy that', 'felice che'], ['S0129L01C02', "you're doing so well", 'tu stia andando così bene']],
};
/** PLAN E */
const SEED1_DELETE = { id: 'S0001L04B03', known: 'with you I want to speak', target: 'con te voglio parlare', seed: 1 };
/** PLAN D */
const S312 = { seed: 312 };
const UNAPPROVE = [1, 72, 129, 312, 655];

// ── rows / guards ────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
const rowId = (p, id) => `${p.id}${id}`; // 'S0072L02' + 'B02'
function endStateProblems(rows) {
  const out = [];
  for (const p of LEGO_PLANS) {
    const l = rows.find((r) => r.kind === 'lego' && r.id === p.id);
    if (!l || norm(l.known) !== norm(p.after.known) || norm(l.target) !== norm(p.after.target)) { out.push(`${p.id} is not "${p.after.known} | ${p.after.target}"`); continue; }
    const mine = rows.filter((r) => ['build', 'use'].includes(r.kind) && r.id.startsWith(p.id));
    if (mine.length !== p.rows.length) out.push(`${p.id}: ${mine.length} BUILD/USE rows, plan has ${p.rows.length}`);
    for (const r of mine) {
      if (!containsWords(r.known, p.holdWhole.known) || !containsWords(r.target, p.holdWhole.target)) out.push(`${r.id} does not hold the whole LEGO "${p.holdWhole.known} | ${p.holdWhole.target}" (P17)`);
      if (p.tail && !(norm(r.known).endsWith(norm(p.tail.known)) && norm(r.target).endsWith(norm(p.tail.target)))) out.push(`${r.id} does not end "${p.tail.known} | ${p.tail.target}" (K32)`);
      if (norm(r.known) === norm(p.holdWhole.known) && !p.tail) out.push(`${r.id} is the bare LEGO`);
    }
  }
  const b03 = rows.find((r) => r.id === SEED1_DELETE.id); if (b03) out.push(`${SEED1_DELETE.id} still exists`);
  for (const r of S129.rows) { const x = rows.find((y) => y.id === r[0]); if (!x || norm(x.known) !== norm(r[1]) || norm(x.target) !== norm(r[2])) out.push(`${r[0]} is not "${r[1]} | ${r[2]}"`); }
  const l1 = rows.find((r) => r.kind === 'lego' && r.id === 'S0312L01'), l2 = rows.find((r) => r.kind === 'lego' && r.id === 'S0312L02');
  if (!l1 || !/^she said that she could/i.test(l1.known)) out.push('S0312L01 is not the frame LEGO "she said that she could"');
  if (!l2 || !/^the other room/i.test(l2.known)) out.push('S0312L02 is not "the other room"');
  return out;
}
async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 AND phrase_role IN ('build','use') UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const probs = [];
  const check = async (id, seed, known, target) => { const u = [...await untaught(pg, seed, known, 'known'), ...await untaught(pg, seed, target, 'target')]; if (u.length) probs.push(`${id} uses words untaught at seed ${seed}: ${u.join(', ')}`); };
  for (const p of LEGO_PLANS) {
    await check(p.id, p.seed, p.after.known, p.after.target);
    for (const [id, , known, target] of p.rows) await check(rowId(p, id), p.seed, known, target);
  }
  for (const r of S129.rows) await check(r[0], 129, r[1], r[2]);
  return probs;
}
/** ZUT against the whole course (non-component rows): one known → two different targets, for every row this plan writes */
function zutProblems(rows) {
  const mineIds = new Set([...LEGO_PLANS.flatMap((p) => [p.id, ...p.rows.map(([id]) => rowId(p, id))])]);
  const after = rows.filter((r) => r.kind !== 'component' && !(r.id === SEED1_DELETE.id))
    .map((r) => { const p = LEGO_PLANS.find((q) => q.id === r.id); return p ? { ...r, ...p.after } : r; });
  for (const p of LEGO_PLANS) for (const [id, role, known, target] of p.rows) { const i = after.findIndex((r) => r.id === rowId(p, id)); const nr = { kind: role, sn: p.seed, id: rowId(p, id), known, target }; if (i >= 0) after[i] = nr; else after.push(nr); }
  const by = new Map(); for (const r of after) { const k = norm(r.known); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  const out = [];
  for (const r of after.filter((r) => mineIds.has(r.id)))
    for (const o of by.get(norm(r.known))) if (o.id !== r.id && norm(o.target) !== norm(r.target)) out.push(`${r.id} "${r.known}" → "${r.target}" vs ${o.id} → "${o.target}"`);
  return [...new Set(out)];
}
async function planProblems(pg, rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const probs = [];
  for (const p of LEGO_PLANS) { const l = byId[p.id]; if (!l || l.known !== p.before.known || l.target !== p.before.target) probs.push(`${p.id} live "${l && l.known} | ${l && l.target}" differs from the plan's before`); }
  for (const c of S129.rows) if (!byId[c[0]]) probs.push(`${c[0]} missing`);
  const b = byId[SEED1_DELETE.id]; if (!b || b.target !== SEED1_DELETE.target) probs.push(`${SEED1_DELETE.id} live differs (${b && b.target})`);
  const l1 = byId.S0312L01, l2 = byId.S0312L02;
  if (!l1 || !/^the other room/.test(l1.known) || !l2 || !/^she said that she could/.test(l2.known)) probs.push('S0312 is not in the before-state the plan expects');
  const { rows: prog } = await pg.query(`SELECT (SELECT count(*) FROM lego_progress WHERE course_id=$1 AND lego_id LIKE 'S0312%')::int a, (SELECT count(*) FROM learner_lego_metrics WHERE course_code=$1 AND lego_id LIKE 'S0312%')::int b, (SELECT count(*) FROM course_enrollments WHERE course_id=$1 AND highest_completed_seed>=312)::int c, (SELECT count(*) FROM course_lego_positions WHERE course_code=$1 AND lego_id LIKE 'S0312%')::int d`, [COURSE]);
  if (prog[0].a || prog[0].b || prog[0].c || prog[0].d) probs.push(`learner state exists for seed 312 (${JSON.stringify(prog[0])}) — renumbering is NOT safe`);
  return probs;
}

// ── audio: the one route ─────────────────────────────────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 919-I)` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
/** rows whose text is new/changed need known + target1 + target2 clips; each LEGO intro needs a presentation clip */
function neededClips(live) {
  const out = [];
  const add = (rowId, slot, text, legoId) => out.push({ rowId, slot, text, legoId });
  const changed = (id, known, target) => { const r = live[id]; return !r || r.known !== known || r.target !== target; };
  const three = (id, known, target) => { add(id, 'known', known); add(id, 'target1', target); add(id, 'target2', target); };
  for (const p of LEGO_PLANS) {
    three(p.id, p.after.known, p.after.target);
    add(p.id, 'presentation', p.intro, p.id);
    for (const [id, , known, target] of p.rows) if (changed(rowId(p, id), known, target)) three(rowId(p, id), known, target);
  }
  for (const r of S129.rows) if (changed(r[0], r[1], r[2])) three(r[0], r[1], r[2]);
  return out;
}
async function makeClips(pg, log, live, { dryOnly }) {
  const need = neededClips(live);
  const keyOf = (n) => `${n.slot}\u0000${n.text}`;
  const jobs = [...new Map(need.map((n) => [keyOf(n), n])).values()];
  log.audio = [];
  for (const n of jobs) {
    const body = { courseCode: COURSE, role: n.slot, text: n.text, voiceId: VOICES[n.slot], voiceBound: true, purpose: `Kai 2026-09-30 small fixes 72/655/129 (${n.rowId})`, ...(n.slot === 'presentation' ? { legoId: n.legoId } : {}) };
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

// ── the write ────────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, clips, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const slotOf = (id, slot) => { const n = clips.need.find((x) => x.rowId === id && x.slot === slot); return n ? clips.clipFor(n) : undefined; };
  log.approvedBefore = (await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, UNAPPROVE])).rows;
  const { rows: liveRows } = await pg.query('SELECT id, target_text, known_text, position, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND (seed_number = ANY($2))', [COURSE, [72, 655, 129]]);
  const liveById = new Map(liveRows.map((r) => [short(r.id), r]));
  const Ev = {};
  Ev.lego = await ev('lego-edit', { seed_numbers: [72, 655], lego_ids: LEGO_PLANS.map((p) => p.id), rows: 2 }, { ruling: RULING, job: JOB, changes: LEGO_PLANS.map((p) => ({ id: p.id, from: p.before, to: p.after })) });
  Ev.phrases = await ev('phrase-edit', { seed_numbers: [72, 655, 129], phrase_ids: LEGO_PLANS.flatMap((p) => p.rows.map(([id]) => full(rowId(p, id)))).concat(S129.rows.map((r) => full(r[0]))), rows: 0 }, { ruling: RULING, job: JOB, note: 'full baskets for S0072L02 and S0655L01 (every phrase holds the whole LEGO); S0129L01 tiles', baskets: LEGO_PLANS.map((p) => ({ lego: p.id, rows: p.rows })), s129: S129 });
  Ev.del = await ev('phrase-delete', { seed_numbers: [1, 72, 655], phrase_ids: [full(SEED1_DELETE.id), full('S0072L02B01'), full('S0655L01B01')], rows: 3 }, { ruling: RULING, job: JOB, deleted: [SEED1_DELETE, { id: 'S0072L02B01', known: "you're doing", target: 'tu stia andando', why: 'bare LEGO' }, { id: 'S0655L01B01', known: "that you're doing", target: 'che stia andando', why: 'bare LEGO' }] });
  Ev.reorder = await ev('lego-reorder', { seed_numbers: [312], lego_ids: ['S0312L01', 'S0312L02'], rows: 26 }, { ruling: RULING, job: JOB, note: 'S0312L02 (she said that she could) is now S0312L01; the room LEGO is S0312L02; 24 phrase rows and 2 intros re-keyed with their LEGO; no learner progress existed' });
  Ev.unapprove = await ev('unapprove', { seed_numbers: UNAPPROVE, rows: UNAPPROVE.length }, { why: 'seeds edited — arrive unchecked', job: JOB, approved_before: log.approvedBefore });
  log.events = Ev;

  await pg.query('BEGIN');
  try {
    // ── A/B: LEGO text, then links, then intro ──
    for (const p of LEGO_PLANS) {
      const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, type=$3, components=$4, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND lego_id=$7 AND target_text=$8`,
        [p.after.known, p.after.target, p.type, p.components ? JSON.stringify(p.components) : null, Ev.lego, COURSE, p.id, p.before.target]);
      if (u.rowCount !== 1) throw new Error(`${p.id}: ${u.rowCount}`);
      await pg.query('UPDATE course_legos SET known_audio_id=$3, target1_audio_id=$4, target2_audio_id=$5 WHERE course_code=$1 AND lego_id=$2', [COURSE, p.id, slotOf(p.id, 'known'), slotOf(p.id, 'target1'), slotOf(p.id, 'target2')]);
      const intro = slotOf(p.id, 'presentation');
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [intro, COURSE, p.id]);
      const li = await pg.query('UPDATE lego_introductions SET audio_uuid=$1, presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [intro, COURSE, p.id]);
      if (!li.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, p.id, intro]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [p.id, intro]);
      // basket: park every row's position out of the way, delete the unlisted, edit/insert the listed
      await pg.query(`UPDATE course_practice_phrases SET position = position + 1000 WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3`, [COURSE, p.seed, p.index]);
      const keep = p.rows.map(([id]) => full(rowId(p, id)));
      const d = await pg.query(`DELETE FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND phrase_role IN ('build','use') AND NOT (id = ANY($4))`, [COURSE, p.seed, p.index, keep]);
      log[`deleted_${p.id}`] = d.rowCount;
      let pos = 0;
      for (const [id, role, known, target] of p.rows) {
        pos += 1;
        const rid = full(rowId(p, id));
        const cut = p.holdWhole.target;
        const lp = legoPosition(target.replace(/, signora$/, ''), cut);
        const ex = liveById.get(rowId(p, id));
        const vals = [known, target, target.length, target.split(/\s+/).length, lp, Ev.phrases];
        if (ex) {
          const same = ex.known_text === known && ex.target_text === target;
          const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, lego_position=$5, last_edit_event_id=$6, position=${pos}, phrase_role='${role}'${same ? '' : ', qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL'}, updated_at=now() WHERE course_code=$7 AND id=$8`, [...vals, COURSE, rid]);
          if (r.rowCount !== 1) throw new Error(`${rid}: update ${r.rowCount}`);
          if (!same) for (const [col, s] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2']]) await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id=$3`, [slotOf(rowId(p, id), s), COURSE, rid]);
        } else {
          const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id, known_audio_id, target1_audio_id, target2_audio_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,true,$14,$15,$16,$17)`,
            [rid, COURSE, p.seed, p.index, pos, known, target, target.length, target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), role, lp, p.id, Ev.phrases, slotOf(rowId(p, id), 'known'), slotOf(rowId(p, id), 'target1'), slotOf(rowId(p, id), 'target2')]);
          if (ins.rowCount !== 1) throw new Error(`${rid}: insert`);
        }
      }
      // any surviving component rows keep their (parked) position: bring them back
      await pg.query(`UPDATE course_practice_phrases SET position = position - 1000 WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND position >= 1000`, [COURSE, p.seed, p.index]);
    }
    // ── C: S0129L01 tiles ──
    await pg.query('UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4', [JSON.stringify(S129.components), Ev.phrases, COURSE, S129.lego]);
    for (const [id, known, target] of S129.rows) {
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7`, [known, target, target.length, target.split(/\s+/).length, Ev.phrases, COURSE, full(id)]);
      if (r.rowCount !== 1) throw new Error(`${id}: ${r.rowCount}`);
      for (const [col, s] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2']]) await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id=$3`, [slotOf(id, s), COURSE, full(id)]);
    }
    // ── E: seed 1 ──
    const e = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND target_text=$3', [COURSE, full(SEED1_DELETE.id), SEED1_DELETE.target]);
    if (e.rowCount !== 1) throw new Error('S0001L04B03 delete');
    // ── D: seed 312 — swap the LEGO payloads, re-key phrases + intros ──
    const cols = 'type, is_new, known_text, target_text, components, status, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target_text_roman, known_gloss_segments';
    const { rows: [a, b] } = await pg.query(`SELECT ${cols} FROM course_legos WHERE course_code=$1 AND seed_number=312 ORDER BY lego_index`, [COURSE]);
    const swap = async (idx, src) => {
      await pg.query(`UPDATE course_legos SET type=$1, known_text=$2, target_text=$3, components=$4, status=$5, target_text_roman=$6, known_gloss_segments=$7, last_edit_event_id=$8, updated_at=now() WHERE course_code=$9 AND seed_number=312 AND lego_index=$10`,
        [src.type, src.known_text, src.target_text, src.components == null ? null : JSON.stringify(src.components), src.status, src.target_text_roman, src.known_gloss_segments == null ? null : JSON.stringify(src.known_gloss_segments), Ev.reorder, COURSE, idx]);
      await pg.query(`UPDATE course_legos SET known_audio_id=$1, target1_audio_id=$2, target2_audio_id=$3, presentation_audio_id=$4 WHERE course_code=$5 AND seed_number=312 AND lego_index=$6`, [src.known_audio_id, src.target1_audio_id, src.target2_audio_id, src.presentation_audio_id, COURSE, idx]);
    };
    await swap(1, b); await swap(2, a);
    // intros: the row for old L01 (room) becomes L02 and vice versa
    for (const t of ['lego_introductions', 'course_audio']) { // unique (course_code, lego_id) on the first: swap through a parking value
      await pg.query(`UPDATE ${t} SET lego_id = 'S0312Lxx' || right(lego_id, 1) WHERE course_code=$1 AND lego_id IN ('S0312L01','S0312L02')`, [COURSE]);
      await pg.query(`UPDATE ${t} SET lego_id = CASE lego_id WHEN 'S0312Lxx1' THEN 'S0312L02' ELSE 'S0312L01' END WHERE course_code=$1 AND lego_id IN ('S0312Lxx1','S0312Lxx2')`, [COURSE]);
    }
    await pg.query(`UPDATE course_practice_phrases SET position = position + 1000 WHERE course_code=$1 AND seed_number=312`, [COURSE]);
    await pg.query(`UPDATE course_practice_phrases SET id = 'tmp:' || id WHERE course_code=$1 AND seed_number=312`, [COURSE]);
    const mv = await pg.query(`UPDATE course_practice_phrases SET
        id = replace(id, 'tmp:', ''),
        lego_index = CASE lego_index WHEN 1 THEN 2 ELSE 1 END,
        lego_id = CASE WHEN lego_id IS NULL OR lego_id = '' THEN lego_id WHEN lego_id = 'S0312L01' THEN 'S0312L02' ELSE 'S0312L01' END,
        position = position - 1000, last_edit_event_id = $2
      WHERE course_code=$1 AND seed_number=312`, [COURSE, Ev.reorder]);
    // the id text carries the LEGO label: swap L01 <-> L02 inside it
    await pg.query(`UPDATE course_practice_phrases SET id = regexp_replace(id, 'S0312L0([12])', 'S0312LX\\1') WHERE course_code=$1 AND seed_number=312`, [COURSE]);
    await pg.query(`UPDATE course_practice_phrases SET id = replace(replace(id, 'S0312LX1', 'S0312L02'), 'S0312LX2', 'S0312L01') WHERE course_code=$1 AND seed_number=312`, [COURSE]);
    log.moved312 = mv.rowCount;
    // ── unapprove ──
    await pg.query('UPDATE course_seeds SET approved_at=NULL, updated_at=now() WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, UNAPPROVE]);
    const probs = endStateProblems(await loadRows(pg));
    if (probs.length) throw new Error('end state does not hold inside the transaction:\n  ' + probs.join('\n  '));
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seeds 72/655/129 re-cut, 312 reordered, 1 L04 B03 deleted; every new slot filled through /api/audio/render`, metadata: { job: JOB, seeds: UNAPPROVE } });
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    const rows = await loadRows(pg);
    if (process.env.CHECK === '1') { const probs = endStateProblems(rows); console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course'); process.exitCode = probs.length ? 2 : 0; return; }
    const APPLY = process.env.APPLY === '1';
    const live = Object.fromEntries(rows.map((r) => [r.id, r]));
    const probs = [...await planProblems(pg, rows), ...await vocabularyGuards(pg), ...zutProblems(rows).map((z) => `ZUT: ${z}`)];
    log.problems = probs;
    console.log(`\n══ ${COURSE} — 919 small fixes — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(probs.length ? '\nPROBLEMS:\n  ' + probs.join('\n  ') : '\nguards hold: live before-state = plan, no untaught word, no ZUT clash, no learner state on seed 312');
    if (probs.length) { process.exitCode = 2; save('dryrun'); return; }
    if (process.env.RENDER_DRY === '1' || APPLY) {
      const clips = await makeClips(pg, log, live, { dryOnly: !APPLY });
      for (const a of log.audio) console.log(`  ${a.role.padEnd(12)} ${String(a.dry.source || a.dry.code).padEnd(12)} ${a.result.padEnd(10)} "${a.text}"`);
      console.log(`${log.audio.length} distinct clips; would spend ${log.audio.reduce((s, a) => s + (a.dry.wouldSpendChars || 0), 0)} chars on the dry run`);
      if (APPLY) {
        if (clips.missing.length) { log.held = clips.missing.map((n) => `${n.rowId}.${n.slot}`); console.log(`HELD — ${clips.missing.length} slots have no verified clip, NOTHING written:\n  ${log.held.join('\n  ')}`); process.exitCode = 2; save('held'); return; }
        const { createClient } = require('@supabase/supabase-js');
        await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), clips, log);
        console.log(`APPLIED. events=${JSON.stringify(log.events)}`);
      }
    }
    save(APPLY ? 'applied' : 'dryrun');
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { endStateProblems, LEGO_PLANS, S129, SEED1_DELETE, norm, containsWords };
