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

const { createClient } = require('@supabase/supabase-js')
const { claudeChat } = require('./shared/claude-cli.cjs')
const { renderPrompt } = require('./pod-generation-prompt.cjs')
const { getCultureNotes, languageName } = require('./pod-culture-notes.cjs')
const { assignVoices, canonicalSpeakerName } = require('../tools/pod-sync.cjs')

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
  return obj.lines
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

/** Generate one scene → [{global_order, target_text, known_text}] (+ warnings). Retries once on hard failure. */
async function generateScene({ scene, targetLanguage, knownLanguage, cultureNotes, ledger }) {
  const prompt = renderPrompt({
    targetLanguage, knownLanguage, cultureNotes, ledger,
    sceneTitle: scene.title || scene.label || `Scene ${scene.number}`,
    lines: scene.lines,
  })
  let lastErr = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    let out
    try {
      const raw = await claudeChat(prompt, { model: GEN_MODEL, timeout: SCENE_TIMEOUT_MS })
      out = parseLines(raw)
    } catch (e) {
      lastErr = `attempt ${attempt}: ${e.message}`
      continue
    }
    const { errors, warnings } = validateScene(scene.lines, out)
    if (errors.length === 0) {
      // map by global_order to be safe about ordering
      const byGo = new Map(out.map(o => [Number(o.global_order), o]))
      const lines = scene.lines.map(inp => {
        const o = byGo.get(Number(inp.global_order)) || {}
        return {
          global_order: inp.global_order,
          sentence_number: inp.sentence_number,
          speaker: inp.speaker,
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
 * so the independently-generated scenes resolve recurring entities identically
 * (recurring names → one local name; each distinct landmark → a DISTINCT local
 * place; a single currency conversion with monotonic, plausible local prices;
 * paired-choice items kept genuinely different). Pasted verbatim into every
 * scene's prompt. Returns '' on failure (scenes still generate, just without
 * the cross-scene pin).
 */
async function buildPodGlossary({ targetLanguage, cultureNotes, canonicalScenes }) {
  const allLines = canonicalScenes.map(s =>
    `SCENE ${s.number} (${s.title}):\n` + s.lines.map(l => `  ${l.global_order}. [${l.speaker}] ${l.english_text}`).join('\n')
  ).join('\n\n')
  const prompt = `You are pinning a BINDING CONSISTENCY LEDGER for a ${canonicalScenes.length}-scene "${targetLanguage}" listening pod. The scenes are written independently, so to keep the whole pod coherent when heard in sequence, recurring real-world entities must resolve to the SAME local choice everywhere. Read ALL the canonical English lines, then produce a concise ledger the scene-writers will follow verbatim.

Produce these sections (concise labelled prose, no preamble):
1. NAMES — apply ONE consistent rule to ALL Western personal names (either transliterate all, or substitute all with ${targetLanguage}-culture names — do not mix). For a RECURRING CHARACTER (the same individual appearing in more than one scene), pin ONE local name used everywhere. But where the SAME source name is just an incidental example in UNRELATED scenes (e.g. a booking surname in a restaurant scene and again in a different hotel scene = two different customers), give each a DIFFERENT local name so it doesn't read as a template repeat. Key as: "<source name> [@scene(s)] → <local name>".
2. PLACES — every distinct landmark / destination / venue-type that needs localising → a DISTINCT, believable ${targetLanguage}-culture equivalent. NO two different source places may map to the same local place. Also AVOID landing two adjacent navigation/destination scenes on the same KIND of place (e.g. museum-then-museum) — vary the type (a square, a market, a station, a mosque). Key as: "<source place> [@scene] → <local place>".
3. PRICES — pick ONE notional conversion and give the local amount for EACH money figure in the script, as SPOKEN WORDS in COLLOQUIAL ${targetLanguage} spelling, at realistic CURRENT LOCAL price levels (don't be implausibly cheap), and strictly monotonic so distinct source amounts get distinct local amounts. Note any unit shift (e.g. per-punnet → per-kilo). Key as: "<source amount> → <local amount in words>".
4. PAIRED CHOICES — wherever a line offers a choice between two items (e.g. two ales, two wines), name TWO genuinely different local options to preserve the contrast. Key as: "<source pair> → <local option A> / <local option B>".
5. POLITENESS VARIETY — list 3-4 natural ${targetLanguage} politeness/please forms so scenes don't all lean on one; the writers should rotate them.

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
      const out = await claudeChat(prompt, { model: process.env.POD_LEDGER_MODEL || 'haiku', timeout: SCENE_TIMEOUT_MS })
      const t = (out || '').trim()
      if (t) return t
    } catch (e) {
      if (attempt === 2) console.warn(`[podGlossary] failed after 2 attempts: ${e.message}`)
    }
  }
  return ''
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
async function loadCanonicalScenes(podSlug) {
  const { data, error } = await supabase
    .from('canonical_pod_scenarios')
    .select('scene_number, scene_label, scene_title, scene_subtitle, sentence_number, global_order, speaker, english_text')
    .eq('pod_slug', podSlug).order('global_order', { ascending: true })
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

/** Upsert the listening_pods header row (speakers + metadata). */
async function upsertPodRow({ podId, courseCode, podSlug, targetLanguage, canonicalScenes, knownLang, targetLang, ledger }) {
  const rawSpeakers = [...new Set(canonicalScenes.flatMap(s => s.lines.map(l => l.speaker).filter(Boolean)))]
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
  const row = {
    id: podId, course_code: courseCode, pod_type: 'core', slug: podSlug,
    title: `${targetLanguage} Listening Pods — Pod 0`,
    speakers,
    metadata: { sections, generated_from: 'canonical_pod_scenarios', status: 'draft', consistency_ledger: ledger || null },
    source_file: 'generated:canonical',
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('listening_pods').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(`pod upsert: ${error.message}`)
  return { speakers, voiceNote }
}

/** Upsert a generated scene's sentences (idempotent by id). */
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
  }))
  const { error } = await supabase.from('listening_pod_sentences').upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`sentence upsert (scene ${scene.number}): ${error.message}`)
  return rows.length
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
async function generatePodBatch({ courseCode, podSlug = 'pod-0', force = false, deadlineMs = Infinity, maxScenes = Infinity, log = () => {} }) {
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

  const canonicalScenes = await loadCanonicalScenes(podSlug)
  if (canonicalScenes.length === 0) throw new Error(`no canonical scenarios for pod_slug=${podSlug}`)

  if (!force && await podHasAudio(podId)) {
    throw new Error(`${podId} already has audio — refusing to regenerate without force`)
  }

  const done = force ? new Set() : await generatedSceneNumbers(podId)
  const { notes: cultureNotes, source: cultureSource } = await getCultureNotes(targetVariant)

  // Cross-scene consistency ledger: build once per pod, persist in metadata,
  // reuse on resume so every scene (and every resumed endpoint call) pins the
  // same names/places/prices.
  const { data: existingPod } = await supabase.from('listening_pods').select('metadata').eq('id', podId).maybeSingle()
  let ledger = (!force && existingPod && existingPod.metadata && existingPod.metadata.consistency_ledger) || ''
  if (!ledger) {
    ledger = await buildPodGlossary({ targetLanguage, cultureNotes, canonicalScenes })
  }
  log(`[${podId}] target=${targetLanguage} (${targetVariant}) known=${knownLanguage} · culture=${cultureSource} · ledger=${ledger ? ledger.length + 'ch' : 'none'} · ${canonicalScenes.length} scenes, ${done.size} done`)

  const { voiceNote } = await upsertPodRow({ podId, courseCode, podSlug, targetLanguage, canonicalScenes, knownLang: course.known_lang, targetLang: course.target_lang, ledger })

  const pending = canonicalScenes.filter(s => !done.has(s.number))
  const warnings = []
  if (voiceNote) warnings.push(voiceNote)
  const scenesDone = []
  let generatedNow = 0

  for (const scene of pending) {
    if (generatedNow >= maxScenes) break
    if (Date.now() - start >= deadlineMs && generatedNow > 0) break
    log(`  scene ${scene.number} [${scene.label}] ${scene.title} — generating (${scene.lines.length} lines)…`)
    const { lines, warnings: w } = await generateScene({ scene, targetLanguage, knownLanguage, cultureNotes, ledger })
    const n = await writeSceneSentences({ podId, scene, lines })
    generatedNow++
    scenesDone.push(scene.number)
    for (const x of w) warnings.push(`scene ${scene.number}: ${x}`)
    log(`    ✓ ${n} sentences written${w.length ? ` (${w.length} warnings)` : ''}`)
  }

  const remaining = pending.length - generatedNow
  return {
    podId, courseCode, targetLanguage, knownLanguage,
    totalScenes: canonicalScenes.length, alreadyDone: done.size,
    generatedNow, remaining, more_remaining: remaining > 0,
    cultureSource, warnings, scenesDone,
  }
}

module.exports = { generatePodBatch, generateScene, validateScene, parseLines, loadCanonicalScenes, loadCourse, buildPodGlossary }

// CLI: node services/pod-dialogue-generator.cjs <courseCode> [--force] [--max=N]
if (require.main === module) {
  require('dotenv').config()
  const courseCode = process.argv.find(a => !a.startsWith('--') && a.includes('_'))
  const force = process.argv.includes('--force')
  const maxArg = process.argv.find(a => a.startsWith('--max='))
  const maxScenes = maxArg ? Number(maxArg.slice(6)) : Infinity
  if (!courseCode) { console.error('usage: node services/pod-dialogue-generator.cjs <courseCode> [--force] [--max=N]'); process.exit(1) }
  ;(async () => {
    const r = await generatePodBatch({ courseCode, force, maxScenes, log: (...a) => console.log(...a) })
    console.log('\nRESULT:', JSON.stringify({ ...r, warnings: r.warnings.length }, null, 1))
    if (r.warnings.length) { console.log('\nwarnings:'); r.warnings.forEach(w => console.log('  - ' + w)) }
  })().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
}
