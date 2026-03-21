/**
 * Gender Haiku Service
 *
 * Uses Claude Haiku to produce gender-appropriate text for TTS audio generation.
 * Replaces the regex-based gender-analyzer + gender-expansion-service pipeline
 * which fails fundamentally for French (avoir bug, irregular forms, syntax-blind).
 *
 * Cost: ~$0.03 per 300-seed course. Latency: ~5 seconds as pre-processing before TTS.
 *
 * @module gender-haiku-service
 */

const { claudeChat } = require('./shared/claude-cli.cjs')

// Only these languages have grammatical gender agreement that affects TTS
const GENDERED_LANGUAGES = ['spa', 'ita', 'por', 'fra', 'ara']

const LANG_NAMES = {
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
  fra: 'French',
  ara: 'Arabic'
}

const BATCH_SIZE = 50
const MAX_CONCURRENCY = 5

/**
 * Build the prompt for a batch of phrases
 */
function buildPrompt(items, language, role) {
  const langName = LANG_NAMES[language]
  const gender = role === 'target1' ? 'female' : 'male'

  const numberedPhrases = items.map((item, i) => `${i + 1}. ${item.text}`).join('\n')

  if (language === 'ara') {
    return buildArabicPrompt(numberedPhrases, gender)
  }

  return buildRomancePrompt(numberedPhrases, langName, gender)
}

function buildRomancePrompt(numberedPhrases, langName, gender) {
  return `You adjust ${langName} text so it sounds natural when spoken by a ${gender} speaker.

The ONLY thing you may change is grammatical agreement with the first-person speaker (je/I):
- Adjectives describing the speaker: content→contente, prêt→prête, seul→seule
- Past participles with être where the subject is the speaker: je suis allé→je suis allée
- Fragments where the speaker is implied: "fatigué" → "fatiguée" (for female)

You must NOT change:
- Third-person references: "mon ami", "elle est contente", "il est parti" — leave exactly as-is
- Grammar errors — do NOT fix conjugations, spelling, or agreement with non-speaker nouns
- Words like "monsieur"/"madame", "homme"/"femme" — these refer to other people
- Meaning, word order, or word count — the output must have identical words except for speaker-agreement morphology
- Past participles with avoir — these do NOT agree with the speaker (French rule)

If no speaker-agreement change is needed, return the original text EXACTLY as given, character for character.

Phrases:
${numberedPhrases}

Respond with JSON only, no markdown: {"results": [{"i": 1, "t": "adjusted or original"}, ...]}`
}

function buildArabicPrompt(numberedPhrases, gender) {
  return `You adjust Arabic text so it sounds natural when spoken by a ${gender} speaker.

The ONLY things you may change are grammatical forms that must agree with the first-person speaker (أنا):
- Predicate adjectives describing the speaker: أنا سعيد→أنا سعيدة, أنا مستعد→أنا مستعدة (for female)
- Active/passive participles used as predicates about the speaker: أنا مسافر→أنا مسافرة, أنا متأكد→أنا متأكدة (for female)
- Standalone adjective fragments where the speaker is implied: "متعب" → "متعبة" (for female)

You must NOT change:
- Verb conjugations — Arabic 1st person past (ـتُ) and present (أ) do NOT change for gender
- Third-person references — هو سعيد, هي جميلة, صديقي — leave exactly as-is
- 2nd person forms — do NOT change أنتَ/أنتِ or verb forms addressing someone else
- Grammar errors — do NOT fix anything unrelated to speaker-agreement
- Meaning, word order, or word count — output must have identical words except for speaker-agreement morphology

If no speaker-agreement change is needed, return the original text EXACTLY as given, character for character.

Phrases:
${numberedPhrases}

Respond with JSON only, no markdown: {"results": [{"i": 1, "t": "adjusted or original"}, ...]}`
}

/**
 * Parse Haiku's JSON response, with regex fallback
 */
