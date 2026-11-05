// ─────────────────────────────────────────────────────────────────────────────
// GENERATED — DO NOT EDIT BY HAND.
// Canonical source: ssi-learning-app/packages/core/src/pods/fusionDrill.ts (at origin/staging eeae9b086)
// Vendored here because Popty's Vercel build is single-repo and can't resolve
// the @ssi/core file: link at build time. This is a VERBATIM copy of the code
// the learner runs — not a re-implementation. Re-sync after any change to the
// canonical source with:  bash tools/sync-pod-engine.sh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fusionDrill — the pairwise gradual-fusion ladder for Listening Mode
 * Dialogues > Drill (Aran's model, Tom 2026-07-05).
 *
 * A turn's `atom_map_fine` gives the natural chunks (agent-authored seams —
 * MOLECULAR breath-groups per Tom's 2026-07-05 method, not atomic words;
 * overlaps allowed where authored). Drill climbs one rung per VISIT:
 *
 *   rung 0:  a · b · c                the molecular chunks, each a strip
 *   rung 1:  a+b · c                  pairwise fusion, odd tail stands alone
 *   top:     the whole SENTENCE       — and it stays there.
 *
 * Every chunk at every rung plays t·k·t·t (target · known · target · target).
 * The ladder is CAPPED at the sentence: a turn is 3–4 sentences from one
 * speaker — far too much to hold — so sentences never conjoin into the turn
 * here (the turn-whole belongs to Immersion flow, not Drill).
 *
 * Chunk audio = contiguous ms slices of the sentence's Take G render (the
 * gapped take, seams preserved), so fused chunks keep their internal pauses
 * until the sentence tops out on the natural take. Chunk knowns = the
 * agent-authored unit glosses / window translations rendered as
 * `pod_fine_known` clips (text-keyed). No real audio for a piece → the
 * ladder self-clamps to the sentence whole rather than play approximations.
 *
 * Pure functions only — the player and the dashboard Pod Lab must compose
 * from ONE engine (no second drifting copy).
 */

import type { PodPlay, PodSentenceRow } from './podStageComposition'

/**
 * Kill switch for sub-sentence ms-slice playback (2026-07-10 seam diagnosis:
 * ~35% of ita groups have misplaced seams — the ffmpeg silence-detect fallback
 * picks wrong gaps, and a BAD split is WORSE than NO split). While false, every
 * group degrades to text chunk strips + whole-sentence audio; text chunking and
 * glosses stay fully intact. Flip to true when per-chunk rendered clips land.
 */
const DRILL_SLICE_PLAYBACK_ENABLED = false

/**
 * Off-switch for VERIFIED cuts (job #913). The kill switch above stays off for the authored
 * Take G spans; a sentence slices only through a verified cut (`verifiedCutGroup`): cut from its
 * own recording at a seam the recording itself shows to be clean, every chunk heard back as its
 * own words by local whisper (tools/pod-drill-cuts/run.mjs). Every other sentence plays whole,
 * exactly as before. Flip to false and every sentence plays whole again.
 */
export const VERIFIED_DRILL_CUTS_ENABLED = true

/** One verified LINE of a card (format 2, job #937): its span of the card's clip, its English
 *  (text, plus a span of the card's own English clip where that cut verified), and its chunks
 *  [target text, startMs, endMs, English gloss or null] when the build-time load rule split it,
 *  optionally followed by [knownStartMs, knownEndMs]: the chunk's English as a span of the card's
 *  own English clip `knownClip` (job #378, the approved pod-LEGO cuts). Without it the chunk's
 *  English is looked up by its gloss text, as before. A 7th element is a STANDALONE known clip
 *  (job #707, Tom r-2026-11-03-pod-1-drill-cuts-do-not: a piece too tight to cut from the full take
 *  is re-baked as its own clip): when present it is played whole in place of the cut, which stays
 *  in the file (Popty's preview page plays both). */
export interface VerifiedDrillLine {
  t: [string, number, number]
  k: [string] | [string, number, number] | null
  chunks: Array<[string, number, number, string | null] | [string, number, number, string | null, number | null, number | null] | [string, number, number, string | null, number | null, number | null, string]>
}

/** One card's verified cuts as the player reads them (packages/player-vue/src/data/
 *  podDrillCuts/<course>.json, format 2): the clips they were cut from and the card's lines. A
 *  card of several sentences on one clip is several lines, each drilled on its own. */
export interface VerifiedDrillCut {
  clip: string
  knownClip?: string | null
  /** The card's OWN known clip when `knownClip` is a twin take of the same words in the same voice from another
   *  course (its own take has no Cartesia timings to cut by, job #836). The twin is used only while the card still
   *  plays this clip. */
  knownTwinOf?: string | null
  lines: VerifiedDrillLine[]
}

/** Sentence end on a timed word (the cut tool's SENTENCE_END). */
const TIMED_SENTENCE_END = /[.!?…。！？؟]["'”»)]*$/u
const timedLetters = (t: string) => String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '')
/** A clip's Cartesia word timings ({words, starts, ends} in seconds) reduced to its spoken words, or null when
 *  they are not that shape or do not say `text`. */
function timedWords(raw: unknown, text: string): { words: string[]; starts: number[]; ends: number[] } | null {
  const r = raw as { words?: unknown; starts?: unknown; ends?: unknown } | null
  if (!r || !Array.isArray(r.words) || !Array.isArray(r.starts) || !Array.isArray(r.ends) || !r.words.length) return null
  const keep = (r.words as string[]).map((w, i) => (/[\p{L}\p{N}]/u.test(String(w)) ? i : -1)).filter((i) => i >= 0)
  // a punctuation-only token (Cartesia writes Chinese per character, "。" its own token) joins the word before it,
  // so the sentence end stays on the word that ends the sentence
  const all = (r.words as unknown[]).map(String)
  const tm = { words: keep.map((i, j) => all.slice(i, j + 1 < keep.length ? keep[j + 1] : all.length).join('')), starts: keep.map((i) => Number((r.starts as number[])[i])), ends: keep.map((i) => Number((r.ends as number[])[i])) }
  if (!tm.words.length || [...tm.starts, ...tm.ends].some((x) => !Number.isFinite(x))) return null
  return timedLetters(tm.words.join('')) === timedLetters(text) ? tm : null
}
/** [text, startMs, endMs] per sentence of a timed clip, seams midway between one sentence's last word and the next
 *  one's first, or null when the clip is not several timed sentences. */
