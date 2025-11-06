/**
 * LEGO Format Adapter
 *
 * Provides format detection and transformation between Phase 3 format versions.
 *
 * Supported Versions:
 * - v7.7: Grammar-forward, Type A/B/C/D classification, array-based LEGOs
 * - v5.0.0: Known Language First, A/M types, array-based LEGOs
 * - v5.0.1: Known Language First, A/M types, object-based LEGOs with Complete Tiling
 *
 * Key Changes in v5.0.1:
 * - LEGO format: Array → Object {"id", "type", "target", "known", "new"/"ref"}
 * - Seed format: Array → Object {"seed_id", "seed_pair", "legos", "patterns", "cumulative_legos"}
 * - Complete Tiling: Seeds show ALL LEGOs (new + referenced) needed to reconstruct
 * - New/Ref markers: Track LEGO introduction vs reuse
 */

/**
 * Detect LEGO data format version
 * @param {object} legoData - The LEGO data to analyze
 * @returns {string} Version string: "5.0.1", "5.0.0", "5.0", "7.7", or "unknown"
 */
export function detectVersion(legoData) {
  if (!legoData || typeof legoData !== 'object') {
    return 'unknown'
  }

  // Explicit version field
  if (legoData.version === '5.0.1') {
    return '5.0.1'
  }

  if (legoData.version === '5.0') {
    // Check if it's actually 5.0.1 (object-based) or 5.0.0 (array-based)
    if (legoData.seeds && legoData.seeds.length > 0) {
      const firstSeed = legoData.seeds[0]
      if (firstSeed && typeof firstSeed === 'object' && firstSeed.seed_id) {
        return '5.0.1' // Object-based seed structure
      }
      if (Array.isArray(firstSeed)) {
        return '5.0.0' // Array-based seed structure
      }
    }
    return '5.0' // Default to generic 5.0
  }

  if (legoData.version === '7.7') {
    return '7.7'
  }

  // Heuristic detection based on structure
  if (legoData.methodology && legoData.methodology.includes('COMPLETE TILING')) {
    return '5.0.1'
  }

  if (legoData.seeds && legoData.seeds.length > 0) {
    const firstSeed = legoData.seeds[0]

    // v5.0.1: Seed is object with seed_id
    if (firstSeed && typeof firstSeed === 'object' && !Array.isArray(firstSeed)) {
      if (firstSeed.seed_id && firstSeed.legos) {
        // Check if LEGOs are objects
        if (firstSeed.legos[0] && typeof firstSeed.legos[0] === 'object' && !Array.isArray(firstSeed.legos[0])) {
          return '5.0.1'
        }
      }
    }

    // v5.0.0 or v7.7: Seed is array
    if (Array.isArray(firstSeed) && firstSeed.length >= 3) {
      const seedPair = firstSeed[1]

      // v5.0.0: seed_pair is array [target, known]
      if (Array.isArray(seedPair)) {
        return '5.0.0'
      }

      // v7.7: seed_pair is object {target, known}
      if (seedPair && typeof seedPair === 'object' && seedPair.target && seedPair.known) {
        return '7.7'
      }
    }
  }

  // Check for v5.0 indicators
  if (legoData.methodology === 'Known Language First Mapping') {
    return '5.0.0' // Assume older array format
  }

  if (legoData.terminology === 'Atomic (A) / Molecular (M)') {
    return '5.0.0' // Assume older array format
  }

  return 'unknown'
}

/**
 * Transform v7.7 format to v5.0.1 format
 * @param {object} v7Data - LEGO data in v7.7 format
 * @returns {object} LEGO data in v5.0.1 format
 */
