#!/usr/bin/env node

/**
 * verify-audio-completeness.cjs
 *
 * Comprehensive audio verification script for SSi Dashboard v7.
 * Checks audio completeness across ALL content categories:
 *
 * 1. COURSE AUDIO (per course):
 *    - Phrases: known, target1, target2, presentation
 *    - LEGOs: known, target1, target2
 *    - SEEDs: (implicit in phrases/LEGOs)
 *
 * 2. SHARED AUDIO (per language):
 *    - Encouragements (26 pooled)
 *    - Instructions (48 ordered)
 *
 * 3. WELCOMES (per course):
 *    - Course welcome message
 *
 * Usage:
 *   node scripts/verify-audio-completeness.cjs                    # All courses
 *   node scripts/verify-audio-completeness.cjs spa_for_eng        # Single course
 *   node scripts/verify-audio-completeness.cjs --language eng     # Language only
 *   node scripts/verify-audio-completeness.cjs --json             # JSON output
 *
 * @version 1.0.0
 * @requires SUPABASE_URL, SUPABASE_SERVICE_KEY environment variables
 */

const fs = require('fs')
const path = require('path')

// Parse arguments
const args = process.argv.slice(2)
const courseCode = args.find(a => !a.startsWith('--'))
const jsonOutput = args.includes('--json')
const languageOnly = args.find(a => a.startsWith('--language='))?.split('=')[1]

// Load environment
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})

// Text normalization (matches supabase-client.cjs)
function normalizeText(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Constants for shared audio requirements
const SHARED_AUDIO_REQUIREMENTS = {
  encouragement: 26,  // pooledEncouragements
  instruction: 48     // orderedEncouragements (these are called "instructions" in the database)
}

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Get all courses with their languages
 */
async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name')
    .order('course_code')

  if (error) throw error
  return data || []
}

/**
 * Verify course audio completeness (seeds + phrases + LEGOs)
 * Uses pagination to handle large datasets (1000-item Supabase limit)
 */
