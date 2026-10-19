#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-p17-breaks-2026-10-19.cjs — ita_for_eng, P17 "phrase missing its own LEGO" fixes (job #282).
//
// The census (tools/qa/quality-census, check P17) flags candidates; a person read every one. Kai's rulings of 19 Oct 2026
// (canon K49, K50, K51) decide what a candidate is:
//   K49  words of any size INSIDE the LEGO, or the LEGO's words in another order, is NOT a break — but the basket must then
//        carry enough of that pattern (default used here: ≥ 2 split/reordered); plain uses where easy, never required.
//   K50  another FORM of the LEGO's verb (arriverò → arrivare, hai fatto → abbia fatto, andrà → vada) is a BREAK; so is
//        another ending of a noun/adjective (signora → signore, silenzioso → silenziosa).
//   K51  a changed reflexive ending (prendersi → prendermi) is a BREAK for now.
//   L28  an infinitive spelled with an object clitic attached (ottenere → ottenerlo, pensare → pensarci) is the SAME form.
//
// The per-row decisions live in ita-p17-breaks-2026-10-19.plan.cjs (each with its class and reason, the held ones too).
// This file is the engine: it reads a snapshot taken by tools/qa/quality-census/snapshot.cjs (Popty's own seeds route),
// checks the plan against the canon, and writes ONLY through Popty — POST /api/production/ita_for_eng/edit-batch (dry run
// unless apply) and POST /api/audio/render (dry run first). No database code here.
//
//   node …/ita-p17-breaks-2026-10-19.cjs show   <snap.json> <seed>[,<seed>…]   # a seed, its LEGOs, baskets, untaught words
//   node …/ita-p17-breaks-2026-10-19.cjs check  <snap.json>                    # the gates (pure, no network)
//   node …/ita-p17-breaks-2026-10-19.cjs knock  <snap.json>                    # course-wide sweep of the edited texts
//   node …/ita-p17-breaks-2026-10-19.cjs dry    <snap.json>                    # + audio route dry run (chars) + edit-batch preview
//   APPLY_CONFIRM=1 node …                 apply  <snap.json>                  # apply text + library/existing clips; log keeps the undo
//   node …/ita-p17-breaks-2026-10-19.cjs verify <snap.json>                    # on a fresh snapshot: every planned row reads as planned
const fs = require('fs');
const path = require('path');

const COURSE = 'ita_for_eng';
const AGENT = 'ita-p17-breaks (job #282)';
const PURPOSE = 'job #282 ita_for_eng P17: phrases rewritten to contain their own LEGO (Kai 19 Oct, canon K49-K51)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const P = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();
const legoOfId = (id) => sid(id).slice(0, 8);

// ── the rule as code ─────────────────────────────────────────────────────────────────────────────────────────────
// accents are KEPT: in Italian they are words (è ≠ e, là ≠ la, sì ≠ si) — an accent-blind test let "e posso" stand in for è
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'");
// preposition + article contractions read as two tokens (dell'acqua = di + l + acqua); elided articles as their full family
const CONTRACTION = {};
for (const [prep, stem] of [['di', 'de'], ['a', 'a'], ['da', 'da'], ['in', 'ne'], ['su', 'su']])
  for (const [suf, art] of [['l', 'il'], ['llo', 'lo'], ['lla', 'la'], ['i', 'i'], ['gli', 'gli'], ['lle', 'le'], ['ll', 'l']]) CONTRACTION[stem + suf] = [prep, art];
