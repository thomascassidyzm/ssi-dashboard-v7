#!/usr/bin/env node
/**
 * EARLY-STEM REUSE — does a phrase basket keep bolting the new LEGO onto a
 * skeleton the course introduced in its first ten seeds?
 *
 * WHY THIS EXISTS. Tom, 2026-09-20: "it's later on in the course it becomes
 * increasingly useful to prevent model laziness: good stem + new LEGO, leading
 * to overuse of good stems from early in the course." A generator that has
 * found a sentence shape which always passes will keep reusing it, so the
 * learner meets seed 45's new word inside seed 3's sentence, again. That is
 * cheap to write and expensive to learn from, and nothing else in the stack
 * measures it.
 *
 * THE DEFINITION, and it is deliberately the plain one:
 *   STEM       = everything in the phrase EXCEPT the LEGO being taught — the
 *                material the phrase is built out of.
 *   EARLY STEM = stem material whose LEGO was introduced in seeds 1-10.
 *   earlyStemShare = early-stem character mass / total stem character mass.
 * Mass is characters of matched target text, not tile count, so a long chunk
 * counts for more than a one-letter preposition. A phrase with no stem at all
 * (the LEGO standing bare) contributes nothing and is counted separately.
 *
 * ONE MATCHER, BOTH ARMS — the load-bearing decision. A v3 candidate file
 * already carries a `tiles` array naming each tile's legoId, and a live row
 * sometimes carries a `decomposition` doing the same, but they were produced by
 * different machinery at different times and 10% of live ita rows carry none at
 * all. A comparison whose two arms are measured by two instruments measures the
 * instruments. So this file IGNORES both, and re-tiles EVERY phrase from both
 * arms with the same greedy longest-match tiler over the course's own
 * `course_legos` targets, restricted to the vocabulary available at that seed.
 *
 * ITS ERROR MODE, stated rather than buried: the tiler works on whitespace
 * tokens, so it cannot see inside an elision or a contraction — Italian
 * "dell'acqua", French "j'ai", German fused forms. That material lands in
 * UNMATCHED and is excluded from both numerator and denominator. It is excluded
 * from both arms by the same rule, so it biases neither, and the unmatched
 * share is reported per arm so a reader can see it is symmetric. If the two
 * arms' unmatched shares diverge, the comparison on that course is not safe.
 *
 * READ-ONLY. Writes nothing to any database.
 *
 * Usage:
 *   node tools/phrase-lab/stem-reuse.cjs ita_for_eng --candidates <dir-of-seed-dirs> [--json out.json]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const EARLY_MAX_SEED = 10;

const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[.,!?;:"“”…]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);

/**
 * Greedy longest-match tiling of a target string against an inventory of LEGO
 * targets. Returns one entry per token run: either a matched LEGO (with the
 * seed it was introduced in) or an unmatched token.
 */
function tile(targetText, inv) {
  const w = toks(targetText);
  const out = [];
  let i = 0;
  while (i < w.length) {
    let best = null;
    for (const it of inv) {
      const t = it.toks;
      if (t.length > w.length - i) continue;
      if (best && t.length <= best.toks.length) continue;
      let ok = true;
      for (let j = 0; j < t.length; j++) if (w[i + j] !== t[j]) { ok = false; break; }
      if (ok) best = it;
    }
    if (best) { out.push({ matched: true, legoId: best.legoId, seed: best.seed, text: best.toks.join(' ') }); i += best.toks.length; }
    else { out.push({ matched: false, text: w[i] }); i += 1; }
  }
  return out;
}

/** Mass accounting for one phrase, given the LEGO being taught. */
function phraseStem(targetText, inv, legoId) {
  const tiles = tile(targetText, inv);
  let early = 0, late = 0, unmatched = 0, newLego = 0;
  for (const t of tiles) {
    const m = t.text.replace(/ /g, '').length;
    if (!t.matched) { unmatched += m; continue; }
    if (t.legoId === legoId) { newLego += m; continue; }
    if (t.seed <= EARLY_MAX_SEED) early += m; else late += m;
  }
  return { tiles, early, late, unmatched, newLego, stem: early + late };
}

async function inventoryFor(course) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('lego_id,seed_number,lego_index,target_text,known_text')
      .eq('course_code', course).order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all.map((l) => ({
    legoId: l.lego_id, seed: l.seed_number, known: l.known_text,
    target: l.target_text, toks: toks(l.target_text)
  })).filter((l) => l.toks.length);
}

