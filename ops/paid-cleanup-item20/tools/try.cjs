#!/usr/bin/env node
// Quick taught-word probe for planners (cs #718·AI): which English words of a candidate are NOT taught by
// <seed> LEGO <idx> (same checkVocabViolations as build.cjs), and is the known/target pair already in the course?
// usage: node try.cjs <course> <S0244L01> "english one" ["english two" ...]
const L = require('./lib.cjs');
const [course, lego, ...cands] = process.argv.slice(2);
const sn = Number(lego.slice(1, 5)), li = Number(lego.slice(6, 8));
const vocab = new Set(); let seedText = '';
for (const s of L.loadLive(course)) {
  if (s.seed_number > sn) break;
  for (const l of s.legos) { if (s.seed_number === sn && l.lego_index > li) break; L.accumulate([l], vocab, L.isChinese(course)); }
  if (s.seed_number === sn) seedText = s.target_text;
}
const q = console.log; console.log = () => {};
for (const c of cands) {
  const v = L.checkVocabViolations([{ target: c }], vocab, course, { seedNumber: sn, extraTexts: [seedText] });
  q(`${v.length ? 'UNTAUGHT ' + v.map(x => x.unknown).join(',') : 'ok      '}  ${c}`);
}
