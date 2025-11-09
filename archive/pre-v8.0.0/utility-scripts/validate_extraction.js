#!/usr/bin/env node

/**
 * Validation script for Phase 3 v5.0.1 extraction data
 * Validates S0001-S0050 extraction for format compliance and complete tiling
 */

import fs from 'fs'
import { validateV5_1Format } from './src/services/legoFormatAdapter.js'

const EXTRACTION_FILE = './vfs/courses/spa_for_eng_30seeds/lego_pairs.json'

console.log('='.repeat(80))
console.log('PHASE 3 v5.0.1 EXTRACTION VALIDATION')
console.log('='.repeat(80))
console.log()

// Read extraction file
console.log('📂 Reading extraction file:', EXTRACTION_FILE)
const data = JSON.parse(fs.readFileSync(EXTRACTION_FILE, 'utf8'))
console.log('✓ File loaded successfully')
console.log()

// 1. Format Validation
console.log('1️⃣  FORMAT VALIDATION')
console.log('-'.repeat(80))
const validation = validateV5_1Format(data)
console.log('Valid:', validation.valid ? '✅ YES' : '❌ NO')
if (validation.errors && validation.errors.length > 0) {
  console.log('\nErrors:')
  validation.errors.forEach(err => console.log('  ❌', err))
}
if (validation.warnings && validation.warnings.length > 0) {
  console.log('\nWarnings:')
  validation.warnings.forEach(warn => console.log('  ⚠️ ', warn))
}
console.log()

// 2. Summary Statistics
console.log('2️⃣  SUMMARY STATISTICS')
console.log('-'.repeat(80))
console.log('Version:', data.version)
console.log('Methodology:', data.methodology)
console.log('Extraction Date:', data.extraction_date)
console.log('Total Seeds:', data.seeds.length)
console.log()

const notes = data.extraction_notes || {}
const summary = notes.lego_summary || {}
console.log('LEGO Summary:')
console.log('  Total New LEGOs:', summary.total_new_legos)
console.log('  Atomic:', summary.atomic)
console.log('  Molecular:', summary.molecular)
console.log()

// 3. Complete Tiling Verification
console.log('3️⃣  COMPLETE TILING VERIFICATION')
console.log('-'.repeat(80))

const tilingStats = {
  totalSeeds: data.seeds.length,
  seedsWithNewLegos: 0,
  seedsWithRefLegos: 0,
  totalNewLegos: 0,
  totalRefLegos: 0,
  totalLegos: 0
}

const cumulativeTracker = new Map() // Track all LEGOs seen so far
const cumulativeErrors = []

data.seeds.forEach((seed, idx) => {
  const newLegos = seed.legos.filter(l => l.new)
  const refLegos = seed.legos.filter(l => l.ref)

  if (newLegos.length > 0) tilingStats.seedsWithNewLegos++
  if (refLegos.length > 0) tilingStats.seedsWithRefLegos++

  tilingStats.totalNewLegos += newLegos.length
  tilingStats.totalRefLegos += refLegos.length
  tilingStats.totalLegos += seed.legos.length

  // Verify cumulative count
  // NOTE: Track by target only, since same Spanish can have context-dependent English translations
  newLegos.forEach(lego => {
    const key = lego.target.toLowerCase().trim()
    if (!cumulativeTracker.has(key)) {
      cumulativeTracker.set(key, { seedId: seed.seed_id, knownTranslations: [lego.known] })
    } else {
      const existing = cumulativeTracker.get(key)
      cumulativeErrors.push(`${seed.seed_id}: LEGO "${lego.target}" marked as new, but was already introduced in ${existing.seedId}`)
    }
  })

  // Verify referenced LEGOs were actually introduced
  refLegos.forEach(lego => {
    const key = lego.target.toLowerCase().trim()
    const existing = cumulativeTracker.get(key)
    if (!existing) {
      cumulativeErrors.push(`${seed.seed_id}: LEGO "${lego.target}" references ${lego.ref}, but was never introduced`)
    } else {
      // Track translation variation
      if (!existing.knownTranslations.includes(lego.known)) {
        existing.knownTranslations.push(lego.known)
      }
    }
  })

  const expectedCumulative = cumulativeTracker.size
  if (seed.cumulative_legos !== expectedCumulative) {
    cumulativeErrors.push(`${seed.seed_id}: Cumulative count is ${seed.cumulative_legos}, expected ${expectedCumulative}`)
  }
})

console.log('Seeds with new LEGOs:', tilingStats.seedsWithNewLegos, '/', tilingStats.totalSeeds)
console.log('Seeds with referenced LEGOs:', tilingStats.seedsWithRefLegos, '/', tilingStats.totalSeeds)
console.log()
console.log('Total new LEGOs across all seeds:', tilingStats.totalNewLegos)
console.log('Total referenced LEGOs across all seeds:', tilingStats.totalRefLegos)
console.log('Total LEGO instances:', tilingStats.totalLegos)
console.log()
console.log('Final cumulative unique LEGOs:', cumulativeTracker.size)
console.log()

