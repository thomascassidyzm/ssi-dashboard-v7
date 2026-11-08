'use strict'
/**
 * pod-search-router.cjs — Popty's ONE pod search, and the pass that frames the
 * app's own pod display beside it (job #628).
 *
 * Tom, r-2026-11-07-ssi-pods-exactly-one-way-of: "SSi pods: exactly ONE way of
 * playing pods in the app, built first; Popty then surfaces exactly that method
 * (embedded app view) and nothing else; every alternative pod playback/drill
 * path is deleted, in both app and Popty". So this router PLAYS NOTHING and
 * composes nothing. It finds lines; the pods page (src/views/PodsView.vue)
 * frames ssi-learning-app's /listening/preview at the line found, and that is
 * the only place in Popty a pod is heard.
 *
 * WHAT IS INDEXED — every pod, every scene, every language, in memory, rebuilt
 * at most every INDEX_TTL_MS (or on ?refresh=1). No table of its own.
 *   canonical_pod_scenarios      the English source line (+ its speaker)
 *   canonical_pod_target_text    the canonical target text per language
 *   listening_pods + listening_pod_sentences
 *                                per course: target text, known text, speaker,
 *                                and whether the line has clips
 *   ops/pod-drill-cuts/<course>.cuts.json        whether it has verified cuts
 *   ops/pod-drill/served/<course>.json           whether it has drill pieces —
 *     Popty's own copy of the app's podDrillPieces/<course>.json, the same bytes,
 *     written by tools/pods/pod-drill/pieces/wire-staging.cjs (job #628), so every
 *     checkout (the prod one included) has it. POD_DRILL_PIECES_DIR overrides.
 *     Unreadable → pieces are reported UNKNOWN (null), never "none".
 * Lines join across courses by (pod slug, global_order), the key the generator
 * flexes canonical lines into every course's pod with.
 *
 *   GET /api/pod-search?q=&course=&limit=   → { hits, indexedAt, counts }
 *   GET /api/pod-search/scenes?course=&pod= → { course, pod, title, scenes:[{ scene, name, lines }] }
 *   GET /api/production/:courseCode/pod-preview/:slug?scene=&line=   (the `preview` router)
 *        → { url, exp, origin }   (the app address with a fresh staff pass; see
 *          shared/pod-preview-token.cjs). 503 + `missing` when the secret is unset.
 *
 * Staff only: a Popty dashboard user. Search answers are filtered to the
 * courses that user may open (the same verdict as the course-scope gate).
 */
const fs = require('fs')
const path = require('path')
const express = require('express')
const { readAllPages } = require('./shared/paged-read.cjs')
const { mintPodPreviewToken, previewUrl, appOrigin } = require('./shared/pod-preview-token.cjs')

const INDEX_TTL_MS = 10 * 60 * 1000
const COURSE = /^[a-z]{3}(_[a-z]+)?_for_[a-z]{3}(_[a-z]+)?$/
const SLUG = /^[a-z0-9_-]+$/i
const RETIRED_SLUG = /-retired-/
const CUTS_DIR = path.join(__dirname, '..', 'ops', 'pod-drill-cuts')
const DEFAULT_PIECES_DIR = path.join(__dirname, '..', 'ops', 'pod-drill', 'served')

/** Case- and accent-blind, so "cafe" finds "café" and "Cafe". */
const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()

function readJsonKeys (file, pick) {
  try { return new Set(Object.keys(pick(JSON.parse(fs.readFileSync(file, 'utf8'))) || {})) } catch { return null }
}