function parseResponse(content) {
  // Try direct JSON parse first
  try {
    return JSON.parse(content)
  } catch {
    // Fallback: extract JSON object from response (handles markdown code blocks)
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * Call Haiku for a single batch of items (all same language + role)
 *
 * @param {Array<{text: string}>} items - Phrases to process
 * @param {string} language - Language code
 * @param {string} role - 'target1' (female) or 'target2' (male)
 * @returns {Array<{text: string, expandedText: string, wasModified: boolean}>}
 */
async function callHaikuBatch(items, language, role) {
  try {
    const prompt = buildPrompt(items, language, role)

    const content = await claudeChat(prompt, { model: 'sonnet' })
    const parsed = parseResponse(content)

    if (!parsed?.results || !Array.isArray(parsed.results)) {
      console.warn('[GenderHaiku] Failed to parse response, returning originals')
      return items.map(item => ({
        text: item.text,
        expandedText: item.text,
        wasModified: false
      }))
    }

    // Map results back by index
    const resultMap = new Map()
    for (const r of parsed.results) {
      resultMap.set(r.i, r.t)
    }

    return items.map((item, idx) => {
      const expanded = resultMap.get(idx + 1) // 1-indexed in prompt
      if (expanded && expanded !== item.text) {
        return { text: item.text, expandedText: expanded, wasModified: true }
      }
      return { text: item.text, expandedText: item.text, wasModified: false }
    })
  } catch (apiError) {
    console.error('[GenderHaiku] API error:', apiError.message)
    return items.map(item => ({
      text: item.text,
      expandedText: item.text,
      wasModified: false
    }))
  }
}

/**
 * Batch gender expand for all items. Pre-processes before TTS generation.
 *
 * @param {Array<{text: string, language: string, role: string}>} items
 * @returns {Promise<Map<string, {expandedText: string, wasModified: boolean}>>}
 *   Map keyed by `${text}|${language}|${role}`
 */
async function batchGenderExpand(items) {
  const resultMap = new Map()

  if (!items || items.length === 0) return resultMap

  // Filter to gendered languages only
  const gendered = items.filter(item =>
    GENDERED_LANGUAGES.includes(item.language) &&
    (item.role === 'target1' || item.role === 'target2')
  )

  if (gendered.length === 0) return resultMap

  // Deduplicate by text|language|role
  const uniqueMap = new Map()
  for (const item of gendered) {
    const key = `${item.text}|${item.language}|${item.role}`
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item)
    }
  }
  const uniqueItems = [...uniqueMap.values()]

  // Group by language + role (each batch must be same language + role for prompt)
  const groups = new Map()
  for (const item of uniqueItems) {
    const groupKey = `${item.language}|${item.role}`
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey).push(item)
  }

  // Build all batch calls
  const batchCalls = []
  for (const [groupKey, groupItems] of groups) {
    const [language, role] = groupKey.split('|')
    // Split into batches of BATCH_SIZE
    for (let i = 0; i < groupItems.length; i += BATCH_SIZE) {
      const batch = groupItems.slice(i, i + BATCH_SIZE)
      batchCalls.push({ batch, language, role })
    }
  }

  // Execute with concurrency limit
  const results = []
  console.log(`[GenderHaiku] ${batchCalls.length} batches to process (${uniqueItems.length} unique items, concurrency=${MAX_CONCURRENCY})`)
  for (let i = 0; i < batchCalls.length; i += MAX_CONCURRENCY) {
    const concurrent = batchCalls.slice(i, i + MAX_CONCURRENCY)
    const batchResults = await Promise.all(
      concurrent.map(({ batch, language, role }) =>
        callHaikuBatch(batch, language, role).then(res =>
          res.map((r, idx) => ({ ...r, language, role, key: `${batch[idx].text}|${language}|${role}` }))
        )
      )
    )
    results.push(...batchResults.flat())
    if ((i / MAX_CONCURRENCY) % 10 === 0) {
      console.log(`[GenderHaiku] Progress: ${Math.min(i + MAX_CONCURRENCY, batchCalls.length)}/${batchCalls.length} batches`)
    }
  }

  // Build the result map
  for (const r of results) {
    resultMap.set(r.key, {
      expandedText: r.expandedText,
      wasModified: r.wasModified
    })
  }

  return resultMap
}

/**
 * Single-item wrapper for backwards compatibility
 *
 * @param {string} text
 * @param {string} language
 * @param {string} role
 * @returns {Promise<{originalText: string, expandedText: string, wasModified: boolean}>}
 */
async function analyzeAndExpand(text, language, role) {
  if (!text || !GENDERED_LANGUAGES.includes(language) || (role !== 'target1' && role !== 'target2')) {
    return { originalText: text || '', expandedText: text || '', wasModified: false }
  }

  const map = await batchGenderExpand([{ text, language, role }])
  const key = `${text}|${language}|${role}`
  const result = map.get(key)

  return {
    originalText: text,
    expandedText: result?.expandedText || text,
    wasModified: result?.wasModified || false
  }
}

