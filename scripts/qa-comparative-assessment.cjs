#!/usr/bin/env node
/**
 * QA Comparative Assessment
 *
 * Compares phrase quality between X_for_eng and eng_for_X courses
 * using the checkpoint QA scoring system (1-9 scale).
 *
 * Outputs samples in a format suitable for QA agent scoring.
 *
 * Usage:
 *   node scripts/qa-comparative-assessment.cjs --prepare   # Prepare samples for QA
 *   node scripts/qa-comparative-assessment.cjs --report    # View existing results
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
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

const OUTPUT_DIR = path.join(__dirname, 'qa-comparison')

// Course groups for comparison
const COURSE_GROUPS = {
  x_for_eng: {
    label: 'X for English Speakers (Reference)',
    courses: ['fra_for_eng', 'spa_for_eng', 'ita_for_eng', 'por_for_eng', 'zho_for_eng',
              'deu_for_eng', 'jpn_for_eng', 'kor_for_eng', 'nld_for_eng', 'ara_for_eng']
  },
  eng_for_x: {
    label: 'English for X Speakers (Assessment)',
    courses: ['eng_for_ara', 'eng_for_deu', 'eng_for_fra', 'eng_for_jpn',
              'eng_for_por', 'eng_for_spa', 'eng_for_zho']
  }
}

const SAMPLE_SIZE = 50  // Phrases per course

/**
 * Count syllables in English text
 */
function countSyllables(text) {
  if (!text) return 0
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
  let total = 0
  for (const word of words) {
    if (!word) continue
    const matches = word.match(/[aeiouy]+/g)
    let count = matches ? matches.length : 1
    if (word.endsWith('e') && count > 1) count--
    total += Math.max(1, count)
  }
  return total
}

/**
 * Classify phrase as BUILD or USE based on syllable count
 */
function classifyPhrase(syllables) {
  return syllables < 5 ? 'BUILD' : 'USE'
}

/**
 * Sample phrases from a course
 */
async function sampleCourse(courseCode, sampleSize) {
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .limit(1000)

  if (error) throw error
  if (!phrases || phrases.length === 0) return null

  // For eng_for_X: English is in target_text
  // For X_for_eng: English is in known_text
  const isEngForX = courseCode.startsWith('eng_for_')
  const englishField = isEngForX ? 'target_text' : 'known_text'
  const otherField = isEngForX ? 'known_text' : 'target_text'

  // Calculate syllables and classify
  const classified = phrases.map(p => {
    const englishText = p[englishField]
    const syllables = countSyllables(englishText)
    return {
      ...p,
      english_text: englishText,
      other_text: p[otherField],
      syllables,
      classification: classifyPhrase(syllables),
      is_eng_for_x: isEngForX
    }
  })

  // Sample: prefer USE phrases (≥5 syllables) but include some BUILD
  const usePhrases = classified.filter(p => p.classification === 'USE')
  const buildPhrases = classified.filter(p => p.classification === 'BUILD')

  // 80% USE, 20% BUILD
  const useCount = Math.floor(sampleSize * 0.8)
  const buildCount = sampleSize - useCount

  const shuffledUse = usePhrases.sort(() => Math.random() - 0.5)
  const shuffledBuild = buildPhrases.sort(() => Math.random() - 0.5)

  const sample = [
    ...shuffledUse.slice(0, useCount),
    ...shuffledBuild.slice(0, buildCount)
  ].sort(() => Math.random() - 0.5)  // Shuffle final sample

  return {
    course_code: courseCode,
    is_eng_for_x: isEngForX,
    total_phrases: phrases.length,
    use_count: usePhrases.length,
    build_count: buildPhrases.length,
    sample_size: sample.length,
    phrases: sample.map((p, idx) => ({
      idx: idx + 1,
      id: p.id,
      seed: p.seed_number,
      lego: p.lego_index,
      classification: p.classification,
      syllables: p.syllables,
      english: p.english_text,
      other: p.other_text,
      qa_score: null  // To be filled by QA agent
    }))
  }
}

