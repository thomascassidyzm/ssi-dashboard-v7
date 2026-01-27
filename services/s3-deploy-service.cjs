/**
 * s3-deploy-service.cjs
 *
 * Service for deploying audio files from stage bucket to production bucket.
 * Handles S3 verification, duration checking, and safe production deployment.
 *
 * Stage bucket: ssi-audio-stage (where TTS audio is generated)
 * Prod bucket: ssiborg-assets (where learning app fetches audio)
 *
 * @version 1.0.0 - Jan 2026
 */

const { S3Client, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const createLogger = require('./shared/logger.cjs')
const audioDurationService = require('./audio-duration-service.cjs')

const logger = createLogger('S3Deploy')

// Bucket configuration
const STAGE_BUCKET = process.env.S3_STAGE_BUCKET || 'ssi-audio-stage'
const PROD_BUCKET = process.env.S3_PROD_BUCKET || 'ssiborg-assets'
const REGION = process.env.S3_REGION || 'eu-west-1'

// Create S3 client
const s3Client = new S3Client({ region: REGION })

/**
 * Check if a file exists in the stage bucket
 * @param {string} uuid - Audio UUID
 * @returns {Promise<Object|null>} Object with metadata or null if not found
 */
async function checkFileInStage(uuid) {
  try {
    const command = new HeadObjectCommand({
      Bucket: STAGE_BUCKET,
      Key: `mastered/${uuid}.mp3`
    })
    const response = await s3Client.send(command)
    return {
      exists: true,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified
    }
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Check if a file exists in the production bucket
 * @param {string} uuid - Audio UUID
 * @returns {Promise<Object|null>} Object with metadata or null if not found
 */
async function checkFileInProd(uuid) {
  try {
    const command = new HeadObjectCommand({
      Bucket: PROD_BUCKET,
      Key: `mastered/${uuid}.mp3`
    })
    const response = await s3Client.send(command)
    return {
      exists: true,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified
    }
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Build sample list for duration verification
 * @param {Array<string>} uuids - Array of audio UUIDs
 * @param {Object} manifest - Course manifest
 * @param {Array<string>} missingUuids - UUIDs that don't exist in S3 (skip these)
 * @returns {Array<Object>} Array of { uuid, expectedDuration }
 */
function buildSampleList(uuids, manifest, missingUuids = []) {
  const samples = []
  const missingSet = new Set(missingUuids)

  // Build UUID to duration map from ALL sources in manifest
  const uuidToDuration = new Map()

  // 1. Introduction/welcome
  if (manifest.introduction?.id && manifest.introduction?.duration) {
    uuidToDuration.set(manifest.introduction.id, manifest.introduction.duration)
  }

  // 2. Encouragements in slices[0]
  const orderedEnc = manifest.slices?.[0]?.orderedEncouragements || []
  const pooledEnc = manifest.slices?.[0]?.pooledEncouragements || []
  for (const enc of [...orderedEnc, ...pooledEnc]) {
    if (enc.id && enc.duration) {
      uuidToDuration.set(enc.id, enc.duration)
    }
  }

  // 3. Legacy top-level encouragements (backwards compatibility)
  if (manifest.encouragements) {
    for (const enc of manifest.encouragements) {
      const id = enc.id || enc.uuid
      if (id && enc.duration) {
        uuidToDuration.set(id, enc.duration)
      }
    }
  }

  // 4. Samples from slices[0].samples
  const manifestSamples = manifest.slices?.[0]?.samples || {}
  for (const variants of Object.values(manifestSamples)) {
    for (const variant of variants) {
      if (variant.id && variant.duration) {
        uuidToDuration.set(variant.id, variant.duration)
      }
    }
  }

  logger.info(`[buildSampleList] Found ${uuidToDuration.size} samples with durations in manifest`)

  // Build sample list - use 0 as placeholder if duration missing
  for (const uuid of uuids) {
    if (missingSet.has(uuid)) continue // Skip missing files

    const expectedDuration = uuidToDuration.get(uuid) || 0 // Default to 0 if no duration
    samples.push({ uuid, expectedDuration })
  }

  logger.info(`[buildSampleList] Created sample list: ${samples.length} items (${missingUuids.length} missing files skipped)`)

  return samples
}

/**
 * Batch verify audio files exist in stage bucket
 * @param {Array<string>} uuids - Array of audio UUIDs
 * @param {Object} manifest - Course manifest (for duration verification)
 * @param {Function} onProgress - Progress callback (phase, checked, total, ...phaseData)
 * @param {Object} options - { checkDurations, durationTolerance }
 * @returns {Promise<Object>} { total, existing, missing, missingUuids, durationChecked?, durationMatched?, ... }
 */
async function verifyStageAudio(uuids, manifest = null, onProgress = null, options = {}) {
  const { checkDurations = true, durationTolerance = 0.001 } = options

  const results = {
    total: uuids.length,
    existing: 0,
    missing: 0,
    missingUuids: []
  }

  // Phase 1: Existence check
  logger.info(`[VERIFY] Phase 1: Checking existence of ${uuids.length} files in stage bucket`)
  const batchSize = 50
  let checked = 0

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize)

    const checks = batch.map(async (uuid) => {
      const result = await checkFileInStage(uuid)
      if (result) {
        results.existing++
      } else {
        results.missing++
        results.missingUuids.push(uuid)
      }
    })

    await Promise.all(checks)
    checked += batch.length

    if (onProgress) {
      onProgress('existence', checked, uuids.length)
    }
  }

  logger.info(`[VERIFY] Phase 1 complete: ${results.existing} exist, ${results.missing} missing`)

  // Phase 2: Duration verification (REQUIRED - verification fails if this doesn't run)
  if (checkDurations !== false && manifest && results.existing > 0) {
    logger.info(`[VERIFY] Phase 2: Starting duration verification (checkDurations=${checkDurations})`)
    logger.info(`[VERIFY] Phase 2: ${results.existing} files exist in S3, ${results.missing} missing`)

    const samples = buildSampleList(uuids, manifest, results.missingUuids)

    if (samples.length > 0) {
      logger.info(`[VERIFY] Phase 2: Verifying ${samples.length} audio durations with sox`)
      const durationResults = await audioDurationService.batchVerifyDurations(
        samples,
        STAGE_BUCKET,
        20, // 20 concurrent workers
        (checked, matched, mismatched, errors) => {
          if (onProgress) {
            onProgress('duration', checked, samples.length, matched, mismatched, errors)
          }
        }
      )

      // Merge duration results
      Object.assign(results, {
        durationChecked: durationResults.checked,
        durationMatched: durationResults.matched,
        durationMismatched: durationResults.mismatched,
        durationErrors: durationResults.errors,
        durationMismatchDetails: durationResults.mismatchDetails,
        durationErrorDetails: durationResults.errorDetails
      })

      logger.info(`[VERIFY] Phase 2 complete: ${durationResults.matched} matched, ${durationResults.mismatched} mismatched, ${durationResults.errors} errors`)
    } else {
      // CRITICAL: No samples with durations found - this is a verification FAILURE
      logger.error(`[VERIFY] Phase 2 FAILED: No samples with expected durations found in manifest`)
      logger.error(`[VERIFY] Phase 2 debug: manifest.slices[0] exists? ${!!manifest.slices?.[0]}`)
      logger.error(`[VERIFY] Phase 2 debug: manifest.slices[0].samples keys: ${Object.keys(manifest.slices?.[0]?.samples || {}).length}`)

      results.durationCheckFailed = true
      results.durationCheckError = 'No samples with expected durations found in manifest. Manifest may be malformed or missing duration metadata.'
      results.durationChecked = 0
    }
  } else {
    // CRITICAL: Duration check didn't run - this is a verification FAILURE
    let errorReason = ''
    if (!checkDurations || checkDurations === false) {
      errorReason = 'Duration checking was disabled'
      logger.error(`[VERIFY] Phase 2 FAILED: ${errorReason}`)
    } else if (!manifest) {
      errorReason = 'No manifest provided for duration verification'
      logger.error(`[VERIFY] Phase 2 FAILED: ${errorReason}`)
    } else if (results.existing === 0) {
      errorReason = 'No files exist in S3 to verify'
      logger.error(`[VERIFY] Phase 2 FAILED: ${errorReason}`)
    }

    results.durationCheckFailed = true
    results.durationCheckError = errorReason
    results.durationChecked = 0
  }

  return results
}

/**
 * Generate deployment plan - what would be copied to production
 * @param {Array<string>} uuids - Array of audio UUIDs to deploy
 * @param {Function} onProgress - Progress callback (checked, total)
 * @returns {Promise<Object>} { total, newFiles, overwrites, overwriteUuids, newUuids }
 */
async function generateDeployPlan(uuids, onProgress = null) {
  const plan = {
    total: uuids.length,
    newFiles: 0,
    overwrites: 0,
    overwriteUuids: [],
    newUuids: []
  }

  logger.info(`[PLAN] Checking ${uuids.length} files against production bucket: ${PROD_BUCKET}`)
  logger.debug(`[PLAN] First 3 UUIDs: ${uuids.slice(0, 3).join(', ')}`)

  // Process in parallel batches of 50
  const batchSize = 50
  let checked = 0

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize)

    const checks = batch.map(async (uuid) => {
      const existsInProd = await checkFileInProd(uuid)
      if (existsInProd) {
        plan.overwrites++
        plan.overwriteUuids.push(uuid)
      } else {
        plan.newFiles++
        plan.newUuids.push(uuid)
      }
    })

    await Promise.all(checks)
    checked += batch.length

    if (onProgress) {
      onProgress(checked, uuids.length)
    }
  }

  logger.info(`[PLAN] Check complete: ${plan.newFiles} new, ${plan.overwrites} overwrites`)
  if (plan.overwrites > 0) {
    logger.debug(`[PLAN] First 3 overwrites: ${plan.overwriteUuids.slice(0, 3).join(', ')}`)
  }

  return plan
}

/**
 * Copy a single file from stage to production
 * @param {string} uuid - Audio UUID
 * @returns {Promise<boolean>} Success
 */
async function copyToProd(uuid) {
  try {
    const command = new CopyObjectCommand({
      CopySource: `${STAGE_BUCKET}/mastered/${uuid}.mp3`,
      Bucket: PROD_BUCKET,
      Key: `mastered/${uuid}.mp3`,
      MetadataDirective: 'COPY'
    })
    await s3Client.send(command)
    return true
  } catch (error) {
    logger.error(`Failed to copy ${uuid}: ${error.message}`)
    return false
  }
}

/**
 * Deploy audio files from stage to production
 * @param {Array<string>} uuids - Array of audio UUIDs to deploy
 * @param {Object} options - { confirmOverwrite, onProgress }
 * @returns {Promise<Object>} { success, deployed, failed, failedUuids }
 */
async function deployToProduction(uuids, options = {}) {
  const { confirmOverwrite = false, onProgress = null } = options

  // First, generate plan to check for overwrites
  logger.info(`Pre-deployment: Checking ${uuids.length} files against production...`)
  const plan = await generateDeployPlan(uuids, (checked, total) => {
    if (checked % 1000 === 0 || checked === total) {
      logger.info(`Pre-deployment check: ${checked}/${total} files checked`)
    }
  })
  logger.info(`Pre-deployment check complete: ${plan.newFiles} new, ${plan.overwrites} overwrites`)

  // If there are overwrites and not confirmed, return error
  if (plan.overwrites > 0 && !confirmOverwrite) {
    return {
      success: false,
      error: `${plan.overwrites} files would be overwritten. Pass confirmOverwrite=true to proceed.`,
      plan
    }
  }

  const result = {
    success: true,
    deployed: 0,
    failed: 0,
    failedUuids: [],
    plan
  }

  // Deploy files (5 at a time for rate limiting)
  const concurrency = 5
  let deployed = 0

  for (let i = 0; i < uuids.length; i += concurrency) {
    const batch = uuids.slice(i, i + concurrency)

    const copies = batch.map(async (uuid) => {
      const success = await copyToProd(uuid)
      if (success) {
        result.deployed++
      } else {
        result.failed++
        result.failedUuids.push(uuid)
      }
    })

    await Promise.all(copies)
    deployed += batch.length

    if (onProgress) {
      onProgress(deployed, uuids.length)
    }
  }

  if (result.failed > 0) {
    result.success = false
  }

  return result
}

/**
 * List all audio files in stage bucket for a course
 * Uses prefix listing since we don't have course-specific prefixes
 * @param {Array<string>} uuids - Array of UUIDs to verify exist
 * @returns {Promise<Array<string>>} Array of existing UUIDs
 */
async function listStageAudio(uuids) {
  // For efficiency, we batch check rather than listing all files
  const results = await verifyStageAudio(uuids)
  return uuids.filter(uuid => !results.missingUuids.includes(uuid))
}

/**
 * Get audio file metadata from S3 (for duration verification)
 * @param {string} uuid - Audio UUID
 * @param {string} bucket - Bucket name ('stage' or 'prod')
 * @returns {Promise<Object|null>} Metadata or null
 */
async function getAudioMetadata(uuid, bucket = 'stage') {
  const bucketName = bucket === 'prod' ? PROD_BUCKET : STAGE_BUCKET
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: `mastered/${uuid}.mp3`
    })
    const response = await s3Client.send(command)
    return {
      uuid,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata || {}
    }
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw error
  }
}