const ELIDED = { l: ['lo', 'la', 'il'], un: ['una', 'uno'], d: ['di'], c: ['ci'], m: ['mi'], t: ['ti'], s: ['si'], v: ['vi'], n: ['ne'], quell: ['quello', 'quella'], dov: ['dove'], com: ['come'], cos: ['cosa'] };
const toks = (t) => fold(t).split(/[^\p{L}\p{N}]+/u).filter(Boolean).flatMap((w) => CONTRACTION[w] || [w]);
const CLITIC = /(lo|la|li|le|mi|ti|ci|vi|gli|ne|melo|telo|glielo|gliela|cela)$/;
/** One LEGO token is said by one phrase token: equal, an elided form of it, or (L28) the infinitive with a clitic attached. */
function tokenSays(lt, pt) {
  if (lt === pt) return true;
  if ((ELIDED[pt] || []).includes(lt) || (ELIDED[lt] || []).includes(pt)) return true;
  const m = /^(.*[aei]r)(e)$/.exec(lt) || /^(.*rr)(e)$/.exec(lt);
  return !!m && pt.startsWith(m[1]) && CLITIC.test(pt.slice(m[1].length)) && pt.length > m[1].length;
}
/** P17 under K49: every LEGO token is said, in ANY order, with anything between (multiset). Returns the unsaid tokens. */
function unsaid(legoTarget, phraseTarget) {
  const pt = toks(phraseTarget), used = new Set(), miss = [];
  for (const t of toks(legoTarget)) {
    const j = pt.findIndex((w, i) => !used.has(i) && tokenSays(t, w));
    if (j < 0) miss.push(t); else used.add(j);
  }
  return miss;
}
const containsLego = (legoTarget, phraseTarget) => unsaid(legoTarget, phraseTarget).length === 0;
/** K49 shape: 'plain' = the LEGO's tokens in one unbroken run in its own order; 'split' = contained otherwise. */
function shape(legoTarget, phraseTarget) {
  if (!containsLego(legoTarget, phraseTarget)) return 'break';
  const lt = toks(legoTarget), pt = toks(phraseTarget);
  for (let i = 0; i + lt.length <= pt.length; i++) if (lt.every((t, k) => tokenSays(t, pt[i + k]))) return 'plain';
  return 'split';
}
const knownFold = (s) => fold(s).replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();

/** K49 practice floor (Kai, 19 Oct): a LEGO that is split or reordered in its basket needs at least 2 such rows. Plain uses are
 *  welcome where easy but their absence is NOT a fault (Kai's refinement the same day) — reported as a note only. */
function k49Floor(split, plain) {
  if (!split) return { fault: false };
  return { fault: split < 2, note: plain ? null : 'no plain use (not required; add one where easy)' };
}

// ── the course, as the census snapshot holds it ──────────────────────────────────────────────────────────────────
function load(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const legoAt = (seed, idx) => s.legos.find((l) => l.seed_number === seed && l.lego_index === idx);
  for (const p of s.phrases) p.sid = sid(p.id);
  return { ...s, legoAt, lego: (id) => s.legos.find((l) => l.lego_id === id) };
}
const basketOf = (db, legoId) => db.phrases.filter((p) => legoOfId(p.id) === legoId && p.phrase_role !== 'component');

/** Words the learner has at LEGO `legoId`: earlier seeds' sentences, every LEGO + component up to and including this one. */
function vocab(db, legoId) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const seed = Number(legoId.slice(1, 5)), idx = Number(legoId.slice(6, 8));
  const t = [], k = [];
  for (const s of db.seeds) if (s.seed_number < seed) { t.push(s.target_text); k.push(s.known_text); }
  for (const l of db.legos) if (l.seed_number < seed || (l.seed_number === seed && l.lego_index <= idx)) {
    t.push(l.target_text); k.push(l.known_text);
    for (const c of l.components || []) { t.push(c.target); k.push(c.known); }
  }
  return { tw, tKeys: tw.taughtWordKeys(t, COURSE), kKeys: tw.taughtWordKeys(k, 'eng_for_ita') };
}
const untaughtIta = (db, legoId, text) => { const v = vocab(db, legoId); return v.tw.untaughtWords(text, v.tKeys, COURSE); };
const untaughtEng = (db, legoId, text) => { const v = vocab(db, legoId); return v.tw.untaughtWords(text, v.kKeys, 'eng_for_ita'); };

// ── the plan → the rows the course would hold ────────────────────────────────────────────────────────────────────
// A plan entry: { id: 'S0083L01U03', do: 'update'|'delete'|'insert'|'rehome'|'keep'|'hold', known, target, role, to, why }
//   update  — rewrite the row's text in place (its old clips are unlinked, never deleted)
//   insert  — a new BUILD/USE row under LEGO `id` (the suffix is assigned here: next free U/B number)
//   rehome  — the row moves under LEGO `to` (a NEW LEGO it really practises): inserted there with its clips, deleted here
//   delete  — the phrase goes (never a LEGO)
//   keep / hold — nothing is written; hold rows are Kai's questions (listed in the held doc)
const NEVER = ['course_code', 'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version',
  'display_tiling', 'display_tiling_version', 'target_syllable_count', 'sid', 'target1_duration_ms', 'target2_duration_ms'];
