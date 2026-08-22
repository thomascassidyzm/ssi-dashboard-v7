/**
 * GET /api/voices/report?course=deu_for_eng
 *
 * THE COURSE VOICE REPORT — VOICELAB job 4, the leg that makes it a lab rather than a
 * picker. It answers one question per course side: HAS THIS SIDE STAYED ONE PERSON?
 *
 * Spec: docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md §2 and §3.
 *
 * Four legs. Three of them are histograms of numbers the admission gates already compute,
 * and the fourth is one SQL query:
 *
 *   voice-id census   — how many distinct CANONICAL voices this side carries, and how many
 *                       clips on each. Cheap, exact, and it would have caught the German
 *                       drift in January. Served here.
 *   speaking rate     — syllables per second, from text and duration_ms. Served here, with
 *                       no decode at all: the syllable counter is the same vowel-group
 *                       counter tier 1 uses, so a consistent bias cancels out of the ratio.
 *   loudness          — integrated LUFS distribution. NOT served here: it needs the bytes.
 *                       VOICELAB measures it in the browser over a sample, the way VadLab
 *                       already measures a recording.
 *   pitch centre/spread — same: needs the bytes, measured client-side by vadProsody.js,
 *                       which computes exactly this and then deliberately throws it away
 *                       because for VAD the voice identity is noise. Here it is the signal.
 *
 * ⚠️ CAPS ARE STATED, NEVER SILENT. The rate leg reads a bounded sample per role and the
 * response says how many rows it read, how many exist, and whether it was capped. A report
 * that quietly truncates reads as "covered everything" when it did not.
 *
 * Read-only. This endpoint writes nothing and renders nothing.
 */

import { createRequire } from 'module'
import { getSupabase } from '../lib/supabase.js'

const require_ = createRequire(import.meta.url)
const { countSyllables } = require_('../../services/audio-intelligence/tiers/tier1-duration.cjs')
const { tryCanonicalVoiceId } = require_('../../services/shared/clip-identity.cjs')

/**
 * Every voice this endpoint reports is CANONICAL, falling back to the raw value when the
 * canonicaliser does not recognise it. Grouping on the raw column is what made `ara` and
 * `xai_ara` look like two voices and a third of the estate's apparent drift a
 * string-formatting artefact — and an unrecognised value must stay visible rather than
 * collapsing into one bucket with every other unrecognised value.
 */
const canonicalVoice = (v) => tryCanonicalVoiceId(v) || v

/** Rows read per role for the speaking-rate distribution. Stated in the response. */
const RATE_SAMPLE_CAP = 1500

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'

