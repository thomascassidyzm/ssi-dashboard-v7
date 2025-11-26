/**
 * Audio Generation Planner
 *
 * Analyzes course manifest and creates execution plan with cost estimates,
 * time predictions, and resource usage before actual generation.
 */

const marService = require('./mar-service.cjs');
const cadenceService = require('./cadence-service.cjs');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * API pricing and limits
 */
const PRICING = {
  azure: {
    tiers: {
      f0: { name: 'Free (F0)', free_chars: 500000, cost_per_million: 0 },
      s0: { name: 'Standard (S0)', free_chars: 0, cost_per_million: 4.0 }  // $4 per 1M neural chars
    },
    rate_limit_ms: 100, // 100ms between requests
  },
  elevenlabs: {
    tiers: {
      free: { chars: 10000, cost: 0, overage: null },
      starter: { chars: 30000, cost: 5, overage: 0.30 },      // $0.30 per 1k chars
      creator: { chars: 100000, cost: 22, overage: 0.30 },     // $0.30 per 1k chars
      pro: { chars: 500000, cost: 99, overage: 0.24 },         // $0.24 per 1k chars
      scale: { chars: 2000000, cost: 330, overage: 0.18 },     // $0.18 per 1k chars
      business: { chars: 11000000, cost: 1320, overage: 0.18 } // $0.18 per 1k chars
    },
    rate_limits: {
      free: 1,       // 1 req/sec
      starter: 2,    // 2 req/sec
      creator: 3,    // 3 req/sec
      pro: 5,        // 5 req/sec
      scale: 8,      // 8 req/sec
      business: 15   // 15 req/sec
    }
  }
};

/**
 * Average generation speeds and parallelization
 */
const GENERATION_SPEED = {
  azure: {
    secondsPerSample: 2,      // ~2 seconds per sample average
    concurrentWorkers: 8       // 8 parallel workers
  },
  elevenlabs: {
    secondsPerSample: 2.5,    // ~2.5 seconds per sample average
    concurrentWorkers: 5       // Rate limit: 5 req/sec on Pro tier
  }
};

/**
 * Count total characters in text
 * Applies model-specific multipliers (Flash and Turbo use 50% fewer characters)
 */
function countCharacters(text, model = null) {
  const baseChars = text.length;

  // Flash and Turbo models use 50% fewer characters
  const modelMultipliers = {
    'eleven_flash_v2_5': 0.5,
    'eleven_turbo_v2_5': 0.5,
    'eleven_multilingual_v2': 1.0,
    'eleven_v3': 1.0
  };

  const multiplier = model && modelMultipliers[model] !== undefined
    ? modelMultipliers[model]
    : 1.0;

  return Math.ceil(baseChars * multiplier);
}

/**
 * Estimate Azure cost
 * @param {number} charCount - Number of characters to generate
 * @param {string} azureTier - Azure tier: 'f0' (free) or 's0' (standard/pay-as-you-go)
 */
function estimateAzureCost(charCount, azureTier = 'f0') {
  const tierInfo = PRICING.azure.tiers[azureTier] || PRICING.azure.tiers.f0;

  if (azureTier === 's0') {
    // S0: All characters are billable at $4/million
    const cost = (charCount / 1000000) * tierInfo.cost_per_million;
    return {
      cost,
      tier: 's0',
      tierName: tierInfo.name,
      remaining: null  // No free quota on S0
    };
  }

  // F0: Free tier with 500K limit
  if (charCount <= tierInfo.free_chars) {
    return {
      cost: 0,
      tier: 'f0',
      tierName: tierInfo.name,
      remaining: tierInfo.free_chars - charCount
    };
  }

  // F0 quota exceeded - show what would happen
  return {
    cost: 0,
    tier: 'f0',
    tierName: tierInfo.name,
    remaining: 0,
    exceeds: charCount - tierInfo.free_chars,
    warning: `Exceeds F0 quota by ${(charCount - tierInfo.free_chars).toLocaleString()} chars - upgrade to S0 required`
  };
}

/**
 * Estimate ElevenLabs cost and check quota
 */
function estimateElevenLabsCost(charCount, userTier = 'creator', currentUsage = 0, actualQuota = null) {
  const tierInfo = PRICING.elevenlabs.tiers[userTier];

  if (!tierInfo) {
    throw new Error(`Unknown ElevenLabs tier: ${userTier}`);
  }

  // Use actual quota from API if provided, otherwise fall back to hardcoded
  const monthlyQuota = actualQuota !== null ? actualQuota : tierInfo.chars;
  const remaining = monthlyQuota - currentUsage;
  const exceedsQuota = charCount > remaining;
  const shortfall = exceedsQuota ? charCount - remaining : 0;

  // Calculate overage cost if applicable
  let overageCost = 0;
  if (exceedsQuota && tierInfo.overage) {
    overageCost = (shortfall / 1000) * tierInfo.overage;
  }

  const totalCost = tierInfo.cost + overageCost;

  return {
    tier: userTier,
    monthlyCost: tierInfo.cost,
    monthlyQuota,
    currentUsage,
    remaining,
    needed: charCount,
    exceedsQuota,
    shortfall,
    overageCost,
    overageRate: tierInfo.overage,
    totalCost,
    rateLimit: PRICING.elevenlabs.rate_limits[userTier] || 1
  };
}

