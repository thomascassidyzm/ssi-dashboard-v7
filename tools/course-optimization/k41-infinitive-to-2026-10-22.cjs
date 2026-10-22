#!/usr/bin/env node
'use strict';
// tools/course-optimization/k41-infinitive-to-2026-10-22.cjs — canon K41 on five courses (job #530, Kai 22 Oct 2026).
//
// K41: a LEGO / component tile / BUILD fragment whose target is an infinitive carries "to" on the known side, so it cannot read
// as a command. NOT owed: a governor in the same unit (can/want/let/should/I'm going to …), a real imperative or finite known
// side, a gerund/noun gloss. The CANDIDATES were read by hand from live data (GET /api/production/:c/seeds); this file holds
// those decisions as data (DECISIONS) and does the mechanical part: the new text, its tile, its BUILD fragments, the knock-on
// sweep, the ZUT test, the not-new flips, the seed unapprovals, the edit-batch.
//
//   node …/k41-infinitive-to-2026-10-22.cjs plan <course> <seeds.json>      # plan + ZUT before/after, no network
//   APPLY_CONFIRM=1 node … run <course> <seeds.json>                        # edit-batch dry run, then apply
//
// Known side only. A new "to X" that already stands over a DIFFERENT target is HELD (ZUT). One that equals an earlier NEW LEGO
// on both sides makes this LEGO not-new (is_new false; phrases stay, unplayed). Edited seeds are unapproved.
const fs = require('fs');
const path = require('path');

const AGENT = 'k41-infinitive-to (job #530)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

// lego id → { known?: explicit new known (default "to " + old), comps?: explicit components override }.  HOLDS are decided
// by the ZUT test below, not listed here; `skip` lists rows read and judged NOT owed, with the reason (for the report).
const DECISIONS = require('./k41-infinitive-to-2026-10-22.data.cjs');

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"«»“”¿¡]+/g, ' ').replace(/\s+/g, ' ').trim();
const normT = (s) => norm(s).replace(/\s/g, '');
const order = (a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index;
const sid = (id) => String(id).split(':').pop();

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls || []) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases || []) phrases.push(p); }
  }
  return { seeds, legos, phrases };
}

// "to " in front of `text`, keeping a leading capital on the front ("Feel happy" → "To feel happy").
function withTo(text) {
  if (/^[A-Z]/.test(text) && !/^I\b/.test(text)) return `To ${lowerFirst(text)}`;
  return `to ${text}`;
}

// the phrase starts with the LEGO's old known (optionally after "yes, ") over a target that starts with the LEGO's target
// (optionally after "sim, "/"oui, "/"ja, "/"sí, "): a standalone infinitive unit, no governor in front of it.
function leadMatch(p, oldKnown, oldTarget) {
  const k = norm(p.known_text), ok = norm(oldKnown);
  const t = norm(p.target_text), ot = norm(oldTarget);
  const kp = /^(yes|sim|oui|ja|sí|si) /.exec(k);
  const kRest = kp ? k.slice(kp[0].length) : k;
  const tp = kp ? /^(yes|sim|oui|ja|sí|si) /.exec(t) : null;
  const tRest = tp ? t.slice(tp[0].length) : t;
  const kOk = kRest === ok || kRest.startsWith(`${ok} `);
  const tOk = tRest === ot || tRest.startsWith(`${ot} `) || tRest.startsWith(`${ot}'`);
  if (!(kOk && tOk)) return null;
  const lead = kp ? (/^(yes|sim|oui|ja|sí|si)[,.]?\s+/i.exec(p.known_text) || [''])[0] : '';
  return { lead, rest: p.known_text.slice(lead.length) };
}
const newPhraseKnown = (p, m) => `${m.lead}${withTo(m.rest)}`;

// A component tile: its known is a verb unit glossing an infinitive target → "to …"; nouns/pronouns/prepositions stay.
// `comps` of the LEGO are rewritten by `toComps`: the tile(s) whose target is an infinitive.
function toComps(components, infTarget) {
  return (components || []).map((c) => (infTarget(c.target) && !/^to /i.test(c.known) ? { ...c, known: `to ${c.known}` } : c));
}

const legoOf = (id) => /^(S\d{4}L\d{2})/.exec(sid(id))[1];

