/**
 * Practice-phrase proof page — HTTP side (job #562, Aran 2026-10-13). The phrase-level sibling of the LEGO proof page
 * (services/lego-proof/): every practice phrase the learner actually PLAYS, in the order he meets it, Welsh only, with a
 * flag to tick when a phrase has an issue.
 *
 *   GET /           { total, legos: [{ id, cy }], phrases: [{ id, n, l, cy, en, flagged?, note? }] } — the course's
 *                   build + use phrases under NEW LEGOs, in running order (course_running_order), then lego_index, then
 *                   position. `id` is the phrase id without its "<course>:" prefix (S0001L02B01), `l` indexes `legos`.
 *   PUT /flag       { phraseId, flagged, note } — upsert one flag. Saved the moment it is ticked; there is no Submit.
 *
 * READ-ONLY on course content: course_practice_phrases / course_legos / course_running_order are only SELECTed. The one
 * write is to phrase_proof_flags (database/changes/20261013_phrase_proof_flags.sql), a note ABOUT a phrase — not course
 * content, so it is not an editor-identity content-write surface; it still records who ticked it (flagged_by).
 *
 * Scope is the two Welsh relaunch sandboxes only (PROOF_COURSES, shared with the LEGO page). Never the live cym_n / cym_s.
 * Mounted under /api/production/:courseCode/phrase-proof so the app.param course-scope gate fires.
 */
'use strict'

const express = require('express')
const { PROOF_COURSES } = require('../lego-proof/lego-proof-router.cjs')

const PHRASE_ID = /^S\d{4,}L\d{2}[A-Z]\d{2,}$/
const NOTE_MAX = 1000
// The roles a learner hears practising a LEGO. 'component' rows are pieces of a LEGO, never played as practice.
const PLAYED_ROLES = ['build', 'use']
const PAGE = 1000

/** One page, retried once: a busy shared DB occasionally cancels a statement on timeout and a retry clears it. */
async function page(build, a, b) {
  const r = await build(a, b)
  return r.error ? build(a, b) : r
}

/** Every row of a query, past supabase's 1000-row page; pages after the first are fetched a few at a time in parallel. */
async function allRows(build) {
  const first = await page(build, 0, PAGE - 1)
  if (first.error) throw new Error(first.error.message)
  const out = [...(first.data || [])]
  if (out.length < PAGE) return out
  for (let from = PAGE; ; from += PAGE * 4) {
    const pages = await Promise.all([0, 1, 2, 3].map((k) => page(build, from + k * PAGE, from + (k + 1) * PAGE - 1)))
    for (const { data, error } of pages) {
      if (error) throw new Error(error.message)
      out.push(...(data || []))
      if (!data || data.length < PAGE) return out
    }
  }
}

/**
 * A course's phrases fetched in seed-number chunks (each an index range scan), a few chunks at a time. One query paged by
 * OFFSET over the whole course hit the DB statement timeout on the live server (8 s on page 1 ordered by id, 1-7 s per
 * deep page otherwise); 20-seed chunks come back in about a second each and rarely need a second page.
 */
async function phrasesBySeedChunks(chunkQuery, maxSeed, size = 20, parallel = 6) {
  const starts = []
  for (let lo = 1; lo <= maxSeed; lo += size) starts.push(lo)
  const out = []
  for (let i = 0; i < starts.length; i += parallel) {
    const got = await Promise.all(starts.slice(i, i + parallel).map((lo) => allRows(chunkQuery(lo, lo + size))))
    for (const rows of got) out.push(...rows)
  }
  return out
}

/**
 * The proof list, pure. A phrase is listed when its seed is in the running order (a dropped seed does not play), its
 * LEGO is new (taught LEGOs are not practised), and its role is build or use. Sorted by the seed's running position,
 * then lego_index, then position. `n` is 1..N over the whole course — the running number Aran reads, and what the belt
 * stripe divides by `total`.
 */
