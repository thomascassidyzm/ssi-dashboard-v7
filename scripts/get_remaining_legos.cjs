const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const fs = require('fs');

(async () => {
  // Get all is_new LEGOs
  const { data: legos, error: e1 } = await sb
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components, is_new')
    .eq('course_code', 'deu_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  if (e1) { console.error('LEGO error:', e1); return; }
  console.log('Total is_new LEGOs:', legos.length);

  // Get LEGOs that already have phrases - need to paginate
  let allPhrases = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: batch } = await sb
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', 'deu_for_eng')
      .range(from, from + PAGE - 1);
    if (!batch || batch.length === 0) break;
    allPhrases = allPhrases.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const doneSet = new Set(allPhrases.map(p => p.seed_number + ':' + p.lego_index));

  const remaining = legos.filter(l => !doneSet.has(l.seed_number + ':' + l.lego_index));
  console.log('Already have phrases:', legos.length - remaining.length);
  console.log('Remaining LEGOs needing phrases:', remaining.length);

  // Group by seed for batching
  const bySeed = {};
  for (const l of remaining) {
    if (!bySeed[l.seed_number]) bySeed[l.seed_number] = [];
    bySeed[l.seed_number].push(l);
  }
  const seeds = Object.keys(bySeed).map(Number).sort((a, b) => a - b);
  console.log('Seeds with remaining LEGOs:', seeds.length, '(' + seeds[0] + '-' + seeds[seeds.length - 1] + ')');

  // Write full list for sub-agents
  fs.writeFileSync('/tmp/deu_remaining_legos.json', JSON.stringify(remaining, null, 2));
  console.log('Written to /tmp/deu_remaining_legos.json');

  // Show type distribution
  const types = {};
  remaining.forEach(l => { types[l.type] = (types[l.type] || 0) + 1; });
  console.log('Type distribution:', JSON.stringify(types));

  // Show sample
  console.log('\nFirst 5 remaining:');
  remaining.slice(0, 5).forEach(l => console.log(JSON.stringify({
    s: l.seed_number, i: l.lego_index, type: l.type,
    k: l.known_text, t: l.target_text,
    comps: l.components ? l.components.length : 0
  })));

  console.log('\nLast 5 remaining:');
  remaining.slice(-5).forEach(l => console.log(JSON.stringify({
    s: l.seed_number, i: l.lego_index, type: l.type,
    k: l.known_text, t: l.target_text,
    comps: l.components ? l.components.length : 0
  })));
})();
