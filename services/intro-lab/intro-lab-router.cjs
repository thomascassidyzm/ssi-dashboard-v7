/**
 * Intro lab — HTTP side (job #488). READ-ONLY: pure SELECTs and a byte proxy. No writes, no TTS, no S3 puts.
 *
 * Tom, 2026-10-13: the #348 intro lab "should be a Popty tool" and "should also have the target LEGO". This is the data
 * the page (src/views/admin/IntroLab.vue) needs for ANY course:
 *
 *   GET /                 the course's LEGOs (lean), the Tom-006 frame clip for its language if there is one, the six
 *                         tails, the Easy / Fast mode config, and the speed each target voice plays at.
 *   GET /lego/:legoId     one LEGO in full: how its CURRENT intro was spliced (course_audio.spliced_from, written by the
 *                         #364 remake), a cut donor if there is one, and the player's intro + debut cycles as an ordered
 *                         list of clips / silences (player-debut.cjs — the player's own rules, not guesses).
 *   GET /clip/:audioId    the clip's bytes, same-origin. The browser must DECODE these to splice them, and the signed S3
 *                         redirect that /api/production/audio/:uuid/stream gives is not CORS-readable.
 *
 * Mounted under /api/production/:courseCode/intro-lab so the app.param('courseCode') course-scope gate fires (the router
 * uses mergeParams and must not declare :courseCode itself).
 *
 * Why the splice itself is NOT done here: the lab's whole point is that every setting is adjustable and the result
 * replays at once. Doing the mixing in the browser (Web Audio, the #348 lab's DSP lifted unchanged into
 * src/lib/introLabDsp.js) means a slider costs nothing; a server render per slider move would cost a round trip each.
 */
'use strict'

const express = require('express')
const { targetSpeedConfigFrom, debutPlan } = require('./player-debut.cjs')

const TOM_VOICE = 'd293d509' // Cartesia Tom-006, the English male voice presentation intros are spliced from (ruling 2026-10-12)

// The six tails, each rendered once in Tom-006 (#310, #348). Ids are rows in course_audio. "is said like this" is the house default
// (ruling r-2026-10-13-spliced-tom-voice-intro-house-setting); "sounds like this" was rejected by Tom as too informal but stays
// auditionable so the rejection is hearable.
const TAILS = [
  { key: 'said-like-this', label: 'is said like this', id: 'acc15e10-d1f2-41cc-a926-721e5bac6790', isDefault: true },
  { key: 'is', label: 'is', id: '2e12b859-911c-4ef3-b9b7-1cdc81703243' },
  { key: 'given-as', label: 'is given as', id: 'd36168ff-7433-47a8-a30e-f58a597f11ca' },
  { key: 'said', label: 'is said', id: 'f0410cee-fcf1-4046-9272-c5f292f33028' },
  { key: 'we-say-like-this', label: 'we say like this', id: 'f9e17866-3bf8-450d-91ad-f8500a308f60' },
  { key: 'sounds-like-this', label: 'sounds like this', id: '2bdcc393-3a11-4d7a-8ceb-8e44cad7ac20', rejected: true },
]
// The "as in" joiner piece (#364 PIECE.asIn).
const AS_IN_PIECE_ID = 'fd867f14-4469-4460-8a2e-2f95aafa62cb'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isTom = (voiceId) => typeof voiceId === 'string' && voiceId.includes(TOM_VOICE)

