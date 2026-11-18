#!/usr/bin/env node
'use strict';
// node ops/deu-435/notes-to-shard.cjs <dump.json> ops/deu-435/notes-201-668.tsv > ops/deu-435/shard-201-668.data.cjs
// Job #435: turns the parent's reading notes (one TSV line per verdict; current texts are NOT typed by hand) into the
// shard data format, filling the "now" texts from the dump so the apply tool's drift check compares against the real row.
//   F <id> <class> <known fix|=|DEL> <target fix|=|DEL> <why>      id = phrase id, LEGO id, or "seed N"
//   H <id> <pattern> <suggestion> <question>
const fs = require('fs');
const [dumpFile, notesFile] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const sid = (id) => String(id).split(':').pop();
const ph = new Map(d.phrases.map((p) => [sid(p.id), p]));
const lg = new Map(d.legos.map((l) => [l.lego_id, l]));
const sd = new Map(d.seeds.map((s) => [`seed ${s.seed_number}`, s]));
const row = (id) => ph.get(id) || lg.get(id) || sd.get(id);
const FIXES = [], LEGO_SEED = [], HOLDS = [];
for (const line of fs.readFileSync(notesFile, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const c = line.split('\t');
  const r = row(c[1]);
  if (!r) throw new Error(`no row for ${c[1]}`);
  const now = [r.known_text, r.target_text];
  if (c[0] === 'F') {
    const v = (x) => (x === '=' ? null : x);
    const fix = c[3] === 'DEL' ? null : [v(c[3]), v(c[4])];
    (ph.has(c[1]) ? FIXES : LEGO_SEED).push([c[1], c[2], now, fix, c[5]]);
  } else if (c[0] === 'H') {
    const seed = Number((c[1].match(/^S(\d{4})/) || c[1].match(/^seed (\d+)/))[1]);
    HOLDS.push({ seed, id: c[1], pattern: c[2], english: now[0], german: now[1], suggestion: c[3], question: c[4] });
  } else throw new Error(`bad line: ${line}`);
}
const n = { seeds: 0, legos: 0, phrases: 0 };
for (const s of d.seeds) if (s.seed_number >= 201) n.seeds++;
for (const l of d.legos) if (l.seed_number >= 201) n.legos++;
for (const p of d.phrases) if (p.seed_number >= 201) n.phrases++;
const out = `'use strict';
// deu_for_eng seeds 201-668 — the parent's own full read (job #435; the 7 readers for this range were refused by the
// fan-out cap, so the parent read every row itself). Generated from ops/deu-435/notes-201-668.tsv by notes-to-shard.cjs.
module.exports = ${JSON.stringify({ SHARD: '201-668', READ: n, FIXES, LEGO_SEED, HOLDS }, null, 1)};
`;
process.stdout.write(out);
