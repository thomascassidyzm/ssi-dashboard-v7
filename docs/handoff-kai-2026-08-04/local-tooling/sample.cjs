#!/usr/bin/env node
/**
 * Quality-confirmation sampler for the deepening campaign.
 * Dumps stratified USE baskets across a course + a repetition summary, so a
 * reviewer (human or agent) can judge: broken regions? systemic defects?
 * repetitive stem+adverb baskets? deepen-ready or repair-first?
 *
 * Usage: node scripts/deepening/sample.cjs <course> [--every N] [--min-seed N] [--max-seed N] [--full-seed S]
 *   --every N     sample every Nth seed (default 25)
 *   --full-seed S dump ALL use phrases for seed S (repeatable via comma list)
 */
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const course = args[0];
if (!course) { console.error('usage: sample.cjs <course> [--every N] [--min-seed N] [--max-seed N] [--full-seed S]'); process.exit(1); }
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const EVERY = parseInt(opt('--every', '25'), 10);
const MINS = parseInt(opt('--min-seed', '1'), 10);
const MAXS = parseInt(opt('--max-seed', '99999'), 10);
const FULL = (opt('--full-seed', '') || '').split(',').filter(Boolean).map(Number);

async function pageAll(tbl, cols) {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from(tbl).select(cols).eq('course_code', course).range(f, f + 999);
    if (error) throw error;
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  const phrases = await pageAll('course_practice_phrases', 'seed_number, lego_index, known_text, target_text, phrase_role');
  const seeds = [...new Set(phrases.map((p) => p.seed_number))].sort((a, b) => a - b);
  const maxSeed = Math.max(...seeds);
  const sampleSeeds = FULL.length ? FULL
    : seeds.filter((s) => s >= MINS && s <= MAXS && (s % EVERY === 0 || s === Math.min(...seeds)));

  // Repetition metric per basket: share of USE phrases whose target is identical
  // after stripping a leading token (the "stem + rotating adverb" signature).
  const stripLead = (t) => t.trim().replace(/^[^\s]+\s+/, '');
  const byBasket = {};
  for (const p of phrases) {
    if (p.phrase_role !== 'use') continue;
    const k = `${p.seed_number}/${p.lego_index}`;
    (byBasket[k] = byBasket[k] || []).push(p);
  }
  let repeaty = 0, totalBaskets = 0;
  for (const k in byBasket) {
    const us = byBasket[k]; if (us.length < 3) continue;
    totalBaskets++;
    const tails = us.map((p) => stripLead(p.target_text));
    const top = Object.entries(tails.reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / us.length >= 0.6) repeaty++;
  }

  console.log(`### ${course} — ${seeds.length} seeds (max ${maxSeed}), ${phrases.filter((p) => p.phrase_role === 'use').length} USE phrases`);
  console.log(`REPETITION: ${repeaty}/${totalBaskets} baskets (${(100 * repeaty / (totalBaskets || 1)).toFixed(0)}%) are >=60% one target-tail with rotating lead-in`);
  console.log(`Sampling seeds: ${sampleSeeds.join(', ')}\n`);

  for (const s of sampleSeeds) {
    const rows = phrases.filter((p) => p.seed_number === s && p.phrase_role === 'use').sort((a, b) => a.lego_index - b.lego_index);
    if (!rows.length) continue;
    console.log(`== S${s} (${rows.length} USE) ==`);
    for (const p of rows) console.log(`  ${p.known_text}  =>  ${p.target_text}`);
    console.log('');
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
