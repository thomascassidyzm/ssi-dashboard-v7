/**
 * UUID Generation Module v11
 *
 * Two types of UUIDs in the SSi system:
 *
 * 1. NODE IDs - Identify learning units (known/target pairs)
 *    Format: S0042L01-PRAC-0003-A7F3-B2C1E9D4F5A6
 *            └──────┘ └──┘ └──┘ └────────────────┘
 *            SeedLego Type Ord  hash(known|target)
 *
 *    Types: SEED, DEBT (debut), COMP, PRAC, ETER
 *
 * 2. SAMPLE IDs - Identify audio files
 *    Format: Deterministic UUID v5 from hash(voice_id|text|lang|role|cadence)
 *    These can be shared across courses (deduplication)
 */

const crypto = require('crypto');

// UUID v5 namespace for SSi audio samples
const SSI_AUDIO_NAMESPACE = '6e2d1e3a-2c4a-4b5d-8e6f-1a2b3c4d5e6f';

// =============================================================================
// NODE ID GENERATION
// =============================================================================

/**
 * Node types for the second segment of node IDs
 *
 * Introduction flow: COMP → LEGO → DEBU
 * Subsequent practice: ETER
 */
const NODE_TYPES = {
  SEED: 'SEED',  // Seed sentence
  COMP: 'COMP',  // Component (M-type LEGO building blocks) - introduction only
  LEGO: 'LEGO',  // The LEGO itself - introduction only
  DEBU: 'DEBU',  // Debut phrases (practice during introduction)
  ETER: 'ETER'   // Eternal phrases (all practice after introduction)
};

/**
 * Generate a 16-character hash from known|target pair
 * Used for the last two segments of node IDs (4 + 12 = 16 chars)
 */
function hashPair(known, target) {
  const input = `${known}|${target}`;
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return hash.substring(0, 16).toUpperCase();
}

/**
 * Generate a structured node ID
 *
 * @param {string} seedId - Seed ID, e.g., "S0042"
 * @param {string} legoId - LEGO ID within seed, e.g., "L01" (or null for seed node)
 * @param {string} nodeType - One of NODE_TYPES: SEED, DEBT, COMP, PRAC, ETER
 * @param {number} order - Order index (0-9999), 0 for SEED/DEBT
 * @param {string} known - Known language text
 * @param {string} target - Target language text
 * @returns {string} UUID-formatted node ID, e.g., "S0042L01-PRAC-0003-A7F3-B2C1E9D4F5A6"
 */
function generateNodeId(seedId, legoId, nodeType, order, known, target) {
  // Validate inputs
  if (!NODE_TYPES[nodeType]) {
    throw new Error(`Invalid node type: ${nodeType}. Must be one of: ${Object.keys(NODE_TYPES).join(', ')}`);
  }

  // Build segment 1: SeedLego (8 chars)
  // S0042 + L01 = S0042L01, or S0042 + null = S0042000
  const segment1 = legoId
    ? `${seedId}${legoId}`.substring(0, 8).padEnd(8, '0')
    : `${seedId}000`.substring(0, 8);

  // Segment 2: Type (4 chars)
  const segment2 = nodeType;

  // Segment 3: Order (4 chars, zero-padded)
  const segment3 = String(order).padStart(4, '0');

  // Segments 4+5: Hash of known|target (4 + 12 = 16 chars)
  const hash = hashPair(known, target);
  const segment4 = hash.substring(0, 4);
  const segment5 = hash.substring(4, 16);

  return `${segment1}-${segment2}-${segment3}-${segment4}-${segment5}`;
}

/**
 * Convenience functions for each node type
 */
function generateSeedNodeId(seedId, known, target) {
  return generateNodeId(seedId, null, NODE_TYPES.SEED, 0, known, target);
}

function generateComponentNodeId(seedId, legoId, order, known, target) {
  return generateNodeId(seedId, legoId, NODE_TYPES.COMP, order, known, target);
}

