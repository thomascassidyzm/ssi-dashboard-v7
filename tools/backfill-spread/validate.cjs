#!/usr/bin/env node
/**
 * Post-run validation for backfill-spread submissions (metadata.pipeline='backfill').
 *
 * Usage: node tools/backfill-spread/validate.cjs <courseCode> --since <ISO timestamp> [--cjk]
 *
 * Checks each backfill phrase created since the timestamp:
 *  - FORM: every target word form attested in a non-backfill phrase/seed at <= host seed
 *          (Unicode-safe tokenization; in --cjk mode this check is skipped — flag for
 *          manual/model review instead)
 *  - DUP:  normalized known_text must not duplicate any pre-existing phrase, nor another
 *          backfill phrase in the same window
 * Exit code 1 if any problem found. Read every reported line — do not skim.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2);
const course = args[0];
const since = args[args.indexOf('--since') + 1];
const CJK = args.includes('--cjk');
if (!course || !since) { console.error('usage: validate.cjs <courseCode> --since <ISO>'); process.exit(1); }

const tok = (s) => s.toLowerCase().replace(/[?!.,،؟。、！？]/g, ' ').split(/\s+/).filter(Boolean);
const normk = (s) => s.toLowerCase().replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();

(async () => {
  const phrases = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('course_practice_phrases')
      .select('id, seed_number, known_text, target_text, metadata, created_at')
      .eq('course_code', course).range(f, f + 999);
    if (error) throw error;
    phrases.push(...data); if (data.length < 1000) break;
  }
  const { data: seeds } = await sb.from('course_seeds').select('seed_number, target_text').eq('course_code', course);
  const bf = phrases.filter((r) => r.metadata?.pipeline === 'backfill' && r.created_at >= since);
  const bfIds = new Set(bf.map((b) => b.id));
  const firstSeen = new Map();
  for (const p of phrases) {
    if (bfIds.has(p.id)) continue;
    for (const w of tok(p.target_text)) if (!firstSeen.has(w) || firstSeen.get(w) > p.seed_number) firstSeen.set(w, p.seed_number);
  }
  for (const s of seeds || []) for (const w of tok(s.target_text)) if (!firstSeen.has(w) || firstSeen.get(w) > s.seed_number) firstSeen.set(w, s.seed_number);
  const seen = new Map();
  for (const p of phrases) { if (!bfIds.has(p.id)) seen.set(normk(p.known_text), p.id); }
  const inBatch = new Map();
  let bad = 0;
  for (const p of bf) {
    if (!CJK) {
      const viol = tok(p.target_text).filter((w) => !firstSeen.has(w) || firstSeen.get(w) > p.seed_number);
      if (viol.length) { bad++; console.log('FORM', p.id, '|', p.known_text, '→', p.target_text, '| unattested <=S' + p.seed_number + ':', viol.join(',')); }
    }
    const nk = normk(p.known_text);
    if (seen.has(nk)) { bad++; console.log('DUP-EXISTING', p.id, '=', seen.get(nk)); }
    if (inBatch.has(nk)) { bad++; console.log('DUP-IN-BATCH', p.id, '=', inBatch.get(nk)); }
    inBatch.set(nk, p.id);
  }
  console.log(bad ? `${bad} problems in ${bf.length} backfill phrases` : `ALL ${bf.length} backfill phrases pass${CJK ? ' (FORM check skipped in cjk mode — review manually)' : ''}`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
