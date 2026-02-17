#!/usr/bin/env node
/**
 * Clone fra_for_eng → fra_for_eng_haiku as a test course.
 * Copies: course row, seeds (with translations), golden calibration,
 * and golden seed content (LEGOs 1-10 + their phrases).
 */

require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' })
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const SRC = 'fra_for_eng'
const DST = 'fra_for_eng_haiku'

async function clone() {
  console.log(`\nCloning ${SRC} → ${DST}`)
  console.log('='.repeat(60))

  // --- 1. Check if DST already exists ---
  const { data: existing } = await sb.from('courses').select('course_code').eq('course_code', DST).single()
  if (existing) {
    console.log(`${DST} already exists — cleaning it first...`)
    // Delete in order: qa_flags → phrases → legos → seeds → course
    await sb.from('course_qa_flags').delete().eq('course_code', DST)
    await sb.from('course_practice_phrases').delete().eq('course_code', DST)
    await sb.from('course_legos').delete().eq('course_code', DST)
    await sb.from('course_seeds').delete().eq('course_code', DST)
    await sb.from('courses').delete().eq('course_code', DST)
    console.log('  Cleaned.')
  }

  // --- 2. Copy course row ---
  console.log('\n1. Creating course row...')
  const { data: srcCourse } = await sb.from('courses').select('*').eq('course_code', SRC).single()
  const newCourse = {
    course_code: DST,
    display_name: 'French for English (Haiku Test)',
    known_lang: srcCourse.known_lang,
    target_lang: srcCourse.target_lang,
    voice_config: srcCourse.voice_config,
    course_type: srcCourse.course_type,
    status: 'draft',
    seed_count: srcCourse.seed_count,
    translation_analysis: srcCourse.translation_analysis,
    quality_rules: srcCourse.quality_rules,  // includes golden_decompositions
    new_app_status: 'not_available',
    legacy_app_status: 'not_available',
    export_ready: false
  }
  const { error: courseErr } = await sb.from('courses').insert(newCourse)
  if (courseErr) throw new Error(`Failed to create course: ${courseErr.message}`)
  console.log('  ✓ Course created with golden decompositions')

  // --- 3. Copy seeds (with translations) ---
  console.log('\n2. Copying seeds...')
  const allSeeds = []
  let offset = 0
  while (true) {
    const { data: batch, error } = await sb.from('course_seeds')
      .select('*')
      .eq('course_code', SRC)
      .range(offset, offset + 999)
      .order('seed_number')
    if (error) throw new Error(`Failed to read seeds: ${error.message}`)
    if (!batch || batch.length === 0) break
    allSeeds.push(...batch)
    offset += batch.length
    if (batch.length < 1000) break
  }

  const newSeeds = allSeeds.map(s => ({
    course_code: DST,
    seed_number: s.seed_number,
    known_text: s.known_text,
    target_text: s.target_text,
    decomposed_at: s.seed_number <= 10 ? s.decomposed_at : null  // mark 1-10 as decomposed
  }))

  // Insert in batches of 500
  for (let i = 0; i < newSeeds.length; i += 500) {
    const batch = newSeeds.slice(i, i + 500)
    const { error } = await sb.from('course_seeds').insert(batch)
    if (error) throw new Error(`Failed to insert seeds batch ${i}: ${error.message}`)
  }
  console.log(`  ✓ ${newSeeds.length} seeds copied (1-10 marked decomposed)`)

  // --- 4. Copy golden LEGOs (seeds 1-10) ---
  console.log('\n3. Copying golden LEGOs (seeds 1-10)...')
  const { data: srcLegos, error: legoErr } = await sb.from('course_legos')
    .select('*')
    .eq('course_code', SRC)
    .lte('seed_number', 10)
    .order('seed_number')
    .order('lego_index')
  if (legoErr) throw new Error(`Failed to read LEGOs: ${legoErr.message}`)

  const legoIdMap = {}  // old id → new id
  const newLegos = srcLegos.map(l => {
    const newId = require('crypto').randomUUID()
    legoIdMap[l.id] = newId
    return {
      id: newId,
      course_code: DST,
      seed_number: l.seed_number,
      lego_index: l.lego_index,
      known_text: l.known_text,
      target_text: l.target_text,
      type: l.type,
      is_new: l.is_new,
      components: l.components,
      created_at: l.created_at
    }
  })

  const { error: legoInsertErr } = await sb.from('course_legos').insert(newLegos)
  if (legoInsertErr) throw new Error(`Failed to insert LEGOs: ${legoInsertErr.message}`)
  console.log(`  ✓ ${newLegos.length} LEGOs copied`)

  // --- 5. Copy golden phrases (seeds 1-10) ---
  console.log('\n4. Copying golden phrases (seeds 1-10)...')
  const { data: srcPhrases, error: phraseErr } = await sb.from('course_practice_phrases')
    .select('*')
    .eq('course_code', SRC)
    .lte('seed_number', 10)
  if (phraseErr) throw new Error(`Failed to read phrases: ${phraseErr.message}`)

  const newPhrases = srcPhrases.map(p => ({
    id: require('crypto').randomUUID(),
    course_code: DST,
    lego_id: legoIdMap[p.lego_id] || p.lego_id,
    seed_number: p.seed_number,
    lego_index: p.lego_index,
    known_text: p.known_text,
    target_text: p.target_text,
    phrase_role: p.phrase_role,
    position: p.position,
    word_count: p.word_count,
    lego_count: p.lego_count,
    target_syllable_count: p.target_syllable_count,
    lego_position: p.lego_position,
    created_at: p.created_at
  }))

  // Insert in batches
  for (let i = 0; i < newPhrases.length; i += 500) {
    const batch = newPhrases.slice(i, i + 500)
    const { error } = await sb.from('course_practice_phrases').insert(batch)
    if (error) throw new Error(`Failed to insert phrases batch ${i}: ${error.message}`)
  }
  console.log(`  ✓ ${newPhrases.length} phrases copied`)

  // --- Summary ---
  console.log('\n' + '='.repeat(60))
  console.log('DONE')
  console.log('='.repeat(60))
  console.log(`  Course:  ${DST}`)
  console.log(`  Seeds:   ${newSeeds.length} (with translations)`)
  console.log(`  LEGOs:   ${newLegos.length} (golden 1-10)`)
  console.log(`  Phrases: ${newPhrases.length} (golden 1-10)`)
  console.log(`  Golden:  ${srcCourse.quality_rules?.golden_decompositions?.length || 0} calibration seeds`)
  console.log(`\nReady for Haiku to build from seed 11.`)
}

clone().catch(err => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
