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

module.exports = { podLineVoice, castFor, clipColumnFor }