function timedSentenceSpans(raw: unknown, text: string, cjk: boolean): Array<[string, number, number]> | null {
  const tm = timedWords(raw, text)
  if (!tm) return null
  const lines: Array<[number, number]> = []
  let from = 0
  tm.words.forEach((w, i) => { if (TIMED_SENTENCE_END.test(w) || i === tm.words.length - 1) { lines.push([from, i]); from = i + 1 } })
  if (lines.length < 2) return null
  const ms = (s: number) => Math.round(s * 1000)
  return lines.map(([a, b], li) => {
    const start = li === 0 ? Math.max(0, ms(tm.starts[a]) - 60) : ms((tm.ends[lines[li - 1][1]] + tm.starts[a]) / 2)
    const end = li === lines.length - 1 ? ms(tm.ends[b]) + 60 : ms((tm.ends[b] + tm.starts[lines[li + 1][0]]) / 2)
    return [tm.words.slice(a, b + 1).join(cjk ? '' : ' '), start, end]
  })
}

/**
 * The floor under the cut file (job #836, Tom 2026-11-05: "these paragraphs are all coming as one chunk - which is
 * nuts, because they are ACTUAL different sentences"): a several-sentence turn with no cut entry is still drilled
 * sentence by sentence, cut at the Cartesia sentence boundaries of its own target AND known clips. Null unless both
 * clips carry timings that say their text in the same number of sentences: a sentence is never drilled without its
 * known line, so such a turn keeps playing whole. The cut tool's quiet-frame seams win wherever an entry exists.
 */
export function timedLineCut(
  sentence: { targetAudioId: string | null; knownAudioId: string | null; targetText: string; knownText: string },
  targetTimings: unknown,
  knownTimings: unknown,
): VerifiedDrillCut | null {
  if (!sentence.targetAudioId || !sentence.knownAudioId) return null
  const cjk = /[\u3040-\u30ff\u3400-\u9fff]/u.test(sentence.targetText)
  const t = timedSentenceSpans(targetTimings, sentence.targetText, cjk)
  const k = t ? timedSentenceSpans(knownTimings, sentence.knownText, false) : null
  if (!t || !k || t.length !== k.length) return null
  return { clip: sentence.targetAudioId, knownClip: sentence.knownAudioId, lines: t.map((l, i) => ({ t: l, k: k[i], chunks: [] })) }
}

/** stripIndex of a step that sounds the WHOLE turn: every line of the card is lit. */
export const ALL_STRIPS = -2

export type FusionMode = 'pairwise' | 'chained'

/** One authored fine unit from `listening_pod_sentences.atom_map_fine`. */
export interface FineUnit {
  kind?: string
  gloss?: string
  lego_key?: string
  target_surface: string
  /** ms span within this unit's GROUP's Take G clip (per-group timebase). */
  target_start_ms?: number | null
  target_end_ms?: number | null
  /** A verified chunk's English, cut from the card's own English clip (job #378). */
  known_clip?: { id: string; startMs?: number; endMs?: number }
}

export interface WindowKnown {
  g: number
  start: number
  end: number
  known: string
}

/** Per-sentence-row data as the player presents it (the June per-sentence
 *  split): one row per sentence clip, or a single whole-turn row. */
export interface FusionRowInput {
  targetAudioId: string | null
  knownAudioId: string | null
  targetText: string
  knownText: string
}

export interface FusionTurnInput {
  turnTargetText: string
  fineMap: FineUnit[]
  windowKnownMap: WindowKnown[] | null
  /** Aligned to GLUED sentence groups; null element = single-unit group. */
  takegAudioIds: Array<string | null> | null
  rows: FusionRowInput[]
  /** The turn row's own WHOLE-TURN clips (target_audio_id / known_audio_id).
   *  A group that covers every sentence of the turn is the whole turn, so
   *  these are its real takes when no Take G or per-sentence clip is. */
  turnTargetAudioId?: string | null
  turnKnownAudioId?: string | null
}

/** One glued sentence group, resolved and ready to drill. */
export interface FusionGroup {
  groupIndex: number
  units: FineUnit[]
  /** Authored window translations for this group's spans, keyed by FLAT
   *  `start-end` unit indices (window_known_map's indexing). */
  windowKnowns: Record<string, string>
  /** Flat index (within the whole turn's unit list) of units[0]. */
  flatStart: number
  /** Take G render for this group (null = single-unit group / not rendered). */
  takegAudioId: string | null
  /** The real whole-sentence target take (sentence clip; the group's full
   *  Take G for glued groups — gaps and all, still the real render). */
  wholeTargetClipId: string | null
  /** June-split per-sentence known take (fallback below fresh renders). */
  wholeKnownClipId: string | null
  /** A glued group spans two sentence rows and has no single English clip for
   *  the pair; the rows' OWN per-sentence English clips, in order, are its
   *  known take. Empty whenever a single clip serves, or a row has none. */
  wholeKnownClipIds: string[]
  targetText: string
  knownText: string
  /** Rows of the turn this group covers (glue can span two). */
  rowFirst: number
  rowLast: number
  /** True when the group's units carry usable ms spans inside a Take G —
   *  the precondition for sub-sentence rungs. False → whole-sentence only. */
  sliceable: boolean
  /** Raw word timings by clip id for the clips this group plays (Take G,
   *  whole-sentence take) — attached by the player where the data is loaded. */
  clipTimings?: Record<string, unknown>
  /** Cut from a VERIFIED cut (job #913): rung 0 drills each chunk then the
   *  whole line in one pass; later rungs are the whole line. */
  verifiedCuts?: boolean
  /** The line's span of `wholeTargetClipId` when the line is one sentence of
   *  a several-sentence clip (job #937). Absent = the whole clip. */
  wholeTargetSpan?: { startMs: number; endMs: number }
  /** The line's span of `wholeKnownClipId` (its English, cut from the card's
   *  own English clip, verified). Absent = the whole clip, or none. */
  wholeKnownSpan?: { startMs: number; endMs: number }
  /** This group is line `index` of a card of `count` lines whose whole turn
   *  is `turnClipId` (job #937). */
  line?: { index: number; count: number; turnClipId: string; turnText: string; turnKnownClipId?: string | null; turnKnownText?: string }
}

