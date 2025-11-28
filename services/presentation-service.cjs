/**
 * Presentation Service
 *
 * Handles generation of presentation audio with concatenation
 * Presentations consist of:
 * 1. Main presentation: source narration + target1 + target2
 * 2. Optional explanation: source narration with embedded {target1}/{target2} clips
 *
 * Format: "The Spanish for 'I want', is: ... 'quiero' ... 'quiero' - [optional explanation]"
 */

const fs = require('fs-extra');
const path = require('path');
const audioProcessor = require('./audio-processor.cjs');
const s3Service = require('./s3-service.cjs');
const elevenlabsService = require('./elevenlabs-service.cjs');

/**
 * Extract all unique text segments from presentation samples
 * Returns a map of unique segments to avoid regenerating the same narration
 *
 * @param {Array<Object>} samples - Array of presentation samples
 * @returns {Object} { uniqueSegments: Set, segmentMap: Map }
 */
function extractAllUniqueSegments(samples) {
  const uniqueSegments = new Set();
  const segmentMap = new Map(); // text -> count

  for (const sample of samples) {
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
            // Skip punctuation-only segments
            const textContent = segment.content.replace(/[^\w\s]/g, '').trim();
            if (textContent) {
              uniqueSegments.add(segment.content);
              segmentMap.set(segment.content, (segmentMap.get(segment.content) || 0) + 1);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse presentation for segment extraction: ${sample.text.substring(0, 60)}`);
    }
  }

  return { uniqueSegments, segmentMap };
}

/**
 * Parse presentation text into main and optional explanation parts
 *
 * @param {string} phrase - Full presentation text
 * @returns {Object} { mainPresentation, explanation }
 */
function parsePresentation(phrase) {
  // The standard presentation format ends with "... '[target]' ... '[target]'"
  // Find the first " - " after this pattern to split main from explanation
  const presentationPattern = /^(.*?\.\.\. '[^']+' \.\.\. '[^']+')(.*)$/;
  const match = phrase.match(presentationPattern);

  if (!match) {
    throw new Error(`Invalid presentation format: ${phrase}`);
  }

  const mainPresentation = match[1].trim();
  const remainder = match[2].trim();

  // Check if there's an explanation that starts with " - "
  let explanation = null;
  if (remainder.startsWith('-')) {
    explanation = remainder.substring(1).trim();
  } else if (remainder.length > 0) {
    // If there's content but no dash, it might be part of main presentation
    // This handles edge cases - return as explanation with warning
    console.warn(`Found trailing content without ' - ' separator: "${remainder}"`);
    explanation = remainder;
  }

  return { mainPresentation, explanation };
}

/**
 * Parse main presentation to extract source narration and target word
 *
 * Format: "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"
 *
 * @param {string} mainPresentation - Main presentation text
 * @returns {Object} { sourcePart, targetPart }
 */
function parseMainPresentation(mainPresentation) {
  // Split on ": ... '"
  const parts = mainPresentation.split(": ... '");
  if (parts.length !== 2) {
    throw new Error(`Could not find ': ... \\'' in main presentation: ${mainPresentation}`);
  }

  const sourcePart = parts[0].trim();
  const rest = parts[1];

  // Split on "' ... '"
  const targetParts = rest.split("' ... '");
  if (targetParts.length !== 2) {
    throw new Error(`Could not find '\\' ... \\'' in main presentation: ${rest}`);
  }

  const targetPart = targetParts[0].trim();

  return { sourcePart, targetPart };
}

/**
 * Extract target examples from explanation text
 * Finds patterns like {target1}'word' or {target2}'word'
 *
 * @param {string} explanation - Explanation text
 * @returns {Array<Object>} Array of { role, text, startPos, endPos }
 */
function extractTargetsFromExplanation(explanation) {
  const targets = [];

  // Pattern: {target1}'word' or {target2}'word'
  // Using back-references to handle apostrophes correctly
  const pattern = /\{(target1|target2)\}\s*(["'])(.*?)\2(?=[\s,.;:!?)]|$)/g;

  let match;
  while ((match = pattern.exec(explanation)) !== null) {
    targets.push({
      role: match[1],           // 'target1' or 'target2'
      text: match[3],           // The target word
      startPos: match.index,
      endPos: match.index + match[0].length
    });
  }

  return targets;
}

/**
 * Parse explanation into segments (text and target audio)
 *
 * @param {string} explanation - Explanation text with {target} markers
 * @returns {Array<Object>} Array of segments: { type: 'text'|'target', content }
 */
function parseExplanationSegments(explanation) {
  const targets = extractTargetsFromExplanation(explanation);

  if (targets.length === 0) {
    // No targets, entire explanation is text
    return [{ type: 'text', content: explanation }];
  }

  // Sort targets by position
  targets.sort((a, b) => a.startPos - b.startPos);

  const segments = [];
  let lastPosition = 0;

  for (const target of targets) {
    // Add text segment before this target (if any)
    if (target.startPos > lastPosition) {
      const textSegment = explanation.substring(lastPosition, target.startPos);
      segments.push({ type: 'text', content: textSegment });
    }

    // Add target segment
    segments.push({
      type: 'target',
      role: target.role,
      text: target.text
    });

    lastPosition = target.endPos;
  }

  // Add final text segment (if any)
  if (lastPosition < explanation.length) {
    const textSegment = explanation.substring(lastPosition);
    segments.push({ type: 'text', content: textSegment });
  }

  return segments;
}

/**
 * Find target sample in manifest by text and role
 *
 * @param {Object} manifest - Course manifest
 * @param {string} text - Target text to find
 * @param {string} role - Sample role ('target1', 'target2')
 * @returns {Object|null} Sample object with id, or null if not found
 */
function findTargetSample(manifest, text, role) {
  const samples = manifest.slices?.[0]?.samples || {};

  // Normalize text for matching (case-insensitive, trim whitespace, remove trailing punctuation)
  const normalizedText = text.toLowerCase().trim().replace(/[.!?]+$/, '');

  for (const [sampleText, variants] of Object.entries(samples)) {
    const normalizedSampleText = sampleText.toLowerCase().trim().replace(/[.!?]+$/, '');

    if (normalizedSampleText === normalizedText) {
      const variant = variants.find(v => v.role === role);
      if (variant && variant.id) {
        return { id: variant.id, text: sampleText, role: variant.role };
      }
    }
  }

  return null;
}

/**
 * Download target audio from S3 to local temp directory
 *
 * @param {string} uuid - Sample UUID
 * @param {string} targetDir - Local directory to save file
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<string>} Local file path
 */
async function downloadTargetFromS3(uuid, targetDir, bucket) {
  await fs.ensureDir(targetDir);

  const localPath = path.join(targetDir, `${uuid}.mp3`);

  // Check if already downloaded
  if (await fs.pathExists(localPath)) {
    return localPath;
  }

  // Download from S3
  const s3Key = `mastered/${uuid}.mp3`;

  try {
    await s3Service.downloadAudioFile(uuid, localPath, bucket);
    return localPath;
  } catch (error) {
    throw new Error(`Failed to download target ${uuid} from S3: ${error.message}`);
  }
}

/**
 * Generate presentation audio with concatenation
 *
 * Main workflow:
 * 1. Parse presentation into main + optional explanation
 * 2. Generate main presentation audio (source TTS + target1 + target2)
 * 3. If explanation exists, generate explanation audio (with embedded targets)
 * 4. Concatenate main + explanation with pause
 *
 * @param {Object} sample - Sample object with text, uuid, language, voiceId
 * @param {Object} manifest - Course manifest
 * @param {Object} voiceAssignments - Voice assignments by role
 * @param {Object} options - Generation options
 * @param {Map} options.segmentCache - Optional pre-generated segment cache (text -> file path)
 * @returns {Promise<Object>} { success, outputPath, uuid, error }
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
    const { mainPresentation, explanation } = parsePresentation(text);
    console.log(`  Main: "${mainPresentation.substring(0, 60)}..."`);
    if (explanation) {
      console.log(`  Explanation: "${explanation.substring(0, 60)}..."`);
    }

    console.log(`  [DEBUG] Work directory: ${workDir}`);

    // Step 2: Parse main presentation
    const { sourcePart, targetPart } = parseMainPresentation(mainPresentation);

    // Step 3: Get or generate source narration TTS
    const sourceAudioPath = path.join(workDir, `${uuid}_source.mp3`);
    const voiceDetails = await getVoiceDetails(voiceId);

    // Check segment cache first (if provided)
    if (segmentCache && segmentCache.has(sourcePart)) {
      console.log(`  [DEBUG] Using cached source TTS: "${sourcePart.substring(0, 60)}..."`);
      await fs.copyFile(segmentCache.get(sourcePart), sourceAudioPath);
    } else {
      console.log(`  [DEBUG] Generating source TTS: "${sourcePart.substring(0, 60)}..."`);
      await elevenlabsService.generateAudioWithRetry(
        sourcePart,
        voiceDetails.provider_id,
        sourceAudioPath,
        {
          model: voiceDetails.model || elevenlabsService.MODELS.FLASH_V2_5,
          stability: voiceDetails.stability || 0.5,
          similarityBoost: voiceDetails.similarity_boost || 0.75,
          language: sourceLanguage
        }
      );
      console.log(`  [DEBUG] Source TTS saved to: ${sourceAudioPath}`);
    }

    // Step 4: Download target1 and target2 from S3
    const target1Sample = findTargetSample(manifest, targetPart, 'target1');
    const target2Sample = findTargetSample(manifest, targetPart, 'target2');

    if (!target1Sample || !target2Sample) {
      throw new Error(`Could not find target samples for "${targetPart}"`);
    }

    const targetsDir = path.join(workDir, 'targets');
    await fs.ensureDir(targetsDir);

    // Check if we have a pre-downloaded targets cache
    const targetCacheDir = options.targetCacheDir;

    // Get target1
    let target1Path;
    if (targetCacheDir) {
      const cachedTarget1 = path.join(targetCacheDir, `${target1Sample.id}.mp3`);
      if (await fs.pathExists(cachedTarget1)) {
        target1Path = path.join(targetsDir, `${target1Sample.id}.mp3`);
        await fs.copyFile(cachedTarget1, target1Path);
        console.log(`  [DEBUG] Using cached target1: ${target1Sample.id}`);
      }
    }
    if (!target1Path) {
      console.log(`  [DEBUG] Downloading target1: ${target1Sample.id}`);
      target1Path = await downloadTargetFromS3(target1Sample.id, targetsDir, bucket);
      console.log(`  [DEBUG] Downloaded to: ${target1Path}`);
    }

    // Get target2
    let target2Path;
    if (targetCacheDir) {
      const cachedTarget2 = path.join(targetCacheDir, `${target2Sample.id}.mp3`);
      if (await fs.pathExists(cachedTarget2)) {
        target2Path = path.join(targetsDir, `${target2Sample.id}.mp3`);
        await fs.copyFile(cachedTarget2, target2Path);
        console.log(`  [DEBUG] Using cached target2: ${target2Sample.id}`);
      }
    }
    if (!target2Path) {
      console.log(`  [DEBUG] Downloading target2: ${target2Sample.id}`);
      target2Path = await downloadTargetFromS3(target2Sample.id, targetsDir, bucket);
      console.log(`  [DEBUG] Downloaded to: ${target2Path}`);
    }

    // Step 5: Concatenate main presentation
    const mainAudioPath = path.join(workDir, `${uuid}_main.mp3`);
    console.log(`  [DEBUG] Concatenating main: source + target1 + target2`);
    console.log(`  [DEBUG]   Source: ${sourceAudioPath}`);
    console.log(`  [DEBUG]   Target1: ${target1Path}`);
    console.log(`  [DEBUG]   Target2: ${target2Path}`);
    console.log(`  [DEBUG]   Output: ${mainAudioPath}`);

    await audioProcessor.concatenateAudio(
      [sourceAudioPath, target1Path, target2Path],
      mainAudioPath,
      { pauseDuration: 1000, normalize: true }
    );

    console.log(`  [DEBUG] Main concatenation complete`);

    // Step 6: Handle explanation if present
    if (explanation) {
      console.log(`  [DEBUG] Processing explanation with ${parseExplanationSegments(explanation).length} segments`);
      const segments = parseExplanationSegments(explanation);
      const segmentAudioPaths = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentPath = path.join(workDir, `segment_${i}.mp3`);

        if (segment.type === 'text') {
          // Skip segments that are only punctuation/whitespace
          const textContent = segment.content.replace(/[^\w\s]/g, '').trim();
          if (!textContent) {
            continue;
          }

          // Check segment cache first (if provided)
          if (segmentCache && segmentCache.has(segment.content)) {
            await fs.copyFile(segmentCache.get(segment.content), segmentPath);
          } else {
            // Generate TTS for text segment
            await elevenlabsService.generateAudioWithRetry(
              segment.content,
              voiceDetails.provider_id,
              segmentPath,
              {
                model: voiceDetails.model || elevenlabsService.MODELS.FLASH_V2_5,
                stability: voiceDetails.stability || 0.5,
                similarityBoost: voiceDetails.similarity_boost || 0.75,
                language: sourceLanguage
              }
            );
          }

          segmentAudioPaths.push(segmentPath);

        } else if (segment.type === 'target') {
          // Download target audio from S3
          const targetSample = findTargetSample(manifest, segment.text, segment.role);

          if (!targetSample) {
            console.warn(`  Warning: Could not find ${segment.role} sample for "${segment.text}"`);
            continue;
          }

          const targetPath = await downloadTargetFromS3(targetSample.id, targetsDir, bucket);

          // Copy to segment path
          await fs.copyFile(targetPath, segmentPath);
          segmentAudioPaths.push(segmentPath);
        }
      }

      if (segmentAudioPaths.length > 0) {
        // Concatenate explanation segments
        const explanationAudioPath = path.join(workDir, `${uuid}_explanation.mp3`);
        await audioProcessor.concatenateAudio(
          segmentAudioPaths,
          explanationAudioPath,
          { pauseDuration: 0, normalize: true } // No pause between explanation segments
        );

        // Concatenate main + explanation with 1s pause
        await audioProcessor.concatenateAudio(
          [mainAudioPath, explanationAudioPath],
          finalOutputPath,
          { pauseDuration: 1000, normalize: true }
        );
      } else {
        // No valid explanation segments, just use main audio
        await fs.copyFile(mainAudioPath, finalOutputPath);
      }
    } else {
      // No explanation, main audio is final
      console.log(`  [DEBUG] No explanation, copying main to final output`);
      console.log(`  [DEBUG]   From: ${mainAudioPath}`);
      console.log(`  [DEBUG]   To: ${finalOutputPath}`);
      await fs.copyFile(mainAudioPath, finalOutputPath);
      console.log(`  [DEBUG] Final copy complete`);
    }

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
    // Cleanup work directory
    try {
      await fs.remove(workDir);
    } catch (error) {
      console.warn(`  Warning: Failed to cleanup work directory: ${error.message}`);
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
 * Avoids regenerating duplicate narration like "means 'trying'"
 * Checks for existing cached segments and only generates missing ones
 *
 * @param {Set<string>} uniqueSegments - Set of unique text segments
 * @param {string} voiceId - Voice ID for generation
 * @param {string} tempDir - Temp directory for audio files
 * @param {Object} options - Generation options
 * @returns {Promise<Map>} Map of text -> file path
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
  const MAX_CONCURRENT = 8; // Higher concurrency for simple narration

  for (let i = 0; i < toGenerate.length; i += MAX_CONCURRENT) {
    const batch = toGenerate.slice(i, i + MAX_CONCURRENT);

    await Promise.all(
      batch.map(async (text, idx) => {
        const segmentNum = i + idx + 1;
        const hash = getSegmentHash(text);
        const segmentPath = path.join(tempDir, `seg_${hash}.mp3`);

        try {
          // Check if TTS is blocked at runtime (safety net)
          if (global.BLOCK_TTS) {
            console.error(`\n❌ BLOCKED: Segment TTS generation attempted with --block-tts flag!`);
            console.error(`   Segment: "${text.substring(0, 60)}..."`);
            console.error(`\nThis indicates unexpected TTS usage. Exiting immediately.`);
            process.exit(1);
          }

          // Generate TTS
          const generationOptions = {
            model: voice.model || elevenlabsService.MODELS.FLASH_V2_5,
            stability: voice.stability || 0.5,
            similarityBoost: voice.similarity_boost || 0.75,
            language: options.sourceLanguage || 'eng',
            enablePriming: voice.priming === 'enabled'
          };

          await elevenlabsService.generateAudioWithRetry(
            text,
            voice.provider_id,
            segmentPath,
            generationOptions
          );

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
 *
 * @param {string} voiceId - Voice ID
 * @returns {Promise<Object>} Voice details
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
 * Collect all unique target UUIDs required for presentations
 * Used to pre-download target files in bulk instead of on-demand
 *
 * @param {Array<Object>} samples - Array of presentation samples
 * @param {Object} manifest - Course manifest
 * @returns {Set<string>} Set of unique target UUIDs
 */
function collectRequiredTargets(samples, manifest) {
  const requiredTargets = new Set();
  const missingTargets = [];

  for (const sample of samples) {
    try {
      const { mainPresentation, explanation } = parsePresentation(sample.text);
      const { targetPart } = parseMainPresentation(mainPresentation);

      // Find target1 and target2 for main presentation
      const target1 = findTargetSample(manifest, targetPart, 'target1');
      const target2 = findTargetSample(manifest, targetPart, 'target2');

      if (target1?.id) {
        requiredTargets.add(target1.id);
      } else {
        missingTargets.push({
          presentationId: sample.id,
          presentationText: sample.text.substring(0, 100) + '...',
          targetText: targetPart,
          role: 'target1'
        });
      }

      if (target2?.id) {
        requiredTargets.add(target2.id);
      } else {
        missingTargets.push({
          presentationId: sample.id,
          presentationText: sample.text.substring(0, 100) + '...',
          targetText: targetPart,
          role: 'target2'
        });
      }

      // Also collect targets from explanation if present
      if (explanation) {
        const segments = parseExplanationSegments(explanation);
        for (const segment of segments) {
          if (segment.type === 'target1' || segment.type === 'target2') {
            const targetSample = findTargetSample(manifest, segment.content, segment.type);
            if (targetSample?.id) {
              requiredTargets.add(targetSample.id);
            } else {
              missingTargets.push({
                presentationId: sample.id,
                presentationText: sample.text.substring(0, 100) + '...',
                targetText: segment.content,
                role: segment.type
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse presentation for target collection: ${sample.text.substring(0, 60)}`);
    }
  }

  return { requiredTargets, missingTargets };
}

/**
 * Bulk download target files from S3 to local cache
 * Downloads all required targets upfront for faster presentation generation
 *
 * @param {Set<string>|Array<string>} targetUuids - Set or array of target UUIDs
 * @param {string} cacheDir - Local directory to cache files
 * @param {string} bucket - S3 bucket name
 * @param {number} concurrency - Number of parallel downloads (default: 10)
 * @returns {Promise<Object>} { downloaded: number, skipped: number, failed: number }
 */
async function bulkDownloadTargets(targetUuids, cacheDir, bucket, concurrency = 10) {
  await fs.ensureDir(cacheDir);

  const uuidsArray = Array.isArray(targetUuids) ? targetUuids : Array.from(targetUuids);

  // Filter out files that already exist in cache
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

  // Download in batches for concurrency control
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

    // Progress update
    if ((i + concurrency) % 100 === 0 || i + concurrency >= toDownload.length) {
      console.log(`  Downloaded: ${Math.min(i + concurrency, toDownload.length)}/${toDownload.length}`);
    }
  }

  console.log(`✓ Downloaded ${downloaded} files, ${skipped} cached, ${failed} failed\n`);

  return { downloaded, skipped, failed };
}

module.exports = {
  parsePresentation,
  parseMainPresentation,
  extractTargetsFromExplanation,
  parseExplanationSegments,
  findTargetSample,
  downloadTargetFromS3,
  generatePresentationAudio,
  getVoiceDetails,
  extractAllUniqueSegments,
  generateSegmentBatch,
  collectRequiredTargets,
  bulkDownloadTargets
};
