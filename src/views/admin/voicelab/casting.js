/**
 * CASTING — the rules behind the one-screen casting tool.
 *
 * Tom, 2026-09-19, looking at the old Languages / Play / Engineering tabs:
 *
 *   "what I want is simple / for any language / I want to be able to select
 *    from the best Cartesia voices, with Azure as fallback for any Cartesia
 *    voices that don't exist for that language / Mexican Spanish counts as a
 *    different language - / we do NOT use American English for any voices /
 *    English voices are set: My clone is the male voice, Gemma is the female
 *    voice, Aran's clone is the second male voice (if needed) … I really need
 *    to be able to select from Cartesia by Language + gender + accent / let's
 *    make this a really super easy tool for me to select voices in cartesia,
 *    audition them, and then cast them"
 *
 * Every rule he stated is a named function here, kept out of the Vue file so
 * casting.test.js can pin it. The screen (CastingPanel.vue) draws; this decides.
 *
 * THE ROLES a language carries, in Tom's words. `slot`/`gender`/`rank` are the
 * voice_language_roles coordinates castSlot() writes; `pod` is the gender of the
 * per-language pod pick (services/pod-voice-picks.cjs, job #273). A MALE or
 * FEMALE tap writes BOTH the course phrase slot and the pod pick — one decision,
 * two records — because his model is one voice per language per role and the
 * screen must not make him pick the same thing twice.
 */
export const ROLES = Object.freeze([
  { key: 'male', label: 'Male', slot: 'phrase', gender: 'm', rank: 0, pod: 'm' },
  { key: 'female', label: 'Female', slot: 'phrase', gender: 'f', rank: 0, pod: 'f' },
  { key: 'male2', label: 'Second male', slot: 'phrase', gender: 'm', rank: 1, pod: null },
  { key: 'guide', label: 'Guide', slot: 'guide', gender: null, rank: 0, pod: null },
])

/** The staged-key for a phrase/guide slot, in the order stagedCast.planCast() saves them. */
export const SLOT_ORDER = Object.freeze(['phrase:m:0', 'phrase:m:1', 'phrase:f:0', 'guide:-:0'])

export function slotKey (role) {
  return `${role.slot}:${role.gender || '-'}:${role.rank}`
}

/**
 * THE POD VOICE, PICKABLE IN ITS OWN RIGHT (Tom, 2026-09-19: every row, every
 * role, editable). A MALE or FEMALE cast still writes the pod pick as well —
 * that coupling is his model of one voice per language per role and is NOT
 * decoupled here — but a pod voice that should DIFFER from the phrase voice
 * now has its own target, so he never has to miscast a course to fix a pod.
 *
 * A pod role carries no `slot`: it writes a pick and nothing else.
 */
export const POD_ROLES = Object.freeze([
  { key: 'podFemale', label: 'Pod female', slot: null, gender: 'f', rank: null, pod: 'f' },
  { key: 'podMale', label: 'Pod male', slot: null, gender: 'm', rank: null, pod: 'm' },
])

/** A role that writes only the pod pick — no voice_language_roles slot behind it. */
export function isPodOnly (role) {
  return Boolean(role) && !role.slot
}

/** The staged entry for a role, wherever it lives: a slot, or a pod pick. */
export function stagedEntry (staged, role) {
  if (!role) return null
  if (isPodOnly(role)) return (staged?.picks || {})[role.pod] || null
  return (staged?.slots || {})[slotKey(role)] || null
}

/** Is THIS candidate the one staged into this role? */
export function isStagedOn (staged, role, candidate) {
  const e = stagedEntry(staged, role)
  if (!e || e.action !== 'cast' && e.action !== 'pick') return false
  if (isPodOnly(role)) return Boolean(e.voice) && labVoiceId(e.voice) === candidate.voiceId
  return e.voiceId === candidate.voiceId
}

/**
 * THE HOUSE ENGLISH CAST — A DEFAULT HE CAN RESTORE IN ONE TAP, NOT A LOCK.
 *
 * Tom's clone is the male voice, Gemma the female, Aran's clone the second male.
 * Until 2026-09-19 this froze the English row: no picker, no clear link, the
 * real cast hidden behind these names. He looked at that screen and said "we
 * need to be able to make changes in it - I can't edit any of the voice
 * assignments here", so ENGLISH IS NOW CAST LIKE EVERY OTHER LANGUAGE and this
 * record is what stageHouseEnglish() puts back when he wants the house cast
 * again. Nothing here gates a picker; if it ever does again, that is the bug.
 */
