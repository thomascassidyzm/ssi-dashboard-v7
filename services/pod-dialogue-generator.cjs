/**
 * pod-dialogue-generator.cjs — generate a listening pod for a course by
 * flexing the canonical English scenarios (canonical_pod_scenarios) into the
 * course's language pair, scene by scene, via the Max-plan Claude CLI.
 *
 * This is the dashboard equivalent of hand-authoring a per-language pod
 * markdown and running pod-sync — it slots into the SAME ingestion (reuses
 * pod-sync.assignVoices; writes the same listening_pods + listening_pod_sentences
 * rows). "Draft" is enforced for free: generated sentences have no audio yet,
 * so the player skips them until audio is rendered — text is reviewable +
 * editable in the dashboard first.
 *
 * Resumable + idempotent: works scene-by-scene, upserting by sentence id, so
 * the endpoint can generate within a deadline and be called again to continue.
 *
 * Prompt: services/pod-generation-prompt.txt (designed by the
 * pod-generation-prompt-design workflow). Culture notes: pod-culture-notes.cjs.
 */

const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { claudeChat, HAIKU_MODEL } = require('./shared/claude-cli.cjs')
const { renderPrompt } = require('./pod-generation-prompt.cjs')
const { getCultureNotes, languageName } = require('./pod-culture-notes.cjs')
const { assignVoices, canonicalSpeakerName, extractGenderMarker, inferGenderFromName } = require('../tools/pod-sync.cjs')

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const pad2 = (n) => String(n).padStart(2, '0')
const pad3 = (n) => String(n).padStart(3, '0')
const GEN_MODEL = process.env.POD_GEN_MODEL || 'sonnet'
const SCENE_TIMEOUT_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// parse + validate
// ---------------------------------------------------------------------------

/** Tolerantly pull the {lines:[...]} object out of a model response. */
function parseLines(raw) {
  let s = String(raw || '').trim()
  // strip code fences if present
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  // narrow to the outermost JSON object
  const i = s.indexOf('{'), j = s.lastIndexOf('}')
  if (i !== -1 && j !== -1 && j > i) s = s.slice(i, j + 1)
  const obj = JSON.parse(s)
  if (!obj || !Array.isArray(obj.lines)) throw new Error('response has no "lines" array')
  // canon-v2 break clause: the model reports any minimal cultural deviation it
  // had to make ("deviations": [...]) — surfaced as warnings, never silent.
  const deviations = Array.isArray(obj.deviations) ? obj.deviations.filter(d => typeof d === 'string' && d.trim()) : []
  return { lines: obj.lines, deviations }
}

/**
 * Hard checks (block → retry) + soft checks (warnings, non-blocking).
 * Mirrors the validation_rules from the prompt-design synthesis.
 */
function validateScene(inputLines, outLines) {
  const errors = [], warnings = []
  if (!Array.isArray(outLines)) { errors.push('output is not an array'); return { errors, warnings } }
  if (outLines.length !== inputLines.length) {
    errors.push(`line count ${outLines.length} ≠ input ${inputLines.length}`)
  }
  for (let k = 0; k < inputLines.length; k++) {
    const inp = inputLines[k], out = outLines[k]
    if (!out) { errors.push(`missing output line at index ${k} (global_order ${inp.global_order})`); continue }
    if (Number(out.global_order) !== Number(inp.global_order)) {
      errors.push(`line ${k}: global_order ${out.global_order} ≠ expected ${inp.global_order} (order/alignment)`)
    }
    const t = typeof out.target_text === 'string' ? out.target_text.trim() : ''
    const kn = typeof out.known_text === 'string' ? out.known_text.trim() : ''
    if (!t) errors.push(`line ${inp.global_order}: empty target_text`)
    if (!kn) errors.push(`line ${inp.global_order}: empty known_text`)
    // soft warnings (non-blocking; tuned to avoid false positives)
    //  - digits/symbols in TARGET: numbers should be spoken as words (rule 7)
    if (/[0-9£$€¥]/.test(t)) warnings.push(`line ${inp.global_order}: digits/currency symbol in target (should be spoken words)`)
    //  - a literal £ left in the gloss = un-localised British currency. (The bare
    //    word "pound(s)" is NOT flagged — many target currencies are pounds in
    //    English, e.g. Egyptian/Sudanese pound.)
    if (/£/.test(kn)) warnings.push(`line ${inp.global_order}: £ left in known_text (localise the currency)`)
    // NB: "known == canonical English" is NOT flagged — for English-known
    // courses an unchanged line legitimately glosses back to the source.
    //  - MSA numeral spelling in an Arabic target → TTS mispronounces it as MSA.
    //    (Arabic-only patterns; no-op for other target languages.)
    if (/مائة|مائتين|ثلاثمائة|أربعمائة|خمسمائة|ثمانين|ثلاثين/.test(t)) {
      warnings.push(`line ${inp.global_order}: MSA numeral spelling in target (use colloquial — ميه/ميتين/تمانين/تلاتين)`)
    }
  }
  return { errors, warnings }
}

// ---------------------------------------------------------------------------
// scene generation
// ---------------------------------------------------------------------------

// The breathing ceiling is a DECLARED property of the canonical slate the content
// is flexed from (services/shared/pod-tiers.cjs), never inferred from a slug string
// — Tom's ruling, 2026-09-01. Note the argument: it is the CANONICAL slug, not the
// per-course listening pod slug. Those were one parameter until 2026-09-01, which
// meant a course whose listening pod had been flipped to 'pod-1' silently started
// getting the 12-syllable ceiling for the same beginner content its unflipped
// siblings got at 8.
const { syllableCeilingFor } = require('./shared/pod-tiers.cjs')

