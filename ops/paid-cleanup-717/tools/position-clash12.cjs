#!/usr/bin/env node
// Item 12 position-clash check + in-place fix (cs #217·AJ, 19 Nov). OFFLINE: reads changeset files, their ledgers and
// the build snapshots only — no DB, no Popty.
//
// Why: course_practice_phrases is UNIQUE (course_code, seed_number, lego_index, position). Item 12 (#914·AI), item 9
// (#960·AI/#972·AI) and item 20 (#79·AJ) were each built from the same 03:30Z copy and each gave its new row
// position = max(position on the copy) + 1. Where two of them add a row under the same LEGO they pick the same slot,
// and whichever applies second gets HTTP 409 duplicate key — which the door returns with no op index, so the applier
// stops the whole course. Specimen, night of 19 Nov: item 9's eng_for_ben:S0362L02B04 took position 11 at ~22:37Z;
// item 12's op 356 eng_for_ben:S0362L02U06 (also position 11) stopped batch 15 at 22:45Z and every course after it.
//
// Fix: every UNAPPLIED item 12 phrase.insert whose slot is held by a snapshot row with another id, or by ANY other
// paid-cleanup changeset's phrase.insert (applied or not), moves to max(every slot known for that LEGO) + 1. Only
// that row's "position" changes; the line stays where it is, so op indices — what the ledger is keyed on — are
// unchanged. An item 12 USE row (the seed sentence) belongs last in its basket, so moving it up keeps it last and
// leaves item 9's and item 20's build rows their planned slots.
//
//   node position-clash12.cjs --ledgers <worktree holding the .applied.jsonl ledgers> [--fix] [course…]
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const li = args.indexOf('--ledgers');
const ledgerRoot = li >= 0 ? args[li + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && (li < 0 || i !== li + 1));
if (!ledgerRoot) { console.error('usage: position-clash12.cjs --ledgers <worktree> [--fix] [course…]'); process.exit(2); }

const readOps = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
const key = (s, l, p) => `${s}|${l}|${p}`;
const lkey = (s, l) => `${s}|${l}`;

// Other jobs' inserts: every *.changeset.jsonl under ops/ outside item12 (item 9, item 20, item 19 …).
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.changeset.jsonl')) out.push(p);
  }
  return out;
}
const others = new Map(); // course → Map(slotKey → [{id, file}])
const otherIds = new Map(); // course → Map(phrase id → file)
for (const f of walk(path.join(L.ROOT, 'ops'))) {
  if (f.includes(`${path.sep}paid-cleanup-717${path.sep}item12${path.sep}`)) continue;
  const lines = readOps(f);
  let course;
  try { course = JSON.parse(lines[0]).course; } catch { continue; }
  for (const l of lines.slice(1)) {
    const o = JSON.parse(l);
    if (o.op !== 'phrase.insert' || !o.row || o.row.position == null) continue;
    if (!others.has(course)) others.set(course, new Map());
    const m = others.get(course), k = key(o.row.seed_number, o.row.lego_index, o.row.position);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push({ id: o.row.id, file: path.relative(L.ROOT, f) });
    if (!otherIds.has(course)) otherIds.set(course, new Map());
    otherIds.get(course).set(o.row.id, path.relative(L.ROOT, f));
  }
}

