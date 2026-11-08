/**
 * NORTH POD 1'S SENTENCE-BY-SENTENCE ENGLISH, CUT FROM ARAN'S OWN TAKE (Aran, 2026-10-29 14:59Z, job #570: "Cut your takes
 * into sentences for those 46 lines? Y (we want to make sure that my voice replaces the computer voice everywhere)").
 *
 * 46 of North Pod 1's 231 lines play to the learner one sentence at a time: the row carries per-sentence clips
 * (sentence_audio_ids, and its English twin sentence_known_audio_ids, the same length) and the player pairs them by index
 * (learning app podSentenceSplit.ts). Job #555 moves the WHOLE-line English slot to his take; the per-sentence English
 * stayed synthetic. This is the other half: once his take holds the whole line, it is cut at its sentence pauses and
 * each piece replaces the synthetic sentence clip, make-before-break through link-clip (replace + expectCurrent).
 *
 * REFUSE, NEVER GUESS. A cut is made only when the take's pauses answer the sentence count plainly (judgeCut): as many
 * clear pauses as sentence breaks, the shortest pause cut at well above the longest one left alone (the 1.5 margin
 * tools/pods/splice-sentence-clips.cjs measured), no piece too short to be a sentence, and every piece's length in
 * proportion to its words. Anything else leaves the line synthetic and names it for Aran.
 *
 * WHICH LINES (planSplitCuts): a line of a replace pod (pod-english-lines POD_ENGLISH_REPLACE_PODS), not owned by another
 * job, that the learner actually hears in sentences (known and target arrays the same length, two or more), whose speaker
 * is a MAN by the course cast (pod-english-lines podSpeakerGender, job #562's rule; a speaker the cast does not name is
 * nobody's) and is the reader's own gender, whose whole English slot holds a HUMAN take of this reader's, and whose
 * text splits into exactly as many sentences as the array has clips. Only synthetic sentence clips move; a human one —
 * his or anybody's — is never replaced.
 *
 * WRONG WORDS (planWrongWordRepairs): a sentence clip whose words are not its sentence of the line (SC01-S004 played
 * "Goodbye." for "See you later.", found by cold check #568) is re-cut from the line's own whole clip, whoever voices it,
 * and only that clip moves. Same refusal rules.
 *
 * ONE CUT, EVERY COURSE (job #879, below): a set of pieces is keyed by (take, words) and linked into every course's row
 * that plays that take — planSharedPieceLinks. South Pod 1 had none on 2026-11-08 for two reasons: only North was ever
 * planned (POD_ENGLISH_REPLACE_PODS) with pieces linked only into the row that was cut, and South's rows carry no
 * sentence arrays at all (its Welsh was never split), so there was no array to put a piece in.
 *
 * Pure: no I/O. The cutting, storing and linking are recordist-queue cutPodEnglishSplitsNow with
 * pod-english-split-audio.cjs.
 */
'use strict'

const { isHumanClip } = require('../shared/human-take-guard.cjs')
const { podSentencesOf, wordsOnly } = require('../shared/pod-sentence-split.cjs')
const { POD_ENGLISH_REPLACE_LEFT_TO } = require('./pod-english-lines.cjs')

/**
 * The gates a cut must pass. margin: shortest pause cut at / longest pause left alone (splice-sentence-clips.cjs: above
 * ~1.5 sentence ends and comma pauses are two populations, at 1.0 a coin toss). minPieceS: a piece shorter is not a
 * sentence. shareRatio: a piece's share of the take's length over its share of the line's syllables — a cut in the wrong
 * pause hands one piece another sentence's words and pushes this far out (short words are said slowly, so the band is wide: 0.63-2.30 over 196 sentences of North Pod 1's English, 29 Oct).
 */
const SPLIT_CUT_GATES = Object.freeze({ minMargin: 1.5, minPieceS: 0.35, shareRatio: Object.freeze([0.5, 2.5]) })

/**
 * Whose lines are cut. Aran's ruling covers his takes, and his are the men's lines: job #562 moves the women's to Catrin,
 * and the job #570 brief excluded them. Her takes reach the women's WHOLE slots (#562), but on a line heard in sentences
 * the player plays the sentence clips, so those stay synthetic until someone rules that her takes are cut too.
 */
