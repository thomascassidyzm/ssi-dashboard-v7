require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  const fixes = [
    { seed: 68, idx: 1, audioLego: 'S0194L01' },
    { seed: 89, idx: 1, audioLego: 'S0245L03' },
    { seed: 98, idx: 3, audioLego: 'S0250L02' },
    { seed: 106, idx: 2, audioLego: 'S0280L02' },
    { seed: 123, idx: 1, audioLego: 'S0189L01' },
    { seed: 124, idx: 2, audioLego: 'S0189L01' },
    { seed: 158, idx: 2, audioLego: 'S0250L02' },
  ]

  for (const f of fixes) {
    const { data: audio } = await sb.from('course_audio')
      .select('id')
      .eq('course_code', 'deu_for_eng')
      .eq('role', 'presentation')
      .eq('lego_id', f.audioLego)
      .limit(1)

    if (!audio || audio.length === 0) {
      console.log('No audio for', f.audioLego)
      continue
    }

    const { error } = await sb.from('course_legos')
      .update({ presentation_audio_id: audio[0].id })
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', f.seed)
      .eq('lego_index', f.idx)

    const lid = 'S' + String(f.seed).padStart(4, '0') + 'L' + String(f.idx).padStart(2, '0')
    console.log(error ? 'ERROR ' + lid + ': ' + error.message : 'Linked ' + lid + ' -> ' + audio[0].id)
  }

  const { count } = await sb.from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .is('presentation_audio_id', null)
  console.log('\nLEGOs still missing:', count)
}

run()
