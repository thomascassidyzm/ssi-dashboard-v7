require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: allLegos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', 'fra_for_eng')
    .order('seed_number')
    .order('lego_index');

  if (error) { console.error('Error:', error.message); return; }

  const newCount = allLegos.filter(l => l.is_new).length;
  const dupCount = allLegos.filter(l => !l.is_new).length;
  console.log(`Total LEGOs: ${allLegos.length}`);
  console.log(`is_new=true: ${newCount}`);
  console.log(`is_new=false: ${dupCount}`);

  // Check for duplicate known_text among is_new=true LEGOs
  const knownMap = new Map();
  for (const l of allLegos.filter(x => x.is_new)) {
    const key = l.known_text.toLowerCase().trim();
    if (!knownMap.has(key)) knownMap.set(key, []);
    knownMap.get(key).push({ seed: l.seed_number, idx: l.lego_index, target: l.target_text });
  }

  const dupes = [...knownMap.entries()].filter(([k, v]) => v.length > 1);
  console.log(`\nis_new LEGOs sharing same known_text: ${dupes.length} groups`);

  // Separate: same target (true dupes that should be is_new=false) vs different target (collisions)
  let sameTgt = 0, diffTgt = 0;
  dupes.forEach(([known, entries]) => {
    const targets = new Set(entries.map(e => e.target.toLowerCase().trim()));
    if (targets.size === 1) sameTgt++;
    else diffTgt++;
  });
  console.log(`  Same known + same target (should be is_new=false on 2nd+): ${sameTgt}`);
  console.log(`  Same known + diff target (ZUT collisions): ${diffTgt}`);

  // Show first 15 same-target dupes
  console.log('\n--- Same known+target but multiple is_new=true (BUG) ---');
  let shown = 0;
  dupes.forEach(([known, entries]) => {
    const targets = new Set(entries.map(e => e.target.toLowerCase().trim()));
    if (targets.size === 1 && shown < 15) {
      console.log(`  "${known}": ${entries.map(e => `S${e.seed} L${e.idx} -> "${e.target}"`).join(', ')}`);
      shown++;
    }
  });

  // Show diff-target collisions
  console.log('\n--- Same known, diff target (ZUT collisions still in DB) ---');
  shown = 0;
  dupes.forEach(([known, entries]) => {
    const targets = new Set(entries.map(e => e.target.toLowerCase().trim()));
    if (targets.size > 1 && shown < 15) {
      console.log(`  "${known}": ${entries.map(e => `S${e.seed} L${e.idx} -> "${e.target}"`).join(', ')}`);
      shown++;
    }
  });

  // Show is_new=false LEGOs
  const dupLegos = allLegos.filter(l => !l.is_new);
  console.log(`\n--- is_new=false LEGOs (${dupLegos.length} total, first 20) ---`);
  dupLegos.slice(0, 20).forEach(l => {
    console.log(`  S${l.seed_number} L${l.lego_index}: "${l.known_text}" -> "${l.target_text}"`);
  });
})();
