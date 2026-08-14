#!/usr/bin/env node
/**
 * Make-before-break pre-flight for the bucket-(b) convergence.
 *
 * Before a single course_audio row is repointed at a canonical object, EVERY
 * distinct canonical object it will be repointed at is fetched from the public
 * serving endpoint and confirmed to be real audio.
 *
 * Not a sample. All of them. A dead canonical object is not one course's
 * problem — it is shared, so it is silent in every course that points at it,
 * and the whole reason this design is safe is that the target is proven alive
 * BEFORE the old key stops being authoritative. (The old S3 object is not
 * deleted either way; nothing here removes anything.)
 *
 * Reads the key list from stdin (one s3_key per line) so the DB query and the
 * network work stay separable and re-runnable.
 *
 *   psql … -At -c "SELECT DISTINCT canon_s3_key FROM _divergence_partition
 *                   WHERE bucket='b_stale_duplicate'" \
 *     | node tools/canonical-audio/preflight-canon-objects.cjs > preflight.json
 *
 * Exit 1 if ANY object fails. Read-only: HEAD requests only.
 */

const AUDIO_BASE = process.env.AUDIO_BASE_URL || 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '24', 10)
const MIN_BYTES = 1000  // a 200 is not proof of audio

async function head(key, attempt = 1) {
  try {
    const res = await fetch(`${AUDIO_BASE}/${key}`, { method: 'HEAD' })
    const bytes = parseInt(res.headers.get('content-length') || '0', 10)
    if (!res.ok && res.status >= 500 && attempt < 3) {
      // A 5xx is the endpoint having a moment, not evidence about the object.
      await new Promise(r => setTimeout(r, 400 * attempt))
      return head(key, attempt + 1)
    }
    return { key, ok: res.ok && bytes >= MIN_BYTES, status: res.status, bytes }
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 400 * attempt))
      return head(key, attempt + 1)
    }
    return { key, ok: false, status: 0, bytes: 0, error: e.message }
  }
}

async function main() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const keys = Buffer.concat(chunks).toString('utf8')
    .split('\n').map(s => s.trim()).filter(Boolean)

  process.stderr.write(`pre-flight: ${keys.length} distinct canonical objects, concurrency ${CONCURRENCY}\n`)

  const failures = []
  let done = 0, aliveBytes = 0
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, keys.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= keys.length) return
      const r = await head(keys[i])
      done++
      if (r.ok) aliveBytes += r.bytes; else failures.push(r)
      if (done % 2000 === 0) process.stderr.write(`  ${done}/${keys.length}  failures=${failures.length}\n`)
    }
  }))

  // EVERY failure, never a slice.
  //
  // This emitted failures.slice(0, 200) once, alongside an honest failed=212.
  // The caller built its exclusion set from the truncated array, so 12 objects
  // that had actually failed were treated as alive and 12 fra_for_eng rows were
  // converged onto 403s (restored 2026-08-14, pass REVERT-nonserving-2026-08-14).
  // A capped list that sits next to an uncapped count is worse than no list:
  // both numbers look right and only one of them is usable.
  const out = {
    checked: keys.length,
    alive: keys.length - failures.length,
    failed: failures.length,
    alive_bytes_total: aliveBytes,
    failures,
  }
  console.log(JSON.stringify(out, null, 2))
  process.stderr.write(`\nchecked=${out.checked} alive=${out.alive} failed=${out.failed}\n`)
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
