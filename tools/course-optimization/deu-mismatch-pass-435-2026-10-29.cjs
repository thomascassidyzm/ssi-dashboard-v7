#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-mismatch-pass-435-2026-10-29.cjs — deu_for_eng: the CLEAR English↔German mismatch fixes
// from a full read of every seed, LEGO and phrase (job #435, Kai 2026-10-29, after Deborah's learner report: "qualifiers
// missed, verbs left out, inconsistencies in word order"). The fixes are data: ./deu-mismatch-pass-435-2026-10-29.data.cjs
// (each one a reader's verdict from ops/deu-435/shard-*.data.cjs that the parent re-read and kept).
//
// Each fix is re-checked on the LIVE course before it is sent, and is SKIPPED (never forced) when:
//   drift       the row no longer reads as the reader read it (or is gone)
//   P17/K49     a phrase that held its LEGO no longer does, either side (reordered counts)
//   P1          the new German brings in a word not taught by that point (seeds and LEGOs before it, earlier siblings)
//   ZUT         the new pair makes a clash that was not there: one English → two Germans, against every seed, LEGO and
//               phrase after this pass. One German → two Englishes is allowed (Kai) and only noted.
//   duplicate   the new pair is already another row in the same basket
//   floor       a delete would leave the basket under 4 USE or with no BUILD
// A seed whose text changes takes its P26 copies with it (phrases that carried the seed's exact old pair).
// Every seed whose rows change is unapproved (O5). No audio is rendered: a text edit lets the database's text-change
// triggers keep a clip that still speaks the new words, re-point to one we own, or leave the slot empty (recorded in
// content_audio_link_drops); `audio` mode asks the one audio route for a DRY RUN of every changed slot.
//
//   node …cjs check <seeds.json>                  # plan + gates (pure); seeds.json = GET /api/production/deu_for_eng/seeds
//   node …cjs dry   <seeds.json>                  # + edit-batch dry runs
//   APPLY_CONFIRM=1 node …cjs apply <seeds.json>  # + apply (each answer carries event_id + undo_file)
//   node …cjs audio <seeds.json>                  # the audio route's DRY RUN for every changed slot (no render)
//   node …cjs verify <seeds.json>                 # on a fresh read: every fix that went reads its new text
//   MAX_CHARS=<headroom> [RENDER_CONFIRM=1] node …cjs render <fresh seeds.json>  # after apply: library-first, then render the
//                                                 WHOLE set only if it fits MAX_CHARS (Kai 10:43Z; never split), link every slot
const fs = require('fs');
const path = require('path');
const D = require('./deu-mismatch-pass-435-2026-10-29.data.cjs');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-mismatch-pass (job #435)';
const PURPOSE = 'job #435 deu_for_eng English↔German mismatch pass (Kai 29 Oct) — dry run for Kai\'s spend decision';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const USE_FLOOR = 4;
// One transaction per batch: the text-change audio triggers cost ~0.7 s an op; 25 stay under the statement cap (#425).
const BATCH = Number(process.env.BATCH) || 25;

const pid = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,]+$/, '');
const ntStrict = (s) => (s || '').replace(/[\s.?!,;:]/g, '').toLowerCase().replace(/[«»"'’„“]/g, '');
const seedOf = (legoId) => Number(legoId.slice(1, 5));

// taught words (P1): seeds before, LEGOs (+ components) up to and including this one
function makeTaught(after, tw) {
  const legos = [...after.legos].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const seedTexts = new Map(after.seeds.map((s) => [s.seed_number, s.target_text]));
  const cache = new Map();
  let keys = new Set(); let lastSeed = 0; let i = 0;
  const addText = (t) => { for (const k of tw.taughtWordKeys([t], COURSE)) keys.add(k); };
  return function keysFor(legoId) {
    if (cache.has(legoId)) return cache.get(legoId);
    const seedN = seedOf(legoId), idx = Number(legoId.slice(6, 8));
    if (seedN < lastSeed) { keys = new Set(); lastSeed = 0; i = 0; }
    while (lastSeed + 1 < seedN) { lastSeed++; if (seedTexts.has(lastSeed)) addText(seedTexts.get(lastSeed)); }
    while (i < legos.length && (legos[i].seed_number < seedN || (legos[i].seed_number === seedN && legos[i].lego_index <= idx))) {
      const l = legos[i++]; addText(l.target_text); for (const c of l.components || []) if (c && c.target) addText(c.target);
    }
    const snap = new Set(keys); cache.set(legoId, snap); return snap;
  };
}
function untaughtNew(tw, keys, before, after) {
  const was = new Set(tw.untaughtWords(before, keys, COURSE).map((w) => w.toLowerCase()));
  return tw.untaughtWords(after, keys, COURSE).filter((w) => !was.has(w.toLowerCase()));
}

// ZUT index: known → targets, target → knowns
function zutIndex(rows) {
  const byK = new Map(), byT = new Map();
  for (const r of rows) {
    if (r.phrase_role === 'component') continue;
    const k = nk(r.known_text), t = ntStrict(r.target_text);
    if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(r.key, t);
    if (!byT.has(t)) byT.set(t, new Map()); byT.get(t).set(r.key, k);
  }
  return {
    clashes(row) {
      const k = nk(row.known_text), t = ntStrict(row.target_text), out = new Set();
      for (const [key, tt] of byK.get(k) || []) if (key !== row.key && tt !== t) out.add(`EN→2DE ${key}`);
      for (const [key, kk] of byT.get(t) || []) if (key !== row.key && kk !== k) out.add(`DE→2EN ${key}`);
      return out;
    },
  };
}

/** The plan (pure). data = { FIXES, SEED_FIXES, LEGO_FIXES } rows [id, class, [known now, target now], [known, target] | null, why]. */
function plan(db, { data = D, decomposer: dz = require('../../services/phrase-decomposer.cjs'), tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const decomposer = { decomposeAnchored: (...a) => { try { return dz.decomposeAnchored(...a); } catch (e) { return { kind: 'error', error: e.message }; } } };
  const skipped = [], notes = [];
  const livePh = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const drift = (cur, now) => cur.known_text !== now[0] || cur.target_text !== now[1];

  // 1. LEGOs (known/target text; components only when the data gives them)
  const legoNext = new Map();
  const legoBefore = new Map(db.legos.map((l) => [l.lego_id, l]));
  for (const [id, cls, now, fix, why, extra = {}] of data.LEGO_FIXES || []) {
    const l = legoBefore.get(id);
    if (!l) { skipped.push({ id, cls, why: 'drift: the LEGO is gone' }); continue; }
    if (drift(l, now)) { skipped.push({ id, cls, why: `drift: now reads "${l.known_text} | ${l.target_text}"` }); continue; }
    const set = {};
    if (fix[0] !== null && fix[0] !== l.known_text) set.known_text = fix[0];
    if (fix[1] !== null && fix[1] !== l.target_text) set.target_text = fix[1];
    if (extra.components) set.components = extra.components;
    legoNext.set(id, { before: l, set, cls, why });
  }
  const legosAfter = db.legos.map((l) => (legoNext.has(l.lego_id) ? { ...l, ...legoNext.get(l.lego_id).set } : l));
  const legoById = new Map(legosAfter.map((l) => [l.lego_id, l]));

  // 2. seeds, and their P26 copies (phrases carrying the seed's exact old pair) follow them
  const seedNext = new Map();
  const fixRows = [...(data.FIXES || [])];
  for (const [n, cls, now, fix, why] of data.SEED_FIXES || []) {
    const s = db.seeds.find((x) => x.seed_number === n);
    if (!s) { skipped.push({ id: `seed ${n}`, cls, why: 'drift: the seed is gone' }); continue; }
    if (drift(s, now)) { skipped.push({ id: `seed ${n}`, cls, why: `drift: now reads "${s.known_text} | ${s.target_text}"` }); continue; }
    const known = fix[0] ?? s.known_text, target = fix[1] ?? s.target_text;
    seedNext.set(n, { before: s, known, target, cls, why });
    for (const p of db.phrases) {
      if (p.phrase_role === 'component' || nk(p.known_text) !== nk(s.known_text) || ntStrict(p.target_text) !== ntStrict(s.target_text)) continue;
      if (fixRows.some((f) => f[0] === sid(p.id))) continue;
      fixRows.push([sid(p.id), cls, [p.known_text, p.target_text], [fix[0] === null ? null : known, fix[1] === null ? null : target], `P26 copy of seed ${n}`]);
    }
  }
  const seedsAfter = db.seeds.map((s) => (seedNext.has(s.seed_number) ? { ...s, known_text: seedNext.get(s.seed_number).known, target_text: seedNext.get(s.seed_number).target } : s));

  // 3. phrases
  const deleting = new Set(fixRows.filter((f) => f[3] === null).map((f) => f[0]));
  const proposed = new Map();
  for (const [id, cls, now, fix, why] of fixRows) {
    const p = livePh.get(id);
    if (!p) { skipped.push({ id, cls, why: 'drift: the row is gone' }); deleting.delete(id); continue; }
    if (drift(p, now)) { skipped.push({ id, cls, why: `drift: now reads "${p.known_text} | ${p.target_text}"` }); deleting.delete(id); continue; }
    if (fix === null) continue;
    proposed.set(id, { p, known: fix[0] ?? p.known_text, target: fix[1] ?? p.target_text, cls, why });
  }

  // 4. the course after the pass, for ZUT and duplicates
  const tag = (key, r, role) => ({ key, known_text: r.known_text, target_text: r.target_text, phrase_role: role });
  const beforeRows = [...db.seeds.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')), ...db.legos.map((l) => tag(l.lego_id, l, 'lego')), ...db.phrases.map((p) => tag(sid(p.id), p, p.phrase_role))];
  const afterRows = [
    ...seedsAfter.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')),
    ...legosAfter.map((l) => tag(l.lego_id, l, 'lego')),
    ...db.phrases.filter((p) => !deleting.has(sid(p.id))).map((p) => { const n = proposed.get(sid(p.id)); return tag(sid(p.id), n ? { known_text: n.known, target_text: n.target } : p, p.phrase_role); }),
  ];
  const zb = zutIndex(beforeRows), za = zutIndex(afterRows);
  const zutNew = (key, b4, af) => { const was = zb.clashes({ key, ...b4 }); const all = [...za.clashes({ key, ...af })].filter((c) => !was.has(c)); return { hard: all.filter((c) => c.startsWith('EN→2DE')), soft: all.filter((c) => c.startsWith('DE→2EN')) }; };
  const keysFor = makeTaught({ seeds: seedsAfter, legos: legosAfter }, tw);
  const vc = new Map(); const vocab = (n) => { if (!vc.has(n)) vc.set(n, legosAfter.filter((l) => l.seed_number <= n).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }))); return vc.get(n); };

  const go = [];
  for (const [id, { p, known, target, cls, why }] of [...proposed].sort((a, b) => a[0].localeCompare(b[0]))) {
    const legoId = id.slice(0, 8), lb = legoBefore.get(legoId), la = legoById.get(legoId);
    if (!la) { skipped.push({ id, cls, why: 'its LEGO is not in the course' }); continue; }
    const problems = [];
    const parent = { lego_id: la.lego_id, target_text: la.target_text, known_text: la.known_text };
    if (p.phrase_role !== 'component') {
      const heldEn = holdsInOrder(p.known_text, lb.known_text);
      const heldDe = holdsInOrder(p.target_text, lb.target_text) || decomposer.decomposeAnchored(p.target_text, vocab(la.seed_number), { ...parent, target_text: lb.target_text }, COURSE).kind !== 'error';
      if (heldEn && !holdsInOrder(known, la.known_text)) problems.push(`P17 English no longer holds "${la.known_text}"`);
      if (heldDe && !holdsInOrder(target, la.target_text) && decomposer.decomposeAnchored(target, vocab(la.seed_number), parent, COURSE).kind === 'error') problems.push(`P17 German no longer holds "${la.target_text}"`);
    }
    if (target !== p.target_text) {
      const un = untaughtNew(tw, keysFor(legoId), p.target_text, target);
      if (un.length) problems.push(`P1 untaught: ${un.join(', ')}`);
    }
    const z = zutNew(id, { known_text: p.known_text, target_text: p.target_text }, { known_text: known, target_text: target });
    if (z.hard.length) problems.push(`ZUT new clash: ${z.hard.slice(0, 4).join(' ; ')}${z.hard.length > 4 ? ` (+${z.hard.length - 4})` : ''}`);
    if (z.soft.length) notes.push({ id, why: `same German, other English (allowed): ${z.soft.slice(0, 3).join(' ; ')}` });
    // a BUILD row that says exactly its LEGO is normal (B01 usually does); only another PHRASE in the basket is a twin
    const twin = afterRows.find((r) => r.key !== id && r.key !== legoId && r.key.startsWith(legoId) && r.phrase_role !== 'component' && nk(r.known_text) === nk(known) && ntStrict(r.target_text) === ntStrict(target));
    if (twin) problems.push(`duplicate of ${twin.key}`);
    if (problems.length) { skipped.push({ id, cls, from: [p.known_text, p.target_text], to: [known, target], why: problems.join(' | ') }); continue; }
    const set = {};
    if (known !== p.known_text) set.known_text = known;
    if (target !== p.target_text) {
      set.target_text = target; set.word_count = target.length; // the column holds the target's character length
      const dec = decomposer.decomposeAnchored(target, vocab(la.seed_number), parent, COURSE);
      if (dec.kind !== 'error') set.decomposition = dec.blocks;
    }
    go.push({ id, kind: 'update', cls, why, before: p, set, sides: { known: 'known_text' in set, target: 'target_text' in set } });
  }
  for (const id of deleting) {
    const p = livePh.get(id), f = fixRows.find((x) => x[0] === id);
    const legoId = id.slice(0, 8);
    const left = db.phrases.filter((q) => sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !deleting.has(sid(q.id)));
    const use = left.filter((q) => q.phrase_role === 'use').length, build = left.filter((q) => q.phrase_role === 'build').length;
    if (p.phrase_role === 'use' && use < USE_FLOOR) { skipped.push({ id, cls: f[1], why: `floor: would leave ${use} USE under ${legoId}` }); continue; }
    if (p.phrase_role === 'build' && build < 1) { skipped.push({ id, cls: f[1], why: `floor: would leave no BUILD under ${legoId}` }); continue; }
    go.push({ id, kind: 'delete', cls: f[1], why: f[4], before: p });
  }

  // 5. seeds and LEGOs: ZUT on their own rows; a LEGO must still be held by its basket (both sides)
  const seedGo = [], legoGo = [];
  for (const [n, s] of seedNext) {
    if (s.target !== s.before.target_text) {
      const own = legosAfter.filter((l) => l.seed_number === n).map((l) => l.lego_index);
      const un = untaughtNew(tw, keysFor(`S${String(n).padStart(4, '0')}L${String(own.length ? Math.max(...own) : 0).padStart(2, '0')}`), s.before.target_text, s.target);
      if (un.length) { skipped.push({ id: `seed ${n}`, cls: s.cls, why: `P1 untaught: ${un.join(', ')}` }); continue; }
    }
    const z = zutNew(`seed ${n}`, s.before, { known_text: s.known, target_text: s.target });
    if (z.hard.length) { skipped.push({ id: `seed ${n}`, cls: s.cls, why: `ZUT new clash: ${z.hard.join(' ; ')}` }); continue; }
    seedGo.push(s);
  }
  for (const [id, l] of legoNext) {
    const la = legoById.get(id);
    const z = zutNew(id, l.before, la);
    if (z.hard.length) { skipped.push({ id, cls: l.cls, why: `ZUT new clash: ${z.hard.join(' ; ')}` }); continue; }
    const lost = [];
    for (const p of db.phrases) {
      const ps = sid(p.id); if (!ps.startsWith(id) || p.phrase_role === 'component' || deleting.has(ps)) continue;
      const g = go.find((x) => x.id === ps && x.kind === 'update');
      const k = g && g.set.known_text ? g.set.known_text : p.known_text, t = g && g.set.target_text ? g.set.target_text : p.target_text;
      // regression only: a row that held the LEGO before must still hold it (rows that never held it are not made worse)
      const lb = l.before;
      const heldBefore = holdsInOrder(p.known_text, lb.known_text) && holdsInOrder(p.target_text, lb.target_text);
      if (heldBefore && (!holdsInOrder(k, la.known_text) || !holdsInOrder(t, la.target_text))) lost.push(`${ps}: ${k} | ${t}`);
    }
    if (lost.length) { skipped.push({ id, cls: l.cls, why: `knock-on: ${lost.length} basket row(s) would not hold the new LEGO: ${lost.slice(0, 3).join(' ; ')}` }); continue; }
    legoGo.push({ id, ...l });
  }

  // 6. O5: every seed whose words change is unapproved
  const touched = new Set([...go.map((g) => g.before.seed_number), ...seedGo.map((s) => s.before.seed_number), ...legoGo.map((l) => l.before.seed_number)]);
  const unapprove = db.seeds.filter((s) => touched.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return { go, skipped, notes, seedGo, legoGo, unapprove };
}

/** Edit batches, one class at a time, BATCH ops each. A changed LEGO English unlinks its intro (the intro says the old words). */
function editBatches(p) {
  const groups = new Map(); const add = (c, op) => { if (!groups.has(c)) groups.set(c, []); groups.get(c).push(op); };
  for (const l of p.legoGo) {
    add('lego', { op: 'lego.update', lego_id: l.id, set: l.set, expect: { known_text: l.before.known_text, target_text: l.before.target_text } });
    if (l.set.known_text || l.set.target_text) add('lego', { op: 'audio.link', target: 'lego', lego_id: l.id, slot: 'presentation', audio_id: null });
  }
  for (const s of p.seedGo) {
    const set = {}; if (s.known !== s.before.known_text) set.known_text = s.known; if (s.target !== s.before.target_text) set.target_text = s.target;
    add('seed', { op: 'seed.update', seed_number: s.before.seed_number, set, expect: { known_text: s.before.known_text, target_text: s.before.target_text } });
  }
  for (const g of p.go) {
    const expect = { known_text: g.before.known_text, target_text: g.before.target_text };
    if (g.kind === 'delete') add('delete', { op: 'phrase.delete', phrase_id: pid(g.id), expect });
    else add(g.cls, { op: 'phrase.update', phrase_id: pid(g.id), set: g.set, expect });
  }
  const out = [];
  for (const [cls, ops] of groups) for (let i = 0; i < ops.length; i += BATCH) out.push({ cls, part: i / BATCH + 1, ops: ops.slice(i, i + BATCH) });
  // No before-state on approved_at: the API and the engine spell the same timestamp differently; clearing is idempotent.
  for (let i = 0; i < p.unapprove.length; i += BATCH) out.push({ cls: 'unapprove', part: i / BATCH + 1, ops: p.unapprove.slice(i, i + BATCH).map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } })) });
  return out.filter((b) => b.ops.length);
}

