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
 * NOTHING HERE WRITES course_audio.
 */

const crypto = require('crypto')
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
  const db = client()
  const { data: courses, error } = await db
    .from('courses')
    .select('course_code, display_name, target_lang, known_lang, seed_count')
    .eq('target_lang', language)
    .order('seed_count', { ascending: false, nullsFirst: false })
    .limit(10)
  if (error) throw Object.assign(new Error(`courses read failed: ${error.message}`), { status: 502 })

  for (const c of preferCourses(courses || [], language)) {
    const { data: seeds } = await db
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', c.course_code)
      .order('seed_number', { ascending: true })
      .limit(200)
    const line = chooseFrom((seeds || []).map((s) => ({
      text: String(s.target_text || '').trim(),
      knownText: String(s.known_text || '').trim(),
      order: s.seed_number,
    })))
    if (line) {
      return {
        language,
        text: line.text,
        knownText: line.knownText,
        course: c.course_code,
        courseName: c.display_name || c.course_code,
        source: `${c.course_code} seed ${line.order}`,
        kind: 'seed',
      }
    }
  }

  return guideLine(language)
}

/**
 * The course order the picker walks. Pure, so the preference is testable without a DB.
 * `deu_for_eng` beats `deu_at_for_eng` because the second teaches a dialect, and
 * `cym_for_eng` beats `cym_for_yor` because a Yoruba known side tells Tom nothing.
 */
function preferCourses (courses, language) {
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

/** Can this lab render a fresh sample of this voice? Cartesia only, by design. */
function isRenderable (voiceId) { return /^cartesia_/.test(String(voiceId)) }

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
    // THIS LAB RENDERS CARTESIA AND NOTHING ELSE. The candidate list is wider
    // than that on purpose — an Azure voice or a human recordist can hold a
    // slot — but pushing an Azure voice id through a Cartesia config would
    // render a stranger and call it an audition. So a voice with no free take
    // and no Cartesia id is reported as unrenderable rather than quietly
    // dropped or quietly rendered: it can still be cast, just not previewed
    // here until the estate has a clip of it.
    ;(isRenderable(v) ? missing : unrenderable).push(v)
  }
  return {
    language,
    line: picked,
    samples,
    missing,
    unrenderable,
    // What pressing "prepare" would cost, before anyone presses it.
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
async function prepare ({ language, voiceIds = [], maxVoices = 12, renderOne }) {
  const state = await read({ language, voiceIds })
  if (!state.line) throw Object.assign(new Error(`no course line found for ${language}`), { status: 404 })

  const todo = state.missing.filter(isRenderable).slice(0, Math.max(1, maxVoices))
  if (!todo.length) return { ...state, rendered: [], chars: 0 }

  const lang = params.findLanguage(language)
  if (!lang) {
    throw Object.assign(
      new Error(`The lab cannot steer "${language}" — samples are limited to the languages params.cjs knows how to steer; casting works regardless.`),
      { status: 400 },
    )
  }

  const configs = todo.map((v, i) => ({
    ...lab.normaliseConfig({ provider: 'cartesia', voiceId: String(v).replace(/^cartesia_/, ''), language: lang.code }),
    key: `S${i}`,
  }))
  const idx = readIndex()
  const rendered = []
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
      break
    }
    const { mastered, durationMs } = await renderOne({ text: state.line.text, cfg: configs[i] })
    const clip = store.newId()
    store.writeClip(clip, mastered)
    store.appendLedger({
      sample: clip, chars: state.line.text.length, provider: 'cartesia',
      voiceId: configs[i].voiceId, language: lang.code, course: state.line.course,
    })
    chars += state.line.text.length
    idx[cacheKey(voiceId, language, state.line.text)] = {
      clip, durationMs, voiceId, language, course: state.line.course, at: new Date().toISOString(),
    }
    writeIndex(idx)   // after each clip: a crash must not lose what it already paid for
    rendered.push({ voiceId, url: `/api/voicelab/clip/${clip}.mp3`, durationMs })
  }

  const after = await read({ language, voiceIds, line: state.line })
  return { ...after, rendered, chars }
}

module.exports = { pickLine, chooseFrom, preferCourses, freeTakes, isRenderable, read, prepare, cacheKey, MIN_CHARS, MAX_CHARS, HARD_CAP, INDEX }