async function livePhrases(course, seed) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb.from('course_practice_phrases')
    .select('lego_index,phrase_role,known_text,target_text')
    .eq('course_code', course).eq('seed_number', seed).in('phrase_role', ['build', 'use']);
  if (error) throw new Error(error.message);
  return data;
}

/** One basket's numbers, from a list of {known,target} phrases. */
function basketStem(phrases, inv, legoId) {
  let early = 0, stem = 0, unmatched = 0, total = 0;
  const rows = [];
  for (const p of phrases) {
    const s = phraseStem(p.target, inv, legoId);
    early += s.early; stem += s.stem; unmatched += s.unmatched;
    total += s.early + s.late + s.unmatched + s.newLego;
    rows.push({ known: p.known, target: p.target, ...s });
  }
  return {
    phrases: phrases.length,
    earlyStemShare: stem ? +(early / stem).toFixed(3) : null,
    unmatchedShare: total ? +(unmatched / total).toFixed(3) : null,
    stemMass: stem, earlyMass: early, rows
  };
}

async function main() {
  const [course, ...rest] = process.argv.slice(2);
  const candRoot = rest[rest.indexOf('--candidates') + 1];
  const jsonOut = rest.includes('--json') ? rest[rest.indexOf('--json') + 1] : null;
  if (!course || !candRoot) {
    console.error('usage: node tools/phrase-lab/stem-reuse.cjs <course> --candidates <dir> [--json out.json]');
    process.exit(2);
  }
  const inv = await inventoryFor(course);
  const seedDirs = fs.readdirSync(candRoot).filter((d) => /^seed-\d+$/.test(d)).sort();
  const out = [];
  for (const sd of seedDirs) {
    const dir = path.join(candRoot, sd);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    if (!files.length) continue;
    const seed = +sd.split('-')[1];
    // vocabulary available at this seed — exactly what a builder here could use
    const avail = inv.filter((l) => l.seed <= seed);
    const live = await livePhrases(course, seed);
    // CHANCE BASELINE. Raw early-stem share falls for ANY builder as a course
    // grows, simply because seeds 1-10 are a shrinking slice of the vocabulary
    // on the shelf. So the number that means something is the share a builder
    // would hit by reaching into the available inventory at random — the
    // character mass of seeds 1-10 LEGOs over the character mass of all
    // available LEGOs. earlyStemShare / this is the LAZINESS INDEX: 1.0 means
    // "reaching no more for the early stuff than chance", 2.0 means "twice as
    // much early material as a blind reach would give you".
    const massOf = (ls) => ls.reduce((a, l) => a + l.toks.join('').length, 0);
    const chance = massOf(avail) ? +(massOf(avail.filter((l) => l.seed <= EARLY_MAX_SEED)) / massOf(avail)).toFixed(3) : null;
    for (const f of files) {
      const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const legoId = `S${String(seed).padStart(4, '0')}L${String(doc.legoIndex).padStart(2, '0')}`;
      const cand = [...(doc.build || []), ...(doc.use || [])].map((p) => ({ known: p.known, target: p.target }));
      const liveB = live.filter((r) => r.lego_index === doc.legoIndex)
        .map((r) => ({ known: r.known_text, target: r.target_text }));
      if (!cand.length || !liveB.length) continue;
      out.push({
        course, seed, legoIndex: doc.legoIndex, legoId,
        lego: `${doc.legoKnown} / ${doc.legoTarget}`,
        blocked: !!doc.blocked,
        chanceEarlyShare: chance,
        live: basketStem(liveB, avail, legoId),
        v3: basketStem(cand, avail, legoId)
      });
      const r = out[out.length - 1];
      const ix = (x) => (x == null || !chance ? '  -  ' : (x / chance).toFixed(2).padStart(5));
      console.log(`${legoId}  ${String(r.lego).slice(0, 28).padEnd(28)}  live ${String(r.live.earlyStemShare).padStart(5)} (n${r.live.phrases}, unm ${r.live.unmatchedShare})   v3 ${String(r.v3.earlyStemShare).padStart(5)} (n${r.v3.phrases}, unm ${r.v3.unmatchedShare})   chance ${chance}  index live ${ix(r.live.earlyStemShare)} v3 ${ix(r.v3.earlyStemShare)}`);
    }
  }
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2)); console.log(`\nwrote ${jsonOut}`); }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { tile, phraseStem, basketStem, norm, toks, EARLY_MAX_SEED };
