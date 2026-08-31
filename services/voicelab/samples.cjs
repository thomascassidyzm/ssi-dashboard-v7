/**
 * VOICELAB samples — hearing a candidate voice say a REAL course line, instantly.
 *
 * Tom, 2026-08-31: "help me find a way to assign new Cartesia voices to existing
 * languages - without any fuss or bother". The fuss this module removes is the gap
 * between reading a voice's name and knowing what it sounds like. A name is not a
 * voice; a generic "this is what the new voice sounds like" sentence is barely one.
 * So the audition line comes out of the estate's own course text.
 *
 * ── THE LINE IS NAMED, NOT CANONICAL (Tom's correction, 2026-08-31) ────────────────
 * There is no single canonical line for a language, because what is SAID belongs to
 * the course, not the language: a Spanish-for-English course and a Spanish-for-Chinese
 * course say different things. So the picker chooses ONE line from ONE NAMED COURSE
 * and hands the course back with it, for the screen to show. Deterministic, so two
 * voices are always compared on identical text — the same reason the blind-compare
 * panel exists — but never presented as "the" line for the language.
 *
 * ── WHAT IT COSTS ─────────────────────────────────────────────────────────────────
 * The line picker and the free lookup spend NOTHING: SELECTs against `courses`,
 * `course_seeds` and `course_audio`. Only `prepare()` renders, it renders one clip per
 * voice, it goes through lab.refuse() so the daily character ceiling still governs, and
 * every render is written to the ledger the moment the money is spent. A cached sample
 * is served from disk forever and is never re-rendered.
 *
 * ── EVERY VOICE ON THE ROW GETS A CLIP (Tom, 2026-08-31) ──────────────────────────
 * "I want to be able to preview the cartesia voices, so I want to be able to generate
 * cartesia clips or something - must be the same phrases for a fair test." So one press
 * on a language renders EVERY voice that row lists which this box can speak — Cartesia
 * on Cartesia, Azure on Azure — all on the SAME line, which is what makes it a fair
 * test. `renderPlan` below is the single place that decides who can be rendered and how,
 * and the voices it refuses are named on screen with their reason, never dropped.
 *
 * NOTHING HERE WRITES course_audio.
 */

const crypto = require('crypto')
const { targetCastKey, baseLanguageOfCastKey, COURSE_CAST_FIELDS } = require('../shared/cast-language-key.cjs')
const fs = require('fs')
const path = require('path')

