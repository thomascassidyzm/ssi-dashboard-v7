'use strict'
/**
 * pod-preview-token.cjs — mint the staff pass for the app's read-only pod
 * preview (ssi-learning-app /listening/preview, job #628).
 *
 * Tom, r-2026-11-07-ssi-pods-exactly-one-way-of: Popty surfaces EXACTLY the
 * app's one way of playing pods, embedded. Popty frames the app's real
 * Listening display; Safari partitions a sign-in inside a third-party iframe,
 * so the frame carries this short-lived pass instead of a session.
 *
 * Format — must stay byte-compatible with the verify side,
 * ssi-learning-app api/_utils/podPreviewToken.ts (itself the house
 * entitlement-token shape): `${b64url(payloadJson)}.${b64url(hmacSha256(payloadPart))}`,
 * payload { course, pod, exp (ms epoch), sub }.
 *
 * Secret: POD_PREVIEW_TOKEN_SECRET, the same value on the app's Vercel project
 * and in Popty's production-api environment. Unset → mintPodPreviewToken
 * returns null and the pods page says so; nothing is ever signed with a
 * fallback key.
 */
const { createHmac } = require('crypto')

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000
// The preview route is on the app's staging tier until Tom promotes it.
const DEFAULT_APP_ORIGIN = 'https://staging.saysomethingin.app'

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function podPreviewSecret (env = process.env) {
  return String(env.POD_PREVIEW_TOKEN_SECRET || '').trim()
}

function appOrigin (env = process.env) {
  return String(env.POD_PREVIEW_APP_ORIGIN || DEFAULT_APP_ORIGIN).trim().replace(/\/+$/, '')
}

/** The pass, or null when the secret is not configured. */
function mintPodPreviewToken ({ course, pod, sub = '', ttlMs = DEFAULT_TTL_MS, now = Date.now(), secret = podPreviewSecret() }) {
  if (!secret) return null
  const payloadPart = b64url(JSON.stringify({ course, pod, exp: now + ttlMs, sub }))
  const sig = createHmac('sha256', secret).update(payloadPart).digest()
  return { token: `${payloadPart}.${b64url(sig)}`, exp: now + ttlMs }
}

/** The app address the pods page frames (and the phone's "open in app" link). */
function previewUrl ({ course, pod, scene, line, token, origin = appOrigin() }) {
  const q = new URLSearchParams({ course, pod })
  if (scene != null) q.set('scene', String(scene))
  if (line) q.set('line', line)
  q.set('t', token)
  return `${origin}/listening/preview?${q}`
}

module.exports = { mintPodPreviewToken, previewUrl, podPreviewSecret, appOrigin, DEFAULT_TTL_MS }
