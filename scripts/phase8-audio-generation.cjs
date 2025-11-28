/**
 * Phase 8: Audio Generation Orchestrator
 *
 * Main pipeline for generating, processing, and uploading audio samples.
 * Integrates Azure TTS, ElevenLabs, audio processing, and S3 services.
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const azureTTS = require('../services/azure-tts-service.cjs');
const elevenlabsService = require('../services/elevenlabs-service.cjs');
const audioProcessor = require('../services/audio-processor.cjs');
const marService = require('../services/mar-service.cjs');
const s3Service = require('../services/s3-service.cjs');
const uuidService = require('../services/uuid-service.cjs');
const cadenceService = require('../services/cadence-service.cjs');
const planner = require('../services/audio-generation-planner.cjs');
const voiceDiscovery = require('../services/voice-discovery-service.cjs');
const qcService = require('../services/quality-control-service.cjs');
const errorHandler = require('../services/error-handler-service.cjs');
const encouragementService = require('../services/encouragement-service.cjs');
const welcomeService = require('../services/welcome-service.cjs');
const preflightCheck = require('../services/preflight-check-service.cjs');
const presentationService = require('../services/presentation-service.cjs');
const { runAudioGenPreflight } = require('./audio-gen-preflight.cjs');
const { createQCReviewDirectory } = require('./create-qc-review.cjs');
const structureValidator = require('../tools/validators/manifest-structure-validator.cjs');

// Configuration
const VFS_BASE = path.join(__dirname, '../vfs');
const TEMP_BASE = path.join(__dirname, '../temp');
const AUDIO_TEMP_DIR = path.join(__dirname, '../temp/audio'); // Legacy: shared worker dirs
const VOICES_REGISTRY = path.join(__dirname, '../vfs/canonical/voices.json');

/**
 * Get the directory for audio files based on course/role/cadence
 * New hierarchical structure: temp/{course}/{role}/{cadence}/
 *
 * @param {string} courseCode - Course identifier (e.g., 'cmn_for_eng')
 * @param {string} role - Sample role (e.g., 'source', 'target1', 'presentation')
 * @param {string} cadence - Audio cadence (e.g., 'natural', 'slow')
 * @returns {string} Full path to the directory
 */
function getSampleDir(courseCode, role, cadence = 'natural') {
  return path.join(TEMP_BASE, courseCode, role, cadence);
}

/**
 * Get all existing sample UUIDs for a course by scanning its hierarchical directories
 *
 * @param {string} courseCode - Course identifier
 * @returns {Promise<Set<string>>} Set of existing UUIDs
 */
async function getExistingSampleUUIDs(courseCode) {
  const existingUUIDs = new Set();
  const courseDir = path.join(TEMP_BASE, courseCode);

  if (!await fs.pathExists(courseDir)) {
    return existingUUIDs;
  }

  // Scan all role/cadence subdirectories
  const roles = await fs.readdir(courseDir);
  for (const role of roles) {
    const roleDir = path.join(courseDir, role);
    const stat = await fs.stat(roleDir);
    if (!stat.isDirectory()) continue;

    const cadences = await fs.readdir(roleDir);
    for (const cadence of cadences) {
      const cadenceDir = path.join(roleDir, cadence);
      const cadenceStat = await fs.stat(cadenceDir);
      if (!cadenceStat.isDirectory()) continue;

      const files = await fs.readdir(cadenceDir);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          existingUUIDs.add(file.replace('.mp3', ''));
        }
      }
    }
  }

  return existingUUIDs;
}

/**
 * Get the output path for a sample file
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} sample - Sample object with role, cadence, uuid
 * @returns {string} Full path to the output file
 */
function getSampleOutputPath(courseCode, sample) {
  const cadence = sample.cadence || 'natural';
  return path.join(getSampleDir(courseCode, sample.role, cadence), `${sample.uuid}.mp3`);
}

/**
 * Get all existing sample UUIDs by scanning both hierarchical and legacy structures
 * This provides backward compatibility during migration
 *
 * @returns {Promise<Set<string>>} Set of existing UUIDs
 */
async function getAllExistingSampleUUIDs() {
  const existingUUIDs = new Set();
  const COURSES = ['cmn_for_eng', 'spa_for_eng'];

  // Scan hierarchical structure for all courses
  for (const course of COURSES) {
    const courseUUIDs = await getExistingSampleUUIDs(course);
    for (const uuid of courseUUIDs) {
      existingUUIDs.add(uuid);
    }
  }

  // Also check legacy flat structure (temp/audio/)
  if (await fs.pathExists(AUDIO_TEMP_DIR)) {
    try {
      const files = await fs.readdir(AUDIO_TEMP_DIR);
      for (const f of files) {
        if (f.endsWith('.mp3') && /^[0-9A-F]/.test(f)) {
          existingUUIDs.add(f.replace('.mp3', ''));
        }
      }
    } catch (err) {
      // Ignore errors reading legacy directory
    }
  }

  return existingUUIDs;
}

/**
 * Extract language codes from course code
 * Format: <target>_for_<source>_<seeds>
 * Example: deu_for_eng_30seeds → { target: 'deu', source: 'eng' }
 *
 * @param {string} courseCode - Course code
 * @returns {Object} { target, source }
 */
function getLanguagesFromCourseCode(courseCode) {
  const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_/);

  if (!match) {
    throw new Error(`Invalid course code format: ${courseCode}. Expected format: <lang>_for_<lang>_<seeds>`);
  }

  return {
    target: match[1],
    source: match[2]
  };
}

/**
 * Load course manifest
 */
async function loadCourseManifest(courseCode) {
  const manifestPath = path.join(VFS_BASE, 'courses', courseCode, 'course_manifest.json');

  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Course manifest not found: ${manifestPath}`);
  }

  return await fs.readJson(manifestPath);
}

/**
 * Save course manifest
 */
async function saveCourseManifest(courseCode, manifest) {
  const manifestPath = path.join(VFS_BASE, 'courses', courseCode, 'course_manifest.json');
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}

/**
 * Load voice registry
 */
async function loadVoiceRegistry() {
  return await fs.readJson(VOICES_REGISTRY);
}

/**
 * Save voice registry
 */
async function saveVoiceRegistry(registry) {
  await fs.writeJson(VOICES_REGISTRY, registry, { spaces: 2 });
}

/**
 * Clean stale worker files from previous runs
 * These are JSON metadata files (not audio!) that can become stale if
 * manifest UUIDs change between runs. Only deletes JSON files, never audio.
 */
async function cleanStaleWorkerFiles() {
  const workerInputDir = path.join(AUDIO_TEMP_DIR, 'worker-input');
  const workerOutputDir = path.join(AUDIO_TEMP_DIR, 'worker-output');

  let cleaned = 0;

  for (const dir of [workerInputDir, workerOutputDir]) {
    if (await fs.pathExists(dir)) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.remove(path.join(dir, file));
          cleaned++;
        }
      }
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} stale worker metadata files`);
  }
}

/**
 * Load voice registry and get assignments for a course
 * Now supports language-pair-based assignments (e.g., "en-es" for all Spanish-for-English courses)
 */
async function getVoiceAssignments(courseCode) {
  const registry = await loadVoiceRegistry();
  const manifest = await loadCourseManifest(courseCode);

  // Extract language pair from manifest (known-target format, e.g., "en-es")
  const languagePair = `${manifest.known}-${manifest.target}`;
  const reversePair = `${manifest.target}-${manifest.known}`;

  // 1. Try language pair assignments first (new preferred method)
  if (registry.language_pair_assignments && registry.language_pair_assignments[languagePair]) {
    console.log(`✓ Using voice assignments for language pair: ${languagePair}`);
    return registry.language_pair_assignments[languagePair];
  }

  // 2. Check if reverse pair exists (e.g., "es-en" when we need "en-es")
  if (registry.language_pair_assignments && registry.language_pair_assignments[reversePair]) {
    console.log(`⚠️  Language pair ${languagePair} not found.`);
    console.log(`   Found reverse pair: ${reversePair}`);
    console.log(`   Note: Using the same voices for reversed language pairs usually works,`);
    console.log(`   but you may want to configure specific voices for ${languagePair}.`);
    console.log(`   Using ${reversePair} voices for now.\n`);
    return registry.language_pair_assignments[reversePair];
  }

  // 3. Fall back to course-specific assignments (legacy/backward compatibility)
  if (registry.course_assignments && registry.course_assignments[courseCode]) {
    console.log(`✓ Using course-specific voice assignments for: ${courseCode}`);
    return registry.course_assignments[courseCode];
  }

  // No assignments found - error and instruct user to configure voices first
  throw new Error(
    `No voice assignments found for course: ${courseCode}\n` +
    `Language pair: ${languagePair}\n\n` +
    `You need to configure voices before running audio generation.\n\n` +
    `📖 See: docs/VOICE_SELECTION_GUIDE.md for detailed instructions\n\n` +
    `Quick start: Ask Claude Code to help you discover and select voices:\n` +
    `  "Help me select voices for ${courseCode}"`
  );
}

/**
 * Exported function for Claude Code to help discover and assign voices
 * This is NOT called automatically - user requests Claude Code's help
 */
async function discoverAndAssignVoices(courseCode, targetLanguage, knownLanguage = 'eng') {
  const registry = await loadVoiceRegistry();

  console.log(`\nDiscovering voices for ${targetLanguage} (target language)...`);

  // Discover available voices from Azure
  const availableVoices = await voiceDiscovery.discoverAzureVoices(targetLanguage);
  console.log(`Found ${availableVoices.length} voices\n`);

  if (availableVoices.length === 0) {
    throw new Error(`No Azure voices found for language: ${targetLanguage}`);
  }

  // Get recommendations (but don't auto-select)
  const recommended = voiceDiscovery.selectBestVoices(availableVoices, 2);

  console.log('TOP RECOMMENDED VOICES:');
  console.log('-'.repeat(40));
  console.log('NOTE: Priority scores are based on technical features only.');
  console.log('      Generate samples and LISTEN before committing!\n');
  recommended.forEach((voice, i) => {
    const reason = voiceDiscovery.getRecommendationReason(voice, i);
    console.log(`${i + 1}. ${voice.displayName} (${voice.id})`);
    console.log(`   Gender: ${voice.gender}`);
    console.log(`   Locale: ${voice.locale}`);
    console.log(`   Priority Score: ${voice.quality} (not quality - see docs)`);
    console.log(`   Reason: ${reason}`);
    console.log('');
  });

  // Show all available voices
  console.log('ALL AVAILABLE VOICES:');
  console.log('-'.repeat(40));
  availableVoices.forEach((voice, i) => {
    const neuralTag = voice.voiceType === 'Neural' ? '[Neural]' : '[Standard]';
    console.log(`${i + 1}. ${voice.displayName} (${voice.id}) - ${voice.gender} - ${neuralTag} - Priority: ${voice.quality}`);
  });

  console.log('\n\n⚠️  IMPORTANT: Generate sample clips and LISTEN before committing!');
  console.log('Priority scores are technical rankings, not quality judgments.');
  console.log('Only your ears can determine if a voice sounds natural.\n');
  console.log('Claude Code should now help you:');
  console.log('1. Generate sample clips for top voices');
  console.log('2. Listen to samples and choose based on naturalness');
  console.log('3. Configure source and presentation voices');
  console.log('4. Configure encouragement voice (defaults to presentation voice)');
  console.log('5. Check if encouragements already exist in MAR');
  console.log('6. Update voices.json with your choices\n');

  console.log('ENCOURAGEMENT VOICE:');
  console.log('-'.repeat(40));
  if (knownLanguage === 'eng') {
    console.log('Default for English: Aran (ElevenLabs cloned voice)');
    console.log('This voice is preferred for its mature, calm delivery.\n');
    console.log('Claude Code will ask you to confirm if no course-specific override exists.\n');
  } else {
    console.log(`Default for ${knownLanguage}: Use presentation voice`);
    console.log('Encouragements will use the same voice as presentations.\n');
  }

  return { availableVoices, recommended };
}

/**
 * Get voice details from registry
 */
async function getVoiceDetails(voiceId) {
  const registry = await loadVoiceRegistry();

  if (!registry.voices[voiceId]) {
    throw new Error(`Voice not found in registry: ${voiceId}`);
  }

  return registry.voices[voiceId];
}

/**
 * Collect all sample variants from course manifest
 */
function collectSampleVariants(manifest) {
  const variants = [];
  const samples = manifest.slices?.[0]?.samples || {};

  for (const [text, variantList] of Object.entries(samples)) {
    for (const variant of variantList) {
      variants.push({
        text,
        role: variant.role,
        cadence: variant.cadence,
        id: variant.id || '',
        duration: variant.duration || 0
      });
    }
  }

  return variants;
}

/**
 * Re-assign UUIDs from MAR to all manifest samples
 * This ensures both "Hablar" and "hablar" get the same UUID from the MAR
 *
 * @param {Object} manifest - Course manifest
 * @param {Object} voiceAssignments - Voice assignments by role
 * @param {Array} roles - Roles to re-assign (default: Phase A roles)
 * @returns {Promise<Object>} Assignment stats
 */
async function reassignUUIDsFromMAR(manifest, voiceAssignments, roles = ['target1', 'target2', 'source']) {
  const samples = manifest.slices?.[0]?.samples || {};
  const targetLang = manifest.target;
  const knownLang = manifest.known;

  let assigned = 0;
  let missing = 0;

  for (const [text, variantList] of Object.entries(samples)) {
    for (const variant of variantList) {
      // Only process specified roles
      if (!roles.includes(variant.role)) {
        continue;
      }

      const voiceId = voiceAssignments[variant.role];
      if (!voiceId) {
        console.warn(`No voice assigned for role: ${variant.role}`);
        continue;
      }

      // Determine language for this role
      const language = ['target1', 'target2'].includes(variant.role) ? targetLang : knownLang;

      // Check both permanent and temp MAR (uses normalized text matching)
      const existing = await marService.findExistingSampleInBothMARs(
        voiceId,
        text,
        variant.role,
        language,
        variant.cadence
      );

      if (existing) {
        variant.id = existing.uuid;
        variant.duration = existing.duration;
        assigned++;
      } else {
        missing++;
        console.warn(`Missing sample in MAR: [${variant.role}/${variant.cadence}] "${text.substring(0, 60)}..."`);
      }
    }
  }

  return { assigned, missing };
}

/**
 * Deduplicate Phase A samples (target1/target2/source) based on normalized text
 * Presentations are always unique, so they are not deduplicated
 *
 * Uses same normalization as MAR: lowercase + remove trailing periods
 * This prevents generating "Hablar" and "hablar" as separate samples
 *
 * @param {Array} samples - Samples to generate
 * @returns {Array} Deduplicated samples
 */
