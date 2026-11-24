/**
 * Course editor — HTTP side (job #116·AK, Aran 2026-11-21: "In the Popty, I want to be able to go into a course (Korean,
 * for example) and make changes to the introduction items and to the practice phrases"). Built from his two proof pages
 * (services/lego-proof/, services/phrase-proof/): the course in RUNNING ORDER, each new LEGO followed by the practice
 * phrases a learner hears under it, with the proof flags kept working.
 *
 * PROPOSE FIRST, APPLY ON AN EXPLICIT ADMIN TAP (Aran's amendment). An edit or removal is stored as a pending proposal
 * (proposal-store.cjs) and touches NOTHING in the course. Only POST /proposals/:id/apply makes it real, through the edit
 * door's engine (runCourseEdit in production-api.cjs → services/shared/course-edit-ops.cjs): one transaction, `expect`
 * on the proposal's "before" (drift → the proposal is marked stale, never overwritten), editor identity from the content
 * gate, and the door's derived undo kept on the proposal for POST /proposals/:id/undo.
 *
 *   GET    /                    { items, total, proposals, audioMode } — new LEGOs + their build/use phrases, running order
 *   PUT    /flag                { kind: lego|phrase, id, flagged, note } — the proof pages' flag tables, unchanged
 *   POST   /proposals           { kind, id, action: edit|remove, known?, target? } — store a pending change (no course write)
 *   DELETE /proposals/:pid      discard a pending proposal
 *   POST   /proposals/:pid/apply   make it real (content write — listed in shared/content-write-surfaces.cjs)
 *   POST   /proposals/:pid/undo    post the door's undo back (content write — listed there too)
 *   POST   /render              { kind, id, role, confirm } — "make new audio": POST /api/audio/render, a dry run unless confirm
 *
 * WHO MAY USE IT: Popty admins (Tom, Aran, Kai) — requireAdmin on every route, reads included — or a same-host caller
 * that names itself with x-agent-id (the house control-plane rule, shared/control-plane-gate.cjs: a browser through the
 * funnel never arrives on bare loopback). Mounted under /api/production/:courseCode so the course-scope gate fires too.
 * COURSES: kor_for_eng only for now (Aran's amendment, 2026-11-21) — EDITOR_COURSES, like the proof pages' PROOF_COURSES.
 */
'use strict'

const express = require('express')
const { phrasesBySeedChunks, allRows, flagRow: phraseFlagRow } = require('../phrase-proof/phrase-proof-router.cjs')
const { flagRow: legoFlagRow } = require('../lego-proof/lego-proof-router.cjs')
const { buildOps, needsNewAudio, isDrift, AUDIO_COLS } = require('./course-editor-ops.cjs')
const { createProposalStore } = require('./proposal-store.cjs')
const { buildRounds } = require('./round-view.cjs')
const { phraseFloor } = require('../course-builder/lib/phrase-structure.cjs')

const EDITOR_COURSES = ['kor_for_eng']
const PLAYED_ROLES = ['build', 'use']
const LEGO_ID = /^S\d{4,}L\d{2}$/
const PHRASE_SHORT = /^S\d{4,}L\d{2}[A-Z]\d{2,}$/
const TEXT_MAX = 500
const ROW_COLS = `known_text,target_text,target_text_roman,${AUDIO_COLS.join(',')}`
const INTRO_MAX = 1000

/**
 * WHO MAY CHANGE THE COURSE HERE: the fine-tuning editors — Aran only, at first (Aran's ruling, 2026-11-24). Everybody
 * the router already lets in (Popty admins, a named same-host agent) can still READ the editor and see every proposal;
 * only these sign-ins may propose, apply, undo, discard or render. A verified Popty sign-in's email, never an agent name.
 * FINE_TUNE_EDITORS (comma list) overrides the default on the service.
 */
