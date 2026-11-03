/**
 * booth-take-upload.cjs — how the booth's take bytes are RECEIVED, out of the router (job #575).
 *
 * The off-chain sample gate (sample-gate.cjs) hashes the files that can change the captured audio.
 * recordist-router.cjs changes on almost every booth deploy for routes and queue shapes that never
 * touch a take's bytes, so it is not hashed; the part of it that does — the multipart parse, the
 * size ceiling and the mime the take is processed as — lives here, and this file is.
 * Moved verbatim from recordist-router.cjs; the router requires it.
 */

'use strict'

const Busboy = require('busboy')

const MAX_TAKE_BYTES = 60 * 1024 * 1024

// What a take is processed as when the client does not say (both the multipart and JSON paths).
const DEFAULT_TAKE_MIME = 'audio/webm'

/**
 * Parse a multipart take: one audio file part plus text fields.
 * Kept here rather than pulling in a middleware — this is the only multipart
 * route on the service, and a request-scoped parse cannot leak into others.
 */
function parseMultipartTake(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_TAKE_BYTES } })
    const fields = {}
    const chunks = []
    let mimeType = null
    let truncated = false

    busboy.on('field', (name, value) => { fields[name] = value })
    busboy.on('file', (_name, stream, info) => {
      mimeType = info.mimeType || info.mimetype || null
      stream.on('data', (d) => chunks.push(d))
      stream.on('limit', () => { truncated = true })
    })
    busboy.on('error', reject)
    busboy.on('close', () => {
      if (truncated) return reject(new Error(`take exceeds ${MAX_TAKE_BYTES} bytes`))
      resolve({ fields, buffer: chunks.length ? Buffer.concat(chunks) : null, mimeType })
    })
    req.pipe(busboy)
  })
}

module.exports = { MAX_TAKE_BYTES, DEFAULT_TAKE_MIME, parseMultipartTake }
