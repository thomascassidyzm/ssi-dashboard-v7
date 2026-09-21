/**
 * HUMAN-AUTHORED PRESENTATION LINES — the guard, as code.
 *
 * Kai's ruling, 2026-09-21 (job #506), on the two lines he wrote for
 * deu_for_eng seeds 83 and 92 (services/course-builder/lib/separable-verbs.cjs,
 * HUMAN_AUTHORED_TEXT). Presentation lines are normally template output and
 * regenerated freely; these are not, and nothing distinguished them. The four
 * clauses, each of which is a function below:
 *
 *   (A) NEVER SILENTLY OVERWRITE, NEVER SILENTLY SKIP. Every outcome for a
 *       marked line is a plain-English message the caller reports, and a
 *       decision appended to the mark's own record. A DB trigger
 *       (database/changes/20260921_human_authored_presentations.sql) refuses
 *       any write of different words to a marked LEGO's presentation row, so a
 *       path that forgets this module fails loudly instead of eating the words.
 *   (B) NOT IMMUTABLE. The wording may change when the LEGO under it changes —
 *       seed 83's line ends "The German for 'to agree' is:", and a re-worded
 *       LEGO would leave that wrong. A lock would freeze a sentence into error.
 *   (C) NO APPROVAL GATE ON MAINTENANCE. Kai: "if a presentation potentially
 *       needs to be updated, I trust an agent to decide what to do." So on a
 *       LEGO change an agent judges keep/rewrite and APPLIES it (reconcileMark).
 *       No queue, no gate, nothing blocks on a human answering.
 *   (D) ONE ESCALATION. If the change breaks the CONCEPT the line teaches —
 *       the line would now teach something the course no longer does there —
 *       that is a new explanation, which an agent never writes (job #491). It
 *       goes to Kai as a course_qa_flags row, the path structural-features.cjs
 *       uses, carrying the situation, both LEGOs, the sentence in full and a
 *       recommendation that decides nothing. Unsure → escalate.
 *
 * WHY THE MARK IS KEYED TO THE LEGO AND NOT THE ROW. Presentation rows in
 * course_audio are disposable here: /regenerate-presentations adds a pending
 * row beside the old one, /generate purges stale pending rows, the
 * course_legos text-change trigger nulls presentation_audio_id, the repair tools
 * insert a new row and delete the old, and edit-cascade deletes and re-inserts
 * the LEGO rows themselves. A mark carried on a row dies with the row (job #497
 * unlinked one and inserted a fresh pending one; #501 repaired that by hand).
 * (course_code, lego_id) — lego_id is generated from seed_number and lego_index
 * — survives all of it, so the mark lives in human_authored_presentations under
 * that key, with no FK to course_legos. The mark's `text` is the single source
 * of truth for the wording; course_audio rows carry copies.
 *
 * THE LEGO REVISION is the pair (known_text, target_text) the wording was last
 * reconciled against, not course_legos.version — edit-cascade resets that.
 *
 * NO TTS HERE. A rewrite queues an audio pass (audio-pass-queue.cjs) and, where
 * needed, writes a pending course_audio row for /generate to render.
 */

'use strict'

const createLogger = require('./logger.cjs')
const { normalizeForAudio } = require('./text-normalize.cjs')
const { queueAudioPass } = require('./audio-pass-queue.cjs')
const { v4: uuidv4 } = require('uuid')

const logger = createLogger('HumanAuthoredPresentations')

const TABLE = 'human_authored_presentations'
/** The course_qa_flags check_type an escalation is filed under. */
const CHECK_TYPE = 'human_authored_presentation'
/** The DB change that creates the table, the trigger and the check_type. */
const CHANGE_FILE = 'database/changes/20260921_human_authored_presentations.sql'
/** content_feedback.feedback_type every decision is mirrored to, for the dashboard's feedback view. */
const FEEDBACK_TYPE = 'presentation_maintenance'
const JUDGE_MODEL = 'sonnet'