/**
 * Compare stage and prod versions of a file
 * @param {string} uuid - Audio UUID
 * @returns {Promise<Object>} { stage, prod, match }
 */
async function compareVersions(uuid) {
  const [stageMeta, prodMeta] = await Promise.all([
    getAudioMetadata(uuid, 'stage'),
    getAudioMetadata(uuid, 'prod')
  ])

  return {
    uuid,
    stage: stageMeta,
    prod: prodMeta,
    match: stageMeta && prodMeta &&
           stageMeta.contentLength === prodMeta.contentLength
  }
}

/**
 * Verify production audio durations match the manifest
 * @param {Array<string>} uuids - Array of deployed UUIDs
 * @param {Object} manifest - The published manifest
 * @param {Function} onProgress - Progress callback (checked, matched, mismatched, errors)
 * @returns {Promise<Object>} { checked, matched, mismatched, errors, details }
 */
async function verifyProductionDurations(uuids, manifest, onProgress = null) {
  logger.info(`[VERIFY PROD] Verifying ${uuids.length} production audio files`)

  const results = {
    total: uuids.length,
    existing: 0,
    missing: 0,
    missingUuids: []
  }

  // Phase 1: Existence check
  logger.info(`[VERIFY PROD] Phase 1: Checking existence of ${uuids.length} files in production bucket`)
  const batchSize = 50
  let checked = 0

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize)
    const checks = batch.map(async (uuid) => {
      const key = `mastered/${uuid}.mp3`
      try {
        await s3.headObject({ Bucket: PROD_BUCKET, Key: key }).promise()
        return { uuid, exists: true }
      } catch (err) {
        return { uuid, exists: false }
      }
    })

    const batchResults = await Promise.all(checks)
    for (const result of batchResults) {
      if (result.exists) {
        results.existing++
      } else {
        results.missing++
        results.missingUuids.push(result.uuid)
      }
    }

    checked += batch.length
    if (onProgress) {
      onProgress('existence', checked, uuids.length)
    }
  }

  logger.info(`[VERIFY PROD] Phase 1 complete: ${results.existing} exist, ${results.missing} missing`)

  // Phase 2: Duration verification (only for existing files)
  if (results.existing > 0) {
    logger.info(`[VERIFY PROD] Phase 2: Verifying durations for ${results.existing} existing files`)

    // Build sample list excluding missing files
    const samples = buildSampleList(uuids, manifest, results.missingUuids)

    if (samples.length === 0) {
      logger.warn(`[VERIFY PROD] No samples with expected durations found in manifest`)
      return {
        ...results,
        durationChecked: 0,
        durationMatched: 0,
        durationMismatched: 0,
        durationErrors: 0,
        details: []
      }
    }

    // Use the duration service to verify (20 concurrent workers)
    const durationResult = await audioDurationService.batchVerifyDurations(
      samples,
      PROD_BUCKET,
      20,
      (checked, matched, mismatched, errors) => {
        if (onProgress) {
          onProgress('duration', checked, samples.length, matched, mismatched, errors)
        }
      }
    )

    logger.info(`[VERIFY PROD] Phase 2 complete: ${durationResult.matched} matched, ${durationResult.mismatched} mismatched, ${durationResult.errors} errors`)

    // Merge results
    return {
      ...results,
      durationChecked: durationResult.checked,
      durationMatched: durationResult.matched,
      durationMismatched: durationResult.mismatched,
      durationErrors: durationResult.errors,
      details: [
        ...durationResult.mismatchDetails.map(d => ({
          uuid: d.uuid,
          issue: 'Duration mismatch',
          expected: d.expectedDuration,
          actual: d.actualDuration,
          difference: d.difference
        })),
        ...durationResult.errorDetails.map(d => ({
          uuid: d.uuid,
          issue: d.error,
          expected: null
        }))
      ]
    }
  }

  // No existing files to verify durations for
  return {
    ...results,
    durationChecked: 0,
    durationMatched: 0,
    durationMismatched: 0,
    durationErrors: 0,
    details: []
  }
}

