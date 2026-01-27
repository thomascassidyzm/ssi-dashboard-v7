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
 * Batch verify audio files exist in stage bucket
 * @param {Array<string>} uuids - Array of audio UUIDs
 * @param {Function} onProgress - Progress callback (checked, total)
 * @returns {Promise<Object>} { total, existing, missing, missingUuids }
 */
async function verifyStageAudio(uuids, onProgress = null) {
  const results = {
    total: uuids.length,
    existing: 0,
    missing: 0,
    missingUuids: []
  }

  // Process in parallel batches of 50
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
      onProgress(checked, uuids.length)
    }
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
  const plan = await generateDeployPlan(uuids)

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

module.exports = {
  // Stage bucket operations
  checkFileInStage,
  verifyStageAudio,
  listStageAudio,

  // Production bucket operations
  checkFileInProd,
  generateDeployPlan,
  deployToProduction,

  // Utilities
  getAudioMetadata,
  compareVersions,

  // Constants (for testing)
  STAGE_BUCKET,
  PROD_BUCKET
}
