/**
 * Course Data Service
 *
 * Unified abstraction layer for database operations on course structure.
 * Provides CRUD operations for seeds, legos, and practice_phrases.
 *
 * This service enables the database-first architecture where:
 * - Phase 1 writes seeds/legos directly to database
 * - Phase 2 updates is_new flags in database
 * - Phase 3 writes practice phrases to database
 * - Manifest is generated on-demand from database
 *
 * ALIGNED WITH: /database/migrations/002_registry_schema.sql
 * SCHEMA VERSION: Registry v1.1.0 (2025-12-15)
 *
 * KEY SCHEMA CHANGES:
 * - course_seeds: UUID pk, (course_code, seed_number) unique, status enum
 * - course_legos: UUID pk, (course_code, seed_number, lego_index) unique, components JSONB
 * - course_practice_phrases: UUID pk, word_count + lego_count for runtime classification
 * - NO position on course_seeds (use seed_number for ordering)
 * - NO is_active (use status enum: draft/released/deprecated)
 * - NO lego_components table (components stored as JSONB in course_legos)
 * - NO phrase_type stored (computed at runtime from position)
 *
 * @version 2.0.0
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
 * Supports multiple formats:
 * - "S0001L01" -> 1 (Phase 1 output format)
 * - "S0001L02" -> 2
 * - "lego_s0042_001" -> 1 (legacy format)
 * - "lego_s0042_002" -> 2
 */
function parseLegoIndex(legoId) {
  if (typeof legoId === 'number') return legoId;
  const str = String(legoId);

  // Try Phase 1 format: S0001L01, S0001L02, etc.
  const phaseMatch = str.match(/L(\d+)$/i);
  if (phaseMatch) return parseInt(phaseMatch[1], 10);

  // Try legacy format: lego_s0042_001
  const legacyMatch = str.match(/_(\d+)$/);
  if (legacyMatch) return parseInt(legacyMatch[1], 10);

  return 1;
}

/**
 * Format seed_id from seed number
 * 42 -> "S0042"
 */
function formatSeedId(seedNumber) {
  return 'S' + String(seedNumber).padStart(4, '0');
}

/**
 * Format lego_id from seed_id and lego index
 * ("S0042", 1) -> "S0042L01" (Phase 1 format)
 */
