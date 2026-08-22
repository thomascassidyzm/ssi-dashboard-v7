/**
 * RELINK VOICE GUARD — Kai's ruling, 2026-08-19:
 *
 *   "RELINKING AUDIO MUST ONLY EVER RELINK A CLIP WHOSE VOICE MATCHES THE
 *    COURSE VOICE CONFIG."
 *
 * WHY THIS EXISTS. A zho_for_eng repair pass relinked 206 mislinked known-side
 * prompts to clips whose TEXT matched. 164 of those silently changed the voice
 * — from Sonia (the configured known voice) to a clone — because no same-voice
 * clip existed and every relink path in this repo matched on text x language x
 * role and NOTHING else. The Chinese course's known side ended up split between
 * two voices against a config naming one, and the learner hears the prompt
 * voice flip through the course. Nobody chose that; the tooling did it.
 *
 * THE RULE, precisely. A candidate clip is eligible for a relink only if its
 * `voice_id` names the same voice as `courses.voice_config` gives for that
 * clip's role. When no same-voice candidate exists, the correct outcome is NOT
 * "relink to a different voice" and NOT "unlink" and NOT "delete" — it is to
 * LEAVE THE SLOT ALONE and record a refusal, so the slot is regenerated in the
 * right voice later. Callers end a pass by draining the ledger into an
 * audio-pass request (services/shared/audio-pass-queue.cjs).
 *
 * LOUD, NOT SILENT (Kai's standing principle). Every refusal is counted, keyed
 * by role and by the voice that was wrongly on offer, and `summary()` renders
 * a line a human reads without opening the DB. A relink pass that refuses work
 * must SAY SO.
 *
 * VOICE IDENTITY is Tom's ruling of 2026-08-07: a bare id and its
 * provider-prefixed sibling (`eve` / `xai_eve`) are ONE voice under two id
 * conventions, because the prefix dates the render era, not the speaker. That
 * merge is on by default and is TAGGED (`viaAlias`) so an audit can still find
 * every match that crossed an era boundary. Locale is deliberately NOT merged:
 * en-GB-Sonia and en-US-Jenny are different voices, and so are fr-FR and fr-CA
 * renders of the same nominal voice — an accent change IS a voice change.
 *
 * This module is the SINGLE definition of that logic; audio-reuse-planner.cjs
 * re-exports from here rather than keeping its own copy, so there is exactly
 * one answer to "do these two voice ids name the same voice?" in the estate.
 */

// Roles a course voice_config assigns a voice to. Pods, instructions and
// encouragements are cast per-speaker and are out of scope for this guard.
const CLIP_ROLES = ['known', 'target1', 'target2', 'presentation']

// Provider prefixes phase 8 has written at various times. Stripping one yields
// the voice's bare legacy id, which the estate also holds directly.
const PROVIDER_PREFIX = /^(xai|azure|elevenlabs|google)_/

/** The bare voice id, with any provider-era prefix removed. */
function bareVoiceId(voiceId) {
  return voiceId ? String(voiceId).replace(PROVIDER_PREFIX, '') : ''
}

/**
 * Resolve the voice_id string phase8 would write for each role, from
 * courses.voice_config. Mirrors phase8-audio-v13.cjs getVoiceForRole exactly:
 * `${provider}_${voiceId}` when a provider is set, bare voiceId otherwise,
 * never the config object.
 */
function resolveVoices(course) {
  const voices = course?.voice_config?.voices || {}
  const out = {}
  for (const role of CLIP_ROLES) {
    const v = voices[role]
    if (!v) { out[role] = null; continue }
    if (v.provider && v.voiceId) out[role] = `${v.provider}_${v.voiceId}`
    else out[role] = v.voiceId || null
  }
  return out
}

/**
 * Do two voice_id strings name the same voice?
 *
 * TOM'S RULING, 2026-08-07: "eve and xai_eve are the same voice under two id
 * conventions; treat bare vs xai_-prefixed ids as one voice identity generally
 * (same actual voice, different provider-migration eras)." So a bare id and its
 * prefixed sibling match BY DEFAULT. The match is TAGGED (`viaAlias`) so an
 * audit can find every clip that came in across an era boundary rather than on
 * an exact id — the ruling makes it correct, not invisible.
 * `mergeProviderEras: false` restores strict exact matching. `aliases` remains
 * for equivalences the prefix rule cannot express.
 */
function voicesMatch(wanted, candidate, aliases = [], { mergeProviderEras = true } = {}) {
  if (!wanted || !candidate) return { match: false, viaAlias: false }
  if (wanted === candidate) return { match: true, viaAlias: false }
  if (mergeProviderEras && bareVoiceId(wanted) === bareVoiceId(candidate)) {
    return { match: true, viaAlias: true, via: 'provider-era' }
  }
  for (const group of aliases) {
    if (group.includes(wanted) && group.includes(candidate)) {
      return { match: true, viaAlias: true, via: 'explicit-alias' }
    }
  }
  return { match: false, viaAlias: false }
}

/** All voice_id strings that are acceptable for `wanted` under `aliases`. */
function voiceCandidates(wanted, aliases = []) {
  if (!wanted) return []
  const out = new Set([wanted])
  for (const group of aliases) {
    if (group.includes(wanted)) for (const v of group) out.add(v)
  }
  return [...out]
}

