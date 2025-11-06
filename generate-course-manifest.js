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

  // Check for required files
  const seedPairsPath = path.join(coursePath, 'seed_pairs.json')
  const legoPairsPath = path.join(coursePath, 'lego_pairs.json')

  const hasSeedPairs = fs.existsSync(seedPairsPath)
  const hasLegoPairs = fs.existsSync(legoPairsPath)

  if (!hasSeedPairs || !hasLegoPairs) {
    console.log(`⚠️  Skipping ${courseCode} - missing required files`)
    console.log(`   seed_pairs.json: ${hasSeedPairs ? '✓' : '✗'}`)
    console.log(`   lego_pairs.json: ${hasLegoPairs ? '✓' : '✗'}`)
    continue
  }

  // Read the files to extract metadata
  const seedPairsData = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'))
  const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'))

  // Parse course code for language info
  // Formats: xxx_for_yyy, xxx_for_yyy_NNseeds, xxx_for_yyy_suffix
  const matchStandard = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_?(\d+)?seeds?/)
  const matchBasic = courseCode.match(/^([a-z]{3})_for_([a-z]{3})/)
  const match = matchStandard || matchBasic

  // Detect format (v5.0.1 vs v7.7)
  const seedsArray = legoPairsData.seeds || []
  let format = 'unknown'
  let legoCount = 0

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

  // Count seeds
  const seedCount = Object.keys(seedPairsData.translations || {}).length

  const courseInfo = {
    course_code: courseCode,
    source_language: match ? match[2].toUpperCase() : 'UNK',
    target_language: match ? match[1].toUpperCase() : 'UNK',
    total_seeds: matchStandard?.[3] ? parseInt(matchStandard[3]) : seedCount,
    actual_seed_count: seedCount,
    lego_count: legoCount,
    format: format,
    has_baskets: fs.existsSync(path.join(coursePath, 'baskets_deduplicated.json')),
    files: {
      seed_pairs: true,
      lego_pairs: true,
      baskets: fs.existsSync(path.join(coursePath, 'baskets_deduplicated.json'))
    }
  }

  manifest.courses.push(courseInfo)
  console.log(`✓ ${courseCode}`)
  console.log(`  ${courseInfo.target_language} for ${courseInfo.source_language}`)
  console.log(`  Seeds: ${seedCount}, LEGOs: ${legoCount}, Format: ${format}`)
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
console.log('Course Summary:')
manifest.courses.forEach(course => {
  const badge = course.format === 'v5.0.1' ? '🆕' : '📦'
  console.log(`  ${badge} ${course.course_code} (${course.total_seeds} seeds, ${course.format})`)
})
