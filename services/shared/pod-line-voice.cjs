/**
 * THE VOICE OF A POD LINE IS THE VOICE THAT LINE ALREADY SPEAKS IN (job #799, 2026-11-03).
 *
 * resolveVoice (shared/resolve-voice.cjs) governs course SLOTS — seed, LEGO, phrase — and says so: "Pods … are not slots
 * here". A pod is a cast conversation. Rendering a changed pod line through the one route used to resolve the course's
 * single slot voice (English known → Tom-006 for every speaker), so an edited woman's line would switch voice mid-scene;
 * naming the right voice was refused as hand-picked (VOICE_POLICY). #794 found it; #799 needed it for Scene 4's coffee
 * lines across 64 courses.
 *
 * WHICH voice: the voice of the row's OWN current whole-turn clip on that side, read from course_audio — the voice the
 * learner already hears this speaker in, in this scene. Only when the row has no clip on that side does the pod's cast map
 * (listening_pods.speakers) answer. Why not the cast map first: on 2026-11-03 ita_for_eng Pod 1's map still named tom_001
 * for every man's English while every served clip of every man's line was Tom-006 (the clips were moved, the map was not);
 * the map would have made Friend's edited line the one Tom-001 line in a Tom-006 scene.
 *
 * Voices are still never hand-picked: the route takes the answer from the database and refuses a caller-named voice that
 * differs. link-clip already skips the slot voice check for pod sentences (link-clip.cjs), so a clip made here attaches.
 *
 * Pure: give it the pod row, the sentence row, the role and (optionally) the voice of the row's current clip on that side.
 */
'use strict'

const SIDE = { known: 'known', target1: 'target', target2: 'target' }
const PREFIX = /^(azure|elevenlabs|xai|cartesia|google)_/

/** The cast entry for a speaker label: exact key, then a key whose variants list it, then the label without "(7 pm)". */
function castFor(speakers, label) {
  if (!speakers || typeof speakers !== 'object' || !label) return null
  if (speakers[label]) return speakers[label]
  for (const v of Object.values(speakers)) if (Array.isArray(v && v.variants) && v.variants.includes(label)) return v
  const bare = String(label).replace(/\s*\([^)]*\)\s*$/, '').trim()
  return bare !== label && speakers[bare] ? speakers[bare] : null
}

/** The audio column a role's side reads on a pod row. */
const clipColumnFor = (role) => (SIDE[role] === 'known' ? 'known_audio_id' : SIDE[role] === 'target' ? 'target_audio_id' : null)

function podLineVoice({ pod, sentence, role, courseCode, currentClipVoice = null }) {
  const side = SIDE[role]
  if (!side) return { error: `a pod line is voiced on the known or target side only — role ${role} does not apply`, code: 'POD_ROLE' }
  if (!sentence) return { error: 'no such pod sentence', code: 'NO_POD_SENTENCE' }
  if (!pod || pod.course_code !== courseCode) return { error: `${sentence.id} is not a pod line of ${courseCode}`, code: 'NO_POD_SENTENCE' }
  if (currentClipVoice) {
    const m = PREFIX.exec(currentClipVoice)
    const provider = m ? m[1] : 'cartesia'
    const bare = String(currentClipVoice).replace(PREFIX, '')
    return { voiceId: `${provider}_${bare}`, bareVoiceId: bare, provider, speaker: sentence.speaker, side, source: 'current-clip' }
  }
  const cast = castFor(pod.speakers, sentence.speaker)
  const v = cast && cast[side]
  if (!v || !v.voice_id) return { error: `${pod.id} line ${sentence.id} has no ${side}-side clip and no cast voice for speaker "${sentence.speaker}"`, code: 'POD_UNCAST' }
  const provider = v.provider || 'cartesia'
  const bare = String(v.voice_id).replace(PREFIX, '')
  return { voiceId: `${provider}_${bare}`, bareVoiceId: bare, provider, speaker: sentence.speaker, side, source: 'pod-cast' }
}

