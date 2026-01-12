#!/usr/bin/env node
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function compare() {
  // Load JSON
  const json = JSON.parse(fs.readFileSync('public/vfs/courses/zho_for_eng/lego_pairs.json'))

  // Get Supabase data
  const { data: dbLegos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, target_text, is_new')
    .eq('course_code', 'zho_for_eng')

  // Build JSON map: lego_id -> new flag
  const jsonMap = new Map()
  for (const seed of json.seeds || []) {
    for (const lego of seed.legos || []) {
      jsonMap.set(lego.id, {
        known: lego.known,
        target: lego.target,
        isNew: lego.new === true
      })
    }
  }

  console.log('=== COMPARISON ===')
  console.log(`JSON lego_pairs.json: ${jsonMap.size} LEGOs`)
  console.log(`Supabase course_legos: ${dbLegos.length} LEGOs`)

  // Count is_new differences
  let jsonNewCount = 0
  let dbNewCount = 0
  let matches = 0
  let mismatches = []

  for (const [legoId, jsonData] of jsonMap) {
    if (jsonData.isNew) jsonNewCount++
  }

  for (const db of dbLegos) {
    if (db.is_new) dbNewCount++

    const jsonData = jsonMap.get(db.lego_id)
    if (jsonData) {
      if (jsonData.isNew !== db.is_new) {
        mismatches.push({
          lego_id: db.lego_id,
          json_new: jsonData.isNew,
          db_new: db.is_new,
          known: db.known_text
        })
      } else {
        matches++
      }
    }
  }

  console.log(`\nJSON is_new=true: ${jsonNewCount}`)
  console.log(`DB is_new=true: ${dbNewCount}`)
  console.log(`Matching is_new flags: ${matches}`)
  console.log(`MISMATCHED is_new flags: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\nMismatch examples (JSON says false, DB says true):')
    const jsonFalseDbTrue = mismatches.filter(m => !m.json_new && m.db_new)
    for (const m of jsonFalseDbTrue.slice(0, 15)) {
      console.log(`  ${m.lego_id}: "${m.known}" - JSON:${m.json_new} vs DB:${m.db_new}`)
    }

    console.log(`\nTotal where JSON=false but DB=true: ${jsonFalseDbTrue.length}`)
  }

  // Check for LEGOs in DB but not in JSON (Phase 3 created?)
  const jsonIds = new Set(jsonMap.keys())
  const dbOnly = dbLegos.filter(d => !jsonIds.has(d.lego_id))
  console.log(`\nLEGOs in DB but NOT in JSON: ${dbOnly.length}`)
  if (dbOnly.length > 0) {
    console.log('Examples:')
    for (const d of dbOnly.slice(0, 10)) {
      console.log(`  ${d.lego_id}: "${d.known_text}" is_new=${d.is_new}`)
    }
  }
}

compare().catch(console.error)
