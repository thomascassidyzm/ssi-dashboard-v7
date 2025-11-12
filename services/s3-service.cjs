/**
 * S3 Service
 *
 * Handles audio file uploads/downloads to AWS S3.
 *
 * BUCKET USAGE:
 *
 * 1. COURSE AUDIO (lesson samples with UUIDs referenced in course manifests):
 *    - STAGE_BUCKET (ssi-audio-stage) - Development/testing
 *    - PROD_BUCKET (ssiborg-assets) - Live production
 *    - Structure: s3://bucket/mastered/{uuid}.mp3
 *    - These are generated per-course audio files
 *
 * 2. CANONICAL/STRUCTURAL FILES (shared resources, registries, templates):
 *    - LFS_BUCKET (popty-bach-lfs) - Canonical welcomes, registries, etc.
 *    - Structure: s3://popty-bach-lfs/canonical/welcomes/{language_code}.wav
 *                 s3://popty-bach-lfs/canonical/welcomes.json
 *    - These are shared across all courses and should not be mixed with course audio
 *
 * IMPORTANT: Only upload files with UUID filenames referenced in courses to
 * STAGE_BUCKET/PROD_BUCKET. All structural/canonical files go to LFS_BUCKET.
 */

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');

// Configure AWS (uses environment variables)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const STAGE_BUCKET = 'ssi-audio-stage';       // Course audio - development
const PROD_BUCKET = 'ssiborg-assets';         // Course audio - production
const LFS_BUCKET = 'popty-bach-lfs';          // Canonical/structural files

/**
 * Upload audio file to S3 (flat structure in mastered/)
 *
 * @param {string} uuid - Sample UUID (without .mp3 extension)
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} bucket - S3 bucket name (default: STAGE_BUCKET)
 * @returns {Promise<object>} S3 upload result with bucket, key, url
 */
async function uploadAudio(uuid, audioBuffer, bucket = STAGE_BUCKET) {
  const key = `mastered/${uuid}.mp3`;

  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  }).promise();

  return {
    bucket,
    key,
    url: `https://${bucket}.s3.amazonaws.com/${key}`
  };
}

/**
 * Upload audio file from local path
 *
 * @param {string} uuid - Sample UUID
 * @param {string} localPath - Path to local audio file
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<object>} S3 upload result
 */
async function uploadAudioFile(uuid, localPath, bucket = STAGE_BUCKET) {
  const audioBuffer = await fs.readFile(localPath);
  return await uploadAudio(uuid, audioBuffer, bucket);
}

/**
 * Check if audio file exists in S3
 *
 * @param {string} uuid - Sample UUID
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
async function audioExists(uuid, bucket = STAGE_BUCKET) {
  const key = `mastered/${uuid}.mp3`;

  try {
    await s3.headObject({
      Bucket: bucket,
      Key: key
    }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    throw err;
  }
}

/**
 * Check if audio exists in either stage or prod bucket
 *
 * @param {string} uuid - Sample UUID
 * @returns {Promise<object>} { exists: boolean, bucket: string|null }
 */
async function findAudio(uuid) {
  // Check stage first
  if (await audioExists(uuid, STAGE_BUCKET)) {
    return { exists: true, bucket: STAGE_BUCKET };
  }

  // Check prod
  if (await audioExists(uuid, PROD_BUCKET)) {
    return { exists: true, bucket: PROD_BUCKET };
  }

  return { exists: false, bucket: null };
}

/**
 * Download audio file from S3
 *
 * @param {string} uuid - Sample UUID
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<Buffer>} Audio file buffer
 */
async function downloadAudio(uuid, bucket = STAGE_BUCKET) {
  const key = `mastered/${uuid}.mp3`;

  const response = await s3.getObject({
    Bucket: bucket,
    Key: key
  }).promise();

  return response.Body;
}

/**
 * Download audio file to local path
 *
 * @param {string} uuid - Sample UUID
 * @param {string} localPath - Path to save file locally
 * @param {string} bucket - S3 bucket name
 */
async function downloadAudioFile(uuid, localPath, bucket = STAGE_BUCKET) {
  const audioBuffer = await downloadAudio(uuid, bucket);
  await fs.ensureDir(path.dirname(localPath));
  await fs.writeFile(localPath, audioBuffer);
}

