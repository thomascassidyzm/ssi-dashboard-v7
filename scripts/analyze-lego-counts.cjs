#!/usr/bin/env node
/**
 * Analyze LEGO counts per seed to find over-decomposition patterns
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function analyzeCourse(courseCode) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COURSE: ${courseCode} - LEGO COUNT ANALYSIS`)
  console.log('='.repeat(80))

  // Get all seeds with their LEGO counts
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)
    .order('seed_number')

  // Count LEGOs per seed
  const seedCounts = {}
  for (const l of (legos || [])) {
    seedCounts[l.seed_number] = (seedCounts[l.seed_number] || 0) + 1
  }

  const seedNumbers = Object.keys(seedCounts).map(Number).sort((a, b) => a - b)

  // Find problematic seeds (>5 LEGOs)
  const overDecomposed = seedNumbers.filter(s => seedCounts[s] > 5)
  const okSeeds = seedNumbers.filter(s => seedCounts[s] <= 5)

  console.log(`\nTotal seeds with LEGOs: ${seedNumbers.length}`)
  console.log(`Seeds with >5 LEGOs: ${overDecomposed.length}`)
  console.log(`Seeds with ≤5 LEGOs: ${okSeeds.length}`)

  // Show distribution
  const distribution = {}
  for (const s of seedNumbers) {
    const count = seedCounts[s]
    distribution[count] = (distribution[count] || 0) + 1
  }

  console.log(`\nLEGO count distribution:`)
  for (let i = 1; i <= 12; i++) {
    if (distribution[i]) {
      const bar = '█'.repeat(Math.min(distribution[i], 50))
      console.log(`  ${i} LEGOs: ${distribution[i].toString().padStart(3)} seeds ${bar}`)
    }
  }

  // Show over-decomposed seeds in detail
  if (overDecomposed.length > 0) {
    console.log(`\n--- OVER-DECOMPOSED SEEDS (>5 LEGOs) ---`)
    for (const seedNum of overDecomposed.slice(0, 30)) {
      // Get seed text
      const { data: seed } = await supabase
        .from('course_seeds')
        .select('known_text')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNum)
        .single()

      console.log(`  Seed ${seedNum}: ${seedCounts[seedNum]} LEGOs - "${seed?.known_text?.substring(0, 50)}..."`)
    }
    if (overDecomposed.length > 30) {
      console.log(`  ... and ${overDecomposed.length - 30} more`)
    }
  }

  // Find the transition point
  console.log(`\n--- TRANSITION ANALYSIS ---`)
  let lastBad = 0
  let firstGoodStreak = 0

  for (let i = 0; i < seedNumbers.length; i++) {
    const seedNum = seedNumbers[i]
    const count = seedCounts[seedNum]

    if (count > 5) {
      lastBad = seedNum
      firstGoodStreak = 0
    } else {
      firstGoodStreak++
      if (firstGoodStreak === 10 && lastBad > 0) {
        console.log(`  After seed ${lastBad}, decomposition becomes consistent (≤5 LEGOs)`)
        break
      }
    }
  }

  // Show seed-by-seed for first 60
  console.log(`\n--- FIRST 60 SEEDS (LEGO counts) ---`)
  let line = ''
  for (let i = 1; i <= 60; i++) {
    const count = seedCounts[i] || 0
    const marker = count > 5 ? `[${count}]` : ` ${count} `
    line += marker
    if (i % 20 === 0) {
      console.log(`  Seeds ${i-19}-${i}: ${line}`)
      line = ''
    }
  }
}

async function main() {
  await analyzeCourse('deu_for_eng')
  await analyzeCourse('fra_for_eng')
}

main().catch(console.error)
