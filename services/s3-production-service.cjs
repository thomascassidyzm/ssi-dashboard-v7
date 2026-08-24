// services/s3-production-service.cjs
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { AUDIO_CACHE_CONTROL } = require('./shared/audio-cache-control.cjs')

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

  return getSignedUrl(options.client || s3Client, command, { expiresIn })
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
// AWS caps TOTAL user metadata at 2KB, so any runaway value is truncated (at a
// percent-escape boundary) rather than letting one long field 400 the PUT.
const S3_META_VALUE_MAX = 512
function toS3Metadata(raw) {
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue
    let str = typeof value === 'string' ? value : JSON.stringify(value)
    if (/[^\x20-\x7e]/.test(str)) str = encodeURIComponent(str)
    if (str.length > S3_META_VALUE_MAX) {
      str = str.slice(0, S3_META_VALUE_MAX).replace(/%[0-9A-Fa-f]?$/, '')
    }
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
    CacheControl: AUDIO_CACHE_CONTROL,
    Metadata: toS3Metadata({
      courseCode,
      uploadedAt: new Date().toISOString(),
      ...metadata
    })
  })

  await s3Client.send(command)
  return { uuid, key, uploaded: true }
}

// Retain a voice actor's UNTOUCHED take at raw/{UUID}.{ext}.
// The bytes are stored exactly as the client sent them — no transcode, no trim,
// no normalisation — because every destructive step downstream has no undo
// (T-20: 107 butchered Welsh clips, zero recoverable originals). Same uuid as
// the mastered object, so the join is a string swap.
// Metadata stays short (the mastered key + a couple of ids): S3 caps TOTAL user
// metadata at 2KB, and Supabase holds the truth.
async function uploadRawTake({ key, buffer, contentType = 'application/octet-stream', metadata = {} }) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: toS3Metadata({
      retainedAt: new Date().toISOString(),
      ...metadata
    })
  })
  await s3Client.send(command)
  return { key, bytes: buffer.length, uploaded: true }
}

// ── The raw original of a mastered take ──────────────────────────────────────
// There is NO raw_key column anywhere: the link from a mastered object back to
// the untouched take lives in the mastered object's own S3 user metadata, keyed
// `rawKey` at write time (uploadRecording → toS3Metadata) and handed back
// lowercased as `rawkey` by the SDK. So the ONLY way to find a raw original is
// to HEAD the mastered object — which is why nothing does it per-line on a page
// load, and everything does it lazily when a human asks to compare.
//
// Takes made before 2026-08-14 (commit 0d76bd5c) have no raw original at all.
// That is a real, permanent absence — resolveRawKey returns null for it, and
// callers MUST say "no original was kept" rather than showing a dead player.
const RAW_KEY_SHAPE = /^raw\/[^\s]+$/

/**
 * The raw original's S3 key for a mastered object, or null if none was kept.
 * `notFound` distinguishes "the mastered object isn't there" from "it is there
 * and carries no rawKey" — a caller wanting to explain itself needs both.
 */
async function resolveRawKey(masteredKey, options = {}) {
  if (!masteredKey) return { rawKey: null, notFound: true }
  const bucket = options.bucket || BUCKET
  const client = options.client || s3Client
  let head
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: masteredKey }))
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return { rawKey: null, notFound: true }
    }
    throw error
  }

  const meta = head.Metadata || {}
  // The SDK lowercases metadata keys, but a hand-written object (or another
  // SDK) may not have been through it, so accept both spellings.
  let value = meta.rawkey != null ? meta.rawkey : meta.rawKey
  if (typeof value !== 'string') return { rawKey: null, notFound: false }
  value = value.trim()
  // toS3Metadata percent-encodes any non-ASCII value and truncates at 512
  // chars; decode defensively so a key that went through that path still joins.
  if (value.includes('%')) {
    try { value = decodeURIComponent(value) } catch { /* keep the raw string */ }
  }
  // Anything that is not a raw/ key is metadata damage, not a pointer: refuse it
  // rather than sign a URL for an object that was never the original.
  if (!RAW_KEY_SHAPE.test(value)) return { rawKey: null, notFound: false }
  return { rawKey: value, notFound: false }
}

/**
 * Signed URL for the raw original behind a mastered object, or null if there
 * isn't one. Same expiry semantics as getAudioSignedUrl.
 */
async function getRawSignedUrl(masteredKey, expiresIn = 3600, options = {}) {
  const { rawKey, notFound } = await resolveRawKey(masteredKey, options)
  if (!rawKey) return { url: null, rawKey: null, notFound }
  const url = await getAudioSignedUrl(null, expiresIn, { ...options, s3Key: rawKey })
  return { url, rawKey, notFound: false }
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
  resolveRawKey,
  getRawSignedUrl,
  audioFileExists,
  uploadRecording,
  uploadRawTake,
  toS3Metadata
}
