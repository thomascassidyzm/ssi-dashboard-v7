/**
 * GET /api/pods/:courseCode/:slug
 *
 * Stage-0 course-preview backend for the listening pods. Returns the full
 * Atom-Fusion structure for one pod, ready for the tuner / preview UI:
 *
 *   { sentences: [
 *       { global_order, speaker, target_text, known_text,
 *         target_audio_id, known_audio_id,
 *         intentions: [ { id, clauseText, atoms: [
 *           { target, known, explained, kind,
 *             // explained atoms only:
 *             means_audio_id, means_audio_url,
 *             atom_audio_id,  atom_audio_url } ] } ] } ] }
 *
 * The decomposition (intentions -> atoms) comes from
 * listening_pod_sentences.atom_map (the position layer); the per-atom explainer
 * + File-2 slice audio comes from pod_legos (the identity layer) joined on
 * lego_key. Each explained atom's two audio ids are resolved to a signed S3 URL
 * (1h) so the client can play them directly — no per-clip URL round-trips.
 *
 * Offsets (target_start_ms / target_end_ms) stay NULL until the forced-align
 * pass runs; the tuner plays the real File-2 slice so it doesn't need them.
 *
 * Auto-routed by Vercel file-based routing: api/pods/[courseCode]/[slug].js.
 *   e.g. /api/pods/spa_for_eng/pod-0
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getSupabase } from '../../lib/supabase.js'

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const URL_TTL = 3600

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { courseCode, slug } = req.query
  if (!courseCode || !slug) {
    return res.status(400).json({ error: 'courseCode and slug are required' })
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  const podId = `${courseCode}:${slug}`

  try {
    // 1. sentences (position layer) — ordered, with their atom_map decomposition.
    const { data: sentences, error: sErr } = await supabase
      .from('listening_pod_sentences')
      .select('id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, atom_map')
      .eq('pod_id', podId)
      .order('global_order')
    if (sErr) return res.status(500).json({ error: sErr.message })
    if (!sentences || sentences.length === 0) {
      return res.status(404).json({ error: `No sentences for pod ${podId}` })
    }

    // 2. inventory (identity layer) — explainer + atom-target audio per lego_key.
    const { data: legos, error: lErr } = await supabase
      .from('pod_legos')
      .select('lego_key, target, known, explainer_audio_id')
      .eq('course_code', courseCode)
    if (lErr) return res.status(500).json({ error: lErr.message })
    const legoByKey = new Map((legos || []).map(l => [l.lego_key, l]))

    // 3. resolve s3_key -> signed URL for every audio id we will hand back.
    //    Pull this course's comp:leo pod-explainer rows in ONE small query (no
    //    giant .in() filter — the 360 long "[atom] <target>" strings overflow
    //    the GET URL). The atom-target slices are keyed by "[atom] <target>";
    //    index them by text. The explainer (means-gloss) rows are referenced by
    //    id from pod_legos; index s3_key by id from the same fetch.
    const { data: caRows, error: caErr } = await supabase
      .from('course_audio')
      .select('id, text, s3_key')
      .eq('course_code', courseCode)
      .eq('role', 'pod_explainer')
      .eq('voice_id', 'comp:leo')
    if (caErr) return res.status(500).json({ error: caErr.message })

    const targetIdByText = new Map()   // "[atom] <target>" -> { id, s3_key }
    const s3KeyById = new Map()        // course_audio.id    -> s3_key
    for (const r of caRows || []) {
      s3KeyById.set(r.id, r.s3_key)
      if (typeof r.text === 'string' && r.text.startsWith('[atom] ')) targetIdByText.set(r.text, r)
    }

    // sign every distinct s3_key once.
    const urlByKey = new Map()
    async function signKey(s3Key) {
      if (!s3Key) return null
      if (urlByKey.has(s3Key)) return urlByKey.get(s3Key)
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }), { expiresIn: URL_TTL })
      urlByKey.set(s3Key, url)
      return url
    }
    async function urlForId(id) {
      if (!id) return null
      return signKey(s3KeyById.get(id))
    }

    // 4. assemble the response. atom_map carries the ordered atoms; we group
    //    them back into the intention shape the UI expects, attaching audio.
    const out = []
    for (const s of sentences) {
      const atomMap = Array.isArray(s.atom_map) ? s.atom_map : []
      const atoms = []
      for (const e of atomMap) {
        const lego = legoByKey.get(e.lego_key)
        const explained = e.kind === 'atom'
        const atom = {
          lego_key: e.lego_key,
          target: e.target_surface ?? lego?.target ?? null,
          known: e.gloss ?? lego?.known ?? null,
          explained,
          kind: e.kind,
          target_start_ms: e.target_start_ms ?? null,
          target_end_ms: e.target_end_ms ?? null,
        }
        if (explained && lego) {
          const meansId = lego.explainer_audio_id || null
          const targetRow = targetIdByText.get(`[atom] ${lego.target}`)
          const atomId = targetRow?.id || null
          atom.means_audio_id = meansId
          atom.atom_audio_id = atomId
          atom.means_audio_url = await urlForId(meansId)
          atom.atom_audio_url = await urlForId(atomId)
        }
        atoms.push(atom)
      }

      out.push({
        id: s.id,
        global_order: s.global_order,
        speaker: s.speaker,
        target_text: s.target_text,
        known_text: s.known_text,
        target_audio_id: s.target_audio_id,
        known_audio_id: s.known_audio_id,
        // single flat intention carrying the ordered atoms (the atom_map is
        // already the flattened, ordered decomposition for this sentence).
        intentions: [{ id: 'all', atoms }],
      })
    }

    return res.json({ pod_id: podId, course_code: courseCode, slug, sentences: out })
  } catch (err) {
    console.error(`[pods] ${podId} failed:`, err.message)
    return res.status(500).json({ error: 'Failed to build pod', message: err.message })
  }
}
