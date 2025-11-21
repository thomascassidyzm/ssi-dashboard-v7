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

// Navigate to project root from tools/generators/
const PROJECT_ROOT = path.join(__dirname, '../../')
const COURSES_DIR = path.join(PROJECT_ROOT, 'public/vfs/courses')
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'public/vfs/courses-manifest.json')

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
  // Skip files, only process directories
  if (!entry.isDirectory()) continue

  // Skip system directories
  if (entry.name.startsWith('.')) continue

  const courseCode = entry.name
  const coursePath = path.join(COURSES_DIR, courseCode)

  // Check for available files - be flexible with naming
  const seedPairsPath = path.join(coursePath, 'seed_pairs.json')
  const seedPairsAlt = path.join(coursePath, 'translations.json')
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json')
  const legoPairsAlt = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json')
  const basketsPath = path.join(coursePath, 'lego_baskets.json')
  const basketsAlt = path.join(coursePath, 'baskets_deduplicated.json')
  const basketsAlt2 = path.join(coursePath, 'baskets.json')
  const introductionsPath = path.join(coursePath, 'introductions.json')

  const hasSeedPairs = fs.existsSync(seedPairsPath) || fs.existsSync(seedPairsAlt)
  const hasLegoPairs = fs.existsSync(legoPairsPath) || fs.existsSync(legoPairsAlt)
  const hasBaskets = fs.existsSync(basketsPath) || fs.existsSync(basketsAlt) || fs.existsSync(basketsAlt2)
  const hasIntroductions = fs.existsSync(introductionsPath)

  // Check for Phase 7 course manifest - both old and new formats
  // New format (APML v8.2.2): {Target}_for_{Known}_speakers_COURSE_20251121_003247.json
  // Old format: spa_for_eng_668seedsV4.json
  const courseManifestFiles = fs.readdirSync(coursePath).filter(f =>
    f.match(/_COURSE_\d{8}_\d{6}\.json$/) || // New format
    f.match(/\d+seedsV\d+\.json$/)            // Old format
  )
  const hasCourseManifest = courseManifestFiles.length > 0

  // Get the actual path that exists
  const actualSeedPairsPath = fs.existsSync(seedPairsPath) ? seedPairsPath : seedPairsAlt
  const actualLegoPairsPath = fs.existsSync(legoPairsPath) ? legoPairsPath : legoPairsAlt
  const actualBasketsPath = fs.existsSync(basketsPath) ? basketsPath : (fs.existsSync(basketsAlt) ? basketsAlt : basketsAlt2)

  // Determine completion phase using APML v8.2.0 numbering (1, 3, 5, 7, 8)
  // Pipeline: Phase 1 → 3 (includes 6) → 5 → 7 → 8
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
    phase = 'phase_5'
    phasesCompleted.push('5')
  }
  if (hasCourseManifest) {
    phase = 'phase_7'
    phasesCompleted.push('7')
  }

  // Note: We create an entry for EVERY folder, even if empty!

  // Default metadata for empty/incomplete courses
  let seedPairsData = null
  let legoPairsData = null
  let basketsData = null
  let introductionsData = null

  // Read files if they exist
  if (hasSeedPairs && fs.existsSync(actualSeedPairsPath)) {
    seedPairsData = JSON.parse(fs.readFileSync(actualSeedPairsPath, 'utf8'))
  }
  if (hasLegoPairs && fs.existsSync(actualLegoPairsPath)) {
    legoPairsData = JSON.parse(fs.readFileSync(actualLegoPairsPath, 'utf8'))
  }
  if (hasBaskets && fs.existsSync(actualBasketsPath)) {
    basketsData = JSON.parse(fs.readFileSync(actualBasketsPath, 'utf8'))
  }
  if (hasIntroductions && fs.existsSync(introductionsPath)) {
    introductionsData = JSON.parse(fs.readFileSync(introductionsPath, 'utf8'))
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

  // Count baskets (from lego_baskets.json)
  const basketCount = basketsData ? Object.keys(basketsData.baskets || {}).length : 0

  // Count introductions (from introductions.json)
  const introductionsCount = introductionsData ? Object.keys(introductionsData.presentations || {}).length : 0

  const courseInfo = {
    course_code: courseCode,
    source_language: match ? match[2].toUpperCase() : 'UNK',
    target_language: match ? match[1].toUpperCase() : 'UNK',
    total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : seedCount,
    actual_seed_count: seedCount,
    lego_count: legoCount,
    basket_count: basketCount,
    introductions_count: introductionsCount,
    format: format,
    phase: phase,
    phases_completed: phasesCompleted,
    has_baskets: hasBaskets,
    has_introductions: hasIntroductions,
    files: {
      seed_pairs: hasSeedPairs,
      lego_pairs: hasLegoPairs,
      baskets: hasBaskets,
      introductions: hasIntroductions
    }
  }

  manifest.courses.push(courseInfo)

  // Log with appropriate badge based on phase (ALWAYS log the folder)
  const phaseEmoji = phase === 'empty' ? '📂' :
                     phase === 'phase_1' ? '🌱' :
                     phase === 'phase_3' ? '🧱' :
                     phase === 'phase_5' ? '🗂️' :
                     phase === 'phase_7' ? '✅' : '❓'

  console.log(`${phaseEmoji} ${courseCode}`)
  console.log(`  ${courseInfo.target_language} for ${courseInfo.source_language}`)
  console.log(`  Phase: ${phase} | Files: seed_pairs=${hasSeedPairs ? '✓' : '✗'} lego_pairs=${hasLegoPairs ? '✓' : '✗'} baskets=${hasBaskets ? '✓' : '✗'} manifest=${hasCourseManifest ? '✓' : '✗'}`)
  if (seedCount > 0 || legoCount > 0) {
    console.log(`  Seeds: ${seedCount}, LEGOs: ${legoCount}, Baskets: ${basketCount}, Format: ${format}`)
  }

  // Every folder becomes a course entry
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
console.log('Course Summary by Phase (APML v8.2.0):')
const byPhase = {
  'empty': [],
  'phase_1': [],
  'phase_3': [],
  'phase_5': [],
  'phase_7': []
}

manifest.courses.forEach(course => {
  byPhase[course.phase].push(course)
})

if (byPhase.empty.length > 0) {
  console.log('\n📂 Empty (no data):')
  byPhase.empty.forEach(c => console.log(`   ${c.course_code}`))
}

if (byPhase.phase_1.length > 0) {
  console.log('\n🌱 Phase 1 Complete (translations):')
  byPhase.phase_1.forEach(c => console.log(`   ${c.course_code} (${c.actual_seed_count} seeds)`))
}

if (byPhase.phase_3.length > 0) {
  console.log('\n🧱 Phase 3 Complete (LEGO extraction + introductions):')
  byPhase.phase_3.forEach(c => {
    const formatBadge = c.format === 'v5.0.1' ? '🆕' : c.format === 'v7.7' ? '📦' : '❓'
    console.log(`   ${formatBadge} ${c.course_code} (${c.actual_seed_count} seeds, ${c.lego_count} LEGOs, ${c.format})`)
  })
}

if (byPhase.phase_5.length > 0) {
  console.log('\n🗂️  Phase 5 Complete (practice baskets):')
  byPhase.phase_5.forEach(c => console.log(`   ${c.course_code} (${c.actual_seed_count} seeds, ${c.lego_count} LEGOs, ${c.basket_count} baskets)`))
}

if (byPhase.phase_7.length > 0) {
  console.log('\n✅ Phase 7 Complete (course manifest compiled):')
  byPhase.phase_7.forEach(c => console.log(`   ${c.course_code} (${c.actual_seed_count} seeds, ${c.lego_count} LEGOs, ${c.basket_count} baskets)`))
}
