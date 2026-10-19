#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-538-followup-rehome-2026-10-19.cjs — deu_for_eng seed 538, follow-up to deu-538-so-wirken-als-ob (job #241, Kai 19 Oct).
// (1) P25: S0538L04 "don't care | egal" is not new, so its rows never play. Rows that can be edited to contain a NEW LEGO of the seed are
//     MOVED there (insert under the new LEGO + delete the old row, one transaction; clips for the edited text come from the one audio route):
//       L04U06 → L01U08, L04U04 → L03U08, L04U02 → L03U09. L04 B01/B02/B03 are the LEGO's own build rows and cannot hold a new LEGO: they stay, LISTED.
// (3) S0538L02 U07 "she doesn't want to seem that way | sie will nicht so wirken" was NOT wrong ("so" = "that way"); the first pass changed it without
//     evidence. It is put back to its original text and its original clips. (L02 U01 really was wrong: good vs nicht so schlecht — that fix stands.)
// Writes only through Popty edit-batch + POST /api/audio/render (dry run first, one real call per clip, no retries).
//   node …cjs check <seeds.json> | dry <seeds.json> | RENDER=1 [APPLY_CONFIRM=1] run <seeds.json> | verify <seeds.json>
const fs = require('fs');
const path = require('path');
const T = require('./deu-538-so-wirken-als-ob-2026-10-19.cjs');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-538-followup (job #241)';
const PURPOSE = 'job #241 deu_for_eng seed 538 follow-up: P25 rehome of L04 rows, L02 U07 restored (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (id) => String(id).split(':')[1];

// [from, to, lego, known, target] — the LEGO sits whole in each; every word taught by seed 538.
const MOVES = [
  ['S0538L04U06', 'S0538L01U08', 'S0538L01', 'she wants to seem as though she doesn\'t care', 'sie will so wirken, als ob es ihr egal ist'],
  ['S0538L04U04', 'S0538L03U08', 'S0538L03', 'as though it doesn\'t matter', 'als ob es egal ist'],
  ['S0538L04U02', 'S0538L03U09', 'S0538L03', 'as though that doesn\'t matter', 'als ob das egal ist'],
];
const L04_STAY = ['S0538L04B01', 'S0538L04B02', 'S0538L04B03'];
const U07 = { id: 'S0538L02U07', known: "she doesn't want to seem that way", target: 'sie will nicht so wirken' };
const LEGO_TEXT = { S0538L01: T.NEW_L1, S0538L03: T.NEW_L3 };
const NEVER = ['course_code', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'presentation_audio_id',
  'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version', 'target_syllable_count'];

/** `orig` = the 19 Oct pre-edit dump, only to read L02U07's original clip ids. */
function plan(db, orig) {
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const out = { moves: [], restore: null, skipped: [] };
  for (const [from, to, lego, known, target] of MOVES) {
    if (live.has(to)) { out.skipped.push({ id: to, why: 'already moved' }); continue; }
    const cur = live.get(from);
    if (!cur) throw new Error(`${from} not in the dump`);
    const proto = db.phrases.find((p) => sid(p.id).startsWith(lego) && p.phrase_role === 'use' && !sid(p.id).endsWith('U21'));
    const pos = 1 + Math.max(...db.phrases.filter((p) => sid(p.id).startsWith(lego)).map((p) => p.position), ...out.moves.filter((m) => m.lego === lego).map((m) => m.row.position)); // two moves into one LEGO must not share a position
    const row = { ...proto, id: `${COURSE}:${to}`, known_text: known, target_text: target, phrase_role: 'use', position: pos, word_count: target.length,
      lego_count: target.replace(/[,.]/g, '').split(/\s+/).length, lego_position: T.containsLego({ known_text: known, target_text: target }, LEGO_TEXT[lego]) && target.endsWith(LEGO_TEXT[lego].target) ? 'end' : 'middle',
      metadata: { format: 'build_use', pipeline: 'v2', moved_from: from, authored_by: 'job #241 (Kai 19 Oct): P25 rehome' } };
    for (const c of NEVER) delete row[c];
    out.moves.push({ from, to, lego, before: cur, row });
  }
  const cur = live.get(U07.id);
  if (cur.known_text === U07.known && cur.target_text === U07.target) out.skipped.push({ id: U07.id, why: 'already original' });
  else {
    const o = orig.phrases.find((p) => sid(p.id) === U07.id);
    if (!o || o.known_text !== U07.known || o.target_text !== U07.target) throw new Error('original L02U07 not as expected in the pre-edit dump');
    out.restore = { before: cur, orig: o };
  }
  return out;
}
function simulate(db, p) {
  const gone = new Set(p.moves.map((m) => m.from));
  let phrases = db.phrases.filter((r) => !gone.has(sid(r.id))).concat(p.moves.map((m) => m.row));
  if (p.restore) phrases = phrases.map((r) => (sid(r.id) === U07.id ? { ...r, known_text: U07.known, target_text: U07.target } : r));
  return { seeds: db.seeds, legos: db.legos.map((l) => ({ ...l, id: l.lego_id })), phrases };
}
function problems(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [];
  const { tw, tKeys, kKeys } = T.vocab(db);
  const post = simulate(db, p);
  for (const m of p.moves) {
    if (!T.containsLego(m.row, LEGO_TEXT[m.lego])) bad.push(`P17 ${m.to}: ${m.row.known_text} | ${m.row.target_text}`);
    const un = tw.untaughtWords(m.row.target_text, tKeys, COURSE); if (un.length) bad.push(`P1 ${m.to}: untaught ${un.join(', ')}`);
    const unk = tw.untaughtWords(m.row.known_text, kKeys, 'eng_for_deu'); if (unk.length) bad.push(`K1 ${m.to}: ${unk.join(', ')}`);
    const dup = db.phrases.find((r) => T.containsLego({ known_text: r.known_text, target_text: r.target_text }, { known: '', target: '' }) && r.known_text === m.row.known_text && r.target_text === m.row.target_text);
    if (dup) bad.push(`${m.to}: duplicate of ${sid(dup.id)}`);
  }
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups({ ...db, legos: db.legos.map((l) => ({ ...l, id: l.lego_id })) }), af = groups(post);
  for (const k of af.keys()) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}"`);
  return { list: bad, zut: [b4.size, af.size] };
}
function clipAsks(p) {
  const asks = [];
  for (const m of p.moves) { asks.push({ role: 'known', text: m.row.known_text, id: m.to }, { role: 'target1', text: m.row.target_text, id: m.to }, { role: 'target2', text: m.row.target_text, id: m.to }); }
  return asks;
}
function editOps(p, clips) {
  const clip = (role, text) => { const a = clips.get(`${role}\u0000${text}`); if (!a) throw new Error(`no clip ${role} ${text}`); return a; };
  const ops = [], links = [], dels = [];
  for (const m of p.moves) {
    ops.push({ op: 'phrase.insert', row: m.row });
    for (const [slot, role, text] of [['known', 'known', m.row.known_text], ['target1', 'target1', m.row.target_text], ['target2', 'target2', m.row.target_text]])
      links.push({ op: 'audio.link', target: 'phrase', phrase_id: m.row.id, slot, audio_id: clip(role, text) });
    dels.push({ op: 'phrase.delete', phrase_id: `${COURSE}:${m.from}`, expect: { known_text: m.before.known_text, target_text: m.before.target_text } });
  }
  if (p.restore) {
    const id = `${COURSE}:${U07.id}`, o = p.restore.orig;
    ops.push({ op: 'phrase.update', phrase_id: id, set: { known_text: U07.known, target_text: U07.target, word_count: U07.target.length, lego_count: U07.target.split(/\s+/).length },
      expect: { known_text: p.restore.before.known_text, target_text: p.restore.before.target_text } });
    for (const [slot, a] of [['known', o.known_audio_id], ['target1', o.target1_audio_id], ['target2', o.target2_audio_id]]) links.push({ op: 'audio.link', target: 'phrase', phrase_id: id, slot, audio_id: a });
  }
  return ops.concat(links, dels);
}
async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(+(process.env.POST_TIMEOUT_MS || 180000)) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}
async function main() {
  const [mode, file, origFile] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|run|verify <live seeds.json> [<19 Oct pre-edit seeds.json>]');
  const db = T.fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') {
    const live = new Set(db.phrases.map((r) => sid(r.id)));
    const b = [...MOVES.map((m) => (live.has(m[0]) ? `${m[0]} still there` : live.has(m[1]) ? null : `${m[1]} missing`)), db.phrases.find((r) => sid(r.id) === U07.id).target_text === U07.target ? null : 'U07 not restored'].filter(Boolean);
    for (const m of MOVES) { const r = db.phrases.find((x) => sid(x.id) === m[1]); if (r && !T.containsLego(r, LEGO_TEXT[m[2]])) b.push(`P17 ${m[1]}`); }
    console.log(`verify follow-up: ${b.length} breaches`, b); process.exitCode = b.length ? 1 : 0; return;
  }
  const orig = T.fromApi(JSON.parse(fs.readFileSync(origFile || file, 'utf8')));
  const p = plan(db, orig), g = problems(db, p);
  console.log(`plan: ${p.moves.length} moves, restore ${p.restore ? 'yes' : 'done'}, ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}; L04 stays (listed): ${L04_STAY.join(', ')}`);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed');
  const RENDER = process.env.RENDER === '1';
  const log = { job: '#241', started: new Date().toISOString(), plan: p, asks: [] };
  for (const a of clipAsks(p)) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, chars: d.body.wouldSpendChars, error: d.status === 200 && d.body.ok ? undefined : d.body } });
  }
  const refused = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${log.asks.length} asks, ${log.asks.reduce((s, a) => s + (a.dry.source === 'library' ? 0 : a.dry.chars || a.text.length), 0)} chars, ${refused.length} refused`);
  const save = (n) => { const f = path.join(process.env.LOG_DIR || process.cwd(), `deu-538-followup-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'dry' || !RENDER) return console.log(save('dry'));
  if (refused.length) return console.log('STOP: refused in dry run', save('stopped'));
  for (const a of log.asks) {
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    a.real = { status: r.status, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) return console.log('REFUSED, no retry, nothing applied', save('render-refused'));
  }
  const clips = new Map(log.asks.map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log(save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log(save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undo: res.body.undo_ops || null, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}`);
  console.log(save('applied'));
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, problems, simulate, clipAsks, editOps, MOVES, L04_STAY, U07 };
