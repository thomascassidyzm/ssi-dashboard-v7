/**
 * GET /api/voices/audition?course=deu_for_eng&role=target1&size=24
 *
 * VOICELAB jobs 1 and 2 — audition candidate voices on REAL course sentences, and compare
 * providers on identical text.
 *
 * THE ONE HARD CONSTRAINT THIS ENDPOINT EXISTS TO ENFORCE:
 *
 *   **VOICELAB auditions from the store first.**
 *
 * A (language, text, voice) that already exists is free to audition and the estate has
 * ~2.5 million of them. So this endpoint does not render anything and cannot render
 * anything. It picks a stratified set of real course sentences and, for each, returns
 * EVERY take that already exists anywhere in the estate for that text and language,
 * whatever course it was made for and whatever voice said it. What comes back is the half
 * of the A/B that is already paid for; what is missing is the exact list of clips a sample
 * run would have to render, and the screen shows that list before anyone spends anything.
 *
 * ── THE STRATIFICATION IS THE POINT ─────────────────────────────────────────────────
 * Not the first N rows — that is a sample of the easiest material. Deliberately:
 *   - the SHORTEST texts, where the intercept dominates and truncation hides. Seed-1
 *     fragments are where every German defect this week was found.
 *   - the LONGEST, where prosody drifts and a voice runs out of breath.
 *   - a few from the MIDDLE, so the sample can calibrate as well as catch.
 * The phonologically-awkward axis the spec also names is language-specific and is left to
 * the operator: the screen lets you pin extra sentences into the set by hand.
 *
 * ── SIZE ────────────────────────────────────────────────────────────────────────────
 * Default 24, floor 12. The floor is not taste: tools/audio-pace-gate.cjs refuses to
 * calibrate on fewer than 12 reference clips and says so rather than guessing, so a sample
 * below that cannot be engine-judged at all. 40 is the widened default for a voice with no
 * track record in the language.
 *
 * Read-only. Renders nothing, writes nothing, spends nothing.
 */

import { createRequire } from 'module'
import { getSupabase } from '../lib/supabase.js'

const require_ = createRequire(import.meta.url)
const { tryCanonicalVoiceId } = require_('../../services/shared/clip-identity.cjs')

/** Canonical spelling, raw kept alongside — `ara` and `xai_ara` are one voice to audition. */
const canonicalVoice = (v) => tryCanonicalVoiceId(v) || v

const DEFAULT_SIZE = 24
const MIN_SIZE = 12

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'

function clipUrl (s3Key) {
  return s3Key ? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}` : null
}

/**
 * Short / long / middle, in that order of importance. Deterministic given the same rows,
 * so an audition is repeatable and two people compare the same sentences.
 */
function stratify (rows, size) {
  const byLength = [...rows].sort((a, b) => (a.text || '').length - (b.text || '').length)
  const shortCount = Math.ceil(size * 0.4)
  const longCount = Math.ceil(size * 0.3)
  const midCount = Math.max(0, size - shortCount - longCount)

  const short = byLength.slice(0, shortCount).map((r) => ({ ...r, stratum: 'short' }))
  const long = byLength.slice(-longCount).map((r) => ({ ...r, stratum: 'long' }))
  const midStart = Math.max(shortCount, Math.floor((byLength.length - midCount) / 2))
  const middle = byLength.slice(midStart, midStart + midCount).map((r) => ({ ...r, stratum: 'middle' }))

  const seen = new Set()
  return [...short, ...middle, ...long].filter((r) => {
    if (seen.has(r.text_normalized)) return false
    seen.add(r.text_normalized)
    return true
  })
}

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const course = req.query?.course
  const role = req.query?.role || 'target1'
  const size = Math.max(MIN_SIZE, Number(req.query?.size) || DEFAULT_SIZE)
  if (!course) return res.status(400).json({ error: 'course is required' })

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  try {
    // The pool the sample is drawn from. Capped, and the cap is reported.
    const POOL_CAP = 2000
    const { data: pool, error } = await supabase
      .from('course_audio')
      .select('text, text_normalized, language, duration_ms')
      .eq('course_code', course)
      .eq('role', role)
      .limit(POOL_CAP)
    if (error) return res.status(500).json({ error: error.message })
    if (!pool?.length) return res.status(404).json({ error: `no ${role} rows for ${course}` })

    // One row per text — the same sentence can carry several takes, and the audition is
    // about the sentence.
    const byText = new Map()
    for (const r of pool) if (!byText.has(r.text_normalized)) byText.set(r.text_normalized, r)
    const sentences = stratify([...byText.values()], size)

    // Every take that already exists for those sentences, ANYWHERE in the estate. This is
    // the half of the A/B that costs nothing.
    const norms = sentences.map((s) => s.text_normalized)
    const language = sentences[0]?.language
    const { data: takes, error: takesErr } = await supabase
      .from('course_audio')
      .select('id, course_code, role, voice_id, text, text_normalized, language, duration_ms, s3_key, veracity_pass, created_at')
      .in('text_normalized', norms)
      .eq('language', language)
      .not('s3_key', 'is', null)
      .limit(5000)
    if (takesErr) return res.status(500).json({ error: takesErr.message })

    const takesByText = {}
    const voicesSeen = new Map()
    for (const t of takes || []) {
      const voice = canonicalVoice(t.voice_id)
      ;(takesByText[t.text_normalized] ||= []).push({ ...t, raw_voice_id: t.voice_id, voice_id: voice, url: clipUrl(t.s3_key) })
      voicesSeen.set(voice, (voicesSeen.get(voice) || 0) + 1)
    }

    return res.json({
      course,
      role,
      language,
      size: sentences.length,
      requestedSize: size,
      minSize: MIN_SIZE,
      pool: { read: pool.length, cap: POOL_CAP, capped: pool.length >= POOL_CAP, distinctTexts: byText.size },
      sentences: sentences.map((s) => ({
        text: s.text,
        textNormalized: s.text_normalized,
        language: s.language,
        stratum: s.stratum,
        existingTakes: takesByText[s.text_normalized] || [],
      })),
      // Which voices this sample can be heard on right now, for nothing.
      freeVoices: [...voicesSeen.entries()]
        .map(([voiceId, clips]) => ({ voiceId, clips }))
        .sort((a, b) => b.clips - a.clips),
      note: 'Nothing here renders. Voices absent from freeVoices are what a sample run would have to '
        + 'render — that list is the spend, and it is shown before anything is spent.',
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