function nextId(db, taken, legoId, role) {
  const L = role === 'build' ? 'B' : 'U';
  let n = Math.max(0, ...db.phrases.concat(taken).filter((p) => sid(p.id).startsWith(legoId + L)).map((p) => +sid(p.id).slice(9) || 0)) + 1;
  return `${legoId}${L}${String(n).padStart(2, '0')}`;
}
function plan(db, PLAN) {
  const out = { updates: [], inserts: [], deletes: [], unapprove: [], held: [], kept: [] };
  const added = [];
  const seeds = new Set();
  for (const e of PLAN) {
    if (e.do === 'keep') { out.kept.push(e); continue; }
    if (e.do === 'hold') { out.held.push(e); continue; }
    if (e.do === 'insert') {
      const proto = basketOf(db, e.id).find((p) => p.phrase_role === (e.role || 'use')) || basketOf(db, e.id)[0];
      const id = nextId(db, added, e.id, e.role || 'use');
      const pos = Math.max(0, ...db.phrases.concat(added).filter((p) => sid(p.id).startsWith(e.id)).map((p) => p.position || 0)) + 1;
      const row = { ...proto, id: P(id), known_text: e.known, target_text: e.target, phrase_role: e.role || 'use', position: pos,
        word_count: e.target.length, lego_count: e.target.replace(/[,.?!]/g, '').split(/\s+/).length,
        known_audio_id: null, target1_audio_id: null, target2_audio_id: null, presentation_audio_id: null,
        metadata: { format: 'build_use', authored_by: `job #282 (P17, Kai 19 Oct): ${e.why || ''}`.trim() } };
      for (const c of NEVER) delete row[c];
      added.push(row); out.inserts.push({ id, lego: e.id, row, entry: e }); seeds.add(Number(e.id.slice(1, 5)));
      continue;
    }
    const cur = db.phrases.find((p) => p.sid === e.id);
    if (!cur) throw new Error(`${e.id} is not in the snapshot`);
    if (e.do === 'update') {
      if (cur.known_text === e.known && cur.target_text === e.target) { out.kept.push({ ...e, why: 'already reads this way' }); continue; }
      const set = { known_text: e.known, target_text: e.target, word_count: e.target.length, lego_count: e.target.replace(/[,.?!]/g, '').split(/\s+/).length,
        decomposition: null, decomposition_course_version: null, metadata: { ...(cur.metadata || {}), authored_by: `job #282 (P17, Kai 19 Oct): ${e.why || ''}`.trim() } };
      if (e.role && e.role !== cur.phrase_role) set.phrase_role = e.role;
      out.updates.push({ id: e.id, before: cur, set, entry: e });
    } else if (e.do === 'rehome') {
      const id = nextId(db, added, e.to, cur.phrase_role);
      const pos = Math.max(0, ...db.phrases.concat(added).filter((p) => sid(p.id).startsWith(e.to)).map((p) => p.position || 0)) + 1;
      const row = { ...cur, id: P(id), seed_number: Number(e.to.slice(1, 5)), lego_index: Number(e.to.slice(6, 8)), position: pos,
        known_text: e.known || cur.known_text, target_text: e.target || cur.target_text,
        metadata: { ...(cur.metadata || {}), authored_by: `job #282 (P17 rehome from ${e.id}, P25): ${e.why || ''}`.trim() } };
      for (const c of NEVER) delete row[c];
      added.push(row); out.inserts.push({ id, lego: e.to, row, entry: e, from: e.id, keepsClips: !e.known && !e.target }); out.deletes.push({ id: e.id, before: cur, entry: e, rehomedTo: id });
      seeds.add(Number(e.to.slice(1, 5)));
    } else if (e.do === 'delete') out.deletes.push({ id: e.id, before: cur, entry: e });
    else throw new Error(`${e.id}: unknown action ${e.do}`);
    seeds.add(cur.seed_number);
  }
  // O5 / "an edit unapproves the seed": every seed touched loses its approval
  for (const n of [...seeds].sort((a, b) => a - b)) {
    const s = db.seeds.find((x) => x.seed_number === n);
    if (s && s.approved_at) out.unapprove.push({ seed_number: n, approved_at: s.approved_at });
  }
  return out;
}
function simulate(db, p) {
  const upd = new Map(p.updates.map((u) => [u.id, u.set])), del = new Set(p.deletes.map((d) => d.id));
  return {
    seeds: db.seeds, legos: db.legos.map((l) => ({ ...l, id: l.lego_id })),
    phrases: db.phrases.filter((r) => !del.has(r.sid)).map((r) => (upd.has(r.sid) ? { ...r, ...upd.get(r.sid) } : r)).concat(p.inserts.map((i) => ({ ...i.row, sid: i.id }))),
  };
}

