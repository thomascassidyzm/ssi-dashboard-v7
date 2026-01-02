// scripts/find-missing-audio.cjs
// Find which audio samples are missing for a course

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function findMissing(courseCode) {
  console.log(`Finding missing audio for ${courseCode}...\n`)

  // Get all practice phrases for this course (paginate to avoid 1000 row limit)
  let phrases = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: page, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, position, known_text, target_text')
      .eq('course_code', courseCode)
      .range(offset, offset + pageSize - 1)

    if (phrasesError) {
      console.error('Error:', phrasesError)
      return
    }

    if (!page || page.length === 0) break
    phrases = phrases.concat(page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  console.log(`Found ${phrases.length} practice phrases`)

  // Get existing audio for this course (paginate)
  let existingAudio = []
  offset = 0

  while (true) {
    const { data: page, error: audioError } = await supabase
      .from('course_audio')
      .select(`
        role,
        audio_files!inner (
          id,
          voice_id,
          texts!inner (content)
        )
      `)
      .eq('course_code', courseCode)
      .range(offset, offset + pageSize - 1)

    if (audioError) {
      console.error('Audio error:', audioError)
      return
    }

    if (!page || page.length === 0) break
    existingAudio = existingAudio.concat(page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  console.log(`Found ${existingAudio.length} existing audio entries`)

  // Build lookup of existing texts by role
  const existingByRole = {
    known: new Set(),
    target1: new Set(),
    target2: new Set()
  }

  // Also track voice IDs used
  const voicesByRole = {
    known: new Set(),
    target1: new Set(),
    target2: new Set()
  }

  for (const ca of existingAudio || []) {
    const text = ca.audio_files?.texts?.content
    const role = ca.role
    const voiceId = ca.audio_files?.voice_id
    if (text && existingByRole[role]) {
      existingByRole[role].add(text)
    }
    if (voiceId && voicesByRole[role]) {
      voicesByRole[role].add(voiceId)
    }
  }

  console.log(`\nExisting counts by role:`)
  console.log(`  known: ${existingByRole.known.size} unique texts`)
  console.log(`  target1: ${existingByRole.target1.size} unique texts`)
  console.log(`  target2: ${existingByRole.target2.size} unique texts`)

  console.log(`\nVoices used:`)
  for (const [role, voices] of Object.entries(voicesByRole)) {
    console.log(`  ${role}: ${Array.from(voices).join(', ') || 'none'}`)
  }

  // Find missing
  const missing = []
  const seen = new Set()

  for (const p of phrases) {
    // Check known
    if (p.known_text && !existingByRole.known.has(p.known_text)) {
      const key = `known|${p.known_text}`
      if (!seen.has(key)) {
        seen.add(key)
        missing.push({ role: 'known', text: p.known_text, seed: p.seed_number, lego: p.lego_index })
      }
    }
    // Check target1
    if (p.target_text && !existingByRole.target1.has(p.target_text)) {
      const key = `target1|${p.target_text}`
      if (!seen.has(key)) {
        seen.add(key)
        missing.push({ role: 'target1', text: p.target_text, seed: p.seed_number, lego: p.lego_index })
      }
    }
    // Check target2
    if (p.target_text && !existingByRole.target2.has(p.target_text)) {
      const key = `target2|${p.target_text}`
      if (!seen.has(key)) {
        seen.add(key)
        missing.push({ role: 'target2', text: p.target_text, seed: p.seed_number, lego: p.lego_index })
      }
    }
  }

  console.log(`\n========================================`)
  console.log(`MISSING: ${missing.length} samples`)
  console.log(`========================================\n`)

  // Group by role
  const byRole = {}
  for (const m of missing) {
    if (!byRole[m.role]) byRole[m.role] = []
    byRole[m.role].push(m)
  }

  for (const [role, items] of Object.entries(byRole)) {
    console.log(`=== ${role.toUpperCase()} (${items.length} missing) ===`)
    for (const item of items) {
      console.log(`  S${String(item.seed).padStart(4,'0')}L${String(item.lego).padStart(2,'0')}: "${item.text}"`)
    }
    console.log()
  }
}

const courseCode = process.argv[2] || 'spa_for_eng'
findMissing(courseCode).catch(console.error)
