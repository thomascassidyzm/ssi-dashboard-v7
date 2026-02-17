require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDraftContent(seedNumber) {
  // Get seed
  const { data: seeds, error: seedError } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', seedNumber);

  if (seedError) throw seedError;
  if (!seeds || seeds.length === 0) throw new Error(`Seed ${seedNumber} not found`);
  const seed = seeds[0];

  // Get draft LEGOs
  const { data: legos, error: legosError } = await supabase
    .from('course_seed_drafts')
    .select('*')
    .eq('course_code', 'fra_for_eng')
    .eq('seed_number', seedNumber)
    .order('lego_index');

  if (legosError) throw legosError;

  return {
    seed_number: seedNumber,
    known_text: seed.known_text,
    target_text: seed.target_text,
    legos: legos || []
  };
}

(async () => {
  try {
    const seedNum = parseInt(process.argv[2]);
    if (!seedNum) {
      console.error('Usage: node get_draft_legos.cjs SEED_NUMBER');
      process.exit(1);
    }
    const content = await getDraftContent(seedNum);
    console.log(JSON.stringify(content, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