/**
 * Prepare samples for all courses
 */
async function prepareSamples() {
  console.log('\n📊 PREPARING QA COMPARISON SAMPLES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const allSamples = {
    generated_at: new Date().toISOString(),
    sample_size_per_course: SAMPLE_SIZE,
    scoring_scale: {
      9: 'Grammatically perfect, semantically excellent, high value in both languages',
      '7-8': 'Strong phrase, minor stylistic preferences possible',
      '5-6': 'Solid, functional, no issues but not remarkable',
      '3-4': 'Grammatically OK, but awkward/textbook-ish',
      '1-2': 'Grammatically OK, semantically questionable, low value'
    },
    quality_threshold: 7.0,
    groups: {}
  }

  for (const [groupKey, group] of Object.entries(COURSE_GROUPS)) {
    console.log(`\n═══ ${group.label} ═══\n`)
    allSamples.groups[groupKey] = {
      label: group.label,
      courses: {}
    }

    for (const courseCode of group.courses) {
      process.stdout.write(`  Sampling ${courseCode}... `)
      const sample = await sampleCourse(courseCode, SAMPLE_SIZE)

      if (sample) {
        allSamples.groups[groupKey].courses[courseCode] = sample
        console.log(`✓ ${sample.sample_size} phrases (${sample.use_count} USE available)`)
      } else {
        console.log(`✗ No phrases found`)
      }
    }
  }

  // Write master file
  const masterPath = path.join(OUTPUT_DIR, 'qa-samples.json')
  fs.writeFileSync(masterPath, JSON.stringify(allSamples, null, 2))
  console.log(`\n✅ Master samples written to: ${masterPath}`)

  // Write individual course files for parallel QA
  for (const [groupKey, group] of Object.entries(allSamples.groups)) {
    for (const [courseCode, sample] of Object.entries(group.courses)) {
      const coursePath = path.join(OUTPUT_DIR, `${courseCode}-sample.json`)
      fs.writeFileSync(coursePath, JSON.stringify({
        ...sample,
        scoring_instructions: `
Score each phrase on a 1-9 scale:
- 9: Perfect - native speakers would say this in both languages, flows naturally
- 7-8: Strong - minor stylistic preferences possible
- 5-6: Functional - no issues but not remarkable
- 3-4: Awkward - grammatically OK but textbook-ish
- 1-2: Marginal - technically correct but no one would say this

For each phrase, provide:
1. qa_score (1-9)
2. issues (array of strings, empty if none)

Focus on:
- Does the English sound natural?
- Does the ${courseCode.includes('eng_for_') ? 'known language' : 'target language'} sound natural?
- Would native speakers actually say this?
        `.trim()
      }, null, 2))
    }
  }
  console.log(`📁 Individual course files written to: ${OUTPUT_DIR}/`)

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  NEXT STEPS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`
  1. Review samples in ${OUTPUT_DIR}/

  2. Run QA agents to score samples:
     - Each course has a *-sample.json file
     - QA agent fills in qa_score and issues for each phrase
     - Save results as *-scored.json

  3. Generate comparison report:
     node scripts/qa-comparative-assessment.cjs --report
  `)
}

/**
 * Generate comparison report from scored samples
 */