// The one canonical English slate every course flexes from. Renamed from 'pod-0'
// on 2026-09-01; the slates that previously held the names 'pod-1' and 'pod-0.5'
// were sacked, archived and deleted the same day. This is the slug of a row in
// `canonical_pod_scenarios` — it is NOT a course's listening-pod slug, which is
// per-course, still 'pod-0' on most courses, and migrating separately.
const CANONICAL_LIVE_SLUG = 'pod-1'

/** Generate one scene → [{global_order, target_text, known_text}] (+ warnings). Retries once on hard failure. */
async function generateScene({ scene, targetLanguage, knownLanguage, cultureNotes, ledger, canonicalSlug }) {
  // The ledger pins localised character names ("Sarah [S1] → Sophie") which the
  // dialogue text follows — the learner-visible speaker label must follow too.
  const nameMap = parseNameMap(ledger)
  const prompt = renderPrompt({
    targetLanguage, knownLanguage, cultureNotes, ledger,
    sceneTitle: scene.title || scene.label || `Scene ${scene.number}`,
    lines: scene.lines,
    syllableCeiling: syllableCeilingFor(canonicalSlug),
  })
  let lastErr = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    let out, deviations
    try {
      const raw = await claudeChat(prompt, { model: GEN_MODEL, timeout: SCENE_TIMEOUT_MS })
      ;({ lines: out, deviations } = parseLines(raw))
    } catch (e) {
      lastErr = `attempt ${attempt}: ${e.message}`
      continue
    }
    const { errors, warnings } = validateScene(scene.lines, out)
    for (const d of deviations) warnings.push(`scene ${scene.number} DEVIATION (break clause): ${d}`)
    if (errors.length === 0) {
      // map by global_order to be safe about ordering
      const byGo = new Map(out.map(o => [Number(o.global_order), o]))
      const lines = scene.lines.map(inp => {
        const o = byGo.get(Number(inp.global_order)) || {}
        return {
          global_order: inp.global_order,
          sentence_number: inp.sentence_number,
          speaker: localiseSpeakerLabel(inp.speaker, scene.number, nameMap),
          target_text: String(o.target_text || '').trim(),
          known_text: String(o.known_text || '').trim(),
        }
      })
      return { lines, warnings }
    }
    lastErr = `attempt ${attempt}: ${errors.slice(0, 4).join('; ')}`
  }
  throw new Error(`scene ${scene.number} (${scene.title}) failed validation — ${lastErr}`)
}

/**
 * Build a BINDING cross-scene consistency ledger for the whole pod in ONE call,
 * so the independently-rendered scenes stay consistent. CANON v2 DOCTRINE
 * (Aran 2026-06-10): the canon is NOT localised — names/places/items stay.
 * The ledger pins only what fidelity itself requires to be consistent:
 * transliterations (non-Latin scripts), one currency conversion with plausible
 * local prices, the target language's own name, identical renderings for
 * recurring canonical lines, and the register (T/V) choice per relationship.
 * Pasted verbatim into every scene's prompt. Returns '' on failure (scenes
 * still generate, just without the cross-scene pin).
 * NB: deliberately NO "NAMES … → …" section — parseNameMap() must find
 * nothing, so learner-visible speaker labels stay canonical (Sarah stays SARAH).
 */
async function buildPodGlossary({ targetLanguage, cultureNotes, canonicalScenes }) {
  const allLines = canonicalScenes.map(s =>
    `SCENE ${s.number} (${s.title}):\n` + s.lines.map(l => `  ${l.global_order}. [${l.speaker}] ${String(l.english_text).replace(/\[target language\]/gi, targetLanguage)}`).join('\n')
  ).join('\n\n')
  const prompt = `You are pinning a BINDING CONSISTENCY LEDGER for a ${canonicalScenes.length}-scene "${targetLanguage}" listening pod. The canonical English script below is rendered FAITHFULLY into ${targetLanguage} — names, places, venues and items are NOT localised or substituted; the scenes must come out parallel to the canon. Each scene is rendered independently, so your ledger pins the few choices that must be IDENTICAL across scenes. Read ALL the canonical lines, then produce a concise ledger the scene-renderers will follow verbatim.

Produce these sections (concise labelled prose, no preamble):
1. TRANSLITERATION — only if ${targetLanguage} is not normally written in Latin script: pin ONE standard rendering of every personal name and place name in the script, used identically everywhere. Key each entry EXACTLY as: "<canonical name> = <target-script rendering>" (use "=", never an arrow). If the language uses Latin script, write "TRANSLITERATION: not needed — names stay as written."
2. PRICES — pick ONE notional conversion to the local currency and give the local amount for EACH money figure in the script, as SPOKEN WORDS in natural ${targetLanguage} spelling, at realistic CURRENT LOCAL price levels (don't be implausibly cheap), and strictly monotonic so distinct source amounts get distinct local amounts. Key as: "<source amount> → <local amount in words>".
3. TARGET-LANGUAGE NAME — the script mentions ${targetLanguage} by name (e.g. "I'm learning ${targetLanguage}"). Pin the ONE standard everyday word ${targetLanguage} speakers use for their own language, used identically in every scene.
4. RECURRING LINES — list every canonical sentence or formula that appears in MORE THAN ONE scene (greetings, "What can I get you?", "Could I pay by card?", etc.) and pin ONE ${targetLanguage} rendering for each, reused verbatim wherever it recurs.
5. REGISTER — pin the unmarked polite second-person / honorific level for each relationship type in the pod (customer–staff, strangers, friends), so every scene makes the same T/V choice.
6. SPEAKER GENDER — ONLY if ${targetLanguage} marks the SPEAKER'S OWN gender in ordinary speech (e.g. Thai politeness particles ครับ/ค่ะ, gendered first-person pronouns, gendered verb/adjective forms for "I"). Assign EVERY distinct speaker label ONE gender and pin it, so each scene renders that speaker's gendered forms consistently AND downstream voice casting gives them a matching voice. A man must never be scripted with female forms, or vice versa. Key EXACTLY as: "<speaker label> = male" or "<speaker label> = female". Cover every speaker label in the script. If ${targetLanguage} does NOT mark speaker gender this way, write "SPEAKER GENDER: not marked in ${targetLanguage} — skip."

CULTURE NOTES:
${cultureNotes}

CANONICAL SCRIPT:
${allLines}

Return ONLY the ledger.`
  // Use haiku for the ledger: it's an entity-mapping task (assign names/places/
  // prices consistently), much faster + lighter than sonnet, which matters when
  // the CLI is under load. The scenes (sonnet) do the actual dialogue craft.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await claudeChat(prompt, { model: process.env.POD_LEDGER_MODEL || HAIKU_MODEL, timeout: SCENE_TIMEOUT_MS })
      const t = (out || '').trim()
      if (t) return t
    } catch (e) {
      if (attempt === 2) console.warn(`[podGlossary] failed after 2 attempts: ${e.message}`)
    }
  }
  return ''
}

