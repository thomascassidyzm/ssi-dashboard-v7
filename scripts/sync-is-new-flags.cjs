#!/usr/bin/env node
/**
 * Sync is_new flags from lego_pairs.json to Supabase
 *
 * Handles both formats:
 * - Compact: s, l, k, t, n (0/1)
 * - Full: seed_id, legos, known, target, new (boolean)
 */
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const courseCode = process.argv[2] || 'zho_for_eng'
const dryRun = process.argv.includes('--dry-run')

async function syncIsNewFlags() {
  console.log(`\n🔄 Syncing is_new flags for ${courseCode}`)
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`)

  // Load lego_pairs.json (the source of truth from Phase 2)
  const jsonPath = `public/vfs/courses/${courseCode}/lego_pairs.json`
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

  // Handle both formats - compact (s, l) or full (seeds, legos)
  const seeds = Array.isArray(jsonData) ? jsonData : (jsonData.seeds || [])

  // Detect format
  const isCompact = seeds.length > 0 && seeds[0].s !== undefined

  // Build map of known|target -> is_new from JSON
  // Also track first occurrence to determine true is_new
  const seenKeys = new Set()
  const legoMap = new Map() // known|target -> { isNew, known, target }

  for (const seed of seeds) {
    const seedId = isCompact ? seed.s : (seed.seed_id || seed.id)
    const legos = isCompact ? (seed.l || []) : (seed.legos || [])

    for (let idx = 0; idx < legos.length; idx++) {
      const lego = legos[idx]

      // Get known/target handling both formats
      let known, target, legoNew
      if (isCompact) {
        known = lego.k || ''
        target = lego.t || ''
        legoNew = lego.n === 1  // n=1 means new, n=0 means not new
      } else {
        known = lego.known || lego.lego?.known || ''
        target = lego.target || lego.lego?.target || ''
        legoNew = lego.new === true
      }

      const key = `${known.toLowerCase().trim()}|${target.toLowerCase().trim()}`

      // First occurrence check
      const isFirstOccurrence = !seenKeys.has(key)
      seenKeys.add(key)

      // Use the JSON's is_new value (which should already reflect first-occurrence logic)
      legoMap.set(key, {
        isNew: legoNew,
        known: known,
        target: target,
        firstOccurrence: isFirstOccurrence
      })
    }
  }

  console.log(`📄 JSON: ${legoMap.size} unique LEGO pairs`)
  console.log(`   LEGOs with n=1/new=true: ${[...legoMap.values()].filter(v => v.isNew).length}`)

  // Get all LEGOs from database
  const { data: dbLegos, error } = await supabase
    .from('course_legos')
    .select('id, lego_id, known_text, target_text, is_new')
    .eq('course_code', courseCode)

  if (error) throw error

  console.log(`💾 Database: ${dbLegos.length} LEGOs`)
  console.log(`   Currently is_new=true: ${dbLegos.filter(l => l.is_new).length}`)

  // Find mismatches - match by known|target key
  const updates = []
  let matched = 0
  let notInJson = 0

  for (const dbLego of dbLegos) {
    const dbKey = `${(dbLego.known_text || '').toLowerCase().trim()}|${(dbLego.target_text || '').toLowerCase().trim()}`
    const jsonInfo = legoMap.get(dbKey)

    if (!jsonInfo) {
      notInJson++
      continue
    }

    matched++

    // Check if is_new needs to be updated
    if (dbLego.is_new !== jsonInfo.isNew) {
      updates.push({
        id: dbLego.id,
        lego_id: dbLego.lego_id,
        known: dbLego.known_text,
        current: dbLego.is_new,
        shouldBe: jsonInfo.isNew
      })
    }
  }

  console.log(`\n🔍 Analysis:`)
  console.log(`   Matched by known|target: ${matched}`)
  console.log(`   Not in JSON: ${notInJson}`)
  console.log(`   Need update: ${updates.length}`)

  // Show breakdown
  const toTrue = updates.filter(u => u.shouldBe === true)
  const toFalse = updates.filter(u => u.shouldBe === false)
  console.log(`   → Set to TRUE: ${toTrue.length}`)
  console.log(`   → Set to FALSE: ${toFalse.length}`)

  if (updates.length === 0) {
    console.log('\n✅ No updates needed - database is in sync!')
    return
  }

  // Show sample updates
  console.log(`\n📋 Sample updates (first 10):`)
  for (const u of updates.slice(0, 10)) {
    console.log(`   ${u.lego_id}: "${u.known?.substring(0,20)}" ${u.current} → ${u.shouldBe}`)
  }

  if (dryRun) {
    console.log(`\n⏸️  DRY RUN - no changes made`)
    console.log(`   Run without --dry-run to apply ${updates.length} updates`)
    return
  }

  // Apply updates
  console.log(`\n🚀 Applying ${updates.length} updates...`)

  let success = 0
  let failed = 0

  for (const u of updates) {
    const { error: updateError } = await supabase
      .from('course_legos')
      .update({ is_new: u.shouldBe })
      .eq('id', u.id)

    if (updateError) {
      console.error(`   ❌ Failed ${u.lego_id}: ${updateError.message}`)
      failed++
    } else {
      success++
    }
  }

  console.log(`\n✅ Complete: ${success} updated, ${failed} failed`)

  // Verify final state
  const { data: finalLegos } = await supabase
    .from('course_legos')
    .select('is_new')
    .eq('course_code', courseCode)

  const finalNewCount = finalLegos?.filter(l => l.is_new).length || 0
  console.log(`\n📊 Final state:`)
  console.log(`   Total LEGOs: ${finalLegos?.length}`)
  console.log(`   is_new=true: ${finalNewCount}`)
  console.log(`   is_new=false: ${(finalLegos?.length || 0) - finalNewCount}`)
}

syncIsNewFlags().catch(console.error)
