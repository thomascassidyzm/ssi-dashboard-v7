/**
 * THE "POD 1 ENGLISH" CARD — the English (known) side of Pod 1, North and South, on one card in the English booth
 * (Aran, 2026-10-29, job #537: "give me the Pod1 English recordings (for north and south, we can re-use) as a separate
 * card in my English recording booth").
 *
 *   podeng:<listening_pod_sentences.id>
 *
 * WHICH PODS: POD_ENGLISH_PODS, and only for a reader whose language policy casts it on that pod's course's KNOWN side
 * (castOn {courseCode, role: 'known'} — the same cast that puts the course's English seed sentences in his booth,
 * job #588). Nobody else gets the card, and a take on a pod this reader is not cast on is refused (404).
 *
 * ONE TAKE PER SPOKEN WORDS (shared/spoken-words.cjs; "LEGO = sentence", job #198): North and South Pod 1 carry the same
 * English, so a line is the UNION of both pods collapsed by spoken words — on 29 Oct all 231 lines were identical in
 * both. The line keeps North's place (config order) and every copy rides in `duplicateOf`; its take is offered to every
 * copy's known slot.
 *
 * FILL-ONLY, like every castOn cast (recordist-queue castOnEntries). A known slot that already holds a clip — North's
 * Pod 1 English is all synthetic speech today — is left exactly as it is: replacing a synthetic clip on a live course is
 * a separate, approved act (the #619 ruling), not a side effect of a take. South's empty slots fill. Aran approved that
 * act for North Pod 1 on 2026-10-29 (job #555): POD_ENGLISH_REPLACE_PODS / planPodEnglishReplacements below — synthetic
 * clips only, through link-clip's replace + expectCurrent, never a human take.
 *
 * Recorded = this voice fills any copy's known slot, or has any English take of the words (knownByText) — so a line he
 * has already said on another card counts here too and is never asked for again.
 *
 * Wire kind 'podknown', role 'known': booth-home trackKeyOf `podknown.<podSlug>` is the card, read whole like a script.
 *
 * A LINE IS READ BY A VOICE OF ITS SPEAKER'S GENDER (Aran, 2026-10-29 14:46Z, job #562: "I can't do the female voices for
 * the Pod1 English, those will need to be Catrin. Can you separate them out"). A pod line is spoken by a character, and the
 * course's own cast (courses.voice_config.podCast[speaker].gender — the same entry that puts its Welsh in Aran's or
 * Catrin's booth) says whether that character is a man or a woman. So a reader gets, and a take fills, only the copies
 * whose speaker's gender is the reader's own policy gender: Aran ('m') the men's lines, Catrin's English voice ('f',
 * cast by `podEnglishOn` below) the women's. One take still serves North and South wherever both copies are of the
 * reader's gender. Where the two courses cast the same words differently — North's Learner is a man (Aran), South's a
 * woman (Eleri); North's "Local Speaker" a woman, South's "Local" a man — the line is on BOTH cards, each filling only
 * its own course's copy. A speaker with no gender in its course's cast is on nobody's card (never guessed).
 *
 * A reader can be cast on this card ALONE with `podEnglishOn: [courseCode…]` on its policy entry, so a reader who should
 * not inherit a castOn's seed sentences, phrases or LEGOs (Catrin's English voice) reads Pod 1 English and nothing else.
 *
 * Pure: no I/O. The reads are recordist-queue fetchPodEnglishInputs; the take is recordist-router recordPodEnglishTake.
 */
'use strict'

const { spokenWordsKey } = require('../shared/spoken-words.cjs')
const { normalizeForDb } = require('../shared/text-normalize.cjs')
const { isHumanClip } = require('../shared/human-take-guard.cjs')
const { canonicalSpeakerName } = require('./pods-registration.cjs')
// A row whose English is waiting on a make-before-break swap (job #551) is offered with its NEW words: North's
// "Good morning, Sarah!" reads as "Good morning, Siân!" here, and so collapses with South's line of those words.
const { withPendingText } = require('./pod-text-swaps.cjs')

const POD_ENGLISH_PREFIX = 'podeng:'

