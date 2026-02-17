require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const seeds = [183, 184, 185, 199, 201, 202, 203, 204, 206, 208];

  for (const seed of seeds) {
    const {data: phrase} = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', seed)
      .single();

    if (phrase) {
      console.log(`\n=== SEED ${seed} ===`);
      console.log(`Known: ${phrase.known_text}`);
      console.log(`Target: ${phrase.target_text}`);
    }
  }
}

main().catch(console.error);
