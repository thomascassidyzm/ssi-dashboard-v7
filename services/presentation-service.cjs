/**
 * Presentation Service (Simplified - No Explanations)
 *
 * Handles generation of presentation audio with concatenation
 * Format: "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"
 *
 * Audio structure: source TTS + target1 audio + target2 audio
 */

const fs = require('fs-extra');
const path = require('path');
const audioProcessor = require('./audio-processor.cjs');
const s3Service = require('./s3-service.cjs');
const elevenlabsService = require('./elevenlabs-service.cjs');
const azureTTS = require('./azure-tts-service.cjs');
const uuidService = require('./uuid-service.cjs');

/**
 * Generate TTS audio using the appropriate provider based on voice ID
 */
async function generateTTS(text, voiceDetails, outputPath, options = {}) {
  const isAzure = voiceDetails.provider === 'azure' ||
                  (voiceDetails.id && voiceDetails.id.startsWith('azure_'));

  if (isAzure) {
    await azureTTS.generateAudio(
      text,
      voiceDetails.provider_id,
      outputPath,
      {
        style: voiceDetails.style || 'friendly',
        rate: options.rate || '0%',
        pitch: options.pitch || '0%'
      }
    );
  } else {
    await elevenlabsService.generateAudioWithRetry(
      text,
      voiceDetails.provider_id,
      outputPath,
      {
        model: voiceDetails.model || elevenlabsService.MODELS.FLASH_V2_5,
        stability: voiceDetails.stability || 0.5,
        similarityBoost: voiceDetails.similarity_boost || 0.75,
        language: options.language || 'eng'
      }
    );
  }
}

/**
 * Extract all unique source text segments from presentation samples
 * Returns a set of unique segments to avoid regenerating the same narration
 */
function extractAllUniqueSegments(samples) {
  const uniqueSegments = new Set();
  const segmentMap = new Map();

  for (const sample of samples) {
    try {
      const { sourcePart } = parseMainPresentation(sample.text);
      uniqueSegments.add(sourcePart);
      segmentMap.set(sourcePart, (segmentMap.get(sourcePart) || 0) + 1);
    } catch (error) {
      console.warn(`Failed to parse presentation: ${sample.text.substring(0, 60)}`);
    }
  }

  return { uniqueSegments, segmentMap };
}

/**
 * Parse presentation to extract source narration and target word
 * Format: "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"
 */
function parseMainPresentation(text) {
  // Split on ": ... '"
  const parts = text.split(": ... '");
  if (parts.length !== 2) {
    throw new Error(`Could not find ': ... \\'' in presentation: ${text}`);
  }

  const sourcePart = parts[0].trim();
  const rest = parts[1];

  // Split on "' ... '"
  const targetParts = rest.split("' ... '");
  if (targetParts.length !== 2) {
    throw new Error(`Could not find '\\' ... \\'' in presentation: ${rest}`);
  }

  const targetPart = targetParts[0].trim();

  return { sourcePart, targetPart };
}

/**
 * Download target audio from S3 to local temp directory
 */
async function downloadTargetFromS3(uuid, targetDir, bucket) {
  await fs.ensureDir(targetDir);

  const localPath = path.join(targetDir, `${uuid}.mp3`);

  if (await fs.pathExists(localPath)) {
    return localPath;
  }

  try {
    await s3Service.downloadAudioFile(uuid, localPath, bucket);
    return localPath;
  } catch (error) {
    throw new Error(`Failed to download target ${uuid} from S3: ${error.message}`);
  }
}

/**
 * Generate presentation audio
 * Structure: source TTS + target1 + target2
 */
