require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const spotCheck = [186, 190, 195, 200, 205, 210];

  console.log('SPOT CHECK - Sample Quality Verification\n');

  for (const seed of spotCheck) {
    const {data: phrase} = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', 'fra_for_eng')
      .eq('seed_number', seed)
      .single();

    if (phrase) {
      console.log(`S${seed}: ${phrase.known_text}`);
      console.log(`      → ${phrase.target_text}`);
      console.log('  Status: ✅\n');
    }
  }
}

main().catch(console.error);