export function transformToV5_1(v7Data) {
  if (!v7Data || !v7Data.seeds) {
    throw new Error('Invalid v7.7 data structure')
  }

  const v5Data = {
    version: '5.0.1',
    methodology: 'Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING',
    extraction_date: v7Data.extracted_date || new Date().toISOString().split('T')[0],
    note: 'Every seed shows ALL LEGOs (new + referenced) needed to reconstruct it.',
    seeds: [],
    extraction_notes: {
      lego_summary: {
        total_new_legos: 0,
        atomic: 0,
        molecular: 0
      }
    }
  }

  // Track which LEGOs have been introduced
  const introducedLegos = new Map() // key: target, value: {seedId, legoObj}
  let cumulativeLegos = 0

  // Transform each seed
  for (const seed of v7Data.seeds) {
    const [seedId, seedPair, legos] = seed

    // Transform seed pair: object → array
    const v5SeedPair = Array.isArray(seedPair)
      ? seedPair
      : [seedPair.target, seedPair.known]

    const transformedLegos = []

    // Transform LEGOs
    for (const lego of legos) {
      const [legoId, type, target, known, ...rest] = lego

      // Map type: B/C/D → M (Molecular), A stays A
      let v5Type = type
      let components = null

      if (type === 'B' || type === 'C' || type === 'D') {
        v5Type = 'M'
        // For molecular LEGOs, ensure componentization array exists
        if (rest.length > 0 && Array.isArray(rest[0])) {
          components = rest[0]
        } else {
          // Generate basic componentization (split by spaces)
          const words = target.split(' ')
          components = words.map(word => [word, `[${word}]`])
        }
      }

      // Check if this LEGO was already introduced
      const legoKey = `${target}|${known}`
      const isNew = !introducedLegos.has(legoKey)

      const legoObj = {
        id: legoId,
        type: v5Type,
        target,
        known
      }

      if (isNew) {
        legoObj.new = true
        cumulativeLegos++
        introducedLegos.set(legoKey, { seedId, legoObj })

        if (v5Type === 'A') {
          v5Data.extraction_notes.lego_summary.atomic++
        } else {
          v5Data.extraction_notes.lego_summary.molecular++
        }
        v5Data.extraction_notes.lego_summary.total_new_legos++
      } else {
        const intro = introducedLegos.get(legoKey)
        legoObj.ref = intro.seedId
      }

      if (components) {
        legoObj.components = components
      }

      transformedLegos.push(legoObj)
    }

    // Create v5.0.1 seed object
    v5Data.seeds.push({
      seed_id: seedId,
      seed_pair: v5SeedPair,
      legos: transformedLegos,
      patterns: [], // Would need pattern data from v7
      cumulative_legos: cumulativeLegos
    })
  }

  return v5Data
}

/**
 * Transform v5.0.0 (array format) to v5.0.1 (object format)
 * @param {object} v5_0Data - LEGO data in v5.0.0 format
 * @returns {object} LEGO data in v5.0.1 format
 */
export function transformV5_0ToV5_1(v5_0Data) {
  if (!v5_0Data || !v5_0Data.seeds) {
    throw new Error('Invalid v5.0.0 data structure')
  }

  const v5_1Data = {
    version: '5.0.1',
    methodology: 'Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING',
    extraction_date: v5_0Data.extracted_date || new Date().toISOString().split('T')[0],
    note: 'Every seed shows ALL LEGOs (new + referenced) needed to reconstruct it.',
    seeds: [],
    extraction_notes: v5_0Data.extraction_notes || {}
  }

  // Track which LEGOs have been introduced
  const introducedLegos = new Map() // key: target|known, value: {seedId, legoObj}
  let cumulativeLegos = 0

  // Transform each seed
  for (const seed of v5_0Data.seeds) {
    const [seedId, seedPair, legos] = seed

    const transformedLegos = []

    for (const lego of legos) {
      const [legoId, type, target, known, components, ...rest] = lego

      const legoKey = `${target}|${known}`
      const isNew = !introducedLegos.has(legoKey)

      const legoObj = {
        id: legoId,
        type,
        target,
        known
      }

      if (isNew) {
        legoObj.new = true
        cumulativeLegos++
        introducedLegos.set(legoKey, { seedId, legoObj })
      } else {
        const intro = introducedLegos.get(legoKey)
        legoObj.ref = intro.seedId
      }

      if (components) {
        legoObj.components = components
      }

      transformedLegos.push(legoObj)
    }

    v5_1Data.seeds.push({
      seed_id: seedId,
      seed_pair: seedPair,
      legos: transformedLegos,
      patterns: [], // Would need pattern data
      cumulative_legos: cumulativeLegos
    })
  }

  return v5_1Data
}

/**
 * Transform v5.0.1 to v5.0.0 (for backward compatibility)
 * @param {object} v5_1Data - LEGO data in v5.0.1 format
 * @returns {object} LEGO data in v5.0.0 format
 */
export function transformV5_1ToV5_0(v5_1Data) {
  if (!v5_1Data || !v5_1Data.seeds) {
    throw new Error('Invalid v5.0.1 data structure')
  }

  const v5_0Data = {
    version: '5.0',
    methodology: 'Known Language First Mapping',
    terminology: 'Atomic (A) / Molecular (M)',
    extraction_date: v5_1Data.extraction_date,
    seeds: [],
    extraction_notes: v5_1Data.extraction_notes || {}
  }

  for (const seed of v5_1Data.seeds) {
    const legos = seed.legos.map(lego => {
      const arr = [lego.id, lego.type, lego.target, lego.known]

      if (lego.components) {
        arr.push(lego.components)
      }

      return arr
    })

    v5_0Data.seeds.push([seed.seed_id, seed.seed_pair, legos])
  }

  return v5_0Data
}