const SPLIT_CUT_SPEAKER_GENDERS = Object.freeze(['m'])

const courseOfPod = (podId) => String(podId).split(':')[0]

/** Does the learner hear this line sentence by sentence? (podSentenceSplit.ts: ≥2 target clips, known array the same length) */
function playsInSentences(row) {
  const t = Array.isArray(row.sentence_audio_ids) ? row.sentence_audio_ids.filter(Boolean) : []
  const k = Array.isArray(row.sentence_known_audio_ids) ? row.sentence_known_audio_ids.filter(Boolean) : []
  return t.length >= 2 && k.length === t.length
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function numberWords(n) {
  if (n < 20) return ONES[n]
  if (n < 100) return `${TENS[Math.floor(n / 10)]} ${n % 10 ? ONES[n % 10] : ''}`
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred ${n % 100 ? `and ${numberWords(n % 100)}` : ''}`
  if (n < 1e6) return `${numberWords(Math.floor(n / 1000))} thousand ${n % 1000 ? numberWords(n % 1000) : ''}`
  return `${numberWords(Math.floor(n / 1e6))} million ${n % 1e6 ? numberWords(n % 1e6) : ''}`
}

/** A rough count of the syllables an English sentence is spoken in; digits are read as words ("100,000." is five). */
function spokenSyllables(sentence) {
  const text = String(sentence || '').replace(/\d[\d,]*/g, (m) => ` ${numberWords(Number(m.replace(/,/g, '')))} `)
  let n = 0
  for (const word of text.toLowerCase().split(/[^a-z']+/).filter(Boolean)) {
    const w = word.replace(/'/g, '')
    let groups = (w.match(/[aeiouy]+/g) || []).length
    if (groups > 1 && /[^aeiouy]e$/.test(w) && !/le$/.test(w)) groups--
    n += Math.max(1, groups)
  }
  return Math.max(1, n)
}

/**
 * Is this cut plain enough to use? `splice` is tools/pods/splice.py's measurement of cutting the take at its n-1 longest
 * interior pauses: {interior_gaps_ms, cut_at_gaps_ms, rejected_gaps_ms, margin, pieces:[{start,end,dur}]}.
 * @returns {{ok: true} | {ok: false, why: string}}
 */
function judgeCut(sentences, splice, gates = SPLIT_CUT_GATES) {
  const n = sentences.length
  const gaps = (splice && splice.interior_gaps_ms) || []
  const pieces = (splice && splice.pieces) || []
  if (gaps.length < n - 1) return { ok: false, why: `the take has ${gaps.length} pause(s) for ${n} sentences` }
  if (pieces.length !== n) return { ok: false, why: `the cut made ${pieces.length} piece(s) for ${n} sentences` }
  if (splice.margin != null && splice.margin < gates.minMargin) {
    return { ok: false, why: `a pause inside a sentence is nearly as long as one between sentences (cut at ${splice.cut_at_gaps_ms.join('/')} ms, left ${Math.max(...splice.rejected_gaps_ms)} ms; margin ${splice.margin})` }
  }
  const total = pieces.reduce((s, p) => s + p.dur, 0)
  const syl = sentences.map(spokenSyllables)
  const sylTotal = syl.reduce((s, x) => s + x, 0)
  for (let i = 0; i < n; i++) {
    const p = pieces[i]
    if (p.dur < gates.minPieceS) return { ok: false, why: `piece ${i + 1} ("${sentences[i]}") is only ${Math.round(p.dur * 1000)} ms` }
    const ratio = (p.dur / total) / (syl[i] / sylTotal)
    if (ratio < gates.shareRatio[0] || ratio > gates.shareRatio[1]) {
      return { ok: false, why: `piece ${i + 1} ("${sentences[i]}") is ${p.dur.toFixed(2)} s — out of proportion to its words (x${ratio.toFixed(2)})` }
    }
  }
  return { ok: true }
}

/**
 * Which lines' synthetic sentence clips are cut from this reader's take.
 * @param {object} input
 * @param {string[]} input.podIds            replace pods this reader reads
 * @param {object[]} input.sentences         rows {id, pod_id, speaker, known_text, known_audio_id, sentence_audio_ids, sentence_known_audio_ids}
 * @param {Map} input.clipById               course_audio id -> {id, voice_id, origin, text, s3_key}
 * @param {Function} input.genderOf          row -> 'm' | 'f' | null, the speaker's gender by the course cast (podSpeakerGender)
 * @param {object} input.recordist           {voiceId, spellings, gender}
 * @returns {{cuts: object[], skipped: object}} cuts: {sentenceId, courseCode, source, sentences, replace:[{index, current}]}
 */
function planSplitCuts({ podIds = [], sentences = [], clipById = new Map(), genderOf, recordist, genders = SPLIT_CUT_SPEAKER_GENDERS } = {}) {
  const pods = new Set(podIds)
  const mine = new Set((recordist && (recordist.spellings || [recordist.voiceId])) || [])
  const gender = String((recordist && recordist.gender) || '').toLowerCase()
  const cuts = []
  const skipped = { leftToOtherJob: 0, notSplit: 0, otherGender: 0, uncast: 0, noTake: 0, textCount: 0, unreadable: 0, done: 0 }
  for (const s of sentences) {
    if (!pods.has(s.pod_id)) continue
    if (POD_ENGLISH_REPLACE_LEFT_TO[s.id]) { skipped.leftToOtherJob++; continue }
    if (!playsInSentences(s)) { skipped.notSplit++; continue }
    const g = genderOf(s)
    if (!g) { skipped.uncast++; continue }
    if (!gender || g !== gender || !genders.includes(g)) { skipped.otherGender++; continue }
    const take = clipById.get(s.known_audio_id)
    if (!take || !isHumanClip(take) || !mine.has(take.voice_id)) { skipped.noTake++; continue }
    const known = s.sentence_known_audio_ids
    const texts = podSentencesOf(s.known_text)
    if (texts.length !== known.length) { skipped.textCount++; continue }
    const current = known.map((id) => clipById.get(id))
    if (current.some((c) => !c)) { skipped.unreadable++; continue }
    const replace = current.map((c, index) => ({ index, current: c.id })).filter((x) => !isHumanClip(current[x.index]))
    if (!replace.length) { skipped.done++; continue }
    cuts.push({ sentenceId: s.id, courseCode: courseOfPod(s.pod_id), source: take, sentences: texts, replace })
  }
  return { cuts, skipped }
}

/**
 * Sentence clips whose words are not their sentence of the line, re-cut from the line's own whole clip (any voice).
 * A clip that is human is never touched; a whole clip whose words are not the line's cannot be the source.
 */
function planWrongWordRepairs({ podIds = [], sentences = [], clipById = new Map() } = {}) {
  const pods = new Set(podIds)
  const repairs = []
  for (const s of sentences) {
    if (!pods.has(s.pod_id) || POD_ENGLISH_REPLACE_LEFT_TO[s.id]) continue
    const known = Array.isArray(s.sentence_known_audio_ids) ? s.sentence_known_audio_ids : []
    if (known.length < 2) continue
    const texts = podSentencesOf(s.known_text)
    if (texts.length !== known.length) continue
    const replace = []
    for (let i = 0; i < known.length; i++) {
      const c = clipById.get(known[i])
      if (c && !isHumanClip(c) && wordsOnly(c.text) !== wordsOnly(texts[i])) replace.push({ index: i, current: c.id })
    }
    if (!replace.length) continue
    const source = clipById.get(s.known_audio_id)
    if (!source || wordsOnly(source.text) !== wordsOnly(s.known_text)) continue
    repairs.push({ sentenceId: s.id, courseCode: courseOfPod(s.pod_id), source, sentences: texts, replace })
  }
  return { repairs }
}

/**
 * ONE CUT PER (ENGLISH WORDS, TAKE), SHARED BY EVERY COURSE THAT PLAYS THAT TAKE (Tom's design, agreed 2026-11-08, job #879).
 *
 * North and South Welsh Pod 1 carry the same 231 English lines, and where both whole-line English slots hold the SAME
 * clip (Aran's one take) their sentence pieces are the same recording too. Before this, the cut was planned only over
 * POD_ENGLISH_REPLACE_PODS (North) and its pieces were linked only into the row that was cut, so South never got any:
 * a second course meant a second cut of the same take, or none. Now a set of pieces is keyed by the take and the words,
 * and any pod row, in any course, whose whole English slot holds that take is linked to the SAME piece clips — no new
 * cutting, no second copy.
 *
 * pieceSetKey: the take's clip id + its object (a re-uploaded take is a new recording) + the line's words.
 */
const pieceSetKey = (sourceClip, knownText) => `${sourceClip.id}|${sourceClip.s3_key || ''}|${wordsOnly(knownText)}`

/**
 * Piece sets that already exist: a row whose whole English is a HUMAN take and whose every sentence clip is human and
 * of that take's voice has been cut already (a later job must not cut it again — it links to these).
 * @returns {Map<string, {source, sentences: string[], pieceIds: string[], fromRow: string}>}
 */
function existingPieceSets({ sentences = [], clipById = new Map() } = {}) {
  const sets = new Map()
  for (const s of sentences) {
    if (!playsInSentences(s)) continue
    const take = clipById.get(s.known_audio_id)
    if (!take || !isHumanClip(take)) continue
    const texts = podSentencesOf(s.known_text)
    if (texts.length !== s.sentence_known_audio_ids.length) continue
    const pieces = s.sentence_known_audio_ids.map((id) => clipById.get(id))
    if (pieces.some((p) => !p || !isHumanClip(p) || p.voice_id !== take.voice_id)) continue
    const key = pieceSetKey(take, s.known_text)
    if (!sets.has(key)) sets.set(key, { source: take, sentences: texts, pieceIds: pieces.map((p) => p.id), fromRow: s.id })
  }
  return sets
}

/**
 * Which other rows get the same pieces. `rows` are pod rows (any course) whose known_audio_id is a source take of a set.
 * A row is linked only where the learner hears it in sentences (playsInSentences — the arrays exist and pair), its words
 * are the set's words, and the sentence clip at each position is synthetic (a human piece, anybody's, is never replaced);
 * link-clip replaces by position, replace + expectCurrent. A row the learner hears WHOLE (no sentence arrays — South Pod 1
 * on 2026-11-08: its Welsh was never split, so the player plays every South line whole) is reported, never filled: there
 * is nothing to pair an English piece with, and link-clip refuses to fill an empty array (REPLACE_ONLY) by design.
 * @returns {{links: {courseCode, podSentenceId, role, audioId, replace, expectCurrent}[], notes: object}}
 */
function planSharedPieceLinks({ sets = new Map(), rows = [], clipById = new Map(), excludeRows = new Set() } = {}) {
  const links = []
  const notes = { heardWhole: [], otherWords: [], countDiffers: [], done: [], humanKept: [] }
  for (const r of rows) {
    if (excludeRows.has(r.id)) continue
    const take = clipById.get(r.known_audio_id)
    if (!take) continue
    const set = sets.get(pieceSetKey(take, r.known_text))
    if (!set) {
      if ([...sets.values()].some((x) => x.source.id === take.id)) notes.otherWords.push(r.id)
      continue
    }
    if (set.fromRow === r.id) continue
    if (!playsInSentences(r)) { notes.heardWhole.push(r.id); continue }
    if (r.sentence_known_audio_ids.length !== set.pieceIds.length) { notes.countDiffers.push(r.id); continue }
    let any = false
    r.sentence_known_audio_ids.forEach((current, index) => {
      const want = set.pieceIds[index]
      if (current === want) return
      const c = clipById.get(current)
      if (c && isHumanClip(c)) { notes.humanKept.push(`${r.id}#${index}`); return }
      any = true
      links.push({ courseCode: courseOfPod(r.pod_id), podSentenceId: r.id, role: 'knownsegment', audioId: want, replace: true, expectCurrent: current })
    })
    if (!any) notes.done.push(r.id)
  }
  return { links, notes }
}

module.exports = { SPLIT_CUT_GATES, SPLIT_CUT_SPEAKER_GENDERS, playsInSentences, spokenSyllables, judgeCut, planSplitCuts, planWrongWordRepairs,
  pieceSetKey, existingPieceSets, planSharedPieceLinks }
