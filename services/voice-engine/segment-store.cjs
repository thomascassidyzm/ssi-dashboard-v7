/**
 * voice-engine/segment-store.cjs — SEGMENT STORE.
 *
 * Chopped LEGO-chunk clips live in S3 under
 *   segments/{courseCode}/{voiceId}/{segmentId}.mp3
 * with a JSON manifest alongside at
 *   segments/{courseCode}/{voiceId}/manifest.json
 * (keystone doc decision 7 — no DDL for a segments table today; the
 * deferred recording_sessions/phrase_recordings migration replaces this).
 *
 * Identity is NEVER filename-derived: segmentId is a UUID minted here and
 * carried in the manifest; chunk text (which may be Cyrillic — Macedonian)
 * appears only as manifest data, never in a key. (keystone decision 8)
 *
 * Manifest shape (version 1):
 * {
 *   version: 1, courseCode, voiceId, updatedAt,
 *   segments: [{
 *     id,                // UUID — the only identity
 *     text,              // chunk text as recorded (original script)
 *     textKey,           // normalizeForMatching(text) — splice-plan lookup key
 *     cadence,           // 'natural' | 'slow'
 *     s3Key,             // segments/{courseCode}/{voiceId}/{id}.mp3
 *     durationMs, startMs, endMs,
 *     method,            // 'slow-gap' | 'direct' | 'transferred'
 *     take: { provenanceId, s3Key },   // which uploaded take it was cut from
 *     createdAt
 *   }],
 *   spliced: [{ textKey, text, audioId, s3Key, createdAt }],  // synthesis ledger
 *   alignmentFailures: [{ phraseText, reason, expectedCount, detectedCount, at }]
 * }
 */

const crypto = require('crypto')
const { normalizeForMatching } = require('./chunking.cjs')

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const IDENT_RE = /^[A-Za-z0-9._-]+$/

function assertIdentifier(value, name) {
  if (!value || typeof value !== 'string' || !IDENT_RE.test(value)) {
    throw new Error(`segment-store: invalid ${name} "${value}" — must match ${IDENT_RE}`)
  }
  return value
}

function mintSegmentId() {
  return crypto.randomUUID().toUpperCase()
}

function segmentAudioKey(courseCode, voiceId, segmentId) {
  assertIdentifier(courseCode, 'courseCode')
  assertIdentifier(voiceId, 'voiceId')
  if (!UUID_RE.test(segmentId)) throw new Error(`segment-store: segmentId must be a UUID, got "${segmentId}"`)
  return `segments/${courseCode}/${voiceId}/${segmentId}.mp3`
}

function manifestKey(courseCode, voiceId) {
  assertIdentifier(courseCode, 'courseCode')
  assertIdentifier(voiceId, 'voiceId')
  return `segments/${courseCode}/${voiceId}/manifest.json`
}

function emptyManifest(courseCode, voiceId) {
  return {
    version: 1,
    courseCode,
    voiceId,
    updatedAt: null,
    segments: [],
    spliced: [],
    alignmentFailures: [],
  }
}

async function loadManifest(storage, courseCode, voiceId) {
  const existing = await storage.getJson(manifestKey(courseCode, voiceId))
  if (!existing) return emptyManifest(courseCode, voiceId)
  // Forward-fill any missing arrays (older partial writes).
  return { ...emptyManifest(courseCode, voiceId), ...existing }
}

async function saveManifest(storage, manifest) {
  manifest.updatedAt = new Date().toISOString()
  await storage.putJson(manifestKey(manifest.courseCode, manifest.voiceId), manifest)
}

/** Lookup index: `${textKey}|${cadence}` → segment entry. */
function segmentIndex(manifest) {
  const idx = new Map()
  for (const seg of manifest.segments || []) {
    idx.set(`${seg.textKey}|${seg.cadence}`, seg)
  }
  return idx
}

/**
 * Build a manifest segment entry for a freshly cut chunk.
 * @param {object} args { courseCode, voiceId, text, cadence, durationMs,
 *                        startMs, endMs, method, takeProvenanceId, takeS3Key }
 */
function makeSegmentEntry(args) {
  const id = mintSegmentId()
  return {
    id,
    text: args.text,
    textKey: normalizeForMatching(args.text),
    cadence: args.cadence,
    s3Key: segmentAudioKey(args.courseCode, args.voiceId, id),
    durationMs: args.durationMs ?? null,
    startMs: args.startMs ?? null,
    endMs: args.endMs ?? null,
    method: args.method ?? null,
    take: { provenanceId: args.takeProvenanceId ?? null, s3Key: args.takeS3Key ?? null },
    createdAt: new Date().toISOString(),
  }
}

/**
 * Add a segment entry unless one already exists for (textKey, cadence) —
 * existing segments win, which is what makes re-running a job a resume.
 * @returns {{added: boolean, entry: object}} the live entry
 */
function upsertSegmentEntry(manifest, entry) {
  const key = `${entry.textKey}|${entry.cadence}`
  for (const seg of manifest.segments) {
    if (`${seg.textKey}|${seg.cadence}` === key) return { added: false, entry: seg }
  }
  manifest.segments.push(entry)
  return { added: true, entry }
}

/** Record a spliced phrase in the synthesis ledger (dedupes by textKey). */
function recordSpliced(manifest, { text, textKey, audioId, s3Key }) {
  const k = textKey ?? normalizeForMatching(text)
  if (!manifest.spliced.some(s => s.textKey === k)) {
    manifest.spliced.push({ textKey: k, text, audioId, s3Key, createdAt: new Date().toISOString() })
  }
}

function recordAlignmentFailure(manifest, { phraseText, reason, expectedCount = null, detectedCount = null }) {
  manifest.alignmentFailures.push({
    phraseText, reason, expectedCount, detectedCount, at: new Date().toISOString(),
  })
}

module.exports = {
  UUID_RE,
  mintSegmentId,
  segmentAudioKey,
  manifestKey,
  emptyManifest,
  loadManifest,
  saveManifest,
  segmentIndex,
  makeSegmentEntry,
  upsertSegmentEntry,
  recordSpliced,
  recordAlignmentFailure,
}
