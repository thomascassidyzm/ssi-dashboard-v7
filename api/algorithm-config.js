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
import { validateSession } from './lib/auth.js'

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
    const sessionId = (req.headers.authorization || '').replace('Bearer ', '')
    if (!sessionId) return res.status(401).json({ error: 'No session' })
    const user = await validateSession(sessionId)
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

    const { key, config } = req.body || {}
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key is required (string)' })
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ error: 'config is required (object)' })
    }

    const { data, error } = await supabase
      .from('algorithm_config')
      .update({
        config,
        updated_at: new Date().toISOString(),
        updated_by: user.email || 'admin',
      })
      .eq('key', key)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: `No row for key=${key}` })
    return res.json({ row: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
