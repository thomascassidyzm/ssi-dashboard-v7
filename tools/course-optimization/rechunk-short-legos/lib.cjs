// tools/course-optimization/rechunk-short-legos/lib.cjs
//
// The pure rules of the short-LEGO re-chunk (job #192, Tom 2026-10-12): "if LEGOS end up having no phrases,
// the split is wrong … chunk UP until we have a bigger LEGO which CAN then be introduced as an item, and CAN
// be practised effectively OR if that won't work for #reasons we need to RE-CHUNK the SEED."
//
// THE PROGRESS RULE (why the ops below have the shape they have). Learner position is stored as a LEGO id
// (course_enrollments.last_completed_lego_id, ceiling highest_completed_lego_id), and a LEGO id is GENERATED
// from (seed_number, lego_index) — it is positional inside its seed. The player resolves a stored id against
// the round map and, when the id no longer exists, lands on the first LEGO of the same seed
// (ssi-learning-app resolveResumeAnchor, Tom's 2026-08-31 ruling). Spaced review is recomputed from round
// numbers on every request (cycles.ts dueReviewRounds), so no per-learner review state names a LEGO index.
// Therefore:
//   - NEVER RENUMBER. Indices of surviving LEGOs never move, so every learner past the seed keeps the same id.
//   - NEVER REUSE an index that existed before: a learner whose cursor names a deleted LEGO must fall back to
//     the seed's start, not be credited with whatever new LEGO took the slot.
//   - A MERGE keeps the HIGHEST index of the run it replaces: a learner who completed that LEGO completed every
//     piece of the merged one; a learner on a lower, deleted piece replays the seed from its start.
//   - An IN-PLACE change ('set') keeps its id and so is the one op that could credit a learner with a LEGO
//     they never heard. cursorConflicts() names every enrollment sitting on such an id; apply refuses the seed.
'use strict'

const MAX_LEGO_SYLLABLES = 8

