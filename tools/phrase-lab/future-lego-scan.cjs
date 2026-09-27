#!/usr/bin/env node
/**
 * VOCAB CENSUS OF A v3 CANDIDATE TREE — the live builder's LEGO-level check,
 * run over every candidate basket on disk.
 *
 * The rule is the one /seed/complete enforces (routes/seed-complete.cjs §3) and
 * the v3 gate now mirrors exactly (gate-check.cjs cumulativeVocab): a phrase may
 * use prior seeds (their LEGOs and sentences, as the route's loadTranslationVocab
 * builds them), the EARLIER LEGOs of its own seed, and its own LEGO — as whole
 * chunks, checked by the route's own checkVocabViolations with the seed sentence
 * as extraTexts. Nothing stricter, nothing looser.
 *
 * v3 ONLY. An earlier version of this tool also scored the LIVE course and
 * labelled its failures "future-LEGO use"; that label was wrong. Those live
 * rows fail because they re-split an earlier chunk (standalone "non", "a")
 * that the route's whole-chunk tiling does not admit — a later LEGO merely
 * happened to supply the word — and the live course was built under the
 * LEGO-level check. Live is not re-measured here (Tom, 2026-09-27).
 *
 * READ-ONLY.
 *
 *   node tools/phrase-lab/future-lego-scan.cjs ita_for_eng --cands <dir> [--json out.json]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { isChinese } = require('../../services/course-builder/lib/language-config.cjs');
const { extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { cumulativeVocab } = require('../phrase-gate/gate-check.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

async function fetchAll(sb, table, select, course) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).eq('course_code', course)
      .order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function main() {
  const course = process.argv[2];
  const cands = arg('--cands');
  const chinese = isChinese(course);
  const { supabase } = require('../../services/supabase-client.cjs');
  const [seeds, legos] = await Promise.all([
    fetchAll(supabase, 'course_seeds', 'id,seed_number,target_text', course),
    fetchAll(supabase, 'course_legos', 'id,seed_number,lego_index,type,target_text,components', course),
  ]);
  const seedText = new Map(seeds.map((s) => [s.seed_number, s.target_text]));
  const legosBySeed = new Map();
  for (const l of legos) (legosBySeed.get(l.seed_number) || legosBySeed.set(l.seed_number, []).get(l.seed_number)).push(l);

  const cand = [];
  for (const sd of fs.readdirSync(cands).filter((d) => /^seed-\d+$/.test(d))) {
    for (const f of fs.readdirSync(path.join(cands, sd)).filter((x) => x.endsWith('.json'))) {
      try { cand.push(JSON.parse(fs.readFileSync(path.join(cands, sd, f), 'utf8'))); } catch { /* mid-write */ }
    }
  }
  cand.sort((a, b) => a.seedNumber - b.seedNumber);

  // Prior-seed vocabulary exactly as loadTranslationVocab builds it (seed
  // sentences and LEGOs of every earlier seed), accumulated in one walk.
  const prior = new Set();
  let upTo = 1;
  const t = { baskets: 0, phrases: 0, failing: 0, basketsFailing: 0, examples: [] };
  for (const r of cand) {
    while (upTo < r.seedNumber) {
      if (seedText.get(upTo)) extractVocab(seedText.get(upTo), chinese).forEach((w) => prior.add(w));
      for (const l of legosBySeed.get(upTo) || []) {
        extractVocab(l.target_text, chinese).forEach((w) => prior.add(w));
        if (l.type === 'M' && l.components) for (const c of l.components) extractVocab(c.target, chinese).forEach((w) => prior.add(w));
      }
      upTo += 1;
    }
    const own = (legosBySeed.get(r.seedNumber) || []).find((l) => l.lego_index === r.legoIndex);
    const { withLego } = cumulativeVocab(prior, legosBySeed.get(r.seedNumber), r.legoIndex, r.legoTarget, own && own.type === 'M' ? own.components : null, chinese);
    const phrases = [...(r.build || []), ...(r.use || [])].filter((p) => p.target);
    const v = checkVocabViolations(phrases, withLego, course, { seedNumber: r.seedNumber, extraTexts: seedText.get(r.seedNumber) ? [seedText.get(r.seedNumber)] : [] });
    t.baskets += 1; t.phrases += phrases.length; t.failing += v.length; if (v.length) t.basketsFailing += 1;
    for (const x of v) if (t.examples.length < 30) t.examples.push({ lego: `S${String(r.seedNumber).padStart(4, '0')}L${String(r.legoIndex).padStart(2, '0')}`, ...x });
  }
  console.log(`${course} v3: ${t.failing}/${t.phrases} phrases fail the LEGO-level vocab check, in ${t.basketsFailing}/${t.baskets} baskets`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ course, candidates: cands, ...t }, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
