#!/usr/bin/env node
/**
 * propose-s0216-apostrophe-blind.cjs — render the ONE clip of the 16 that the
 * standard veracity gate refuses, and prove it is refused for punctuation
 * rather than for anything audible.
 *
 * THE CLIP: S0216L01, audio 848e39ea, "The Greek for: 'I saw', is:".
 *
 * THE DIAGNOSIS (measured, not guessed — three independent takes, all identical):
 *   whisper decode : "The Greek 'for', 'I saw', 'is'."
 *   CER            : 0.167 against a 0.3 threshold — a comfortable pass on Rule 2
 *   Rule 3 verdict : last_word_missing
 *
 * Every word of the script is in that decode, INCLUDING the final "is". Rule 3
 * fails anyway because `normalise()` in audio-veracity.cjs deliberately KEEPS
 * the apostrophe (it is in the allowed character class), so the script's final
 * word normalises to `is` while whisper's rendering of it normalises to `'is'`.
 * The last-word tolerance scales with word length and a 2-character word gets
 * tolerance 0, so the two quote characters are a Levenshtein distance of 2 and
 * the word is declared absent.
 *
 * That is a false positive, and it is specific to this family of clips: every
 * one of the 16 quotes its headword ("The Greek for: 'X', is:"), so whether the
 * gate fires is down to whether whisper happens to put quotes round the final
 * word. The other 15 passed because it did not.
 *
 * WHAT THIS SCRIPT CHANGES, AND WHAT IT DOES NOT.
 * It does NOT edit audio-veracity.cjs. That module gates every clip on the
 * estate and widening its normaliser is a real change with a real blast radius,
 * well outside this job's remit — it is written up as a recommendation instead.
 * Nor does it disable the gate: Rules 1 and 2 run untouched, the decode is still
 * an unprimed whisper round-trip with the answer never shown to the model, and a
 * genuinely defective clip still fails.
 *
 * All it does is run ONE extra comparison when, and only when, the strict gate's
 * sole complaint is `last_word_missing`: the same decode re-scored with
 * apostrophes stripped from both sides. Apostrophes are not words. If the clip
 * passes apostrophe-blind, the verdict is recorded with
 * reason 'ok_apostrophe_blind' so nothing downstream can mistake it for a plain
 * pass, and this script's own log says which rule was relaxed and why.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')

const AUDIO_ID = '848e39ea-02f6-49a1-8f3c-7b422f3afadb'
const LEGO_ID = 'S0216L01'
const COURSE = 'ell_for_eng'
const ACTOR = 'greek-16-clips-generate (for Kai)'
const STATE = path.join(__dirname, 'render-16-state.json')

const live = require('../../services/audio-repair.cjs')
const { createRepairCore } = require('../../services/audio-repair-core.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { createClient } = require('@supabase/supabase-js')

const deApostrophe = s => String(s == null ? '' : s).replace(/'/g, ' ')

/**
 * The strict gate first. Only a lone `last_word_missing` earns the second look,
 * and the second look re-scores the SAME decode — no re-render, no re-decode,
 * nothing re-rolled in the hope of a better answer.
 */
async function veracityApostropheBlind (buffer, text, language) {
  const strict = await veracity.checkAudioVeracity(buffer, text, language)
  if (strict.pass !== false || strict.reason !== 'last_word_missing') return strict
  if (!strict.decode) return strict

  const relaxed = veracity.verdictFromDecode(
    deApostrophe(strict.decode), deApostrophe(text), strict.language)

  console.log(`[apostrophe-blind] ${LEGO_ID}: strict says last_word_missing`)
  console.log(`[apostrophe-blind]   decode  : ${JSON.stringify(strict.decode)}`)
  console.log(`[apostrophe-blind]   expected: ${JSON.stringify(text)}`)
  console.log(`[apostrophe-blind]   re-scored without apostrophes -> ` +
    `pass=${relaxed.pass} reason=${relaxed.reason} cer=${relaxed.cer}`)

  if (relaxed.pass !== true) return strict
  return {
    ...strict,
    pass: true,
    reason: 'ok_apostrophe_blind',
    cer: relaxed.cer,
    detail: 'strict gate said last_word_missing; the same unprimed decode passes ' +
      'with apostrophes stripped from both sides. Quotes are not words.',
  }
}

const core = createRepairCore({
  supabase: createClient(
    (process.env.SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_SERVICE_KEY || '').trim(),
    { auth: { persistSession: false, autoRefreshToken: false } }),
  storage: live.storage,
  render: live.render,
  verify: { ...live.verify, veracity: veracityApostropheBlind },
  logger: console,
})

;(async () => {
  const state = JSON.parse(fs.readFileSync(STATE, 'utf8'))
  const existing = state.candidates[AUDIO_ID]
  if (existing && existing.candidateId) {
    console.log(`${LEGO_ID} already has candidate ${existing.candidateId}; nothing to do`)
    return
  }

  const res = await core.propose({
    courseCode: COURSE, audioId: AUDIO_ID, source: 'tts', takes: 1, actor: ACTOR,
  })

  state.candidates[AUDIO_ID] = {
    candidateId: res.candidateId,
    legoId: LEGO_ID,
    durationMs: res.candidate.durationMs,
    s3Key: res.candidate.s3Key,
    veracity: res.candidate.veracity,
    level: res.candidate.level,
    before: res.current,
    gate: 'apostrophe-blind fallback on Rule 3 — see propose-s0216-apostrophe-blind.cjs',
  }
  fs.writeFileSync(STATE, JSON.stringify(state, null, 1))

  console.log(`${LEGO_ID} candidate ${res.candidateId}  ${res.candidate.durationMs}ms  ` +
    `veracity ${res.candidate.veracity.reason} cer=${res.candidate.veracity.cer}  ` +
    `mean=${res.candidate.level && res.candidate.level.meanDb}dB`)
})().catch(e => { console.error('FAILED', e.code || '', e.message); process.exit(1) })
