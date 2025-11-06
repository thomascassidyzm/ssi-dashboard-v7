#!/usr/bin/env node

/**
 * Build-time script to generate a manifest of available courses
 * Scans public/vfs/courses/ and creates public/vfs/courses-manifest.json
 *
 * This eliminates the need for hardcoded course lists - any course added
 * to public/vfs/courses/ will automatically appear in the UI after build.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const COURSES_DIR = path.join(__dirname, 'public/vfs/courses')
const MANIFEST_PATH = path.join(__dirname, 'public/vfs/courses-manifest.json')

console.log('🔍 Scanning for courses...')
console.log('Directory:', COURSES_DIR)
console.log()

const manifest = {
  generated_at: new Date().toISOString(),
  courses: []
}

// Read all directories in public/vfs/courses/
const entries = fs.readdirSync(COURSES_DIR, { withFileTypes: true })

for (const entry of entries) {
  if (!entry.isDirectory()) continue

  const courseCode = entry.name
  const coursePath = path.join(COURSES_DIR, courseCode)

  // Check for available files
  const seedPairsPath = path.join(coursePath, 'seed_pairs.json')
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json')
  const basketsPath = path.join(coursePath, 'baskets_deduplicated.json')

  const hasSeedPairs = fs.existsSync(seedPairsPath)
  const hasLegoPairs = fs.existsSync(legoPairsPath)
  const hasBaskets = fs.existsSync(basketsPath)

  // Determine completion phase
  let phase = 'empty'
  let phasesCompleted = []
  if (hasSeedPairs) {
    phase = 'phase_1'
    phasesCompleted.push('1')
  }
  if (hasLegoPairs) {
    phase = 'phase_3'
    phasesCompleted.push('3')
  }
  if (hasBaskets) {
    phase = 'phase_4'
    phasesCompleted.push('4')
  }

  // Default metadata for empty/incomplete courses
  let seedPairsData = null
  let legoPairsData = null

  // Read files if they exist
  if (hasSeedPairs) {
    seedPairsData = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'))
  }
  if (hasLegoPairs) {
    legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'))
  }

  // Parse course code for language info
  // Formats: xxx_for_yyy, xxx_for_yyy_NNseeds, xxx_for_yyy_suffix
  const matchStandard = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_?(\d+)?seeds?/)
  const matchBasic = courseCode.match(/^([a-z]{3})_for_([a-z]{3})/)
  const match = matchStandard || matchBasic

  // Detect format and count LEGOs (only if lego_pairs.json exists)
  let format = 'unknown'
  let legoCount = 0

  if (legoPairsData) {
    const seedsArray = legoPairsData.seeds || []

    if (seedsArray.length > 0) {
      const firstSeed = seedsArray[0]

      if (Array.isArray(firstSeed)) {
        // v7.7 format
        format = 'v7.7'
        for (const [seedId, seedPair, legos] of seedsArray) {
          legoCount += legos.length
        }
      } else if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
        // v5.0.1 format
        format = legoPairsData.version || 'v5.0.1'
        // Count only NEW LEGOs
        for (const seed of seedsArray) {
          const newLegos = seed.legos.filter(l => l.new === true)
          legoCount += newLegos.length
        }
      }
    }
  }

  // Count seeds (only if seed_pairs.json exists)
  const seedCount = seedPairsData ? Object.keys(seedPairsData.translations || {}).length : 0

  const courseInfo = {
    course_code: courseCode,
    source_language: match ? match[2].toUpperCase() : 'UNK',
    target_language: match ? match[1].toUpperCase() : 'UNK',
    total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : seedCount,
    actual_seed_count: seedCount,
    lego_count: legoCount,
    format: format,
    phase: phase,
    phases_completed: phasesCompleted,
    has_baskets: hasBaskets,
    files: {
      seed_pairs: hasSeedPairs,
      lego_pairs: hasLegoPairs,
      baskets: hasBaskets
    }
  }

  manifest.courses.push(courseInfo)

  // Log with appropriate badge based on phase
  const phaseEmoji = phase === 'empty' ? '📂' :
                     phase === 'phase_1' ? '🌱' :
                     phase === 'phase_3' ? '🧱' :
                     phase === 'phase_4' ? '✅' : '❓'

  console.log(`${phaseEmoji} ${courseCode}`)
  console.log(`  ${courseInfo.target_language} for ${courseInfo.source_language}`)
  console.log(`  Phase: ${phase} | Files: seed_pairs=${hasSeedPairs ? '✓' : '✗'} lego_pairs=${hasLegoPairs ? '✓' : '✗'} baskets=${hasBaskets ? '✓' : '✗'}`)
  if (seedCount > 0 || legoCount > 0) {
    console.log(`  Seeds: ${seedCount}, LEGOs: ${legoCount}, Format: ${format}`)
  }
}

// Sort by course code
manifest.courses.sort((a, b) => a.course_code.localeCompare(b.course_code))

// Write manifest
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))

console.log()
console.log('='.repeat(80))
console.log(`✅ Generated manifest with ${manifest.courses.length} courses`)
console.log(`📄 Manifest written to: ${MANIFEST_PATH}`)
console.log('='.repeat(80))

// Print summary
console.log()
console.log('Course Summary by Phase:')
const byPhase = {
  'empty': [],
  'phase_1': [],
  'phase_3': [],
  'phase_4': []
}

manifest.courses.forEach(course => {
  byPhase[course.phase].push(course)
})

if (byPhase.empty.length > 0) {
  console.log('\n📂 Empty (no data):')
  byPhase.empty.forEach(c => console.log(`   ${c.course_code}`))
}

if (byPhase.phase_1.length > 0) {
  console.log('\n🌱 Phase 1 Complete (translations only):')
  byPhase.phase_1.forEach(c => console.log(`   ${c.course_code} (${c.actual_seed_count} seeds)`))
}

if (byPhase.phase_3.length > 0) {
  console.log('\n🧱 Phase 3 Complete (LEGOs extracted):')
  byPhase.phase_3.forEach(c => {
    const formatBadge = c.format === 'v5.0.1' ? '🆕' : c.format === 'v7.7' ? '📦' : '❓'
    console.log(`   ${formatBadge} ${c.course_code} (${c.actual_seed_count} seeds, ${c.lego_count} LEGOs, ${c.format})`)
  })
}

if (byPhase.phase_4.length > 0) {
  console.log('\n✅ Phase 4 Complete (baskets generated):')
  byPhase.phase_4.forEach(c => console.log(`   ${c.course_code} (${c.actual_seed_count} seeds, ${c.lego_count} LEGOs, baskets)`))
}
