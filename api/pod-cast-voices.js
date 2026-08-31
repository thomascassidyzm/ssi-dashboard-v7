/**
 * Pod cast voices — the MANUAL voice choice behind PodLab's two dropdowns.
 *
 * Tom, 2026-08-11, after rejecting the Spanish pod-0 cast ("Spanish needs
 * Iberian Spanish, not Mexican pronounciation, that's a different course"):
 *
 *   "should the casting process, in the PODLAB allow voice choice? I think it
 *    should […] it's worth choosing the voices manually if there's only 2 of
 *    them"
 *
 *   GET  /api/pod-cast-voices?course=<code>          auth required
 *        → the curated pool for this course's target and known languages, the
 *          pool KEY each resolved to, and the pods it could write. The wider
 *          discovered inventory is NOT served here — that is
 *          GET /api/voices/discover/:language on production-api, which PodLab
 *          already calls for VoiceLab.
 *   POST /api/pod-cast-voices                        auth required
 *        body { course_code, pod_id?, target: {m,f}, known?: {m,f},
 *               cast_fingerprint? }
 *        → re-runs the ONE casting implementation (assignVoices in
 *          tools/pod-sync.cjs) with those overrides and writes the result to
 *          listening_pods.speakers.
 *
 * WHY IT SITS HERE, next to pod-voice-approval.js: this is the same surface,
 * doing the other half of the same job. PodLab reads the cast from
 * /api/pod-voice-approval and writes its decision back to it, both as plain
 * same-origin fetches; a manual recast is one more write on that surface, and
 * putting it anywhere else would mean a second auth story for one page.
 *
 * ⚠️ MAKE BEFORE BREAK. This route writes `listening_pods.speakers` and NOTHING
 * ELSE. It must NEVER null target_audio_id / known_audio_id on
 * listening_pod_sentences, and it never generates audio. Corrected casting sits
 * in place until a re-render is approved — exactly the contract
 * tools/pod-recast.cjs carries, and the opposite of tools/pod-recolour.cjs.
 *
 * CHANGING THE CAST INVALIDATES THE APPROVAL, ON PURPOSE. The gate's
 * fingerprint is a digest of the stored cast, so a manual recast moves it and
 * any approval granted against the old cast stops counting by itself. The
 * response carries the new fingerprint and the gate's fresh verdict so the page
 * can say so out loud rather than showing a stale green tick.
 *
 * ⚠️ NOT DURABLE AGAINST A RE-SYNC. The choice lives only in the written cast.
 * Re-running tools/pod-sync.cjs on the pod's markdown re-casts from the pool
 * and will stomp it back to the pool default. There is no separate override
 * table by design (one source of casting truth); re-apply here after a re-sync.
 */

import { getSupabase } from './lib/supabase.js'
import { verifySupabaseJWT } from './lib/auth.js'
import approvals from '../services/pod-voice-approvals.cjs'
import podSync from '../tools/pod-sync.cjs'
import consentGate from '../services/shared/voice-consent-gate.cjs'

const { castFingerprint, loadCastPods, loadApprovals, evaluateApproval, resolveCurrentPod0 } = approvals
const { assignVoices, loadVoicePools, poolKeysForCourse, canonicalSpeakerName } = podSync

const PROVIDERS = new Set(['xai', 'azure', 'elevenlabs'])

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = getSupabase()
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })

  // Same auth as the approval route this sits beside — a dashboard session.
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No session' })
  const user = await verifySupabaseJWT(token)
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' })

  try {
    if (req.method === 'GET') return await getPools(req, res, supabase)
    return await postApply(req, res, supabase, user)
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) })
  }
}

async function courseOf(supabase, courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, display_name, target_lang, known_lang, voice_pool_key')
    .eq('course_code', courseCode)
    .maybeSingle()
  if (error) throw new Error(`load course: ${error.message}`)
  if (!data) throw new Error(`no such course: ${courseCode}`)
  return data
}