/** Public object URL for a stored clip, so the lab can play it without a signing round-trip. */
function clipUrl (s3Key) {
  return s3Key ? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}` : null
}

function quantiles (values) {
  if (!values.length) return null
  const v = [...values].sort((a, b) => a - b)
  const at = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * q)))]
  return {
    n: v.length,
    min: +v[0].toFixed(2),
    p10: +at(0.10).toFixed(2),
    median: +at(0.50).toFixed(2),
    p90: +at(0.90).toFixed(2),
    max: +v[v.length - 1].toFixed(2),
    iqr: +(at(0.75) - at(0.25)).toFixed(2),
  }
}

/** A histogram the screen can draw without deciding its own bins. */
function histogram (values, binWidth) {
  const bins = new Map()
  for (const x of values) {
    const b = Math.round(Math.floor(x / binWidth) * binWidth * 100) / 100
    bins.set(b, (bins.get(b) || 0) + 1)
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([bin, count]) => ({ bin, count }))
}

export default async function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const course = req.query?.course
  if (!course) return res.status(400).json({ error: 'course is required' })

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  try {
    const [censusRes, slotsRes] = await Promise.all([
      supabase.rpc('course_voice_census', { p_course: course }),
      supabase.rpc('course_ambiguous_slots', { p_course: course, p_limit: 200 }),
    ])
    if (censusRes.error) return res.status(500).json({ error: `census: ${censusRes.error.message}` })
    if (slotsRes.error) return res.status(500).json({ error: `ambiguous slots: ${slotsRes.error.message}` })

    const census = censusRes.data || []
    const ambiguous = slotsRes.data || []

    // Per-side summary — the number the drift question actually turns on.
    const bySide = {}
    for (const row of census) {
      const side = (bySide[row.role] ||= { role: row.role, clips: 0, voices: [], languages: new Set(), uncanonicalVoices: [] })
      side.clips += Number(row.clips)
      side.voices.push({
        voiceId: row.voice_id,
        canonical: row.voice_canonical,
        clips: Number(row.clips),
        language: row.language,
        firstClip: row.first_clip,
        lastClip: row.last_clip,
        veracity: {
          passed: Number(row.veracity_passed),
          failed: Number(row.veracity_failed),
          unchecked: Number(row.veracity_unchecked),
        },
        medianDurationMs: row.median_duration_ms,
      })
      side.languages.add(row.language)
      if (row.voice_canonical === false) side.uncanonicalVoices.push(row.voice_id)
    }

    // The speaking-rate distribution, per role, from text and duration alone.
    const roles = Object.keys(bySide)
    const rates = {}
    for (const role of roles) {
      const { data, error, count } = await supabase
        .from('course_audio')
        .select('text, duration_ms, language, voice_id', { count: 'exact' })
        .eq('course_code', course)
        .eq('role', role)
        .not('duration_ms', 'is', null)
        .limit(RATE_SAMPLE_CAP)
      if (error) { rates[role] = { error: error.message }; continue }

      const perVoice = {}
      for (const r of data || []) {
        const { sylls } = countSyllables(r.text, r.language)
        // A one-syllable clip is onset and release with nothing between; its "rate" is a
        // floor effect rather than a rate, so tier 1 refuses to score it and so does this.
        if (sylls < 2 || !r.duration_ms) continue
        const sps = sylls / (r.duration_ms / 1000)
        ;(perVoice[canonicalVoice(r.voice_id)] ||= []).push(sps)
      }
      rates[role] = {
        read: (data || []).length,
        exists: count ?? null,
        capped: (count ?? 0) > RATE_SAMPLE_CAP,
        cap: RATE_SAMPLE_CAP,
        // ⚠️ Rate here is syllables per FILE duration, not per speech span — the span needs
        // the bytes. It is therefore a lower bound on speaking rate and drifts with how much
        // padding the mastering left on. Good enough to see a side split into two
        // populations; not the admission gate's number, and labelled so nobody confuses them.
        basis: 'syllables per file duration (not speech span) — a distribution, not a gate',
        byVoice: Object.fromEntries(Object.entries(perVoice).map(([v, xs]) => [v, {
          ...quantiles(xs),
          histogram: histogram(xs, 0.25),
        }])),
      }
    }

    // A handful of playable clips per voice, so an outlier can be heard rather than argued
    // about. Stratified short / middle / long, because the short fragments are where TTS is
    // worst and where every German defect this week was found.
    const { data: sampleRows } = await supabase
      .from('course_audio')
      .select('id, role, voice_id, text, language, duration_ms, s3_key, veracity_pass')
      .eq('course_code', course)
      .not('s3_key', 'is', null)
      .order('duration_ms', { ascending: true })
      .limit(600)
    const samples = (sampleRows || []).map((r) => ({
      ...r,
      raw_voice_id: r.voice_id,
      voice_id: canonicalVoice(r.voice_id),
      url: clipUrl(r.s3_key),
    }))

    return res.json({
      course,
      generatedAt: new Date().toISOString(),
      sides: Object.values(bySide).map((s) => ({
        ...s,
        languages: [...s.languages],
        distinctVoices: s.voices.length,
        // The declared voice is not read here — it lives in the versioned config and the
        // screen holds it, so this endpoint stays a measurement and never a judgement.
        dominantVoice: s.voices[0]?.voiceId || null,
        dominantShare: s.clips ? +(s.voices[0].clips / s.clips).toFixed(4) : null,
      })),
      ambiguousSlots: {
        // Capped at 200 by the function; the count below is of what was returned, and it
        // says so rather than implying it is the total.
        returned: ambiguous.length,
        cappedAt: 200,
        slots: ambiguous,
      },
      rates,
      samples,
      caveats: [
        `speaking rate read at most ${RATE_SAMPLE_CAP} rows per role`,
        'rate is per file duration, not per speech span — the span needs the bytes',
        'loudness and pitch are measured in the browser over a sample, not here',
      ],
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
