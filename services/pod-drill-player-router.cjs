'use strict'
/**
 * pod-drill-player-router.cjs — READ-ONLY feed for the Pod Drill player on the pod page
 * (PodDetailView → "Drill" tab, src/components/pods/PodDrillPlayer.vue). Job #860.
 *
 * Tom, 2026-11-05: "this should now be a popty process, so we should be able to see the actual
 * content in popty and play through it, rather than needing to be in the app".
 *
 * This route hands the page the SAME raw inputs the learning app reads, and nothing composed: the
 * pod's rows (the app's listening_pod_sentences column list), every clip those rows and their cut
 * entries name (text, Cartesia/Azure word timings, voice, revision, whether an S3 object key
 * exists), the verified cut entries (ops/pod-drill-cuts/<course>.cuts.json — the file Popty's
 * stage.mjs exports byte for byte into the app's player-vue/src/data/podDrillCuts/), and the live
 * algorithm_config `pods` + `listening` rows (the lap ladder). The page composes with the app's own
 * code, vendored verbatim in src/lib/podEngine (tools/sync-pod-engine.sh) — so the deal order is
 * the app's and cannot be re-decided here.
 *
 * Mounted under /api/production/:courseCode/pods/:slug/drill (mergeParams) so the app.param
 * course-scope gate fires; this router must NOT declare :courseCode itself.
 *
 *   GET  /?scene=N        → { podId, scenes, scene, rows, clips, cuts, config }
 *   POST /known-lookup    → { rows }   body { variants: string[], voices: string[] }
 *        The app's last-resort English lookup (ListeningOverlay lookupFineKnown/crossFetchKnowns):
 *        course_audio rows whose text_normalized is one of the variants, role pod_fine_known or
 *        known, in one of the voices. The page picks among them with the app's own functions.
 *
 * No writes, no TTS, no S3 calls. Clip playback goes through the existing
 * /api/production/:courseCode/audio/:uuid/url signed-URL route.
 */
const fs = require('fs')
const path = require('path')
const express = require('express')

const OPS = path.join(__dirname, '..', 'ops', 'pod-drill-cuts')
const COURSE = /^[a-z]{3}(_[a-z]+)?_for_[a-z]{3}(_[a-z]+)?$/
const SLUG = /^[a-z0-9_-]+$/i

// The app's pod row read (player-vue listeningMetaCache POD_SENTENCE_COLUMNS) plus glue_to_next,
// which the main-flow lap scheduler reads.
const ROW_COLUMNS = 'id, scene_number, sentence_number, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, sentence_audio_ids, sentence_known_audio_ids, atom_map_fine, window_known_map, takeg_audio_ids, variant_key, attach_sentence_number, jump_in, glue_to_next'
const CLIP_COLUMNS = 'id, text, word_boundaries, word_timings, voice_id, audio_revision, s3_key, role, course_code'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const bare = (ref) => String(ref || '').replace(/\.v\d+$/, '')

const cutsCache = new Map() // course → { mtime, sentences }
function readCuts (course, dir = OPS) {
  const f = path.join(dir, `${course}.cuts.json`)
  if (!fs.existsSync(f)) return null
  const mtime = fs.statSync(f).mtimeMs
  const hit = cutsCache.get(course)
  if (hit && hit.mtime === mtime) return hit.sentences
  const sentences = JSON.parse(fs.readFileSync(f, 'utf8')).sentences || {}
  cutsCache.set(course, { mtime, sentences })
  return sentences
}

