/**
 * Audio Duration Service
 *
 * Dedicated service for extracting and verifying audio durations from S3.
 * Downloads files from S3, extracts duration with sox, and compares against expected values.
 *
 * Used by:
 * - Step 2: Verify stage audio durations match manifest
 * - Step 4: Verify production audio durations after deployment
 *
 * @version 1.0.0 - Jan 2026
 */

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { downloadAudio } = require('./s3-service.cjs')
const { getAudioDuration } = require('./audio-processor.cjs')
const createLogger = require('./shared/logger.cjs')

const logger = createLogger('AudioDuration')

// Duration tolerance in seconds
// MUST BE EXACT - we auto-fix any mismatch
const DURATION_TOLERANCE = 0

/**
 * Extract audio duration from S3 file using sox
 * Downloads to temp, checks duration, cleans up
 *
 * @param {string} uuid - Audio UUID
 * @param {string} bucket - S3 bucket name
 * @param {number} expectedDuration - Expected duration from manifest
 * @param {number} tolerance - Tolerance in seconds (default: 0.001)
 * @returns {Promise<Object|null>} { uuid, expectedDuration, actualDuration, difference, matched } or null on failure
 */
async function extractS3Duration(uuid, bucket, expectedDuration, tolerance = DURATION_TOLERANCE) {
  const workerId = Math.random().toString(36).substring(7)
  const tempDir = path.join(os.tmpdir(), `s3-duration-${workerId}`)
  const tempFile = path.join(tempDir, `${uuid}.mp3`)

  try {
    // Create temp directory
    await fs.ensureDir(tempDir)

    // Download from S3 with retry logic
    const audioBuffer = await downloadAudio(uuid, bucket)
    await fs.writeFile(tempFile, audioBuffer)

    // Extract duration using sox
    const actualDuration = await getAudioDuration(tempFile)

    // Compare with expected
    const difference = Math.abs(actualDuration - expectedDuration)
    const matched = difference <= tolerance

    return {
      uuid,
      expectedDuration,
      actualDuration,
      difference,
      matched
    }
  } catch (error) {
    logger.error(`Failed to extract duration for ${uuid}: ${error.message}`)
    return null
  } finally {
    // Clean up temp file and directory
    try {
      await fs.remove(tempDir)
    } catch (cleanupError) {
      logger.warn(`Failed to cleanup temp dir ${tempDir}: ${cleanupError.message}`)
    }
  }
}

/**
 * Batch verify durations with worker queue pattern
 *
 * @param {Array<Object>} samples - Array of { uuid, expectedDuration }
 * @param {string} bucket - S3 bucket name
 * @param {number} concurrency - Number of concurrent workers (default: 20)
 * @param {Function} onProgress - Progress callback (checked, matched, mismatched, errors)
 * @returns {Promise<Object>} { checked, matched, mismatched, errors, mismatchDetails, errorDetails }
 */
async function batchVerifyDurations(samples, bucket, concurrency = 20, onProgress = null) {
  const results = {
    checked: 0,
    matched: 0,
    mismatched: 0,
    errors: 0,
    mismatchDetails: [],
    errorDetails: []
  }

  // Create work queue
  const queue = [...samples]
  let progressCounter = 0

  // Worker function
  const runWorker = async () => {
    while (queue.length > 0) {
      const sample = queue.shift()
      if (!sample) break

      const result = await extractS3Duration(
        sample.uuid,
        bucket,
        sample.expectedDuration,
        DURATION_TOLERANCE
      )

      results.checked++

      if (result === null) {
        // Failed to extract duration
        results.errors++
        results.errorDetails.push({
          uuid: sample.uuid,
          error: 'Failed to extract duration',
          stage: 'download_or_extract'
        })
      } else if (result.matched) {
        results.matched++
      } else {
        results.mismatched++
        results.mismatchDetails.push({
          uuid: result.uuid,
          expectedDuration: result.expectedDuration,
          actualDuration: result.actualDuration,
          difference: result.difference
        })
      }

      // Progress updates every 100 files
      progressCounter++
      if (progressCounter % 100 === 0 && onProgress) {
        onProgress(results.checked, results.matched, results.mismatched, results.errors)
      }
    }
  }

  // Start workers
  logger.info(`Starting ${concurrency} workers to verify ${samples.length} durations in ${bucket}`)
  const workers = []
  for (let i = 0; i < concurrency; i++) {
    workers.push(runWorker())
  }

  await Promise.all(workers)

  // Final progress callback
  if (onProgress) {
    onProgress(results.checked, results.matched, results.mismatched, results.errors)
  }

  logger.info(`Duration verification complete: ${results.matched} matched, ${results.mismatched} mismatched, ${results.errors} errors`)

  return results
}

module.exports = {
  extractS3Duration,
  batchVerifyDurations,
  DURATION_TOLERANCE
}