async function generateReport() {
  console.log('\n📊 QA COMPARATIVE REPORT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const masterPath = path.join(OUTPUT_DIR, 'qa-samples.json')
  if (!fs.existsSync(masterPath)) {
    console.log('❌ No samples found. Run with --prepare first.')
    return
  }

  const samples = JSON.parse(fs.readFileSync(masterPath, 'utf8'))

  // Check for scored files
  const scoredFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('-scored.json'))

  if (scoredFiles.length === 0) {
    console.log('⚠️  No scored files found yet.')
    console.log('   QA agents need to score the *-sample.json files.')
    console.log('   Save scored results as *-scored.json')
    return
  }

  console.log(`Found ${scoredFiles.length} scored courses\n`)

  // Load and aggregate scores
  const results = {
    x_for_eng: { courses: [], avg_scores: [], use_avg: [], build_avg: [] },
    eng_for_x: { courses: [], avg_scores: [], use_avg: [], build_avg: [] }
  }

  for (const file of scoredFiles) {
    const scored = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf8'))
    const courseCode = scored.course_code
    const group = courseCode.startsWith('eng_for_') ? 'eng_for_x' : 'x_for_eng'

    const scores = scored.phrases.filter(p => p.qa_score).map(p => p.qa_score)
    const useScores = scored.phrases.filter(p => p.classification === 'USE' && p.qa_score).map(p => p.qa_score)
    const buildScores = scored.phrases.filter(p => p.classification === 'BUILD' && p.qa_score).map(p => p.qa_score)

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const useAvg = useScores.length ? useScores.reduce((a, b) => a + b, 0) / useScores.length : 0
    const buildAvg = buildScores.length ? buildScores.reduce((a, b) => a + b, 0) / buildScores.length : 0

    results[group].courses.push(courseCode)
    results[group].avg_scores.push(avg)
    results[group].use_avg.push(useAvg)
    results[group].build_avg.push(buildAvg)

    const status = avg >= 7.0 ? '✓ PASS' : '✗ FAIL'
    const useVsBuild = useAvg > buildAvg ? '✓' : '⚠️'

    console.log(`  ${courseCode.padEnd(15)} │ Avg: ${avg.toFixed(1)} ${status} │ USE: ${useAvg.toFixed(1)} vs BUILD: ${buildAvg.toFixed(1)} ${useVsBuild}`)
  }

  // Group summaries
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  GROUP COMPARISON')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const [groupKey, data] of Object.entries(results)) {
    if (data.avg_scores.length === 0) continue
    const groupAvg = data.avg_scores.reduce((a, b) => a + b, 0) / data.avg_scores.length
    const groupUse = data.use_avg.reduce((a, b) => a + b, 0) / data.use_avg.length
    const groupBuild = data.build_avg.reduce((a, b) => a + b, 0) / data.build_avg.length

    const label = groupKey === 'x_for_eng' ? 'X_for_eng (Reference)' : 'eng_for_X (Assessment)'
    console.log(`  ${label}`)
    console.log(`    Courses: ${data.courses.length}`)
    console.log(`    Overall Avg: ${groupAvg.toFixed(2)}`)
    console.log(`    USE Avg: ${groupUse.toFixed(2)}`)
    console.log(`    BUILD Avg: ${groupBuild.toFixed(2)}`)
    console.log()
  }

  // Quality gap
  if (results.x_for_eng.avg_scores.length > 0 && results.eng_for_x.avg_scores.length > 0) {
    const refAvg = results.x_for_eng.avg_scores.reduce((a, b) => a + b, 0) / results.x_for_eng.avg_scores.length
    const assessAvg = results.eng_for_x.avg_scores.reduce((a, b) => a + b, 0) / results.eng_for_x.avg_scores.length
    const gap = refAvg - assessAvg

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  QUALITY GAP')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`  Reference (X_for_eng): ${refAvg.toFixed(2)}`)
    console.log(`  Assessment (eng_for_X): ${assessAvg.toFixed(2)}`)
    console.log(`  Gap: ${gap > 0 ? '+' : ''}${gap.toFixed(2)} points`)
    console.log()
  }
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--prepare')) {
    await prepareSamples()
  } else if (args.includes('--report')) {
    await generateReport()
  } else {
    console.log(`
Usage:
  node scripts/qa-comparative-assessment.cjs --prepare   # Prepare samples for QA agents
  node scripts/qa-comparative-assessment.cjs --report    # Generate comparison report
    `)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
