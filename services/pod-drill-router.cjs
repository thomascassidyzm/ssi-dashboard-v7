'use strict'
/**
 * pod-drill-router.cjs — READ-ONLY feed for the Pod Drill preview page (/production/<course>/pod-drill).
 *
 * Job #692 (Tom, 2026-11-03: "why are popty 'preview pages' not automatically being built?").
 * The Pod Drill stage (tools/pods/pod-drill/stage.mjs) writes its whole run into ops/pod-drill-cuts/;
 * this router reads those files from the checkout the API runs from and hands the page every cut
 * card as the Drill plays it plus the known-side re-record list. So a run that lands on main is on
 * Kai's page with no publishing step, behind Popty's own login and course-scope gate.
 *
 * Mounted by production-api.cjs under /api/production/:courseCode/pod-drill (mergeParams), so the
 * app.param('courseCode') gate fires; this router must NOT declare :courseCode itself.
 *
 *   GET /   → { course, hasRun, runAt, summary, tally, cards, rerecord, needsPairing, playsWhole, boundary }
 *
 * Job #707: each card carries `scores` ("<line>|<chunk>" → the boundary score's verdict, reason and,
 * for a tight piece, what the one audio route answered), from <course>.score.json; each re-record row
 * carries `render` from <course>.standalone.json. So the page says, per known piece, KEPT (the cut)
 * or RE-RENDERED (its own clip, chunk[6]) and why, and plays either.
 *
 * No database, no S3, no writes. The page plays slices through the existing
 * /api/production/:courseCode/audio/:uuid/url signed-URL route.
 */
const fs = require('fs')
const path = require('path')
const express = require('express')

const OPS = path.join(__dirname, '..', 'ops', 'pod-drill-cuts')
const COURSE = /^[a-z]{3}_for_[a-z]{3}$/

const cache = new Map() // course -> { key, body }
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null)

/** Pure: the page's payload from the run's files. */
function buildPayload (course, { cuts, dump, rerec, report, score, standalone }, runAt = null) {
  const scoreBy = new Map()
  for (const r of score?.pieces || []) {
    const m = scoreBy.get(r.id) || {}
    m[`${r.line}|${r.chunk}`] = { verdict: r.verdict, why: r.why, render: r.render || null }
    scoreBy.set(r.id, m)
  }
  const saBy = new Map((standalone?.pieces || []).map((p) => [p.key, p.render || null]))
  const byId = new Map((dump?.cards || []).map((c) => [c.id, c]))
  const cards = Object.entries(cuts?.sentences || {}).map(([id, e]) => {
    const d = byId.get(id) || {}
    return { id, scene: d.scene ?? null, target: d.target ?? null, known: d.known ?? null, clip: e.clip, knownClip: e.knownClip || null, lines: e.lines, scores: scoreBy.get(id) || {} }
  }).filter((c) => c.lines.length > 1 || c.lines.some((l) => (l.chunks || []).length >= 2))
  cards.sort((a, b) => (a.scene ?? 0) - (b.scene ?? 0) || a.id.localeCompare(b.id))
  const withAudio = (rows) => (rows || []).map((r) => ({ ...r, render: saBy.get(`${r.card}|${r.line}|${r.known}`) || null, clip: byId.get(r.card)?.targetAudioId || null, knownClip: byId.get(r.card)?.knownAudioId || null, scene: byId.get(r.card)?.scene ?? null }))
  return {
    course,
    hasRun: !!cuts,
    runAt,
    summary: report?.summary ? { cards: report.summary.cards, needCutting: report.summary.needCutting, verified: report.summary.verified } : null,
    tally: rerec?.tally || null,
    cards,
    rerecord: withAudio(rerec?.rerecord),
    needsPairing: (rerec?.needsPairing || []).length,
    playsWhole: (rerec?.playsWhole || []).length,
    boundary: score ? { ...score.boundary, totals: score.totals } : null,
  }
}

function load (course, dir = OPS) {
  const files = { cuts: 'cuts', dump: 'dump', rerec: 'known-rerecord', report: 'report', score: 'score', standalone: 'standalone' }
  const paths = Object.fromEntries(Object.entries(files).map(([k, s]) => [k, path.join(dir, `${course}.${s}.json`)]))
  const stamps = Object.values(paths).map((p) => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0))
  const key = stamps.join('|')
  const hit = cache.get(course)
  if (hit && hit.key === key) return hit.body
  const data = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, readJson(p)]))
  const body = buildPayload(course, data, stamps[0] ? new Date(Math.max(...stamps)).toISOString() : null)
  cache.set(course, { key, body })
  return body
}

module.exports = function podDrillRouter ({ logger = console } = {}) {
  const router = express.Router({ mergeParams: true })
  router.get('/', (req, res) => {
    const { courseCode } = req.params
    if (!COURSE.test(courseCode || '')) return res.status(400).json({ error: 'bad course code' })
    try {
      res.set('Cache-Control', 'no-store')
      res.json(load(courseCode))
    } catch (err) {
      logger.error('[pod-drill] read failed', err)
      res.status(500).json({ error: `could not read the Pod Drill run for ${courseCode}` })
    }
  })
  return router
}
module.exports.buildPayload = buildPayload
