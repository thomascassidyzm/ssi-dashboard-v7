/**
 * Algorithm Config — read/write the algorithm_config table.
 *
 *   GET  /api/algorithm-config              → all rows
 *   GET  /api/algorithm-config?key=pods     → single row (currently same handler)
 *   PATCH /api/algorithm-config             → body: { key, config }, auth required
 *
 * Reads use the service-role client too (just for consistency); table is
 * permissive on SELECT anyway. Writes require a valid popty session — the
 * RLS policy on algorithm_config restricts INSERT/UPDATE to service_role,
 * so admins go through this endpoint rather than direct Supabase calls.
 */

import { getSupabase } from './lib/supabase.js'
import { verifySupabaseJWT } from './lib/auth.js'

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
    return res.json({ rows: data || [] })
  }

  if (req.method === 'PATCH') {
    // Auth required for writes — preserves the "service_role only" RLS intent.
    // Frontend sends a Supabase JWT (from supabase.auth.getSession), not a legacy session ID.
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No session' })
    const user = await verifySupabaseJWT(token)
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

    const { key, config } = req.body || {}
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required (string)' })
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ error: 'config is required (object)' })
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
        updated_by: user.email || 'admin',
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(500).json({ error: `Upsert returned no row for key=${key}` })
    return res.json({ row: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
