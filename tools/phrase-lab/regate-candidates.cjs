#!/usr/bin/env node
/**
 * RE-GATE THE CANDIDATES ALREADY ON DISK against the gates added after they
 * were written (Tom's GO, 2026-09-27: "regenerate existing candidates that fail
 * the new gate") — stemDiversity (audit #423 (d), judged against the higher of
 * the course-wide and ±40-seed local share), questionMark and knownLowerI
 * (audit D2/D3). Pure checks over the files; no model, no database.
 *
 * A failing basket moves to <cands>-blocked/<seed>/ with its reasons in
 * <cands>-blocked/regate-log.jsonl; with no file left in the candidates tree,
 * the runner regenerates it through the full gate. The shares are computed from
 * the tree BEFORE any move, so the order baskets are checked in cannot change
 * who fails.
 *
 *   node tools/phrase-lab/regate-candidates.cjs <cands-dir> [--dry]
 */
const fs = require('fs');
const path = require('path');
const { loadCandidateStemBaskets, windowedStemShares, checkStemDiversity } = require('../phrase-gate/stem-diversity.cjs');
const { questionMarkViolations, lowerIViolations } = require('../phrase-gate/gate-check.cjs');

const cands = process.argv[2];
const dry = process.argv.includes('--dry');
const baskets = loadCandidateStemBaskets(cands);
const shareCache = new Map();
const sharesAt = (seed) => {
  const k = Math.round(seed / 5) * 5; // the window moves in 5-seed steps; plenty for a ±40 window
  if (!shareCache.has(k)) shareCache.set(k, windowedStemShares(baskets, k));
  return shareCache.get(k);
};
const blockedRoot = `${cands.replace(/\/$/, '')}-blocked`;
const tally = { baskets: baskets.length, failed: 0, stemDiversity: 0, questionMark: 0, knownLowerI: 0 };
const moves = [];
for (const b of baskets) {
  const r = b.raw;
  const reasons = [];
  const sd = checkStemDiversity({ legoKnown: r.legoKnown, build: r.build || [], use: r.use || [] }, sharesAt(b.seed));
  if (!sd.pass) { reasons.push({ gate: 'stemDiversity', within: sd.within, course: sd.course }); tally.stemDiversity += 1; }
  const q = questionMarkViolations(b.phrases);
  if (q.length) { reasons.push({ gate: 'questionMark', total: q.length }); tally.questionMark += 1; }
  const li = lowerIViolations(b.phrases);
  if (li.length) { reasons.push({ gate: 'knownLowerI', total: li.length }); tally.knownLowerI += 1; }
  if (reasons.length) { tally.failed += 1; moves.push({ b, reasons }); }
}
if (!dry) {
  for (const { b, reasons } of moves) {
    const dest = path.join(blockedRoot, path.basename(path.dirname(b.file)));
    fs.mkdirSync(dest, { recursive: true });
    fs.renameSync(b.file, path.join(dest, path.basename(b.file)));
    fs.appendFileSync(path.join(blockedRoot, 'regate-log.jsonl'), JSON.stringify({ ts: new Date().toISOString(), key: path.basename(b.file), seed: b.seed, reasons }) + '\n');
  }
}
console.log(`${dry ? 'DRY — would move' : 'moved'} ${tally.failed}/${tally.baskets} baskets · stemDiversity ${tally.stemDiversity} · questionMark ${tally.questionMark} · knownLowerI ${tally.knownLowerI}`);