/** Pods whose English is on the card, in card order: a line shared by both keeps the first pod's place. */
const POD_ENGLISH_PODS = Object.freeze(['cym_n_for_eng:pod-1', 'cym_s_for_eng:pod-1'])

const courseOfPod = (podId) => String(podId).split(':')[0]

function podEnglishLineId(sentenceId) { return `${POD_ENGLISH_PREFIX}${sentenceId}` }

/** `podeng:<sentenceId>` → {sentenceId}; null for anything else. A sentence id carries colons of its own. */
function parsePodEnglishLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(POD_ENGLISH_PREFIX)) return null
  const sentenceId = raw.slice(POD_ENGLISH_PREFIX.length)
  return sentenceId ? { sentenceId } : null
}

/**
 * The card's pods this reader reads, in card order.
 * @param {object} recordist {voiceId, spellings}
 * @param {object[]} policyVoices the language's policy voices (recordist-queue policyVoiceList shape: voiceId, aliases, castOn)
 */
function podEnglishPodsFor(recordist, policyVoices, pods = POD_ENGLISH_PODS) {
  const spellings = new Set(recordist.spellings || [recordist.voiceId])
  const knownCourses = new Set()
  for (const v of policyVoices || []) {
    if (!spellings.has(v.voiceId) && !(v.aliases || []).some((a) => spellings.has(a))) continue
    for (const c of v.castOn || []) if (c.role === 'known') knownCourses.add(c.courseCode)
    for (const c of v.podEnglishOn || []) knownCourses.add(c)
  }
  return pods.filter((p) => knownCourses.has(courseOfPod(p)))
}

/** `podEnglishOn` on a policy entry: the course codes whose Pod 1 English this voice reads, and nothing else (job #562). */
function podEnglishOnEntries(raw) {
  return Array.isArray(raw) ? [...new Set(raw.map((c) => String(c || '').trim()).filter(Boolean))] : []
}

/**
 * The gender of the character who speaks a pod line, from its course's cast; null when the cast does not say. The cast
 * key is the speaker's canonical name ("Neighbour (8 am)" → "Neighbour", pods-registration), or the raw name.
 * @param {object} sentence {pod_id, speaker}
 * @param {object} podCastByCourse courseCode → voice_config.podCast
 * @returns {'m'|'f'|null}
 */
function podSpeakerGender(sentence, podCastByCourse = {}) {
  if (!sentence) return null
  const cast = podCastByCourse[courseOfPod(sentence.pod_id)] || {}
  const speaker = String(sentence.speaker || '')
  const entry = cast[canonicalSpeakerName(speaker)] || cast[speaker] || null
  const g = entry && entry.gender ? String(entry.gender).trim().toLowerCase() : ''
  return g === 'm' || g === 'f' ? g : null
}

/** Every Pod 1 English reader's spellings → that reader's gender (whose human take sits on the wrong gender's line). */
function podEnglishReaderGenders(policyVoices) {
  const out = new Map()
  for (const v of policyVoices || []) {
    if (!v.gender || !podEnglishPodsFor({ voiceId: v.voiceId, spellings: [v.voiceId] }, [v]).length) continue
    for (const sp of [v.voiceId, ...(v.aliases || [])]) out.set(sp, v.gender)
  }
  return out
}

/** Is this copy this reader's to read? Its speaker's gender is the reader's own. */
function isReadersGender(sentence, recordist, podCastByCourse) {
  const g = podSpeakerGender(sentence, podCastByCourse)
  return !!g && g === String((recordist && recordist.gender) || '').toLowerCase()
}

/**
 * This reader's Pod 1 English lines, queue-shaped.
 *
 * @param {object} recordist {voiceId}
 * @param {object} input
 * @param {string[]} input.podIds    podEnglishPodsFor's answer
 * @param {object[]} input.pods      listening_pods rows {id, course_code, slug, title}
 * @param {object[]} input.sentences listening_pod_sentences rows {id, pod_id, global_order, speaker, target_text, known_text, known_audio_id}
 * @param {Map} [input.slotVoiceById] known clip id → voice id
 * @param {object} [input.podCastByCourse] courseCode → voice_config.podCast: only copies whose speaker is of the reader's
 *        gender are this reader's (job #562). No cast read = no lines: a card is never built from guessed speakers.
 */
