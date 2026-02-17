#!/usr/bin/env node
/**
 * QA Phrase Sampler
 *
 * Pulls random practice phrases from courses for quality comparison.
 * Focuses on LONG phrases (≥5 syllables) since those must be NATURAL.
 *
 * Usage:
 *   node scripts/qa-phrase-sampler.cjs [course_code] [sample_size]
 *   node scripts/qa-phrase-sampler.cjs --compare  # Compare X_for_eng vs eng_for_X
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})

/**
 * Estimate syllable count for English text (simple heuristic)
 */
function countSyllables(text) {
  if (!text) return 0
  // Simple heuristic: count vowel groups
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  let total = 0
  for (const word of words) {
    if (!word) continue
    // Count vowel groups
    const matches = word.match(/[aeiouy]+/g)
    let count = matches ? matches.length : 1
    // Adjust for silent e
    if (word.endsWith('e') && count > 1) count--
    // Minimum 1 syllable per word
    total += Math.max(1, count)
  }
  return total
}

/**
 * Sample random phrases from a course
 */
async function samplePhrases(courseCode, sampleSize = 50, minSyllables = 5) {
  // Get random phrases
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .limit(500) // Get a pool to sample from

  if (error) throw error
  if (!phrases || phrases.length === 0) {
    console.log(`  No phrases found for ${courseCode}`)
    return []
  }

  // For eng_for_X courses, count syllables in TARGET (English)
  // For X_for_eng courses, count syllables in KNOWN (English)
  const isEngForX = courseCode.startsWith('eng_for_')
  const textToCount = isEngForX ? 'target_text' : 'known_text'

  // Filter for LONG phrases (≥ minSyllables in English)
  const longPhrases = phrases.filter(p => {
    const syllables = countSyllables(p[textToCount])
    return syllables >= minSyllables
  })

  // Shuffle and take sample
  const shuffled = longPhrases.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, sampleSize).map(p => ({
    ...p,
    syllables: countSyllables(p[textToCount]),
    isEngForX
  }))
}

/**
 * Display phrases with formatting
 */
function displayPhrases(courseCode, phrases, label) {
  console.log()
  console.log(`═══════════════════════════════════════════════════════════════════════════`)
  console.log(`  ${label}: ${courseCode}`)
  console.log(`  Sample: ${phrases.length} LONG phrases (≥5 syllables)`)
  console.log(`═══════════════════════════════════════════════════════════════════════════`)
  console.log()

  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i]
    console.log(`  ${String(i + 1).padStart(2)}. [${p.syllables} syl] S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`)
    console.log(`      Known:  "${p.known_text}"`)
    console.log(`      Target: "${p.target_text}"`)
    console.log()
  }
}

/**
 * Compare courses side by side
 */
async function compareCourseSamples(xForEngCode, engForXCode, sampleSize = 20) {
  console.log(`\n📊 Comparing phrase quality...\n`)
  console.log(`  X_for_eng example: ${xForEngCode} (English is KNOWN language)`)
  console.log(`  eng_for_X example: ${engForXCode} (English is TARGET language)`)
  console.log()

  const [xForEngSamples, engForXSamples] = await Promise.all([
    samplePhrases(xForEngCode, sampleSize),
    samplePhrases(engForXCode, sampleSize)
  ])

  displayPhrases(xForEngCode, xForEngSamples, 'GOOD EXAMPLE (X_for_eng)')
  displayPhrases(engForXCode, engForXSamples, 'NEEDS ASSESSMENT (eng_for_X)')

  // Summary
  console.log(`═══════════════════════════════════════════════════════════════════════════`)
  console.log(`  COMPARISON SUMMARY`)
  console.log(`═══════════════════════════════════════════════════════════════════════════`)
  console.log()
  console.log(`  For ${xForEngCode}:`)
  console.log(`    - English (known) is written by us for English speakers`)
  console.log(`    - Target language was generated/translated`)
  console.log()
  console.log(`  For ${engForXCode}:`)
  console.log(`    - Known language is ${engForXCode.replace('eng_for_', '').toUpperCase()}`)
  console.log(`    - English (target) was generated/translated`)
  console.log(`    - Check: Does the English sound natural?`)
  console.log(`    - Check: Does the known language sound natural to a native?`)
  console.log()
}

/**
 * Run full comparison across multiple courses
 */
async function fullComparison() {
  console.log(`\n🔍 FULL COURSE QUALITY COMPARISON`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  // Good X_for_eng examples
  const goodExamples = ['fra_for_eng', 'spa_for_eng', 'ita_for_eng', 'por_for_eng', 'zho_for_eng']

  // eng_for_X courses to assess
  const engForX = ['eng_for_spa', 'eng_for_fra', 'eng_for_por', 'eng_for_deu', 'eng_for_jpn', 'eng_for_ara', 'eng_for_zho']

  console.log(`Good examples (X_for_eng): ${goodExamples.join(', ')}`)
  console.log(`Needs assessment (eng_for_X): ${engForX.join(', ')}`)
  console.log()

  // Sample 10 phrases from each for quick comparison
  for (const course of [...goodExamples.slice(0, 2), ...engForX.slice(0, 2)]) {
    const samples = await samplePhrases(course, 10)
    displayPhrases(course, samples, course.includes('eng_for_') ? 'ASSESS' : 'REFERENCE')
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--compare') {
    // Quick comparison mode
    const xForEng = args[1] || 'spa_for_eng'
    const engForX = args[2] || 'eng_for_spa'
    await compareCourseSamples(xForEng, engForX)
  } else if (args[0] === '--full') {
    // Full comparison
    await fullComparison()
  } else if (args[0]) {
    // Single course
    const courseCode = args[0]
    const sampleSize = parseInt(args[1]) || 50
    const samples = await samplePhrases(courseCode, sampleSize)
    displayPhrases(courseCode, samples, 'SAMPLE')
  } else {
    // Default: compare spa_for_eng vs eng_for_spa
    await compareCourseSamples('spa_for_eng', 'eng_for_spa', 15)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
