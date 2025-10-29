/**
 * Cadence Service
 *
 * Handles cadence (speech speed) conversions for audio generation.
 * SSi uses two cadence levels:
 * - "slow": 0.7x speed (30% slower) - for target language, clear for learners
 * - "natural": 1.0x speed - for source language, natural conversation pace
 */

const CADENCE_SPEEDS = {
  slow: 0.7,      // 30% slower - clear for beginners
  natural: 1.0    // Normal speed - natural conversation
};

const ROLE_CADENCES = {
  target1: 'slow',
  target2: 'slow',
  source: 'natural',
  presentation: 'natural',
  presentation_encouragement: 'natural'
};

/**
 * Get actual speed multiplier for a cadence level
 *
 * @param {string} cadence - Cadence level ('slow' or 'natural')
 * @returns {number} Speed multiplier (0.7 or 1.0)
 */
function getSpeedForCadence(cadence) {
  return CADENCE_SPEEDS[cadence] || 1.0;
}

/**
 * Get time-stretch ratio for post-processing (used for ElevenLabs)
 * This is the inverse of speed because stretching slows down audio
 *
 * @param {string} cadence - Cadence level
 * @returns {number} Stretch ratio (1.43 for slow, 1.0 for natural)
 *
 * @example
 * getStretchForCadence('slow')    // 1.43 (because 1/0.7 ≈ 1.43)
 * getStretchForCadence('natural') // 1.0 (no stretch)
 */
function getStretchForCadence(cadence) {
  const speed = getSpeedForCadence(cadence);
  return 1.0 / speed;
}

/**
 * Get Azure SSML speed percentage string for cadence
 *
 * @param {string} cadence - Cadence level
 * @returns {string} SSML rate percentage ("-30%" for slow, "0%" for natural)
 *
 * @example
 * getAzureSpeedForCadence('slow')    // "-30%"
 * getAzureSpeedForCadence('natural') // "0%"
 */
function getAzureSpeedForCadence(cadence) {
  const speed = getSpeedForCadence(cadence);
  const percent = Math.round((speed - 1.0) * 100);
  return percent === 0 ? '0%' : `${percent > 0 ? '+' : ''}${percent}%`;
}

/**
 * Get expected cadence for a role
 *
 * @param {string} role - Sample role (target1, target2, source, presentation, etc.)
 * @returns {string} Expected cadence ('slow' or 'natural')
 *
 * @example
 * getCadenceForRole('target1')     // 'slow'
 * getCadenceForRole('source')      // 'natural'
 */
function getCadenceForRole(role) {
  return ROLE_CADENCES[role] || 'natural';
}

/**
 * Check if a cadence value is valid
 *
 * @param {string} cadence - Cadence to validate
 * @returns {boolean} True if valid
 */
function isValidCadence(cadence) {
  return cadence === 'slow' || cadence === 'natural';
}

module.exports = {
  CADENCE_SPEEDS,
  ROLE_CADENCES,
  getSpeedForCadence,
  getStretchForCadence,
  getAzureSpeedForCadence,
  getCadenceForRole,
  isValidCadence
};
