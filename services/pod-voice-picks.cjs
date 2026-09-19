/**
 * POD VOICE PICKS — the voice Tom chose for a LANGUAGE's listening pod.
 *
 * Tom's ruling, 2026-09-19, after hearing a pod on a plane:
 *
 *   "But I want to choose proper voices for them. I listened to the Italian one
 *    on the plane yesterday and the female Italian voice was a shocker. So I am
 *    going to choose all the voices carefully myself. We CAN do all the
 *    translations and leave the pod TTS as pending."
 *
 * and, the same day, the unit the choice is made in:
 *
 *   "Of course you know that pods are per language and not per course? And so
 *    anytime a language has been done once, then it never needs doing again."
 *
 * So a pick is (LANGUAGE, gender) → one voice, with who picked it and when. It
 * is not per course, it is not per pod, and it is not per speaker: the pod cast
 * resolves every speaker of a gender onto that gender's voice
 * (tools/pod-sync.cjs resolveCast), so gender IS the role axis a pod voice
 * decision is actually made on.
 *
 * ── WHY A NEW app_config KEY RATHER THAN AN EXISTING ONE ────────────────────
 * Three stores already hold something voice-shaped and none of them can carry
 * this fact:
 *
 *   pod_voice_pools        a DEPTH LIST per language whose head is overwritten
 *                          on every read by the COURSE cast overlay
 *                          (loadVoicePools → overlayCastPrimaries). A pick
 *                          written there would be silently replaced by whoever
 *                          was last cast into voice_language_roles, which is a
 *                          decision about course material, not about pods.
 *   pod_voice_approvals    per COURSE and scoped to one cast fingerprint, so it
 *                          self-invalidates by design. A per-language pick must
 *                          SURVIVE a recast — it is what the recast should aim at.
 *   courses.voice_config   per course, and the pods are not per course.
 *
 * So: app_config row `pod_voice_picks`, one entry per pool key:
 *   { "ita": { "f": { provider, voice_id, name, locale?,
 *                     picked_by, picked_at } , "m": {…} } }
 *
 * Keyed on the POD POOL KEY ('ita', 'deu_at', 'spa_mx') — the same key
 * tools/pod-sync.cjs casts with, resolved by its poolKeysForCourse(), so a pick
 * and the cast it governs can never be keyed differently.
 *
 * ── WHAT A PICK DOES ────────────────────────────────────────────────────────
 * Two things, and they are what stop the Voice Lab lane being a screen that lies:
 *   1. tools/pod-sync.cjs casts THROUGH it — a pick is handed to resolveCast as
 *      a manual override, so a re-sync lands on Tom's voice rather than the
 *      pool's head.
 *   2. phase8's POST /generate-pods/:courseCode REFUSES bulk pod audio for a
 *      language with no pick, and refuses it again when the live cast has
 *      drifted off the pick. Nothing renders ahead of him.
 *
 * Pure decision helpers here, DB in the three functions at the bottom, so the
 * rules are testable without a database — same shape as
 * services/pod-voice-approvals.cjs beside it.
 */

const { isHumanVoiceLang } = require('./shared/human-voice-courses.cjs')

const PICKS_KEY = 'pod_voice_picks'
const GENDERS = ['m', 'f']

/** A cast entry's gender, as the caster resolves it: 'n' picks the male voice. */
function pickGenderOf (entry) {
  const g = entry && entry.gender
  return g === 'f' ? 'f' : 'm'
}

/** The comparable identity of a voice: provider + id, nothing else. */
function voiceKey (v) {
  if (!v || !v.voice_id) return null
  return `${String(v.provider || 'xai').toLowerCase()}:${String(v.voice_id)}`
}

/**
 * A voice as it is stored in a pick. Throws on anything that could not be
 * rendered — a half-filled picker must never write a voice with no id.
 */
function normalisePickVoice (voice) {
  const v = voice || {}
  const id = String(v.voice_id || v.voiceId || '').trim()
  if (!id) throw Object.assign(new Error('a pick needs a voice_id'), { status: 400 })
  const provider = String(v.provider || '').trim().toLowerCase()
  if (!provider) throw Object.assign(new Error('a pick needs a provider'), { status: 400 })
  const out = { provider, voice_id: id, name: String(v.name || id) }
  const locale = String(v.locale || '').trim()
  if (locale) out.locale = locale
  return out
}

