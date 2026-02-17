#!/usr/bin/env node
require('dotenv').config()
const { supabase } = require('../services/supabase-client.cjs')

async function main() {
  // Get all gender-expanded texts
  const { data: expansions } = await supabase
    .from('course_gender_expansions')
    .select('original_text, expanded_f, expanded_m')
    .eq('course_code', 'fra_for_eng')

  const t1Texts = expansions.filter(r => r.expanded_f).map(r => r.original_text.toLowerCase().trim())
  const t2Texts = expansions.filter(r => r.expanded_m).map(r => r.original_text.toLowerCase().trim())

  // Get ALL target1 audio (paginated)
  const allT1 = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', 'fra_for_eng')
      .eq('role', 'target1')
      .not('s3_key', 'like', 'pending/%')
      .order('id')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allT1.push(...data)
    offset += 1000
  }
  console.log('Total target1 audio rows:', allT1.length)

  // Match in JS
  const t1Set = new Set(t1Texts)
  const matchingT1 = allT1.filter(a => t1Set.has(a.text_normalized))
  console.log('Matching target1 for gender regen:', matchingT1.length, '/', t1Texts.length)

  // Same for target2
  const allT2 = []
  offset = 0
  while (true) {
    const { data } = await supabase
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', 'fra_for_eng')
      .eq('role', 'target2')
      .not('s3_key', 'like', 'pending/%')
      .order('id')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allT2.push(...data)
    offset += 1000
  }
  console.log('Total target2 audio rows:', allT2.length)

  const t2Set = new Set(t2Texts)
  const matchingT2 = allT2.filter(a => t2Set.has(a.text_normalized))
  console.log('Matching target2 for gender regen:', matchingT2.length, '/', t2Texts.length)

  // Show unmatched
  const matchedT1Norms = new Set(matchingT1.map(m => m.text_normalized))
  const unmatchedT1 = t1Texts.filter(t => !matchedT1Norms.has(t))
  if (unmatchedT1.length > 0) {
    console.log('\nUnmatched target1 texts (no audio found):', unmatchedT1.length)
    for (const t of unmatchedT1.slice(0, 10)) {
      console.log(' ', JSON.stringify(t))
    }
  }

  console.log('\nTotal audio to flag for regen:', matchingT1.length + matchingT2.length)
}

main().catch(err => { console.error(err); process.exit(1) })