/** Pure: the index from the raw reads. Exported for a test to hold the join. */
function buildIndex ({ pods, sentences, canon, canonTargets, cutsFor = () => null, piecesFor = () => null }) {
  const podById = new Map(pods.map((p) => [p.id, p]))
  const lines = new Map() // `${slug}#${global_order}` → line
  const lineOf = (slug, order) => {
    const key = `${slug}#${Number(order)}`
    let l = lines.get(key)
    if (!l) { l = { key, slug, order: Number(order), scene: null, sentence: null, english: '', canonSpeaker: '', canonTargets: {}, rows: [] }; lines.set(key, l) }
    return l
  }
  for (const c of canon) {
    const l = lineOf(c.pod_slug, c.global_order)
    l.english = c.english_text || ''
    l.canonSpeaker = c.speaker || ''
    l.scene = c.scene_number
    l.sentence = c.sentence_number
  }
  for (const t of canonTargets) lineOf(t.pod_slug, t.global_order).canonTargets[t.target_lang] = t.target_text || ''
  const cutsCache = new Map(); const piecesCache = new Map()
  const once = (cache, fn, course) => { if (!cache.has(course)) cache.set(course, fn(course)); return cache.get(course) }
  for (const r of sentences) {
    const pod = podById.get(r.pod_id)
    if (!pod) continue
    const l = lineOf(pod.slug, r.global_order)
    if (l.scene == null) { l.scene = r.scene_number; l.sentence = r.sentence_number }
    const cuts = once(cutsCache, cutsFor, pod.course_code)
    const pieces = once(piecesCache, piecesFor, pod.course_code)
    l.rows.push({
      id: r.id,
      course: pod.course_code,
      pod: pod.slug,
      scene: r.scene_number,
      sentence: r.sentence_number,
      speaker: r.speaker || '',
      target: r.target_text || '',
      known: r.known_text || '',
      clips: !!(r.target_audio_id || (r.sentence_audio_ids || []).some(Boolean)),
      knownClip: !!r.known_audio_id,
      cuts: cuts ? cuts.has(r.id) : null,
      pieces: pieces ? pieces.has(r.id) : null,
    })
  }
  for (const l of lines.values()) {
    l.hayEnglish = fold(`${l.english} ${l.canonSpeaker}`)
    l.hayCanon = Object.entries(l.canonTargets).map(([lang, text]) => ({ lang, hay: fold(text) }))
    for (const r of l.rows) r.hay = fold(`${r.target} ${r.known} ${r.speaker}`)
  }
  const podsOut = pods.map((p) => ({
    id: p.id, course: p.course_code, slug: p.slug, title: p.title || null,
    retired: RETIRED_SLUG.test(p.slug), visibility: p.visibility || null,
    sceneNames: p.metadata?.scene_names || null,
  }))
  return { lines, pods: podsOut, indexedAt: Date.now(), counts: { pods: pods.length, lines: lines.size, rows: sentences.length } }
}

/** Pure: lines matching every term of q, best first, scoped to the courses allowed. */
function searchIndex (index, { q, course = null, limit = 60, allowed = () => true }) {
  const terms = fold(q).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const all = (h) => terms.every((t) => h.includes(t))
  const hits = []
  for (const l of index.lines.values()) {
    const rows = l.rows.filter((r) => allowed(r.course))
    const english = all(l.hayEnglish)
    const canonLangs = l.hayCanon.filter((c) => all(c.hay)).map((c) => c.lang)
    const rowHits = rows.filter((r) => all(r.hay))
    if (!english && !canonLangs.length && !rowHits.length) continue
    const here = course ? rows.find((r) => r.course === course) || null : null
    // Best first: a line in the course on screen, then the English source, then elsewhere.
    const rank = (here && (english || rowHits.includes(here)) ? 0 : 2) + (english ? 0 : 1)
    hits.push({
      rank,
      slug: l.slug, order: l.order, scene: l.scene, sentence: l.sentence,
      english: l.english, speaker: l.canonSpeaker,
      matchedEnglish: english, matchedCanon: canonLangs,
      here,
      elsewhere: rowHits.filter((r) => r !== here).slice(0, 6).map(({ hay, ...r }) => r),
      elsewhereCount: rowHits.filter((r) => r !== here).length,
    })
  }
  hits.sort((a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug) || a.order - b.order)
  return hits.slice(0, limit).map(({ rank, here, ...h }) => ({ ...h, here: here ? (({ hay, ...r }) => r)(here) : null }))
}

/** Pure: one course pod's scenes, lines in order, each with its English source. */
function scenesOf (index, course, slug) {
  const pod = index.pods.find((p) => p.course === course && p.slug === slug)
  if (!pod) return null
  const byScene = new Map()
  for (const l of index.lines.values()) {
    if (l.slug !== slug) continue
    const r = l.rows.find((x) => x.course === course)
    if (!r) continue
    if (!byScene.has(r.scene)) byScene.set(r.scene, [])
    const { hay, ...row } = r
    byScene.get(r.scene).push({ ...row, order: l.order, english: l.english })
  }
  const scenes = [...byScene.entries()].sort((a, b) => a[0] - b[0]).map(([scene, lines]) => ({
    scene,
    name: pod.sceneNames?.[String(scene)] || null,
    lines: lines.sort((a, b) => a.order - b.order),
  }))
  return { course, pod: slug, title: pod.title, retired: pod.retired, scenes }
}