/**
 * THE ENGLISH POD VOICES (Tom 2026-11-08, r-2026-11-08-the-female-english-pod-voice-is: "Charlotte is the female English pod,
 * not Gemma" — "not Gemma, not Olivia; synthetic women's English pod lines and pieces use Charlotte until a human take
 * replaces them"; before it r-2026-10-26-every-pod-1-english-line-charlotte and r-2026-09-30). A pod's ENGLISH known side —
 * whole line, Listen sentence clip or Drill piece, in any *_for_eng course — is spoken by a human take, or by Charlotte (a
 * woman's line) / Tom-006 (a man's line). Nothing else — except in a WELSH course, below.
 *
 * WELSH COURSES, MEN'S LINES (Tom 2026-11-08, job #913: "we have Aran's pro clone for any English needed"; Tom's Tom-clone ban
 * r-2026-10-13 rules Tom-006 out there): a Welsh course's man's English pod line is Aran's own human take, and where a piece
 * has no take of his it is Aran's PRO clone (STANDIN_VOICE, shared/aran-clone-standin.cjs — the ONE place that names it, so a
 * switch of the stand-in voice follows here). Welsh courses only: in every other course the clone is refused like any other
 * non-pair voice. Never on a woman's line. Aran's real booth takes replace these clips later, make-before-break (his
 * 2026-10-29 ruling).
 *
 * The specimen (job #905): #891 rendered 43 Welsh Pod 1 women's English pieces in Cartesia "Gemma". The route let it through
 * because a trial + podSide render (how every Drill piece is made) was exempt from every voice rule and took the caller's
 * voiceId as given; a pod line re-render also kept whatever voice the line's current clip had, so a Gemma line stayed Gemma.
 * The render route now asks this function for every English known-side pod clip and refuses any other synthetic voice.
 *
 *   englishPodKnownVoice({ courseCode, voiceId, gender })
 *     voiceId  the voice about to speak (null = not yet chosen); gender 'f' | 'm' | null (null = the caller cannot say)
 *     → { voiceId }                    this voice speaks it (unchanged, or the pair voice for the gender when none was chosen)
 *     → { refuse: true, code, message }
 */
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const ENGLISH_POD_VOICE = Object.freeze({ f: CHARLOTTE, m: TOM_006 })
const ENGLISH_POD_RULING = 'r-2026-11-08-the-female-english-pod-voice-is (Tom: "Charlotte is the female English pod, not Gemma")'
const bareOf = (v) => String(v || '').trim().toLowerCase().replace(PREFIX, '')

function englishPodKnownVoice({ courseCode = null, voiceId = null, gender = null } = {}) {
  const { isTomCloneVoice, isWelshCourse } = require('./welsh-no-tom-clone.cjs')
  const { STANDIN_VOICE } = require('./aran-clone-standin.cjs')
  const refuse = (message) => ({ refuse: true, code: 'POD_ENGLISH_VOICE', message: `${courseCode || 'pod'} English known side: ${message} — ${ENGLISH_POD_RULING}` })
  const welsh = isWelshCourse(courseCode)
  if (!voiceId) {
    if (gender === 'f') return { voiceId: CHARLOTTE }
    if (gender === 'm') {
      if (!welsh) return { voiceId: TOM_006 }
      // A Welsh man's line with no take of Aran's: his PRO clone (Tom 2026-11-08, "we have Aran's pro clone for any English needed").
      if (STANDIN_VOICE) return { voiceId: STANDIN_VOICE }
      return refuse("a Welsh course's men's English is Aran's own take or his clone, and no clone is set")
    }
    return refuse('no voice named and no speaker gender to choose Charlotte or Tom-006 by')
  }
  if (/^human_/i.test(String(voiceId))) {
    // A human take is never replaced here — but a man's take on a woman's character (or the reverse) is a voice switch inside
    // one character, and is refused like a synthetic one (job #932). A human voice whose sex is not on record passes as before.
    const hs = require('./pod-character-voice.cjs').sexOfHumanVoice(voiceId)
    if (hs && gender && hs !== gender) return refuse(`${voiceId} is a ${hs === 'm' ? "man's" : "woman's"} take and this character is a ${gender === 'm' ? 'man' : 'woman'}`)
    return { voiceId }
  }
  const bare = bareOf(voiceId)
  if (bare === bareOf(CHARLOTTE)) return gender === 'm' ? refuse(`Charlotte is a woman's voice and this is a man's line`) : { voiceId }
  if (bare === bareOf(TOM_006)) {
    if (welsh && isTomCloneVoice(voiceId)) return refuse('Tom-006 is a Tom clone, never used in a Welsh course (r-2026-10-13)')
    return gender === 'f' ? refuse(`Tom-006 is a man's voice and this is a woman's line — Charlotte speaks it`) : { voiceId }
  }
  // Aran's PRO clone: WELSH courses only, men's lines only (Tom 2026-11-08, job #913: "we have Aran's pro clone for any English
  // needed"). Outside Welsh it is refused like any other non-pair voice — his clone is for Welsh courses, not a third English voice.
  if (STANDIN_VOICE && bare === bareOf(STANDIN_VOICE)) {
    if (!welsh) return refuse(`Aran's clone speaks English pod lines in Welsh courses only; a man's line here is Tom-006 (${TOM_006}) or a human take`)
    return gender === 'f' ? refuse(`Aran's clone is a man's voice and this is a woman's line — Charlotte speaks it`) : { voiceId }
  }
  return refuse(welsh
    ? `${voiceId} is not a Welsh English pod voice; a woman's line is Charlotte (${CHARLOTTE}), a man's Aran's take or his clone (${STANDIN_VOICE}), never a Tom clone`
    : `${voiceId} is not an English pod voice; a woman's line is Charlotte (${CHARLOTTE}), a man's Tom-006 (${TOM_006}), or a human take`)
}

module.exports = { podLineVoice, castFor, clipColumnFor, englishPodKnownVoice, ENGLISH_POD_VOICE }