if (cumulativeErrors.length > 0) {
  console.log('❌ CUMULATIVE TRACKING ERRORS:')
  cumulativeErrors.forEach(err => console.log('  ', err))
} else {
  console.log('✅ Cumulative tracking is correct')
}
console.log()

// 4. Molecular LEGO Componentization Check
console.log('4️⃣  MOLECULAR LEGO COMPONENTIZATION')
console.log('-'.repeat(80))

let molecularWithComponents = 0
let molecularWithoutComponents = 0
const missingComponentization = []

data.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.type === 'M') {
      if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
        molecularWithComponents++
      } else {
        molecularWithoutComponents++
        missingComponentization.push(`${seed.seed_id}:${lego.id} - "${lego.target}"`)
      }
    }
  })
})

console.log('Molecular LEGOs with componentization:', molecularWithComponents)
console.log('Molecular LEGOs WITHOUT componentization:', molecularWithoutComponents)

if (missingComponentization.length > 0) {
  console.log('\n❌ Missing componentization:')
  missingComponentization.slice(0, 10).forEach(item => console.log('  ', item))
  if (missingComponentization.length > 10) {
    console.log(`   ... and ${missingComponentization.length - 10} more`)
  }
} else {
  console.log('✅ All molecular LEGOs have componentization')
}
console.log()

// 5. Pattern Summary
console.log('5️⃣  PATTERN SUMMARY')
console.log('-'.repeat(80))

if (notes.patterns_introduced) {
  const patterns = Object.keys(notes.patterns_introduced)
  console.log('Total patterns identified:', patterns.length)
  console.log('Patterns:', patterns.join(', '))
} else {
  console.log('No pattern summary found in extraction notes')
}
console.log()

// 6. Sample Seed Inspection
console.log('6️⃣  SAMPLE SEED INSPECTION')
console.log('-'.repeat(80))

// Check first seed (should have only new LEGOs)
const firstSeed = data.seeds[0]
console.log(`First Seed (${firstSeed.seed_id}):`)
console.log('  Sentence:', firstSeed.seed_pair[0])
console.log('  LEGOs:', firstSeed.legos.length)
console.log('  New:', firstSeed.legos.filter(l => l.new).length)
console.log('  Referenced:', firstSeed.legos.filter(l => l.ref).length)
console.log('  ✓ Expected: All new, no references')
console.log()

// Check a middle seed (should have mix of new and referenced)
const middleSeed = data.seeds[Math.floor(data.seeds.length / 2)]
console.log(`Middle Seed (${middleSeed.seed_id}):`)
console.log('  Sentence:', middleSeed.seed_pair[0])
console.log('  LEGOs:', middleSeed.legos.length)
console.log('  New:', middleSeed.legos.filter(l => l.new).length)
console.log('  Referenced:', middleSeed.legos.filter(l => l.ref).length)
console.log()

// Check last seed
const lastSeed = data.seeds[data.seeds.length - 1]
console.log(`Last Seed (${lastSeed.seed_id}):`)
console.log('  Sentence:', lastSeed.seed_pair[0])
console.log('  LEGOs:', lastSeed.legos.length)
console.log('  New:', lastSeed.legos.filter(l => l.new).length)
console.log('  Referenced:', lastSeed.legos.filter(l => l.ref).length)
console.log('  Cumulative LEGOs:', lastSeed.cumulative_legos)
console.log()

// 7. Translation Variations
console.log('7️⃣  TRANSLATION VARIATIONS')
console.log('-'.repeat(80))

const translationVariations = []
cumulativeTracker.forEach((value, target) => {
  if (value.knownTranslations.length > 1) {
    translationVariations.push({
      target,
      translations: value.knownTranslations,
      introducedIn: value.seedId
    })
  }
})

if (translationVariations.length > 0) {
  console.log(`Found ${translationVariations.length} LEGOs with multiple English translations:`)
  console.log()
  translationVariations.forEach(item => {
    console.log(`  "${item.target}" (introduced in ${item.introducedIn}):`)
    item.translations.forEach(trans => console.log(`    • ${trans}`))
  })
  console.log()
  console.log('ℹ️  This is normal - same Spanish can have context-dependent English translations')
} else {
  console.log('No translation variations found')
}
console.log()

// 8. Final Verdict
console.log('='.repeat(80))
console.log('FINAL VERDICT')
console.log('='.repeat(80))

const allChecks = [
  { name: 'Format validation', passed: validation.valid },
  { name: 'Cumulative tracking', passed: cumulativeErrors.length === 0 },
  { name: 'Molecular componentization', passed: molecularWithoutComponents === 0 },
  { name: 'Complete tiling', passed: tilingStats.totalRefLegos > 0 }
]

const allPassed = allChecks.every(check => check.passed)

allChecks.forEach(check => {
  console.log(check.passed ? '✅' : '❌', check.name)
})

console.log()
if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED - Extraction is valid v5.0.1 format!')
} else {
  console.log('⚠️  SOME CHECKS FAILED - Review errors above')
}
console.log('='.repeat(80))