// ─── Words ────────────────────────────────────────────────────────────────

/** Mirrors the DB's normalize_text(): trim, lower, strip terminal punctuation. Whitespace runs collapse too. */
function normaliseWords(t) {
  return String(t == null ? '' : t).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.?!¿¡。？！]+$/, '')
}
function sameWords(a, b) { return normaliseWords(a) === normaliseWords(b) }

/** Has the LEGO moved since the wording was last reconciled? Either side counts — a line can quote both. */
function legoUnchanged(mark, lego) {
  if (!mark || !lego) return false
  return sameWords(mark.reconciled_known_text, lego.known_text)
      && sameWords(mark.reconciled_target_text, lego.target_text)
}

/** The staleness door (clause 5 of the brief): a marked pending row is fresh iff it carries the mark's words. */
function pendingRowIsFresh(row, mark) {
  if (!mark) return null   // not marked — the caller's own rule decides
  return sameWords(row && row.text, mark.text)
}

// ─── Reading ──────────────────────────────────────────────────────────────

/** Every mark of a course (optionally only some LEGOs), keyed by lego_id. Throws — a caller that cannot read the marks must not guess. */
async function loadMarks(supabase, courseCode, legoIds = null) {
  let q = supabase.from(TABLE).select('*').eq('course_code', courseCode)
  if (Array.isArray(legoIds)) q = q.in('lego_id', legoIds)
  const { data, error } = await q
  if (error) throw new Error(`could not read ${TABLE} for ${courseCode}: ${error.message} (is ${CHANGE_FILE} applied?)`)
  return new Map((data || []).map(m => [m.lego_id, m]))
}

async function loadMark(supabase, courseCode, legoId) {
  const marks = await loadMarks(supabase, courseCode, [legoId])
  return marks.get(legoId) || null
}

// ─── The record ───────────────────────────────────────────────────────────

function decision(action, fields) {
  return { at: new Date().toISOString(), action, ...fields }
}

async function writeMark(supabase, mark, patch, newDecision) {
  const decisions = [...(mark.decisions || []), newDecision]
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, decisions, updated_at: new Date().toISOString() })
    .eq('course_code', mark.course_code).eq('lego_id', mark.lego_id)
    .select().single()
  if (error) throw new Error(`could not update the mark for ${mark.course_code}/${mark.lego_id}: ${error.message}`)
  await mirrorToFeedback(supabase, data, newDecision)
  return data
}

/** Best-effort mirror so the decision shows in the dashboard's existing content-feedback view. */
async function mirrorToFeedback(supabase, mark, d) {
  try {
    const { error } = await supabase.from('content_feedback').insert({
      course_code: mark.course_code,
      feedback_type: FEEDBACK_TYPE,
      user_id: d.by || 'human-authored-presentations',
      comment: `${mark.lego_id}: ${d.action} — ${d.why || d.reason || ''}`.trim(),
      session_context: { lego_id: mark.lego_id, decision: d },
    })
    if (error) logger.warn(`content_feedback mirror failed for ${mark.lego_id}: ${error.message}`)
  } catch (e) {
    logger.warn(`content_feedback mirror failed for ${mark.lego_id}: ${e.message}`)
  }
}

/**
 * Mark a presentation line as human-authored. Idempotent: re-marking with the
 * same words only reconciles the LEGO revision; different words are recorded
 * as an edit. `lego` is the live course_legos row (known_text, target_text).
 */
