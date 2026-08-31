/**
 * VOICELAB job 3 — LOCK A COURSE SIDE'S VOICE.
 *
 *   GET  /api/voices/declare                → the declarations and the capability matrix
 *   POST /api/voices/declare                → declare one side; auth required
 *        body: { course, role, voiceId, language, note? }
 *
 * This is step 0 of the German and French migrations: one voice per side per course,
 * frozen as a versioned config. **No audio is touched and it costs nothing** — and it is
 * what makes every later step unambiguous.
 *
 * ── WHY IT IS AN ENDPOINT AND NOT A FORM FIELD ──────────────────────────────────────
 * Because a declaration is GATED, and the gate has to live where the write happens. A side
 * may not declare a CLONE for a language where that (clone, language) pair has no passing
 * VOICELAB verdict. That single check is the entire mechanism by which "SSi staff clones,
 * used multilingually wherever the clone is capable" stops being a hope and becomes a
 * process with an entry gate. The rule itself lives in
 * `services/shared/voice-declarations.cjs`, where the renderer's corridor check reads it
 * too, so there is one rule and not a UI copy of one.
 *
 * ── WHAT IT WRITES ──────────────────────────────────────────────────────────────────
 * Two versioned configs, through the same immutable path every other config now uses
 * (`recordVersionAndPointer`): `voice_declarations` and `voice_capability`. So "which
 * voice was this course built under" is answerable by hash, and undeclaring a mistake is
 * a repoint rather than a memory of the old value.
 *
 * Nothing here renders audio. Nothing here deletes anything.
 */

import { createRequire } from 'module'
import { getSupabase } from '../lib/supabase.js'
import { verifySupabaseJWT } from '../lib/auth.js'
import { recordVersionAndPointer } from '../algorithm-config.js'
import consentGate from '../../services/shared/voice-consent-gate.cjs'

const require_ = createRequire(import.meta.url)
const vd = require_('../../services/shared/voice-declarations.cjs')

const DECLARATIONS_KEY = 'voice_declarations'
const CAPABILITY_KEY = 'voice_capability'

async function readConfig (supabase, key, fallback) {
  const { data, error } = await supabase.from('algorithm_config').select('key, config').eq('key', key).maybeSingle()
  if (error) throw new Error(`${key}: ${error.message}`)
  return data?.config || fallback
}

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  try {
    if (req.method === 'GET') {
      const [declarations, capability] = await Promise.all([
        readConfig(supabase, DECLARATIONS_KEY, { courses: {} }),
        readConfig(supabase, CAPABILITY_KEY, {}),
      ])
      return res.json({ declarations, capability })
    }

    if (req.method === 'POST') {
      const token = (req.headers.authorization || '').replace('Bearer ', '')
      if (!token) return res.status(401).json({ error: 'No session' })
      const user = await verifySupabaseJWT(token)
      if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

      const { course, role, voiceId, language, note } = req.body || {}
      if (!course || !role || !voiceId || !language) {
        return res.status(400).json({ error: 'course, role, voiceId and language are all required' })
      }
      if (!vd.ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of ${vd.ROLES.join(', ')}` })
      }

      // ── NO CONSENT, NO DECLARATION (Tom, 2026-08-31) ────────────────────
      // A declaration LOCKS a course side to a voice, so it is a cast under
      // another name. The VOICELAB capability gate below asks "can this clone
      // speak this language?", which is a different question from "did the
      // person say yes" — a capable clone of somebody who never consented
      // passes it. Both have to hold.
      try {
        await consentGate.assertConsented(String(voiceId), { db: supabase, context: `declare ${course}/${role}` })
      } catch (err) {
        return res.status(err.status || 409).json({ error: err.message, code: err.code || 'NO_RECORDED_CONSENT', voiceId, language })
      }

      const capability = await readConfig(supabase, CAPABILITY_KEY, {})
      const check = vd.canDeclare(capability, voiceId, language)
      if (!check.allowed) {
        // 409, not 400: the request is well-formed and the answer is "not yet".
        return res.status(409).json({
          error: check.reason,
          requiresExperiment: check.requiresExperiment,
          voiceId: vd.canonical(voiceId),
          language,
        })
      }

      const declarations = await readConfig(supabase, DECLARATIONS_KEY, { courses: {} })
      const next = {
        ...declarations,
        courses: {
          ...(declarations.courses || {}),
          [course]: {
            ...((declarations.courses || {})[course] || {}),
            [role]: vd.canonical(voiceId),
          },
        },
      }

      const configHash = await recordVersionAndPointer(supabase, {
        key: DECLARATIONS_KEY,
        config: next,
        channel: 'published',
        note: note || `declare ${course}/${role} = ${vd.canonical(voiceId)}`,
        actor: user.email || 'admin',
      })

      const { error: liveError } = await supabase
        .from('algorithm_config')
        .upsert({
          key: DECLARATIONS_KEY,
          config: next,
          updated_at: new Date().toISOString(),
          updated_by: user.email || 'admin',
        }, { onConflict: 'key' })
      if (liveError) return res.status(500).json({ error: liveError.message })

      return res.json({
        declarations: next,
        configHash,
        declared: { course, role, voiceId: vd.canonical(voiceId), language },
        capabilityNote: check.reason,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
