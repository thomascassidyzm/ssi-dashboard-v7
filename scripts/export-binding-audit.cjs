/**
 * Export course binding audit as JSON files
 * Run: node scripts/export-binding-audit.cjs
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const OUTPUT_DIR = path.join(__dirname, '../temp/binding-audit')

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

async function exportQuery(name, queryFn) {
  console.log(`Exporting ${name}...`)
  const data = await queryFn()
  const filePath = path.join(OUTPUT_DIR, `${name}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`  → ${filePath} (${Array.isArray(data) ? data.length : 'object'} items)`)
  return data
}

async function main() {
  await ensureOutputDir()
  console.log(`=== EXPORTING BINDING AUDIT TO ${OUTPUT_DIR} ===\n`)

  // 1. Summary by course
  const summary = {}
  const courses = ['ara_for_eng', 'deu_for_eng', 'fra_for_eng', 'jpn_for_eng', 'spa_for_eng', 'zho_for_eng']

  for (const code of courses) {
    const { count: legosTotal } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true)

    const { count: legosKnown } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true).not('known_audio_id', 'is', null)

    const { count: legosTarget1 } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true).not('target1_audio_id', 'is', null)

    const { count: legosPresentation } = await supabase
      .from('course_legos').select('*', { count: 'exact', head: true })
      .eq('course_code', code).eq('is_new', true).not('presentation_audio_id', 'is', null)

    const { count: phrasesTotal } = await supabase
      .from('course_practice_phrases').select('*', { count: 'exact', head: true })
      .eq('course_code', code)

    const { count: phrasesKnown } = await supabase
      .from('course_practice_phrases').select('*', { count: 'exact', head: true })
      .eq('course_code', code).not('known_audio_id', 'is', null)

    const { count: phrasesTarget1 } = await supabase
      .from('course_practice_phrases').select('*', { count: 'exact', head: true })
      .eq('course_code', code).not('target1_audio_id', 'is', null)

    summary[code] = {
      legos: {
        total: legosTotal,
        known: legosKnown,
        target1: legosTarget1,
        presentation: legosPresentation,
        known_pct: Math.round(100 * legosKnown / legosTotal),
        target1_pct: Math.round(100 * legosTarget1 / legosTotal),
        presentation_pct: Math.round(100 * legosPresentation / legosTotal)
      },
      phrases: {
        total: phrasesTotal,
        known: phrasesKnown,
        target1: phrasesTarget1,
        known_pct: Math.round(100 * phrasesKnown / phrasesTotal),
        target1_pct: Math.round(100 * phrasesTarget1 / phrasesTotal)
      }
    }
  }

  await exportQuery('00-summary', () => summary)

  // 2. LEGOs missing audio (per course)
  for (const code of courses) {
    await exportQuery(`01-legos-missing-${code}`, async () => {
      const { data } = await supabase
        .from('course_legos')
        .select('seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
        .eq('course_code', code)
        .eq('is_new', true)
        .or('known_audio_id.is.null,target1_audio_id.is.null,target2_audio_id.is.null,presentation_audio_id.is.null')
        .order('seed_number')
        .order('lego_index')

      return data?.map(l => ({
        lego: `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`,
        known_text: l.known_text,
        target_text: l.target_text,
        missing: [
          !l.known_audio_id && 'known',
          !l.target1_audio_id && 'target1',
          !l.target2_audio_id && 'target2',
          !l.presentation_audio_id && 'presentation'
        ].filter(Boolean)
      })) || []
    })
  }

  // 3. Practice phrases missing audio (per course)
  for (const code of courses) {
    await exportQuery(`02-phrases-missing-${code}`, async () => {
      const { data } = await supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index, phrase_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
        .eq('course_code', code)
        .or('known_audio_id.is.null,target1_audio_id.is.null,target2_audio_id.is.null')
        .order('seed_number')
        .order('lego_index')
        .order('phrase_index')
        .limit(500) // Limit for large courses

      return data?.map(p => ({
        phrase: `S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}P${String(p.phrase_index).padStart(2,'0')}`,
        known_text: p.known_text,
        target_text: p.target_text,
        missing: [
          !p.known_audio_id && 'known',
          !p.target1_audio_id && 'target1',
          !p.target2_audio_id && 'target2'
        ].filter(Boolean)
      })) || []
    })
  }

  // 4. Audio with invalid S3 paths
  await exportQuery('03-invalid-s3-paths', async () => {
    const { data } = await supabase
      .from('course_audio')
      .select('id, course_code, role, text, s3_key')
      .or('s3_key.is.null,s3_key.like.pending/%')
      .limit(200)
    return data || []
  })

  // 5. Round playability per course
  for (const code of courses) {
    await exportQuery(`04-round-playability-${code}`, async () => {
      const { data: legos } = await supabase
        .from('course_legos')
        .select('seed_number, lego_index, known_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
        .eq('course_code', code)
        .eq('is_new', true)
        .order('seed_number')
        .order('lego_index')

      const results = []
      for (const l of legos || []) {
        // Count playable phrases
        const { count: playablePhrases } = await supabase
          .from('course_practice_phrases')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', code)
          .eq('seed_number', l.seed_number)
          .eq('lego_index', l.lego_index)
          .not('known_audio_id', 'is', null)
          .not('target1_audio_id', 'is', null)

        const { count: totalPhrases } = await supabase
          .from('course_practice_phrases')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', code)
          .eq('seed_number', l.seed_number)
          .eq('lego_index', l.lego_index)

        const introPlayable = l.presentation_audio_id && l.target1_audio_id && l.target2_audio_id
        const debutPlayable = l.known_audio_id && l.target1_audio_id && l.target2_audio_id

        results.push({
          lego: `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`,
          known_text: l.known_text,
          intro: introPlayable ? 'OK' : 'BLOCKED',
          debut: debutPlayable ? 'OK' : 'BLOCKED',
          practice: `${playablePhrases}/${totalPhrases}`,
          issues: [
            !l.presentation_audio_id && 'no_presentation',
            !l.known_audio_id && 'no_known',
            !l.target1_audio_id && 'no_target1',
            !l.target2_audio_id && 'no_target2',
            playablePhrases < totalPhrases && 'incomplete_phrases'
          ].filter(Boolean)
        })
      }
      return results
    })
  }

  // 6. Audio count by role per course
  await exportQuery('05-audio-counts', async () => {
    const counts = {}
    for (const code of courses) {
      counts[code] = {}
      for (const role of ['known', 'target1', 'target2', 'presentation']) {
        const { count } = await supabase
          .from('course_audio')
          .select('*', { count: 'exact', head: true })
          .eq('course_code', code)
          .eq('role', role)
        counts[code][role] = count
      }
    }
    return counts
  })

  console.log('\n=== DONE ===')
  console.log(`Results in: ${OUTPUT_DIR}`)
}

main().catch(console.error)