/**
 * Process all unique target texts for a course and store gender expansions in DB.
 * Idempotent: clears existing rows for the course and reprocesses.
 *
 * @param {string} courseCode
 * @param {object} supabase - Supabase client
 * @returns {Promise<{total: number, modified: number, elapsed: number}>}
 */
async function processAndStore(courseCode, supabase) {
  const start = Date.now()

  // Get course info
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('target_lang')
    .eq('course_code', courseCode)
    .single()

  if (courseErr || !course) {
    throw new Error(`Course not found: ${courseCode}`)
  }

  const language = course.target_lang
  if (!GENDERED_LANGUAGES.includes(language)) {
    throw new Error(`Language ${language} is not gendered (supported: ${GENDERED_LANGUAGES.join(', ')})`)
  }

  // Collect all unique target texts from phrases, LEGOs, and seeds
  const textSet = new Set()

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('target_text')
    .eq('course_code', courseCode)

  if (phrases) phrases.forEach(p => { if (p.target_text) textSet.add(p.target_text) })

  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text')
    .eq('course_code', courseCode)

  if (legos) legos.forEach(l => { if (l.target_text) textSet.add(l.target_text) })

  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('target_text')
    .eq('course_code', courseCode)

  if (seeds) seeds.forEach(s => { if (s.target_text) textSet.add(s.target_text) })

  const uniqueTexts = [...textSet]
  console.log(`[GenderHaiku] Processing ${uniqueTexts.length} unique texts for ${courseCode}`)

  // Build items for both roles
  const allItems = []
  for (const text of uniqueTexts) {
    allItems.push({ text, language, role: 'target1' }) // female
    allItems.push({ text, language, role: 'target2' }) // male
  }

  // Call Haiku for all items
  const resultMap = await batchGenderExpand(allItems)

  // Build rows: only store texts where at least one gender form differs
  const rows = []
  for (const text of uniqueTexts) {
    const fKey = `${text}|${language}|target1`
    const mKey = `${text}|${language}|target2`
    const fResult = resultMap.get(fKey)
    const mResult = resultMap.get(mKey)

    const fChanged = fResult?.wasModified ? fResult.expandedText : null
    const mChanged = mResult?.wasModified ? mResult.expandedText : null

    if (fChanged || mChanged) {
      rows.push({
        course_code: courseCode,
        original_text: text,
        language,
        expanded_f: fChanged,
        expanded_m: mChanged
      })
    }
  }

  // Clear existing and insert fresh (idempotent)
  await supabase
    .from('course_gender_expansions')
    .delete()
    .eq('course_code', courseCode)

  if (rows.length > 0) {
    // Insert in batches of 500 to avoid payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error: insertErr } = await supabase
        .from('course_gender_expansions')
        .insert(batch)

      if (insertErr) {
        throw new Error(`Failed to insert gender expansions: ${insertErr.message}`)
      }
    }
  }

  const elapsed = Date.now() - start
  console.log(`[GenderHaiku] Stored ${rows.length}/${uniqueTexts.length} modified texts in ${elapsed}ms`)

  return { total: uniqueTexts.length, modified: rows.length, elapsed }
}

/**
 * Load pre-computed gender expansions from DB for use at TTS time.
 * Returns a Map keyed by `${text}|${language}|${role}` for O(1) lookups.
 *
 * @param {string} courseCode
 * @param {object} supabase - Supabase client
 * @returns {Promise<Map<string, {expandedText: string, wasModified: boolean}>>}
 */
async function loadGenderMap(courseCode, supabase) {
  const map = new Map()

  const { data: rows, error } = await supabase
    .from('course_gender_expansions')
    .select('original_text, language, expanded_f, expanded_m')
    .eq('course_code', courseCode)

  if (error) {
    console.error(`[GenderHaiku] Failed to load gender map: ${error.message}`)
    return map
  }

  if (!rows || rows.length === 0) return map

  for (const row of rows) {
    if (row.expanded_f) {
      map.set(`${row.original_text}|${row.language}|target1`, {
        expandedText: row.expanded_f,
        wasModified: true
      })
    }
    if (row.expanded_m) {
      map.set(`${row.original_text}|${row.language}|target2`, {
        expandedText: row.expanded_m,
        wasModified: true
      })
    }
  }

  return map
}

module.exports = {
  batchGenderExpand,
  analyzeAndExpand,
  processAndStore,
  loadGenderMap,
  GENDERED_LANGUAGES,
  // Exported for testing
  buildPrompt,
  parseResponse,
  callHaikuBatch
}
