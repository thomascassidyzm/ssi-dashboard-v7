const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deleteAudioInBatches() {
  const courseCode = 'nld_for_eng'
  let deleted = 0

  while (true) {
    const { count } = await supabase
      .from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    if (!count || count === 0) {
      console.log('All audio deleted. Total:', deleted)
      break
    }

    console.log('Remaining:', count, '- deleting batch...')

    const { data: batch } = await supabase
      .from('course_audio')
      .select('id')
      .eq('course_code', courseCode)
      .limit(100)

    if (!batch || batch.length === 0) break

    // Parallel delete
    const results = await Promise.all(
      batch.map(row =>
        supabase.from('course_audio').delete().eq('id', row.id)
      )
    )

    const successes = results.filter(r => !r.error).length
    deleted += successes
    console.log('Batch done:', successes, '/', batch.length, '- total:', deleted)
  }
}

deleteAudioInBatches();
