/**
 * GET /api/pod-content?course=<courseCode>&slug=<slug>
 *
 * Stage-0 course-preview backend for the listening pods. Returns the full
 * Atom-Fusion structure for one pod, ready for the tuner / preview UI.
 *
 * FLAT route (query params) on purpose: this repo's Vercel catch-all rewrite
 * `/((?!vfs).*)` -> /index.html shadows NESTED-dynamic functions
 * (api/<x>/[a]/[b].js fall through to index.html), but FLAT functions
 * (api/<name>.js, like api/algorithm-config.js) are matched before the rewrite.
 * So we serve this as a single flat function with query params.
 *
 *   { sentences: [
 *       { id, global_order, speaker, target_text, known_text,
 *         target_audio_id, known_audio_id,
 *         whole_take_url,   // signed S3 URL for target_audio_id (natural take)
 *         translation_url,  // signed S3 URL for known_audio_id (translation)
 *         intentions: [ { id, atoms: [
 *           { lego_key, target, known, explained, kind,
 *             target_start_ms, target_end_ms,
 *             // explained atoms only:
 *             means_audio_id, means_audio_url,   // "means, <gloss>" (SHARED en store)
 *             atom_audio_id,  atom_audio_url,    // File-2 target slice (per-language)
 *             bare_gloss_url } ] } ] } ] }       // bare English gloss (SHARED, sliced)
 *
 * The decomposition comes from listening_pod_sentences.atom_map (position
 * layer). The English KNOWN side ("means, <gloss>" + the bare-gloss slice) is a
 * SHARED store: course_code=pod_known_en, recorded once and reused across all
 * courses (pod_legos.explainer_audio_id points at the shared means-X row; the
 * bare gloss is the "· <gloss>" row matched by gloss text). The File-2 target
 * slice ("[atom] <target>") is per-language, owned by the course. Each audio id
 * resolves to a 1h signed S3 URL so the client plays them directly.
 *
 * Offsets stay NULL until the forced-align pass; the tuner plays the real
 * File-2 slice so it doesn't need them.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getSupabase } from './lib/supabase.js'

// Audio bucket — NOT process.env.S3_BUCKET: on Vercel that is the LFS/course-data
// bucket (popty-bach-lfs). Audio lives in ssi-audio-stage (s3-service.cjs hardcodes it).
const S3_BUCKET = process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const URL_TTL = 3600

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// Serving slugs, most-preferred first. An explicit allowlist, never a prefix
// match: an archived `pod-0-retired-…` keeps pod_type='core' through the
// rename and must never be served.
const SERVING_SLUGS = ['pod-1', 'pod-0']

async function servingSlug(supabase, courseCode) {
  const { data } = await supabase
    .from('listening_pods').select('slug, pod_type')
    .eq('course_code', courseCode).in('slug', SERVING_SLUGS)
  const core = (data || []).filter((p) => p.pod_type == null || p.pod_type === 'core')
  return SERVING_SLUGS.find((s) => core.some((p) => p.slug === s)) || 'pod-0'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const courseCode = req.query.course
  if (!courseCode) {
    return res.status(400).json({ error: 'course is required' })
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  // An omitted slug means "the pod this course serves", which stopped being
  // `pod-0` for everyone on Tom's 1-based ruling of 2026-08-22: hrv_for_eng
  // serves `pod-1` and the rest still serve `pod-0`. Same preference order as
  // src/lib/servingPod.js. An explicit ?slug= is honoured untouched.
  const slug = req.query.slug || await servingSlug(supabase, courseCode)

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

    // 2. inventory (identity layer) — explainer audio per lego_key.
    const { data: legos, error: lErr } = await supabase
      .from('pod_legos')
      .select('lego_key, target, known, explainer_audio_id')
      .eq('course_code', courseCode)
    if (lErr) return res.status(500).json({ error: lErr.message })
    const legoByKey = new Map((legos || []).map(l => [l.lego_key, l]))

    // 3. this course's comp:leo pod-explainer rows in ONE small query.
    //    These are the per-LANGUAGE assets: the File-2 atom-target slices keyed by
    //    "[atom] <target>" text (and, for legacy courses, the per-course means-X).
    const { data: caRows, error: caErr } = await supabase
      .from('course_audio')
      .select('id, text, s3_key')
      .eq('course_code', courseCode)
      .eq('role', 'pod_explainer')
      .eq('voice_id', 'comp:leo')
    if (caErr) return res.status(500).json({ error: caErr.message })

    const targetRowByText = new Map()  // "[atom] <target>" -> { id, s3_key }
    const s3KeyById = new Map()        // course_audio.id    -> s3_key
    for (const r of caRows || []) {
      s3KeyById.set(r.id, r.s3_key)
      if (typeof r.text === 'string' && r.text.startsWith('[atom] ')) targetRowByText.set(r.text, r)
    }

    // 3a. SHARED English known-side store (pod_known_en/en) — the means-X clips
    //     (recorded once, reused across all courses) and the bare-gloss slices
    //     keyed by "· <gloss>" text. pod_legos.explainer_audio_id points at the
    //     shared means-X row, so adding its s3_key to s3KeyById resolves the means
    //     URL by id. The bare gloss is resolved by normalized gloss text.
    const BARE_PREFIX = '· '
    const norm = (t) => String(t || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!。！]+$/, '')
    const bareKeyByGloss = new Map()  // normalized gloss -> s3_key  (the "· <gloss>" rows)
    const { data: sharedRows, error: shErr } = await supabase
      .from('course_audio')
      .select('id, text, s3_key')
      .eq('course_code', 'pod_known_en')
      .eq('language', 'en')
      .eq('role', 'pod_explainer')
      .eq('voice_id', 'comp:leo')
    if (shErr) return res.status(500).json({ error: shErr.message })
    for (const r of sharedRows || []) {
      s3KeyById.set(r.id, r.s3_key)
      if (typeof r.text === 'string' && r.text.startsWith(BARE_PREFIX)) {
        bareKeyByGloss.set(norm(r.text.slice(BARE_PREFIX.length)), r.s3_key)
      }
    }

    // 3b. whole-take (target_audio_id) + translation (known_audio_id) s3_keys for
    //     EVERY sentence, in ONE .in() query. These rows are NOT in the comp:leo
    //     pod_explainer set above (different role/voice), so fetch them by id.
    //     The explainer opener plays the whole-take; the tuner can use the
    //     translation for the whole-intention tier later.
    const sentAudioIds = []
    for (const s of sentences) {
      if (s.target_audio_id) sentAudioIds.push(s.target_audio_id)
      if (s.known_audio_id) sentAudioIds.push(s.known_audio_id)
    }
    if (sentAudioIds.length) {
      const { data: sentCa, error: scErr } = await supabase
        .from('course_audio')
        .select('id, s3_key')
        .in('id', sentAudioIds)
      if (scErr) return res.status(500).json({ error: scErr.message })
      for (const r of sentCa || []) s3KeyById.set(r.id, r.s3_key)
    }

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

    // 4. assemble.
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
          const targetRow = targetRowByText.get(`[atom] ${lego.target}`)
          const atomId = targetRow?.id || null
          // bare gloss: the "· <gloss>" slice from the SHARED store, matched by gloss text.
          const glossText = atom.known ?? lego.known ?? null
          const bareKey = glossText != null ? (bareKeyByGloss.get(norm(glossText)) || null) : null
          atom.means_audio_id = meansId
          atom.atom_audio_id = atomId
          atom.means_audio_url = await urlForId(meansId)   // "means, <gloss>" (shared)
          atom.atom_audio_url = await urlForId(atomId)      // File-2 target slice (per-language)
          atom.bare_gloss_url = await signKey(bareKey)       // bare English gloss (shared, sliced)
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
        whole_take_url: await urlForId(s.target_audio_id),  // natural whole-sentence target take
        translation_url: await urlForId(s.known_audio_id),  // known/English translation
        intentions: [{ id: 'all', atoms }],
      })
    }

    return res.json({ pod_id: podId, course_code: courseCode, slug, sentences: out })
  } catch (err) {
    console.error(`[pod-content] ${podId} failed:`, err.message)
    return res.status(500).json({ error: 'Failed to build pod', message: err.message })
  }
}
