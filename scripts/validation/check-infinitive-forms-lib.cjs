/**
 * INFINITIVE FORM LINGUISTIC VALIDATOR (Library version)
 *
 * CommonJS library for validating infinitive forms in English LEGOs
 * Used by orchestrator validation endpoints
 */

// Common English infinitive verbs
const COMMON_INFINITIVE_VERBS = [
  'speak', 'say', 'talk', 'tell', 'ask', 'answer',
  'go', 'come', 'walk', 'run', 'move', 'travel',
  'do', 'make', 'have', 'get', 'take', 'give',
  'see', 'look', 'watch', 'hear', 'listen',
  'think', 'know', 'understand', 'learn', 'study',
  'remember', 'forget', 'want', 'need', 'like',
  'eat', 'drink', 'cook', 'buy', 'sell',
  'write', 'read', 'send', 'receive',
  'help', 'work', 'play', 'try', 'use',
  'open', 'close', 'start', 'stop', 'finish',
  'call', 'meet', 'visit', 'leave', 'arrive',
  'feel', 'become', 'seem', 'find', 'believe'
];

// Modal verbs that take bare infinitives
const MODAL_VERBS = [
  'can', 'could', 'may', 'might', 'must',
  'shall', 'should', 'will', 'would',
  'ought to', 'used to', 'need to', 'have to',
  "can't", "couldn't", "won't", "wouldn't",
  "shouldn't", "mustn't", "may not", "might not"
];

// Verbs that take bare infinitives (causatives, perception)
const BARE_INFINITIVE_TRIGGERS = [
  'let', 'make', 'have',
  'see', 'watch', 'hear', 'feel', 'notice'
];

function containsModal(text) {
  const lowerText = text.toLowerCase();
  return MODAL_VERBS.some(modal => {
    const patterns = [
      new RegExp(`^${modal}\\s`, 'i'),
      new RegExp(`\\s${modal}\\s`, 'i'),
      new RegExp(`or\\s${modal}\\s`, 'i'),
      new RegExp(`n't\\s${modal}\\s`, 'i')
    ];
    return patterns.some(pattern => pattern.test(lowerText));
  });
}

function containsBareInfinitiveTrigger(text) {
  const lowerText = text.toLowerCase();
  return BARE_INFINITIVE_TRIGGERS.some(trigger => {
    return new RegExp(`\\b${trigger}\\s+(?:me|you|him|her|it|us|them|\\w+)\\s+\\w+`).test(lowerText);
  });
}

function startsWithBareInfinitive(text) {
  const trimmed = text.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  return COMMON_INFINITIVE_VERBS.includes(firstWord);
}

function hasToInfinitive(text) {
  const lowerText = text.toLowerCase();
  return COMMON_INFINITIVE_VERBS.some(verb => {
    return new RegExp(`\\bto\\s+${verb}\\b`).test(lowerText);
  });
}

function analyzeLego(lego, seedId) {
  const violations = [];

  // Extract LEGO components based on format
  let legoId, type, target, known;

  if (Array.isArray(lego)) {
    [legoId, type, target, known] = lego;
  } else {
    ({ id: legoId, type, target, known } = lego);
  }

  if (!known || typeof known !== 'string') {
    return violations;
  }

  const knownText = known.trim();

  // RULE 1: Check for bare infinitive at start (without modal/trigger)
  if (startsWithBareInfinitive(knownText)) {
    const hasModal = containsModal(knownText);
    const hasBareInfinitiveTrigger = containsBareInfinitiveTrigger(knownText);
    const hasTo = hasToInfinitive(knownText);

    if (!hasModal && !hasBareInfinitiveTrigger && !hasTo) {
      violations.push({
        type: 'MISSING_TO_INFINITIVE',
        seedId,
        legoId,
        target,
        known: knownText,
        severity: 'HIGH',
        message: `Bare infinitive without "to" - should be "to ${knownText}"`,
        suggestion: `to ${knownText}`
      });
    }
  }

  // RULE 2: Check for composite infinitive phrases without "to"
  const hasPrepositionPhrase = /\b(with|to|for|at|in|on|about|from)\s+\w+/.test(knownText);
  if (hasPrepositionPhrase && startsWithBareInfinitive(knownText)) {
    const hasModal = containsModal(knownText);
    const hasTo = hasToInfinitive(knownText);

    if (!hasModal && !hasTo) {
      violations.push({
        type: 'COMPOSITE_BARE_INFINITIVE',
        seedId,
        legoId,
        target,
        known: knownText,
        severity: 'HIGH',
        message: `Composite infinitive phrase missing "to"`,
        suggestion: `to ${knownText}`
      });
    }
  }

  return violations;
}

/**
 * Check infinitive forms in lego_pairs data (library version)
 * @param {Object} data - Parsed lego_pairs.json data
 * @returns {Object} - {violations: [], totalSeeds, totalLegos}
 */
function checkInfinitiveFormsData(data) {
  const violations = [];
  let totalLegos = 0;
  let totalSeeds = 0;

  if (!data.seeds || !Array.isArray(data.seeds)) {
    return { violations: [], totalSeeds: 0, totalLegos: 0 };
  }

  // Detect format
  const isV5_1 = data.version === '5.0.1' || (data.methodology && data.methodology.includes('COMPLETE TILING'));

  // Process each seed
  for (const seed of data.seeds) {
    totalSeeds++;

    let seedId, legos;

    if (isV5_1) {
      ({ seed_id: seedId, legos } = seed);
    } else {
      [seedId, , legos] = seed;
    }

    if (!legos || !Array.isArray(legos)) {
      continue;
    }

    // Check each LEGO
    for (let i = 0; i < legos.length; i++) {
      const lego = legos[i];
      totalLegos++;

      const legoViolations = analyzeLego(lego, seedId);

      // Mark if it's the first LEGO (initial position)
      if (i === 0 && legoViolations.length > 0) {
        legoViolations.forEach(v => {
          v.isInitialPosition = true;
          v.severity = 'CRITICAL';
        });
      }

      violations.push(...legoViolations);
    }
  }

  return { violations, totalSeeds, totalLegos };
}

module.exports = { checkInfinitiveFormsData };
