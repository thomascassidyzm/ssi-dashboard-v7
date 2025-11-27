/**
 * Configuration Loader for SSi Automation
 *
 * Centralizes all automation configuration and provides defaults.
 * Used by orchestrator and all phase servers.
 */

const fs = require('fs');
const path = require('path');

// Try simplified config first, fall back to complex config
const SIMPLE_CONFIG_PATH = path.join(__dirname, '../automation.config.simple.json');
const COMPLEX_CONFIG_PATH = path.join(__dirname, '../automation.config.json');
const CONFIG_PATH = fs.existsSync(SIMPLE_CONFIG_PATH) ? SIMPLE_CONFIG_PATH : COMPLEX_CONFIG_PATH;

let cachedConfig = null;

/**
 * Load automation configuration from automation.config.json
 * @returns {Object} Configuration object
 */
function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.warn('⚠️  automation.config.json not found, using defaults');
    return getDefaultConfig();
  }

  try {
    const configFile = fs.readFileSync(CONFIG_PATH, 'utf8');
    cachedConfig = JSON.parse(configFile);
    return cachedConfig;
  } catch (error) {
    console.error('❌ Error loading automation.config.json:', error.message);
    console.warn('   Falling back to defaults');
    return getDefaultConfig();
  }
}

/**
 * Get default configuration (fallback if config file missing)
 */
function getDefaultConfig() {
  return {
    phase3_lego_extraction: {
      parallelization: {
        small_course_threshold: 20,
        medium_course_threshold: 100,
        small_course_strategy: {
          segment_count: 2,
          agents_per_segment: 2
        },
        medium_course_strategy: {
          segment_count: 1,
          agents_per_segment: 10,
          seeds_per_agent: 10
        },
        large_course_strategy: {
          seeds_per_segment: 100,
          agents_per_segment: 10,
          seeds_per_agent: 10
        }
      },
      collision_handling: {
        auto_inject_avoidance_instructions: true,
        collision_manifest_path: 'phase3_collision_reextraction_manifest.json',
        fcfs_rule: 'keep_first_occurrence'
      },
      validation: {
        run_fd_check_after_merge: true,
        run_deduplication: true,
        block_on_collision: true
      }
    },
    phase3_basket_generation: {
      browsers: 5,
      agents_per_browser: 4,
      seeds_per_agent: 3,
      browser_spawn_delay_ms: 5000,
      parallelization: {
        small_course_threshold: 50,
        medium_course_threshold: 200,
        small_course_strategy: { agents: 2 },
        medium_course_strategy: { agents: 5 },
        large_course_strategy: { agents: 10 }
      }
    },
    // Legacy alias
    phase5_basket_generation: {
      parallelization: {
        small_course_threshold: 50,
        medium_course_threshold: 200,
        small_course_strategy: { agents: 2 },
        medium_course_strategy: { agents: 5 },
        large_course_strategy: { agents: 10 }
      }
    },
    orchestrator: {
      checkpoint_modes: {
        default: 'gated'
      }
    },
    performance: {
      agent_spawn_delay_ms: 3000,
      max_retries: 3
    },
    validation_thresholds: {
      phase3_error_rate: parseFloat(process.env.VALIDATION_THRESHOLD_PHASE3_ERROR_RATE || '0.05'),
      phase5_gate_violations: parseFloat(process.env.VALIDATION_THRESHOLD_PHASE5_GATE_VIOLATIONS || '0.02'),
      phase5_quality_score: parseFloat(process.env.VALIDATION_THRESHOLD_PHASE5_QUALITY_SCORE || '0.95')
    }
  };
}

/**
 * Get Phase 3 segmentation configuration
 * @param {number} totalSeeds - Total number of seeds in course
 * @returns {Object} Segmentation strategy
 */
function getPhase3Segmentation(totalSeeds) {
  const config = loadConfig();
  const p3Config = config.phase3_lego_extraction.parallelization;

  if (totalSeeds <= p3Config.small_course_threshold) {
    // Small course
    const strategy = p3Config.small_course_strategy;
    const segmentSize = Math.ceil(totalSeeds / strategy.segment_count);

    return {
      strategyName: 'SMALL_COURSE',
      segmentSize,
      agentsPerSegment: strategy.agents_per_segment,
      seedsPerAgent: Math.ceil(segmentSize / strategy.agents_per_segment)
    };
  } else if (totalSeeds <= p3Config.medium_course_threshold) {
    // Medium course
    const strategy = p3Config.medium_course_strategy;

    return {
      strategyName: 'MEDIUM_COURSE',
      segmentSize: totalSeeds, // No segmentation
      agentsPerSegment: strategy.agents_per_segment,
      seedsPerAgent: strategy.seeds_per_agent
    };
  } else {
    // Large course
    const strategy = p3Config.large_course_strategy;

    return {
      strategyName: 'LARGE_COURSE',
      segmentSize: strategy.seeds_per_segment,
      agentsPerSegment: strategy.agents_per_segment,
      seedsPerAgent: strategy.seeds_per_agent
    };
  }
}

/**
 * Get Phase 5 parallelization configuration
 * @param {number} totalLegos - Total number of LEGOs
 * @returns {Object} Parallelization strategy
 */
function getPhase5Parallelization(totalLegos) {
  const config = loadConfig();
  const p5Config = config.phase5_basket_generation.parallelization;

  if (totalLegos <= p5Config.small_course_threshold) {
    return {
      strategyName: 'SMALL_COURSE',
      agents: p5Config.small_course_strategy.agents,
      legosPerAgent: Math.ceil(totalLegos / p5Config.small_course_strategy.agents)
    };
  } else if (totalLegos <= p5Config.medium_course_threshold) {
    return {
      strategyName: 'MEDIUM_COURSE',
      agents: p5Config.medium_course_strategy.agents,
      legosPerAgent: Math.ceil(totalLegos / p5Config.medium_course_strategy.agents)
    };
  } else {
    return {
      strategyName: 'LARGE_COURSE',
      agents: p5Config.large_course_strategy.agents,
      legosPerAgent: Math.ceil(totalLegos / p5Config.large_course_strategy.agents)
    };
  }
}

/**
 * Check if collision manifest exists for a course
 * @param {string} coursePath - Path to course VFS directory
 * @returns {Object|null} Collision manifest or null
 */
function loadCollisionManifest(coursePath) {
  const config = loadConfig();
  const manifestPath = path.join(
    coursePath,
    config.phase3_lego_extraction.collision_handling.collision_manifest_path
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error loading collision manifest:', error.message);
    return null;
  }
}

/**
 * Get collision avoidance instructions for a specific seed
 * @param {string} coursePath - Path to course VFS directory
 * @param {string} seedId - Seed ID (e.g., "S0068")
 * @returns {string|null} Collision avoidance instructions or null
 */
function getCollisionInstructions(coursePath, seedId) {
  const config = loadConfig();

  if (!config.phase3_lego_extraction.collision_handling.auto_inject_avoidance_instructions) {
    return null;
  }

  const manifest = loadCollisionManifest(coursePath);
  if (!manifest || !manifest.seeds) {
    return null;
  }

  const seedData = manifest.seeds.find(s => s.seed_id === seedId);
  if (!seedData || !seedData.collision_avoidance_instructions) {
    return null;
  }

  return seedData.collision_avoidance_instructions;
}

module.exports = {
  loadConfig,
  getPhase3Segmentation,
  getPhase5Parallelization,
  loadCollisionManifest,
  getCollisionInstructions
};
