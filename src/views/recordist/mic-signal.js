/**
 * THE ONE MIC SIGNAL on the booth's live stage (Aran, 2026-10-14, job #424; design #419).
 *
 * The stage used to say what the microphone was doing in four places at once — an ON AIR pill,
 * the meter's own words, a green "Recording —" line with a live dot, and the auto-advance
 * sentence — and they could disagree. This is now the only place the state is put into words,
 * drawn as one chip with the waveform beside it.
 *
 * Playback, editing and Pause all HOLD the mic (`micHeld`), so whichever is true is the only one
 * that can be true: the order below is the order of precedence, and if this ever said two things
 * one of them would be a lie. Short words, because the chip shares one row with Stop, the count and
 * Pause on a 360px phone; the longer explanation goes in `title` (and, for Pause, in the note above
 * the line).
 */
export function micSignal({ editing = false, paused = false, playing = false, arming = false, clipping = false, meterTrusted = true, micDb = '' } = {}) {
  if (editing) return { cls: 'is-editing', word: 'Editing — mic paused', title: 'Editing the line — nothing is being recorded' }
  if (paused) return { cls: 'is-paused', word: 'Paused', title: 'Paused — nothing is being recorded' }
  if (playing) return { cls: 'is-playing', word: 'Listening back', title: 'Mic paused while you listen' }
  if (arming) return { cls: 'is-arming', word: 'Getting ready', title: 'Getting ready — the mic is already open' }
  if (clipping) return { cls: 'is-loud', word: 'Too loud', title: 'Too loud — back off the mic' }
  // A meter that is not delivering samples is not a quiet room: say which it is, and that the
  // take is kept either way (commit() only refuses a take the meter KNOWS was silent).
  if (!meterTrusted) return { cls: 'is-recording no-meter', word: 'Recording', title: 'Level meter not reading — every take will be saved' }
  return { cls: 'is-recording', word: 'Recording', title: micDb ? `Mic live · ${micDb}` : 'Mic live' }
}
