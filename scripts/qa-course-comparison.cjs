#!/usr/bin/env node
/**
 * QA Course Comparison - Initial Assessment
 *
 * Lists all courses and their basic stats to identify:
 * - X_for_eng courses (good examples: fra, por, spa, zho, ita)
 * - eng_for_X courses (need improvement)
 */

require('dotenv').config()
const supabase = require('../services/supabase-client.cjs')

async function main() {
  if (!supabase.isInitialized()) {
    console.error('❌ Supabase not initialized - check SUPABASE_URL and SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log('📊 Fetching all courses from Supabase...\n')

  // Get all courses
  const courses = await supabase.getCourses()

  // Categorize courses
  const xForEng = []
  const engForX = []

  for (const course of courses) {
    const code = course.course_code
    if (code.endsWith('_for_eng')) {
      xForEng.push(course)
    } else if (code.startsWith('eng_for_')) {
      engForX.push(course)
    }
  }

  // Get stats for all courses
  const allStats = await supabase.getAllCourseContentStats()

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                    X_FOR_ENG COURSES (Good examples)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  for (const course of xForEng.sort((a, b) => a.course_code.localeCompare(b.course_code))) {
    const stats = allStats[course.course_code] || {}
    console.log(`  ${course.course_code.padEnd(15)} │ ${course.display_name || 'N/A'}`)
    console.log(`                   │ Status: ${course.status || 'unknown'}`)
    console.log(`                   │ Seeds: ${stats.completedSeeds || 0}/${stats.seeds || 0} (target: ${stats.seed_count || 'N/A'})`)
    console.log(`                   │ LEGOs: ${stats.legos || 0}, Phrases: ${stats.phrases || 0}, Audio: ${stats.audio || 0}`)
    console.log()
  }

  console.log()
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                    ENG_FOR_X COURSES (Need assessment)')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  for (const course of engForX.sort((a, b) => a.course_code.localeCompare(b.course_code))) {
    const stats = allStats[course.course_code] || {}
    console.log(`  ${course.course_code.padEnd(15)} │ ${course.display_name || 'N/A'}`)
    console.log(`                   │ Status: ${course.status || 'unknown'}`)
    console.log(`                   │ Seeds: ${stats.completedSeeds || 0}/${stats.seeds || 0} (target: ${stats.seed_count || 'N/A'})`)
    console.log(`                   │ LEGOs: ${stats.legos || 0}, Phrases: ${stats.phrases || 0}, Audio: ${stats.audio || 0}`)
    console.log()
  }

  console.log()
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('                           SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  X_for_eng courses: ${xForEng.length}`)
  console.log(`  eng_for_X courses: ${engForX.length}`)
  console.log()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
