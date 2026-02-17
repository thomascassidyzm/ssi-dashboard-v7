const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get all new LEGOs
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components')
    .eq('course_code', 'jpn_for_eng')
    .eq('is_new', true)
    .order('seed_number').order('lego_index');

  // Get all USE phrases
  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role')
    .eq('course_code', 'jpn_for_eng')
    .eq('phrase_role', 'use');

  // Get all error flags
  const flagResp = await fetch('http://localhost:3471/api/qa/flags/jpn_for_eng');
  const flagData = await flagResp.json();
  const errorFlags = flagData.flags.filter(f => f.severity === 'error');
  const flaggedIds = new Set(errorFlags.map(f => f.phrase_id));

  // Count USE phrases per LEGO, before and after deletion
  const beforeCounts = {};
  const afterCounts = {};
  for (const p of phrases) {
    const key = `${p.seed_number}:${p.lego_index}`;
    beforeCounts[key] = (beforeCounts[key] || 0) + 1;
    if (!flaggedIds.has(p.id)) {
      afterCounts[key] = (afterCounts[key] || 0) + 1;
    }
  }

  // Find LEGOs that drop below 5 USE after deletion
  let beforeThin = 0, afterThin = 0;
  const needsBulkUp = [];

  for (const l of legos) {
    const key = `${l.seed_number}:${l.lego_index}`;
    const before = beforeCounts[key] || 0;
    const after = afterCounts[key] || 0;
    if (before < 5) beforeThin++;
    if (after < 5) {
      afterThin++;
      needsBulkUp.push({
        seed: l.seed_number,
        lego: l.lego_index,
        type: l.type,
        known: l.known_text,
        target: l.target_text,
        hasComponents: l.components && l.components.length > 0,
        useBefore: before,
        useAfter: after,
        needed: Math.max(0, 8 - after) // target 8 USE phrases
      });
    }
  }

  console.log('=== POST-DELETION IMPACT ===');
  console.log(`Error flags to delete: ${flaggedIds.size}`);
  console.log(`LEGOs < 5 USE BEFORE deletion: ${beforeThin}`);
  console.log(`LEGOs < 5 USE AFTER deletion: ${afterThin}`);
  console.log(`New phrases needed (to reach 8 each): ${needsBulkUp.reduce((s, l) => s + l.needed, 0)}`);

  console.log(`\n=== LEGOs NEEDING BULK-UP (${needsBulkUp.length}) ===`);
  for (const l of needsBulkUp) {
    const comp = l.hasComponents ? 'C' : '-';
    console.log(`  S${l.seed}L${l.lego} (${l.type}${comp}): "${l.known}" → "${l.target}" | USE: ${l.useBefore}→${l.useAfter} (need +${l.needed})`);
  }

  // Group by seed for agent batching
  const seedGroups = {};
  for (const l of needsBulkUp) {
    if (!seedGroups[l.seed]) seedGroups[l.seed] = [];
    seedGroups[l.seed].push(l);
  }
  console.log(`\nAffected seeds: ${Object.keys(seedGroups).length}`);
})();