// ---------------------------------------------------------------------------
// ledger name map → speaker labels
// ---------------------------------------------------------------------------

/** Parse the ledger's NAMES section into [{source, scenes|null, local}].
 *  Entry shape pinned by the glossary prompt: "Sarah [S1] → Sophie". Tolerant
 *  of separators (. / ;) and scope spellings ("S1", "S5, restaurant",
 *  "@scene 2"). Returns [] when the ledger is absent or unparseable — speaker
 *  labels then stay canonical, which is always safe. */
function parseNameMap(ledger) {
  if (!ledger) return []
  // NAMES section = from the NAMES heading to the next section heading.
  const m = String(ledger).match(/NAMES[^\n]*\n?([\s\S]*?)(?=\n\s*(?:\*{0,2}\s*)?(?:\d+\s*[.)]\s*)?(?:\*{0,2})(?:PLACES|PRICES|PAIRED|POLITENESS)|$)/i)
  if (!m) return []
  const entries = []
  const re = /(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)*)\s*\[([^\]]*)\]\s*(?:→|->)\s*(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)*)/gu
  for (const hit of m[1].matchAll(re)) {
    const scenes = [...hit[2].matchAll(/S\s*(\d+)/gi)].map(s => Number(s[1]))
    entries.push({ source: hit[1].trim(), scenes: scenes.length ? scenes : null, local: hit[3].trim() })
  }
  return entries
}

/** Apply the ledger's pinned local name to a speaker LABEL, preserving any
 *  paren annotation ("Sarah (8 am)" → "Sophie (8 am)"). Labels are
 *  learner-visible in the player, so they must match the names the dialogue
 *  actually uses. sceneNumber null = match any scene (pod-global contexts). */
function localiseSpeakerLabel(raw, sceneNumber, nameMap) {
  if (!raw || !nameMap || !nameMap.length) return raw
  const base = canonicalSpeakerName(raw)
  const hit = nameMap.find(e =>
    e.source.toLowerCase() === base.toLowerCase() &&
    (sceneNumber == null || !e.scenes || e.scenes.includes(sceneNumber)))
  return hit ? raw.replace(base, hit.local) : raw
}

/** Localised label handed to VOICE assignment: carry the canonical name's
 *  resolved gender along as an explicit (F)/(M) marker — the name heuristic
 *  knows "Sarah", not necessarily "Lucie" (or a Japanese/Arabic local name).
 *  assignVoices strips parens for the map key, so the marker never leaks
 *  into the learner-visible label. */
