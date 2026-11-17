#!/usr/bin/env node
'use strict';
// ops/kor-held-432/apply.cjs — kor_for_eng held items (job #432·AI, Kai's yes 17 Nov 2026 ~12:45Z).
// Data: ./plan-data.cjs. Reads ONLY Popty's API dump (GET /api/production/kor_for_eng/seeds); writes ONLY through Popty
// (POST /api/audio/render, POST /api/production/kor_for_eng/edit-batch signed with the Kai key → kai_go for the structural
// lego.insert / lego.delete ops). No DB connection anywhere.
//
//   node apply.cjs plan      <seeds.json>               # ops + gates (P17 / decomposition / ZUT), writes out/plan.json
//   node apply.cjs dry-text  <seeds.json>               # edit-batch DRY RUN of the text ops (no clip links)
//   node apply.cjs audio-dry <seeds.json>               # render-route DRY RUN of every slot the plan changes
//   APPLY_CONFIRM=1 MAX_CHARS=5500 node apply.cjs render <seeds.json>   # real renders, learner order, stops at MAX_CHARS
//   [APPLY_CONFIRM=1] node apply.cjs apply <seeds.json> # text + clip links in one transaction per batch (dry unless confirmed)
//   APPLY_CONFIRM=1 node apply.cjs intros <fresh seeds.json>   # presentation renders that bind to their LEGO (after apply)
//   node apply.cjs verify <fresh seeds.json>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./plan-data.cjs');

const COURSE = 'kor_for_eng';
const AGENT = 'kor-held-432 (job #432·AI, Kai seat)';
const KAI_AGENT = 'kai-432-kor-held-items';
const PURPOSE = 'kor_for_eng #432·AI: 34 held items (#420·AI + #734), Kai approved re-recording ~5,500 chars 17 Nov';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.join(__dirname, '..', '..');
const dz = require(path.join(ROOT, 'services/phrase-decomposer.cjs'));

const sid = (id) => String(id).split(':').pop();
const pid = (id) => `${COURSE}:${id}`;
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,]+$/, '').replace(/\s+/g, ' ');
const nt = (s) => (s || '').replace(/[\s.,?!]/g, '');
const save = (n, o) => { const f = path.join(OUT, n); fs.writeFileSync(f, JSON.stringify(o, null, 1)); return f; };
const read = (n) => JSON.parse(fs.readFileSync(path.join(OUT, n), 'utf8'));
const legoIdOf = (seed, idx) => `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`;
const intro = (known) => `The Korean for: '${known}', is:`;

function load(file) {
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const seeds = new Map(), legos = new Map(), phrases = new Map();
  for (const s of api.seeds) {
    seeds.set(s.seed_number, s);
    for (const l of s.legos || []) { legos.set(l.lego_id, l); for (const p of l.basket_phrases || []) phrases.set(sid(p.id), { ...p, _lego: l.lego_id }); }
  }
  return { seeds, legos, phrases };
}

