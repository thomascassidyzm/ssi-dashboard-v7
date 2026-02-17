const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data: drafts } = await sb.from('course_seed_drafts')
    .select('seed_number, validation_status')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number');

  const draftedSeeds = new Set(drafts.map(d => d.seed_number));

  // Find missing ranges (seeds 11-300)
  const missing = [];
  for (let i = 11; i <= 300; i++) {
    if (!draftedSeeds.has(i)) missing.push(i);
  }

  // Group missing into ranges
  const ranges = [];
  let start = null, prev = null;
  for (const s of missing) {
    if (start === null) { start = s; prev = s; continue; }
    if (s === prev + 1) { prev = s; continue; }
    ranges.push(start === prev ? '' + start : start + '-' + prev);
    start = s; prev = s;
  }
  if (start !== null) ranges.push(start === prev ? '' + start : start + '-' + prev);

  console.log('Total drafted: ' + drafts.length + '/290');
  console.log('Missing: ' + missing.length + ' seeds');
  console.log('Missing ranges: ' + ranges.join(', '));

  // Show which 10-seed batches are incomplete
  console.log('\nBatch status (10-seed batches):');
  for (let batch = 11; batch <= 300; batch += 10) {
    const end = Math.min(batch + 9, 300);
    let done = 0, coll = 0;
    for (let s = batch; s <= end; s++) {
      if (draftedSeeds.has(s)) {
        done++;
        const d = drafts.find(x => x.seed_number === s);
        if (d && d.validation_status === 'collision') coll++;
      }
    }
    const total = end - batch + 1;
    if (done < total) {
      const batchMissing = [];
      for (let s = batch; s <= end; s++) {
        if (!draftedSeeds.has(s)) batchMissing.push(s);
      }
      console.log('  ' + batch + '-' + end + ': ' + done + '/' + total + (coll > 0 ? ' (' + coll + ' coll)' : '') + '  MISSING: ' + batchMissing.join(','));
    }
  }
}

main().catch(e => console.error(e.message));
