/**
 * POD TEXT SWAPS, MAKE-BEFORE-BREAK — a pod line whose words are to change, swapped only once the new take exists
 * (Aran, 2026-10-29, job #551: "put the two Siân lines in my booth now, and swap them into the pods only once I have
 * recorded them", so live North never loses audio).
 *
 * A swap names one pod row, one side, the words it has now (`from`) and the words it is to have (`to`), and the voice
 * that must read them. While the row still says `from`, the swap is PENDING:
 *   - the pod keeps its words AND its audio, untouched, so learners hear exactly what they heard before;
 *   - the booth offers the `to` words to that voice — Welsh as a "Pod 1 · new words" line (wire kind 'podswap',
 *     line id `podswap:<sentenceId>`), English on the Pod 1 English card (pod-english-lines reads a pending row's
 *     `to` words, so North's line collapses with South's, which already says Siân).
 * When a take of the `to` words by that voice is filed, the swap is APPLIED by ONE conditional UPDATE per row —
 * `{side}_text = to, {side}_audio_id = <the new take>` WHERE id = row AND `{side}_text = from` — so the words and the
 * audio change in the same statement: there is no moment at which the row has new words and no audio, or old audio
 * under new words. A row that no longer says `from` (somebody already changed it) is left alone and reported, never
 * forced. Nothing is deleted: the old clip keeps its row and its file, just no longer linked from this slot.
 *
 * The applying is recordist-queue applyPodTextSwaps (called from fillSameWordsSlots, i.e. after every booth take of
 * these words is filed) and the admin fallback POST /api/admin/pod-text-swaps. This file is pure: no I/O.
 *
 * LEARNER PROGRESS IS NOT TOUCHED. Progress is filed under the row's slot, and a name change is the same line — the
 * standing rule for booth edits (Tom, 2026-09-12: "the sense of the line will be the same. So I think we keep learner
 * progress"; recordist-router PATCH …/text).
 *
 * The Speaker label 'Sarah' on 13 lines per pod is a cast name, not words anyone says to her — it is NOT a swap.
 */
'use strict'

const { spokenWordsKey } = require('../shared/spoken-words.cjs')

const POD_SWAP_PREFIX = 'podswap:'
const TEXT_COL = { target: 'target_text', known: 'known_text' }
const AUDIO_COL = { target: 'target_audio_id', known: 'known_audio_id' }

const ARAN_CYM = 'human_aran_cym_n' // his Welsh policy voice; human_aran_cym_s (South's cast) is an alias of it
const ARAN_ENG = 'human_aran_eng'
const SIAN_RULING = 'Aran 2026-10-29 (job #551): the Neighbour greets Siân, not Sarah'

/**
 * The swaps. North (cym_n_for_eng:pod-1, LIVE) says Sarah on both sides; South (cym_s_for_eng:pod-1, HELD) says Siân
 * in English already and Sarah in Welsh. Each pod keeps its own pause-marker form ("…" in North's English).
 */
const POD_TEXT_SWAPS = Object.freeze([
  { sentenceId: 'cym_n_for_eng:pod-1:SC01-S001', side: 'target', voiceId: ARAN_CYM, from: 'Bore da, Sarah!', to: 'Bore da, Siân!' },
  { sentenceId: 'cym_s_for_eng:pod-1:SC01-S001', side: 'target', voiceId: ARAN_CYM, from: 'Bore da, Sarah!', to: 'Bore da, Siân!' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC01-S001', side: 'known', voiceId: ARAN_ENG, from: 'Good morning, Sarah!', to: 'Good morning, Siân!' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC05-S001', side: 'target', voiceId: ARAN_CYM, from: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', to: 'Noswaith dda, Siân. Gest ti ddiwrnod hir?' },
  { sentenceId: 'cym_s_for_eng:pod-1:SC05-S001', side: 'target', voiceId: ARAN_CYM, from: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', to: 'Noswaith dda, Siân. Gest ti ddiwrnod hir?' },
  { sentenceId: 'cym_n_for_eng:pod-1:SC05-S001', side: 'known', voiceId: ARAN_ENG, from: 'Good evening, Sarah. … Did you have a long day?', to: 'Good evening, Siân. … Did you have a long day?' },
].map((s) => Object.freeze({ ...s, ruling: SIAN_RULING })))

const courseOfSentence = (sentenceId) => String(sentenceId).split(':')[0]
const podOfSentence = (sentenceId) => String(sentenceId).split(':').slice(0, 2).join(':')
const trimmed = (t) => String(t == null ? '' : t).trim()

/** The swaps that touch these sentence ids (all of them by default). */
function swapSentenceIds(swaps = POD_TEXT_SWAPS) { return [...new Set(swaps.map((s) => s.sentenceId))] }

/** Is this voice the one a swap asks for? Spellings are the recordist's own voice id and its aliases. */
function isSwapVoice(swap, spellings) { return (spellings || []).includes(swap.voiceId) }

/**
 * Where a swap stands against the row as read now:
 *   'pending' — the row still says `from`: offer the `to` words, keep the pod as it is;
 *   'applied' — the row says `to` (spoken words): done;
 *   'drifted' — the row says something else: leave it, say so.
 */
function swapState(swap, row) {
  const now = trimmed(row && row[TEXT_COL[swap.side]])
  if (now === trimmed(swap.from)) return 'pending'
  if (spokenWordsKey(now) === spokenWordsKey(swap.to)) return 'applied'
  return 'drifted'
}

/** A sentence row with each PENDING swap's `to` words in place of its `from` words — what the booth shows. */
function withPendingText(row, swaps = POD_TEXT_SWAPS) {
  if (!row) return row
  let out = row
  for (const s of swaps) {
    if (s.sentenceId !== row.id || swapState(s, row) !== 'pending') continue
    out = { ...out, [TEXT_COL[s.side]]: s.to }
  }
  return out
}

/**
 * The swaps a filed take applies: pending, this voice's, this side, the take's spoken words.
 * @param {object} args {spellings, side: 'target'|'known', text, rowsById: Map(sentenceId → row)}
 */
function swapsForTake({ spellings, side, text, rowsById }, swaps = POD_TEXT_SWAPS) {
  const key = spokenWordsKey(text)
  if (!key) return []
  return swaps.filter((s) => s.side === side && isSwapVoice(s, spellings) && spokenWordsKey(s.to) === key &&
    rowsById.has(s.sentenceId) && swapState(s, rowsById.get(s.sentenceId)) === 'pending')
}

/** The one UPDATE that applies a swap: new words and the new take together, only while the row still says `from`. */
function swapWrite(swap, audioId) {
  return {
    id: swap.sentenceId,
    set: { [TEXT_COL[swap.side]]: swap.to, [AUDIO_COL[swap.side]]: audioId },
    where: { [TEXT_COL[swap.side]]: swap.from },
  }
}

function podSwapLineId(sentenceId) { return `${POD_SWAP_PREFIX}${sentenceId}` }

/** `podswap:<sentenceId>` → {sentenceId}; null for anything else. A sentence id carries colons of its own. */
function parsePodSwapLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(POD_SWAP_PREFIX)) return null
  const sentenceId = raw.slice(POD_SWAP_PREFIX.length)
  return sentenceId ? { sentenceId } : null
}

