#!/usr/bin/env node
/*
 * lego-available.cjs — "could a learner at this seed have built this sentence?"
 *
 * Kai's binding rule on any repair: the fixed target must be buildable from
 * LEGOs the learner has ALREADY MET at that seed position. A correct sentence
 * made of untaught vocabulary is not an acceptable fix.
 *
 * A token counts as available at seed N if it appears in the target side of any
 * LEGO at a seed <= N, or in the target side of any practice phrase at a seed
 * <= N (the learner has produced those too). Matching is by stem so inflection
 * inside a taught paradigm does not read as untaught — flagged separately as
 * INFLECTED so a human can see the difference.
 *
 *   node lego-available.cjs <course> <seed> "<target sentence>" [--offline f]
 */
const path = require('path');
const fs = require('fs');
const { tokens } = require('./lib/text.cjs');

function stem(w) { return w.length > 5 ? w.slice(0, w.length - 2) : w; }

function buildIndex(data, seed) {
  const exact = new Map(), stems = new Map();
  const note = (map, key, where) => { if (!map.has(key)) map.set(key, where); };
  for (const l of data.legos || []) {
    if (l.seed_number > seed || !l.target_text) continue;
    for (const w of tokens(l.target_text)) { note(exact, w, 'lego s' + l.seed_number); note(stems, stem(w), 'lego s' + l.seed_number); }
  }
  for (const p of data.phrases || []) {
    if (p.seed_number > seed || !p.target_text) continue;
    for (const w of tokens(p.target_text)) { note(exact, w, 'phrase s' + p.seed_number); note(stems, stem(w), 'phrase s' + p.seed_number); }
  }
  return { exact, stems };
}

function check(data, seed, sentence) {
  const idx = buildIndex(data, seed);
  return tokens(sentence).map(w => {
    if (idx.exact.has(w)) return { w, verdict: 'TAUGHT', where: idx.exact.get(w) };
    if (idx.stems.has(stem(w))) return { w, verdict: 'INFLECTED', where: idx.stems.get(stem(w)) };
    return { w, verdict: 'UNTAUGHT', where: null };
  });
}

async function load(course, offline) {
  if (offline) return JSON.parse(fs.readFileSync(offline, 'utf8'));
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.psql') });
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const legos = await c.query('select seed_number, target_text from course_legos where course_code=$1', [course]);
  const phrases = await c.query('select seed_number, target_text from course_practice_phrases where course_code=$1', [course]);
  await c.end();
  return { legos: legos.rows, phrases: phrases.rows };
}

if (require.main === module) {
  const [course, seed, sentence] = process.argv.slice(2);
  const i = process.argv.indexOf('--offline');
  load(course, i > -1 ? process.argv[i + 1] : null).then(d => {
    const r = check(d, parseInt(seed, 10), sentence);
    for (const x of r) console.log(`${x.verdict.padEnd(9)} ${x.w}${x.where ? '  (' + x.where + ')' : ''}`);
    const bad = r.filter(x => x.verdict === 'UNTAUGHT');
    console.log(bad.length ? `\nUNTAUGHT AT s${seed}: ${bad.map(x => x.w).join(', ')}` : `\nall tokens available at s${seed}`);
  });
}
module.exports = { check, buildIndex, load };
