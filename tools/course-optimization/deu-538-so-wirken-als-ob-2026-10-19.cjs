#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-538-so-wirken-als-ob-2026-10-19.cjs — deu_for_eng seed 538 (job #241, Kai 19 Oct 2026: "yes").
//
// WHAT WAS WRONG: S0538L01 "to seem | so wirken" was cut wrong — "so" has no English counterpart, and the seed says
// "…to seem AS THOUGH I don't care | …so wirken, ALS OB es mir egal ist". Its 10 non-seed phrases drilled only the German
// word "so" (so schlecht, nicht so, so dass…); none contained "wirken" or "seem" (P17 broken from the day it was built).
// THE FIX (canon K48 + L25 + O12 + O13): the LEGO grows to "to seem as though | so wirken, als ob" (is_new kept, type M,
// components to seem|so wirken + as though|als ob); its 10 non-seed rows are rebuilt to contain it whole, contiguous, on both
// sides; its intro is re-made; the seed row (U21) already contains it. Side fixes: S0538L03 "as if" → "as though" (the seed's
// word) with its 8 non-"as though" English phrases and its intro; S0538L02 U01/U07 (the two wrong rows) are corrected.
//
// MOOD after "als ob": the seed itself uses the colloquial INDICATIVE ("als ob es mir egal ist"), which is what Germans
// mostly say in speech; Konjunktiv II ("wäre", "könnte") is also correct and L03's own rows already use it (sie könnte,
// sie würde). Every new L01 row therefore follows the SEED (indicative), so the LEGO and the seed read alike. Not native-checked.
// S0538L02 stays NOT NEW (P25: never flip is_new to make a basket play); after the growth its prompt "to seem" no longer
// equals L01's "to seem as though", so the duplicate-prompt clash is gone. Its rows still do not play; they are listed.
//
// Writes go ONLY through Popty: edit-batch (dry run unless apply) and the one audio route (POST /api/audio/render, dry run
// first, ONE real call per clip, no retries). The seed is already unapproved (approved_at null since 14 Oct); this batch does
// not touch the seed row.
//
//   node …/deu-538-so-wirken-als-ob-2026-10-19.cjs check  <seeds.json>   # vocab + containment + ZUT gate (pure, no network)
//   node …/…cjs dry    <seeds.json>                                       # + the audio route dry run
//   RENDER=1 …  run <seeds.json>                                          # + real renders, then the edit-batch preview
//   RENDER=1 APPLY_CONFIRM=1 …  run <seeds.json>                          # + apply (the undo is kept in the log)
//   node …/…cjs verify <seeds.json>                                       # the rule on a fresh dump (after applying)
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const SEED = 538;
const L1 = 'S0538L01', L2 = 'S0538L02', L3 = 'S0538L03';
const AGENT = 'deu-538-so-wirken-als-ob (job #241)';
const PURPOSE = 'job #241 deu_for_eng S0538L01 to seem as though | so wirken, als ob (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const OLD_L1 = { known: 'to seem', target: 'so wirken' };
const NEW_L1 = { known: 'to seem as though', target: 'so wirken, als ob' };
const NEW_L1_COMPONENTS = [{ known: 'to seem', target: 'so wirken' }, { known: 'as though', target: 'als ob' }];
const OLD_L3 = { known: 'as if', target: 'als ob' };
const NEW_L3 = { known: 'as though', target: 'als ob' };
// Intros (O13): the free frame the course already uses for this seed; L01 shows the frame in an "as in" sentence (K48).
const INTRO_L1 = `The German for: '${NEW_L1.known}', as in — 'I want to seem as though I know', is:`;
const INTRO_L3 = `The German for: '${NEW_L3.known}', is:`;

