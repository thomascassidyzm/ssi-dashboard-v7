/**
 * Presentation authoring — frozen frames + a judgment-only agent.
 *
 * Design (docs/presentation-authoring-redesign.md, agreed 2026-07-05):
 * presentation text is a pure render of a hand-verifiable per-known-language
 * template ("frame"). The ONLY per-LEGO decision is whether the intro needs
 * the disambiguating context sentence (Frame B, "as in — '<seed>'") or goes
 * bare (Frame A). That judgment — plus flagging suspected content errors —
 * is what the agent does. It never writes prose: it returns "N. A" / "N. B"
 * decision lines and optional FLAG lines, and the text is rendered in code.
 * So there is nothing to regex-police and register drift is impossible.
 *
 * Model: Sonnet via the Claude CLI (subscription — never the SDK/API).
 * claude-cli.cjs already disables extended thinking (MAX_THINKING_TOKENS=0),
 * which is the fast, non-overthinking mode measured 2026-07-05.
 */

const { claudeChat, HAIKU_MODEL } = require('../shared/claude-cli.cjs')
const { getName: getLangEnglishName, databaseToManifest } = require('../language-code-service.cjs')
const createLogger = require('../shared/logger.cjs')
const { canonicalVoiceId } = require('../shared/clip-identity.cjs')

const logger = createLogger('PresentationAuthor')

const SONNET_MODEL = process.env.CLAUDE_SONNET_MODEL || 'sonnet'

// Tom's xAI clone — the estate-wide English voice (ruled 2026-07-04).
// Presentation intros are known-language audio, so English-known courses
// default to the clone unless voice_config explicitly says otherwise.
const ENG_PRESENTATION_VOICE = 'xai_gfzdpspr5fdp'

// Last resort when a course carries no presentation and no known voice at all.
const DEFAULT_PRESENTATION_VOICE = 'azure_en-GB-SoniaNeural'

/**
 * Get the presentation template (Frame B) for a known language, creating and
 * caching one via Haiku if none exists. Moved verbatim-in-behaviour from
 * phase8-audio-v13 so both /generate and the template-config UI share it.
 * knownLangName is passed in (phase8 owns the language-name lookup).
 */
async function getOrCreatePresentationTemplate(supabase, knownLang, knownLangName) {
  // 1. Check DB for existing template
  const { data: existing } = await supabase
    .from('presentation_templates')
    .select('template')
    .eq('known_lang', knownLang)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)

  if (existing?.[0]?.template) {
    return existing[0].template
  }

  // 2. Load example templates to show Haiku the pattern
  const { data: examples } = await supabase
    .from('presentation_templates')
    .select('known_lang, template')
    .eq('is_active', true)
    .order('known_lang')

  const exampleBlock = (examples || [])
    .map(e => `${e.known_lang}: ${e.template}`)
    .join('\n')

  const prompt = `You are a translation expert. Generate a presentation template for introducing language LEGOs (vocabulary items) to learners whose known language is ${knownLangName} (${knownLang}).

The template MUST be written entirely in ${knownLangName}. It introduces a target language word/phrase to the learner.

It must contain exactly these three placeholders (keep them as-is, do not translate them):
- {target_lang_name} — will be replaced with the name of the target language in ${knownLangName}
- {known} — will be replaced with the word/phrase in the learner's known language
- {seed} — will be replaced with a context sentence in the learner's known language

Here are working examples in other languages:
${exampleBlock}

The pattern is: "[target_lang_name] [for] — '{known}' — [as in] — '{seed}' — [is]:"
Translate this pattern naturally into ${knownLangName}. Use appropriate punctuation for ${knownLangName}.

Reply with ONLY the template string, nothing else.`

  logger.info(`Generating presentation template for ${knownLang} (${knownLangName}) via Haiku...`)
  const template = await claudeChat(prompt, { model: HAIKU_MODEL, timeout: 30000 })

  if (!template.includes('{target_lang_name}') || !template.includes('{known}') || !template.includes('{seed}')) {
    logger.error(`Generated template for ${knownLang} is missing placeholders: "${template}"`)
    const fallback = `{target_lang_name} — '{known}' — '{seed}' —:`
    logger.warn(`Using minimal fallback template for ${knownLang}`)
    return fallback
  }

  const { error: insertError } = await supabase
    .from('presentation_templates')
    .insert({
      template: template.trim(),
      known_lang: knownLang,
      priority: 5, // Lower than hand-verified (10)
      is_active: true
    })

  if (insertError) {
    logger.warn(`Failed to cache template for ${knownLang}: ${insertError.message}`)
  } else {
    logger.info(`Cached new presentation template for ${knownLang}: "${template.trim()}"`)
  }

  return template.trim()
}

