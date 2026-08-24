/**
 * variant-run.cjs — THE VARIANT-DRILL VOICE RULE, in one place.
 *
 * THE RULING (Tom, 2026-08-24, the Italian Pod 1 recast thread), verbatim:
 *
 *   "It makes sense in the context of the extra phrases for the same voice to
 *    give alternative responses etc."
 *
 * and, when told it had been written down as doctrine:
 *
 *   "That's just common sense though. Should just be what happens in casting,
 *    right?"
 *
 * This module is that "should just be what happens". Nothing else on the estate
 * may reimplement the rule — the same discipline pod-cast-gate.cjs states for
 * itself ("This module is the ONE place that measures it, so the flip path and
 * the recast path cannot drift apart") applies here for exactly the same reason:
 * a per-LINE exception that two tools disagree about is worse than none.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE RULE IS, IN PROSE
 *
 * The pod-1 "extra phrases" scenes are DRILLS, not dialogue. They contain
 * VARIANT SETS: two or three ways of asking the same thing, or two competing
 * answers to the same question, put next to each other so the learner hears the
 * shape more than once. On one voice that reads as a list, which is what it is.
 *
 * Give a variant set to a SECOND character and the pod contradicts itself. The
 * live Italian scene 21, before Tom's rollback:
 *
 *     Learner:  Is there a toilet here?
 *     Voice B:  It's down there on the left.
 *     Voice B:  It's down there on the right.
 *     Learner:  Can you say that again?
 *     Voice B:  Yes, I said it's over there.
 *
 * One person, three incompatible directions, the last one matching neither.
 *
 * So: a line earns the SECOND voice only when it is a genuine, single,
 * uncontested answer to a real question. Everything inside a variant run stays
 * on the one voice.
 *
 * ---------------------------------------------------------------------------
 * HOW THAT IS OPERATIONALISED HERE — and why it is NOT "has a paraphrase
 * sibling somewhere in the scene"
 *
 * Italian 17.2 ("Do you want to pay by cash or card or put it on the room?")
 * KEEPS the second voice even though 17.4 and 17.5 are rephrasings of it,
 * because 17.3 — the learner answering it — sits in between. 17.2 is a real
 * exchange; 17.4/17.5 are the desk asking again after it was already answered.
 * The load-bearing property is therefore an UNANSWERED REPETITION, not a
 * paraphrase relationship at a distance.
 *
 * A pair of rows is a VARIANT LINK when all four hold:
 *
 *   1. ADJACENT in script order — nothing at all between them. Any intervening
 *      turn is the answer that makes the earlier line a real exchange.
 *   2. SAME SCENE. A run never crosses a scene boundary.
 *   3. SAME SPEAKER (canonical, paren groups stripped, case-insensitive). Two
 *      different characters saying similar things is a conversation.
 *   4. The two known-side texts are REPHRASINGS OF THE SAME BEAT — measured as
 *      a Dice coefficient over lightly-stemmed content tokens, at or above
 *      SIMILARITY_FLOOR.
 *
 * Variant links chain: 21.11↔21.12 and 21.12↔21.13 make one run of three.
 * A run is any maximal chain of 2 or more rows. Every row in a run is
 * VARIANT-LOCKED. A row in no run is second-voice-eligible.
 *
 * WHY CONDITIONS 1-3 ALONE ARE NOT ENOUGH, measured rather than assumed. Run
 * length on its own flags the wrong things: on live ita_for_eng:pod-1 there are
 * eleven maximal same-speaker non-Learner runs of length 2+, and only three of
 * them are Tom's. The other eight are ordinary drama — the Barista saying "No,
 * we've only got drinks." and then "Yes, would you like the menu?"; the Waiter
 * welcoming you and then asking about water. A character taking two turns is
 * drama, not a casting fault (pod-script-view.cjs makes the same point).
 *
 * WHY CONDITION 4 USES THE KNOWN (ENGLISH) SIDE, said out loud. Similarity is
 * a text measure, and the target track is 22 different languages. The known
 * track of every live `<course>:pod-1` is ENGLISH — all 22 are `*_for_eng` —
 * and the eleven reattributed lines were matched fleet-wide by known-side text
 * in the first place (reattribute-pod1-speakers.cjs). So judging on the known
 * side is what makes ONE verdict correct for all 22 courses at once. Conditions
 * 1-3, which do most of the work, are purely structural and language-blind.
 *
 * THE MEASURED MARGIN, on live ita_for_eng:pod-1, all adjacent same-scene
 * same-speaker pairs:
 *
 *     Tom's seven locked lines        0.67 … 0.83   (lowest: 17.4→17.5, 0.67)
 *     genuine non-Learner continuation 0.00 … 0.14   (highest: Local 13.4→13.5)
 *
 * A gap of 0.53 with nothing in it. SIMILARITY_FLOOR is set at 0.50 — below the
 * midpoint on purpose, because the two errors do not cost the same. A false
 * positive costs a missed improvement: a line stays on the single voice it has
 * had for two years, and can be freed later for nothing. A false negative ships
 * a character contradicting itself to learners. Tom's own framing is "if in
 * doubt, cut it out"; here, single-voice IS the cut.
 *
 * UNDECIDABLE PAIRS lock too. If an adjacent same-scene same-speaker pair has no
 * known-side text on one side, similarity cannot be computed and the pair is
 * treated as a variant link, flagged `undecidable: true` so a caller can report
 * it separately. Same reasoning: locking is the free direction.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT SAY. It has no opinion about how much
 * a pod should alternate, about Narrator drill tails, or about scenes that are
 * entirely learner practice. Italian scenes 18 and 19 are ten consecutive
 * Learner lines by design — Aran's chunk ruling of 2026-08-06 — and produce
 * ZERO flags here, because a run being on one voice is the CORRECT state, not a
 * defect. This module reports which rows must stay single-voiced; it never
 * reports a single-voiced run as a fault.
 *
 * PURE. Rows in, verdicts out. No DB, no env, no I/O, no network.
 */

