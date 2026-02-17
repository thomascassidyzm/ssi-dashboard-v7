/**
 * Vocabulary Balance Analysis
 *
 * Analyzes how evenly LEGOs are distributed across practice phrases.
 * Identifies underused and overused LEGOs for balanced learning exposure.
 *
 * Analysis Metrics:
 * - Phrase count per LEGO (average, std dev, min, max)
 * - Most/least used LEGOs (top 10, bottom 10)
 * - Distribution outliers (< 3 appearances = underused, > 15 = overused)
 * - Gini coefficient (inequality measure)
 *
 * Output: JSON report at scripts/quality-reports/vocabulary-balance.json
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Courses to analyze
const COURSES = [
  { code: 'deu_for_eng', expectedLegos: 1194, expectedPhrases: 9279 },
  { code: 'ara_for_eng', expectedLegos: 1078, expectedPhrases: 9058 },
  { code: 'bre_for_fra', expectedLegos: 895, expectedPhrases: 8591 },
  { code: 'cym_s_for_eng', expectedLegos: 679, expectedPhrases: 6021 },
  { code: 'cym_n_for_eng', expectedLegos: 635, expectedPhrases: 5797 }
]

/**
 * Calculate Gini coefficient (measure of inequality)
 * 0 = perfect equality, 1 = perfect inequality
 *
 * @param {Array<number>} values - Array of phrase counts
 * @returns {number} Gini coefficient (0-1)
 */
function calculateGini(values) {
  if (values.length === 0) return 0

  // Sort values
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  // Calculate Gini
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += (2 * (i + 1) - n - 1) * sorted[i]
  }

  const mean = sorted.reduce((acc, val) => acc + val, 0) / n
  const gini = sum / (n * n * mean)

  return gini
}

/**
 * Calculate standard deviation
 *
 * @param {Array<number>} values
 * @param {number} mean
 * @returns {number}
 */
