/**
 * Phase 8: Audio Generation Orchestrator
 *
 * Main pipeline for generating, processing, and uploading audio samples.
 * Integrates Azure TTS, ElevenLabs, audio processing, and S3 services.
 */

require('dotenv').config();

const fs = require('fs-extra');
const path = require('path');
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
const { createQCReviewDirectory } = require('./create-qc-review.cjs');

// Configuration
const VFS_BASE = path.join(__dirname, '../vfs');
const AUDIO_TEMP_DIR = path.join(__dirname, '../temp/audio');
const VOICES_REGISTRY = path.join(__dirname, '../vfs/canonical/voices.json');

/**
 * Normalize text for matching (strip punctuation, lowercase)
 */
function normalizeText(text) {
  return text.replace(/[^\w\s'-]/g, '').toLowerCase().trim();
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
 * Match samples against MAR and identify missing ones
 * Includes encouragements in the analysis
 */
async function analyzeRequiredGeneration(manifest, courseCode, voiceAssignments) {
  const variants = collectSampleVariants(manifest);
  const toGenerate = [];
  const matched = [];

  // Get course language info (v2.0.0 format has target/known at top level)
  const targetLang = manifest.target;
  const knownLang = manifest.known;

  // Check regular samples
  for (const variant of variants) {
    const voiceId = voiceAssignments[variant.role];

    if (!voiceId) {
      console.warn(`No voice assigned for role: ${variant.role}`);
      continue;
    }

    // Determine language for this role
    const language = ['target1', 'target2'].includes(variant.role) ? targetLang : knownLang;

    // Load voice-specific MAR
    const voiceSamples = await marService.loadVoiceSamples(voiceId);

    // Try to find existing sample
    const existing = marService.findExistingSample(
      voiceSamples,
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
        duration: existing.duration,
        voiceId
      });

      // Update manifest with existing UUID and duration
      const samples = manifest.slices?.[0]?.samples || {};
      const variantInManifest = samples[variant.text]?.find(
        v => v.role === variant.role && v.cadence === variant.cadence
      );
      if (variantInManifest) {
        variantInManifest.id = existing.uuid;
        variantInManifest.duration = existing.duration;
      }
    } else {
      // Need to generate
      const newUUID = uuidService.generateSampleUUID(
        variant.text,
        language,
        variant.role,
        variant.cadence
      );

      toGenerate.push({
        text: variant.text,
        role: variant.role,
        cadence: variant.cadence,
        uuid: newUUID,
        voiceId,
        language
      });

      // Update manifest with new UUID (duration will be set after generation)
      const samples = manifest.slices?.[0]?.samples || {};
      const variantInManifest = samples[variant.text]?.find(
        v => v.role === variant.role && v.cadence === variant.cadence
      );
      if (variantInManifest) {
        variantInManifest.id = newUUID;
      }
    }
  }

  // Note: Encouragements are NOT checked here
  // They are checked/generated at the very end (after Phase A + B)
  // This keeps the flow simpler and allows them to be added to manifest
  // right before the final S3 check

  return { toGenerate, matched };
}

/**
 * Generate audio using appropriate TTS service
 */
async function generateAudioFile(sample, voiceDetails, outputPath) {
  const { text, role, voiceId, cadence } = sample;
  const { provider, provider_id, processing } = voiceDetails;

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
 */
async function generateMissingAudio(toGenerate) {
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
          const outputPath = path.join(AUDIO_TEMP_DIR, `${sample.uuid}.mp3`);

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

  // Extract durations from raw generated files (before processing)
  const durations = {};
  for (const result of generationResults) {
    if (!result.success) continue;

    try {
      const duration = await audioProcessor.getAudioDuration(result.outputPath);
      durations[result.sample.uuid] = duration;
    } catch (error) {
      console.warn(`Failed to extract duration for ${result.sample.uuid}: ${error.message}`);
    }
  }

  // Flag samples for review
  const flaggedSamples = qcService.flagSamplesForReview(generationResults, durations);

  if (flaggedSamples.length === 0) {
    console.log('✓ No quality issues detected\n');
    return { flagged: [], durations };
  }

  console.log(`⚠️  Flagged ${flaggedSamples.length} samples for review\n`);

  // Generate QC report
  const qcReportPath = path.join(VFS_BASE, 'courses', courseCode, 'qc_report_raw.json');
  const { jsonPath, mdPath } = qcService.generateQCReport(flaggedSamples, qcReportPath, uploadBucket);

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

  // Create mock results for processing
  const results = mp3Files.map(filename => ({
    success: true,
    outputPath: path.join(rawDir, filename),
    sample: {
      uuid: path.basename(filename, '.mp3'),
      voiceId: 'unknown' // Will be loaded from manifest if needed
    }
  }));

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

  // Find samples by UUID
  for (const uuid of uuids) {
    let found = false;
    for (const [text, variants] of Object.entries(samples)) {
      for (const variant of variants) {
        if (variant.uuid === uuid) {
          // Reconstruct sample object for generation
          const voiceKey = {
            'target1': voiceAssignments.target1,
            'target2': voiceAssignments.target2,
            'source': voiceAssignments.source,
            'presentation': voiceAssignments.presentation
          }[variant.role];

          samplesToRegenerate.push({
            uuid,
            text,
            role: variant.role,
            cadence: variant.cadence,
            language: variant.language,
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
  const generationResults = await generateMissingAudio(samplesToRegenerate);
  const successCount = generationResults.filter(r => r.success).length;

  console.log(`\nRegenerated: ${successCount}/${samplesToRegenerate.length} samples\n`);

  // Run QC on regenerated samples
  const { flagged, durations } = await runQCCheckpoint(
    generationResults,
    courseCode,
    options.uploadBucket || s3Service.STAGE_BUCKET
  );

  console.log(`QC Results: ${flagged.length} samples flagged\n`);

  return {
    success: true,
    regenerated: successCount,
    qcFlagged: flagged.length,
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

  // Get encouragement messages from manifest
  const phrases = encouragementService.getEncouragementPhrases(manifest);

  if (phrases.length === 0) {
    console.log('No encouragements found in manifest - skipping\n');
    return {
      encouragements: [],
      durations: {},
      generated: 0
    };
  }

  console.log(`Found ${phrases.length} encouragement messages in manifest\n`);

  // Get encouragement voice
  const encouragementVoice = encouragementService.getEncouragementVoice(sourceLanguage, voiceAssignments);
  console.log(`Encouragement voice: ${encouragementVoice}\n`);

  // Check which encouragements already exist in MAR
  const { existing, missing } = await encouragementService.checkExistingEncouragements(
    sourceLanguage,
    encouragementVoice,
    phrases
  );

  console.log(`Existing in MAR: ${existing.length}/${phrases.length}`);
  console.log(`Need to generate: ${missing.length}\n`);

  let generatedResults = [];
  let allDurations = {};

  // Add existing durations
  for (const enc of existing) {
    allDurations[enc.uuid] = enc.duration;
  }

  // Generate missing encouragements
  if (missing.length > 0) {
    const tempDir = path.join(AUDIO_TEMP_DIR, 'encouragements');

    // Generate
    const genResults = await encouragementService.generateEncouragements(
      missing,
      encouragementVoice,
      sourceLanguage,
      tempDir
    );

    // Process
    const processResults = await encouragementService.processEncouragements(genResults);

    // Upload and register in MAR
    const uploadDurations = await encouragementService.uploadAndRegisterEncouragements(
      processResults,
      encouragementVoice,
      sourceLanguage,
      options.uploadBucket || s3Service.STAGE_BUCKET
    );

    // Merge durations
    allDurations = { ...allDurations, ...uploadDurations };

    generatedResults = genResults;
  }

  console.log(`✓ All encouragements ready (${existing.length + generatedResults.filter(r => r.success).length}/${phrases.length})\n`);

  // Return encouragement data for later manifest integration
  const allEncouragements = [
    ...existing.map(e => ({
      text: e.text,
      uuid: e.uuid,
      duration: e.duration,
      language: sourceLanguage
    })),
    ...generatedResults.filter(r => r.success).map(r => ({
      text: r.encouragement.text,
      uuid: r.encouragement.uuid,
      duration: allDurations[r.encouragement.uuid],
      language: sourceLanguage
    }))
  ];

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
    console.log('⚠️  No welcome found in registry - skipping\n');
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

async function uploadToS3(processResults, bucket = s3Service.STAGE_BUCKET) {
  console.log(`\n=== Uploading to S3 (${bucket}) ===\n`);

  const uploadResults = [];

  for (const result of processResults) {
    if (!result.success) continue;

    const uuid = path.basename(result.output, '.mp3');

    try {
      const s3Result = await s3Service.uploadAudioFile(uuid, result.output, bucket);

      console.log(`Uploaded: ${s3Result.url}`);

      uploadResults.push({
        success: true,
        uuid,
        url: s3Result.url
      });
    } catch (error) {
      console.error(`Failed to upload ${uuid}: ${error.message}`);

      uploadResults.push({
        success: false,
        uuid,
        error: error.message
      });
    }
  }

  return uploadResults;
}

/**
 * Update MAR with newly generated samples
 */
async function updateMAR(generationResults, durations) {
  console.log('\n=== Updating MAR ===\n');

  for (const result of generationResults) {
    if (!result.success) continue;

    const { sample } = result;
    const duration = durations[sample.uuid];

    if (!duration) {
      console.warn(`No duration found for ${sample.uuid}, skipping MAR update`);
      continue;
    }

    try {
      await marService.saveSample(sample.voiceId, sample.uuid, {
        text: sample.text,
        language: sample.language,
        role: sample.role,
        cadence: sample.cadence,
        duration,
        filename: `${sample.uuid}.mp3`
      });

      console.log(`MAR updated: ${sample.voiceId} / ${sample.uuid}`);
    } catch (error) {
      console.error(`Failed to update MAR for ${sample.uuid}: ${error.message}`);
    }
  }
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

  // 1. Generate audio
  const generationResults = await generateMissingAudio(phaseASamples);
  const successCount = generationResults.filter(r => r.success).length;
  console.log(`\nGenerated: ${successCount}/${phaseASamples.length} files`);

  if (successCount === 0) {
    throw new Error('No audio files were successfully generated in Phase A');
  }

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
  console.log(`Samples to generate: ${phaseBSamples.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (phaseBSamples.length === 0) {
    console.log('✓ All Phase B samples already exist\n');
    return { success: true, generated: 0, skipped: true };
  }

  // 1. Download required target files from S3
  const { downloaded, missing } = await downloadTargetFilesFromS3(manifest, options.uploadBucket);

  if (missing.length > 0) {
    throw new Error(
      `Cannot proceed with Phase B: ${missing.length} required target files missing from S3. ` +
      `Run Phase A first and ensure all samples are uploaded.`
    );
  }

  console.log(`✓ All ${downloaded.length} required target files available\n`);

  // 2. Generate presentation audio
  const generationResults = await generateMissingAudio(phaseBSamples);
  const successCount = generationResults.filter(r => r.success).length;
  console.log(`\nGenerated: ${successCount}/${phaseBSamples.length} files`);

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
    phase = 'auto' // 'targets', 'presentations', or 'auto'
  } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase 8: Audio Generation for ${courseCode}`);
  if (phase !== 'auto') {
    console.log(`Mode: ${phase === 'targets' ? 'Phase A Only' : 'Phase B Only'}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Run pre-flight checks
    const preflightResults = await preflightCheck.runPreflightChecks({ verbose: true });

    if (!preflightResults.allPassed) {
      console.error('\n❌ Pre-flight checks failed. Please fix the issues above before continuing.\n');
      return {
        success: false,
        error: 'Pre-flight checks failed',
        details: preflightResults
      };
    }

    console.log('✅ All pre-flight checks passed. Proceeding with audio generation...\n');

    // 1. Load course manifest
    console.log('Loading course manifest...');
    const manifest = await loadCourseManifest(courseCode);
    const sampleCount = Object.keys(manifest.slices?.[0]?.samples || {}).length;
    console.log(`Loaded: ${sampleCount} unique phrases\n`);

    // 2. Normalize cadences based on roles
    normalizeCadences(manifest);

    // 3. Get voice assignments
    console.log('Loading voice assignments...');
    const voiceAssignments = await getVoiceAssignments(courseCode);
    console.log('Voice assignments:', voiceAssignments, '\n');

    // 4. Analyze what needs to be generated
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

    // 5. Split samples by phase
    const { phaseA, phaseB } = splitSamplesByPhase(toGenerate);
    console.log(`Phase A (targets + source): ${phaseA.length} samples`);
    console.log(`Phase B (presentations): ${phaseB.length} samples\n`);

    let totalGenerated = 0;
    let totalQCFlagged = 0;
    let allDurations = {};

    // 6. Execute Phase A (targets + source)
    if (phase === 'auto' || phase === 'targets') {
      const resultA = await executePhaseA(phaseA, courseCode, { skipUpload, uploadBucket, skipQC });
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
    }

    // 7. Execute Phase B (presentations)
    if (phase === 'auto' || phase === 'presentations') {
      const resultB = await executePhaseB(phaseB, manifest, courseCode, { skipUpload, uploadBucket, skipQC });
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

    // 8. Handle encouragements (after Phase A + B complete)
    // Check if they exist, generate if needed, add to MAR + manifest
    // This happens AFTER all regular samples so they can be added right before S3 check
    let encouragementData = null;
    if (phase === 'auto' || phase === 'presentations') {
      const languages = getLanguagesFromCourseCode(courseCode);
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

      // Add encouragements to manifest right away (before S3 check)
      if (encouragementData.encouragements.length > 0) {
        encouragementService.addEncouragementsToManifest(manifest, encouragementData.encouragements);
      }
    }

    // 8b. Handle welcome (after Phase A + B complete, before S3 check)
    // Check if it exists, generate if needed, update manifest
    let welcomeData = null;
    if (phase === 'auto' || phase === 'presentations') {
      const languages = getLanguagesFromCourseCode(courseCode);
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

    // 9. Extract durations from S3 for ALL samples (new + existing + encouragements + welcome)
    // This ensures consistency and verifies existing files
    const allSampleIds = collectAllSampleIds(manifest);

    // Add welcome UUID if it exists
    if (manifest.introduction && manifest.introduction.id) {
      allSampleIds.push(manifest.introduction.id);
    }

    const s3Durations = await extractDurationsFromS3(allSampleIds, uploadBucket);
    allDurations = { ...allDurations, ...s3Durations };

    // 10. Update manifest with S3-verified durations
    updateManifestDurations(manifest, allDurations);

    // Also update introduction duration if present
    if (manifest.introduction && manifest.introduction.id && allDurations[manifest.introduction.id]) {
      manifest.introduction.duration = allDurations[manifest.introduction.id];
    }

    // 10a. Normalize roles (no-op: encouragements already added with role='presentation')
    normalizeManifestRoles(manifest);

    // 10b. Version management - SKIPPED (see note below)
    // NOTE: Version management is complex and handled separately.
    // New courses stay at 1.0.0 until published and tested.
    // Course updates/fixes require careful version strategy (separate project).
    // Auto-increment disabled - manual version control for now.

    await saveCourseManifest(courseCode, manifest);
    console.log('\nManifest updated with S3-verified durations');

    // 11. Cleanup temp files (optional)
    if (cleanupTemp) {
      console.log('\nCleaning up temp files...');
      await fs.remove(AUDIO_TEMP_DIR);
    } else {
      console.log(`\nTemp files preserved in: ${AUDIO_TEMP_DIR}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Phase 8 Complete`);
    console.log(`Generated: ${totalGenerated} | Matched: ${matched.length}`);
    if (totalQCFlagged > 0) {
      console.log(`⚠️  QC Flagged: ${totalQCFlagged} samples (review reports)`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return {
      success: true,
      generated: totalGenerated,
      matched: matched.length,
      qcFlagged: totalQCFlagged
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

Execution Options:
  --phase=<phase>        Which phase to run (targets, presentations, auto)
                         - targets: Phase A only (target1, target2, source)
                         - presentations: Phase B only (requires Phase A complete)
                         - auto: Both phases with QC gates (default)
  --continue-processing  Continue processing Phase A after QC approval
  --regenerate=<uuids>   Regenerate specific samples (comma-separated UUIDs)
  --skip-qc              Skip QC pause (auto-approve and continue)
  --skip-upload          Skip S3 upload (for testing)
  --prod                 Upload to production bucket instead of stage
  --keep-temp            Don't delete temp files after completion

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
    // Planning mode - analyze and show estimates
    const planOptions = {
      elevenLabsTier: getArgValue('--elevenlabs-tier') || 'creator',
      elevenLabsUsage: parseInt(getArgValue('--elevenlabs-usage')) || 0,
      savePlan: args.includes('--save')
    };

    await showPlan(courseCode, planOptions);
    process.exit(0);

  } else if (isExecuteMode) {
    // Check for special execution modes
    const continueProcessing = args.includes('--continue-processing');
    const regenerateArg = getArgValue('--regenerate');

    const execOptions = {
      skipUpload: args.includes('--skip-upload'),
      uploadBucket: args.includes('--prod') ? s3Service.PROD_BUCKET : s3Service.STAGE_BUCKET,
      cleanupTemp: !args.includes('--keep-temp'),
      skipQC: args.includes('--skip-qc')
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
      const validPhases = ['targets', 'presentations', 'auto'];

      if (!validPhases.includes(phaseArg)) {
        console.error(`\n⚠️  ERROR: Invalid phase '${phaseArg}'. Must be: targets, presentations, or auto\n`);
        process.exit(1);
      }

      execOptions.phase = phaseArg;
      result = await generateAudioForCourse(courseCode, execOptions);
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
