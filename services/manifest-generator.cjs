/**
 * Manifest Generator Service
 *
 * Generates course manifests on-the-fly from database.
 * Replaces static JSON file compilation with dynamic generation.
 *
 * The manifest format matches legacy app expectations for backwards compatibility.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { generateSampleId, normalizeText } = require('./uuid-v11.cjs');

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
  return `The ${langName} for '${knownText.toLowerCase()}', is: ... '${targetText}' ... '${targetText}'`;
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

  // Get course metadata
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
  const knownLang = LANG_CODES[knownLang3]?.short || knownLang3;
  const targetLang = LANG_CODES[targetLang3]?.short || targetLang3;
  const targetName = LANG_CODES[targetLang3]?.name || targetLang3;

  // Get voice assignments
  const voiceAssignments = {
    source: course.known_voice,
    target1: course.target_voice_1,
    target2: course.target_voice_2,
    presentation: course.presentation_voice || course.known_voice  // Default to known_voice if not set
  };

  // Get all seeds with LEGOs
  const { data: seeds, error: seedsError } = await supabase
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
    .order('seed_number');

  if (seedsError) {
    throw seedsError;
  }

  // Get all LEGOs for this course
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', courseCode)
    .eq('status', 'released')
    .order('seed_number')
    .order('lego_index');

  if (legosError) {
    throw legosError;
  }

  // Get all practice phrases for this course
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', courseCode)
    .eq('status', 'released')
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (phrasesError) {
    throw phrasesError;
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

  // Get encouragements
  const { data: encouragements, error: encError } = await supabase
    .from('encouragements')
    .select('*')
    .eq('lang', knownLang3)
    .order('position');

  if (encError) {
    console.warn('Could not load encouragements:', encError.message);
  }

  // Build samples dictionary
  const samples = {};
  const sampleStats = {
    source: 0,
    target1: 0,
    target2: 0,
    presentation: 0
  };

  /**
   * Add a sample entry to the dictionary
   */
  async function addSample(text, lang3, role, voiceId) {
    if (!text || text.trim() === '' || !voiceId) return;

    const cadence = (role === 'target1' || role === 'target2') ? 'slow' : 'natural';
    const sampleId = generateSampleId(voiceId, text, lang3, role, cadence);

    if (!samples[text]) {
      samples[text] = [];
    }

    // Check for duplicate role
    const existing = samples[text].find(s => s.role === role);
    if (!existing) {
      // Look up duration from audio_samples table
      const { data: audioData } = await supabase
        .from('audio_samples')
        .select('duration_ms')
        .eq('uuid', sampleId)
        .single();

      samples[text].push({
        id: sampleId,
        cadence: cadence,
        role: role,
        duration: audioData?.duration_ms || 0
      });
      sampleStats[role] = (sampleStats[role] || 0) + 1;
    }
  }

  /**
   * Add samples for a known/target pair
   */
  async function addPairSamples(knownText, targetText) {
    await addSample(knownText, knownLang3, 'source', voiceAssignments.source);
    await addSample(targetText, targetLang3, 'target1', voiceAssignments.target1);
    await addSample(targetText, targetLang3, 'target2', voiceAssignments.target2);
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
          await addPairSamples(comp.known, comp.target);
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
        await addPairSamples(phrase.known_text, phrase.target_text);
        totalNodes++;
      }

      // Generate presentation text
      const presentationText = generatePresentation(
        lego.known_text,
        lego.target_text,
        targetName
      );

      // Add samples for this LEGO
      await addPairSamples(lego.known_text, lego.target_text);
      await addSample(presentationText, knownLang3, 'presentation', voiceAssignments.presentation);

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
    await addPairSamples(seed.known_text, seed.target_text);

    manifestSeeds.push({
      id: seedNodeId,
      seed_sentence: {
        canonical: seed.known_text  // No separate canonical field in new schema
      },
      node: createNode(seedNodeId, seed.known_text, seed.target_text),
      introduction_items: introductionItems
    });
  }

  // Build encouragement arrays
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

      // Add encouragement sample
      await addSample(enc.text, knownLang3, 'presentation', voiceAssignments.presentation);
    }
  }

  // Build final manifest
  const manifest = {
    id: `${knownLang}-${targetLang}`,
    known: knownLang,
    target: targetLang,
    version: '12.0.0',  // Database-generated version
    status: 'alpha',
    introduction: {
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

      // Check if audio exists
      const { data } = await supabase
        .from('audio_samples')
        .select('uuid')
        .eq('uuid', sample.id)
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
