const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const REBUILD_COURSES = ['jpn_for_eng', 'kor_for_eng', 'deu_for_eng', 'nld_for_eng'];

async function main() {
  console.log('Resetting courses for rebuild:', REBUILD_COURSES.join(', '));
  console.log('This will DELETE all LEGOs and phrases, but KEEP seed translations.\n');

  for (const courseCode of REBUILD_COURSES) {
    // Count before
    const { count: phrasesBefore } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    const { count: legosBefore } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    const { count: seedsCount } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    console.log(`${courseCode}:`);
    console.log(`  Seeds: ${seedsCount} (KEEPING)`);
    console.log(`  LEGOs: ${legosBefore} (DELETING)`);
    console.log(`  Phrases: ${phrasesBefore} (DELETING)`);

    // Delete phrases first
    const { error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', courseCode);

    if (phrasesError) {
      console.log(`  ERROR deleting phrases: ${phrasesError.message}`);
      continue;
    }

    // Delete legos
    const { error: legosError } = await supabase
      .from('course_legos')
      .delete()
      .eq('course_code', courseCode);

    if (legosError) {
      console.log(`  ERROR deleting legos: ${legosError.message}`);
      continue;
    }

    console.log(`  ✓ Reset complete\n`);
  }

  console.log('Done. Courses ready for rebuild with new Ralph methodology.');
}

main().catch(console.error);
