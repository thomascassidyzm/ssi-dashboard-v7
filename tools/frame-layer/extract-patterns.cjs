#!/usr/bin/env node
/**
 * Extract the canonical English pattern inventory from a course's KNOWN side.
 *
 * The known side of an eng-known course is one canonical seed set across the
 * estate, so the inventory is per-KNOWN-LANGUAGE, not per-pair. Run it on any
 * *_for_eng course and the counts should agree; --compare checks that.
 *
 * Usage:
 *   node tools/frame-layer/extract-patterns.cjs [course_code] [--json out.json] [--md out.md]
 *   node tools/frame-layer/extract-patterns.cjs --compare spa_for_eng deu_for_eng zho_for_eng
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const PATTERNS = require('./patterns.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seeds(course) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_seeds')
      .select('seed_number,known_text,target_text').eq('course_code', course)
      .order('seed_number').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function classify(rows) {
  const hits = new Map(PATTERNS.map(p => [p.id, []]));
  for (const r of rows) {
    const k = r.known_text || '';
    for (const p of PATTERNS) if (p.test(k)) hits.get(p.id).push(r.seed_number);
  }
  return hits;
}

function inventory(course, rows) {
  const hits = classify(rows);
  const list = PATTERNS.map(p => ({
    id: p.id, name: p.name, shape: p.shape,
    seed_count: hits.get(p.id).length,
    first_seed: hits.get(p.id)[0] ?? null,
    seeds: hits.get(p.id),
  })).sort((a, b) => b.seed_count - a.seed_count);
  list.forEach((p, i) => { p.rank = i + 1; });
  const unmatched = rows.filter(r => !PATTERNS.some(p => p.test(r.known_text || '')))
    .map(r => r.seed_number);
  return { course, known_language: 'eng', total_seeds: rows.length, generated: new Date().toISOString(),
           pattern_count: list.length, unmatched_seeds: unmatched, patterns: list };
}

function toMarkdown(inv) {
  const L = [];
  L.push(`# Canonical English pattern inventory (${inv.course}, known side)`);
  L.push('');
  L.push(`Computed live from \`course_seeds\` on ${inv.generated.slice(0, 10)}. ${inv.total_seeds} seeds, ${inv.pattern_count} patterns.`);
  L.push('');
  L.push('Frame convention: `[SUBJ] [OBJ] [VP] [NP] [ADJ] [CLAUSE] [WH] [TIME]` are slots; lower-case words are the frame\'s fixed lexical material; `|` alternates; `...` is free material.');
  L.push('');
  L.push('Patterns are **multi-label** — one seed can instantiate several frames — so the counts do not sum to the seed total. Rank is by attestation count: non-uniformity of attestation *is* the "most helpful patterns soonest" ordering the 2009 authors already encoded.');
  L.push('');
  L.push('| rank | id | pattern | frame shape | seeds | first | attesting seed numbers |');
  L.push('|---:|---|---|---|---:|---:|---|');
  for (const p of inv.patterns) {
    const s = p.seeds.length > 24 ? p.seeds.slice(0, 24).join(' ') + ` … (+${p.seeds.length - 24})` : p.seeds.join(' ');
    L.push(`| ${p.rank} | ${p.id} | ${p.name} | \`${p.shape}\` | ${p.seed_count} | ${p.first_seed ?? '—'} | ${s} |`);
  }
  L.push('');
  L.push(`Full seed lists for every pattern are in the machine-readable companion \`english-pattern-inventory.json\`.`);
  L.push('');
  L.push(`**Unmatched seeds (${inv.unmatched_seeds.length})** — no frame in the inventory fires on these known sides; they are the inventory's honest residue, not a claim that they are patternless: ${inv.unmatched_seeds.join(' ') || 'none'}`);
  return L.join('\n') + '\n';
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--compare') {
    const courses = args.slice(1);
    const invs = [];
    for (const c of courses) invs.push(inventory(c, await seeds(c)));
    console.log('course\ttotal\t' + PATTERNS.map(p => p.id).join('\t'));
    for (const i of invs) {
      const by = Object.fromEntries(i.patterns.map(p => [p.id, p.seed_count]));
      console.log(i.course + '\t' + i.total_seeds + '\t' + PATTERNS.map(p => by[p.id]).join('\t'));
    }
    return;
  }
  const course = args.find(a => !a.startsWith('--')) || 'spa_for_eng';
  const inv = inventory(course, await seeds(course));
  const jsonAt = args[args.indexOf('--json') + 1];
  const mdAt = args[args.indexOf('--md') + 1];
  if (args.includes('--json')) fs.writeFileSync(jsonAt, JSON.stringify(inv, null, 2));
  if (args.includes('--md')) fs.writeFileSync(mdAt, toMarkdown(inv));
  if (!args.includes('--json') && !args.includes('--md')) {
    console.log(inv.patterns.map(p => `${String(p.rank).padStart(2)} ${p.id.padEnd(4)} ${String(p.seed_count).padStart(4)}  ${p.name}`).join('\n'));
    console.log('unmatched:', inv.unmatched_seeds.length);
  }
})();
