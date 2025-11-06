/**
 * LEGO Format Adapter
 *
 * Provides format detection and transformation between Phase 3 v7.7 and v5.0 formats.
 *
 * v7.7: Grammar-forward, Type A/B/C/D classification, patterns as properties
 * v5.0: Known Language First, Atomic/Molecular classification, patterns as collections
 *
 * Key Changes:
 * - Seed pair: {target, known} → [target, known]
 * - Type: A/B/C/D → A/M (Atomic/Molecular)
 * - Molecular LEGOs: Added 5th element (componentization array)
 * - Added pattern_summary section
 * - Added lego_summary section
 */

/**
 * Detect LEGO data format version
 * @param {object} legoData - The LEGO data to analyze
 * @returns {string} Version string: "5.0", "7.7", or "unknown"
 */
export function detectVersion(legoData) {
  if (!legoData || typeof legoData !== 'object') {
    return 'unknown'
  }

  // Explicit version field (v5.0+)
  if (legoData.version === '5.0') {
    return '5.0'
  }

  if (legoData.version === '7.7') {
    return '7.7'
  }

  // Heuristic detection based on structure
  if (legoData.pattern_summary && legoData.lego_summary) {
    return '5.0'
  }

  if (legoData.methodology === 'Known Language First Mapping') {
    return '5.0'
  }

  if (legoData.terminology === 'Atomic (A) / Molecular (M)') {
    return '5.0'
  }

  // Check seed format
  if (legoData.seeds && legoData.seeds.length > 0) {
    const firstSeed = legoData.seeds[0]
    if (firstSeed && firstSeed[1]) {
      // v5.0: seed_pair is array [target, known]
      if (Array.isArray(firstSeed[1])) {
        return '5.0'
      }
      // v7.7: seed_pair is object {target, known}
      if (firstSeed[1].target && firstSeed[1].known) {
        return '7.7'
      }
    }
  }

  return 'unknown'
}

/**
 * Transform v7.7 format to v5.0 format
 * @param {object} v7Data - LEGO data in v7.7 format
 * @returns {object} LEGO data in v5.0 format
 */
export function transformToV5(v7Data) {
  if (!v7Data || !v7Data.seeds) {
    throw new Error('Invalid v7.7 data structure')
  }

  const v5Data = {
    version: '5.0',
    methodology: 'Known Language First Mapping',
    terminology: 'Atomic (A) / Molecular (M)',
    course: v7Data.course || 'unknown',
    target_language: v7Data.target_language || 'spa',
    known_language: v7Data.known_language || 'eng',
    extracted_date: v7Data.extracted_date || new Date().toISOString().split('T')[0],
    seeds: [],
    pattern_summary: {},
    lego_summary: {
      total_legos: 0,
      atomic: 0,
      molecular: 0
    }
  }

  // Track patterns across seeds
  const patternInstances = {}

  // Transform each seed
  for (const seed of v7Data.seeds) {
    const [seedId, seedPair, legos] = seed

    // Transform seed pair: object → array
    const v5SeedPair = Array.isArray(seedPair)
      ? seedPair
      : [seedPair.target, seedPair.known]

    // Transform LEGOs
    const v5Legos = legos.map(lego => {
      const [legoId, type, target, known, ...rest] = lego

      // Map type: B/C/D → M (Molecular), A stays A
      let v5Type = type
      if (type === 'B' || type === 'C' || type === 'D') {
        v5Type = 'M'
        v5Data.lego_summary.molecular++

        // For molecular LEGOs, ensure componentization array exists
        if (rest.length === 0) {
          // Generate basic componentization (split by spaces)
          const words = target.split(' ')
          const components = words.map(word => [word, `[${word}]`])
          return [legoId, v5Type, target, known, components]
        } else {
          // Use existing componentization
          return [legoId, v5Type, target, known, ...rest]
        }
      } else {
        v5Data.lego_summary.atomic++
        return [legoId, v5Type, target, known, ...rest]
      }
    })

    v5Data.lego_summary.total_legos += v5Legos.length

    v5Data.seeds.push([seedId, v5SeedPair, v5Legos])

    // Track pattern instances (if pattern data exists)
    if (v7Data.pattern_data && v7Data.pattern_data[seedId]) {
      const seedPatterns = v7Data.pattern_data[seedId]
      for (const patternId in seedPatterns) {
        if (!patternInstances[patternId]) {
          patternInstances[patternId] = {
            introduced: seedId,
            structure: seedPatterns[patternId].structure || '',
            instances: []
          }
        }
        patternInstances[patternId].instances.push(seedId)
      }
    }
  }

  // Add pattern summary
  v5Data.pattern_summary = patternInstances

  return v5Data
}

