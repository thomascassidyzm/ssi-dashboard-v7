// services/shared/gender-expansion-sync.cjs
//
// THE GENDER ROW FOLLOWS THE TEXT, ON EVERY WRITE PATH (job #821, Kai's finding
// 2026-09-29: rows made once on 15 Jul, then phrases edited, rows never rewritten,
// so the new wording was spoken with no female form).
//
// course_gender_expansions is keyed by the target text itself, so a text that
// changes has NO row until something writes one. Job #741 covered the production-api
// phrase PATCH and /regenerate-phrase only; seed edits, edit-cascade, decomposition
// submits, phrases-write, the course-builder phrase PATCH and the rest all wrote
// text and left the table behind. The content-edit gate already sits in front of
// EVERY surface in content-write-surfaces.cjs, so this hangs off the gate: one
// chokepoint, no per-route retrofit that drifts when someone adds the next route.
//
// What it does: after a text-writing request, find the target texts of that course
// touched since the request began (updated_at >= since) and give each the row it
// needs, through gender-haiku-service.ensureExpansionForText — the same generator and
// prompt ("female form only where the word refers back to the speaker"). A row that
// already exists for the exact text is never overwritten (hand fixes win). It never
// deletes: the row for an OLD wording may still serve another phrase, so removing
// orphans is the repair script's job (tools/course-optimization/gender-expansions-
// resync-2026-09-29.cjs), not a side effect of an edit.
//
// Fire-and-log, debounced per course, capped: it never fails the write that
// triggered it, and a bulk submit costs one run, not one per seed.

const DEBOUNCE_MS = Number(process.env.GENDER_SYNC_DEBOUNCE_MS || 4000)
const MAX_TEXTS_PER_RUN = 150
const CONCURRENCY = 3
const SLACK_MS = 2000 // updated_at is stamped by the DB, the clock here is ours

const pending = new Map() // courseCode -> { since, timer, waiters, supabase, ensure, logger }
const running = new Set()

const TABLES = ['course_practice_phrases', 'course_legos', 'course_seeds']

/** Distinct target texts of a course written at or after `sinceIso`. */
async function recentTargetTexts(courseCode, sinceIso, supabase) {
  const texts = new Set()
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table)
      .select('target_text').eq('course_code', courseCode).gte('updated_at', sinceIso).limit(5000)
    if (error) throw new Error(`${table} unreadable: ${error.message}`)
    for (const r of data || []) if (typeof r.target_text === 'string' && r.target_text.trim()) texts.add(r.target_text)
  }
  return [...texts]
}

/**
 * One sync pass, awaitable (tools and tests). Resolves a tally, never rejects.
 * @returns {Promise<{courseCode, considered:number, written:number, failed:number, statuses:Object}>}
 */
async function syncGenderExpansions(courseCode, { supabase, since, ensure, logger = console } = {}) {
  const tally = { courseCode, considered: 0, written: 0, failed: 0, statuses: {} }
  try {
    ensure = ensure || require('../gender-haiku-service.cjs').ensureExpansionForText
    const texts = (await recentTargetTexts(courseCode, new Date(since).toISOString(), supabase)).slice(0, MAX_TEXTS_PER_RUN)
    tally.considered = texts.length
    for (let i = 0; i < texts.length; i += CONCURRENCY) {
      const outs = await Promise.all(texts.slice(i, i + CONCURRENCY).map(t =>
        ensure(courseCode, t, supabase).catch(e => ({ status: 'error', error: e.message }))))
      for (const o of outs) {
        tally.statuses[o.status] = (tally.statuses[o.status] || 0) + 1
        if (o.status === 'written') tally.written++
        if (o.status === 'llm-failed' || o.status === 'error') tally.failed++
      }
      // Ungendered course: the first answer says so for all of them.
      if (outs.every(o => o.status === 'not-gendered' || o.status === 'skipped')) break
    }
    if (tally.written || tally.failed) logger.info?.(`[gender-sync] ${courseCode}: ${JSON.stringify(tally)}`)
  } catch (e) {
    logger.warn?.(`[gender-sync] ${courseCode} failed: ${e.message}`)
    tally.error = e.message
  }
  return tally
}

/**
 * Ask for a sync of this course after a write that began at `since` (ms epoch).
 * Debounced per course; a request arriving mid-run schedules exactly one more.
 * Resolves with the tally of the run that covered it. Never rejects.
 */
function requestGenderExpansionSync(courseCode, { supabase, since = Date.now(), ensure, logger = console, debounceMs = DEBOUNCE_MS } = {}) {
  if (!courseCode || !supabase) return Promise.resolve({ skipped: true })
  return new Promise(resolve => {
    let p = pending.get(courseCode)
    if (!p) { p = { since, timer: null, waiters: [] }; pending.set(courseCode, p) }
    p.since = Math.min(p.since, since)
    p.waiters.push(resolve)
    Object.assign(p, { supabase, ensure, logger })
    clearTimeout(p.timer)
    p.timer = setTimeout(function fire() {
      if (running.has(courseCode)) { p.timer = setTimeout(fire, debounceMs); return }
      pending.delete(courseCode)
      running.add(courseCode)
      syncGenderExpansions(courseCode, { supabase: p.supabase, since: p.since - SLACK_MS, ensure: p.ensure, logger: p.logger })
        .then(t => p.waiters.forEach(w => w(t)))
        .finally(() => running.delete(courseCode))
    }, debounceMs)
    p.timer.unref?.()
  })
}

module.exports = { syncGenderExpansions, requestGenderExpansionSync, recentTargetTexts, MAX_TEXTS_PER_RUN }