const dir = path.join(L.ITEM_DIR, 'item12');
const courses = only.length ? only : fs.readdirSync(dir).filter((c) => fs.existsSync(path.join(dir, c, 'item12.changeset.jsonl')));
const report = [];
for (const c of courses) {
  const file = path.join(dir, c, 'item12.changeset.jsonl');
  const ledger = path.join(ledgerRoot, path.relative(L.ROOT, file) + '.applied.jsonl');
  const done = new Set();
  if (fs.existsSync(ledger)) for (const l of readOps(ledger)) for (const i of JSON.parse(l).ops || []) done.add(i);
  const lines = readOps(file);
  const ops = lines.slice(1).map((l) => JSON.parse(l));
  const snap = JSON.parse(fs.readFileSync(path.join(L.SNAP, `${c}.json`), 'utf8'));
  const om = others.get(c) || new Map();
  const taken = new Map(); // lego → Set(position)
  const add = (s, l, p) => { const k = lkey(s, l); if (!taken.has(k)) taken.set(k, new Set()); taken.get(k).add(Number(p)); };
  const snapAt = new Map();
  for (const p of snap.phrases) { add(p.seed_number, p.lego_index, p.position); snapAt.set(key(p.seed_number, p.lego_index, p.position), p.id); }
  for (const k of om.keys()) { const [s, l, p] = k.split('|'); add(s, l, p); }
  for (const o of ops) if (o.op === 'phrase.insert') add(o.row.seed_number, o.row.lego_index, o.row.position);
  // Ids: a phrase id is "<course>:S0053L02U08"; a clash on it is a clash however the slot is fixed.
  const oi = otherIds.get(c) || new Map();
  const snapIds = new Set(snap.phrases.map((p) => p.id));
  const allIds = new Set([...snapIds, ...oi.keys(), ...ops.filter((o) => o.op === 'phrase.insert').map((o) => o.row.id)]);
  const nextU = (id) => {
    const stem = id.replace(/U\d+$/, 'U');
    let u = 0;
    for (const x of allIds) if (x.startsWith(stem)) { const m = x.slice(stem.length).match(/^(\d+)$/); if (m) u = Math.max(u, +m[1]); }
    const fresh = stem + String(u + 1).padStart(2, '0');
    allIds.add(fresh);
    return fresh;
  };
  const moved = [], appliedClash = [];
  ops.forEach((o, i) => {
    if (o.op !== 'phrase.insert') return;
    const r = o.row, k = key(r.seed_number, r.lego_index, r.position);
    const hits = [...(om.get(k) || [])];
    if (snapAt.has(k) && snapAt.get(k) !== r.id) hits.push({ id: snapAt.get(k), file: 'snapshot' });
    const idHit = oi.has(r.id) ? oi.get(r.id) : (snapIds.has(r.id) ? 'snapshot' : null);
    if (!hits.length && !idHit) return;
    if (done.has(i)) { appliedClash.push({ op: i, id: r.id, position: r.position, with: hits, id_clash: idHit }); return; }
    const m = { op: i, id: r.id, from: r.position, with: hits, id_clash: idHit };
    if (hits.length) {
      const t = taken.get(lkey(r.seed_number, r.lego_index));
      m.to = Math.max(...t) + 1; t.add(m.to); r.position = m.to;
    }
    if (idHit) {
      if (!/U\d+$/.test(r.id)) throw new Error(`${c} op ${i}: id ${r.id} clashes and is not a U row`);
      m.new_id = nextU(r.id); r.id = m.new_id;
      // The seed's three clips link to this row in the ops straight after it (built as one group of 4).
      for (let j = i + 1; j < ops.length && ops[j].op === 'audio.link' && ops[j].phrase_id === m.id; j++) {
        if (done.has(j)) throw new Error(`${c} op ${j}: link already in the ledger for a row being re-id'd`);
        ops[j].phrase_id = m.new_id; lines[j + 1] = JSON.stringify(ops[j]); (m.links = m.links || []).push(j);
      }
    }
    moved.push(m);
    lines[i + 1] = JSON.stringify(o);
  });
  if (fix && moved.length) fs.writeFileSync(file, lines.join('\n') + '\n');
  const pending = ops.filter((o, i) => o.op === 'phrase.insert' && !done.has(i)).length;
  report.push({ course: c, ops: ops.length, applied_or_set_aside: done.size, pending_inserts: pending, moved, applied_clash: appliedClash });
  console.log(`${c.padEnd(16)} ops ${String(ops.length).padStart(4)} ledger ${String(done.size).padStart(4)} pending inserts ${String(pending).padStart(4)}  ` +
    `${moved.length ? `${fix ? 'MOVED' : 'WOULD MOVE'} ${moved.map((m) => `op ${m.op} ${m.id.split(':')[1]}${m.to ? ` pos ${m.from}→${m.to}` : ''}${m.new_id ? ` id→${m.new_id.split(':')[1]} (+links ${(m.links || []).join(',')})` : ''} (vs ${[...m.with.map((w) => w.id.split(':')[1]), ...(m.id_clash ? [`same id in ${m.id_clash}`] : [])].join(', ')})`).join('; ')}` : 'clean'}` +
    `${appliedClash.length ? `  APPLIED ROW HOLDS ANOTHER JOB'S SLOT: ${appliedClash.map((a) => `${a.id.split(':')[1]}@${a.position} vs ${a.with.map((w) => `${w.id.split(':')[1]} (${w.file})`).join(',')}`).join('; ')}` : ''}`);
}
if (args.includes('--json')) console.log(JSON.stringify(report));