// ── gates ────────────────────────────────────────────────────────────────────────────────────────────────────────
function problems(db, p, PLAN, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [], notes = [];
  const post = simulate(db, p);
  const written = [...p.updates.map((u) => ({ id: u.id, lego: legoOfId(u.id), known: u.set.known_text, target: u.set.target_text })),
    ...p.inserts.map((i) => ({ id: i.id, lego: i.lego, known: i.row.known_text, target: i.row.target_text, from: i.from }))];
  for (const w of written) {
    const l = db.lego(w.lego);
    if (!l) { bad.push(`${w.id}: no LEGO ${w.lego}`); continue; }
    if (l.is_new === false) bad.push(`P25 ${w.id}: ${w.lego} is not new — its basket is never played`);
    const miss = unsaid(l.target_text, w.target);
    if (miss.length) bad.push(`P17 ${w.id}: "${w.target}" does not say ${miss.join(', ')} of "${l.target_text}"`);
    const ut = untaughtIta(db, w.lego, w.target);
    if (ut.length) bad.push(`P1 ${w.id}: untaught Italian ${ut.join(', ')} — ${w.target}`);
    const uk = untaughtEng(db, w.lego, w.known);
    if (uk.length) notes.push(`K1 ${w.id}: English not in any earlier LEGO/seed (hand-read): ${uk.join(', ')} — ${w.known}`);
    if (!knownFold(w.known).includes(knownFold(l.known_text).replace(/\?$/, ''))) notes.push(`${w.id}: English does not carry "${l.known_text}" word for word (hand-read) — ${w.known}`);
  }
  const mine = new Set(written.map((w) => w.id));
  // no duplicate inside a basket; K49 practice floor per LEGO touched or split
  const legos = new Set(written.map((w) => w.lego).concat(p.deletes.map((d) => legoOfId(d.id))));
  for (const e of PLAN.filter((x) => x.k49)) legos.add(e.id.length === 8 ? e.id : legoOfId(e.id));
  for (const id of legos) {
    const l = db.lego(id); if (!l || l.is_new === false) continue;
    const rows = post.phrases.filter((r) => legoOfId(r.id) === id && r.phrase_role !== 'component');
    const sk = new Map(), st = new Map();
    for (const r of rows) {
      const k = knownFold(r.known_text), t = fold(r.target_text);
      // only a duplicate this plan creates is a problem; older doubled rows (B01 = B02) are not this job's
      if (sk.has(k) && (mine.has(r.sid) || mine.has(sk.get(k)))) bad.push(`${r.sid}: same English as ${sk.get(k)} in ${id}`);
      if (st.has(t) && (mine.has(r.sid) || mine.has(st.get(t)))) bad.push(`${r.sid}: same Italian as ${st.get(t)} in ${id}`);
      sk.set(k, r.sid); st.set(t, r.sid);
    }
    const shapes = rows.map((r) => shape(l.target_text, r.target_text));
    const split = shapes.filter((s) => s === 'split').length, plain = shapes.filter((s) => s === 'plain').length, brk = shapes.filter((s) => s === 'break').length;
    const builds = rows.filter((r) => r.phrase_role === 'build').length, uses = rows.filter((r) => r.phrase_role === 'use').length;
    const k = k49Floor(split, plain);
    if (k.fault) bad.push(`K49 ${id}: ${split} split/reordered (floor 2)`);
    if (k.note) notes.push(`K49 ${id}: ${k.note}`);
    if (uses < 2) bad.push(`P10 ${id}: ${uses} USE rows`);
    if (builds < 1) notes.push(`P5 ${id}: ${builds} BUILD rows`);
    if (brk) {
      const heldHere = PLAN.filter((x) => x.do === 'hold' && legoOfId(x.id) === id).length;
      (brk > heldHere ? bad : notes).push(`P17 ${id}: ${brk} row(s) still break (${heldHere} held for Kai)`);
    }
  }
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { updates: [], inserts: [], deletes: [] })), af = groups(post);
  for (const [k, v] of af) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}" ${JSON.stringify(v).slice(0, 300)}`);
  return { list: bad, notes, zut: [b4.size, af.size] };
}