function localiseSpeakerForVoices(raw, sceneNumber, nameMap) {
  const loc = localiseSpeakerLabel(raw, sceneNumber, nameMap)
  if (loc === raw) return raw
  if (extractGenderMarker(loc)) return loc // canonical marker carried over in the annotation
  const g = inferGenderFromName(canonicalSpeakerName(raw)) || extractGenderMarker(raw)
  return g ? `${loc} (${g.toUpperCase()})` : loc
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function loadCourse(courseCode) {
  const { data, error } = await supabase
    .from('courses').select('course_code, known_lang, target_lang, display_name')
    .eq('course_code', courseCode).maybeSingle()
  if (error) throw new Error(`load course: ${error.message}`)
  if (!data) throw new Error(`course not found: ${courseCode}`)
  return data
}

/** Canonical scenarios grouped into scenes (ordered). */
async function loadCanonicalScenes(canonicalSlug) {
  const { data, error } = await supabase
    .from('canonical_pod_scenarios')
    .select('scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text')
    .eq('pod_slug', canonicalSlug).order('global_order', { ascending: true })
  if (error) throw new Error(`load canonical: ${error.message}`)
  const byScene = new Map()
  for (const r of data || []) {
    if (!byScene.has(r.scene_number)) {
      byScene.set(r.scene_number, { number: r.scene_number, label: r.scene_label, title: r.scene_title, subtitle: r.scene_subtitle, lines: [] })
    }
    byScene.get(r.scene_number).lines.push({
      global_order: r.global_order, sentence_number: r.sentence_number, speaker: r.speaker, english_text: r.english_text,
    })
  }
  return [...byScene.values()]
}

/** Scene numbers already generated (have sentence rows) for this pod. */
async function generatedSceneNumbers(podId) {
  const { data, error } = await supabase
    .from('listening_pod_sentences').select('scene_number').eq('pod_id', podId)
  if (error) throw new Error(`load generated scenes: ${error.message}`)
  return new Set((data || []).map(r => r.scene_number))
}

/** True if any sentence already has audio (so we don't clobber a live pod). */
async function podHasAudio(podId) {
  const { data, error } = await supabase
    .from('listening_pod_sentences').select('id').eq('pod_id', podId).not('target_audio_id', 'is', null).limit(1)
  if (error) throw new Error(`audio check: ${error.message}`)
  return (data || []).length > 0
}

/**
 * REFUSE to generate into a pod whose id-space is occupied by another pod's rows.
 *
 * Sentence row ids embed the pod id (`<course>:<slug>:SC01-S001`) and are upserted
 * `onConflict: 'id'`, so a row carrying THIS pod's id prefix while living in ANOTHER
 * pod is not a row we would create — it is a row we would STEAL, dragging it into this
 * pod and overwriting its text on the way.
 *
 * That is not hypothetical. Gating a pod by repointing `pod_id` (rather than cloning
 * with `tools/pods/clone-pod.cjs`, which re-slugs the ids) leaves the working copy's
 * rows still carrying the LIVE pod's id prefix. On 2026-08-10 a Generate on the
 * defaulted `pod-0` slug pulled 19 such rows out of `cym_n_for_eng:pod-0-unrecorded`
 * back into the live pod and overwrote a day of the Welsh editor's proofreading with
 * fresh machine translation. The gate was a naming convention, and a defaulted form
 * field walked straight through it — see docs/pods/cym-n-pod0-19-sentence-move-2026-08-10.md.
 *
 * This only ever fires on a genuine CROSS-POD id collision. A generate into an empty
 * pod, or into its own rows, never trips it — which is why it is safe estate-wide.
 */
async function assertNoForeignRowIds(podId, { force = false, log = () => {} } = {}) {
  const { data, error } = await supabase
    .from('listening_pod_sentences').select('id, pod_id')
    .like('id', `${podId}:%`).neq('pod_id', podId)
  if (error) throw new Error(`cross-pod id check: ${error.message}`)
  const foreign = data || []
  if (!foreign.length) return

  const owners = [...new Set(foreign.map(r => r.pod_id))]
  const sample = foreign.slice(0, 5).map(r => r.id).join(', ')
  const detail =
    `${foreign.length} row id(s) belonging to ${podId} currently live in ${owners.join(', ')} ` +
    `(e.g. ${sample}${foreign.length > 5 ? ', …' : ''}). Generating ${podId} would upsert onto those ids ` +
    `and STEAL those rows out of ${owners.join(', ')}, overwriting their text. ` +
    `Fix: re-slug that pod's row ids to match its own slug (tools/pods/clone-pod.cjs is the naming ` +
    `this expects), or generate a different slug.`

  if (force) {
    log(`[${podId}] !! CROSS-POD ID COLLISION OVERRIDDEN BY force:true — ${detail}`)
    return
  }
  throw new Error(`REFUSING to generate ${podId}: ${detail}`)
}

/**
 * REFUSE to overwrite a pod header whose title carries a `[GATED` marker. That title is
 * the human-readable note saying "this pod is deliberately held off learners"; the
 * 2026-08-10 incident began by silently replacing exactly such a title with the generated
 * template, which is what removed the only visible sign that the pod was gated.
 */
async function assertNotGated(podId, { force = false, log = () => {} } = {}) {
  const { data, error } = await supabase
    .from('listening_pods').select('title').eq('id', podId).maybeSingle()
  if (error) throw new Error(`gated-pod check: ${error.message}`)
  const title = (data && data.title) || ''
  if (!title.includes('[GATED')) return
  const detail = `its title is "${title}" — that marker means the pod is deliberately held off learners. ` +
    `Clear the marker deliberately if you really mean to generate over it.`
  if (force) {
    log(`[${podId}] !! GATED POD OVERWRITE OVERRIDDEN BY force:true — ${detail}`)
    return
  }
  throw new Error(`REFUSING to generate ${podId}: ${detail}`)
}

/** Upsert the listening_pods header row (speakers + metadata). */
async function upsertPodRow({ podId, courseCode, podSlug, targetLanguage, canonicalScenes, knownLang, targetLang, ledger }) {
  // Voice-map keys must match the (localised) labels written on sentence rows —
  // phase8 resolves canonicalSpeakerName(sentence.speaker) against these keys.
  const nameMap = parseNameMap(ledger)
  const rawSpeakers = [...new Set(canonicalScenes.flatMap(s =>
    s.lines.map(l => l.speaker && localiseSpeakerForVoices(l.speaker, s.number, nameMap)).filter(Boolean)))]
  // Voices are an AUDIO-phase concern. Don't let a missing voice pool block
  // draft text generation — degrade gracefully and flag it for later.
  let speakers, voiceNote = null
  try {
    speakers = await assignVoices(rawSpeakers, targetLang, knownLang)
  } catch (e) {
    speakers = { _default: { deferred: true } }
    for (const s of rawSpeakers) speakers[canonicalSpeakerName(s)] = { deferred: true }
    voiceNote = `no voice pool for "${targetLang}" — voices deferred; assign before audio generation (${e.message})`
  }
  const sections = canonicalScenes.map(s => ({
    number: s.number, label: s.label, title: s.title, subtitle: s.subtitle, sentence_count: s.lines.length,
  }))
  // Preserve scene_hashes (the sync diff baseline) across header re-writes.
  const { data: existing } = await supabase.from('listening_pods').select('id, metadata').eq('id', podId).maybeSingle()
  const priorHashes = (existing && existing.metadata && existing.metadata.scene_hashes) || {}
  const row = {
    id: podId, course_code: courseCode, pod_type: 'core', slug: podSlug,
    // Titled from the slug, not hard-coded "Pod 0": pods are 1-based from
    // Tom's ruling of 2026-08-22 and hrv_for_eng already serves `pod-1`, whose
    // title a regeneration must not rewrite back to "Pod 0".
    title: `${targetLanguage} Listening Pods — Pod ${String(podSlug).replace(/^pod-/, '')}`,
    speakers,
    metadata: { sections, generated_from: 'canonical_pod_scenarios', status: 'draft', consistency_ledger: ledger || null, name_map: nameMap.length ? nameMap : null, scene_hashes: priorHashes },
    source_file: 'generated:canonical',
    updated_at: new Date().toISOString(),
  }
  // A POD IS BORN HELD (Tom, 2026-08-23). The column's DB default is 'live' so
  // that the 110 pods that already existed keep behaving exactly as they did —
  // but nothing should become learner-reachable merely by being CREATED, least
  // of all a machine-written draft with no audio and no proofread. So the
  // generator overrides the default on creation, and creation only: on a
  // regeneration `existing` is set and `visibility` is left out of the row
  // entirely, which means the upsert's UPDATE path never touches it. A live pod
  // stays live when you re-flex it; a held pod stays held.
  //
  // Release is a human act through POST /api/admin/pods/:course/:slug/visibility.
  // Do not add a "…and set it live when it's finished" branch here.
  if (!existing) row.visibility = 'held'
  const { error } = await supabase.from('listening_pods').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(`pod upsert: ${error.message}`)
  return { speakers, voiceNote }
}

/** Upsert a generated scene's sentences (idempotent by id). Generated/regenerated
 *  text never carries old audio — null the audio so nothing stale survives the
 *  text change (it gets re-recorded downstream). The deprecated explainer
 *  columns are nulled for the same reason and nothing refills them: leaving an
 *  old explainer attached to new text would make the row lie, so the wipe stays
 *  even though explainers were retired on 2026-08-24. */
async function writeSceneSentences({ podId, scene, lines }) {
  const rows = lines.map(l => ({
    id: `${podId}:SC${pad2(scene.number)}-S${pad3(l.sentence_number)}`,
    pod_id: podId,
    scene_number: scene.number,
    sentence_number: l.sentence_number,
    global_order: l.global_order,
    speaker: l.speaker,
    target_text: l.target_text,
    known_text: l.known_text,
    target_audio_id: null,
    known_audio_id: null,
    explainer_text: null,
    explainer_audio_id: null,
    explainer_decomposition: null,
  }))
  const { error } = await supabase.from('listening_pod_sentences').upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`sentence upsert (scene ${scene.number}): ${error.message}`)
  return rows.length
}