export interface DrillClipRef {
  id: string
  startMs?: number
  endMs?: number
}

/** One visual strip at the current rung (target chunk + its known line). */
export interface DrillStrip {
  target: string
  known: string
  /** A verified line split into chunks (job #937): the chunk texts in order
   *  and their English, so the line shows the sounding chunk inside itself. */
  pieces?: string[]
  pieceKnowns?: string[]
}

export interface DrillQueueStep {
  kind: 'chunk' | 'known'
  /** Which strip this step belongs to — drives the strip highlight. */
  stripIndex: number
  text: string
  /** null → no real clip for this slot; skip the audio, keep the text. */
  clip: DrillClipRef | null
  /** True when this step belongs to the SENTENCE WHOLE rung (the group is not
   *  being cut into chunks). The English-once rule never applies to these. */
  whole?: boolean
  /** Which chunk of its strip is sounding (strip.pieces index). */
  piece?: number
  /** On a 'known' step: the target text this English belongs to (several
   *  chunks share one strip on a verified line, so the strip is not enough). */
  of?: string
  /** On a 'known' step: this piece has no known-side cut of its own, so its
   *  known line is the LINE's whole known clip (job #665 taste-safe default).
   *  Such a step never counts as the piece having been taught. */
  lineKnown?: boolean
}

/** Mirror of services/shared/text-normalize.cjs normalizeForAudio — every
 *  lookup against course_audio.text_normalized must use exactly this. */
export const normalizeForAudio = (t: string | null | undefined): string =>
  (t || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!。！]+$/, '')

/** The ONE key for a text-keyed clip map (job #945). course_audio.text_normalized
 *  is written by the DB trigger (rtrim of '.?!¿¡。？！') or by older JS
 *  conventions (trailing '?' kept, curly quotes, commas, ellipses), so the
 *  stored text and the wanted text disagree on punctuation. Build the map with
 *  this on the STORED text and look up with this on the WANTED text: case,
 *  whitespace and every punctuation/quote/ellipsis mark are ignored, letters
 *  (accents included) and digits are kept, so both sides land on one key. */
