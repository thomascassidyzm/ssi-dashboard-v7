/**
 * THE ONE AUDIO-STORE SWITCH — where Popty's audio objects are written and read.
 *
 * Tom's ruling r-2026-11-06-ssi-audio-moves-to-cloudflare-r2 (2026-11-06 01:34Z): NEW SSi audio
 * lands in the Cloudflare R2 bucket `ssi-audio`, not S3. The production learner app still reads
 * S3 (`ssi-audio-stage`) until Tom cuts it over; the staging app already reads R2. So the switch:
 *
 *   AUDIO_STORE=dual  (the default)  writes go to R2 FIRST, then S3, and both must succeed;
 *                                    reads go R2 first, S3 on any R2 failure.
 *   AUDIO_STORE=r2                   writes go to R2 only; reads R2 first, S3 fallback.
 *   AUDIO_STORE=s3                   the old world: S3 only, R2 untouched (the escape hatch).
 *
 * Flip to r2-only at cutover: set AUDIO_STORE=r2 in the services' env (/etc/popty/r2.env on
 * watson-1) and restart the Popty units. Nothing else changes: keys are identical in both
 * stores (mastered/<UUID>.mp3 …), so course_audio.s3_key resolves in either.
 *
 * Why reads may always go R2-first: R2 is the SUPERSET — every linked S3 key was bulk-copied
 * and Sippy is on (a GET for a key R2 lacks is fetched from S3 and kept). HEAD is not covered
 * by Sippy, hence the S3 fallback.
 *
 * HOW IT IS APPLIED: not at every call site. Each live module that builds an S3 client for the
 * audio bucket wraps it once (`wrapAudioClient` for SDK v3, `wrapAudioClientV2` for aws-sdk v2).
 * The wrapper only acts on commands whose Bucket is the audio bucket; any other bucket
 * (ssiborg-assets, …) passes straight through to S3 untouched. Wrapping twice is a no-op.
 *
 * Credentials: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT from the
 * process env, else loaded (without overriding anything already set) from the first readable
 * of R2_ENV_FILE, /etc/popty/r2.env (popty services), ~/.secrets/cloudflare-r2.env (Tom's tools).
 * Missing credentials in dual/r2 mode make every audio WRITE throw — loudly, never a silent
 * S3-only write — while reads fall back to S3.
 *
 * Known limits (kept honest here, at the decision point):
 *  - Presigned URLs (getSignedUrl) sign against the client's own S3 config, so they still point
 *    at S3. Fine in dual; at r2 cutover a new clip's presigned dashboard URL would 404 on S3.
 *  - pronunciation-reuse-guard dates clips by S3 LastModified and is deliberately NOT wrapped:
 *    R2's bulk copies carry the copy date, which would misdate every old clip.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const S3_AUDIO_BUCKET = 'ssi-audio-stage'
const R2_AUDIO_BUCKET = 'ssi-audio'
const MODES = ['s3', 'dual', 'r2']
const WRAPPED = Symbol.for('ssi.audioStore.wrapped')

function mode(env = process.env) {
  loadR2Env(env)
  const m = String(env.AUDIO_STORE || 'dual').trim().toLowerCase()
  if (!MODES.includes(m)) throw new Error(`AUDIO_STORE=${env.AUDIO_STORE} — must be one of ${MODES.join('|')}`)
  return m
}

/** The S3 audio bucket name(s) the wrapper acts on. Anything else passes through. */
function isAudioBucket(bucket, env = process.env) {
  if (!bucket) return false
  return bucket === S3_AUDIO_BUCKET || bucket === (env.S3_BUCKET || S3_AUDIO_BUCKET) || bucket === (env.S3_AUDIO_BUCKET || S3_AUDIO_BUCKET)
}

function r2Bucket(env = process.env) { return env.R2_AUDIO_BUCKET || R2_AUDIO_BUCKET }