/** The whole plan, pure. */
function plan(db) {
  const notes = [], problems = [];
  const deleted = new Set(D.legoDelete);
  // LEGOs after the pass
  const after = new Map();
  for (const [id, l] of db.legos) {
    if (deleted.has(id)) continue;
    const c = D.legos[id];
    if (!c) { after.set(id, l); continue; }
    const n = { ...l };
    for (const k of ['known_text', 'target_text', 'type', 'is_new']) if (c[k] !== undefined) n[k] = c[k];
    if (c.comps) n.components = c.comps.map(([known, target]) => ({ known, target }));
    after.set(id, n);
  }
  for (const x of D.legoInsert) {
    const id = legoIdOf(x.seed, x.index);
    if (db.legos.has(id)) problems.push(`insert ${id}: already exists`);
    after.set(id, { lego_id: id, seed_number: x.seed, lego_index: x.index, known_text: x.known_text, target_text: x.target_text, type: x.type, is_new: true, components: x.comps.map(([known, target]) => ({ known, target })), _inserted: true });
  }
  for (const id of Object.keys(D.legos)) if (!db.legos.has(id)) problems.push(`LEGO ${id} not in the course`);
  const vocab = (n) => [...after.values()].filter((l) => l.seed_number <= n).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const decompose = (t, lego, n) => { try { return dz.decomposeAnchored(t, vocab(n), { lego_id: lego.lego_id, target_text: lego.target_text, known_text: lego.known_text }, COURSE); } catch (e) { return { kind: 'error', error: e.message }; } };

  // phrases after the pass
  const phr = []; // {id, op:'update'|'delete'|'insert'|'keep', before, known, target, lego}
  const named = new Set(Object.keys(D.phrases));
  for (const id of named) if (!db.phrases.has(id)) problems.push(`phrase ${id} not in the course`);
  for (const [id, p] of db.phrases) {
    if (p.phrase_role === 'component') continue;
    if (deleted.has(p._lego)) { phr.push({ id, op: 'cascade', before: p, lego: p._lego }); continue; }
    let known = p.known_text, target = p.target_text;
    if (named.has(id)) {
      const v = D.phrases[id];
      if (v === null) { phr.push({ id, op: 'delete', before: p, lego: p._lego }); continue; }
      [known, target] = v;
    } else {
      for (const [o, n] of D.rep[p._lego] || []) if (target.includes(o)) target = target.split(o).join(n);
      for (const [o, n] of D.repEn[p._lego] || []) if (known.includes(o)) known = known.split(o).join(n);
    }
    if (known === p.known_text && target === p.target_text) { phr.push({ id, op: 'keep', before: p, lego: p._lego, known, target }); continue; }
    phr.push({ id, op: 'update', before: p, lego: p._lego, known, target });
  }
  // inserts: next free number per LEGO+letter
  const nextNo = new Map(), nextPos = new Map();
  const taken = (lego, letter) => [...db.phrases.keys()].filter((k) => k.startsWith(lego + letter)).map((k) => +k.slice(9));
  for (const x of D.phraseInsert) {
    const letter = x.role === 'build' ? 'B' : 'U';
    const key = x.lego + letter;
    if (!nextNo.has(key)) nextNo.set(key, Math.max(0, ...taken(x.lego, letter)) + 1);
    if (!nextPos.has(x.lego)) nextPos.set(x.lego, Math.max(0, ...[...db.phrases.values()].filter((p) => p._lego === x.lego).map((p) => p.position || 0)) + 1);
    const id = `${key}${String(nextNo.get(key)).padStart(2, '0')}`;
    nextNo.set(key, nextNo.get(key) + 1);
    phr.push({ id, op: 'insert', lego: x.lego, role: x.role, known: x.known, target: x.target, position: nextPos.get(x.lego) });
    nextPos.set(x.lego, nextPos.get(x.lego) + 1);
  }
  // gates per changed/inserted phrase: P17 (the LEGO's Korean is inside the phrase), decomposition
  for (const r of phr.filter((r) => r.op === 'update' || r.op === 'insert')) {
    const l = after.get(r.lego);
    if (!l) { problems.push(`${r.id}: its LEGO ${r.lego} is gone`); continue; }
    const seedN = l.seed_number;
    if (!nt(r.target).includes(nt(l.target_text))) notes.push(`P17 ${r.id}: "${r.target}" does not contain ${r.lego} "${l.target_text}"`);
    const dec = decompose(r.target, l, seedN);
    r.decomposition = dec && dec.blocks ? dec.blocks : null;
    r.decKind = dec.kind;
    const ghosts = (dec.blocks || []).filter((b) => b.isGhost && nt(b.target)).map((b) => b.target.trim());
    if (ghosts.length) notes.push(`untiled ${r.id} [${r.lego}] "${r.target}": ${ghosts.join(' | ')}`);
  }
  // knock-on: phrases outside the plan whose decomposition names a changed/deleted LEGO, and that still carry the old text
  const changedLegos = new Map([...Object.entries(D.legos)].filter(([, c]) => c.target_text).map(([id]) => [id, db.legos.get(id).target_text]));
  for (const id of D.legoDelete) changedLegos.set(id, db.legos.get(id).target_text);
  const outside = [];
  for (const r of phr.filter((r) => r.op === 'keep')) {
    const names = (r.before.decomposition || []).filter((b) => b && changedLegos.has(b.legoId) && b.legoId !== r.lego).map((b) => b.legoId);
    if (names.length) outside.push(`${r.id} [${r.lego}] names ${[...new Set(names)].join(',')}: ${r.known} | ${r.target}`);
  }
  // ZUT (EN→2KO) over seeds + LEGOs + played/unplayed phrases (no components), before vs after
  const rows = (useAfter) => {
    const out = [];
    for (const [n, s] of db.seeds) { const c = useAfter ? D.seeds[n] || {} : {}; out.push({ key: `seed ${n}`, k: c.known_text || s.known_text, t: c.target_text || s.target_text }); }
    for (const [id, l] of useAfter ? after : db.legos) out.push({ key: id, k: l.known_text, t: l.target_text });
    if (!useAfter) for (const [id, p] of db.phrases) { if (p.phrase_role !== 'component') out.push({ key: id, k: p.known_text, t: p.target_text }); }
    else for (const r of phr) if (r.op === 'keep' || r.op === 'update' || r.op === 'insert') out.push({ key: r.id, k: r.known, t: r.target });
    return out;
  };
  const idx = (rs) => { const m = new Map(); for (const r of rs) { const k = nk(r.k); if (!m.has(k)) m.set(k, new Map()); m.get(k).set(r.key, nt(r.t)); } return m; };
  const bI = idx(rows(false)), aI = idx(rows(true));
  const zut = [];
  for (const [k, m] of aI) {
    const ts = new Set(m.values());
    if (ts.size < 2) continue;
    const b = bI.get(k); const bts = b ? new Set(b.values()) : new Set();
    if ([...ts].every((t) => bts.has(t)) && bts.size >= ts.size) continue; // not new
    zut.push({ known: k, rows: [...m.entries()].map(([key, t]) => `${key}=${t}`) });
  }
  // seeds touched → unapprove (O5)
  const touched = new Set();
  for (const n of Object.keys(D.seeds)) touched.add(+n);
  for (const id of [...Object.keys(D.legos), ...D.legoDelete]) touched.add(db.legos.get(id).seed_number);
  for (const x of D.legoInsert) touched.add(x.seed);
  for (const r of phr) if (r.op !== 'keep') touched.add(r.before ? r.before.seed_number : after.get(r.lego).seed_number);
  return { after, phr, notes, problems, outside, zut, touched: [...touched].sort((a, b) => a - b) };
}

