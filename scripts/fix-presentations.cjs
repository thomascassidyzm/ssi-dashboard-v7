require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  // 1. Get all LEGOs
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, lego_index, known_text')
    .eq('course_code', 'deu_for_eng')
    .order('seed_number').order('lego_index')

  // Build lookup: normalized known_text -> lego_id string
  const knownToLegoId = {}
  for (const l of legos) {
    const lid = 'S' + String(l.seed_number).padStart(4, '0') + 'L' + String(l.lego_index).padStart(2, '0')
    // The presentation text is like "The German for 'I want', is:"
    // so we match on the known_text inside quotes
    knownToLegoId[l.known_text.toLowerCase()] = lid
  }

  // 2. Get all presentation audio with null lego_id
  const { data: nullPres } = await sb.from('course_audio')
    .select('id, text')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .is('lego_id', null)

  console.log('Null lego_id presentations:', nullPres.length)

  // 3. Match and update
  let matched = 0, unmatched = 0
  for (const p of nullPres) {
    // Extract known text from "The German for 'X', is:" or "The German for 'X', as in '...', is:"
    const m = p.text.match(/The German for '([^']+)'/)
    if (!m) { unmatched++; continue }
    const known = m[1].toLowerCase()
    const legoId = knownToLegoId[known]
    if (!legoId) { unmatched++; continue }

    const { error } = await sb.from('course_audio')
      .update({ lego_id: legoId })
      .eq('id', p.id)
    if (error) console.log('Error:', p.id, error.message)
    else matched++
  }
  console.log('Matched:', matched, 'Unmatched:', unmatched)

  // 4. Now deduplicate - keep newest per lego_id, delete older
  const { data: allPres } = await sb.from('course_audio')
    .select('id, lego_id, created_at')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)
    .order('created_at', { ascending: false })

  const seen = new Set()
  const toDelete = []
  for (const p of allPres) {
    if (seen.has(p.lego_id)) {
      toDelete.push(p.id)
    } else {
      seen.add(p.lego_id)
    }
  }
  console.log('Duplicates to delete:', toDelete.length)

  // Delete in batches
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100)
    const { error } = await sb.from('course_audio').delete().in('id', batch)
    if (error) console.log('Delete error:', error.message)
  }
  console.log('Deleted duplicates')

  // 5. Final count
  const { count } = await sb.from('course_audio')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
  console.log('Final presentation count:', count)

  // 6. Link to course_legos.presentation_audio_id
  const { data: finalPres } = await sb.from('course_audio')
    .select('id, lego_id')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)

  const { data: allLegos } = await sb.from('course_legos')
    .select('id, seed_number, lego_index')
    .eq('course_code', 'deu_for_eng')

  const legoUuidMap = {}
  for (const l of allLegos) {
    const lid = 'S' + String(l.seed_number).padStart(4, '0') + 'L' + String(l.lego_index).padStart(2, '0')
    legoUuidMap[lid] = l.id
  }

  let linked = 0
  for (const p of finalPres) {
    const legoUuid = legoUuidMap[p.lego_id]
    if (!legoUuid) continue
    const { error } = await sb.from('course_legos')
      .update({ presentation_audio_id: p.id })
      .eq('id', legoUuid)
    if (!error) linked++
  }
  console.log('Linked presentation_audio_id on', linked, 'LEGOs')

  // Any LEGOs still missing?
  const { count: missing } = await sb.from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .is('presentation_audio_id', null)
  console.log('LEGOs still missing presentation_audio_id:', missing)
}

run()