/**
 * Get S3 URL for an audio file
 *
 * @param {string} uuid - Sample UUID
 * @param {string} bucket - S3 bucket name
 * @returns {string} S3 URL
 */
function getAudioUrl(uuid, bucket = STAGE_BUCKET) {
  return `https://${bucket}.s3.amazonaws.com/mastered/${uuid}.mp3`;
}

/**
 * Batch check which audio files exist in S3
 *
 * @param {string[]} uuids - Array of UUIDs to check
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<object>} { existing: string[], missing: string[] }
 */
async function batchCheckAudio(uuids, bucket = STAGE_BUCKET) {
  const existing = [];
  const missing = [];

  // Check in batches of 100 to avoid rate limiting
  for (let i = 0; i < uuids.length; i += 100) {
    const batch = uuids.slice(i, i + 100);

    const results = await Promise.all(
      batch.map(async (uuid) => ({
        uuid,
        exists: await audioExists(uuid, bucket)
      }))
    );

    results.forEach(({ uuid, exists }) => {
      if (exists) {
        existing.push(uuid);
      } else {
        missing.push(uuid);
      }
    });

    // Log progress for large batches
    if (uuids.length > 100) {
      console.log(`Checked ${Math.min(i + 100, uuids.length)}/${uuids.length} files...`);
    }
  }

  return { existing, missing };
}

/**
 * Delete audio file from S3
 *
 * @param {string} uuid - Sample UUID
 * @param {string} bucket - S3 bucket name
 */
async function deleteAudio(uuid, bucket = STAGE_BUCKET) {
  const key = `mastered/${uuid}.mp3`;

  await s3.deleteObject({
    Bucket: bucket,
    Key: key
  }).promise();
}

/**
 * Copy audio from one bucket to another
 *
 * @param {string} uuid - Sample UUID
 * @param {string} sourceBucket - Source bucket
 * @param {string} destBucket - Destination bucket
 */
async function copyAudio(uuid, sourceBucket, destBucket) {
  const key = `mastered/${uuid}.mp3`;

  await s3.copyObject({
    Bucket: destBucket,
    CopySource: `${sourceBucket}/${key}`,
    Key: key,
    ACL: 'public-read'
  }).promise();
}

/**
 * Upload a file to LFS bucket with custom path
 * Used for canonical/structural files (not course audio)
 *
 * @param {string} key - S3 key (path within bucket)
 * @param {Buffer|string} content - File content (Buffer or file path)
 * @param {string} contentType - Content type (e.g., 'application/json', 'audio/wav')
 * @returns {Promise<object>} S3 upload result with bucket, key, url
 */
async function uploadToLFS(key, content, contentType = 'application/octet-stream') {
  let body;

  if (typeof content === 'string') {
    // It's a file path
    body = await fs.readFile(content);
  } else {
    // It's already a buffer or string
    body = content;
  }

  await s3.putObject({
    Bucket: LFS_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
    // Note: ACL removed - bucket uses bucket policy for public access
  }).promise();

  return {
    bucket: LFS_BUCKET,
    key,
    url: `https://${LFS_BUCKET}.s3.amazonaws.com/${key}`
  };
}

/**
 * Download a file from LFS bucket
 *
 * @param {string} key - S3 key (path within bucket)
 * @returns {Promise<Buffer>} File content
 */
async function downloadFromLFS(key) {
  const response = await s3.getObject({
    Bucket: LFS_BUCKET,
    Key: key
  }).promise();

  return response.Body;
}

/**
 * Check if a file exists in LFS bucket
 *
 * @param {string} key - S3 key (path within bucket)
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
async function existsInLFS(key) {
  try {
    await s3.headObject({
      Bucket: LFS_BUCKET,
      Key: key
    }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    throw err;
  }
}

module.exports = {
  uploadAudio,
  uploadAudioFile,
  audioExists,
  findAudio,
  downloadAudio,
  downloadAudioFile,
  getAudioUrl,
  batchCheckAudio,
  deleteAudio,
  copyAudio,
  uploadToLFS,
  downloadFromLFS,
  existsInLFS,
  STAGE_BUCKET,
  PROD_BUCKET,
  LFS_BUCKET
};
