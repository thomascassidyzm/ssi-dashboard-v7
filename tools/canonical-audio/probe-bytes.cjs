#!/usr/bin/env node
/**
 * Fetch the real bytes for a list of s3_keys and print key,status,bytes,sha256.
 *
 * Used either side of the convergence write, so "the row now says X" can be
 * replaced with "the endpoint now serves these exact bytes for that row" —
 * different claims, and only the second one is what a learner experiences.
 *
 * Reads "label<TAB>s3_key" per line on stdin. Read-only.
 */

const crypto = require('crypto')
const AUDIO_BASE = process.env.AUDIO_BASE_URL || 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'

async function main() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const lines = Buffer.concat(chunks).toString('utf8').split('\n').map(s => s.trim()).filter(Boolean)

  for (const line of lines) {
    const [label, key] = line.split('\t')
    if (!key) continue
    try {
      const res = await fetch(`${AUDIO_BASE}/${key}`)
      if (!res.ok) { console.log(`${label}\t${key}\tHTTP_${res.status}\t-\t-`); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      const isMp3 = buf.slice(0, 3).toString('ascii') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
      const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)
      console.log(`${label}\t${key}\tOK\t${buf.length}\t${sha}\tmp3=${isMp3}`)
    } catch (e) {
      console.log(`${label}\t${key}\tERR\t-\t-\t${e.message}`)
    }
  }
}
main()