/**
 * The hand-written "as in" clauses, one per known language that has ever had a
 * template. Kept first and unchanged: every language listed here already
 * strips correctly and must keep producing byte-identical Frame A text.
 */
const SEED_CLAUSE_PATTERNS = / as in — '\{seed\}' —| como en — '\{seed\}' —| comme dans — '\{seed\}' —| wie in — '\{seed\}' —| como em — '\{seed\}' —| come in — '\{seed\}' —| fel yn — '\{seed\}' —| — 「\{seed\}」のように —| — '\{seed\}'처럼 —| كما في — '\{seed\}' —| kaip — '\{seed\}' —| 如「\{seed\}」—|, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g

/**
 * Frame A (bare) is the stored Frame B template with its "as in — '{seed}'"
 * clause stripped. One place for the stripping — previously duplicated at two
 * sites in phase8 with slightly different pattern lists.
 *
 * WHY THERE IS A STRUCTURAL FALLBACK (2026-09-03). The list above is a list of
 * LANGUAGES, and templates are generated per known language by Haiku
 * (getOrCreatePresentationTemplate), so a language nobody added to the list
 * fell through every pattern and only `{seed}` itself was replaced — leaving
 * an EMPTY QUOTED SLOT in the spoken line. Hindi's template
 * ("{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :") is the
 * specimen: 479 of eng_for_hin's 1,055 rendered presentations say
 * "अंग्रेज़ी में — 'X' — जैसे — '' — में :" — "the English for 'X', as in '',
 * is:" — a clip that speaks an empty quotation to a learner.
 *
 * The fallback needs no per-language knowledge: Frame A is the template minus
 * everything from the close of the {known} slot up to and including the close
 * of the {seed} slot. It runs ONLY when the list left a {seed} behind, and
 * only when the template has the shape it assumes ({seed} after {known}, each
 * flanked by a non-word quote character), so no listed language can reach it.
 */
function stripSeedClause(template) {
  const listed = template
    .replace(/, as in — '\{seed\}',/g, ',')
    .replace(/, as in '\{seed\}'/g, '')
    .replace(SEED_CLAUSE_PATTERNS, '')
  if (!listed.includes('{seed}')) return listed

  const structural = stripSeedClauseStructurally(listed)
  if (structural !== null) return structural

  // Shape we don't recognise — the old behaviour, which at least removes the
  // placeholder. An empty quote is bad; a literal "{seed}" spoken aloud is worse.
  return listed.replace(/\{seed\}/g, '')
}

/**
 * Cut everything between the {known} slot and the {seed} slot, plus the {seed}
 * slot itself. Returns null when {seed} does not follow {known}, which is the
 * only shape this cannot reason about.
 *
 * Two details earn their keep:
 *  - {known}'s own quote marks are KEPT (the chunk is still quoted in Frame A),
 *    but only when it really has a matched pair — Japanese's template opens
 *    with a bare {known} and the character after it is a comma, not a quote.
 *  - a particle bound to the {seed} quote with no space is part of the "as in"
 *    clause and goes with it: Japanese 「{seed}」のように, Korean '{seed}'처럼.
 *    A space-separated word is left alone — it may belong to the frame.
 */
