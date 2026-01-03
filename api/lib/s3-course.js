/**
 * S3 Course Data Service
 * Handles reading/writing course JSON files to S3
 *
 * Bucket: ssi-audio-stage (eu-west-1) - THE ONLY BUCKET WE USE
 * Course files are stored in: s3://ssi-audio-stage/courses/{courseCode}/{filename}
 *
 * NOTE: popty-bach-lfs is DEPRECATED - do NOT use it.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const COURSES_PREFIX = 'courses/';

// Initialize S3 client (AWS SDK v3)
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Helper to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Read a course file from S3
 * @param {string} courseCode - e.g., 'spa_for_eng'
 * @param {string} filename - e.g., 'introductions.json'
 * @returns {Promise<{content: object, etag: string}>}
 */
export async function readCourseFile(courseCode, filename) {
  const key = `${COURSES_PREFIX}${courseCode}/${filename}`;

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });
    const result = await s3.send(command);

    const bodyString = await streamToString(result.Body);
    const content = JSON.parse(bodyString);
    const etag = result.ETag ? result.ETag.replace(/"/g, '') : null;

    console.log(`[S3] Read ${key} (etag: ${etag})`);

    return { content, etag };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.error(`[S3] File not found: ${key}`);
      const notFoundError = new Error(`Course file not found: ${courseCode}/${filename}`);
      notFoundError.code = 'NOT_FOUND';
      throw notFoundError;
    }
    console.error(`[S3] Error reading ${key}:`, error.message);
    throw new Error(`Failed to read course file: ${error.message}`);
  }
}

/**
 * Write a course file to S3
 * @param {string} courseCode - e.g., 'spa_for_eng'
 * @param {string} filename - e.g., 'introductions.json'
 * @param {object} data - JSON data to write
 * @returns {Promise<{etag: string, url: string}>}
 */
export async function writeCourseFile(courseCode, filename, data) {
  const key = `${COURSES_PREFIX}${courseCode}/${filename}`;
  const jsonContent = JSON.stringify(data, null, 2);

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: jsonContent,
      ContentType: 'application/json',
      CacheControl: 'no-cache'
    });
    const result = await s3.send(command);

    const etag = result.ETag ? result.ETag.replace(/"/g, '') : null;
    const url = getCourseFileUrl(courseCode, filename);

    console.log(`[S3] Wrote ${key} (etag: ${etag})`);

    return { etag, url };
  } catch (error) {
    console.error(`[S3] Error writing ${key}:`, error.message);
    throw new Error(`Failed to write course file: ${error.message}`);
  }
}

/**
 * Check if a course file exists
 * @param {string} courseCode - e.g., 'spa_for_eng'
 * @param {string} filename - e.g., 'introductions.json'
 * @returns {Promise<boolean>}
 */
export async function courseFileExists(courseCode, filename) {
  const key = `${COURSES_PREFIX}${courseCode}/${filename}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });
    await s3.send(command);

    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

/**
 * List all courses (reads manifest.json from S3 root)
 * @returns {Promise<Array<{code: string, name: string}>>}
 */
export async function listCourses() {
  try {
    // List all prefixes under courses/
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: COURSES_PREFIX,
      Delimiter: '/'
    });
    const result = await s3.send(command);

    const courses = (result.CommonPrefixes || [])
      .map(prefix => {
        // Extract course code from prefix like "courses/spa_for_eng/"
        const code = prefix.Prefix.replace(COURSES_PREFIX, '').replace('/', '');
        return { code, name: code };
      })
      .filter(course => course.code); // Remove empty codes

    console.log(`[S3] Found ${courses.length} courses`);
    return courses;
  } catch (error) {
    console.error('[S3] Error listing courses:', error.message);
    throw new Error(`Failed to list courses: ${error.message}`);
  }
}

/**
 * Get course file URL
 * @param {string} courseCode - e.g., 'spa_for_eng'
 * @param {string} filename - e.g., 'introductions.json'
 * @returns {string} - Public S3 URL
 */
export function getCourseFileUrl(courseCode, filename) {
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${COURSES_PREFIX}${courseCode}/${filename}`;
}

/**
 * Check if S3 is configured
 * @returns {boolean}
 */
export function isS3Configured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET);
}

/**
 * Get S3 configuration (for debugging)
 * @returns {Object}
 */
export function getS3Config() {
  return {
    bucket: S3_BUCKET,
    region: AWS_REGION,
    prefix: COURSES_PREFIX,
    configured: isS3Configured()
  };
}

export default {
  readCourseFile,
  writeCourseFile,
  courseFileExists,
  listCourses,
  getCourseFileUrl,
  isS3Configured,
  getS3Config
};