/**
 * Estimate generation time with parallel processing
 * For ElevenLabs, uses actual tier rate limit when provided (dynamic workers)
 */
function estimateGenerationTime(sampleCount, provider, rateLimit = null) {
  const config = GENERATION_SPEED[provider];

  if (provider === 'elevenlabs' && rateLimit) {
    // For ElevenLabs, use rate limit directly as concurrent workers
    // This makes estimates adapt to your actual tier (Creator=3, Pro=5, Scale=8, etc.)
    const totalTime = sampleCount * config.secondsPerSample;
    const parallelTime = totalTime / rateLimit;  // Use rateLimit as workers
    const rateLimitTime = sampleCount / rateLimit;
    return Math.max(parallelTime, rateLimitTime);
  }

  // Fallback: use configured concurrent workers
  const totalTime = sampleCount * config.secondsPerSample;
  const parallelTime = totalTime / config.concurrentWorkers;
  return parallelTime;
}

/**
 * Get segment hash for presentation narration (same logic as presentation-service.cjs)
 */
function getSegmentHash(text) {
  return crypto.createHash('md5').update(text).digest('hex').substring(0, 16);
}

/**
 * Parse presentation text into main and optional explanation parts
 * (Simplified version from presentation-service.cjs)
 */
function parsePresentation(phrase) {
  const presentationPattern = /^(.*?\.\.\. '[^']+' \.\.\. '[^']+')(.*)$/;
  const match = phrase.match(presentationPattern);

  if (!match) {
    return { mainPresentation: phrase, explanation: null };
  }

  const mainPresentation = match[1].trim();
  const remainder = match[2].trim();

  let explanation = null;
  if (remainder.startsWith('-')) {
    explanation = remainder.substring(1).trim();
  } else if (remainder.length > 0) {
    explanation = remainder;
  }

  return { mainPresentation, explanation };
}

/**
 * Parse main presentation to extract source narration
 */
function parseMainPresentation(mainPresentation) {
  const parts = mainPresentation.split(": ... '");
  if (parts.length !== 2) {
    return { sourcePart: mainPresentation };
  }
  return { sourcePart: parts[0].trim() };
}

/**
 * Extract text segments from explanation
 */
function parseExplanationSegments(explanation) {
  const segments = [];
  const pattern = /\{(target1|target2)\}\s*(["'])(.*?)\2(?=[\s,.;:!?)]|$)/g;

  let lastPosition = 0;
  let match;

  while ((match = pattern.exec(explanation)) !== null) {
    // Add text segment before this target (if any)
    if (match.index > lastPosition) {
      const textSegment = explanation.substring(lastPosition, match.index);
      const textContent = textSegment.replace(/[^\w\s]/g, '').trim();
      if (textContent) {
        segments.push({ type: 'text', content: textSegment });
      }
    }

    // Target segment (we skip this for cost calculation)
    lastPosition = match.index + match[0].length;
  }

  // Add final text segment (if any)
  if (lastPosition < explanation.length) {
    const textSegment = explanation.substring(lastPosition);
    const textContent = textSegment.replace(/[^\w\s]/g, '').trim();
    if (textContent) {
      segments.push({ type: 'text', content: textSegment });
    }
  }

  return segments;
}

/**
 * Extract all unique text segments from presentation samples
 * Returns segments that will require TTS generation (excludes target samples)
 */
function extractAllUniqueSegments(presentationSamples) {
  const uniqueSegments = new Set();
  const segmentMap = new Map(); // text -> count

  for (const sample of presentationSamples) {
    try {
      const { mainPresentation, explanation } = parsePresentation(sample.text);

      // Extract main presentation source part
      const { sourcePart } = parseMainPresentation(mainPresentation);
      uniqueSegments.add(sourcePart);
      segmentMap.set(sourcePart, (segmentMap.get(sourcePart) || 0) + 1);

      // Extract explanation text segments if present
      if (explanation) {
        const segments = parseExplanationSegments(explanation);
        for (const segment of segments) {
          if (segment.type === 'text') {
            uniqueSegments.add(segment.content);
            segmentMap.set(segment.content, (segmentMap.get(segment.content) || 0) + 1);
          }
        }
      }
    } catch (error) {
      // Skip unparseable presentations
    }
  }

  return { uniqueSegments, segmentMap };
}

/**
 * Check which segments exist in cache
 */
async function checkSegmentCache(uniqueSegments, cacheDir) {
  const cached = new Set();
  const missing = new Set();
  let cachedChars = 0;
  let missingChars = 0;

  if (!await fs.pathExists(cacheDir)) {
    // No cache directory exists yet
    for (const text of uniqueSegments) {
      missing.add(text);
      missingChars += text.length;
    }
    return { cached, missing, cachedChars, missingChars };
  }

  for (const text of uniqueSegments) {
    const hash = getSegmentHash(text);
    const segmentPath = path.join(cacheDir, `seg_${hash}.mp3`);

    if (await fs.pathExists(segmentPath)) {
      cached.add(text);
      cachedChars += text.length;
    } else {
      missing.add(text);
      missingChars += text.length;
    }
  }

  return { cached, missing, cachedChars, missingChars };
}

/**
 * Analyze presentation segment requirements with cache awareness
 * Returns REAL costs accounting for segment deduplication and caching
 */
async function analyzePresentationSegments(manifest, cacheDir) {
  const samples = manifest.slices?.[0]?.samples || {};

  // Extract presentation samples
  const presentationSamples = [];
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      if (variant.role === 'presentation') {
        presentationSamples.push({
          text,
          uuid: variant.id || variant.uuid, // Use id or uuid (some samples use different property names)
          id: variant.id,
          role: variant.role
        });
      }
    }
  }

  if (presentationSamples.length === 0) {
    return {
      totalPresentations: 0,
      uniqueSegments: 0,
      cachedSegments: 0,
      newSegments: 0,
      cachedChars: 0,
      newChars: 0,
      totalSegmentChars: 0,
      naiveEnglishChars: 0,
      segmentMap: new Map()
    };
  }

  // Extract all unique segments
  const { uniqueSegments, segmentMap } = extractAllUniqueSegments(presentationSamples);

  // Check segment cache
  const { cached, missing, cachedChars, missingChars } = await checkSegmentCache(uniqueSegments, cacheDir);

  const totalSegmentChars = cachedChars + missingChars;

  // Calculate naive English-only char count (for accurate comparison)
  // This excludes Chinese characters and {target} tags that won't be generated
  // Count raw characters first
  let naiveEnglishRawChars = 0;
  for (const sample of presentationSamples) {
    let englishText = sample.text;
    // Remove target Chinese: ... '中文' ... '中文'
    englishText = englishText.replace(/\.\.\. '[^']+' \.\.\. '[^']+'/g, '');
    // Remove {target1}'中文' and {target2}'中文' tags
    englishText = englishText.replace(/\{target[12]\}'[^']+'/g, '');
    naiveEnglishRawChars += englishText.length;
  }

  // NOTE: Don't apply Flash multiplier here - let the comparison use raw chars
  // The actual cost will be calculated with Flash multiplier in the voice costs
  const naiveEnglishChars = naiveEnglishRawChars;

  return {
    totalPresentations: presentationSamples.length,
    uniqueSegments: uniqueSegments.size,
    cachedSegments: cached.size,
    newSegments: missing.size,
    cachedChars,
    newChars: missingChars,
    totalSegmentChars,
    naiveEnglishChars, // Add this for correct comparison
    segmentMap
  };
}

