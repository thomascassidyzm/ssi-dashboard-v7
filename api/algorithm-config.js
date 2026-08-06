/**
 * Algorithm Config — read/write the algorithm_config table.
 *
 *   GET  /api/algorithm-config              → all rows
 *   GET  /api/algorithm-config?key=pods     → single row (currently same handler)
 *   PATCH /api/algorithm-config             → body: { key, config, channel?, note? }, auth required
 *
 * Reads use the service-role client too (just for consistency); table is
 * permissive on SELECT anyway. Writes require a valid popty session — the
 * RLS policy on algorithm_config restricts INSERT/UPDATE to service_role,
 * so admins go through this endpoint rather than direct Supabase calls.
 *
 * VERSIONING (2026-08-06, additive). algorithm_config is one row per key,
 * upserted in place, and the learning app caches it for five minutes — so a
 * Save here has always been a production deploy to every learner with no undo,
 * and PodLab opted out of writing config at all because of it. Every write now
 * ALSO records the config immutably in algorithm_config_versions (addressed by
 * its own content) and moves a pointer in algorithm_config_pointers. See
 * database/migrations/20260806_algorithm_config_versions.sql.
 *
 * What did NOT change, deliberately:
 *   * the GET response shape — config_hash is an ADDITIONAL field on each row;
 *   * the PATCH response for a published save — still { row }, now with a
 *     config_hash beside it;
 *   * the write to algorithm_config itself, which is still the live value the
 *     learner path reads.
 *
 * So ListeningConfig, SpeakingConfig, VadLab, PodLab and the learning app need
 * no change at all. A caller that wants the new behaviour passes
 * channel: 'draft', which writes a version and a draft pointer and leaves the
 * live config strictly alone.
 */

import { getSupabase } from './lib/supabase.js'
import { verifySupabaseJWT } from './lib/auth.js'
import { hashConfig } from './lib/config-hash.js'

const CHANNELS = ['published', 'draft']

/**
 * Record a config in the immutable store and point `channel` at it.
 *
 * Version insert is ON CONFLICT DO NOTHING: the hash IS the row's identity, so
 * re-saving an unchanged config is a no-op rather than a duplicate or an error.
 * Both writes must land before the caller is told the save succeeded — a
 * pointer naming a version that failed to insert is exactly the dangling state
 * the FK exists to prevent, so errors propagate rather than being logged.
 */
export async function recordVersionAndPointer(supabase, { key, config, channel, note, actor }) {
  const configHash = hashConfig(key, config)

  const { error: versionError } = await supabase
    .from('algorithm_config_versions')
    .upsert(
      { config_hash: configHash, key, config, created_by: actor, note: note || null },
      { onConflict: 'config_hash', ignoreDuplicates: true }
    )
  if (versionError) throw new Error(`version insert failed: ${versionError.message}`)

  const { error: pointerError } = await supabase
    .from('algorithm_config_pointers')
    .upsert(
      {
        key,
        channel,
        config_hash: configHash,
        updated_at: new Date().toISOString(),
        updated_by: actor,
      },
      { onConflict: 'key,channel' }
    )
  if (pointerError) throw new Error(`pointer upsert failed: ${pointerError.message}`)

  return configHash
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = getSupabase()
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  if (req.method === 'GET') {
    const key = req.query?.key
    let q = supabase.from('algorithm_config').select('key, config, description, updated_at, updated_by').order('key')
    if (key) q = q.eq('key', key)
    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const rows = data || []

    // config_hash is additive and best-effort: a row whose published pointer is
    // missing (a key created before this migration, or by a direct DB insert)
    // reports config_hash: null rather than failing the read. The config page
    // must keep loading even if the versioning tables are unreachable.
    let hashByKey = {}
    const { data: pointers, error: pointerError } = await supabase
      .from('algorithm_config_pointers')
      .select('key, config_hash')
      .eq('channel', 'published')
    if (pointerError) {
      console.warn('[algorithm-config] published pointers unavailable:', pointerError.message)
    } else {
      hashByKey = Object.fromEntries((pointers || []).map(p => [p.key, p.config_hash]))
    }

    return res.json({ rows: rows.map(r => ({ ...r, config_hash: hashByKey[r.key] ?? null })) })
  }

  if (req.method === 'PATCH') {
    // Auth required for writes — preserves the "service_role only" RLS intent.
    // Frontend sends a Supabase JWT (from supabase.auth.getSession), not a legacy session ID.
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No session' })
    const user = await verifySupabaseJWT(token)
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

    const { key, config, channel = 'published', note } = req.body || {}
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required (string)' })
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ error: 'config is required (object)' })
    }
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ error: `channel must be one of ${CHANNELS.join(', ')}` })
    }

    const actor = user.email || 'admin'

    // The version is written FIRST, for both channels. If the live write below
    // fails, the estate is left with a recorded config nobody is serving —
    // harmless. The reverse order could publish a value with no history.
    let configHash
    try {
      configHash = await recordVersionAndPointer(supabase, { key, config, channel, note, actor })
    } catch (e) {
      return res.status(500).json({ error: e.message })
    }

    // A draft exists WITHOUT being live: algorithm_config is not touched, so
    // nothing reaches a learner. This is what PodLab's clipboard was standing in for.
    if (channel === 'draft') {
      return res.json({ draft: { key, config_hash: configHash, config } })
    }

    // Upsert, not update: a bare .update().eq('key') returned 404 for a key that
    // did not exist yet, which made "add a mode" an engineering ticket (a manual
    // SQL insert) rather than an admin action. Creating easy_mode via this
    // endpoint is exactly that case. onConflict:'key' keeps an existing row's
    // identity and overwrites its config, so the update path is unchanged.
    const { data, error } = await supabase
      .from('algorithm_config')
      .upsert({
        key,
        config,
        updated_at: new Date().toISOString(),
        updated_by: actor,
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(500).json({ error: `Upsert returned no row for key=${key}` })
    return res.json({ row: data, config_hash: configHash })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