// [suffix, role, known, target] — short to long, a different outer sentence every row; every word taught before 538.
const L1_ROWS = [
  ['B01', 'build', 'to seem as though', 'so wirken, als ob'],
  ['B02', 'build', 'she wants to seem as though', 'sie will so wirken, als ob'],
  ['B03', 'build', 'to seem as though it is good', 'so wirken, als ob es gut ist'],
  ['U01', 'use', 'I want to seem as though I know', 'ich will so wirken, als ob ich es weiß'],
  ['U02', 'use', "she doesn't want to seem as though she can't do it", 'sie will nicht so wirken, als ob sie das nicht kann'],
  ['U03', 'use', "you don't have to seem as though you can do it", 'du musst nicht so wirken, als ob du das kannst'],
  ['U04', 'use', "he wants to seem as though he doesn't care", 'er will so wirken, als ob es ihm egal ist'],
  ['U05', 'use', 'why do you want to seem as though you are happy', 'warum willst du so wirken, als ob du glücklich bist'],
  ['U06', 'use', 'we want to seem as though we know it', 'wir wollen so wirken, als ob wir es wissen'],
  ['U07', 'use', 'she said she wants to seem as though she is tired', 'sie hat gesagt, sie will so wirken, als ob sie müde ist'],
];
// L02's two wrong rows (the English said "good", the German said "nicht so schlecht"; "that way" had no German word of its own)
const L2_FIX = [
  ['U01', 'she wants to seem good', 'sie will nicht so schlecht wirken', 'she wants to seem good', 'sie will gut wirken'],
  ['U07', "she doesn't want to seem that way", 'sie will nicht so wirken', "she doesn't want to seem good", 'sie will nicht gut wirken'],
];

const P = (l, s) => `${COURSE}:${l}${s}`;
const sid = (id) => String(id).split(':')[1];

// ── the rule as code ─────────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** P17: the whole LEGO sits in the phrase on BOTH sides, contiguous. */
const containsLego = (row, lego) => (` ${fold(row.known_text)} `).includes(` ${fold(lego.known)} `) && (` ${fold(row.target_text)} `).includes(` ${fold(lego.target)} `);
/** K48 (als ob is a subordinator the LEGO carries) — the LEGO's German must contain "als ob" after "wirken". */
const carriesSubordinator = (lego) => /\bwirken,? als ob$/i.test(lego.target);
const swapAsIf = (s) => String(s).replace(/\bas if\b/gi, (m) => (m[0] === 'A' ? 'As though' : 'as though'));
const lp = (target, lego) => (fold(target).endsWith(fold(lego.target)) ? 'end' : fold(target).startsWith(fold(lego.target)) ? 'start' : 'middle');

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases) phrases.push(p); }
  }
  return { course: api.courseCode || COURSE, seeds, legos, phrases };
}

/** Words taught BEFORE seed 538 plus seed 538's own words and the new LEGO/components. */
function vocab(db, lang = COURSE) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const t = [], k = [];
  for (const s of db.seeds) if (s.seed_number <= SEED) { t.push(s.target_text); k.push(s.known_text); }
  for (const l of db.legos) if (l.seed_number < SEED) { t.push(l.target_text); k.push(l.known_text); for (const c of l.components || []) { t.push(c.target); k.push(c.known); } }
  t.push(NEW_L1.target, NEW_L3.target); k.push(NEW_L1.known, NEW_L3.known);
  return { tw, tKeys: tw.taughtWordKeys(t, lang), kKeys: tw.taughtWordKeys(k, 'eng_for_deu') };
}