function deduplicatePhaseASamples(samples) {
  const PHASE_A_ROLES = ['target1', 'target2', 'source'];
  const seen = new Set();
  const deduplicated = [];

  for (const sample of samples) {
    // Skip deduplication for presentations (always unique)
    if (!PHASE_A_ROLES.includes(sample.role)) {
      deduplicated.push(sample);
      continue;
    }

    // Normalize text same way as MAR (from mar-service.cjs)
    const normalizedText = sample.text
      .toLowerCase()
      .trim()
      .replace(/\.+$/, ''); // Remove only trailing periods (keep !, ?, etc.)

    // Create unique key: normalized_text|role|cadence
    const key = `${normalizedText}|${sample.role}|${sample.cadence}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(sample);
    }
    // else: duplicate detected, skip it
  }

  return deduplicated;
}

/**
 * Match samples against MAR and identify missing ones
 * Includes encouragements in the analysis
 * Now checks both permanent and temporary MARs
 * OPTIMIZED: Uses in-memory MAR index for O(1) lookups
 */
async function analyzeRequiredGeneration(manifest, courseCode, voiceAssignments) {
  const variants = collectSampleVariants(manifest);
  const toGenerate = [];
  const matched = [];

  // Get course language info (v2.0.0 format has target/known at top level)
  const targetLang = manifest.target;
  const knownLang = manifest.known;

  // PERFORMANCE OPTIMIZATION: Build MAR index once before loop
  console.log(`\nAnalyzing required generation for ${variants.length} samples...`);
  const uniqueVoiceIds = [...new Set(Object.values(voiceAssignments))];
  const marIndex = await marService.loadMARIndex(uniqueVoiceIds);

  // Check regular samples
  for (const variant of variants) {
    const voiceId = voiceAssignments[variant.role];

    if (!voiceId) {
      console.warn(`No voice assigned for role: ${variant.role}`);
      continue;
    }

    // Determine language for this role
    const language = ['target1', 'target2'].includes(variant.role) ? targetLang : knownLang;

    // Check MAR index (O(1) lookup instead of file I/O)
    const existing = marService.findSampleInIndex(
      marIndex,
      voiceId,
      variant.text,
      variant.role,
      language,
      variant.cadence
    );

    if (existing) {
      // Found existing sample
      matched.push({
        text: variant.text,
        role: variant.role,
        cadence: variant.cadence,
        uuid: existing.uuid,
        duration: existing.sample.duration,
        voiceId
      });

      // Update manifest with existing UUID and duration
      const samples = manifest.slices?.[0]?.samples || {};
      const variantInManifest = samples[variant.text]?.find(
        v => v.role === variant.role && v.cadence === variant.cadence
      );
      if (variantInManifest) {
        variantInManifest.id = existing.uuid;
        variantInManifest.duration = existing.sample.duration;
      }
    } else {
      // Need to generate
      // For presentations: use existing manifest ID if available (text may have changed after ID was assigned)
      // For other roles: generate deterministic UUID from current text
      let sampleUUID;
      if (variant.role === 'presentation' && variant.id) {
        sampleUUID = variant.id;
      } else {
        sampleUUID = uuidService.generateSampleUUID(
          variant.text,
          language,
          variant.role,
          variant.cadence
        );
      }

      toGenerate.push({
        text: variant.text,
        role: variant.role,
        cadence: variant.cadence,
        uuid: sampleUUID,
        voiceId,
        language
      });

      // Update manifest with UUID (duration will be set after generation)
      const samples = manifest.slices?.[0]?.samples || {};
      const variantInManifest = samples[variant.text]?.find(
        v => v.role === variant.role && v.cadence === variant.cadence
      );
      if (variantInManifest) {
        variantInManifest.id = sampleUUID;
      }
    }
  }

  // Deduplicate toGenerate for Phase A roles (target1/target2/source)
  // Presentations are always unique, so skip deduplication for them
  // This prevents generating "Hablar" and "hablar" as separate samples
  const deduplicatedToGenerate = deduplicatePhaseASamples(toGenerate);

  if (deduplicatedToGenerate.length < toGenerate.length) {
    const duplicatesRemoved = toGenerate.length - deduplicatedToGenerate.length;
    console.log(`Removed ${duplicatesRemoved} duplicate samples (capitalization/punctuation variants)`);
  }

  // Note: Encouragements are NOT checked here
  // They are checked/generated at the very end (after Phase A + B)
  // This keeps the flow simpler and allows them to be added to manifest
  // right before the final S3 check

  return { toGenerate: deduplicatedToGenerate, matched };
}

/**
 * Generate audio using appropriate TTS service
 */
async function generateAudioFile(sample, voiceDetails, outputPath) {
  const { text, role, voiceId, cadence } = sample;
  const { provider, provider_id, processing } = voiceDetails;

  // Check if TTS is blocked at runtime (safety net)
  if (global.BLOCK_TTS) {
    console.error(`\n❌ BLOCKED: TTS generation attempted with --block-tts flag!`);
    console.error(`   Sample: [${role}] "${text.substring(0, 60)}..."`);
    console.error(`   Provider: ${provider}/${provider_id}`);
    console.error(`\nThis indicates unexpected TTS usage. Exiting immediately.`);
    process.exit(1);
  }

  // Get cadence-specific settings
  const cadenceSettings = processing?.cadences?.[cadence] ||
                         processing?.cadences?.natural ||
                         {};

  console.log(`Generating [${role}/${cadence}] ${provider}/${provider_id}: "${text.substring(0, 60)}..."`);

  if (provider === 'azure') {
    // Use cadence-specific Azure speed (set in SSML)
    const speed = cadenceSettings.azure_speed || 1.0;
    await azureTTS.generateAudioWithRetry(text, provider_id, outputPath, speed);

  } else if (provider === 'elevenlabs') {
    const options = {
      model: voiceDetails.model || elevenlabsService.MODELS.FLASH_V2_5,
      stability: voiceDetails.stability || 0.5,
      similarityBoost: voiceDetails.similarity_boost || 0.75,
      language: sample.language,
      enablePriming: voiceDetails.priming === 'enabled'
    };

    await elevenlabsService.generateAudioWithRetry(text, provider_id, outputPath, options);

  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Phase roles mapping
 */
const PHASE_A_ROLES = ['target1', 'target2', 'source'];
const PHASE_B_ROLES = ['presentation'];  // Includes encouragements

/**
 * Split samples by generation phase
 * Note: Encouragements are handled separately at the end, not in Phase A/B
 *
 * @param {Array} samples - All samples to generate
 * @returns {Object} { phaseA: [...], phaseB: [...] }
 */
function splitSamplesByPhase(samples) {
  const phaseA = [];
  const phaseB = [];

  for (const sample of samples) {
    if (PHASE_A_ROLES.includes(sample.role)) {
      phaseA.push(sample);
    } else if (PHASE_B_ROLES.includes(sample.role)) {
      phaseB.push(sample);
    } else {
      console.warn(`Unknown role: ${sample.role}, adding to Phase A`);
      phaseA.push(sample);
    }
  }

  return { phaseA, phaseB };
}

/**
 * Generate all missing audio files
 *
 * @param {Array} toGenerate - Samples to generate
 * @param {string} courseCode - Course identifier for hierarchical paths
 */
async function generateMissingAudio(toGenerate, courseCode) {
  await fs.ensureDir(AUDIO_TEMP_DIR);

  const results = [];
  const MAX_CONCURRENT = 8; // Match Python script's worker count

  // Group by voice to batch efficiently
  const byVoice = {};
  for (const sample of toGenerate) {
    if (!byVoice[sample.voiceId]) {
      byVoice[sample.voiceId] = [];
    }
    byVoice[sample.voiceId].push(sample);
  }

  // Generate by voice with parallelization
  for (const [voiceId, samples] of Object.entries(byVoice)) {
    console.log(`\n=== Generating ${samples.length} samples with ${voiceId} (${MAX_CONCURRENT} concurrent workers) ===\n`);

    const voiceDetails = await getVoiceDetails(voiceId);

    let completed = 0;
    const total = samples.length;

    // Process samples in batches of MAX_CONCURRENT
    for (let i = 0; i < samples.length; i += MAX_CONCURRENT) {
      const batch = samples.slice(i, i + MAX_CONCURRENT);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (sample) => {
          // Use hierarchical path if courseCode provided, otherwise legacy flat structure
          const outputPath = courseCode
            ? getSampleOutputPath(courseCode, sample)
            : path.join(AUDIO_TEMP_DIR, `${sample.uuid}.mp3`);

          // Ensure output directory exists
          await fs.ensureDir(path.dirname(outputPath));

          // Use error handler for comprehensive error handling
          const result = await errorHandler.executeWithErrorHandling(
            async () => {
              await generateAudioFile(sample, voiceDetails, outputPath);
              return {
                success: true,
                sample,
                outputPath
              };
            },
            {
              maxRetries: 3,
              backoffMs: 1000,
              context: {
                sample: sample.text,
                voice: voiceDetails.provider_id,
                role: sample.role,
                cadence: sample.cadence,
                uuid: sample.uuid
              },
              onError: (error, context, classification) => {
                console.error(`❌ Failed to generate ${sample.uuid} after retries: ${error.message}`);
                return {
                  success: false,
                  sample,
                  error: error.message,
                  errorType: classification.errorType,
                  skipped: classification.skippable
                };
              }
            }
          );

          return result;
        })
      );

      // Collect batch results
      results.push(...batchResults);
      completed += batch.length;

      // Progress update
      const pct = Math.round((completed / total) * 100);
      console.log(`Progress: ${completed}/${total} samples (${pct}%)`);
    }
  }

  return results;
}

/**
 * Recover partial results from failed worker
 * Scans temp directory for generated MP3s that aren't in MAR yet and imports them
 *
 * This handles the Azure SDK per-process limit (~104 samples) by:
 * 1. Finding all MP3 files in temp directory
 * 2. Checking which ones aren't in MAR yet
 * 3. Importing them so next run will skip them
 */
async function recoverPartialResults(inputSamples, tempDir) {
  console.log('\n⚠️  Worker completed without results file - recovering partial results...\n');

  // Get list of all MP3 files in temp directory
  const files = await fs.readdir(tempDir);
  const mp3Files = files.filter(f => f.endsWith('.mp3'));

  console.log(`Found ${mp3Files.length} total MP3 files in temp directory`);

  const recovered = [];

  // For each MP3 file, check if it matches any of our input samples
  for (const filename of mp3Files) {
    const uuid = filename.replace('.mp3', '');
    const filePath = path.join(tempDir, filename);

    // Find the matching sample from input
    const sample = inputSamples.find(s => s.uuid === uuid);

    if (sample) {
      // Check if already in MAR
      const existsInMAR = await marService.getSample(sample.voiceId, uuid);

      if (!existsInMAR) {
        // New file that needs to be imported to temp MAR
        try {
          const duration = await audioProcessor.getAudioDuration(filePath);
          await marService.saveSampleToTempMAR(sample.voiceId, uuid, {
            text: sample.text,
            language: sample.language,
            role: sample.role,
            cadence: sample.cadence,
            duration,
            filename: `${uuid}.mp3`
          });

          recovered.push({
            ...sample,
            success: true,
            outputPath: filePath,
            provider: sample.voiceId.split('_')[0]
          });

          console.log(`✓ Imported to temp MAR: ${sample.voiceId} / ${sample.text.substring(0, 40)}... (${duration.toFixed(2)}s)`);
        } catch (error) {
          console.error(`✗ Failed to import ${uuid}: ${error.message}`);
        }
      }
    }
  }

  console.log(`\n✅ Recovered and imported ${recovered.length} new samples to MAR\n`);

  return recovered;
}

/**
 * Generate all missing audio files using parallel provider workers
 * Spawns separate processes for Azure and ElevenLabs to run in parallel
 * ~50% faster than sequential generation
 * Auto-retries if workers fail partway through (common with Azure SDK)
 *
 * @param {Array} toGenerate - Samples to generate
 * @param {string} courseCode - Course identifier for hierarchical paths
 */
async function generateMissingAudioParallel(toGenerate, courseCode) {
  console.log('\n=== Parallel Provider Generation ===\n');

  await fs.ensureDir(AUDIO_TEMP_DIR);

  // Add outputPath to each sample for hierarchical directory structure
  const samplesWithPaths = toGenerate.map(sample => ({
    ...sample,
    outputPath: getSampleOutputPath(courseCode, sample)
  }));

  // Split samples by provider
  const byProvider = { azure: [], elevenlabs: [] };

  for (const sample of samplesWithPaths) {
    const provider = sample.voiceId.split('_')[0];
    if (byProvider[provider]) {
      byProvider[provider].push(sample);
    } else {
      console.warn(`Unknown provider: ${provider}, skipping sample`);
    }
  }

  console.log(`Azure samples: ${byProvider.azure.length}`);
  console.log(`ElevenLabs samples: ${byProvider.elevenlabs.length}\n`);

  // Prepare input files for workers
  const workerInputDir = path.join(AUDIO_TEMP_DIR, 'worker-input');
  const workerOutputDir = path.join(AUDIO_TEMP_DIR, 'worker-output');
  await fs.ensureDir(workerInputDir);
  await fs.ensureDir(workerOutputDir);

  const workers = [];

  // Spawn Azure worker if needed
  if (byProvider.azure.length > 0) {
    const azureInputFile = path.join(workerInputDir, 'azure-samples.json');
    const azureOutputFile = path.join(workerOutputDir, 'azure-results.json');

    await fs.writeJson(azureInputFile, byProvider.azure, { spaces: 2 });

    workers.push({
      name: 'Azure TTS',
      process: spawn('node', [
        path.join(__dirname, 'phase8-worker-azure.cjs'),
        azureInputFile,
        azureOutputFile,
        AUDIO_TEMP_DIR
      ], { stdio: 'inherit' }),
      outputFile: azureOutputFile
    });
  }

  // Spawn ElevenLabs worker if needed
  if (byProvider.elevenlabs.length > 0) {
    const elevenLabsInputFile = path.join(workerInputDir, 'elevenlabs-samples.json');
    const elevenLabsOutputFile = path.join(workerOutputDir, 'elevenlabs-results.json');

    await fs.writeJson(elevenLabsInputFile, byProvider.elevenlabs, { spaces: 2 });

    workers.push({
      name: 'ElevenLabs',
      process: spawn('node', [
        path.join(__dirname, 'phase8-worker-elevenlabs.cjs'),
        elevenLabsInputFile,
        elevenLabsOutputFile,
        AUDIO_TEMP_DIR
      ], { stdio: 'inherit' }),
      outputFile: elevenLabsOutputFile
    });
  }

  console.log(`Spawned ${workers.length} parallel workers\n`);

  // Wait for all workers to complete
  const workerResults = await Promise.all(
    workers.map(worker =>
      new Promise((resolve, reject) => {
        worker.process.on('close', async (code) => {
          if (code === 0) {
            console.log(`\n[${worker.name}] Worker completed successfully`);
            try {
              const results = await fs.readJson(worker.outputFile);
              resolve(results);
            } catch (err) {
              // Worker exited successfully but didn't write results file
              // This happens with Azure SDK when it hits per-process limits (~104 samples)
              // Recover partial results and import to MAR
              console.warn(`\n⚠️  ${worker.name}: ${err.message}`);

              const inputFile = worker.outputFile.replace('results.json', 'samples.json')
                .replace('worker-output', 'worker-input');

              try {
                const inputSamples = await fs.readJson(inputFile);
                const recovered = await recoverPartialResults(inputSamples, AUDIO_TEMP_DIR);
                console.log(`✅ Recovered ${recovered.length} samples from ${worker.name}\n`);
                resolve(recovered);
              } catch (recoveryErr) {
                reject(new Error(`Failed to recover ${worker.name} partial results: ${recoveryErr.message}`));
              }
            }
          } else {
            // Worker failed - try to recover partial results
            console.warn(`\n⚠️  ${worker.name} exited with code ${code} - attempting to recover partial results\n`);

            const inputFile = worker.outputFile.replace('results.json', 'samples.json')
              .replace('worker-output', 'worker-input');

            try {
              // Try to read whatever results were written
              const partialResults = await fs.readJson(worker.outputFile);
              console.log(`✅ Recovered ${partialResults.length} samples from ${worker.name} results file\n`);
              resolve(partialResults);
            } catch (resultsErr) {
              // No results file - scan temp directory
              try {
                const inputSamples = await fs.readJson(inputFile);
                const recovered = await recoverPartialResults(inputSamples, AUDIO_TEMP_DIR);
                console.log(`✅ Recovered ${recovered.length} samples from ${worker.name} temp directory\n`);
                resolve(recovered);
              } catch (recoveryErr) {
                reject(new Error(`${worker.name} worker failed and recovery failed: ${recoveryErr.message}`));
              }
            }
          }
        });

        worker.process.on('error', (err) => {
          reject(new Error(`${worker.name} worker error: ${err.message}`));
        });
      })
    )
  );

  // Merge results from all workers
  const allResults = workerResults.flat();

  console.log(`\n✅ Parallel generation complete: ${allResults.filter(r => r.success).length}/${allResults.length} samples\n`);

  return allResults;
}

/**
 * Process audio files (normalize + optional time-stretch)
 */
async function processGeneratedAudio(results) {
  console.log('\n=== Processing Audio ===\n');

  const processedDir = path.join(AUDIO_TEMP_DIR, 'processed');
  await fs.ensureDir(processedDir);

  const processConfigs = [];

  for (const result of results) {
    if (!result.success) continue;

    const { sample, outputPath } = result;
    const voiceDetails = await getVoiceDetails(sample.voiceId);

    // Get cadence-specific processing settings
    const cadenceSettings = voiceDetails.processing?.cadences?.[sample.cadence] ||
                           voiceDetails.processing?.cadences?.natural ||
                           {};

    const processedPath = path.join(processedDir, `${sample.uuid}.mp3`);

    processConfigs.push({
      input: outputPath,
      output: processedPath,
      options: {
        normalize: cadenceSettings.normalize !== false, // Default true
        timeStretch: cadenceSettings.time_stretch || 1.0,
        targetLUFS: cadenceSettings.target_lufs || -16.0
      }
    });
  }

  // Process in parallel batches
  const processResults = await audioProcessor.processBatch(
    processConfigs,
    4, // Max 4 concurrent
    (current, total) => {
      console.log(`Processed ${current}/${total} audio files`);
    }
  );

  return processResults;
}

/**
 * Extract durations from processed audio
 */
async function extractDurations(processResults) {
  console.log('\n=== Extracting Durations ===\n');

  const durations = {};

  for (const result of processResults) {
    if (!result.success) continue;

    try {
      const duration = await audioProcessor.getAudioDuration(result.output);
      const uuid = path.basename(result.output, '.mp3');
      durations[uuid] = duration;

      console.log(`${uuid}: ${duration.toFixed(3)}s`);
    } catch (error) {
      console.error(`Failed to extract duration for ${result.output}: ${error.message}`);
    }
  }

  return durations;
}

/**
 * Run QC checkpoint on generated audio BEFORE processing/upload
 *
 * @param {Array} generationResults - Results from generation
 * @param {string} courseCode - Course identifier
 * @param {string} uploadBucket - S3 bucket for report URLs
 * @returns {Object} { flagged: [...], durations: {...} }
 */
async function runQCCheckpoint(generationResults, courseCode, uploadBucket) {
  console.log('\n=== Quality Control Checkpoint ===\n');
  console.log('[DEBUG] runQCCheckpoint called with:');
  console.log(`  - generationResults.length: ${generationResults.length}`);
  console.log(`  - courseCode: ${courseCode}`);
  console.log(`  - uploadBucket: ${uploadBucket}`);

  // Skip duration extraction - durations calculated later in pipeline
  // Set all durations to 0 for now (will be calculated when needed)
  const durations = {};
  for (const result of generationResults) {
    if (!result.success) continue;
    durations[result.uuid] = 0; // Placeholder - calculated later
  }

  console.log(`[DEBUG] Set placeholder durations for ${Object.keys(durations).length} samples`);

  // Flag samples for review
  const flaggedSamples = qcService.flagSamplesForReview(generationResults, durations);

  console.log(`[DEBUG] flagSamplesForReview returned ${flaggedSamples.length} flagged samples`);

  if (flaggedSamples.length === 0) {
    console.log('✓ No quality issues detected\n');
    return { flagged: [], durations };
  }

  console.log(`⚠️  Flagged ${flaggedSamples.length} samples for review\n`);

  // Generate QC report
  const qcReportPath = path.join(VFS_BASE, 'courses', courseCode, 'qc_report_raw.json');
  console.log(`[DEBUG] QC report path: ${qcReportPath}`);
  console.log(`[DEBUG] Directory exists: ${fs.existsSync(path.dirname(qcReportPath))}`);

  const reportResult = qcService.generateQCReport(flaggedSamples, qcReportPath, uploadBucket);
  console.log(`[DEBUG] generateQCReport returned:`, reportResult);
  console.log(`[DEBUG] JSON file exists after generation: ${fs.existsSync(reportResult.jsonPath)}`);
  console.log(`[DEBUG] MD file exists after generation: ${fs.existsSync(reportResult.mdPath)}`);

  const { jsonPath, mdPath } = reportResult;

  // Create QC review directory with audio samples ready to listen to
  try {
    await createQCReviewDirectory(courseCode, qcReportPath, AUDIO_TEMP_DIR);
  } catch (err) {
    console.warn(`⚠️  Could not create QC review directory: ${err.message}`);
  }

  const qcSummary = qcService.getQCSummary(flaggedSamples, generationResults);
  console.log(`QC Summary:`);
  console.log(`  High priority: ${qcSummary.bySeverity.high}`);
  console.log(`  Medium priority: ${qcSummary.bySeverity.medium}`);
  console.log(`  Low priority: ${qcSummary.bySeverity.low}`);
  console.log(`\nReview report: ${mdPath}\n`);

  return { flagged: flaggedSamples, durations };
}

/**
 * Display QC results and next steps for Claude Code workflow
 *
 * @param {Array} flaggedSamples - Flagged samples from QC
 * @param {string} phase - Phase name for display (e.g., "Phase A")
 * @param {string} courseCode - Course code
 */
function displayQCResultsAndNextSteps(flaggedSamples, phase, courseCode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${phase} - QC Checkpoint Complete`);
  console.log(`${'='.repeat(60)}\n`);

  if (flaggedSamples.length > 0) {
    console.log(`⚠️  ${flaggedSamples.length} samples flagged for review`);
    console.log(`\nRECOMMENDED WORKFLOW:`);
    console.log(`1. Ask Claude Code to review the QC report`);
    console.log(`2. Claude Code will highlight flagged samples for you to listen to`);
    console.log(`3. If regeneration needed, Claude Code will regenerate specific UUIDs`);
    console.log(`4. Once approved, Claude Code will launch ${phase === 'Phase A' ? 'Phase B' : 'final steps'}\n`);

    console.log(`NEXT STEP:`);
    console.log(`Ask Claude Code: "Review the ${phase} QC report and help me with any issues"\n`);
  } else {
    console.log(`✓ No quality issues detected\n`);
    console.log(`NEXT STEP:`);
    if (phase === 'Phase A') {
      console.log(`Ready for Phase B. Ask Claude Code to launch presentation generation.\n`);
    } else {
      console.log(`All phases complete!\n`);
    }
  }
}

