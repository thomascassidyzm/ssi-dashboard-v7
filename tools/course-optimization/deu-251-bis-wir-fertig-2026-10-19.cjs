#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-251-bis-wir-fertig-2026-10-19.cjs — deu_for_eng seed 251 (job #188, Kai 19 Oct 2026).
//
// KAI'S RULING: "bis nachdem" is the English "until after" translated word for word, not German. German "until after we
// finish" is just  bis wir fertig sind  (the course already uses it in S0251L02U08; nachdem wir fertig sind was taught at
// seed 110). The ENGLISH stays exactly as it is — several English wordings onto one German form is fine, the reverse is not.
// Changes: the seed's German, LEGO S0251L02 (+ its one component), and 7 of its 8 phrases (U08 already reads right).
// Canon: K48 (a verb-final LEGO carries its subordinator — "bis"), P17 (every phrase contains the whole LEGO), O1/O2/O12/O13
// (seed edit → sweep, LEGO edit → phrases + intro mirror), O5 (the edit unapproves the seed).
//
// Phrase U11 keeps the LEGO contiguous (P17): "…reden, bis wir fertig sind mit der Arbeit", NOT "bis wir mit der Arbeit fertig
// sind" — the latter splits the LEGO. Same shape as U08, which was already in the course.
//
// Writes go ONLY through Popty: edit-batch (dry run unless apply) and the one audio route (POST /api/audio/render, dry run
// first, one real call per clip, no retries). Known-side clips are untouched (the English is unchanged).
//
//   node …/deu-251-bis-wir-fertig-2026-10-19.cjs check  <seeds.json>   # vocab + containment + ZUT gate (pure, no network)
//   node …/deu-251-bis-wir-fertig-2026-10-19.cjs dry    <seeds.json>   # + the audio route dry run
//   RENDER=1 …  run <seeds.json>                                       # + real renders, then the edit-batch preview
//   RENDER=1 APPLY_CONFIRM=1 …  run <seeds.json>                       # + apply (the undo is kept in the log)
//   node …/deu-251-bis-wir-fertig-2026-10-19.cjs verify <seeds.json>   # the rule on a fresh dump (after applying)
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const SEED = 251;
const LEGO = 'S0251L02';
const AGENT = 'deu-251-bis-wir-fertig (job #188)';
const PURPOSE = 'job #188 deu_for_eng seed 251 bis nachdem wir fertig sind -> bis wir fertig sind (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const OLD_LEGO = { known: 'until after we finish', target: 'bis nachdem wir fertig sind' };
const NEW_LEGO = { known: 'until after we finish', target: 'bis wir fertig sind' };
const OLD_SEED_TARGET = 'Ich will es nicht herausfinden, bis nachdem wir fertig sind';
const NEW_SEED_TARGET = 'Ich will es nicht herausfinden, bis wir fertig sind';

// [suffix, known (unchanged), old target, new target]. U08 is not listed: it already reads right.
const PHRASES = [
  ['B01', 'Until after we finish', 'Bis nachdem wir fertig sind', 'Bis wir fertig sind'],
  ['B02', "I can't answer until after we finish", 'Ich kann nicht antworten bis nachdem wir fertig sind', 'Ich kann nicht antworten, bis wir fertig sind'],
  ['B03', "I'll wait until after we finish", 'Ich werde warten bis nachdem wir fertig sind', 'Ich werde warten, bis wir fertig sind'],
  ['U09', 'I want to wait until after we finish to explain everything to you', 'Ich möchte warten bis nachdem wir fertig sind, um dir alles zu erklären', 'Ich möchte warten, bis wir fertig sind, um dir alles zu erklären'],
  ['U10', 'Can you wait here until after we finish?', 'Kannst du hier warten bis nachdem wir fertig sind', 'Kannst du hier warten, bis wir fertig sind'],
  ['U11', 'I want to talk to you until after we finish the work', 'Ich will mit dir reden bis nachdem wir fertig sind mit der Arbeit', 'Ich will mit dir reden, bis wir fertig sind mit der Arbeit'],
  ['U12', "I don't want to find out until after we finish", 'Ich will es nicht herausfinden, bis nachdem wir fertig sind', 'Ich will es nicht herausfinden, bis wir fertig sind'],
];

const P = (s) => `${COURSE}:${LEGO}${s}`;
const sid = (id) => String(id).split(':')[1];

// ── the rule as code ──────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** P17: the whole LEGO sits in the phrase on BOTH sides, contiguous. */
const containsLego = (row, lego) => (` ${fold(row.known_text)} `).includes(` ${fold(lego.known)} `) && (` ${fold(row.target_text)} `).includes(` ${fold(lego.target)} `);
/** The defect: "bis" fused with "nachdem" (the English "until after" copied word for word). */
const hasBisNachdem = (text) => /\bbis\s+nachdem\b/i.test(String(text || ''));
/** K48: a verb-final LEGO starts with the word that triggers the order. */
const carriesSubordinator = (lego) => /^(als|wie|dass|weil|wenn|ob|bevor|nachdem|bis)\b/i.test(lego.target);