/** Slots that need a clip: {role, text, where:[{kind,id,slot}], seed}. */
function asks(db, p) {
  const m = new Map();
  const add = (role, text, kind, id, slot, seed) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, where: [], seed }); const a = m.get(k); a.where.push({ kind, id, slot }); a.seed = Math.min(a.seed, seed); };
  for (const [n, c] of Object.entries(D.seeds)) {
    if (c.target_text) { add('target1', c.target_text, 'seed', +n, 'target1', +n); add('target2', c.target_text, 'seed', +n, 'target2', +n); }
    if (c.known_text) add('known', c.known_text, 'seed', +n, 'known', +n);
  }
  for (const [id, l] of p.after) {
    const b = db.legos.get(id);
    const tChanged = !b || b.target_text !== l.target_text, kChanged = !b || b.known_text !== l.known_text;
    if (tChanged) { add('target1', l.target_text, 'lego', id, 'target1', l.seed_number); add('target2', l.target_text, 'lego', id, 'target2', l.seed_number); }
    if (kChanged) add('known', l.known_text, 'lego', id, 'known', l.seed_number);
    const c = D.legos[id] || {};
    const needsIntro = kChanged || c.intro || (l.is_new && b && !b.is_new && !b.presentation_audio_id);
    if (needsIntro && !c.introClip) add('presentation', c.intro || intro(l.known_text), 'lego', id, 'presentation', l.seed_number);
  }
  for (const r of p.phr) {
    if (r.op !== 'update' && r.op !== 'insert') continue;
    const seed = r.before ? r.before.seed_number : p.after.get(r.lego).seed_number;
    if (r.op === 'insert' || r.target !== r.before.target_text) { add('target1', r.target, 'phrase', r.id, 'target1', seed); add('target2', r.target, 'phrase', r.id, 'target2', seed); }
    if (r.op === 'insert' || r.known !== r.before.known_text) add('known', r.known, 'phrase', r.id, 'known', seed);
  }
  return [...m.values()].sort((a, b) => a.seed - b.seed);
}