const params = require('./params.cjs')
const store = require('./store.cjs')
const lab = require('./lab.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { voiceSpellings } = require('../shared/clip-identity-lookup.cjs')

function client () { return require('../supabase-client.cjs').getClient() }

const INDEX = path.join(store.LAB_DIR, 'samples.json')

/**
 * A sample line's shape: MIDDLING FOR ITS OWN LANGUAGE.
 *
 * The first version of this used an absolute 25..90 character band and returned NOTHING
 * for Chinese, because a whole zho sentence is eight characters. A character count is a
 * fact about a script, not about how long a line takes to say — so the band is relative
 * to the course's own corpus and the picker is script-agnostic by construction. The
 * absolute cap stays, because the lab refuses a sentence over 300 characters.
 *
 * These bounds are a DEFAULT chosen on 2026-08-31, not a ruling from Tom.
 */
const BAND_LOW = 0.6
const BAND_HIGH = 1.6
const HARD_CAP = 200
/** Kept for callers and tests that want the old absolute sense of "sayable length". */
const MIN_CHARS = 4
const MAX_CHARS = HARD_CAP
/** Brackets, quotes, ellipses and digits all read oddly out of context. */
const ODD_PUNCTUATION = /[()[\]{}"“”«»…\d]/
/** A question in any script the estate teaches — Greek, Arabic and CJK included. */
const QUESTION = /[?？;؟]\s*$/
/** How many lines a voice is judged on. See chooseSet for why three. */
const JUDGING_SET = 3

// ── The cache index ────────────────────────────────────────────────────────────────
// One small JSON file beside the clips, for the same reason store.cjs is disk and not a
// table: the record and its audio cannot get separated, and there is no migration.

function readIndex () {
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')) } catch { return {} }
}

function writeIndex (idx) {
  store.ensureDirs()
  const tmp = `${INDEX}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(idx, null, 2))
  fs.renameSync(tmp, INDEX)
}

/** Keyed by (voice, language, exact text) — a different line is a different sample. */
function cacheKey (voiceId, language, text) {
  return crypto.createHash('sha1').update(`${voiceId} ${language} ${text}`).digest('hex').slice(0, 20)
}

// ── A. THE LINE ────────────────────────────────────────────────────────────────────

/**
 * One representative line for a language, from a named course.
 *
 * Selection, stated plainly because it is a default rather than a ruling:
 *   1. WHICH COURSE. Prefer the plainest course teaching this language — no regional
 *      prefix on the code (`deu_for_…` over `deu_at_for_…`), then an English-known one,
 *      then the largest by seed_count. Written that way after the first run of this
 *      picker offered `deu` an AUSTRIAN line and `cym` a Yoruba-known one purely
 *      because those courses happened to be the biggest: a dialect line is the wrong
 *      thing to judge a standard-German voice on.
 *   2. among its first 200 seeds, the plainly-punctuated lines whose length is
 *      typical FOR THAT CORPUS (0.6..1.6 of its median), which is what makes the
 *      picker work for Chinese and Japanese as well as for French;
 *   3. of those, the one nearest the median length, ties broken by seed number.
 * Deterministic: same language, same line, every time, so voices are comparable. The
 * course is returned alongside and shown on screen, because it is a fact about the
 * line rather than a fact about the language.
 *
 * A language with no course teaching it (a known-only language) has no target text to
 * offer, so its guide voice is auditioned on a real INSTRUCTION line in that language
 * instead — which is what a guide voice actually says.
 */
async function pickLine (language) {
  return (await pickLines(language, { count: 1 }))[0] || null
}

/**
 * The judging set for a language: several lines from ONE named course.
 *
 * Identical selection to the single line for its first element — see chooseSet
 * for what the other two are and why — so a language's median line is the same
 * string it has always been and every clip already cached against it still
 * plays.
 */
async function pickLines (language, { count = JUDGING_SET } = {}) {
  const db = client()
  // `language` is a CAST KEY, which may be a dialect entity ('deu_at'). The
  // column holds the BASE tag for every course, dialect or not, so the query
  // asks the base and the entity filter is applied in JS — one query either
  // way, and the row that comes back is guaranteed to be a course this entity
  // actually teaches. Auditioning a voice for Austrian German on a standard
  // German line would be judging the wrong thing.
  const base = baseLanguageOfCastKey(language) || language
  const { data: courses, error } = await db
    .from('courses')
    .select(`${COURSE_CAST_FIELDS}, display_name, seed_count`)
    .eq('target_lang', base)
    .order('seed_count', { ascending: false, nullsFirst: false })
    .limit(40)
  if (error) throw Object.assign(new Error(`courses read failed: ${error.message}`), { status: 502 })

  const mine = (courses || []).filter((c) => targetCastKey(c) === language)

  for (const c of preferCourses(mine, language)) {
    const { data: seeds } = await db
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', c.course_code)
      .order('seed_number', { ascending: true })
      .limit(200)
    const picked = chooseSet((seeds || []).map((s) => ({
      text: String(s.target_text || '').trim(),
      knownText: String(s.known_text || '').trim(),
      order: s.seed_number,
    })), count)
    if (picked.length) {
      return picked.map((line) => ({
        language,
        text: line.text,
        knownText: line.knownText,
        course: c.course_code,
        courseName: c.display_name || c.course_code,
        source: `${c.course_code} seed ${line.order}`,
        kind: 'seed',
      }))
    }
  }

  const guide = await guideLine(base)
  return guide ? [guide] : []
}

/**
 * The course order the picker walks. Pure, so the preference is testable without a DB.
 * `deu_for_eng` beats `deu_at_for_eng` because the second teaches a dialect, and
 * `cym_for_eng` beats `cym_for_yor` because a Yoruba known side tells Tom nothing.
 */
function preferCourses (courses, language) {
  // On a DIALECT entity every course in the list already teaches that dialect,
  // so the "plainest code" leg has nothing to separate and the English-known
  // and size legs decide. `deu_at` must not prefer a `deu_for_` code here: that
  // code is a different language now and was filtered out before this ran.
  const plain = new RegExp(`^${language}_for_`)
  return courses
    .filter((c) => (c.seed_count || 0) > 0)
    .slice()
    .sort((a, b) =>
      (plain.test(b.course_code) - plain.test(a.course_code)) ||
      ((b.known_lang === 'eng') - (a.known_lang === 'eng')) ||
      ((b.seed_count || 0) - (a.seed_count || 0)) ||
      String(a.course_code).localeCompare(String(b.course_code)))
}

/** The middling-length, plainly-punctuated line. Pure, so it is testable without a DB. */
function chooseFrom (rows) {
  const clean = rows
    .filter((r) => r.text && r.text.length >= MIN_CHARS && r.text.length <= HARD_CAP)
    .filter((r) => !ODD_PUNCTUATION.test(r.text))
  if (!clean.length) return null

  const lengths = clean.map((r) => r.text.length).sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  // The band narrows the field to lines that are typical for THIS corpus; if it empties
  // the field (a corpus of near-identical lengths), fall back to the whole clean set
  // rather than returning nothing, because a sample is the point.
  const banded = clean.filter((r) => r.text.length >= median * BAND_LOW && r.text.length <= median * BAND_HIGH)
  const field = banded.length ? banded : clean
  return field
    .slice()
    .sort((a, b) => Math.abs(a.text.length - median) - Math.abs(b.text.length - median) || a.order - b.order)[0]
}

/**
 * THE JUDGING SET — several lines, chosen to be different from each other.
 *
 * Tom, 2026-08-31, looking at the lab: "there is only one clip per voice … one
 * clip is not enough to judge a voice on - it may be flattering or
 * unrepresentative."
 *
 * ── WHAT MAKES A GOOD SET, AND WHY THESE THREE ──────────────────────────────
 * A set of three lines of the same shape is one clip three times. So the axis
 * the set varies on is the axis voices actually fail on, and for a synthetic or
 * cloned voice that is LENGTH, in two opposite directions:
 *
 *   the median line   what the course mostly sounds like. Unchanged from the
 *                     single line this module has always picked, deliberately:
 *                     every clip already rendered in the estate stays valid,
 *                     and the row's one-press fair comparison still renders
 *                     exactly the same words for every voice.
 *   a SHORT line      onset and tail. A short utterance is where a clone
 *                     clips its first consonant, or hangs a breath on the end
 *                     with no sentence to hide it in.
 *   a LONG line       breath, pace and drift. A voice that is convincing for
 *                     four words is often not convincing for fourteen: the
 *                     pitch wanders, the rhythm flattens, and there is no way
 *                     to hear that on the median line.
 *
 * And where the corpus offers one, the SHORT slot prefers a QUESTION, because
 * rising intonation is the single most common place a clone gives itself away
 * and a question is also, on its own, a different KIND of line rather than the
 * same kind at a different length.
 *
 * ── THE MATERIAL IS THE COURSE'S OWN ────────────────────────────────────────
 * Every line comes from the SAME NAMED COURSE, exactly as the single line does.
 * A voice is being judged on the material it would actually speak, and holding
 * the course constant is what keeps the set comparable across voices.
 *
 * These are DEFAULTS chosen on 2026-08-31, not a ruling from Tom.
 *
 * @returns {Array} up to `count` distinct lines, median first.
 */
function chooseSet (rows, count = JUDGING_SET) {
  const first = chooseFrom(rows)
  if (!first) return []
  if (count <= 1) return [first]

  const clean = rows
    .filter((r) => r.text && r.text.length >= MIN_CHARS && r.text.length <= HARD_CAP)
    .filter((r) => !ODD_PUNCTUATION.test(r.text))
  const out = [first]
  const taken = new Set([first.text])

  // The short slot, questions first. `quantileLine` is deterministic, so the
  // set is the same on every visit — two voices are never compared on
  // different words, which is the whole reason the single line was
  // deterministic in the first place.
  const short = quantileLine(clean.filter((r) => QUESTION.test(r.text)), 0.35, taken)
    || quantileLine(clean, 0.15, taken)
  if (short) { out.push(short); taken.add(short.text) }
  if (out.length >= count) return out.slice(0, count)

  const long = quantileLine(clean, 0.9, taken)
  if (long) out.push(long)
  return out.slice(0, count)
}

/**
 * The line at a given quantile of the corpus's own length distribution, skipping
 * anything already taken. Relative, never absolute — the same reason the band in
 * chooseFrom is relative: eight characters is a whole Chinese sentence.
 */
function quantileLine (rows, quantile, taken = new Set()) {
  const field = rows.filter((r) => !taken.has(r.text))
  if (!field.length) return null
  const sorted = field.slice().sort((a, b) => a.text.length - b.text.length || a.order - b.order)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(quantile * (sorted.length - 1))))]
}

/**
 * A real instruction line in this language, for a language nothing is taught in.
 * `course_audio` role='instruction' is where the estate's real guide text lives.
 */
async function guideLine (language) {
  const { data } = await client()
    .from('course_audio')
    .select('course_code, text, language')
    .eq('language', language)
    .eq('role', 'instruction')
    .limit(200)
  const line = chooseFrom((data || []).map((r, i) => ({
    text: String(r.text || '').trim(), knownText: '', order: i, course: r.course_code,
  })))
  if (!line) return null
  return {
    language,
    text: line.text,
    knownText: '',
    course: line.course || null,
    courseName: line.course || null,
    source: line.course ? `${line.course} instruction` : 'instruction line',
    kind: 'instruction',
  }
}

// ── B. FREE FIRST ──────────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'

/**
 * A take that already exists costs nothing to hear (the Estate panel's rule, and its
 * reason: the estate holds ~2.5 million of them). Matched on the normalised text in
 * both spellings the column carries, and on every spelling of the voice id.
 */
async function freeTakes (text, voiceIds) {
  if (!voiceIds.length) return new Map()
  const spellings = new Map()
  for (const v of voiceIds) for (const s of voiceSpellings(v)) spellings.set(s, v)

  const { data } = await client()
    .from('course_audio')
    .select('voice_id, s3_key, duration_ms, course_code')
    .in('text_normalized', audioKeyCandidates(text))
    .in('voice_id', [...spellings.keys()])
    .limit(500)

  const out = new Map()
  for (const r of data || []) {
    if (!r.s3_key || r.s3_key.startsWith('pending/')) continue
    const canonical = spellings.get(r.voice_id)
    if (!canonical || out.has(canonical)) continue
    out.set(canonical, {
      url: `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${r.s3_key}`,
      durationMs: r.duration_ms || null,
      free: true,
      from: r.course_code || null,
    })
  }
  return out
}

// ── C. THE READ, AND THE PREPARE ───────────────────────────────────────────────────

/**
 * HOW THIS VOICE WOULD BE RENDERED, or why it cannot be — one function, so the
 * read and the render can never disagree about who is previewable.
 *
 * Tom, 2026-08-31, looking at the live Chinese row: "I want to be able to
 * preview the cartesia voices, so I want to be able to generate cartesia clips
 * or something — must be the same phrases for a fair test." The zho row had
 * seventeen voices and four play buttons, so a cast could be made on a name.
 *
 * The old rule here was CARTESIA ONLY, and its reason was sound: pushing an
 * Azure voice id through a Cartesia config renders a stranger and calls it an
 * audition. That reason forbids the WRONG provider, not Azure — and the lab has
 * rendered Azure since it was built (runner.providerConfig). So an Azure voice
 * is now previewed ON AZURE, which is also the provider that will actually speak
 * it in a course. The estate's Azure ids carry their own locale, so this needs
 * no steer table and works for every language Azure covers, Welsh included.
 *
 * Still genuinely unrenderable, and still said in place rather than hidden:
 *   human_*        a person's recording. Nothing synthesises it, and nothing here
 *                  goes near a human-recorded course.
 *   elevenlabs_*   explicit-cast-only and expensive (tts-provider-policy.cjs);
 *                  the lab has no ElevenLabs path and must not grow one quietly.
 *   cartesia_*     in a language params.cjs cannot steer — Cartesia's API throws
 *   in a language  without a locale, so there is nothing honest to send.
 *
 * @returns {{provider: string, voiceId: string}|{why: string}}
 */
const AZURE_VOICE_ID = /^(?:azure_)?([a-z]{2,3}(?:-[A-Za-z]{2,8})+-[A-Za-z]+Neural)$/

function renderPlan (voiceId, language) {
  const id = String(voiceId || '')
  if (/^cartesia_/.test(id)) {
    const lang = params.findLanguage(baseLanguageOfCastKey(language) || language)
    if (!lang) return { why: `the lab has no Cartesia steer for ${language}` }
    return { provider: 'cartesia', voiceId: id.replace(/^cartesia_/, ''), language: lang.code }
  }
  const azure = AZURE_VOICE_ID.exec(id)
  // An Azure voice name IS its locale plus a name, so it steers itself. The
  // language argument is carried for the ledger, not for the request.
  if (azure) return { provider: 'azure', voiceId: azure[1], language }
  if (/^human_/.test(id)) return { why: 'a human recording — there is nothing to synthesise' }
  if (/^elevenlabs_/.test(id)) return { why: 'ElevenLabs is explicit-cast-only; the lab has no path to it' }
  return { why: 'no provider on this box can speak this voice id' }
}

/** Can this lab render a fresh sample of this voice, on whichever provider owns it? */
function isRenderable (voiceId, language) { return Boolean(renderPlan(voiceId, language).provider) }

/**
 * For one language: the line, and for each voice asked about, a playable sample if one
 * is cached or free — otherwise the plain fact that it has none and what it would cost.
 * SPENDS NOTHING.
 */
async function read ({ language, voiceIds = [], line = null }) {
  const picked = line || await pickLine(language)
  if (!picked) return { language, line: null, samples: {}, missing: voiceIds, chars: 0 }

  const idx = readIndex()
  const free = await freeTakes(picked.text, voiceIds)
  const samples = {}
  const missing = []
  const unrenderable = []
  const unrenderableWhy = {}
  for (const v of voiceIds) {
    const cached = idx[cacheKey(v, language, picked.text)]
    if (cached && store.readClip(cached.clip)) {
      samples[v] = {
        url: `/api/voicelab/clip/${cached.clip}.mp3`,
        durationMs: cached.durationMs || null,
        free: false,
        cached: true,
      }
      continue
    }
    const f = free.get(v)
    if (f) { samples[v] = f; continue }
    // A voice with no clip is either something this box can render — and then it
    // belongs in `missing`, where one press will render it — or something it
    // genuinely cannot, and then it is named WITH ITS REASON rather than quietly
    // dropped or quietly rendered by the wrong provider. See renderPlan.
    const plan = renderPlan(v, language)
    if (plan.provider) missing.push(v)
    else { unrenderable.push(v); unrenderableWhy[v] = plan.why }
  }
  return {
    language,
    line: picked,
    samples,
    missing,
    unrenderable,
    unrenderableWhy,
    // Which provider each missing voice would go to, so the screen can say what a
    // press will do before it is pressed rather than after.
    plan: Object.fromEntries(missing.map((v) => [v, renderPlan(v, language).provider])),
    // What pressing "generate" would cost, before anyone presses it.
    chars: missing.length * picked.text.length,
  }
}

/**
 * Render the samples this language is missing, cache them, and report the spend.
 *
 * SPENDS MONEY — one clip per missing voice, on the line above. Refusable by the lab's
 * daily character ceiling exactly as an audition is, and ledgered per clip the moment
 * the money is spent.
 *
 * @param {number} [maxVoices] a hard bound on one press, so a language with 400
 *                             candidates cannot become a 400-clip render by accident.
 */
async function prepare ({ language, voiceIds = [], maxVoices = 80, renderOne, force = false, onClip = null }) {
  const state = await read({ language, voiceIds })
  if (!state.line) throw Object.assign(new Error(`no course line found for ${language}`), { status: 404 })

  // FORCE is the deliberate second action (Tom, 2026-08-31: "make re-generating a
  // deliberate second action"). It re-renders every voice this box CAN render,
  // cached or not — a normal press renders only what is missing, which is why a
  // second visit costs nothing at all.
  const field = force
    ? voiceIds.filter((v) => renderPlan(v, language).provider)
    : state.missing
  const todo = field.slice(0, Math.max(1, maxVoices))
  if (!todo.length) return { ...state, rendered: [], chars: 0, failed: [] }

  // ONE CONFIG PER VOICE, ON THAT VOICE'S OWN PROVIDER. An Azure voice rendered
  // through a Cartesia config would be a stranger's audition, so the plan comes
  // from renderPlan and nowhere else.
  const configs = todo.map((v, i) => {
    const plan = renderPlan(v, language)
    return {
      ...lab.normaliseConfig({ provider: plan.provider, voiceId: plan.voiceId, language: plan.language }),
      key: `S${i}`,
    }
  })
  const idx = readIndex()
  const rendered = []
  const failed = []
  let chars = 0
  for (let i = 0; i < todo.length; i++) {
    const voiceId = todo[i]
    // THE CEILING IS ASKED BEFORE EVERY CLIP, not once for the batch. A batch
    // refusal takes exactly one config (lab.refuse's own rule), and asking per
    // clip is the stricter reading anyway: a press that runs into the daily
    // allowance stops at the clip that crosses it and keeps everything already
    // rendered, rather than being refused wholesale or overrunning wholesale.
    const refusal = lab.refuse({
      kind: 'batch', sentences: [state.line.text], configs: [configs[i]], charsSpentToday: store.charsSpentToday(),
    })
    if (refusal) {
      if (!rendered.length) throw Object.assign(new Error(refusal.error), { status: refusal.status })
      onClip?.({ voiceId, stopped: refusal.error, done: i, total: todo.length })
      break
    }
    // ONE VOICE'S FAILURE IS NOT THE ROW'S FAILURE. A withdrawn Cartesia id or a
    // voice Azure will not speak used to abort the whole press and lose the clips
    // after it; now it is reported in place and the rest of the row still renders.
    let mastered, durationMs
    try {
      ;({ mastered, durationMs } = await renderOne({ text: state.line.text, cfg: configs[i] }))
    } catch (e) {
      failed.push({ voiceId, error: String(e.message || e).split('\n')[0] })
      onClip?.({ voiceId, error: String(e.message || e).split('\n')[0], done: i + 1, total: todo.length })
      continue
    }
    const clip = store.newId()
    store.writeClip(clip, mastered)
    store.appendLedger({
      sample: clip, chars: state.line.text.length, provider: configs[i].provider,
      voiceId: configs[i].voiceId, language, course: state.line.course,
    })
    chars += state.line.text.length
    idx[cacheKey(voiceId, language, state.line.text)] = {
      clip, durationMs, voiceId, language, course: state.line.course, at: new Date().toISOString(),
    }
    writeIndex(idx)   // after each clip: a crash must not lose what it already paid for
    const one = { voiceId, url: `/api/voicelab/clip/${clip}.mp3`, durationMs }
    rendered.push(one)
    // The clip is announced the moment it exists, so the screen fills as the row
    // renders rather than staying empty for the length of the whole press.
    onClip?.({ ...one, done: i + 1, total: todo.length })
  }

  const after = await read({ language, voiceIds, line: state.line })
  return { ...after, rendered, failed, chars }
}


// ── D. ONE VOICE, SEVERAL CLIPS ────────────────────────────────────────────────────
//
// Tom, 2026-08-31, on the Voice Lab: "there is no way to hear a voice that does not
// currently have a clip" and "there is only one clip per voice". Both are answered
// here, and by the SAME pair of functions, because they are the same question asked
// about clip one and about clip three: what does this voice sound like saying this,
// and what does it cost to find out.
//
// WHY PER VOICE RATHER THAN PER ROW. The row's press renders ONE line for EVERY voice
// — that is the fair comparison and it is what makes a shortlist. The judging set is
// the opposite motion: several lines for ONE voice, once a voice is worth listening
// to properly. Rendering three lines for eighty candidates would triple the bill to
// answer a question nobody asked about seventy-seven of them, so the spend follows
// the attention.

/**
 * What this voice has, and could have, across the judging set. SPENDS NOTHING.
 *
 * Returns a slot per line whether or not it holds audio, because "not rendered yet"
 * has to be visible in order to be tappable — a voice with no clip that shows nothing
 * is precisely the gap this answers.
 */
async function readVoice ({ language, voiceId, count = JUDGING_SET, lines = null }) {
  const set = lines || await pickLines(language, { count })
  if (!set.length) return { language, voiceId, lines: [], clips: [] }

  const idx = readIndex()
  const plan = renderPlan(voiceId, language)
  const clips = []
  for (let i = 0; i < set.length; i++) {
    const line = set[i]
    const cached = idx[cacheKey(voiceId, language, line.text)]
    if (cached && store.readClip(cached.clip)) {
      clips.push({ lineIndex: i, url: `/api/voicelab/clip/${cached.clip}.mp3`, durationMs: cached.durationMs || null, free: false, cached: true })
      continue
    }
    const free = (await freeTakes(line.text, [voiceId])).get(voiceId)
    clips.push(free ? { lineIndex: i, ...free } : { lineIndex: i, url: null, renderable: Boolean(plan.provider), chars: line.text.length })
  }
  return {
    language,
    voiceId,
    lines: set,
    clips,
    provider: plan.provider || null,
    // Said in place, never inferred from a null url: "nothing has rendered this yet"
    // and "nothing here can ever render this" are different facts.
    why: plan.why || null,
  }
}

/**
 * Render ONE line for ONE voice. SPENDS MONEY — one clip, ledgered the moment it is
 * spent, refusable by the lab's daily character ceiling exactly as a row press is.
 *
 * Writes the same cache the row press writes, keyed on the same (voice, language,
 * text), so a clip rendered here is the clip the row plays afterwards and neither
 * path ever pays for the other's work twice.
 */
async function renderClip ({ language, voiceId, lineIndex = 0, renderOne, count = JUDGING_SET }) {
  const set = await pickLines(language, { count })
  const line = set[Number(lineIndex) || 0]
  if (!line) throw Object.assign(new Error(`no course line found for ${language}`), { status: 404 })

  const plan = renderPlan(voiceId, language)
  if (!plan.provider) throw Object.assign(new Error(`This voice cannot be rendered here — ${plan.why}.`), { status: 400 })

  const idx = readIndex()
  const key = cacheKey(voiceId, language, line.text)
  const cached = idx[key]
  if (cached && store.readClip(cached.clip)) {
    return { voiceId, lineIndex, line, chars: 0, clip: { lineIndex, url: `/api/voicelab/clip/${cached.clip}.mp3`, durationMs: cached.durationMs || null, cached: true } }
  }
  const free = (await freeTakes(line.text, [voiceId])).get(voiceId)
  if (free) return { voiceId, lineIndex, line, chars: 0, clip: { lineIndex, ...free } }

  const cfg = { ...lab.normaliseConfig({ provider: plan.provider, voiceId: plan.voiceId, language: plan.language }), key: 'V' }
  const refusal = lab.refuse({ kind: 'batch', sentences: [line.text], configs: [cfg], charsSpentToday: store.charsSpentToday() })
  if (refusal) throw Object.assign(new Error(refusal.error), { status: refusal.status })

  const { mastered, durationMs } = await renderOne({ text: line.text, cfg })
  const clip = store.newId()
  store.writeClip(clip, mastered)
  store.appendLedger({ sample: clip, chars: line.text.length, provider: cfg.provider, voiceId: cfg.voiceId, language, course: line.course })
  idx[key] = { clip, durationMs, voiceId, language, course: line.course, at: new Date().toISOString() }
  writeIndex(idx)
  return { voiceId, lineIndex, line, chars: line.text.length, clip: { lineIndex, url: `/api/voicelab/clip/${clip}.mp3`, durationMs, cached: true } }
}

module.exports = { pickLine, pickLines, chooseSet, quantileLine, readVoice, renderClip, JUDGING_SET, chooseFrom, preferCourses, freeTakes, isRenderable, renderPlan, read, prepare, cacheKey, MIN_CHARS, MAX_CHARS, HARD_CAP, INDEX }
