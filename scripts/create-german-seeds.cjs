const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createSeeds() {
  // Get seeds from spa_for_eng (17-100)
  const { data: spaSeeds, error: fetchError } = await supabase
    .from('course_seeds')
    .select('seed_number, seed_id, known_text, target_text')
    .eq('course_code', 'spa_for_eng')
    .gte('seed_number', 17)
    .lte('seed_number', 100)
    .order('seed_number');

  if (fetchError) {
    console.log('Error fetching Spanish seeds:', fetchError.message);
    return;
  }

  console.log(`Found ${spaSeeds.length} seeds from spa_for_eng (17-100)`);

  // Create German seeds from Spanish seeds
  const deuSeeds = spaSeeds.map(s => ({
    course_code: 'deu_for_eng',
    seed_number: s.seed_number,
    seed_id: `S${String(s.seed_number).padStart(4, '0')}`,
    known_text: s.known_text.replace(/Spanish/gi, 'German'),
    target_text: null, // Will be filled by LLM later
    status: 'draft'
  }));

  // Insert seeds
  const { data: inserted, error: insertError } = await supabase
    .from('course_seeds')
    .upsert(deuSeeds, { onConflict: 'course_code,seed_number' })
    .select();

  if (insertError) {
    console.log('Error inserting seeds:', insertError.message);
    return;
  }

  console.log(`Created/updated ${inserted.length} seeds for deu_for_eng`);

  // Show first few
  inserted.slice(0, 5).forEach(s => {
    console.log(`S${s.seed_number}: ${s.known_text}`);
  });
}

createSeeds();