let _loaded = false
function parseEnvFile(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}
function loadR2Env(env = process.env) {
  if (env !== process.env || _loaded) return
  _loaded = true
  const candidates = [process.env.R2_ENV_FILE, '/etc/popty/r2.env', path.join(os.homedir(), '.secrets/cloudflare-r2.env')].filter(Boolean)
  for (const f of candidates) {
    let text
    try { text = fs.readFileSync(f, 'utf8') } catch { continue }
    const vars = parseEnvFile(text)
    // Only the R2_* keys and AUDIO_STORE: the secrets file also holds a Cloudflare API token
    // no audio path needs.
    for (const [k, v] of Object.entries(vars)) {
      if ((k.startsWith('R2_') || k === 'AUDIO_STORE') && process.env[k] == null) process.env[k] = v
    }
    return
  }
}

let _r2 = null
/** The R2 S3-API client, or null when no credentials are configured. */
function r2Client(env = process.env) {
  loadR2Env(env)
  if (_r2 && env === process.env) return _r2
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env
  const endpoint = env.R2_ENDPOINT || (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null)
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !endpoint) return null
  const { S3Client } = require('@aws-sdk/client-s3')
  const https = require('https')
  const { NodeHttpHandler } = require('@smithy/node-http-handler')
  const c = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    // R2 rejects some of the SDK's default flexible checksums on PUT; only send them when required.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 4,
    requestHandler: new NodeHttpHandler({
      httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 16, maxFreeSockets: 8 }),
      connectionTimeout: 6000,
      requestTimeout: 60000,
    }),
  })
  if (env === process.env) _r2 = c
  return c
}

function requireR2(env) {
  const c = r2Client(env)
  if (!c) throw new Error('AUDIO_STORE: no R2 credentials (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_ENDPOINT) — refusing an S3-only audio write; set AUDIO_STORE=s3 to opt out deliberately')
  return c
}

const WRITE_COMMANDS = new Set(['PutObjectCommand', 'CopyObjectCommand', 'DeleteObjectCommand', 'DeleteObjectsCommand'])
const READ_COMMANDS = new Set(['GetObjectCommand', 'HeadObjectCommand'])

function isNotFound(e) {
  return !!e && (e.name === 'NoSuchKey' || e.name === 'NotFound' || (e.$metadata && e.$metadata.httpStatusCode === 404))
}

async function bufferBody(body) {
  if (body == null || typeof body === 'string' || Buffer.isBuffer(body) || body instanceof Uint8Array) return body
  if (typeof body[Symbol.asyncIterator] === 'function') {
    const chunks = []
    for await (const c of body) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
  }
  return body
}

