#!/usr/bin/env node
/**
 * Self-test for the LANDING CHECK's EXTRACTION route, run against the LIVE course.
 *
 * The route's whole claim is Tom's: "by the time you've added conmigo, after the contigo, then it
 * becomes obvious what con means and therefore it becomes legitimate." Nothing about `con` is
 * hard-coded anywhere in the check, so this asks the contrast index, given only the first 40
 * seeds of the real Spanish course, whether it arrives at `con` by itself.
 *
 * Exits non-zero if it does not. READ-ONLY.
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { extractionsFrom, toks } = require('./landing-check.cjs');

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await sb.from('course_legos')
    .select('seed_number,lego_index,known_text,target_text')
    .eq('course_code', 'spa_for_eng').lte('seed_number', 40)
    .order('seed_number').order('lego_index');
  if (error) { console.error('FAILED:', error.message); process.exit(1); }
  const chunks = data.map((l) => ({ t: toks(l.target_text), known: l.known_text }));
  const ex = extractionsFrom(chunks);
  console.log(`chunks: ${chunks.length}   tokens extracted by contrast: ${ex.size}`);
  console.log(`con: ${ex.has('con') ? 'EXTRACTED' : 'NOT extracted'}`);
  if (!ex.has('con')) { console.error('FAILED: contrast route did not reach `con`.'); process.exit(1); }
  console.log('OK — the contrast route reaches `con` unprompted.');
})();
