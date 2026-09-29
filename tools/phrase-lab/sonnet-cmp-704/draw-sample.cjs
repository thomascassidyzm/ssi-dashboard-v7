#!/usr/bin/env node
// Job #704: draw the 100-LEGO comparison sample. Fixed seed, recorded in the output.
// Pool = every LEGO (seed >= 11) the #409 Opus 5.5 medium runs of 27-28 Sep attempted: candidates-orig (gate-loop output,
// before the naturalness revision) plus candidates-blocked files dated >= 2026-09-27 that have no orig file.
const fs = require('fs'), os = require('os'), path = require('path');
const SEED = 704;
const D = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/phrase-lab');
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(SEED);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// strata per course: [label, lo, hi, n]. Spanish has no Opus output beyond seed 221, so its late weight sits in 101-250.
const STRATA = {
  ita: [['11-100', 11, 100, 5], ['101-250', 101, 250, 8], ['251+', 251, 9999, 12]],
  fra: [['11-100', 11, 100, 5], ['101-250', 101, 250, 8], ['251+', 251, 9999, 12]],
  deu: [['11-100', 11, 100, 5], ['101-250', 101, 250, 8], ['251+', 251, 9999, 12]],
  spa: [['11-100', 11, 100, 5], ['101-250', 101, 175, 8], ['101-250', 176, 250, 12]],
};
const out = [];
for (const c of Object.keys(STRATA)) {
  const pool = new Map();
  const scan = (sub, blocked) => {
    const d = path.join(D, `${c}-v3`, sub);
    for (const sd of fs.readdirSync(d).filter((x) => /^seed-\d+$/.test(x))) {
      const s = +sd.slice(5); if (s < 11) continue;
      for (const f of fs.readdirSync(path.join(d, sd)).filter((x) => /^S\d+L\d+\.json$/.test(x))) {
        const p = path.join(d, sd, f);
        if (blocked && fs.statSync(p).mtime < new Date('2026-09-27T00:00:00Z')) continue;
        const key = f.slice(0, -5);
        if (!blocked || !pool.has(key)) pool.set(key, { course: `${c}_for_eng`, key, seed: s, lego_index: +key.slice(6), opusFile: p, opusBlocked: blocked });
      }
    }
  };
  scan('candidates-orig', false); scan('candidates-blocked', true);
  const all = [...pool.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const [label, lo, hi, n] of STRATA[c]) {
    const cand = shuffle(all.filter((x) => x.seed >= lo && x.seed <= hi));
    for (const x of cand.slice(0, n)) out.push({ ...x, band: label });
  }
}
fs.writeFileSync(path.join(__dirname, 'sample.json'), JSON.stringify({ rngSeed: SEED, generator: 'mulberry32', drawn: new Date().toISOString(), n: out.length, sample: out }, null, 1));
const by = {}; for (const x of out) { const k = `${x.course} ${x.band}`; by[k] = (by[k] || 0) + 1; }
console.log(out.length, by, 'opusBlocked', out.filter((x) => x.opusBlocked).length);