export const normalizeForLookup = (t: string | null | undefined): string =>
  (t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()

/** Candidate `course_audio.text_normalized` values for a wanted text (job #948).
 *  The column is exact-match only (no trigram index), and its stored form varies
 *  by writer — trailing '.?!' stripped by the DB trigger, or kept by older code
 *  — so a cross-course lookup asks for each plausible spelling, then confirms
 *  every returned row with normalizeForLookup. */
export const lookupKeyVariants = (t: string | null | undefined): string[] => {
  const base = (t || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[\u2018\u2019]/g, "'")
  if (!base) return []
  const bare = base.replace(/[.!?…。！？؟¿¡\s]+$/u, '')
  return Array.from(new Set([base, bare, `${bare}.`, `${bare}?`, `${bare}!`]))
}

/** A voice's identity with its provider prefix dropped ('xai_gfzdpspr5fdp' and
 *  'gfzdpspr5fdp' are one voice; 'azure_en-GB-SoniaNeural' = 'en-GB-SoniaNeural'). */
export const voiceFamily = (id: string | null | undefined): string =>
  (id || '').replace(/^(xai|azure|cartesia)_/, '')

/** The fleet's pod known coach voice (Tom's clone) — what render-fine-knowns
 *  renders every pod_fine_known clip in, and the fallback for a course that has
 *  none of its own yet. */
export const POD_KNOWN_VOICE_FAMILY = 'gfzdpspr5fdp'

/** The fleet's pod female known voice (xAI Olivia). */
export const POD_KNOWN_FEMALE_VOICE_FAMILY = 'bedd6226'

/** The OTHER English pod voice — the last-resort voice when a line has no clip
 *  in its own (job #965: a spoken English line in the other voice beats a
 *  silent card). Null for any voice outside the male/female pair. */
export const otherPodVoice = (voiceId: string | null | undefined): string | null => {
  const v = voiceFamily(voiceId)
  if (v === POD_KNOWN_VOICE_FAMILY) return POD_KNOWN_FEMALE_VOICE_FAMILY
  if (v === POD_KNOWN_FEMALE_VOICE_FAMILY) return POD_KNOWN_VOICE_FAMILY
  return null
}

/** ONE English slot's clip, never silent while any clip for the text exists
 *  (job #965): the line's own voice first, then the same text in the other pod
 *  voice. `inVoice(voice)` answers a clip ref, null = none exists in that voice,
 *  undefined = the answer is still on its way (the slot stays quiet for now and
 *  the caller recomposes when it lands). */
export function resolveKnownWithFallback<T>(
  voice: string,
  inVoice: (voice: string) => T | null | undefined,
): T | null {
  const own = inVoice(voice)
  if (own) return own
  if (own === undefined) return null
  const other = otherPodVoice(voice)
  return (other && inVoice(other)) || null
}

/** Every clip that says an English line, in order (job #965): the line's own
 *  clip, else — when the line is several sentences and only the sentences were
 *  ever recorded — each sentence's clip back to back. Empty when any piece has
 *  no clip at all (half a line spoken is worse than the card's own gap). */
export function knownClipsForText(
  text: string,
  lookup: (t: string) => string | null,
): string[] {
  const whole = text ? lookup(text) : null
  if (whole) return [whole]
  const parts = (text || '').split(/(?<=[.!?])\s+/).map((t) => t.trim()).filter(Boolean)
  if (parts.length < 2) return []
  const ids = parts.map((t) => lookup(t))
  return ids.every(Boolean) ? (ids as string[]) : []
}

/** Key of a pod known clip in a course's own text-keyed map: voice family AND
 *  text, because one English line is rendered once per voice (male Tom, a female
 *  one) and a text-only key lets whichever loaded last answer for both (job #961). */
export const fineKnownKey = (voiceId: string | null | undefined, normText: string): string =>
  `${voiceFamily(voiceId)}|${normText}`

/** The voice a course's pod known side speaks in: the commonest voice family
 *  among its own pod_fine_known clips, or null when it has none. */
export const dominantVoiceFamily = (voiceIds: Array<string | null | undefined>): string | null => {
  const n = new Map<string, number>()
  for (const v of voiceIds) if (v) n.set(voiceFamily(v), (n.get(voiceFamily(v)) || 0) + 1)
  let best: string | null = null
  for (const [k, c] of n) if (c > (best ? n.get(best)! : 0)) best = k
  return best
}

export const SENTENCE_PUNCT = /[.!?…。！？؟]/ // ؟ = Arabic/Farsi question mark — ~9 turns per RTL core pod have one mid-turn

/**
 * One fusion step over spans of unit indices.
 *   pairwise: disjoint pairs L→R, an odd tail stands alone until the next rung
 *   chained:  adjacent windows share an edge chunk ("ma non posso" /
 *             "non posso parlare") — gentler climb, one more rung per size
 */
export function fuseSpans(
  spans: Array<{ start: number; end: number }>,
  mode: FusionMode,
): Array<{ start: number; end: number }> {
  if (spans.length <= 1) return spans
  const out: Array<{ start: number; end: number }> = []
  if (mode === 'chained') {
    for (let i = 0; i < spans.length - 1; i++) out.push({ start: spans[i].start, end: spans[i + 1].end })
  } else {
    for (let i = 0; i < spans.length; i += 2)
      out.push({ start: spans[i].start, end: spans[Math.min(i + 1, spans.length - 1)].end })
  }
  return out
}

/** Every fusion level for an n-unit sentence: units → … → the whole. */
export function spanLadder(n: number, mode: FusionMode): Array<Array<{ start: number; end: number }>> {
  let spans = Array.from({ length: n }, (_, i) => ({ start: i, end: i }))
  const levels = [spans]
  while (spans.length > 1) {
    spans = fuseSpans(spans, mode)
    levels.push(spans)
  }
  return levels
}

/**
 * Partition the turn's fine units into sentence groups by walking the turn
 * text between consecutive unit surfaces looking for sentence-terminal
 * punctuation — sound-wave grouping, no grammar. Returns arrays of unit
 * INDICES into `units`.
 */
export function partitionUnits(turnText: string, units: FineUnit[]): number[][] {
  const text = turnText || ''
  const lower = text.toLowerCase()
  const groups: number[][] = [[]]
  let cursor = 0
  for (let i = 0; i < units.length; i++) {
    const surface = (units[i].target_surface || '').toLowerCase()
    const idx = surface ? lower.indexOf(surface, cursor) : -1
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(i)
    if (idx !== -1) cursor = idx + surface.length
  }
  return groups.filter((g) => g.length > 0)
}

/** Number of whitespace-separated words in a unit's target surface. */
const wordCount = (s: string | undefined): number =>
  (s || '').trim().split(/\s+/).filter(Boolean).length

/**
 * A leading one-unit "sentence" only counts as a bare interjection ("Hej!",
 * "Ciao!", "Naravno") when it's a single word. The 2026-07-14 independent-
 * meaning segmentation rule made one-unit COMPLETE sentences the norm
 * ("Zovem se Anna", "Janjetina je izvrsna") — those must NOT glue (hrv
 * core-pod gloss-fidelity audit, ssi-dashboard-v7-clean 2026-07-14: 61/142
 * rows over-fired on this before the word-count gate). Falls back to
 * "always glue" when no units are supplied, for callers that only have the
 * bare group shape (structural tests).
 */
const isBareInterjection = (unit: FineUnit | undefined): boolean => wordCount(unit?.target_surface) <= 1

/**
 * Glue rule (narrowed 2026-07-04, tightened 2026-07-14): ONLY a turn-initial
 * one-unit sentence that is also a single WORD — a leading "Ciao!"
 * interjection — glues onto the sentence that follows. A mid-turn one-unit
 * sentence, or a leading one-unit sentence with more than one word, is a
 * real sentence with its own takes.
 */
export function glueLeadingInterjection(groups: number[][], units?: FineUnit[]): number[][] {
  if (
    groups.length >= 2 &&
    groups[0].length === 1 &&
    (!units || isBareInterjection(units[groups[0][0]]))
  ) {
    return [[...groups[0], ...groups[1]], ...groups.slice(2)]
  }
  return groups
}

/** Is every authored unit's surface still in the turn's text (case, spacing
 *  and punctuation ignored)? */
export function mapMatchesText(turnText: string, units: FineUnit[]): boolean {
  const text = ` ${normalizeForLookup(turnText)} `
  return units.every((u) => text.includes(` ${normalizeForLookup(u.target_surface)} `))
}

export interface BuildFusionGroupsOpts {
  /** Emit GLUED turns as per-row groups instead of one spanning group. The
   *  interjection row keeps its own take (depth 1 — nothing to fuse); the
   *  continuation row slices its chunks from the SHARED Take G (unit ms
   *  spans are in that clip's timebase either way). The main-flow lap
   *  scheduler needs this — its items are rows, so a spanning group would
   *  double-play material; Drill keeps the spanning group (it anchors the
   *  glue and skips the continuation row). */
  splitGlued?: boolean
}

/**
 * Resolve a turn's fine map into drill-ready sentence groups. Returns null
 * when the authored data doesn't line up with this turn (no fine map, group/
 * row mismatch, Take G misalignment) — the caller falls back to the plain
 * per-sentence t·k·t·t drill. Honest data or nothing; never guess a cut.
 */
export function buildFusionGroups(
  input: FusionTurnInput,
  opts?: BuildFusionGroupsOpts,
): FusionGroup[] | null {
  const units = (input.fineMap || []).filter(
    (u) => u && (u.kind === undefined || u.kind === 'atom' || u.kind === 'passthrough') && u.target_surface,
  )
  if (units.length === 0) return null
  // A map left stale by a text edit (Italian S009 after tu-first: "Mi scusi"
  // over a clip and text that say "Scusa") would show words nobody says and
  // English with no clip. Every unit must still be in the turn's text, or the
  // turn drills plainly on its real clips. (job #937)
  if (!mapMatchesText(input.turnTargetText, units)) return null

  const raw = partitionUnits(input.turnTargetText, units)
  const glued = glueLeadingInterjection(raw, units)

  // Row alignment: the June split gives one row per raw sentence. A single
  // unsplit row legitimately holds every group. Anything else → bail.
  const rows = input.rows || []
  const singleRow = rows.length === 1
  if (!singleRow && raw.length !== rows.length) return null

  // Take G alignment is per GLUED group when present.
  const takeg = input.takegAudioIds
  if (takeg && takeg.length !== glued.length) return null

  // Rows covered per glued group: glue only ever merges raw row 0 into 1.
  const gluedOffset = glued.length === raw.length ? 0 : 1

  // splitGlued: compose from the RAW partition (1:1 with rows) and point the
  // glue-affected raw groups at the shared glued Take G.
  //
  // A glued group with NO Take G has no recording of its fused text, so it
  // is split back into its sentences, each of which has its own clip. Italian
  // Pod 1 (Aran, 2026-09-30): "Buongiorno. Cosa prendo?" glued with no Take G
  // drilled as a silent card — no Italian, and no English either, because the
  // fused known text has no clip. 13 turns in that pod alone. (job #917)
  const glueHasNoTake = gluedOffset === 1 && !singleRow && !(takeg && takeg[0])
  const splitGlued = (!!opts?.splitGlued || glueHasNoTake) && gluedOffset === 1
  const groupsSrc = splitGlued ? raw : glued
  const takegIndexFor = (gi: number) => (splitGlued ? Math.max(0, gi - 1) : gi)

  // Flat offsets per group (window_known_map uses flat unit indices; the flat
  // order is identical for raw and glued — gluing only merges neighbours).
  const flatStarts: number[] = []
  {
    let off = 0
    for (const g of groupsSrc) {
      flatStarts.push(off)
      off += g.length
    }
  }

  const windowIndex: Record<string, string> = {}
  for (const w of input.windowKnownMap || []) windowIndex[`${w.start}-${w.end}`] = w.known

  const groups = groupsSrc.map((unitIdxs, gi) => {
    const groupUnits = unitIdxs.map((i) => units[i])
    const rowFirst = singleRow ? 0 : splitGlued ? gi : gi === 0 ? 0 : gi + gluedOffset
    const rowLast = singleRow ? 0 : splitGlued ? gi : gi === 0 ? gluedOffset : gi + gluedOffset
    const rowsOfGroup = rows.slice(rowFirst, rowLast + 1)
    // A per-sentence row maps 1:1 onto this group (the common case).
    const perSentenceRow = !singleRow && rowsOfGroup.length === 1 ? rowsOfGroup[0] : null
    const wholeTurnGroup = singleRow && groupsSrc.length === 1 ? rows[0] : null
    // Covers every sentence of the turn → the turn's own whole clips are
    // this group's takes (a glued two-sentence turn, a one-group turn).
    const coversTurn = groupsSrc.length === 1

    const takegId = takeg ? takeg[takegIndexFor(gi)] || null : null
    const sliceable =
      DRILL_SLICE_PLAYBACK_ENABLED &&
      !!takegId &&
      groupUnits.length > 1 &&
      groupUnits.every((u) => u.target_start_ms != null && u.target_end_ms != null)

    return {
      groupIndex: gi,
      units: groupUnits,
      windowKnowns: windowIndex,
      flatStart: flatStarts[gi],
      takegAudioId: takegId,
      wholeTargetClipId:
        perSentenceRow?.targetAudioId ||
        wholeTurnGroup?.targetAudioId ||
        takegId ||
        (coversTurn ? input.turnTargetAudioId || null : null),
      wholeKnownClipId:
        perSentenceRow?.knownAudioId ||
        wholeTurnGroup?.knownAudioId ||
        (coversTurn ? input.turnKnownAudioId || null : null),
      wholeKnownClipIds:
        rowsOfGroup.length > 1 && rowsOfGroup.every((r) => r.knownAudioId)
          ? rowsOfGroup.map((r) => r.knownAudioId as string)
          : [],
      targetText:
        perSentenceRow?.targetText ||
        wholeTurnGroup?.targetText ||
        (rowsOfGroup.length > 1
          ? rowsOfGroup.map((r) => r.targetText).filter(Boolean).join(' ')
          : groupUnits.map((u) => u.target_surface).join(' ')),
      knownText:
        perSentenceRow?.knownText ||
        wholeTurnGroup?.knownText ||
        (rowsOfGroup.length > 1
          ? rowsOfGroup.map((r) => r.knownText).filter(Boolean).join(' ')
          : groupUnits.map((u) => u.gloss || '').filter(Boolean).join(' ')),
      rowFirst,
      rowLast,
      sliceable,
    }
  })

  // A Drill card is never composed without a recording to play. A group with
  // no target clip (an unsplit multi-sentence row with no Take G, or a fine
  // map left stale by a text edit — Italian Pod 1 row 31 after tu-first)
  // would drill as English only; the plain per-sentence t·k·t·t plays the
  // row's real clips instead. (job #917)
  if (groups.some((g) => !g.wholeTargetClipId)) return null
  return groups
}

/**
 * The drill groups for ONE card from its verified cut (jobs #913, #937): one
 * group per LINE, each drilled on its own. Null when there is none to use: no
 * cut, the cut was made from a different recording than the one this card now
 * plays (a re-render changes the versioned clip id, and old cut times would
 * land anywhere), the spans are out of order, or the off-switch is off. Null
 * means the caller keeps whatever it had, so the card plays whole as before.
 * Every span is a slice of the card's own clips, never new audio (r-2026-10-24).
 * A line's English span is used only when it was cut from the English clip the
 * card plays now; otherwise the line's English is looked up by its text.
 */
export function verifiedCutGroups(
  sentence: { targetAudioId: string | null; knownAudioId: string | null; targetText: string; knownText: string },
  rowIndex: number,
  cut: VerifiedDrillCut | null | undefined,
): FusionGroup[] | null {
  if (!VERIFIED_DRILL_CUTS_ENABLED || !cut || !sentence.targetAudioId) return null
  if (cut.clip !== sentence.targetAudioId || !Array.isArray(cut.lines) || cut.lines.length === 0) return null
  const lines = cut.lines
  const cuts = lines.length > 1 || (lines[0].chunks || []).length >= 2
  if (!cuts) return null
  const ok = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && a < b
  let at = 0
  for (const l of lines) {
    if (!l?.t || !ok(l.t[1], l.t[2]) || l.t[1] < at) return null
    for (const c of l.chunks || []) if (!ok(c[1], c[2]) || c[1] < l.t[1] - 1 || c[2] > l.t[2] + 1) return null
    at = l.t[2]
  }
  const multi = lines.length > 1
  const knownClipLive = !!cut.knownClip && (cut.knownClip === sentence.knownAudioId || (!!cut.knownTwinOf && cut.knownTwinOf === sentence.knownAudioId))
  return lines.map((l, li) => {
    const chunks = (l.chunks || []).length >= 2 ? l.chunks : []
    const kText = multi ? (l.k?.[0] || '') : sentence.knownText
    const kSpan = multi && knownClipLive && l.k && l.k.length === 3 && ok(l.k[1], l.k[2]) ? { startMs: l.k[1], endMs: l.k[2] } : null
    const units: FineUnit[] = chunks.length
      ? chunks.map(([text, startMs, endMs, gloss, ks, ke, standalone]) => ({
          kind: 'atom',
          target_surface: text,
          gloss: gloss || undefined,
          target_start_ms: startMs,
          target_end_ms: endMs,
          // the chunk's English span is used only when cut from the English clip the card plays now
          // the chunk's own standalone known clip wins over the cut (job #707: the cut was scored too tight)
          ...(typeof standalone === 'string' && standalone
            ? { known_clip: { id: standalone } }
            : knownClipLive && ks != null && ke != null && ok(ks, ke) ? { known_clip: { id: cut.knownClip as string, startMs: ks, endMs: ke } } : {}),
        }))
      : [{ kind: 'atom', target_surface: l.t[0], gloss: kText || undefined, target_start_ms: l.t[1], target_end_ms: l.t[2] }]
    const g: FusionGroup = {
      groupIndex: li,
      units,
      windowKnowns: {},
      flatStart: 0,
      takegAudioId: sentence.targetAudioId,
      wholeTargetClipId: sentence.targetAudioId,
      wholeKnownClipId: multi ? (kSpan ? (cut.knownClip as string) : null) : sentence.knownAudioId,
      wholeKnownClipIds: [],
      targetText: multi ? l.t[0] : sentence.targetText,
      knownText: kText,
      rowFirst: rowIndex,
      rowLast: rowIndex,
      sliceable: chunks.length >= 2,
      verifiedCuts: true,
    }
    if (multi) {
      g.wholeTargetSpan = { startMs: l.t[1], endMs: l.t[2] }
      if (kSpan) g.wholeKnownSpan = kSpan
      g.line = {
        index: li,
        count: lines.length,
        turnClipId: sentence.targetAudioId as string,
        turnText: sentence.targetText,
        turnKnownClipId: sentence.knownAudioId,
        turnKnownText: sentence.knownText,
      }
    }
    return g
  })
}

/**
 * One card's Drill at a rung (job #937): every group's strips and steps in
 * order. A card of several verified lines drills each LINE as its own unit,
 * target, known, target, target, and stops there: the whole turn is not
 * replayed as a drilled unit (Tom, 2026-11-05, job #836: "these paragraphs are
 * all coming as one chunk - which is nuts, because they are ACTUAL different
 * sentences - so there's no reason not to break them"), superseding #662's
 * closing whole-turn t·k·t·t. The player and the tests compose from this.
 */
export function composeDrillCard(
  groups: FusionGroup[],
  rung: number,
  mode: FusionMode,
  lookupKnownClip: (text: string) => string | null,
): { strips: DrillStrip[]; steps: DrillQueueStep[] } {
  const strips: DrillStrip[] = []
  const steps: DrillQueueStep[] = []
  for (const g of groups) {
    const r = rungStepsForGroup(g, rung, mode, lookupKnownClip, strips.length)
    strips.push(...r.strips)
    steps.push(...r.steps)
  }
  return { strips, steps }
}

/**
 * The known side of a group's WHOLE line: its text and the clips that say it.
 * A verified line's own known slice comes first (job #937): the card's own
 * known voice, cut at a seam the recording showed clean. A glued pair with no
 * clip of its own says its known line as the two sentences' own clips, back
 * to back — never silence under a card that shows it (job #953).
 */
function lineKnownFor(
  group: FusionGroup,
  lookupKnownClip: (text: string) => string | null,
): { knownText: string; knownClips: DrillClipRef[] } {
  const sentText = group.knownText
  const glossJoin = group.units.map((u) => u.gloss || '').filter(Boolean).join(' ')
  const knownText = sentText || glossJoin
  const ownSlice: DrillClipRef | null =
    group.wholeKnownSpan && group.wholeKnownClipId ? { id: group.wholeKnownClipId, ...group.wholeKnownSpan } : null
  if (ownSlice) return { knownText, knownClips: [ownSlice] }
  const clipId =
    (sentText ? lookupKnownClip(sentText) : null) ||
    (group.wholeKnownSpan ? null : group.wholeKnownClipId) ||
    (glossJoin ? lookupKnownClip(glossJoin) : null)
  const ids = clipId
    ? [clipId]
    : group.wholeKnownClipIds.length
      ? group.wholeKnownClipIds
      : knownClipsForText(knownText, lookupKnownClip)
  return { knownText, knownClips: ids.map((id) => ({ id })) }
}

/**
 * Skip the finest-units rung. TRUE was the stopgap for the ATOMIC-era maps
 * (Tom 2026-07-05: single atomic units too 'bitty'). The real fix was
 * re-authoring the maps at MOLECULAR granularity (breath-group chunks,
 * Tom's method, same day) — the finest level IS now the level he specified
 * ("3 separate strips that go in turn"), so the ladder enters there again.
 * Flip to true only for courses still carrying atomic-era maps.
 */
export const SKIP_FINEST_RUNG = false

/** The ladder a group actually climbs: span levels (finest rung skipped per
 *  SKIP_FINEST_RUNG), or just the whole for non-sliceable groups. */
function ladderFor(group: FusionGroup, mode: FusionMode): Array<Array<{ start: number; end: number }>> {
  if (!group.sliceable) return [[{ start: 0, end: group.units.length - 1 }]]
  // Verified cuts: the chunks (each then the whole, in one pass), then the whole.
  // No pairwise rungs — a fused pair would break the syllable cap (r-2026-10-29).
  if (group.verifiedCuts) {
    return [group.units.map((_, i) => ({ start: i, end: i })), [{ start: 0, end: group.units.length - 1 }]]
  }
  let levels = spanLadder(group.units.length, mode)
  if (SKIP_FINEST_RUNG && levels.length > 1) levels = levels.slice(1)
  return levels
}

/** The number of rungs this group's own ladder has under a fusion mode. A
 *  group with no sliceable audio clamps straight to its whole (depth 1). */
export function groupDepth(group: FusionGroup, mode: FusionMode): number {
  return ladderFor(group, mode).length
}

/**
 * Known-language line plays only for a phrase the learner has NOT already had
 * (Tom, 2026-10-28, r-2026-10-28 pod Drill, refined: EXACTLY the same phrase).
 * Tom 2026-11-03 tightened it: "only in listening mode, and only within the
 * pod-1 scope, and only if the phrase on its own is an exact match", and only
 * for a piece already taught in Drill. Scope and taught-in-Drill are the
 * caller's `heard` set (ListeningOverlay: Pod 1 Drill only); this function
 * keeps the exact-standalone match.
 * A 'known' step is dropped when the target text of its own chunk, compared by
 * the audio-identity rule (normalizeForAudio: case ignored, meaning-changing
 * '?' kept), is in `heard`. A similar-but-different phrase keeps its English.
 * Chunk (target) steps are never touched, so target repetitions are unchanged.
 * Steps of a SENTENCE WHOLE (`whole`) always keep their English: a whole
 * sentence is the card itself, not a repeated phrase inside a ladder, and with
 * slicing off every card is one (job #651: learners heard no English at all).
 */
export function dropKnownsForHeardPhrases(
  steps: DrillQueueStep[],
  heard: ReadonlySet<string>,
): DrillQueueStep[] {
  const chunkText = new Map<number, string>()
  for (const st of steps) if (st.kind === 'chunk' && !chunkText.has(st.stripIndex)) chunkText.set(st.stripIndex, st.text)
  return steps.filter(
    (st) => st.kind !== 'known' || st.whole || !heard.has(normalizeForAudio(st.of ?? chunkText.get(st.stripIndex))),
  )
}

/**
 * RETIRED (job #665, Tom 2026-11-03: "we just cut the pieces out of the known
 * side's full sentence"): a piece is never dropped from Drill for lack of its
 * own known recording any more — rungStepsForGroup gives it the line's whole
 * known clip until its cut exists. Kept as a guard for the one case left: a
 * chunk with no known clip at all (the line has none either), which is not
 * drilled (asks 1588 + 1451: t·k·t·t, never the target three times silent).
 */
export function dropChunksWithoutKnown(steps: DrillQueueStep[]): DrillQueueStep[] {
  // pushTktt stamps every known step with `of` = its chunk's text.
  const key = (st: DrillQueueStep, text: string | undefined) => `${st.stripIndex}|${st.piece ?? ''}|${text ?? ''}`
  const voiced = new Set<string>()
  for (const st of steps) if (st.kind === 'known' && !st.whole && st.clip) voiced.add(key(st, st.of))
  return steps.filter((st) => st.kind !== 'chunk' || st.whole || voiced.has(key(st, st.text)))
}

/**
 * NOT used by Drill since job #665: the stored counter is shared by both
 * doors (main-flow pod laps write it too), so it cannot say a piece was taught
 * IN DRILL, which Tom's 2026-11-03 ruling requires. Kept for reference.
 * Persisted half of the heard set (r-2026-10-28): every target phrase the
 * learner has already had, across ALL the given pod sentences. A sentence with
 * n completed exposures has had rungs 0..n-1 of its own ladder (and, once
 * exposed, its whole text), so any identical phrase met in a different
 * sentence is "got" too. Keys are audio-identity (normalizeForAudio).
 */
export function heardTargetKeysFromExposures(
  sentences: ReadonlyArray<{ exposures: number; targetText?: string | null; groups?: FusionGroup[] | null }>,
  mode: FusionMode,
  maxRungs = 8,
): Set<string> {
  const out = new Set<string>()
  for (const s of sentences) {
    if (!(s.exposures > 0)) continue
    for (let r = 0; r < Math.min(s.exposures, maxRungs); r++) {
      for (const g of s.groups || []) {
        for (const st of rungStepsForGroup(g, r, mode, () => null).steps) {
          if (st.kind === 'chunk' && !st.whole) out.add(normalizeForAudio(st.text))
        }
      }
    }
  }
  return out
}

/** Progression-badge tier label for a fusion rung ("fusion-r0", "fusion-r1"…). */
export const FUSION_TIER_PREFIX = 'fusion-r'

/**
 * MAIN-FLOW unified ladder (Tom 2026-07-03 lock, sentence-capped per the
 * 2026-07-05 ruling): a sentence's ladder = its fusion rungs, then the
 * config speed cascade. This composes ONE fusion rung as PodPlays for the
 * pod-lap scheduler — the same steps Drill plays (chunk t·k·t·t at 1×,
 * Take G ms-slices, fine-known translations), expressed in the lap's play
 * vocabulary so gaps/telemetry/Progression all work unchanged. The rung
 * BELOW the whole belongs here; the whole-sentence t·k·t·t ≡ engine
 * Stage 1, where the existing stage playlists take over (the splice is
 * seamless — same shape, same speed).
 */
export function buildFusionRungPlays(
  sentence: PodSentenceRow,
  group: FusionGroup,
  rung: number,
  sentenceIdx: number,
  mode: FusionMode,
  lookupKnownClip: (text: string) => string | null,
): PodPlay[] {
  const { steps } = rungStepsForGroup(group, rung, mode, lookupKnownClip)
  const plays: PodPlay[] = []
  for (const st of steps) {
    if (!st.clip) continue // no real clip for this slot — the text-only known drops
    plays.push({
      sentenceIdx,
      stage: 0,
      tier: `${FUSION_TIER_PREFIX}${rung}`,
      playRole: st.kind === 'known' ? 'trans' : 'ps',
      audioId: st.clip.id,
      text: st.text,
      playbackSpeed: 1.0,
      glueToNextChunk: false,
      ...(st.clip.startMs != null && st.clip.endMs != null
        ? { startMs: st.clip.startMs, endMs: st.clip.endMs }
        : {}),
    })
  }
  if (plays.length > 0 && sentence.glue_to_next) plays[plays.length - 1].glueToNextChunk = true
  return plays
}

/**
 * Compose one group's strips + play steps at a rung. Every chunk plays
 * t·k·t·t; the known slot drops (t·t) when there is no real known clip —
 * the strip still SHOWS the gloss text. A scene-wide rung clamps to the
 * group's own depth: topped-out sentences repeat their whole while longer
 * siblings climb. `lookupKnownClip` resolves a known text to its
 * `pod_fine_known` clip id (normalizeForAudio-keyed).
 */
export function rungStepsForGroup(
  group: FusionGroup,
  rung: number,
  mode: FusionMode,
  lookupKnownClip: (text: string) => string | null,
  stripOffset = 0,
): { strips: DrillStrip[]; steps: DrillQueueStep[] } {
  const ladder = ladderFor(group, mode)
  const level = ladder[Math.min(rung, ladder.length - 1)]

  const strips: DrillStrip[] = []
  const steps: DrillQueueStep[] = []

  const pushTktt = (
    stripIndex: number,
    chunkText: string,
    chunkClip: DrillClipRef | null,
    knownText: string,
    knownClips: DrillClipRef[],
    whole = false,
    piece?: number,
    lineKnown = false,
  ) => {
    const w = { ...(whole ? { whole: true } : {}), ...(piece != null ? { piece } : {}) }
    steps.push({ kind: 'chunk', stripIndex, text: chunkText, clip: chunkClip, ...w })
    for (const clip of knownClips) steps.push({ kind: 'known', stripIndex, text: knownText, clip, of: chunkText, ...w, ...(lineKnown ? { lineKnown: true } : {}) })
    steps.push({ kind: 'chunk', stripIndex, text: chunkText, clip: chunkClip, ...w })
    steps.push({ kind: 'chunk', stripIndex, text: chunkText, clip: chunkClip, ...w })
  }

  // Sentence whole — the top of the ladder, where every sentence ends up.
  // Known preference: fresh render of the real sentence translation (audio
  // provably matches text) → June-split take slice → fresh gloss-join render.
  if (level.length === 1) {
    const { knownText, knownClips } = lineKnownFor(group, lookupKnownClip)
    strips.push({ target: group.targetText, known: knownText })
    pushTktt(
      stripOffset,
      group.targetText,
      group.wholeTargetClipId ? { id: group.wholeTargetClipId, ...(group.wholeTargetSpan || {}) } : null,
      knownText,
      knownClips,
      true,
    )
    return { strips, steps }
  }

  // Sub-sentence rung — ms slices of the group's Take G (for a verified cut,
  // of the line's own clip).
  const pieceTexts: string[] = []
  const pieceKnowns: string[] = []
  level.forEach((span, si) => {
    const us = group.units.slice(span.start, span.end + 1)
    const chunkText = us.map((u) => u.target_surface).join(' ')
    const chunkClip: DrillClipRef = {
      id: group.takegAudioId as string,
      startMs: us[0].target_start_ms as number,
      endMs: us[us.length - 1].target_end_ms as number,
    }
    const knownText =
      us.length === 1
        ? us[0].gloss || ''
        : group.windowKnowns[`${group.flatStart + span.start}-${group.flatStart + span.end}`] ||
          us.map((u) => u.gloss || '').filter(Boolean).join(' ')
    // A piece's known line is cut from the known side's full-sentence
    // recording (Tom 2026-11-03: "we just cut the pieces out of the known
    // side's full sentence") — the cut file's span, made by
    // Popty tools/pods/pod-drill/pair.mjs — or a clip of exactly its known text.
    const ownKnown = group.verifiedCuts && us.length === 1 ? us[0].known_clip : undefined
    const knownId = ownKnown ? null : knownText ? lookupKnownClip(knownText) : null
    let pieceKnownClips: DrillClipRef[] = ownKnown ? [{ ...ownKnown }] : knownId ? [{ id: knownId }] : []
    let pieceKnownText = knownText
    let lineKnown = false
    if (!pieceKnownClips.length) {
      // No cut yet (the known order differs, so the piece is on the
      // re-record list, or the cut was made from an older render): the piece
      // stays — Drill pieces are the main player's pieces — and its known
      // line is the line's whole known clip (job #665, taste-safe default).
      const line = lineKnownFor(group, lookupKnownClip)
      pieceKnownClips = line.knownClips
      if (pieceKnownClips.length) {
        pieceKnownText = line.knownText
        lineKnown = true
      }
    }
    if (group.verifiedCuts) {
      // One strip for the line; each chunk lights inside it (job #937).
      pieceTexts.push(chunkText)
      pieceKnowns.push(knownText)
      pushTktt(stripOffset, chunkText, chunkClip, pieceKnownText, pieceKnownClips, false, si, lineKnown)
    } else {
      strips.push({ target: chunkText, known: knownText })
      pushTktt(stripOffset + si, chunkText, chunkClip, pieceKnownText, pieceKnownClips, false, undefined, lineKnown)
    }
  })
  // A verified cut drills every chunk, THEN the whole line, in the same pass
  // (r-2026-10-29: "each chunk drilled ... before the whole line").
  if (group.verifiedCuts) {
    strips.push({ target: group.targetText, known: group.knownText, pieces: pieceTexts, pieceKnowns })
    const whole = rungStepsForGroup(group, ladder.length - 1, mode, lookupKnownClip, stripOffset)
    steps.push(...whole.steps)
  }
  return { strips, steps }
}
