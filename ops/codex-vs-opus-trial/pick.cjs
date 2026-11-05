#!/usr/bin/env node
/**
 * Pick the trial's LEGOs: a fixed PRNG seed (438), N per course, from NEW LEGOs past the
 * phrase-count ramp (seed >= 21, where the floors are the full 4 BUILD + 5 USE) — so both
 * models face a basket with enough admitted vocabulary to build from.
 * Usage: V4_READ=script-view node pick.cjs <course> [n=5] [seed=438]  → prints "course SnnnnLnn" lines
 */
const { loadCourse } = require('../../tools/frame-layer/v4/db.cjs');
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const [course, n = 5, seed = 438] = process.argv.slice(2);
const d = loadCourse(course);
const pool = d.legos.filter(l => l.is_new !== false && l.seed_number >= 21)
  .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
const rnd = mulberry32(+seed), picked = [];
while (picked.length < +n && pool.length) picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
for (const l of picked.sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index))
  console.log(course, `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`, l.seed_number, `${l.known_text} = ${l.target_text}`);
