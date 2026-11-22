#!/usr/bin/env node
// Round-4 measures for the README table (#992): words per line, cut-ins, overlaps, second-speaker start
// (same timing model as render-replay.cjs: 14.5 chars/s, 450 ms gap, 600 ms lead-in), laughter, moves
// kept by the judge, and a borrowed-phrasing check: any 4-word run shared with a reference text
// (pass the corpus excerpts as a file path; they are never committed, see style-corpus-structure.md).
// Usage: node measure.cjs <outKey> [referenceText]
const fs = require('fs'), path = require('path');
const [, , key, ref] = process.argv;
const run = JSON.parse(fs.readFileSync(path.join(__dirname, `out-${key}.json`), 'utf8'));
const T = run.T;
const wc = s => s.split(/\s+/).filter(Boolean).length;
const w = T.map(e => wc(e.full || e.line)).sort((a, b) => a - b);
const med = w[Math.floor(w.length / 2)];
const h = T.map(e => wc(e.line)).sort((a, b) => a - b); // as heard, after cut-offs
const medHeard = h[Math.floor(h.length / 2)];
const shown = e => e.line.length; // cut lines are already truncated in .line
const first = shown(T[0]);
const nx = T[1];
let second;
if (nx.cutIn || nx.overlap) {
  const words = [...T[0].line.matchAll(/\S+/g)];
  const back = nx.cutIn ? (words.length >= 6 ? 2 : 1) : Math.min(3, Math.max(1, words.length - 1));
  second = 600 + (words.length <= back ? 0 : words[words.length - back].index) / 14.5 * 1000;
} else second = 600 + first / 14.5 * 1000 + 450 + (T[0].line.length < 25 ? 0 : 150);
const laughs = T.flatMap(e => e.backchannels || []).filter(b => /ha|laugh/i.test(b.text)).length;
const norm = s => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
let borrowed = [];
if (ref) {
  const r = norm(fs.readFileSync(ref, 'utf8')); const grams = new Set();
  for (let i = 0; i + 4 <= r.length; i++) grams.add(r.slice(i, i + 4).join(' '));
  T.forEach((e, k) => { const t = norm(e.full || e.line); for (let i = 0; i + 4 <= t.length; i++) if (grams.has(t.slice(i, i + 4).join(' '))) borrowed.push(`${k + 1}: ${t.slice(i, i + 4).join(' ')}`); });
}
console.log(JSON.stringify({ key, lines: T.length, median: med, medianHeard: medHeard, max: w[w.length - 1], cutIns: T.filter(e => e.cutIn).length, overlaps: T.filter(e => e.overlap).length, secondStart: (second / 1000).toFixed(1) + ' s', laughs, speakers: Object.fromEntries([...new Set(T.map(e => e.speaker))].map(s => [s, T.filter(e => e.speaker === s).length])), hit: run.hit, unplaced: run.unplaced, rejected: (run.judgements || []).filter(j => !j.pass).map(j => j.move + '@' + j.turn), borrowed }, null, 1));