export const FIXED_ENGLISH = Object.freeze({
  code: 'eng',
  male: { name: 'tom_001', voiceId: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', who: "Tom's clone" },
  female: { name: 'Gemma', voiceId: 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca', who: 'Gemma' },
  male2: { name: 'aran_english_003', voiceId: 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe', who: "Aran's clone" },
})

/** English, the language the house cast belongs to — a label for the reset button, never a gate. */
export function isFixedEnglish (code) {
  return String(code || '') === FIXED_ENGLISH.code
}

/**
 * NEVER AMERICAN ENGLISH (Tom, 2026-09-19: "we do NOT use American English for
 * any voices"). A hard rule, applied to every candidate before it reaches the
 * picker. Read off the vendor's NATIVE accent only: a British voice Cartesia
 * says can be steered into en-US is still a British voice.
 */
export function isAmericanEnglish (c) {
  if (!c) return false
  if (String(c.accentLocale || '').toLowerCase() === 'en-us') return true
  return /american/i.test(String(c.accent || ''))
}

function providerOf (c) {
  return String(c.engine || c.kind || '').toLowerCase()
}

/** A voice the lab can actually audition and a slot can actually take. */
function offerable (c) {
  const p = providerOf(c)
  if (p === 'human') return false
  if (p === 'elevenlabs' || p === 'xai' || p === 'legacy') return false
  return true
}

/**
 * THE PICKER'S SHELF for one language. CARTESIA FIRST, ALWAYS; Azure appears
 * ONLY when Cartesia has no voice for the language. Estate-owned clones (the
 * vendor's own `owner` flag) sort to the top so no cap can cut them.
 */
export function shelfFor (lang) {
  const all = (lang && lang.candidates) || []
  const clean = all.filter(offerable).filter((c) => !isAmericanEnglish(c))
  const cartesia = clean.filter((c) => providerOf(c) === 'cartesia')
  if (cartesia.length) {
    return {
      provider: 'cartesia',
      fallback: false,
      voices: cartesia.slice().sort((a, b) => Number(Boolean(b.owned)) - Number(Boolean(a.owned))),
    }
  }
  const azure = clean.filter((c) => providerOf(c) === 'azure')
  return { provider: azure.length ? 'azure' : null, fallback: true, voices: azure }
}

/**
 * The accents on a shelf, most common first, so the filter shows every accent
 * the language has rather than pre-choosing one for him. `null` accents are
 * grouped under 'not listed' at the end.
 */
export function accentsOf (voices) {
  const counts = new Map()
  for (const v of voices || []) {
    const k = v.accent || ''
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] === '') - (b[0] === '') || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([accent, count]) => ({ accent, count, label: accent ? accent.replace(/-/g, ' ') : 'accent not listed' }))
}

/** LANGUAGE + GENDER + ACCENT, plus a free-text search over what the vendor says. */
export function filterShelf (voices, { gender = '', accent = null, query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase()
  return (voices || []).filter((v) => {
    // A vendor blank is not evidence of gender, so an unknown gender is never hidden.
    if (gender && v.gender && v.gender !== gender) return false
    if (accent !== null && accent !== undefined && (v.accent || '') !== accent) return false
    if (!q) return true
    const hay = [v.name, v.accent, v.country, v.tagline, v.description, ...(v.otherAccents || [])].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
}

/**
 * Which roles a candidate may be cast into on this language. A voice of the
 * wrong gender is not offered the slot; a voice of unknown gender is offered
 * both, because the vendor's blank is not evidence.
 */
export function rolesFor (candidate, lang, podRow = null) {
  if (!candidate || !lang) return []
  const g = candidate.gender || null
  const fits = (r) => !(g && r.gender && r.gender !== g)
  const slots = ROLES.filter((r) => {
    if (r.slot === 'guide') return (lang.knownCourses || 0) > 0
    return fits(r)
  })
  // The pod's own targets appear only where there IS a pod, and never on a
  // language whose pod is a human recording.
  if (!podRow || podRow.human) return slots
  const genders = new Set((podRow.slots || []).map((s) => s.gender))
  return [...slots, ...POD_ROLES.filter((r) => genders.has(r.pod) && fits(r))]
}

/**
 * ONE TAP, ONE DECISION, AS MANY RECORDS AS IT TAKES. Staging a MALE or FEMALE
 * cast writes the phrase slot AND the pod pick; a second male or a guide is a
 * course slot only. Returns the new staged map — the caller replaces state.
 *
 * `staged` shape:
 *   slots: slotKey -> { action: 'cast'|'clear', slot: {slot, gender, rank}, voiceId, voiceName, label }
 *   picks: gender  -> { action: 'pick'|'clear', voice, expect, label }
 */
export function stageRole (staged, role, candidate, { podRow = null, langName = '' } = {}) {
  const next = { slots: { ...(staged?.slots || {}) }, picks: { ...(staged?.picks || {}) } }
  if (!isPodOnly(role)) {
    next.slots[slotKey(role)] = {
      action: 'cast',
      slot: { slot: role.slot, gender: role.gender || undefined, rank: role.rank },
      voiceId: candidate.voiceId,
      voiceName: candidate.name,
      label: `${langName ? langName + ' · ' : ''}${role.label.toLowerCase()}`,
    }
  }
  if (role.pod && podRow && !podRow.human) {
    const current = (podRow.slots || []).find((s) => s.gender === role.pod)
    next.picks[role.pod] = {
      action: 'pick',
      voice: podVoiceOf(candidate),
      expect: current ? current.pick : null,
      label: `${langName ? langName + ' · ' : ''}pod ${role.pod === 'f' ? 'female' : 'male'} voice`,
    }
  }
  return next
}

export function stageClear (staged, role, { podRow = null, langName = '' } = {}) {
  const next = { slots: { ...(staged?.slots || {}) }, picks: { ...(staged?.picks || {}) } }
  if (!isPodOnly(role)) {
    next.slots[slotKey(role)] = {
      action: 'clear',
      slot: { slot: role.slot, gender: role.gender || undefined, rank: role.rank },
      label: `${langName ? langName + ' · ' : ''}${role.label.toLowerCase()}`,
    }
  }
  if (role.pod && podRow && !podRow.human) {
    const current = (podRow.slots || []).find((s) => s.gender === role.pod)
    if (current && current.pick) {
      next.picks[role.pod] = { action: 'clear', expect: current.pick, label: `${langName ? langName + ' · ' : ''}pod ${role.pod === 'f' ? 'female' : 'male'} voice` }
    }
  }
  return next
}

export function unstageRole (staged, role) {
  const next = { slots: { ...(staged?.slots || {}) }, picks: { ...(staged?.picks || {}) } }
  if (!isPodOnly(role)) delete next.slots[slotKey(role)]
  if (role.pod) delete next.picks[role.pod]
  return next
}

/**
 * RESET ENGLISH TO THE HOUSE CAST, IN ONE TAP — Tom's clone, Gemma, Aran's
 * clone, staged like any other change so he still presses save himself. Roles
 * already holding the house voice are left alone, so the button never stages a
 * write that changes nothing; when everything already matches it stages nothing
 * and the save button stays dark.
 */
export function stageHouseEnglish (staged, { podRow = null, langName = 'English', facts = null } = {}) {
  let next = { slots: { ...(staged?.slots || {}) }, picks: { ...(staged?.picks || {}) } }
  for (const key of ['male', 'female', 'male2']) {
    const role = ROLES.find((r) => r.key === key)
    const want = FIXED_ENGLISH[key]
    const candidate = { voiceId: want.voiceId, name: want.name, engine: 'cartesia', kind: 'cartesia' }
    const slotOk = Boolean(facts && facts[key] && facts[key].voiceId === want.voiceId)
    const podSlot = role.pod && podRow && !podRow.human ? (podRow.slots || []).find((x) => x.gender === role.pod) : null
    const podOk = !role.pod || !podSlot || Boolean(podSlot.pick && labVoiceId(podSlot.pick) === want.voiceId)
    if (slotOk && podOk) continue
    next = stageRole(next, role, candidate, { podRow, langName })
    if (slotOk) delete next.slots[slotKey(role)]
    if (podOk && role.pod) delete next.picks[role.pod]
  }
  return next
}

export function stagedCount (staged) {
  return Object.keys(staged?.slots || {}).length + Object.keys(staged?.picks || {}).length
}

/**
 * The lab spells a voice '<provider>_<id>'; a pod pick spells it bare with the
 * provider beside it. One translation, here, so both records name one voice.
 */
export function podVoiceOf (candidate) {
  const id = String(candidate.voiceId || '')
  const provider = String(candidate.engine || candidate.kind || id.split('_')[0] || '').toLowerCase()
  return {
    provider,
    voice_id: id.startsWith(`${provider}_`) ? id.slice(provider.length + 1) : id,
    name: String(candidate.name || id).split(' — ')[0],
  }
}

/** The lab-spelled id of a pod voice, so the pod's cast can be played from the same sample map. */
export function labVoiceId (voice) {
  if (!voice) return ''
  const provider = String(voice.provider || '').toLowerCase()
  const id = String(voice.voice_id || '')
  return provider && !id.startsWith(`${provider}_`) ? `${provider}_${id}` : id
}

/** Provider, as a word Tom reads: 'Cartesia', 'Azure', 'xAI', 'human'. */
export function providerLabel (p) {
  const s = String(p || '').toLowerCase()
  if (s === 'cartesia') return 'Cartesia'
  if (s === 'azure') return 'Azure'
  if (s === 'xai') return 'xAI'
  if (s === 'elevenlabs') return 'ElevenLabs'
  if (s === 'human') return 'human'
  return s || 'unknown'
}

/**
 * WHAT IS CAST, AS ONE PLAIN FACT PER ROLE. Read cold: a name and a provider,
 * or the words "nothing cast". Never an ambiguous blank.
 */
export function castFacts (lang) {
  const out = {}
  for (const r of ROLES) {
    const list = r.slot === 'guide' ? (lang.guide && lang.guide.slots) || [] : (lang.slots && lang.slots[r.gender]) || []
    const s = list.find((x) => x.rank === r.rank) || null
    if (r.slot === 'guide' && !(lang.knownCourses > 0)) { out[r.key] = { state: 'na', text: 'not a known language' }; continue }
    if (s && s.filled) {
      out[r.key] = {
        state: s.active === false ? 'broken' : 'cast',
        voiceId: s.voiceId,
        name: s.voiceName,
        provider: providerLabel(s.engine || s.kind),
        accent: s.accent || null,
        text: `${s.voiceName} · ${providerLabel(s.engine || s.kind)}${s.active === false ? ' · deactivated' : ''}`,
      }
    } else {
      out[r.key] = { state: 'empty', text: 'nothing cast' }
    }
  }
  return out
}

/**
 * The pod's fact, per gender: what the pod SPEAKS today (its stored cast) and
 * what Tom has PICKED (the #273 record), shown as two facts when they differ
 * and never reconciled here.
 */
export function podFacts (podRow) {
  if (!podRow) return { state: 'none', text: 'no pod', genders: [] }
  if (podRow.human) return { state: 'human', text: 'human recording pending', genders: [] }
  const genders = (podRow.slots || []).map((s) => {
    const speaking = (s.cast || []).map((c) => ({ name: c.voice.name || c.voice.voice_id, provider: providerLabel(c.voice.provider), voiceId: labVoiceId(c.voice), clip: c.clip || null }))
    const pick = s.pick ? { name: s.pick.name || s.pick.voice_id, provider: providerLabel(s.pick.provider), voiceId: labVoiceId(s.pick), by: s.pick.picked_by, at: s.pick.picked_at } : null
    return { gender: s.gender, speaking, pick, drifted: Boolean(s.drifted) }
  })
  return { state: podRow.state, text: podRow.state === 'held' ? 'held — text written, no audio' : podRow.state, genders }
}

/** One sentence for the row: what a cold reader needs to know about this language's casting. */
export function rowSummary (lang, podRow) {
  if (!lang) return ''
  if (lang.human) return 'Human recordings only — no synthetic voice is ever cast here.'
  if (lang.status === 'knownonly') return 'Nobody is taught this language; only its guide voice is cast.'
  const f = castFacts(lang)
  const n = ['male', 'female'].filter((k) => f[k].state === 'cast').length
  const pod = podFacts(podRow)
  const podBit = pod.state === 'none' ? '' : pod.genders.every((g) => g.pick) ? ' Pod voices picked.' : pod.state === 'held' ? ' Pod audio held until a pod voice is picked.' : ' Pod voice not yet picked.'
  if (n === 0) return `Nothing cast — a new render falls to ${lang.cartesiaCovers ? 'Azure until a Cartesia voice is cast' : 'Azure (Cartesia has no voice for this language)'}.${podBit}`
  if (n === 1) return `One of two voices cast.${podBit}`
  return `Male and female cast.${podBit}`
}

/** Tom's order for the rows: live courses first, then course count, then the name. */
export function sortRows (rows, nameOf) {
  return rows.slice().sort((a, b) =>
    (a.released > 0 ? 0 : 1) - (b.released > 0 ? 0 : 1) ||
    (b.courses || 0) - (a.courses || 0) ||
    String(nameOf(a)).localeCompare(String(nameOf(b))))
}
