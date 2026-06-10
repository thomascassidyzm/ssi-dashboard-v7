// services/s3-production-service.cjs
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.S3_REGION || 'eu-west-1'

const s3Client = new S3Client({ region: REGION })

// Helper to stream S3 object to string
async function streamToString(stream) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

// Get course manifest (read-only)
async function getCourseManifest(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/course_manifest.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

// Get sample flags (QA decisions)
async function getSampleFlags(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/sample_flags.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      // Return empty structure if file doesn't exist
      return {
        courseCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        samples: {}
      }
    }
    throw error
  }
}

// Save sample flags
async function saveSampleFlags(courseCode, flagsData) {
  const data = {
    ...flagsData,
    courseCode,
    updatedAt: new Date().toISOString()
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/sample_flags.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  })

  await s3Client.send(command)
  return data
}

// Get audio metadata
async function getAudioMetadata(courseCode) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `courses/${courseCode}/audio_metadata.json`
    })
    const response = await s3Client.send(command)
    const body = await streamToString(response.Body)
    return JSON.parse(body)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return {
        courseCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        audio: {}
      }
    }
    throw error
  }
}

// Save audio metadata
async function saveAudioMetadata(courseCode, metadataData) {
  const data = {
    ...metadataData,
    courseCode,
    updatedAt: new Date().toISOString()
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `courses/${courseCode}/audio_metadata.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  })

  await s3Client.send(command)
  return data
}

// Get signed URL for audio file
// Accepts optional bucket and s3Key for v12 audio (where path is stored in DB)
async function getAudioSignedUrl(uuid, expiresIn = 3600, options = {}) {
  const bucket = options.bucket || BUCKET
  // Use provided s3Key if available, otherwise construct legacy path
  const key = options.s3Key || `ssiborg-assets/mastered/${uuid}.mp3`

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

// Check if audio file exists
async function audioFileExists(uuid) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: `ssiborg-assets/mastered/${uuid}.mp3`
    })
    await s3Client.send(command)
    return true
  } catch (error) {
    if (error.name === 'NotFound') {
      return false
    }
    throw error
  }
}

// S3 user metadata rides in HTTP headers: values must be ASCII strings.
// Drop null/undefined, stringify non-strings, percent-encode non-ASCII (Cyrillic
// target text, chunk maps, etc. would otherwise break the PUT). This metadata is
// informational only — Supabase holds the truth.
function toS3Metadata(raw) {
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue
    let str = typeof value === 'string' ? value : JSON.stringify(value)
    if (/[^\x20-\x7e]/.test(str)) str = encodeURIComponent(str)
    out[key] = str
  }
  return out
}

// Upload recording
// options.s3Key: explicit object key (canon: mastered/{UUID}.mp3). Falls back to the
// legacy v12-era prefix only for callers that don't pass one.
async function uploadRecording(courseCode, uuid, audioBuffer, metadata = {}, options = {}) {
  const key = options.s3Key || `ssiborg-assets/mastered/${uuid}.mp3`
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: toS3Metadata({
      courseCode,
      uploadedAt: new Date().toISOString(),
      ...metadata
    })
  })

  await s3Client.send(command)
  return { uuid, key, uploaded: true }
}

// Batch check if audio files exist in ssi-audio-stage bucket
async function batchCheckAudio(uuids, bucket = process.env.S3_BUCKET || 'ssi-audio-stage') {
  const results = {}

  // Process in parallel batches of 50
  const batchSize = 50
  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize)
    const checks = batch.map(async (uuid) => {
      try {
        const command = new HeadObjectCommand({
          Bucket: bucket,
          Key: `mastered/${uuid}.mp3`
        })
        await s3Client.send(command)
        results[uuid] = true
      } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          results[uuid] = false
        } else {
          console.warn(`Error checking ${uuid}:`, error.message)
          results[uuid] = false
        }
      }
    })
    await Promise.all(checks)
  }

  return results
}

module.exports = {
  getCourseManifest,
  getSampleFlags,
  saveSampleFlags,
  getAudioMetadata,
  saveAudioMetadata,
  batchCheckAudio,
  getAudioSignedUrl,
  audioFileExists,
  uploadRecording,
  toS3Metadata
}
