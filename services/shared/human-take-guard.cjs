/**
 * HUMAN TAKE GUARD — Tom's HARD RULE, 2026-10-13 (r-2026-10-13-hard-rule-a-human-recorded-clip):
 *
 *   A human-recorded clip is NEVER replaced automatically by a cloned or synthetic voice, in any course.
 *
 * WHY IT EXISTS. Several repoint passes in October (#813, #836, #364, #589, voice-audit) moved slot pointers onto
 * synthetic clips without asking what the slot held before. The voice policy (resolve-voice.cjs) only asks "is the NEW
 * clip the right voice?"; where it has no ruling (Welsh, any human course) it said yes, and a human take was replaced.
 * The question that was never asked is the OTHER half: "what is being replaced?"
 *
 * THE RULE. A slot whose CURRENT clip is a human take may only be repointed to another human take (a re-take). Pointing
 * it at anything synthetic is refused unless the caller passes an explicit Tom-approval token (`tomApproval`, shaped
 * `tom:YYYY-MM-DD:<what he approved>` — a bare `true`/"yes" does not count, the token must name the day and the thing).
 *
 * HUMAN is identified from the CLIP ROW, not from the course: origin = 'human', or a voice id that begins `human_`
 * (Welsh legacy takes are origin 'legacy_import' / voice `human_aran_cym_n`, and 130 rows are mislabelled origin 'tts' with a
 * human voice id — the voice id catches them). Anything else is synthetic.
 *
 * FAILS CLOSED: if the current pointer or the new clip cannot be read, the write is refused — not knowing is not permission.
 * A null pointer (an unlink) and a ledgered RESTORE (an undo putting back a before-state) are not "choosing a synthetic voice"
 * and pass; both are the caller's explicit, already-logged acts.
 *
 * ENFORCED AT: resolve-voice.cjs assertPointer / mayPoint / setSlotPointer (which every pointer-writing audio tool already
 * calls — tools/audio/pointer-writers-guarded.test.cjs fails a tool that writes *_audio_id without them), and directly
 * by the phase-8 linkers and the other writers listed in that test's HUMAN_GUARD_CALLERS.
 */

// Kai may authorise any audio work up to the daily cap (Tom 2026-10-30, r-2026-10-30-kai-can-authorise-any-audio-work), so his
// `kai:YYYY-MM-DD:<reason>` is a grant like Tom's. It is a bare string: nothing proves who typed it (see approverOf; the log names the approver).
const APPROVAL_TOKEN = /^(tom|kai):\d{4}-\d{2}-\d{2}:\S.{6,}$/

/** Who a valid approval token speaks for: 'tom' | 'kai' | null. */
function approverOf(token) {
  const m = typeof token === 'string' && APPROVAL_TOKEN.test(token) ? /^(tom|kai):/.exec(token) : null
  return m ? m[1] : null
}

/**
 * The string for the DB trigger's approval setting (popty.tom_human_take_approval) for a valid approval token, or null.
 * The trigger (refuse_human_take_replacement) matches only `^tom:`; migrations need Tom's go, so Kai's grant
 * (r-2026-10-30-kai-can-authorise-any-audio-work) is carried as `tom:<date>:kai-authorised: <reason>` — the real
 * approver stays readable in the trigger's own NOTICE. Throws on a malformed token: BAD_APPROVAL, the render route's style.
 */
function triggerApprovalFor(token) {
  if (token == null || token === '') return null
  const who = approverOf(token)
  if (!who) { const e = new Error('approval must look like kai:YYYY-MM-DD:<reason> (or tom:YYYY-MM-DD:<reason>)'); e.status = 400; e.code = 'BAD_APPROVAL'; throw e }
  if (who === 'tom') return token
  const m = /^kai:(\d{4}-\d{2}-\d{2}):(.*)$/.exec(token)
  return `tom:${m[1]}:kai-authorised: ${m[2]}`
}

/** Is this course_audio row a human recording? */
function isHumanClip(clip) {
  if (!clip) return false
  if (String(clip.origin || '').toLowerCase() === 'human') return true
  return /^human_/i.test(String(clip.voice_id || clip.voiceId || ''))
}

/** The approval token the caller passed, or the process-wide one an operator exported for a Tom-approved run. */
function approvalOf(tomApproval) {
  const t = tomApproval !== undefined ? tomApproval : process.env.TOM_HUMAN_TAKE_APPROVAL
  return typeof t === 'string' && APPROVAL_TOKEN.test(t) ? t : null
}