async function markHumanAuthored(supabase, { courseCode, legoId, text, author, authoredOn = null, source = null, lego, by, why = null }) {
  if (!text || !String(text).trim()) throw new Error('markHumanAuthored: text is required')
  if (!author) throw new Error('markHumanAuthored: author is required')
  if (!lego) throw new Error('markHumanAuthored: the live LEGO row is required — the mark records the revision it was reconciled against')
  const existing = await loadMark(supabase, courseCode, legoId)
  const revision = {
    reconciled_known_text: lego.known_text, reconciled_target_text: lego.target_text,
    reconciled_at: new Date().toISOString(), reconciled_by: by,
  }
  if (existing) {
    const changed = !sameWords(existing.text, text)
    return writeMark(supabase, existing, { text, author, authored_on: authoredOn, source, ...revision },
      decision(changed ? 'edited' : 'marked', {
        by, why: why || (changed ? 're-marked with new words' : 're-marked, words unchanged'),
        old_text: existing.text, new_text: text,
        lego: { known_text: lego.known_text, target_text: lego.target_text },
      }))
  }
  const d = decision('marked', { by, why, new_text: text, lego: { known_text: lego.known_text, target_text: lego.target_text } })
  const { data, error } = await supabase.from(TABLE).insert({
    course_code: courseCode, lego_id: legoId, text, author, authored_on: authoredOn, source,
    ...revision, decisions: [d],
  }).select().single()
  if (error) throw new Error(`could not mark ${courseCode}/${legoId}: ${error.message} (is ${CHANGE_FILE} applied?)`)
  await mirrorToFeedback(supabase, data, d)
  return data
}

/**
 * A wording edit RETAINS the mark (brief item 1) — a human or an agent
 * rewording the line records the new words here first, and only then may the
 * course_audio rows change (the trigger enforces that order). Passing `lego`
 * reconciles the revision; without it the previous revision stands.
 */
async function recordWordingEdit(supabase, mark, { text, by, why, lego = null }) {
  if (!text || !String(text).trim()) throw new Error('recordWordingEdit: text is required')
  const patch = { text }
  if (lego) Object.assign(patch, {
    reconciled_known_text: lego.known_text, reconciled_target_text: lego.target_text,
    reconciled_at: new Date().toISOString(), reconciled_by: by,
  })
  return writeMark(supabase, mark, patch, decision('edited', {
    by, why, old_text: mark.text, new_text: text,
    ...(lego ? { lego: { known_text: lego.known_text, target_text: lego.target_text } } : {}),
  }))
}

// ─── The judgement (clauses C and D) ──────────────────────────────────────

function maintenancePrompt({ mark, lego, seed, course }) {
  return [
    `You maintain ONE learner-facing sentence that a human (${mark.author}) wrote for a language course. It is spoken to the learner just before they hear a new piece of ${course.target_lang} ("the LEGO"). The LEGO it introduces has been edited, and your job is to decide whether the sentence still fits.`,
    '',
    `Course: ${course.course_code}`,
    `LEGO BEFORE the edit (what the sentence was written for):`,
    `  known side: ${JSON.stringify(mark.reconciled_known_text)}`,
    `  target side: ${JSON.stringify(mark.reconciled_target_text)}`,
    `LEGO NOW:`,
    `  known side: ${JSON.stringify(lego.known_text)}`,
    `  target side: ${JSON.stringify(lego.target_text)}`,
    `Seed sentence the LEGO comes from: known ${JSON.stringify(seed && seed.known_text)} / target ${JSON.stringify(seed && seed.target_text)}`,
    mark.source ? `What the sentence is for (its record): ${mark.source}` : null,
    `THE SENTENCE, in full: ${JSON.stringify(mark.text)}`,
    '',
    'Decide exactly one of:',
    '  KEEP — the sentence is still accurate for the LEGO as it now stands. Prefer this whenever the words still fit.',
    '  REWRITE — the sentence needs the smallest wording change to stay accurate (for example it quotes the old known side, or its lead-in names what follows and that has changed). Change nothing else: do not add, remove, shorten or expand explanation, keep the voice and register, keep the lead-in shape. This is maintenance of an existing explanation, not a new one.',
    '  ESCALATE — the edit changes the CONCEPT: the sentence now teaches something the course no longer does at this point (e.g. it explains a pattern and the new LEGO no longer shows that pattern), or you are genuinely unsure. Writing a new explanation is not yours to do; a human decides.',
    '',
    'Answer with JSON only, no prose around it:',
    '{"decision":"KEEP"|"REWRITE"|"ESCALATE","text":"<the full sentence to use — required for REWRITE, otherwise the current sentence>","reason":"<one or two sentences a human can read later>"}',
  ].filter(l => l !== null).join('\n')
}

