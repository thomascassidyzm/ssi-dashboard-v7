#!/usr/bin/env node
/**
 * Wipe course content from database
 * Deletes: course_practice_phrases, course_legos, course_seeds
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const courseCode = process.argv[2]

if (!courseCode) {
  console.error('Usage: node wipe-course.cjs <course_code>')
  console.error('Example: node wipe-course.cjs fra_for_eng')
  process.exit(1)
}

async function wipeCourse(code) {
  console.log(`\nWiping course: ${code}`)
  console.log('='.repeat(50))

  // Get counts before deletion
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code)

  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code)

  const { count: seedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code)

  console.log(`Found: ${seedCount} seeds, ${legoCount} LEGOs, ${phraseCount} phrases`)

  // Delete in order (phrases -> legos -> seeds)
  console.log('\nDeleting practice phrases...')
  const { error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', code)
  if (phraseErr) throw phraseErr
  console.log(`  ✓ Deleted ${phraseCount} phrases`)

  console.log('Deleting LEGOs...')
  const { error: legoErr } = await supabase
    .from('course_legos')
    .delete()
    .eq('course_code', code)
  if (legoErr) throw legoErr
  console.log(`  ✓ Deleted ${legoCount} LEGOs`)

  console.log('Deleting seeds...')
  const { error: seedErr } = await supabase
    .from('course_seeds')
    .delete()
    .eq('course_code', code)
  if (seedErr) throw seedErr
  console.log(`  ✓ Deleted ${seedCount} seeds`)

  console.log('\n✅ Course wiped successfully!')
}

wipeCourse(courseCode).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
