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

// Load configs once at module load
const CONFIG_PATH = path.join(__dirname, 'course-modes.json');
const MACHINE_PROFILES_PATH = path.join(__dirname, 'machine-profiles.json');
let cachedConfig = null;
let cachedMachineProfiles = null;

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
 * Load machine profiles configuration
 * @returns {Object} The machine profiles config
 */
function loadMachineProfiles() {
  if (cachedMachineProfiles) return cachedMachineProfiles;

  try {
    const profileContent = fs.readFileSync(MACHINE_PROFILES_PATH, 'utf8');
    cachedMachineProfiles = JSON.parse(profileContent);
    console.log(`[CourseMode] ✓ Loaded machine profiles v${cachedMachineProfiles.version}`);
    return cachedMachineProfiles;
  } catch (err) {
    console.warn(`[CourseMode] ⚠️ Machine profiles not found, using default patterns`);
    return null;
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
 * Get resume mode configuration
 * Resume uses 1 seed per agent for maximum granularity
 * @returns {Object} Resume config with seeds_per_agent and agents_per_browser
 */
function getResumeConfig() {
  const config = loadConfig();
  return config.resume || {
    seeds_per_agent: 1,
    agents_per_browser: 25,
    comment: "Default resume config"
  };
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

/**
 * Get pattern for a specific machine profile, spawner mode, and course mode
 * Falls back to default patterns if machine profile not found
 *
 * @param {Object} options
 * @param {string} options.machineProfile - Machine profile ID (e.g., 'tom', 'kai')
 * @param {string} options.spawnerMode - 'cli' or 'browser'
 * @param {string} options.mode - Course mode (quick_test, mvp_course, full_course)
 * @returns {Object} Pattern with { browsers, agents_per_browser, seeds_per_agent, source }
 */
function getMachinePattern({ machineProfile, spawnerMode = 'cli', mode }) {
  const profiles = loadMachineProfiles();
  const config = loadConfig();

  // Default to course-modes.json patterns
  const defaultPattern = config.modes[mode]?.pattern;
  if (!defaultPattern) {
    throw new Error(`Unknown mode: ${mode}`);
  }

  // If no machine profiles loaded, return default
  if (!profiles) {
    return {
      ...defaultPattern,
      source: 'course-modes.json (no machine profiles)'
    };
  }

  // Resolve profile (use 'default' if not found)
  const profileId = machineProfile && profiles.profiles[machineProfile]
    ? machineProfile
    : 'default';
  const profile = profiles.profiles[profileId];

  if (!profile) {
    return {
      ...defaultPattern,
      source: 'course-modes.json (profile not found)'
    };
  }

  // Get spawner-specific patterns
  const spawnerPatterns = profile.patterns[spawnerMode];
  if (!spawnerPatterns) {
    return {
      ...defaultPattern,
      source: `course-modes.json (no ${spawnerMode} patterns in ${profileId})`
    };
  }

  // Get mode-specific pattern
  const modePattern = spawnerPatterns[mode];
  if (!modePattern) {
    return {
      ...defaultPattern,
      source: `course-modes.json (no ${mode} in ${profileId}/${spawnerMode})`
    };
  }

  return {
    ...modePattern,
    source: `machine-profiles.json (${profileId}/${spawnerMode}/${mode})`
  };
}

/**
 * Get all available machine profiles for UI display
 * @returns {Array} Array of profile summaries
 */
function getAllMachineProfiles() {
  const profiles = loadMachineProfiles();
  if (!profiles) return [];

  return Object.entries(profiles.profiles).map(([id, profile]) => ({
    id,
    name: profile.name,
    description: profile.description,
    ram_gb: profile.ram_gb
  }));
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
  getResumeConfig,
  isValidMode,

  // Machine profile functions
  loadMachineProfiles,
  getMachinePattern,
  getAllMachineProfiles,

  // Deprecated - for backwards compatibility during migration
  // TODO: Remove these after all hardcoded values are replaced
  LEGACY: {
    FULL_COURSE_SEEDS: 668,  // Use SEED_COUNTS.FULL_COURSE instead
    TEST_MODE_THRESHOLD: 30  // DEPRECATED - use SEED_COUNTS.QUICK_TEST
  }
};
