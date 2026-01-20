/**
 * Reset Dutch course for regeneration
 * - Deletes LEGOs, practice phrases, course_audio
 * - Fixes seeds: replaces 'nld' with 'Dutch' in known_text
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function execute() {
  const courseCode = 'nld_for_eng'

  // 1. Delete practice phrases
  console.log('Deleting practice phrases...')
  const { error: e1 } = await supabase.from('course_practice_phrases').delete().eq('course_code', courseCode)
  if (e1) { console.error('Error:', e1.message); return }
  console.log('Done')

  // 2. Delete LEGOs
  console.log('Deleting LEGOs...')
  const { error: e2 } = await supabase.from('course_legos').delete().eq('course_code', courseCode)
  if (e2) { console.error('Error:', e2.message); return }
  console.log('Done')

  // 3. Delete course_audio
  console.log('Deleting course_audio...')
  const { error: e3 } = await supabase.from('course_audio').delete().eq('course_code', courseCode)
  if (e3) { console.error('Error:', e3.message); return }
  console.log('Done')

  // 4. Fix seeds - replace 'nld' with 'Dutch' in known_text
  console.log('Fixing seeds...')
  const { data: seeds, error: e4 } = await supabase
    .from('course_seeds')
    .select('id, known_text')
    .eq('course_code', courseCode)
    .or('known_text.ilike.%nld%')

  if (e4) { console.error('Error:', e4.message); return }

  console.log('Found', seeds?.length || 0, 'seeds with nld to fix')

  for (const seed of seeds || []) {
    const fixed = seed.known_text.replace(/\bnld\b/gi, 'Dutch')
    if (fixed !== seed.known_text) {
      const { error } = await supabase
        .from('course_seeds')
        .update({ known_text: fixed })
        .eq('id', seed.id)
      if (error) console.error('Failed to update seed:', seed.id, error.message)
      else console.log('Fixed:', seed.known_text, '->', fixed)
    }
  }

  console.log('\n=== Complete ===')

  // Verify
  const { count: legoCount } = await supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  const { count: phraseCount } = await supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  const { count: audioCount } = await supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)

  console.log('Remaining LEGOs:', legoCount)
  console.log('Remaining phrases:', phraseCount)
  console.log('Remaining audio:', audioCount)
}

execute();