/** The decomposition after the edit: the LEGO span takes the new German, and a ghost "," goes in front when the new text has one. */
function newDecomposition(dec, before, after) {
  if (!Array.isArray(dec)) return dec;
  const out = [];
  for (const e of dec) {
    if (e.legoId === LEGO) {
      if (/,\s*bis\b/.test(after) && !/,\s*bis\b/.test(before)) out.push({ known: '', legoId: null, target: ',', isGhost: true });
      out.push({ ...e, target: `${e.target.match(/^\s*/)[0]}${/^[A-ZÄÖÜ]/.test(e.target.trim()) ? 'Bis' : 'bis'} wir fertig sind` });
    } else out.push(e);
  }
  return out;
}
const decompositionTiles = (dec, text) => !Array.isArray(dec) || dec.map((e) => e.target).join('') === text;

// ── the before-state: Popty's seeds listing → the dump shape the audits read ────────────────────────────────────
function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases) phrases.push(p); }
  }
  return { course: api.courseCode || COURSE, seeds, legos, phrases };
}

/** Words taught BEFORE seed 251 plus the LEGO's own words (K29). */
function vocab(db, lang = COURSE) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const t = [], k = [];
  for (const s of db.seeds) if (s.seed_number < SEED) { t.push(s.target_text); k.push(s.known_text); }
  for (const l of db.legos) if (l.seed_number < SEED) { t.push(l.target_text); k.push(l.known_text); for (const c of l.components || []) { t.push(c.target); k.push(c.known); } }
  t.push(NEW_LEGO.target); k.push(NEW_LEGO.known);
  return { tw, tKeys: tw.taughtWordKeys(t, lang), kKeys: tw.taughtWordKeys(k, 'eng_for_deu') };
}

/** The plan (pure): seed text, LEGO text + component, the phrases to re-word. Idempotent. */
function plan(db) {
  const seed = db.seeds.find((s) => s.seed_number === SEED);
  const lego = db.legos.find((l) => l.lego_id === LEGO);
  if (!seed || !lego) throw new Error('seed 251 / S0251L02 not in the dump');
  const out = { seed: null, lego: null, phraseUpdates: [], skipped: [] };
  if (seed.target_text === NEW_SEED_TARGET) out.skipped.push({ id: 'seed', why: 'already reads this way' });
  else if (seed.target_text !== OLD_SEED_TARGET) throw new Error(`seed 251 German is neither the old nor the new text: ${seed.target_text}`);
  else out.seed = { before: { known: seed.known_text, target: seed.target_text, approved_at: seed.approved_at }, after: NEW_SEED_TARGET };
  if (lego.target_text === NEW_LEGO.target) out.skipped.push({ id: LEGO, why: 'already reads this way' });
  else if (lego.target_text !== OLD_LEGO.target || lego.known_text !== OLD_LEGO.known) throw new Error(`${LEGO} is neither old nor new: ${lego.known_text} | ${lego.target_text}`);
  else out.lego = { before: { known: lego.known_text, target: lego.target_text, components: lego.components }, presentationAudioId: lego.presentation_audio_id || null, after: { ...NEW_LEGO, components: [{ ...NEW_LEGO }] } };
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  for (const [suffix, known, oldT, newT] of PHRASES) {
    const cur = live.get(`${LEGO}${suffix}`);
    if (!cur) throw new Error(`${LEGO}${suffix} is not in the dump`);
    if (cur.target_text === newT) { out.skipped.push({ id: `${LEGO}${suffix}`, why: 'already reads this way' }); continue; }
    if (cur.target_text !== oldT || cur.known_text !== known) throw new Error(`${LEGO}${suffix} is not as read on 19 Oct: ${cur.known_text} | ${cur.target_text}`);
    const set = { target_text: newT, word_count: newT.length, lego_count: newT.replace(/[,.]/g, '').split(/\s+/).length };
    if (cur.decomposition) set.decomposition = newDecomposition(cur.decomposition, oldT, newT);
    out.phraseUpdates.push({ id: `${LEGO}${suffix}`, before: cur, set });
  }
  return out;
}