function stripSeedClauseStructurally(template) {
  const kIdx = template.indexOf('{known}')
  const sIdx = template.indexOf('{seed}')
  if (kIdx === -1 || sIdx === -1 || sIdx < kIdx) return null

  const kEnd = kIdx + '{known}'.length
  const sEnd = sIdx + '{seed}'.length
  const isQuote = (ch) => Boolean(ch) && /[^\p{L}\p{N}\s]/u.test(ch)

  const knownQuoted = isQuote(template[kIdx - 1]) && isQuote(template[kEnd])
  const cutFrom = knownQuoted ? kEnd + 1 : kEnd

  const seedQuoted = isQuote(template[sIdx - 1]) && isQuote(template[sEnd])
  let cutTo = seedQuoted ? sEnd + 1 : sEnd
  const bound = /^[\p{L}\p{M}]+/u.exec(template.slice(cutTo))
  if (bound) cutTo += bound[0].length

  if (cutTo <= cutFrom) return null

  return (template.slice(0, cutFrom) + template.slice(cutTo))
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Render the intro text for one item under the chosen frame. */
function renderIntro({ frame, template, targetLangName, chunk, seed }) {
  const base = frame === 'A' ? stripSeedClause(template) : template
  return base
    .replace(/\{target_lang_name\}/g, targetLangName)
    .replace(/\{known\}/g, chunk)
    .replace(/\{seed\}/g, seed || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Target language name localised into the known language.
 * Intl.DisplayNames (CLDR) with a language-code-service fallback, except for
 * English-known courses, which use the house names from the CSV ("Bengali",
 * not CLDR's "Bangla") — intros must match how the courses brand themselves.
 */
function localisedLangName(targetLang, knownLang) {
  if (knownLang === 'eng') return getLangEnglishName(targetLang)
  try {
    const dn = new Intl.DisplayNames([databaseToManifest(knownLang)], { type: 'language' })
    const target2 = databaseToManifest(targetLang)
    const name = dn.of(target2)
    if (name && name !== target2) return name
  } catch (_) { /* fall through */ }
  return getLangEnglishName(targetLang)
}

/** Slash-compound known_text like "to listen / to hear" introduces its first option only. */
function introChunk(knownText) {
  const t = String(knownText || '')
  return t.includes(' / ') ? t.split(' / ')[0].trim() : t.trim()
}

/**
 * The intro line a LEGO WOULD get if one were authored now: Frame A (bare) off
 * the course's own known-language template. One implementation, so every caller
 * that needs a default — the single-LEGO regen, and the Script Viewer's edit
 * affordance showing an un-authored LEGO — renders the same course-correct line
 * instead of inventing its own.
 */
async function defaultIntroText(supabase, { knownLang, targetLang, knownText }) {
  const template = await getOrCreatePresentationTemplate(
    supabase, knownLang, localisedLangName(knownLang, 'eng')
  )
  return renderIntro({
    frame: 'A',
    template,
    targetLangName: localisedLangName(targetLang, knownLang),
    chunk: introChunk(knownText),
    seed: ''
  })
}

/**
 * Deterministic fallback when the agent's decision is missing/unparseable:
 * context only if the seed genuinely contains the chunk (else Frame B would
 * quote a sentence that doesn't demonstrate the chunk at all).
 */
function fallbackFrame(chunk, seed) {
  if (!seed) return 'A'
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
  return norm(seed).includes(norm(chunk)) ? 'B' : 'A'
}

/**
 * Judge a batch of items: A (bare) or B (with context), plus FLAG lines for
 * suspected content errors. items: [{ chunk, form, seed }]. Returns
 * { frames: string[], flags: [{ index, issue }] } (frames aligned to items).
 */
async function judgeBatch(items, { knownLangName, targetLangName }) {
  const list = items.map((it, i) =>
    `${i + 1}. chunk: '${it.chunk}' | ${targetLangName} form: '${it.form}' | parent seed: '${it.seed || ''}'`
  ).join('\n')

  const prompt = `You are QA-judging the spoken introductions that debut new LEGOs (phrase-chunks) in a language course for ${knownLangName} speakers learning ${targetLangName}.

For each numbered LEGO decide whether its introduction needs the disambiguating context sentence:
- B (with context): the chunk is a mid-sentence fragment or ambiguous on its own — a learner could not confidently place it without the sentence it came from.
- B ALSO when the chunk is perfectly clear as a word but its ${knownLangName} form covers MORE THAN ONE meaning that ${targetLangName} tells apart, so a learner could correctly answer it two different ways. A time word that means either a past or a future day, or a verb that covers two ${targetLangName} verbs, is the standard case: being a clean standalone word is exactly why it needs the context, not a reason to go bare.
- A (bare): the chunk is complete, self-sufficient AND single-sense (a clear standalone word with one ${targetLangName} rendering, a complete question or clause).

Also inspect for content errors: if a chunk or its seed looks wrong (grammar, agreement, chunk not matching its own seed), report it — do not fix it.

LEGOs:
${list}

Reply with EXACTLY one decision line per LEGO, in order: "<number>. A" or "<number>. B".
After the decision lines, optionally add flag lines: "FLAG: <number> — <issue in one short sentence>".
Nothing else.`

  const raw = await claudeChat(prompt, { model: SONNET_MODEL, timeout: 120000 })

  const frames = items.map((it) => fallbackFrame(it.chunk, it.seed))
  const flags = []
  for (const line of raw.split('\n')) {
    const decision = /^\s*(\d+)\s*[.):]\s*([AB])\b/i.exec(line)
    if (decision) {
      const idx = parseInt(decision[1], 10) - 1
      if (idx >= 0 && idx < items.length) frames[idx] = decision[2].toUpperCase()
      continue
    }
    const flag = /^\s*FLAG:\s*(\d+)\s*[—–-]\s*(.+)$/i.exec(line)
    if (flag) {
      const idx = parseInt(flag[1], 10) - 1
      if (idx >= 0 && idx < items.length) flags.push({ index: idx, issue: flag[2].trim() })
    }
  }

  // Frame B needs a seed that demonstrates the chunk; downgrade B→A when the
  // seed doesn't contain the chunk (quoting a non-demonstrating sentence is
  // worse than going bare).
  for (let i = 0; i < items.length; i++) {
    if (frames[i] === 'B' && fallbackFrame(items[i].chunk, items[i].seed) === 'A') frames[i] = 'A'
  }

  return { frames, flags }
}

/**
 * Author intros for all items: judge in batches, render under the frozen
 * frame. Never throws for a single bad batch — a failed CLI batch falls back
 * to the deterministic frame choice so generation is never blocked on the LLM.
 *
 * items: [{ lego_id?, phrase_id?, chunk, form, seed }]
 * Returns { authored: [{ ...item, frame, text }], flags: [{ ...item, issue }] }
 */
async function authorPresentations(supabase, course, items, { template, targetLangName, knownLangName, batchSize = 25, onProgress } = {}) {
  const authored = []
  const flags = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    let frames, batchFlags
    const pinned = (it) => it.forceFrame === 'A' || it.forceFrame === 'B'
    try {
      // Every item pinned means there is nothing left to ask — skip the CLI
      // call entirely rather than spend on an answer that gets discarded.
      ;({ frames, flags: batchFlags } = batch.every(pinned)
        ? { frames: batch.map((it) => it.forceFrame), flags: [] }
        // via module.exports so the judgment is a seam a test can hold
        : await module.exports.judgeBatch(batch, { knownLangName, targetLangName }))
    } catch (err) {
      logger.warn(`Judgment batch failed (${err.message}) — deterministic fallback for ${batch.length} items`)
      frames = batch.map((it) => fallbackFrame(it.chunk, it.seed))
      batchFlags = []
    }

    // A DETERMINISTIC PIN, because a prompt is not a guarantee (2026-09-03).
    // The judge was asked live for eng_for_hin's six कल chunks — Hindi कल is
    // both "yesterday" and "tomorrow" — and returned Frame A, dropping the
    // context, for three of them (कल सुबह, कल दोपहर, कल रात): a clean
    // standalone word reads as self-sufficient, which is precisely backwards
    // for a two-sense word. The prompt above now names that case, but an LLM
    // decision cannot be an invariant. `item.forceFrame` lets the caller state
    // the frame outright for a chunk a human has already ruled on; the judge
    // is still consulted for the rest of the batch, and its flags still count.
    // Frame B is only honoured when it is renderable — a context that does not
    // contain the chunk would quote a sentence that fails to demonstrate it,
    // which is the same downgrade judgeBatch applies to its own answers.
    batch.forEach((item, j) => {
      if (!pinned(item)) return
      frames[j] = (item.forceFrame === 'B' && fallbackFrame(item.chunk, item.seed) === 'A') ? 'A' : item.forceFrame
    })

    batch.forEach((item, j) => {
      const frame = frames[j]
      authored.push({
        ...item,
        frame,
        text: renderIntro({ frame, template, targetLangName, chunk: item.chunk, seed: item.seed })
      })
    })
    for (const f of batchFlags) {
      flags.push({ ...batch[f.index], issue: f.issue })
    }

    if (onProgress) onProgress(Math.min(i + batchSize, items.length), items.length)
  }

  return { authored, flags }
}

/**
 * Record author FLAGs as content feedback so they surface in the existing
 * feedback review flow (Popty aggregates content_feedback). Best-effort.
 */
async function recordAuthorFlags(supabase, courseCode, flags) {
  if (!flags.length) return
  const rows = flags.map((f) => ({
    course_code: courseCode,
    feedback_type: 'presentation_author_flag',
    user_id: 'phase8-presentation-author',
    comment: f.issue,
    session_context: {
      lego_id: f.lego_id || null,
      phrase_id: f.phrase_id || null,
      chunk: f.chunk,
      seed: f.seed || null
    }
  }))
  const { error } = await supabase.from('content_feedback').insert(rows)
  if (error) logger.warn(`Could not record ${flags.length} author flags: ${error.message}`)
  else logger.info(`Recorded ${flags.length} presentation author flag(s) to content_feedback`)
}

/**
 * Presentation TTS voice.
 * English-known courses: Tom's clone is THE estate English voice (ruled
 * 2026-07-04) — it wins over the legacy Azure entries most voice_configs
 * were scaffolded with. A deliberately chosen xAI presentation voice in the
 * config is respected.
 * Other known languages: explicit presentation config, else the known-role
 * voice (intros are known-language audio).
 *
 * The return value is a course_audio.voice_id, so it is CANONICAL on every
 * path. It used to have four returns in two spellings — two prefixed, two bare
 * — which is how one presentation voice ended up filed under two identities
 * (and how a pending row failed to reconcile with the row that later replaced
 * it). Throws rather than guessing: a voice nobody can spell is a voice no
 * reader can find, and the caller degrades that to "no voice configured".
 */
function resolvePresentationVoiceId(course) {
  const cfg = course.voice_config || {}
  const voices = cfg.voices || cfg
  const pres = voices.presentation
  if (course.known_lang === 'eng') {
    if (pres?.provider === 'xai' && pres?.voiceId) return canonicalVoiceId(pres.voiceId, { provider: 'xai' })
    return canonicalVoiceId(ENG_PRESENTATION_VOICE)
  }
  if (pres?.voiceId) return canonicalVoiceId(pres.voiceId, { provider: pres.provider })
  if (typeof cfg.presentation === 'string') return canonicalVoiceId(cfg.presentation)
  const known = voices.known
  if (known?.voiceId) return canonicalVoiceId(known.voiceId, { provider: known.provider })
  return canonicalVoiceId(DEFAULT_PRESENTATION_VOICE)
}

module.exports = {
  getOrCreatePresentationTemplate,
  stripSeedClause,
  renderIntro,
  localisedLangName,
  introChunk,
  defaultIntroText,
  fallbackFrame,
  judgeBatch,
  authorPresentations,
  recordAuthorFlags,
  resolvePresentationVoiceId,
  ENG_PRESENTATION_VOICE,
  DEFAULT_PRESENTATION_VOICE,
  SONNET_MODEL
}