const norm = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[’‘]/g, "'").replace(/[.,!?;:"«»()¿¡]+/g, ' ').replace(/\s+/g, ' ').trim()
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
// Unspaced scripts (Chinese, Japanese) have no words to split on: the unit is the character, and the CJK
// punctuation (，。、？！：；「」…) is not one. Without this a whole sentence counts as ONE word and every
// containment / coverage check on zho and jpn is meaningless (job #321).
const words = (s) => {
  const n = norm(s)
  return CJK.test(n) ? [...n.replace(/[，。、？！：；「」『』…・\s]/gu, '')] : n.split(' ').filter(Boolean)
}
function multisetContains(hay, needle) {
  const have = new Map()
  for (const w of words(hay)) have.set(w, (have.get(w) || 0) + 1)
  for (const w of words(needle)) { const n = have.get(w) || 0; if (!n) return false; have.set(w, n - 1) }
  return true
}
const legoId = (seed, idx) => `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`

// The LEGO rows of a seed after an op. op = { delete:[idx], set:{idx:{type,known,target,components}},
// add:[{idx,type,known,target,components}], topup:[idx] }. Rows carry {idx, type, known, target, components,
// is_new, change:'keep'|'set'|'add'}.
function afterLegos(before, op) {
  const del = new Set(op.delete || [])
  const set = op.set || {}
  const out = []
  for (const l of before) {
    if (del.has(l.idx)) continue
    const s = set[l.idx]
    out.push(s ? { ...l, ...s, idx: l.idx, is_new: l.is_new, change: 'set' } : { ...l, change: 'keep' })
  }
  for (const a of op.add || []) out.push({ is_new: true, ...a, change: 'add' })
  return out.sort((a, b) => a.idx - b.idx)
}

// LEGOs whose phrase basket this op must (re)build: every changed or added LEGO, plus explicit top-ups.
function workLegos(before, op) {
  const ids = new Set([...Object.keys(op.set || {}).map(Number), ...(op.add || []).map((a) => a.idx), ...(op.topup || [])])
  return afterLegos(before, op).filter((l) => ids.has(l.idx))
}

// Every rule an op must satisfy before anything is written. estimateSyllables is injected (language-config).
function checkOp(seedRow, before, op, { estimateSyllables, courseCode } = {}) {
  const problems = []
  // op.seedTarget (job #329, Tom 2026-10-13): the seed's TARGET sentence is rewritten in the same op — used when the
  // seed says a form the course already teaches differently elsewhere (S42 'verlede nag' vs S234 'laas nag', ZUT). The
  // LEGOs are checked against the sentence as it will read, never the old one.
  if (op.seedTarget) seedRow = { ...seedRow, target_text: op.seedTarget }
  const beforeIdx = new Set(before.map((l) => l.idx))
  for (const i of op.delete || []) if (!beforeIdx.has(i)) problems.push(`delete L${i}: no such LEGO`)
  for (const i of Object.keys(op.set || {}).map(Number)) {
    if (!beforeIdx.has(i)) problems.push(`set L${i}: no such LEGO (an in-place change keeps an existing index)`)
    if ((op.delete || []).includes(i)) problems.push(`set L${i}: also deleted`)
  }
  for (const i of op.topup || []) if (!beforeIdx.has(i) || (op.delete || []).includes(i)) problems.push(`topup L${i}: no surviving LEGO`)
  for (const a of op.add || []) {
    if (beforeIdx.has(a.idx)) problems.push(`add L${a.idx}: index already used — never reuse an index (a cursor on the old LEGO would credit the new one)`)
    if (!(a.idx > 0 && a.idx < 100)) problems.push(`add L${a.idx}: index out of range`)
  }
  // A merge keeps the highest index of the pieces it replaces: every deleted index must be below some
  // surviving changed/added LEGO, or the deleted piece's content would be taught nowhere.
  const after = afterLegos(before, op)
  if (new Set(after.map((l) => l.idx)).size !== after.length) problems.push('duplicate index after the op')
  for (const l of after.filter((x) => x.change !== 'keep')) {
    const tag = `L${l.idx} "${l.known}" → "${l.target}"`
    if (!l.known || !l.target) { problems.push(`${tag}: empty side`); continue }
    if (!multisetContains(`${seedRow.known_text} ${before.map((b) => b.known).join(' ')}`, l.known)) problems.push(`${tag}: known side has words its seed does not say (L26)`)
    if (!multisetContains(seedRow.target_text, l.target)) problems.push(`${tag}: target side has words its seed does not say (L26)`)
    if (estimateSyllables) { const n = estimateSyllables(l.target, courseCode); if (n > MAX_LEGO_SYLLABLES) problems.push(`${tag}: ${n} syllables, cap ${MAX_LEGO_SYLLABLES} (L3)`) }
    if (l.type === 'M' && !(Array.isArray(l.components) && l.components.length >= 2)) problems.push(`${tag}: an M-LEGO carries components (L4)`)
    if (l.type === 'A' && words(l.target).length !== 1) problems.push(`${tag}: an A-LEGO is one word (L4)`)
    if (/[()\/]/.test(l.known) || /[()\/]/.test(l.target)) problems.push(`${tag}: no parentheses or slashes (K11, L19)`)
  }
  // Coverage never shrinks: every seed word a LEGO covered before is still covered by some LEGO after.
  const covered = (ls) => { const s = new Set(); for (const l of ls) for (const w of words(l.target)) s.add(w); return s }
  const was = covered(before), now = covered(after)
  for (const w of was) if (!now.has(w)) problems.push(`coverage: "${w}" was taught by a LEGO of this seed and no longer is (S3/L27)`)
  return problems
}

// Enrollments whose stored position names a LEGO this op changes IN PLACE. cursors: [{learner_id,
// last_completed_lego_id, highest_completed_lego_id}]. Deleted ids are safe (seed fallback); added
// indices were never used, so nothing can name them.
function cursorConflicts(seed, op, cursors) {
  const ids = new Set(Object.keys(op.set || {}).map((i) => legoId(seed, Number(i))))
  return cursors.filter((c) => ids.has(c.last_completed_lego_id) || ids.has(c.highest_completed_lego_id))
}

// Deterministic phrase ids for new rows: {course}:S{NNNN}L{NN}{B|U|C}{NN}, continuing after the highest number
// any row of that LEGO and role has EVER had in this seed's ledger snapshot — so an id is never re-issued.
function allocateIds(course, seed, idx, role, n, existingIds) {
  const R = { build: 'B', use: 'U', component: 'C' }[role]
  const prefix = `${course}:${legoId(seed, idx)}${R}`
  let max = 0
  for (const id of existingIds) if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0)
  return Array.from({ length: n }, (_, i) => `${prefix}${String(max + 1 + i).padStart(2, '0')}`)
}

// A row read back for undo is re-inserted value by value. A json/jsonb column holds JSON even when the value
// is an array (course_legos.components); a text[] column (connected_lego_ids) takes a Postgres array.
function sqlValue(isJsonColumn, v) {
  return v !== null && v !== undefined && isJsonColumn ? JSON.stringify(v) : v
}


// ── undo safety (lane review #338) ────────────────────────────────────────────────────────────────
// The ledger is append-only. An apply writes its attempt line (full before-state, an attemptId) BEFORE the transaction;
// the outcome is a separate line: {action:'committed', attemptId, afterDigest} after COMMIT, or {action:'rolled-back',
// attemptId} on failure. Undo restores only an attempt with a committed outcome (an attempt with no outcome crashed
// mid-flight and is never restored). Legacy lines (before attemptIds): an unmarked attempt counts as committed and a
// bare rolled-back marker cancels the attempt just before it for that seed.
function undoableAttempts(lines) {
  const out = new Map()   // seed -> attempt line carrying { committed: true, afterDigest? }
  const pending = new Map()   // attemptId -> attempt line
  for (const l of lines) {
    if (l.action === 'undone') { out.delete(l.seed); continue }
    if (l.action === 'committed') { const a = pending.get(l.attemptId); if (a) out.set(a.seed, { ...a, afterDigest: l.afterDigest || a.afterDigest }); continue }
    if (l.action === 'sealed') { const a = out.get(l.seed); if (a && !a.afterDigest) out.set(l.seed, { ...a, afterDigest: l.afterDigest, sealed: true }); continue }
    if (l.action === 'rolled-back') {
      if (l.attemptId) pending.delete(l.attemptId)
      else out.delete(l.seed)   // legacy marker
      continue
    }
    if (l.before) { if (l.attemptId) pending.set(l.attemptId, l); else out.set(l.seed, l) }
  }
  return out
}

// What a seed holds that undo would overwrite, minus what is not content: audio pointers (fill-audio writes them after an
// apply), timestamps, the edit-event stamp and the seed's version counter. A later edit to any phrase/LEGO/intro row changes it.
const VOLATILE = (k) => /_audio_id$/.test(k) || /_duration_ms$/.test(k) || ['updated_at', 'last_edit_event_id', 'version', 'audio_uuid', 'duration_ms'].includes(k)
// lego_introductions are NOT in the digest: apply drops them and fill-audio mirrors them back (audio, not content), so
// counting them made undo refuse after fill-audio. Undo still restores them from the ledger's before-state.
function stateDigest({ seed, legos, phrases, intros }, { withIntros = false } = {}) {
  const strip = (r) => { const o = {}; for (const k of Object.keys(r).sort()) if (!VOLATILE(k)) o[k] = r[k]; return o }
  const by = (f) => (a, b) => String(f(a)).localeCompare(String(f(b)))
  const payload = JSON.stringify({ seed: strip(seed || {}), legos: [...legos].map(strip).sort(by((r) => r.lego_index)),
    phrases: [...phrases].map(strip).sort(by((r) => r.id)),
    ...(withIntros ? { intros: [...(intros || [])].map(strip).sort(by((r) => r.lego_id)) } : {}) })
  return require('crypto').createHash('sha256').update(payload).digest('hex')
}
// null = no drift; 'legacy' = the ledger line recorded no post-state; otherwise the reason to refuse.
function driftProblem(attempt, liveState) {
  if (!attempt.afterDigest) return 'legacy'
  // ledger lines written before the intro exclusion carry a digest that includes intros: still honoured, in their old strict form
  return (stateDigest(liveState) === attempt.afterDigest || stateDigest(liveState, { withIntros: true }) === attempt.afterDigest) ? null : 'drift: a row this undo would overwrite changed after the re-chunk (newer edit); not overwriting newer work'
}

module.exports = { undoableAttempts, stateDigest, driftProblem, sqlValue, MAX_LEGO_SYLLABLES, norm, words, multisetContains, legoId, afterLegos, workLegos, checkOp, cursorConflicts, allocateIds }