/** Every row of a query, past supabase's 1000-row page. `build(from, to)` returns the ranged query. */
async function allRows(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

/** "The Afrikaans for: 'x', is:" -> "Afrikaans". Null when the text is not that shape. */
function languageNameFromIntro(text) {
  const m = /^The (.+?) for\b/.exec(text || '')
  return m ? m[1] : null
}

/** How a current intro was built, from course_audio.spliced_from (written by the #364 remake). Null for an unspliced intro. */
function recipeOf(splicedFrom) {
  if (!Array.isArray(splicedFrom)) return null
  const hs = splicedFrom.find((p) => p && p.kind === 'house-setting')
  if (!hs) return null
  return {
    recipe: hs.recipe, // 'bare' | 'cut' | 'pieces'
    tail: hs.tail || null,
    pieces: splicedFrom.filter((p) => p && p.kind !== 'house-setting').map((p) => ({ kind: p.kind, audioId: p.audio_id })),
  }
}

function createIntroLabRouter({ getDb, logger }) {
  const router = express.Router({ mergeParams: true })
  const log = logger || console

  async function modeConfigs(db) {
    const { data, error } = await db.from('algorithm_config').select('key,config').in('key', ['normal_mode', 'fast_mode'])
    if (error) throw new Error(error.message)
    const by = Object.fromEntries((data || []).map((r) => [r.key, r.config]))
    return { easy: by.normal_mode || {}, fast: by.fast_mode || {} }
  }

  async function voicePace(db, courseCode) {
    try {
      const { data, error } = await db.rpc('course_voice_pace', { p_course_code: courseCode })
      return error ? null : data
    } catch (e) {
      return null // the player treats an unavailable pace as "uncorrected"; so do we, and say so in the reason
    }
  }

  async function courseRow(db, courseCode) {
    const { data, error } = await db.from('courses').select('course_code,voice_config').eq('course_code', courseCode).maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  const legoShape = (l, pres) => ({
    legoId: l.lego_id, seed: l.seed_number, type: l.type, known: l.known_text, target: l.target_text,
    knownAudioId: l.known_audio_id, target1AudioId: l.target1_audio_id, target2AudioId: l.target2_audio_id,
    presentationAudioId: l.presentation_audio_id, target1DurationMs: l.target1_duration_ms, target2DurationMs: l.target2_duration_ms,
    introText: pres ? pres.text : null, built: pres ? recipeOf(pres.spliced_from) : null,
  })

  router.get('/', async (req, res) => {
    try {
      const db = getDb()
      const { courseCode } = req.params
      const course = await courseRow(db, courseCode)
      if (!course) return res.status(404).json({ error: `no course ${courseCode}` })
      const legos = await allRows((a, b) => db.from('course_legos')
        .select('lego_id,seed_number,type,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id,target1_duration_ms,target2_duration_ms')
        .eq('course_code', courseCode).eq('is_new', true).order('seed_number').order('lego_index').range(a, b))
      const pres = await allRows((a, b) => db.from('course_audio').select('id,text,voice_id,spliced_from')
        .eq('course_code', courseCode).eq('role', 'presentation').order('id').range(a, b))
      const presById = new Map(pres.map((p) => [p.id, p]))
      const sample = pres.find((p) => isTom(p.voice_id) && languageNameFromIntro(p.text))
      const languageName = languageNameFromIntro((sample || pres.find((p) => languageNameFromIntro(p.text)) || {}).text)
      let frame = null
      if (languageName) {
        // course_code first: course_audio is ~2.9M rows and a bare text lookup through PostgREST hits the statement timeout.
        const { data } = await db.from('course_audio').select('id,text,voice_id').eq('course_code', courseCode).eq('text', `The ${languageName} for`).limit(5)
        const hit = (data || []).find((r) => isTom(r.voice_id))
        if (hit) frame = { audioId: hit.id, text: hit.text }
      }
      const modes = await modeConfigs(db)
      const pace = await voicePace(db, courseCode)
      const speeds = {}
      for (const mode of ['easy', 'fast']) {
        const cfg = targetSpeedConfigFrom(course.voice_config, pace, mode)
        const plan = debutPlan({ lego: {}, speedConfig: cfg, modeCfg: modes[mode] })
        speeds[mode] = { target1: plan.speeds.target1, target2: plan.speeds.target2 }
      }
      const shaped = legos.map((l) => legoShape(l, presById.get(l.presentation_audio_id)))
      res.json({
        courseCode, languageName, frame, tails: TAILS, asInPieceId: AS_IN_PIECE_ID, modes, speeds,
        counts: {
          legos: shaped.length,
          bare: shaped.filter((l) => l.built && l.built.recipe === 'bare').length,
          cut: shaped.filter((l) => l.built && l.built.recipe === 'cut').length,
          pieces: shaped.filter((l) => l.built && l.built.recipe === 'pieces').length,
        },
        legos: shaped,
      })
    } catch (e) {
      log.error && log.error(`[IntroLab] ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/lego/:legoId', async (req, res) => {
    try {
      const db = getDb()
      const { courseCode, legoId } = req.params
      const course = await courseRow(db, courseCode)
      if (!course) return res.status(404).json({ error: `no course ${courseCode}` })
      const { data: rows, error } = await db.from('course_legos')
        .select('lego_id,seed_number,type,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id,target1_duration_ms,target2_duration_ms')
        .eq('course_code', courseCode).eq('lego_id', legoId).limit(1)
      if (error) throw new Error(error.message)
      if (!rows || !rows[0]) return res.status(404).json({ error: `no LEGO ${legoId} in ${courseCode}` })
      const row = rows[0]
      let pres = null
      if (row.presentation_audio_id) {
        const { data } = await db.from('course_audio').select('id,text,voice_id,spliced_from').eq('id', row.presentation_audio_id).maybeSingle()
        pres = data
      }
      const lego = legoShape(row, pres)

      // The LEGO spoken alone by Tom-006 (the "LEGO" piece of a splice): a Tom known clip, or the piece the current splice used.
      let tomLegoId = null
      if (lego.built && lego.built.recipe !== 'cut') {
        const p = lego.built.pieces.find((x) => x.kind === 'lego')
        tomLegoId = p ? p.audioId : null
      }
      if (!tomLegoId && row.known_audio_id) {
        const { data } = await db.from('course_audio').select('id,voice_id').eq('id', row.known_audio_id).maybeSingle()
        if (data && isTom(data.voice_id)) tomLegoId = data.id
      }

      // A donor: an existing continuous Tom-006 intro "The <Lang> for: 'LEGO', as in …, is:" the LEGO + words can be CUT from.
      // #348's CUT mode. For a LEGO the remake already cut, the donor is the stored cut-body.
      let donor = null
      const cutBody = lego.built && lego.built.recipe === 'cut' ? lego.built.pieces.find((p) => p.kind === 'cut-body') : null
      const donorQuery = async (audioId) => {
        const { data } = await db.from('course_audio').select('id,text,word_timings,course_code').eq('id', audioId).maybeSingle()
        return data && data.word_timings && Array.isArray(data.word_timings.starts) ? data : null
      }
      if (cutBody) {
        const d = await donorQuery(cutBody.audioId)
        if (d) donor = { audioId: d.id, from: d.course_code, starts: d.word_timings.starts, ends: d.word_timings.ends }
      } else if (row.known_text) {
        const safe = row.known_text.replace(/[%_\\]/g, '\\$&')
        // Donor search is scoped by course_code (the table is ~2.9M rows; an unscoped text scan times out). deu_for_eng first: it is
        // the biggest set of plain Tom-006 intros (#348 preferred it too), then the course itself.
        let found = []
        for (const code of ['deu_for_eng', courseCode]) {
          const { data } = await db.from('course_audio').select('id,text,voice_id,word_timings,course_code,duration_ms')
            .eq('course_code', code).eq('role', 'presentation').ilike('text', `The % for: '${safe}', is:%`).order('duration_ms').limit(8)
          found = found.concat((data || []).filter((x) => isTom(x.voice_id)))
          if (found.some((x) => !/as in/.test(x.text) && x.word_timings && Array.isArray(x.word_timings.starts))) break
        }
        const d = found.find((x) => !/as in/.test(x.text) && x.word_timings && Array.isArray(x.word_timings.starts))
        if (d) donor = { audioId: d.id, from: d.course_code, starts: d.word_timings.starts, ends: d.word_timings.ends }
      }

      const modes = await modeConfigs(db)
      const pace = await voicePace(db, courseCode)
      const plans = {}
      for (const mode of ['easy', 'fast']) {
        plans[mode] = debutPlan({ lego, speedConfig: targetSpeedConfigFrom(course.voice_config, pace, mode), modeCfg: modes[mode] })
      }
      res.json({ courseCode, lego, tomLegoId, donor, plans })
    } catch (e) {
      log.error && log.error(`[IntroLab] ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.get('/clip/:audioId', async (req, res) => {
    try {
      const { audioId } = req.params
      if (!UUID.test(audioId)) return res.status(400).json({ error: 'audioId must be a uuid' })
      const { data, error } = await getDb().from('course_audio').select('s3_key').eq('id', audioId).maybeSingle()
      if (error) throw new Error(error.message)
      if (!data || !data.s3_key || data.s3_key.startsWith('pending/')) return res.status(404).json({ error: `no rendered clip ${audioId}` })
      const s3 = require('../s3-production-service.cjs')
      const url = await s3.getAudioSignedUrl(audioId, 600, { s3Key: data.s3_key })
      const r = await fetch(url)
      if (!r.ok) return res.status(502).json({ error: `storage answered ${r.status}` })
      res.set('Content-Type', r.headers.get('content-type') || 'audio/mpeg')
      res.set('Cache-Control', 'private, max-age=300')
      res.send(Buffer.from(await r.arrayBuffer()))
    } catch (e) {
      log.error && log.error(`[IntroLab] clip: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createIntroLabRouter, recipeOf, languageNameFromIntro, TAILS, AS_IN_PIECE_ID }