/**
 * THE GATE. Is this candidate clip allowed to be linked into this slot?
 *
 * Returns `{ ok, reason, detail, viaAlias }`. `ok:false` means DO NOT WRITE the
 * link — leave whatever is there and record the refusal.
 *
 * FAILING CLOSED ON A MISSING CONFIG IS DELIBERATE. If the course has no voice
 * configured for the role we cannot tell a correct clip from a wrong one, and
 * the whole point of the ruling is that a relink must never be a guess. The
 * refusal reason says so explicitly (`no-configured-voice`) so the operator
 * fixes the config rather than wondering why nothing linked.
 *
 * @param {object} args
 * @param {string} args.role            - known | target1 | target2 | presentation
 * @param {string|null} args.wantedVoice - configured voice id for that role (from resolveVoices)
 * @param {object|null} args.candidate   - the course_audio row under consideration ({ id, voice_id, ... })
 * @param {string[][]} [args.aliases]    - explicit voice-equivalence groups
 * @param {boolean} [args.mergeProviderEras]
 */
function isRelinkAllowed({ role, wantedVoice, candidate, aliases = [], mergeProviderEras = true }) {
  if (!candidate) return { ok: false, reason: 'no-candidate', detail: `no clip offered for role ${role}` }
  if (!wantedVoice) {
    return {
      ok: false,
      reason: 'no-configured-voice',
      detail: `courses.voice_config has no voice for role '${role}' — cannot verify a relink, so refusing it`,
    }
  }
  const candidateVoice = candidate.voice_id || candidate.voiceId || null
  if (!candidateVoice) {
    return { ok: false, reason: 'candidate-voice-unknown', detail: `clip ${candidate.id} has no voice_id` }
  }
  const m = voicesMatch(wantedVoice, candidateVoice, aliases, { mergeProviderEras })
  if (!m.match) {
    return {
      ok: false,
      reason: 'voice-mismatch',
      detail: `clip ${candidate.id} is ${candidateVoice}, config wants ${wantedVoice} for role '${role}'`,
      candidateVoice,
      wantedVoice,
    }
  }
  return { ok: true, viaAlias: !!m.viaAlias, via: m.via, candidateVoice, wantedVoice }
}

/**
 * Pick the first candidate whose voice is allowed, from a list already filtered
 * on text/language/role by the caller. Returns the winner AND every refusal, so
 * a caller can neither accept a wrong-voice clip nor lose the fact that it
 * declined one.
 */
function pickVoiceMatchedCandidate({ role, wantedVoice, candidates = [], aliases = [], mergeProviderEras = true }) {
  const refusals = []
  for (const candidate of candidates) {
    const verdict = isRelinkAllowed({ role, wantedVoice, candidate, aliases, mergeProviderEras })
    if (verdict.ok) return { picked: candidate, verdict, refusals }
    refusals.push({ candidate, verdict })
  }
  return { picked: null, verdict: null, refusals }
}

/**
 * The refusal ledger — the "loud" half of the ruling.
 *
 * A relink pass builds one of these, records every slot it declined to fill,
 * and ends by logging `summary()` and (when it touched a course) queueing an
 * audio pass naming the count. A refusal that is not counted is a silent
 * failure wearing a safety label, which is the failure mode this whole change
 * exists to end.
 */
class RelinkRefusalLedger {
  constructor(courseCode) {
    this.courseCode = courseCode
    this.refusals = []
  }

  /** Record one refused slot. `slot` identifies the content row for a human. */
  record({ slot, table, role, reason, detail, wantedVoice, candidateVoice }) {
    this.refusals.push({ slot, table, role, reason, detail, wantedVoice, candidateVoice })
  }

  get count() { return this.refusals.length }

  /** Refusal counts keyed `role:reason`, and the wrong voices that were offered. */
  breakdown() {
    const byReason = {}
    const byOfferedVoice = {}
    for (const r of this.refusals) {
      const k = `${r.role}:${r.reason}`
      byReason[k] = (byReason[k] || 0) + 1
      if (r.candidateVoice) byOfferedVoice[r.candidateVoice] = (byOfferedVoice[r.candidateVoice] || 0) + 1
    }
    return { byReason, byOfferedVoice }
  }

  /** One line a human reads. Empty string when nothing was refused. */
  summary() {
    if (!this.refusals.length) return ''
    const { byReason, byOfferedVoice } = this.breakdown()
    const reasons = Object.entries(byReason).map(([k, n]) => `${k}=${n}`).join(', ')
    const voices = Object.entries(byOfferedVoice).map(([v, n]) => `${v}x${n}`).join(', ')
    return `RELINK REFUSED ${this.refusals.length} slot(s) in ${this.courseCode} on the voice-match rule `
      + `[${reasons}]${voices ? ` — wrong voices offered: ${voices}` : ''}. `
      + `These slots were LEFT AS THEY WERE and need regeneration in the configured voice.`
  }

  /** Metadata body for the audio-pass request, small enough to store. */
  toPassMetadata() {
    const { byReason, byOfferedVoice } = this.breakdown()
    return {
      relinkRefusedCount: this.refusals.length,
      relinkRefusedByReason: byReason,
      relinkRefusedVoicesOffered: byOfferedVoice,
      relinkRefusedSample: this.refusals.slice(0, 25),
    }
  }
}

module.exports = {
  CLIP_ROLES,
  PROVIDER_PREFIX,
  bareVoiceId,
  resolveVoices,
  voicesMatch,
  voiceCandidates,
  isRelinkAllowed,
  pickVoiceMatchedCandidate,
  RelinkRefusalLedger,
}