function plan(db, course, decisions = DECISIONS[course]) {
  const legos = [...db.legos].sort(order);
  const byId = Object.fromEntries(legos.map((l) => [l.lego_id, l]));
  const seedBy = Object.fromEntries(db.seeds.map((s) => [s.seed_number, s]));
  const infTarget = decisions.isInfinitiveTile || (() => false);
  const held = [], flips = [], unlisted = [], useLead = [];
  const ids = Object.keys(decisions.change).sort();

  // pass 1: new text, tiles and candidate phrases for every decided LEGO
  const cand = [];
  const claimed = new Set();
  for (const id of ids) {
    const l = byId[id]; if (!l) { held.push({ id, why: 'LEGO not found in live data' }); continue; }
    const spec = decisions.change[id] || {};
    if (/^to /i.test(l.known_text)) { held.push({ id, why: 'already carries "to"', text: `${l.known_text} | ${l.target_text}` }); continue; }
    const newKnown = spec.known || withTo(l.known_text);
    const comps = spec.comps || (l.components && l.components.length ? toComps(l.components, infTarget) : l.components);
    const c = { id, seed: l.seed_number, row: l, before: { known: l.known_text, target: l.target_text, components: l.components, is_new: l.is_new }, after: { known: newKnown, components: comps, compsChanged: JSON.stringify(comps) !== JSON.stringify(l.components), is_new: l.is_new }, phrases: [] };
    // hand-written fragment rewrites first (spec.phrases: short phrase id → new known)
    for (const [short, after] of Object.entries(spec.phrases || {})) {
      const p = db.phrases.find((q) => sid(q.id) === short); if (!p) continue;
      c.phrases.push({ kind: 'build', id: p.id, lego: id, seed: p.seed_number, before: p.known_text, after, row: p, byHand: true }); claimed.add(p.id);
    }
    for (const p of db.phrases.filter((q) => q.phrase_role === 'component' && q.seed_number === l.seed_number && q.lego_index === l.lego_index)) {
      const i = (l.components || []).findIndex((cc, k) => cc.known === p.known_text && comps[k] && comps[k].known !== cc.known);
      if (i >= 0) { c.phrases.push({ kind: 'tile', id: p.id, lego: id, seed: p.seed_number, before: p.known_text, after: comps[i].known, row: p }); claimed.add(p.id); }
    }
    for (const p of db.phrases) {
      if (p.phrase_role === 'component' || claimed.has(p.id)) continue;
      const m = leadMatch(p, l.known_text, l.target_text); if (!m) continue;
      if (p.phrase_role !== 'build') { useLead.push({ id: sid(p.id), lego: id, text: `${p.known_text} | ${p.target_text}` }); continue; }   // USE rows are whole utterances: a real imperative is legitimate
      c.phrases.push({ kind: legoOf(p.id) === id ? 'build' : 'knock-on', id: p.id, lego: id, seed: p.seed_number, before: p.known_text, after: newPhraseKnown(p, m), row: p }); claimed.add(p.id);
    }
    for (const p of db.phrases) if (legoOf(p.id) === id && p.phrase_role === 'build' && !claimed.has(p.id)) unlisted.push({ id: sid(p.id), lego: id, text: `${p.known_text} | ${p.target_text}` });
    cand.push(c);
  }
  for (const [id, why] of Object.entries(decisions.hold || {})) { const l = byId[id]; held.push({ id, why, text: l ? `${l.known_text} | ${l.target_text}` : '', seed: l && l.seed_number }); }

  // pass 2: ZUT against everything that is not itself being changed, then the not-new rule
  const changedLego = new Set(cand.map((c) => c.id)), changedPhr = new Set(cand.flatMap((c) => c.phrases.map((x) => x.id)));
  const index = new Map();
  const add = (k, t, id) => { const n = norm(k); if (!index.has(n)) index.set(n, new Map()); const m = index.get(n); const nt = normT(t); if (!m.has(nt)) m.set(nt, []); m.get(nt).push(id); };
  for (const l of legos) if (!changedLego.has(l.lego_id)) add(l.known_text, l.target_text, l.lego_id);
  for (const p of db.phrases) if (p.phrase_role !== 'component' && !changedPhr.has(p.id)) add(p.known_text, p.target_text, sid(p.id));
  const clash = (known, target) => { const m = index.get(norm(known)); return m ? [...m.entries()].filter(([t]) => t !== normT(target)) : []; };
  const kept = [];
  for (const c of cand) {
    const l = c.row;
    const other = clash(c.after.known, l.target_text);
    if (other.length) { held.push({ id: c.id, why: `ZUT: "${c.after.known}" already stands over a different target (${other.map(([t, v]) => `${v.slice(0, 3).join(',')}`).join('; ')})`, text: `${l.known_text} | ${l.target_text}`, seed: l.seed_number }); add(l.known_text, l.target_text, c.id); for (const x of c.phrases) if (x.kind !== 'tile') add(x.before, x.row.target_text, sid(x.id)); continue; }
    const later = legos.find((e) => e.lego_id !== c.id && !changedLego.has(e.lego_id) && e.is_new && norm(e.known_text) === norm(c.after.known) && normT(e.target_text) === normT(l.target_text) && order(e, l) > 0);
    if (later && l.is_new) c.laterFlip = later.lego_id;   // this LEGO becomes the first "to X | Y"; the later identical one is the duplicate and goes not-new
    add(c.after.known, l.target_text, c.id);
    const phr = [];
    for (const x of c.phrases) {
      if (x.kind === 'tile') { phr.push(x); continue; }
      const o = clash(x.after, x.row.target_text);
      if (o.length) { held.push({ id: sid(x.id), why: `ZUT: fragment "${x.after}" already stands over a different target (${o.map(([t, v]) => v.slice(0, 3).join(',')).join('; ')})`, text: `${x.before} | ${x.row.target_text}`, seed: x.seed }); add(x.before, x.row.target_text, sid(x.id)); continue; }
      add(x.after, x.row.target_text, sid(x.id)); phr.push(x);
    }
    c.phrases = phr; kept.push(c);
  }
  // not-new: the same pair (both sides) already stands as an EARLIER new LEGO, unchanged or changed
  for (const c of kept) {
    const l = c.row; if (!l.is_new) continue;
    const e = legos.find((x) => x.lego_id !== c.id && x.is_new && order(x, l) < 0 && normT(x.target_text) === normT(l.target_text) && (kept.some((k) => k.id === x.lego_id) ? norm(kept.find((k) => k.id === x.lego_id).after.known) : norm(x.known_text)) === norm(c.after.known));
    if (e) { c.after.is_new = false; c.notNew = e.lego_id; flips.push({ id: c.id, earlier: e.lego_id, text: `${c.after.known} | ${l.target_text}` }); }
  }
  // Every not-new flip (the edited LEGO itself, or a later identical LEGO this edit turns into a duplicate) must leave its seed a NEW
  // LEGO to play from; if it cannot, the owning change is held (nowhere to play the seed sentence).
  const flipEntries = [];
  for (const c of kept) { if (c.notNew) flipEntries.push({ id: c.id, owner: c.id, seed: c.seed, earlier: c.notNew }); if (c.laterFlip && !flipEntries.some((f) => f.id === c.laterFlip)) { const lg = byId[c.laterFlip]; flipEntries.push({ id: c.laterFlip, owner: c.id, seed: lg.seed_number, earlier: c.id, later: true, row: lg }); } }
  const drop = new Set();
  for (const seedN of new Set(flipEntries.map((f) => f.seed))) {
    const flipping = flipEntries.filter((f) => f.seed === seedN).map((f) => f.id);
    const remaining = legos.filter((l) => l.seed_number === seedN && l.is_new === true && !flipping.includes(l.lego_id));
    if (!remaining.length) for (const f of flipEntries.filter((x) => x.seed === seedN)) drop.add(f.owner);
  }
  for (const id of drop) { const i = kept.findIndex((k) => k.id === id); if (i < 0) continue; const c = kept[i]; kept.splice(i, 1); held.push({ id, why: 'the seed would have no new LEGO left after the not-new flip', text: `${c.before.known} | ${c.before.target}`, seed: c.seed }); }
  const flipLive = flipEntries.filter((f) => !drop.has(f.owner));
  flips.length = 0;
  for (const f of flipLive) flips.push({ id: f.id, earlier: f.earlier, later: !!f.later, text: `${(kept.find((k) => k.id === (f.later ? f.owner : f.id)) || {}).after ? kept.find((k) => k.id === (f.later ? f.owner : f.id)).after.known : ''} | ${f.later ? f.row.target_text : kept.find((k) => k.id === f.id).row.target_text}` });
  const laterFlips = flipLive.filter((f) => f.later).map((f) => ({ id: f.id, seed: f.seed, row: f.row, owner: f.owner }));
  // P26: the seed sentence, if played only under a LEGO that goes not-new, is copied as a USE row under the seed's last remaining new
  // LEGO, carrying the seed's own clips (0 characters of TTS) — the same shape ara_for_eng #513 used.
  const copies = [];
  const looseT = (t) => String(t || '').normalize('NFC').replace(/[\s.,?!¿¡;:"«»]+/g, ' ').trim().toLowerCase();
  for (const seedN of new Set(flipLive.map((f) => f.seed))) {
    const seed = seedBy[seedN]; if (!seed) continue;
    const fl = flipLive.filter((f) => f.seed === seedN).map((f) => f.id);
    const isSeedSentence = (r) => r.phrase_role !== 'component' && looseT(r.known_text) === looseT(seed.known_text) && looseT(r.target_text) === looseT(seed.target_text);
    const remaining = legos.filter((l) => l.seed_number === seedN && l.is_new === true && !fl.includes(l.lego_id));
    const under = (id) => db.phrases.filter((r) => legoOf(r.id) === id && isSeedSentence(r));
    const lost = fl.flatMap(under);
    if (!lost.length || remaining.some((l) => under(l.lego_id).length)) continue;
    const home = remaining[remaining.length - 1];
    const homeRows = db.phrases.filter((r) => legoOf(r.id) === home.lego_id);
    const nextU = 1 + Math.max(0, ...homeRows.filter((r) => /U\d+$/.test(sid(r.id))).map((r) => +sid(r.id).match(/U(\d+)$/)[1]));
    const id = `${home.lego_id}U${String(nextU).padStart(2, '0')}`;
    const src = lost[0];
    const row = { ...src, id: `${course}:${id}`, lego_index: home.lego_index, phrase_role: 'use', lego_position: 'end', position: 1 + Math.max(0, ...homeRows.map((r) => r.position || 0)), metadata: { ...(src.metadata || {}), seed_sentence_copy: true, placed_by: 'job #530 (K41: duplicate LEGO set not new)', copied_from: sid(src.id) } };
    for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'display_tiling', 'display_tiling_version']) delete row[col];
    const exactSeed = src.known_text === seed.known_text && src.target_text === seed.target_text;
    copies.push({ seed: seedN, from: lost.map((r) => sid(r.id)), to: id, row, clips: exactSeed ? { known: seed.known_audio_id, target1: seed.target1_audio_id, target2: seed.target2_audio_id } : { known: src.known_audio_id, target1: src.target1_audio_id, target2: src.target2_audio_id }, clipsFrom: exactSeed ? 'the seed' : sid(src.id) });
  }
  const changes = kept.map((c) => ({ kind: 'lego', ...c }));
  const phrases = kept.flatMap((c) => c.phrases);
  const touchedSeeds = new Set([...changes.map((c) => c.seed), ...phrases.map((p) => p.seed), ...copies.map((c) => c.seed), ...laterFlips.map((f) => f.seed)]);
  const unapprove = [...touchedSeeds].filter((n) => seedBy[n] && seedBy[n].approved_at).map((n) => ({ seed: n, was: seedBy[n].approved_at }));
  return { course, changes, flips, laterFlips, copies, held, phrases, unlisted: unlisted.filter((u) => kept.some((k) => k.id === u.lego)), useLead: useLead.filter((u) => kept.some((k) => k.id === u.lego)), unapprove, touchedSeeds: [...touchedSeeds].sort((a, b) => a - b) };
}

