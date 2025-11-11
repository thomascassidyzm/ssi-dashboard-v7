/**
 * S3 Audio Service
 *
 * Handles uploading and checking audio files in S3
 */

const AWS = require('aws-sdk');
const path = require('path');

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

/**
 * Upload audio file to S3
 * @param {string} courseCode - Course code
 * @param {string} uuid - Audio file UUID (without .mp3 extension)
 * @param {Buffer} audioBuffer - Audio file data
 * @returns {Promise<string>} S3 URL of uploaded file
 */
async function uploadAudio(courseCode, uuid, audioBuffer) {
  const key = `courses/${courseCode}/audio/${uuid}.mp3`;

  try {
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      ACL: 'public-read'
    }).promise();

    const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    return url;
  } catch (error) {
    throw new Error(`Failed to upload ${uuid}.mp3 to S3: ${error.message}`);
  }
}

/**
 * Check if audio file exists in S3
 * @param {string} courseCode - Course code
 * @param {string} uuid - Audio file UUID (without .mp3 extension)
 * @returns {Promise<boolean>} True if file exists
 */
async function audioExists(courseCode, uuid) {
  const key = `courses/${courseCode}/audio/${uuid}.mp3`;

  try {
    await s3.headObject({
      Bucket: S3_BUCKET,
      Key: key
    }).promise();

    return true;
  } catch (error) {
    if (error.code === 'NotFound' || error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Check multiple audio files in S3
 * @param {string} courseCode - Course code
 * @param {string[]} uuids - Array of UUIDs to check
 * @returns {Promise<object>} Status object with available, missing, and total counts
 */
async function checkMultipleAudio(courseCode, uuids) {
  const available = [];
  const missing = [];

  // Check files in batches to avoid overwhelming S3
  const batchSize = 100;
  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize);

    const checks = batch.map(async uuid => {
      const exists = await audioExists(courseCode, uuid);
      if (exists) {
        available.push(uuid);
      } else {
        missing.push(uuid);
      }
    });

    await Promise.all(checks);
  }

  return {
    available: available.length,
    missing: missing.length,
    total: uuids.length,
    availableIds: available,
    missingIds: missing
  };
}

/**
 * List all audio files for a course in S3
 * @param {string} courseCode - Course code
 * @returns {Promise<string[]>} Array of UUIDs (without .mp3 extension)
 */
async function listCourseAudio(courseCode) {
  const prefix = `courses/${courseCode}/audio/`;
  const uuids = [];

  let continuationToken = null;

  do {
    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken
    };

    const response = await s3.listObjectsV2(params).promise();

    if (response.Contents) {
      response.Contents.forEach(obj => {
        // Extract UUID from key: courses/{code}/audio/{UUID}.mp3
        const filename = path.basename(obj.Key);
        const uuid = filename.replace('.mp3', '');
        uuids.push(uuid);
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return uuids;
}

/**
 * Delete audio file from S3
 * @param {string} courseCode - Course code
 * @param {string} uuid - Audio file UUID
 * @returns {Promise<void>}
 */
async function deleteAudio(courseCode, uuid) {
  const key = `courses/${courseCode}/audio/${uuid}.mp3`;

  try {
    await s3.deleteObject({
      Bucket: S3_BUCKET,
      Key: key
    }).promise();
  } catch (error) {
    throw new Error(`Failed to delete ${uuid}.mp3 from S3: ${error.message}`);
  }
}

/**
 * Get S3 URL for audio file
 * @param {string} courseCode - Course code
 * @param {string} uuid - Audio file UUID
 * @returns {string} S3 URL
 */
function getAudioUrl(courseCode, uuid) {
  const key = `courses/${courseCode}/audio/${uuid}.mp3`;
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

module.exports = {
  uploadAudio,
  audioExists,
  checkMultipleAudio,
  listCourseAudio,
  deleteAudio,
  getAudioUrl
};
