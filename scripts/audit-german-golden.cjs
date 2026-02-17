require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function run() {
  // 1. Get all LEGOs in order for German seeds 1-10
  const { data: legos } = await supabase
    .from('course_legos')
    .select('id, seed_number, lego_index, type, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 1)
    .lte('seed_number', 10)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true })

  // 2. Get all phrases for seeds 1-10
  let allPhrases = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, phrase_role, position, known_text, target_text')
      .eq('course_code', 'deu_for_eng')
      .gte('seed_number', 1)
      .lte('seed_number', 10)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .order('position', { ascending: true })
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allPhrases = allPhrases.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }

  // Group phrases by LEGO
  const phrasesByLego = new Map()
  for (const p of allPhrases) {
    const key = `S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`
    if (!phrasesByLego.has(key)) phrasesByLego.set(key, [])
    phrasesByLego.get(key).push(p)
  }

  // Extract words from German text (lowercase, strip punctuation)
  function extractWords(text) {
    return text
      .toLowerCase()
      .replace(/[.,!?;:()„""'«»\-–—]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0)
  }

  // Track cumulative vocabulary
  const knownWords = new Set()
  const knownLegoTexts = [] // ordered list of LEGO target texts
  let roundNum = 0
  let totalErrors = 0

  console.log('GERMAN GOLDEN SEEDS AUDIT — Non-Permitted Vocabulary Check')
  console.log('='.repeat(80))

  for (const lego of legos) {
    roundNum++
    const legoId = `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`
    
    // Get phrases for this LEGO
    const phrases = phrasesByLego.get(legoId) || []
    const components = phrases.filter(p => p.phrase_role === 'component')
    const builds = phrases.filter(p => p.phrase_role === 'build')
    const uses = phrases.filter(p => p.phrase_role === 'use')

    // Add component words to vocabulary BEFORE checking BUILD phrases
    // (components are taught before the LEGO debut)
    for (const comp of components) {
      for (const w of extractWords(comp.target_text)) {
        knownWords.add(w)
      }
    }

    // Add LEGO words to vocabulary
    const legoWords = extractWords(lego.target_text)
    for (const w of legoWords) {
      knownWords.add(w)
    }
    knownLegoTexts.push({ round: roundNum, id: legoId, known: lego.known_text, target: lego.target_text })

    // Print round header
    console.log(`\nR${roundNum} ${legoId} [${lego.type}] "${lego.known_text}" = "${lego.target_text}"`)
    console.log(`  Vocab now: [${[...knownWords].sort().join(', ')}]`)
    console.log(`  Phrases: ${components.length}C ${builds.length}B ${uses.length}U`)

    // Check each BUILD and USE phrase for non-permitted vocab
    const allCheckable = [...builds, ...uses]
    for (const phrase of allCheckable) {
      const phraseWords = extractWords(phrase.target_text)
      const unknownWords = phraseWords.filter(w => !knownWords.has(w))
      
      const roleLabel = phrase.phrase_role === 'build' ? 'B' : 'U'
      const posLabel = phrase.id.split(':')[1] || ''
      
      if (unknownWords.length > 0) {
        console.log(`  ❌ ${posLabel} [${roleLabel}] "${phrase.known_text}" → "${phrase.target_text}"`)
        console.log(`     NON-PERMITTED: ${unknownWords.join(', ')}`)
        totalErrors++
      } else {
        console.log(`  ✓  ${posLabel} [${roleLabel}] "${phrase.known_text}" → "${phrase.target_text}"`)
      }
    }

    // Check for missing obvious combinations
    // (Just flag rounds with very low phrase counts)
    const totalPhrases = builds.length + uses.length
    if (roundNum >= 3 && totalPhrases < 4) {
      console.log(`  ⚠️  THIN: Only ${totalPhrases} phrases (BUILD+USE) — likely missing combinations`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`TOTAL ERRORS: ${totalErrors}`)
  console.log(`TOTAL LEGOS: ${roundNum}`)
  console.log(`TOTAL PHRASES: ${allPhrases.length}`)
  console.log('\nVocabulary at end of seed 10:')
  console.log([...knownWords].sort().join(', '))
}

run()