/** The pick for one (language, gender), or null. */
function pickFor (picks, language, gender) {
  const row = (picks || {})[language]
  if (!row) return null
  return row[gender === 'f' ? 'f' : 'm'] || null
}

/**
 * The picks for a course's two tracks, in tools/pod-sync.cjs's override shape.
 * A pick is exactly a manual voice choice, so it rides the override path that
 * already exists rather than a second casting mechanism.
 */
function overridesFor (picks, { target, known } = {}) {
  const out = { target: {}, known: {} }
  for (const [track, language] of [['target', target], ['known', known]]) {
    if (!language) continue
    for (const g of GENDERS) {
      const p = pickFor(picks, language, g)
      if (p) out[track][g] = { provider: p.provider, voice_id: p.voice_id, name: p.name, ...(p.locale ? { locale: p.locale } : {}) }
    }
  }
  return out
}

/**
 * WHICH (language, gender) PAIRS THIS RUN WOULD ACTUALLY SPEAK.
 *
 * Read off the live cast rather than assumed, so a pod whose speakers are all
 * male never asks for a female pick it would not use. `_default` counts: it is
 * the voice an unexpected speaker lands on, so it renders like any other.
 *
 * Pure. `pods` is [{ id, speakers }] exactly as listening_pods carries them.
 */
function requiredPicks (pods, { targetLanguage, knownLanguage, roles = ['target', 'known'] } = {}) {
  const need = new Map()
  const langOf = { target: targetLanguage, known: knownLanguage }
  for (const pod of pods || []) {
    for (const entry of Object.values(pod.speakers || {})) {
      if (!entry || typeof entry !== 'object' || entry.deferred) continue
      const gender = pickGenderOf(entry)
      for (const track of ['target', 'known']) {
        if (!roles.includes(track)) continue
        const language = langOf[track]
        if (!language) continue
        // A human-voiced language is never synthesised at all (Tom, 2026-08-13),
        // so asking Tom to pick a synthetic voice for it would be asking the
        // wrong question — its gaps are a recording worklist.
        if (isHumanVoiceLang(language)) continue
        const live = entry[track] && entry[track].voice_id
          ? entry[track]
          : (track === 'target' && entry.voice_id ? entry : null)
        const key = `${track}|${language}|${gender}`
        if (!need.has(key)) need.set(key, { track, language, gender, live: live || null })
      }
    }
  }
  return [...need.values()].sort((a, b) =>
    a.track.localeCompare(b.track) || a.language.localeCompare(b.language) || a.gender.localeCompare(b.gender))
}

/**
 * MAY BULK POD AUDIO RENDER FOR THIS COURSE? Pure.
 *
 * Two refusals, deliberately distinct, because they are different jobs:
 *   no_pick   — Tom has not chosen this language's pod voice yet. Nothing
 *               renders ahead of him (his ruling, 2026-09-19).
 *   pick_drift — he HAS chosen, and the pod is cast on something else. Rendering
 *               here would put a voice he rejected in front of a learner while
 *               the screen says the language is picked.
 *
 * @returns {{ok:boolean, reason?:string, missing:Array, drifted:Array, message?:string}}
 */
function evaluatePicks (picks, required) {
  const missing = []
  const drifted = []
  for (const r of required || []) {
    const pick = pickFor(picks, r.language, r.gender)
    if (!pick) { missing.push(r); continue }
    const live = voiceKey(r.live)
    if (live && live !== voiceKey(pick)) {
      drifted.push({ ...r, picked: pick })
    }
  }
  if (missing.length) {
    return { ok: false, reason: 'no_pick', missing, drifted, message: describeMissing(missing) }
  }
  if (drifted.length) {
    return { ok: false, reason: 'pick_drift', missing, drifted, message: describeDrift(drifted) }
  }
  return { ok: true, reason: 'picked', missing, drifted }
}

const LANE = 'the POD VOICES lane of the Voice Lab (/admin/labs/voice)'

function describeMissing (missing) {
  const list = missing
    .map((m) => `${m.language} ${m.gender === 'f' ? 'female' : 'male'} (${m.track} track)`)
    .join(', ')
  return `Pod audio is held until the pod voice for each language has been PICKED (Tom's ruling, 2026-09-19: `
    + `"I am going to choose all the voices carefully myself … leave the pod TTS as pending"). No pick on record for: ${list}. `
    + `Pick each one in ${LANE}, then run again. A SAMPLE run is still allowed — POST with {"sample_limit": 5} — so the pick can be made by ear.`
}

