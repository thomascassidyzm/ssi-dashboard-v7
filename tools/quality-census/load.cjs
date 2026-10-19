'use strict';
// tools/quality-census/load.cjs — read one course through Popty, never through the database.
//
// WHY POPTY AND NOT SQL. Tom's hard rule (2026-10-14, job #384): no agent tool runs hand-written code against the
// shared database. Popty's own read route GET /api/production/:courseCode/seeds returns every seed with its LEGOs and
// their practice phrases nested (the course-data-service join the dashboard uses), in ~2.5 s for ita_for_eng's 13,946
// phrases. Every check in this directory is a pure function over that snapshot, so the CJK courses that timed out the
// per-seed SQL of the old P26 tool cost the same one fetch as everything else.
//
// The snapshot is flattened to { course, known_lang, target_lang, seeds, legos, phrases }. Phrases carry their owning
// LEGO's lego_id and is_new (`lego_is_new`) because the player plays a basket only under a NEW LEGO (canon P25).
const fs = require('fs');

const POPTY = process.env.POPTY_URL || 'http://localhost:3470';

function langsOf(course) {
  // <target>[_<variant>]_for_<known>[_<variant>], e.g. ita_for_eng, por_br_for_eng.
  const m = /^([a-z]{3})(?:_[a-z0-9]+)?_for_([a-z]{3})/.exec(course);
  return m ? { target_lang: m[1], known_lang: m[2] } : { target_lang: null, known_lang: null };
}

function flatten(course, body) {
  const seeds = []; const legos = []; const phrases = [];
  for (const s of body.seeds || []) {
    const { legos: ls, ...seed } = s;
    seeds.push(seed);
    for (const l of ls || []) {
      const { basket_phrases: bp, ...lego } = l;
      legos.push(lego);
      for (const p of bp || []) phrases.push({ ...p, lego_id: p.lego_id || lego.lego_id, lego_is_new: lego.is_new !== false });
    }
  }
  seeds.sort((a, b) => a.seed_number - b.seed_number);
  legos.sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  return { course, ...langsOf(course), seeds, legos, phrases };
}

async function fetchCourse(course) {
  const res = await fetch(`${POPTY}/api/production/${encodeURIComponent(course)}/seeds`, {
    headers: { 'x-agent-id': 'quality-census' },
  });
  if (!res.ok) throw new Error(`Popty GET seeds for ${course}: HTTP ${res.status}`);
  return res.json();
}

// load(course, { offline }) — offline is a saved raw /seeds body (or an already-flattened snapshot).
async function load(course, { offline, save } = {}) {
  let body;
  if (offline) body = JSON.parse(fs.readFileSync(offline, 'utf8'));
  else body = await fetchCourse(course);
  if (save) fs.writeFileSync(save, JSON.stringify(body));
  if (body.legos && body.phrases) return body;
  return flatten(course, body);
}

// Intro (presentation) text for a few LEGOs: GET /api/production/:course/presentation/:legoId, the authoritative
// course_audio row the voice speaks. A LEGO whose intro cannot be read is simply absent from the map.
async function presentations(course, legoIds) {
  const out = {};
  for (const id of legoIds) {
    try {
      const r = await fetch(`${POPTY}/api/production/${encodeURIComponent(course)}/presentation/${encodeURIComponent(id)}`, { headers: { 'x-agent-id': 'quality-census' } });
      const j = await r.json();
      if (j && j.text) out[id] = j.text;
    } catch { /* absent = unknown, never "explained" */ }
  }
  return out;
}

module.exports = { load, flatten, langsOf, presentations };
