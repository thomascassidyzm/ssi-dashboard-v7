#!/usr/bin/env node
/**
 * Take REJECTS out of a candidates tree (Tom, 2026-09-27: vocab and futureLego
 * fails are rejects, never candidates). A basket is moved to <cands>-blocked
 * when its own record says the gate BLOCKED it (the pre-2026-09-27 runner kept
 * those beside the passing sets), or when future-lego-scan found a phrase in it
 * that uses a LEGO the learner has not met, or a form never taught as a chunk.
 * With no file left in the candidates tree, the runner regenerates it — through
 * the gate that now refuses both.
 *
 *   node tools/phrase-lab/move-rejects.cjs <cands-dir> <future-lego-scan.json> [--dry]
 */
const fs = require('fs');
const path = require('path');
const [cands, scanFile] = process.argv.slice(2);
const dry = process.argv.includes('--dry');
const scan = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
const hitKeys = new Set(scan.v3.all.examples.map((e) => e.lego));
const blockedRoot = `${cands.replace(/\/$/, '')}-blocked`;
const moved = [];
for (const sd of fs.readdirSync(cands).filter((d) => /^seed-\d+$/.test(d))) {
  for (const f of fs.readdirSync(path.join(cands, sd)).filter((x) => x.endsWith('.json'))) {
    const file = path.join(cands, sd, f);
    let r; try { r = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    const key = `S${String(r.seedNumber).padStart(4, '0')}L${String(r.legoIndex).padStart(2, '0')}`;
    const why = r.blocked ? `blocked:${(r.gate?.failingGates || []).join(',')}` : hitKeys.has(key) ? 'futureLego/untaught (scan)' : null;
    if (!why) continue;
    moved.push({ key, why });
    if (!dry) { fs.mkdirSync(path.join(blockedRoot, sd), { recursive: true }); fs.renameSync(file, path.join(blockedRoot, sd, f)); }
  }
}
if (scan.v3.all.examples.length >= 40) console.error('WARNING: scan examples are capped at 40 — re-run the scan after moving until it reports 0');
console.log(`${dry ? 'would move' : 'moved'} ${moved.length}: ${moved.map((m) => `${m.key} (${m.why})`).join('; ')}`);
