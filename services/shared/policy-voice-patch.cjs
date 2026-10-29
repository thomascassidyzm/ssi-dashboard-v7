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

// The entry fields a new slot may carry. Anything else is refused rather than stored unread.
const ADDABLE_FIELDS = ['name', 'gender', 'voiceId', 'dialect', 'aliases', 'email', 'onlyCastOn', 'castOn', 'podEnglishOn'];

/**
 * ADD ONE VOICE SLOT without rewriting the list (job #562, 2026-10-29: Catrin's English voice for the women's lines of
 * Pod 1 English). The per-voice PATCH above can only edit a slot that exists, and PUT replaces every reader at once, so
 * an agent had no door to add a reader. Refuses an occupied slot, a voice id (or alias) another slot already holds, a
 * gender that contradicts the slot key, and a second voice in one (dialect, gender) bucket — the same rules PUT applies.
 * A cast-on-only entry (onlyCastOn) reads only what it is cast on and holds no bucket, exactly as the queue treats it.
 *
 * @param {object} voices the policy's current `voices`
 * @param {string} slot 'm' | 'f' | 'm:<tag>' | 'f:<tag>'
 * @param {object} entry the new entry
 * @param {Function} bucketOf (dialect, gender) -> bucket key (shared/dialect.cjs bucketKey)
 * @returns {{ok:true, voices:object, slot:string, entry:object}|{ok:false, status:number, error:string}}
 */
function addVoiceSlot(voices, slot, entry, bucketOf) {
  const current = voices && typeof voices === 'object' ? voices : {};
  const key = String(slot || '').trim();
  const gender = key.split(':')[0];
  if (!/^[mf](:[a-z0-9_-]+)?$/.test(key)) return { ok: false, status: 400, error: `slot must be 'm', 'f', 'm:<tag>' or 'f:<tag>' (got ${slot})` };
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, status: 400, error: 'entry must be an object' };
  const unknown = Object.keys(entry).filter((k) => !ADDABLE_FIELDS.includes(k));
  if (unknown.length) return { ok: false, status: 400, error: `entry cannot carry ${unknown.join(', ')} (allowed: ${ADDABLE_FIELDS.join(', ')})` };
  const voiceId = String(entry.voiceId || '').trim();
  if (!voiceId) return { ok: false, status: 400, error: 'entry.voiceId required' };
  if (entry.gender !== undefined && String(entry.gender).toLowerCase() !== gender) {
    return { ok: false, status: 400, error: `entry.gender (${entry.gender}) contradicts the slot ${key}` };
  }
  if (current[key]) return { ok: false, status: 409, error: `slot ${key} is already held by ${current[key].voiceId}` };
  for (const [k, e] of Object.entries(current)) {
    if (!e) continue;
    if (e.voiceId === voiceId || (Array.isArray(e.aliases) && e.aliases.includes(voiceId))) {
      return { ok: false, status: 409, error: `${voiceId} is already in slot ${k}` };
    }
  }
  if (entry.onlyCastOn !== true && typeof bucketOf === 'function') {
    const mine = bucketOf(entry.dialect, gender);
    for (const [k, e] of Object.entries(current)) {
      if (!e || e.onlyCastOn === true || e.active === false) continue;
      if (bucketOf(e.dialect, String(e.gender || k.split(':')[0]).toLowerCase()) === mine) {
        return { ok: false, status: 409, error: `slot ${k} already holds the bucket ${mine} — one voice per gender per dialect` };
      }
    }
  }
  const next = { ...entry, voiceId, gender };
  if (entry.email !== undefined) {
    const e = normaliseEmail(entry.email);
    if (!e) return { ok: false, status: 400, error: 'email is not an address' };
    next.email = e;
  }
  return { ok: true, voices: { ...current, [key]: next }, slot: key, entry: next };
}

module.exports = { patchVoiceSlot, addVoiceSlot, withoutRetired, normaliseEmail };