function podEnglishLinesFor(recordist, { podIds = [], pods = [], sentences = [], slotVoiceById = new Map(), podCastByCourse = {} } = {}) {
  if (!podIds.length) return []
  const rank = new Map(podIds.map((p, i) => [p, i]))
  const podById = new Map(pods.map((p) => [p.id, p]))
  const wanted = sentences
    .map((s) => withPendingText(s))
    .filter((s) => rank.has(s.pod_id) && podById.has(s.pod_id) && isReadersGender(s, recordist, podCastByCourse))
    .sort((a, b) => (rank.get(a.pod_id) - rank.get(b.pod_id)) || (a.global_order - b.global_order) || String(a.id).localeCompare(String(b.id)))
  const seen = new Map()
  const out = []
  for (const s of wanted) {
    const text = String(s.known_text || '').trim()
    const key = spokenWordsKey(text)
    if (!key) continue
    const pod = podById.get(s.pod_id)
    const filler = slotVoiceById.get(s.known_audio_id) || null
    if (seen.has(key)) {
      const rep = seen.get(key)
      rep.duplicateOf.push({ sentenceId: s.id, courseCode: pod.course_code })
      rep.filledBy.push(filler)
      continue
    }
    const line = {
      id: podEnglishLineId(s.id),
      podId: s.pod_id,
      podSlug: pod.slug || null,
      podTitle: pod.title || null,
      order: s.global_order,
      seedOrder: 0,
      text,
      // The crib: what the line says in Welsh (the first pod's words).
      knownText: String(s.target_text || '').trim() || null,
      speaker: s.speaker || null,
      speakerGender: podSpeakerGender(s, podCastByCourse),
      courseCode: pod.course_code,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: 'podknown',
      role: 'known',
      knownByText: true,
      filledBy: [filler],
      readStyle: 'natural',
      rerecordWanted: false,
    }
    seen.set(key, line)
    out.push(line)
  }
  return out
}

/**
 * The words a parsed line stands for, if the reader reads that pod's English. Null = not theirs: the take route
 * answers 404, never files.
 * A line spoken by a character of the other gender is not theirs either (job #562).
 * @param {object} sentence listening_pod_sentences row {id, pod_id, speaker, known_text}
 * @param {object} podCastByCourse courseCode → voice_config.podCast
 */
function resolvePodEnglish(sentence, recordist, policyVoices, podCastByCourse = {}) {
  if (!sentence || !recordist) return null
  if (!podEnglishPodsFor(recordist, policyVoices).includes(sentence.pod_id)) return null
  if (!isReadersGender(sentence, recordist, podCastByCourse)) return null
  const text = String(withPendingText(sentence).known_text || '').trim()
  return text ? { courseCode: courseOfPod(sentence.pod_id), sentenceId: sentence.id, text } : null
}

/**
 * NORTH'S SYNTHETIC POD 1 ENGLISH IS REPLACED BY HIS TAKES (Aran, 2026-10-29 14:39Z, job #555: "Replace North's computer
 * English with your Pod 1 takes as they land? Y"). The approved act the fill-only rule above waited for, for these pods
 * only. South is not here: its slots were empty and fill.
 */
const POD_ENGLISH_REPLACE_PODS = Object.freeze(['cym_n_for_eng:pod-1'])

/** Lines another job owns: job #551 swaps the two Sian lines make-before-break. This sweep never touches them. */
const POD_ENGLISH_REPLACE_LEFT_TO = Object.freeze({
  'cym_n_for_eng:pod-1:SC01-S001': 'job #551',
  'cym_n_for_eng:pod-1:SC05-S001': 'job #551',
})