function describeDrift (drifted) {
  const list = drifted
    .map((d) => `${d.language} ${d.gender === 'f' ? 'female' : 'male'}: picked ${d.picked.provider}/${d.picked.voice_id}`
      + `, cast ${(d.live && d.live.provider) || '?'}/${(d.live && d.live.voice_id) || '?'}`)
    .join('; ')
  return `The pod is cast on a voice that is NOT the picked one, so rendering would put an unpicked voice in front of a learner: ${list}. `
    + `Re-cast the pod onto the pick (node tools/pod-recast.cjs, or re-run tools/pod-sync.cjs, both of which read the picks) and run again.`
}

// ---------------------------------------------------------------------------
// Storage. Needs a supabase client passed in — this module owns no connection.
// ---------------------------------------------------------------------------

async function loadPicks (supabase) {
  const { data, error } = await supabase
    .from('app_config').select('value').eq('key', PICKS_KEY).maybeSingle()
  if (error) throw new Error(`load ${PICKS_KEY}: ${error.message}`)
  return (data && data.value) || {}
}

/** Read-modify-write, so one language's pick can never drop another's. */
async function updatePicks (supabase, mutate) {
  const current = await loadPicks(supabase)
  const next = mutate({ ...current })
  const { error } = await supabase
    .from('app_config')
    .upsert({ key: PICKS_KEY, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(`save ${PICKS_KEY}: ${error.message}`)
  return next
}

/**
 * Record a pick. `by` is the human who made it and is REQUIRED: a pick with no
 * name on it cannot be told apart from a default, and this whole record exists
 * because Tom is making these decisions personally.
 *
 * `expect` is the optimistic guard: pass the pick the screen was showing and a
 * pick that has moved underneath is refused rather than overwritten — Tom's
 * approved cast is never silently stomped by a stale tab.
 */
async function savePick (supabase, { language, gender, voice, by, expect = undefined }) {
  const lang = String(language || '').trim()
  if (!lang) throw Object.assign(new Error('language is required'), { status: 400 })
  const g = gender === 'f' ? 'f' : gender === 'm' ? 'm' : null
  if (!g) throw Object.assign(new Error("gender must be 'm' or 'f'"), { status: 400 })
  if (!String(by || '').trim()) throw Object.assign(new Error('a pick records who made it'), { status: 400 })
  if (isHumanVoiceLang(lang)) {
    throw Object.assign(
      new Error(`${lang} is human-voiced only — Aran's and Catrin's recordings are never replaced by synthesis `
        + `(Tom's ruling, 2026-08-13). Its pod is a RECORDING worklist, not a voice pick.`),
      { status: 409, code: 'HUMAN_VOICE_LANGUAGE' })
  }
  const picked = normalisePickVoice(voice)
  const entry = { ...picked, picked_by: String(by), picked_at: new Date().toISOString() }
  return updatePicks(supabase, (all) => {
    const row = { ...(all[lang] || {}) }
    if (expect !== undefined) {
      const now = voiceKey(row[g])
      const was = voiceKey(expect)
      if (now !== was) {
        throw Object.assign(
          new Error(`${lang} ${g} has been picked elsewhere since this screen loaded `
            + `(now ${now || 'empty'}, expected ${was || 'empty'}) — reload before overwriting it.`),
          { status: 409, code: 'PICK_MOVED' })
      }
    }
    row[g] = entry
    all[lang] = row
    return all
  })
}

async function clearPick (supabase, { language, gender }) {
  const lang = String(language || '').trim()
  const g = gender === 'f' ? 'f' : 'm'
  return updatePicks(supabase, (all) => {
    const row = { ...(all[lang] || {}) }
    delete row[g]
    if (Object.keys(row).length) all[lang] = row
    else delete all[lang]
    return all
  })
}

module.exports = {
  PICKS_KEY,
  GENDERS,
  pickGenderOf,
  voiceKey,
  normalisePickVoice,
  pickFor,
  overridesFor,
  requiredPicks,
  evaluatePicks,
  describeMissing,
  describeDrift,
  loadPicks,
  updatePicks,
  savePick,
  clearPick,
}