/**
 * Analyze generation requirements
 */
async function analyzeGenerationRequirements(manifest, voiceAssignments, voiceRegistry) {
  const analysis = {
    byVoice: {},
    byRole: {},
    byCadence: {},
    byContentType: {
      legos: { count: 0, chars: 0 },
      phrases: { count: 0, chars: 0 },
      presentations: { count: 0, chars: 0 },
      encouragements: { count: 0, chars: 0 }
    },
    totals: {
      totalSamples: 0,
      newSamples: 0,
      existingSamples: 0,
      totalChars: 0
    }
  };

  // Pre-load all voice samples ONCE and create index (performance optimization)
  console.log('Loading voice samples from MAR...');
  const voiceSamplesCache = {};
  const voiceIndexCache = {}; // Index for O(1) lookups
  const uniqueVoices = [...new Set(Object.values(voiceAssignments))];

  for (const voiceId of uniqueVoices) {
    voiceSamplesCache[voiceId] = await marService.loadVoiceSamples(voiceId);
    const count = Object.keys(voiceSamplesCache[voiceId].samples || {}).length;
    console.log(`  ${voiceId}: ${count.toLocaleString()} existing samples`);

    // Build index: key = normalizedText|role|language|cadence, value = uuid
    // Use normalized text for case-insensitive, punctuation-agnostic matching
    voiceIndexCache[voiceId] = new Map();
    for (const [uuid, sample] of Object.entries(voiceSamplesCache[voiceId].samples || {})) {
      const normalizedText = marService.normalizeText(sample.text);
      const key = `${normalizedText}|${sample.role}|${sample.language}|${sample.cadence}`;
      voiceIndexCache[voiceId].set(key, { uuid, ...sample });
    }
  }
  console.log('');

  // Group samples by voice and deduplicate by normalized text + role + cadence
  // Samples are in the slice, not at top level
  const samples = manifest.slices?.[0]?.samples || {};

  // First pass: deduplicate variants with the same normalized form
  const uniqueSamples = new Map(); // key: normalized|role|cadence, value: { text, variant, uuids }

  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const normalized = marService.normalizeText(text);
      const cadence = variant.cadence || 'natural';
      const dedupeKey = `${normalized}|${variant.role}|${cadence}`;

      if (!uniqueSamples.has(dedupeKey)) {
        uniqueSamples.set(dedupeKey, {
          text,
          normalized,
          variant,
          uuids: []
        });
      }

      // Track all UUIDs that map to this normalized form
      uniqueSamples.get(dedupeKey).uuids.push(variant.uuid);
    }
  }

  console.log(`Deduplication: ${Object.keys(samples).flatMap(k => samples[k]).length} variants → ${uniqueSamples.size} unique samples\n`);

  // Second pass: analyze only unique samples
  for (const [dedupeKey, { text, normalized, variant, uuids }] of uniqueSamples) {
    const variantData = variant; // Rename for clarity
    for (const variant of [variantData]) { // Keep the loop structure for minimal code changes
      const voiceId = voiceAssignments[variant.role];

      if (!voiceId) {
        console.warn(`No voice assigned for role: ${variant.role}`);
        continue;
      }

      // Initialize voice entry
      if (!analysis.byVoice[voiceId]) {
        analysis.byVoice[voiceId] = {
          samples: [],
          totalChars: 0,
          newSamples: 0,
          existingSamples: 0
        };
      }

      // Initialize role entry
      if (!analysis.byRole[variant.role]) {
        analysis.byRole[variant.role] = {
          count: 0,
          chars: 0
        };
      }

      // Initialize cadence entry
      const cadence = variant.cadence || 'natural';
      if (!analysis.byCadence[cadence]) {
        analysis.byCadence[cadence] = {
          count: 0,
          chars: 0
        };
      }

      // Check if exists in MAR (use indexed lookup for O(1) performance)
      // Use already-normalized text from deduplication
      const language = variant.role.startsWith('target') ? manifest.target : manifest.known;
      const lookupKey = `${normalized}|${variant.role}|${language}|${cadence}`;
      const existing = voiceIndexCache[voiceId]?.get(lookupKey) || null;

      // Get voice info to determine model (for character multiplier)
      const voiceInfo = voiceRegistry.voices[voiceId];
      const model = voiceInfo?.model || null;
      const charCount = countCharacters(text, model);
      const isNew = !existing;

      analysis.byVoice[voiceId].samples.push({
        text,
        role: variant.role,
        cadence,
        chars: charCount,
        isNew
      });

      analysis.byVoice[voiceId].totalChars += charCount;

      if (isNew) {
        analysis.byVoice[voiceId].newSamples++;
        analysis.totals.newSamples++;
      } else {
        analysis.byVoice[voiceId].existingSamples++;
        analysis.totals.existingSamples++;
      }

      analysis.byRole[variant.role].count++;
      analysis.byRole[variant.role].chars += charCount;

      analysis.byCadence[cadence].count++;
      analysis.byCadence[cadence].chars += charCount;

      // Categorize by content type
      let contentType;
      if (variant.role === 'presentation') {
        if (text.toLowerCase().includes('now,') || text.toLowerCase().includes('the ')) {
          contentType = 'presentations';
        } else {
          contentType = 'encouragements';
        }
      } else if (text.split(' ').length <= 3 && variant.role.startsWith('target')) {
        contentType = 'legos';
      } else {
        contentType = 'phrases';
      }

      analysis.byContentType[contentType].count++;
      if (isNew) {
        analysis.byContentType[contentType].chars += charCount;
      }

      analysis.totals.totalSamples++;
      if (isNew) {
        analysis.totals.totalChars += charCount;
      }
    }
  }

  return analysis;
}

