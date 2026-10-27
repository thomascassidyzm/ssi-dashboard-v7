/**
 * booth-artists-reader.cjs — the READ half of the recording-artists overview (job #350), with no
 * gate and no HTTP. booth-artists-router.cjs wraps it behind the God-admin gate for the
 * /admin/recording page; tools/reports/weekly-people-report.cjs (job #501, Kai's Monday report)
 * calls it directly, so the report's recorder numbers are the booth's own numbers by construction,
 * never a second copy of the rule. Every number is explained in booth-artist-overview.cjs.
 * READ-ONLY: nothing here writes a row.
 */

'use strict'

const queue = require('./recordist-queue.cjs')
const boothHome = require('./booth-home.cjs')
const ov = require('./booth-artist-overview.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')

const TAKES_TTL_MS = 60 * 1000
const PAGE = 1000
/** Queues built at once for the overview: each is a recorded-keys read on the shared live DB. */
const QUEUE_CONCURRENCY = 4

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i) }
  }))
  return out
}

function createArtistsReader({ getDb, logger = console, now = () => Date.now() } = {}) {
  const db = () => {
    const d = getDb()
    if (!d) { const e = new Error('Database not initialised'); e.status = 503; throw e }
    return d
  }

  // Every stored human take, once a minute at most. ~3.6k rows estate-wide on 2026-10-14.
  let takesCache = null
  async function allHumanTakes() {
    if (takesCache && now() - takesCache.at < TAKES_TTL_MS) return takesCache.rows
    const rows = []
    for (let from = 0; ; from += PAGE) {
      const page = () => db().from('course_audio')
        .select('id, voice_id, course_code, role, text, text_normalized, created_at, duration_ms, s3_key')
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

  /**
   * One artist's work split by PROJECT (Aran, job #379): the booth's own queue for this voice —
   * the same buildQueue + buildHomeTracks the booth's home screen draws — plus the phrase plan's
   * lines, so every take can be filed under the project its words belong to. Read-only.
   */
  async function workFor(artist) {
    let tracks = []
    let phraseBatches = []
    let lines = []
    let phraseLines = []
    if (artist.recordist) {
      const q = await queue.buildQueue(db(), artist.recordist, { includeRecorded: true })
      lines = q.lines || []
      phraseBatches = q.phraseBatches || []
      tracks = boothHome.buildHomeTracks(lines, q.phrases, phraseBatches)
      if (phraseBatches.length) {
        const plan = await queue.getPhrasePlan(db())
        phraseLines = artist.recordist.spellings.flatMap((sp) => plan.byVoice.get(sp) || [])
      }
    }
    const idx = ov.lineIndex(lines, phraseLines, boothHome.trackKeyOf, audioKeyCandidates)
    const takes = artist.takes.map((t) => ({ ...t, project: ov.projectOfTake(t, idx, audioKeyCandidates) }))
    return { takes, phraseBatches, projects: ov.artistProjects({ tracks, phraseBatches, takes, language: artist.language, now: now() }) }
  }

  /** A queue that cannot be built is reported, never fatal: the takes still show, as earlier lines. */
  async function safeWorkFor(artist) {
    try { return await workFor(artist) } catch (err) {
      logger.warn(`[BoothArtists] queue for ${artist.voiceId}: ${err.message}`)
      const takes = artist.takes.map((t) => ({ ...t, project: ov.otherProjectKey(t.course_code) }))
      return { takes, phraseBatches: [], projects: ov.artistProjects({ takes, language: artist.language, now: now() }), queueUnavailable: true }
    }
  }

  function headline(artist, work, t) {
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
      projects: work.projects,
      queueUnavailable: !!work.queueUnavailable,
      activity: ov.summarizeTakes(artist.takes, t),
    }
  }

  // The overview is ~15s cold (coverage + the phrase plan), so it is kept (job #416): a minute
  // fresh, ten more served stale with a rebuild behind it, one build shared by every caller, and
  // dropped + re-warmed on any write this process makes (booth-artists-summary-cache.cjs).
  async function buildOverview() {
    const t = now()
    const voices = await gather()
    const artists = await mapLimit([...voices.values()], QUEUE_CONCURRENCY, async (a) => headline(a, await safeWorkFor(a), t))
    artists.sort((a, b) => (a.isTest - b.isTest) || (a.noQueue - b.noQueue) ||
      String(b.activity.lastActive || '').localeCompare(String(a.activity.lastActive || '')))
    return { generatedAt: new Date(t).toISOString(), sessionGapMinutes: ov.SESSION_GAP_MS / 60000, timeZone: ov.DAY_TZ, artists }
  }

  return { allHumanTakes, gather, workFor, safeWorkFor, headline, buildOverview }
}

module.exports = { createArtistsReader, mapLimit, QUEUE_CONCURRENCY }
