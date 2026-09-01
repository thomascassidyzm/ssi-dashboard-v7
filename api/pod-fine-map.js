/**
 * Pod fine-map editor endpoint — save a DRAFT Aran-granularity unit map.
 *
 *   PATCH /api/pod-fine-map   body: { id, atom_map_fine }   auth required
 *
 * Writes ONLY listening_pod_sentences.atom_map_fine (the column the Pod Lab's
 * seam editor reads). It does not touch the live atom_map.
 *
 * IT IS NOT, HOWEVER, INVISIBLE TO LEARNERS, and this comment said it was until
 * 2026-09-01. `atom_map_fine` is read LIVE on the learner path: Listening Mode →
 * Dialogues → Drill selects it straight off listening_pod_sentences
 * (ssi-learning-app packages/player-vue/src/composables/useListeningPods.ts:179)
 * and feeds it to buildFusionGroups on every fetch — no cache, no render step,
 * nothing to approve. The slice-playback kill switch (packages/core/src/pods/
 * fusionDrill.ts:38) suppresses the sub-sentence AUDIO only, and says so in its
 * own words: "text chunking and glosses stay fully intact". So a seam or gloss
 * edited here is read by the next learner to open that pod. Treat it as a live
 * write, because it is one.
 *
 * The submitted units are verified
 * server-side to TILE the row's target_text per sentence (surfaces in order
 * reconstruct each sentence, never crossing a sentence boundary) so a bad
 * client can't persist seams the future Take G render couldn't cut at.
 */

import { getSupabase } from './lib/supabase.js'
import { verifySupabaseJWT } from './lib/auth.js'

const alnum = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')

function tilesPerSentence(units, targetText) {
  const sents = String(targetText).split(/(?<=[.!?。！？…])/).map(alnum).filter(Boolean)
  let si = 0
  let pos = 0
  for (const u of units) {
    const ua = alnum(u.target_surface)
    if (!ua) continue
    if (si >= sents.length) return false
    if (sents[si].slice(pos, pos + ua.length) !== ua) return false
    pos += ua.length
    if (pos === sents[si].length) {
      si++
      pos = 0
    }
  }
  return si === sents.length && pos === 0
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No session' })
  const user = await verifySupabaseJWT(token)
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

  const { id, atom_map_fine } = req.body || {}
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id is required' })
  if (!Array.isArray(atom_map_fine) || !atom_map_fine.length) {
    return res.status(400).json({ error: 'atom_map_fine is required (non-empty array)' })
  }
  for (const u of atom_map_fine) {
    if (!u || typeof u.target_surface !== 'string' || !u.target_surface.trim()) {
      return res.status(400).json({ error: 'every unit needs a target_surface' })
    }
  }

  const { data: row, error: rowErr } = await supabase
    .from('listening_pod_sentences')
    .select('id, target_text')
    .eq('id', id)
    .single()
  if (rowErr || !row) return res.status(404).json({ error: 'sentence not found' })

  if (!tilesPerSentence(atom_map_fine, row.target_text)) {
    return res.status(422).json({ error: 'units do not tile the target text per sentence' })
  }

  const { error: upErr } = await supabase
    .from('listening_pod_sentences')
    .update({ atom_map_fine })
    .eq('id', id)
  if (upErr) return res.status(500).json({ error: upErr.message })

  return res.json({ ok: true, units: atom_map_fine.length, saved_by: user.email || 'admin' })
}
