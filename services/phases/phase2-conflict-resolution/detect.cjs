#!/usr/bin/env node
/**
 * Phase 2 Detection Script
 *
 * Scans all Phase 1 LEGOs and identifies:
 * - DUPLICATES: same known → same target (mark is_new = false)
 * - CONFLICTS: same known → different targets (need agent resolution)
 *
 * This runs automatically after Phase 1 completes.
 *
 * Usage:
 *   node detect.cjs <courseCode> [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { v4: uuidv4 } = require('uuid')
const { canonicalLanguage, canonicalVoiceId } = require('../../shared/clip-identity.cjs')
const { normalizeForDb } = require('../../shared/text-normalize.cjs')

// Language name mapping for presentation text
const LANG_NAMES = {
  spa: 'Spanish', ita: 'Italian', fra: 'French', deu: 'German',
  por: 'Portuguese', zho: 'Chinese', cmn: 'Mandarin', jpn: 'Japanese',
  kor: 'Korean', ara: 'Arabic', rus: 'Russian', hin: 'Hindi',
  cym: 'Welsh', gle: 'Irish', gla: 'Scottish Gaelic', eus: 'Basque',
  cat: 'Catalan', nld: 'Dutch', swe: 'Swedish', nor: 'Norwegian',
  dan: 'Danish', fin: 'Finnish', pol: 'Polish', ces: 'Czech',
  hun: 'Hungarian', tur: 'Turkish', heb: 'Hebrew', tha: 'Thai',
  vie: 'Vietnamese', ind: 'Indonesian', msa: 'Malay', eng: 'English'
}

/**
 * Generate presentation texts for all NEW LEGOs
 * Called automatically after is_new flags are set
 */