async function verifyCourseAudio(courseCode) {
  const result = {
    courseCode,
    seeds: { expected: {}, existing: {}, missing: {} },
    phrases: { expected: {}, existing: {}, missing: {} },
    legos: { expected: {}, existing: {}, missing: {} },
    summary: { totalExpected: 0, totalExisting: 0, totalMissing: 0, coverage: '0%' }
  }

  const roles = ['known', 'target1', 'target2', 'presentation']
  const seedRoles = ['known', 'target1', 'target2']
  const legoRoles = ['known', 'target1', 'target2']

  // Initialize counters
  for (const role of seedRoles) {
    result.seeds.expected[role] = 0
    result.seeds.existing[role] = 0
    result.seeds.missing[role] = []
  }
  for (const role of roles) {
    result.phrases.expected[role] = 0
    result.phrases.existing[role] = 0
    result.phrases.missing[role] = []
  }
  for (const role of legoRoles) {
    result.legos.expected[role] = 0
    result.legos.existing[role] = 0
    result.legos.missing[role] = []
  }

  // Step 1: Load all course_audio into a lookup Set (paginated)
  const existingAudio = new Set()
  let audioOffset = 0
  const pageSize = 1000

  while (true) {
    const { data: audioPage, error: audioErr } = await supabase
      .from('course_audio')
      .select('text_normalized, language, role, s3_key')
      .eq('course_code', courseCode)
      .range(audioOffset, audioOffset + pageSize - 1)

    if (audioErr) throw audioErr
    if (!audioPage || audioPage.length === 0) break

    for (const row of audioPage) {
      // Skip pending audio (not yet generated)
      if (row.s3_key?.startsWith('pending/')) continue
      existingAudio.add(`${row.text_normalized}|${row.language}|${row.role}`)
    }

    audioOffset += pageSize
    if (audioPage.length < pageSize) break
  }

  // Step 2: Get course info including release target
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('known_lang, target_lang, seed_count, status')
    .eq('course_code', courseCode)
    .single()

  if (courseErr || !course) {
    throw new Error(`Course not found: ${courseCode}`)
  }

  const knownLang = course.known_lang
  const targetLang = course.target_lang
  const releaseTarget = course.seed_count || 260  // Default to 260 for MVP

  result.releaseTarget = releaseTarget
  result.status = course.status

  // Step 3: Check SEEDS (the complete sentences learners work towards)
  // Only check seeds up to the release target (e.g., 260 for MVP)
  let seedOffset = 0

  while (true) {
    const { data: seeds, error: seedErr } = await supabase
      .from('course_seeds')
      .select('seed_number, seed_id, known_text, target_text')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)  // Only seeds up to release target
      .range(seedOffset, seedOffset + pageSize - 1)

    if (seedErr) throw seedErr
    if (!seeds || seeds.length === 0) break

    for (const seed of seeds) {
      // Known role (seed sentence in known language)
      if (seed.known_text) {
        result.seeds.expected.known++
        const knownKey = `${normalizeText(seed.known_text)}|${knownLang}|known`
        if (existingAudio.has(knownKey)) {
          result.seeds.existing.known++
        } else {
          result.seeds.missing.known.push({
            text: seed.known_text,
            seed: seed.seed_number,
            seedId: seed.seed_id
          })
        }
      }

      // Target1 role
      if (seed.target_text) {
        result.seeds.expected.target1++
        const target1Key = `${normalizeText(seed.target_text)}|${targetLang}|target1`
        if (existingAudio.has(target1Key)) {
          result.seeds.existing.target1++
        } else {
          result.seeds.missing.target1.push({
            text: seed.target_text,
            seed: seed.seed_number,
            seedId: seed.seed_id
          })
        }

        // Target2 role (same text, different voice)
        result.seeds.expected.target2++
        const target2Key = `${normalizeText(seed.target_text)}|${targetLang}|target2`
        if (existingAudio.has(target2Key)) {
          result.seeds.existing.target2++
        } else {
          result.seeds.missing.target2.push({
            text: seed.target_text,
            seed: seed.seed_number,
            seedId: seed.seed_id
          })
        }
      }
    }

    seedOffset += pageSize
    if (seeds.length < pageSize) break
  }

  // Step 4: Check PRACTICE PHRASES (paginated)
  // Only check phrases from seeds up to release target
  let phraseOffset = 0

  while (true) {
    const { data: phrases, error: phraseErr } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text, seed_number, lego_index')
      .eq('course_code', courseCode)
      .lte('seed_number', releaseTarget)  // Only phrases from seeds up to release target
      .range(phraseOffset, phraseOffset + pageSize - 1)

    if (phraseErr) throw phraseErr
    if (!phrases || phrases.length === 0) break

    for (const phrase of phrases) {
      // Known role
      if (phrase.known_text) {
        result.phrases.expected.known++
        const knownKey = `${normalizeText(phrase.known_text)}|${knownLang}|known`
        if (existingAudio.has(knownKey)) {
          result.phrases.existing.known++
        } else {
          result.phrases.missing.known.push({
            text: phrase.known_text,
            seed: phrase.seed_number,
            lego: phrase.lego_index
          })
        }
      }

      // Target1 role
      if (phrase.target_text) {
        result.phrases.expected.target1++
        const target1Key = `${normalizeText(phrase.target_text)}|${targetLang}|target1`
        if (existingAudio.has(target1Key)) {
          result.phrases.existing.target1++
        } else {
          result.phrases.missing.target1.push({
            text: phrase.target_text,
            seed: phrase.seed_number,
            lego: phrase.lego_index
          })
        }

        // Target2 role (same text, different voice)
        result.phrases.expected.target2++
        const target2Key = `${normalizeText(phrase.target_text)}|${targetLang}|target2`
        if (existingAudio.has(target2Key)) {
          result.phrases.existing.target2++
        } else {
          result.phrases.missing.target2.push({
            text: phrase.target_text,
            seed: phrase.seed_number,
            lego: phrase.lego_index
          })
        }
      }
    }

    phraseOffset += pageSize
    if (phrases.length < pageSize) break
  }

  // Step 5: Check LEGOs (paginated) - only NEW LEGOs need audio
  // Only check LEGOs from seeds up to release target
  let legoOffset = 0

  while (true) {
    const { data: legos, error: legoErr } = await supabase
      .from('course_legos')
      .select('known_text, target_text, seed_number, lego_index, is_new')
      .eq('course_code', courseCode)
      .eq('is_new', true)  // Only new LEGOs need audio
      .lte('seed_number', releaseTarget)  // Only LEGOs from seeds up to release target
      .range(legoOffset, legoOffset + pageSize - 1)

    if (legoErr) throw legoErr
    if (!legos || legos.length === 0) break

    for (const lego of legos) {
      // Known role
      if (lego.known_text) {
        result.legos.expected.known++
        const knownKey = `${normalizeText(lego.known_text)}|${knownLang}|known`
        if (existingAudio.has(knownKey)) {
          result.legos.existing.known++
        } else {
          result.legos.missing.known.push({
            text: lego.known_text,
            seed: lego.seed_number,
            lego: lego.lego_index
          })
        }
      }

      // Target roles
      if (lego.target_text) {
        for (const role of ['target1', 'target2']) {
          result.legos.expected[role]++
          const key = `${normalizeText(lego.target_text)}|${targetLang}|${role}`
          if (existingAudio.has(key)) {
            result.legos.existing[role]++
          } else {
            result.legos.missing[role].push({
              text: lego.target_text,
              seed: lego.seed_number,
              lego: lego.lego_index
            })
          }
        }
      }
    }

    legoOffset += pageSize
    if (legos.length < pageSize) break
  }

  // Step 6: Check presentation audio (directly from course_audio with role='presentation')
  // Note: Some courses use lego_introductions table, others store directly in course_audio
  const { count: presentationCount, error: presErr } = await supabase
    .from('course_audio')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('role', 'presentation')

  if (presErr) throw presErr

  // Get count of NEW LEGOs up to release target (each should have presentation audio)
  const { count: newLegoCount, error: legoCountErr } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .lte('seed_number', releaseTarget)

  if (legoCountErr) throw legoCountErr

  result.phrases.expected.presentation = newLegoCount || 0
  result.phrases.existing.presentation = presentationCount || 0

  const presentationMissing = Math.max(0, (newLegoCount || 0) - (presentationCount || 0))
  result.phrases.missing.presentation = presentationMissing > 0
    ? [{ note: `${presentationMissing} LEGOs missing presentation audio` }]
    : []

  // Calculate summary
  for (const role of seedRoles) {
    result.summary.totalExpected += result.seeds.expected[role]
    result.summary.totalExisting += result.seeds.existing[role]
    result.summary.totalMissing += result.seeds.missing[role].length
  }
  for (const role of roles) {
    result.summary.totalExpected += result.phrases.expected[role]
    result.summary.totalExisting += result.phrases.existing[role]
    result.summary.totalMissing += result.phrases.missing[role].length
  }
  for (const role of legoRoles) {
    result.summary.totalExpected += result.legos.expected[role]
    result.summary.totalExisting += result.legos.existing[role]
    result.summary.totalMissing += result.legos.missing[role].length
  }

  if (result.summary.totalExpected > 0) {
    const coverage = (result.summary.totalExisting / result.summary.totalExpected) * 100
    result.summary.coverage = `${coverage.toFixed(1)}%`
  }

  return result
}

