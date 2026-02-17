const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function verify() {
  const courses = ['ara_for_eng', 'deu_for_eng', 'fra_for_eng', 'jpn_for_eng', 'spa_for_eng', 'zho_for_eng']

  console.log('=== FINAL VERIFICATION - 100% CHECK ===\n')

  let allGood = true

  for (const code of courses) {
    const { count: legosTotal } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true)

    const { count: legosFull } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true)
      .not('known_audio_id', 'is', null)
      .not('target1_audio_id', 'is', null)
      .not('target2_audio_id', 'is', null)

    const { count: phrasesTotal } = await supabase
      .from('course_practice_phrases').select('*', { count: 'exact', head: true })
      .eq('course_code', code)

    const { count: phrasesFull } = await supabase
      .from('course_practice_phrases').select('*', { count: 'exact', head: true })
      .eq('course_code', code)
      .not('known_audio_id', 'is', null)
      .not('target1_audio_id', 'is', null)
      .not('target2_audio_id', 'is', null)

    const legosOk = legosFull === legosTotal
    const phrasesOk = phrasesFull === phrasesTotal
    const status = (legosOk && phrasesOk) ? '✓ 100%' : '⚠️'

    if (!(legosOk && phrasesOk)) allGood = false

    console.log(code + ' ' + status)
    console.log('  LEGOs: ' + legosFull + '/' + legosTotal)
    console.log('  Phrases: ' + phrasesFull + '/' + phrasesTotal)
  }

  console.log('\n' + (allGood ? '🎉 ALL COURSES AT 100%!' : '⚠️ Some courses need attention'))
}
verify()
