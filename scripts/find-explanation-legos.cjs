const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Grammar/explanation terms that shouldn't be LEGOs
const explanationPatterns = [
  'marker',
  'particle',
  'completed',
  'possessive',
  'question',
  'disposal',
  'aspect',
  'classifier',
  'complement',
  'resultative',
  'directional',
  'modal',
  'copula',
  'suffix',
  'prefix',
  'grammatical',
  'auxiliary',
  'honorific'
]

async function findExplanationLegos() {
  console.log('Searching for LEGOs with explanation/grammar marker terms...\n')

  const courses = ['zho_for_eng', 'jpn_for_eng', 'fra_for_eng', 'deu_for_eng', 'ara_for_eng']

  for (const courseCode of courses) {
    const { data: legos, error } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, is_new')
      .eq('course_code', courseCode)
      .eq('is_new', true)

    if (error) {
      console.error(`Error for ${courseCode}: ${error.message}`)
      continue
    }

    const suspicious = legos.filter(l => {
      const known = l.known_text.toLowerCase()
      return explanationPatterns.some(p => known.includes(p))
    })

    if (suspicious.length > 0) {
      console.log(`=== ${courseCode}: ${suspicious.length} suspicious LEGOs ===`)
      for (const l of suspicious) {
        const legoId = `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`
        console.log(`  ${legoId}: "${l.known_text}" → "${l.target_text}"`)
      }
      console.log()
    } else {
      console.log(`✓ ${courseCode}: No suspicious LEGOs found`)
    }
  }

  // Also check for bracket explanations in any course
  console.log('\n=== Checking for bracket explanations [like this] ===')
  const { data: bracketLegos } = await supabase
    .from('course_legos')
    .select('course_code, seed_number, lego_index, known_text, target_text')
    .eq('is_new', true)
    .or('known_text.ilike.%[%],target_text.ilike.%[%]')
    .limit(50)

  if (bracketLegos && bracketLegos.length > 0) {
    console.log(`Found ${bracketLegos.length} LEGOs with brackets:`)
    for (const l of bracketLegos) {
      const legoId = `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`
      console.log(`  ${l.course_code} ${legoId}: "${l.known_text}" → "${l.target_text}"`)
    }
  } else {
    console.log('No LEGOs with bracket explanations found.')
  }
}

findExplanationLegos().catch(console.error)