/**
 * This recordist's pending TARGET swaps as booth lines, one per spoken words (North and South Welsh are the same
 * words, so one take serves both: the line keeps North's place and South rides in duplicateOf). English swaps are not
 * lines here — they are on the Pod 1 English card (pod-english-lines withPendingText).
 *
 * @param {object} recordist {voiceId, spellings}
 * @param {object} input {rows: listening_pod_sentences rows {id, pod_id, global_order, speaker, target_text, known_text}, pods: {id, slug, title}[]}
 */
function podSwapLinesFor(recordist, { rows = [], pods = [] } = {}, swaps = POD_TEXT_SWAPS) {
  const spellings = recordist.spellings || [recordist.voiceId]
  const rowsById = new Map(rows.map((r) => [r.id, r]))
  const podById = new Map(pods.map((p) => [p.id, p]))
  const seen = new Map()
  const out = []
  for (const s of swaps) {
    if (s.side !== 'target' || !isSwapVoice(s, spellings)) continue
    const row = rowsById.get(s.sentenceId)
    if (!row || swapState(s, row) !== 'pending') continue
    const key = spokenWordsKey(s.to)
    if (seen.has(key)) {
      seen.get(key).duplicateOf.push({ sentenceId: s.sentenceId, courseCode: courseOfSentence(s.sentenceId) })
      continue
    }
    const shown = withPendingText(row, swaps)
    const pod = podById.get(row.pod_id) || {}
    const line = {
      id: podSwapLineId(s.sentenceId),
      podId: row.pod_id,
      podSlug: pod.slug || null,
      podTitle: pod.title || null,
      order: row.global_order,
      seedOrder: 0,
      text: s.to,
      // The crib: what the line says in English (its new words when the English is changing too).
      knownText: trimmed(shown.known_text) || null,
      speaker: row.speaker || null,
      courseCode: courseOfSentence(s.sentenceId),
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: 'podswap',
      role: 'target1',
      filledBy: [],
      readStyle: 'natural',
      rerecordWanted: false,
      // Shown on the line: the words it replaces, which stay live until this take lands.
      replacesText: s.from,
    }
    seen.set(key, line)
    out.push(line)
  }
  return out
}

/** The words a parsed `podswap:` line stands for, if it is a pending target swap of this reader's. Null = not theirs. */
function resolvePodSwap(parsed, recordist, row, swaps = POD_TEXT_SWAPS) {
  if (!parsed || !recordist || !row) return null
  const s = swaps.find((x) => x.sentenceId === parsed.sentenceId && x.side === 'target' && isSwapVoice(x, recordist.spellings || [recordist.voiceId]))
  if (!s) return null
  return { courseCode: courseOfSentence(s.sentenceId), sentenceId: s.sentenceId, text: s.to, state: swapState(s, row) }
}

module.exports = {
  POD_TEXT_SWAPS, POD_SWAP_PREFIX, TEXT_COL, AUDIO_COL,
  swapSentenceIds, swapState, withPendingText, swapsForTake, swapWrite, isSwapVoice,
  podSwapLineId, parsePodSwapLineId, podSwapLinesFor, resolvePodSwap, courseOfSentence, podOfSentence,
}