/**
 * Auto-fix manifest durations by extracting from S3 with sox
 * Updates manifest to match EXACT durations from S3 audio files
 *
 * @param {Array<string>} uuids - Array of UUIDs to fix
 * @param {Object} manifest - Course manifest to update
 * @param {Function} onProgress - Progress callback (checked, fixed, errors)
 * @returns {Promise<Object>} { fixed, errors, updatedManifest }
 */
async function autoFixDurations(uuids, manifest, onProgress = null) {
  logger.info(`[AUTO-FIX] Extracting exact durations for ${uuids.length} files`)

  const results = {
    fixed: 0,
    errors: 0,
    errorDetails: []
  }

  // Build UUID to manifest location map
  const uuidToLocation = new Map()

  // Map introduction
  if (manifest.introduction?.id) {
    uuidToLocation.set(manifest.introduction.id, { type: 'introduction', ref: manifest.introduction })
  }

  // Map encouragements
  const orderedEnc = manifest.slices?.[0]?.orderedEncouragements || []
  const pooledEnc = manifest.slices?.[0]?.pooledEncouragements || []
  for (const enc of [...orderedEnc, ...pooledEnc]) {
    if (enc.id) {
      uuidToLocation.set(enc.id, { type: 'encouragement', ref: enc })
    }
  }

  // Map samples
  const manifestSamples = manifest.slices?.[0]?.samples || {}
  for (const variants of Object.values(manifestSamples)) {
    for (const variant of variants) {
      if (variant.id) {
        uuidToLocation.set(variant.id, { type: 'sample', ref: variant })
      }
    }
  }

  // Extract durations from S3 (20 concurrent workers)
  for (const uuid of uuids) {
    const location = uuidToLocation.get(uuid)
    if (!location) {
      logger.warn(`[AUTO-FIX] UUID ${uuid} not found in manifest`)
      continue
    }

    try {
      // Extract actual duration from S3
      const result = await audioDurationService.extractS3Duration(uuid, STAGE_BUCKET, 0, 0)

      if (result === null) {
        results.errors++
        results.errorDetails.push({ uuid, error: 'Failed to extract duration' })
      } else {
        // Update manifest with EXACT duration from sox
        location.ref.duration = result.actualDuration
        results.fixed++

        if (results.fixed % 100 === 0 && onProgress) {
          onProgress(results.fixed + results.errors, results.fixed, results.errors)
        }
      }
    } catch (error) {
      results.errors++
      results.errorDetails.push({ uuid, error: error.message })
    }
  }

  // Final progress callback
  if (onProgress) {
    onProgress(results.fixed + results.errors, results.fixed, results.errors)
  }

  logger.info(`[AUTO-FIX] Complete: ${results.fixed} durations fixed, ${results.errors} errors`)

  return {
    ...results,
    updatedManifest: manifest
  }
}

module.exports = {
  // Stage bucket operations
  checkFileInStage,
  verifyStageAudio,
  listStageAudio,

  // Production bucket operations
  checkFileInProd,
  generateDeployPlan,
  deployToProduction,
  verifyProductionDurations,

  // Duration utilities
  autoFixDurations,

  // Utilities
  getAudioMetadata,
  compareVersions,

  // Constants (for testing)
  STAGE_BUCKET,
  PROD_BUCKET
}
