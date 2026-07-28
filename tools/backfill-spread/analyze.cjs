#!/usr/bin/env node
/**
 * Lego-spread analysis: find under-spread ("orphan") LEGOs — new LEGOs whose target
 * chunk rarely/never appears in practice phrases outside their own seed.
 *
 * Usage:
 *   node tools/backfill-spread/analyze.cjs <courseCode> [--max-uses N] [--min-seed N] [--max-seed N] [--cjk] [--out DIR]
 *
 * --max-uses N   list LEGOs with fewer than N outside uses (default 1 = strict orphans;
 *                use 5 for a first spread pass, 10 for a deepening pass)
 * --cjk          unspaced-script mode (jpn/zho/yue/hak/nan/tha…): containment by raw
 *                substring instead of space-padded word matching
 * --out DIR      also write targets JSON + all-knowns.txt + all-phrases.tsv for the
 *                backfill agent (see docs/course-optimization/lego-spread-backfill-playbook.md)
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const course = args[0];
if (!course) { console.error('usage: analyze.cjs <courseCode> [--max-uses N] [--min-seed N] [--max-seed N] [--cjk] [--out DIR]'); process.exit(1); }
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const MAX_USES = parseInt(opt('--max-uses', '1'), 10);
const MIN_SEED = parseInt(opt('--min-seed', '4'), 10);
const MAX_SEED = parseInt(opt('--max-seed', '99999'), 10);
const CJK = args.includes('--cjk');
const OUT = opt('--out', null);

const norm = (s) => s.toLowerCase().replace(/[?!.,،؟。、！？]/g, '').replace(/\s+/g, ' ').trim();
const contains = CJK
  ? (phrase, chunk) => norm(phrase).replace(/\s+/g, '').includes(norm(chunk).replace(/\s+/g, ''))
  : (phrase, chunk) => (' ' + norm(phrase) + ' ').includes(' ' + norm(chunk) + ' ');

(async () => {
  const phrases = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('course_practice_phrases')
      .select('seed_number, lego_index, known_text, target_text, phrase_role')
      .eq('course_code', course).range(f, f + 999);
    if (error) throw error;
    phrases.push(...data); if (data.length < 1000) break;
  }
  const legos = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, is_new')
      .eq('course_code', course).range(f, f + 999);
    if (error) throw error;
    legos.push(...data); if (data.length < 1000) break;
  }
  const nonComp = phrases.filter((p) => p.phrase_role !== 'component');
  const newLegos = legos.filter((l) => l.is_new);
  const targets = [];
  const dist = {};
  for (const l of newLegos) {
    const outside = nonComp.filter((p) => p.seed_number !== l.seed_number && contains(p.target_text, l.target_text)).length;
    const bucket = outside === 0 ? '0' : outside <= 2 ? '1-2' : outside <= 5 ? '3-5' : outside <= 9 ? '6-9' : '10+';
    dist[bucket] = (dist[bucket] || 0) + 1;
    if (outside < MAX_USES && l.seed_number >= MIN_SEED && l.seed_number <= MAX_SEED) {
      targets.push({ seed: l.seed_number, lego: l.lego_index, known: l.known_text, target: l.target_text, current_outside_uses: outside });
    }
  }
  console.log(`${course}: ${newLegos.length} new legos, ${nonComp.length} build/use phrases${CJK ? ' [cjk mode]' : ''}`);
  console.log('outside-use distribution:', JSON.stringify(dist));
  console.log(`targets (<${MAX_USES} outside uses, seeds ${MIN_SEED}-${MAX_SEED}):`, targets.length);
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${course}-targets.json`), JSON.stringify(targets, null, 1));
    fs.writeFileSync(path.join(OUT, 'all-knowns.txt'), nonComp.map((p) => norm(p.known_text)).sort().join('\n'));
    fs.writeFileSync(path.join(OUT, 'all-phrases.tsv'), phrases
      .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index)
      .map((p) => [p.seed_number, p.lego_index, p.phrase_role, p.known_text, p.target_text].join('\t')).join('\n'));
    console.log('wrote targets + dumps to', OUT);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