/**
 * Verify shared audio completeness (encouragements + instructions per language)
 */
async function verifySharedAudio(language) {
  const result = {
    language,
    encouragements: { expected: SHARED_AUDIO_REQUIREMENTS.encouragement, existing: 0, missing: 0 },
    instructions: { expected: SHARED_AUDIO_REQUIREMENTS.instruction, existing: 0, missing: 0 },
    summary: { totalExpected: 74, totalExisting: 0, coverage: '0%' }
  }

  // Check encouragements
  const { count: encCount, error: encErr } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', language)
    .eq('audio_type', 'encouragement')

  if (encErr) throw encErr
  result.encouragements.existing = encCount || 0
  result.encouragements.missing = Math.max(0, result.encouragements.expected - result.encouragements.existing)

  // Check instructions
  const { count: instrCount, error: instrErr } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', language)
    .eq('audio_type', 'instruction')

  if (instrErr) throw instrErr
  result.instructions.existing = instrCount || 0
  result.instructions.missing = Math.max(0, result.instructions.expected - result.instructions.existing)

  // Summary
  result.summary.totalExisting = result.encouragements.existing + result.instructions.existing
  const coverage = (result.summary.totalExisting / result.summary.totalExpected) * 100
  result.summary.coverage = `${coverage.toFixed(1)}%`

  return result
}