function editOps(p) {
  const ops = [];
  for (const c of p.changes) {
    const set = { known_text: c.after.known };
    if (c.after.compsChanged) set.components = c.after.components;
    if (c.after.is_new !== c.before.is_new) set.is_new = c.after.is_new;
    ops.push({ op: 'lego.update', lego_id: c.id, set, expect: { known_text: c.before.known, target_text: c.before.target } });
  }
  for (const f of p.laterFlips) ops.push({ op: 'lego.update', lego_id: f.id, set: { is_new: false }, expect: { is_new: true, known_text: f.row.known_text, target_text: f.row.target_text } });
  for (const x of p.phrases) {
    const set = { known_text: x.after };
    const dec = x.row.decomposition;
    if (Array.isArray(dec) && x.kind !== 'tile') {
      const lc = x.lego; const nd = dec.map((d) => (d.legoId === lc && norm(d.known).startsWith(norm(p.changes.find((c) => c.id === lc).before.known)) && !/^to /i.test(d.known) ? { ...d, known: withTo(d.known) } : d));
      if (JSON.stringify(nd) !== JSON.stringify(dec)) set.decomposition = nd;
    }
    ops.push({ op: 'phrase.update', phrase_id: x.id, set, expect: { known_text: x.before } });
  }
  for (const c of p.copies) {
    ops.push({ op: 'phrase.insert', row: c.row });
    for (const slot of ['known', 'target1', 'target2']) if (c.clips[slot]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: c.row.id, slot, audio_id: c.clips[slot] });
  }
  for (const u of p.unapprove) ops.push({ op: 'seed.update', seed_number: u.seed, set: { approved_at: null }, expect: { approved_at: new Date(u.was).toISOString() } });
  return ops;
}