function parseJudgement(raw) {
  const m = /\{[\s\S]*\}/.exec(String(raw || ''))
  if (!m) return null
  try {
    const j = JSON.parse(m[0])
    const d = String(j.decision || '').toUpperCase()
    if (!['KEEP', 'REWRITE', 'ESCALATE'].includes(d)) return null
    return { decision: d.toLowerCase(), text: typeof j.text === 'string' ? j.text.trim() : '', reason: String(j.reason || '').trim() }
  } catch (_) { return null }
}

/**
 * Ask the agent. `chat` is the seam a test holds; the default is the Claude CLI
 * (never the SDK — CLAUDE.md). Any failure to get a usable answer is ESCALATE:
 * a changed LEGO under a human's words is never quietly kept because the judge
 * was down.
 */
async function judgeMaintenance(input, { chat = null } = {}) {
  const ask = chat || require('./claude-cli.cjs').claudeChat
  let raw
  try {
    raw = await ask(maintenancePrompt(input), { model: JUDGE_MODEL, timeout: 180000 })
  } catch (err) {
    return { decision: 'escalate', text: input.mark.text, reason: `the maintenance judge could not run (${err.message}); escalated rather than guessed` }
  }
  const parsed = parseJudgement(raw)
  if (!parsed) return { decision: 'escalate', text: input.mark.text, reason: `the maintenance judge's answer was unreadable (${String(raw).slice(0, 120)}); escalated rather than guessed` }
  if (parsed.decision === 'rewrite' && (!parsed.text || sameWords(parsed.text, input.mark.text))) {
    return { decision: 'keep', text: input.mark.text, reason: `${parsed.reason} (judge said REWRITE but supplied the same words — treated as KEEP)` }
  }
  if (parsed.decision !== 'rewrite') parsed.text = input.mark.text
  return parsed
}

// ─── Applying the judgement ───────────────────────────────────────────────

/** Words the mark now carries reach the pending rows for this LEGO; a LEGO with no pending row and no rendered row in the new words gets one. */
async function propagateWording(supabase, course, mark, oldText) {
  const { data: rows, error } = await supabase
    .from('course_audio').select('id, text, s3_key, voice_id')
    .eq('course_code', course.course_code).eq('role', 'presentation').eq('lego_id', mark.lego_id)
  if (error) throw new Error(`could not read presentation rows for ${mark.lego_id}: ${error.message}`)
  let updated = 0, inserted = 0
  const pendingOld = (rows || []).filter(r => r.s3_key && r.s3_key.startsWith('pending/') && sameWords(r.text, oldText))
  for (const r of pendingOld) {
    const { error: upErr } = await supabase.from('course_audio')
      .update({ text: mark.text, text_normalized: normalizeForAudio(mark.text) }).eq('id', r.id)
    if (upErr) throw new Error(`could not reword pending row ${r.id}: ${upErr.message}`)
    updated++
  }
  const hasNewWords = (rows || []).some(r => sameWords(r.text, mark.text)) || updated > 0
  if (!hasNewWords) {
    const { resolvePresentationVoiceId } = require('../phases/presentation-author.cjs')
    let voiceId
    try { voiceId = resolvePresentationVoiceId(course) } catch (e) { throw new Error(`cannot queue the reworded line for ${mark.lego_id}: ${e.message}`) }
    const { error: insErr } = await supabase.from('course_audio').insert({
      course_code: course.course_code, text: mark.text, text_normalized: normalizeForAudio(mark.text),
      language: course.known_lang, role: 'presentation', voice_id: voiceId, origin: 'tts',
      s3_key: `pending/${uuidv4().toUpperCase()}.mp3`, lego_id: mark.lego_id,
    })
    if (insErr) throw new Error(`could not queue the reworded line for ${mark.lego_id}: ${insErr.message}`)
    inserted++
  }
  return { updated, inserted }
}