/** Every slot whose words changed, as (role, text) asks for the audio route's dry run, de-duplicated. */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, where) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, where: [] }); m.get(k).where.push(where); };
  const both = (t, w) => { add('target1', t, w); add('target2', t, w); };
  for (const g of p.go) if (g.kind === 'update') { if (g.sides.known) add('known', g.set.known_text, g.id); if (g.sides.target) both(g.set.target_text, g.id); }
  for (const s of p.seedGo) { if (s.known !== s.before.known_text) add('known', s.known, `seed ${s.before.seed_number}`); if (s.target !== s.before.target_text) both(s.target, `seed ${s.before.seed_number}`); }
  for (const l of p.legoGo) {
    if (l.set.known_text) add('known', l.set.known_text, l.id);
    if (l.set.target_text) both(l.set.target_text, l.id);
    // presentations mirror the LEGO (Kai): a new LEGO whose words change gets a new intro (the old one is unlinked)
    if (l.before.is_new && (l.set.known_text || l.set.target_text)) add('presentation', introLine(l.set.known_text || l.before.known_text), l.id);
  }
  return [...m.values()];
}
const introLine = (known) => `The German for: '${known}', is:`;

/** After apply: every slot of an applied fix (phrase, seed, LEGO) whose row now reads the fix's text, as (role, text) → slots. */
function renderAsks(db, data = D) {
  const m = new Map();
  const add = (role, text, target, current) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, slots: [] }); m.get(k).slots.push({ target, current }); };
  const slots = (row, fix, target) => {
    if (fix[0] !== null && row.known_text === fix[0]) add('known', row.known_text, target, row.known_audio_id);
    if (fix[1] !== null && row.target_text === fix[1]) for (const r of ['target1', 'target2']) add(r, row.target_text, target, row[`${r}_audio_id`]);
  };
  const ph = new Map(db.phrases.map((p) => [sid(p.id), p]));
  for (const [id, , , fix] of data.FIXES) { const p = ph.get(id); if (p && fix) slots(p, fix, { target: 'phrase', phrase_id: pid(id) }); }
  for (const [n, , , fix] of data.SEED_FIXES || []) {
    const s = db.seeds.find((x) => x.seed_number === n); if (!s) continue;
    slots(s, fix, { target: 'seed', seed_number: n });
    for (const p of db.phrases) if (p.phrase_role !== 'component' && !data.FIXES.some((f) => f[0] === sid(p.id)) && nk(p.known_text) === nk(s.known_text) && ntStrict(p.target_text) === ntStrict(s.target_text)) slots(p, fix, { target: 'phrase', phrase_id: p.id });
  }
  for (const [id, , , fix] of data.LEGO_FIXES || []) {
    const l = db.legos.find((x) => x.lego_id === id); if (!l) continue;
    slots(l, fix, { target: 'lego', lego_id: id });
    if (l.is_new && fix[0] !== null && l.known_text === fix[0]) {
      const k = `presentation\u0000${introLine(l.known_text)}`;
      if (!m.has(k)) m.set(k, { role: 'presentation', text: introLine(l.known_text), legoId: id, slots: [] });
      m.get(k).slots.push({ target: { target: 'lego', lego_id: id }, current: l.presentation_audio_id });
    }
  }
  return [...m.values()];
}
function existingClipOf(message) {
  const m = /already has a working clip \(([0-9a-f-]{36}) in ([^)\s]+)\)/.exec(String(message || ''));
  return m ? { audioId: m[1], voiceId: m[2] } : null;
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|apply|audio|verify <seeds.json>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `deu-435-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  if (mode === 'verify') {
    const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
    let ok = 0; const bad = [];
    for (const [id, , , fix] of D.FIXES) {
      const cur = live.get(id);
      if (fix === null) { (cur ? bad.push(`${id} still present`) : ok++); continue; }
      if (cur && (fix[0] === null || cur.known_text === fix[0]) && (fix[1] === null || cur.target_text === fix[1])) ok++; else bad.push(`${id} reads "${cur ? `${cur.known_text} | ${cur.target_text}` : 'gone'}"`);
    }
    console.log(`verify: ${ok} read as fixed, ${bad.length} not (skipped fixes show here too)`); for (const b of bad) console.log('  ', b);
    return;
  }

  const p = plan(db);
  const by = {}; for (const g of p.go) by[g.cls] = (by[g.cls] || 0) + 1;
  console.log(`plan: ${p.go.filter((g) => g.kind === 'update').length} phrase edits, ${p.go.filter((g) => g.kind === 'delete').length} deletes, ${p.seedGo.length} seeds, ${p.legoGo.length} LEGOs, ${p.unapprove.length} seeds to unapprove, ${p.skipped.length} skipped`);
  console.log('  by class:', JSON.stringify(by));
  for (const s of p.skipped) console.log('  SKIP', s.id, s.cls, '—', s.why);
  for (const n of p.notes) console.log('  NOTE', n.id, '—', n.why);
  if (mode === 'check') return console.log(save('check', p));

  if (mode === 'audio') {
    const asks = clipAsks(p);
    const log = { job: '#435', mode: 'audio-dry-run', asks: [] };
    let i = 0;
    const worker = async () => { while (i < asks.length) { const a = asks[i++];
      const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.role === 'presentation' ? { legoId: a.where[0] } : {}), purpose: PURPOSE, dryRun: true });
      log.asks.push({ role: a.role, text: a.text, where: a.where, status: d.status, body: d.body }); } };
    await Promise.all([1, 2, 3, 4].map(worker));
    const sum = { asks: asks.length, library: 0, render: 0, chars: 0, refused: 0 };
    for (const a of log.asks) {
      if (a.status === 200 && a.body.ok && a.body.source === 'library') sum.library++;
      else if (a.status === 200 && a.body.ok) { sum.render++; sum.chars += a.body.wouldSpendChars || a.text.length; }
      else sum.refused++;
    }
    log.sum = sum;
    console.log('audio dry run:', JSON.stringify(sum));
    return console.log(save('audio', log));
  }

  if (mode === 'render') {
    // Kai 2026-10-29 10:43Z: render the applied fixes if the WHOLE set fits under the day's cap — never split to fit.
    // Run after `apply`, on a FRESH seeds.json: the plan is then empty, so the asks come from the applied fixes' new text.
    const asks = renderAsks(db);
    const log = { job: '#435', mode: 'render', asks: [] };
    for (const a of asks) {
      const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE, dryRun: true });
      const existing = d.body.code === 'RERECORD_NOT_PERMITTED' ? existingClipOf(d.body.error) : null;
      log.asks.push({ ...a, dry: { status: d.status, ok: !!d.body.ok, source: existing ? 'existing-clip' : d.body.source, audioId: d.body.audioId || (existing && existing.audioId), chars: d.body.ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0, error: d.body.ok || existing ? undefined : d.body } });
    }
    const chars = log.asks.reduce((s, a) => s + a.dry.chars, 0), refused = log.asks.filter((a) => a.dry.error);
    const max = Number(process.env.MAX_CHARS);
    console.log(`render dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library' || a.dry.source === 'existing-clip').length} already owned, ${chars} chars to render, ${refused.length} refused; headroom given ${max}`);
    if (!Number.isFinite(max) || chars > max || refused.length) { console.log('STOP: nothing rendered (no MAX_CHARS, over it, or a refusal) — whole set or nothing'); return console.log(save('render-stopped', log)); }
    if (process.env.RENDER_CONFIRM === '1') for (const a of log.asks) {
      if (a.dry.source === 'library' || a.dry.source === 'existing-clip') { a.audioId = a.dry.audioId; continue; }
      const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE.replace('dry run for Kai\'s spend decision', 'render approved by Kai 10:43Z') });
      a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, chars: r.body.charsSpent, error: r.body.ok ? undefined : r.body };
      if (a.real.error) { console.log('REFUSED — no retry:', a.role, JSON.stringify(a.text), JSON.stringify(r.body).slice(0, 300)); break; }
      a.audioId = r.body.audioId;
    }
    const ops = [];
    for (const a of log.asks) if (a.audioId) for (const w of a.slots) if (w.current !== a.audioId) ops.push({ op: 'audio.link', ...w.target, slot: a.role, audio_id: a.audioId });
    log.linkOps = ops.length; log.links = [];
    for (let i = 0; i < ops.length && process.env.RENDER_CONFIRM === '1'; i += BATCH) {
      const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: ops.slice(i, i + BATCH), apply: true });
      log.links.push({ status: ap.status, event_id: ap.body.event_id, error: ap.body.error });
      console.log(`link batch ${i / BATCH + 1}: ${ap.status} event ${ap.body.event_id} ${ap.body.error || ''}`);
    }
    log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.chars) || 0), 0);
    console.log(`rendered: ${log.charsSpent} chars; ${ops.length} slot links`);
    return console.log(save('render', log));
  }

  const batches = editBatches(p);
  const log = { job: '#435', started: stamp, mode, batches: [] };
  for (const b of batches) {
    const dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops });
    const entry = { cls: b.cls, part: b.part, ops: b.ops.length, dry: { status: dry.status, error: dry.body.error, code: dry.body.code, index: dry.body.index } };
    log.batches.push(entry);
    console.log(`[${b.cls} #${b.part}] ${b.ops.length} ops — dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) { console.log('  STOP: a dry run was refused; nothing further applied'); process.exitCode = 1; break; }
    if (mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') continue;
    const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops, apply: true });
    entry.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code };
    console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    if (ap.status !== 200) { process.exitCode = 1; break; }
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, editBatches, clipAsks, zutIndex };