/** The plan (pure, idempotent). */
function plan(db) {
  const l1 = db.legos.find((l) => l.lego_id === L1), l3 = db.legos.find((l) => l.lego_id === L3);
  if (!l1 || !l3) throw new Error('S0538L01/L03 not in the dump');
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const out = { l1: null, l3: null, phraseUpdates: [], skipped: [], introL1: l1.presentation_audio_id, introL3: l3.presentation_audio_id };
  if (l1.known_text === NEW_L1.known && l1.target_text === NEW_L1.target) out.skipped.push({ id: L1, why: 'already reads this way' });
  else if (l1.known_text !== OLD_L1.known || l1.target_text !== OLD_L1.target) throw new Error(`${L1} is neither old nor new: ${l1.known_text} | ${l1.target_text}`);
  else out.l1 = { before: { known: l1.known_text, target: l1.target_text, components: l1.components }, after: { ...NEW_L1, components: NEW_L1_COMPONENTS } };
  if (l3.known_text === NEW_L3.known) out.skipped.push({ id: L3, why: 'already reads this way' });
  else if (l3.known_text !== OLD_L3.known) throw new Error(`${L3} is neither old nor new: ${l3.known_text}`);
  else out.l3 = { before: { known: l3.known_text, target: l3.target_text }, after: { ...NEW_L3 } };

  const upd = (id, set, extra = {}) => {
    const cur = live.get(id);
    if (!cur) throw new Error(`${id} is not in the dump`);
    if (Object.entries(set).every(([k, v]) => JSON.stringify(cur[k]) === JSON.stringify(v))) { out.skipped.push({ id, why: 'already reads this way' }); return; }
    out.phraseUpdates.push({ id, before: cur, set, ...extra });
  };
  for (const [suffix, role, known, target] of L1_ROWS) {
    upd(`${L1}${suffix}`, { known_text: known, target_text: target, phrase_role: role, word_count: target.length, lego_count: target.replace(/[,.]/g, '').split(/\s+/).length, lego_position: lp(target, NEW_L1) },
      { lego: L1 });
  }
  for (const [suffix, oldK, oldT, newK, newT] of L2_FIX) {
    const cur = live.get(`${L2}${suffix}`);
    if (cur && cur.known_text === newK && cur.target_text === newT) { out.skipped.push({ id: `${L2}${suffix}`, why: 'already reads this way' }); continue; }
    if (!cur || cur.known_text !== oldK || cur.target_text !== oldT) throw new Error(`${L2}${suffix} is not as read on 19 Oct: ${cur && cur.known_text} | ${cur && cur.target_text}`);
    upd(`${L2}${suffix}`, { known_text: newK, target_text: newT, word_count: newT.length, lego_count: newT.split(/\s+/).length }, { lego: L2 });
  }
  // L03: English "as if" → "as though" on every row under it (the German is unchanged). Rows already saying "as though" stay.
  for (const p of db.phrases.filter((r) => sid(r.id).startsWith(L3) && r.phrase_role !== 'component')) {
    const k = swapAsIf(p.known_text);
    if (k !== p.known_text) upd(sid(p.id), { known_text: k }, { lego: L3 });
  }
  return out;
}

function simulate(db, p) {
  const upd = new Map(p.phraseUpdates.map((u) => [u.id, u.set]));
  return {
    seeds: db.seeds,
    legos: db.legos.map((l) => ({ ...l, id: l.lego_id,
      ...(p.l1 && l.lego_id === L1 ? { known_text: NEW_L1.known, target_text: NEW_L1.target, components: NEW_L1_COMPONENTS } : {}),
      ...(p.l3 && l.lego_id === L3 ? { known_text: NEW_L3.known } : {}) })),
    phrases: db.phrases.map((r) => (upd.has(sid(r.id)) ? { ...r, ...upd.get(sid(r.id)) } : r)),
  };
}

