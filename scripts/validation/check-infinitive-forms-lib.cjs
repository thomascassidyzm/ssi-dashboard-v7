/**
 * INFINITIVE FORM LINGUISTIC VALIDATOR (Library version)
 *
 * CommonJS library for validating infinitive forms in English LEGOs
 * Only flags violations when target language is in infinitive form
 * Used by orchestrator validation endpoints
 */

// Spanish infinitive patterns (ends in -ar, -er, -ir)
const SPANISH_INFINITIVE_PATTERN = /\b\w+(ar|er|ir)\b/;

// French infinitive patterns (ends in -er, -ir, -re, -oir)
const FRENCH_INFINITIVE_PATTERN = /\b\w+(er|ir|re|oir)\b/;

// Italian infinitive patterns (ends in -are, -ere, -ire)
const ITALIAN_INFINITIVE_PATTERN = /\b\w+(are|ere|ire)\b/;

function startsWithTargetInfinitive(target, targetLang) {
  if (!target || typeof target !== 'string') return false;

  const firstWord = target.trim().split(/\s+/)[0].toLowerCase();

  // Detect language and check if first word is infinitive
  if (targetLang === 'spa' || targetLang === 'es') {
    return /\w+(ar|er|ir)$/.test(firstWord);
  } else if (targetLang === 'fra' || targetLang === 'fr') {
    return /\w+(er|ir|re|oir)$/.test(firstWord);
  } else if (targetLang === 'ita' || targetLang === 'it') {
    return /\w+(are|ere|ire)$/.test(firstWord);
  }

  // For other languages, we can't reliably detect infinitives
  return false;
}

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

function analyzeLego(lego, seedId, targetLang) {
  const violations = [];

  // Extract LEGO components based on format
  let legoId, type, target, known;

  if (Array.isArray(lego)) {
    [legoId, type, target, known] = lego;
  } else {
    ({ id: legoId, type, target, known } = lego);
  }

  if (!known || typeof known !== 'string' || !target || typeof target !== 'string') {
    return violations;
  }

  const knownText = known.trim();
  const targetText = target.trim();

  // ONLY check if target STARTS with an infinitive
  if (!startsWithTargetInfinitive(targetText, targetLang)) {
    return violations; // Skip - target is not an infinitive
  }

  // RULE 1: Target is infinitive, so English should have "to"
  if (startsWithBareInfinitive(knownText)) {
    const hasModal = containsModal(knownText);
    const hasBareInfinitiveTrigger = containsBareInfinitiveTrigger(knownText);
    const hasTo = hasToInfinitive(knownText);

    if (!hasModal && !hasBareInfinitiveTrigger && !hasTo) {
      violations.push({
        type: 'MISSING_TO_INFINITIVE',
        seedId,
        legoId,
        target: targetText,
        known: knownText,
        severity: 'HIGH',
        message: `Target infinitive "${targetText}" should map to "to ${knownText}"`,
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
        target: targetText,
        known: knownText,
        severity: 'HIGH',
        message: `Target infinitive "${targetText}" should map to "to ${knownText}"`,
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

  // Extract target language from course code (e.g., "spa_for_eng" -> "spa")
  const courseCode = data.course || '';
  const targetLang = courseCode.split('_')[0] || '';

  // Detect format - check first seed structure
  const firstSeed = data.seeds[0];
  const isObjectFormat = firstSeed && !Array.isArray(firstSeed) && firstSeed.seed_id;

  // Process each seed
  for (const seed of data.seeds) {
    totalSeeds++;

    let seedId, legos;

    if (isObjectFormat) {
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

      const legoViolations = analyzeLego(lego, seedId, targetLang);

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
