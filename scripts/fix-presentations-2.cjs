require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  // 1. Get the 38 orphan presentations
  const { data: orphans } = await sb.from('course_audio')
    .select('id, text')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .is('lego_id', null)

  console.log('Orphans to process:', orphans.length)

  // 2. Get all LEGOs
  const { data: legos } = await sb.from('course_legos')
    .select('id, seed_number, lego_index, known_text')
    .eq('course_code', 'deu_for_eng')

  // Build lookup by known_text (lowercase)
  const knownToLego = {}
  for (const l of legos) {
    const lid = 'S' + String(l.seed_number).padStart(4, '0') + 'L' + String(l.lego_index).padStart(2, '0')
    knownToLego[l.known_text.toLowerCase()] = { lid, uuid: l.id }
  }

  // 3. Better regex - extract text between first "'" and the "', is:" or "', as in"
  let matched = 0
  const stillOrphan = []
  for (const o of orphans) {
    // Match "The German for '" then everything up to "', is:" or "', as in '"
    const m = o.text.match(/The German for '(.+?)'(?:,\s*(?:is:|as in))/)
    if (!m) {
      stillOrphan.push(o)
      continue
    }
    const known = m[1].toLowerCase()
    const lego = knownToLego[known]
    if (!lego) {
      // Try without trailing punctuation
      stillOrphan.push(o)
      console.log('No LEGO match for:', known)
      continue
    }

    const { error } = await sb.from('course_audio')
      .update({ lego_id: lego.lid })
      .eq('id', o.id)
    if (!error) matched++
    else console.log('Update error:', error.message)
  }
  console.log('Matched:', matched, 'Still orphan:', stillOrphan.length)

  // Show remaining orphans
  for (const o of stillOrphan) {
    console.log('Orphan:', o.text.slice(0, 100))
  }

  // 4. Deduplicate again - keep newest per lego_id
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
  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 100) {
      await sb.from('course_audio').delete().in('id', toDelete.slice(i, i + 100))
    }
    console.log('Deleted', toDelete.length, 'duplicates')
  }

  // 5. Delete remaining orphans (no LEGO match)
  if (stillOrphan.length > 0) {
    const orphanIds = stillOrphan.map(o => o.id)
    await sb.from('course_audio').delete().in('id', orphanIds)
    console.log('Deleted', orphanIds.length, 'unmatched orphans')
  }

  // 6. Re-link presentation_audio_id
  const { data: finalPres } = await sb.from('course_audio')
    .select('id, lego_id')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .not('lego_id', 'is', null)

  const legoUuidMap = {}
  for (const l of legos) {
    const lid = 'S' + String(l.seed_number).padStart(4, '0') + 'L' + String(l.lego_index).padStart(2, '0')
    legoUuidMap[lid] = l.id
  }

  let linked = 0
  for (const p of finalPres) {
    const legoUuid = legoUuidMap[p.lego_id]
    if (!legoUuid) continue
    await sb.from('course_legos')
      .update({ presentation_audio_id: p.id })
      .eq('id', legoUuid)
    linked++
  }
  console.log('Linked:', linked)

  // 7. Final stats
  const { count: presCount } = await sb.from('course_audio')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
  const { count: missingCount } = await sb.from('course_legos')
    .select('id', { count: 'exact', head: true })
    .eq('course_code', 'deu_for_eng')
    .is('presentation_audio_id', null)
  console.log('\nFinal: presentations:', presCount, ', LEGOs missing:', missingCount)
}

run()