async function raiseEscalation(supabase, { course, mark, lego, seed, verdict, by }) {
  const details = {
    kind: 'human-authored-presentation-concept-break',
    situation: `The LEGO under a human-authored presentation line changed in a way that may break the concept the line teaches. The wording was left as it was; nothing was rewritten and nothing was rendered.`,
    course_code: course.course_code, lego_id: mark.lego_id, seed_number: lego.seed_number,
    author: mark.author, source: mark.source,
    old_lego: { known_text: mark.reconciled_known_text, target_text: mark.reconciled_target_text },
    new_lego: { known_text: lego.known_text, target_text: lego.target_text },
    current_text: mark.text,
    seed: seed ? { known_text: seed.known_text, target_text: seed.target_text } : null,
    recommendation: `${verdict.reason} — Kai decides: keep the line, reword it (edit the wording and the mark follows), or move the explanation. This flag decides nothing.`,
    raisedBy: by, raisedAt: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('course_qa_flags').insert({
    course_code: course.course_code, lego_id: mark.lego_id, seed_number: lego.seed_number,
    check_type: CHECK_TYPE, severity: 'error', status: 'open',
    issue: `${mark.lego_id}: the LEGO under ${mark.author}'s presentation line changed ("${mark.reconciled_known_text}" → "${lego.known_text}"); the line may now teach the wrong thing. Kai's call — the line was left unchanged.`,
    details,
  }).select('id').single()
  if (error) {
    if (error.code === '23514' || /check_type/.test(String(error.message))) {
      throw new Error(`course_qa_flags does not yet admit check_type '${CHECK_TYPE}': apply ${CHANGE_FILE} (${error.message})`)
    }
    throw new Error(`could not raise the escalation for ${mark.lego_id}: ${error.message}`)
  }
  return data.id
}

async function flagStatus(supabase, flagId) {
  const { data } = await supabase.from('course_qa_flags').select('id, status').eq('id', flagId).maybeSingle()
  return data ? data.status : null
}

/**
 * The agent judgement on ONE marked line whose LEGO has changed — and its
 * application. Returns an outcome the caller reports verbatim:
 *   { lego_id, outcome, text, message } with outcome one of
 *   'kept' | 'rewritten' | 'escalated' | 'awaiting-kai' | 'kept-after-kai' | 'would-judge'
 */
async function reconcileMark(supabase, { course, mark, lego, seed = null, judge = judgeMaintenance, dryRun = false, by = 'human-authored-presentations' }) {
  const id = `${course.course_code}/${mark.lego_id}`
  const legoNow = { known_text: lego.known_text, target_text: lego.target_text }

  if (mark.open_flag_id) {
    const status = await flagStatus(supabase, mark.open_flag_id)
    if (status === 'open') {
      return { lego_id: mark.lego_id, outcome: 'awaiting-kai', text: mark.text,
        message: `${id}: human-authored wording kept UNCHANGED — the LEGO change under it is with Kai (course_qa_flags ${mark.open_flag_id}, still open); not re-judged.` }
    }
    if (!dryRun) {
      mark = await writeMark(supabase, mark, { open_flag_id: null, reconciled_known_text: lego.known_text, reconciled_target_text: lego.target_text, reconciled_at: new Date().toISOString(), reconciled_by: by },
        decision('kept', { by, why: `Kai closed flag ${mark.open_flag_id} (${status || 'gone'}) without changing the words — the current wording stands for the current LEGO`, lego: legoNow }))
    }
    return { lego_id: mark.lego_id, outcome: 'kept-after-kai', text: mark.text,
      message: `${id}: human-authored wording kept — Kai closed the escalation (${status || 'flag gone'}) without rewording, so the line is now reconciled to the current LEGO.` }
  }

  if (dryRun) {
    return { lego_id: mark.lego_id, outcome: 'would-judge', text: mark.text,
      message: `${id}: the LEGO changed ("${mark.reconciled_known_text}" / "${mark.reconciled_target_text}" → "${lego.known_text}" / "${lego.target_text}") under a human-authored line; a live run has an agent judge keep / rewrite / escalate. Dry run — nothing decided.` }
  }

  const verdict = await judge({ mark, lego, seed, course })
  const reconciled = { reconciled_known_text: lego.known_text, reconciled_target_text: lego.target_text, reconciled_at: new Date().toISOString(), reconciled_by: by }

  if (verdict.decision === 'keep') {
    await writeMark(supabase, mark, reconciled, decision('kept', { by, reason: verdict.reason, old_lego: { known_text: mark.reconciled_known_text, target_text: mark.reconciled_target_text }, lego: legoNow }))
    return { lego_id: mark.lego_id, outcome: 'kept', text: mark.text,
      message: `${id}: LEGO changed ("${mark.reconciled_known_text}" → "${lego.known_text}"); agent judged the human-authored wording still accurate and KEPT it unchanged. Reason: ${verdict.reason}` }
  }

  if (verdict.decision === 'rewrite') {
    const oldText = mark.text
    const updated = await writeMark(supabase, mark, { text: verdict.text, ...reconciled },
      decision('rewritten', { by, reason: verdict.reason, old_text: oldText, new_text: verdict.text, old_lego: { known_text: mark.reconciled_known_text, target_text: mark.reconciled_target_text }, lego: legoNow }))
    const prop = await propagateWording(supabase, course, updated, oldText)
    await queueAudioPass(supabase, { courseCode: course.course_code, requestedBy: by,
      reason: `human-authored presentation ${mark.lego_id} reworded to follow a LEGO edit — render the new words`,
      metadata: { lego_id: mark.lego_id, old_text: oldText, new_text: verdict.text } })
    return { lego_id: mark.lego_id, outcome: 'rewritten', text: verdict.text,
      message: `${id}: LEGO changed ("${mark.reconciled_known_text}" → "${lego.known_text}"); agent REWORDED the human-authored line to keep it accurate and applied it (${prop.updated} pending row(s) reworded, ${prop.inserted} queued; audio pass requested, nothing rendered). Was: "${oldText}" Now: "${verdict.text}" Reason: ${verdict.reason}` }
  }

  const flagId = await raiseEscalation(supabase, { course, mark, lego, seed, verdict, by })
  await writeMark(supabase, mark, { open_flag_id: flagId },
    decision('escalated', { by, reason: verdict.reason, flag_id: flagId, old_lego: { known_text: mark.reconciled_known_text, target_text: mark.reconciled_target_text }, lego: legoNow }))
  return { lego_id: mark.lego_id, outcome: 'escalated', text: mark.text,
    message: `${id}: LEGO changed ("${mark.reconciled_known_text}" → "${lego.known_text}") and the agent judged this may break the CONCEPT the human-authored line teaches — ESCALATED to Kai (course_qa_flags ${flagId}); wording left unchanged, nothing rendered. Reason: ${verdict.reason}` }
}

/**
 * Every marked line of a course, resolved: unchanged LEGOs keep their words,
 * changed LEGOs go through reconcileMark. Returns the marks (post-resolution),
 * one outcome per mark, and textFor(legoId) — the words any regeneration must
 * use for that LEGO. Cheap when a course has no marks (one SELECT).
 */
async function resolveForCourse(supabase, course, { judge = judgeMaintenance, dryRun = false, by = 'human-authored-presentations' } = {}) {
  const marks = await loadMarks(supabase, course.course_code)
  const outcomes = []
  if (!marks.size) return { marks, outcomes, textFor: () => null }

  const legoIds = [...marks.keys()]
  const { data: legos, error: legoErr } = await supabase
    .from('course_legos').select('lego_id, seed_number, known_text, target_text')
    .eq('course_code', course.course_code).in('lego_id', legoIds)
  if (legoErr) throw new Error(`could not read the LEGOs under the marked lines of ${course.course_code}: ${legoErr.message}`)
  const legoById = new Map((legos || []).map(l => [l.lego_id, l]))
  const seedNums = [...new Set((legos || []).map(l => l.seed_number).filter(n => n != null))]
  const seedByNum = new Map()
  if (seedNums.length) {
    const { data: seeds } = await supabase.from('course_seeds').select('seed_number, known_text, target_text')
      .eq('course_code', course.course_code).in('seed_number', seedNums)
    for (const s of (seeds || [])) seedByNum.set(s.seed_number, s)
  }

  for (const [legoId, mark] of marks) {
    const lego = legoById.get(legoId)
    let outcome
    if (!lego) {
      outcome = { lego_id: legoId, outcome: 'lego-missing', text: mark.text,
        message: `${course.course_code}/${legoId}: no LEGO with this id exists right now (mid-edit, or removed); the human-authored wording is kept in the mark and nothing was rendered or removed.` }
    } else if (legoUnchanged(mark, lego)) {
      outcome = { lego_id: legoId, outcome: 'kept-unchanged-lego', text: mark.text,
        message: `${course.course_code}/${legoId}: LEGO unchanged — human-authored wording kept (by ${mark.author}); the template was not applied.` }
    } else {
      outcome = await reconcileMark(supabase, { course, mark, lego, seed: seedByNum.get(lego.seed_number) || null, judge, dryRun, by })
      if (outcome.text !== mark.text) marks.set(legoId, { ...mark, text: outcome.text })
    }
    outcomes.push(outcome)
    logger.info(outcome.message)
  }
  return { marks, outcomes, textFor: (legoId) => (marks.has(legoId) ? marks.get(legoId).text : null) }
}

/**
 * For getAudioNeeds: the TTS items for marked LEGOs that have no rendered row
 * and no fresh pending row — the mark's words, never the template, never the
 * authoring judge. Also the plain-English report for every marked LEGO in scope.
 */
function markedNeeds({ marks, legos, course, legoIdsWithPresentation, freshPendingLegoIds }) {
  const toGenerate = []
  const report = []
  for (const lego of legos || []) {
    const mark = marks.get(lego.lego_id)
    if (!mark) continue
    const legoMoved = !legoUnchanged(mark, lego)
    const note = legoMoved
      ? ' NOTE: the LEGO has changed since this wording was last reconciled — /regenerate-presentations or a live /generate has an agent judge it before rendering.'
      : ''
    if (legoIdsWithPresentation.has(lego.lego_id)) {
      report.push({ lego_id: lego.lego_id, outcome: 'rendered', message: `${lego.lego_id}: human-authored line already rendered; nothing to do.${note}` })
    } else if (freshPendingLegoIds.has(lego.lego_id)) {
      report.push({ lego_id: lego.lego_id, outcome: 'queued', message: `${lego.lego_id}: human-authored wording kept, audio queued (pending row carries the words).${note}` })
    } else {
      toGenerate.push({ text: mark.text, language: course.known_lang, role: 'presentation', lego_id: lego.lego_id, voice_id: null, human_authored: true })
      report.push({ lego_id: lego.lego_id, outcome: 'queued', message: `${lego.lego_id}: no presentation row existed — human-authored wording re-queued for TTS from the mark (the template was not applied).${note}` })
    }
  }
  return { toGenerate, report }
}

module.exports = {
  TABLE, CHECK_TYPE, CHANGE_FILE, FEEDBACK_TYPE, JUDGE_MODEL,
  normaliseWords, sameWords, legoUnchanged, pendingRowIsFresh,
  loadMarks, loadMark, markHumanAuthored, recordWordingEdit,
  maintenancePrompt, parseJudgement, judgeMaintenance,
  reconcileMark, resolveForCourse, markedNeeds,
}
