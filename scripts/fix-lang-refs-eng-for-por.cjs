const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixLanguageRefs() {
  // Get all eng_for_por seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'eng_for_por')
    .order('seed_number');

  console.log('Processing', seeds.length, 'seeds...');

  let updates = [];
  for (const seed of seeds) {
    let newKnown = seed.known_text;
    let newTarget = seed.target_text;

    // Replace language references
    // Portuguese -> English in target (what learner is learning)
    // português -> inglês in known (Portuguese)

    newTarget = newTarget
      .replace(/Portuguese/gi, 'English')
      .replace(/português/gi, 'inglês');

    newKnown = newKnown
      .replace(/português/gi, 'inglês')
      .replace(/Português/gi, 'Inglês')
      .replace(/Portuguese/gi, 'English');

    if (newKnown !== seed.known_text || newTarget !== seed.target_text) {
      updates.push({
        seed_number: seed.seed_number,
        old_known: seed.known_text,
        new_known: newKnown,
        old_target: seed.target_text,
        new_target: newTarget
      });
    }
  }

  console.log('Found', updates.length, 'seeds needing updates');
  console.log('\nSample updates:');
  updates.slice(0, 5).forEach(u => {
    console.log(`S${u.seed_number}:`);
    console.log(`  Known: "${u.old_known}" -> "${u.new_known}"`);
    console.log(`  Target: "${u.old_target}" -> "${u.new_target}"`);
  });

  // Apply updates
  for (const update of updates) {
    await supabase
      .from('course_seeds')
      .update({
        known_text: update.new_known,
        target_text: update.new_target
      })
      .eq('course_code', 'eng_for_por')
      .eq('seed_number', update.seed_number);
  }

  console.log('\nUpdated', updates.length, 'seeds');
}

fixLanguageRefs();