// The curated pool for each track, plus the KEY it resolved to. The key is
// shown to the human because it is the whole Iberian-vs-Mexican story: `spa`
// and `spa_mx` are genuinely distinct casts, and a course landing on the wrong
// one is invisible unless the key is on screen.
async function getPools(req, res, supabase) {
  const courseCode = String(req.query.course || '').trim()
  if (!courseCode) return res.status(400).json({ error: 'course is required' })

  const course = await courseOf(supabase, courseCode)
  const pools = await loadVoicePools()
  // The COURSE's keys, not the raw target_lang: a regional-variant course
  // carries the base tag in target_lang and its real pool key in
  // voice_pool_key (T-21, 2026-08-17). Reading target_lang here is what made
  // deu_at_for_eng and deu_for_eng share one casting slot.
  const { target: tk, known: kk } = poolKeysForCourse(pools, course)

  return res.json({
    course_code: courseCode,
    target_lang: course.target_lang,
    known_lang: course.known_lang,
    voice_pool_key: course.voice_pool_key || null,
    target: { pool_key: tk, exists: !!pools[tk], pool: pools[tk] || { f: [], m: [] } },
    known: { pool_key: kk, exists: !!pools[kk], pool: pools[kk] || { f: [], m: [] } },
    // Every regional key the pools carry for this base language, so the page can
    // say "spa_mx also exists" rather than leaving a wrong-region cast silent.
    sibling_keys: Object.keys(pools)
      .filter((k) => k !== tk && k.split('_')[0] === String(tk).split('_')[0])
      .sort(),
  })
}

// Azure voice ids encode their own locale ('es-ES-ElviraNeural' → 'es-ES').
// That is the ONLY locale this route derives: no language map lives here, so
// there is nothing to drift. Every other locale is whatever the picker sent —
// for xAI that steering tag IS the Iberian-vs-Mexican choice, so it must be the
// human's, not a guess made server-side.
function azureLocale(voiceId) {
  const m = String(voiceId || '').match(/^([a-z]{2,3}(?:-[A-Za-z]{4})?-[A-Z]{2})-/)
  return m ? m[1] : null
}

// One chosen voice, validated. Refusing junk here is what stops a typo in a
// voice_id becoming a pod that renders silence three approvals later.
function readVoice(v, where) {
  if (v == null) return null
  if (typeof v !== 'object') throw new Error(`${where}: must be an object`)
  const voiceId = String(v.voice_id || '').trim()
  if (!voiceId) throw new Error(`${where}: voice_id is required`)
  if (voiceId.length > 200) throw new Error(`${where}: voice_id is implausibly long`)
  const provider = String(v.provider || 'xai').toLowerCase()
  if (!PROVIDERS.has(provider)) throw new Error(`${where}: unknown provider "${provider}"`)
  const out = { provider, voice_id: voiceId, name: String(v.name || voiceId).slice(0, 120) }
  if (v.locale) {
    const locale = String(v.locale).trim()
    if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale)) throw new Error(`${where}: locale "${locale}" is not a BCP-47 tag`)
    out.locale = locale
  } else {
    const derived = azureLocale(voiceId)
    if (derived) out.locale = derived
  }
  return out
}

function readOverrides(body) {
  const out = {}
  for (const track of ['target', 'known']) {
    const t = body[track]
    if (!t || typeof t !== 'object') continue
    const slot = {}
    for (const g of ['m', 'f']) {
      const v = readVoice(t[g], `${track}.${g}`)
      if (v) slot[g] = v
    }
    if (Object.keys(slot).length) out[track] = slot
  }
  return out
}

