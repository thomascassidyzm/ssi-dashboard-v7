#!/usr/bin/env node
/**
 * Cleanup GATE Violations Script
 *
 * Identifies and removes practice phrases that violate GATE (Grammar-Aware Target Extraction)
 * by using vocabulary the learner hasn't learned yet.
 *
 * Usage:
 *   node cleanup-gate-violations.cjs <courseCode> [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be deleted without actually deleting
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs-extra')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Normalize spelling variants (UK/US spelling)
function normalizeSpelling(word) {
  const ukToUs = {
    'colour': 'color', 'colours': 'colors',
    'favourite': 'favorite', 'favourites': 'favorites',
    'practise': 'practice', 'practising': 'practicing',
    'realise': 'realize', 'realising': 'realizing',
    'organise': 'organize', 'organising': 'organizing',
    'recognise': 'recognize', 'recognising': 'recognizing'
  }
  return ukToUs[word] || word
}

// Extract words from text (alphabetic languages only - doesn't handle Chinese)
// This matches the server's extractWords which only works for English/European languages
function extractWords(text) {
  if (!text) return []
  const matches = text.toLowerCase().match(/[\wáéíóúüñ]+/g)
  if (!matches) return []
  return matches.map(normalizeSpelling)
}

// Check if text contains CJK characters (Chinese, Japanese, Korean)
function isCJK(text) {
  return /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text)
}

async function cleanupGateViolations(courseCode, dryRun = true) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`GATE VIOLATIONS CLEANUP: ${courseCode}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : '⚠️  LIVE - WILL DELETE'}`)
  console.log(`${'='.repeat(60)}\n`)

  const vfsRoot = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses')
  const scaffoldsDir = path.join(vfsRoot, courseCode, 'phase3_scaffolds')

  // Check if scaffolds directory exists
  if (!await fs.pathExists(scaffoldsDir)) {
    console.error(`❌ Scaffolds directory not found: ${scaffoldsDir}`)
    console.log('   Run scaffold generation first (Phase 3 server start)')
    process.exit(1)
  }

  // Fetch all practice phrases from database
  console.log('Step 1: Fetching practice phrases from database...')
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true })
    .order('position', { ascending: true })

  if (error) {
    console.error('❌ Error fetching phrases:', error.message)
    process.exit(1)
  }

  console.log(`   Found ${phrases.length} practice phrases\n`)

  // Load all scaffolds (cache them by seed)
  console.log('Step 2: Loading scaffolds...')
  const scaffoldCache = new Map()
  const seedNumbers = [...new Set(phrases.map(p => p.seed_number))]
  let loadedCount = 0
  let missingCount = 0

  for (const seedNum of seedNumbers) {
    const seedId = `S${String(seedNum).padStart(4, '0')}`
    const scaffoldPath = path.join(scaffoldsDir, `${seedId}.json`)

    if (await fs.pathExists(scaffoldPath)) {
      const scaffold = await fs.readJson(scaffoldPath)
      scaffoldCache.set(seedNum, scaffold)
      loadedCount++
    } else {
      missingCount++
    }
  }

  console.log(`   Loaded ${loadedCount} scaffolds, ${missingCount} missing\n`)

  // Check each phrase for GATE violations
  console.log('Step 3: Checking for GATE violations...')
  const violations = []
  let checkedCount = 0
  let skippedCount = 0

  for (const phrase of phrases) {
    const scaffold = scaffoldCache.get(phrase.seed_number)
    if (!scaffold) {
      skippedCount++
      continue
    }

    const legoId = `S${String(phrase.seed_number).padStart(4, '0')}L${String(phrase.lego_index).padStart(2, '0')}`
    const legoScaffold = scaffold.legos?.[legoId]

    if (!legoScaffold || !legoScaffold.available_vocab) {
      skippedCount++
      continue
    }

    checkedCount++
    const availableVocab = legoScaffold.available_vocab

    // Build vocabulary sets
    const knownVocab = new Set(availableVocab.known.map(w => normalizeSpelling(w.toLowerCase())))
    const targetVocab = new Set(availableVocab.target.map(w => w.toLowerCase()))

    // Add the LEGO itself to vocabulary
    const legoKnown = legoScaffold.lego?.known || ''
    const legoTarget = legoScaffold.lego?.target || ''
    extractWords(legoKnown).forEach(w => knownVocab.add(w))
    extractWords(legoTarget).forEach(w => targetVocab.add(w))

    // Check known (English) words - always validate
    const knownWords = extractWords(phrase.known_text)
    const unknownKnown = knownWords.filter(w => !knownVocab.has(w))

    // Check target words - only for non-CJK languages
    // CJK languages (Chinese, Japanese, Korean) don't have word boundaries,
    // so word-by-word validation doesn't work. Skip target validation for CJK.
    let unknownTarget = []
    if (!isCJK(phrase.target_text)) {
      const targetWords = extractWords(phrase.target_text)
      unknownTarget = targetWords.filter(w => !targetVocab.has(w))
    }

    // Only flag as violation if there are unknown words in known (English)
    // Target violations are only counted for non-CJK languages
    if (unknownKnown.length > 0 || unknownTarget.length > 0) {
      violations.push({
        id: phrase.id,
        legoId,
        seedNumber: phrase.seed_number,
        legoIndex: phrase.lego_index,
        known: phrase.known_text,
        target: phrase.target_text,
        unknownKnown,
        unknownTarget
      })
    }
  }

  console.log(`   Checked: ${checkedCount}, Skipped: ${skippedCount}`)
  console.log(`   Violations found: ${violations.length}\n`)

  // Group violations by seed for reporting
  const violationsBySeed = new Map()
  for (const v of violations) {
    const seedKey = v.seedNumber
    if (!violationsBySeed.has(seedKey)) {
      violationsBySeed.set(seedKey, [])
    }
    violationsBySeed.get(seedKey).push(v)
  }

  // Report violations
  if (violations.length > 0) {
    console.log(`${'─'.repeat(60)}`)
    console.log('VIOLATIONS BY SEED (first 10 seeds)')
    console.log(`${'─'.repeat(60)}`)

    const sortedSeeds = [...violationsBySeed.keys()].sort((a, b) => a - b)
    for (const seedNum of sortedSeeds.slice(0, 10)) {
      const seedViolations = violationsBySeed.get(seedNum)
      const seedId = `S${String(seedNum).padStart(4, '0')}`
      console.log(`\n${seedId}: ${seedViolations.length} violations`)

      for (const v of seedViolations.slice(0, 3)) {
        console.log(`   ${v.legoId}: "${v.known.substring(0, 40)}..."`)
        if (v.unknownKnown.length > 0) {
          console.log(`      Unknown (EN): ${v.unknownKnown.join(', ')}`)
        }
        if (v.unknownTarget.length > 0) {
          console.log(`      Unknown (TL): ${v.unknownTarget.slice(0, 5).join(', ')}${v.unknownTarget.length > 5 ? '...' : ''}`)
        }
      }
      if (seedViolations.length > 3) {
        console.log(`   ... and ${seedViolations.length - 3} more`)
      }
    }

    if (sortedSeeds.length > 10) {
      console.log(`\n... and ${sortedSeeds.length - 10} more seeds with violations`)
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`)
  console.log('SUMMARY')
  console.log(`${'─'.repeat(60)}`)
  console.log(`Total phrases:     ${phrases.length}`)
  console.log(`Checked:           ${checkedCount}`)
  console.log(`Skipped (no data): ${skippedCount}`)
  console.log(`GATE violations:   ${violations.length} (${(violations.length / checkedCount * 100).toFixed(1)}%)`)

  // Delete violations if not dry run
  if (violations.length > 0 && !dryRun) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('DELETING VIOLATIONS')
    console.log(`${'─'.repeat(60)}`)

    const idsToDelete = violations.map(v => v.id)

    // Delete in batches of 100
    let deleted = 0
    const batchSize = 100
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize)
      const { error: deleteError } = await supabase
        .from('course_practice_phrases')
        .delete()
        .in('id', batch)

      if (deleteError) {
        console.error(`   Batch ${Math.floor(i / batchSize) + 1} failed:`, deleteError.message)
      } else {
        deleted += batch.length
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} phrases`)
      }
    }

    console.log(`\n✅ Deleted ${deleted} phrases with GATE violations`)
    console.log('   Run Phase 3 to regenerate baskets for affected LEGOs')
  } else if (violations.length > 0 && dryRun) {
    console.log(`\n⚠️  DRY RUN - No changes made`)
    console.log(`   Run with --execute to delete ${violations.length} violating phrases`)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('CLEANUP COMPLETE')
  console.log(`${'='.repeat(60)}\n`)

  return {
    total: phrases.length,
    checked: checkedCount,
    violations: violations.length,
    violationRate: (violations.length / checkedCount * 100).toFixed(1) + '%'
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2)
  const courseCode = args.find(a => !a.startsWith('--'))
  const dryRun = !args.includes('--execute')

  if (!courseCode) {
    console.log('Usage: node cleanup-gate-violations.cjs <courseCode> [--execute]')
    console.log('')
    console.log('Options:')
    console.log('  --execute  Actually delete violations (default is dry-run)')
    console.log('')
    console.log('Example:')
    console.log('  node cleanup-gate-violations.cjs zho_for_eng          # Dry run')
    console.log('  node cleanup-gate-violations.cjs zho_for_eng --execute # Delete')
    process.exit(1)
  }

  cleanupGateViolations(courseCode, dryRun)
    .then(result => {
      console.log('Result:', result)
    })
    .catch(err => {
      console.error('Error:', err)
      process.exit(1)
    })
}

module.exports = { cleanupGateViolations }
