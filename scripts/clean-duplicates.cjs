const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normalizePhrase(text) {
  if (!text) return '';
  return text.replace(/[.,!?;:]+$/, '').toLowerCase().trim();
}

async function cleanDuplicates() {
  // Get all phrases for eng_for_por seeds 1-10
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, known_text, target_text')
    .eq('course_code', 'eng_for_por')
    .lte('seed_number', 10)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (error) {
    console.error('Error fetching phrases:', error);
    return;
  }

  console.log('Found ' + phrases.length + ' total phrases in seeds 1-10');

  // Group by seed+lego and find duplicates within each group
  const groups = {};
  for (const p of phrases) {
    const key = p.seed_number + '-' + p.lego_index;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }

  const toDelete = [];

  for (const [key, legoPhrases] of Object.entries(groups)) {
    const seen = new Set();
    for (const p of legoPhrases) {
      const norm = normalizePhrase(p.target_text);
      if (seen.has(norm)) {
        toDelete.push({ id: p.id, target: p.target_text, lego: key });
      } else {
        seen.add(norm);
      }
    }
  }

  console.log('\nFound ' + toDelete.length + ' duplicate phrases to delete:');
  for (const d of toDelete.slice(0, 20)) {
    console.log('  - [' + d.lego + '] "' + d.target + '"');
  }
  if (toDelete.length > 20) console.log('  ... and ' + (toDelete.length - 20) + ' more');

  if (toDelete.length === 0) {
    console.log('No duplicates to clean!');
    return;
  }

  // Delete duplicates
  const ids = toDelete.map(d => d.id);
  const { error: delError } = await supabase
    .from('course_practice_phrases')
    .delete()
    .in('id', ids);

  if (delError) {
    console.error('Error deleting:', delError);
  } else {
    console.log('\n✓ Deleted ' + toDelete.length + ' duplicate phrases');
  }

  // Verify
  const { count } = await supabase
    .from('course_practice_phrases')
    .select('id', { count: 'exact' })
    .eq('course_code', 'eng_for_por')
    .lte('seed_number', 10);

  console.log('Remaining phrases in seeds 1-10: ' + count);
}

cleanDuplicates().catch(console.error);