/** Wipe a pod's sentences — used on force-regen for a clean slate (no orphans
 *  from a differently-structured prior pod, no stale audio). */
async function deleteAllSentences(podId) {
  const { error } = await supabase.from('listening_pod_sentences').delete().eq('pod_id', podId)
  if (error) throw new Error(`sentence wipe: ${error.message}`)
}

/** Wipe a single scene's sentences (sync mode — only the changed scene). */
async function deleteSceneSentences(podId, sceneNumber) {
  const { error } = await supabase.from('listening_pod_sentences')
    .delete().eq('pod_id', podId).eq('scene_number', sceneNumber)
  if (error) throw new Error(`scene wipe (${sceneNumber}): ${error.message}`)
}

/** Stable content hash of a canonical scene (speaker + English per line). The
 *  diff key for `sync`: same hash ⇒ nothing to re-flex for this scene. */
function sceneHash(scene) {
  const basis = scene.lines.map(l => `${l.speaker}${l.english_text}`).join('')
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16)
}

/** Existing pod sentences grouped by scene number (for bootstrap detection). */
async function loadExistingByScene(podId) {
  const { data, error } = await supabase.from('listening_pod_sentences')
    .select('scene_number, sentence_number, speaker, known_text').eq('pod_id', podId)
  if (error) throw new Error(`load existing: ${error.message}`)
  const m = new Map()
  for (const r of (data || [])) {
    if (!m.has(r.scene_number)) m.set(r.scene_number, [])
    m.get(r.scene_number).push(r)
  }
  return m
}

/** Bootstrap change detection for pods generated before scene_hashes existed:
 *  names/details are localised (Sarah→Camille) so we can't compare English
 *  verbatim — the stable signal is the LINE COUNT. A scene whose canonical line
 *  count differs from the live pod has definitely changed. (Once a scene has a
 *  stored hash, detection is exact; this only covers the first sync, and only
 *  misses a count-neutral edit — which the next, hash-based, sync catches.) */
function sceneChangedByContent(scene, existingLines) {
  if (!existingLines) return true
  return existingLines.length !== scene.lines.length
}

/** Re-sequence global_order across the whole pod (line counts shift when a
 *  scene grows/shrinks). Updates only rows whose number actually changed. */