/**
 * Verify welcome audio exists for a course
 */
async function verifyWelcome(courseCode) {
  // Check welcomes.json canonical file
  const welcomesPath = path.join(__dirname, '../public/vfs/canonical/welcomes.json')

  const result = {
    courseCode,
    exists: false,
    hasAudio: false,
    hasDuration: false,
    details: null
  }

  if (!fs.existsSync(welcomesPath)) {
    return result
  }

  try {
    const welcomes = JSON.parse(fs.readFileSync(welcomesPath, 'utf8'))
    const welcome = welcomes.welcomes?.[courseCode]

    if (welcome) {
      result.exists = true
      result.hasAudio = !!welcome.id
      result.hasDuration = welcome.duration > 0
      result.details = {
        id: welcome.id,
        duration: welcome.duration,
        voice: welcome.voice
      }
    }
  } catch (e) {
    // File read error
  }

  return result
}

/**
 * Verify canonical encouragements file exists for a language
 */
async function verifyCanonicalEncouragements(language) {
  const result = {
    language,
    fileExists: false,
    pooledCount: 0,
    orderedCount: 0,
    totalCount: 0
  }

  // Try different file naming patterns
  const patterns = [
    `${language}_encouragements.json`,
    `${language.substring(0, 2)}_encouragements.json`
  ]

  for (const pattern of patterns) {
    const filePath = path.join(__dirname, '../public/vfs/canonical', pattern)

    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        result.fileExists = true
        result.pooledCount = data.pooledEncouragements?.length || 0
        result.orderedCount = data.orderedEncouragements?.length || 0
        result.totalCount = result.pooledCount + result.orderedCount
        break
      } catch (e) {
        // Parse error
      }
    }
  }

  return result
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║           SSi AUDIO COMPLETENESS VERIFICATION                     ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝')
  console.log('')

  const fullReport = {
    generatedAt: new Date().toISOString(),
    courses: {},
    sharedAudio: {},
    welcomes: {},
    canonicalFiles: {},
    summary: {
      coursesChecked: 0,
      languagesChecked: 0,
      totalCourseAudioExpected: 0,
      totalCourseAudioExisting: 0,
      totalSharedAudioExpected: 0,
      totalSharedAudioExisting: 0
    }
  }

  try {
    // Get all courses
    const courses = await getCourses()

    if (courseCode) {
      // Single course mode
      const course = courses.find(c => c.course_code === courseCode)
      if (!course) {
        console.error(`Course not found: ${courseCode}`)
        process.exit(1)
      }

      console.log(`Verifying course: ${courseCode}`)
      console.log(`  Known language: ${course.known_lang}`)
      console.log(`  Target language: ${course.target_lang}`)
      console.log('')

      // Verify course audio
      const courseResult = await verifyCourseAudio(courseCode)
      fullReport.courses[courseCode] = courseResult

      // Verify shared audio for known language
      const sharedResult = await verifySharedAudio(course.known_lang)
      fullReport.sharedAudio[course.known_lang] = sharedResult

      // Verify welcome
      const welcomeResult = await verifyWelcome(courseCode)
      fullReport.welcomes[courseCode] = welcomeResult

      // Verify canonical file
      const canonicalResult = await verifyCanonicalEncouragements(course.known_lang)
      fullReport.canonicalFiles[course.known_lang] = canonicalResult

      fullReport.summary.coursesChecked = 1
      fullReport.summary.languagesChecked = 1

    } else if (languageOnly) {
      // Language-only mode
      console.log(`Verifying shared audio for language: ${languageOnly}`)
      console.log('')

      const sharedResult = await verifySharedAudio(languageOnly)
      fullReport.sharedAudio[languageOnly] = sharedResult

      const canonicalResult = await verifyCanonicalEncouragements(languageOnly)
      fullReport.canonicalFiles[languageOnly] = canonicalResult

      fullReport.summary.languagesChecked = 1

    } else {
      // All courses mode
      console.log(`Found ${courses.length} courses to verify`)
      console.log('')

      // Collect unique known languages
      const knownLanguages = new Set(courses.map(c => c.known_lang))

      // Verify each course
      for (const course of courses) {
        console.log(`  Checking ${course.course_code}...`)

        const courseResult = await verifyCourseAudio(course.course_code)
        fullReport.courses[course.course_code] = courseResult

        const welcomeResult = await verifyWelcome(course.course_code)
        fullReport.welcomes[course.course_code] = welcomeResult

        fullReport.summary.totalCourseAudioExpected += courseResult.summary.totalExpected
        fullReport.summary.totalCourseAudioExisting += courseResult.summary.totalExisting
      }

      // Verify shared audio for each known language
      console.log('')
      console.log(`Checking shared audio for ${knownLanguages.size} languages...`)

      for (const lang of knownLanguages) {
        console.log(`  Checking ${lang}...`)

        const sharedResult = await verifySharedAudio(lang)
        fullReport.sharedAudio[lang] = sharedResult

        const canonicalResult = await verifyCanonicalEncouragements(lang)
        fullReport.canonicalFiles[lang] = canonicalResult

        fullReport.summary.totalSharedAudioExpected += 74 // 26 + 48
        fullReport.summary.totalSharedAudioExisting += sharedResult.summary.totalExisting
      }

      fullReport.summary.coursesChecked = courses.length
      fullReport.summary.languagesChecked = knownLanguages.size
    }

    // Output results
    console.log('')

    if (jsonOutput) {
      console.log(JSON.stringify(fullReport, null, 2))
    } else {
      printHumanReadableReport(fullReport)
    }

  } catch (error) {
    console.error('ERROR:', error.message)
    process.exit(1)
  }
}

