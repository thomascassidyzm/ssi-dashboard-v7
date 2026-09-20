#!/usr/bin/env node
/**
 * EARLY-STEM REUSE — the metric the v3 prompt actually exists to move.
 *
 * Tom's framing, 2026-09-20: the improvement v3 buys is not in the opening
 * seeds (hand-tweaked, marginal) but LATE in a course, where a model writing
 * phrases gets lazy — it takes a good stem it already knows works, bolts the
 * new LEGO on, and the learner meets the same handful of early-course frames
 * for the five-hundredth time. So the question a comparison has to answer is
 * not only "are the phrases well formed" (that is the QA report's five floors)
 * but "where does the vocabulary in them COME FROM".
 *
 * What this measures, per basket, for LIVE and CANDIDATE phrases alike:
 *   early_share  — of the introduced LEGOs a phrase reuses, the share first
 *                  taught in the opening seeds (default: seeds 1-30).
 *   mean_age     — mean distance, in seeds, from the basket back to the seed
 *                  where each reused LEGO was introduced. Big = old material.
 *   distinct     — distinct prior LEGOs the basket's phrases draw on at all.
 *                  A lazy set reuses a few stems; a varied set reaches wider.
 *
 * Reuse is detected on the KNOWN side by longest-match containment of each
 * introduced LEGO's known gloss, which is the same side the laziness shows on
 * and needs no Italian. It is a measurement, not a gate: nothing here passes or
 * fails anything, and the final call on a basket is Tom's ear.
 *
 * READ-ONLY. Writes nothing to any database.
 *
 *   node tools/phrase-lab/stem-reuse.cjs ita_for_eng --from 330 --to 380 \
 *     --candidates <dir-of-per-seed-dirs> [--json out.json]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** The prior LEGOs a phrase reuses: known-side containment, longest first so
 *  "I don't want" is credited once rather than as "I" + "want". */
function reused(phraseKnown, priors) {
  let hay = ` ${norm(phraseKnown)} `;
  const hits = [];
  for (const p of priors) {
    const needle = ` ${p.k} `;
    if (p.k && hay.includes(needle)) { hits.push(p); hay = hay.replace(needle, '  '); }
  }
  return hits;
}

async function main() {
  const course = process.argv[2];
  const from = +arg('--from', 1), to = +arg('--to', from);
  const candRoot = arg('--candidates');
  const jsonOut = arg('--json');
  const earlyTo = +arg('--early-to', 30);
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: legos } = await sb.from('course_legos')
    .select('seed_number,lego_index,lego_id,known_text,target_text')
    .eq('course_code', course).order('seed_number').order('lego_index');
  const all = legos.map(l => ({ ...l, k: norm(l.known_text) }))
    .sort((a, b) => b.k.length - a.k.length);

  const rows = [];
  for (let seed = from; seed <= to; seed++) {
    const own = legos.filter(l => l.seed_number === seed);
    if (!own.length) continue;
    const { data: live } = await sb.from('course_practice_phrases')
      .select('lego_index,phrase_role,known_text')
      .eq('course_code', course).eq('seed_number', seed).in('phrase_role', ['build', 'use']);
    for (const l of own) {
      const priors = all.filter(p => p.seed_number < seed);
      const sets = [];
      sets.push({ source: 'live', phrases: (live || []).filter(p => +p.lego_index === l.lego_index).map(p => p.known_text) });
      if (candRoot) {
        const f = path.join(candRoot, `seed-${String(seed).padStart(4, '0')}`, `${l.lego_id}.json`);
        if (fs.existsSync(f)) {
          const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
          sets.push({ source: 'candidate', phrases: [...(doc.build || []), ...(doc.use || [])].map(p => p.known) });
        }
      }
      for (const s of sets) {
        if (!s.phrases.length) continue;
        const hits = s.phrases.flatMap(p => reused(p, priors));
        if (!hits.length) { rows.push({ seed, lego_id: l.lego_id, source: s.source, phrases: s.phrases.length, reuses: 0 }); continue; }
        const early = hits.filter(h => h.seed_number <= earlyTo).length;
        rows.push({
          seed, lego_id: l.lego_id, lego: `${l.known_text} / ${l.target_text}`, source: s.source,
          phrases: s.phrases.length, reuses: hits.length,
          early_share: +(early / hits.length).toFixed(3),
          mean_age: +(hits.reduce((n, h) => n + (seed - h.seed_number), 0) / hits.length).toFixed(1),
          distinct: new Set(hits.map(h => h.lego_id)).size,
        });
      }
    }
  }

  // PAIRED ONLY. A live arm counted over every basket in the range and a
  // candidate arm counted over the handful that were generated are not the same
  // population, and comparing them would be the baseline-quoted-as-a-result
  // mistake in a different coat.
  const haveBoth = new Set(rows.filter(r => r.source === 'candidate').map(r => r.lego_id));
  const agg = (src) => {
    const rs = rows.filter(r => r.source === src && r.reuses && haveBoth.has(r.lego_id));
    if (!rs.length) return null;
    const mean = (f) => +(rs.reduce((n, r) => n + f(r), 0) / rs.length).toFixed(3);
    return { baskets: rs.length, early_share: mean(r => r.early_share), mean_age: mean(r => r.mean_age),
             distinct_per_basket: mean(r => r.distinct), reuses_per_phrase: mean(r => r.reuses / r.phrases) };
  };
  const summary = { course, from, to, paired_only: true, early_band: `seeds 1-${earlyTo}`, live: agg('live'), candidate: agg('candidate') };
  console.log(JSON.stringify(summary, null, 2));
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows }, null, 2)); console.log(`wrote ${jsonOut}`); }
}
main().catch(e => { console.error(e); process.exit(1); });
