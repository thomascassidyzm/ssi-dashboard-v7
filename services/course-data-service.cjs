/**
 * Course Data Service
 *
 * Unified abstraction layer for database operations on course structure.
 * Provides CRUD operations for seeds, legos, lego_components, and basket_phrases.
 *
 * This service enables the database-first architecture where:
 * - Phase 1 writes seeds/legos directly to database
 * - Phase 2 updates is_new flags in database
 * - Phase 3 writes basket phrases to database
 * - Manifest is generated on-demand from database
 *
 * @version 1.0.0
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const createLogger = require('./shared/logger.cjs');

const logger = createLogger('CourseData');

// Feature flags - can be overridden via environment variables
const USE_DATABASE_WRITES = process.env.USE_DATABASE_WRITES !== 'false';
const USE_DATABASE_READS = process.env.USE_DATABASE_READS !== 'false';

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse seed number from seed_id
 * "s0042" -> 42, "S0042" -> 42
 */
function parseSeedNumber(seedId) {
  if (typeof seedId === 'number') return seedId;
  const match = String(seedId).match(/s?(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse LEGO index from lego_id
 * "lego_s0042_001" -> 1
 */
function parseLegoIndex(legoId) {
  if (typeof legoId === 'number') return legoId;
  const match = String(legoId).match(/_(\d+)$/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Format seed_id from seed number
 * 42 -> "s0042"
 */
function formatSeedId(seedNumber) {
  return 's' + String(seedNumber).padStart(4, '0');
}

/**
 * Format lego_id from seed_id and lego index
 * ("s0042", 1) -> "lego_s0042_001"
 */
function formatLegoId(seedId, legoIndex) {
  return `lego_${seedId}_${String(legoIndex).padStart(3, '0')}`;
}

// =============================================================================
// SEED OPERATIONS
// =============================================================================

/**
 * Save a seed to the database (upsert)
 *
 * @param {string} courseCode - Course identifier (e.g., 'spa_for_eng_v2')
 * @param {Object} seedData - Seed data
 * @param {number|string} seedData.seedNumber - Seed number or seed_id
 * @param {string} seedData.knownText - Known language text
 * @param {string} seedData.targetText - Target language text
 * @param {string} [seedData.canonical] - Canonical form (defaults to knownText)
 * @param {number} [seedData.position] - Position in course (auto-calculated if not provided)
 * @param {boolean} [seedData.isActive=true] - Whether seed is active
 * @returns {Promise<Object>} The saved seed with UUID
 */
async function saveSeed(courseCode, seedData) {
  if (!USE_DATABASE_WRITES) {
    logger.debug('Database writes disabled, skipping saveSeed');
    return null;
  }
  if (!supabase) throw new Error('Supabase not initialized');

  const seedNumber = parseSeedNumber(seedData.seedNumber || seedData.seed_number || seedData.seedId || seedData.seed_id);
  if (!seedNumber) {
    throw new Error('Invalid seed number');
  }

  // Calculate position if not provided
  let position = seedData.position;
  if (!position) {
    const { count } = await supabase
      .from('seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);
    position = (count || 0) + 1;
  }

  const { data, error } = await supabase
    .from('seeds')
    .upsert({
      course_code: courseCode,
      seed_number: seedNumber,
      known_text: seedData.knownText || seedData.known_text || seedData.known,
      target_text: seedData.targetText || seedData.target_text || seedData.target,
      canonical: seedData.canonical || seedData.knownText || seedData.known_text || seedData.known,
      position: position,
      is_active: seedData.isActive !== false
    }, {
      onConflict: 'course_code,seed_number'
    })
    .select()
    .single();

  if (error) throw error;
  logger.debug(`Saved seed ${formatSeedId(seedNumber)} for ${courseCode}`);
  return data;
}

/**
 * Get all seeds for a course with their LEGOs
 *
 * @param {string} courseCode
 * @param {Object} [options]
 * @param {boolean} [options.includeInactive=false] - Include inactive seeds
 * @param {boolean} [options.includeLegos=true] - Include nested LEGOs
 * @returns {Promise<Array>}
 */
async function getSeedsByCourse(courseCode, options = {}) {
  if (!USE_DATABASE_READS) {
    logger.debug('Database reads disabled, returning empty array');
    return [];
  }
  if (!supabase) throw new Error('Supabase not initialized');

  const { includeInactive = false, includeLegos = true } = options;

  let query = supabase
    .from('seeds')
    .select(includeLegos ? `
      *,
      legos (
        *,
        lego_components (*),
        basket_phrases (*)
      )
    ` : '*')
    .eq('course_code', courseCode)
    .order('position');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single seed by course and seed number
 *
 * @param {string} courseCode
 * @param {number|string} seedNumber
 * @param {Object} [options]
 * @param {boolean} [options.includeLegos=true]
 * @returns {Promise<Object|null>}
 */
async function getSeed(courseCode, seedNumber, options = {}) {
  if (!USE_DATABASE_READS) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { includeLegos = true } = options;
  const num = parseSeedNumber(seedNumber);

  const { data, error } = await supabase
    .from('seeds')
    .select(includeLegos ? `
      *,
      legos (
        *,
        lego_components (*),
        basket_phrases (*)
      )
    ` : '*')
    .eq('course_code', courseCode)
    .eq('seed_number', num)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Delete a seed (soft delete - sets is_active = false)
 *
 * @param {string} courseCode
 * @param {number|string} seedNumber
 * @returns {Promise<Object>}
 */
async function deleteSeed(courseCode, seedNumber) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const num = parseSeedNumber(seedNumber);

  const { data, error } = await supabase
    .from('seeds')
    .update({ is_active: false })
    .eq('course_code', courseCode)
    .eq('seed_number', num)
    .select()
    .single();

  if (error) throw error;
  logger.info(`Soft deleted seed ${formatSeedId(num)} from ${courseCode}`);
  return data;
}

// =============================================================================
// LEGO OPERATIONS
// =============================================================================

/**
 * Save a LEGO to the database (upsert)
 *
 * @param {string} seedUuid - UUID of the parent seed
 * @param {Object} legoData
 * @param {number} legoData.legoIndex - LEGO index within seed
 * @param {string} legoData.knownText - Known language text
 * @param {string} legoData.targetText - Target language text
 * @param {string} [legoData.type='A'] - 'A' for Atomic, 'M' for Molecular
 * @param {boolean} [legoData.isNew=true] - First introduction in course
 * @param {number} [legoData.position] - Position in introduction_items
 * @param {string} [legoData.legoId] - Original lego_id from JSON
 * @returns {Promise<Object>}
 */
async function saveLego(seedUuid, legoData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const legoIndex = legoData.legoIndex || legoData.lego_index || parseLegoIndex(legoData.id || legoData.legoId);

  const { data, error } = await supabase
    .from('legos')
    .upsert({
      seed_id: seedUuid,
      lego_index: legoIndex,
      lego_id: legoData.legoId || legoData.lego_id || legoData.id,
      known_text: legoData.knownText || legoData.known_text || legoData.known || legoData.lego?.known,
      target_text: legoData.targetText || legoData.target_text || legoData.target || legoData.lego?.target,
      type: legoData.type || 'A',
      is_new: legoData.isNew !== undefined ? legoData.isNew : (legoData.is_new !== undefined ? legoData.is_new : legoData.new !== false),
      position: legoData.position || legoIndex
    }, {
      onConflict: 'seed_id,lego_index'
    })
    .select()
    .single();

  if (error) throw error;
  logger.debug(`Saved LEGO ${legoIndex} for seed ${seedUuid}`);
  return data;
}

/**
 * Get LEGOs for a seed
 *
 * @param {string} seedUuid
 * @param {Object} [options]
 * @param {boolean} [options.onlyNew=false] - Only return LEGOs with is_new=true
 * @param {boolean} [options.includeComponents=true]
 * @param {boolean} [options.includeBaskets=true]
 * @returns {Promise<Array>}
 */
async function getLegosBySeed(seedUuid, options = {}) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { onlyNew = false, includeComponents = true, includeBaskets = true } = options;

  let selectQuery = '*';
  if (includeComponents) selectQuery += ', lego_components (*)';
  if (includeBaskets) selectQuery += ', basket_phrases (*)';

  let query = supabase
    .from('legos')
    .select(selectQuery)
    .eq('seed_id', seedUuid)
    .order('position');

  if (onlyNew) {
    query = query.eq('is_new', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get all LEGOs for a course
 *
 * @param {string} courseCode
 * @param {Object} [options]
 * @param {boolean} [options.onlyNew=false]
 * @returns {Promise<Array>}
 */
async function getLegosByCourse(courseCode, options = {}) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { onlyNew = false } = options;

  let query = supabase
    .from('legos')
    .select(`
      *,
      seeds!inner (
        course_code,
        seed_number,
        seed_id,
        known_text,
        target_text
      ),
      lego_components (*),
      basket_phrases (*)
    `)
    .eq('seeds.course_code', courseCode)
    .order('position');

  if (onlyNew) {
    query = query.eq('is_new', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Mark a LEGO as new or not new (for conflict resolution)
 *
 * @param {string} legoUuid - UUID of the LEGO
 * @param {boolean} isNew - Whether this is a new LEGO
 * @returns {Promise<Object>}
 */
async function markLegoAsNew(legoUuid, isNew) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('legos')
    .update({ is_new: isNew })
    .eq('id', legoUuid)
    .select()
    .single();

  if (error) throw error;
  logger.debug(`Marked LEGO ${legoUuid} as ${isNew ? 'new' : 'not new'}`);
  return data;
}

/**
 * Update a LEGO (for editing text or type)
 *
 * @param {string} legoUuid
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateLego(legoUuid, updates) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const allowedFields = ['known_text', 'target_text', 'type', 'is_new', 'position'];
  const updateData = {};

  for (const field of allowedFields) {
    const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[field] !== undefined) updateData[field] = updates[field];
    if (updates[camelCase] !== undefined) updateData[field] = updates[camelCase];
  }

  const { data, error } = await supabase
    .from('legos')
    .update(updateData)
    .eq('id', legoUuid)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// LEGO COMPONENT OPERATIONS
// =============================================================================

/**
 * Save a LEGO component (for M-type LEGOs)
 *
 * @param {string} legoUuid
 * @param {Object} componentData
 * @param {number} componentData.position
 * @param {string} componentData.knownText
 * @param {string} componentData.targetText
 * @returns {Promise<Object>}
 */
async function saveLegoComponent(legoUuid, componentData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('lego_components')
    .upsert({
      lego_id: legoUuid,
      position: componentData.position,
      known_text: componentData.knownText || componentData.known_text || componentData.known,
      target_text: componentData.targetText || componentData.target_text || componentData.target
    }, {
      onConflict: 'lego_id,position'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get components for a LEGO
 *
 * @param {string} legoUuid
 * @returns {Promise<Array>}
 */
async function getLegoComponents(legoUuid) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('lego_components')
    .select('*')
    .eq('lego_id', legoUuid)
    .order('position');

  if (error) throw error;
  return data || [];
}

// =============================================================================
// BASKET PHRASE OPERATIONS
// =============================================================================

/**
 * Save a basket phrase
 *
 * @param {string} legoUuid
 * @param {Object} phraseData
 * @param {string} phraseData.knownText
 * @param {string} phraseData.targetText
 * @param {string} [phraseData.phraseType='practice'] - 'component', 'debut', or 'practice'
 * @param {number} phraseData.position
 * @param {boolean} [phraseData.isDebut=false]
 * @param {boolean} [phraseData.isComponent=false]
 * @returns {Promise<Object>}
 */
async function saveBasketPhrase(legoUuid, phraseData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Determine phrase_type from flags if not explicitly provided
  let phraseType = phraseData.phraseType || phraseData.phrase_type;
  if (!phraseType) {
    if (phraseData.isDebut || phraseData.is_debut) phraseType = 'debut';
    else if (phraseData.isComponent || phraseData.is_component) phraseType = 'component';
    else phraseType = 'practice';
  }

  const { data, error } = await supabase
    .from('basket_phrases')
    .upsert({
      lego_id: legoUuid,
      known_text: phraseData.knownText || phraseData.known_text || phraseData.known,
      target_text: phraseData.targetText || phraseData.target_text || phraseData.target,
      phrase_type: phraseType,
      position: phraseData.position,
      is_debut: phraseData.isDebut || phraseData.is_debut || false,
      is_component: phraseData.isComponent || phraseData.is_component || false
    }, {
      onConflict: 'lego_id,position'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save multiple basket phrases at once
 *
 * @param {string} legoUuid
 * @param {Array<Object>} phrases
 * @returns {Promise<Array>}
 */
async function saveBasketPhrases(legoUuid, phrases) {
  if (!USE_DATABASE_WRITES) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const results = [];
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const result = await saveBasketPhrase(legoUuid, {
      ...phrase,
      position: phrase.position || i + 1
    });
    results.push(result);
  }
  return results;
}

/**
 * Get basket phrases for a LEGO
 *
 * @param {string} legoUuid
 * @returns {Promise<Array>}
 */
async function getBasketPhrases(legoUuid) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('basket_phrases')
    .select('*')
    .eq('lego_id', legoUuid)
    .order('position');

  if (error) throw error;
  return data || [];
}

/**
 * Delete all basket phrases for a LEGO (before re-generating)
 *
 * @param {string} legoUuid
 * @returns {Promise<number>} Number of deleted rows
 */
async function clearBasketPhrases(legoUuid) {
  if (!USE_DATABASE_WRITES) return 0;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('basket_phrases')
    .delete()
    .eq('lego_id', legoUuid)
    .select();

  if (error) throw error;
  return data?.length || 0;
}

// =============================================================================
// COURSE OPERATIONS
// =============================================================================

/**
 * Get course progress statistics from database
 *
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
async function getCourseProgress(courseCode) {
  if (!USE_DATABASE_READS) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Get seed count
  const { count: seedCount } = await supabase
    .from('seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('is_active', true);

  // Get LEGO counts
  const { data: legoData } = await supabase
    .from('legos')
    .select(`
      id,
      is_new,
      seeds!inner (course_code)
    `)
    .eq('seeds.course_code', courseCode);

  const legoCount = legoData?.length || 0;
  const newLegoCount = legoData?.filter(l => l.is_new).length || 0;

  // Get basket phrase count
  const { count: basketCount } = await supabase
    .from('basket_phrases')
    .select('*, legos!inner(seeds!inner(course_code))', { count: 'exact', head: true })
    .eq('legos.seeds.course_code', courseCode);

  return {
    courseCode,
    seeds: seedCount || 0,
    legos: legoCount,
    newLegos: newLegoCount,
    basketPhrases: basketCount || 0,
    completedPhases: {
      phase1: seedCount > 0,
      phase2: newLegoCount !== legoCount, // Some LEGOs marked as not new
      phase3: basketCount > 0
    }
  };
}

/**
 * Ensure a course exists in the database
 *
 * @param {string} courseCode
 * @param {string} [knownLang] - Auto-detected from course code if not provided
 * @param {string} [targetLang] - Auto-detected from course code if not provided
 * @returns {Promise<Object>}
 */
async function ensureCourse(courseCode, knownLang, targetLang) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Parse languages from course code if not provided
  // e.g., spa_for_eng_v2 -> target=spa, known=eng
  if (!knownLang || !targetLang) {
    const match = courseCode.match(/^(\w{3})_for_(\w{3})/);
    if (match) {
      targetLang = targetLang || match[1];
      knownLang = knownLang || match[2];
    }
  }

  // Check if exists
  const { data: existing } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  if (existing) return existing;

  // Create new course
  const { data, error } = await supabase
    .from('courses')
    .insert({
      course_code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang
    })
    .select()
    .single();

  if (error) throw error;
  logger.info(`Created course: ${courseCode}`);
  return data;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Import a complete seed with all LEGOs and baskets
 * Useful for Phase 1 output
 *
 * @param {string} courseCode
 * @param {Object} seedData - Complete seed data from Phase 1
 * @returns {Promise<Object>} Summary of imported data
 */
async function importSeedWithLegos(courseCode, seedData) {
  if (!USE_DATABASE_WRITES) return null;

  // Save the seed
  const seed = await saveSeed(courseCode, {
    seedNumber: seedData.seed_number || seedData.seedNumber || parseSeedNumber(seedData.seed_id),
    knownText: seedData.seed_pair?.known || seedData.seed?.known || seedData.known_text,
    targetText: seedData.seed_pair?.target || seedData.seed?.target || seedData.target_text,
    canonical: seedData.canonical,
    position: seedData.position
  });

  let legoCount = 0;
  let componentCount = 0;

  // Save LEGOs
  const legos = seedData.legos || [];
  for (const legoData of legos) {
    const lego = await saveLego(seed.id, {
      legoIndex: legoData.lego_index || parseLegoIndex(legoData.id),
      legoId: legoData.id,
      knownText: legoData.lego?.known,
      targetText: legoData.lego?.target,
      type: legoData.type || 'A',
      isNew: legoData.new !== false,
      position: legoData.position
    });
    legoCount++;

    // Save components for M-type LEGOs
    if (legoData.type === 'M' && legoData.components) {
      for (let i = 0; i < legoData.components.length; i++) {
        await saveLegoComponent(lego.id, {
          position: i + 1,
          knownText: legoData.components[i].known,
          targetText: legoData.components[i].target
        });
        componentCount++;
      }
    }
  }

  return {
    seed,
    legoCount,
    componentCount
  };
}

/**
 * Import basket phrases for a LEGO
 * Useful for Phase 3 output
 *
 * @param {string} courseCode
 * @param {string} legoId - Original lego_id (e.g., "lego_s0042_001")
 * @param {Object} basketData - Basket data from Phase 3
 * @returns {Promise<Object>}
 */
async function importBasket(courseCode, legoId, basketData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Find the LEGO by its original ID
  const { data: lego } = await supabase
    .from('legos')
    .select('id, seeds!inner(course_code)')
    .eq('lego_id', legoId)
    .eq('seeds.course_code', courseCode)
    .single();

  if (!lego) {
    throw new Error(`LEGO not found: ${legoId} in course ${courseCode}`);
  }

  // Clear existing basket phrases
  await clearBasketPhrases(lego.id);

  // Import new phrases
  const phrases = basketData.debut_phrases || basketData.practice_phrases || basketData.phrases || [];
  let position = 0;

  for (const phrase of phrases) {
    position++;
    await saveBasketPhrase(lego.id, {
      knownText: phrase.known,
      targetText: phrase.target,
      position,
      isDebut: phrase.is_debut || false,
      isComponent: phrase.is_component || false
    });
  }

  return {
    legoId,
    phraseCount: position
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Feature flags
  USE_DATABASE_WRITES,
  USE_DATABASE_READS,

  // Helpers
  parseSeedNumber,
  parseLegoIndex,
  formatSeedId,
  formatLegoId,

  // Seed operations
  saveSeed,
  getSeedsByCourse,
  getSeed,
  deleteSeed,

  // LEGO operations
  saveLego,
  getLegosBySeed,
  getLegosByCourse,
  markLegoAsNew,
  updateLego,

  // Component operations
  saveLegoComponent,
  getLegoComponents,

  // Basket operations
  saveBasketPhrase,
  saveBasketPhrases,
  getBasketPhrases,
  clearBasketPhrases,

  // Course operations
  getCourseProgress,
  ensureCourse,

  // Batch operations
  importSeedWithLegos,
  importBasket,

  // Raw client (for advanced queries)
  supabase
};
