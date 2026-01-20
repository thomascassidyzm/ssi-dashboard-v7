const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixSeeds() {
  const courseCode = 'nld_for_eng'

  // Get all seeds with 'nld' in known_text
  const { data: seeds, error } = await supabase
    .from('course_seeds')
    .select('id, seed_number, known_text')
    .eq('course_code', courseCode)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('Total seeds:', seeds.length)

  let fixed = 0
  for (const seed of seeds) {
    // Replace 'nld' with 'Dutch' (case-insensitive word boundary)
    const newText = seed.known_text.replace(/\bnld\b/gi, 'Dutch')

    if (newText !== seed.known_text) {
      const { error: updateErr } = await supabase
        .from('course_seeds')
        .update({ known_text: newText })
        .eq('id', seed.id)

      if (updateErr) {
        console.error('Failed to update S' + seed.seed_number + ':', updateErr.message)
      } else {
        console.log('S' + seed.seed_number + ': "' + seed.known_text + '" -> "' + newText + '"')
        fixed++
      }
    }
  }

  console.log('\nFixed', fixed, 'seeds')

  // Verify current state
  const { count: legoCount } = await supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  const { count: phraseCount } = await supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  const { count: audioCount } = await supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  const { count: seedCount } = await supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)

  console.log('\n=== nld_for_eng current state ===')
  console.log('Seeds:', seedCount)
  console.log('LEGOs:', legoCount)
  console.log('Practice phrases:', phraseCount)
  console.log('Audio records:', audioCount)
}

fixSeeds();