'use strict'

const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')

/**
 * Dice floor at or above which two adjacent same-speaker lines are rephrasings
 * of one beat. See "THE MEASURED MARGIN" above before changing this number.
 */
const SIMILARITY_FLOOR = 0.5

/**
 * Light English stemming, applied only to pure-ASCII tokens so that a non-Latin
 * known side degrades to plain token overlap rather than to nonsense.
 * "drinks"/"drink" and "wanted"/"want" have to collide for 21.12↔21.13 to link.
 */
function stem (w) {
  if (!/^[a-z0-9']+$/.test(w)) return w
  if (w.length <= 3) return w
  return w
    .replace(/ies$/, 'y')
    .replace(/(ing|ed|es|s)$/, '')
}

/** Unicode-aware tokenisation: keep letters, marks and digits in every script. */
function tokens (text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stem)
}

/**
 * Sørensen–Dice over the two token SETS. Set rather than multiset so that a
 * repeated filler word cannot inflate the score, and symmetric so run direction
 * never matters.
 *
 * @returns {number} 0 … 1, or null when either side has no tokens at all.
 */
function knownSimilarity (a, b) {
  const A = new Set(tokens(a))
  const B = new Set(tokens(b))
  if (!A.size || !B.size) return null
  let shared = 0
  for (const t of A) if (B.has(t)) shared++
  return (2 * shared) / (A.size + B.size)
}

const speakerKey = (s) => canonicalSpeakerName(s).toLowerCase()
const label = (r) => `${r.scene_number}.${r.sentence_number}`
const quote = (t) => JSON.stringify(String(t == null ? '' : t).trim())

/**
 * Are these two rows, in this order and adjacent in the script, a variant link?
 *
 * @returns {{linked:boolean, similarity:number|null, undecidable:boolean}}
 */
function variantLink (prev, cur) {
  const no = { linked: false, similarity: null, undecidable: false }
  if (!prev || !cur) return no
  if (prev.scene_number !== cur.scene_number) return no
  if (speakerKey(prev.speaker) !== speakerKey(cur.speaker)) return no
  const sim = knownSimilarity(prev.known_text, cur.known_text)
  if (sim === null) return { linked: true, similarity: null, undecidable: true }
  return { linked: sim >= SIMILARITY_FLOOR, similarity: sim, undecidable: false }
}

/**
 * Annotate a pod's rows with the variant-drill rule.
 *
 * @param {Array<object>} rows  the pod's sentence rows IN SCRIPT ORDER. Each
 *   needs `scene_number`, `sentence_number`, `speaker`, `known_text`; `id` is
 *   carried through when present. Rows are never re-sorted — script order is
 *   the caller's to establish, because "adjacent" is the whole rule.
 * @param {object} [opts]
 * @param {number} [opts.similarityFloor=SIMILARITY_FLOOR]
 * @returns {{
 *   rows: Array<{row:object, id:*, label:string, scene:*, sentence:*, speaker:string,
 *                variantLocked:boolean, runId:string|null, reason:string|null,
 *                undecidable:boolean}>,
 *   runs: Array<{runId:string, scene:*, speaker:string, labels:string[], ids:*[],
 *                rows:object[], similarities:Array<number|null>, undecidable:boolean,
 *                reason:string}>,
 *   lockedIds: Set<*>,
 *   lockedLabels: Set<string>
 * }}
 */
function annotateVariantRuns (rows, opts = {}) {
  const floor = typeof opts.similarityFloor === 'number' ? opts.similarityFloor : SIMILARITY_FLOOR
  const list = Array.isArray(rows) ? rows : []

  // 1. chain adjacent variant links into maximal runs
  const runs = []
  let current = null
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1]
    const cur = list[i]
    const link = variantLink(prev, cur)
    const linked = link.undecidable ? true : (link.similarity !== null && link.similarity >= floor)
    if (!linked) { current = null; continue }
    if (!current) {
      current = { rows: [prev, cur], similarities: [link.similarity], undecidable: link.undecidable }
      runs.push(current)
    } else {
      current.rows.push(cur)
      current.similarities.push(link.similarity)
      current.undecidable = current.undecidable || link.undecidable
    }
  }

  // 2. name each run and write its human reason
  const byRow = new Map()
  const out = []
  for (const run of runs) {
    const first = run.rows[0]
    const last = run.rows[run.rows.length - 1]
    const speaker = canonicalSpeakerName(first.speaker)
    run.runId = `s${first.scene_number}/${first.sentence_number}-${last.sentence_number}`
    run.scene = first.scene_number
    run.speaker = speaker
    run.labels = run.rows.map(label)
    run.ids = run.rows.map((r) => r.id)
    run.reason = run.undecidable
      ? `${run.rows.length} adjacent ${speaker} lines at ${run.labels.join(', ')} cannot be compared ` +
        '(no known-side text) — locked to one voice by the safe default'
      : `${run.rows.length} consecutive ${speaker} lines at ${run.labels.join(', ')} rephrase the same beat ` +
        `with nobody answering between them — ${run.rows.map((r) => quote(r.known_text)).join(' then ')}. ` +
        'A second voice here makes the speaker contradict themselves, so this run stays on ONE voice ' +
        "(Tom's variant-drill ruling, 2026-08-24)."
    for (const r of run.rows) byRow.set(r, run)
    out.push(run)
  }

  // 3. per-row verdicts, in input order
  const annotated = list.map((r) => {
    const run = byRow.get(r) || null
    return {
      row: r,
      id: r.id,
      label: label(r),
      scene: r.scene_number,
      sentence: r.sentence_number,
      speaker: canonicalSpeakerName(r.speaker),
      variantLocked: Boolean(run),
      runId: run ? run.runId : null,
      reason: run ? run.reason : null,
      undecidable: Boolean(run && run.undecidable),
    }
  })

  return {
    rows: annotated,
    runs: out,
    lockedIds: new Set(annotated.filter((a) => a.variantLocked && a.id != null).map((a) => a.id)),
    lockedLabels: new Set(annotated.filter((a) => a.variantLocked).map((a) => a.label)),
  }
}