async function restampGlobalOrder(podId) {
  const { data, error } = await supabase.from('listening_pod_sentences')
    .select('id, scene_number, sentence_number, global_order')
    .eq('pod_id', podId).order('scene_number').order('sentence_number')
  if (error) throw new Error(`restamp load: ${error.message}`)
  let go = 0, changed = 0
  for (const r of (data || [])) {
    go += 1
    if (r.global_order !== go) {
      const { error: e } = await supabase.from('listening_pod_sentences')
        .update({ global_order: go }).eq('id', r.id)
      if (e) throw new Error(`restamp ${r.id}: ${e.message}`)
      changed += 1
    }
  }
  return changed
}

/** Merge scene→hash map into the pod's metadata.scene_hashes (preserving the
 *  rest of metadata). The persisted record of "what canonical this pod reflects". */
async function updatePodSceneHashes(podId, hashes) {
  const { data, error } = await supabase.from('listening_pods').select('metadata').eq('id', podId).maybeSingle()
  if (error) throw new Error(`hash load: ${error.message}`)
  const metadata = { ...(data?.metadata || {}), scene_hashes: hashes }
  const { error: e } = await supabase.from('listening_pods').update({ metadata }).eq('id', podId)
  if (e) throw new Error(`hash write: ${e.message}`)
}

// ---------------------------------------------------------------------------
// orchestration
// ---------------------------------------------------------------------------

/**
 * Generate (a batch of) scenes for a course's pod. Resumable: skips
 * already-generated scenes unless force; stops at deadlineMs / maxScenes.
 *
 * @returns {Promise<{podId, courseCode, totalScenes, alreadyDone, generatedNow,
 *   remaining, more_remaining, cultureSource, warnings, scenesDone:number[]}>}
 */
async function generatePodBatch({ courseCode, podSlug = 'pod-0', canonicalSlug = CANONICAL_LIVE_SLUG, force = false, mode, deadlineMs = Infinity, maxScenes = Infinity, log = () => {} }) {
  const start = Date.now()
  const podId = `${courseCode}:${podSlug}`
  const course = await loadCourse(courseCode)
  // The course_code prefix carries the linguistic VARIETY (ara_eg, spa_mx,
  // por_br, fra_ca) which is more specific than the target_lang column (ara,
  // spa, por, fra) — use it for the language NAME + culture notes so we get
  // Egyptian colloquial, not generic MSA. The target_lang column stays the
  // voice-pool key.
  const targetVariant = courseCode.split('_for_')[0] || course.target_lang
  const targetLanguage = languageName(targetVariant)
  const knownLanguage = languageName(course.known_lang)

  const canonicalScenes = await loadCanonicalScenes(canonicalSlug)
  if (canonicalScenes.length === 0) throw new Error(`no canonical scenarios for pod_slug=${canonicalSlug}`)

  // Refuse before ANY write and before any model spend — this covers every mode
  // ('full', 'sync', 'resume'), because sync is dispatched below.
  await assertNoForeignRowIds(podId, { force, log })
  await assertNotGated(podId, { force, log })

  // mode: 'full'  = clean rebuild (today's `force`: wipe + re-flex every scene)
  //       'sync'  = incremental: diff canonical vs the live pod, re-flex ONLY
  //                 changed/new/removed scenes, preserving everything else + its
  //                 audio (better×simpler×cheaper — a canonical tweak costs one
  //                 scene, not the whole pod across every language)
  //       'resume'= default: generate only not-yet-generated scenes; refuse a
  //                 pod that already has audio (the original safety behaviour)
  mode = mode || (force ? 'full' : 'resume')
  if (mode === 'sync') {
    return syncPodToCanonical({ podId, courseCode, podSlug, canonicalSlug, course, targetVariant, targetLanguage, knownLanguage, canonicalScenes, maxScenes, deadlineMs, start, log })
  }

  if (mode !== 'full' && await podHasAudio(podId)) {
    throw new Error(`${podId} already has audio — use mode:'sync' to update incrementally, or force/mode:'full' to rebuild`)
  }

  if (mode === 'full') await deleteAllSentences(podId)

  const done = mode === 'full' ? new Set() : await generatedSceneNumbers(podId)
  const { notes: cultureNotes, source: cultureSource } = await getCultureNotes(targetVariant)

  // Cross-scene consistency ledger: build once per pod, persist in metadata,
  // reuse on resume so every scene (and every resumed endpoint call) pins the
  // same names/places/prices.
  const { data: existingPod } = await supabase.from('listening_pods').select('metadata').eq('id', podId).maybeSingle()
  let ledger = (mode !== 'full' && existingPod && existingPod.metadata && existingPod.metadata.consistency_ledger) || ''
  if (!ledger) {
    ledger = await buildPodGlossary({ targetLanguage, cultureNotes, canonicalScenes })
  }
  log(`[${podId}] mode=${mode} target=${targetLanguage} (${targetVariant}) known=${knownLanguage} · culture=${cultureSource} · ledger=${ledger ? ledger.length + 'ch' : 'none'} · ${canonicalScenes.length} scenes, ${done.size} done`)

  const { voiceNote } = await upsertPodRow({ podId, courseCode, podSlug, targetLanguage, canonicalScenes, knownLang: course.known_lang, targetLang: course.target_lang, ledger })

  // Hash baseline: start fresh on full, preserve on resume.
  const hashes = mode === 'full' ? {} : { ...(existingPod?.metadata?.scene_hashes || {}) }

  const pending = canonicalScenes.filter(s => !done.has(s.number))
  const warnings = []
  if (voiceNote) warnings.push(voiceNote)
  const scenesDone = []
  let generatedNow = 0

  for (const scene of pending) {
    if (generatedNow >= maxScenes) break
    if (Date.now() - start >= deadlineMs && generatedNow > 0) break
    log(`  scene ${scene.number} [${scene.label}] ${scene.title} — generating (${scene.lines.length} lines)…`)
    const { lines, warnings: w } = await generateScene({ scene, targetLanguage, knownLanguage, cultureNotes, ledger, canonicalSlug })
    const n = await writeSceneSentences({ podId, scene, lines })
    hashes[scene.number] = sceneHash(scene)
    generatedNow++
    scenesDone.push(scene.number)
    for (const x of w) warnings.push(`scene ${scene.number}: ${x}`)
    log(`    ✓ ${n} sentences written${w.length ? ` (${w.length} warnings)` : ''}`)
  }

  if (scenesDone.length) await updatePodSceneHashes(podId, hashes)

  const remaining = pending.length - generatedNow
  return {
    podId, courseCode, targetLanguage, knownLanguage, mode,
    totalScenes: canonicalScenes.length, alreadyDone: done.size,
    generatedNow, remaining, more_remaining: remaining > 0,
    cultureSource, warnings, scenesDone,
  }
}

