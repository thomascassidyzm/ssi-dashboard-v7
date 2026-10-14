// services/shared/policy-voice-patch.cjs
//
// ONE VOICE SLOT OF A LANGUAGE'S RECORDING POLICY, EDITED WITHOUT REWRITING THE
// LIST (job #410, 2026-10-14). PUT /api/recording/languages/:language replaces
// the whole `voices` object, so changing one reader's email meant re-sending
// every other reader and trusting that nothing was dropped (emails live in a
// vault and are hydrated on read — a stale copy of the list is how one goes
// missing). This is the pure half of the per-voice PATCH: it takes the current
// `voices` object and returns a new one in which only the named entry changed.
//
// `active:false` RETIRES the slot: the person leaves every recording queue,
// link and email login, and NOTHING is deleted — their course_audio takes stay
// exactly where they are (retire, never remove: the 2026-09-20 rule that no old
// audio is touched). Retiring is the same move voicelab's DELETE /voices/:id
// makes for a voice row that already speaks clips.

'use strict';

function normaliseEmail(value) {
  const s = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
}

/** `voices` with every retired entry left out — what every queue/login/link reads. */
function withoutRetired(voices) {
  if (!voices || typeof voices !== 'object') return voices;
  const out = {};
  for (const [slot, entry] of Object.entries(voices)) {
    if (entry && typeof entry === 'object' && entry.active === false) continue;
    out[slot] = entry;
  }
  return out;
}

/**
 * @returns {{ok:true, voices:object, slot:string, changed:object}
 *          |{ok:false, status:number, error:string}}
 */
function patchVoiceSlot(voices, voiceId, { email, active, slot } = {}) {
  if (!voices || typeof voices !== 'object') return { ok: false, status: 404, error: 'this language has no voices' };
  const id = String(voiceId || '').trim();
  const hits = Object.entries(voices).filter(([k, e]) => e && e.voiceId === id && (!slot || k === slot));
  if (!hits.length) return { ok: false, status: 404, error: `no voice slot names ${id}${slot ? ` at ${slot}` : ''}` };
  if (hits.length > 1) {
    return { ok: false, status: 409, error: `${id} holds ${hits.length} slots (${hits.map(([k]) => k).join(', ')}) — say which with "slot"` };
  }
  if (email === undefined && active === undefined) return { ok: false, status: 400, error: 'email or active required' };
  if (active !== undefined && typeof active !== 'boolean') return { ok: false, status: 400, error: 'active must be a boolean' };

  const [key, entry] = hits[0];
  const next = { ...entry };
  const changed = {};
  if (email !== undefined) {
    const e = email === null || email === '' ? '' : normaliseEmail(email);
    if (email && !e) return { ok: false, status: 400, error: 'email is not an address' };
    // "" is the vault's explicit-clear (recordist-email-vault.cjs write semantics).
    if (e !== (entry.email || '')) { next.email = e; changed.email = e || null; }
  }
  if (active !== undefined && (entry.active !== false) !== active) {
    if (active) delete next.active; else next.active = false;
    changed.active = active;
  }
  return { ok: true, voices: { ...voices, [key]: next }, slot: key, changed };
}

module.exports = { patchVoiceSlot, withoutRetired, normaliseEmail };
