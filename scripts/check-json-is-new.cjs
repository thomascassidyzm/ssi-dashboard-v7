#!/usr/bin/env node
const fs = require('fs')
const data = JSON.parse(fs.readFileSync('public/vfs/courses/zho_for_eng/lego_pairs.json'))

// Count is_new in JSON
let newCount = 0
let notNewCount = 0
const newByKnown = {}

for (const seed of data.seeds || []) {
  for (const lego of seed.legos || []) {
    if (lego.is_new === true || lego.new === true) {
      newCount++
      const k = lego.known?.toLowerCase().trim()
      if (!newByKnown[k]) newByKnown[k] = []
      newByKnown[k].push('S' + String(seed.seed_number).padStart(4,'0') + 'L' + String(lego.lego_index || lego.index).padStart(2,'0'))
    } else {
      notNewCount++
    }
  }
}

console.log('=== lego_pairs.json (Phase 2 output) ===')
console.log('is_new=true:', newCount)
console.log('is_new=false:', notNewCount)
console.log('Total LEGOs:', newCount + notNewCount)

// Check for duplicates in is_new=true
const dups = Object.entries(newByKnown).filter(([k,v]) => v.length > 1)
console.log('\nDuplicate known_text with is_new=true:', dups.length)
if (dups.length > 0) {
  console.log('Examples:')
  for (const [k, v] of dups.slice(0, 10)) {
    console.log(`  "${k}" → ${v.length} LEGOs: ${v.slice(0,5).join(', ')}${v.length > 5 ? '...' : ''}`)
  }
}
