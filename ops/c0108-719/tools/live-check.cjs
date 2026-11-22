#!/usr/bin/env node
// cs #374·AI: the C0108 night runner's two live reads, both through Popty's own read route
// (GET /api/production/<course>/script-view, the route item 9's precheck uses), run by night-run.sh at night only.
// No write to any database.
//
//   node live-check.cjs precheck <file.changeset.jsonl>
//     Kai's rule (19 Nov): an apply is a live pre-check of row + LEGO + seed; a mismatch is HELD, never forced.
//     The applier's `expect` covers the row (and the seed row itself, for seed.update). This covers the LEGO and the
//     seed under every other op: the seed's text must be the copy's OR the text this file sets (seed.update is the
//     file's LAST op, so a resumed night meets the new seed); the LEGO's text must be the copy's or what this file
//     sets; a LEGO this file inserts may be absent. A mismatch goes to the ledger as "drift" so the applier skips it.
//     Variant of ops/paid-cleanup-item9/tools/precheck-guards.cjs (which has one seed text and no inserted LEGOs).
//     Exit 0 = checked · 1 = could not read live (runner skips the course tonight).
//
//   node live-check.cjs readback <file.changeset.jsonl>
//     For every op the ledger marks "applied": does live now hold what the op set? (phrase/LEGO/seed text, inserted
//     rows present, deleted rows gone). Prints counts and mismatches; exit 0 = all match · 2 = mismatch · 1 = unreadable.
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const [mode, file] = process.argv.slice(2);
const { header, ops } = cs.read(file);
const course = header.course;
const ledgerFile = `${file}.applied.jsonl`;
const norm = (t) => String(t == null ? '' : t).normalize('NFC').trim();
const sameText = (a, b) => norm(a.known_text) === norm(b.known_text) && norm(a.target_text) === norm(b.target_text);
const seedOf = (o) => o.op === 'seed.update' ? Number(o.seed_number) : o.row ? Number(o.row.seed_number) : Number(String(o.lego_id || o.phrase_id.split(':')[1]).slice(1, 5));

async function live(nums) {
  const out = new Map();
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  for (const n of sorted) {
    const s = `S${String(n).padStart(4, '0')}`;
    const r = await fetch(`http://localhost:3470/api/production/${course}/script-view?seedStart=${s}&seedEnd=${s}`, { headers: { 'x-agent-id': 'kai-c0108-374-check' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`script-view ${course} ${s} -> HTTP ${r.status}`);
    for (const x of (await r.json()).seeds || []) out.set(x.seed_number, x);
  }
  return out;
}

async function precheck() {
  const gfile = file.replace(/\.changeset\.jsonl$/, '.guards.json');
  const { guards } = JSON.parse(fs.readFileSync(gfile, 'utf8'));
  if (guards.length !== ops.length) { console.error(`precheck: ${gfile} has ${guards.length} guards for ${ops.length} ops`); return 1; }
  const done = loadLedger(ledgerFile);
  const pending = ops.map((_, i) => i).filter((i) => !done.has(i));
  if (!pending.length) { console.log(`precheck ${header.id}: nothing pending`); return 0; }
  const L = await live(pending.map((i) => guards[i].seed_number));
  const held = [];
  for (const i of pending) {
    const g = guards[i], o = ops[i], s = L.get(g.seed_number);
    if (o.op === 'seed.update') continue;              // the door's expect checks the seed row itself
    let why = null;
    const l = s && (s.legos || []).find((x) => x.lego_id === g.lego_id);
    if (!s) why = `seed ${g.seed_number} not served`;
    else if (!g.seed.some((x) => sameText(s, x))) why = `seed ${g.seed_number} text changed since the copy: "${s.known_text} | ${s.target_text}"`;
    else if (!l && !g.inserted) why = `LEGO ${g.lego_id} not served`;
    else if (l && !g.lego.some((x) => sameText(l, x))) why = `LEGO ${g.lego_id} text changed since the copy: "${l.known_text} | ${l.target_text}"`;
    if (why) held.push({ i, why });
  }
  for (const h of held) fs.appendFileSync(ledgerFile, JSON.stringify({ at: new Date().toISOString(), status: 'drift', ops: [h.i], detail: `precheck: ${h.why}`.slice(0, 400) }) + '\n');
  console.log(`precheck ${header.id}: ${pending.length} pending, ${held.length} held${held.length ? ': ' + held.slice(0, 3).map((h) => `op ${h.i} ${h.why}`).join(' | ') : ''}`);
  return 0;
}

async function readback() {
  const done = loadLedger(ledgerFile);
  const applied = ops.map((o, i) => [o, i]).filter(([, i]) => done.get(i) === 'applied');
  const L = await live(applied.map(([o]) => seedOf(o)));
  const phr = new Map(), leg = new Map();
  for (const s of L.values()) for (const l of s.legos || []) { leg.set(l.lego_id, l); for (const p of l.phrases || []) phr.set(p.id, p); }
  const bad = [];
  for (const [o, i] of applied) {
    const want = o.set || o.row || {};
    const cmp = (row) => ['known_text', 'target_text'].every((k) => want[k] === undefined || norm(row[k]) === norm(want[k]));
    let ok;
    if (o.op === 'phrase.delete') ok = !phr.has(o.phrase_id);
    else if (o.op === 'phrase.insert') ok = phr.has(o.row.id) && cmp(phr.get(o.row.id));
    else if (o.op === 'phrase.update') ok = phr.has(o.phrase_id) && cmp(phr.get(o.phrase_id));
    else if (o.op === 'lego.update') ok = leg.has(o.lego_id) && cmp(leg.get(o.lego_id));
    else if (o.op === 'lego.insert') { const id = `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`; ok = leg.has(id) && cmp(leg.get(id)); }
    else if (o.op === 'seed.update') { const s = L.get(Number(o.seed_number)); ok = s ? cmp(s) : null; }
    if (ok === false) bad.push(i);
  }
  const unseen = applied.filter(([o]) => o.op === 'seed.update' && !L.get(Number(o.seed_number))).length;
  console.log(`readback ${header.id}: ${applied.length} applied, ${applied.length - bad.length - unseen} match live, ${bad.length} differ${bad.length ? ` (ops ${bad.join(',')})` : ''}${unseen ? `, ${unseen} seed not served by script-view (no phrases)` : ''}`);
  return bad.length ? 2 : 0;
}

(mode === 'precheck' ? precheck() : mode === 'readback' ? readback() : Promise.reject(new Error('mode: precheck | readback')))
  .then((c) => process.exit(c), (e) => { console.error(`live-check ${mode}: ${e.message}`); process.exit(1); });