/**
 * Normalize cadences in manifest based on role defaults
 * target1/target2 → 'slow', source/presentation → 'natural'
 */
function normalizeCadences(manifest) {
  console.log('Normalizing sample cadences based on role...');

  let updated = 0;
  const samples = manifest.slices?.[0]?.samples || {};

  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const expectedCadence = cadenceService.getCadenceForRole(variant.role);

      if (!variant.cadence || variant.cadence !== expectedCadence) {
        const oldCadence = variant.cadence || '(none)';
        variant.cadence = expectedCadence;
        updated++;

        if (updated <= 5) {
          // Show first 5 changes
          console.log(`  ${variant.role}: ${oldCadence} → ${expectedCadence}`);
        }
      }
    }
  }

  if (updated > 5) {
    console.log(`  ... and ${updated - 5} more`);
  }

  console.log(`Updated ${updated} samples to correct cadence\n`);
  return manifest;
}

/**
 * Increment version number (auto-increment patch)
 *
 * @param {string} currentVersion - Current version (e.g., "7.7.0")
 * @returns {string} New version (e.g., "7.7.1")
 */
function incrementVersion(currentVersion) {
  if (!currentVersion) {
    return '1.0.0';
  }

  const parts = currentVersion.split('.');

  if (parts.length !== 3) {
    console.warn(`Invalid version format: ${currentVersion}, defaulting to 1.0.0`);
    return '1.0.0';
  }

  const [major, minor, patch] = parts.map(Number);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    console.warn(`Invalid version numbers in: ${currentVersion}, defaulting to 1.0.0`);
    return '1.0.0';
  }

  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Normalize manifest roles
 * NOTE: No longer needed - encouragements are added directly with role='presentation'
 * Kept as no-op for backward compatibility
 */
function normalizeManifestRoles(manifest) {
  // No-op: Encouragements are now added directly with role='presentation'
  return manifest;
}

/**
 * Sync canonical resources from S3/LFS
 * Ensures we have the latest encouragements and welcomes before checking
 */
async function syncCanonicalFromS3() {
  console.log('\n=== Syncing Canonical Resources from S3 ===\n');

  const canonicalDir = path.join(__dirname, '../public/vfs/canonical');
  const s3Path = 's3://popty-bach-lfs/canonical/';

  try {
    const { execSync } = require('child_process');
    execSync(`aws s3 sync ${s3Path} ${canonicalDir} --quiet`, {
      stdio: 'pipe',
      timeout: 60000 // 1 minute timeout
    });
    console.log('✓ Synced canonical resources from S3\n');
    return true;
  } catch (error) {
    console.warn(`⚠️  Warning: Could not sync canonical from S3: ${error.message}`);
    console.warn('   Continuing with local canonical resources...\n');
    return false;
  }
}

/**
 * Find duplicate seeds (by canonical or known/target text)
 * Copied from validate-and-fix-samples.cjs for final validation
 */
function findDuplicateSeeds(manifest) {
  const slice = manifest.slices[0];
  const seeds = slice.seeds || [];

  const duplicates = [];
  const seedsByCanonical = {};
  const seedsByText = {};

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const canonical = seed.seed_sentence?.canonical;
    const knownText = seed.node?.known?.text;
    const targetText = seed.node?.target?.text;

    // Check canonical duplicates
    if (canonical) {
      if (seedsByCanonical[canonical]) {
        duplicates.push({
          type: 'canonical',
          original: seedsByCanonical[canonical],
          duplicate: seed,
          text: canonical
        });
      } else {
        seedsByCanonical[canonical] = seed;
      }
    }

    // Check known/target duplicates
    if (knownText && targetText) {
      const textKey = `${knownText}|${targetText}`;
      if (seedsByText[textKey]) {
        const alreadyReported = duplicates.some(d =>
          d.original.id === seedsByText[textKey].id && d.duplicate.id === seed.id
        );
        if (!alreadyReported) {
          duplicates.push({
            type: 'text',
            original: seedsByText[textKey],
            duplicate: seed,
            text: `${knownText} / ${targetText}`
          });
        }
      } else {
        seedsByText[textKey] = seed;
      }
    }
  }

  return duplicates;
}

/**
 * Find duplicate introduction items
 * Copied from validate-and-fix-samples.cjs for final validation
 */
function findDuplicateIntroItems(manifest) {
  const slice = manifest.slices[0];
  const seeds = slice.seeds || [];

  const duplicates = [];
  const introsByText = {};

  for (const seed of seeds) {
    for (const introItem of seed.introduction_items || []) {
      const knownText = introItem.node?.known?.text;
      const targetText = introItem.node?.target?.text;

      if (knownText && targetText) {
        const textKey = `${knownText}|${targetText}`;
        if (introsByText[textKey]) {
          duplicates.push({
            original: introsByText[textKey],
            duplicate: introItem,
            text: `${knownText} / ${targetText}`,
            seedId: seed.id
          });
        } else {
          introsByText[textKey] = introItem;
        }
      }
    }
  }

  return duplicates;
}

/**
 * Find empty seeds (seeds with no introduction_items)
 */
function findEmptySeeds(manifest) {
  const slice = manifest.slices[0];
  const seeds = slice.seeds || [];

  const emptySeeds = [];

  for (const seed of seeds) {
    if (!seed.introduction_items || seed.introduction_items.length === 0) {
      emptySeeds.push({
        id: seed.id,
        canonical: seed.seed_sentence?.canonical,
        known: seed.node?.known?.text,
        target: seed.node?.target?.text
      });
    }
  }

  return emptySeeds;
}

/**
 * Collect all required sample IDs from manifest structure
 * This traverses seeds and intro items to find what SHOULD exist
 */