async function generatePresentationAudio(sample, manifest, voiceAssignments, options = {}) {
  const {
    tempDir = path.join(__dirname, '../temp/audio/presentations'),
    bucket = s3Service.STAGE_BUCKET,
    sourceLanguage = 'eng',
    targetLanguage = manifest.target,
    segmentCache = null
  } = options;

  const { text, uuid, voiceId } = sample;

  await fs.ensureDir(tempDir);

  const finalOutputPath = path.join(tempDir, `${uuid}.mp3`);
  const workDir = path.join(tempDir, `work_${uuid}`);

  try {
    await fs.ensureDir(workDir);

    // Step 1: Parse presentation
    const { sourcePart, targetPart } = parseMainPresentation(text);
    console.log(`  Source: "${sourcePart.substring(0, 60)}..."`);
    console.log(`  Target: "${targetPart}"`);

    // Step 2: Get or generate source narration TTS
    const sourceAudioPath = path.join(workDir, `${uuid}_source.mp3`);
    const voiceDetails = await getVoiceDetails(voiceId);

    if (segmentCache && segmentCache.has(sourcePart)) {
      console.log(`  Using cached source TTS`);
      await fs.copyFile(segmentCache.get(sourcePart), sourceAudioPath);
    } else {
      console.log(`  Generating source TTS (${voiceDetails.provider || 'elevenlabs'})`);
      await generateTTS(sourcePart, voiceDetails, sourceAudioPath, { language: sourceLanguage });
    }

    // Step 3: Download target1 and target2 from S3 using legacy UUID
    const targetLang = targetLanguage || manifest.target || manifest.course_code?.split('_')[0];

    const target1UUID = uuidService.generateLegacyUUID(targetPart, targetLang, 'target1', 'slow');
    const target2UUID = uuidService.generateLegacyUUID(targetPart, targetLang, 'target2', 'slow');

    console.log(`  Target1 UUID: ${target1UUID}`);
    console.log(`  Target2 UUID: ${target2UUID}`);

    const targetsDir = path.join(workDir, 'targets');
    await fs.ensureDir(targetsDir);

    const targetCacheDir = options.targetCacheDir;

    // Get target1
    let target1Path;
    if (targetCacheDir) {
      const cachedTarget1 = path.join(targetCacheDir, `${target1UUID}.mp3`);
      if (await fs.pathExists(cachedTarget1)) {
        target1Path = path.join(targetsDir, `${target1UUID}.mp3`);
        await fs.copyFile(cachedTarget1, target1Path);
        console.log(`  Using cached target1`);
      }
    }
    if (!target1Path) {
      console.log(`  Downloading target1 from S3`);
      target1Path = await downloadTargetFromS3(target1UUID, targetsDir, bucket);
    }

    // Get target2
    let target2Path;
    if (targetCacheDir) {
      const cachedTarget2 = path.join(targetCacheDir, `${target2UUID}.mp3`);
      if (await fs.pathExists(cachedTarget2)) {
        target2Path = path.join(targetsDir, `${target2UUID}.mp3`);
        await fs.copyFile(cachedTarget2, target2Path);
        console.log(`  Using cached target2`);
      }
    }
    if (!target2Path) {
      console.log(`  Downloading target2 from S3`);
      target2Path = await downloadTargetFromS3(target2UUID, targetsDir, bucket);
    }

    // Step 4: Concatenate: source + target1 + target2
    console.log(`  Concatenating audio...`);
    await audioProcessor.concatenateAudio(
      [sourceAudioPath, target1Path, target2Path],
      finalOutputPath,
      { pauseDuration: 1000, normalize: true }
    );

    console.log(`  ✓ Generated: ${uuid}.mp3`);

    return {
      success: true,
      outputPath: finalOutputPath,
      uuid,
      sample
    };

  } catch (error) {
    console.error(`  Error generating presentation ${uuid}: ${error.message}`);
    return {
      success: false,
      uuid,
      sample,
      error: error.message
    };
  } finally {
    try {
      await fs.remove(workDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create hash for segment text to use as filename
 */
function getSegmentHash(text) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(text).digest('hex').substring(0, 16);
}

/**
 * Generate all unique text segments in batch
 */
async function generateSegmentBatch(uniqueSegments, voiceId, tempDir, options = {}) {
  const segmentCache = new Map();
  const segmentsArray = Array.from(uniqueSegments);

  console.log(`\n=== Loading/Generating ${segmentsArray.length} unique narration segments ===`);

  await fs.ensureDir(tempDir);

  // Step 1: Load existing cached segments
  let loadedCount = 0;
  const toGenerate = [];

  for (const text of segmentsArray) {
    const hash = getSegmentHash(text);
    const segmentPath = path.join(tempDir, `seg_${hash}.mp3`);

    if (await fs.pathExists(segmentPath)) {
      segmentCache.set(text, segmentPath);
      loadedCount++;
    } else {
      toGenerate.push(text);
    }
  }

  console.log(`  Loaded ${loadedCount} existing segments from cache`);
  console.log(`  Need to generate ${toGenerate.length} new segments`);

  if (toGenerate.length === 0) {
    console.log(`✓ All segments already cached\n`);
    return segmentCache;
  }

  // Step 2: Generate missing segments
  const voice = await getVoiceDetails(voiceId);
  const MAX_CONCURRENT = 8;

  for (let i = 0; i < toGenerate.length; i += MAX_CONCURRENT) {
    const batch = toGenerate.slice(i, i + MAX_CONCURRENT);

    await Promise.all(
      batch.map(async (text, idx) => {
        const segmentNum = i + idx + 1;
        const hash = getSegmentHash(text);
        const segmentPath = path.join(tempDir, `seg_${hash}.mp3`);

        try {
          if (global.BLOCK_TTS) {
            console.error(`\n❌ BLOCKED: Segment TTS generation attempted with --block-tts flag!`);
            process.exit(1);
          }

          await generateTTS(text, voice, segmentPath, { language: options.sourceLanguage || 'eng' });
          segmentCache.set(text, segmentPath);

          if ((segmentNum) % 50 === 0) {
            console.log(`  Progress: ${segmentNum}/${toGenerate.length} segments`);
          }
        } catch (error) {
          console.error(`Failed to generate segment ${segmentNum}: ${error.message}`);
          throw error;
        }
      })
    );
  }

  console.log(`✓ Generated ${segmentCache.size} unique segments\n`);

  return segmentCache;
}

/**
 * Get voice details from voice registry
 */
async function getVoiceDetails(voiceId) {
  const voiceRegistry = await fs.readJson(
    path.join(__dirname, '../public/vfs/canonical/voices.json')
  );

  const voice = voiceRegistry.voices[voiceId];
  if (!voice) {
    throw new Error(`Voice not found: ${voiceId}`);
  }

  return voice;
}

/**
 * Load S3 audio index (list of UUIDs that exist in S3)
 */
async function loadS3AudioIndex() {
  const s3IndexPath = path.join(__dirname, '../temp/s3-audio-index.json');
  try {
    const index = await fs.readJson(s3IndexPath);
    return new Set(index.uuids || []);
  } catch (error) {
    console.warn(`Could not load s3-audio-index.json: ${error.message}`);
    return new Set();
  }
}

/**
 * Collect all unique target UUIDs required for presentations
 * Uses legacy UUID generation and checks against S3 index
 */
async function collectRequiredTargets(samples, manifest, s3UuidIndex = null) {
  if (!s3UuidIndex) {
    s3UuidIndex = await loadS3AudioIndex();
  }

  const requiredTargets = new Set();
  const missingTargets = [];
  const targetTextMap = new Map();

  const targetLang = manifest.target || manifest.course_code?.split('_')[0] || 'cmn';

  console.log(`Collecting targets (language: ${targetLang})`);
  console.log(`S3 index has ${s3UuidIndex.size} UUIDs`);

  for (const sample of samples) {
    try {
      const { targetPart } = parseMainPresentation(sample.text);

      const target1UUID = uuidService.generateLegacyUUID(targetPart, targetLang, 'target1', 'slow');
      const target2UUID = uuidService.generateLegacyUUID(targetPart, targetLang, 'target2', 'slow');

      if (s3UuidIndex.has(target1UUID)) {
        requiredTargets.add(target1UUID);
        targetTextMap.set(target1UUID, { text: targetPart, role: 'target1' });
      } else {
        missingTargets.push({
          presentationId: sample.id || sample.uuid,
          targetText: targetPart,
          role: 'target1',
          legacyUUID: target1UUID
        });
      }

      if (s3UuidIndex.has(target2UUID)) {
        requiredTargets.add(target2UUID);
        targetTextMap.set(target2UUID, { text: targetPart, role: 'target2' });
      } else {
        missingTargets.push({
          presentationId: sample.id || sample.uuid,
          targetText: targetPart,
          role: 'target2',
          legacyUUID: target2UUID
        });
      }
    } catch (error) {
      console.warn(`Failed to parse: ${sample.text.substring(0, 60)}`);
    }
  }

  return { requiredTargets, missingTargets, targetTextMap };
}

/**
 * Bulk download target files from S3 to local cache
 */
async function bulkDownloadTargets(targetUuids, cacheDir, bucket, concurrency = 10) {
  await fs.ensureDir(cacheDir);

  const uuidsArray = Array.isArray(targetUuids) ? targetUuids : Array.from(targetUuids);

  const toDownload = [];
  for (const uuid of uuidsArray) {
    const cachePath = path.join(cacheDir, `${uuid}.mp3`);
    if (!await fs.pathExists(cachePath)) {
      toDownload.push(uuid);
    }
  }

  const skipped = uuidsArray.length - toDownload.length;
  let downloaded = 0;
  let failed = 0;

  console.log(`\nBulk downloading ${toDownload.length} target files (${skipped} already cached)...`);

  for (let i = 0; i < toDownload.length; i += concurrency) {
    const batch = toDownload.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (uuid) => {
        try {
          const cachePath = path.join(cacheDir, `${uuid}.mp3`);
          await s3Service.downloadAudioFile(uuid, cachePath, bucket);
          downloaded++;
        } catch (error) {
          console.warn(`  Failed to download ${uuid}: ${error.message}`);
          failed++;
        }
      })
    );

    if ((i + concurrency) % 100 === 0 || i + concurrency >= toDownload.length) {
      console.log(`  Downloaded: ${Math.min(i + concurrency, toDownload.length)}/${toDownload.length}`);
    }
  }

  console.log(`✓ Downloaded ${downloaded} files, ${skipped} cached, ${failed} failed\n`);

  return { downloaded, skipped, failed };
}

module.exports = {
  parseMainPresentation,
  downloadTargetFromS3,
  generatePresentationAudio,
  getVoiceDetails,
  extractAllUniqueSegments,
  generateSegmentBatch,
  collectRequiredTargets,
  bulkDownloadTargets,
  loadS3AudioIndex
};