async function generatePresentationTexts(courseCode) {
  console.log(`\n   Generating presentation texts for NEW LEGOs...`)

  // Get course info
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('known_lang, target_lang, voice_config')
    .eq('course_code', courseCode)
    .single()

  if (courseError || !course) {
    console.log(`      Skipped: Course not found in database`)
    return { generated: 0 }
  }

  const targetLangName = LANG_NAMES[course.target_lang] || course.target_lang
  const fullTemplate = "The {target_lang_name} for — '{known}' — as in — '{seed}' — is:"
  const shortTemplate = "The {target_lang_name} for — '{known}' — is:"
  // voice_config.presentation is the flat legacy string and its shape is
  // unconstrained, so canonicalise rather than trust it.
  const voiceId = canonicalVoiceId(course.voice_config?.presentation || 'azure_en-GB-SoniaNeural')
  const language = canonicalLanguage(course.known_lang)

  // Get all NEW LEGOs with their seed context
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (legosError || !legos?.length) {
    console.log(`      No NEW LEGOs found`)
    return { generated: 0 }
  }

  // Get seed sentences for context
  const seedNumbers = [...new Set(legos.map(l => l.seed_number).filter(Boolean))]
  let seedMap = {}
  if (seedNumbers.length > 0) {
    const { data: seeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text')
      .eq('course_code', courseCode)
      .in('seed_number', seedNumbers)
    if (seeds) {
      seedMap = Object.fromEntries(seeds.map(s => [s.seed_number, s.known_text]))
    }
  }

  // Build presentation records
  const audioRecords = legos.map(lego => {
    const seedText = seedMap[lego.seed_number] || lego.known_text

    // For first 2 seeds, alternate: odd LEGOs get full template, even get short
    // This avoids boring learners with repetitive "as in..." at the start
    const useShort = lego.seed_number <= 2 && lego.lego_index % 2 === 0
    const template = useShort ? shortTemplate : fullTemplate

    const presText = template
      .replace('{target_lang_name}', targetLangName)
      .replace('{known}', lego.known_text)
      .replace('{seed}', seedText)

    return {
      course_code: courseCode,
      text: presText,
      // normalizeForDb, not a fourth local rule. `presText.toLowerCase().trim()`
      // strips no terminal punctuation, while the course_audio trigger writes
      // rtrim(lower(trim(t)), '.?!¿¡。？！') over the top of whatever is supplied —
      // so the value this row was upserted WITH and the value it ends up
      // STORED with differed, and the onConflict key below was matched on the
      // wrong string. normalizeForDb is byte-identical to the trigger.
      text_normalized: normalizeForDb(presText),
      language,
      role: 'presentation',
      voice_id: voiceId,
      origin: 'tts',
      s3_key: `pending/${uuidv4().toUpperCase()}.mp3`
    }
  })

  // Bulk upsert
  const { error: upsertError } = await supabase
    .from('course_audio')
    .upsert(audioRecords, {
      onConflict: 'course_code,text_normalized,language,role,voice_id',
      ignoreDuplicates: true
    })

  if (upsertError) {
    console.log(`      Error: ${upsertError.message}`)
    return { generated: 0, error: upsertError.message }
  }

  console.log(`      Generated ${audioRecords.length} presentation texts`)
  return { generated: audioRecords.length }
}

/**
 * Run Phase 2 detection
 * @param {string} courseCodeParam - Course code to process
 * @param {boolean} dryRunParam - If true, don't modify database
 */
async function detect(courseCodeParam, dryRunParam = false) {
  // Support both direct params and CLI args
  const courseCode = courseCodeParam || process.argv[2]
  const dryRun = dryRunParam || process.argv.includes('--dry-run')

  if (!courseCode) {
    throw new Error('courseCode is required')
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`PHASE 2 DETECTION: ${courseCode}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`${'='.repeat(60)}\n`)

  // Step 1: Fetch all LEGOs from Phase 1
  console.log('Step 1: Fetching LEGOs from database...')

  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('id, lego_id, seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true })

  if (error) {
    console.error('Error fetching LEGOs:', error.message)
    process.exit(1)
  }

  console.log(`   Found ${legos.length} LEGOs\n`)

  // Step 2: Group by known_text (case-insensitive)
  console.log('Step 2: Grouping by known_text...')

  const knownGroups = new Map() // known_text (lowercase) → array of legos

  for (const lego of legos) {
    const key = (lego.known_text || '').toLowerCase().trim()
    if (!key) continue

    if (!knownGroups.has(key)) {
      knownGroups.set(key, [])
    }
    knownGroups.get(key).push(lego)
  }

  console.log(`   Found ${knownGroups.size} unique known texts\n`)

  // Step 3: Analyze each group for duplicates and conflicts
  console.log('Step 3: Analyzing for duplicates and conflicts...')

  const duplicates = []      // LEGOs to mark as is_new = false
  const conflicts = []       // Conflicts needing agent resolution
  let uniqueCount = 0        // First occurrences

  for (const [known, group] of knownGroups) {
    // Group by target within this known
    const targetGroups = new Map() // target → array of legos

    for (const lego of group) {
      const target = (lego.target_text || '').trim()
      if (!targetGroups.has(target)) {
        targetGroups.set(target, [])
      }
      targetGroups.get(target).push(lego)
    }

    if (targetGroups.size === 1) {
      // All same target - no conflict, just track duplicates
      const allLegos = [...targetGroups.values()][0]

      // First occurrence is canonical (new: true)
      uniqueCount++

      // Rest are duplicates (new: false)
      for (let i = 1; i < allLegos.length; i++) {
        duplicates.push({
          id: allLegos[i].id,
          lego_id: allLegos[i].lego_id,
          known_text: allLegos[i].known_text,
          target_text: allLegos[i].target_text,
          ref: allLegos[0].lego_id  // Reference to canonical
        })
      }
    } else {
      // Multiple targets - CONFLICT!
      const targets = []

      for (const [target, targetLegos] of targetGroups) {
        targets.push({
          target,
          occurrences: targetLegos.length,
          seeds: targetLegos.map(l => `S${String(l.seed_number).padStart(4, '0')}`),
          legos: targetLegos.map(l => ({
            id: l.id,
            lego_id: l.lego_id,
            seed_number: l.seed_number
          }))
        })
      }

      // Sort by occurrence count (most common first = canonical)
      targets.sort((a, b) => b.occurrences - a.occurrences)

      conflicts.push({
        known,
        display_known: group[0].known_text,  // Preserve original case
        target_count: targets.length,
        total_occurrences: group.length,
        targets
      })

      // First target is canonical - mark rest of its occurrences as duplicates
      const canonicalTarget = targets[0]
      uniqueCount++
      for (let i = 1; i < canonicalTarget.legos.length; i++) {
        duplicates.push({
          id: canonicalTarget.legos[i].id,
          lego_id: canonicalTarget.legos[i].lego_id,
          known_text: known,
          target_text: canonicalTarget.target,
          ref: canonicalTarget.legos[0].lego_id
        })
      }

      // Other targets need upchunking - but for now mark their duplicates too
      for (let t = 1; t < targets.length; t++) {
        const targetGroup = targets[t]
        uniqueCount++ // Each different target is "new" until upchunked
        for (let i = 1; i < targetGroup.legos.length; i++) {
          duplicates.push({
            id: targetGroup.legos[i].id,
            lego_id: targetGroup.legos[i].lego_id,
            known_text: known,
            target_text: targetGroup.target,
            ref: targetGroup.legos[0].lego_id
          })
        }
      }
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`)
  console.log('DETECTION SUMMARY')
  console.log(`${'─'.repeat(60)}`)
  console.log(`   Total LEGOs:        ${legos.length}`)
  console.log(`   Unique known texts: ${knownGroups.size}`)
  console.log(`   Unique LEGOs:       ${uniqueCount}`)
  console.log(`   Duplicates:         ${duplicates.length} (to mark is_new=false)`)
  console.log(`   Conflicts:          ${conflicts.length} (need agent resolution)`)

  if (conflicts.length > 0) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('TOP CONFLICTS (by occurrence count)')
    console.log(`${'─'.repeat(60)}`)

    for (const c of conflicts.slice(0, 15)) {
      console.log(`\n   "${c.display_known}" → ${c.target_count} targets (${c.total_occurrences} total)`)
      for (const t of c.targets) {
        const marker = t === c.targets[0] ? '✓' : '⚠'
        console.log(`      ${marker} "${t.target}" (${t.occurrences}x) - ${t.seeds.slice(0, 3).join(', ')}${t.seeds.length > 3 ? '...' : ''}`)
      }
    }

    if (conflicts.length > 15) {
      console.log(`\n   ... and ${conflicts.length - 15} more conflicts`)
    }
  }

  // Step 4: Apply changes
  console.log(`\n${'─'.repeat(60)}`)
  console.log('APPLYING CHANGES')
  console.log(`${'─'.repeat(60)}`)

  if (dryRun) {
    console.log('\n   DRY RUN - No changes made')
    console.log(`   Would update ${duplicates.length} LEGOs to is_new=false`)
    console.log(`   Would create ${conflicts.length} conflict records`)
  } else {
    // Update duplicates
    if (duplicates.length > 0) {
      console.log(`\n   Marking ${duplicates.length} duplicates as is_new=false...`)

      let updated = 0
      let failed = 0

      // Batch update for efficiency
      const batchSize = 100
      for (let i = 0; i < duplicates.length; i += batchSize) {
        const batch = duplicates.slice(i, i + batchSize)
        const ids = batch.map(d => d.id)

        const { error: updateError } = await supabase
          .from('course_legos')
          .update({ is_new: false })
          .in('id', ids)

        if (updateError) {
          console.error(`      Batch ${Math.floor(i/batchSize) + 1} failed:`, updateError.message)
          failed += batch.length
        } else {
          updated += batch.length
        }
      }

      console.log(`      Updated: ${updated}, Failed: ${failed}`)
    }

    // Generate presentation texts for NEW LEGOs
    await generatePresentationTexts(courseCode)

    // Store conflicts (upsert to phase2_conflicts table or write to JSON)
    if (conflicts.length > 0) {
      console.log(`\n   Storing ${conflicts.length} conflicts...`)

      // For now, store in a JSON file - can migrate to DB table later
      const fs = require('fs')
      const path = require('path')
      const vfsRoot = process.env.VFS_ROOT || path.join(__dirname, '../../../public/vfs/courses')
      const conflictPath = path.join(vfsRoot, courseCode, 'phase2_conflicts.json')

      const conflictData = {
        courseCode,
        detectedAt: new Date().toISOString(),
        summary: {
          totalLegos: legos.length,
          uniqueKnownTexts: knownGroups.size,
          uniqueLegos: uniqueCount,
          duplicatesMarked: duplicates.length,
          conflictCount: conflicts.length,
          affectedLegos: conflicts.reduce((sum, c) => sum + c.total_occurrences, 0)
        },
        conflicts: conflicts.map(c => ({
          ...c,
          status: 'detected',  // detected | assigned | resolved
          assignedTo: null,
          resolvedAt: null,
          resolution: null
        }))
      }

      fs.writeFileSync(conflictPath, JSON.stringify(conflictData, null, 2))
      console.log(`      Wrote: ${conflictPath}`)
    }
  }

  // Final status
  console.log(`\n${'='.repeat(60)}`)
  if (conflicts.length === 0) {
    console.log('PHASE 2 DETECTION COMPLETE - No conflicts!')
    console.log('Ready for Phase 3.')
  } else {
    console.log(`PHASE 2 DETECTION COMPLETE - ${conflicts.length} conflicts need resolution`)
    console.log('Run conflict resolution agents to continue.')
  }
  console.log(`${'='.repeat(60)}\n`)

  // Return summary for API use
  return {
    success: true,
    courseCode,
    summary: {
      totalLegos: legos.length,
      uniqueKnownTexts: knownGroups.size,
      uniqueLegos: uniqueCount,
      duplicatesMarked: duplicates.length,
      conflictCount: conflicts.length
    },
    conflicts: conflicts.length > 0 ? conflicts : null
  }
}

// Run if called directly
if (require.main === module) {
  detect()
    .then(result => {
      if (!result.success) process.exit(1)
    })
    .catch(err => {
      console.error('Detection failed:', err)
      process.exit(1)
    })
}

module.exports = { detect }
