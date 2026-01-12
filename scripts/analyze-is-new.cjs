#!/usr/bin/env node
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function check() {
  // Get ALL LEGOs marked is_new=true
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, known_text, target_text')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true)

  // Count unique known+target combinations
  const uniquePairs = new Map()
  for (const l of newLegos) {
    const key = (l.known_text + '|' + l.target_text).toLowerCase().trim()
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { first: l.lego_id, count: 1, key })
    } else {
      uniquePairs.get(key).count++
    }
  }

  const duplicated = [...uniquePairs.values()].filter(v => v.count > 1)
  const totalDups = duplicated.reduce((sum, v) => sum + v.count - 1, 0)

  console.log('=== is_new FLAG ANALYSIS ===')
  console.log(`LEGOs marked is_new=true: ${newLegos.length}`)
  console.log(`Unique known+target pairs: ${uniquePairs.size}`)
  console.log(`Duplicate pairs (should NOT all be is_new): ${totalDups}`)
  console.log(`\nCorrect NEW LEGO count should be: ${uniquePairs.size}`)
  console.log(`Inflated by: ${newLegos.length - uniquePairs.size} rows`)

  console.log(`\nTop duplicated pairs (same LEGO marked new multiple times):`)
  const sorted = duplicated.sort((a,b) => b.count - a.count).slice(0, 15)
  for (const d of sorted) {
    const [known, target] = d.key.split('|')
    console.log(`  "${known.substring(0,15).padEnd(15)}" → "${target.substring(0,10)}" : ${d.count} times (first: ${d.first})`)
  }
}
check()