/**
 * sync mode — propagate a canonical edit surgically. Diffs each canonical scene
 * (by content hash) against what the live pod last reflects; re-flexes ONLY the
 * scenes that changed (delete + re-translate that scene), deletes scenes dropped
 * from canonical, re-stamps global_order, and leaves every untouched scene's
 * text AND audio exactly as it was. Reuses the pod's consistency ledger so a
 * re-flexed scene stays coherent with its neighbours.
 *
 * Audio is preserved automatically: only re-flexed scenes get null audio (new
 * rows), so a downstream recolour + /generate-pods fills just those. Run
 * recolour after sync — upsertPodRow reassigns draft voices for any NEW speaker.
 */
async function syncPodToCanonical({ podId, courseCode, podSlug, canonicalSlug = CANONICAL_LIVE_SLUG, course, targetVariant, targetLanguage, knownLanguage, canonicalScenes, maxScenes, deadlineMs, start, log, allowHandAuthored = false }) {
  const { data: pod } = await supabase.from('listening_pods').select('metadata, source_file').eq('id', podId).maybeSingle()
  if (!pod) {
    log(`[${podId}] no existing pod — running a full build instead of sync`)
    return generatePodBatch({ courseCode, podSlug, canonicalSlug, force: true, deadlineMs, maxScenes, log })
  }
  // SAFETY (totality of impact): a hand-authored pod (synced from a markdown
  // source, not generated from canonical) holds human-crafted text. Machine
  // sync would overwrite changed scenes with generated translation — different
  // names/register than the human scenes around them. Refuse: the canonical
  // edit should reach these via their SOURCE markdown, not a re-flex.
  const handAuthored = pod.source_file && !String(pod.source_file).startsWith('generated:')
  if (handAuthored && !allowHandAuthored) {
    throw new Error(`${podId} is hand-authored (source: ${pod.source_file}) — sync would overwrite human-crafted scenes. Edit the source markdown + re-sync, or pass allowHandAuthored to override.`)
  }

  const storedHashes = (pod.metadata && pod.metadata.scene_hashes) || null
  const existingByScene = await loadExistingByScene(podId)
  const { notes: cultureNotes, source: cultureSource } = await getCultureNotes(targetVariant)
  let ledger = (pod.metadata && pod.metadata.consistency_ledger) || ''
  if (!ledger) ledger = await buildPodGlossary({ targetLanguage, cultureNotes, canonicalScenes })

  // Diff: which canonical scenes changed?
  const changed = []
  for (const scene of canonicalScenes) {
    const h = sceneHash(scene)
    const isChanged = (storedHashes && storedHashes[scene.number] != null)
      ? storedHashes[scene.number] !== h
      : sceneChangedByContent(scene, existingByScene.get(scene.number))
    if (isChanged) changed.push(scene)
  }
  const canonicalNums = new Set(canonicalScenes.map(s => s.number))
  const removedScenes = [...existingByScene.keys()].filter(n => !canonicalNums.has(n))

  // Refresh the header (preserves scene_hashes + ledger; picks up any NEW speaker).
  const { voiceNote } = await upsertPodRow({ podId, courseCode, podSlug, targetLanguage, canonicalScenes, knownLang: course.known_lang, targetLang: course.target_lang, ledger })
  const warnings = []
  if (voiceNote) warnings.push(voiceNote)

  log(`[${podId}] mode=sync target=${targetLanguage} (${targetVariant}) · culture=${cultureSource} · ${changed.length}/${canonicalScenes.length} scenes changed${removedScenes.length ? `, ${removedScenes.length} removed` : ''}`)

  // Final hash map: unchanged scenes stamp immediately (esp. bootstrap, where
  // there was no stored hash); changed scenes stamp only after a successful
  // re-flex, so an interrupted batch re-detects them next call.
  const finalHashes = { ...(storedHashes || {}) }
  for (const scene of canonicalScenes) if (!changed.includes(scene)) finalHashes[scene.number] = sceneHash(scene)
  for (const n of removedScenes) delete finalHashes[n]

  const regenerated = []
  let did = 0
  for (const scene of changed) {
    if (did >= maxScenes) break
    if (Date.now() - start >= deadlineMs && did > 0) break
    log(`  scene ${scene.number} [${scene.label}] CHANGED — re-flexing (${scene.lines.length} lines)…`)
    const { lines, warnings: w } = await generateScene({ scene, targetLanguage, knownLanguage, cultureNotes, ledger, canonicalSlug })
    await deleteSceneSentences(podId, scene.number)
    await writeSceneSentences({ podId, scene, lines })
    finalHashes[scene.number] = sceneHash(scene)
    regenerated.push(scene.number)
    did++
    for (const x of w) warnings.push(`scene ${scene.number}: ${x}`)
    log(`    ✓ scene ${scene.number} re-flexed (${lines.length} lines)`)
  }
  for (const n of removedScenes) { await deleteSceneSentences(podId, n); log(`  scene ${n} removed from canonical — deleted`) }

  const restamped = await restampGlobalOrder(podId)
  await updatePodSceneHashes(podId, finalHashes)

  const remaining = changed.length - regenerated.length
  return {
    podId, courseCode, targetLanguage, knownLanguage, mode: 'sync',
    totalScenes: canonicalScenes.length,
    changedScenes: changed.map(s => s.number), regenerated, removedScenes,
    skipped: canonicalScenes.length - changed.length,
    restamped, remaining, more_remaining: remaining > 0,
    cultureSource, warnings, scenesDone: regenerated,
  }
}