// ── gates ────────────────────────────────────────────────────────────────────────────────────────────
function problems(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [];
  const post = simulate(db, p);
  const { tw, tKeys, kKeys } = vocab(db);
  if (!carriesSubordinator(NEW_L1)) bad.push('K48: the LEGO does not end in its subordinator');
  // L4: the components tile the LEGO on both sides
  if (fold(NEW_L1_COMPONENTS.map((c) => c.known).join(' ')) !== fold(NEW_L1.known) || fold(NEW_L1_COMPONENTS.map((c) => c.target).join(' ')) !== fold(NEW_L1.target)) bad.push('L4: components do not tile the LEGO');
  if (!` ${fold(db.seeds.find((s) => s.seed_number === SEED).target_text)} `.includes(` ${fold(NEW_L1.target)} `)) bad.push('seed German does not contain the LEGO');
  if (!` ${fold(db.seeds.find((s) => s.seed_number === SEED).known_text)} `.includes(` ${fold(NEW_L1.known)} `)) bad.push('seed English does not contain the LEGO');
  const rows = (l) => post.phrases.filter((r) => sid(r.id).startsWith(l) && r.phrase_role !== 'component');
  const l1rows = rows(L1);
  if (l1rows.length !== L1_ROWS.length + 1) bad.push(`${L1} has ${l1rows.length} rows, expected ${L1_ROWS.length + 1} (ten + the seed row)`);
  const seenK = new Set(), seenT = new Set();
  for (const r of l1rows) {
    if (!containsLego(r, NEW_L1)) bad.push(`P17 ${sid(r.id)}: does not contain the LEGO — ${r.known_text} | ${r.target_text}`);
    if (!/als ob/i.test(r.target_text) || !/so wirken, als ob/i.test(r.target_text)) bad.push(`${sid(r.id)}: German lacks "so wirken, als ob"`);
    const un = tw.untaughtWords(r.target_text, tKeys, COURSE);
    if (un.length) bad.push(`P1 ${sid(r.id)}: untaught target words ${un.join(', ')}`);
    const unk = tw.untaughtWords(r.known_text, kKeys, 'eng_for_deu');
    if (unk.length) bad.push(`K1 ${sid(r.id)}: known words not taught/free: ${unk.join(', ')}`);
    if (seenK.has(fold(r.known_text)) || seenT.has(fold(r.target_text))) bad.push(`${sid(r.id)}: duplicate row in the basket`);
    seenK.add(fold(r.known_text)); seenT.add(fold(r.target_text));
  }
  for (const r of rows(L3)) {
    if (!containsLego(r, NEW_L3)) bad.push(`P17 ${sid(r.id)} (L03): does not contain "${NEW_L3.known} | ${NEW_L3.target}" — ${r.known_text} | ${r.target_text}`);
    if (/\bas if\b/i.test(r.known_text)) bad.push(`${sid(r.id)}: still says "as if"`);
  }
  for (const u of p.phraseUpdates.filter((x) => x.lego === L2)) {
    const un = tw.untaughtWords(u.set.target_text, tKeys, COURSE); if (un.length) bad.push(`P1 ${u.id}: untaught ${un.join(', ')}`);
  }
  // a changed target never creates a second German for a known prompt elsewhere: the ZUT audit says so
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { l1: null, l3: null, phraseUpdates: [] })), af = groups(post);
  for (const k of af.keys()) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}"`);
  return { list: bad, zut: [b4.size, af.size] };
}