const FINE_TUNE_EDITORS = (process.env.FINE_TUNE_EDITORS || 'aran@hey.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
const isFineTuner = (req) => !!req.editorSignedIn && FINE_TUNE_EDITORS.includes(String(req.editorWho || '').toLowerCase())

/**
 * A NEW LINE'S SLOT ID (copy / add). Learner progress is filed by the phrase id (its slot), so a hand-added line is an
 * ADDITION with an id never used before — nothing is renumbered (docs/pods/pod-migration-protocol.md). The player only
 * names a cycle from an id shaped S0000L00B00 / …U00 (ssi-learning-app phraseCycleName), so it stays a BUILD id; hand
 * lines take B90–B99, a range generation never reaches, so a deleted generated id is never re-issued to a new line.
 */
function nextHandPhraseId(legoId, existingShortIds) {
  const have = new Set(existingShortIds)
  let top = 89
  for (const id of existingShortIds) { const m = new RegExp(`^${legoId}B(\\d{2})$`).exec(id); if (m) top = Math.max(top, Number(m[1])) }
  for (let n = top + 1; n <= 99; n++) { const id = `${legoId}B${String(n).padStart(2, '0')}`; if (!have.has(id)) return id }
  return null
}
const nul = (v) => (v == null || v === '' ? null : v)
// An intro clip's text is its TTS script, SSML and all ("…, is: <break time="300ms"/>"). Aran reads and writes it with
// the pauses marked ‹pause› (LiveCourseEditor.vue mirrors readableIntro); they go back to SSML for the render.
const readableIntro = (s) => String(s || '').replace(/<break[^>]*\/?>/g, ' ‹pause› ').replace(/<[^>]+>/g, '')
  .replace(/(\s*‹pause›\s*)+/g, ' ‹pause› ').replace(/\s+/g, ' ').trim()
const introScript = (s) => String(s || '').replace(/\s*‹pause›\s*/g, ' <break time="300ms"/> ').replace(/\s+/g, ' ').trim()
const lockOf = (r) => (r && r.hand_edited_at ? { by: r.hand_edited_by, at: r.hand_edited_at } : null)

/**
 * The editor list, pure. One running sequence of items — a new LEGO, then its build/use phrases by position — ordered
 * by the seed's place in course_running_order (a course with no running-order rows plays its seeds in seed order).
 * `n` numbers every item 1..total, which the belt stripe divides. `m` lists the audio slots that are EMPTY (the line
 * needs new audio); target2 only counts on a course that uses target2 at all.
 */
function buildEditorList(courseCode, legos, phrases, order, legoFlags, phraseFlags) {
  const useOrder = order.length > 0
  const posOf = new Map(order.map((o) => [o.seed_number, o.position]))
  const pos = (s) => (useOrder ? posOf.get(s) : s)
  const plays = (s) => !useOrder || posOf.has(s)
  const usesT2 = legos.some((l) => l.target2_audio_id) || phrases.some((p) => p.target2_audio_id)
  const missing = (r) => ['known', 'target1', ...(usesT2 ? ['target2'] : [])].filter((s) => !r[`${s}_audio_id`])
  const lf = new Map((legoFlags || []).map((f) => [f.lego_id, f]))
  const pf = new Map((phraseFlags || []).map((f) => [f.phrase_id, f]))
  const byLego = new Map()
  for (const p of phrases) {
    if (!PLAYED_ROLES.includes(p.phrase_role)) continue
    const k = `${p.seed_number}:${p.lego_index}`
    if (!byLego.has(k)) byLego.set(k, [])
    byLego.get(k).push(p)
  }
  const prefix = `${courseCode}:`
  const items = []
  const flagOf = (f) => (f && (f.flagged || f.note) ? { flagged: !!f.flagged, note: f.note || '' } : null)
  const newLegos = legos.filter((l) => l.is_new && plays(l.seed_number))
    .sort((a, b) => pos(a.seed_number) - pos(b.seed_number) || a.lego_index - b.lego_index)
  for (const l of newLegos) {
    items.push({ t: 'l', id: l.lego_id, tx: l.target_text, kn: l.known_text, m: missing(l), f: flagOf(lf.get(l.lego_id)) })
    const ps = (byLego.get(`${l.seed_number}:${l.lego_index}`) || []).sort((a, b) => a.position - b.position)
    for (const p of ps) {
      items.push({ t: 'p', id: p.id.startsWith(prefix) ? p.id.slice(prefix.length) : p.id, tx: p.target_text, kn: p.known_text || '', m: missing(p), f: flagOf(pf.get(p.id)) })
    }
  }
  items.forEach((it, i) => { it.n = i + 1; if (!it.f) delete it.f; if (!it.m.length) delete it.m })
  return { total: items.length, items, usesTarget2: usesT2 }
}

/** Validate a proposal body. Returns { p } or { error }. */
function proposalInput(body) {
  const kind = body && body.kind
  const clean = (v, max) => String(v).replace(/\s+/g, ' ').trim().slice(0, max + 1)
  // A ROUND change: its practice order (drag) or a new practice phrase (add). The round is its LEGO.
  if (kind === 'round') {
    const id = String(body.id || '')
    if (!LEGO_ID.test(id)) return { error: 'a round is named by its LEGO id, like S0001L02' }
    if (body.action === 'order') {
      const order = Array.isArray(body.order) ? body.order.map(String) : []
      if (!order.length || order.length > 40 || order.some((x) => !PHRASE_SHORT.test(x) || !x.startsWith(id)) || new Set(order).size !== order.length) return { error: 'order must list this round\'s practice phrases, each once' }
      return { p: { kind, id, action: 'order', order } }
    }
    if (body.action === 'add') {
      const out = { kind, id, action: 'add' }
      for (const side of ['known', 'target']) {
        const v = clean(body[side] ?? '', TEXT_MAX)
        if (!v) return { error: `${side} text is needed for a new phrase` }
        if (v.length > TEXT_MAX) return { error: `${side} text is over ${TEXT_MAX} characters` }
        out[side] = v
      }
      if (body.roman != null) out.roman = clean(body.roman, TEXT_MAX)
      return { p: out }
    }
    return { error: 'a round change is order or add' }
  }
  if (kind === 'phrase' && body.action === 'copy') {
    const id = String(body.id || '')
    if (!PHRASE_SHORT.test(id)) return { error: 'id must look like S0001L02B01' }
    return { p: { kind, id, action: 'copy' } }
  }
  if (kind !== 'lego' && kind !== 'phrase') return { error: 'kind must be lego, phrase or round' }
  const id = String(body.id || '')
  if (kind === 'lego' ? !LEGO_ID.test(id) : !PHRASE_SHORT.test(id)) return { error: `id must look like ${kind === 'lego' ? 'S0001L02' : 'S0001L02B01'}` }
  const action = body.action
  if (action !== 'edit' && action !== 'remove') return { error: 'action must be edit or remove' }
  const out = { kind, id, action }
  if (action === 'edit') {
    for (const side of ['known', 'target']) {
      if (body[side] == null) continue
      const v = String(body[side]).replace(/\s+/g, ' ').trim()
      if (!v) return { error: `${side} text cannot be empty` }
      if (v.length > TEXT_MAX) return { error: `${side} text is over ${TEXT_MAX} characters` }
      out[side] = v
    }
    if (body.roman != null) out.roman = clean(body.roman, TEXT_MAX)
    // THE INTRO WORDING is its own change (action 'intro'): its words live only on the presentation clip, so changing
    // them is making a new clip, which is never mixed into a text edit's transaction.
    if (kind === 'lego' && body.intro != null) {
      const v = readableIntro(body.intro)
      if (!v) return { error: 'the introduction cannot be empty' }
      if (v.length > INTRO_MAX) return { error: `the introduction is over ${INTRO_MAX} characters` }
      if (out.known != null || out.target != null || out.roman != null) return { error: 'change the intro wording on its own, after the LEGO\'s words' }
      return { p: { kind, id, action: 'intro', intro: v } }
    }
    if (out.known == null && out.target == null && out.roman == null) return { error: 'an edit needs some text to change' }
  }
  return { p: out }
}

/** Run runCourseEdit (which writes its own response) and capture what it would have sent. */
function captureEdit(runCourseEdit, req, ops, opts) {
  return new Promise((resolve, reject) => {
    let status = 200
    const fake = {
      status(c) { status = c; return fake },
      json(body) { resolve({ status, body }); return fake },
      set() { return fake },
    }
    Promise.resolve(runCourseEdit(req, fake, ops, opts)).catch(reject)
  })
}

function createCourseEditorRouter({ getDb, requireAdmin, isLoopbackDirect, runCourseEdit, queueAudioPass, isHumanVoiceCourse, renderUrl, logger, store }) {
  const router = express.Router({ mergeParams: true })
  const log = logger || console
  const proposals = store || createProposalStore()

  // Course allow-list, then admin. A same-host caller must still say who it is (x-agent-id) so every proposal,
  // apply and undo names somebody.
  router.use(async (req, res, next) => {
    if (!EDITOR_COURSES.includes(req.params.courseCode)) {
      return res.status(404).json({ error: `The course editor is for ${EDITOR_COURSES.join(' / ')} only for now` })
    }
    try {
      if (isLoopbackDirect(req)) {
        const agent = String(req.get('x-agent-id') || '').trim()
        if (!agent) return res.status(401).json({ error: 'same-host caller: send x-agent-id' })
        req.editorWho = agent
        return next()
      }
      const user = await requireAdmin(req, res)
      if (!user) return
      req.editorWho = user.email || user.id || 'admin'
      req.editorSignedIn = !user.agent && !String(user.email || '').startsWith('agent:')
      next()
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  const fullPhraseId = (courseCode, short) => `${courseCode}:${short}`
  const db = () => getDb()

  // EVERY CHANGE IS ARAN'S (fine-tuning editors only). Reads stay open to whoever the gate above let in.
  const writer = (req, res) => {
    if (isFineTuner(req)) return true
    req.contentEdit?.wroteNothing()
    res.status(403).json({ error: 'Only Aran can change the course here for now — you can look at everything.', code: 'FINE_TUNE_EDITOR_ONLY' })
    return false
  }

  /**
   * IS THE HAND-EDIT LOCK SET UP? (database/migrations/20261124_hand_edit_lock.sql — applied on Tom's go, not by this
   * code.) Until it is, the editor works as before and says so: an edit is applied but NOT protected, and everything
   * that needs the lock (drag order, copy, add, intro wording) answers "lock not set up yet" instead of failing.
   * Once seen, it is trusted for the life of the process; a miss is re-checked at most once a minute.
   */
  let lockSeen = false, lockMissAt = 0
  async function lockReady() {
    if (lockSeen) return true
    if (Date.now() - lockMissAt < 60000) return false
    const { error } = await db().from('course_practice_phrases').select('hand_order').limit(1)
    if (!error) { lockSeen = true; return true }
    lockMissAt = Date.now()
    return false
  }
  const LOCK_NOT_SET_UP = { error: 'The hand-edit lock is not set up yet (its database change is waiting for Tom\'s go), so this kind of change is not available yet.', code: 'LOCK_NOT_SET_UP' }
  const LEGO_LOCK_COLS = 'hand_edited_by,hand_edited_at,intro_hand_by,intro_hand_at,phrase_order_hand_by,phrase_order_hand_at,hand_edit_held,hand_lock_overrides'
  const PHRASE_LOCK_COLS = 'hand_edited_by,hand_edited_at,hand_order,hand_edit_held,hand_lock_overrides'

  /**
   * THE WORDS OF A SPOKEN INTRODUCTION have ONE home: the text of the LEGO's presentation clip (course_audio.text). The
   * "Introductions Editor" page (IntroductionsViewer.vue) reads and writes a VFS file, <VFS_ROOT>/<course>/introductions.json,
   * through the orchestrator's phase-outputs route; on watson-1 that folder does not exist for any course (404 for
   * kor_for_eng, checked 2026-11-24) and nothing on the learner path reads it, so it is not a source. An intro edit here
   * is therefore a NEW presentation clip of Aran's words (apply, action 'intro'); there is no intro-text column.
   */
  async function clipTexts(ids) {
    const out = new Map()
    const uniq = [...new Set(ids.filter(Boolean))]
    for (let i = 0; i < uniq.length; i += 150) {
      const { data, error } = await db().from('course_audio').select('id,text').in('id', uniq.slice(i, i + 150))
      if (error) throw new Error(error.message)
      for (const c of data || []) out.set(c.id, c.text)
    }
    return out
  }

  async function liveRow(courseCode, kind, id) {
    const ready = await lockReady()
    const q = kind === 'lego'
      ? db().from('course_legos').select(`lego_id,seed_number,lego_index,status,${ROW_COLS}${ready ? ',' + LEGO_LOCK_COLS : ''}`).eq('course_code', courseCode).eq('lego_id', id)
      : db().from('course_practice_phrases').select(`id,seed_number,lego_index,position,phrase_role,status,word_count,lego_count,register,difficulty,introduce,lego_position,connected_lego_ids,${ROW_COLS}${ready ? ',' + PHRASE_LOCK_COLS : ''}`).eq('course_code', courseCode).eq('id', fullPhraseId(courseCode, id))
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }
  /** A LEGO's build/use rows, for an order, a copy or an add. */
  async function legoPhrases(courseCode, lego) {
    const ready = await lockReady()
    const { data, error } = await db().from('course_practice_phrases')
      .select(`id,position,phrase_role,known_text,target_text${ready ? ',hand_order' : ''}`)
      .eq('course_code', courseCode).eq('seed_number', lego.seed_number).eq('lego_index', lego.lego_index).order('position')
    if (error) throw new Error(error.message)
    return data || []
  }

  /**
   * The clips a row links, with who owns them and how many OTHER rows play them — in EVERY course, not just this one
   * (Astra #120·AK, fix #121·AK). A clip relabelled while another course or another line plays it would silently
   * change that line's audio text, so any other link at all makes it RELINK, never RELABEL (buildOps, otherLinks > 0);
   * a clip whose own course_code is another course is shared by definition. Index use under the agent 5 s cap: every
   * read is keyed on a clip id against the per-column *_audio_id indexes (a bitmap OR), no course filter, no cast,
   * limit 3 — three small reads per clip, and a row links at most four clips.
   */
  async function clipsFor(courseCode, kind, id, row) {
    const ids = [...new Set(AUDIO_COLS.map((c) => row[c]).filter(Boolean))]
    const out = new Map()
    if (!ids.length) return out
    const { data, error } = await db().from('course_audio').select('id,course_code,text').in('id', ids)
    if (error) throw new Error(error.message)
    const selfKey = kind === 'lego' ? id : fullPhraseId(courseCode, id)
    const isSelf = (courseOf, key) => courseOf === courseCode && key === selfKey
    for (const c of data || []) {
      const or = (cols) => cols.map((col) => `${col}.eq.${c.id}`).join(',')
      const [s, l, p] = await Promise.all([
        db().from('course_seeds').select('course_code,seed_number').or(or(AUDIO_COLS.slice(0, 3))).limit(3),
        db().from('course_legos').select('course_code,lego_id').or(or(AUDIO_COLS)).limit(3),
        db().from('course_practice_phrases').select('course_code,id').or(or(AUDIO_COLS)).limit(3),
      ])
      for (const r of [s, l, p]) if (r.error) throw new Error(r.error.message)
      const others = (s.data || []).length
        + (l.data || []).filter((x) => !(kind === 'lego' && isSelf(x.course_code, x.lego_id))).length
        + (p.data || []).filter((x) => !(kind === 'phrase' && isSelf(x.course_code, x.id))).length
      out.set(c.id, { course_code: c.course_code, text: c.text, otherLinks: others })
    }
    return out
  }

  const view = (r) => r && ({ tx: r.target_text, kn: r.known_text || '', ro: r.target_text_roman || '', lock: lockOf(r), audio: Object.fromEntries(AUDIO_COLS.map((c) => [c.replace('_audio_id', ''), r[c] || null])) })

  /**
   * THE COURSE READ, KEPT IN THIS PROCESS (Aran's room, 2026-11-24: the read "timed out (>280s)… fix it or page it").
   * A whole-course read of kor_for_eng is ~1,300 LEGOs, ~12,000 phrases, the round map, two flag tables and 1,300
   * intro clips: 70 s from cold on a busy database, 174 s and a 500 on the next try (2026-11-24), and it was paid on
   * every page load. Now it is read once per API process and kept: a page load is served from memory, an
   * apply/undo/flag here re-reads ONLY the round it touched (refreshLego: three small keyed reads), and after
   * READ_TTL_MS the next load is served what is held while a fresh read runs behind it — so a change made outside this
   * editor shows within READ_TTL_MS (the page says when the course was read). Only one read per course runs at a time.
   * The round shape itself (buildRounds) is recomputed per request: it is pure and takes milliseconds.
   */
  const READ_TTL_MS = 15 * 60 * 1000
  const courseCache = new Map()   // courseCode -> { raw, at, building }
  const legoSelect = (ready) => `lego_id,seed_number,lego_index,is_new,known_text,target_text,target_text_roman,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id${ready ? ',' + LEGO_LOCK_COLS : ''}`
  const phraseSelect = (ready) => `id,seed_number,lego_index,position,phrase_role,target_text,known_text,target_text_roman,known_audio_id,target1_audio_id,target2_audio_id${ready ? ',' + PHRASE_LOCK_COLS : ''}`

  async function readCourse(courseCode) {
    const t0 = Date.now()
    const ready = await lockReady()
    const [order, roundMap, legos, legoFlags, phraseFlags] = await Promise.all([
      allRows((a, b) => db().from('course_running_order').select('seed_number,position')
        .eq('course_code', courseCode).order('seed_number').range(a, b)),
      allRows((a, b) => db().from('course_round_index').select('round_index,lego_id')
        .eq('course_code', courseCode).order('round_index').range(a, b)).catch((e) => { log.warn(`[course-editor] round map unreadable, using running order: ${e.message}`); return [] }),
      allRows((a, b) => db().from('course_legos').select(legoSelect(ready))
        .eq('course_code', courseCode).order('seed_number').order('lego_index').range(a, b)),
      allRows((a, b) => db().from('lego_proof_flags').select('lego_id,flagged,note')
        .eq('course_code', courseCode).order('lego_id').range(a, b)),
      allRows((a, b) => db().from('phrase_proof_flags').select('phrase_id,flagged,note')
        .eq('course_code', courseCode).order('phrase_id').range(a, b)),
    ])
    const maxSeed = legos.reduce((m, l) => Math.max(m, l.seed_number), 0)
    // Chunked by seed range: one OFFSET-paged query over a whole course hits the 8 s statement timeout (job #562).
    const [phrases, clipText] = await Promise.all([
      phrasesBySeedChunks((lo, hi) => (a, b) => db().from('course_practice_phrases').select(phraseSelect(ready))
        .eq('course_code', courseCode).gte('seed_number', lo).lt('seed_number', hi).in('phrase_role', PLAYED_ROLES)
        .order('seed_number').order('lego_index').order('position').range(a, b), maxSeed),
      // The words of each spoken introduction: the presentation clip's own text (course_audio.text) — their one home.
      clipTexts(legos.map((l) => l.presentation_audio_id)),
    ])
    log.info(`[course-editor] ${courseCode}: read ${legos.length} LEGOs, ${phrases.length} phrases, ${clipText.size} intro clips in ${Date.now() - t0} ms`)
    return { ready, order, roundMap, legos, legoFlags, phraseFlags, phrases, clipText }
  }
  function refreshAll(courseCode) {
    const c = courseCache.get(courseCode) || {}
    courseCache.set(courseCode, c)
    if (!c.building) {
      c.building = readCourse(courseCode).then(
        (raw) => { c.raw = raw; c.at = Date.now(); c.building = null; return raw },
        (e) => { c.building = null; throw e })
    }
    return c.building
  }
  // Warm it once, a minute and a half after the API starts (it restarts on every deploy), so Aran's first page load after
  // a restart is not the cold read. One read per editor course; a failure just leaves the first page load to read.
  if (!process.env.VITEST) {
    const warm = setTimeout(() => {
      for (const code of EDITOR_COURSES) refreshAll(code).catch((e) => log.warn(`[course-editor] warm read ${code}: ${e.message}`))
    }, 90 * 1000)
    if (warm.unref) warm.unref()
  }
  async function courseRaw(courseCode) {
    const c = courseCache.get(courseCode)
    // The lock being set up adds columns the held read lacks: read again, once, and wait for it.
    if (c && c.raw && c.raw.ready === await lockReady()) {
      if (Date.now() - c.at > READ_TTL_MS && !c.building) refreshAll(courseCode).catch((e) => log.warn(`[course-editor] background read ${courseCode}: ${e.message}`))
      return c
    }
    await refreshAll(courseCode)
    return courseCache.get(courseCode)
  }
  /** After a change here: re-read the one LEGO and its phrases (and its intro clip's words) into the held read. */
  async function refreshLego(courseCode, legoId) {
    const c = courseCache.get(courseCode)
    if (!c || !c.raw || !legoId) return
    try {
      const raw = c.raw
      const { data: lego, error } = await db().from('course_legos').select(legoSelect(raw.ready)).eq('course_code', courseCode).eq('lego_id', legoId).maybeSingle()
      if (error) throw new Error(error.message)
      const old = raw.legos.find((l) => l.lego_id === legoId)
      const slot = lego || old
      if (!slot) return
      const { data: rows, error: pe } = await db().from('course_practice_phrases').select(phraseSelect(raw.ready))
        .eq('course_code', courseCode).eq('seed_number', slot.seed_number).eq('lego_index', slot.lego_index).in('phrase_role', PLAYED_ROLES).order('position')
      if (pe) throw new Error(pe.message)
      if (lego && lego.presentation_audio_id && !raw.clipText.has(lego.presentation_audio_id)) {
        for (const [id, t] of await clipTexts([lego.presentation_audio_id])) raw.clipText.set(id, t)
      }
      raw.legos = lego ? (old ? raw.legos.map((l) => (l.lego_id === legoId ? lego : l)) : [...raw.legos, lego]) : raw.legos.filter((l) => l.lego_id !== legoId)
      raw.phrases = [...raw.phrases.filter((p) => !(p.seed_number === slot.seed_number && p.lego_index === slot.lego_index)), ...(rows || [])]
    } catch (e) {
      // Never leave a page showing a change that did not happen, or hiding one that did: read it all again.
      log.warn(`[course-editor] refresh ${courseCode} ${legoId} failed (${e.message}) — the next page load re-reads the course`)
      courseCache.delete(courseCode)
    }
  }

  /**
   * THE ROUND VIEW (cs #128·AL): every intro item in learner order (course_round_index — the round map the player walks),
   * each with what its round plays — practice, revisits, round-off — worked out by round-view.cjs exactly as /cycles
   * builds it, plus the words of its spoken introduction. Lines are sent once, keyed by id; rounds refer to them.
   */
  router.get('/', async (req, res) => {
    try {
      const { courseCode } = req.params
      const held = await courseRaw(courseCode)
      const { ready, order, legos, legoFlags, phraseFlags, phrases, clipText } = held.raw
      let roundMap = held.raw.roundMap
      const legoById = new Map(legos.map((l) => [l.lego_id, l]))
      // No round map row (a course the view has not been refreshed for): fall back to running order, new LEGOs only.
      if (!roundMap.length) {
        const { items } = buildEditorList(courseCode, legos, [], order, [], [])
        roundMap = items.filter((it) => it.t === 'l').map((it, i) => ({ round_index: i + 1, lego_id: it.id }))
      }
      const byKey = new Map()
      for (const p of phrases) {
        const k = `${p.seed_number}:${p.lego_index}`
        if (!byKey.has(k)) byKey.set(k, [])
        byKey.get(k).push(p)
      }
      for (const list of byKey.values()) list.sort((a, b) => a.position - b.position)
      const rounds = buildRounds(roundMap, legoById, byKey)
      const introWords = { items: rounds.length, withWords: 0, noClip: 0, clipWithoutText: 0 }

      const usesT2 = legos.some((l) => l.target2_audio_id) || phrases.some((p) => p.target2_audio_id)
      const missing = (r) => ['known', 'target1', ...(usesT2 ? ['target2'] : [])].filter((sl) => !r[`${sl}_audio_id`])
      const lf = new Map(legoFlags.map((f) => [f.lego_id, f]))
      const pf = new Map(phraseFlags.map((f) => [f.phrase_id, f]))
      const flagOf = (f) => (f && (f.flagged || f.note) ? { flagged: !!f.flagged, note: f.note || '' } : undefined)
      const short = (id) => (id.startsWith(`${courseCode}:`) ? id.slice(courseCode.length + 1) : id)
      const phraseById = new Map(phrases.map((p) => [p.id, p]))
      const outPhrases = {}
      const putPhrase = (id) => {
        const p = phraseById.get(id), sid = short(id)
        if (!p || outPhrases[sid]) return sid
        const m = missing(p)
        outPhrases[sid] = { tx: p.target_text, kn: p.known_text || '', ro: p.target_text_roman || '', role: p.phrase_role,
          ...(m.length ? { m } : {}), ...(lockOf(p) ? { lock: lockOf(p) } : {}), ...(p.hand_edit_held ? { held: p.hand_edit_held } : {}),
          ...(p.hand_order != null ? { ho: p.hand_order } : {}), ...(flagOf(pf.get(id)) ? { f: flagOf(pf.get(id)) } : {}) }
        return sid
      }
      const outLegos = {}
      const outRounds = rounds.map((r) => {
        const l = legoById.get(r.legoId)
        const m = missing(l)
        const clip = l.presentation_audio_id ? (clipText.get(l.presentation_audio_id) ?? '') : null
        if (clip === null) introWords.noClip++; else if (!clip.trim()) introWords.clipWithoutText++; else introWords.withWords++
        outLegos[l.lego_id] = { tx: l.target_text, kn: l.known_text || '', ro: l.target_text_roman || '',
          clip, ...(l.intro_hand_at ? { introHand: { by: l.intro_hand_by, at: l.intro_hand_at } } : {}),
          // The phrase floor this LEGO is held to (course-builder phraseFloor): the editor WARNS when a change takes a
          // round below it, and never blocks Aran's edit for it.
          floor: phraseFloor(l.seed_number, l.lego_index),
          ...(m.length ? { m } : {}), ...(lockOf(l) ? { lock: lockOf(l) } : {}), ...(l.hand_edit_held ? { held: l.hand_edit_held } : {}),
          ...(l.phrase_order_hand_at ? { order: { by: l.phrase_order_hand_by, at: l.phrase_order_hand_at } } : {}),
          ...(flagOf(lf.get(l.lego_id)) ? { f: flagOf(lf.get(l.lego_id)) } : {}) }
        return { n: r.n, l: r.legoId, p: r.practice.map(putPhrase), r: r.revisits.map((v) => [putPhrase(v.id), v.from]),
          s: r.seedRevisits.map((v) => [v.seed, v.from]), o: r.roundOff.map(putPhrase), u: r.unplayed.map(putPhrase) }
      })
      res.set('Cache-Control', 'no-store')
      res.json({
        courseCode,
        audioMode: isHumanVoiceCourse(courseCode) ? 'booth' : 'tts',
        usesTarget2: usesT2,
        lockReady: ready,
        introWords,
        readAt: new Date(held.at || Date.now()).toISOString(),
        canEdit: isFineTuner(req),
        rounds: outRounds, legos: outLegos, phrases: outPhrases,
        proposals: proposals.list(courseCode).filter((p) => p.status !== 'undone'),
        you: req.editorWho,
      })
    } catch (e) {
      log.error(`[course-editor] GET ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.put('/flag', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const { courseCode } = req.params
      const b = req.body || {}
      const lego = b.kind === 'lego'
      const { row, error, status } = lego
        ? legoFlagRow(courseCode, { legoId: b.id, flagged: b.flagged, note: b.note }, req.editorWho)
        : phraseFlagRow(courseCode, { phraseId: b.id, flagged: b.flagged, note: b.note }, req.editorWho)
      if (error) return res.status(status || 400).json({ error })
      const live = await liveRow(courseCode, lego ? 'lego' : 'phrase', b.id)
      if (!live) return res.status(404).json({ error: `${b.id} is not in ${courseCode}` })
      const { data, error: ue } = await db().from(lego ? 'lego_proof_flags' : 'phrase_proof_flags')
        .upsert(row, { onConflict: lego ? 'course_code,lego_id' : 'course_code,phrase_id' }).select('flagged,note').single()
      if (ue) throw new Error(ue.message)
      // The held course read keeps its flags in step (the rest of the line did not change).
      const held = courseCache.get(courseCode)
      if (held && held.raw) {
        const k = lego ? 'legoFlags' : 'phraseFlags', idCol = lego ? 'lego_id' : 'phrase_id'
        held.raw[k] = [...held.raw[k].filter((f) => f[idCol] !== row[idCol]), { [idCol]: row[idCol], ...data }]
      }
      res.json({ ok: true, flag: data })
    } catch (e) {
      log.error(`[course-editor] flag ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  // PROPOSE: reads the live row, stores before/after. Writes no course table.
  router.post('/proposals', express.json({ limit: '16kb' }), async (req, res) => {
    try {
      const { courseCode } = req.params
      if (!writer(req, res)) return
      const { p, error } = proposalInput(req.body)
      if (error) return res.status(400).json({ error })
      const ready = await lockReady()
      // Order and copy only exist with the lock: without it they could be overwritten unseen. (An intro edit, like a text
      // edit, lands without it — unprotected, and the page says so.)
      if (!ready && (p.kind === 'round' || p.action === 'copy')) return res.status(409).json(LOCK_NOT_SET_UP)
      const live = await liveRow(courseCode, p.kind === 'round' ? 'lego' : p.kind, p.id)
      if (!live) return res.status(404).json({ error: `${p.id} is not in ${courseCode}` })
      const legoOfLine = p.kind === 'phrase' ? p.id.match(/^S\d+L\d+/)[0] : p.id
      let before = { known: live.known_text || '', target: live.target_text, roman: live.target_text_roman || '' }
      let after = null
      // The line a proposal is about. An order is one per round; every add and copy is its own new line.
      let key = p.id
      if (p.action === 'intro') {
        if (isHumanVoiceCourse(courseCode)) return res.status(409).json({ error: 'a human-voice course records its intros in the booth' })
        const clip = live.presentation_audio_id || null
        const text = clip ? ((await clipTexts([clip])).get(clip) ?? '') : ''
        if (readableIntro(text) === p.intro) return res.status(400).json({ error: 'that is what the intro already says' })
        before = { intro: readableIntro(text), clip }
        after = { intro: p.intro }
        key = `intro:${p.id}`
      } else if (p.action === 'edit') {
        after = { known: p.known ?? before.known, target: p.target ?? before.target, roman: p.roman ?? before.roman }
        const same = after.known === before.known && after.target === before.target && nul(after.roman) === nul(before.roman)
        if (same) return res.status(400).json({ error: 'that is the text it already has' })
      } else if (p.action === 'order') {
        const rows = (await legoPhrases(courseCode, live)).filter((r) => PLAYED_ROLES.includes(r.phrase_role))
        const ids = new Set(rows.map((r) => r.id.slice(courseCode.length + 1)))
        const stray = p.order.filter((x) => !ids.has(x))
        if (stray.length) return res.status(400).json({ error: `not a phrase of this round: ${stray.join(', ')}` })
        before = { order: rows.filter((r) => r.hand_order != null).sort((a, b) => a.hand_order - b.hand_order).map((r) => r.id.slice(courseCode.length + 1)), byHand: !!live.phrase_order_hand_at }
        after = { order: p.order }
        key = `order:${p.id}`
      } else if (p.action === 'add') {
        before = null
        after = { known: p.known, target: p.target, roman: p.roman || '' }
        key = `add:${p.id}:${proposals.newId()}`
      } else if (p.action === 'copy') {
        after = { ...before }
        key = `copy:${p.id}:${proposals.newId()}`
      }
      const saved = await proposals.mutate(courseCode, (list) => {
        // Never replace a proposal whose apply/undo is in flight (review 06b848ce): its record carries the Undo.
        if (list.some((x) => x.kind === p.kind && x.key === key && inflight.has(x.id))) return { busy: true }
        // One open proposal per line: a new one replaces a pending one.
        for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === p.kind && list[i].key === key && ['pending', 'stale', 'failed'].includes(list[i].status)) list.splice(i, 1)
        const rec = { id: proposals.newId(), kind: p.kind, key, line: p.id, lego: legoOfLine, action: p.action, before, after, proposedBy: req.editorWho, proposedAt: new Date().toISOString(), status: 'pending' }
        list.push(rec)
        return rec
      })
      if (saved.busy) return res.status(409).json({ error: 'a change to this line is being applied or undone — wait a moment and reload', code: 'IN_PROGRESS' })
      log.info(`[course-editor] ${courseCode}: proposed ${p.action} ${p.kind} ${p.id} by ${req.editorWho}`)
      res.json({ ok: true, proposal: saved })
    } catch (e) {
      log.error(`[course-editor] propose ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.delete('/proposals/:pid', async (req, res) => {
    try {
      if (!writer(req, res)) return
      const { courseCode, pid } = req.params
      const out = await proposals.mutate(courseCode, (list) => {
        const i = list.findIndex((x) => x.id === pid)
        if (i < 0) return { status: 404, error: 'no such proposal' }
        // DISCARD NEVER RACES AN APPLY (review 06b848ce): spliced mid-apply, the apply's final patch found no record and
        // the undoOps — the only Undo for a write that DID land — were lost. Refuse while it is claimed.
        if (inflight.has(pid)) return { status: 409, error: 'this change is being applied or undone — wait a moment and reload' }
        if (list[i].status === 'applied') return { status: 409, error: 'applied changes are undone, not discarded' }
        list.splice(i, 1)
        return { ok: true }
      })
      if (out.error) return res.status(out.status).json({ error: out.error })
      log.info(`[course-editor] ${courseCode}: discarded ${pid} by ${req.editorWho}`)
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // ONE apply/undo per proposal at a time. Live check, 2026-11-21: an undo held back by the DB load governor outlived its
  // client's timeout, the retry passed the status check before the first finished, and the undo ran twice.
  const inflight = new Set()
  const claim = (req, res, pid) => {
    if (inflight.has(pid)) { req.contentEdit?.wroteNothing(); res.status(409).json({ error: 'this change is already being applied or undone — wait a moment and reload', code: 'IN_PROGRESS' }); return false }
    inflight.add(pid)   // released in the handler's finally — NOT on res 'close', which fires when the client gives up
    return true
  }
  // The write landed: record it, and if the record is somehow gone, re-file it — its undoOps are the only Undo.
  const applyLanded = (courseCode, rec, patch) => proposals.mutate(courseCode, (list) => {
    let cur = list.find((x) => x.id === rec.id)
    if (!cur) { cur = { ...rec }; list.push(cur); log.warn(`[course-editor] ${courseCode}: proposal ${rec.id} vanished mid-apply — re-filed so its Undo survives`) }
    return Object.assign(cur, patch)
  })
  const legoOfRec = (rec) => rec.lego || (rec.kind === 'phrase' ? String(rec.line || rec.key).match(/^S\d+L\d+/)?.[0] : rec.line || rec.key)
  const findProposal = (courseCode, pid) => proposals.list(courseCode).find((x) => x.id === pid)
  const patchProposal = (courseCode, pid, patch) => proposals.mutate(courseCode, (list) => {
    const rec = list.find((x) => x.id === pid)
    if (rec) Object.assign(rec, patch)
    return rec
  })

  /**
   * APPLY AN INTRO WORDING (Aran's room, 2026-11-24: one source, no copy). The intro's words live only on its clip, so the
   * change is a new presentation clip of Aran's words, made make-before-break:
   *   1. Popty's one audio route, a DRY RUN first (library first, cost shown) — Apply without confirm:true writes nothing;
   *   2. on confirm, ONE render (or a library hit) of his words, filed WITHOUT legoId so the door does not link it itself;
   *   3. the edit door links it to the LEGO, `expect`ing the clip the proposal was made against, in the fine-tuning
   *      editor's own transaction — the hand-edit trigger stamps intro_hand_by/at, so a regeneration that later tries
   *      to point the LEGO at an intro with other words is held. The old clip is untouched; the door's derived Undo
   *      links it straight back.
   * A render the door refuses is the answer: passed back, never retried.
   */
  async function applyIntro(req, res, { courseCode, pid, rec, line, live, ready, stale }) {
    const oldClip = live.presentation_audio_id || null
    if (oldClip !== (rec.before.clip || null)) return stale('the intro clip changed since this was proposed', { clip: oldClip })
    if (isHumanVoiceCourse(courseCode)) { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: 'a human-voice course records its intros in the booth' }) }
    const confirmed = !!req.body && req.body.confirm === true
    const r = await fetch(renderUrl(req), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-id': `course-editor:${req.editorWho}` },
      body: JSON.stringify({ courseCode, role: 'presentation', text: introScript(rec.after.intro), purpose: `course editor: hand-set intro wording for ${line}`, dryRun: !confirmed }),
    })
    const made = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }))
    log.info(`[course-editor] ${courseCode}: intro ${confirmed ? 'render' : 'dry run'} ${line} by ${req.editorWho} → ${r.status} ${made.code || made.source || ''}`)
    if (!r.ok || made.ok === false) {
      req.contentEdit?.wroteNothing()
      const p = await patchProposal(courseCode, pid, { error: `The audio route said no: ${made.code || r.status} — ${made.error || ''}`.trim() })
      return res.status(r.status >= 400 ? r.status : 502).json({ error: p.error, code: made.code, proposal: p })
    }
    if (!confirmed) {
      req.contentEdit?.wroteNothing()
      return res.json({ ok: true, needsConfirm: true, render: { source: made.source || null, wouldSpendChars: made.wouldSpendChars ?? made.chars ?? null } })
    }
    if (!made.audioId) { req.contentEdit?.wroteNothing(); return res.status(502).json({ error: 'the audio route answered without a clip id' }) }
    const ops = [{ op: 'audio.link', target: 'lego', lego_id: line, slot: 'presentation', audio_id: made.audioId, expect: { presentation_audio_id: oldClip } }]
    const { status, body } = await captureEdit(runCourseEdit, req, ops, { apply: true, handEditor: ready ? req.editorWho : null })
    if (status !== 200 || !body.applied) {
      const p = await patchProposal(courseCode, pid, { status: isDrift(body) ? 'stale' : 'pending', errorCode: body.code || null, madeClip: made.audioId,
        error: `${body.error || `HTTP ${status}`} — the new intro clip was made (${made.audioId}) but not linked; the old one still plays` })
      return res.status(status === 200 ? 500 : status).json({ error: p.error, code: body.code, proposal: p })
    }
    const p = await applyLanded(courseCode, rec, {
      status: 'applied', appliedBy: req.editorWho, appliedAt: new Date().toISOString(), eventId: body.event_id || null,
      undoOps: body.undo_ops, undoFile: body.undo_file || null, change: { intro: 'words' }, plan: [], needsAudio: false, locked: ready,
      newClip: { id: made.audioId, source: made.source || null, charsSpent: made.charsSpent ?? 0 }, oldClip, error: null,
    })
    log.info(`[course-editor] ${courseCode}: intro of ${line} now clip ${made.audioId} (was ${oldClip}) by ${req.editorWho}, event ${body.event_id}`)
    await refreshLego(courseCode, line)
    return res.json({ ok: true, proposal: p })
  }

  // APPLY: the one place a proposal touches the course. Content write — the content gate has already resolved who.
  router.post('/proposals/:pid/apply', express.json({ limit: '4kb' }), async (req, res) => {
    const { courseCode, pid } = req.params
    if (!writer(req, res)) return
    if (!claim(req, res, pid)) return
    try {
      const rec = findProposal(courseCode, pid)
      if (!rec) { req.contentEdit?.wroteNothing(); return res.status(404).json({ error: 'no such proposal' }) }
      if (rec.status !== 'pending') { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: `this change is ${rec.status}, not pending` }) }
      const ready = await lockReady()
      const line = rec.line || rec.key
      const isNewKind = rec.kind === 'round' || rec.action === 'copy'
      if (isNewKind && !ready) { req.contentEdit?.wroteNothing(); return res.status(409).json(LOCK_NOT_SET_UP) }
      const live = await liveRow(courseCode, rec.kind === 'round' ? 'lego' : rec.kind, line)
      const stale = async (why, now) => {
        req.contentEdit?.wroteNothing()
        const p = await patchProposal(courseCode, pid, { status: 'stale', error: why, live: now })
        return res.status(409).json({ error: p.error, code: 'STALE', proposal: p })
      }
      if (!live) return stale('the line is gone from the course', null)
      if (rec.action === 'intro') return await applyIntro(req, res, { courseCode, pid, rec, line, live, ready, stale })
      const key = rec.kind === 'phrase' ? fullPhraseId(courseCode, line) : line
      let ops, change = null, plan = [], wantsAudio = false, newId = null, audioRow = key
      if (rec.action === 'edit' || rec.action === 'remove' || rec.action === 'copy') {
        const now = { known: live.known_text || '', target: live.target_text, roman: live.target_text_roman || '' }
        const moved = now.known !== rec.before.known || now.target !== rec.before.target
          || ('roman' in rec.before && nul(now.roman) !== nul(rec.before.roman))
        if (moved) return stale('the live line changed since this was proposed', now)
      }
      if (rec.action === 'edit' || rec.action === 'remove') {
        const clips = rec.action === 'edit' ? await clipsFor(courseCode, rec.kind, line, live) : new Map()
        ;({ ops, change, plan } = buildOps({ courseCode, kind: rec.kind, action: rec.action, key, live, after: rec.after, clips }))
        wantsAudio = rec.action === 'edit' && needsNewAudio(change)
      } else if (rec.action === 'order') {
        // DRAG ORDER: the round's practice phrases get hand_order 1..n in Aran's order; a phrase he no longer placed loses
        // its place; the LEGO carries the "order set by hand" marker the player obeys. position is NOT touched: it breaks
        // ties in other rounds' revisit draws, and those must not move (round-view.cjs).
        const rows = (await legoPhrases(courseCode, live)).filter((r) => PLAYED_ROLES.includes(r.phrase_role))
        const nowOrder = rows.filter((r) => r.hand_order != null).sort((a, b) => a.hand_order - b.hand_order).map((r) => r.id.slice(courseCode.length + 1))
        if (JSON.stringify(nowOrder) !== JSON.stringify(rec.before.order) || !!live.phrase_order_hand_at !== rec.before.byHand) return stale('the round\'s order changed since this was proposed', { order: nowOrder })
        const want = new Map(rec.after.order.map((sid, i) => [fullPhraseId(courseCode, sid), i + 1]))
        ops = []
        for (const r of rows) {
          const to = want.get(r.id) ?? null
          if ((r.hand_order ?? null) !== to) ops.push({ op: 'phrase.update', phrase_id: r.id, set: { hand_order: to }, expect: { hand_order: r.hand_order ?? null } })
        }
        ops.push({ op: 'lego.update', lego_id: line, set: { phrase_order_hand_at: new Date().toISOString(), phrase_order_hand_by: req.editorWho },
          expect: { phrase_order_hand_at: live.phrase_order_hand_at ?? null } })
      } else if (rec.action === 'add' || rec.action === 'copy') {
        // A NEW LINE (Aran's add or copy): an addition with a slot id never used before, born locked by the trigger
        // (this transaction is the fine-tuning editor). A BUILD phrase, deliberately — a build plays only in its own
        // round's practice, while a new USE phrase would join the revisit pool and shift what later rounds draw.
        // An exact copy plays once per round (the player skips repeated words) until it is edited.
        const lego = rec.kind === 'round' ? live : await liveRow(courseCode, 'lego', rec.lego)
        if (!lego) return stale('the round\'s intro item is gone', null)
        const rows = await legoPhrases(courseCode, lego)
        newId = nextHandPhraseId(lego.lego_id, rows.map((r) => r.id.slice(courseCode.length + 1)))
        if (!newId) { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: 'this round already has ten hand-added phrases (B90–B99)' }) }
        const src = rec.action === 'copy' ? live : null
        const text = src ? { known_text: src.known_text, target_text: src.target_text, target_text_roman: src.target_text_roman || null }
          : { known_text: rec.after.known, target_text: rec.after.target, target_text_roman: nul(rec.after.roman) }
        const placed = rows.filter((r) => r.hand_order != null)
        const row = {
          id: fullPhraseId(courseCode, newId), seed_number: lego.seed_number, lego_index: lego.lego_index, lego_id: lego.lego_id,
          phrase_role: 'build', position: rows.reduce((m, r) => Math.max(m, r.position), -1) + 1, ...text,
          word_count: src?.word_count ?? text.target_text.split(/\s+/).filter(Boolean).length, lego_count: src?.lego_count ?? 1,
          status: src?.status ?? lego.status ?? 'draft',
          ...(src ? { register: src.register, difficulty: src.difficulty, introduce: src.introduce, lego_position: src.lego_position, connected_lego_ids: src.connected_lego_ids } : {}),
          // A copy speaks the same words, so it keeps the same clips; an added line has none yet.
          ...(src ? { known_audio_id: src.known_audio_id, target1_audio_id: src.target1_audio_id, target2_audio_id: src.target2_audio_id } : {}),
          // In a round whose order is set by hand it joins the end of that order; otherwise it takes its place by length.
          ...(lego.phrase_order_hand_at ? { hand_order: placed.reduce((m, r) => Math.max(m, r.hand_order), 0) + 1 } : {}),
        }
        for (const k of Object.keys(row)) if (row[k] === undefined || row[k] === null) delete row[k]
        ops = [{ op: 'phrase.insert', row }]
        wantsAudio = !src || !(src.known_audio_id && src.target1_audio_id)
        audioRow = row.id
      } else {
        req.contentEdit?.wroteNothing()
        return res.status(400).json({ error: `unknown change ${rec.action}` })
      }
      let queued = null
      const { status, body } = await captureEdit(runCourseEdit, req, ops, {
        apply: true,
        // Only with the lock set up does this transaction declare itself the fine-tuning editor (the trigger then
        // stamps and honours the lock). Without it an edit lands exactly as before — unprotected, and the page says so.
        handEditor: ready ? req.editorWho : null,
        onApplied: async () => {
          if (!wantsAudio) return
          // Words changed: the trigger has emptied the slot. A TTS course gets an audio pass queued (never a render
          // here); a human-voice course is refused by queueAudioPass itself and the booth's Re-record card takes it.
          queued = await queueAudioPass(getDb(), { courseCode, reason: rec.action === 'edit' ? 'course editor: spoken words changed' : `course editor: ${rec.action} a practice phrase`, requestedBy: req.editorWho,
            metadata: { rows: [audioRow] }, append: true, metadataKey: 'course_editor' })
        },
      })
      if (status !== 200 || !body.applied) {
        const stale = isDrift(body)
        const p = await patchProposal(courseCode, pid, { status: stale ? 'stale' : 'pending', error: body.error || `HTTP ${status}`, errorCode: body.code || null })
        return res.status(status === 200 ? 500 : status).json({ error: body.error, code: stale ? 'STALE' : body.code, proposal: p })
      }
      const after = rec.kind === 'round' || rec.action === 'copy' ? null : await liveRow(courseCode, rec.kind, line).catch(() => null)
      const p = await applyLanded(courseCode, rec, {
        status: 'applied', appliedBy: req.editorWho, appliedAt: new Date().toISOString(), eventId: body.event_id || null,
        undoOps: body.undo_ops, undoFile: body.undo_file || null, change, plan, needsAudio: wantsAudio, newId, locked: ready,
        audioQueued: queued ? !!queued.queued || !!queued.touched : false, audioRefused: queued && queued.refused ? queued.reason : null, error: null,
      })
      log.info(`[course-editor] ${courseCode}: applied ${pid} (${rec.action} ${rec.kind} ${rec.key}) by ${req.editorWho}, event ${body.event_id}`)
      await refreshLego(courseCode, legoOfRec(rec))
      res.json({ ok: true, proposal: p, row: view(after) })
    } catch (e) {
      log.error(`[course-editor] apply ${courseCode} ${pid}: ${e.message}`)
      res.status(500).json({ error: e.message })
    } finally { inflight.delete(pid) }
  })

  // UNDO: the edit door's own derived undo, posted back through the same engine.
  router.post('/proposals/:pid/undo', express.json({ limit: '4kb' }), async (req, res) => {
    const { courseCode, pid } = req.params
    if (!writer(req, res)) return
    if (!claim(req, res, pid)) return
    try {
      const rec = findProposal(courseCode, pid)
      if (!rec || rec.status !== 'applied' || !Array.isArray(rec.undoOps)) { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: 'nothing to undo' }) }
      const line = rec.line || rec.key
      // RELABEL UNDO ORDER (live check, cs #121·AK). The door's undo is the apply reversed: row text back FIRST, clip label
      // after — so the null_*_audio_on_text_change trigger saw the kept clip still labelled with the NEW text, judged it
      // stale and emptied the slot (S0325L04U08 lost its English clip on undo). Clip labels go back first, then the row,
      // then every slot the apply kept (rec.plan, relabel or relink) is linked straight back to its clip.
      const isClip = (o) => o.op === 'audio.update'
      const key = rec.kind === 'lego' ? { lego_id: line } : { phrase_id: fullPhraseId(courseCode, line) }
      const relinkKept = (rec.plan || []).map((pl) => ({ op: 'audio.link', target: rec.kind, ...key, slot: pl.slot, audio_id: pl.audio_id, allow_text_mismatch: true }))
      const ops = [...rec.undoOps.filter(isClip), ...rec.undoOps.filter((o) => !isClip(o)), ...relinkKept]
      // An Undo is the fine-tuning editor too: it may delete the line it added and put the old lock state back.
      const ready = await lockReady()
      // (An edit applied before the lock existed is undone as before, so the Undo does not lock a line it never locked.)
      const { status, body } = await captureEdit(runCourseEdit, req, ops, { apply: true, handEditor: ready && rec.locked !== false && rec.locked !== undefined ? req.editorWho : null })
      if (status !== 200 || !body.applied) return res.status(status === 200 ? 500 : status).json({ error: body.error, code: body.code })
      const p = await patchProposal(courseCode, pid, { status: 'undone', undoneBy: req.editorWho, undoneAt: new Date().toISOString(), undoEventId: body.event_id || null })
      const row = (rec.action === 'remove' && rec.kind === 'lego') || rec.kind === 'round' || rec.action === 'copy' ? null : await liveRow(courseCode, rec.kind, line).catch(() => null)
      log.info(`[course-editor] ${courseCode}: undid ${pid} by ${req.editorWho}, event ${body.event_id}`)
      await refreshLego(courseCode, legoOfRec(rec))
      res.json({ ok: true, proposal: p, row: view(row) })
    } catch (e) {
      log.error(`[course-editor] undo ${courseCode} ${pid}: ${e.message}`)
      res.status(500).json({ error: e.message })
    } finally { inflight.delete(pid) }
  })

  // MAKE NEW AUDIO: Popty's one audio route, a dry run (library first, cost shown) unless confirm:true. A refusal is the
  // answer and is passed straight back; nothing here retries or touches a provider.
  router.post('/render', express.json({ limit: '4kb' }), async (req, res) => {
    try {
      const { courseCode } = req.params
      const b = req.body || {}
      const kind = b.kind === 'lego' ? 'lego' : 'phrase'
      if (b.confirm !== true) req.contentEdit?.wroteNothing() // a dry run writes nothing, whatever it answers
      else if (!writer(req, res)) return
      // An intro's NEW WORDS are an intro proposal (applyIntro), never this button: this one re-makes a line's own words.
      if (!['known', 'target1', 'target2'].includes(b.role)) return res.status(400).json({ error: 'role must be known, target1 or target2 (a new intro wording is proposed on the intro item, and Apply makes its audio)' })
      if (isHumanVoiceCourse(courseCode)) return res.status(409).json({ error: 'a human-voice course is re-recorded in the booth, never rendered' })
      const live = await liveRow(courseCode, kind, String(b.id || ''))
      if (!live) return res.status(404).json({ error: `${b.id} is not in ${courseCode}` })
      const text = b.role === 'known' ? live.known_text : live.target_text
      const r = await fetch(renderUrl(req), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': `course-editor:${req.editorWho}` },
        body: JSON.stringify({ courseCode, role: b.role, text, purpose: `course editor: new words on ${b.id}`, ...(kind === 'lego' ? { legoId: b.id } : {}), dryRun: b.confirm !== true }),
      })
      const body = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }))
      log.info(`[course-editor] ${courseCode}: render ${b.confirm === true ? 'CONFIRMED' : 'dry run'} ${b.id} ${b.role} by ${req.editorWho} → ${r.status} ${body.code || body.source || ''}`)
      // LINK THE CLIP INTO THIS LINE'S SLOT (Astra #120·AK, fix #121·AK). The render door takes no phrase id: it files a
      // course_audio row and leaves slot-filling to the text-keyed audio_autolink trigger, which does nothing when the
      // library answers with a clip this course already holds. So after a real render (or a library hit) the clip is put
      // in the slot through the edit door, FILL-ONLY: `expect` the slot as we read it, never over another clip.
      const slotCol = `${b.role}_audio_id`
      if (b.confirm !== true || !r.ok || body.ok === false || !body.audioId) { req.contentEdit?.wroteNothing(); return res.status(r.status).json(body) }
      const now = await liveRow(courseCode, kind, String(b.id))
      if (now && now[slotCol] === body.audioId) { req.contentEdit?.wroteNothing(); return res.json({ ...body, slotLinked: 'already' }) }
      if (!now || now[slotCol]) { req.contentEdit?.wroteNothing(); return res.json({ ...body, slotLinked: false, slotNote: now ? `the ${b.role} slot already holds another clip — not overwritten` : 'the line is gone' }) }
      const key = kind === 'lego' ? { lego_id: b.id } : { phrase_id: fullPhraseId(courseCode, b.id) }
      const linked = await captureEdit(runCourseEdit, req, [{ op: 'audio.link', target: kind, ...key, slot: b.role, audio_id: body.audioId, expect: { [slotCol]: null } }], { apply: true })
      if (linked.status !== 200 || !linked.body.applied) return res.json({ ...body, slotLinked: false, slotNote: linked.body.error || `HTTP ${linked.status}` })
      res.json({ ...body, slotLinked: true, linkEventId: linked.body.event_id || null })
    } catch (e) {
      log.error(`[course-editor] render ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createCourseEditorRouter, buildEditorList, proposalInput, EDITOR_COURSES }
