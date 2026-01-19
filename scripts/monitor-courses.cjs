#!/usr/bin/env node
/**
 * Monitor course build progress and chunking quality
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function monitorCourse(courseCode, displayName) {
  console.log(`\n${displayName}`)
  console.log('-'.repeat(50))

  // Get total seed count
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  // Get completed seeds
  const { data: completedSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', courseCode)
    .neq('target_text', '')
    .order('seed_number')

  const completedCount = completedSeeds?.length || 0

  if (completedCount === 0) {
    console.log(`  Progress: 0/${totalSeeds} - waiting...`)
    return
  }

  // Get LEGO counts
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)

  const seedCounts = {}
  for (const l of (legos || [])) {
    seedCounts[l.seed_number] = (seedCounts[l.seed_number] || 0) + 1
  }

  const counts = Object.values(seedCounts)
  const overDecomposed = Object.entries(seedCounts).filter(([s, c]) => c > 5)
  const avgLegos = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 0

  const lastSeed = completedSeeds[completedSeeds.length - 1]?.seed_number || 0

  console.log(`  Progress: ${completedCount}/${totalSeeds} seeds (latest: S${lastSeed})`)
  console.log(`  LEGOs: ${legos?.length || 0} total, avg ${avgLegos}/seed`)

  if (overDecomposed.length > 0) {
    console.log(`  ⚠️  ${overDecomposed.length} seeds with >5 LEGOs`)
  } else {
    console.log(`  ✅ All ≤5 LEGOs`)
  }
}

async function monitor() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 Course Monitor - ${new Date().toLocaleTimeString()}`)
  console.log('='.repeat(60))

  await monitorCourse('fra_for_eng', '🇫🇷 French')
  await monitorCourse('por_for_eng', '🇧🇷 Portuguese')
  await monitorCourse('deu_for_eng', '🇩🇪 German')
}

monitor().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