function printHumanReadableReport(report) {
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('                         VERIFICATION RESULTS')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('')

  // Course Audio Section
  if (Object.keys(report.courses).length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│                      COURSE AUDIO                               │')
    console.log('├─────────────────────────────────────────────────────────────────┤')

    for (const [code, data] of Object.entries(report.courses)) {
      const targetInfo = data.releaseTarget ? ` (MVP: ${data.releaseTarget} seeds, status: ${data.status})` : ''
      console.log(`│ ${(code + targetInfo).padEnd(63)} │`)
      console.log('├─────────────────────────────────────────────────────────────────┤')

      // Seeds table
      console.log('│  SEEDS (complete sentences):                                    │')
      console.log('│  Role          Expected    Existing    Missing    Coverage      │')
      console.log('│  ──────────────────────────────────────────────────────────────│')

      for (const role of ['known', 'target1', 'target2']) {
        const expected = data.seeds?.expected[role] || 0
        const existing = data.seeds?.existing[role] || 0
        const missing = data.seeds?.missing[role]?.length || 0
        const coverage = expected > 0 ? ((existing / expected) * 100).toFixed(1) + '%' : 'N/A'

        console.log(`│  ${role.padEnd(12)} ${String(expected).padStart(8)}  ${String(existing).padStart(10)}  ${String(missing).padStart(9)}  ${coverage.padStart(10)}  │`)
      }

      // Phrases table
      console.log('│                                                                 │')
      console.log('│  PHRASES (practice sentences):                                  │')
      console.log('│  Role          Expected    Existing    Missing    Coverage      │')
      console.log('│  ──────────────────────────────────────────────────────────────│')

      for (const role of ['known', 'target1', 'target2', 'presentation']) {
        const expected = data.phrases.expected[role] || 0
        const existing = data.phrases.existing[role] || 0
        const missing = data.phrases.missing[role]?.length || 0
        const coverage = expected > 0 ? ((existing / expected) * 100).toFixed(1) + '%' : 'N/A'

        console.log(`│  ${role.padEnd(12)} ${String(expected).padStart(8)}  ${String(existing).padStart(10)}  ${String(missing).padStart(9)}  ${coverage.padStart(10)}  │`)
      }

      // LEGOs table
      console.log('│                                                                 │')
      console.log('│  LEGOs (new only):                                              │')
      console.log('│  Role          Expected    Existing    Missing    Coverage      │')
      console.log('│  ──────────────────────────────────────────────────────────────│')

      for (const role of ['known', 'target1', 'target2']) {
        const expected = data.legos.expected[role] || 0
        const existing = data.legos.existing[role] || 0
        const missing = data.legos.missing[role]?.length || 0
        const coverage = expected > 0 ? ((existing / expected) * 100).toFixed(1) + '%' : 'N/A'

        console.log(`│  ${role.padEnd(12)} ${String(expected).padStart(8)}  ${String(existing).padStart(10)}  ${String(missing).padStart(9)}  ${coverage.padStart(10)}  │`)
      }

      console.log('│                                                                 │')
      console.log(`│  TOTAL COVERAGE: ${data.summary.coverage.padStart(45)} │`)
      console.log('├─────────────────────────────────────────────────────────────────┤')
    }
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('')
  }

  // Shared Audio Section
  if (Object.keys(report.sharedAudio).length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│                      SHARED AUDIO (per language)                │')
    console.log('├─────────────────────────────────────────────────────────────────┤')
    console.log('│  Language    Encouragements    Instructions    Total   Coverage │')
    console.log('│              (26 pooled)       (48 ordered)                     │')
    console.log('├─────────────────────────────────────────────────────────────────┤')

    for (const [lang, data] of Object.entries(report.sharedAudio)) {
      const encStatus = data.encouragements.existing === 26 ? '✓' : `${data.encouragements.existing}/26`
      const instrStatus = data.instructions.existing === 48 ? '✓' : `${data.instructions.existing}/48`
      const total = `${data.summary.totalExisting}/74`

      console.log(`│  ${lang.padEnd(10)} ${encStatus.padStart(13)}       ${instrStatus.padStart(12)}    ${total.padStart(6)}   ${data.summary.coverage.padStart(8)} │`)
    }
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('')
  }

  // Canonical Files Section
  if (Object.keys(report.canonicalFiles).length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│                CANONICAL ENCOURAGEMENT FILES                    │')
    console.log('├─────────────────────────────────────────────────────────────────┤')
    console.log('│  Language    File Exists    Pooled    Ordered    Total          │')
    console.log('├─────────────────────────────────────────────────────────────────┤')

    for (const [lang, data] of Object.entries(report.canonicalFiles)) {
      const status = data.fileExists ? '✓' : '✗ MISSING'
      console.log(`│  ${lang.padEnd(10)} ${status.padStart(12)}  ${String(data.pooledCount).padStart(8)}  ${String(data.orderedCount).padStart(9)}  ${String(data.totalCount).padStart(7)}    │`)
    }
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('')
  }

  // Welcomes Section
  if (Object.keys(report.welcomes).length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│                        WELCOMES                                 │')
    console.log('├─────────────────────────────────────────────────────────────────┤')
    console.log('│  Course               Exists    Audio UUID    Duration         │')
    console.log('├─────────────────────────────────────────────────────────────────┤')

    for (const [code, data] of Object.entries(report.welcomes)) {
      const exists = data.exists ? '✓' : '✗'
      const audio = data.hasAudio ? '✓' : '✗'
      const duration = data.hasDuration ? `${data.details?.duration?.toFixed(1)}s` : '-'

      console.log(`│  ${code.padEnd(20)} ${exists.padStart(6)}    ${audio.padStart(12)}    ${duration.padStart(12)}   │`)
    }
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('')
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('                            SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`  Courses checked: ${report.summary.coursesChecked}`)
  console.log(`  Languages checked: ${report.summary.languagesChecked}`)

  if (report.summary.totalCourseAudioExpected > 0) {
    const courseCoverage = ((report.summary.totalCourseAudioExisting / report.summary.totalCourseAudioExpected) * 100).toFixed(1)
    console.log(`  Course audio: ${report.summary.totalCourseAudioExisting}/${report.summary.totalCourseAudioExpected} (${courseCoverage}%)`)
  }

  if (report.summary.totalSharedAudioExpected > 0) {
    const sharedCoverage = ((report.summary.totalSharedAudioExisting / report.summary.totalSharedAudioExpected) * 100).toFixed(1)
    console.log(`  Shared audio: ${report.summary.totalSharedAudioExisting}/${report.summary.totalSharedAudioExpected} (${sharedCoverage}%)`)
  }

  console.log('')
  console.log(`  Generated: ${report.generatedAt}`)
  console.log('═══════════════════════════════════════════════════════════════════')
}

main()
