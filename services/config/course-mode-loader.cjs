/**
 * Course Mode Loader - SINGLE SOURCE OF TRUTH
 *
 * This module provides centralized access to course generation modes.
 * ALL phase servers should use this instead of hardcoded values.
 *
 * Usage:
 *   const { getModeConfig, getPatternForSeeds, MODES } = require('./config/course-mode-loader.cjs');
 *
 *   // Get specific mode
 *   const config = getModeConfig('quick_test');
 *
 *   // Auto-select mode based on seed count
 *   const config = getPatternForSeeds(250);
 */

const fs = require('fs');
const path = require('path');

// Load config once at module load
const CONFIG_PATH = path.join(__dirname, 'course-modes.json');
let cachedConfig = null;

/**
 * Load the course modes configuration
 * @returns {Object} The full config object
 */
function loadConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    cachedConfig = JSON.parse(configContent);
    console.log(`[CourseMode] ✓ Loaded config v${cachedConfig.version}`);
    return cachedConfig;
  } catch (err) {
    console.error(`[CourseMode] ❌ Failed to load config: ${err.message}`);
    throw new Error(`Course mode config not found at ${CONFIG_PATH}`);
  }
}

/**
 * Mode constants for type safety
 */
const MODES = {
  QUICK_TEST: 'quick_test',
  MVP_COURSE: 'mvp_course',
  FULL_COURSE: 'full_course'
};

/**
 * Seed count constants - SINGLE SOURCE OF TRUTH
 * Use these instead of hardcoding 10, 250, 668 anywhere
 */
const SEED_COUNTS = {
  QUICK_TEST: 10,
  MVP_COURSE: 250,
  FULL_COURSE: 668
};

/**
 * Get configuration for a specific mode
 * @param {string} modeName - One of: quick_test, mvp_course, full_course
 * @returns {Object} Mode configuration with pattern details
 */
function getModeConfig(modeName) {
  const config = loadConfig();
  const mode = config.modes[modeName];

  if (!mode) {
    throw new Error(`Unknown mode: ${modeName}. Valid modes: ${Object.keys(config.modes).join(', ')}`);
  }

  return {
    ...mode,
    defaults: config.defaults
  };
}

/**
 * Auto-select the appropriate mode based on seed count
 * @param {number} seedCount - Number of seeds to process
 * @returns {Object} The matching mode configuration
 */
function getPatternForSeeds(seedCount) {
  const config = loadConfig();

  // Find the mode that matches or exceeds the seed count
  if (seedCount <= SEED_COUNTS.QUICK_TEST) {
    return getModeConfig(MODES.QUICK_TEST);
  } else if (seedCount <= SEED_COUNTS.MVP_COURSE) {
    return getModeConfig(MODES.MVP_COURSE);
  } else {
    return getModeConfig(MODES.FULL_COURSE);
  }
}

/**
 * Get parallelization pattern for a given seed count
 * Returns { browsers, agents_per_browser, seeds_per_agent, capacity }
 * @param {number} seedCount - Number of seeds to process
 * @returns {Object} Parallelization pattern
 */
function getParallelizationPattern(seedCount) {
  const modeConfig = getPatternForSeeds(seedCount);
  return {
    ...modeConfig.pattern,
    capacity: modeConfig.capacity,
    modeName: modeConfig.name,
    seeds: modeConfig.seeds
  };
}

/**
 * Calculate actual work distribution for a given seed count
 * @param {number} seedCount - Number of seeds to process
 * @returns {Object} Work distribution details
 */
function calculateWorkDistribution(seedCount) {
  const pattern = getParallelizationPattern(seedCount);
  const { browsers, agents_per_browser, seeds_per_agent } = pattern;

  const totalAgents = browsers * agents_per_browser;
  const totalCapacity = totalAgents * seeds_per_agent;

  // Calculate actual distribution
  const seedsNeeded = seedCount;
  const agentsNeeded = Math.ceil(seedsNeeded / seeds_per_agent);
  const browsersNeeded = Math.ceil(agentsNeeded / agents_per_browser);

  return {
    pattern,
    seedsNeeded,
    totalAgents,
    totalCapacity,
    agentsNeeded,
    browsersNeeded,
    utilizationPercent: Math.round((seedsNeeded / totalCapacity) * 100)
  };
}

/**
 * Get all available modes for UI display
 * @returns {Array} Array of mode summaries
 */
function getAllModes() {
  const config = loadConfig();
  return Object.entries(config.modes).map(([key, mode]) => ({
    id: key,
    name: mode.name,
    description: mode.description,
    seeds: mode.seeds,
    pattern: `${mode.pattern.browsers}/${mode.pattern.agents_per_browser}/${mode.pattern.seeds_per_agent}`,
    capacity: mode.capacity,
    estimatedMinutes: mode.estimated_time_minutes,
    useCase: mode.use_case
  }));
}

/**
 * Get default timing/retry settings
 * @returns {Object} Default settings
 */
function getDefaults() {
  const config = loadConfig();
  return config.defaults;
}

/**
 * Validate that a mode name is valid
 * @param {string} modeName - Mode name to validate
 * @returns {boolean} True if valid
 */
function isValidMode(modeName) {
  const config = loadConfig();
  return modeName in config.modes;
}

// Export everything
module.exports = {
  // Constants
  MODES,
  SEED_COUNTS,

  // Core functions
  loadConfig,
  getModeConfig,
  getPatternForSeeds,
  getParallelizationPattern,
  calculateWorkDistribution,
  getAllModes,
  getDefaults,
  isValidMode,

  // Deprecated - for backwards compatibility during migration
  // TODO: Remove these after all hardcoded values are replaced
  LEGACY: {
    FULL_COURSE_SEEDS: 668,  // Use SEED_COUNTS.FULL_COURSE instead
    TEST_MODE_THRESHOLD: 30  // DEPRECATED - use SEED_COUNTS.QUICK_TEST
  }
};
