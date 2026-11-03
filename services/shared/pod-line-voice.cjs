/**
 * THE VOICE OF A POD LINE IS THE POD'S CAST FOR THAT LINE'S SPEAKER (job #799, 2026-11-03).
 *
 * resolveVoice (shared/resolve-voice.cjs) governs course SLOTS — seed, LEGO, phrase — and says so: "Pods … are not slots
 * here". A pod is a cast conversation: listening_pods.speakers maps each speaker to a known-side and a target-side voice
 * (ita_for_eng Pod 1: Sarah = Charlotte / Alessandra, Friend = tom_001 / Lorenzo). Rendering a changed pod line through
 * the one route used to resolve the course's single slot voice (English known → Tom-006), so an edited line would switch
 * voice mid-scene; naming the cast voice was refused as hand-picked (VOICE_POLICY). #794 found it; #799 needed it for
 * Scene 4's coffee lines across 64 courses.
 *
 * So a render that names `podSentenceId` takes the voice FROM THE DATABASE — the pod row's cast for the line's speaker,
 * on the role's side — never from the caller. A caller-named voice that differs is refused, exactly as resolveVoice
 * refuses one for a slot: voices are still never hand-picked. link-clip already skips the slot voice check for pod
 * sentences (link-clip.cjs), so a clip made here attaches.
 *
 * Pure: give it the pod row, the sentence row and the role; it answers { voiceId, provider } or { error }.
 */
'use strict'

const SIDE = { known: 'known', target1: 'target', target2: 'target' }

/** The cast entry for a speaker label: exact key, then a key whose variants list it, then the label without "(7 pm)". */
function castFor(speakers, label) {
  if (!speakers || typeof speakers !== 'object' || !label) return null
  if (speakers[label]) return speakers[label]
  for (const v of Object.values(speakers)) if (Array.isArray(v && v.variants) && v.variants.includes(label)) return v
  const bare = String(label).replace(/\s*\([^)]*\)\s*$/, '').trim()
  return bare !== label && speakers[bare] ? speakers[bare] : null
}

function podLineVoice({ pod, sentence, role, courseCode }) {
  const side = SIDE[role]
  if (!side) return { error: `a pod line is voiced on the known or target side only — role ${role} does not apply`, code: 'POD_ROLE' }
  if (!sentence) return { error: 'no such pod sentence', code: 'NO_POD_SENTENCE' }
  if (!pod || pod.course_code !== courseCode) return { error: `${sentence.id} is not a pod line of ${courseCode}`, code: 'NO_POD_SENTENCE' }
  const cast = castFor(pod.speakers, sentence.speaker)
  const v = cast && cast[side]
  if (!v || !v.voice_id) return { error: `${pod.id} has no ${side}-side cast voice for speaker "${sentence.speaker}" — cast the pod first`, code: 'POD_UNCAST' }
  const provider = v.provider || 'cartesia'
  const bare = String(v.voice_id).replace(/^(azure|elevenlabs|xai|cartesia|google)_/, '')
  return { voiceId: `${provider}_${bare}`, bareVoiceId: bare, provider, speaker: sentence.speaker, side }
}

module.exports = { podLineVoice, castFor }