/** Course-wide sweep (O12): rows outside the plan whose English or Italian equals a text the plan writes — a soft or hard clash to read. */
function knockOn(db, p) {
  const hits = [];
  const mine = new Set([...p.updates.map((u) => u.id), ...p.deletes.map((d) => d.id)]);
  const texts = [...p.updates.map((u) => ({ id: u.id, k: u.set.known_text, t: u.set.target_text })), ...p.inserts.map((i) => ({ id: i.id, k: i.row.known_text, t: i.row.target_text }))];
  for (const x of texts) for (const r of db.phrases) {
    if (mine.has(r.sid) || r.phrase_role === 'component') continue;
    const k = knownFold(r.known_text) === knownFold(x.k), t = fold(r.target_text) === fold(x.t);
    if (k !== t) hits.push({ id: x.id, other: r.sid, side: k ? 'same English, other Italian' : 'same Italian, other English', known: r.known_text, target: r.target_text });
  }
  return hits;
}

// ── audio asks and edit ops ──────────────────────────────────────────────────────────────────────────────────────
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, ids: [] }); m.get(k).ids.push(id); };
  for (const u of p.updates) {
    if (u.set.known_text !== u.before.known_text) add('known', u.set.known_text, u.id);
    if (u.set.target_text !== u.before.target_text) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); }
  }
  for (const i of p.inserts) {
    if (i.keepsClips) continue;
    const src = i.from && p.deletes.find((d) => d.id === i.from);
    if (!src || src.before.known_text !== i.row.known_text) add('known', i.row.known_text, i.id);
    if (!src || src.before.target_text !== i.row.target_text) { add('target1', i.row.target_text, i.id); add('target2', i.row.target_text, i.id); }
  }
  return [...m.values()];
}
const SLOT = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
/** clips: Map role\0text → audio id or null (no clip yet: the slot is left empty, never pointed at a clip saying other words). */
function editOps(p, clips) {
  const clip = (role, text) => (clips.has(`${role}\u0000${text}`) ? clips.get(`${role}\u0000${text}`) : undefined);
  const ops = [], links = [];
  for (const s of p.unapprove) ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { approved_at: null }, expect: { approved_at: new Date(s.approved_at).toISOString() } }); // the door reads timestamps back as ISO Z
  for (const u of p.updates) {
    ops.push({ op: 'phrase.update', phrase_id: P(u.id), set: u.set, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
    const changed = { known: u.set.known_text !== u.before.known_text, target1: u.set.target_text !== u.before.target_text, target2: u.set.target_text !== u.before.target_text };
    for (const role of Object.keys(SLOT)) if (changed[role]) {
      const a = clip(role, role === 'known' ? u.set.known_text : u.set.target_text);
      if (a || u.before[SLOT[role]]) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id), slot: role, audio_id: a || null });
    }
  }
  for (const i of p.inserts) {
    const row = { ...i.row };
    const src = i.from && p.deletes.find((d) => d.id === i.from);
    for (const role of Object.keys(SLOT)) {
      const text = role === 'known' ? row.known_text : row.target_text;
      const same = src && (role === 'known' ? src.before.known_text === row.known_text : src.before.target_text === row.target_text);
      row[SLOT[role]] = same ? src.before[SLOT[role]] : clip(role, text) || null;
    }
    ops.push({ op: 'phrase.insert', row });
  }
  for (const d of p.deletes) ops.push({ op: 'phrase.delete', phrase_id: P(d.id), expect: { known_text: d.before.known_text, target_text: d.before.target_text } });
  return ops.concat(links);
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

function show(db, seeds) {
  for (const n of seeds) {
    const s = db.seeds.find((x) => x.seed_number === n);
    console.log(`\n== seed ${n}${s.approved_at ? ' (approved)' : ''}: ${s.known_text} | ${s.target_text}`);
    for (const l of db.legos.filter((x) => x.seed_number === n)) {
      console.log(`  ${l.lego_id}${l.is_new ? '' : ' (not new)'}: ${l.known_text} | ${l.target_text}`);
      for (const r of basketOf(db, l.lego_id)) {
        const sh = shape(l.target_text, r.target_text), ut = untaughtIta(db, l.lego_id, r.target_text);
        console.log(`    ${r.sid.slice(8)} ${r.phrase_role[0]} ${sh.padEnd(5)} ${r.known_text} | ${r.target_text}${ut.length ? `   [untaught: ${ut.join(' ')}]` : ''}`);
      }
    }
  }
}

