const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkAllCourses() {
  // Get all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('course_code, status')
    .order('course_code')

  if (coursesError) {
    console.error('Error fetching courses:', coursesError)
    return
  }

  console.log('Checking presentation_audio_id coverage for all courses...\n')
  console.log('=' .repeat(80))

  const results = []

  for (const course of courses) {
    const courseCode = course.course_code

    // Count total is_new LEGOs
    const { count: totalLegos } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)

    // Count LEGOs with presentation_audio_id
    const { count: withAudio } = await supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .not('presentation_audio_id', 'is', null)

    const missing = (totalLegos || 0) - (withAudio || 0)
    const coverage = totalLegos > 0 ? Math.round((withAudio / totalLegos) * 100) : 0

    results.push({
      courseCode,
      status: course.status,
      totalLegos: totalLegos || 0,
      withAudio: withAudio || 0,
      missing,
      coverage
    })
  }

  // Sort by missing (descending) to show worst first
  results.sort((a, b) => b.missing - a.missing)

  // Print results
  console.log('Course                 Status    Total   With Audio   Missing   Coverage')
  console.log('-'.repeat(80))

  const needsRegeneration = []

  for (const r of results) {
    if (r.totalLegos === 0) continue // Skip empty courses

    const status = r.coverage === 100 ? '✓' : (r.coverage > 0 ? '⚠' : '✗')
    console.log(
      `${status} ${r.courseCode.padEnd(18)} ${r.status.padEnd(9)} ${String(r.totalLegos).padStart(5)}   ${String(r.withAudio).padStart(10)}   ${String(r.missing).padStart(7)}   ${String(r.coverage).padStart(3)}%`
    )

    if (r.missing > 0 && r.totalLegos > 0) {
      needsRegeneration.push(r)
    }
  }

  console.log('-'.repeat(80))

  // Summary
  console.log('\n=== SUMMARY ===')
  const totalMissing = needsRegeneration.reduce((sum, r) => sum + r.missing, 0)
  console.log(`Courses needing regeneration: ${needsRegeneration.length}`)
  console.log(`Total missing presentation_audio_id: ${totalMissing}`)

  if (needsRegeneration.length > 0) {
    console.log('\n=== COURSES NEEDING REGENERATION ===')
    for (const r of needsRegeneration) {
      console.log(`  ${r.courseCode}: ${r.missing} missing (${r.coverage}% coverage)`)
    }

    console.log('\n=== REGENERATION COMMANDS ===')
    console.log('Run these in Popty dashboard or via API:')
    for (const r of needsRegeneration) {
      console.log(`  https://popty.app/production/${r.courseCode}/pipeline → Regenerate Presentations`)
    }
  } else {
    console.log('\n✓ All courses have 100% presentation_audio_id coverage!')
  }
}

checkAllCourses().catch(console.error)