function zut(db, p) {
  const audit = require('./audit-phrase-zut.cjs');
  const legos = db.legos.map((l) => ({ ...l, id: l.lego_id }));
  const chL = Object.fromEntries(p.changes.map((c) => [c.id, c]));
  const chP = Object.fromEntries(p.phrases.map((x) => [x.id, x]));
  const legos2 = legos.map((l) => (chL[l.lego_id] ? { ...l, known_text: chL[l.lego_id].after.known } : l));
  const phrases2 = db.phrases.map((x) => (chP[x.id] ? { ...x, known_text: chP[x.id].after } : x));
  const n = (r) => r.bidirectional.violationsStrict.length;
  return { before: n(audit.auditRows({ legos, phrases: db.phrases, seeds: db.seeds })), after: n(audit.auditRows({ legos: legos2, phrases: phrases2, seeds: db.seeds })) };
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function report(p, db) {
  const z = zut(db, p);
  console.log(`${p.course}: ${p.changes.length} LEGOs, ${p.phrases.filter((x) => x.kind === 'tile').length} tiles, ${p.phrases.filter((x) => x.kind !== 'tile').length} phrases (${p.phrases.filter((x) => x.kind === 'knock-on').length} knock-on), ${p.flips.length} not-new, ${p.held.length} held, ${p.unapprove.length} unapprove; ZUT strict ${z.before} → ${z.after}`);
  return z;
}

async function main() {
  const [mode, course, file] = process.argv.slice(2);
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const p = plan(db, course);
  const z = report(p, db);
  const out = path.join(process.env.CS_SCRATCH || process.cwd(), `k41-${course}-plan.json`);
  fs.writeFileSync(out, JSON.stringify({ ...p, changes: p.changes.map(({ row, ...r }) => r), phrases: p.phrases.map(({ row, ...r }) => r), zut: z }, null, 2));
  if (mode === 'plan') return;
  let ops = editOps(p);
  let prev = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops });
  // The text-change triggers re-resolve a slot to a library clip of the NEW words, or NULL it (no such clip) — and they null a
  // LEGO's presentation. A null known slot drops the row from play, so make-before-break: put the OLD clip back in the same op
  // (text is written first, audio second). The row then speaks the old words until the re-render pass; that is counted, not hidden.
  const audit = { restored: [], relinked: [], stale: [] };
  if (prev.status === 200) {
    ops = ops.map((op, i) => {
      const r = prev.body.results[i]; if (!r || !r.before || !r.after || !op.set) return op;
      const set = { ...op.set };
      for (const col of ['known_audio_id', 'presentation_audio_id']) if (r.before[col] && !r.after[col]) { set[col] = r.before[col]; audit.restored.push({ id: op.lego_id || op.phrase_id, col }); }
      return { ...op, set };
    });
    prev = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops });
    for (let i = 0; i < ops.length; i++) {
      const r = prev.body.results && prev.body.results[i]; if (!r || !r.before || !r.after || !ops[i].set || ops[i].op === 'seed.update') continue;
      const id = ops[i].lego_id || ops[i].phrase_id;
      if (r.before.known_audio_id && r.after.known_audio_id === r.before.known_audio_id) audit.stale.push(id);
      else if (r.after.known_audio_id && r.after.known_audio_id !== r.before.known_audio_id) audit.relinked.push(id);
    }
    const nulls = (prev.body.results || []).filter((r) => r.op !== 'seed.update' && r.before && r.after && r.before.known_audio_id && !r.after.known_audio_id).length;
    console.log(`audio: ${audit.stale.length} rows keep the OLD known clip (stale, need re-render), ${audit.relinked.length} re-linked to an existing clip of the new words, ${nulls} left silent; presentation restored on ${audit.restored.filter((x) => x.col === 'presentation_audio_id').length} LEGOs`);
    fs.writeFileSync(path.join(process.env.CS_SCRATCH || process.cwd(), `k41-${course}-audio.json`), JSON.stringify(audit, null, 2));
  }
  fs.writeFileSync(path.join(process.env.CS_SCRATCH || process.cwd(), `k41-${course}-dry.json`), JSON.stringify(prev.body, null, 2));
  console.log(`dry run HTTP ${prev.status} ${JSON.stringify(prev.body.error || prev.body.errors || '').slice(0, 600)}`);
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops, apply: true });
  const log = { job: '#530', at: new Date().toISOString(), zut: z, ops: ops.length, applied: { status: res.status, event: res.body.event_id, undo: res.body.undo_ops || res.body.undo, error: res.status === 200 ? undefined : res.body } };
  const f = path.join(process.env.CS_SCRATCH || process.cwd(), `k41-${course}-applied.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`APPLY HTTP ${res.status}; event ${log.applied.event}; log ${f}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, editOps, fromApi, withTo, leadMatch, newPhraseKnown };
