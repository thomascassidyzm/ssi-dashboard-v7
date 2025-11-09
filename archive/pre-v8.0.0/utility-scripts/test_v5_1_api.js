#!/usr/bin/env node

/**
 * Test script to verify API can read v5.0.1 format
 */

import fs from 'fs'

// Simulate the API parsing logic
const courseCode = 'spa_for_eng_30seeds'
const seedPairsPath = `./vfs/courses/${courseCode}/seed_pairs.json`
const legoPairsPath = `./vfs/courses/${courseCode}/lego_pairs.json`

console.log('Testing v5.0.1 format parsing...')
console.log('='.repeat(80))

// Read files
const seedPairsData = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'))
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'))

console.log('\n1. SEED PAIRS DATA')
console.log('-'.repeat(80))
console.log('Format:', seedPairsData.version || 'unknown')
console.log('Translation count:', Object.keys(seedPairsData.translations || {}).length)

console.log('\n2. LEGO PAIRS DATA')
console.log('-'.repeat(80))
console.log('Format:', legoPairsData.version)
console.log('Methodology:', legoPairsData.methodology)
console.log('Seeds count:', legoPairsData.seeds?.length)

// Detect format
const seedsArray = legoPairsData.seeds || []
const firstSeed = seedsArray[0]
const isV5_1 = firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id
const isV7_7 = Array.isArray(firstSeed)

console.log('Format detected:', isV5_1 ? 'v5.0.1 (object-based)' : isV7_7 ? 'v7.7 (array-based)' : 'unknown')

// Test parsing v5.0.1
if (isV5_1) {
  console.log('\n3. PARSING v5.0.1 FORMAT')
  console.log('-'.repeat(80))

  // Convert translations
  const translationsObj = seedPairsData.translations || {}
  const translations = Object.entries(translationsObj).map(([seed_id, [target_phrase, known_phrase]]) => ({
    seed_id,
    target_phrase,
    known_phrase
  }))
  console.log('Parsed translations:', translations.length)

  // Convert LEGOs (only NEW ones)
  const legos = []
  for (const seed of seedsArray) {
    const newLegos = seed.legos.filter(l => l.new === true)
    for (const lego of newLegos) {
      legos.push({
        seed_id: seed.seed_id,
        lego_id: lego.id,
        lego_type: lego.type,
        target_chunk: lego.target,
        known_chunk: lego.known,
        components: lego.components
      })
    }
  }
  console.log('Parsed NEW LEGOs:', legos.length)
  console.log('  Atomic:', legos.filter(l => l.lego_type === 'A').length)
  console.log('  Molecular:', legos.filter(l => l.lego_type === 'M').length)
  console.log('  With components:', legos.filter(l => l.components).length)

  // Sample output
  console.log('\n4. SAMPLE DATA')
  console.log('-'.repeat(80))
  console.log('\nFirst translation:')
  console.log(JSON.stringify(translations[0], null, 2))

  console.log('\nFirst LEGO:')
  console.log(JSON.stringify(legos[0], null, 2))

  console.log('\nFirst molecular LEGO with components:')
  const firstMolecular = legos.find(l => l.components)
  if (firstMolecular) {
    console.log(JSON.stringify(firstMolecular, null, 2))
  }

  // Complete tiling verification
  console.log('\n5. COMPLETE TILING CHECK')
  console.log('-'.repeat(80))
  for (let i = 0; i < Math.min(5, seedsArray.length); i++) {
    const seed = seedsArray[i]
    const newCount = seed.legos.filter(l => l.new).length
    const refCount = seed.legos.filter(l => l.ref).length
    const totalCount = seed.legos.length
    console.log(`${seed.seed_id}: ${newCount} new, ${refCount} ref, ${totalCount} total`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ v5.0.1 format parsing successful!')
  console.log('='.repeat(80))
} else if (isV7_7) {
  console.log('\n⚠️  Still using v7.7 format')
} else {
  console.log('\n❌ Unknown format!')
}
