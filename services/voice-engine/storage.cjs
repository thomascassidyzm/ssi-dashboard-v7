/**
 * voice-engine/storage.cjs — thin storage adapter.
 *
 * The engine never talks to S3 directly; it talks to this interface:
 *   getObjectBuffer(key) → Buffer
 *   putObject(key, buffer, contentType)
 *   getJson(key) → object | null
 *   putJson(key, obj)
 *   exists(key) → boolean
 *
 * createS3Storage() — production (bucket ssi-audio-stage, same client idiom
 *   as services/s3-production-service.cjs).
 * createLocalStorage(rootDir) — tests / dry runs against local tmp files.
 *   NO S3 writes happen in tests.
 */

const fs = require('fs')
const path = require('path')

function assertKey(key) {
  if (!key || typeof key !== 'string') throw new Error('storage: key required')
  if (key.startsWith('/') || key.includes('..')) throw new Error(`storage: unsafe key "${key}"`)
}

// ---------------------------------------------------------------------------
// Local filesystem storage (tests, dry runs)
// ---------------------------------------------------------------------------

function createLocalStorage(rootDir) {
  if (!rootDir) throw new Error('createLocalStorage: rootDir required')
  fs.mkdirSync(rootDir, { recursive: true })

  const resolvePath = (key) => {
    assertKey(key)
    return path.join(rootDir, key)
  }

  return {
    kind: 'local',
    rootDir,
    async getObjectBuffer(key) {
      const p = resolvePath(key)
      if (!fs.existsSync(p)) {
        const err = new Error(`NoSuchKey: ${key}`)
        err.name = 'NoSuchKey'
        throw err
      }
      return fs.readFileSync(p)
    },
    async putObject(key, buffer, _contentType = 'application/octet-stream') {
      const p = resolvePath(key)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, buffer)
    },
    async getJson(key) {
      try {
        const buf = await this.getObjectBuffer(key)
        return JSON.parse(buf.toString('utf-8'))
      } catch (err) {
        if (err.name === 'NoSuchKey') return null
        throw err
      }
    },
    async putJson(key, obj) {
      await this.putObject(key, Buffer.from(JSON.stringify(obj, null, 2), 'utf-8'), 'application/json')
    },
    async exists(key) {
      return fs.existsSync(resolvePath(key))
    },
  }
}

// ---------------------------------------------------------------------------
// S3 storage (production)
// ---------------------------------------------------------------------------

function createS3Storage(opts = {}) {
  // Lazy require so tests never need the SDK or credentials.
  const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
  const bucket = opts.bucket || process.env.S3_BUCKET || 'ssi-audio-stage'
  const region = opts.region || process.env.S3_REGION || 'eu-west-1'
  // Bounded keep-alive agent + retries — the phase8 idiom (a bare S3Client
  // rides https.globalAgent with maxSockets:Infinity; that unbounded fan-out
  // was the real cause of the 2026-06-08 bulk-pod ECONNRESET cascade). The
  // job is sequential today, but the client shouldn't rely on that.
  const https = require('https')
  const { NodeHttpHandler } = require('@smithy/node-http-handler')
  const client = opts.client || new S3Client({
    region,
    maxAttempts: Number(process.env.S3_MAX_ATTEMPTS) > 0 ? Math.floor(Number(process.env.S3_MAX_ATTEMPTS)) : 6,
    requestHandler: new NodeHttpHandler({
      httpsAgent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: Number(process.env.S3_MAX_SOCKETS) > 0 ? Math.floor(Number(process.env.S3_MAX_SOCKETS)) : 16,
        maxFreeSockets: 8,
      }),
      connectionTimeout: 6000,
      requestTimeout: 60000,
    }),
  })

  async function streamToBuffer(stream) {
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
  }

  return {
    kind: 's3',
    bucket,
    async getObjectBuffer(key) {
      assertKey(key)
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      return streamToBuffer(res.Body)
    },
    async putObject(key, buffer, contentType = 'application/octet-stream') {
      assertKey(key)
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }))
    },
    async getJson(key) {
      try {
        const buf = await this.getObjectBuffer(key)
        return JSON.parse(buf.toString('utf-8'))
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null
        throw err
      }
    },
    async putJson(key, obj) {
      await this.putObject(key, Buffer.from(JSON.stringify(obj, null, 2), 'utf-8'), 'application/json')
    },
    async exists(key) {
      assertKey(key)
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
        return true
      } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false
        throw err
      }
    },
  }
}

module.exports = { createLocalStorage, createS3Storage }