/**
 * Which known slots of the replace pods move to one of this reader's takes. Pure.
 *
 * A slot moves only when ALL of: its pod is a replace pod the reader is cast on (podIds); no other job owns it; the clip it
 * holds now was read and is NOT a human recording (human-take-guard isHumanClip — origin 'human' or a human_ voice id; an
 * unreadable clip is left alone, not knowing is not permission); and the reader has a HUMAN take whose words are the slot's
 * words exactly (normalizeForDb, the same test link-clip makes), the newest one winning. An empty slot is not this
 * function's business: the fill above handles it.
 *
 * GENDER (job #562): a slot moves only to a take of a reader of its SPEAKER's gender (genderOf). And a slot holding a
 * HUMAN take of a reader of the OTHER gender (wrongVoices — Aran's takes filled South's women's lines before 14:46Z on
 * 29 Oct) is replaced by the right reader's take, on any card pod, make-before-break: that take is already stored, the
 * wrong one stays in course_audio unattached. A human take of anyone else is still never moved.
 *
 * @param {object} input
 * @param {string[]} input.podIds         replace pods this reader reads
 * @param {object[]} input.sentences      {id, pod_id, known_text, known_audio_id}
 * @param {Map} input.currentById         clip id -> {id, voice_id, origin}
 * @param {object[]} input.takes          the reader's clips {id, text, voice_id, origin, created_at}
 * @param {Function} [input.genderOf]     sentence -> 'm'|'f'|null (podSpeakerGender); with readerGender, filters by gender
 * @param {string} [input.readerGender]
 * @param {Map} [input.wrongVoices]       voice id -> gender, every Pod English reader's spellings
 * @param {string[]} [input.syntheticPods] the pods whose SYNTHETIC clips may be replaced (POD_ENGLISH_REPLACE_PODS)
 * @returns {{links: object[], skipped: object}} links in link-clip's shape (podSentenceId, role known, replace + expectCurrent)
 */
function planPodEnglishReplacements({ podIds = [], sentences = [], currentById = new Map(), takes = [], genderOf = null, readerGender = null,
  wrongVoices = new Map(), syntheticPods = POD_ENGLISH_REPLACE_PODS } = {}) {
  const pods = new Set(podIds)
  const synthPods = new Set(syntheticPods)
  const newest = new Map()
  for (const t of takes) {
    if (!isHumanClip(t)) continue
    const k = normalizeForDb(String(t.text || ''))
    if (!k) continue
    const cur = newest.get(k)
    if (!cur || String(t.created_at || '') > String(cur.created_at || '')) newest.set(k, t)
  }
  const links = []
  const skipped = { leftToOtherJob: 0, human: 0, unreadable: 0, noTake: 0, empty: 0, otherGender: 0, syntheticElsewhere: 0 }
  for (const s of sentences) {
    if (!pods.has(s.pod_id)) continue
    if (POD_ENGLISH_REPLACE_LEFT_TO[s.id]) { skipped.leftToOtherJob++; continue }
    const lineGender = genderOf ? genderOf(s) : null
    if (genderOf && (!lineGender || lineGender !== readerGender)) { skipped.otherGender++; continue }
    if (!s.known_audio_id) { skipped.empty++; continue }
    const current = currentById.get(s.known_audio_id)
    if (!current) { skipped.unreadable++; continue }
    if (isHumanClip(current)) {
      const heldBy = wrongVoices.get(current.voice_id)
      if (!(lineGender && heldBy && heldBy !== lineGender)) { skipped.human++; continue }
    } else if (!synthPods.has(s.pod_id)) { skipped.syntheticElsewhere++; continue }
    const take = newest.get(normalizeForDb(String(s.known_text || '')))
    if (!take) { skipped.noTake++; continue }
    links.push({ podSentenceId: s.id, courseCode: courseOfPod(s.pod_id), role: 'known', audioId: take.id, replace: true, expectCurrent: s.known_audio_id, was: current.voice_id })
  }
  return { links, skipped }
}

module.exports = {
  POD_ENGLISH_REPLACE_PODS, POD_ENGLISH_REPLACE_LEFT_TO, planPodEnglishReplacements,
  podEnglishOnEntries, podSpeakerGender, isReadersGender, podEnglishReaderGenders,
  POD_ENGLISH_PREFIX, POD_ENGLISH_PODS, podEnglishLineId, parsePodEnglishLineId, podEnglishPodsFor, podEnglishLinesFor, resolvePodEnglish,
}
