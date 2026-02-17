#!/usr/bin/env node
require('dotenv').config()
const { supabase } = require('../services/supabase-client.cjs')

async function main() {
  // Get all gender-expanded texts
  const { data: expansions } = await supabase
    .from('course_gender_expansions')
    .select('original_text, expanded_f, expanded_m')
    .eq('course_code', 'fra_for_eng')

  const t1Texts = new Set(expansions.filter(r => r.expanded_f).map(r => r.original_text.toLowerCase().trim()))
  const t2Texts = new Set(expansions.filter(r => r.expanded_m).map(r => r.original_text.toLowerCase().trim()))

  // Get all target1 + target2 audio (paginated)
  async function getAllAudio(role) {
    const all = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('course_audio')
        .select('id, text_normalized')
        .eq('course_code', 'fra_for_eng')
        .eq('role', role)
        .not('s3_key', 'like', 'pending/%')
        .order('id')
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      all.push(...data)
      offset += 1000
    }
    return all
  }

  const allT1 = await getAllAudio('target1')
  const allT2 = await getAllAudio('target2')

  const toFlag = [
    ...allT1.filter(a => t1Texts.has(a.text_normalized)).map(a => a.id),
    ...allT2.filter(a => t2Texts.has(a.text_normalized)).map(a => a.id)
  ]

  console.log(`Flagging ${toFlag.length} audio items for gender regen...`)

  // Clear any existing gender flags first
  const { error: clearErr } = await supabase
    .from('audio_flags')
    .delete()
    .eq('course_code', 'fra_for_eng')
    .eq('reason', 'gender-expansion-regen')
  if (clearErr) console.warn('Clear error:', clearErr.message)

  // Insert flags in batches
  let flagged = 0
  const BATCH = 100
  for (let i = 0; i < toFlag.length; i += BATCH) {
    const batch = toFlag.slice(i, i + BATCH).map(id => ({
      audio_uuid: id,
      course_code: 'fra_for_eng',
      status: 'flagged',
      reason: 'gender-expansion-regen',
      flagged_by: 'process-gender'
    }))
    const { error } = await supabase
      .from('audio_flags')
      .upsert(batch, { onConflict: 'audio_uuid,course_code' })
    if (error) { console.error('Batch error:', error.message); continue }
    flagged += batch.length
  }

  console.log(`Done: ${flagged} audio items flagged for regeneration`)
}

main().catch(err => { console.error(err); process.exit(1) })
