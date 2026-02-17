/**
 * Query fra_for_eng course data for learner journey review
 */
require('dotenv').config();
const { getClient } = require('../services/supabase-client.cjs');

async function main() {
  const supabase = getClient();
  if (!supabase) {
    console.error('Supabase not initialized');
    process.exit(1);
  }

  console.log('Querying fra_for_eng seeds 1-50...\n');

  // Get all LEGOs for seeds 1-50
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index');

  if (legosError) {
    console.error('LEGOs error:', legosError);
    process.exit(1);
  }

  // Get all practice phrases
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phrasesError) {
    console.error('Phrases error:', phrasesError);
    process.exit(1);
  }

  // Get seed info
  const { data: seeds, error: seedsError } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 50)
    .order('seed_number');

  if (seedsError) {
    console.error('Seeds error:', seedsError);
    process.exit(1);
  }

  console.log(`Found ${seeds?.length || 0} seeds`);
  console.log(`Found ${legos?.length || 0} LEGOs`);
  console.log(`Found ${phrases?.length || 0} phrases\n`);

  // Output the data as JSON for analysis
  const output = {
    seeds: seeds || [],
    legos: legos || [],
    phrases: phrases || []
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
