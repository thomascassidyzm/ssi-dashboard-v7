/**
 * English is TWO voices (Tom 2026-10-12, r-2026-10-12-english-for-x-premium-courses-need: "Female voices are needed for the English for X premium courses",
 * "we want to keep the gender variance"). A known/target2 English line moves to the voice of its OWN gender: a line whose current clip is a female voice
 * (eve, Sonia, Olivia...) goes to Charlotte; every other line (male, or a voice in neither list) goes to Tom-006. Used by tools/audio/tom006-english.cjs.
 */
const { voiceGender, CHARLOTTE } = require('./charlotte-backfill.cjs')
const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const targetGender = oldVoice => (voiceGender(oldVoice) === 'f' ? 'f' : 'm')
const targetVoice = g => (g === 'f' ? CHARLOTTE : TOM_006)
module.exports = { targetGender, targetVoice, TOM_006, CHARLOTTE }
