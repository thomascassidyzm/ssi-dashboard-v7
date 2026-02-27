/**
 * Manifest Generator Service
 *
 * IMPORTANT: DATABASE-ONLY ARCHITECTURE (January 2026)
 * =====================================================
 * This service generates course manifests ON-DEMAND from Supabase.
 * Course data is stored EXCLUSIVELY in Supabase, NOT in JSON files.
 *
 * Data Sources (all from Supabase):
 * - courses: Course metadata and voice configuration
 * - course_seeds: Seed sentences
 * - course_legos: LEGO definitions
 * - course_practice_phrases: Practice phrases
 * - course_audio: Audio file references (v13 flat schema)
 * - encouragements: Encouragement audio
 *
 * JSON files (lego_pairs.json, lego_baskets.json) are DEPRECATED.
 * Do NOT read course data from JSON files - always query Supabase.
 *
 * The manifest format matches legacy app expectations for backwards compatibility.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateSampleId, normalizeText } = require('./uuid-v11.cjs');
const langService = require('./language-code-service.cjs');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Language code mappings
const LANG_CODES = {
  'eng': { short: 'en', name: 'English' },
  'spa': { short: 'es', name: 'Spanish' },
  'ita': { short: 'it', name: 'Italian' },
  'cmn': { short: 'zh', name: 'Chinese' },
  'fra': { short: 'fr', name: 'French' },
  'deu': { short: 'de', name: 'German' },
  'por': { short: 'pt', name: 'Portuguese' },
  'cym': { short: 'cy', name: 'Welsh' },
  'jpn': { short: 'ja', name: 'Japanese' }
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Simple tokenizer - split on whitespace
 */
function tokenize(text) {
  if (!text) return [];
  return text.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Create a language node object
 */
function createLanguageNode(text) {
  return {
    text: text,
    tokens: tokenize(text),
    lemmas: tokenize(text)  // Same as tokens for now
  };
}

/**
 * Create a full Node (known + target pair)
 */
function createNode(nodeId, knownText, targetText) {
  return {
    id: nodeId,
    known: createLanguageNode(knownText),
    target: createLanguageNode(targetText)
  };
}

/**
 * Generate presentation text for a LEGO
 */
function generatePresentation(knownText, targetText, langName) {
  return `The ${langName} for — '${knownText.toLowerCase()}' — is: ... '${targetText}' ... '${targetText}'`;
}

/**
 * Generate node ID matching uuid-v11.cjs format
 */
function generateNodeId(seedNumber, legoIndex, knownText, targetText) {
  const seedId = 'S' + String(seedNumber).padStart(4, '0');
  const legoId = 'L' + String(legoIndex).padStart(2, '0');

  // Use the uuid-v11 function if available, otherwise simple hash
  const hashInput = `${seedId}:${legoId}:${knownText}:${targetText}`;
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return `${seedId}${legoId}-LEGO-0000-${hash.substring(0, 12).toUpperCase()}`;
}

// =============================================================================
// COURSE AUDIO LOOKUP
// =============================================================================

// Cache for audio maps (courseCode -> { map, timestamp })
// TTL: 5 minutes - audio rarely changes during a session
const courseAudioCache = new Map();
const AUDIO_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Build a map of text -> audio info from v13 course_audio table (flat schema)
 * Uses in-memory cache to avoid repeated queries
 *
 * @param {string} courseCode - Course code
 * @returns {Promise<Map>} Map of text -> { source?, target1?, target2?, presentation? }
 */
async function buildCourseAudioMap(courseCode) {
  // Check cache first
  const cached = courseAudioCache.get(courseCode);
  if (cached && (Date.now() - cached.timestamp) < AUDIO_CACHE_TTL_MS) {
    console.log(`  Using cached audio for ${courseCode} (${cached.map.size} texts)`);
    return cached.map;
  }

  const audioMap = new Map();  // text -> { role: { id, duration_ms } }

  console.log(`  Loading course audio for ${courseCode}...`);

  // Query course_audio directly (v13 flat schema - no joins needed)
  // Paginate to get all records (Supabase default limit is 1000)
  const PAGE_SIZE = 1000;
  let offset = 0;
  let totalLoaded = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: courseAudio, error } = await supabase
      .from('course_audio')
      .select('id, text, role, duration_ms')
      .eq('course_code', courseCode)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.warn(`  Warning: Could not load course audio: ${error.message}`);
      return audioMap;
    }

    // Build the map from this batch
    for (const ca of courseAudio || []) {
      const textContent = ca.text;
      if (!textContent) continue;

      // Map role names (known -> source for manifest compatibility)
      let role = ca.role;
      if (role === 'known') role = 'source';

      if (!audioMap.has(textContent)) {
        audioMap.set(textContent, {});
      }

      const entry = audioMap.get(textContent);
      entry[role] = {
        id: ca.id,
        duration_ms: ca.duration_ms || 0
      };
    }

    totalLoaded += courseAudio.length;
    hasMore = courseAudio.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  console.log(`  Loaded ${totalLoaded} audio records, ${audioMap.size} unique texts`);

  // Cache for future requests
  courseAudioCache.set(courseCode, { map: audioMap, timestamp: Date.now() });

  return audioMap;
}