async function postApply(req, res, supabase, user) {
  const body = req.body || {}
  const courseCode = String(body.course_code || '').trim()
  if (!courseCode) return res.status(400).json({ error: 'course_code is required' })

  let overrides
  try {
    overrides = readOverrides(body)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  if (!Object.keys(overrides).length) {
    return res.status(400).json({ error: 'nothing to apply — give at least one of target.m / target.f / known.m / known.f' })
  }

  // ── NO CONSENT, NO CAST (Tom's ruling, 2026-08-31) ────────────────────────
  // "we are never going to use a voice without consent." This route writes
  // listening_pods.speakers, which is a cast in every sense that matters — it
  // decides who speaks a pod to a learner — so it takes the same lock as the
  // Voice Lab's slot endpoint. The pools it picks from are vendor stock today,
  // which is exactly why the check costs nothing and is worth having: the day
  // a clone enters a pool, nobody has to remember this route exists.
  for (const [track, slot] of Object.entries(overrides)) {
    for (const [gender, entry] of Object.entries(slot || {})) {
      const vid = entry && entry.voice_id
      if (!vid) continue
      try {
        await consentGate.assertConsented(String(vid), { db: supabase, provider: entry.provider || null, context: `${courseCode} pod cast ${track}.${gender}` })
      } catch (err) {
        return res.status(err.status || 409).json({ error: err.message, code: err.code || 'NO_RECORDED_CONSENT', where: `${track}.${gender}`, voiceId: vid })
      }
    }
  }

  const course = await courseOf(supabase, courseCode)
  const poolKeys = poolKeysForCourse(await loadVoicePools(), course)

  // Which pod. Default is the CURRENT pod — the one PodLab shows and samples,
  // resolved by the gate's own resolveCurrentPod0 and never assumed to be
  // `<course>:pod-0`, because for spa/cym that is the stale or emptied copy.
  // Course-wide is deliberately NOT the default: the other pods are not on
  // screen, not sampled, and a cast you cannot hear is a cast you cannot judge.
  const pods = await loadCastPods(supabase, courseCode)
  if (!pods.length) return res.status(404).json({ error: `no pods found for ${courseCode}` })

  const podIds = pods.map((p) => p.id)
  const { data: meta, error: metaErr } = await supabase
    .from('listening_pods').select('id, slug').in('id', podIds)
  if (metaErr) throw new Error(`load pod slugs: ${metaErr.message}`)
  const slugById = new Map((meta || []).map((m) => [m.id, m.slug]))

  const { data: lines, error: lineErr } = await supabase
    .from('listening_pod_sentences').select('pod_id, speaker').in('pod_id', podIds)
  if (lineErr) throw new Error(`load pod speakers: ${lineErr.message}`)

  const counts = new Map(podIds.map((id) => [id, 0]))
  const speakersByPod = new Map(podIds.map((id) => [id, new Set()]))
  for (const l of lines || []) {
    counts.set(l.pod_id, (counts.get(l.pod_id) || 0) + 1)
    if (l.speaker) speakersByPod.get(l.pod_id).add(l.speaker)
  }

  const withMeta = pods.map((p) => ({ ...p, slug: slugById.get(p.id) || null, sentence_count: counts.get(p.id) || 0 }))
  const requested = String(body.pod_id || '').trim()
  let targets
  if (body.scope === 'course') {
    targets = withMeta
  } else if (requested) {
    const one = withMeta.find((p) => p.id === requested)
    if (!one) return res.status(404).json({ error: `pod ${requested} is not in ${courseCode}` })
    targets = [one]
  } else {
    const current = resolveCurrentPod0(withMeta)
    if (!current) return res.status(404).json({ error: `no pod-0 found for ${courseCode}` })
    targets = [current]
  }

  // Speaker labels come from the DB, exactly as tools/pod-recast.cjs takes
  // them: the stored cast's keys plus every DISTINCT speaker on the pod's
  // lines. `_default` is a slot, not a character — assignVoices re-creates it.
  const written = []
  for (const pod of targets) {
    const labels = new Set([
      ...Object.keys(pod.speakers || {}).filter((k) => k !== '_default'),
      ...speakersByPod.get(pod.id),
    ])
    if (!labels.size) {
      written.push({ pod_id: pod.id, skipped: 'no speaker labels — nothing to cast' })
      continue
    }
    // The resolved pool KEYS, never the raw langs — same reason as getPools.
    // poolKeyFor() inside resolveCast is idempotent on a key that exists, so
    // passing the key through is safe and keeps ONE resolution point.
    const cast = await assignVoices([...labels], poolKeys.target, poolKeys.known, overrides)

    // Writes speakers and speakers only. No sentence row is read for update,
    // no audio id is touched, no TTS is queued.
    const { error: upErr } = await supabase
      .from('listening_pods').update({ speakers: cast }).eq('id', pod.id)
    if (upErr) throw new Error(`write cast for ${pod.id}: ${upErr.message}`)
    written.push({
      pod_id: pod.id,
      slug: pod.slug,
      speakers: Object.keys(cast).filter((k) => k !== '_default').length,
      lines: pod.sentence_count,
    })
  }

  // The fingerprint AFTER the write, and the gate's verdict against it. A
  // manual recast moves the digest, so an approval granted on the old cast is
  // now stale — that is the design, and the page must show it.
  const after = await loadCastPods(supabase, courseCode)
  const live = castFingerprint(after)
  const all = await loadApprovals(supabase)
  const record = all[courseCode] || null

  return res.json({
    ok: true,
    course_code: courseCode,
    applied_by: user.email || 'admin',
    scope: body.scope === 'course' ? 'course' : 'pod',
    pods: written,
    overrides,
    cast_fingerprint_before: body.cast_fingerprint || null,
    cast_fingerprint: live,
    gate: evaluateApproval(record && record.cast_fingerprint ? record : null, live),
    // Said in the payload, not just in a comment: nothing was rendered and
    // nothing was deleted.
    audio_touched: false,
  })
}

// Exported for tests — the route body above is the only caller.
export const __test = { readVoice, readOverrides, canonicalSpeakerName }
