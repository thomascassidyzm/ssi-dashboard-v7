'use strict'
/**
 * THE RENDER ROUTE SPEAKS A GENDERED KNOWN LINE IN ITS OWN GENDER'S VOICE (job #710, Kai 2026-10-29).
 *
 * POST /api/audio/render used to resolve a known-side voice from the role alone, so a male-form eng_for_hin line asked for
 * without a voiceId came out in the role default (Kriti) while phase8 /generate, which applies services/shared/known-voice-gender.cjs,
 * would have put it in Rehan. This is that same rule, applied at the route: when the caller names no voice and the course gives
 * its known (or presentation) role a byGender block, the voice is the one the TEXT resolves to. A caller-named voice is never
 * overridden (the voice policy and the re-record gate already judge it); a trial render links nothing and is left alone.
 * Inert on every course without byGender — loadCtx answers null there.
 */
const kv = require('./known-voice-gender.cjs')

/** @param {{courseCode:string, voices:object, role:string, text?:string, legoId?:string, voiceId?:string|null, trial?:boolean,
 *   loadCtx:(courseCode:string, voices:object)=>Promise<object|null>}} p  @returns the voiceId to render in (the caller's, or the gender's). */
async function knownGenderVoiceId({ courseCode, voices, role, text, legoId, voiceId, trial, loadCtx }) {
  if (voiceId || trial || !text || (role !== 'known' && role !== 'presentation')) return voiceId || null
  const ctx = await loadCtx(courseCode, voices || {})
  return kv.knownVoiceIdForClip(ctx, { role, text, legoId }) || null
}

module.exports = { knownGenderVoiceId }