/** The same command, re-aimed at the R2 bucket. */
function toR2Input(input, env) {
  const out = { ...input, Bucket: r2Bucket(env) }
  delete out.ACL // R2 has no object ACLs
  if (out.CopySource) {
    const src = String(out.CopySource).replace(/^\//, '')
    const slash = src.indexOf('/')
    const srcBucket = slash > 0 ? decodeURIComponent(src.slice(0, slash)) : ''
    if (isAudioBucket(srcBucket, env)) out.CopySource = `${r2Bucket(env)}/${src.slice(slash + 1)}`
  }
  return out
}

/**
 * Route one SDK-v3 command. `sendS3(cmd)` is the original client's send. Exported for tests,
 * which pass fake clients.
 */
async function routeV3(cmd, sendS3, { env = process.env, r2 } = {}) {
  const input = cmd && cmd.input
  if (!input || !isAudioBucket(input.Bucket, env)) return sendS3(cmd)
  const m = mode(env)
  if (m === 's3') return sendS3(cmd)
  const name = cmd.constructor && cmd.constructor.name
  const Ctor = cmd.constructor
  const r2c = () => r2 || requireR2(env)

  if (WRITE_COMMANDS.has(name)) {
    let r2Input = input
    let s3Cmd = cmd
    if (m === 'dual' && name === 'PutObjectCommand') {
      // A stream can only be read once and both stores need the bytes.
      const Body = await bufferBody(input.Body)
      r2Input = { ...input, Body }
      s3Cmd = new Ctor({ ...input, Body })
    }
    let r2Out
    try {
      r2Out = await r2c().send(new Ctor(toR2Input(r2Input, env)))
    } catch (e) {
      // A copy whose source R2 has not got yet: a GET makes Sippy fetch it from S3, then retry once.
      if (name !== 'CopyObjectCommand' || !isNotFound(e)) throw e
      const r2In = toR2Input(r2Input, env)
      const src = r2In.CopySource.slice(r2In.CopySource.indexOf('/') + 1)
      const { GetObjectCommand } = require('@aws-sdk/client-s3')
      const got = await r2c().send(new GetObjectCommand({ Bucket: r2Bucket(env), Key: decodeURIComponent(src) }))
      await bufferBody(got.Body)
      r2Out = await r2c().send(new Ctor(r2In))
    }
    return m === 'r2' ? r2Out : sendS3(s3Cmd)
  }

  if (READ_COMMANDS.has(name)) {
    const c = r2 || r2Client(env)
    if (c) {
      try { return await c.send(new Ctor(toR2Input(input, env))) } catch { /* fall back to S3 below */ }
    }
    return sendS3(cmd)
  }

  // List, multipart, HeadBucket …: S3 in dual (it holds every key dual has written), R2 in r2 mode.
  if (m === 'r2') return r2c().send(new Ctor(toR2Input(input, env)))
  return sendS3(cmd)
}

/** Wrap an SDK-v3 S3Client so audio-bucket commands obey AUDIO_STORE. Idempotent. */
function wrapAudioClient(client, opts = {}) {
  if (!client || client[WRAPPED]) return client
  const sendS3 = (cmd, o) => client.send(cmd, o)
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === WRAPPED) return true
      if (prop === 'send') return (cmd, o) => routeV3(cmd, (c) => sendS3(c, o), opts)
      const v = Reflect.get(target, prop, target)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
}

// ── aws-sdk v2 ──────────────────────────────────────────────────────────────
// v2 calls return an AWS.Request whose .promise() the callers await. The wrapper turns each
// audio-bucket call into the matching v3 command and routes it the same way, so there is one
// routing rule, not two.
const V2_TO_V3 = {
  putObject: 'PutObjectCommand',
  copyObject: 'CopyObjectCommand',
  deleteObject: 'DeleteObjectCommand',
  deleteObjects: 'DeleteObjectsCommand',
  getObject: 'GetObjectCommand',
  headObject: 'HeadObjectCommand',
}

function wrapAudioClientV2(s3v2, opts = {}) {
  if (!s3v2 || s3v2[WRAPPED]) return s3v2
  return new Proxy(s3v2, {
    get(target, prop) {
      if (prop === WRAPPED) return true
      const v = Reflect.get(target, prop, target)
      if (typeof v !== 'function') return v
      const v3Name = V2_TO_V3[prop]
      if (!v3Name) return v.bind(target)
      return (params, cb) => {
        const env = opts.env || process.env
        if (cb || !params || !isAudioBucket(params.Bucket, env) || mode(env) === 's3') return v.call(target, params, cb)
        const Ctor = require('@aws-sdk/client-s3')[v3Name]
        const sendS3 = () => v.call(target, params).promise()
        const run = async () => {
          const out = await routeV3(new Ctor(params), sendS3, opts)
          // A v3 GetObject from R2 carries a stream; v2 callers expect Body as a Buffer.
          if (v3Name === 'GetObjectCommand' && out && out.Body && !Buffer.isBuffer(out.Body)) out.Body = await bufferBody(out.Body)
          return out
        }
        return { promise: run }
      }
    },
  })
}

module.exports = {
  S3_AUDIO_BUCKET, R2_AUDIO_BUCKET, MODES,
  mode, isAudioBucket, r2Bucket, r2Client, routeV3, wrapAudioClient, wrapAudioClientV2,
  _parseEnvFile: parseEnvFile,
}