function formatLegoId(seedId, legoIndex) {
  const seedNum = parseSeedNumber(seedId);
  return formatSeedId(seedNum) + 'L' + String(legoIndex).padStart(2, '0');
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
 * @param {string} [seedData.status='draft'] - Status: draft/released/deprecated
 * @param {number} [seedData.releaseBatch] - Release batch number for staged rollout
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

  const { data, error } = await supabase
    .from('course_seeds')
    .upsert({
      course_code: courseCode,
      seed_number: seedNumber,
      known_text: seedData.knownText || seedData.known_text || seedData.known,
      target_text: seedData.targetText || seedData.target_text || seedData.target,
      status: seedData.status || 'draft',
      release_batch: seedData.releaseBatch || seedData.release_batch || null
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
 * @param {string} [options.status='released'] - Filter by status (draft/released/deprecated), or 'all'
 * @param {boolean} [options.includeLegos=true] - Include nested LEGOs
 * @returns {Promise<Array>}
 */
async function getSeedsByCourse(courseCode, options = {}) {
  if (!USE_DATABASE_READS) {
    logger.debug('Database reads disabled, returning empty array');
    return [];
  }
  if (!supabase) throw new Error('Supabase not initialized');

  const { status = 'released', includeLegos = true } = options;

  let query = supabase
    .from('course_seeds')
    .select(includeLegos ? `
      *,
      course_legos (
        *,
        course_practice_phrases (*)
      )
    ` : '*')
    .eq('course_code', courseCode)
    .order('seed_number');

  if (status !== 'all') {
    query = query.eq('status', status);
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
    .from('course_seeds')
    .select(includeLegos ? `
      *,
      course_legos (
        *,
        course_practice_phrases (*)
      )
    ` : '*')
    .eq('course_code', courseCode)
    .eq('seed_number', num)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update seed status
 *
 * @param {string} courseCode
 * @param {number|string} seedNumber
 * @param {string} status - 'draft', 'released', or 'deprecated'
 * @returns {Promise<Object>}
 */
async function updateSeedStatus(courseCode, seedNumber, status) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const num = parseSeedNumber(seedNumber);

  const { data, error } = await supabase
    .from('course_seeds')
    .update({ status })
    .eq('course_code', courseCode)
    .eq('seed_number', num)
    .select()
    .single();

  if (error) throw error;
  logger.info(`Updated seed ${formatSeedId(num)} status to ${status}`);
  return data;
}

/**
 * Delete a seed (soft delete - sets status = 'deprecated')
 *
 * @param {string} courseCode
 * @param {number|string} seedNumber
 * @returns {Promise<Object>}
 */
async function deleteSeed(courseCode, seedNumber) {
  return updateSeedStatus(courseCode, seedNumber, 'deprecated');
}

// =============================================================================
// LEGO OPERATIONS
// =============================================================================

/**
 * Save a LEGO to the database (upsert)
 *
 * @param {string} courseCode - Course identifier
 * @param {number} seedNumber - Parent seed number
 * @param {Object} legoData
 * @param {number} legoData.legoIndex - LEGO index within seed
 * @param {string} legoData.knownText - Known language text
 * @param {string} legoData.targetText - Target language text
 * @param {string} [legoData.type='A'] - 'A' for Atomic, 'M' for Molecular
 * @param {boolean} [legoData.isNew=true] - First introduction in course
 * @param {Array} [legoData.components] - For M-type: [{known, target}, ...]
 * @param {string} [legoData.status='draft'] - Status: draft/released/deprecated
 * @returns {Promise<Object>}
 */
async function saveLego(courseCode, seedNumber, legoData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const legoIndex = legoData.legoIndex || legoData.lego_index || parseLegoIndex(legoData.id || legoData.legoId);

  // Prepare components for M-type LEGOs
  let components = null;
  if (legoData.type === 'M' && legoData.components) {
    components = legoData.components;
  }

  const { data, error } = await supabase
    .from('course_legos')
    .upsert({
      course_code: courseCode,
      seed_number: seedNumber,
      lego_index: legoIndex,
      known_text: legoData.knownText || legoData.known_text || legoData.known || legoData.lego?.known,
      target_text: legoData.targetText || legoData.target_text || legoData.target || legoData.lego?.target,
      type: legoData.type || 'A',
      is_new: legoData.isNew !== undefined ? legoData.isNew : (legoData.is_new !== undefined ? legoData.is_new : true),
      components: components,
      status: legoData.status || 'draft'
    }, {
      onConflict: 'course_code,seed_number,lego_index'
    })
    .select()
    .single();

  if (error) throw error;
  logger.debug(`Saved LEGO ${formatLegoId(formatSeedId(seedNumber), legoIndex)} for ${courseCode}`);
  return data;
}

/**
 * Get LEGOs for a seed
 *
 * @param {string} courseCode
 * @param {number|string} seedNumber
 * @param {Object} [options]
 * @param {boolean} [options.onlyNew=false] - Only return LEGOs with is_new=true
 * @param {boolean} [options.includePhrases=true]
 * @returns {Promise<Array>}
 */
async function getLegosBySeed(courseCode, seedNumber, options = {}) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { onlyNew = false, includePhrases = true } = options;
  const num = parseSeedNumber(seedNumber);

  let selectQuery = '*';
  if (includePhrases) selectQuery += ', course_practice_phrases (*)';

  let query = supabase
    .from('course_legos')
    .select(selectQuery)
    .eq('course_code', courseCode)
    .eq('seed_number', num)
    .order('lego_index');

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
 * @param {string} [options.status='released'] - Filter by status or 'all'
 * @returns {Promise<Array>}
 */
async function getLegosByCourse(courseCode, options = {}) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { onlyNew = false, status = 'released' } = options;

  let query = supabase
    .from('course_legos')
    .select(`*`)
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  if (onlyNew) {
    query = query.eq('is_new', true);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Mark a LEGO as new or not new (for conflict resolution)
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @param {boolean} isNew - Whether this is a new LEGO
 * @returns {Promise<Object>}
 */
async function markLegoAsNew(courseCode, seedNumber, legoIndex, isNew) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('course_legos')
    .update({ is_new: isNew })
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex)
    .select()
    .single();

  if (error) throw error;
  logger.debug(`Marked LEGO ${formatLegoId(formatSeedId(seedNumber), legoIndex)} as ${isNew ? 'new' : 'not new'}`);
  return data;
}

/**
 * Update a LEGO (for editing text or type)
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateLego(courseCode, seedNumber, legoIndex, updates) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const allowedFields = ['known_text', 'target_text', 'type', 'is_new', 'components', 'status'];
  const updateData = {};

  for (const field of allowedFields) {
    const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[field] !== undefined) updateData[field] = updates[field];
    if (updates[camelCase] !== undefined) updateData[field] = updates[camelCase];
  }

  const { data, error } = await supabase
    .from('course_legos')
    .update(updateData)
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// PRACTICE PHRASE OPERATIONS
// =============================================================================

/**
 * Save a practice phrase
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @param {Object} phraseData
 * @param {string} phraseData.knownText
 * @param {string} phraseData.targetText
 * @param {number} phraseData.position - Position in practice sequence
 * @param {number} phraseData.wordCount - Word count for classification
 * @param {number} phraseData.legoCount - LEGO count for classification
 * @param {string} [phraseData.difficulty] - 'easy', 'medium', 'hard'
 * @param {string} [phraseData.register] - 'casual', 'formal'
 * @param {Object} [phraseData.metadata] - Additional metadata as JSONB
 * @returns {Promise<Object>}
 */
async function savePracticePhrase(courseCode, seedNumber, legoIndex, phraseData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .upsert({
      course_code: courseCode,
      seed_number: seedNumber,
      lego_index: legoIndex,
      known_text: phraseData.knownText || phraseData.known_text || phraseData.known,
      target_text: phraseData.targetText || phraseData.target_text || phraseData.target,
      position: phraseData.position,
      word_count: phraseData.wordCount || phraseData.word_count || 0,
      lego_count: phraseData.legoCount || phraseData.lego_count || 0,
      difficulty: phraseData.difficulty || null,
      register: phraseData.register || null,
      metadata: phraseData.metadata || {},
      status: phraseData.status || 'draft'
    }, {
      onConflict: 'course_code,seed_number,lego_index,position'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save multiple practice phrases at once
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @param {Array<Object>} phrases
 * @returns {Promise<Array>}
 */
async function savePracticePhrases(courseCode, seedNumber, legoIndex, phrases) {
  if (!USE_DATABASE_WRITES) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const results = [];
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const result = await savePracticePhrase(courseCode, seedNumber, legoIndex, {
      ...phrase,
      position: phrase.position !== undefined ? phrase.position : i + 1
    });
    results.push(result);
  }
  return results;
}

/**
 * Get practice phrases for a LEGO
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @returns {Promise<Array>}
 */
async function getPracticePhrases(courseCode, seedNumber, legoIndex) {
  if (!USE_DATABASE_READS) return [];
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex)
    .order('position');

  if (error) throw error;
  return data || [];
}

/**
 * Delete all practice phrases for a LEGO (before re-generating)
 *
 * @param {string} courseCode
 * @param {number} seedNumber
 * @param {number} legoIndex
 * @returns {Promise<number>} Number of deleted rows
 */
async function clearPracticePhrases(courseCode, seedNumber, legoIndex) {
  if (!USE_DATABASE_WRITES) return 0;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex)
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

  // Get course info including target seed_count
  const { data: course } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('code', courseCode)
    .single();

  const targetSeedCount = course?.seed_count || 668;

  // Get seed count (all statuses - for monitoring we want to see everything)
  const { count: seedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Get LEGO counts (all statuses)
  const { data: legoData } = await supabase
    .from('course_legos')
    .select('id, is_new')
    .eq('course_code', courseCode);

  const legoCount = legoData?.length || 0;
  const newLegoCount = legoData?.filter(l => l.is_new).length || 0;

  // Get practice phrase count (all statuses)
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  // Get distinct seeds with LEGOs (Phase 1 complete)
  const { data: phase1Seeds } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', courseCode);
  const phase1SeedNumbers = [...new Set(phase1Seeds?.map(l => l.seed_number) || [])];

  // Phase 3: A seed is complete ONLY if ALL its new LEGOs have practice phrases
  // Get all new LEGOs grouped by seed
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  // Get all practice phrases by seed/lego
  const { data: practicePhraseData } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode);

  // Build set of LEGOs that have practice phrases
  const legosWithPhrases = new Set(
    (practicePhraseData || []).map(p => `${p.seed_number}:${p.lego_index}`)
  );

  // Count NEW LEGOs that have baskets (practice phrases)
  const totalNewLegos = newLegos?.length || 0;
  let newLegosWithBaskets = 0;
  const newLegosWithBasketsList = [];
  const newLegosMissingBaskets = [];

  for (const lego of (newLegos || [])) {
    const legoKey = `${lego.seed_number}:${lego.lego_index}`;
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`;
    if (legosWithPhrases.has(legoKey)) {
      newLegosWithBaskets++;
      newLegosWithBasketsList.push(legoId);
    } else {
      newLegosMissingBaskets.push(legoId);
    }
  }

  // Seeds with ANY practice phrases (for seed-level tracking)
  const seedsWithAnyPhrases = [...new Set((practicePhraseData || []).map(p => p.seed_number))]
    .sort((a, b) => a - b);

  // Phase 3 progress is tracked by NEW LEGOs (the actual unit of work)
  // Each new LEGO needs a basket of practice phrases
  return {
    courseCode,
    targetSeedCount,
    seeds: seedCount || 0,
    legos: legoCount,
    newLegos: newLegoCount,
    practicePhrases: phraseCount || 0,
    phase1: {
      complete: phase1SeedNumbers.length,
      target: targetSeedCount,
      percent: Math.round((phase1SeedNumbers.length / targetSeedCount) * 100),
      seeds: phase1SeedNumbers.sort((a, b) => a - b)
    },
    phase2: {
      complete: newLegoCount !== legoCount, // Simplified: has conflict resolution run?
      note: 'Phase 2 runs after all Phase 1 complete'
    },
    phase3: {
      // Track by NEW LEGOs (the actual unit of work for Phase 3)
      complete: newLegosWithBaskets,
      target: totalNewLegos,
      percent: totalNewLegos > 0 ? Math.round((newLegosWithBaskets / totalNewLegos) * 100) : 0,
      // Seed-level info (for reference, jobs assigned by seeds)
      seedsWithPhrases: seedsWithAnyPhrases.length,
      seedsTarget: targetSeedCount,
      // Missing LEGOs (for resume functionality)
      missingCount: newLegosMissingBaskets.length,
      missingLegos: newLegosMissingBaskets
    }
  };
}

/**
 * Get detailed seed-level progress for swim-lane display
 * Returns status of each seed across all phases
 */
async function getSeedProgress(courseCode) {
  if (!USE_DATABASE_READS) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Get course target
  const { data: course } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('code', courseCode)
    .single();

  const targetSeedCount = course?.seed_count || 668;

  // Get all seeds with LEGOs (Phase 1)
  const { data: phase1Data } = await supabase
    .from('course_legos')
    .select('seed_number, is_new')
    .eq('course_code', courseCode);

  // Get all seeds with practice phrases (Phase 3)
  const { data: phase3Data } = await supabase
    .from('course_practice_phrases')
    .select('seed_number')
    .eq('course_code', courseCode);

  // Build per-seed status
  const seedStatus = {};
  for (let i = 1; i <= targetSeedCount; i++) {
    seedStatus[i] = {
      seed: i,
      seedId: `S${String(i).padStart(4, '0')}`,
      phase1: false,
      phase2: false,
      phase3: false
    };
  }

  // Mark Phase 1 complete
  const phase1Seeds = new Set(phase1Data?.map(l => l.seed_number) || []);
  for (const seedNum of phase1Seeds) {
    if (seedStatus[seedNum]) {
      seedStatus[seedNum].phase1 = true;
    }
  }

  // Mark Phase 2 complete (if any LEGOs have is_new set properly - meaning conflict resolution ran)
  // For simplicity, we'll mark Phase 2 complete if Phase 1 is complete
  // A more accurate check would verify is_new flags are set correctly
  const hasConflictResolution = phase1Data?.some(l => l.is_new === false);
  if (hasConflictResolution) {
    for (const seedNum of phase1Seeds) {
      if (seedStatus[seedNum]) {
        seedStatus[seedNum].phase2 = true;
      }
    }
  }

  // Mark Phase 3 complete
  const phase3Seeds = new Set(phase3Data?.map(p => p.seed_number) || []);
  for (const seedNum of phase3Seeds) {
    if (seedStatus[seedNum]) {
      seedStatus[seedNum].phase3 = true;
    }
  }

  return {
    courseCode,
    targetSeedCount,
    seeds: Object.values(seedStatus),
    summary: {
      phase1: phase1Seeds.size,
      phase2: hasConflictResolution ? phase1Seeds.size : 0,
      phase3: phase3Seeds.size
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
async function ensureCourse(courseCode, knownLang, targetLang, seedCount = null) {
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

  // Check if exists (v13: courses.code is the primary key)
  const { data: existing } = await supabase
    .from('courses')
    .select('*')
    .eq('code', courseCode)
    .single();

  if (existing) return existing;

  // Create new course (v13: use 'code' column)
  const { data, error } = await supabase
    .from('courses')
    .insert({
      code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang,
      seed_count: seedCount,
      known_voice: 'tbd',
      target_voice_1: 'tbd',
      target_voice_2: 'tbd'
    })
    .select()
    .single();

  if (error) throw error;
  logger.info(`Created course: ${courseCode} (seed_count: ${seedCount || 'not set'})`);
  return data;
}

/**
 * Update course seed count
 * @param {string} courseCode
 * @param {number} seedCount - Target seed count (10, 250, 668)
 */
async function updateCourseSeedCount(courseCode, seedCount) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('courses')
    .update({ seed_count: seedCount })
    .eq('code', courseCode)
    .select()
    .single();

  if (error) throw error;
  logger.info(`Updated ${courseCode} seed_count to ${seedCount}`);
  return data;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Import a complete seed with all LEGOs and practice phrases
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
    status: seedData.status || 'draft'
  });

  let legoCount = 0;
  let componentCount = 0;

  // Save LEGOs
  const legos = seedData.legos || [];
  for (const legoData of legos) {
    const components = legoData.type === 'M' && legoData.components ? legoData.components : null;

    await saveLego(courseCode, seed.seed_number, {
      legoIndex: legoData.lego_index || parseLegoIndex(legoData.id),
      legoId: legoData.id,
      // Handle both flat format { known, target } and nested format { lego: { known, target } }
      knownText: legoData.lego?.known || legoData.known,
      targetText: legoData.lego?.target || legoData.target,
      type: legoData.type || 'A',
      isNew: legoData.new !== false,
      components: components,
      status: seedData.status || 'draft'
    });
    legoCount++;

    if (components) {
      componentCount += components.length;
    }
  }

  return {
    seed,
    legoCount,
    componentCount
  };
}

/**
 * Import practice phrases for a LEGO (basket data from Phase 3)
 *
 * @param {string} courseCode
 * @param {string} legoId - Original lego_id (e.g., "S0001L01")
 * @param {Object} basketData - Basket data from Phase 3
 * @returns {Promise<Object>}
 */
async function importBasket(courseCode, legoId, basketData) {
  if (!USE_DATABASE_WRITES) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Parse lego_id: "S0001L01" -> seed_number=1, lego_index=1
  const seedMatch = legoId.match(/S(\d+)L(\d+)/i);
  if (!seedMatch) {
    throw new Error(`Invalid lego_id format: ${legoId}`);
  }
  const seedNumber = parseInt(seedMatch[1], 10);
  const legoIndex = parseInt(seedMatch[2], 10);

  // Clear existing practice phrases
  await clearPracticePhrases(courseCode, seedNumber, legoIndex);

  // Import new phrases
  const phrases = basketData.debut_phrases || basketData.practice_phrases || basketData.phrases || [];
  let position = 0;

  for (const phrase of phrases) {
    position++;

    // Calculate word count and lego count for runtime classification
    const targetWords = (phrase.target || '').trim().split(/\s+/).length;
    const legoCount = phrase.lego_count || 1;

    await savePracticePhrase(courseCode, seedNumber, legoIndex, {
      knownText: phrase.known,
      targetText: phrase.target,
      position,
      wordCount: targetWords,
      legoCount: legoCount,
      metadata: phrase.metadata || {}
    });
  }

  return {
    legoId,
    phraseCount: position
  };
}

// =============================================================================
// PHASE 3 RESUME OPERATIONS
// =============================================================================

/**
 * Get LEGOs that are missing practice phrases (for Phase 3 intelligent resume)
 * Queries database instead of local JSON files
 *
 * @param {string} courseCode - Course code (e.g., 'zho_for_eng')
 * @param {number} startSeed - Start seed number (1-based)
 * @param {number} endSeed - End seed number (1-based)
 * @returns {Promise<Array>} Array of missing LEGOs in format:
 *   { legoId: 'S0001L01', seed: 'S0001', target: '...', known: '...', type: 'M' }
 */
async function getMissingLegosFromDatabase(courseCode, startSeed, endSeed) {
  if (!USE_DATABASE_READS) {
    logger.warn('Database reads disabled - cannot query missing LEGOs');
    return null; // Caller should fall back to JSON-based detection
  }
  if (!supabase) throw new Error('Supabase not initialized');

  logger.info(`[Phase 3 Resume] Querying database for missing LEGOs: ${courseCode} seeds ${startSeed}-${endSeed}`);

  // Get all new LEGOs in the seed range
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .gte('seed_number', startSeed)
    .lte('seed_number', endSeed)
    .order('seed_number')
    .order('lego_index');

  if (legoError) throw legoError;

  if (!legos || legos.length === 0) {
    logger.info(`[Phase 3 Resume] No new LEGOs found in range ${startSeed}-${endSeed}`);
    return [];
  }

  logger.info(`[Phase 3 Resume] Found ${legos.length} new LEGOs in range`);

  // Get all LEGOs that already have practice phrases
  const { data: phrasedLegos, error: phraseError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)
    .gte('seed_number', startSeed)
    .lte('seed_number', endSeed);

  if (phraseError) throw phraseError;

  // Build set of LEGOs that have phrases (using seed_number:lego_index as key)
  const legoWithPhrases = new Set(
    (phrasedLegos || []).map(p => `${p.seed_number}:${p.lego_index}`)
  );

  logger.info(`[Phase 3 Resume] ${legoWithPhrases.size} LEGOs already have practice phrases`);

  // Filter to only LEGOs missing phrases
  const missingLegos = legos
    .filter(l => !legoWithPhrases.has(`${l.seed_number}:${l.lego_index}`))
    .map(l => ({
      legoId: formatLegoId(l.seed_number, l.lego_index),
      seed: formatSeedId(l.seed_number),
      target: l.target_text,
      known: l.known_text,
      type: l.type || 'M'
    }));

  logger.info(`[Phase 3 Resume] ${missingLegos.length} LEGOs need practice phrases`);

  return missingLegos;
}

/**
 * Get seeds that have incomplete Phase 3 (some LEGOs missing practice phrases)
 *
 * @param {string} courseCode
 * @param {number} startSeed
 * @param {number} endSeed
 * @returns {Promise<Array<number>>} Array of seed numbers with incomplete phrases
 */
async function getIncompleteSeedsFromDatabase(courseCode, startSeed, endSeed) {
  if (!USE_DATABASE_READS) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Get missing LEGOs and extract unique seed numbers
  const missingLegos = await getMissingLegosFromDatabase(courseCode, startSeed, endSeed);
  if (missingLegos === null) return null;

  const incompleteSeeds = [...new Set(missingLegos.map(l => parseSeedNumber(l.seed)))];
  return incompleteSeeds.sort((a, b) => a - b);
}

/**
 * Get all missing NEW LEGOs for a course (no seed range filter)
 * Convenience wrapper for getMissingLegosFromDatabase
 *
 * @param {string} courseCode
 * @returns {Promise<Array>} Array of missing LEGOs with full details
 */
async function getMissingNewLegos(courseCode) {
  if (!USE_DATABASE_READS) return null;
  if (!supabase) throw new Error('Supabase not initialized');

  // Get max seed number for course
  const { data: course } = await supabase
    .from('courses')
    .select('seed_count')
    .eq('code', courseCode)
    .single();

  const maxSeed = course?.seed_count || 668;

  // Query all missing LEGOs (seed range 1 to max)
  return getMissingLegosFromDatabase(courseCode, 1, maxSeed);
}

/**
 * Get count of completed NEW LEGOs (those with practice phrases)
 *
 * @param {string} courseCode
 * @returns {Promise<number>} Count of completed NEW LEGOs
 */
async function getCompletedNewLegosCount(courseCode) {
  if (!USE_DATABASE_READS) return 0;
  if (!supabase) throw new Error('Supabase not initialized');

  // Get all NEW LEGOs
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  // Get all LEGOs with practice phrases
  const { data: phrasedLegos } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode);

  const legoWithPhrases = new Set(
    (phrasedLegos || []).map(p => `${p.seed_number}:${p.lego_index}`)
  );

  // Count NEW LEGOs that have phrases
  return (newLegos || []).filter(l =>
    legoWithPhrases.has(`${l.seed_number}:${l.lego_index}`)
  ).length;
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
  updateSeedStatus,
  deleteSeed,

  // LEGO operations
  saveLego,
  getLegosBySeed,
  getLegosByCourse,
  markLegoAsNew,
  updateLego,

  // Practice phrase operations
  savePracticePhrase,
  savePracticePhrases,
  getPracticePhrases,
  clearPracticePhrases,

  // Course operations
  getCourseProgress,
  getSeedProgress,
  ensureCourse,
  updateCourseSeedCount,

  // Batch operations
  importSeedWithLegos,
  importBasket,

  // Phase 3 resume operations
  getMissingLegosFromDatabase,
  getIncompleteSeedsFromDatabase,
  getMissingNewLegos,
  getCompletedNewLegosCount,

  // Raw client (for advanced queries)
  supabase
};
