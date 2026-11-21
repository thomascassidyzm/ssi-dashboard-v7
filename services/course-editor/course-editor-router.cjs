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

const EDITOR_COURSES = ['kor_for_eng']
const PLAYED_ROLES = ['build', 'use']
const LEGO_ID = /^S\d{4,}L\d{2}$/
const PHRASE_SHORT = /^S\d{4,}L\d{2}[A-Z]\d{2,}$/
const TEXT_MAX = 500
const ROW_COLS = `known_text,target_text,${AUDIO_COLS.join(',')}`

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
  if (kind !== 'lego' && kind !== 'phrase') return { error: 'kind must be lego or phrase' }
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
    if (out.known == null && out.target == null) return { error: 'an edit needs known or target text' }
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
      next()
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  const fullPhraseId = (courseCode, short) => `${courseCode}:${short}`
  const db = () => getDb()

  async function liveRow(courseCode, kind, id) {
    const q = kind === 'lego'
      ? db().from('course_legos').select(`lego_id,${ROW_COLS}`).eq('course_code', courseCode).eq('lego_id', id)
      : db().from('course_practice_phrases').select(`id,${ROW_COLS}`).eq('course_code', courseCode).eq('id', fullPhraseId(courseCode, id))
    const { data, error } = await q.maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  /**
   * The clips a row links, with who owns them and whether any OTHER row of this course plays them too (then the clip's
   * text is not ours to relabel). Looked up within this course only: a clip owned here and also linked by another
   * course would be relabelled under it — the words are the same, only capitals/punctuation move.
   */
  async function clipsFor(courseCode, kind, id, row) {
    const ids = [...new Set(AUDIO_COLS.map((c) => row[c]).filter(Boolean))]
    const out = new Map()
    if (!ids.length) return out
    const { data, error } = await db().from('course_audio').select('id,course_code,text').in('id', ids)
    if (error) throw new Error(error.message)
    const selfKey = kind === 'lego' ? id : fullPhraseId(courseCode, id)
    for (const c of data || []) {
      const or = AUDIO_COLS.slice(0, 3).map((col) => `${col}.eq.${c.id}`).join(',')
      const [s, l, p] = await Promise.all([
        db().from('course_seeds').select('seed_number').eq('course_code', courseCode).or(or).limit(3),
        db().from('course_legos').select('lego_id').eq('course_code', courseCode).or(`${or},presentation_audio_id.eq.${c.id}`).limit(3),
        db().from('course_practice_phrases').select('id').eq('course_code', courseCode).or(or).limit(3),
      ])
      for (const r of [s, l, p]) if (r.error) throw new Error(r.error.message)
      const others = (s.data || []).length
        + (l.data || []).filter((x) => x.lego_id !== selfKey).length
        + (p.data || []).filter((x) => x.id !== selfKey).length
      out.set(c.id, { course_code: c.course_code, text: c.text, otherLinks: others })
    }
    return out
  }

  const view = (r) => r && ({ tx: r.target_text, kn: r.known_text || '', audio: Object.fromEntries(AUDIO_COLS.map((c) => [c.replace('_audio_id', ''), r[c] || null])) })

  router.get('/', async (req, res) => {
    try {
      const { courseCode } = req.params
      const [order, legos, legoFlags, phraseFlags] = await Promise.all([
        allRows((a, b) => db().from('course_running_order').select('seed_number,position')
          .eq('course_code', courseCode).order('seed_number').range(a, b)),
        allRows((a, b) => db().from('course_legos').select('lego_id,seed_number,lego_index,is_new,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id')
          .eq('course_code', courseCode).order('seed_number').order('lego_index').range(a, b)),
        allRows((a, b) => db().from('lego_proof_flags').select('lego_id,flagged,note')
          .eq('course_code', courseCode).order('lego_id').range(a, b)),
        allRows((a, b) => db().from('phrase_proof_flags').select('phrase_id,flagged,note')
          .eq('course_code', courseCode).order('phrase_id').range(a, b)),
      ])
      const maxSeed = legos.reduce((m, l) => Math.max(m, l.seed_number), 0)
      // Chunked by seed range: one OFFSET-paged query over a whole course hits the 8 s statement timeout (job #562).
      const phrases = await phrasesBySeedChunks((lo, hi) => (a, b) => db().from('course_practice_phrases')
        .select('id,seed_number,lego_index,position,phrase_role,target_text,known_text,known_audio_id,target1_audio_id,target2_audio_id')
        .eq('course_code', courseCode).gte('seed_number', lo).lt('seed_number', hi).in('phrase_role', PLAYED_ROLES)
        .order('seed_number').order('lego_index').order('position').range(a, b), maxSeed)
      res.set('Cache-Control', 'no-store')
      res.json({
        courseCode,
        audioMode: isHumanVoiceCourse(courseCode) ? 'booth' : 'tts',
        ...buildEditorList(courseCode, legos, phrases, order, legoFlags, phraseFlags),
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
      const { p, error } = proposalInput(req.body)
      if (error) return res.status(400).json({ error })
      const live = await liveRow(courseCode, p.kind, p.id)
      if (!live) return res.status(404).json({ error: `${p.id} is not in ${courseCode}` })
      const before = { known: live.known_text || '', target: live.target_text }
      let after = null
      if (p.action === 'edit') {
        after = { known: p.known ?? before.known, target: p.target ?? before.target }
        if (after.known === before.known && after.target === before.target) return res.status(400).json({ error: 'that is the text it already has' })
      }
      const saved = await proposals.mutate(courseCode, (list) => {
        // One open proposal per line: a new one replaces a pending one.
        for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === p.kind && list[i].key === p.id && ['pending', 'stale', 'failed'].includes(list[i].status)) list.splice(i, 1)
        const rec = { id: proposals.newId(), kind: p.kind, key: p.id, action: p.action, before, after, proposedBy: req.editorWho, proposedAt: new Date().toISOString(), status: 'pending' }
        list.push(rec)
        return rec
      })
      log.info(`[course-editor] ${courseCode}: proposed ${p.action} ${p.kind} ${p.id} by ${req.editorWho}`)
      res.json({ ok: true, proposal: saved })
    } catch (e) {
      log.error(`[course-editor] propose ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  router.delete('/proposals/:pid', async (req, res) => {
    try {
      const { courseCode, pid } = req.params
      const out = await proposals.mutate(courseCode, (list) => {
        const i = list.findIndex((x) => x.id === pid)
        if (i < 0) return { status: 404, error: 'no such proposal' }
        if (list[i].status === 'applied') return { status: 409, error: 'applied changes are undone, not discarded' }
        list.splice(i, 1)
        return { ok: true }
      })
      if (out.error) return res.status(out.status).json({ error: out.error })
      log.info(`[course-editor] ${courseCode}: discarded ${pid} by ${req.editorWho}`)
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  const findProposal = (courseCode, pid) => proposals.list(courseCode).find((x) => x.id === pid)
  const patchProposal = (courseCode, pid, patch) => proposals.mutate(courseCode, (list) => {
    const rec = list.find((x) => x.id === pid)
    if (rec) Object.assign(rec, patch)
    return rec
  })

  // APPLY: the one place a proposal touches the course. Content write — the content gate has already resolved who.
  router.post('/proposals/:pid/apply', express.json({ limit: '4kb' }), async (req, res) => {
    const { courseCode, pid } = req.params
    try {
      const rec = findProposal(courseCode, pid)
      if (!rec) { req.contentEdit?.wroteNothing(); return res.status(404).json({ error: 'no such proposal' }) }
      if (rec.status !== 'pending') { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: `this change is ${rec.status}, not pending` }) }
      const live = await liveRow(courseCode, rec.kind, rec.key)
      const now = { known: live ? (live.known_text || '') : null, target: live ? live.target_text : null }
      if (!live || now.known !== rec.before.known || now.target !== rec.before.target) {
        req.contentEdit?.wroteNothing()
        const p = await patchProposal(courseCode, pid, { status: 'stale', error: live ? 'the live line changed since this was proposed' : 'the line is gone from the course', live: now })
        return res.status(409).json({ error: p.error, code: 'STALE', proposal: p })
      }
      const key = rec.kind === 'lego' ? rec.key : fullPhraseId(courseCode, rec.key)
      const clips = rec.action === 'edit' ? await clipsFor(courseCode, rec.kind, rec.key, live) : new Map()
      const { ops, change, plan } = buildOps({ courseCode, kind: rec.kind, action: rec.action, key, live, after: rec.after, clips })
      const wantsAudio = rec.action === 'edit' && needsNewAudio(change)
      let queued = null
      const { status, body } = await captureEdit(runCourseEdit, req, ops, {
        apply: true,
        onApplied: async () => {
          if (!wantsAudio) return
          // Words changed: the trigger has emptied the slot. A TTS course gets an audio pass queued (never a render
          // here); a human-voice course is refused by queueAudioPass itself and the booth's Re-record card takes it.
          queued = await queueAudioPass(getDb(), { courseCode, reason: 'course editor: spoken words changed', requestedBy: req.editorWho,
            metadata: { rows: [key] }, append: true, metadataKey: 'course_editor' })
        },
      })
      if (status !== 200 || !body.applied) {
        const stale = isDrift(body)
        const p = await patchProposal(courseCode, pid, { status: stale ? 'stale' : 'pending', error: body.error || `HTTP ${status}`, errorCode: body.code || null })
        return res.status(status === 200 ? 500 : status).json({ error: body.error, code: stale ? 'STALE' : body.code, proposal: p })
      }
      const after = await liveRow(courseCode, rec.kind, rec.key).catch(() => null)
      const p = await patchProposal(courseCode, pid, {
        status: 'applied', appliedBy: req.editorWho, appliedAt: new Date().toISOString(), eventId: body.event_id || null,
        undoOps: body.undo_ops, undoFile: body.undo_file || null, change, plan, needsAudio: wantsAudio,
        audioQueued: queued ? !!queued.queued || !!queued.touched : false, audioRefused: queued && queued.refused ? queued.reason : null, error: null,
      })
      log.info(`[course-editor] ${courseCode}: applied ${pid} (${rec.action} ${rec.kind} ${rec.key}) by ${req.editorWho}, event ${body.event_id}`)
      res.json({ ok: true, proposal: p, row: view(after) })
    } catch (e) {
      log.error(`[course-editor] apply ${courseCode} ${pid}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  // UNDO: the edit door's own derived undo, posted back through the same engine.
  router.post('/proposals/:pid/undo', express.json({ limit: '4kb' }), async (req, res) => {
    const { courseCode, pid } = req.params
    try {
      const rec = findProposal(courseCode, pid)
      if (!rec || rec.status !== 'applied' || !Array.isArray(rec.undoOps)) { req.contentEdit?.wroteNothing(); return res.status(409).json({ error: 'nothing to undo' }) }
      const { status, body } = await captureEdit(runCourseEdit, req, rec.undoOps, { apply: true })
      if (status !== 200 || !body.applied) return res.status(status === 200 ? 500 : status).json({ error: body.error, code: body.code })
      const p = await patchProposal(courseCode, pid, { status: 'undone', undoneBy: req.editorWho, undoneAt: new Date().toISOString(), undoEventId: body.event_id || null })
      const row = rec.action === 'remove' && rec.kind === 'lego' ? null : await liveRow(courseCode, rec.kind, rec.key).catch(() => null)
      log.info(`[course-editor] ${courseCode}: undid ${pid} by ${req.editorWho}, event ${body.event_id}`)
      res.json({ ok: true, proposal: p, row: view(row) })
    } catch (e) {
      log.error(`[course-editor] undo ${courseCode} ${pid}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  // MAKE NEW AUDIO: Popty's one audio route, a dry run (library first, cost shown) unless confirm:true. A refusal is the
  // answer and is passed straight back; nothing here retries or touches a provider.
  router.post('/render', express.json({ limit: '4kb' }), async (req, res) => {
    try {
      const { courseCode } = req.params
      const b = req.body || {}
      const kind = b.kind === 'lego' ? 'lego' : 'phrase'
      if (!['known', 'target1', 'target2'].includes(b.role)) return res.status(400).json({ error: 'role must be known, target1 or target2' })
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
      res.status(r.status).json(body)
    } catch (e) {
      log.error(`[course-editor] render ${req.params.courseCode}: ${e.message}`)
      res.status(500).json({ error: e.message })
    }
  })

  return router
}

module.exports = { createCourseEditorRouter, buildEditorList, proposalInput, EDITOR_COURSES }