/** Edit-batch op UNITS (each self-contained). clip(role,text) -> audio id | undefined. withAudio=false for the text-only dry run. */
function units(db, p, clip, withAudio) {
  const U = [];
  const posNext = new Map();
  const allocPos = (lego) => { if (!posNext.has(lego)) posNext.set(lego, Math.max(0, ...[...db.phrases.values()].filter((q) => q._lego === lego).map((q) => q.position || 0), ...p.phr.filter((r) => r.op === 'insert' && r.lego === lego).map((r) => r.position || 0)) + 1); const v = posNext.get(lego); posNext.set(lego, v + 1); return v; };
  const slotOf = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
  // keep=true: re-linking the row's OWN pre-existing clip to an unchanged slot (the text trigger drops it); its clip text may differ by
  // punctuation only ("why not?" vs "why not") and it is already what learners hear, so the mismatch guard is waived for it alone.
  const link = (target, keyName, key, slot, id, keep) => (id ? [{ op: 'audio.link', target, [keyName]: key, slot, audio_id: id, ...(keep ? { allow_text_mismatch: true } : {}) }] : []);
  // LEGO deletes first (they free nothing the others need, and their phrases go with them)
  for (const id of D.legoDelete) U.push({ tag: `delete ${id}`, seed: db.legos.get(id).seed_number, ops: [{ op: 'lego.delete', lego_id: id, cascade_phrases: true, expect: { target_text: db.legos.get(id).target_text } }] });
  // seeds
  for (const [n, c] of Object.entries(D.seeds)) {
    const s = db.seeds.get(+n), set = {}, ops = [];
    if (c.target_text) { set.target_text = c.target_text; set.target_text_roman = null; }
    if (c.known_text) set.known_text = c.known_text;
    ops.push({ op: 'seed.update', seed_number: +n, set, expect: { known_text: s.known_text, target_text: s.target_text } });
    if (withAudio) {
      for (const slot of ['known', 'target1', 'target2']) {
        const text = slot === 'known' ? (c.known_text || s.known_text) : (c.target_text || s.target_text);
        const changed = slot === 'known' ? !!c.known_text : !!c.target_text;
        ops.push(...link('seed', 'seed_number', +n, slot, changed ? clip(slot, text) : s[slotOf[slot]], !changed));
      }
    }
    U.push({ tag: `seed ${n}`, seed: +n, ops });
  }
  // LEGO inserts with their phrases (DEBUT_WITHOUT_PRACTICE: a new LEGO travels with its practice)
  const insertedPhrases = new Set();
  const phraseRow = (r) => {
    const l = p.after.get(r.lego);
    const row = { id: pid(r.id), course_code: COURSE, seed_number: l.seed_number, lego_index: l.lego_index, known_text: r.known, target_text: r.target,
      phrase_role: r.role, position: r.position, word_count: r.target.length, lego_count: Math.max(1, (r.decomposition || []).filter((b) => b.legoId).length), lego_position: 'middle', status: 'draft', introduce: true, metadata: { job: '#432·AI' } };
    if (r.decomposition) row.decomposition = r.decomposition;
    if (withAudio) for (const slot of ['known', 'target1', 'target2']) { const a = clip(slot, slot === 'known' ? r.known : r.target); if (a) row[slotOf[slot]] = a; }
    return row;
  };
  for (const x of D.legoInsert) {
    const id = legoIdOf(x.seed, x.index), l = p.after.get(id);
    const row = { seed_number: x.seed, lego_index: x.index, known_text: x.known_text, target_text: x.target_text, type: x.type, is_new: true, components: l.components, status: 'draft' };
    if (withAudio) for (const slot of ['known', 'target1', 'target2']) { const a = clip(slot, slot === 'known' ? x.known_text : x.target_text); if (a) row[slotOf[slot]] = a; }
    const ops = [{ op: 'lego.insert', row }];
    l.components.forEach((c, i) => ops.push({ op: 'phrase.insert', row: { id: pid(`${id}C${String(i + 1).padStart(2, '0')}`), course_code: COURSE, seed_number: x.seed, lego_index: x.index, known_text: c.known, target_text: c.target, phrase_role: 'component', position: allocPos(id), word_count: c.target.length, lego_count: 1, lego_position: 'middle', status: 'draft', introduce: true, metadata: { buildup: 'component', component_index: i, job: '#432·AI' }, decomposition: [{ known: '', legoId: null, target: c.target, isGhost: true }] } }));
    for (const r of p.phr.filter((r) => r.op === 'insert' && r.lego === id)) { ops.push({ op: 'phrase.insert', row: phraseRow(r) }); insertedPhrases.add(r.id); }
    U.push({ tag: `insert ${id}`, seed: x.seed, ops });
  }
  // LEGO updates (+ component rows)
  for (const [id, c] of Object.entries(D.legos)) {
    const b = db.legos.get(id), a = p.after.get(id), set = {}, ops = [];
    for (const k of ['known_text', 'target_text', 'type', 'is_new']) if (c[k] !== undefined && c[k] !== b[k]) set[k] = c[k];
    if (set.target_text) set.target_text_roman = null;
    if (c.comps) set.components = a.components;
    if (Object.keys(set).length) ops.push({ op: 'lego.update', lego_id: id, set, expect: { known_text: b.known_text, target_text: b.target_text } });
    if (c.comps) {
      const rows = [...db.phrases.values()].filter((q) => q._lego === id && q.phrase_role === 'component').sort((x, y) => sid(x.id).localeCompare(sid(y.id)));
      a.components.forEach((cc, i) => {
        const q = rows[i];
        const dec = [{ known: '', legoId: null, target: cc.target, isGhost: true }];
        if (q) { if (q.known_text !== cc.known || q.target_text !== cc.target) ops.push({ op: 'phrase.update', phrase_id: q.id, set: { known_text: cc.known, target_text: cc.target, target_text_roman: null, decomposition: dec }, expect: { target_text: q.target_text } }); }
        else ops.push({ op: 'phrase.insert', row: { id: pid(`${id}C${String(i + 1).padStart(2, '0')}`), course_code: COURSE, seed_number: b.seed_number, lego_index: b.lego_index, known_text: cc.known, target_text: cc.target, phrase_role: 'component', position: allocPos(id), word_count: cc.target.length, lego_count: 1, lego_position: 'middle', status: 'draft', introduce: true, metadata: { buildup: 'component', component_index: i, job: '#432·AI' }, decomposition: dec } });
      });
      for (const q of rows.slice(a.components.length)) ops.push({ op: 'phrase.delete', phrase_id: q.id, expect: { target_text: q.target_text } });
    }
    if (withAudio) {
      for (const slot of ['known', 'target1', 'target2']) {
        const changed = slot === 'known' ? a.known_text !== b.known_text : a.target_text !== b.target_text;
        ops.push(...link('lego', 'lego_id', id, slot, changed ? clip(slot, slot === 'known' ? a.known_text : a.target_text) : b[slotOf[slot]], !changed));
      }
      // English unchanged and no custom intro → the same intro clip goes back (the text trigger drops it); otherwise `intros` renders + binds
      if (a.known_text === b.known_text && !c.intro && b.presentation_audio_id) ops.push(...link('lego', 'lego_id', id, 'presentation', b.presentation_audio_id, true));
      if (c.introClip) ops.push(...link('lego', 'lego_id', id, 'presentation', c.introClip));
    }
    U.push({ tag: `lego ${id}`, seed: b.seed_number, ops });
  }
  // phrases
  for (const r of p.phr) {
    if (r.op === 'delete') U.push({ tag: `del ${r.id}`, seed: r.before.seed_number, ops: [{ op: 'phrase.delete', phrase_id: pid(r.id), expect: { target_text: r.before.target_text } }] });
    if (r.op === 'insert' && !insertedPhrases.has(r.id)) U.push({ tag: `ins ${r.id}`, seed: p.after.get(r.lego).seed_number, ops: [{ op: 'phrase.insert', row: phraseRow(r) }] });
    if (r.op === 'update') {
      const set = {};
      if (r.known !== r.before.known_text) set.known_text = r.known;
      if (r.target !== r.before.target_text) { set.target_text = r.target; set.target_text_roman = null; set.word_count = r.target.length; }
      if (r.decomposition) set.decomposition = r.decomposition;
      const ops = [{ op: 'phrase.update', phrase_id: pid(r.id), set, expect: { known_text: r.before.known_text, target_text: r.before.target_text } }];
      if (withAudio) for (const slot of ['known', 'target1', 'target2']) {
        const changed = slot === 'known' ? r.known !== r.before.known_text : r.target !== r.before.target_text;
        ops.push(...link('phrase', 'phrase_id', pid(r.id), slot, changed ? clip(slot, slot === 'known' ? r.known : r.target) : r.before[slotOf[slot]], !changed));
      }
      U.push({ tag: `upd ${r.id}`, seed: r.before.seed_number, ops });
    }
  }
  for (const n of p.touched) if (db.seeds.get(n) && db.seeds.get(n).approved_at) U.push({ tag: `unapprove ${n}`, seed: n, ops: [{ op: 'seed.update', seed_number: n, set: { approved_at: null } }] });
  return U;
}
function pack(U, max = Number(process.env.BATCH) || 30) {
  const out = []; let cur = [];
  for (const u of U) { if (cur.length && cur.length + u.ops.length > max) { out.push(cur); cur = []; } cur = cur.concat(u.ops); }
  if (cur.length) out.push(cur);
  return out;
}