/**
 * Convert 3-letter language codes to 2-letter codes for voice registry lookup
 */
function normalizeLanguageCode(code) {
  const mapping = {
    'eng': 'en',
    'spa': 'es',
    'ita': 'it',
    'fra': 'fr',
    'deu': 'de',
    'por': 'pt',
    'rus': 'ru',
    'jpn': 'ja',
    'kor': 'ko',
    'cmn': 'zh'
  };
  return mapping[code] || code;
}

/**
 * Analyze voice precedent for given language codes
 */
function analyzeVoicePrecedent(knownCode, targetCode, voiceRegistry) {
  const analysis = {
    targetLanguage: {
      code: targetCode,
      target1: new Set(),
      target2: new Set()
    },
    knownLanguage: {
      code: knownCode,
      source: new Set(),
      presentation: new Set()
    },
    availableVoices: {
      target: [],
      known: []
    }
  };

  // Check language pair assignments for precedent
  for (const [pair, assignments] of Object.entries(voiceRegistry.language_pair_assignments || {})) {
    const [knownLang, targetLang] = pair.split('-');

    if (targetLang === targetCode) {
      if (assignments.target1) analysis.targetLanguage.target1.add(assignments.target1);
      if (assignments.target2) analysis.targetLanguage.target2.add(assignments.target2);
    }

    if (knownLang === knownCode) {
      if (assignments.source) analysis.knownLanguage.source.add(assignments.source);
      if (assignments.presentation) analysis.knownLanguage.presentation.add(assignments.presentation);
    }
  }

  // Find available voices for each language
  for (const [voiceId, voiceData] of Object.entries(voiceRegistry.voices || {})) {
    if (voiceData.language === targetCode) {
      analysis.availableVoices.target.push({ id: voiceId, ...voiceData });
    }
    if (voiceData.language === knownCode) {
      analysis.availableVoices.known.push({ id: voiceId, ...voiceData });
    }
  }

  return analysis;
}

/**
 * Build guidance message for Claude Code agent to select voices
 */
