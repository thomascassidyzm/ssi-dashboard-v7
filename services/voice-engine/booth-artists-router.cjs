/**
 * booth-artists-router.cjs — GET /api/recording/admin/artists[/:voiceId], God admins only.
 *
 * The recording-artists overview on /admin/recording (Aran, 2026-10-14, job #350). Every number
 * and the gate are explained in booth-artist-overview.cjs; this file only reads the rows.
 * READ-ONLY, with ONE exception: POST /booth-links/:voiceId (job #380) makes or replaces a voice's
 * private booth-link key in booth_link_keys (booth-link-keys.cjs). GET /booth-links lists every key
 * as a ready link, plus the grace-mode log of who is still opening a booth without one.
 *
 * Mounted under /api/recording so popty.app's same-origin rewrite (vercel.json) reaches it, but it
 * is NOT link-is-identity like the booth's own routes: every request needs an admin bearer token
 * AND a God-admin email, checked here on the server, before any data is read. A recordist who
 * holds a booth link gets 401/403 and nothing else.
 */

'use strict'

const express = require('express')
const ov = require('./booth-artist-overview.cjs')
const queue = require('./recordist-queue.cjs')
const { createArtistsReader } = require('./booth-artists-reader.cjs')
const { shared: sharedSummaryCache } = require('./booth-artists-summary-cache.cjs')

/** Latest takes sent per project in the drilldown, each with a signed URL. */
const TAKES_PER_PROJECT = 10

module.exports = function createBoothArtistsRouter({
  getDb,
  logger = console,
  requireAdmin,
  s3 = null,
  now = () => Date.now(),
  boothKeys = null,
  boothKeyGate = null,
  summaryCache = sharedSummaryCache,
} = {}) {
  if (typeof requireAdmin !== 'function') throw new Error('booth-artists-router needs requireAdmin')
  const router = express.Router()
  const db = () => {
    const d = getDb()
    if (!d) { const e = new Error('Database not initialised'); e.status = 503; throw e }
    return d
  }
  const signer = () => s3 || require('../s3-production-service.cjs')

  // THE GATE, on every route, before anything is read.
  router.use(async (req, res, next) => {
    try {
      const user = await requireAdmin(req, res)
      if (!user) return // requireAdmin has already answered 401/403
      if (!ov.isGodAdmin(user)) {
        logger.warn(`[BoothArtists] refused ${user.email || 'unknown'} (admin, not a God admin)`)
        return res.status(403).json({ error: 'Only Tom, Aran and Kai can see every recording artist.' })
      }
      req.godAdmin = user
      next()
    } catch (err) {
      logger.error(`[BoothArtists] gate: ${err.message}`)
      res.status(500).json({ error: 'Access check failed' })
    }
  })

  // The reads themselves (takes, coverage, per-artist queues) live in booth-artists-reader.cjs,
  // shared with the weekly people report (job #501). This file only gates and answers.
  const { gather, safeWorkFor, headline, buildOverview } = createArtistsReader({ getDb, logger, now })

  router.get('/artists', async (req, res) => {
    try {
      const got = await summaryCache.get(buildOverview, { fresh: req.query.fresh !== undefined })
      // THE CALLER'S OWN VOICES (Aran, job #831): the same email-to-voices rule as the booth tabs
      // (#392). Added per request, never into the shared cached overview. A failure here only
      // means no "You" card; it never costs the team its cards.
      let mine = []
      try { mine = (await queue.voicesForEmail(db(), req.godAdmin.email)).map((v) => v.voiceId) } catch (e) {
        logger.warn(`[BoothArtists] own voices for ${req.godAdmin.email}: ${e.message}`)
      }
      res.set('X-Overview-Age-Ms', String(got.ageMs)).json({ ...got.value, mine })
    } catch (err) {
      logger.error(`[BoothArtists] overview: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.get('/artists/:voiceId', async (req, res) => {
    try {
      const t = now()
      const voices = await gather()
      const artist = voices.get(req.params.voiceId) ||
        [...voices.values()].find((a) => a.recordist && a.recordist.spellings.includes(req.params.voiceId))
      if (!artist) return res.status(404).json({ error: `No recording artist ${req.params.voiceId}` })
      const work = await safeWorkFor(artist)
      const labelOf = new Map(work.projects.map((p) => [p.key, p.label]))
      // The latest 40 overall, and the latest few of every project, so a project worked on
      // last month still has takes to hear. Takes arrive newest first.
      const perProject = new Map()
      const recent = work.takes.filter((r, i) => {
        const n = perProject.get(r.project) || 0
        perProject.set(r.project, n + 1)
        return i < 40 || n < TAKES_PER_PROJECT
      })
      const signed = await Promise.all(recent.map(async (r) => ({
        audioId: r.id,
        project: r.project,
        projectLabel: labelOf.get(r.project) || null,
        courseCode: r.course_code,
        role: r.role,
        text: r.text,
        recordedAt: r.created_at,
        durationMs: r.duration_ms,
        archived: r.archived,
        url: r.s3_key ? await signer().getAudioSignedUrl(r.id, 3600, { s3Key: r.s3_key }).catch(() => null) : null,
      })))
      const sessions = ov.sessionize(artist.takes.map((r) => Date.parse(r.created_at)))
        .slice(-20).reverse()
        .map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString(), takes: s.takes, spanMs: s.end - s.start }))
      res.json({
        generatedAt: new Date(t).toISOString(),
        sessionGapMinutes: ov.SESSION_GAP_MS / 60000,
        timeZone: ov.DAY_TZ,
        artist: headline(artist, work, t),
        phraseBatches: work.phraseBatches.map((b) => ({ ...b, project: ov.phraseProjectKey(b.courseCode, b.pass) })),
        daily: ov.dailyActivity(artist.takes, t, 30),
        sessions,
        recentTakes: signed,
      })
    } catch (err) {
      logger.error(`[BoothArtists] detail: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── PRIVATE BOOTH LINKS (job #380) ──────────────────────────────────────────────────────────────
  // Behind the God-admin gate above. `key` is null for a voice with no link yet, or one made under
  // another server secret (then it can only be regenerated). `grace` is the gate's per-voice log of
  // booth requests served WITHOUT the right key since this process started.
  const keys = () => {
    if (!boothKeys) { const e = new Error('Private booth links are not wired up on this service.'); e.status = 501; throw e }
    return boothKeys
  }
  router.get('/booth-links', async (req, res) => {
    try {
      const links = await keys().list()
      const grace = boothKeyGate ? Object.fromEntries(boothKeyGate.graceLog) : {}
      res.json({ graceOn: boothKeyGate ? !!boothKeyGate.graceOn() : null, links, grace })
    } catch (err) {
      logger.error(`[BoothArtists] booth links: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })
  router.post('/booth-links/:voiceId', async (req, res) => {
    try {
      const made = await keys().rotate(req.params.voiceId, req.godAdmin.email)
      logger.info(`[BoothArtists] booth link ${made.voiceId} (re)generated by ${req.godAdmin.email}`)
      res.json(made)
    } catch (err) {
      logger.error(`[BoothArtists] booth link rotate: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  return router
}