// Alias for backwards compatibility
const buildV12AudioMap = buildCourseAudioMap;
const v12AudioCache = courseAudioCache;
const V12_CACHE_TTL_MS = AUDIO_CACHE_TTL_MS;

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate manifest for a course from database
 *
 * @param {string} courseCode - Course code (e.g., 'spa_for_eng_v2')
 * @param {Object} options - Generation options
 * @param {boolean} options.includeTokens - Include tokens/lemmas (default: true)
 * @param {boolean} options.onlyNewLegos - Only include new LEGOs (default: true)
 * @returns {Promise<Object>} The complete manifest object
 */
async function generateManifest(courseCode, options = {}) {
  const { includeTokens = true, onlyNewLegos = true } = options;

  console.log(`Generating manifest for ${courseCode}...`);

  // Get course metadata (courses.course_code is the primary key)
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  if (courseError) {
    throw new Error(`Course not found: ${courseCode}`);
  }

  const knownLang3 = course.known_lang;
  const targetLang3 = course.target_lang;
  const knownLang = langService.databaseToManifest(knownLang3) || LANG_CODES[knownLang3]?.short || knownLang3;
  const targetLang = langService.databaseToManifest(targetLang3) || LANG_CODES[targetLang3]?.short || targetLang3;
  const targetName = langService.getName(targetLang3) || LANG_CODES[targetLang3]?.name || targetLang3;
  const manifestId = langService.toManifestId(courseCode) || `${knownLang}-${targetLang}`;

  // Get voice assignments (may be null for human-recorded courses)
  const voiceAssignments = {
    source: course.known_voice,
    target1: course.target_voice_1,
    target2: course.target_voice_2,
    presentation: course.presentation_voice || course.known_voice  // Default to known_voice if not set
  };

  // Always load course audio map (v13 flat schema) for audio lookups
  // Note: We load this regardless of voice config - audio may already exist in database
  console.log(`  Loading course audio from database...`);
  const v12AudioMap = await buildCourseAudioMap(courseCode); // Variable name kept for compatibility

  // Get all seeds with LEGOs (paginated)
  const PAGE_SIZE = 1000;
  const seeds = [];
  let seedsOffset = 0;
  let hasMoreSeeds = true;

  while (hasMoreSeeds) {
    const { data: seedsBatch, error: seedsError } = await supabase
      .from('course_seeds')
      .select(`
        id,
        seed_number,
        seed_id,
        known_text,
        target_text,
        status
      `)
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .order('seed_number')
      .range(seedsOffset, seedsOffset + PAGE_SIZE - 1);

    if (seedsError) {
      throw seedsError;
    }

    if (seedsBatch && seedsBatch.length > 0) {
      seeds.push(...seedsBatch);
      hasMoreSeeds = seedsBatch.length === PAGE_SIZE;
      seedsOffset += PAGE_SIZE;
    } else {
      hasMoreSeeds = false;
    }
  }

  // Get all LEGOs for this course (paginated)
  const legos = [];
  let legosOffset = 0;
  let hasMoreLegos = true;

  while (hasMoreLegos) {
    const { data: legosBatch, error: legosError } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .order('seed_number')
      .order('lego_index')
      .range(legosOffset, legosOffset + PAGE_SIZE - 1);

    if (legosError) {
      throw legosError;
    }

    if (legosBatch && legosBatch.length > 0) {
      legos.push(...legosBatch);
      hasMoreLegos = legosBatch.length === PAGE_SIZE;
      legosOffset += PAGE_SIZE;
    } else {
      hasMoreLegos = false;
    }
  }

  // Get all practice phrases for this course (paginated)
  const phrases = [];
  let phrasesOffset = 0;
  let hasMorePhrases = true;

  while (hasMorePhrases) {
    const { data: phrasesBatch, error: phrasesError } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .order('seed_number')
      .order('lego_index')
      .order('position')
      .range(phrasesOffset, phrasesOffset + PAGE_SIZE - 1);

    if (phrasesError) {
      throw phrasesError;
    }

    if (phrasesBatch && phrasesBatch.length > 0) {
      phrases.push(...phrasesBatch);
      hasMorePhrases = phrasesBatch.length === PAGE_SIZE;
      phrasesOffset += PAGE_SIZE;
    } else {
      hasMorePhrases = false;
    }
  }

  // Organize LEGOs by seed
  const legosBySeed = {};
  for (const lego of legos) {
    const key = lego.seed_number;
    if (!legosBySeed[key]) {
      legosBySeed[key] = [];
    }
    legosBySeed[key].push(lego);
  }

  // Organize phrases by LEGO
  const phrasesByLego = {};
  for (const phrase of phrases) {
    const key = `${phrase.seed_number}-${phrase.lego_index}`;
    if (!phrasesByLego[key]) {
      phrasesByLego[key] = [];
    }
    phrasesByLego[key].push(phrase);
  }

  // ==========================================================================
  // TEMPORARY: Get encouragements directly from shared_audio
  // TODO: Once 'encouragements' table is created in Supabase, revert to querying that table
  // The encouragements table migration is at: supabase/migrations/20260115_encouragements_table.sql
  // ==========================================================================
  let encouragements = [];
  const { data: sharedAudioEnc, error: encError } = await supabase
    .from('shared_audio')
    .select('text, text_normalized, s3_key, duration_ms, audio_type')
    .eq('language', knownLang3)
    .in('audio_type', ['instruction', 'encouragement'])
    .order('audio_type')  // encouragement before instruction alphabetically
    .order('created_at');

  if (encError) {
    console.warn('Could not load encouragements from shared_audio:', encError.message);
  } else if (sharedAudioEnc) {
    // Transform shared_audio records to encouragement format
    // audio_type 'instruction' = ordered (48), 'encouragement' = pooled (26)
    let orderedPosition = 0;
    encouragements = sharedAudioEnc.map(row => {
      const isOrdered = row.audio_type === 'instruction';
      // Extract UUID from s3_key (e.g., 'mastered/ABC123-DEF456.mp3' -> 'ABC123-DEF456')
      const uuidMatch = row.s3_key?.match(/mastered\/(.+)\.mp3/);

      return {
        text: row.text,
        pool_type: isOrdered ? 'ordered' : 'pooled',
        position: isOrdered ? ++orderedPosition : null,
        lang: knownLang3,
        audio_uuid: uuidMatch ? uuidMatch[1] : null,
        duration_ms: row.duration_ms
      };
    });

    const ordered = encouragements.filter(e => e.pool_type === 'ordered').length;
    const pooled = encouragements.filter(e => e.pool_type === 'pooled').length;
    console.log(`  Loaded ${encouragements.length} encouragements from shared_audio (${ordered} ordered, ${pooled} pooled)`);
  }

  // Get welcome/introduction audio from course_audio
  let welcomeAudio = null;
  const { data: welcomeData, error: welcomeError } = await supabase
    .from('course_audio')
    .select('s3_key, duration_ms, text')
    .eq('course_code', courseCode)
    .eq('role', 'welcome')
    .single();

  if (welcomeError) {
    console.warn(`  Warning: Could not load welcome audio: ${welcomeError.message}`);
  } else if (welcomeData) {
    // Extract UUID from s3_key (e.g., 'mastered/ABC123-DEF456.mp3' -> 'ABC123-DEF456')
    const s3KeyMatch = welcomeData.s3_key?.match(/mastered\/(.+)\.mp3/);
    const audioUuid = s3KeyMatch ? s3KeyMatch[1] : null;

    welcomeAudio = {
      id: audioUuid || 'welcome-audio-not-found',
      cadence: 'natural',
      role: 'presentation',
      duration: (welcomeData.duration_ms || 0) / 1000  // Convert ms to seconds
    };
    console.log(`  Loaded welcome audio: ${audioUuid} (${welcomeAudio.duration.toFixed(2)}s)`);
  }

  // Build samples dictionary
  const samples = {};
  const sampleStats = {
    source: 0,
    target1: 0,
    target2: 0,
    presentation: 0
  };

  // ==========================================================================
  // PHASE 1: Collect all texts that need samples
  // ==========================================================================
  // We collect all texts first, then lookup from course_audio to avoid N+1 queries
  const textsToProcess = new Map(); // key = text, value = { roles: Set, lang3, voiceId }

  function collectText(text, lang3, role, voiceId) {
    if (!text || text.trim() === '') return;

    if (!textsToProcess.has(text)) {
      textsToProcess.set(text, { roles: new Set(), lang3, voiceId });
    }
    textsToProcess.get(text).roles.add(role);
  }

  function collectPairTexts(knownText, targetText) {
    collectText(knownText, knownLang3, 'source', voiceAssignments.source);
    collectText(targetText, targetLang3, 'target1', voiceAssignments.target1);
    collectText(targetText, targetLang3, 'target2', voiceAssignments.target2);
  }

  // Build manifest seeds
  const manifestSeeds = [];
  let totalIntroItems = 0;
  let totalNodes = 0;

  for (const seed of seeds) {
    // Get LEGOs for this seed
    const seedLegos = legosBySeed[seed.seed_number] || [];

    // Filter LEGOs to only new ones if requested
    const filteredLegos = onlyNewLegos
      ? seedLegos.filter(l => l.is_new === true)
      : seedLegos;

    // Skip seeds with no LEGOs to include
    if (filteredLegos.length === 0) continue;

    // Build introduction_items for LEGOs
    const introductionItems = [];

    for (const lego of filteredLegos) {
      const legoNodeId = generateNodeId(
        seed.seed_number,
        lego.lego_index,
        lego.known_text,
        lego.target_text
      );

      // Build nodes array from components and practice phrases
      const nodes = [];

      // Add components first (for M-type LEGOs)
      // Components are stored as JSONB array: [{"known": "I", "target": "yo"}, ...]
      if (lego.type === 'M' && lego.components) {
        const components = Array.isArray(lego.components) ? lego.components : [];
        for (const comp of components) {
          const compNodeId = generateNodeId(
            seed.seed_number,
            lego.lego_index,
            comp.known,
            comp.target
          );
          nodes.push(createNode(compNodeId, comp.known, comp.target));
          collectPairTexts(comp.known, comp.target);
          totalNodes++;
        }
      }

      // Add practice phrases
      const legoKey = `${seed.seed_number}-${lego.lego_index}`;
      const legoPhrases = phrasesByLego[legoKey] || [];

      for (const phrase of legoPhrases) {
        const phraseNodeId = generateNodeId(
          seed.seed_number,
          lego.lego_index,
          phrase.known_text,
          phrase.target_text
        );
        nodes.push(createNode(phraseNodeId, phrase.known_text, phrase.target_text));
        collectPairTexts(phrase.known_text, phrase.target_text);
        totalNodes++;
      }

      // Generate presentation text
      const presentationText = generatePresentation(
        lego.known_text,
        lego.target_text,
        targetName
      );

      // Collect samples for this LEGO
      collectPairTexts(lego.known_text, lego.target_text);
      collectText(presentationText, knownLang3, 'presentation', voiceAssignments.presentation);

      // Create introduction_item
      introductionItems.push({
        id: legoNodeId,
        node: createNode(legoNodeId, lego.known_text, lego.target_text),
        nodes: nodes,
        presentation: presentationText
      });

      totalIntroItems++;
    }

    // Create seed entry
    const seedNodeId = generateNodeId(
      seed.seed_number,
      0,
      seed.known_text,
      seed.target_text
    );
    collectPairTexts(seed.known_text, seed.target_text);

    manifestSeeds.push({
      id: seedNodeId,
      seed_sentence: {
        canonical: seed.known_text  // No separate canonical field in new schema
      },
      node: createNode(seedNodeId, seed.known_text, seed.target_text),
      introduction_items: introductionItems
    });
  }

  // Build encouragement arrays and add samples from shared_audio
  const pooledEncouragements = [];
  const orderedEncouragements = [];

  if (encouragements) {
    for (const enc of encouragements) {
      const encEntry = { text: enc.text, id: enc.audio_uuid || enc.id };

      if (enc.pool_type === 'pooled') {
        pooledEncouragements.push(encEntry);
      } else {
        orderedEncouragements.push(encEntry);
      }

      // Add sample directly if we have audio from shared_audio
      if (enc.audio_uuid) {
        if (!samples[enc.text]) {
          samples[enc.text] = [];
        }
        samples[enc.text].push({
          id: enc.audio_uuid,
          cadence: 'natural',
          role: 'presentation',
          duration: (enc.duration_ms || 0) / 1000  // Convert ms to seconds
        });
        sampleStats.presentation++;
      } else {
        // Fall back to legacy audio lookup only if no shared_audio found
        collectText(enc.text, knownLang3, 'presentation', voiceAssignments.presentation);
      }
    }
  }

  // ==========================================================================
  // PHASE 2: Audio lookup (v13 course_audio table)
  // ==========================================================================
  // All audio is now in the course_audio table - no legacy lookups needed

  // ==========================================================================
  // PHASE 3: Build samples dictionary from collected texts
  // ==========================================================================
  // Use courseAudioMap (v13 flat schema) for all audio lookups
  const courseAudioMap = v12AudioMap; // Alias for clarity

  for (const [text, info] of textsToProcess) {
    if (!samples[text]) {
      samples[text] = [];
    }

    for (const role of info.roles) {
      // Check for duplicate
      if (samples[text].find(s => s.role === role)) continue;

      let sampleId = null;
      let duration = 0;
      const cadence = (role === 'target1' || role === 'target2') ? 'slow' : 'natural';

      // Look up audio from course_audio table (v13 schema)
      if (courseAudioMap && courseAudioMap.has(text)) {
        const audioInfo = courseAudioMap.get(text)[role];
        if (audioInfo) {
          sampleId = audioInfo.id;
          duration = audioInfo.duration_ms || 0;
        }
      }

      // Add sample if found in database
      if (sampleId) {
        samples[text].push({
          id: sampleId,
          cadence: cadence,
          role: role,
          duration: duration
        });
        sampleStats[role] = (sampleStats[role] || 0) + 1;
      }
    }
  }

  // Build final manifest
  const manifest = {
    id: manifestId,
    known: knownLang,
    target: targetLang,
    version: '12.0.0',  // Database-generated version
    status: 'alpha',
    introduction: welcomeAudio || {
      id: 'introduction-placeholder',
      cadence: 'natural',
      role: 'presentation',
      duration: 0
    },
    slices: [{
      id: `slice-${courseCode}-main`,
      version: '12.0.0',
      seeds: manifestSeeds,
      pooledEncouragements: pooledEncouragements,
      orderedEncouragements: orderedEncouragements,
      samples: samples
    }]
  };

  console.log(`Generated manifest:`);
  console.log(`  Seeds: ${manifestSeeds.length}`);
  console.log(`  Introduction items: ${totalIntroItems}`);
  console.log(`  Practice nodes: ${totalNodes}`);
  console.log(`  Unique samples: ${Object.keys(samples).length}`);
  console.log(`  Sample counts:`, sampleStats);

  return manifest;
}

/**
 * Validate manifest completeness
 * Checks that all samples have audio in Supabase
 */
async function validateManifest(manifest) {
  const samples = manifest.slices[0].samples;
  const missing = [];

  for (const [text, sampleList] of Object.entries(samples)) {
    for (const sample of sampleList) {
      if (!sample.id) {
        missing.push({ text, role: sample.role, reason: 'no_uuid' });
        continue;
      }

      // Check if audio exists in course_audio (v13 schema)
      const { data } = await supabase
        .from('course_audio')
        .select('id')
        .eq('id', sample.id)
        .single();

      if (!data) {
        missing.push({ text: text.substring(0, 50), role: sample.role, uuid: sample.id, reason: 'not_in_db' });
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing: missing,
    totalSamples: Object.keys(samples).length,
    missingCount: missing.length
  };
}

module.exports = {
  generateManifest,
  validateManifest
};