/** Rows the course would hold after the plan (for the ZUT audit and the checks). */
function simulate(db, p) {
  const upd = new Map(p.phraseUpdates.map((u) => [u.id, u.set]));
  return {
    seeds: db.seeds.map((s) => (p.seed && s.seed_number === SEED ? { ...s, target_text: NEW_SEED_TARGET } : s)),
    legos: db.legos.map((l) => ({ ...l, id: l.lego_id, ...(p.lego && l.lego_id === LEGO ? { target_text: NEW_LEGO.target, components: [{ ...NEW_LEGO }] } : {}) })),
    phrases: db.phrases.map((r) => (upd.has(sid(r.id)) ? { ...r, ...upd.get(sid(r.id)) } : r)),
  };
}

// ── gates ─────────────────────────────────────────────────────────────────────────────────────────
/** Everything the plan must satisfy, on the course as it WOULD read. [] = clean. */
function problems(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [];
  const post = simulate(db, p);
  const { tw, tKeys, kKeys } = vocab(db);
  if (!carriesSubordinator(NEW_LEGO)) bad.push('K48: the LEGO does not start with its subordinator');
  // the English is untouched on every changed row
  for (const u of p.phraseUpdates) if (u.set.known_text !== undefined) bad.push(`${u.id}: the plan must not touch the English`);
  // course-wide sweep: no "bis nachdem" left anywhere (seed, LEGO, component, phrase)
  for (const s of post.seeds) if (hasBisNachdem(s.target_text)) bad.push(`seed ${s.seed_number} still has "bis nachdem"`);
  for (const l of post.legos) { if (hasBisNachdem(l.target_text)) bad.push(`${l.lego_id} still has "bis nachdem"`); for (const c of l.components || []) if (hasBisNachdem(c.target)) bad.push(`${l.lego_id} component still has "bis nachdem"`); }
  for (const r of post.phrases) if (hasBisNachdem(r.target_text)) bad.push(`${sid(r.id)} still has "bis nachdem"`);
  // P17 + taught words + decomposition on every non-component row under the LEGO
  const rows = post.phrases.filter((r) => sid(r.id).startsWith(LEGO) && r.phrase_role !== 'component');
  for (const r of rows) {
    if (!containsLego(r, NEW_LEGO)) bad.push(`P17 ${sid(r.id)}: does not contain the LEGO — ${r.known_text} | ${r.target_text}`);
    const un = tw.untaughtWords(r.target_text, tKeys, COURSE);
    if (un.length) bad.push(`P1 ${sid(r.id)}: untaught target words ${un.join(', ')}`);
    const unk = tw.untaughtWords(r.known_text, kKeys, 'eng_for_deu');
    if (unk.length) bad.push(`K1 ${sid(r.id)}: known words not taught/free: ${unk.join(', ')}`);
    if (!decompositionTiles(r.decomposition, r.target_text)) bad.push(`${sid(r.id)}: decomposition does not tile the target text`);
  }
  // seed ↔ LEGO ↔ phrase agreement: the seed's German contains the LEGO's German
  if (!` ${fold(post.seeds.find((s) => s.seed_number === SEED).target_text)} `.includes(` ${fold(NEW_LEGO.target)} `)) bad.push('seed 251 German does not contain the LEGO');
  // duplicate phrase text inside the course among the changed rows (same target+known twice)
  const key = (r) => `${fold(r.known_text)}\u0000${fold(r.target_text)}`;
  const seen = new Map();
  for (const r of post.phrases) { const k = key(r); if (seen.has(k) && sid(r.id).startsWith(LEGO) !== sid(seen.get(k).id).startsWith(LEGO)) bad.push(`duplicate phrase pair: ${sid(r.id)} and ${sid(seen.get(k).id)}`); seen.set(k, r); }
  for (const u of p.phraseUpdates) { const same = post.phrases.filter((r) => key(r) === key({ known_text: u.before.known_text, target_text: u.set.target_text })); if (same.length > 1) bad.push(`${u.id}: identical known+target pair appears ${same.length}× in the course`); }
  // ZUT: no NEW strict group course-wide
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { seed: null, lego: null, phraseUpdates: [] })), af = groups(post);
  for (const k of af.keys()) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}"`);
  return { list: bad, zut: [b4.size, af.size] };
}

// ── audio asks and edit ops ───────────────────────────────────────────────────────────────────────
/** Every distinct German clip the new text needs (the English is unchanged: no known clip, no intro change — O13 mirrors the English). */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => {
    const k = `${role}\u0000${text}\u0000${legoId || ''}`;
    if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] });
    m.get(k).ids.push(id);
  };
  if (p.seed) { add('target1', NEW_SEED_TARGET, 'seed'); add('target2', NEW_SEED_TARGET, 'seed'); }
  if (p.lego) { add('target1', NEW_LEGO.target, LEGO, LEGO); add('target2', NEW_LEGO.target, LEGO, LEGO); }
  for (const u of p.phraseUpdates) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); }
  return [...m.values()];
}