/** One-off repair for pods generated before speaker labels followed the ledger
 *  name map: relabel existing sentence rows from the STORED ledger (no re-flex,
 *  no audio touched) and rebuild the header so voice-map keys match. */
async function relabelPodSpeakers({ courseCode, podSlug = 'pod-0', canonicalSlug = CANONICAL_LIVE_SLUG, log = () => {} }) {
  const podId = `${courseCode}:${podSlug}`
  const course = await loadCourse(courseCode)
  const { data: pod } = await supabase.from('listening_pods').select('metadata, source_file').eq('id', podId).maybeSingle()
  if (!pod) throw new Error(`${podId} not found`)
  if (pod.source_file && !String(pod.source_file).startsWith('generated:')) {
    throw new Error(`${podId} is hand-authored (source: ${pod.source_file}) — relabel only applies to generated pods`)
  }
  // Ends in an upsertPodRow, which would replace a gating title with the generated template.
  await assertNotGated(podId, { log })
  const ledger = (pod.metadata && pod.metadata.consistency_ledger) || ''
  const nameMap = parseNameMap(ledger)
  if (!nameMap.length) { log(`[${podId}] no NAMES entries in ledger — nothing to relabel`); return { podId, relabelled: 0, nameMap } }
  const { data: rows, error } = await supabase.from('listening_pod_sentences')
    .select('id, scene_number, speaker').eq('pod_id', podId)
  if (error) throw new Error(`relabel load: ${error.message}`)
  let relabelled = 0
  for (const r of rows || []) {
    const loc = localiseSpeakerLabel(r.speaker, r.scene_number, nameMap)
    if (loc !== r.speaker) {
      const { error: e } = await supabase.from('listening_pod_sentences').update({ speaker: loc }).eq('id', r.id)
      if (e) throw new Error(`relabel ${r.id}: ${e.message}`)
      log(`  ${r.id}: "${r.speaker}" → "${loc}"`)
      relabelled++
    }
  }
  const targetVariant = courseCode.split('_for_')[0] || course.target_lang
  const canonicalScenes = await loadCanonicalScenes(canonicalSlug)
  await upsertPodRow({ podId, courseCode, podSlug, targetLanguage: languageName(targetVariant), canonicalScenes, knownLang: course.known_lang, targetLang: course.target_lang, ledger })
  log(`[${podId}] relabelled ${relabelled} rows; header speakers rebuilt (${nameMap.length} name-map entries)`)
  return { podId, relabelled, nameMap }
}

module.exports = { generatePodBatch, generateScene, validateScene, parseLines, loadCanonicalScenes, loadCourse, buildPodGlossary, parseNameMap, localiseSpeakerLabel, relabelPodSpeakers }

// CLI: node services/pod-dialogue-generator.cjs <courseCode> [--force|--sync|--relabel] [--max=N]
//   --force    full rebuild (wipe + re-flex all)
//   --sync     incremental: re-flex only canonical scenes that changed
//   --relabel  repair-only: apply the stored ledger's name map to existing
//              speaker labels (no re-flex, no audio touched)
if (require.main === module) {
  require('dotenv').config()
  const courseCode = process.argv.find(a => !a.startsWith('--') && a.includes('_'))
  const force = process.argv.includes('--force')
  const mode = process.argv.includes('--sync') ? 'sync' : undefined
  const maxArg = process.argv.find(a => a.startsWith('--max='))
  const maxScenes = maxArg ? Number(maxArg.slice(6)) : Infinity
  if (!courseCode) { console.error('usage: node services/pod-dialogue-generator.cjs <courseCode> [--force|--sync|--relabel] [--max=N]'); process.exit(1) }
  ;(async () => {
    if (process.argv.includes('--relabel')) {
      const r = await relabelPodSpeakers({ courseCode, log: (...a) => console.log(...a) })
      console.log('\nRESULT:', JSON.stringify(r, null, 1))
      return
    }
    const r = await generatePodBatch({ courseCode, force, mode, maxScenes, log: (...a) => console.log(...a) })
    console.log('\nRESULT:', JSON.stringify({ ...r, warnings: r.warnings.length }, null, 1))
    if (r.warnings.length) { console.log('\nwarnings:'); r.warnings.forEach(w => console.log('  - ' + w)) }
  })().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
}
