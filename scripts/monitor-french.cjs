#!/usr/bin/env node
/**
 * Monitor French course build progress and chunking quality
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function monitor() {
  const courseCode = 'fra_for_eng'

  console.log(`\n📊 French Course Monitor - ${new Date().toLocaleTimeString()}`)
  console.log('='.repeat(60))

  // Get completed seeds (those with target_text)
  const { data: completedSeeds, error: seedErr } = await supabase
    .from('course_seeds')
    .select('seed_number')
    .eq('course_code', courseCode)
    .neq('target_text', '')
    .order('seed_number')

  if (seedErr) throw seedErr

  const completedCount = completedSeeds?.length || 0
  console.log(`\nProgress: ${completedCount}/668 seeds completed`)

  if (completedCount === 0) {
    console.log('No seeds completed yet. Waiting for build to start...')
    return
  }

  // Get LEGO counts per seed
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode)

  const seedCounts = {}
  for (const l of (legos || [])) {
    seedCounts[l.seed_number] = (seedCounts[l.seed_number] || 0) + 1
  }

  // Analyze distribution
  const counts = Object.values(seedCounts)
  const overDecomposed = Object.entries(seedCounts).filter(([s, c]) => c > 5)
  const avgLegos = counts.length > 0 ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1) : 0

  console.log(`LEGOs: ${legos?.length || 0} total, avg ${avgLegos} per seed`)

  // Distribution
  const dist = {}
  for (const c of counts) {
    dist[c] = (dist[c] || 0) + 1
  }

  console.log(`\nDistribution:`)
  for (let i = 1; i <= 8; i++) {
    if (dist[i]) {
      const pct = ((dist[i] / counts.length) * 100).toFixed(0)
      const bar = '█'.repeat(Math.min(Math.round(dist[i] / 2), 30))
      const marker = i > 5 ? ' ⚠️' : ''
      console.log(`  ${i} LEGOs: ${dist[i].toString().padStart(3)} seeds (${pct}%) ${bar}${marker}`)
    }
  }

  // Flag over-decomposed seeds
  if (overDecomposed.length > 0) {
    console.log(`\n⚠️  Over-decomposed seeds (>5 LEGOs): ${overDecomposed.length}`)
    for (const [seedNum, count] of overDecomposed.slice(0, 10)) {
      const { data: seed } = await supabase
        .from('course_seeds')
        .select('known_text')
        .eq('course_code', courseCode)
        .eq('seed_number', parseInt(seedNum))
        .single()
      console.log(`   Seed ${seedNum}: ${count} LEGOs - "${seed?.known_text?.substring(0, 45)}..."`)
    }
    if (overDecomposed.length > 10) {
      console.log(`   ... and ${overDecomposed.length - 10} more`)
    }
  } else {
    console.log(`\n✅ All seeds have ≤5 LEGOs - good chunking!`)
  }

  // Show latest completed seeds
  const latest = completedSeeds.slice(-5)
  console.log(`\nLatest completed:`)
  for (const s of latest) {
    const count = seedCounts[s.seed_number] || 0
    const marker = count > 5 ? '⚠️' : '✓'
    console.log(`  ${marker} Seed ${s.seed_number}: ${count} LEGOs`)
  }
}

monitor().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
