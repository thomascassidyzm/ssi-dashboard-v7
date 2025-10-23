/**
 * UUID Generation Service
 *
 * Generates deterministic, RFC 4122 compliant UUID v5 for audio samples.
 * Same inputs will ALWAYS produce the same UUID.
 */

const { v5: uuidv5 } = require('uuid');

// SSi namespace UUID (permanent, never changes)
// This ensures our UUIDs are unique to SSi and deterministic
const SSI_NAMESPACE = '6e2d1e3a-2c4a-4b5d-8e6f-1a2b3c4d5e6f';

/**
 * Generate deterministic, RFC 4122 compliant UUID v5
 *
 * @param {string} text - The phrase/text to speak
 * @param {string} language - Language code (e.g., 'ita', 'eng')
 * @param {string} role - Sample role ('target1', 'target2', 'source', 'presentation')
 * @param {string} cadence - Speech cadence ('natural', 'fast', 'slow')
 * @returns {string} RFC 4122 UUID v5 in uppercase
 *
 * @example
 * generateSampleUUID('Voglio', 'ita', 'target1', 'natural')
 * // Returns: "A1B2C3D4-E5F6-5789-ABCD-EF0123456789"
 *
 * // Same inputs = same UUID (deterministic)
 * generateSampleUUID('Voglio', 'ita', 'target1', 'natural')
 * // Returns: "A1B2C3D4-E5F6-5789-ABCD-EF0123456789" (identical)
 */
function generateSampleUUID(text, language, role, cadence = 'natural') {
  const key = `${text}|${language}|${role}|${cadence}`;
  return uuidv5(key, SSI_NAMESPACE).toUpperCase();
}

/**
 * Validate UUID format (accepts both valid and legacy invalid UUIDs)
 *
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if format is correct
 */
function isValidFormat(uuid) {
  const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if UUID is RFC 4122 compliant
 *
 * @param {string} uuid - UUID to check
 * @returns {boolean} True if RFC 4122 compliant
 */
function isRFC4122Compliant(uuid) {
  if (!isValidFormat(uuid)) return false;

  const parts = uuid.split('-');
  const version = parseInt(parts[2][0], 16);
  const variant = parseInt(parts[3][0], 16);

  // Check variant bits (should be 8, 9, A, or B for RFC 4122)
  const variantValid = (variant >= 8 && variant <= 11);

  return variantValid && version >= 1 && version <= 5;
}

/**
 * Get UUID details for debugging
 *
 * @param {string} uuid - UUID to analyze
 * @returns {object} UUID details
 */
function analyzeUUID(uuid) {
  if (!isValidFormat(uuid)) {
    return { error: 'Invalid UUID format' };
  }

  const parts = uuid.split('-');
  const version = parseInt(parts[2][0], 16);
  const variant = parseInt(parts[3][0], 16);

  return {
    uuid,
    version,
    variant: variant.toString(16).toUpperCase(),
    isRFC4122: isRFC4122Compliant(uuid),
    isValidFormat: true
  };
}

module.exports = {
  generateSampleUUID,
  isValidFormat,
  isRFC4122Compliant,
  analyzeUUID,
  SSI_NAMESPACE
};