function buildVoiceSelectionGuidance(courseCode, languagePair, precedentAnalysis, voiceRegistry) {
  const lines = [];

  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`VOICE ASSIGNMENT REQUIRED`);
  lines.push(`${'='.repeat(80)}\n`);
  lines.push(`No voice assignments found for: ${courseCode} (language pair: ${languagePair})\n`);
  lines.push(`INSTRUCTIONS FOR CLAUDE CODE AGENT:\n`);
  lines.push(`1. Analyze precedent below to see which voices were used for these languages`);
  lines.push(`2. Review available voices for each language`);
  lines.push(`3. Select appropriate voices based on precedent (prefer consistency)`);
  lines.push(`4. Update public/vfs/canonical/voices.json with your selection\n`);

  lines.push(`${'─'.repeat(80)}`);
  lines.push(`PRECEDENT ANALYSIS\n`);

  // Target language precedent
  const targetPrecedent = precedentAnalysis.targetLanguage;
  lines.push(`Target Language (${targetPrecedent.code}):`);
  if (targetPrecedent.target1.size > 0) {
    lines.push(`  ✓ target1: ${Array.from(targetPrecedent.target1).join(', ')} (used in other courses)`);
  } else {
    lines.push(`  ✗ target1: No precedent - select from available voices below`);
  }
  if (targetPrecedent.target2.size > 0) {
    lines.push(`  ✓ target2: ${Array.from(targetPrecedent.target2).join(', ')} (used in other courses)`);
  } else {
    lines.push(`  ✗ target2: No precedent - select from available voices below`);
  }

  // Known language precedent
  const knownPrecedent = precedentAnalysis.knownLanguage;
  lines.push(`\nKnown Language (${knownPrecedent.code}):`);
  if (knownPrecedent.source.size > 0) {
    lines.push(`  ✓ source: ${Array.from(knownPrecedent.source).join(', ')} (used in other courses)`);
  } else {
    lines.push(`  ✗ source: No precedent - select from available voices below`);
  }
  if (knownPrecedent.presentation.size > 0) {
    lines.push(`  ✓ presentation: ${Array.from(knownPrecedent.presentation).join(', ')} (used in other courses)`);
  } else {
    lines.push(`  ✗ presentation: No precedent - select from available voices below`);
  }

  lines.push(`\n${'─'.repeat(80)}`);
  lines.push(`AVAILABLE VOICES\n`);

  // Available target voices
  lines.push(`Target Language (${targetPrecedent.code}):`);
  if (precedentAnalysis.availableVoices.target.length > 0) {
    precedentAnalysis.availableVoices.target.forEach(v => {
      lines.push(`  - ${v.id} (${v.display_name}) [${v.provider}]`);
    });
  } else {
    lines.push(`  ⚠️  No voices configured for ${targetPrecedent.code}`);
  }

  // Available known voices
  lines.push(`\nKnown Language (${knownPrecedent.code}):`);
  if (precedentAnalysis.availableVoices.known.length > 0) {
    precedentAnalysis.availableVoices.known.forEach(v => {
      lines.push(`  - ${v.id} (${v.display_name}) [${v.provider}]`);
    });
  } else {
    lines.push(`  ⚠️  No voices configured for ${knownPrecedent.code}`);
  }

  lines.push(`\n${'─'.repeat(80)}`);
  lines.push(`SELECTION GUIDELINES\n`);
  lines.push(`- If precedent exists: PREFER using the same voices for consistency`);
  lines.push(`- If no precedent: Choose voices with appropriate gender diversity (female/male)`);
  lines.push(`- target1: Typically female voice for target language`);
  lines.push(`- target2: Typically male voice for target language (different from target1)`);
  lines.push(`- source: Voice for known language (usually matches presentation)`);
  lines.push(`- presentation: Voice for known language presentations\n`);

  lines.push(`${'─'.repeat(80)}`);
  lines.push(`HOW TO UPDATE voices.json\n`);
  lines.push(`Add to "language_pair_assignments" section (preferred for reusability):`);
  lines.push(`\n"${languagePair}": {`);
  lines.push(`  "target1": "voice_id_here",`);
  lines.push(`  "target2": "voice_id_here",`);
  lines.push(`  "source": "voice_id_here",`);
  lines.push(`  "presentation": "voice_id_here"`);
  lines.push(`}\n`);
  lines.push(`OR add to "course_assignments" section (course-specific override):`);
  lines.push(`\n"${courseCode}": {`);
  lines.push(`  "target1": "voice_id_here",`);
  lines.push(`  "target2": "voice_id_here",`);
  lines.push(`  "source": "voice_id_here",`);
  lines.push(`  "presentation": "voice_id_here"`);
  lines.push(`}`);
  lines.push(`\n${'='.repeat(80)}\n`);

  return lines.join('\n');
}

/**
 * Generate execution plan
 */
