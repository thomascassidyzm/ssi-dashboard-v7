#!/usr/bin/env node
/**
 * QA Assessment for eng_for_X Courses
 *
 * Samples phrases from all eng_for_X courses and identifies common issues.
 * Focuses on English (target) naturalness.
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

// Common issues to detect (simple heuristics)
const ISSUE_PATTERNS = [
  { name: 'Missing apostrophe', regex: /\bits\b(?!\s*[''])/i, description: "its instead of it's" },
  { name: 'Double question word', regex: /how do you say it/i, description: "how do you say it (should be 'how to say it')" },
  { name: 'Missing article', regex: /\b(is|was|be)\s+(good|bad|important|difficult)\s+to\b/i, description: "Missing 'a' before adjective" },
  { name: 'Dangling preposition', regex: /\bto\s*$/i, description: "Sentence ends with 'to'" },
  { name: 'Incomplete phrase', regex: /\bas if\s*$/i, description: "Incomplete 'as if' construction" },
  { name: 'Contradictory', regex: /differently.*same|same.*differently/i, description: "Contradictory statement" },
  { name: 'Missing object', regex: /how to say\s+(in|for|with)\b/i, description: "Missing object after 'how to say'" },
  { name: 'Awkward gerund', regex: /when (waking|sleeping|eating|drinking)\s+up/i, description: "Awkward gerund construction" },
]

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
 * Check phrase for common issues
 */
function checkPhrase(englishText) {
  const issues = []
  for (const pattern of ISSUE_PATTERNS) {
    if (pattern.regex.test(englishText)) {
      issues.push(pattern)
    }
  }
  return issues
}

/**
 * Sample and assess phrases from a course
 */
async function assessCourse(courseCode, sampleSize = 50) {
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .limit(1000)

  if (error) throw error
  if (!phrases || phrases.length === 0) {
    return { courseCode, totalPhrases: 0, sampled: 0, issues: [] }
  }

  // Filter for LONG phrases (≥5 syllables in English target)
  const longPhrases = phrases.filter(p => countSyllables(p.target_text) >= 5)

  // Shuffle and sample
  const shuffled = longPhrases.sort(() => Math.random() - 0.5)
  const sample = shuffled.slice(0, sampleSize)

  // Check each phrase
  const issuesFound = []
  for (const p of sample) {
    const issues = checkPhrase(p.target_text)
    if (issues.length > 0) {
      issuesFound.push({
        seed: p.seed_number,
        lego: p.lego_index,
        known: p.known_text,
        target: p.target_text,
        issues: issues.map(i => i.name)
      })
    }
  }

  return {
    courseCode,
    totalPhrases: phrases.length,
    longPhrases: longPhrases.length,
    sampled: sample.length,
    issuesFound: issuesFound.length,
    issues: issuesFound
  }
}

async function main() {
  const engForXCourses = [
    'eng_for_ara', 'eng_for_deu', 'eng_for_fra',
    'eng_for_jpn', 'eng_for_por', 'eng_for_spa', 'eng_for_zho'
  ]

  console.log(`\n🔍 ENG_FOR_X COURSE QUALITY ASSESSMENT`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  console.log(`Sampling 50 LONG phrases (≥5 syllables) from each course...`)
  console.log(`Checking for common English naturalness issues...\n`)

  const results = []

  for (const course of engForXCourses) {
    const result = await assessCourse(course)
    results.push(result)

    console.log(`═══════════════════════════════════════════════════════════════════════════`)
    console.log(`  ${course}`)
    console.log(`  Total: ${result.totalPhrases} phrases | Long: ${result.longPhrases} | Sampled: ${result.sampled}`)
    console.log(`  Issues found in sample: ${result.issuesFound}/${result.sampled} (${Math.round(result.issuesFound/result.sampled*100)}%)`)
    console.log(`═══════════════════════════════════════════════════════════════════════════\n`)

    if (result.issues.length > 0) {
      for (const issue of result.issues.slice(0, 5)) {
        console.log(`  ❌ S${String(issue.seed).padStart(4, '0')}L${String(issue.lego).padStart(2, '0')}: [${issue.issues.join(', ')}]`)
        console.log(`     Target: "${issue.target}"`)
        console.log(`     Known:  "${issue.known}"`)
        console.log()
      }
      if (result.issues.length > 5) {
        console.log(`  ... and ${result.issues.length - 5} more issues\n`)
      }
    }
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  SUMMARY`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  console.log(`  Course          | Sampled | Pattern Issues | Rate`)
  console.log(`  ────────────────|─────────|────────────────|─────`)
  for (const r of results) {
    const rate = r.sampled > 0 ? Math.round(r.issuesFound/r.sampled*100) : 0
    console.log(`  ${r.courseCode.padEnd(15)} | ${String(r.sampled).padStart(7)} | ${String(r.issuesFound).padStart(14)} | ${rate}%`)
  }

  console.log(`\n  Note: This detects PATTERN-based issues only.`)
  console.log(`  Many naturalness issues require human judgment to detect.`)
  console.log(`  Consider running full QA agents for deeper assessment.\n`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