function calculateStdDev(values, mean) {
  if (values.length === 0) return 0
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Analyze vocabulary balance for a single course
 *
 * @param {string} courseCode
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeCourseBalance(courseCode) {
  console.log(`\nAnalyzing ${courseCode}...`)

  // 1. Get all LEGOs for this course
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')

  if (legosError) {
    console.error(`Error fetching LEGOs for ${courseCode}:`, legosError)
    return null
  }

  console.log(`  Found ${legos.length} LEGOs`)

  // 2. Get all practice phrases for this course
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('target_text')
    .eq('course_code', courseCode)

  if (phrasesError) {
    console.error(`Error fetching phrases for ${courseCode}:`, phrasesError)
    return null
  }

  console.log(`  Found ${phrases.length} practice phrases`)

  // 3. Count phrase appearances per LEGO using database relationships
  // Query practice phrases with their LEGO associations
  const { data: phraseRelations, error: relationsError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)

  if (relationsError) {
    console.error(`Error fetching phrase relations for ${courseCode}:`, relationsError)
    return null
  }

  // Count phrases per LEGO using the database relationships
  const legoUsage = new Map()

  for (const lego of legos) {
    const legoKey = `S${String(lego.seed_number).padStart(4, '0')}-L${lego.lego_index}`

    // Count phrases that reference this specific LEGO
    const count = phraseRelations.filter(p =>
      p.seed_number === lego.seed_number && p.lego_index === lego.lego_index
    ).length

    legoUsage.set(legoKey, {
      seed_number: lego.seed_number,
      lego_index: lego.lego_index,
      known_text: lego.known_text,
      target_text: lego.target_text,
      phrase_count: count
    })
  }

  // 4. Calculate statistics
  const phraseCounts = Array.from(legoUsage.values()).map(l => l.phrase_count)
  const totalPhrases = phraseCounts.reduce((acc, val) => acc + val, 0)
  const averagePhrases = totalPhrases / phraseCounts.length
  const stdDev = calculateStdDev(phraseCounts, averagePhrases)
  const minPhrases = Math.min(...phraseCounts)
  const maxPhrases = Math.max(...phraseCounts)
  const gini = calculateGini(phraseCounts)

  // 5. Identify outliers
  const underused = Array.from(legoUsage.entries())
    .filter(([_, data]) => data.phrase_count < 3)
    .sort((a, b) => a[1].phrase_count - b[1].phrase_count)
    .slice(0, 10)
    .map(([key, data]) => ({ lego: key, ...data }))

  const overused = Array.from(legoUsage.entries())
    .filter(([_, data]) => data.phrase_count > 15)
    .sort((a, b) => b[1].phrase_count - a[1].phrase_count)
    .slice(0, 10)
    .map(([key, data]) => ({ lego: key, ...data }))

  // 6. Top 10 most used
  const mostUsed = Array.from(legoUsage.entries())
    .sort((a, b) => b[1].phrase_count - a[1].phrase_count)
    .slice(0, 10)
    .map(([key, data]) => ({ lego: key, ...data }))

  // 7. Bottom 10 least used
  const leastUsed = Array.from(legoUsage.entries())
    .sort((a, b) => a[1].phrase_count - b[1].phrase_count)
    .slice(0, 10)
    .map(([key, data]) => ({ lego: key, ...data }))

  // 8. Calculate percentages
  const underusedCount = Array.from(legoUsage.values()).filter(l => l.phrase_count < 3).length
  const overusedCount = Array.from(legoUsage.values()).filter(l => l.phrase_count > 15).length
  const underusedPercent = (underusedCount / legos.length) * 100
  const overusedPercent = (overusedCount / legos.length) * 100

  console.log(`  Average phrases per LEGO: ${averagePhrases.toFixed(2)}`)
  console.log(`  Standard deviation: ${stdDev.toFixed(2)}`)
  console.log(`  Gini coefficient: ${gini.toFixed(3)}`)
  console.log(`  Underused LEGOs (< 3): ${underusedCount} (${underusedPercent.toFixed(1)}%)`)
  console.log(`  Overused LEGOs (> 15): ${overusedCount} (${overusedPercent.toFixed(1)}%)`)

  return {
    course_code: courseCode,
    total_legos: legos.length,
    total_phrases: phrases.length,
    statistics: {
      average_phrases_per_lego: parseFloat(averagePhrases.toFixed(2)),
      standard_deviation: parseFloat(stdDev.toFixed(2)),
      min_phrases: minPhrases,
      max_phrases: maxPhrases,
      gini_coefficient: parseFloat(gini.toFixed(3))
    },
    distribution: {
      underused_count: underusedCount,
      underused_percent: parseFloat(underusedPercent.toFixed(2)),
      overused_count: overusedCount,
      overused_percent: parseFloat(overusedPercent.toFixed(2))
    },
    most_used: mostUsed,
    least_used: leastUsed,
    underused_legos: underused,
    overused_legos: overused
  }
}

/**
 * Generate recommendations based on analysis
 *
 * @param {Array<Object>} results
 * @returns {Object} Recommendations
 */
function generateRecommendations(results) {
  const recommendations = {
    overall: [],
    per_course: {}
  }

  for (const result of results) {
    if (!result) continue

    const courseRecs = []

    // Check Gini coefficient (> 0.3 suggests significant inequality)
    if (result.statistics.gini_coefficient > 0.3) {
      courseRecs.push({
        severity: 'warning',
        issue: 'high_inequality',
        message: `High inequality in LEGO usage (Gini: ${result.statistics.gini_coefficient}). Some LEGOs get far more practice than others.`
      })
    }

    // Check underused LEGOs
    if (result.distribution.underused_percent > 20) {
      courseRecs.push({
        severity: 'error',
        issue: 'many_underused',
        message: `${result.distribution.underused_percent}% of LEGOs appear in fewer than 3 phrases. Learners won't get enough exposure.`
      })
    } else if (result.distribution.underused_percent > 10) {
      courseRecs.push({
        severity: 'warning',
        issue: 'some_underused',
        message: `${result.distribution.underused_percent}% of LEGOs appear in fewer than 3 phrases. Consider adding more practice.`
      })
    }

    // Check overused LEGOs
    if (result.distribution.overused_percent > 15) {
      courseRecs.push({
        severity: 'warning',
        issue: 'many_overused',
        message: `${result.distribution.overused_percent}% of LEGOs appear in more than 15 phrases. May create repetition fatigue.`
      })
    }

    // Check standard deviation (high SD = uneven distribution)
    if (result.statistics.standard_deviation > result.statistics.average_phrases_per_lego) {
      courseRecs.push({
        severity: 'info',
        issue: 'high_variance',
        message: `High variance in phrase distribution (SD: ${result.statistics.standard_deviation}). Some LEGOs dominate while others are neglected.`
      })
    }

    recommendations.per_course[result.course_code] = courseRecs
  }

  // Overall recommendations
  const avgGini = results.reduce((acc, r) => acc + (r?.statistics.gini_coefficient || 0), 0) / results.length
  if (avgGini > 0.3) {
    recommendations.overall.push({
      severity: 'warning',
      message: `Average Gini coefficient across courses is ${avgGini.toFixed(3)}, suggesting systematic inequality in vocabulary exposure.`
    })
  }

  return recommendations
}

/**
 * Main execution
 */
async function main() {
  console.log('=== SSi Vocabulary Balance Analysis ===\n')
  console.log('Analyzing LEGO distribution across practice phrases...')

  const results = []

  // Analyze each course
  for (const course of COURSES) {
    const result = await analyzeCourseBalance(course.code)
    if (result) {
      results.push(result)
    }
  }

  // Generate recommendations
  const recommendations = generateRecommendations(results)

  // Create final report
  const report = {
    generated_at: new Date().toISOString(),
    analysis_type: 'vocabulary_balance',
    description: 'Analysis of LEGO distribution across practice phrases to ensure balanced vocabulary exposure',
    courses_analyzed: results.length,
    results,
    recommendations,
    interpretation: {
      gini_coefficient: {
        description: 'Measure of inequality (0 = perfect equality, 1 = perfect inequality)',
        thresholds: {
          excellent: '< 0.2',
          good: '0.2 - 0.3',
          concerning: '0.3 - 0.4',
          poor: '> 0.4'
        }
      },
      standard_deviation: {
        description: 'Measure of spread in phrase counts',
        interpretation: 'Lower is better. High SD means some LEGOs appear much more than others.'
      },
      underused_threshold: '< 3 phrase appearances',
      overused_threshold: '> 15 phrase appearances'
    }
  }

  // Write report to file
  const outputPath = path.join(__dirname, 'quality-reports', 'vocabulary-balance.json')
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))

  console.log('\n=== Analysis Complete ===')
  console.log(`Report saved to: ${outputPath}`)
  console.log(`\nSummary:`)
  console.log(`  Courses analyzed: ${results.length}`)
  console.log(`  Total LEGOs: ${results.reduce((acc, r) => acc + r.total_legos, 0)}`)
  console.log(`  Total phrases: ${results.reduce((acc, r) => acc + r.total_phrases, 0)}`)
  console.log(`  Average Gini: ${(results.reduce((acc, r) => acc + r.statistics.gini_coefficient, 0) / results.length).toFixed(3)}`)

  // Print key findings
  console.log('\nKey Findings:')
  for (const result of results) {
    const recs = recommendations.per_course[result.course_code]
    if (recs && recs.length > 0) {
      console.log(`\n  ${result.course_code}:`)
      for (const rec of recs) {
        console.log(`    [${rec.severity.toUpperCase()}] ${rec.message}`)
      }
    }
  }

  if (recommendations.overall.length > 0) {
    console.log('\n  Overall:')
    for (const rec of recommendations.overall) {
      console.log(`    [${rec.severity.toUpperCase()}] ${rec.message}`)
    }
  }
}

// Run analysis
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
