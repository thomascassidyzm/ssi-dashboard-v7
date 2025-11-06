/**
 * VFS Loader - Reads course data from public/vfs/courses directory
 * Supports both amino acids format (individual files) and legacy format (bundled JSON)
 */

const VFS_BASE = '/vfs/courses'

/**
 * Load a JSON file from VFS with error handling
 */
async function loadJSON(path) {
  try {
    const response = await fetch(path, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (err) {
    console.log(`[VFS] Could not load ${path}:`, err.message)
    return null
  }
}

/**
 * Load course metadata
 */
export async function loadCourseMetadata(courseCode) {
  const metadata = await loadJSON(`${VFS_BASE}/${courseCode}/course_metadata.json`)
  if (metadata) {
    return metadata
  }

  // Fallback: infer from course code
  const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/)
  if (match) {
    return {
      course_code: courseCode,
      target_language: match[1].toUpperCase(),
      known_language: match[2].toUpperCase(),
      total_seeds: parseInt(match[3]),
      version: '1.0.0',
      status: 'unknown'
    }
  }

  return null
}

/**
 * Load all translation files from amino_acids/translations/
 * Returns array of translation objects with uuid, seed_id, source, target
 */
export async function loadTranslations(courseCode) {
  // Try amino acids format first
  const aminoTranslations = await loadAminoAcidsTranslations(courseCode)
  if (aminoTranslations.length > 0) {
    return aminoTranslations
  }

  // Fallback to legacy format
  const legacyTranslations = await loadLegacyTranslations(courseCode)
  return legacyTranslations
}

/**
 * Load translations from amino_acids/translations/ directory
 */
async function loadAminoAcidsTranslations(courseCode) {
  // Try to load bundled translations file
  const bundledPath = `${VFS_BASE}/${courseCode}/amino_acids/translations_bundle.json`
  const bundled = await loadJSON(bundledPath)

  if (bundled && Array.isArray(bundled)) {
    // It's an array of translation objects
    return bundled.map(t => ({
      uuid: t.uuid,
      seed_id: t.seed_id,
      source: t.source,
      target: t.target,
      metadata: t.metadata
    }))
  }

  return []
}

/**
 * Load translations from legacy seed_pairs.json format
 */
async function loadLegacyTranslations(courseCode) {
  const seedPairsData = await loadJSON(`${VFS_BASE}/${courseCode}/seed_pairs.json`)

  if (!seedPairsData || !seedPairsData.translations) {
    return []
  }

  // Legacy format: { "S0001": ["target", "known"], ... }
  const translationsObj = seedPairsData.translations
  return Object.entries(translationsObj).map(([seed_id, [target, source]]) => ({
    seed_id,
    source, // known language
    target, // target language
    uuid: seed_id
  })).sort((a, b) => a.seed_id.localeCompare(b.seed_id))
}

/**
 * Load all LEGO files from amino_acids/legos/
 * Returns array of lego objects with uuid, text, provenance, scores
 */
export async function loadLegos(courseCode) {
  // Try amino acids format first
  const aminoLegos = await loadAminoAcidsLegos(courseCode)
  if (aminoLegos.length > 0) {
    return aminoLegos
  }

  // Fallback to legacy format
  const legacyLegos = await loadLegacyLegos(courseCode)
  return legacyLegos
}

/**
 * Load LEGOs from amino_acids/legos/ directory
 */
async function loadAminoAcidsLegos(courseCode) {
  // Try to load bundled LEGOs
  const bundledPath = `${VFS_BASE}/${courseCode}/amino_acids/legos_bundle.json`
  const bundled = await loadJSON(bundledPath)

  if (bundled && Array.isArray(bundled)) {
    return bundled
  }

  return []
}

/**
 * Load LEGOs from legacy lego_pairs.json format
 */
async function loadLegacyLegos(courseCode) {
  const legoPairsData = await loadJSON(`${VFS_BASE}/${courseCode}/lego_pairs.json`)

  if (!legoPairsData || !legoPairsData.seeds) {
    return []
  }

  // Legacy format: { seeds: [[seed_id, [target, known], [[lego_id, type, t, k], ...]]] }
  const seedsArray = legoPairsData.seeds
  const legos = []

  for (const [seed_id, [seed_target, seed_known], legoArray] of seedsArray) {
    for (const legoEntry of legoArray) {
      const [lego_id, type, target_chunk, known_chunk] = legoEntry
      legos.push({
        lego_id,
        seed_id,
        lego_type: type === 'B' ? 'BASE' : type === 'C' ? 'COMPOSITE' : type === 'F' ? 'FEEDER' : type,
        target_chunk,
        known_chunk,
        provenance: lego_id // Use lego_id as provenance for legacy format
      })
    }
  }

  return legos
}

/**
 * Load LEGO breakdowns for the visualizer
 * Returns array in format: [seed_id, [target, known], [[lego_id, type, t, k], ...]]
 */
export async function loadLegoBreakdowns(courseCode) {
  // Try amino acids bundled format first
  const bundledPath = `${VFS_BASE}/${courseCode}/amino_acids/lego_breakdowns_bundle.json`
  const bundled = await loadJSON(bundledPath)

  if (bundled && Array.isArray(bundled)) {
    return bundled
  }

  // Try legacy format
  const legoPairsData = await loadJSON(`${VFS_BASE}/${courseCode}/lego_pairs.json`)

  if (legoPairsData && legoPairsData.seeds) {
    // Convert to breakdown format expected by CourseEditor
    return legoPairsData.seeds.map(([seed_id, [original_target, original_known], legoArray]) => ({
      seed_id,
      original_target,
      original_known,
      lego_pairs: legoArray.map(([lego_id, type, target_chunk, known_chunk]) => ({
        lego_id,
        lego_type: type === 'B' ? 'BASE' : type === 'C' ? 'COMPOSITE' : type === 'F' ? 'FEEDER' : type,
        target_chunk,
        known_chunk,
        fd_validated: true
      })),
      feeder_pairs: []
    }))
  }

  // Try LEGO_BREAKDOWNS_COMPLETE.json (older legacy format)
  const breakdownsData = await loadJSON(`${VFS_BASE}/${courseCode}/LEGO_BREAKDOWNS_COMPLETE.json`)

  if (breakdownsData && breakdownsData.lego_breakdowns) {
    return breakdownsData.lego_breakdowns.map(breakdown => ({
      seed_id: breakdown.seed_id,
      original_target: breakdown.original_target,
      original_known: breakdown.original_known,
      lego_pairs: (breakdown.lego_pairs || []).map(pair => ({
        lego_id: pair.lego_id,
        lego_type: pair.lego_type || 'BASE',
        target_chunk: pair.target_chunk,
        known_chunk: pair.known_chunk,
        fd_validated: pair.fd_validated || false,
        componentization: pair.componentization
      })),
      feeder_pairs: breakdown.feeder_pairs || []
    }))
  }

  return []
}

/**
 * Load all basket files from amino_acids/baskets/
 * Returns baskets data object keyed by lego_id
 */
export async function loadBaskets(courseCode) {
  // Try amino acids format first
  const aminoBaskets = await loadAminoAcidsBaskets(courseCode)
  if (aminoBaskets) {
    return aminoBaskets
  }

  // Fallback to legacy format
  const legacyBaskets = await loadLegacyBaskets(courseCode)
  return legacyBaskets
}

/**
 * Load baskets from amino_acids/baskets/ directory
 */
async function loadAminoAcidsBaskets(courseCode) {
  // Try baskets display format (keyed by lego_id for CourseEditor)
  const displayPath = `${VFS_BASE}/${courseCode}/amino_acids/baskets_display.json`
  const display = await loadJSON(displayPath)

  if (display && typeof display === 'object') {
    return display
  }

  // Try bundled baskets array
  const bundledPath = `${VFS_BASE}/${courseCode}/amino_acids/baskets_bundle.json`
  const bundled = await loadJSON(bundledPath)

  if (bundled && Array.isArray(bundled)) {
    return bundled
  }

  return null
}

/**
 * Load baskets from legacy lego_baskets.json or baskets_deduplicated.json format
 */
async function loadLegacyBaskets(courseCode) {
  // Try lego_baskets.json first (newer legacy format)
  const legoBasketsData = await loadJSON(`${VFS_BASE}/${courseCode}/lego_baskets.json`)
  if (legoBasketsData) {
    return legoBasketsData
  }

  // Try baskets_deduplicated.json (older legacy format)
  const basketsData = await loadJSON(`${VFS_BASE}/${courseCode}/baskets_deduplicated.json`)
  if (basketsData) {
    return basketsData
  }

  return null
}

/**
 * Load introductions from amino_acids/introductions/
 */
export async function loadIntroductions(courseCode) {
  const bundledPath = `${VFS_BASE}/${courseCode}/amino_acids/introductions_bundle.json`
  const bundled = await loadJSON(bundledPath)

  if (bundled && Array.isArray(bundled)) {
    return bundled
  }

  return []
}

/**
 * Load complete course data (all components)
 */
export async function loadCourse(courseCode) {
  console.log(`[VFS] Loading course: ${courseCode}`)

  const [metadata, translations, legos, legoBreakdowns, baskets, introductions] = await Promise.all([
    loadCourseMetadata(courseCode),
    loadTranslations(courseCode),
    loadLegos(courseCode),
    loadLegoBreakdowns(courseCode),
    loadBaskets(courseCode),
    loadIntroductions(courseCode)
  ])

  if (!metadata) {
    throw new Error(`Course ${courseCode} not found`)
  }

  // Build course object
  const course = {
    course_code: courseCode,
    source_language: metadata.known_language || metadata.source_language,
    target_language: metadata.target_language,
    total_seeds: metadata.total_seeds,
    version: metadata.version || '1.0.0',
    created_at: metadata.created_at || new Date().toISOString(),
    status: metadata.status || 'unknown',
    seed_pairs: translations.length,
    lego_pairs: legos.length,
    lego_baskets: baskets ? Object.keys(baskets).length : 0,
    phases_completed: metadata.phases_completed || [],
    amino_acids: metadata.amino_acids || {
      translations: translations.length,
      legos: legos.length,
      baskets: baskets ? Object.keys(baskets).length : 0,
      introductions: introductions.length
    }
  }

  console.log(`[VFS] Loaded course ${courseCode}:`, {
    translations: translations.length,
    legos: legos.length,
    breakdowns: legoBreakdowns.length,
    baskets: baskets ? Object.keys(baskets).length : 0,
    introductions: introductions.length
  })

  return {
    course,
    translations,
    legos,
    lego_breakdowns: legoBreakdowns,
    baskets: [], // Legacy format for compatibility
    basketsData: baskets, // New format for display
    introductions
  }
}

/**
 * List all available courses in VFS
 */
export async function listCourses() {
  // Known course codes to check
  const knownCourses = [
    'spa_for_eng_30seeds',
    'fra_for_eng_30seeds',
    'ita_for_eng_30seeds',
    'cmn_for_eng_30seeds',
    'mkd_for_eng_574seeds'
  ]

  const courses = []

  for (const courseCode of knownCourses) {
    try {
      const metadata = await loadCourseMetadata(courseCode)

      if (metadata) {
        // Quick check: does course have any data?
        const translationsExist = await loadJSON(`${VFS_BASE}/${courseCode}/seed_pairs.json`) ||
                                   await loadJSON(`${VFS_BASE}/${courseCode}/amino_acids/translations.json`)

        if (translationsExist) {
          const [translations, legos] = await Promise.all([
            loadTranslations(courseCode),
            loadLegos(courseCode)
          ])

          courses.push({
            course_code: courseCode,
            source_language: metadata.known_language || metadata.source_language || 'ENG',
            target_language: metadata.target_language || courseCode.substring(0, 3).toUpperCase(),
            total_seeds: metadata.total_seeds || translations.length,
            version: metadata.version || '1.0',
            created_at: metadata.created_at || new Date().toISOString(),
            status: metadata.status || 'ready',
            seed_pairs: translations.length,
            lego_pairs: legos.length,
            lego_baskets: 0, // Will be calculated if needed
            phases_completed: metadata.phases_completed || []
          })
        }
      }
    } catch (err) {
      // Course doesn't exist or can't be loaded, skip it
      console.log(`[VFS] Skipping ${courseCode}:`, err.message)
    }
  }

  return courses
}

export default {
  loadCourse,
  loadCourseMetadata,
  loadTranslations,
  loadLegos,
  loadLegoBreakdowns,
  loadBaskets,
  loadIntroductions,
  listCourses
}