function collectRequiredSamples(manifest) {
  const required = new Set();
  const slice = manifest.slices[0];
  const samples = slice.samples || {};

  // Build a lookup from text+role to sample entry
  const sampleLookup = {};
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      const key = `${text}|${variant.role}`;
      sampleLookup[key] = variant;
    }
  }

  // Traverse seeds to find required samples
  for (const seed of slice.seeds || []) {
    // Seed node
    if (seed.node) {
      const knownText = seed.node.known?.text;
      const targetText = seed.node.target?.text;

      if (knownText) {
        const sourceKey = `${knownText}|source`;
        if (sampleLookup[sourceKey]?.id) {
          required.add(sampleLookup[sourceKey].id);
        }
      }
      if (targetText) {
        const t1Key = `${targetText}|target1`;
        const t2Key = `${targetText}|target2`;
        if (sampleLookup[t1Key]?.id) required.add(sampleLookup[t1Key].id);
        if (sampleLookup[t2Key]?.id) required.add(sampleLookup[t2Key].id);
      }
    }

    // Introduction items
    for (const introItem of seed.introduction_items || []) {
      // Intro item node
      if (introItem.node) {
        const knownText = introItem.node.known?.text;
        const targetText = introItem.node.target?.text;

        if (knownText) {
          const sourceKey = `${knownText}|source`;
          if (sampleLookup[sourceKey]?.id) required.add(sampleLookup[sourceKey].id);
        }
        if (targetText) {
          const t1Key = `${targetText}|target1`;
          const t2Key = `${targetText}|target2`;
          if (sampleLookup[t1Key]?.id) required.add(sampleLookup[t1Key].id);
          if (sampleLookup[t2Key]?.id) required.add(sampleLookup[t2Key].id);
        }
      }

      // Presentation
      if (introItem.presentation) {
        const presKey = `${introItem.presentation}|presentation`;
        if (sampleLookup[presKey]?.id) required.add(sampleLookup[presKey].id);
      }

      // Nodes in intro item
      for (const node of introItem.nodes || []) {
        const knownText = node.known?.text;
        const targetText = node.target?.text;

        if (knownText) {
          const sourceKey = `${knownText}|source`;
          if (sampleLookup[sourceKey]?.id) required.add(sampleLookup[sourceKey].id);
        }
        if (targetText) {
          const t1Key = `${targetText}|target1`;
          const t2Key = `${targetText}|target2`;
          if (sampleLookup[t1Key]?.id) required.add(sampleLookup[t1Key].id);
          if (sampleLookup[t2Key]?.id) required.add(sampleLookup[t2Key].id);
        }
      }
    }
  }

  return required;
}

/**
 * Run final validation checks before completing Phase 8
 * Returns object with validation results
 */
function runFinalValidationChecks(manifest) {
  console.log('\n=== Running Final Validation Checks ===\n');

  const results = {
    passed: true,
    duplicateSeeds: [],
    duplicateIntroItems: [],
    emptySeeds: [],
    errors: []
  };

  // Check for duplicate seeds
  results.duplicateSeeds = findDuplicateSeeds(manifest);
  if (results.duplicateSeeds.length > 0) {
    console.error(`❌ Found ${results.duplicateSeeds.length} duplicate seeds:`);
    for (const dup of results.duplicateSeeds.slice(0, 3)) {
      console.error(`   - ${dup.type}: "${dup.text}"`);
    }
    if (results.duplicateSeeds.length > 3) {
      console.error(`   ... and ${results.duplicateSeeds.length - 3} more`);
    }
    results.passed = false;
    results.errors.push(`${results.duplicateSeeds.length} duplicate seeds found`);
  } else {
    console.log('✓ No duplicate seeds');
  }

  // Check for duplicate intro items
  results.duplicateIntroItems = findDuplicateIntroItems(manifest);
  if (results.duplicateIntroItems.length > 0) {
    console.error(`❌ Found ${results.duplicateIntroItems.length} duplicate introduction items:`);
    for (const dup of results.duplicateIntroItems.slice(0, 3)) {
      console.error(`   - "${dup.text}" in seed ${dup.seedId}`);
    }
    if (results.duplicateIntroItems.length > 3) {
      console.error(`   ... and ${results.duplicateIntroItems.length - 3} more`);
    }
    results.passed = false;
    results.errors.push(`${results.duplicateIntroItems.length} duplicate intro items found`);
  } else {
    console.log('✓ No duplicate introduction items');
  }

  // Check for empty seeds
  results.emptySeeds = findEmptySeeds(manifest);
  if (results.emptySeeds.length > 0) {
    console.error(`❌ Found ${results.emptySeeds.length} empty seeds (no introduction_items):`);
    for (const seed of results.emptySeeds.slice(0, 3)) {
      console.error(`   - ${seed.id}: "${seed.canonical || seed.target}"`);
    }
    if (results.emptySeeds.length > 3) {
      console.error(`   ... and ${results.emptySeeds.length - 3} more`);
    }
    results.passed = false;
    results.errors.push(`${results.emptySeeds.length} empty seeds found`);
  } else {
    console.log('✓ No empty seeds');
  }

  console.log('');
  return results;
}

/**
 * Verify all required samples exist in S3
 * Returns object with verification results
 */
async function verifyAllSamplesInS3(manifest, s3Durations, bucket) {
  console.log('\n=== Verifying All Required Samples in S3 ===\n');

  const results = {
    passed: true,
    totalRequired: 0,
    verified: 0,
    missing: [],
    missingFromManifest: []
  };

  // Get all sample IDs from manifest
  const allSampleIds = collectAllSampleIds(manifest);

  // Add welcome if exists
  if (manifest.introduction && manifest.introduction.id) {
    allSampleIds.push(manifest.introduction.id);
  }

  results.totalRequired = allSampleIds.length;

  // Check which samples have durations (meaning they were found in S3)
  for (const uuid of allSampleIds) {
    if (s3Durations[uuid] && s3Durations[uuid] > 0) {
      results.verified++;
    } else {
      results.missing.push(uuid);
    }
  }

  // Also check for samples that are required by structure but missing from samples list
  const requiredByStructure = collectRequiredSamples(manifest);
  const allSampleIdsSet = new Set(allSampleIds);

  for (const uuid of requiredByStructure) {
    if (!allSampleIdsSet.has(uuid)) {
      results.missingFromManifest.push(uuid);
    }
  }

  // Report results
  if (results.missing.length > 0) {
    console.error(`❌ ${results.missing.length} samples missing from S3:`);
    for (const uuid of results.missing.slice(0, 5)) {
      console.error(`   - ${uuid}`);
    }
    if (results.missing.length > 5) {
      console.error(`   ... and ${results.missing.length - 5} more`);
    }
    results.passed = false;
  }

  if (results.missingFromManifest.length > 0) {
    console.error(`❌ ${results.missingFromManifest.length} required samples not in manifest samples list`);
    results.passed = false;
  }

  if (results.passed) {
    console.log(`✓ All ${results.verified} samples verified in S3`);
  }

  console.log('');
  return results;
}

/**
 * Update manifest with durations
 */
function updateManifestDurations(manifest, durations) {
  const samples = manifest.slices?.[0]?.samples || {};
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      if (variant.id && durations[variant.id]) {
        variant.duration = durations[variant.id];
      }
    }
  }
}

/**
 * Collect all sample IDs from manifest
 */
function collectAllSampleIds(manifest) {
  const ids = [];
  const samples = manifest.slices?.[0]?.samples || {};

  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      if (variant.id) {
        ids.push(variant.id);
      }
    }
  }

  return ids;
}

/**
 * Simple tokenization for known/target text
 * For now: just split by spaces (English) or characters (CJK)
 */
function tokenizeText(text, language) {
  if (!text) return [];

  // CJK languages: character-level tokens
  if (language === 'cmn' || language === 'jpn' || language === 'kor') {
    // Remove spaces and punctuation, split into characters
    return text.replace(/\s+/g, '').split('').filter(c => /\p{L}/u.test(c));
  }

  // Other languages: word-level tokens (split by spaces)
  return text.toLowerCase()
    .replace(/[^\p{L}\s]/gu, '') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Populate tokens and lemmas for all nodes in manifest
 */
function populateTokensAndLemmas(manifest) {
  console.log('\n=== Populating Tokens and Lemmas ===\n');

  const targetLang = manifest.target || 'unk';
  const knownLang = manifest.known || 'eng';
  let populated = 0;

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      // Populate seed node
      if (seed.node) {
        if (seed.node.known && !seed.node.known.tokens?.length) {
          seed.node.known.tokens = tokenizeText(seed.node.known.text, knownLang);
          seed.node.known.lemmas = [...seed.node.known.tokens]; // For now, lemmas = tokens
          populated++;
        }
        if (seed.node.target && !seed.node.target.tokens?.length) {
          seed.node.target.tokens = tokenizeText(seed.node.target.text, targetLang);
          seed.node.target.lemmas = [...seed.node.target.tokens];
          populated++;
        }
      }

      // Populate intro items
      for (const introItem of seed.introduction_items || []) {
        if (introItem.node) {
          if (introItem.node.known && !introItem.node.known.tokens?.length) {
            introItem.node.known.tokens = tokenizeText(introItem.node.known.text, knownLang);
            introItem.node.known.lemmas = [...introItem.node.known.tokens];
            populated++;
          }
          if (introItem.node.target && !introItem.node.target.tokens?.length) {
            introItem.node.target.tokens = tokenizeText(introItem.node.target.text, targetLang);
            introItem.node.target.lemmas = [...introItem.node.target.tokens];
            populated++;
          }
        }

        // Populate nodes within intro items
        for (const node of introItem.nodes || []) {
          if (node.known && !node.known.tokens?.length) {
            node.known.tokens = tokenizeText(node.known.text, knownLang);
            node.known.lemmas = [...node.known.tokens];
            populated++;
          }
          if (node.target && !node.target.tokens?.length) {
            node.target.tokens = tokenizeText(node.target.text, targetLang);
            node.target.lemmas = [...node.target.tokens];
            populated++;
          }
        }
      }
    }
  }

  console.log(`✓ Populated ${populated} token/lemma arrays`);
}

/**
 * Re-expand deduplicated samples to include all original variants
 * This happens AFTER generation but BEFORE S3 check
 *
 * Simply runs validate-and-fix-samples again, which will:
 * 1. Find missing variants like "Hablo" (when only "hablo" exists in samples)
 * 2. Add encouragements back
 * 3. Add them with empty IDs
 *
 * Then reassignUUIDsFromMAR will match them to the correct audio via MAR normalization.
 */
async function reExpandSamples(manifest, courseCode) {
  const { execSync } = require('child_process');
  const path = require('path');

  console.log('\n=== Re-expanding Deduplicated Samples ===\n');

  const manifestPath = path.join(__dirname, `../public/vfs/courses/${courseCode}/course_manifest.json`);
  const validatorScript = path.join(__dirname, 'validate-and-fix-samples.cjs');

  // Save current manifest first
  await saveCourseManifest(courseCode, manifest);

  // Run validator to add missing variants and encouragements
  console.log('Running validate-and-fix-samples to restore missing variants...');
  try {
    execSync(`node "${validatorScript}" "${manifestPath}"`, {
      stdio: 'inherit',
      encoding: 'utf-8'
    });
  } catch (error) {
    console.warn(`Warning: Validator exited with code ${error.status}`);
  }

  // Reload manifest with expanded samples
  const expandedManifest = await loadCourseManifest(courseCode);

  // Copy expanded samples back to our manifest
  if (expandedManifest.slices?.[0]?.samples) {
    manifest.slices[0].samples = expandedManifest.slices[0].samples;
  }

  // Populate tokens and lemmas for all nodes
  populateTokensAndLemmas(manifest);

  console.log('✓ Re-expansion complete');
  return 0;
}

/**
 * Extract durations from S3 for ALL samples (both new and existing)
 * This ensures consistency and verifies existing files haven't changed
 */
async function extractDurationsFromS3(sampleIds, bucket) {
  console.log(`\n=== Extracting Durations from S3 (${bucket}) ===\n`);
  console.log(`Checking ${sampleIds.length} samples...`);

  const durations = {};
  const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 's3-duration-'));

  let successCount = 0;
  let failCount = 0;

  try {
    for (const uuid of sampleIds) {
      const tempFile = path.join(tempDir, `${uuid}.mp3`);

      try {
        // Download from S3
        await s3Service.downloadAudioFile(uuid, tempFile, bucket);

        // Extract duration using sox (matches original workflow)
        const duration = await audioProcessor.getAudioDuration(tempFile);

        // Check for corrupted files (0 duration)
        if (duration <= 0) {
          throw new Error(`Invalid duration: ${duration}s (file may be corrupted)`);
        }

        durations[uuid] = duration;

        successCount++;
        console.log(`✓ ${uuid}: ${duration.toFixed(3)}s`);

        // Clean up temp file immediately
        await fs.remove(tempFile);
      } catch (error) {
        failCount++;
        console.warn(`⚠ Failed to get duration for ${uuid}: ${error.message}`);
      }
    }
  } finally {
    await fs.remove(tempDir);
  }

  console.log(`\nDuration extraction complete: ${successCount} succeeded, ${failCount} failed`);

  return durations;
}

/**
 * Upload processed audio to S3
 */
/**
 * Continue Phase A processing after QC approval
 * Processes and uploads raw generated files
 *
 * @param {string} courseCode - Course identifier
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Results object
 */
