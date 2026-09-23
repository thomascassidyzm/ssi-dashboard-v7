/**
 * PER-VOICE LOUDNESS OFFSET — how loud a voice is mastered, decided at the voice.
 *
 * Kai's ruling, 2026-09-23: Cartesia Charlotte sounds quiet at equal LUFS. He
 * listened to +3 and +5 dB versions against the house target and ruled +5 dB,
 * true-peak limiter still applied. So wherever Charlotte is rendered she is
 * mastered to -11 LUFS rather than -16; Gemma and every other voice are
 * unchanged.
 *
 * The number lives in DATA — `voices.loudness_offset_db`, NOT NULL DEFAULT 0 —
 * because it is a fact about a voice, not about a course or a role, and a
 * voice cast into any slot on any course carries it with her. This module is
 * the whole of the arithmetic: the house target plus the offset, and nothing
 * else. It does not touch the true-peak limiter, the tolerance or the pass
 * count in services/audio-processor.cjs; those still guard every clip.
 *
 * SCOPE, stated so it cannot creep: a voice with no row, a row with no offset,
 * or an offset that is not a finite number masters at the house target exactly
 * as before. The offset is clamped to ±MAX_OFFSET_DB so a typo in the column
 * cannot master a course at -4 LUFS.
 */

'use strict';

const { voiceSpellings } = require('./clip-identity-lookup.cjs');

const HOUSE_TARGET_LUFS = -16.0;
const MAX_OFFSET_DB = 12;

/** The offset a voice carries, read from a `voices` row; 0 when it says nothing usable. */
function offsetOfVoiceRow(row) {
  const n = row ? Number(row.loudness_offset_db) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_OFFSET_DB, Math.min(MAX_OFFSET_DB, n));
}

/**
 * Find the voice's row under any spelling of its id (bare, provider-prefixed)
 * and return its offset. `voices` is the same array the cast reader loads.
 */
function loudnessOffsetDb(voices, voiceId, provider = null) {
  if (!voiceId || !Array.isArray(voices) || !voices.length) return 0;
  const byId = new Map(voices.map((v) => [v.voice_id, v]));
  for (const spelling of voiceSpellings(String(voiceId), { provider })) {
    if (byId.has(spelling)) return offsetOfVoiceRow(byId.get(spelling));
  }
  return 0;
}

/** The mastering target for a voice: house target plus its offset. */
function masteringTargetLufs(offsetDb, houseTargetLufs = HOUSE_TARGET_LUFS) {
  const o = Number.isFinite(Number(offsetDb)) ? Number(offsetDb) : 0;
  return Math.round((houseTargetLufs + Math.max(-MAX_OFFSET_DB, Math.min(MAX_OFFSET_DB, o))) * 100) / 100;
}

module.exports = { HOUSE_TARGET_LUFS, MAX_OFFSET_DB, offsetOfVoiceRow, loudnessOffsetDb, masteringTargetLufs };
