/**
 * Fix is_new flags on course_legos for ita_for_eng
 *
 * Problem: Multiple finalize calls caused later seeds to be marked is_new=true
 * while earlier seeds (the canonical introduction) were marked is_new=false.
 *
 * Fix: For each unique known+target pair, the LOWEST seed_number should be
 * is_new=true. All others should be is_new=false.
 *
 * Usage: node scripts/fix-is-new.cjs [--execute]
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const courseCode = args[0] || 'ita_for_eng';
const execute = process.argv.includes('--execute');

(async () => {
  console.log(`Fixing is_new flags for ${courseCode}`);
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN (add --execute to apply)'}`);
  console.log('');

  const { data, error } = await supabase.from('course_legos')
    .select('id, known_text, target_text, is_new, seed_number, lego_index')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')
    .limit(3000);

  if (error) { console.error('Error:', error.message); return; }
  console.log(`Loaded ${data.length} LEGOs`);

  // Normalise for matching: lowercase + trim only
  // Keeps accents, contractions, internal punctuation intact
  const normalise = (s) => s.trim().toLowerCase();

  // For each unique known+target (case-insensitive), find the lowest seed_number
  const canonical = new Map(); // normalised key -> { id, seed_number, lego_index }
  for (const lego of data) {
    const key = normalise(lego.known_text) + '|' + normalise(lego.target_text);
    if (!canonical.has(key) || lego.seed_number < canonical.get(key).seed_number) {
      canonical.set(key, { id: lego.id, seed_number: lego.seed_number, lego_index: lego.lego_index });
    }
  }

  // Determine what needs changing
  const setTrue = [];  // IDs that should be is_new=true but aren't
  const setFalse = []; // IDs that should be is_new=false but aren't

  for (const lego of data) {
    const key = normalise(lego.known_text) + '|' + normalise(lego.target_text);
    const canon = canonical.get(key);
    const shouldBeNew = (lego.id === canon.id);

    if (shouldBeNew && !lego.is_new) {
      setTrue.push({ id: lego.id, seed: lego.seed_number, idx: lego.lego_index, known: lego.known_text });
    } else if (!shouldBeNew && lego.is_new) {
      setFalse.push({ id: lego.id, seed: lego.seed_number, idx: lego.lego_index, known: lego.known_text,
        canonical_seed: canon.seed_number });
    }
  }

  console.log(`\nChanges needed:`);
  console.log(`  Set is_new=TRUE:  ${setTrue.length} LEGOs (wrongly marked false)`);
  console.log(`  Set is_new=FALSE: ${setFalse.length} LEGOs (wrongly marked true)`);

  if (setTrue.length > 0) {
    console.log(`\nSample is_new=false → true (first 15):`);
    setTrue.slice(0, 15).forEach(l =>
      console.log(`  S${l.seed} L${l.idx}: "${l.known}"`)
    );
  }

  if (setFalse.length > 0) {
    console.log(`\nSample is_new=true → false (first 15):`);
    setFalse.slice(0, 15).forEach(l =>
      console.log(`  S${l.seed} L${l.idx}: "${l.known}" (canonical in S${l.canonical_seed})`)
    );
  }

  // Summary stats
  const currentTrue = data.filter(l => l.is_new).length;
  const newTrue = currentTrue + setTrue.length - setFalse.length;
  console.log(`\nBefore: ${currentTrue} is_new=true, ${data.length - currentTrue} is_new=false`);
  console.log(`After:  ${newTrue} is_new=true, ${data.length - newTrue} is_new=false`);
  console.log(`Unique LEGOs: ${canonical.size}`);

  if (!execute) {
    console.log('\nDry run complete. Add --execute to apply changes.');
    return;
  }

  // Apply changes in batches
  let updated = 0;

  if (setTrue.length > 0) {
    const ids = setTrue.map(l => l.id);
    // Batch in groups of 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error: updateErr } = await supabase.from('course_legos')
        .update({ is_new: true })
        .in('id', batch);
      if (updateErr) { console.error('Error setting true:', updateErr.message); return; }
      updated += batch.length;
    }
    console.log(`\nSet ${setTrue.length} LEGOs to is_new=true`);
  }

  if (setFalse.length > 0) {
    const ids = setFalse.map(l => l.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error: updateErr } = await supabase.from('course_legos')
        .update({ is_new: false })
        .in('id', batch);
      if (updateErr) { console.error('Error setting false:', updateErr.message); return; }
      updated += batch.length;
    }
    console.log(`Set ${setFalse.length} LEGOs to is_new=false`);
  }

  console.log(`\nDone! ${updated} total updates applied.`);
})();