async function post(url, body, extra = {}) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, 'x-agent-role': 'kai', ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { error: String((e.cause && e.cause.code) || e.name) } }; }
}
async function postSigned(urlPath, body) {
  const header = execFileSync('sudo', ['-n', '-u', 'popty', 'node', path.join(ROOT, 'tools/agent-admin/sign.cjs')], { input: JSON.stringify({ agentId: KAI_AGENT, method: 'POST', path: urlPath, body, key: 'kai' }), encoding: 'utf8' }).trim();
  try {
    const r = await fetch(POPTY + urlPath, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-admin': header }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { error: String((e.cause && e.cause.code) || e.name) } }; }
}
const APPROVAL = 'kai:2026-11-17:Kai approved applying the 34 kor_for_eng held items and re-recording the fixes (~5,500 chars), job #432';
const renderBody = (a, dry) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, job: '#432·AI', ...(dry ? { dryRun: true } : {}), ...(a.legoId ? { legoId: a.legoId } : {}) });
const CONV = process.env.CS_CONV_TOKEN ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {};

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: plan|dry-text|audio-dry|render|apply|intros|verify <seeds.json>');
  const db = load(file);
  const p = plan(db);
  const confirm = process.env.APPLY_CONFIRM === '1';
  if (mode === 'plan') {
    const counts = {}; for (const r of p.phr) counts[r.op] = (counts[r.op] || 0) + 1;
    console.log('phrases:', JSON.stringify(counts), '| LEGO updates', Object.keys(D.legos).length, '| inserts', D.legoInsert.length, '| deletes', D.legoDelete.length, '| seeds', Object.keys(D.seeds).length, '| touched seeds', p.touched.length);
    for (const x of p.problems) console.log('PROBLEM', x);
    for (const x of p.notes) console.log('NOTE', x);
    for (const x of p.outside) console.log('OUTSIDE', x);
    for (const z of p.zut) console.log('ZUT', JSON.stringify(z));
    const A = asks(db, p);
    const est = A.reduce((s, a) => s + [...a.text].length, 0);
    console.log(`asks: ${A.length} unique (role,text); naive chars ${est}`);
    save('plan.json', { phr: p.phr.filter((r) => r.op !== 'keep').map(({ before, ...r }) => ({ ...r, before: before && { known: before.known_text, target: before.target_text } })), notes: p.notes, problems: p.problems, outside: p.outside, zut: p.zut, touched: p.touched, asks: A });
    return;
  }
  if (mode === 'dry-text') {
    const batches = pack(units(db, p, () => undefined, false));
    let ok = 0;
    for (let i = 0; i < batches.length; i++) {
      const r = await postSigned(`/api/production/${COURSE}/edit-batch`, { ops: batches[i] });
      if (r.status === 200) ok++;
      else console.log(`batch ${i + 1}/${batches.length} DRY ${r.status} ${r.body.code || ''} ${r.body.error || ''} op#${r.body.index}`, JSON.stringify(batches[i][r.body.index] || {}).slice(0, 400));
    }
    console.log(`dry-text: ${ok}/${batches.length} batches clean, ${batches.reduce((n, b) => n + b.length, 0)} ops`);
    return;
  }
  if (mode === 'audio-dry') {
    const A = asks(db, p).filter((a) => a.role !== 'presentation' || true);
    const out = []; let would = 0;
    for (const a of A) {
      const r = await post(`${POPTY}/api/audio/render`, renderBody(a, true));
      const d = { status: r.status, source: r.body.source, code: r.body.code, error: r.status === 200 ? undefined : (r.body.error || '').slice(0, 300), audioId: r.body.audioId, chars: r.body.wouldSpendChars || 0 };
      would += d.chars; out.push({ ...a, dry: d });
      await new Promise((res) => setTimeout(res, 120));
    }
    const by = (f) => out.filter(f).length;
    console.log(`audio-dry: ${out.length} asks · library ${by((a) => a.dry.source === 'library')} · would-render ${by((a) => a.dry.source === 'would-render')} (${would} chars) · refused ${by((a) => a.dry.status !== 200)}`);
    const cum = []; let c = 0; for (const a of out) { c += a.dry.chars; cum.push([a.seed, c]); }
    console.log('cumulative chars by seed:', JSON.stringify([...new Map(cum).entries()]));
    for (const a of out.filter((a) => a.dry.status !== 200)) console.log('  REFUSED', a.role, JSON.stringify(a.text), a.dry.status, a.dry.code, a.dry.error);
    save('audio-dry.json', out);
    return;
  }
  if (mode === 'render') {
    // Real renders in LEARNER ORDER (earliest seed first). Library-first is automatic. Stops at the first SEED BOUNDARY at or past
    // MAX_CHARS, so a seed is either fully voiced or not started. No bulk dry run on live (agent-rate-cap: 100/h); every call here is real.
    const A = asks(db, p).filter((a) => a.role !== 'presentation');
    const MAX = Number(process.env.MAX_CHARS || 5500);
    const prev = fs.existsSync(path.join(OUT, 'audio-real.json')) ? read('audio-real.json') : [];
    const have = new Map(prev.map((a) => [`${a.role}\u0000${a.text}`, a]));
    let spent = prev.reduce((s2, a) => s2 + ((a.real && a.real.charsSpent) || 0), 0);
    const out = [...prev];
    let stopAt = null;
    for (const a of A) {
      const k = `${a.role}\u0000${a.text}`;
      if (have.has(k) && have.get(k).real && (have.get(k).real.audioId || have.get(k).real.code)) continue;
      if (stopAt !== null && a.seed > stopAt) break;
      if (stopAt === null && spent >= MAX) { stopAt = a.seed - 1; if (a.seed > stopAt) break; }
      if (!confirm) { console.log('would ask', a.seed, a.role, a.text); continue; }
      const r = await post(`${POPTY}/api/audio/render`, renderBody(a, false), CONV);
      const real = { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent || 0, code: r.status === 200 ? undefined : r.body.code, error: r.status === 200 ? undefined : (r.body.error || '').slice(0, 400) };
      spent += real.charsSpent;
      const row = { ...a, real }; out.push(row); have.set(k, row);
      if (r.status !== 200) console.log('  REFUSED', a.seed, a.role, JSON.stringify(a.text), r.status, r.body.code, (r.body.error || '').slice(0, 200));
      save('audio-real.json', out);
    }
    const left = A.filter((a) => !have.has(`${a.role}\u0000${a.text}`));
    console.log(`render: ${out.filter((a) => a.real && a.real.audioId).length} clips linked/rendered, ${spent} chars spent, ${out.filter((a) => a.real && a.real.code).length} refused; ${left.length} asks not yet made (seeds ${[...new Set(left.map((a) => a.seed))].join(',')}), naive ${left.reduce((s2, a) => s2 + [...a.text].length, 0)} chars`);
    save('audio-real.json', out);
    return;
  }
  if (mode === 'apply') {
    const real = read('audio-real.json');
    const clips = new Map(real.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
    const clip = (role, text) => clips.get(`${role}\u0000${text}`);
    const missing = new Set();
    const clipG = (role, text) => { const a = clip(role, text); if (!a) missing.add(`${role}\u0000${text}`); return a; };
    const U0 = units(db, p, clipG, true);
    // which seeds have every clip? (re-run units per unit to attribute misses)
    const bad = new Set();
    for (const u of units(db, p, () => undefined, false)) { /* structure only */ }
    const per = [];
    for (const u of U0) { per.push(u); }
    const need = asks(db, p).filter((a) => a.role !== 'presentation');
    for (const a of need) if (!clip(a.role, a.text)) for (const w of a.where) bad.add(w.kind === 'seed' ? w.id : (p.after.get(w.kind === 'lego' ? w.id : (p.phr.find((r) => r.id === w.id) || {}).lego) || {}).seed_number);
    // a LEGO change pulls its phrases' seed with it (same seed by construction); an unvoiced seed holds every unit tagged with it
    const only = process.env.SEEDS ? new Set(process.env.SEEDS.split(',').map(Number)) : null;
    const U = per.filter((u) => !bad.has(u.seed) && (!only || only.has(u.seed)));
    console.log(`seeds held for audio: ${[...bad].sort((a, b) => a - b).join(',') || 'none'}; units going ${U.length}/${per.length}`);
    save('apply-scope.json', { held: [...bad].sort((a, b) => a - b), going: [...new Set(U.map((u) => u.seed))].sort((a, b) => a - b) });
    const batches = pack(U);
    console.log(`${batches.length} batches, ${batches.reduce((n, b) => n + b.length, 0)} ops`);
    const log = fs.existsSync(path.join(OUT, 'applied.json')) ? read('applied.json') : [];
    for (let i = 0; i < batches.length; i++) {
      const dry = await postSigned(`/api/production/${COURSE}/edit-batch`, { ops: batches[i] });
      if (dry.status !== 200) { console.log(`batch ${i + 1} DRY ${dry.status} ${dry.body.code || ''} ${dry.body.error || ''} op#${dry.body.index}`, JSON.stringify(batches[i][dry.body.index] || {}).slice(0, 300)); process.exitCode = 1; return; }
      if (!confirm) continue;
      const ap = await postSigned(`/api/production/${COURSE}/edit-batch`, { ops: batches[i], apply: true });
      log.push({ batch: i + 1, status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, undo: ap.body.undo_ops || ap.body.undo, error: ap.body.error, code: ap.body.code, ops: batches[i].length });
      save('applied.json', log);
      console.log(`batch ${i + 1}/${batches.length} APPLY ${ap.status} event ${ap.body.event_id || ''} ${ap.body.code || ''} ${ap.body.error || ''}`);
      if (ap.status !== 200) { process.exitCode = 1; return; }
    }
    if (!confirm) console.log('dry run clean for every batch (with clip links)');
    return;
  }
  if (mode === 'intros') {
    const need = asks(db, p).filter((a) => a.role === 'presentation');
    const out = [];
    for (const a of need) {
      const legoId = a.where[0].id;
      const r = await post(`${POPTY}/api/audio/render`, { ...renderBody(a, !confirm), legoId }, CONV);
      out.push({ legoId, text: a.text, status: r.status, source: r.body.source, audioId: r.body.audioId, legoLinked: r.body.legoLinked, charsSpent: r.body.charsSpent || 0, chars: r.body.wouldSpendChars, code: r.body.code, error: r.status === 200 ? undefined : (r.body.error || '').slice(0, 300) });
      console.log(legoId, r.status, r.body.source || r.body.code, r.body.audioId || '', r.body.legoLinked ? 'bound' : '', r.body.charsSpent || r.body.wouldSpendChars || 0);
    }
    save(confirm ? 'intros-real.json' : 'intros-dry.json', out);
    return;
  }
  if (mode === 'verify') {
    // fresh dump: every planned row has its new text and a clip in each slot; deleted rows gone
    const bad = [], ok = [];
    const real = read('audio-real.json');
    const clips = new Map(real.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
    const plan0 = read('plan.json');
    for (const r of plan0.phr) {
      const live = db.phrases.get(r.id);
      if (r.op === 'delete' || r.op === 'cascade') { (live ? bad : ok).push(`${r.id} ${live ? 'STILL PRESENT' : 'gone'}`); continue; }
      if (!live) { bad.push(`${r.id} MISSING`); continue; }
      const probs = [];
      if (live.known_text !== r.known) probs.push(`known "${live.known_text}"`);
      if (live.target_text !== r.target) probs.push(`target "${live.target_text}"`);
      for (const [slot, col, text] of [['known', 'known_audio_id', r.known], ['target1', 'target1_audio_id', r.target], ['target2', 'target2_audio_id', r.target]]) {
        if (!live[col]) probs.push(`${slot} EMPTY`);
        else if (clips.has(`${slot}\u0000${text}`) && clips.get(`${slot}\u0000${text}`) !== live[col]) probs.push(`${slot} ${live[col]} is not this job's clip`);
      }
      (probs.length ? bad : ok).push(`${r.id} ${probs.join('; ') || 'ok'}`);
    }
    for (const [id, c] of Object.entries(D.legos)) {
      const l = db.legos.get(id); if (!l) { bad.push(`${id} MISSING`); continue; }
      const probs = [];
      for (const k of ['known_text', 'target_text', 'is_new']) if (c[k] !== undefined && l[k] !== c[k]) probs.push(`${k}=${l[k]}`);
      for (const col of ['target1_audio_id', 'target2_audio_id', 'known_audio_id', 'presentation_audio_id']) if (!l[col]) probs.push(`${col} EMPTY`);
      (probs.length ? bad : ok).push(`${id} ${probs.join('; ') || 'ok'}`);
    }
    for (const x of D.legoInsert) { const id = legoIdOf(x.seed, x.index), l = db.legos.get(id); (l && l.target_text === x.target_text && l.presentation_audio_id && l.target1_audio_id && l.target2_audio_id ? ok : bad).push(`${id} ${l ? `t1=${l.target1_audio_id} t2=${l.target2_audio_id} pres=${l.presentation_audio_id}` : 'MISSING'}`); }
    for (const id of D.legoDelete) (db.legos.get(id) ? bad : ok).push(`${id} ${db.legos.get(id) ? 'STILL PRESENT' : 'deleted'}`);
    for (const [n, c] of Object.entries(D.seeds)) { const s = db.seeds.get(+n); const probs = []; if (c.target_text && s.target_text !== c.target_text) probs.push('target'); if (c.known_text && s.known_text !== c.known_text) probs.push('known'); for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id']) if (!s[col]) probs.push(`${col} EMPTY`); (probs.length ? bad : ok).push(`seed ${n} ${probs.join('; ') || 'ok'}`); }
    console.log(`verify: ${ok.length} ok, ${bad.length} bad`); for (const b of bad) console.log('  BAD', b);
    save('verify.json', { ok, bad });
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, asks, units };