class HumanTakeRefusal extends Error {
  constructor(message, reason) { super(message); this.name = 'HumanTakeRefusal'; this.code = 'HUMAN_TAKE'; this.status = 403; this.reason = reason }
}

/**
 * Pure decision. `current` = the clip the slot points at now (null/undefined = empty), `next` = the clip it would point at.
 * @returns {{ok:boolean, reason?:string, message?:string, approvedBy?:string}}
 */
function checkReplacement({ current, next, tomApproval } = {}) {
  if (!current) return { ok: true }
  if (!isHumanClip(current)) return { ok: true }
  if (!next) return { ok: false, reason: 'next-clip-unreadable', message: `slot holds human take ${current.id}; the clip it would be pointed at could not be read — refusing (not knowing is not permission)` }
  if (isHumanClip(next)) return { ok: true }
  const approvedBy = approvalOf(tomApproval)
  if (approvedBy) return { ok: true, approvedBy }
  return {
    ok: false, reason: 'human-take-protected',
    message: `slot holds a HUMAN take (${current.id}, voice ${current.voice_id}); clip ${next.id} is synthetic (${next.voice_id}). A human take is never replaced by a synthetic voice `
      + `(Tom's HARD RULE 2026-10-13) — pass tomApproval 'tom:YYYY-MM-DD:<what he approved>' (or Kai's 'kai:YYYY-MM-DD:<reason>') only with that explicit go.`,
  }
}

async function readClip(db, id) {
  const { data, error } = await db.from('course_audio').select('id, voice_id, language, origin').eq('id', id).maybeSingle()
  if (error) throw new HumanTakeRefusal(`human-take guard: cannot read clip ${id} (${error.message})`, 'clip-unreadable')
  return data || null
}

/**
 * Throws HumanTakeRefusal unless `to` may replace what slot (`tbl`,`key`).`col` points at now.
 * `from` (the caller's already-read current clip id) skips the slot read; either `from` or `tbl`+`key` must identify the slot.
 */
async function assertNotReplacingHuman(db, { tbl, key, match, col, from, to, tomApproval, restore = false } = {}) {
  if (restore || to == null) return
  let currentIds
  if (from !== undefined) currentIds = [from]
  else if (tbl && col && match && Object.keys(match).length) {
    // a writer that addresses its rows by (course_code, seed_number, lego_index …) rather than by id: check every row it would touch
    let q = db.from(tbl).select(col)
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
    const { data, error } = await q
    if (error) throw new HumanTakeRefusal(`human-take guard: cannot read ${tbl}.${col} (${error.message})`, 'slot-unreadable')
    currentIds = (data || []).map((r) => r[col])
  } else {
    if (!tbl || key == null || !col) throw new HumanTakeRefusal(`human-take guard: cannot tell which slot ${col || '(unnamed)'} is being repointed — pass tbl+key, tbl+match or from, refusing`, 'slot-unidentified')
    const { data, error } = await db.from(tbl).select(col).eq('id', key).maybeSingle()
    if (error) throw new HumanTakeRefusal(`human-take guard: cannot read ${tbl}.${col}#${key} (${error.message})`, 'slot-unreadable')
    currentIds = [data ? data[col] : null]
  }
  let next = null
  for (const currentId of [...new Set(currentIds.filter((c) => c != null).map(String))]) {
    if (currentId === String(to)) continue
    const current = await readClip(db, currentId)
    next = next || await readClip(db, to)
    const v = checkReplacement({ current, next, tomApproval })
    if (!v.ok) throw new HumanTakeRefusal(v.message, v.reason)
    if (v.approvedBy) console.log(`HUMAN TAKE REPLACED under ${approverOf(v.approvedBy) === 'kai' ? "Kai's" : "Tom's"} approval (${v.approvedBy}): ${tbl || ''}#${key ?? JSON.stringify(match)} ${col} ${currentId} -> ${to}`)
  }
}

/** Boolean form for a loop that skips a refused slot: true = go ahead, false = refused (one line to `log`). */
async function mayReplace(db, args, log = console.log) {
  try { await assertNotReplacingHuman(db, args); return true } catch (e) {
    if (e.code !== 'HUMAN_TAKE') throw e
    log(`REFUSED by human-take guard (${e.reason}): ${e.message}`); return false
  }
}

module.exports = { isHumanClip, checkReplacement, assertNotReplacingHuman, mayReplace, HumanTakeRefusal, APPROVAL_TOKEN, approverOf, triggerApprovalFor }