async function generateExecutionPlan(courseCode, manifest, voiceRegistry, options = {}) {
  const {
    elevenLabsTier = 'creator',
    elevenLabsUsage = 0,
    elevenLabsQuota = null,
    azureTier = 's0'  // Default to S0 (pay-as-you-go) - use 'f0' for free tier
  } = options;

  // Extract language codes from manifest and normalize to 2-letter codes
  const knownCode = normalizeLanguageCode(manifest.known);
  const targetCode = normalizeLanguageCode(manifest.target);

  // Build language pairs (known-target format, e.g., "en-es")
  const languagePair = `${knownCode}-${targetCode}`;
  const reversePair = `${targetCode}-${knownCode}`;

  // Priority order for voice assignments:
  // 1. Course-specific assignments (highest priority - allows per-course customization)
  let voiceAssignments = voiceRegistry.course_assignments?.[courseCode];
  let assignmentSource = 'course-specific';

  // 2. Language pair assignments (fallback for standard language pairs)
  if (!voiceAssignments) {
    voiceAssignments = voiceRegistry.language_pair_assignments?.[languagePair];
    assignmentSource = 'language-pair';
  }

  // 3. Try reverse pair if needed
  if (!voiceAssignments) {
    voiceAssignments = voiceRegistry.language_pair_assignments?.[reversePair];
    if (voiceAssignments) {
      assignmentSource = 'language-pair-reversed';
      console.log(`Note: Using reverse pair ${reversePair} for ${languagePair}`);
    }
  }

  // 4. If no assignments found, throw error with guidance for Claude Code agent
  if (!voiceAssignments) {
    const precedentAnalysis = analyzeVoicePrecedent(knownCode, targetCode, voiceRegistry);
    const errorMessage = buildVoiceSelectionGuidance(courseCode, languagePair, precedentAnalysis, voiceRegistry);
    throw new Error(errorMessage);
  }

  console.log(`Using ${assignmentSource} voice assignments for ${courseCode}`);

  // Analyze requirements
  const analysis = await analyzeGenerationRequirements(manifest, voiceAssignments, voiceRegistry);

  // Analyze presentation segments (for accurate cost calculation)
  const segmentCacheDir = path.join(__dirname, '../temp/audio/segment_cache');
  console.log(`\nAnalyzing presentation segments (cache: ${segmentCacheDir})...`);
  const presentationAnalysis = await analyzePresentationSegments(manifest, segmentCacheDir);
  console.log(`Found ${presentationAnalysis.totalPresentations} presentations, ${presentationAnalysis.uniqueSegments} unique segments`);
  console.log(`  Cached: ${presentationAnalysis.cachedSegments} (${presentationAnalysis.cachedChars} chars)`);
  console.log(`  New: ${presentationAnalysis.newSegments} (${presentationAnalysis.newChars} chars)\n`);

  // Build plan by provider
  const plan = {
    course: courseCode,
    timestamp: new Date().toISOString(),
    summary: {
      totalSamples: analysis.totals.totalSamples,
      newSamples: analysis.totals.newSamples,
      existingSamples: analysis.totals.existingSamples,
      totalCharsToGenerate: analysis.totals.totalChars
    },
    contentTypes: analysis.byContentType,
    presentationSegments: presentationAnalysis,
    voices: {},
    costs: {},
    timing: {},
    warnings: []
  };

  // Process each voice
  for (const [voiceId, voiceData] of Object.entries(analysis.byVoice)) {
    const voiceInfo = voiceRegistry.voices[voiceId];

    if (!voiceInfo) {
      plan.warnings.push(`Voice not found in registry: ${voiceId}`);
      continue;
    }

    // Check if this is the presentation voice
    const isPresentationVoice = voiceId === voiceAssignments.presentation;

    let newSamplesChars;
    if (isPresentationVoice && presentationAnalysis.totalPresentations > 0) {
      // Use REAL presentation segment costs (deduplication + cache aware)
      // Apply model multiplier (Flash v2.5 uses 0.5x)
      const rawSegmentChars = presentationAnalysis.newChars;
      const model = voiceInfo?.model || null;

      // Apply Flash/Turbo multiplier
      const modelMultipliers = {
        'eleven_flash_v2_5': 0.5,
        'eleven_turbo_v2_5': 0.5,
        'eleven_multilingual_v2': 1.0,
        'eleven_v3': 1.0
      };
      const multiplier = model && modelMultipliers[model] !== undefined ? modelMultipliers[model] : 1.0;
      newSamplesChars = Math.ceil(rawSegmentChars * multiplier);
    } else {
      // Use standard character count for non-presentation samples
      newSamplesChars = voiceData.samples
        .filter(s => s.isNew)
        .reduce((sum, s) => sum + s.chars, 0);
    }

    // Calculate breakdown by role for this voice
    const roleBreakdown = {};
    for (const sample of voiceData.samples) {
      if (!roleBreakdown[sample.role]) {
        roleBreakdown[sample.role] = { count: 0, newCount: 0, chars: 0 };
      }
      roleBreakdown[sample.role].count++;
      if (sample.isNew) {
        roleBreakdown[sample.role].newCount++;
        roleBreakdown[sample.role].chars += sample.chars;
      }
    }

    plan.voices[voiceId] = {
      provider: voiceInfo.provider,
      displayName: voiceInfo.display_name,
      language: voiceInfo.language,
      totalSamples: voiceData.samples.length,
      newSamples: voiceData.newSamples,
      existingSamples: voiceData.existingSamples,
      totalChars: newSamplesChars,
      byRole: roleBreakdown,
      isPresentationVoice
    };

    // Cost estimation
    if (voiceInfo.provider === 'azure') {
      const costInfo = estimateAzureCost(newSamplesChars, azureTier);
      plan.costs[voiceId] = costInfo;
      plan.timing[voiceId] = {
        estimatedSeconds: Math.ceil(estimateGenerationTime(voiceData.newSamples, 'azure')),
        estimatedMinutes: Math.ceil(estimateGenerationTime(voiceData.newSamples, 'azure') / 60)
      };

    } else if (voiceInfo.provider === 'elevenlabs') {
      const costInfo = estimateElevenLabsCost(newSamplesChars, elevenLabsTier, elevenLabsUsage, elevenLabsQuota);
      plan.costs[voiceId] = costInfo;
      plan.timing[voiceId] = {
        estimatedSeconds: Math.ceil(estimateGenerationTime(voiceData.newSamples, 'elevenlabs', costInfo.rateLimit)),
        estimatedMinutes: Math.ceil(estimateGenerationTime(voiceData.newSamples, 'elevenlabs', costInfo.rateLimit) / 60)
      };

      if (costInfo.exceedsQuota) {
        plan.warnings.push(
          `ElevenLabs quota exceeded for ${voiceId}: needs ${costInfo.needed} chars, ` +
          `only ${costInfo.remaining} remaining. Shortfall: ${costInfo.shortfall} chars.`
        );
      }
    }
  }

  // Calculate totals
  const totalGenerationTime = Object.values(plan.timing)
    .reduce((sum, t) => sum + t.estimatedSeconds, 0);

  const PARALLEL_WORKERS = 8; // Match Python script and CPU count
  const estimatedProcessingTime = (analysis.totals.newSamples * 0.5) / PARALLEL_WORKERS; // ~0.5 sec per file, 8 parallel
  const estimatedUploadTime = (analysis.totals.newSamples * 1.5) / 1024; // ~1.5MB avg per file
  const estimatedDurationExtraction = (analysis.totals.totalSamples * 0.3) / PARALLEL_WORKERS; // ~0.3 sec per file, 8 parallel

  plan.totalTiming = {
    generationSeconds: totalGenerationTime,
    processingSeconds: Math.ceil(estimatedProcessingTime),
    uploadSeconds: Math.ceil(estimatedUploadTime),
    durationExtractionSeconds: Math.ceil(estimatedDurationExtraction),
    totalSeconds: Math.ceil(
      totalGenerationTime +
      estimatedProcessingTime +
      estimatedUploadTime +
      estimatedDurationExtraction
    ),
    totalMinutes: Math.ceil(
      (totalGenerationTime +
       estimatedProcessingTime +
       estimatedUploadTime +
       estimatedDurationExtraction) / 60
    )
  };

  return plan;
}