module.exports = function podSearchRouter ({ getDb, resolveUser, canAccessCourse, logger = console, piecesDir = process.env.POD_DRILL_PIECES_DIR || DEFAULT_PIECES_DIR } = {}) {
  let current = null
  let building = null

  async function build () {
    const sb = getDb()
    const [pods, canon, canonTargets] = await Promise.all([
      readAllPages(() => sb.from('listening_pods').select('id, course_code, slug, title, visibility, metadata'), { pageSize: 1000 }),
      readAllPages(() => sb.from('canonical_pod_scenarios').select('id, pod_slug, scene_number, sentence_number, global_order, speaker, english_text'), { pageSize: 1000 }),
      // No id column: (pod_slug, target_lang, global_order) is the key, so page on all three.
      readAllPages(() => sb.from('canonical_pod_target_text').select('pod_slug, target_lang, global_order, target_text').order('pod_slug').order('target_lang'), { pageSize: 1000, orderCol: 'global_order' }),
    ])
    const sentences = await readAllPages(() => sb.from('listening_pod_sentences')
      .select('id, pod_id, scene_number, sentence_number, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, sentence_audio_ids'), { pageSize: 1000 })
    const index = buildIndex({
      pods, sentences, canon, canonTargets,
      cutsFor: (course) => readJsonKeys(path.join(CUTS_DIR, `${course}.cuts.json`), (j) => j.sentences),
      // A split row's pieces are keyed per sentence (`<row>:s<n>`, wire-staging.cjs): the row has pieces too.
      piecesFor: (course) => { const k = readJsonKeys(path.join(piecesDir, `${course}.json`), (j) => j.turns); return k && new Set([...k].map((id) => id.replace(/:s\d+$/, ''))) },
    })
    logger.info?.(`[PodSearch] indexed ${index.counts.pods} pods, ${index.counts.rows} rows, ${index.counts.lines} lines`)
    return index
  }

  async function getIndex (refresh = false) {
    const fresh = current && Date.now() - current.indexedAt < INDEX_TTL_MS
    if (fresh && !refresh) return current
    if (!building) {
      building = build().then((i) => { current = i; return i }).finally(() => { building = null })
      // A background refresh nobody awaits (stale-while-revalidate below) must not become an unhandled
      // rejection, which can take the whole Production API down. Log it; `current` is untouched, so the
      // old index keeps serving and the next request past the TTL tries again. Callers that DO await
      // `building` (first build, ?refresh=1) still receive the rejection and answer it themselves.
      building.catch((e) => { logger.error?.(`[PodSearch] index refresh failed, still serving the ${current ? 'previous' : 'missing'} index: ${e && e.message ? e.message : e}`) })
    }
    // Stale-while-revalidate: an old index answers at once while the new one builds.
    if (current && !refresh) return current
    return building
  }

  const router = express.Router({ mergeParams: true })

  async function staff (req, res) {
    const user = await resolveUser(req)
    if (!user) { res.status(401).json({ error: 'Authentication required' }); return null }
    return user
  }

  router.get('/api/pod-search', async (req, res) => {
    const user = await staff(req, res); if (!user) return
    try {
      const index = await getIndex(req.query.refresh === '1')
      const course = COURSE.test(String(req.query.course || '')) ? String(req.query.course) : null
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60))
      const hits = searchIndex(index, { q: String(req.query.q || ''), course, limit, allowed: (c) => canAccessCourse(user, c) })
      res.json({ hits, indexedAt: index.indexedAt, counts: index.counts })
    } catch (e) {
      logger.error?.(`[PodSearch] ${e?.message || e}`)
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  router.get('/api/pod-search/scenes', async (req, res) => {
    const user = await staff(req, res); if (!user) return
    const course = String(req.query.course || ''); const pod = String(req.query.pod || '')
    if (!COURSE.test(course) || !SLUG.test(pod)) return res.status(400).json({ error: 'bad course or pod' })
    if (!canAccessCourse(user, course)) return res.status(403).json({ error: `No access to ${course}` })
    try {
      const index = await getIndex(req.query.refresh === '1')
      const pods = index.pods.filter((p) => p.course === course).map(({ sceneNames, ...p }) => p)
      const out = scenesOf(index, course, pod)
      if (!out) return res.status(404).json({ error: `No pod ${course}:${pod}`, pods })
      res.json({ ...out, pods, indexedAt: index.indexedAt })
    } catch (e) {
      logger.error?.(`[PodSearch] scenes ${e?.message || e}`)
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  // Mounted at /api/production/:courseCode/pod-preview (production-api.cjs), so the
  // app.param course-scope gate decides who may mint; it must NOT declare :courseCode.
  const preview = express.Router({ mergeParams: true })
  preview.get('/:slug', (req, res) => {
    const { courseCode, slug } = req.params
    if (!COURSE.test(courseCode || '') || !SLUG.test(slug || '')) return res.status(400).json({ error: 'bad course or pod' })
    const sub = req.dashboardUser?.email || req.dashboardUser?.id || 'popty'
    const pass = mintPodPreviewToken({ course: courseCode, pod: slug, sub })
    if (!pass) return res.status(503).json({ error: 'The app preview pass is not configured: POD_PREVIEW_TOKEN_SECRET is unset in Popty', missing: 'POD_PREVIEW_TOKEN_SECRET' })
    res.setHeader('Cache-Control', 'private, no-store')
    const line = typeof req.query.line === 'string' ? req.query.line : null
    const scene = Number(req.query.scene) || 1
    res.json({ url: previewUrl({ course: courseCode, pod: slug, scene, line, token: pass.token }), exp: pass.exp, origin: appOrigin() })
  })

  return { router, preview }
}

module.exports.buildIndex = buildIndex
module.exports.searchIndex = searchIndex
module.exports.scenesOf = scenesOf
