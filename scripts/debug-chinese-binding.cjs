const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function check() {
  // Get LEGOs without known_audio_id
  const { data: unbound } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, known_audio_id')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true)
    .is('known_audio_id', null)
    .limit(10)

  console.log('LEGOs without known_audio_id:\n')
  for (const l of unbound || []) {
    const norm = l.known_text?.toLowerCase().trim()
    // Check if audio exists for this text
    const { data: audio } = await supabase
      .from('course_audio')
      .select('id, text, text_normalized, role')
      .eq('course_code', 'zho_for_eng')
      .eq('role', 'known')
      .eq('text_normalized', norm)
      .limit(1)

    console.log(`S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}: "${l.known_text}"`)
    console.log(`  Normalized: "${norm}"`)
    console.log(`  Audio found: ${audio?.length ? 'YES' : 'NO'}`)

    if (!audio?.length) {
      // Try to find what IS in the audio table for similar text
      const { data: similar } = await supabase
        .from('course_audio')
        .select('text_normalized')
        .eq('course_code', 'zho_for_eng')
        .eq('role', 'known')
        .ilike('text_normalized', `%${norm.split(' ')[0]}%`)
        .limit(3)
      if (similar?.length) {
        console.log(`  Similar in DB: ${similar.map(s => `"${s.text_normalized}"`).join(', ')}`)
      }
    }
    console.log('')
  }

  // Also check target audio
  console.log('\n--- LEGOs without target1_audio_id ---\n')
  const { data: unboundTarget } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true)
    .is('target1_audio_id', null)
    .limit(5)

  for (const l of unboundTarget || []) {
    const norm = l.target_text?.toLowerCase().trim()
    const { data: audio } = await supabase
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', 'zho_for_eng')
      .eq('role', 'target1')
      .eq('text_normalized', norm)
      .limit(1)

    console.log(`S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}: target="${l.target_text}"`)
    console.log(`  Audio found: ${audio?.length ? 'YES' : 'NO'}`)
  }
}

check().catch(console.error)
