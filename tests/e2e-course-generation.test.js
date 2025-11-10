/**
 * E2E Course Generation Test Suite
 * Tests the complete workflow from dashboard UI trigger to course completion
 *
 * Simulates: User creates course → Monitors progress → Validates outputs
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import axios from 'axios'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test configuration
const BASE_URL = 'http://localhost:3456'
const TEST_COURSE = {
  target: 'spa',
  known: 'eng',
  startSeed: 1,
  endSeed: 3, // Minimal test: just 3 seeds
  executionMode: 'api' // Use API mode for automated testing (no browser)
}
const TEST_COURSE_CODE = 'spa_for_eng_s0001-0003'
const VFS_ROOT = path.join(__dirname, '..', 'public', 'vfs', 'courses')
const TEST_COURSE_DIR = path.join(VFS_ROOT, TEST_COURSE_CODE)

// Cleanup helper
async function cleanupTestCourse() {
  try {
    await fs.remove(TEST_COURSE_DIR)
    console.log(`✓ Cleaned up test course: ${TEST_COURSE_CODE}`)
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Polling helper
async function pollUntilComplete(courseCode, maxWaitMs = 120000, intervalMs = 2000) {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await axios.get(`${BASE_URL}/api/courses/${courseCode}/status`)
      const { status, phase, progress, error } = response.data

      console.log(`  [Poll] Status: ${status}, Phase: ${phase}, Progress: ${progress}%`)

      if (status === 'completed') {
        return { success: true, data: response.data }
      }

      if (status === 'failed') {
        return { success: false, error: error || 'Unknown error' }
      }

      // Still in progress, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    } catch (err) {
      console.error(`  [Poll] Error checking status:`, err.message)
      // Continue polling even on errors
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  return { success: false, error: 'Timeout waiting for completion' }
}

// Test suite
describe('E2E Course Generation Workflow', () => {

  beforeAll(async () => {
    console.log('\n=== E2E Test Setup ===')

    // 1. Check server is running
    try {
      const response = await axios.get(`${BASE_URL}/api/health`)
      console.log('✓ Automation server is running')
    } catch (err) {
      console.error('✗ Automation server not running! Start with: npm run server')
      throw new Error('Server not available at http://localhost:3456')
    }

    // 2. Check API key is configured (for API mode)
    if (TEST_COURSE.executionMode === 'api') {
      const hasApiKey = process.env.ANTHROPIC_API_KEY || false
      if (!hasApiKey) {
        console.warn('⚠️  ANTHROPIC_API_KEY not set - API mode will fail')
        console.warn('   Set in .env file or switch test to web/local mode')
      } else {
        console.log('✓ ANTHROPIC_API_KEY configured')
      }
    }

    // 3. Cleanup any existing test course
    await cleanupTestCourse()
  })

  afterAll(async () => {
    console.log('\n=== E2E Test Cleanup ===')
    await cleanupTestCourse()
  })

  test('Complete course generation workflow (3 seeds)', async () => {
    console.log('\n=== Starting E2E Course Generation Test ===')
    console.log(`Course: ${TEST_COURSE_CODE}`)
    console.log(`Mode: ${TEST_COURSE.executionMode}`)
    console.log(`Seeds: ${TEST_COURSE.startSeed}-${TEST_COURSE.endSeed}`)

    // STEP 1: Trigger course generation via API
    console.log('\n[Step 1] Triggering course generation...')

    const generateResponse = await axios.post(`${BASE_URL}/api/courses/generate`, {
      target: TEST_COURSE.target,
      known: TEST_COURSE.known,
      seeds: TEST_COURSE.endSeed - TEST_COURSE.startSeed + 1,
      startSeed: TEST_COURSE.startSeed,
      endSeed: TEST_COURSE.endSeed,
      executionMode: TEST_COURSE.executionMode,
      force: true // Overwrite if exists
    })

    expect(generateResponse.status).toBe(200)
    expect(generateResponse.data.success).toBe(true)
    expect(generateResponse.data.courseCode).toBe(TEST_COURSE_CODE)
    expect(generateResponse.data.status).toBe('started')

    console.log('✓ Course generation started')

    // STEP 2: Poll for completion
    console.log('\n[Step 2] Monitoring progress...')

    const result = await pollUntilComplete(TEST_COURSE_CODE, 180000, 3000) // 3 min timeout

    if (!result.success) {
      console.error('\n✗ Course generation failed or timed out')
      console.error('Error:', result.error)
      throw new Error(`Course generation failed: ${result.error}`)
    }

    console.log('\n✓ Course generation completed successfully!')
    console.log(`  Final status: ${result.data.status}`)
    console.log(`  Final phase: ${result.data.phase}`)

    // STEP 3: Validate directory structure
    console.log('\n[Step 3] Validating directory structure...')

    const courseDir = TEST_COURSE_DIR
    expect(await fs.pathExists(courseDir)).toBe(true)
    console.log(`✓ Course directory exists: ${courseDir}`)

    // STEP 4: Validate Phase 1 output (seed_pairs.json)
    console.log('\n[Step 4] Validating Phase 1 output...')

    const seedPairsPath = path.join(courseDir, 'seed_pairs.json')
    expect(await fs.pathExists(seedPairsPath)).toBe(true)

    const seedPairs = await fs.readJson(seedPairsPath)
    expect(seedPairs.version).toBe('7.7.0')
    expect(seedPairs.course).toBe(TEST_COURSE_CODE)
    expect(seedPairs.target_language).toBe(TEST_COURSE.target)
    expect(seedPairs.known_language).toBe(TEST_COURSE.known)
    expect(seedPairs.total_seeds).toBe(3)
    expect(seedPairs.actual_seeds).toBe(3)
    expect(Object.keys(seedPairs.translations)).toHaveLength(3)

    // Check seed IDs are correctly formatted (4-digit padding)
    const seedIds = Object.keys(seedPairs.translations)
    expect(seedIds).toContain('S0001')
    expect(seedIds).toContain('S0002')
    expect(seedIds).toContain('S0003')

    // Check each translation is [target, known] tuple
    for (const [seedId, translation] of Object.entries(seedPairs.translations)) {
      expect(Array.isArray(translation)).toBe(true)
      expect(translation).toHaveLength(2)
      expect(typeof translation[0]).toBe('string') // target
      expect(typeof translation[1]).toBe('string') // known
      expect(translation[0].length).toBeGreaterThan(0)
      expect(translation[1].length).toBeGreaterThan(0)
    }

    console.log('✓ Phase 1: seed_pairs.json valid')
    console.log(`  - 3 seeds translated`)
    console.log(`  - Format: v7.7.0`)
    console.log(`  - Seed IDs: ${seedIds.join(', ')}`)

    // STEP 5: Validate Phase 3 output (lego_pairs.json)
    console.log('\n[Step 5] Validating Phase 3 output...')

    const legoPairsPath = path.join(courseDir, 'lego_pairs.json')
    expect(await fs.pathExists(legoPairsPath)).toBe(true)

    const legoPairs = await fs.readJson(legoPairsPath)
    expect(legoPairs.version).toBe('7.7')
    expect(Array.isArray(legoPairs.seeds)).toBe(true)
    expect(legoPairs.seeds).toHaveLength(3)

    // Check each seed structure: [SeedID, [target, known], [LEGOs]]
    let totalLegos = 0
    for (const seed of legoPairs.seeds) {
      expect(Array.isArray(seed)).toBe(true)
      expect(seed).toHaveLength(3)

      const [seedId, seedPair, legos] = seed

      // Validate seed ID format
      expect(seedId).toMatch(/^S\d{4}$/)

      // Validate seed pair
      expect(Array.isArray(seedPair)).toBe(true)
      expect(seedPair).toHaveLength(2)

      // Validate LEGOs
      expect(Array.isArray(legos)).toBe(true)
      expect(legos.length).toBeGreaterThan(0) // Each seed must have at least 1 LEGO

      for (const lego of legos) {
        expect(Array.isArray(lego)).toBe(true)
        expect(lego.length).toBeGreaterThanOrEqual(4) // [id, type, target, known] minimum

        const [legoId, type, target, known] = lego

        // Validate LEGO ID format (e.g., S0001L01)
        expect(legoId).toMatch(/^S\d{4}L\d{2}$/)

        // Validate type (B = Basic/Atomic, C = Composite/Molecular)
        expect(['B', 'C']).toContain(type)

        // Validate target/known not empty
        expect(typeof target).toBe('string')
        expect(typeof known).toBe('string')
        expect(target.length).toBeGreaterThan(0)
        expect(known.length).toBeGreaterThan(0)

        // If type C, should have componentization (5th element)
        if (type === 'C') {
          expect(lego.length).toBe(5)
          expect(Array.isArray(lego[4])).toBe(true) // componentization array
          expect(lego[4].length).toBeGreaterThan(0)
        }

        totalLegos++
      }
    }

    console.log('✓ Phase 3: lego_pairs.json valid')
    console.log(`  - 3 seeds processed`)
    console.log(`  - ${totalLegos} LEGOs extracted`)

    // STEP 6: Validate Phase 5 output (baskets)
    console.log('\n[Step 6] Validating Phase 5 output...')

    // Check for either consolidated or individual basket files
    const consolidatedPath = path.join(courseDir, 'lego_baskets.json')
    const basketsDir = path.join(courseDir, 'baskets')

    const hasConsolidated = await fs.pathExists(consolidatedPath)
    const hasIndividual = await fs.pathExists(basketsDir)

    expect(hasConsolidated || hasIndividual).toBe(true)

    let basketCount = 0

    if (hasConsolidated) {
      const baskets = await fs.readJson(consolidatedPath)
      expect(baskets.version).toBe('7.7')
      expect(typeof baskets.baskets).toBe('object')

      basketCount = Object.keys(baskets.baskets).length
      expect(basketCount).toBeGreaterThan(0)

      // Validate basket structure for each LEGO
      for (const [legoId, basket] of Object.entries(baskets.baskets)) {
        expect(legoId).toMatch(/^S\d{4}L\d{2}$/)

        // Basket must have: lego, e (eternal), d (derived)
        expect(basket.lego).toBeDefined()
        expect(Array.isArray(basket.lego)).toBe(true)
        expect(basket.lego).toHaveLength(2)

        expect(Array.isArray(basket.e)).toBe(true) // Eternal phrases
        expect(typeof basket.d).toBe('object') // Derived by word count

        // Each eternal phrase is [target, known]
        for (const phrase of basket.e) {
          expect(Array.isArray(phrase)).toBe(true)
          expect(phrase).toHaveLength(2)
        }

        // Each derived category has phrases
        for (const [wordCount, phrases] of Object.entries(basket.d)) {
          expect(Array.isArray(phrases)).toBe(true)
          for (const phrase of phrases) {
            expect(Array.isArray(phrase)).toBe(true)
            expect(phrase).toHaveLength(2)
          }
        }
      }

      console.log('✓ Phase 5: lego_baskets.json valid (consolidated)')
      console.log(`  - ${basketCount} baskets generated`)
    } else {
      // Individual basket files
      const basketFiles = await fs.readdir(basketsDir)
      basketCount = basketFiles.filter(f => f.endsWith('.json')).length
      expect(basketCount).toBeGreaterThan(0)

      console.log('✓ Phase 5: Individual basket files valid')
      console.log(`  - ${basketCount} basket files`)
    }

    // STEP 7: Validate Phase 6 output (introductions.json)
    console.log('\n[Step 7] Validating Phase 6 output...')

    const introductionsPath = path.join(courseDir, 'introductions.json')
    expect(await fs.pathExists(introductionsPath)).toBe(true)

    const introductions = await fs.readJson(introductionsPath)
    expect(introductions.version).toBeDefined()
    expect(introductions.course).toBe(TEST_COURSE_CODE)
    expect(typeof introductions.introductions).toBe('object')

    const introCount = Object.keys(introductions.introductions).length
    expect(introCount).toBeGreaterThan(0)
    expect(introCount).toBe(totalLegos) // One intro per LEGO

    console.log('✓ Phase 6: introductions.json valid')
    console.log(`  - ${introCount} introductions generated`)

    // STEP 8: Validate Phase 7 output (course_manifest.json)
    console.log('\n[Step 8] Validating Phase 7 output...')

    const manifestPath = path.join(courseDir, 'course_manifest.json')
    expect(await fs.pathExists(manifestPath)).toBe(true)

    const manifest = await fs.readJson(manifestPath)
    expect(manifest.course).toBe(TEST_COURSE_CODE)
    expect(manifest.target_language).toBe(TEST_COURSE.target)
    expect(manifest.known_language).toBe(TEST_COURSE.known)
    expect(manifest.total_seeds).toBe(3)
    expect(manifest.total_legos).toBe(totalLegos)

    console.log('✓ Phase 7: course_manifest.json valid')
    console.log(`  - Course: ${manifest.course}`)
    console.log(`  - Seeds: ${manifest.total_seeds}`)
    console.log(`  - LEGOs: ${manifest.total_legos}`)

    // STEP 9: Final summary
    console.log('\n=== E2E Test Summary ===')
    console.log('✓ All phases completed successfully')
    console.log('✓ All output files validated')
    console.log('✓ Course generation workflow works end-to-end')
    console.log('\nGenerated files:')
    console.log(`  - seed_pairs.json (3 seeds)`)
    console.log(`  - lego_pairs.json (${totalLegos} LEGOs)`)
    console.log(`  - lego_baskets.json (${basketCount} baskets)`)
    console.log(`  - introductions.json (${introCount} intros)`)
    console.log(`  - course_manifest.json`)

  }, 300000) // 5 minute timeout for entire test

  test('Course status endpoint returns correct structure', async () => {
    // This can run independently or after the above test
    const response = await axios.get(`${BASE_URL}/api/courses/${TEST_COURSE_CODE}/status`)

    expect(response.status).toBe(200)
    expect(response.data).toHaveProperty('status')
    expect(response.data).toHaveProperty('phase')
    expect(response.data).toHaveProperty('progress')
    expect(response.data).toHaveProperty('courseCode')

    // Status should be one of: in_progress, completed, failed
    expect(['in_progress', 'completed', 'failed']).toContain(response.data.status)
  })

  test('Execution mode defaults to web', async () => {
    // Test that when no executionMode specified, it defaults to 'web'
    const response = await axios.post(`${BASE_URL}/api/courses/generate`, {
      target: 'fra',
      known: 'eng',
      seeds: 1,
      startSeed: 1,
      endSeed: 1,
      // executionMode NOT specified - should default to 'web'
    })

    expect(response.status).toBe(200)
    expect(response.data.executionMode).toBe('web')

    // Cleanup
    await axios.delete(`${BASE_URL}/api/courses/fra_for_eng_s0001-0001/job`)
  })
})

describe('Smart Resume Detection', () => {
  test('Detects existing course and prevents overwrite without force flag', async () => {
    // Assuming test course from previous suite still exists

    const response = await axios.post(`${BASE_URL}/api/courses/generate`, {
      target: TEST_COURSE.target,
      known: TEST_COURSE.known,
      seeds: TEST_COURSE.endSeed - TEST_COURSE.startSeed + 1,
      startSeed: TEST_COURSE.startSeed,
      endSeed: TEST_COURSE.endSeed,
      executionMode: TEST_COURSE.executionMode,
      force: false // Don't overwrite
    })

    // Should return 409 Conflict
    expect(response.status).toBe(409)
    expect(response.data.conflict).toBe(true)
    expect(response.data.courseCode).toBe(TEST_COURSE_CODE)
  })
})

describe('VFS File Structure', () => {
  test('Course directory follows naming convention', async () => {
    // Test various course code formats
    const testCases = [
      { target: 'spa', known: 'eng', start: 1, end: 668, expected: 'spa_for_eng' },
      { target: 'spa', known: 'eng', start: 1, end: 30, expected: 'spa_for_eng_s0001-0030' },
      { target: 'ita', known: 'eng', start: 50, end: 100, expected: 'ita_for_eng_s0050-0100' },
    ]

    for (const tc of testCases) {
      const response = await axios.post(`${BASE_URL}/api/courses/generate-code`, {
        target: tc.target,
        known: tc.known,
        startSeed: tc.start,
        endSeed: tc.end
      })

      expect(response.data.courseCode).toBe(tc.expected)
    }
  })
})

describe('Phase Intelligence Loading', () => {
  test('All 7 phase prompts loaded successfully', async () => {
    const response = await axios.get(`${BASE_URL}/api/phase-prompts/status`)

    expect(response.status).toBe(200)
    expect(response.data.loaded).toBe(true)
    expect(response.data.phases).toHaveProperty('1')
    expect(response.data.phases).toHaveProperty('3')
    expect(response.data.phases).toHaveProperty('5')
    expect(response.data.phases).toHaveProperty('5.5')
    expect(response.data.phases).toHaveProperty('6')
    expect(response.data.phases).toHaveProperty('7')
    expect(response.data.phases).toHaveProperty('8')

    // Each phase should have content
    for (const [phase, content] of Object.entries(response.data.phases)) {
      expect(content.length).toBeGreaterThan(100) // Non-empty prompts
    }
  })
})