/** Every clip id a row or a cut entry can make the page play. */
function clipIdsOf (rows, cuts) {
  const ids = new Set()
  const add = (v) => { if (typeof v === 'string' && UUID.test(v)) ids.add(bare(v)) }
  for (const r of rows) {
    add(r.target_audio_id); add(r.known_audio_id)
    for (const col of ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']) for (const v of r[col] || []) add(v)
  }
  for (const e of Object.values(cuts)) {
    add(e.clip); add(e.knownClip); add(e.knownTwinOf)
    for (const l of e.lines || []) for (const c of l.chunks || []) add(c[6])
  }
  return [...ids]
}

module.exports = function podDrillPlayerRouter ({ getDb, logger = console } = {}) {
  const router = express.Router({ mergeParams: true })
  router.use(express.json({ limit: '256kb' }))

  router.get('/', async (req, res) => {
    const { courseCode, slug } = req.params
    if (!COURSE.test(courseCode || '') || !SLUG.test(slug || '')) return res.status(400).json({ error: 'bad course or pod' })
    const podId = `${courseCode}:${slug}`
    try {
      const db = getDb()
      const { data: allRows, error } = await db.from('listening_pod_sentences').select(ROW_COLUMNS)
        .eq('pod_id', podId).order('global_order', { ascending: true })
      if (error) throw error
      if (!allRows || !allRows.length) return res.status(404).json({ error: `No lines in ${podId}` })
      const scenes = [...new Set(allRows.map((r) => r.scene_number))].sort((a, b) => a - b)
      const wanted = Number(req.query.scene)
      const scene = scenes.includes(wanted) ? wanted : scenes[0]
      const rows = allRows.filter((r) => r.scene_number === scene)

      // Cut entries for this scene's sentences (ids are `<rowId>` or `<rowId>:s<k>`).
      const all = readCuts(courseCode) || {}
      const rowIds = new Set(rows.map((r) => r.id))
      const cuts = Object.fromEntries(Object.entries(all).filter(([id]) => rowIds.has(id.replace(/:s\d+$/, ''))))

      const ids = clipIdsOf(rows, cuts)
      const clips = {}
      for (let i = 0; i < ids.length; i += 150) {
        const { data, error: e } = await db.from('course_audio').select(CLIP_COLUMNS).in('id', ids.slice(i, i + 150))
        if (e) throw e
        for (const c of data || []) {
          clips[c.id] = {
            text: c.text || '',
            timings: c.word_timings ?? c.word_boundaries ?? null, // the app's readClipTimings order
            voice: c.voice_id || null,
            revision: c.audio_revision || 1,
            hasS3: !!c.s3_key,
            role: c.role || null,
            course: c.course_code || null,
          }
        }
      }

      const { data: cfgRows, error: ce } = await db.from('algorithm_config').select('key, config').in('key', ['pods', 'listening'])
      if (ce) throw ce
      const cfg = Object.fromEntries((cfgRows || []).map((r) => [r.key, r.config]))

      res.set('Cache-Control', 'no-store')
      res.json({
        podId,
        scenes,
        scene,
        rows,
        clips,
        cuts,
        cutsFile: all && Object.keys(all).length ? `ops/pod-drill-cuts/${courseCode}.cuts.json` : null,
        config: { pods: cfg.pods || null, listening: cfg.listening || null },
      })
    } catch (err) {
      logger.error(`[pod-drill-player] ${podId}: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/known-lookup', async (req, res) => {
    const variants = Array.isArray(req.body?.variants) ? req.body.variants.filter((v) => typeof v === 'string' && v).slice(0, 400) : []
    const voices = Array.isArray(req.body?.voices) ? req.body.voices.filter((v) => typeof v === 'string' && v).slice(0, 8) : []
    if (!variants.length || !voices.length) return res.json({ rows: [] })
    try {
      const db = getDb()
      const voiceIds = voices.flatMap((v) => [v, `xai_${v}`, `azure_${v}`, `cartesia_${v}`])
      const out = []
      for (let i = 0; i < variants.length; i += 100) {
        const { data, error } = await db.from('course_audio')
          .select('id, text, text_normalized, course_code, role, voice_id, audio_revision, s3_key')
          .in('text_normalized', variants.slice(i, i + 100))
          .in('role', ['pod_fine_known', 'known'])
          .in('voice_id', voiceIds)
          .limit(2000)
        if (error) throw error
        out.push(...(data || []))
      }
      res.set('Cache-Control', 'no-store')
      res.json({ rows: out.map((r) => ({ id: r.id, text: r.text, textNormalized: r.text_normalized, course: r.course_code, role: r.role, voice: r.voice_id, revision: r.audio_revision || 1, hasS3: !!r.s3_key })) })
    } catch (err) {
      logger.error(`[pod-drill-player] known-lookup: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
module.exports.clipIdsOf = clipIdsOf
