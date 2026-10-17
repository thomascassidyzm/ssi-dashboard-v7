/*
 * The nightly QA units can be pointed at the restored-backup copy (tools/qa-copy), which listens on a
 * unix socket and has no TLS. Before this, nightlyClient forced ssl on every URL, so voice-variety
 * failed against the copy while the other four units worked. Supabase URLs must keep TLS.
 *
 * Run: npx vitest run tools/qa/voice-variety/named-read.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { nightlyClient } = require('./named-read.cjs')
class Capture { constructor(o) { this.o = o } }
const sslFor = (url) => { process.env.DATABASE_URL = url; return nightlyClient(Capture, 'qa:x').o.ssl }

describe('nightlyClient ssl', () => {
  it('asks for no TLS on the unix-socket copy', () => {
    expect(sslFor('postgres://ssi_copy@/ssi_copy?host=/home/tomcassidy/ssi-restore/sock&port=5433')).toBe(false)
  })
  it('keeps TLS for the Supabase pooler', () => {
    expect(sslFor('postgres://u:p@aws-0-eu-west-1.pooler.supabase.com:5432/postgres')).toEqual({ rejectUnauthorized: false })
  })
})