/** The edit-batch ops; `clips` (role\0text\0lego → audioId) adds an audio.link per changed slot AFTER the text, same transaction. */
function editOps(p, clips) {
  const get = (role, text, legoId) => { const a = clips.get(`${role}\u0000${text}\u0000${legoId || ''}`); if (!a) throw new Error(`no clip for ${role} "${text}"`); return a; };
  const ops = [], links = [];
  if (p.seed) {
    // unapprove (O5): approved_at null, in the same write as the text
    ops.push({ op: 'seed.update', seed_number: SEED, set: { target_text: NEW_SEED_TARGET, approved_at: null }, expect: { known_text: p.seed.before.known, target_text: p.seed.before.target } });
    for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'seed', seed_number: SEED, slot, audio_id: get(slot, NEW_SEED_TARGET) });
  }
  if (p.lego) {
    ops.push({ op: 'lego.update', lego_id: LEGO, set: { target_text: NEW_LEGO.target, components: [{ ...NEW_LEGO }] }, expect: { known_text: p.lego.before.known, target_text: p.lego.before.target } });
    for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'lego', lego_id: LEGO, slot, audio_id: get(slot, NEW_LEGO.target, LEGO) });
    // A LEGO text edit NULLs presentation_audio_id (seen live, job #188). The intro quotes the ENGLISH, which is unchanged (O13 mirror holds), so put the same clip back.
    if (p.lego.presentationAudioId) links.push({ op: 'audio.link', target: 'lego', lego_id: LEGO, slot: 'presentation', audio_id: p.lego.presentationAudioId });
  }
  for (const u of p.phraseUpdates) {
    ops.push({ op: 'phrase.update', phrase_id: P(u.id.slice(LEGO.length)), set: { ...u.set }, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
    for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id.slice(LEGO.length)), slot, audio_id: get(slot, u.set.target_text) });
  }
  return ops.concat(links);
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|run|verify <seeds.json from GET /api/production/deu_for_eng/seeds>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') return verify(db);
  const p = plan(db);
  const g = problems(db, p);
  console.log(`plan: seed ${p.seed ? 'changes' : 'done'}, LEGO ${p.lego ? 'changes' : 'done'}, ${p.phraseUpdates.length} phrases updated, ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 3000);
  const asks = clipAsks(p);
  const log = { job: '#188', started: new Date().toISOString(), plan: p, asks: [] };
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, voiceId: d.body.voiceId, chars: w, error: ok ? undefined : d.body } });
  }
  const refusedDry = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 300));
  const out = process.env.LOG_DIR || process.cwd();
  const save = (n) => { const f = path.join(out, `deu-251-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'dry' || !RENDER) return console.log('dry log:', save('dry'));
  if (refusedDry.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped')); }
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }
  for (const a of log.asks) {
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); console.log(save('render-refused')); return console.log('a clip was refused — no retry; the text is NOT switched (A4); nothing applied'); }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.map((a) => [`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, a.real.audioId]));
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, error: prev.status === 200 ? undefined : prev.body, results: (prev.body.results || []).length };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${log.preview.results} results ${JSON.stringify(prev.body.error || '').slice(0, 400)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}`);
  console.log('log (undo inside):', save('applied'));
}

/** After applying: the rule on a fresh dump. Exit 1 on any breach. */
function verify(db) {
  const breaches = [];
  const seed = db.seeds.find((s) => s.seed_number === SEED), lego = db.legos.find((l) => l.lego_id === LEGO);
  if (seed.target_text !== NEW_SEED_TARGET) breaches.push(`seed reads "${seed.target_text}"`);
  if (seed.approved_at) breaches.push(`seed still approved (${seed.approved_at})`);
  if (lego.target_text !== NEW_LEGO.target) breaches.push(`LEGO reads "${lego.target_text}"`);
  const hits = [...db.seeds.filter((s) => hasBisNachdem(s.target_text)).map((s) => `seed ${s.seed_number}`), ...db.legos.filter((l) => hasBisNachdem(l.target_text)).map((l) => l.lego_id), ...db.phrases.filter((r) => hasBisNachdem(r.target_text)).map((r) => sid(r.id))];
  for (const h of hits) breaches.push(`still has "bis nachdem": ${h}`);
  const rows = db.phrases.filter((r) => sid(r.id).startsWith(LEGO) && r.phrase_role !== 'component');
  for (const r of rows) if (!containsLego(r, NEW_LEGO)) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
  console.log(`verify ${LEGO}: ${rows.length} rows, ${breaches.length} breaches`);
  for (const b of breaches) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, problems, simulate, fromApi, vocab, clipAsks, editOps, containsLego, carriesSubordinator, hasBisNachdem, newDecomposition, decompositionTiles, PHRASES, NEW_LEGO, OLD_LEGO, NEW_SEED_TARGET, OLD_SEED_TARGET, LEGO, SEED };
