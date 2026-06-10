#!/usr/bin/env node
/**
 * Frame-diversity audit for phrase baskets — 7th principle:
 * "Vary along the axis that carries the new distinction."
 *
 * Metric: per-LEGO USE basket, distinct plug-in signatures / phrase count.
 * A signature = the phrase with the LEGO slotted out (◇) and all pronouns
 * collapsed to Ⓟ — so subject swaps count as ONE pattern, not five.
 *
 * Usage: node scripts/audit-frame-diversity.cjs [course_code] [outfile.md]
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const COURSE = process.argv[2] || 'zho_for_eng';
const OUT = process.argv[3] || `${process.env.HOME}/Desktop/SSi-${COURSE}-frame-diversity-audit.md`;

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select, applyFilters) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await applyFilters(sb.from(table).select(select)).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const PRONOUNS = ['我们', '你们', '他们', '她们', '大家', '我', '你', '他', '她', '它'];
const PUNCT = /[？。，！、?!,.\s]/g;

// longest-first marker → frame family
const FRAMES = [
  ['什么时候', 'Q-when'], ['为什么', 'Q-why'], ['的时候', 'when-clause'], ['想知道', 'matrix-wonder'],
  ['现在', 'time'], ['今天', 'time'], ['明天', 'time'], ['昨天', 'time'], ['之后', 'time'], ['以后', 'time'],
  ['已经', 'time-already'], ['快要', 'about-to'],
  ['需要', 'modal-need'], ['应该', 'modal-should'], ['可以', 'modal-may'],
  ['觉得', 'matrix-think'], ['知道', 'matrix-know'], ['确定', 'matrix-sure'], ['希望', 'matrix-hope'],
  ['如果', 'conn-if'], ['因为', 'conn-because'], ['但是', 'conn-but'], ['所以', 'conn-so'],
  ['什么', 'Q-what'], ['谁', 'Q-who'], ['哪', 'Q-which'],
  ['想', 'modal-want'], ['要', 'modal-going'], ['会', 'modal-will'], ['能', 'modal-can'],
  ['在', 'aspect-prog'], ['了', 'aspect-le'], ['过', 'aspect-guo'],
  ['吗', 'Q-polar'], ['吧', 'sugg-ba'],
  ['才', 'adv-cai'], ['就', 'adv-jiu'], ['还', 'adv-hai'], ['都', 'adv-dou'],
  ['不', 'neg-bu'], ['没', 'neg-mei'],
];

function signature(target, lego) {
  let s = target.replace(PUNCT, '');
  const i = s.indexOf(lego);
  if (i === -1) return null;
  s = s.slice(0, i) + '◇' + s.slice(i + lego.length);
  for (const p of PRONOUNS) s = s.split(p).join('Ⓟ');
  return s;
}

function frameTags(sig) {
  let r = sig.replace(/[◇Ⓟ]/g, '');
  const tags = new Set();
  let changed = true;
  while (r.length && changed) {
    changed = false;
    for (const [m, f] of FRAMES) {
      const idx = r.indexOf(m);
      if (idx !== -1) {
        tags.add(f);
        r = r.slice(0, idx) + r.slice(idx + m.length);
        changed = true;
        break;
      }
    }
  }
  if (r.length) tags.add('lexical-content');
  if (!tags.size) tags.add('subject-only');
  return [...tags];
}

const hanLen = (s) => [...s].filter((ch) => /\p{Script=Han}/u.test(ch)).length;

(async () => {
  const legos = await fetchAll('course_legos', 'seed_number,lego_index,type,known_text,target_text,is_new',
    (q) => q.eq('course_code', COURSE));
  const phrases = await fetchAll('course_practice_phrases', 'seed_number,lego_index,phrase_role,position,known_text,target_text,status',
    (q) => q.eq('course_code', COURSE).in('phrase_role', ['build', 'use']));

  const byLego = new Map();
  for (const p of phrases) {
    const k = `${p.seed_number}:${p.lego_index}`;
    if (!byLego.has(k)) byLego.set(k, []);
    byLego.get(k).push(p);
  }

  // frame availability: first seed whose LEGO target contains the marker
  const frameDebut = {};
  for (const [m, f] of FRAMES) {
    let min = Infinity;
    for (const l of legos) if (l.seed_number < min && l.target_text.includes(m)) min = l.seed_number;
    if (min < Infinity) frameDebut[f] = Math.min(frameDebut[f] ?? Infinity, min);
  }

  const rows = [];
  const frameUsage = {};
  for (const l of legos) {
    const ph = byLego.get(`${l.seed_number}:${l.lego_index}`) || [];
    const use = ph.filter((p) => p.phrase_role === 'use');
    if (!use.length) continue;
    const sigs = new Map();
    const tagSet = new Set();
    let nakedSwaps = 0;
    for (const p of use) {
      const sig = signature(p.target_text, l.target_text);
      if (sig == null) continue;
      sigs.set(sig, (sigs.get(sig) || 0) + 1);
      const tags = frameTags(sig);
      tags.forEach((t) => { tagSet.add(t); frameUsage[t] = (frameUsage[t] || 0) + 1; });
      if (/^Ⓟ*◇Ⓟ*$/.test(sig)) nakedSwaps++;
    }
    const n = [...sigs.values()].reduce((a, b) => a + b, 0);
    if (!n) continue;
    const distinct = sigs.size;
    const dupPhrases = n - distinct;
    const unusedFrames = Object.entries(frameDebut)
      .filter(([f, d]) => d < l.seed_number && !tagSet.has(f))
      .map(([f]) => f);
    rows.push({
      seed: l.seed_number, idx: l.lego_index, type: l.type,
      target: l.target_text, known: l.known_text, len: hanLen(l.target_text),
      nUse: n, nBuild: ph.filter((p) => p.phrase_role === 'build').length,
      distinct, score: distinct / n,
      families: tagSet.size, familyScore: Math.min(1, tagSet.size / n),
      tags: [...tagSet], nakedSwaps, dupPhrases,
      topSig: [...sigs.entries()].sort((a, b) => b[1] - a[1])[0],
      unusedFrames,
    });
  }

  rows.sort((a, b) => a.score - b.score || b.nUse - a.nUse);

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const scores = rows.map((r) => r.score);
  const bands = {
    'RED  (<0.5)': rows.filter((r) => r.score < 0.5).length,
    'AMBER(0.5–0.7)': rows.filter((r) => r.score >= 0.5 && r.score < 0.7).length,
    'OK   (0.7–0.9)': rows.filter((r) => r.score >= 0.7 && r.score < 0.9).length,
    'GOOD (≥0.9)': rows.filter((r) => r.score >= 0.9).length,
  };
  const buckets = [[1, 2], [3, 4], [5, 6], [7, 99]].map(([lo, hi]) => {
    const rs = rows.filter((r) => r.len >= lo && r.len <= hi);
    return { range: `${lo}–${hi === 99 ? '+' : hi} chars`, n: rs.length, meanScore: mean(rs.map((r) => r.score)), paradigms: rs.filter((r) => r.score < 0.5).length };
  });
  const paradigmBaskets = rows.filter((r) => r.nUse >= 4 && r.distinct <= 2);

  let md = `# Frame-diversity audit — ${COURSE}\n\n`;
  md += `Principle 7: **vary along the axis that carries the new distinction.** `;
  md += `Metric: distinct plug-in signatures / USE phrases per basket (LEGO slotted out, pronouns collapsed — subject swaps = one pattern).\n\n`;
  md += `## Course-level\n\n`;
  md += `- LEGOs with USE baskets audited: **${rows.length}** (of ${legos.length} LEGOs; ${phrases.length} build+use phrases)\n`;
  md += `- Mean diversity score: **${mean(scores).toFixed(2)}** — median ${scores.slice().sort((a, b) => a - b)[Math.floor(scores.length / 2)]?.toFixed(2)}\n`;
  md += `- Pure-paradigm baskets (≥4 USE phrases, ≤2 distinct patterns): **${paradigmBaskets.length}**\n\n`;
  md += `| band | baskets |\n|---|---|\n`;
  for (const [b, n] of Object.entries(bands)) md += `| ${b} | ${n} |\n`;
  md += `\n## Mechanism check — diversity vs LEGO length\n\n| LEGO length | baskets | mean score | RED |\n|---|---|---|---|\n`;
  for (const b of buckets) md += `| ${b.range} | ${b.n} | ${b.meanScore.toFixed(2)} | ${b.paradigms} |\n`;
  md += `\n## Frame usage across all USE phrases\n\n| frame | debut seed | phrases |\n|---|---|---|\n`;
  for (const [f, n] of Object.entries(frameUsage).sort((a, b) => b[1] - a[1])) {
    md += `| ${f} | ${frameDebut[f] ?? '—'} | ${n} |\n`;
  }
  md += `\n## Worklist — worst ${Math.min(50, rows.length)} baskets\n\n`;
  md += `| seed:lego | target (known) | len | USE | distinct | score | naked swaps | dominant pattern | available-but-unused frames |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows.slice(0, 50)) {
    md += `| S${r.seed}L${r.idx} | ${r.target} (${r.known}) | ${r.len} | ${r.nUse} | ${r.distinct} | ${r.score.toFixed(2)} | ${r.nakedSwaps} | \`${r.topSig[0]}\` ×${r.topSig[1]} | ${r.unusedFrames.slice(0, 8).join(', ')} |\n`;
  }
  // second lens: frame-FAMILY monotony (unique signatures can hide one-frame baskets)
  const byFamily = rows.slice().sort((a, b) => a.familyScore - b.familyScore || b.nUse - a.nUse);
  md += `\n## Frame-family monotony — worst ${Math.min(40, byFamily.length)} (lexical variety can mask structural sameness)\n\n`;
  md += `| seed:lego | target (known) | USE | sig score | families | family score | frames used | dominant pattern |\n|---|---|---|---|---|---|---|---|\n`;
  for (const r of byFamily.slice(0, 40)) {
    md += `| S${r.seed}L${r.idx} | ${r.target} (${r.known}) | ${r.nUse} | ${r.score.toFixed(2)} | ${r.families} | ${r.familyScore.toFixed(2)} | ${r.tags.join(', ')} | \`${r.topSig[0]}\` ×${r.topSig[1]} |\n`;
  }
  const dups = rows.filter((r) => r.dupPhrases > 0).sort((a, b) => b.dupPhrases - a.dupPhrases);
  md += `\n## Duplicate-signature phrases (near-dup USE items wasting eternal SR slots)\n\n`;
  md += `| seed:lego | target (known) | USE | dup phrases | dominant pattern |\n|---|---|---|---|---|\n`;
  for (const r of dups.slice(0, 30)) {
    md += `| S${r.seed}L${r.idx} | ${r.target} (${r.known}) | ${r.nUse} | ${r.dupPhrases} | \`${r.topSig[0]}\` ×${r.topSig[1]} |\n`;
  }
  md += `\n## Best baskets (model examples)\n\n| seed:lego | target (known) | USE | distinct | frames used |\n|---|---|---|---|---|\n`;
  for (const r of rows.slice(-15).reverse()) {
    md += `| S${r.seed}L${r.idx} | ${r.target} (${r.known}) | ${r.nUse} | ${r.distinct} | ${r.tags.join(', ')} |\n`;
  }
  fs.writeFileSync(OUT, md);

  console.log(`audited ${rows.length} baskets / ${phrases.length} phrases → ${OUT}`);
  console.log(`mean sig score ${mean(scores).toFixed(2)} | mean family score ${mean(rows.map((r) => r.familyScore)).toFixed(2)} | bands ${JSON.stringify(bands)}`);
  console.log(`pure paradigms ${paradigmBaskets.length} | baskets with dup signatures ${dups.length} (${dups.reduce((a, r) => a + r.dupPhrases, 0)} dup phrases)`);
  for (const b of buckets) console.log(`len ${b.range}: n=${b.n} mean=${b.meanScore.toFixed(2)} red=${b.paradigms}`);
  console.log('\nWORST 25 by signature:');
  for (const r of rows.slice(0, 25)) {
    console.log(`S${r.seed}L${r.idx} ${r.target} (${r.known}) len=${r.len} use=${r.nUse} distinct=${r.distinct} score=${r.score.toFixed(2)} swaps=${r.nakedSwaps} top=${r.topSig[0]}×${r.topSig[1]}`);
  }
  console.log('\nWORST 25 by frame-family monotony:');
  for (const r of byFamily.slice(0, 25)) {
    console.log(`S${r.seed}L${r.idx} ${r.target} (${r.known}) use=${r.nUse} sig=${r.score.toFixed(2)} fam=${r.families} famScore=${r.familyScore.toFixed(2)} tags=[${r.tags.join(',')}] top=${r.topSig[0]}×${r.topSig[1]}`);
  }
})();