/**
 * Format plan for display
 */
function formatPlan(plan) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push(`Phase 8: Audio Generation Plan for ${plan.course}`);
  lines.push('='.repeat(60));
  lines.push('');

  lines.push('COURSE SUMMARY');
  lines.push('-'.repeat(14));
  lines.push(`Total samples: ${plan.summary.totalSamples}`);
  lines.push(`  New to generate: ${plan.summary.newSamples}`);
  lines.push(`  Existing (reuse): ${plan.summary.existingSamples}`);
  lines.push(`Total characters to generate: ${plan.summary.totalCharsToGenerate.toLocaleString()}`);
  lines.push('');

  lines.push('CONTENT BREAKDOWN');
  lines.push('-'.repeat(17));
  lines.push(`LEGOs (short target phrases): ${plan.contentTypes.legos.count} samples, ${plan.contentTypes.legos.chars.toLocaleString()} chars`);
  lines.push(`Phrases (combinations): ${plan.contentTypes.phrases.count} samples, ${plan.contentTypes.phrases.chars.toLocaleString()} chars`);
  lines.push(`Presentations (teacher): ${plan.contentTypes.presentations.count} samples, ${plan.contentTypes.presentations.chars.toLocaleString()} chars`);
  lines.push(`Encouragements: ${plan.contentTypes.encouragements.count} samples, ${plan.contentTypes.encouragements.chars.toLocaleString()} chars`);
  lines.push('');

  // Add presentation segment analysis if available
  if (plan.presentationSegments && plan.presentationSegments.totalPresentations > 0) {
    const seg = plan.presentationSegments;
    lines.push('PRESENTATION SEGMENTS (Optimized Cost Calculation)');
    lines.push('-'.repeat(51));
    lines.push(`Total presentations: ${seg.totalPresentations.toLocaleString()}`);
    lines.push(`Unique narration segments: ${seg.uniqueSegments.toLocaleString()}`);
    lines.push(`  └─ Already cached: ${seg.cachedSegments.toLocaleString()} segments (${seg.cachedChars.toLocaleString()} chars) ✓`);
    lines.push(`  └─ Need to generate: ${seg.newSegments.toLocaleString()} segments (${seg.newChars.toLocaleString()} chars)`);

    // Use correct naive comparison (English-only, not full text with Chinese)
    const naiveChars = seg.naiveEnglishChars || plan.contentTypes.presentations.chars;
    const savingsPercent = Math.round((1 - seg.newChars / naiveChars) * 100);

    lines.push(`\n💡 Optimization savings: ${savingsPercent}% reduction (${naiveChars.toLocaleString()} → ${seg.newChars.toLocaleString()} raw chars)`);
    lines.push(`   • Segment deduplication: reusing narration across ${seg.totalPresentations.toLocaleString()} presentations`);
    lines.push(`   • Segment cache: ${seg.cachedSegments.toLocaleString()} pre-generated segments`);
    lines.push(`   • Target samples: FREE (already generated in Phase A, downloaded from S3)`);

    // Show Flash multiplier savings if applicable
    const presentationVoiceId = Object.keys(plan.voices).find(id => plan.voices[id].isPresentationVoice);
    if (presentationVoiceId) {
      const actualCharged = plan.voices[presentationVoiceId].totalChars;
      const flashMultiplier = actualCharged / seg.newChars;
      if (flashMultiplier < 1) {
        const naiveCharged = Math.ceil(naiveChars * flashMultiplier);
        const totalSavings = Math.round((1 - actualCharged / naiveCharged) * 100);
        lines.push(`   • Flash v2.5 multiplier (0.5x): ${seg.newChars.toLocaleString()} → ${actualCharged.toLocaleString()} chars billed`);
        lines.push(`   • TOTAL savings: ${totalSavings}% (${naiveCharged.toLocaleString()} → ${actualCharged.toLocaleString()} chars billed)`);
      }
    }

    lines.push('');
  }

  lines.push('GENERATION BREAKDOWN');
  lines.push('-'.repeat(20));
  for (const [voiceId, voiceInfo] of Object.entries(plan.voices)) {
    const presentationNote = voiceInfo.isPresentationVoice ? ' [OPTIMIZED - see above]' : '';
    lines.push(`\n${voiceInfo.displayName} (${voiceInfo.provider})${presentationNote}:`);

    // Show breakdown by role if voice is used for multiple roles
    const roles = Object.keys(voiceInfo.byRole || {});
    if (roles.length > 1) {
      for (const role of roles.sort()) {
        const roleData = voiceInfo.byRole[role];
        lines.push(`  ${role}: ${roleData.newCount.toLocaleString()} samples, ${roleData.chars.toLocaleString()} chars`);
      }
      lines.push(`  ─────────────────────────`);
      lines.push(`  Total: ${voiceInfo.newSamples.toLocaleString()} samples, ${voiceInfo.totalChars.toLocaleString()} chars`);
      if (voiceInfo.isPresentationVoice) {
        lines.push(`  (Using optimized segment-based cost calculation)`);
      }
    } else {
      lines.push(`  New samples: ${voiceInfo.newSamples}`);
      lines.push(`  Existing (reuse): ${voiceInfo.existingSamples}`);
      lines.push(`  Characters to generate: ${voiceInfo.totalChars.toLocaleString()}`);
      if (voiceInfo.isPresentationVoice) {
        lines.push(`  (Optimized: only unique narration segments, excludes cached & target samples)`);
      }
    }
    lines.push(`  Estimated time: ~${plan.timing[voiceId].estimatedMinutes} minutes`);

    const cost = plan.costs[voiceId];
    if (voiceInfo.provider === 'azure') {
      lines.push(`  Tier: ${cost.tierName}`);
      if (cost.tier === 's0') {
        lines.push(`  Cost: $${cost.cost.toFixed(2)} ($4/million chars)`);
      } else {
        // F0 free tier
        if (cost.warning) {
          lines.push(`  ⚠️  ${cost.warning}`);
        } else {
          lines.push(`  Cost: FREE`);
          lines.push(`  Remaining quota: ${cost.remaining.toLocaleString()} chars`);
        }
      }
    } else if (voiceInfo.provider === 'elevenlabs') {
      lines.push(`  Plan: ${cost.tier} (${cost.monthlyQuota.toLocaleString()} chars/month - $${cost.monthlyCost})`);
      lines.push(`  Current usage: ${cost.currentUsage.toLocaleString()} chars`);
      lines.push(`  Remaining: ${cost.remaining.toLocaleString()} chars`);

      if (cost.exceedsQuota) {
        lines.push(`  ⚠️  Exceeds quota by ${cost.shortfall.toLocaleString()} chars`);
        if (cost.overageRate) {
          lines.push(`  Overage cost: $${cost.overageCost.toFixed(2)} (@ $${cost.overageRate}/1k chars)`);
        } else {
          lines.push(`  ⚠️  Free tier has no overage - must upgrade!`);
        }
      } else {
        lines.push(`  Cost: Within quota (no overage)`);
      }
    }
  }
  lines.push('');

  if (plan.warnings.length > 0) {
    lines.push('WARNINGS');
    lines.push('-'.repeat(8));
    for (const warning of plan.warnings) {
      lines.push(`⚠️  ${warning}`);
    }
    lines.push('');
  }

  lines.push('TOTAL TIME ESTIMATE');
  lines.push('-'.repeat(19));
  lines.push(`Generation: ~${Math.ceil(plan.totalTiming.generationSeconds / 60)} minutes`);
  lines.push(`Processing: ~${Math.ceil(plan.totalTiming.processingSeconds / 60)} minutes`);
  lines.push(`Upload: ~${Math.ceil(plan.totalTiming.uploadSeconds / 60)} minutes`);
  lines.push(`Duration extraction: ~${Math.ceil(plan.totalTiming.durationExtractionSeconds / 60)} minutes`);
  lines.push(`Total: ~${plan.totalTiming.totalMinutes} minutes`);
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  generateExecutionPlan,
  formatPlan,
  estimateAzureCost,
  estimateElevenLabsCost,
  estimateGenerationTime
};
