/**
 * One definition of the cache policy for audio objects in S3.
 *
 * Clip objects are content-addressed by a freshly minted UUID: every render,
 * revoice or repair writes a NEW key rather than replacing the bytes at an old
 * one (make-before-break, AUDIO_PIPELINE_ARCHITECTURE.md §6b). An object at a
 * given key therefore never changes, which is exactly the precondition
 * `immutable` asks for — the browser and any CDN in front of us may hold it
 * for a year and never revalidate.
 *
 * This applies to AUDIO only. Manifests, logs, JSON and archives are mutable at
 * a stable key and must stay uncached or short-cached, so the helpers here key
 * off the content type and refuse to volunteer a header for anything that is
 * not `audio/*`.
 */

const AUDIO_CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** True for `audio/mpeg`, `audio/wav`, … — the things served to a learner. */
function isAudioContentType (contentType) {
  return typeof contentType === 'string' && contentType.trim().toLowerCase().startsWith('audio/')
}

/**
 * The CacheControl value for a content type, or undefined when the object is
 * not audio. Spread-friendly: `...(cc ? { CacheControl: cc } : {})`.
 */
function cacheControlFor (contentType) {
  return isAudioContentType(contentType) ? AUDIO_CACHE_CONTROL : undefined
}

/**
 * Add CacheControl to PutObject params when they describe an audio object.
 * An explicit CacheControl already on the params always wins.
 */
function withAudioCacheControl (params) {
  if (!params || params.CacheControl !== undefined) return params
  if (!isAudioContentType(params.ContentType)) return params
  return { ...params, CacheControl: AUDIO_CACHE_CONTROL }
}

module.exports = { AUDIO_CACHE_CONTROL, isAudioContentType, cacheControlFor, withAudioCacheControl }