function generateLegoNodeId(seedId, legoId, known, target) {
  return generateNodeId(seedId, legoId, NODE_TYPES.LEGO, 0, known, target);
}

function generateDebutNodeId(seedId, legoId, order, known, target) {
  return generateNodeId(seedId, legoId, NODE_TYPES.DEBU, order, known, target);
}

function generateEternalNodeId(seedId, legoId, order, known, target) {
  return generateNodeId(seedId, legoId, NODE_TYPES.ETER, order, known, target);
}

/**
 * Parse a node ID back into its components
 *
 * @param {string} nodeId - e.g., "S0042L01-PRAC-0003-A7F3-B2C1E9D4F5A6"
 * @returns {object} { seedId, legoId, nodeType, order, hash }
 */
function parseNodeId(nodeId) {
  const parts = nodeId.split('-');
  if (parts.length !== 5) {
    throw new Error(`Invalid node ID format: ${nodeId}`);
  }

  const segment1 = parts[0]; // S0042L01 or S0042000
  const seedId = segment1.substring(0, 5); // S0042
  const legoSuffix = segment1.substring(5, 8); // L01 or 000
  const legoId = legoSuffix === '000' ? null : legoSuffix;

  return {
    seedId,
    legoId,
    nodeType: parts[1],
    order: parseInt(parts[2], 10),
    hash: parts[3] + parts[4]
  };
}

// =============================================================================
// SAMPLE ID GENERATION (Audio files)
// =============================================================================

/**
 * Normalize text for consistent hashing
 * - Lowercase
 * - Trim whitespace
 * - Normalize internal whitespace
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate UUID v5 from a string input
 * RFC 4122 compliant
 */
function uuidv5(input, namespace) {
  // Parse namespace UUID to bytes
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');

  // Create SHA-1 hash of namespace + input
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBytes);
  hash.update(input);
  const digest = hash.digest();

  // Set version (5) and variant bits per RFC 4122
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;

  // Format as UUID string (uppercase)
  const hex = digest.slice(0, 16).toString('hex').toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generate a sample ID (audio file UUID)
 *
 * Hash input order: voiceId:lang:role:cadence:text
 * (Ordered from least to most variable - gives most "space" to text)
 *
 * Output format: 8-4-4-4-12 (standard UUID v5 format)
 *
 * @param {string} voiceId - e.g., "azure_es-ES-ElviraNeural"
 * @param {string} text - The text to speak
 * @param {string} lang - ISO 639-3 language code, e.g., "spa"
 * @param {string} role - source, target1, target2, presentation
 * @param {string} cadence - natural or slow
 * @returns {string} Deterministic UUID v5 in 8-4-4-4-12 format
 */
function generateSampleId(voiceId, text, lang, role, cadence) {
  const normalizedText = normalizeText(text);
  // Order: voiceId:lang:role:cadence:text (least to most variable)
  const key = `${voiceId}:${lang}:${role}:${cadence}:${normalizedText}`;
  return uuidv5(key, SSI_AUDIO_NAMESPACE);
}

/**
 * Cadence rules per v11 spec
 */
const CADENCE_RULES = {
  source: 'natural',
  target1: 'slow',
  target2: 'slow',
  presentation: 'natural',
  presentation_encouragement: 'natural'
};

/**
 * Get the correct cadence for a role
 */
function getCadenceForRole(role) {
  return CADENCE_RULES[role] || 'natural';
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Node ID generation
  NODE_TYPES,
  generateNodeId,
  generateSeedNodeId,
  generateComponentNodeId,
  generateLegoNodeId,
  generateDebutNodeId,
  generateEternalNodeId,
  parseNodeId,

  // Sample ID generation
  generateSampleId,
  normalizeText,
  getCadenceForRole,
  CADENCE_RULES,

  // Low-level utilities
  hashPair,
  uuidv5,
  SSI_AUDIO_NAMESPACE
};
