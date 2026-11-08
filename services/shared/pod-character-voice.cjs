/**
 * ONE CHARACTER, ONE ENGLISH VOICE (job #932, 2026-11-08).
 *
 * A Welsh pod's English is cast per CHARACTER, never per line. #891 cast Welsh Pod 1's English line by line, #913 moved the men
 * only, and a cold check (Astra, 15:39Z) found characters whose English switched between a woman's and a man's voice from one line
 * to the next — Customer in both courses, North Bar Customer 3, North Chat Learner — while a per-line census read 0/0/0, because
 * it compared each line with that line's own role sex and never asked whether one character keeps one voice. Tom: "what???? how
 * have we not fixed this???".
 *
 * WHO a character is: its speaker name within one pod (listening_pod_sentences.speaker, "Neighbour (8 am)" and "Neighbour" being
 * the same speaker field). WHAT SEX it is: the sex of the HUMAN Welsh voice its lines are spoken in — the Welsh stays human
 * (r-2026-11-08-welsh-courses-the-welsh-stays-human) and is fixed, so it is the one fact a later pass cannot move. The pod cast map
 * answers only when no line of the character has a known human Welsh voice. If one label carries Welsh voices of both sexes (two
 * people sharing a label) the character is a SPLIT LABEL and each line follows its own Welsh speaker.
 *
 * WHICH English voice follows from the sex, through englishPodKnownVoice (shared/pod-line-voice.cjs): Charlotte for a woman,
 * Aran's own take or his PRO clone for a man in a Welsh course. The render route asks this for EVERY English known-side clip of a
 * Welsh pod — whole line, Listen piece or Drill piece — so a piece can no longer be rendered without saying whose line it is.
 *
 * Pure: the route reads the rows, this decides.
 */
'use strict'

/** The human voices of the Welsh pods, by the person behind them. A voice missing here is never guessed. */
const HUMAN_VOICE_SEX = Object.freeze({
  human_aran_cym_n: 'm',
  human_aran_cym_s: 'm',
  human_catrinlliar_cym_n: 'f',
  human_catrinlliar_cym_s: 'f',
  human_eleri_cym_s: 'f',
  human_dan_cym_s: 'm',
  human_aran_eng: 'm', // Aran's own English takes: a man's voice, never on a woman's line
})

const sexOfHumanVoice = (v) => HUMAN_VOICE_SEX[String(v || '').trim().toLowerCase()] || null

/**
 * The sex of a character.
 *   lineWelshVoice   the Welsh (target) clip voice of the line being voiced
 *   characterWelshVoices   the Welsh clip voices of every line of that speaker in the pod
 *   castGender   the pod cast map's gender for the speaker ('f' | 'm' | null)
 * → { sex: 'f'|'m'|null, split: boolean, source: 'welsh-voice'|'line-welsh-voice'|'cast-map'|null }
 */
function characterSex({ lineWelshVoice = null, characterWelshVoices = [], castGender = null } = {}) {
  const sexes = new Set(characterWelshVoices.map(sexOfHumanVoice).filter(Boolean))
  if (sexes.size === 1) return { sex: [...sexes][0], split: false, source: 'welsh-voice' }
  if (sexes.size > 1) {
    // Two people under one label: the English follows this line's own Welsh speaker (job #932 default; Tom decides the label).
    const own = sexOfHumanVoice(lineWelshVoice)
    return { sex: own, split: true, source: own ? 'line-welsh-voice' : null }
  }
  const g = castGender === 'f' || castGender === 'm' ? castGender : null
  return { sex: g, split: false, source: g ? 'cast-map' : null }
}

module.exports = { HUMAN_VOICE_SEX, sexOfHumanVoice, characterSex }
