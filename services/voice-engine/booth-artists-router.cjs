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
const queue = require('./recordist-queue.cjs')
const ov = require('./booth-artist-overview.cjs')

const TAKES_TTL_MS = 60 * 1000
const PAGE = 1000

module.exports = function createBoothArtistsRouter({
  getDb,
  logger = console,
  requireAdmin,
  s3 = null,
  now = () => Date.now(),
  boothKeys = null,
  boothKeyGate = null,
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

  // Every stored human take, once a minute at most. ~3.6k rows estate-wide on 2026-10-14.
  let takesCache = null
  async function allHumanTakes() {
    if (takesCache && now() - takesCache.at < TAKES_TTL_MS) return takesCache.rows
    const rows = []
    for (let from = 0; ; from += PAGE) {
      const page = () => db().from('course_audio')
        .select('id, voice_id, course_code, role, text, created_at, duration_ms, s3_key')
        .eq('origin', 'human').like('voice_id', 'human_%')
        .order('created_at', { ascending: false }).order('id')
        .range(from, from + PAGE - 1)
      // ~50ms warm, but 5s+ on a cold cache (it walks the 44k origin='human' rows, 39k of
      // them legacy_import): one retry on a statement timeout, as for coverage.
      let { data, error } = await page()
      if (error && /timeout/i.test(error.message || '')) ({ data, error } = await page())
      if (error) throw new Error(`takes read failed: ${error.message}`)
      rows.push(...(data || []))
      if ((data || []).length < PAGE) break
    }
    takesCache = { at: now(), rows }
    return rows
  }

  /** Coverage voices + their spellings, and every take filed under the canonical voice. */
  async function gather() {
    const d = db()
    // buildCoverage has been seen to lose a cold race with the 8s statement timeout
    // ("recorded lookup failed: canceling statement…", 2026-10-14). One retry, as
    // recordedTextKeys does; the second read runs on a warm cache.
    const coverageOnce = () => queue.buildCoverage(d).catch((err) => {
      if (!/timeout/i.test(err.message || '')) throw err
      logger.warn(`[BoothArtists] coverage timed out cold, retrying once: ${err.message}`)
      return queue.buildCoverage(d)
    })
    const [coverage, takes] = await Promise.all([coverageOnce(), allHumanTakes()])
    const languages = Array.isArray(coverage) ? coverage : (coverage.languages || [])
    const voices = new Map() // canonical voiceId → artist
    const spellingOf = new Map() // any spelling → canonical
    await Promise.all(languages.flatMap((lang) => (lang.voices || []).map(async (v) => {
      const recordist = await queue.resolveRecordist(d, v.voiceId).catch(() => null)
      const spellings = recordist ? recordist.spellings : [v.voiceId]
      for (const sp of spellings) spellingOf.set(sp, v.voiceId)
      voices.set(v.voiceId, {
        voiceId: v.voiceId, name: v.name || v.voiceId, language: lang.language,
        languageName: lang.languageName || lang.language, gender: v.gender || null,
        dialect: v.dialect || null, assignedVia: v.assignedVia || null,
        lines: { total: v.total || 0, withTake: v.withTake ?? v.recorded ?? 0, again: v.again || 0, kinds: v.kinds || {} },
        recordist, takes: [],
      })
    })))
    for (const row of takes) {
      const base = ov.baseVoice(row.voice_id)
      const canonical = spellingOf.get(base.voiceId) || base.voiceId
      if (!voices.has(canonical)) {
        // A human voice with takes but no queue: a legacy or retired voice id.
        voices.set(canonical, {
          voiceId: canonical, name: canonical, language: null, languageName: null, gender: null,
          dialect: null, assignedVia: null, lines: null, recordist: null, takes: [], noQueue: true,
        })
      }
      voices.get(canonical).takes.push({ ...row, archived: base.archived })
    }
    return voices
  }

  /** Practice-phrase batches for a voice the phrase plan names; null when it has none. */
  async function phrasesFor(artist) {
    if (!artist.recordist) return null
    const plan = await queue.getPhrasePlan(db())
    const mine = artist.recordist.spellings.flatMap((sp) => plan.byVoice.get(sp) || [])
    if (!mine.length) return null
    const keys = await queue.recordedTextKeys(db(), artist.recordist)
    const batches = ov.phraseBatches(mine, (l) => queue.phraseLineRecorded(l, keys, artist.recordist.spellings))
    return { batches, passes: ov.phrasePasses(batches) }
  }

  function headline(artist, phrases, t) {
    return {
      voiceId: artist.voiceId,
      name: artist.name,
      language: artist.language,
      languageName: artist.languageName,
      gender: artist.gender,
      dialect: artist.dialect,
      assignedVia: artist.assignedVia,
      noQueue: !!artist.noQueue,
      isTest: ov.isTestVoice(artist),
      lines: artist.lines,
      phrases: phrases ? { passes: phrases.passes } : null,
      activity: ov.summarizeTakes(artist.takes, t),
    }
  }

  // The overview is ~15s cold (coverage + the phrase plan), so it is kept a minute.
  let overviewCache = null
  router.get('/artists', async (req, res) => {
    try {
      if (overviewCache && now() - overviewCache.at < TAKES_TTL_MS && req.query.fresh === undefined) {
        return res.json(overviewCache.body)
      }
      const t = now()
      const voices = await gather()
      const artists = await Promise.all([...voices.values()].map(async (a) => {
        const phrases = await phrasesFor(a).catch((err) => {
          logger.warn(`[BoothArtists] phrases for ${a.voiceId}: ${err.message}`)
          return { unavailable: true }
        })
        return headline(a, phrases && !phrases.unavailable ? phrases : null, t)
      }))
      artists.sort((a, b) => (a.isTest - b.isTest) || (a.noQueue - b.noQueue) ||
        String(b.activity.lastActive || '').localeCompare(String(a.activity.lastActive || '')))
      const body = { generatedAt: new Date(t).toISOString(), sessionGapMinutes: ov.SESSION_GAP_MS / 60000, timeZone: ov.DAY_TZ, artists }
      overviewCache = { at: now(), body }
      res.json(body)
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
      const phrases = await phrasesFor(artist).catch(() => null)
      const recent = artist.takes.slice(0, 40)
      const signed = await Promise.all(recent.map(async (r) => ({
        audioId: r.id,
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
        artist: headline(artist, phrases, t),
        phraseBatches: phrases ? phrases.batches : [],
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