/**
 * Transform v5.0.1 to v7.7 (for legacy compatibility)
 * @param {object} v5Data - LEGO data in v5.0.1 format
 * @returns {object} LEGO data in v7.7 format
 */
export function transformV5_1ToV7(v5Data) {
  if (!v5Data || !v5Data.seeds) {
    throw new Error('Invalid v5.0.1 data structure')
  }

  const v7Data = {
    version: '7.7',
    course: v5Data.course || 'unknown',
    target_language: v5Data.target_language || 'spa',
    known_language: v5Data.known_language || 'eng',
    extracted_date: v5Data.extracted_date,
    seeds: [],
    pattern_data: {}
  }

  for (const seed of v5Data.seeds) {
    // Only include NEW LEGOs (not referenced ones) for v7.7
    const newLegos = seed.legos
      .filter(lego => lego.new === true)
      .map(lego => {
        // Map type: M → C (as default), A stays A
        const v7Type = lego.type === 'M' ? 'C' : lego.type
        // Remove componentization (v7.7 doesn't have it)
        return [lego.id, v7Type, lego.target, lego.known]
      })

    const v7SeedPair = Array.isArray(seed.seed_pair)
      ? { target: seed.seed_pair[0], known: seed.seed_pair[1] }
      : seed.seed_pair

    v7Data.seeds.push([seed.seed_id, v7SeedPair, newLegos])
  }

  return v7Data
}

/**
 * Validate v5.0.1 format structure
 * @param {object} data - LEGO data to validate
 * @returns {object} {valid: boolean, errors: string[]}
 */
