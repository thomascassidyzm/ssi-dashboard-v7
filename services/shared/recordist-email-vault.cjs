/**
 * RECORDIST EMAILS LIVE IN A VAULT, NOT IN THE PUBLIC JSON (Tom, 2026-09-25:
 * "fix that"). courses.voice_config and language_recording_policy.voices are
 * readable with the public (anon) key — the learner app reads voice_config
 * that way — so the email keys inside them ("email", "assignedEmail", at any
 * depth) were readable by anyone on the internet.
 *
 * Now a database trigger (ops/sql/20260925-recordist-emails-scrub.sql) moves
 * every such key into public.recordist_emails on write — service-role only,
 * anon/authenticated revoked, RLS on — keyed by the key's full JSON path.
 *
 * Popty's booth, casting and cast screens still match recordists BY EMAIL, in
 * a dozen places, on the JSON shape they always had. Rather than teach each of
 * them a second table, the service-role client's fetch puts every vaulted
 * email back exactly where it was on the way in (hydrate). Readers are
 * unchanged; writers are unchanged too, because the trigger strips whatever
 * they write. Only a SERVICE-ROLE client created with vaultFetch sees emails;
 * the anon key never can, whatever it asks.
 *
 * Write semantics live in the trigger, and a writer should know them:
 *   - key holds a non-empty string  → stored/overwritten in the vault
 *   - key holds null or ""          → explicit clear, vault row deleted
 *   - key ABSENT                    → vault row kept (a writer that read the
 *                                     scrubbed JSON must not wipe the email)
 *   - the holding object is gone, or now names a different voiceId → dropped
 */

const VAULTED = {
  courses: { column: 'voice_config', key: 'course_code' },
  language_recording_policy: { column: 'voices', key: 'language' },
}

const EMAIL_KEYS = new Set(['email', 'assignedEmail'])
const CACHE_MS = 5000

/**
 * Put vaulted emails back into row documents, in place. Pure.
 *
 * @param {Array<object>} rows    rows as returned by PostgREST
 * @param {{column:string, key:string}} spec
 * @param {Array<{row_key:string, path:string[], email:string}>} vault
 * @param {string|null} fallbackKey  row key to use when a row carries no key column
 *                                   (a `.select('voice_config').eq('course_code', x)`)
 * @returns {number} emails put back
 */
function hydrateRows(rows, spec, vault, fallbackKey = null) {
  let n = 0
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const doc = row[spec.column]
    if (!doc || typeof doc !== 'object') continue
    const rowKey = row[spec.key] != null ? String(row[spec.key]) : fallbackKey
    if (rowKey == null) continue
    for (const v of vault) {
      if (v.row_key !== rowKey || !Array.isArray(v.path) || !v.path.length) continue
      const last = v.path[v.path.length - 1]
      if (!EMAIL_KEYS.has(last)) continue
      let parent = doc
      for (const seg of v.path.slice(0, -1)) {
        parent = parent && typeof parent === 'object' ? parent[seg] : undefined
      }
      if (!parent || typeof parent !== 'object' || Array.isArray(parent)) continue
      if (parent[last] != null && parent[last] !== '') continue // the row still carries its own
      parent[last] = v.email
      n++
    }
  }
  return n
}

/** The single `<key>=eq.<value>` filter on a request URL, if it has exactly that. */
function eqFilter(url, key) {
  const raw = url.searchParams.get(key)
  return raw && raw.startsWith('eq.') ? raw.slice(3) : null
}

/**
 * Wrap a fetch so PostgREST reads of the two vaulted tables come back with
 * their emails. Anything else passes through untouched. If the vault cannot
 * be read the original response is returned unchanged (emails missing, which
 * degrades the booth to link-only, never breaks it) and the failure is logged.
 */
function vaultFetch(baseFetch = globalThis.fetch, { logger = console } = {}) {
  const cache = new Map() // source → { at, rows }

  async function vaultRows(origin, source, headers) {
    const hit = cache.get(source)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows
    const h = {}
    for (const name of ['apikey', 'authorization']) {
      const val = headers.get(name)
      if (val) h[name] = val
    }
    const url = `${origin}/rest/v1/recordist_emails?select=row_key,path,email&source=eq.${source}`
    const res = await baseFetch(url, { headers: h })
    if (!res.ok) throw new Error(`recordist_emails read ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const rows = await res.json()
    cache.set(source, { at: Date.now(), rows })
    return rows
  }

  return async function fetchWithVault(input, init = {}) {
    const res = await baseFetch(input, init)
    let url
    try { url = new URL(typeof input === 'string' ? input : input.url) } catch { return res }
    const m = url.pathname.match(/\/rest\/v1\/(courses|language_recording_policy)$/)
    if (!m) return res
    const source = m[1]
    const method = String(init.method || (input && input.method) || 'GET').toUpperCase()
    if (method !== 'GET') cache.delete(source) // a write may have moved emails
    if (!res.ok || method === 'HEAD') return res
    if (!String(res.headers.get('content-type') || '').includes('json')) return res

    const spec = VAULTED[source]
    try {
      const body = await res.clone().json()
      const rows = Array.isArray(body) ? body : (body && typeof body === 'object' ? [body] : [])
      if (!rows.some(r => r && r[spec.column] && typeof r[spec.column] === 'object')) return res
      const headers = new Headers((init && init.headers) || (input && input.headers) || {})
      const vault = await vaultRows(url.origin, source, headers)
      if (!hydrateRows(rows, spec, vault, eqFilter(url, spec.key))) return res
      const out = new Headers(res.headers)
      out.delete('content-length')
      out.delete('content-encoding')
      return new Response(JSON.stringify(body), { status: res.status, statusText: res.statusText, headers: out })
    } catch (err) {
      logger.warn(`[RecordistEmailVault] could not hydrate ${source}: ${err.message}`)
      return res
    }
  }
}

module.exports = { vaultFetch, hydrateRows, VAULTED }