async function main() {
  const [mode, file, extra] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: show|check|knock|dry|apply|verify <snap.json> [seeds]');
  const db = load(file);
  if (mode === 'show') return show(db, extra.split(',').map(Number));
  const PLAN = require('./ita-p17-breaks-2026-10-19.plan.cjs');
  if (mode === 'verify') return verify(db, PLAN);
  const p = plan(db, PLAN);
  if (mode === 'knock') { const h = knockOn(db, p); for (const x of h) console.log(`${x.id}\t${x.other}\t${x.side}\t${x.known} | ${x.target}`); return console.log(`${h.length} rows to read by hand`); }
  const g = problems(db, p, PLAN);
  console.log(`plan: ${p.updates.length} rewritten, ${p.inserts.length} inserted (${p.inserts.filter((i) => i.from).length} of them rehomed), ${p.deletes.length} deleted, ${p.unapprove.length} seeds unapproved, ${p.held.length} held, ${p.kept.length} kept; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const n of g.notes) console.log('  note', n);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const log = { job: '#282', started: new Date().toISOString(), plan: p, asks: [] };
  let chars = 0;
  for (const a of clipAsks(p)) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    const lib = d.status === 200 && d.body.ok && d.body.source === 'library';
    const w = d.status === 200 && d.body.ok && !lib ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, audioId: lib ? d.body.audioId : null, chars: w, code: d.body.code, error: d.status === 200 ? undefined : d.body } });
  }
  log.chars = chars;
  const byRole = {}; for (const a of log.asks) byRole[a.role] = (byRole[a.role] || 0) + a.dry.chars;
  console.log(`route dry run: ${log.asks.length} asks, ${log.asks.filter((a) => a.dry.audioId).length} from library, ${chars} chars to render ${JSON.stringify(byRole)}, ${log.asks.filter((a) => a.dry.error).length} refused`);
  for (const a of log.asks.filter((x) => x.dry.error)) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 200));
  const clips = new Map(log.asks.filter((a) => a.dry.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.dry.audioId]));
  const out = process.env.LOG_DIR || process.cwd();
  const save = (n) => { const f = path.join(out, `ita-p17-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  // make-before-break: with RENDER=1 every missing clip is rendered (ONE call each, no retry) BEFORE any text changes; a refusal
  // stops the run with nothing applied. Without RENDER the slots of new text are left empty (never pointed at old words).
  if (mode === 'apply' && process.env.RENDER === '1') {
    const MAX = +(process.env.MAX_CHARS || 0);
    if (log.asks.some((a) => a.dry.error)) return console.log('STOP: the route refused in the dry run; nothing rendered:', save('stopped'));
    if (!(chars <= MAX)) return console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered:`, save('stopped'));
    for (const a of log.asks.filter((x) => !x.dry.audioId)) {
      const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
      a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
      if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); return console.log('a clip was refused — no retry; nothing applied:', save('render-refused')); }
      clips.set(`${a.role}\u0000${a.text}`, a.real.audioId);
    }
    log.charsSpent = log.asks.reduce((n, a) => n + ((a.real && a.real.charsSpent) || 0), 0);
    console.log(`rendered: ${log.charsSpent} chars spent`);
  }
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, body: prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results ${JSON.stringify(prev.body.error || '').slice(0, 400)}`);
  if (mode === 'dry' || prev.status !== 200 || prev.body.ok === false) return console.log('log:', save(mode === 'dry' ? 'dry' : 'preview-refused'));
  if (mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') return console.log('preview only (apply + APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, body: res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; ${JSON.stringify(res.body).slice(0, 300)}`);
  console.log('log (undo inside):', save('applied'));
}

/** After applying, on a fresh snapshot: every planned row reads as planned, every deleted one is gone, seeds unapproved. */
function verify(db, PLAN) {
  const breaches = [];
  for (const e of PLAN) {
    if (e.do === 'update') {
      const r = db.phrases.find((x) => x.sid === e.id);
      if (!r || r.known_text !== e.known || r.target_text !== e.target) breaches.push(`${e.id} does not read as planned`);
      const l = db.lego(legoOfId(e.id)); if (r && !containsLego(l.target_text, r.target_text)) breaches.push(`P17 ${e.id}`);
    }
    if (e.do === 'delete' || e.do === 'rehome') if (db.phrases.some((x) => x.sid === e.id)) breaches.push(`${e.id} still present`);
    if (['update', 'delete', 'rehome', 'insert'].includes(e.do)) { const s = db.seeds.find((x) => x.seed_number === Number(e.id.slice(1, 5))); if (s.approved_at) breaches.push(`seed ${s.seed_number} still approved`); }
  }
  console.log(`verify: ${PLAN.length} plan entries, ${breaches.length} breaches`);
  for (const b of [...new Set(breaches)]) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { k49Floor, unsaid, containsLego, shape, tokenSays, toks, plan, simulate, problems, knockOn, clipAsks, editOps, load, vocab };