export function validateV5_1Format(data) {
  const errors = []

  if (!data) {
    errors.push('Data is null or undefined')
    return { valid: false, errors }
  }

  // Check required top-level fields
  if (data.version !== '5.0.1' && data.version !== '5.0') {
    errors.push('Missing or incorrect version field (expected "5.0.1" or "5.0")')
  }

  if (!data.seeds || !Array.isArray(data.seeds)) {
    errors.push('Missing or invalid "seeds" array')
    return { valid: false, errors }
  }

  // Validate each seed
  data.seeds.forEach((seed, idx) => {
    // Check if seed is object (v5.0.1) or array (v5.0.0)
    if (typeof seed === 'object' && !Array.isArray(seed)) {
      // v5.0.1 format
      if (!seed.seed_id) {
        errors.push(`Seed ${idx}: Missing seed_id field`)
      }

      if (!Array.isArray(seed.seed_pair) || seed.seed_pair.length !== 2) {
        errors.push(`Seed ${seed.seed_id || idx}: seed_pair should be array [target, known]`)
      }

      if (!Array.isArray(seed.legos)) {
        errors.push(`Seed ${seed.seed_id || idx}: legos should be an array`)
        return
      }

      // Validate complete tiling
      const hasNewLegos = seed.legos.some(lego => lego.new === true)
      const hasRefLegos = seed.legos.some(lego => lego.ref)

      if (idx > 0 && !hasRefLegos && !hasNewLegos) {
        errors.push(`Seed ${seed.seed_id}: No new or ref markers - complete tiling not implemented`)
      }

      // Validate LEGOs
      seed.legos.forEach((lego, legoIdx) => {
        if (typeof lego !== 'object' || Array.isArray(lego)) {
          errors.push(`Seed ${seed.seed_id}, LEGO ${legoIdx}: Should be object, not array`)
          return
        }

        if (!lego.id || !lego.type || !lego.target || !lego.known) {
          errors.push(`Seed ${seed.seed_id}, LEGO ${legoIdx}: Missing required fields (id, type, target, known)`)
        }

        // Validate type
        if (lego.type !== 'A' && lego.type !== 'M') {
          errors.push(`${lego.id}: Invalid type "${lego.type}" (expected "A" or "M")`)
        }

        // Validate new/ref markers
        if (!lego.new && !lego.ref) {
          errors.push(`${lego.id}: Missing new or ref marker (complete tiling requirement)`)
        }

        if (lego.new && lego.ref) {
          errors.push(`${lego.id}: Cannot have both new and ref markers`)
        }

        // Validate molecular LEGOs have componentization
        if (lego.type === 'M' && !lego.components) {
          errors.push(`${lego.id}: Molecular LEGO missing componentization array`)
        }

        // Validate componentization structure
        if (lego.components) {
          if (!Array.isArray(lego.components)) {
            errors.push(`${lego.id}: Componentization should be an array`)
          } else {
            lego.components.forEach((comp, compIdx) => {
              if (!Array.isArray(comp) || comp.length !== 2) {
                errors.push(`${lego.id}, component ${compIdx}: Should be [word, translation]`)
              }
            })
          }
        }
      })

      // Validate cumulative tracking
      if (typeof seed.cumulative_legos !== 'number') {
        errors.push(`Seed ${seed.seed_id}: Missing or invalid cumulative_legos count`)
      }
    } else if (Array.isArray(seed)) {
      // v5.0.0 format - validate using old logic
      if (seed.length < 3) {
        errors.push(`Seed ${idx}: Invalid array structure (expected [seedId, seedPair, legos])`)
      }
    } else {
      errors.push(`Seed ${idx}: Invalid structure (expected object or array)`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get a normalized LEGO structure (always returns v5.0.1 format)
 * This is the primary function for consuming LEGO data in the application
 * @param {object} data - LEGO data in any format
 * @returns {object} LEGO data in v5.0.1 format
 */
export function getNormalizedFormat(data) {
  const version = detectVersion(data)

  if (version === '5.0.1') {
    return data
  }

  if (version === '5.0.0' || version === '5.0') {
    return transformV5_0ToV5_1(data)
  }

  if (version === '7.7') {
    return transformToV5_1(data)
  }

  throw new Error(`Cannot normalize unknown format version: ${version}`)
}

/**
 * Extract LEGO summary statistics from data
 * @param {object} data - LEGO data (any format)
 * @returns {object} {total_legos, atomic, molecular, seeds}
 */
export function extractLegoSummary(data) {
  const normalized = getNormalizedFormat(data)

  let totalNew = 0
  let atomic = 0
  let molecular = 0

  normalized.seeds.forEach(seed => {
    seed.legos.forEach(lego => {
      if (lego.new === true) {
        totalNew++
        if (lego.type === 'A') {
          atomic++
        } else if (lego.type === 'M') {
          molecular++
        }
      }
    })
  })

  return {
    total_new_legos: totalNew,
    atomic,
    molecular,
    seeds: normalized.seeds.length
  }
}

/**
 * Check if LEGO is molecular (has componentization)
 * @param {object|array} lego - LEGO object or array
 * @returns {boolean} True if molecular
 */
export function isMolecularLego(lego) {
  if (!lego) return false

  // v5.0.1 object format
  if (typeof lego === 'object' && !Array.isArray(lego)) {
    if (lego.type === 'M') return true
    if (lego.components && Array.isArray(lego.components)) return true
    return false
  }

  // v5.0.0 array format
  if (Array.isArray(lego) && lego.length >= 2) {
    const type = lego[1]
    if (type === 'M') return true
    if (lego.length >= 5 && Array.isArray(lego[4])) return true
    return false
  }

  return false
}

/**
 * Get LEGO components (for molecular LEGOs)
 * @param {object|array} lego - LEGO object or array
 * @returns {array|null} Components array or null if atomic
 */
export function getLegoComponents(lego) {
  if (!isMolecularLego(lego)) {
    return null
  }

  // v5.0.1 object format
  if (typeof lego === 'object' && !Array.isArray(lego)) {
    return lego.components || []
  }

  // v5.0.0 array format
  if (Array.isArray(lego)) {
    return lego[4] || []
  }

  return []
}

/**
 * Check if LEGO is new (vs referenced)
 * @param {object|array} lego - LEGO object or array
 * @returns {boolean} True if new
 */
export function isNewLego(lego) {
  // v5.0.1 object format
  if (typeof lego === 'object' && !Array.isArray(lego)) {
    return lego.new === true
  }

  // v5.0.0 array format - no new/ref markers, assume all new
  return true
}

/**
 * Get LEGO reference seed (if referenced)
 * @param {object|array} lego - LEGO object or array
 * @returns {string|null} Seed ID where LEGO was introduced, or null if new
 */
export function getLegoReference(lego) {
  // v5.0.1 object format
  if (typeof lego === 'object' && !Array.isArray(lego)) {
    return lego.ref || null
  }

  // v5.0.0 array format - no ref markers
  return null
}

export default {
  detectVersion,
  transformToV5_1,
  transformV5_0ToV5_1,
  transformV5_1ToV5_0,
  transformV5_1ToV7,
  validateV5_1Format,
  getNormalizedFormat,
  extractLegoSummary,
  isMolecularLego,
  getLegoComponents,
  isNewLego,
  getLegoReference
}