function buildPhraseList(courseCode, phrases, legos, order, flags) {
  const posOf = new Map(order.map((o) => [o.seed_number, o.position]))
  const legoKey = (s, i) => `${s}:${i}`
  const newLego = new Map(legos.filter((l) => l.is_new).map((l) => [legoKey(l.seed_number, l.lego_index), l]))
  const flagOf = new Map((flags || []).map((f) => [f.phrase_id, f]))
  const prefix = `${courseCode}:`
  const rows = phrases
    .filter((p) => PLAYED_ROLES.includes(p.phrase_role) && posOf.has(p.seed_number) && newLego.has(legoKey(p.seed_number, p.lego_index)))
    .sort((a, b) => posOf.get(a.seed_number) - posOf.get(b.seed_number) || a.lego_index - b.lego_index || a.position - b.position)
  const legoOut = []
  const legoIdx = new Map()
  const out = rows.map((p, i) => {
    const k = legoKey(p.seed_number, p.lego_index)
    if (!legoIdx.has(k)) { legoIdx.set(k, legoOut.length); legoOut.push({ id: newLego.get(k).lego_id, cy: newLego.get(k).target_text }) }
    const row = { id: p.id.startsWith(prefix) ? p.id.slice(prefix.length) : p.id, n: i + 1, l: legoIdx.get(k), cy: p.target_text, en: p.known_text || '' }
    const f = flagOf.get(p.id)
    if (f && (f.flagged || f.note)) { row.flagged = !!f.flagged; row.note = f.note || '' }
    return row
  })
  return { total: out.length, legos: legoOut, phrases: out }
}

/** The flag write, validated. Returns { row } or { error, status? }. */
function flagRow(courseCode, body, who) {
  const short = String((body && body.phraseId) || '')
  if (!PHRASE_ID.test(short)) return { error: 'phraseId must look like S0001L02B01' }
  if (typeof body.flagged !== 'boolean') return { error: 'flagged must be true or false' }
  const note = body.note == null ? '' : String(body.note).trim()
  if (note.length > NOTE_MAX) return { error: `note is over ${NOTE_MAX} characters` }
  if (!who) return { error: 'who is flagging? (no signed-in user and no x-agent-id)', status: 401 }
  return { row: { course_code: courseCode, phrase_id: `${courseCode}:${short}`, flagged: body.flagged, note: note || null, flagged_by: who, updated_at: new Date().toISOString() } }
}

function createPhraseProofRouter({ getDb, logger }) {
  const router = express.Router({ mergeParams: true })
  const log = logger || console

  router.use((req, res, next) => {
    if (!PROOF_COURSES.includes(req.params.courseCode)) {
      return res.status(404).json({ error: `Phrase proof is for ${PROOF_COURSES.join(' / ')} only` })
    }
    next()
  })

  router.get('/', async (req, res) => {
    try {
      const db = getDb()
      const { courseCode } = req.params
      const [order, legos, flags] = await Promise.all([
        allRows((a, b) => db.from('course_running_order').select('seed_number,position')
          .eq('course_code', courseCode).order('seed_number').range(a, b)),
        allRows((a, b) => db.from('course_legos').select('lego_id,seed_number,lego_index,is_new,target_text')
          .eq('course_code', courseCode).order('seed_number').order('lego_index').range(a, b)),
        allRows((a, b) => db.from('phrase_proof_flags').select('phrase_id,flagged,note')
          .eq('course_code', courseCode).order('phrase_id').range(a, b)),
      ])
      const maxSeed = order.reduce((m, o) => Math.max(m, o.seed_number), 0)
      const phrases = await phrasesBySeedChunks((lo, hi) => (a, b) => db.from('course_practice_phrases')
        .select('id,seed_number,lego_index,position,phrase_role,target_text,known_text')
        .eq('course_code', courseCode).gte('seed_number', lo).lt('seed_number', hi).in('phrase_role', PLAYED_ROLES)
        .order('seed_number').order('lego_index').order('position').range(a, b), maxSeed)
      res.set('Cache-Control', 'no-store')
      res.json({ courseCode, ...buildPhraseList(courseCode, phrases, legos, order, flags) })
    } catch (e) {
      log.error(`[phrase-proof] GET ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.put('/flag', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const db = getDb()
      const { courseCode } = req.params
      const who = (req.dashboardUser && req.dashboardUser.email) || req.get('x-agent-id') || null
      const { row, error, status } = flagRow(courseCode, req.body || {}, who)
      if (error) return res.status(status || 400).json({ error })
      const { data: phrase, error: pe } = await db.from('course_practice_phrases').select('id')
        .eq('course_code', courseCode).eq('id', row.phrase_id).maybeSingle()
      if (pe) throw new Error(pe.message)
      if (!phrase) return res.status(404).json({ error: `${row.phrase_id} is not a phrase of ${courseCode}` })
      const { data, error: ue } = await db.from('phrase_proof_flags').upsert(row, { onConflict: 'course_code,phrase_id' })
        .select('phrase_id,flagged,note,flagged_by,updated_at').single()
      if (ue) throw new Error(ue.message)
      res.json({ ok: true, flag: data })
    } catch (e) {
      log.error(`[phrase-proof] PUT ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createPhraseProofRouter, buildPhraseList, flagRow, phrasesBySeedChunks }
