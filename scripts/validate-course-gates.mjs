/**
 * Course Gate Validation Script (Language-Aware)
 *
 * Validates a course against quality gates:
 * - REJECT if phrase uses vocab not already introduced (LEGOs or M-type components)
 * - REJECT if <7 phrases (after first 5 seeds)
 * - FLAG if <10 phrases
 * - FLAG if no long phrases (10+ syllables)
 *
 * Supports: European languages (word-based) and Chinese (character-based)
 *
 * Usage: node scripts/validate-course-gates.mjs [course_code]
 * Default: zho_for_eng
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
const COURSE_CODE = process.argv[2] || 'zho_for_eng'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Detect if course is Chinese-based
function isChinese(courseCode) {
  return courseCode.startsWith('zho') || courseCode.includes('_zho')
}

// Normalize text for comparison
function normalize(text, chinese = false) {
  if (!text) return ''
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/[¿¡.,;:!?'"«»""''。，！？、：；""'']/g, '')  // Punctuation (incl Chinese)
    .trim()

  if (!chinese) {
    normalized = normalized.replace(/\s+/g, ' ')  // Collapse spaces
  }
  return normalized
}

// Extract vocabulary units from text
function extractVocab(text, chinese = false) {
  const normalized = normalize(text, chinese)
  if (chinese) {
    // Chinese: each character is a vocab unit
    return [...normalized].filter(c => c.trim() && !c.match(/\s/))
  } else {
    // European: each word is a vocab unit
    return normalized.split(/\s+/).filter(w => w)
  }
}

// Count syllables (language-aware)
function countSyllables(text, chinese = false) {
  if (chinese) {
    // Chinese: ~1 syllable per character
    const chars = [...normalize(text, true)].filter(c => c.trim() && !c.match(/\s/))
    return chars.length
  } else {
    // European: vowel groups
    const words = text.toLowerCase().split(/\s+/)
    let total = 0
    for (const word of words) {
      const vowelGroups = word.match(/[aeiouáéíóúâêôãõàüäöü]+/gi) || []
      total += Math.max(1, vowelGroups.length)
    }
    return total
  }
}

async function main() {
  const chinese = isChinese(COURSE_CODE)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`VALIDATING: ${COURSE_CODE}`)
  console.log(`Mode: ${chinese ? 'Chinese (character-based)' : 'European (word-based)'}`)
  console.log('═'.repeat(60))

  // Load all LEGOs
  const { data: legos, error: legoErr } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', COURSE_CODE)
    .order('seed_number')
    .order('lego_index')

  if (legoErr) {
    console.error('Error loading LEGOs:', legoErr)
    return
  }

  // Load all phrases
  const { data: phrases, error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', COURSE_CODE)

  if (phraseErr) {
    console.error('Error loading phrases:', phraseErr)
    return
  }

  console.log(`\nLoaded ${legos.length} LEGOs and ${phrases.length} phrases\n`)

  // Build vocabulary set (cumulative as we process LEGOs in order)
  const vocabSet = new Set()
  const results = { passed: [], rejected: [], flagged: [] }
  let globalLegoPosition = 0

  for (const lego of legos) {
    globalLegoPosition++
    const legoKey = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
    const issues = []
    const warnings = []

    // FIRST: Add this LEGO's vocab (so its phrases can use it)
    const legoVocab = extractVocab(lego.target_text, chinese)
    legoVocab.forEach(v => vocabSet.add(v))

    // Also add components if M-type (these become available vocabulary)
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        const compVocab = extractVocab(comp.target, chinese)
        compVocab.forEach(v => vocabSet.add(v))
      }
    }

    // Get phrases for this LEGO
    const legoPhrases = phrases.filter(
      p => p.seed_number === lego.seed_number && p.lego_index === lego.lego_index
    )

    // Check each phrase for vocab violations
    for (const phrase of legoPhrases) {
      const phraseVocab = extractVocab(phrase.target_text, chinese)
      const unknownVocab = phraseVocab.filter(v => !vocabSet.has(v))
      if (unknownVocab.length > 0) {
        const display = chinese ? unknownVocab.join('') : unknownVocab.join(', ')
        issues.push(`VOCAB VIOLATION: "${display}" in "${phrase.target_text}"`)
      }
    }

    // Check phrase count (graduated threshold for early LEGOs)
    let minRequired = 7
    if (globalLegoPosition <= 3) minRequired = 1
    else if (globalLegoPosition <= 6) minRequired = 2
    else if (globalLegoPosition <= 10) minRequired = 3

    if (legoPhrases.length < minRequired) {
      issues.push(`Only ${legoPhrases.length} phrases (MIN: ${minRequired} at position ${globalLegoPosition})`)
    } else if (legoPhrases.length < 7 && globalLegoPosition > 10) {
      issues.push(`Only ${legoPhrases.length} phrases (MIN: 7)`)
    } else if (legoPhrases.length < 10 && globalLegoPosition > 10) {
      warnings.push(`Only ${legoPhrases.length} phrases (TARGET: 10)`)
    }

    // Check syllable distribution (after position 10)
    if (globalLegoPosition > 10) {
      const syllableCounts = legoPhrases.map(p => countSyllables(p.target_text, chinese))
      const maxSyllables = Math.max(...syllableCounts, 0)

      if (maxSyllables < 10) {
        warnings.push(`No long phrases (max ${maxSyllables} syl, need 10+)`)
      }
    }

    // Categorize result
    if (issues.length > 0) {
      results.rejected.push({
        legoKey,
        position: globalLegoPosition,
        lego: lego.target_text,
        known: lego.known_text,
        issues,
        warnings,
        phraseCount: legoPhrases.length
      })
    } else if (warnings.length > 0) {
      results.flagged.push({
        legoKey,
        position: globalLegoPosition,
        lego: lego.target_text,
        known: lego.known_text,
        warnings,
        phraseCount: legoPhrases.length
      })
    } else {
      results.passed.push({
        legoKey,
        position: globalLegoPosition,
        lego: lego.target_text,
        known: lego.known_text,
        phraseCount: legoPhrases.length
      })
    }
  }

  // Output results
  console.log('═'.repeat(60))
  console.log('GATE VALIDATION RESULTS')
  console.log('═'.repeat(60))

  const passRate = ((results.passed.length / legos.length) * 100).toFixed(1)
  console.log(`✓ PASSED:   ${results.passed.length} (${passRate}%)`)
  console.log(`⚠ FLAGGED:  ${results.flagged.length}`)
  console.log(`✗ REJECTED: ${results.rejected.length}`)

  if (results.rejected.length > 0) {
    console.log('\n' + '─'.repeat(60))
    console.log('REJECTED (must fix)')
    console.log('─'.repeat(60))
    for (const r of results.rejected.slice(0, 20)) {  // Show first 20
      console.log(`\n${r.legoKey} [pos ${r.position}]: ${r.lego} "${r.known}" (${r.phraseCount} phr)`)
      r.issues.forEach(i => console.log(`  ✗ ${i}`))
    }
    if (results.rejected.length > 20) {
      console.log(`\n... and ${results.rejected.length - 20} more rejected`)
    }
  }

  if (results.flagged.length > 0) {
    console.log('\n' + '─'.repeat(60))
    console.log('FLAGGED (should improve)')
    console.log('─'.repeat(60))
    for (const f of results.flagged.slice(0, 10)) {  // Show first 10
      console.log(`\n${f.legoKey} [pos ${f.position}]: ${f.lego} "${f.known}" (${f.phraseCount} phr)`)
      f.warnings.forEach(w => console.log(`  ⚠ ${w}`))
    }
    if (results.flagged.length > 10) {
      console.log(`\n... and ${results.flagged.length - 10} more flagged`)
    }
  }

  // Summary stats
  const totalPhrases = phrases.length
  const avgPhrases = legos.length > 0 ? (totalPhrases / legos.length).toFixed(1) : 0

  console.log('\n' + '═'.repeat(60))
  console.log('SUMMARY')
  console.log('═'.repeat(60))
  console.log(`Course:           ${COURSE_CODE}`)
  console.log(`Total LEGOs:      ${legos.length}`)
  console.log(`Total phrases:    ${totalPhrases}`)
  console.log(`Avg phrases/LEGO: ${avgPhrases}`)
  console.log(`Vocabulary size:  ${vocabSet.size} ${chinese ? 'characters' : 'words'}`)
  console.log(`Pass rate:        ${passRate}%`)

  // Quality verdict
  console.log('\n' + '═'.repeat(60))
  if (results.rejected.length === 0 && parseFloat(avgPhrases) >= 7) {
    console.log('✓ QUALITY: PASS - Course ready for audio generation')
  } else if (results.rejected.length === 0) {
    console.log('⚠ QUALITY: MARGINAL - No rejections but low phrase ratio')
  } else {
    console.log(`✗ QUALITY: FAIL - ${results.rejected.length} LEGOs need fixing`)
  }
  console.log('═'.repeat(60))
}

main().catch(console.error)
