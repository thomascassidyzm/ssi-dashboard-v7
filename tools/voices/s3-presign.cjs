/**
 * A presigned GET url for one S3 object (SigV4, query-string form), so a page a
 * person opens on their phone can PLAY a clip without the bucket being public.
 * Pure node:crypto; no SDK. Max lifetime S3 allows with these credentials is 7 days.
 */
const crypto = require('crypto')
const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest()
const hex = s => crypto.createHash('sha256').update(s).digest('hex')
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())

function presign({ bucket, key, region = 'eu-west-1', accessKeyId, secretAccessKey, expires = 7 * 86400, now = new Date() }) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '')        // 20260929T011500Z
  const date = iso.slice(0, 8)
  const host = `${bucket}.s3.${region}.amazonaws.com`
  const scope = `${date}/${region}/s3/aws4_request`
  const path = '/' + key.split('/').map(enc).join('/')
  const q = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${accessKeyId}/${scope}`, 'X-Amz-Date': iso, 'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': 'host' }
  const qs = Object.keys(q).sort().map(k => `${enc(k)}=${enc(q[k])}`).join('&')
  const canonical = ['GET', path, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', iso, scope, hex(canonical)].join('\n')
  const kSigning = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, date), region), 's3'), 'aws4_request')
  const sig = crypto.createHmac('sha256', kSigning).update(toSign).digest('hex')
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`
}

module.exports = { presign }