/** Knock-on census (O12): every phrase/LEGO/seed in the course touching the old or new wording, outside this plan's own rows. For the report. */
function census(db, p) {
  const mine = new Set(p.phraseUpdates.map((u) => u.id));
  const hit = (r) => /\bseem|\bwirken\b/i.test(`${r.known_text} ${r.target_text}`) || /\bals ob\b/i.test(r.target_text);
  return db.phrases.filter((r) => !mine.has(sid(r.id)) && !sid(r.id).startsWith('S0538') && hit(r)).map((r) => `${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
}

// ── audio asks and edit ops ──────────────────────────────────────────────────────────────────────────
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => {
    const k = `${role}\u0000${text}\u0000${legoId || ''}`;
    if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] });
    m.get(k).ids.push(id);
  };
  if (p.l1) { add('known', NEW_L1.known, L1); add('target1', NEW_L1.target, L1); add('target2', NEW_L1.target, L1); add('presentation', INTRO_L1, L1, L1); }
  if (p.l3) { add('known', NEW_L3.known, L3); add('presentation', INTRO_L3, L3, L3); }
  for (const u of p.phraseUpdates) {
    if (u.set.known_text !== undefined && u.set.known_text !== u.before.known_text) add('known', u.set.known_text, u.id);
    if (u.set.target_text !== undefined && u.set.target_text !== u.before.target_text) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); }
  }
  return [...m.values()];
}

function editOps(p, clips) {
  const key = (role, text, legoId) => `${role}\u0000${text}\u0000${legoId || ''}`;
  const link = (target, k, slot, text, legoId) => {
    const audio_id = clips.get(key(slot, text, legoId));
    if (!audio_id) throw new Error(`no clip for ${slot} "${text}"`);
    return { op: 'audio.link', target, ...k, slot, audio_id };
  };
  const ops = [], links = [];
  if (p.l1) {
    ops.push({ op: 'lego.update', lego_id: L1, set: { known_text: NEW_L1.known, target_text: NEW_L1.target, type: 'M', components: NEW_L1_COMPONENTS }, expect: { known_text: p.l1.before.known, target_text: p.l1.before.target } });
    for (const s of ['known']) links.push(link('lego', { lego_id: L1 }, s, NEW_L1.known));
    for (const s of ['target1', 'target2']) links.push(link('lego', { lego_id: L1 }, s, NEW_L1.target));
    links.push(link('lego', { lego_id: L1 }, 'presentation', INTRO_L1, L1));
  }
  if (p.l3) {
    ops.push({ op: 'lego.update', lego_id: L3, set: { known_text: NEW_L3.known }, expect: { known_text: p.l3.before.known, target_text: p.l3.before.target } });
    links.push(link('lego', { lego_id: L3 }, 'known', NEW_L3.known));
    links.push(link('lego', { lego_id: L3 }, 'presentation', INTRO_L3, L3));
  }
  for (const u of p.phraseUpdates) {
    ops.push({ op: 'phrase.update', phrase_id: `${COURSE}:${u.id}`, set: { ...u.set }, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
    const k = { phrase_id: `${COURSE}:${u.id}` };
    if (u.set.known_text !== undefined && u.set.known_text !== u.before.known_text) links.push(link('phrase', k, 'known', u.set.known_text));
    if (u.set.target_text !== undefined && u.set.target_text !== u.before.target_text) { links.push(link('phrase', k, 'target1', u.set.target_text)); links.push(link('phrase', k, 'target2', u.set.target_text)); }
  }
  return ops.concat(links);
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(+(process.env.POST_TIMEOUT_MS || 180000)) });
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
  console.log(`plan: L01 ${p.l1 ? 'changes' : 'done'}, L03 ${p.l3 ? 'changes' : 'done'}, ${p.phraseUpdates.length} phrases updated, ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (mode === 'census') { for (const c of census(db, p)) console.log('  CENSUS', c); return; }
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 4000);
  const asks = clipAsks(p);
  const log = { job: '#241', started: new Date().toISOString(), plan: p, asks: [] };
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
  const save = (n) => { const f = path.join(out, `deu-538-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
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

function verify(db) {
  const breaches = [];
  const l1 = db.legos.find((l) => l.lego_id === L1), l3 = db.legos.find((l) => l.lego_id === L3);
  if (l1.known_text !== NEW_L1.known || l1.target_text !== NEW_L1.target) breaches.push(`${L1} reads "${l1.known_text} | ${l1.target_text}"`);
  if (!l1.is_new) breaches.push(`${L1} is no longer new`);
  if (l3.known_text !== NEW_L3.known) breaches.push(`${L3} reads "${l3.known_text}"`);
  for (const r of db.phrases.filter((r) => sid(r.id).startsWith(L1) && r.phrase_role !== 'component')) if (!containsLego(r, NEW_L1)) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
  for (const r of db.phrases.filter((r) => sid(r.id).startsWith(L3) && r.phrase_role !== 'component')) if (!containsLego(r, NEW_L3)) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
  console.log(`verify seed ${SEED}: ${breaches.length} breaches`);
  for (const b of breaches) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, problems, simulate, fromApi, vocab, clipAsks, editOps, containsLego, carriesSubordinator, swapAsIf, census, L1_ROWS, L2_FIX, NEW_L1, NEW_L3, NEW_L1_COMPONENTS, INTRO_L1, INTRO_L3, L1, L2, L3, SEED };