/**
 * Transform v5.0 format to v7.7 format (for legacy compatibility)
 * @param {object} v5Data - LEGO data in v5.0 format
 * @returns {object} LEGO data in v7.7 format
 */
export function transformToV7(v5Data) {
  if (!v5Data || !v5Data.seeds) {
    throw new Error('Invalid v5.0 data structure')
  }

  const v7Data = {
    version: '7.7',
    course: v5Data.course || 'unknown',
    target_language: v5Data.target_language || 'spa',
    known_language: v5Data.known_language || 'eng',
    extracted_date: v5Data.extracted_date || new Date().toISOString().split('T')[0],
    seeds: [],
    pattern_data: {}
  }

  // Transform each seed
  for (const seed of v5Data.seeds) {
    const [seedId, seedPair, legos] = seed

    // Transform seed pair: array → object
    const v7SeedPair = Array.isArray(seedPair)
      ? { target: seedPair[0], known: seedPair[1] }
      : seedPair

    // Transform LEGOs
    const v7Legos = legos.map(lego => {
      const [legoId, type, target, known, components, ...rest] = lego

      // Map type: M → C (as default), A stays A
      let v7Type = type
      if (type === 'M') {
        v7Type = 'C' // Default molecular to C
      }

      // Remove componentization array (v7.7 doesn't have it)
      return [legoId, v7Type, target, known]
    })

    v7Data.seeds.push([seedId, v7SeedPair, v7Legos])
  }

  // Transform pattern summary to pattern data
  if (v5Data.pattern_summary) {
    for (const patternId in v5Data.pattern_summary) {
      const pattern = v5Data.pattern_summary[patternId]
      for (const seedId of pattern.instances || []) {
        if (!v7Data.pattern_data[seedId]) {
          v7Data.pattern_data[seedId] = {}
        }
        v7Data.pattern_data[seedId][patternId] = {
          structure: pattern.structure,
          introduced: pattern.introduced
        }
      }
    }
  }

  return v7Data
}

/**
 * Validate v5.0 format structure
 * @param {object} data - LEGO data to validate
 * @returns {object} {valid: boolean, errors: string[]}
 */
