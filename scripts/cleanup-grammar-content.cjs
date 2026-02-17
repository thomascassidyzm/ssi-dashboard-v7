const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function cleanupAdditionalGrammar() {
  console.log('=== CLEANING UP ADDITIONAL GRAMMAR TERMS ===\n')

  const additionalTerms = ['complement', 'measure word', 'experienced']

  for (const course of ['zho_for_eng', 'jpn_for_eng']) {
    const { data: audio } = await supabase
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', course)
      .eq('role', 'presentation')
      .is('lego_id', null)

    if (!audio) continue

    const toDelete = audio.filter(a => {
      const text = (a.text_normalized || '').toLowerCase()
      return additionalTerms.some(term =>
        text.includes("'" + term + "'") ||
        text.includes("'" + term + ",")
      )
    })

    if (toDelete.length > 0) {
      const ids = toDelete.map(a => a.id)
      await supabase.from('course_audio').delete().in('id', ids)
      console.log(`${course}: deleted ${toDelete.length}`)
      toDelete.forEach(a => console.log(`  - ${a.text_normalized.substring(0, 60)}`))
    }
  }

  // Delete standalone 'question' that's a grammar term (not "the question" or "some questions")
  const { data: qAudio } = await supabase
    .from('course_audio')
    .select('id, text_normalized')
    .eq('course_code', 'zho_for_eng')
    .eq('role', 'presentation')
    .is('lego_id', null)

  if (qAudio) {
    const questionOnly = qAudio.filter(a => {
      const text = (a.text_normalized || '').toLowerCase()
      return text.includes("for 'question',") && !text.includes("the question") && !text.includes("some question")
    })

    if (questionOnly.length > 0) {
      const ids = questionOnly.map(a => a.id)
      await supabase.from('course_audio').delete().in('id', ids)
      console.log(`Deleted ${questionOnly.length} standalone 'question' audio`)
      questionOnly.forEach(a => console.log(`  - ${a.text_normalized.substring(0, 60)}`))
    }
  }

  console.log('\nDone')
}

cleanupAdditionalGrammar().catch(console.error)