async function continuePhaseAProcessing(courseCode, options = {}) {
  const { skipUpload = false, uploadBucket = s3Service.STAGE_BUCKET } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase A: Continue Processing (Post-QC)`);
  console.log(`${'='.repeat(60)}\n`);

  // Load raw generation results from temp directory
  const rawDir = path.join(AUDIO_TEMP_DIR);
  const files = await fs.readdir(rawDir);
  const mp3Files = files.filter(f => f.endsWith('.mp3'));

  console.log(`Found ${mp3Files.length} raw audio files to process\n`);

  if (mp3Files.length === 0) {
    throw new Error('No raw audio files found. Run Phase A generation first.');
  }

  // Load voice assignments for the course
  const voiceAssignments = await getVoiceAssignments(courseCode);
  console.log(`Voice assignments: ${JSON.stringify(voiceAssignments)}`);

  // Build UUID→role map from manifest for fallback lookup
  const manifest = await loadCourseManifest(courseCode);
  const uuidToRole = {};
  if (manifest.slices) {
    for (const slice of manifest.slices) {
      if (slice.samples) {
        for (const samples of Object.values(slice.samples)) {
          for (const sample of samples) {
            if (sample.id && sample.role) {
              uuidToRole[sample.id] = sample.role;
            }
          }
        }
      }
    }
  }
  console.log(`Loaded ${Object.keys(uuidToRole).length} UUID→role mappings from manifest`);

  // Strategy: Use worker results first, then manifest lookup for role→voice
  const workerOutputDir = path.join(AUDIO_TEMP_DIR, 'worker-output');
  const elevenlabsUUIDs = new Set();
  const azureUUIDs = new Set();
  const uuidToVoiceId = {};

  try {
    const elevenlabsResultsPath = path.join(workerOutputDir, 'elevenlabs-results.json');
    if (await fs.pathExists(elevenlabsResultsPath)) {
      const elevenlabsResults = await fs.readJson(elevenlabsResultsPath);
      for (const r of elevenlabsResults) {
        if (r.uuid && r.voiceId) {
          elevenlabsUUIDs.add(r.uuid);
          uuidToVoiceId[r.uuid] = r.voiceId;
        }
      }
      console.log(`Loaded ${elevenlabsResults.length} ElevenLabs voice mappings`);
    }

    const azureResultsPath = path.join(workerOutputDir, 'azure-results.json');
    if (await fs.pathExists(azureResultsPath)) {
      const azureResults = await fs.readJson(azureResultsPath);
      for (const r of azureResults) {
        if (r.uuid && r.voiceId) {
          azureUUIDs.add(r.uuid);
          uuidToVoiceId[r.uuid] = r.voiceId;
        }
      }
      console.log(`Loaded ${azureResults.length} Azure voice mappings`);
    }
  } catch (error) {
    console.warn(`Warning: Could not load worker results: ${error.message}`);
  }

  // Default voice for unmapped files (last resort)
  const defaultAzureVoice = voiceAssignments.target1 || 'azure_es-ES-TrianaNeural';
  console.log(`Total known mappings from worker results: ${Object.keys(uuidToVoiceId).length}`);

  // Create results with voiceId from worker outputs, or manifest lookup
  let fromWorkerResults = 0;
  let fromManifest = 0;
  let fromDefault = 0;

  const results = mp3Files.map(filename => {
    const uuid = path.basename(filename, '.mp3');
    let voiceId = uuidToVoiceId[uuid];

    if (voiceId) {
      fromWorkerResults++;
    } else {
      // Look up role from manifest and get voiceId
      const role = uuidToRole[uuid];
      if (role && voiceAssignments[role]) {
        voiceId = voiceAssignments[role];
        fromManifest++;
      } else {
        // Last resort: default to target1 Azure voice
        voiceId = defaultAzureVoice;
        fromDefault++;
      }
    }

    return {
      success: true,
      outputPath: path.join(rawDir, filename),
      sample: {
        uuid,
        voiceId
      }
    };
  });

  console.log(`Voice mapping: ${fromWorkerResults} from worker results, ${fromManifest} from manifest, ${fromDefault} defaulted\n`);

  // Process audio
  const processResults = await processGeneratedAudio(results);
  const processedCount = processResults.filter(r => r.success).length;
  console.log(`Processed: ${processedCount}/${results.length} files`);

  // Upload to S3
  if (!skipUpload) {
    const uploadResults = await uploadToS3(processResults, uploadBucket);
    const uploadedCount = uploadResults.filter(r => r.success).length;
    console.log(`Uploaded: ${uploadedCount}/${processedCount} files to S3`);
  }

  // Extract durations
  const durations = {};
  for (const result of processResults) {
    if (!result.success) continue;
    try {
      const duration = await audioProcessor.getAudioDuration(result.output);
      const uuid = path.basename(result.output, '.mp3');
      durations[uuid] = duration;
    } catch (error) {
      console.warn(`Failed to extract duration: ${error.message}`);
    }
  }

  // Update MAR
  await updateMAR(results, durations);

  console.log(`\n✓ Phase A processing complete\n`);
  console.log(`NEXT STEP: Ask Claude Code to launch Phase B (presentations)\n`);

  return { success: true, processed: processedCount, durations };
}

/**
 * Regenerate specific samples by UUID
 *
 * @param {string} courseCode - Course identifier
 * @param {Array<string>} uuids - UUIDs to regenerate
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Regeneration results
 */
async function regenerateSamples(courseCode, uuids, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Regenerating ${uuids.length} samples`);
  console.log(`${'='.repeat(60)}\n`);

  // Load manifest to find sample details
  const manifest = await loadCourseManifest(courseCode);
  const voiceAssignments = await getVoiceAssignments(courseCode);

  const samplesToRegenerate = [];
  const samples = manifest.slices?.[0]?.samples || {};

  // Find samples by UUID (check both .id and .uuid for compatibility)
  for (const uuid of uuids) {
    const normalizedUUID = uuid.toUpperCase(); // Normalize to uppercase for comparison
    let found = false;
    for (const [text, variants] of Object.entries(samples)) {
      for (const variant of variants) {
        const variantID = (variant.id || variant.uuid || '').toUpperCase();
        if (variantID === normalizedUUID) {
          // Reconstruct sample object for generation
          const voiceKey = {
            'target1': voiceAssignments.target1,
            'target2': voiceAssignments.target2,
            'source': voiceAssignments.source,
            'presentation': voiceAssignments.presentation
          }[variant.role];

          samplesToRegenerate.push({
            uuid: variant.id || variant.uuid || uuid, // Use original format from manifest
            text,
            role: variant.role,
            cadence: variant.cadence,
            language: variant.language || (variant.role === 'source' || variant.role === 'presentation' ? manifest.known : manifest.target),
            voiceId: voiceKey
          });
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      console.warn(`⚠️  UUID not found in manifest: ${uuid}`);
    }
  }

  if (samplesToRegenerate.length === 0) {
    throw new Error('No samples found to regenerate');
  }

  console.log(`Found ${samplesToRegenerate.length} samples to regenerate\n`);

  // Generate audio
  const generationResults = await generateMissingAudio(samplesToRegenerate, courseCode);
  const successCount = generationResults.filter(r => r.success).length;

  console.log(`\nRegenerated: ${successCount}/${samplesToRegenerate.length} samples\n`);

  // Run QC on regenerated samples
  const { flagged, durations } = await runQCCheckpoint(
    generationResults,
    courseCode,
    options.uploadBucket || s3Service.STAGE_BUCKET
  );

  console.log(`QC Results: ${flagged.length} samples flagged\n`);

  // If QC issues found, pause for review
  if (flagged.length > 0) {
    console.log(`⚠️  ${flagged.length} samples flagged. Review QC report before continuing.\n`);
    return {
      success: true,
      regenerated: successCount,
      qcFlagged: flagged.length,
      results: generationResults,
      durations,
      pausedForQC: true
    };
  }

  // No QC issues - process and upload
  console.log('✓ No QC issues detected. Processing and uploading...\n');

  // Process audio (normalize + stretch)
  const processResults = await processGeneratedAudio(generationResults);
  const processedCount = processResults.filter(r => r.success).length;
  console.log(`Processed: ${processedCount}/${successCount} files`);

  // Upload to S3
  const uploadBucket = options.uploadBucket || s3Service.STAGE_BUCKET;
  const uploadResults = await uploadToS3(processResults, uploadBucket);
  const uploadedCount = uploadResults.filter(r => r.success).length;
  console.log(`Uploaded: ${uploadedCount}/${processedCount} files to S3 (${uploadBucket})\n`);

  return {
    success: true,
    regenerated: successCount,
    qcFlagged: flagged.length,
    processed: processedCount,
    uploaded: uploadedCount,
    results: generationResults,
    durations
  };
}

/**
 * Check and generate encouragements for source language
 * Encouragements are kept separate from main workflow until final duration check
 *
 * @param {string} sourceLanguage - Source language code
 * @param {Object} voiceAssignments - Voice assignments
 * @param {Object} manifest - Course manifest (for custom encouragements)
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} { existing: [...], generated: [...], durations: {...} }
 */
async function handleEncouragements(sourceLanguage, voiceAssignments, manifest, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Encouragement Check: ${sourceLanguage}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load canonical encouragements from {language}_encouragements.json
  // These define WHAT encouragements should be in the course
  const canonicalEncouragements = await encouragementService.loadCanonicalEncouragements(sourceLanguage);

  if (canonicalEncouragements.length === 0) {
    console.log(`No canonical encouragements found for ${sourceLanguage} - skipping\n`);
    console.log('To add encouragements, create: public/vfs/canonical/{language}_encouragements.json\n');
    return {
      encouragements: [],
      durations: {},
      generated: 0
    };
  }

  console.log(`Found ${canonicalEncouragements.length} canonical encouragements for ${sourceLanguage}\n`);

  // Get encouragement voice
  const encouragementVoice = encouragementService.getEncouragementVoice(sourceLanguage, voiceAssignments);
  console.log(`Encouragement voice: ${encouragementVoice}\n`);

  // Check which encouragements have existing audio samples (by TEXT match)
  // Samples are stored in samples_database/encouragement_samples/{lang}_samples.json
  const existing = [];
  const missing = [];

  for (const canonicalEnc of canonicalEncouragements) {
    const sample = await marService.findEncouragementSampleByText(sourceLanguage, canonicalEnc.text);

    if (sample) {
      existing.push({
        text: canonicalEnc.text,
        canonicalId: canonicalEnc.id,  // The encouragement item ID
        uuid: sample.uuid,              // The audio sample UUID
        duration: sample.duration,
        exists: true
      });
    } else {
      missing.push({
        text: canonicalEnc.text,
        canonicalId: canonicalEnc.id,
        exists: false
      });
    }
  }

  console.log(`Existing samples: ${existing.length}/${canonicalEncouragements.length}`);
  console.log(`Need to generate: ${missing.length}\n`);

  let generatedResults = [];
  let allDurations = {};

  // Add existing durations
  for (const enc of existing) {
    if (enc.uuid && enc.duration) {
      allDurations[enc.uuid] = enc.duration;
    }
  }

  // Generate missing encouragements
  if (missing.length > 0 && !options.skipGeneration) {
    const tempDir = path.join(AUDIO_TEMP_DIR, 'encouragements');

    // Generate new UUIDs for missing samples (these are SAMPLE UUIDs, not encouragement item IDs)
    const missingWithUUIDs = missing.map(m => ({
      ...m,
      uuid: uuidService.generateDeterministicUUID(`encouragement_sample_${sourceLanguage}_${m.text}`)
    }));

    // Generate
    const genResults = await encouragementService.generateEncouragements(
      missingWithUUIDs,
      encouragementVoice,
      sourceLanguage,
      tempDir
    );

    // Process
    const processResults = await encouragementService.processEncouragements(genResults);

    // Upload and register in encouragement samples storage
    const uploadDurations = await encouragementService.uploadAndRegisterEncouragements(
      processResults,
      encouragementVoice,
      sourceLanguage,
      options.uploadBucket || s3Service.STAGE_BUCKET
    );

    // Merge durations
    allDurations = { ...allDurations, ...uploadDurations };

    generatedResults = genResults;

    // Add newly generated to existing list
    for (const result of generatedResults.filter(r => r.success)) {
      existing.push({
        text: result.encouragement.text,
        canonicalId: result.encouragement.canonicalId,
        uuid: result.encouragement.uuid,
        duration: allDurations[result.encouragement.uuid],
        exists: true
      });
    }
  }

  const successCount = existing.length;
  console.log(`✓ Encouragements ready: ${successCount}/${canonicalEncouragements.length}\n`);

  // Return ALL encouragements that have samples (for manifest integration)
  // The manifest needs the SAMPLE UUID (for audio playback), not the canonical item ID
  const allEncouragements = existing.map(e => ({
    text: e.text,
    uuid: e.uuid,           // Audio sample UUID
    duration: e.duration,
    language: sourceLanguage
  }));

  return {
    encouragements: allEncouragements,
    durations: allDurations,
    generated: generatedResults.filter(r => r.success).length
  };
}

/**
 * Check and generate welcome for course
 * Welcome is course-specific and played at the start
 *
 * @param {string} courseCode - Course code
 * @param {string} sourceLanguage - Source language code
 * @param {Object} voiceAssignments - Voice assignments
 * @param {Object} manifest - Course manifest
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} { uuid, duration, generated: boolean }
 */
async function handleWelcome(courseCode, sourceLanguage, voiceAssignments, manifest, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Welcome Check: ${courseCode}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get welcome from registry
  const welcome = await welcomeService.getWelcomeForCourse(courseCode);

  if (!welcome || !welcome.text) {
    console.log('ℹ️  No welcome configured for this course.');
    console.log('   To add a welcome message:');
    console.log('   1. Edit: public/vfs/canonical/welcomes.json');
    console.log(`   2. Add: "${courseCode}": { "text": "Welcome to..." }`);
    console.log('   3. Re-run audio generation\n');
    return {
      uuid: null,
      duration: 0,
      generated: false
    };
  }

  console.log(`Welcome text: "${welcome.text.substring(0, 60)}..."\n`);

  // Get voice (use presentation voice for welcome)
  const welcomeVoice = voiceAssignments.presentation || voiceAssignments.source;
  console.log(`Welcome voice: ${welcomeVoice}\n`);

  // Check if welcome audio already exists
  const { exists, sample } = await welcomeService.checkExistingWelcome(courseCode, welcomeVoice);

  if (exists) {
    console.log(`✓ Welcome audio already exists`);
    console.log(`  UUID: ${sample.uuid}`);
    console.log(`  Duration: ${sample.duration}s\n`);

    // Update manifest with existing welcome
    manifest.introduction.id = sample.uuid;
    manifest.introduction.duration = sample.duration;

    // Update registry
    await welcomeService.updateWelcomeRegistry(courseCode, {
      id: sample.uuid,
      voice: welcomeVoice,
      duration: sample.duration
    });

    return {
      uuid: sample.uuid,
      duration: sample.duration,
      generated: false
    };
  }

  // Need to generate welcome audio
  console.log(`Generating welcome audio...\n`);

  const uuid = welcome.id || welcomeService.generateWelcomeUUID(courseCode, welcome.text);
  const tempDir = path.join(AUDIO_TEMP_DIR, 'welcome');
  const outputPath = path.join(tempDir, `${uuid}.mp3`);

  const welcomeData = {
    courseCode,
    text: welcome.text,
    uuid
  };

  // Generate
  const genResult = await welcomeService.generateWelcome(
    welcomeData,
    welcomeVoice,
    sourceLanguage,
    outputPath
  );

  if (!genResult.success) {
    console.error(`✗ Failed to generate welcome: ${genResult.error}\n`);
    return {
      uuid: null,
      duration: 0,
      generated: false
    };
  }

  // Process
  const processResult = await welcomeService.processWelcome(genResult);

  if (!processResult.success) {
    console.error(`✗ Failed to process welcome\n`);
    return {
      uuid: null,
      duration: 0,
      generated: false
    };
  }

  // Upload and register
  const uploadResult = await welcomeService.uploadAndRegisterWelcome(
    processResult,
    welcomeVoice,
    sourceLanguage,
    options.uploadBucket || s3Service.STAGE_BUCKET
  );

  if (!uploadResult.success) {
    console.error(`✗ Failed to upload welcome\n`);
    return {
      uuid: null,
      duration: 0,
      generated: false
    };
  }

  console.log(`✓ Welcome generated successfully`);
  console.log(`  UUID: ${uuid}`);
  console.log(`  Duration: ${uploadResult.duration}s\n`);

  // Update manifest
  manifest.introduction.id = uuid;
  manifest.introduction.duration = uploadResult.duration;

  // Update registry
  await welcomeService.updateWelcomeRegistry(courseCode, {
    id: uuid,
    voice: welcomeVoice,
    duration: uploadResult.duration
  });

  return {
    uuid,
    duration: uploadResult.duration,
    generated: true
  };
}

/**
 * Download required target files from S3 for Phase B (presentations)
 *
 * @param {Object} manifest - Course manifest
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<Object>} { downloaded: [...], missing: [...] }
 */
async function downloadTargetFilesFromS3(manifest, bucket) {
  console.log('\n=== Downloading Target Files from S3 ===\n');
  console.log('Phase B (presentations) requires target1 and target2 samples...\n');

  const targetDir = path.join(AUDIO_TEMP_DIR, 'targets');
  await fs.ensureDir(targetDir);

  const required = [];
  const downloaded = [];
  const missing = [];
  const samples = manifest.slices?.[0]?.samples || {};

  // Collect all target1 and target2 samples that have UUIDs
  for (const [text, variants] of Object.entries(samples)) {
    for (const variant of variants) {
      if (PHASE_A_ROLES.includes(variant.role) && variant.uuid) {
        required.push({
          text,
          uuid: variant.uuid,
          role: variant.role
        });
      }
    }
  }

  console.log(`Need to download ${required.length} target files...\n`);

  // Download each file
  for (const target of required) {
    const localPath = path.join(targetDir, `${target.uuid}.mp3`);

    // Skip if already exists locally
    if (await fs.pathExists(localPath)) {
      console.log(`✓ Already exists: ${target.uuid}`);
      downloaded.push(target);
      continue;
    }

    try {
      const s3Key = `mastered/${target.uuid}.mp3`;
      await s3Service.downloadAudioFile(target.uuid, localPath, bucket);
      console.log(`✓ Downloaded: ${target.uuid}`);
      downloaded.push(target);
    } catch (error) {
      console.error(`✗ Failed to download ${target.uuid}: ${error.message}`);
      missing.push({
        ...target,
        error: error.message
      });
    }
  }

  console.log(`\nDownloaded: ${downloaded.length}/${required.length}`);

  if (missing.length > 0) {
    console.error(`\n⚠️  Missing ${missing.length} required target files!`);
    console.error('Phase B cannot proceed without these files.\n');
    for (const m of missing.slice(0, 10)) {
      console.error(`  - ${m.uuid}: ${m.text.substring(0, 50)}...`);
    }
    if (missing.length > 10) {
      console.error(`  ... and ${missing.length - 10} more`);
    }
  }

  return { downloaded, missing, targetDir };
}

/**
 * Upload processed files to S3 with parallel uploads
 * Concurrency of 15 provides ~5-10x speedup over sequential
 */
async function uploadToS3(processResults, bucket = s3Service.STAGE_BUCKET, concurrency = 15) {
  console.log(`\n=== Uploading to S3 (${bucket}) - ${concurrency} parallel ===\n`);

  const successResults = processResults.filter(r => r.success);
  const uploadResults = [];
  let completed = 0;
  let failed = 0;
  const total = successResults.length;
  const startTime = Date.now();

  // Process in batches with concurrency limit
  for (let i = 0; i < successResults.length; i += concurrency) {
    const batch = successResults.slice(i, i + concurrency);

    const batchPromises = batch.map(async (result) => {
      const uuid = path.basename(result.output, '.mp3');

      try {
        const s3Result = await s3Service.uploadAudioFile(uuid, result.output, bucket);
        completed++;

        // Progress update every 100 uploads
        if (completed % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = completed / elapsed;
          const remaining = (total - completed) / rate;
          console.log(`Uploaded ${completed}/${total} (${rate.toFixed(1)}/s, ~${Math.ceil(remaining)}s remaining)`);
        }

        return {
          success: true,
          uuid,
          url: s3Result.url
        };
      } catch (error) {
        failed++;
        console.error(`Failed to upload ${uuid}: ${error.message}`);

        return {
          success: false,
          uuid,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    uploadResults.push(...batchResults);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n✓ Upload complete: ${completed} succeeded, ${failed} failed in ${elapsed.toFixed(1)}s (${(completed/elapsed).toFixed(1)}/s)`);

  return uploadResults;
}

/**
 * Update temporary MAR with newly generated samples
 * Samples stay in temp MAR until QC passes and S3 upload is verified
 *
 * Uses batched writing for performance (500 samples per disk write)
 */
async function updateMAR(generationResults, durations) {
  console.log('\n=== Updating Temporary MAR (Batched) ===\n');

  const batchedWriter = marService.getBatchedTempMARWriter(500);
  let added = 0;
  let skipped = 0;

  for (const result of generationResults) {
    if (!result.success) continue;

    const { sample } = result;
    const duration = durations[sample.uuid];

    if (!duration) {
      skipped++;
      continue;
    }

    try {
      await batchedWriter.addSample(sample.voiceId, sample.uuid, {
        text: sample.text,
        language: sample.language,
        role: sample.role,
        cadence: sample.cadence,
        duration,
        filename: `${sample.uuid}.mp3`
      });
      added++;
    } catch (error) {
      console.error(`Failed to add sample ${sample.uuid}: ${error.message}`);
    }
  }

  // Flush any remaining samples
  await batchedWriter.flush();

  console.log(`✓ MAR update complete: ${added} samples added, ${skipped} skipped (no duration)`);
}

/**
 * Execute Phase A: Generate target1, target2, source samples
 *
 * @param {Array} phaseASamples - Samples to generate for Phase A
 * @param {string} courseCode - Course identifier
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Results object
 */
async function executePhaseA(phaseASamples, courseCode, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase A: Core Vocabulary Generation`);
  console.log(`Roles: target1, target2, source`);
  console.log(`Samples to generate: ${phaseASamples.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (phaseASamples.length === 0) {
    console.log('✓ All Phase A samples already exist\n');
    return { success: true, generated: 0, skipped: true };
  }

  // 1. Generate audio with automatic retry (for Azure SDK per-process limits)
  // Retries indefinitely until all samples are generated, but stops if no progress is made
  const useParallel = !options.sequential;
  let allGenerationResults = [];
  let remainingSamples = [...phaseASamples];
  let retryCount = 0;
  let consecutiveZeroProgress = 0;
  const MAX_ZERO_PROGRESS = 3; // Stop if 3 attempts in a row produce nothing

  while (remainingSamples.length > 0) {
    console.log(`\n${retryCount > 0 ? '🔄 Retry attempt ' + retryCount + ' - ' : ''}Generating ${remainingSamples.length} samples...\n`);

    const generationResults = useParallel
      ? await generateMissingAudioParallel(remainingSamples, courseCode)
      : await generateMissingAudio(remainingSamples, courseCode);

    // Only add VALID results with UUIDs
    const validResults = generationResults.filter(r => r && r.uuid);
    allGenerationResults.push(...validResults);

    // Check if all remaining samples were generated
    const successfulUUIDs = new Set(
      validResults.filter(r => r.success).map(r => r.uuid)
    );

    const previousRemaining = remainingSamples.length;
    remainingSamples = remainingSamples.filter(s => !successfulUUIDs.has(s.uuid));

    if (remainingSamples.length > 0) {
      const successThisRound = validResults.filter(r => r.success).length;
      console.log(`\n⚠️  Generated ${successThisRound} samples, ${remainingSamples.length} still remaining - will retry automatically\n`);
      retryCount++;

      // Track consecutive zero-progress attempts
      if (successThisRound === 0) {
        consecutiveZeroProgress++;
        console.warn(`⚠️  No progress in this attempt (${consecutiveZeroProgress}/${MAX_ZERO_PROGRESS})`);

        if (consecutiveZeroProgress >= MAX_ZERO_PROGRESS) {
          console.error(`\n❌ No progress made in ${MAX_ZERO_PROGRESS} consecutive attempts - stopping retry loop\n`);
          console.error(`Samples that failed to generate:`);
          remainingSamples.slice(0, 5).forEach(s => {
            console.error(`  - ${s.voiceId}: "${s.text.substring(0, 50)}..."`);
          });
          if (remainingSamples.length > 5) {
            console.error(`  ... and ${remainingSamples.length - 5} more`);
          }
          break;
        }
      } else {
        // Reset counter on any progress
        consecutiveZeroProgress = 0;
      }
    } else {
      console.log(`\n✅ All samples generated successfully${retryCount > 0 ? ' after ' + retryCount + ' retries' : ''}!\n`);
    }
  }

  if (remainingSamples.length > 0) {
    console.warn(`\n⚠️  Warning: ${remainingSamples.length} samples could not be generated after ${retryCount} attempts\n`);
    console.warn(`This may indicate API issues, invalid text, or voice problems.\n`);
  }

  const successCount = allGenerationResults.filter(r => r.success).length;
  console.log(`\nTotal Generated: ${successCount}/${phaseASamples.length} files`);

  if (successCount === 0) {
    throw new Error('No audio files were successfully generated in Phase A');
  }

  const generationResults = allGenerationResults;

  // 2. QC Checkpoint - BEFORE processing and upload
  const { flagged, durations } = await runQCCheckpoint(
    generationResults,
    courseCode,
    options.uploadBucket
  );

  // 3. Display QC results and pause for Claude Code workflow
  displayQCResultsAndNextSteps(flagged, 'Phase A', courseCode);

  // If QC issues found, stop here for user review via Claude Code
  if (flagged.length > 0 && !options.skipQC) {
    console.log(`Phase A generation complete. Review QC report before continuing.\n`);
    return {
      success: true,
      generated: successCount,
      qcFlagged: flagged.length,
      durations,
      pausedForQC: true
    };
  }

  // No QC issues or skipQC flag - continue with processing
  console.log('\n✓ Proceeding with processing and upload\n');

  // 4. Process audio (normalize + stretch)
  const processResults = await processGeneratedAudio(generationResults);
  const processedCount = processResults.filter(r => r.success).length;
  console.log(`Processed: ${processedCount}/${successCount} files`);

  // 5. Upload to S3
  if (!options.skipUpload) {
    const uploadResults = await uploadToS3(processResults, options.uploadBucket);
    const uploadedCount = uploadResults.filter(r => r.success).length;
    console.log(`Uploaded: ${uploadedCount}/${processedCount} files to S3`);
  } else {
    console.log('\nSkipping S3 upload (skipUpload=true)');
  }

  // 6. Update MAR
  await updateMAR(generationResults, durations);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase A Complete`);
  console.log(`Generated: ${successCount} | QC Flagged: ${flagged.length}`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    success: true,
    generated: successCount,
    qcFlagged: flagged.length,
    durations
  };
}

/**
 * Generate presentation samples using concatenation
 * Presentations combine TTS narration with pre-recorded target audio from S3
 *
 * @param {Array} samples - Presentation samples to generate
 * @param {Object} manifest - Course manifest
 * @param {Object} voiceAssignments - Voice assignments by role
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} Generation results
 */
async function generatePresentationSamples(samples, manifest, voiceAssignments, options = {}) {
  const { uploadBucket = s3Service.STAGE_BUCKET } = options;

  console.log(`\n=== Generating ${samples.length} Presentation Samples ===\n`);

  // Step 1: Extract and deduplicate all unique narration segments
  const { uniqueSegments, segmentMap } = presentationService.extractAllUniqueSegments(samples);

  console.log(`Deduplication analysis:`);
  console.log(`  Total text segments: ${Array.from(segmentMap.values()).reduce((a, b) => a + b, 0)}`);
  console.log(`  Unique segments: ${uniqueSegments.size}`);
  console.log(`  Duplicates eliminated: ${Array.from(segmentMap.values()).reduce((a, b) => a + b, 0) - uniqueSegments.size}\n`);

  // Show top duplicates
  const sortedByCount = Array.from(segmentMap.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedByCount.length > 0) {
    console.log(`Top duplicate segments:`);
    for (const [text, count] of sortedByCount) {
      console.log(`  ${count}x: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
    }
    console.log();
  }

  // Step 2: Generate all unique segments in batch
  const presentationVoiceId = voiceAssignments.presentation;
  const segmentCacheDir = path.join(AUDIO_TEMP_DIR, 'segment_cache');
  const segmentCache = await presentationService.generateSegmentBatch(
    uniqueSegments,
    presentationVoiceId,
    segmentCacheDir,
    { sourceLanguage: manifest.known }
  );

  // Step 3: Filter out samples that already exist locally (scan hierarchical + legacy dirs)
  const existingFiles = await getAllExistingSampleUUIDs();

  // Note: samples from manifest have 'id' field, but analyzeRequiredGeneration adds 'uuid' field
  // Support both for compatibility
  const samplesToGenerate = samples.filter(s => !existingFiles.has(s.uuid || s.id));
  const skippedCount = samples.length - samplesToGenerate.length;

  if (skippedCount > 0) {
    console.log(`\n✓ Skipping ${skippedCount} presentations that already exist locally`);
    console.log(`  Generating ${samplesToGenerate.length} missing presentations\n`);
  }

  if (samplesToGenerate.length === 0) {
    console.log('\n✓ All presentations already exist locally!\n');
    return samples.map(s => ({ success: true, uuid: s.uuid || s.id, skipped: true }));
  }

  // Step 4: Generate presentations using the cached segments
  const results = [];
  const MAX_CONCURRENT = 4; // Presentations are complex, use fewer concurrent

  for (let i = 0; i < samplesToGenerate.length; i += MAX_CONCURRENT) {
    const batch = samplesToGenerate.slice(i, i + MAX_CONCURRENT);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (sample) => {
        console.log(`[${i + 1}/${samplesToGenerate.length}] Generating presentation: "${sample.text.substring(0, 60)}..."`);

        try {
          const result = await presentationService.generatePresentationAudio(
            sample,
            manifest,
            voiceAssignments,
            {
              tempDir: AUDIO_TEMP_DIR,
              bucket: uploadBucket,
              sourceLanguage: manifest.known,
              targetLanguage: manifest.target,
              segmentCache // Pass the pre-generated segment cache
            }
          );

          if (result.success) {
            console.log(`  ✓ Generated: ${result.uuid}`);
          } else {
            console.error(`  ✗ Failed: ${result.error}`);
          }

          return result;

        } catch (error) {
          console.error(`  ✗ Exception: ${error.message}`);
          return {
            success: false,
            sample,
            error: error.message
          };
        }
      })
    );

    results.push(...batchResults);

    // Progress update
    const completed = Math.min(i + MAX_CONCURRENT, samplesToGenerate.length);
    const pct = Math.round((completed / samplesToGenerate.length) * 100);
    console.log(`\nProgress: ${completed}/${samplesToGenerate.length} presentations (${pct}%)\n`);
  }

  // Step 5: Keep segment cache directory for potential re-runs
  // await fs.remove(segmentCacheDir);  // Commented out to allow resuming with cached segments
  console.log(`\n✓ Segment cache preserved at: ${segmentCacheDir}`);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n✓ Generated ${successCount}/${samplesToGenerate.length} presentations`);
  if (skippedCount > 0) {
    console.log(`✓ Skipped ${skippedCount} existing presentations`);
  }
  if (failCount > 0) {
    console.log(`✗ Failed: ${failCount} presentations\n`);
  }

  return results;
}

/**
 * Execute Phase B: Generate presentation samples
 *
 * @param {Array} phaseBSamples - Samples to generate for Phase B
 * @param {Object} manifest - Course manifest
 * @param {string} courseCode - Course identifier
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Results object
 */
async function executePhaseB(phaseBSamples, manifest, courseCode, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase B: Presentation Generation`);
  console.log(`Roles: presentation`);
  console.log(`Total presentations in manifest: ${phaseBSamples.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (phaseBSamples.length === 0) {
    console.log('✓ All Phase B samples already exist\n');
    return { success: true, generated: 0, skipped: true };
  }

  // 0. FIRST: Check which presentations already exist locally (skip before target download)
  console.log('Checking for existing presentation files (hierarchical + legacy)...');
  const existingFiles = await getAllExistingSampleUUIDs();

  // Filter to only samples that need generation (using manifest ID)
  const samplesToGenerate = phaseBSamples.filter(s => !existingFiles.has(s.uuid || s.id));
  const skippedCount = phaseBSamples.length - samplesToGenerate.length;

  if (skippedCount > 0) {
    console.log(`✓ Skipping ${skippedCount} presentations that already exist locally`);
    console.log(`  Need to generate: ${samplesToGenerate.length} presentations\n`);
  }

  if (samplesToGenerate.length === 0) {
    console.log('\n✓ All presentations already exist locally!\n');
    return {
      success: true,
      generated: 0,
      skipped: phaseBSamples.length,
      results: phaseBSamples.map(s => ({ success: true, uuid: s.uuid || s.id, skipped: true }))
    };
  }

  // 1. Collect required target UUIDs only for samples that need generation
  console.log('\n=== Downloading Target Files from S3 ===\n');
  console.log('Phase B (presentations) requires target1 and target2 samples...\n');

  const { requiredTargets, missingTargets } = presentationService.collectRequiredTargets(samplesToGenerate, manifest);

  // Fail fast if any required targets are missing from manifest
  if (missingTargets.length > 0) {
    console.error(`\n❌ ERROR: ${missingTargets.length} required target samples are missing from the manifest:\n`);

    // Group by target text to avoid duplicates
    const grouped = {};
    for (const missing of missingTargets) {
      const key = `${missing.targetText}|${missing.role}`;
      if (!grouped[key]) {
        grouped[key] = { ...missing, count: 0, presentations: [] };
      }
      grouped[key].count++;
      grouped[key].presentations.push(missing.presentationId);
    }

    for (const [key, info] of Object.entries(grouped)) {
      console.error(`  Target text: "${info.targetText}" (${info.role})`);
      console.error(`  Needed by: ${info.count} presentation(s)`);
      console.error(`  Example presentation: ${info.presentationText}`);
      console.error(`  Presentation IDs: ${info.presentations.slice(0, 3).join(', ')}${info.presentations.length > 3 ? '...' : ''}`);
      console.error('');
    }

    throw new Error(
      `Cannot proceed with Phase B: ${missingTargets.length} required target samples are missing from the manifest. ` +
      `These target samples need to be generated in Phase A first, or the manifest data may have incorrect roles. ` +
      `Fix the manifest and regenerate the missing target samples, then retry Phase B.`
    );
  }

  console.log(`Identified ${requiredTargets.size} unique target files needed\n`);

  const targetCacheDir = path.join(AUDIO_TEMP_DIR, 'targets');
  const { downloaded, skipped, failed } = await presentationService.bulkDownloadTargets(
    requiredTargets,
    targetCacheDir,
    options.uploadBucket,
    10 // Concurrency: 10 parallel downloads
  );

  if (failed > 0 && !options.ignoreDownloadErrors) {
    throw new Error(
      `Cannot proceed with Phase B: ${failed} required target files failed to download from S3. ` +
      `Check S3 bucket and ensure Phase A samples were uploaded successfully. ` +
      `Use --ignore-download-errors to proceed anyway (may cause failures during generation).`
    );
  } else if (failed > 0) {
    console.warn(`⚠️  ${failed} target files failed to download - proceeding anyway due to --ignore-download-errors`);
  }

  console.log(`✓ All ${requiredTargets.size} required target files available (${downloaded} downloaded, ${skipped} cached)\n`);

  // 2. Generate presentation audio with concatenation (only for samples that need generation)
  const voiceAssignments = await getVoiceAssignments(courseCode);
  const generationResults = await generatePresentationSamples(samplesToGenerate, manifest, voiceAssignments, options);
  const successCount = generationResults.filter(r => r.success).length;
  console.log(`\nGenerated: ${successCount}/${samplesToGenerate.length} files (${skippedCount} skipped)`);

  if (successCount === 0) {
    throw new Error('No audio files were successfully generated in Phase B');
  }

  // 3. QC Checkpoint - BEFORE processing and upload
  const { flagged, durations } = await runQCCheckpoint(
    generationResults,
    courseCode,
    options.uploadBucket
  );

  // 4. Display QC results and pause for Claude Code workflow
  displayQCResultsAndNextSteps(flagged, 'Phase B', courseCode);

  // If QC issues found, stop here for user review via Claude Code
  if (flagged.length > 0 && !options.skipQC) {
    console.log(`Phase B generation complete. Review QC report before continuing.\n`);
    return {
      success: true,
      generated: successCount,
      qcFlagged: flagged.length,
      durations,
      pausedForQC: true
    };
  }

  // No QC issues or skipQC flag - continue with processing
  console.log('\n✓ Proceeding with processing and upload\n');

  // 5. Process audio
  const processResults = await processGeneratedAudio(generationResults);
  const processedCount = processResults.filter(r => r.success).length;
  console.log(`Processed: ${processedCount}/${successCount} files`);

  // 6. Upload to S3
  if (!options.skipUpload) {
    const uploadResults = await uploadToS3(processResults, options.uploadBucket);
    const uploadedCount = uploadResults.filter(r => r.success).length;
    console.log(`Uploaded: ${uploadedCount}/${processedCount} files to S3`);
  } else {
    console.log('\nSkipping S3 upload (skipUpload=true)');
  }

  // 7. Update MAR
  await updateMAR(generationResults, durations);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase B Complete`);
  console.log(`Generated: ${successCount} | QC Flagged: ${flagged.length}`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    success: true,
    generated: successCount,
    qcFlagged: flagged.length,
    durations
  };
}

/**
 * Main orchestration function
 */
async function generateAudioForCourse(courseCode, options = {}) {
  const {
    skipUpload = false,
    uploadBucket = s3Service.STAGE_BUCKET,
    cleanupTemp = true,
    skipQC = false,
    sequential = false, // Use sequential instead of parallel provider generation
    phase = 'auto', // 'targets', 'presentations', or 'auto'
    blockTTS = false, // Block all TTS generation - fail if any would be required
    ignoreDownloadErrors = false // Continue even if target downloads fail
  } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase 8: Audio Generation for ${courseCode}`);
  if (phase !== 'auto') {
    console.log(`Mode: ${phase === 'targets' ? 'Phase A Only' : 'Phase B Only'}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Run pre-flight checks (including course-specific manifest checks with auto-fix)
    const preflightResults = await preflightCheck.runPreflightChecks({
      verbose: true,
      courseCode: courseCode,
      autoFix: true
    });

    if (!preflightResults.allPassed) {
      console.error('\n❌ Pre-flight checks failed. Please fix the issues above before continuing.\n');

      // Show agent actions if any
      if (preflightResults.agentActions && preflightResults.agentActions.length > 0) {
        console.error('Agent actions required:');
        for (const action of preflightResults.agentActions) {
          console.error(`  ${action.service}: ${action.action}`);
        }
      }

      return {
        success: false,
        error: 'Pre-flight checks failed',
        details: preflightResults
      };
    }

    // Report auto-fixes applied
    if (preflightResults.fixed && preflightResults.fixed.length > 0) {
      console.log('🔧 Auto-fixes applied during preflight:');
      for (const fix of preflightResults.fixed) {
        console.log(`  ${fix.service}: ${fix.message}`);
      }
      console.log();
    }

    console.log('✅ All pre-flight checks passed. Proceeding with audio generation...\n');

    // 0. Clean stale worker metadata files from previous runs (JSON only, never audio)
    await cleanStaleWorkerFiles();

    // 1. Initialize temporary MAR (crash-safe staging area)
    console.log('Initializing temporary MAR...');
    await marService.initTempMAR();

    // 2. Load course manifest
    console.log('Loading course manifest...');
    const manifest = await loadCourseManifest(courseCode);
    const sampleCount = Object.keys(manifest.slices?.[0]?.samples || {}).length;
    console.log(`Loaded: ${sampleCount} unique phrases\n`);

    // 3. Normalize cadences based on roles
    normalizeCadences(manifest);

    // 4. Get voice assignments
    console.log('Loading voice assignments...');
    const voiceAssignments = await getVoiceAssignments(courseCode);
    console.log('Voice assignments:', voiceAssignments, '\n');

    // 5. Analyze what needs to be generated (checks both permanent and temp MAR)
    console.log('Analyzing required generation...');
    const { toGenerate, matched } = await analyzeRequiredGeneration(
      manifest,
      courseCode,
      voiceAssignments
    );

    console.log(`Matched existing: ${matched.length}`);
    console.log(`Need to generate: ${toGenerate.length}\n`);

    if (toGenerate.length === 0) {
      console.log('All samples already exist. Nothing to generate.');
      await saveCourseManifest(courseCode, manifest);
      return { success: true, generated: 0, matched: matched.length };
    }

    // 6. Split samples by phase
    const { phaseA, phaseB } = splitSamplesByPhase(toGenerate);
    console.log(`Phase A (targets + source): ${phaseA.length} samples`);
    console.log(`Phase B (presentations): ${phaseB.length} samples\n`);

    // Set global TTS block flag - will be checked at actual TTS call time
    if (blockTTS) {
      global.BLOCK_TTS = true;
      console.log('⚠️  --block-tts flag is set. TTS calls will be blocked at runtime.\n');
    }

    let totalGenerated = 0;
    let totalQCFlagged = 0;
    let allDurations = {};

    // 7. Execute Phase A (targets + source)
    if (phase === 'auto' || phase === 'targets' || phase === 'source') {
      // Filter phaseA samples based on mode
      let phaseASamples = phaseA;
      if (phase === 'targets') {
        // For --phase=targets, ONLY generate target1/target2 (Azure voices)
        // Exclude 'source' role (ElevenLabs) to avoid charges while AFK
        const beforeCount = phaseA.length;
        phaseASamples = phaseA.filter(s => s.role === 'target1' || s.role === 'target2');
        const sourceCount = beforeCount - phaseASamples.length;

        if (sourceCount > 0) {
          console.log(`\n🔒 --phase=targets mode: Excluding ${sourceCount} 'source' samples (run separately with ElevenLabs)`);
          console.log(`   Generating ONLY target1/target2 (Azure voices)\n`);
        }

        // Safety check: Block ElevenLabs generation
        global.BLOCK_ELEVENLABS = true;
      } else if (phase === 'source') {
        // For --phase=source, ONLY generate source role (ElevenLabs)
        // Exclude target1/target2 (Azure) - they should already be generated
        const beforeCount = phaseA.length;
        phaseASamples = phaseA.filter(s => s.role === 'source');
        const targetCount = beforeCount - phaseASamples.length;

        if (targetCount > 0) {
          console.log(`\n🔒 --phase=source mode: Excluding ${targetCount} target samples (should already exist)`);
          console.log(`   Generating ONLY source (ElevenLabs voices)\n`);
        }

        // Safety check: Block Azure generation
        global.BLOCK_AZURE = true;
      }

      const resultA = await executePhaseA(phaseASamples, courseCode, { skipUpload, uploadBucket, skipQC, sequential });
      totalGenerated += resultA.generated;
      totalQCFlagged += resultA.qcFlagged;
      allDurations = { ...allDurations, ...resultA.durations };

      // If paused for QC, stop here
      if (resultA.pausedForQC) {
        console.log(`\n⏸️  Paused for QC review. Use Claude Code to continue.\n`);
        return {
          success: true,
          generated: totalGenerated,
          qcFlagged: totalQCFlagged,
          pausedForQC: true,
          pausedPhase: 'A'
        };
      }

      // Re-assign UUIDs from MAR to all manifest samples
      // This ensures variants like "Hablar" and "hablar" both get the same UUID
      console.log('\nRe-assigning UUIDs from MAR to manifest...');
      const reassignStats = await reassignUUIDsFromMAR(manifest, voiceAssignments);
      console.log(`✓ Assigned ${reassignStats.assigned} UUIDs from MAR`);

      if (reassignStats.missing > 0) {
        console.error(`\n❌ ERROR: ${reassignStats.missing} Phase A samples are missing UUIDs!`);
        console.error(`This should not happen - all Phase A samples should be in MAR after generation.`);
        throw new Error(`Missing ${reassignStats.missing} Phase A samples in MAR`);
      }

      // Save manifest with updated UUIDs
      await saveCourseManifest(courseCode, manifest);
      console.log('✓ Manifest updated with Phase A UUIDs\n');
    }

    // 8. Execute Phase B (presentations)
    if (phase === 'auto' || phase === 'presentations') {
      const resultB = await executePhaseB(phaseB, manifest, courseCode, { skipUpload, uploadBucket, skipQC, ignoreDownloadErrors });
      totalGenerated += resultB.generated;
      totalQCFlagged += resultB.qcFlagged;
      allDurations = { ...allDurations, ...resultB.durations };

      // If paused for QC, stop here
      if (resultB.pausedForQC) {
        console.log(`\n⏸️  Paused for QC review. Use Claude Code to continue.\n`);
        return {
          success: true,
          generated: totalGenerated,
          qcFlagged: totalQCFlagged,
          pausedForQC: true,
          pausedPhase: 'B'
        };
      }
    }

    // 9. Sync manifest samples to MAR
    // The manifest is the source of truth - sync all samples with UUIDs to their voice MAR files
    // This replaces the old temp MAR merge approach which was fragile
    const languages = getLanguagesFromCourseCode(courseCode);
    const marSyncStats = await marService.syncManifestToMAR(
      manifest,
      voiceAssignments,
      languages.target,
      languages.source
    );

    // 10. Sync canonical resources from S3 before checking encouragements/welcome
    // This ensures we have the latest encouragements.json and welcomes.json
    await syncCanonicalFromS3();

    // 11. Handle encouragements (after Phase A + B complete, after MAR sync)
    // Check if they exist, generate if needed, add to MAR + manifest
    let encouragementData = null;
    if (phase === 'auto' || phase === 'presentations') {
      encouragementData = await handleEncouragements(
        languages.source,
        voiceAssignments,
        manifest,
        { skipUpload, uploadBucket }
      );

      if (encouragementData.generated > 0) {
        totalGenerated += encouragementData.generated;
      }

      allDurations = { ...allDurations, ...encouragementData.durations };

      // Add encouragements to manifest right away
      if (encouragementData.encouragements.length > 0) {
        await encouragementService.addEncouragementsToManifest(manifest, encouragementData.encouragements, languages.source);
      }
    }

    // 12. Handle welcome (after encouragements, uses synced welcomes.json)
    // Check if it exists, generate if needed, update manifest
    let welcomeData = null;
    if (phase === 'auto' || phase === 'presentations') {
      welcomeData = await handleWelcome(
        courseCode,
        languages.source,
        voiceAssignments,
        manifest,
        { skipUpload, uploadBucket }
      );

      if (welcomeData.generated) {
        totalGenerated += 1;
      }

      if (welcomeData.uuid && welcomeData.duration) {
        allDurations[welcomeData.uuid] = welcomeData.duration;
      }
    }

    // 13. Re-expand deduplicated samples (restore original variants)
    // Now MAR is merged, so re-expansion can find all UUIDs
    await reExpandSamples(manifest, courseCode);

    // 14. Reassign UUIDs from MAR for expanded samples
    // The expanded samples (like "Hablo") have empty IDs, so we look them up in MAR
    // MAR will normalize "Hablo" -> "hablo" and assign the correct UUID
    console.log('\nReassigning UUIDs for expanded samples from MAR...');
    const expandReassignStats = await reassignUUIDsFromMAR(manifest, voiceAssignments, ['target1', 'target2', 'source', 'presentation']);
    console.log(`✓ Assigned ${expandReassignStats.assigned} UUIDs from MAR to expanded samples`);

    if (expandReassignStats.missing > 0) {
      console.warn(`⚠️  Warning: ${expandReassignStats.missing} expanded samples could not be matched in MAR`);
    }

    // Save manifest with expanded samples and assigned UUIDs
    await saveCourseManifest(courseCode, manifest);

    // 15. Extract durations from S3 for ALL samples (new + existing + encouragements + welcome)
    // This ensures consistency and verifies existing files
    const allSampleIds = collectAllSampleIds(manifest);

    // Add welcome UUID if it exists
    if (manifest.introduction && manifest.introduction.id) {
      allSampleIds.push(manifest.introduction.id);
    }

    const s3Durations = await extractDurationsFromS3(allSampleIds, uploadBucket);
    allDurations = { ...allDurations, ...s3Durations };

    // 16. Verify all required samples exist in S3
    const s3Verification = await verifyAllSamplesInS3(manifest, s3Durations, uploadBucket);
    if (!s3Verification.passed) {
      console.error('\n❌ S3 verification failed! Some samples are missing from S3.');
      console.error('This is a serious issue - the course cannot be published without all samples.');
      console.error(`Missing: ${s3Verification.missing.length} samples\n`);
      // Don't fail completely - user may want to investigate
    }

    // 17. Run final validation checks (duplicates, empty seeds)
    const validationResults = runFinalValidationChecks(manifest);
    if (!validationResults.passed) {
      console.error('\n❌ Final validation failed! Issues found in course structure.');
      console.error('These should have been fixed earlier in the pipeline.');
      console.error('Please review and fix before publishing to testers.\n');
      // Don't fail completely - user may want to investigate
    }

    // 18. Update manifest with S3-verified durations
    updateManifestDurations(manifest, allDurations);

    // Also update introduction duration if present
    if (manifest.introduction && manifest.introduction.id && allDurations[manifest.introduction.id]) {
      manifest.introduction.duration = allDurations[manifest.introduction.id];
    }

    // 19. Normalize roles (no-op: encouragements already added with role='presentation')
    normalizeManifestRoles(manifest);

    // 20. Version management
    // AGENT INSTRUCTION: Ask user for version number before completing Phase 8.
    // - For NEW language pairs (first time SSi has done this language): use 1.0.0
    // - For existing language pairs: user will know the appropriate version
    // The version is stored in manifest.course_version
    // Current version: ${manifest.course_version || 'not set'}
    console.log('\n=== Version Check ===');
    console.log(`Current manifest version: ${manifest.course_version || 'not set'}`);
    console.log('NOTE: Claude Code should ask user what version to set before saving.\n');

    await saveCourseManifest(courseCode, manifest);
    console.log('\nManifest updated with S3-verified durations');

    // 21. Cleanup temp files (optional)
    if (cleanupTemp) {
      console.log('\nCleaning up temp files...');
      await fs.remove(AUDIO_TEMP_DIR);
    } else {
      console.log(`\nTemp files preserved in: ${AUDIO_TEMP_DIR}`);
    }

    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Phase 8 Complete`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Generated: ${totalGenerated} | Matched: ${matched.length}`);
    if (totalQCFlagged > 0) {
      console.log(`⚠️  QC Flagged: ${totalQCFlagged} samples (review reports)`);
    }
    if (!s3Verification.passed) {
      console.log(`❌ S3 Verification: ${s3Verification.missing.length} samples missing`);
    } else {
      console.log(`✓ S3 Verification: All ${s3Verification.verified} samples verified`);
    }
    if (!validationResults.passed) {
      console.log(`❌ Validation: ${validationResults.errors.join(', ')}`);
    } else {
      console.log(`✓ Validation: No duplicates or empty seeds`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return {
      success: true,
      generated: totalGenerated,
      matched: matched.length,
      qcFlagged: totalQCFlagged,
      s3Verification,
      validationResults
    };

  } catch (error) {
    console.error(`\nPhase 8 Error: ${error.message}`);
    console.error(error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate and display execution plan
 */
async function showPlan(courseCode, options = {}) {
  console.log(`\nAnalyzing ${courseCode}...\n`);

  const manifest = await loadCourseManifest(courseCode);
  const voiceRegistry = await loadVoiceRegistry();

  const plan = await planner.generateExecutionPlan(courseCode, manifest, voiceRegistry, options);

  const formatted = planner.formatPlan(plan);
  console.log(formatted);

  if (plan.warnings.length > 0) {
    console.log('\n⚠️  ATTENTION: Review warnings above before proceeding!\n');
  }

  console.log('NEXT STEPS');
  console.log('-'.repeat(10));
  console.log(`To proceed with this plan:`);
  console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --execute\n`);
  console.log(`To adjust ElevenLabs tier estimate:`);
  console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --plan --elevenlabs-tier=pro\n`);
  console.log(`To save this plan:`);
  console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --plan --save\n`);

  // Save plan if requested
  if (options.savePlan) {
    const planPath = path.join(VFS_BASE, 'courses', courseCode, 'audio_generation_plan.json');
    await fs.writeJson(planPath, plan, { spaces: 2 });
    console.log(`Plan saved to: ${planPath}\n`);
  }

  return plan;
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Phase 8: Audio Generation

Usage:
  node scripts/phase8-audio-generation.cjs <course_code> [options]

Modes:
  --plan                 Generate execution plan (cost/time estimates) - DON'T execute
  --execute              Execute audio generation (use after reviewing plan)

Planning Options:
  --elevenlabs-tier=<tier>    ElevenLabs tier for cost estimates (creator, pro, etc.)
  --elevenlabs-usage=<chars>  Current monthly usage in characters
  --save                      Save plan to course directory
  --skip-sync                 Skip S3 sync during preflight
  --skip-dedup                Skip deduplication during preflight
  --ignore-preflight-errors   Show plan even if preflight fails (not recommended)

Execution Options:
  --phase=<phase>        Which phase to run (targets, presentations, auto)
                         - targets: Phase A only (target1, target2, source)
                         - presentations: Phase B only (requires Phase A complete)
                         - auto: Both phases with QC gates (default)
  --continue-processing  Continue processing Phase A after QC approval
  --regenerate=<uuids>   Regenerate specific samples (comma-separated UUIDs)
  --skip-qc              Skip QC pause (auto-approve and continue)
  --skip-upload          Skip S3 upload (for testing)
  --ignore-download-errors  Continue even if target downloads fail from S3
  --prod                 Upload to production bucket instead of stage
  --keep-temp            Don't delete temp files after completion
  --block-tts            Block all TTS generation (fail if TTS would be required)

Voice Selection (for new courses):
  If no voices are configured, the script will error and instruct you to
  ask Claude Code for help. Claude Code will help you discover available
  voices and choose the best ones interactively.

Examples:
  # Generate plan first (RECOMMENDED)
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --plan

  # Typical Claude Code workflow:
  # 1. Run Phase A
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --execute --phase=targets
  # 2. Ask Claude Code to review QC report
  # 3. If needed, regenerate specific samples
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --execute --regenerate=uuid1,uuid2
  # 4. Continue processing after approval
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --execute --continue-processing
  # 5. Run Phase B
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --execute --phase=presentations

  # Skip QC pause for testing
  node scripts/phase8-audio-generation.cjs ita_for_eng_10seeds --execute --skip-qc

Features:
  ✓ Two-phase generation with QC gates
  ✓ Phase A: Core vocabulary (target1, target2, source)
  ✓ Phase B: Presentations (requires Phase A samples on S3)
  ✓ QC checkpoint BEFORE processing/upload
  ✓ User approval gates for quality control
  ✓ Cost and time estimates before execution
  ✓ Comprehensive error handling with retry logic
  ✓ Cadence-based audio processing (slow for learners, natural for teachers)
  ✓ S3-based duration verification
  ✓ Deduplication via Master Audio Registry (MAR)
  ✓ Claude Code assisted voice selection for new courses
    `);
    process.exit(0);
  }

  const courseCode = args[0];

  // Parse custom option values
  const getArgValue = (prefix) => {
    const arg = args.find(a => a.startsWith(prefix));
    return arg ? arg.split('=')[1] : null;
  };

  // Determine mode
  const isPlanMode = args.includes('--plan');
  const isExecuteMode = args.includes('--execute');

  if (isPlanMode) {
    // Planning mode - run preflight first, then analyze and show estimates

    const ignorePreflightErrors = args.includes('--ignore-preflight-errors');
    const skipSync = args.includes('--skip-sync');
    const skipDedup = args.includes('--skip-dedup');

    // Run unified preflight (S3 sync + preflight checks + deduplication)
    console.log('\n📋 Running preflight checks before showing plan...\n');
    const preflightResult = await runAudioGenPreflight(courseCode, {
      skipSync,
      skipDedup,
      autoFix: true,
      verbose: true
    });

    if (!preflightResult.success && !ignorePreflightErrors) {
      console.error('\n❌ Preflight failed. Fix the issues above before running --plan.\n');

      if (preflightResult.agentActions.length > 0) {
        console.log('🤖 Agent actions required:');
        preflightResult.agentActions.forEach(a => {
          console.log(`   ${a.service}: ${a.action}`);
        });
        console.log();
      }

      console.log('To bypass preflight (not recommended):');
      console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --plan --ignore-preflight-errors\n`);

      process.exit(1);
    }

    if (!preflightResult.success && ignorePreflightErrors) {
      console.warn('\n⚠️  Proceeding despite preflight errors (--ignore-preflight-errors)\n');
    }

    // Check actual ElevenLabs tier from API (unless overridden by command line)
    let elevenLabsTier = getArgValue('--elevenlabs-tier');
    let elevenLabsUsage = parseInt(getArgValue('--elevenlabs-usage')) || 0;
    let elevenLabsQuota = null;

    if (!elevenLabsTier) {
      try {
        console.log('Checking ElevenLabs subscription tier...');
        const userInfo = await elevenlabsService.getUserInfo();
        elevenLabsTier = userInfo.tier;
        elevenLabsUsage = userInfo.characterCount;
        elevenLabsQuota = userInfo.characterLimit;
        console.log(`✓ Detected: ${userInfo.tier} tier (${userInfo.characterCount.toLocaleString()}/${userInfo.characterLimit.toLocaleString()} chars used)\n`);
      } catch (error) {
        console.warn(`⚠️  Could not fetch ElevenLabs tier: ${error.message}`);
        console.warn(`Defaulting to 'creator' tier. Use --elevenlabs-tier to override.\n`);
        elevenLabsTier = 'creator';
      }
    }

    const planOptions = {
      elevenLabsTier,
      elevenLabsUsage,
      elevenLabsQuota,
      savePlan: args.includes('--save')
    };

    await showPlan(courseCode, planOptions);
    process.exit(0);

  } else if (isExecuteMode) {
    // Check ElevenLabs usage before starting generation
    try {
      console.log('Checking ElevenLabs subscription status...');
      const userInfo = await elevenlabsService.getUserInfo();
      const percentUsed = ((userInfo.characterCount / userInfo.characterLimit) * 100).toFixed(1);
      console.log(`✓ ${userInfo.tier} tier: ${userInfo.characterCount.toLocaleString()}/${userInfo.characterLimit.toLocaleString()} chars used (${percentUsed}%)\n`);

      if (userInfo.characterCount > userInfo.characterLimit * 0.9) {
        console.warn(`⚠️  WARNING: You've used ${percentUsed}% of your monthly quota. Generation may exceed limit.\n`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not fetch ElevenLabs usage: ${error.message}`);
      console.warn(`Proceeding anyway...\n`);
    }

    // Check for special execution modes
    const continueProcessing = args.includes('--continue-processing');
    const regenerateArg = getArgValue('--regenerate');

    const execOptions = {
      skipUpload: args.includes('--skip-upload'),
      uploadBucket: args.includes('--prod') ? s3Service.PROD_BUCKET : s3Service.STAGE_BUCKET,
      cleanupTemp: !args.includes('--keep-temp'),
      skipQC: args.includes('--skip-qc'),
      sequential: args.includes('--sequential'), // Use sequential generation instead of parallel
      blockTTS: args.includes('--block-tts'), // Block all TTS generation - fail if any would be required
      ignoreDownloadErrors: args.includes('--ignore-download-errors') // Continue even if target downloads fail
    };

    let result;

    if (continueProcessing) {
      // Continue Phase A processing after QC approval
      result = await continuePhaseAProcessing(courseCode, execOptions);
    } else if (regenerateArg) {
      // Regenerate specific samples
      const uuids = regenerateArg.split(',').map(u => u.trim());
      result = await regenerateSamples(courseCode, uuids, execOptions);
    } else {
      // Normal generation workflow
      const phaseArg = getArgValue('--phase') || 'auto';
      const validPhases = ['targets', 'source', 'presentations', 'auto'];

      if (!validPhases.includes(phaseArg)) {
        console.error(`\n⚠️  ERROR: Invalid phase '${phaseArg}'. Must be: targets, source, presentations, or auto\n`);
        process.exit(1);
      }

      execOptions.phase = phaseArg;
      result = await generateAudioForCourse(courseCode, execOptions);
    }

    // Validate manifest structure after successful execution
    if (result.success) {
      console.log('\n--- Manifest Structure Validation ---');
      const structureResult = structureValidator.validateCourse(courseCode);
      if (!structureResult.valid) {
        console.log('⚠️  MANIFEST STRUCTURE ISSUES:');
        structureResult.issues.forEach(i => console.log(`  - ${i}`));
        console.log('\nRun: node tools/validators/manifest-structure-validator.cjs ' + courseCode);
      } else {
        console.log('✓ Manifest structure validated');
      }
    }

    process.exit(result.success ? 0 : 1);

  } else {
    // No mode specified - show warning and suggest plan mode
    console.error('\n⚠️  ERROR: Must specify either --plan or --execute mode\n');
    console.log('RECOMMENDED: Start with --plan to review costs and time estimates:\n');
    console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --plan\n`);
    console.log('Then execute after reviewing:\n');
    console.log(`  node scripts/phase8-audio-generation.cjs ${courseCode} --execute\n`);
    console.log('Or use --help for more options\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateAudioForCourse,
  continuePhaseAProcessing,
  regenerateSamples,
  loadCourseManifest,
  getVoiceAssignments,
  analyzeRequiredGeneration,
  discoverAndAssignVoices,
  loadVoiceRegistry,
  saveVoiceRegistry
};