export function validateV5Format(data) {
  const errors = []

  if (!data) {
    errors.push('Data is null or undefined')
    return { valid: false, errors }
  }

  // Check required top-level fields
  if (data.version !== '5.0') {
    errors.push('Missing or incorrect version field (expected "5.0")')
  }

  if (!data.seeds || !Array.isArray(data.seeds)) {
    errors.push('Missing or invalid "seeds" array')
    return { valid: false, errors }
  }

  // Validate each seed
  data.seeds.forEach((seed, idx) => {
    if (!Array.isArray(seed) || seed.length < 3) {
      errors.push(`Seed ${idx}: Invalid structure (expected [seedId, seedPair, legos])`)
      return
    }

    const [seedId, seedPair, legos] = seed

    // Validate seed pair format (should be array)
    if (!Array.isArray(seedPair) || seedPair.length !== 2) {
      errors.push(`Seed ${seedId}: seed_pair should be array [target, known]`)
    }

    // Validate LEGOs
    if (!Array.isArray(legos)) {
      errors.push(`Seed ${seedId}: legos should be an array`)
      return
    }

    legos.forEach((lego, legoIdx) => {
      if (!Array.isArray(lego) || lego.length < 4) {
        errors.push(`Seed ${seedId}, LEGO ${legoIdx}: Invalid structure (minimum 4 elements)`)
        return
      }

      const [legoId, type, target, known, components] = lego

      // Validate type
      if (type !== 'A' && type !== 'M') {
        errors.push(`${legoId}: Invalid type "${type}" (expected "A" or "M")`)
      }

      // Validate molecular LEGOs have componentization
      if (type === 'M' && !components) {
        errors.push(`${legoId}: Molecular LEGO missing componentization array (5th element)`)
      }

      // Validate componentization structure
      if (components) {
        if (!Array.isArray(components)) {
          errors.push(`${legoId}: Componentization should be an array`)
        } else {
          components.forEach((comp, compIdx) => {
            if (!Array.isArray(comp) || comp.length !== 2) {
              errors.push(`${legoId}, component ${compIdx}: Should be [word, translation]`)
            }
          })
        }
      }
    })
  })

  // Validate pattern_summary
  if (data.pattern_summary && typeof data.pattern_summary !== 'object') {
    errors.push('pattern_summary should be an object')
  }

  // Validate lego_summary
  if (data.lego_summary) {
    if (typeof data.lego_summary.total_legos !== 'number') {
      errors.push('lego_summary.total_legos should be a number')
    }
    if (typeof data.lego_summary.atomic !== 'number') {
      errors.push('lego_summary.atomic should be a number')
    }
    if (typeof data.lego_summary.molecular !== 'number') {
      errors.push('lego_summary.molecular should be a number')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate v7.7 format structure
 * @param {object} data - LEGO data to validate
 * @returns {object} {valid: boolean, errors: string[]}
 */
export function validateV7Format(data) {
  const errors = []

  if (!data) {
    errors.push('Data is null or undefined')
    return { valid: false, errors }
  }

  if (!data.seeds || !Array.isArray(data.seeds)) {
    errors.push('Missing or invalid "seeds" array')
    return { valid: false, errors }
  }

  // Validate each seed
  data.seeds.forEach((seed, idx) => {
    if (!Array.isArray(seed) || seed.length < 3) {
      errors.push(`Seed ${idx}: Invalid structure (expected [seedId, seedPair, legos])`)
      return
    }

    const [seedId, seedPair, legos] = seed

    // Validate seed pair format (should be object)
    if (!seedPair || typeof seedPair !== 'object' || Array.isArray(seedPair)) {
      errors.push(`Seed ${seedId}: seed_pair should be object {target, known}`)
    } else if (!seedPair.target || !seedPair.known) {
      errors.push(`Seed ${seedId}: seed_pair missing target or known`)
    }

    // Validate LEGOs
    if (!Array.isArray(legos)) {
      errors.push(`Seed ${seedId}: legos should be an array`)
      return
    }

    legos.forEach((lego, legoIdx) => {
      if (!Array.isArray(lego) || lego.length < 4) {
        errors.push(`Seed ${seedId}, LEGO ${legoIdx}: Invalid structure (minimum 4 elements)`)
        return
      }

      const [legoId, type, target, known] = lego

      // Validate type
      if (!['A', 'B', 'C', 'D'].includes(type)) {
        errors.push(`${legoId}: Invalid type "${type}" (expected A/B/C/D)`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get a normalized LEGO structure (always returns v5.0 format)
 * This is the primary function for consuming LEGO data in the application
 * @param {object} data - LEGO data in any format
 * @returns {object} LEGO data in v5.0 format
 */
export function getNormalizedFormat(data) {
  const version = detectVersion(data)

  if (version === '5.0') {
    return data
  }

  if (version === '7.7') {
    return transformToV5(data)
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

  if (normalized.lego_summary) {
    return {
      ...normalized.lego_summary,
      seeds: normalized.seeds.length
    }
  }

  // Calculate if not present
  let atomic = 0
  let molecular = 0

  normalized.seeds.forEach(seed => {
    const legos = seed[2] || []
    legos.forEach(lego => {
      if (lego[1] === 'A') {
        atomic++
      } else if (lego[1] === 'M') {
        molecular++
      }
    })
  })

  return {
    total_legos: atomic + molecular,
    atomic,
    molecular,
    seeds: normalized.seeds.length
  }
}

/**
 * Extract pattern summary from data
 * @param {object} data - LEGO data (any format)
 * @returns {object} Pattern summary object
 */
export function extractPatternSummary(data) {
  const normalized = getNormalizedFormat(data)
  return normalized.pattern_summary || {}
}

/**
 * Check if LEGO is molecular (has componentization)
 * @param {array} lego - LEGO array [legoId, type, target, known, components?]
 * @returns {boolean} True if molecular
 */
export function isMolecularLego(lego) {
  if (!Array.isArray(lego) || lego.length < 2) {
    return false
  }

  const type = lego[1]
  return type === 'M' || (lego.length >= 5 && Array.isArray(lego[4]))
}

/**
 * Get LEGO components (for molecular LEGOs)
 * @param {array} lego - LEGO array
 * @returns {array|null} Components array or null if atomic
 */
export function getLegoComponents(lego) {
  if (!isMolecularLego(lego)) {
    return null
  }

  return lego[4] || []
}

export default {
  detectVersion,
  transformToV5,
  transformToV7,
  validateV5Format,
  validateV7Format,
  getNormalizedFormat,
  extractLegoSummary,
  extractPatternSummary,
  isMolecularLego,
  getLegoComponents
}
