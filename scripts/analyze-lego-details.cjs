#!/usr/bin/env node
/**
 * Analyze first N LEGOs in detail
 * Shows scaffold vocab, phrases, and violations
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs-extra')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function normalizeSpelling(word) {
  const ukToUs = {
    'colour': 'color', 'practise': 'practice', 'practising': 'practicing'
  }
  return ukToUs[word] || word
}

function extractWords(text) {
  if (!text) return []
  const matches = text.toLowerCase().match(/[\wáéíóúüñàèìòùâêîôûäëïöü]+/g)
  if (!matches) return []
  return matches.map(normalizeSpelling)
}

async function analyzeLegos(courseCode, limit = 50) {
  const vfsRoot = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses')
  const scaffoldsDir = path.join(vfsRoot, courseCode, 'phase3_scaffolds')

  console.log(`\n${'='.repeat(80)}`)
  console.log(`DETAILED LEGO ANALYSIS: ${courseCode} (first ${limit} LEGOs)`)
  console.log(`${'='.repeat(80)}\n`)

  // Get first N LEGOs ordered by position
  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log(`Found ${legos.length} NEW LEGOs\n`)

  // Cache scaffolds
  const scaffoldCache = new Map()

  for (const lego of legos) {
    const seedId = `S${String(lego.seed_number).padStart(4, '0')}`
    const legoId = `${seedId}L${String(lego.lego_index).padStart(2, '0')}`

    console.log(`${'─'.repeat(80)}`)
    console.log(`LEGO: ${legoId}`)
    console.log(`${'─'.repeat(80)}`)
    console.log(`  Known:  "${lego.known_text}"`)
    console.log(`  Target: "${lego.target_text}"`)

    // Load scaffold
    if (!scaffoldCache.has(lego.seed_number)) {
      const scaffoldPath = path.join(scaffoldsDir, `${seedId}.json`)
      if (await fs.pathExists(scaffoldPath)) {
        scaffoldCache.set(lego.seed_number, await fs.readJson(scaffoldPath))
      }
    }

    const scaffold = scaffoldCache.get(lego.seed_number)
    const legoScaffold = scaffold?.legos?.[legoId]

    if (!legoScaffold) {
      console.log(`  ⚠️  No scaffold found for ${legoId}`)
      console.log()
      continue
    }

    // Show available vocab
    const availKnown = legoScaffold.available_vocab?.known || []
    const availTarget = legoScaffold.available_vocab?.target || []

    console.log(`\n  SCAFFOLD AVAILABLE VOCAB:`)
    console.log(`    Known (${availKnown.length} words): ${availKnown.slice(0, 20).join(', ')}${availKnown.length > 20 ? '...' : ''}`)
    console.log(`    Target (${availTarget.length} items): ${availTarget.slice(0, 10).join(', ')}${availTarget.length > 10 ? '...' : ''}`)

    // Get practice phrases for this LEGO
    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('known_text, target_text, position')
      .eq('course_code', courseCode)
      .eq('seed_number', lego.seed_number)
      .eq('lego_index', lego.lego_index)
      .order('position', { ascending: true })

    console.log(`\n  PRACTICE PHRASES (${phrases?.length || 0}):`)

    if (!phrases || phrases.length === 0) {
      console.log(`    ⚠️  No phrases generated`)
      console.log()
      continue
    }

    // Build vocab sets for validation
    const knownVocab = new Set(availKnown.map(w => normalizeSpelling(w.toLowerCase())))
    const targetVocab = new Set(availTarget.map(w => w.toLowerCase()))

    // Add LEGO words
    extractWords(lego.known_text).forEach(w => knownVocab.add(w))
    extractWords(lego.target_text).forEach(w => targetVocab.add(w))

    let violationCount = 0
    for (const phrase of phrases) {
      const knownWords = extractWords(phrase.known_text)
      const targetWords = extractWords(phrase.target_text)

      const unknownKnown = knownWords.filter(w => !knownVocab.has(w))
      const unknownTarget = targetWords.filter(w => !targetVocab.has(w))

      const hasViolation = unknownKnown.length > 0 || unknownTarget.length > 0
      if (hasViolation) violationCount++

      const marker = hasViolation ? '❌' : '✅'
      console.log(`    ${marker} [${phrase.position}] "${phrase.known_text}"`)
      console.log(`         → "${phrase.target_text}"`)

      if (unknownKnown.length > 0) {
        console.log(`         ⚠️  Unknown EN: [${unknownKnown.join(', ')}]`)
      }
      if (unknownTarget.length > 0) {
        console.log(`         ⚠️  Unknown TL: [${unknownTarget.join(', ')}]`)
      }
    }

    console.log(`\n  SUMMARY: ${phrases.length} phrases, ${violationCount} violations (${((violationCount/phrases.length)*100).toFixed(0)}%)`)
    console.log()
  }
}

const courseCode = process.argv[2] || 'ita_for_eng'
const limit = parseInt(process.argv[3]) || 50

analyzeLegos(courseCode, limit)
  .then(() => console.log('Done'))
  .catch(err => console.error('Error:', err))