/**
 * Is this row allowed to carry the SECOND voice? The rule stated the way the
 * casting and re-render paths need to ask it.
 */
function isSecondVoiceEligible (rowVerdict) {
  return !rowVerdict.variantLocked
}

/**
 * Release-gate view: which variant runs are currently SPLIT ACROSS TWO VOICES?
 *
 * This is the defect nothing caught. It is NOT an off-cast clip — both voices
 * are legitimately in the pod's cast, which is exactly why checkPodCast went
 * green on ita_for_eng:pod-1 while eleven lines read as nonsense. A run that is
 * wholly on one voice is the CORRECT state and is never reported.
 *
 * @param {Array<object>} rows  script-order sentence rows (as above)
 * @param {(row:object) => (string|null)} voiceOf  bare voice id for the row's
 *   track, or null when it cannot be resolved (unresolvable rows are ignored
 *   rather than guessed at).
 * @returns {Array<{runId:string, scene:*, speaker:string, labels:string[],
 *                  voices:string[], byVoice:object, reason:string}>}
 */
function splitVariantRuns (rows, voiceOf) {
  const { runs } = annotateVariantRuns(rows)
  const split = []
  for (const run of runs) {
    const byVoice = {}
    for (const r of run.rows) {
      const v = voiceOf(r)
      if (!v) continue
      ;(byVoice[v] = byVoice[v] || []).push(label(r))
    }
    const voices = Object.keys(byVoice)
    if (voices.length < 2) continue
    split.push({
      runId: run.runId,
      scene: run.scene,
      speaker: run.speaker,
      labels: run.labels,
      voices,
      byVoice,
      reason: run.reason,
    })
  }
  return split
}

module.exports = {
  SIMILARITY_FLOOR,
  tokens,
  knownSimilarity,
  variantLink,
  annotateVariantRuns,
  isSecondVoiceEligible,
  splitVariantRuns,
}
