/**
 * VOICELAB · AUDITION — "what does this voice sound like speaking that language?"
 *
 * Tom asked for five sentences of his own clone speaking Italian on 2026-09-04,
 * to show Aran. It was answered by a one-off script (tools/probe/render-ita-
 * clone-probe.cjs) that rendered thirteen clips into the evidence directory and
 * wrote a document. His reply was that he does not want another one-off: the
 * question is permanent, he asks it every time he casts, and it belongs on the
 * screen where he already casts.
 *
 * ── THE WHOLE FEATURE, AND ITS EDGES ────────────────────────────────────────
 * Pick a voice. Pick a language. Hear a paragraph. That is all it does, and the
 * three things it deliberately does NOT do are the reason it is safe to leave
 * on a button:
 *
 *   IT WRITES NOTHING INTO THE COURSE. No course_audio, no manifest, no
 *   presentation row, no cast. The clip lands in the lab's own on-disk store
 *   beside every other lab clip and is served straight back. Casting stays a
 *   separate, deliberate action on the Languages tab — an audition that could
 *   cast would make every idle click a decision.
 *
 *   IT BYPASSES NO CONSENT. The render goes through tts-service.generate(),
 *   which is where services/shared/voice-consent-gate.cjs already refuses an
 *   unconsented clone, and it does NOT set `consentAudition` — that narrow door
 *   exists for one person hearing their own unconfirmed clone in the
 *   confirmation flow, and widening it to "anybody previewing anybody" is
 *   exactly the erosion the gate was written to stop. A blocked voice comes
 *   back as the gate's own 409 with the gate's own words.
 *
 *   IT RUNS NO GATES. The six-gate stack takes the best part of a minute per
 *   clip on two whisper passes, and it answers "would the store admit this",
 *   which is not the question being asked here. The question is what it sounds
 *   like, and the only instrument for that is Tom's ear. The duration is
 *   reported so a truncated clip is visible; nothing here pretends to judge.
 *
 * ── THE CACHE, AND WHY THE KEY IS THE FILENAME ──────────────────────────────
 * An audition costs real money and the same audition is asked for repeatedly —
 * by the same person comparing, by the next person asking the same question a
 * week later. So the key is a hash of exactly what determines the bytes:
 *
 *     provider : voiceId | language | paragraph version | render settings
 *
 * and the key IS the clip id, which means the cache lookup is
 * `does that file exist` and the clip is served by the lab's existing
 * /api/voicelab/clip/:id.mp3 route with no second serving path to keep in step.
 * Nothing has to be invalidated by hand: change the paragraph and bump its
 * version, or change the house render settings, and the key moves on its own.
 * A stale clip cannot outlive the words it says.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const store = require('./store.cjs')
const lab = require('./lab.cjs')
const params = require('./params.cjs')
const paragraphs = require('./audition-paragraphs.cjs')

/** Sidecars live beside the clips, in their own directory, under the lab dir. */
const META_DIR = path.join(store.LAB_DIR, 'auditions')

/**
 * The render settings an audition uses, always. Fixed rather than exposed,
 * because a comparison in which the two sides were mastered differently is not
 * a comparison — and because every knob offered here is a knob Play mode
 * already offers, better.
 *
 * These are the house defaults, read from lab.cjs rather than restated, so this
 * cannot drift from what the pipeline actually renders.
 */
function renderSettings () {
  const d = lab.defaultConfig()
  return {
    speed: d.speed,
    masterLufs: d.masterLufs,
    sampleRate: d.sampleRate,
    bitRate: d.bitRate,
    codec: d.codec,
  }
}

/**
 * The fingerprint of the render settings, folded into the key. Without it a
 * change to the house mastering level would go on serving clips mastered to the
 * old one, for ever, with nothing on screen to say so.
 */
function settingsFingerprint (settings = renderSettings()) {
  return [settings.speed, settings.masterLufs, settings.sampleRate, settings.bitRate, settings.codec].join('/')
}

/**
 * The cache key, which is also the clip id. Sixteen hex characters, because that
 * is what store.ID_RE and the existing clip route accept — one id space, one
 * serving route, one directory to clear.
 */
function cacheKey ({ provider, voiceId, language, version, settings = renderSettings() }) {
  const material = [
    String(provider || '').toLowerCase(),
    String(voiceId || ''),
    String(language || '').toLowerCase(),
    `v${version}`,
    settingsFingerprint(settings),
  ].join('|')
  return crypto.createHash('sha256').update(material).digest('hex').slice(0, 16)
}

function metaPath (key) { return path.join(META_DIR, `${key}.json`) }

function readMeta (key) {
  try { return JSON.parse(fs.readFileSync(metaPath(key), 'utf8')) } catch { return null }
}

function writeMeta (key, meta) {
  fs.mkdirSync(META_DIR, { recursive: true })
  const target = metaPath(key)
  const tmp = `${target}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2))
  fs.renameSync(tmp, target)
  return meta
}

/**
 * Is this audition already paid for?
 *
 * BOTH have to be true — the bytes on disk AND the sidecar. A clip with no
 * sidecar would play with no idea what it is; a sidecar with no clip would
 * report a cache hit and serve a 404. Either half alone is a miss, and a miss
 * costs one render rather than one lie.
 */
function cached (key) {
  const clip = store.readClip(key)
  const meta = readMeta(key)
  if (!clip || !meta) return null
  return meta
}

/** The languages the audition offers, and what each one costs to hear. */
function languages () {
  const settings = renderSettings()
  return paragraphs.list().map((p) => ({
    ...p,
    // What the provider is actually handed, resolved through the same table the
    // render path uses. A dialect steers as its parent — Cartesia takes `de`,
    // not `de-AT` — and saying so is the difference between an honest audition
    // and one that implies the vendor is doing something it is not.
    steerAs: params.findLanguage(p.steer)?.steer || null,
    settingsFingerprint: settingsFingerprint(settings),
  }))
}

/**
 * Every voice the lab can offer, ACROSS languages rather than within one.
 *
 * params.voicesFor() answers a different question — "which voices are for this
 * language" — and filters Tom's clone out of everything but English, because
 * casting it into a German course is a decision that needs that filter. The
 * audition is the question you ask BEFORE that decision, and filtering the
 * answer out of the menu makes the feature unable to answer the thing it was
 * built for: his own clone speaking Italian is exactly what he asked to hear,
 * and the Italian probe on 2026-09-04 proved the render works.
 *
 * So this is the union over every language, deduplicated on provider:id, and
 * each voice keeps `nativeLanguages` — the languages it is actually LISTED
 * under — so the screen can say "native: English" beside a voice being
 * auditioned in Italian instead of hiding it.
 */
async function voices () {
  // BOTH lists, and the order does not matter — but forgetting the Cartesia one
  // does: params.voicesFor() reads a module-level catalogue that is empty until
  // it is fetched, so an audition menu built without this await is Tom's clone
  // and nothing else, which reads as "the vendor has one voice".
  await Promise.all([params.estateVoices(), params.cartesiaCatalogue()])
  const production = params._state().PRODUCTION_VOICES || {}
  const byKey = new Map()

  for (const lang of params.LANGUAGES) {
    for (const v of params.voicesFor(lang, production)) {
      const key = `${v.provider}:${v.id}`
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.nativeLanguages.includes(lang.name)) existing.nativeLanguages.push(lang.name)
        continue
      }
      byKey.set(key, {
        id: v.id,
        name: v.name || v.id,
        provider: v.provider,
        gender: v.gender || null,
        clone: Boolean(v.clone),
        owner: Boolean(v.owner),
        accent: v.accent || v.accentLocale || null,
        description: v.description || null,
        // The group params gave it is per-language ("Cartesia · German"), which
        // is meaningless once the list is the union. Re-grouped by what the
        // voice IS, which is what you are choosing between here.
        group: v.clone || v.owner ? 'Clones — this estate’s own' : v.group === 'In the estate today' ? 'In the estate today' : v.provider === 'azure' ? 'Azure' : 'Cartesia catalogue',
        nativeLanguages: [lang.name],
      })
    }
  }

  const order = ['Clones — this estate’s own', 'In the estate today', 'Cartesia catalogue', 'Azure']
  return [...byKey.values()].sort((a, b) => {
    const g = order.indexOf(a.group) - order.indexOf(b.group)
    return g !== 0 ? g : String(a.name).localeCompare(String(b.name))
  })
}

/**
 * Resolve one audition request into everything needed to answer it, WITHOUT
 * spending anything. Throws a 400/404 with a plain sentence rather than
 * returning a half-answer, because every caller here would only re-throw.
 */
function planFor ({ voiceId, provider, language }) {
  const p = paragraphs.find(language)
  if (!p) throw Object.assign(new Error(`No audition language called "${language}".`), { status: 404 })
  if (!p.text) {
    throw Object.assign(
      new Error(p.gap || `There is no audition paragraph for ${p.name} yet, so there is nothing to render.`),
      { status: 409, code: 'no_paragraph' }
    )
  }
  if (!voiceId) throw Object.assign(new Error('Pick a voice first.'), { status: 400 })
  const prov = String(provider || '').toLowerCase()
  if (!lab.PROVIDERS.some((x) => x.id === prov)) {
    throw Object.assign(new Error(`${provider || 'That provider'} is not one this lab can render — ${lab.PROVIDERS.map((x) => x.id).join(' or ')}.`), { status: 400 })
  }

  const settings = renderSettings()
  const key = cacheKey({ provider: prov, voiceId, language: p.code, version: p.version, settings })
  return {
    key,
    language: p.code,
    languageName: p.name,
    dialectOf: p.dialectOf || null,
    steer: p.steer,
    version: p.version,
    text: p.text,
    chars: p.text.length,
    provider: prov,
    voiceId: String(voiceId),
    settings,
  }
}

/** The config the runner takes. Fixed settings, this voice, this language. */
function configFor (plan, { voiceName } = {}) {
  return lab.normaliseConfig({
    provider: plan.provider,
    voiceId: plan.voiceId,
    voiceName: voiceName || plan.voiceId,
    language: plan.steer,
    ...plan.settings,
  })
}

/**
 * Render one audition, or hand back the cached one.
 *
 * The money is spent in exactly one place — `renderOne` — and everything before
 * it is a lookup. `runner` is injected so the cache path can be tested without
 * a TTS key anywhere near it.
 */
async function audition ({ voiceId, provider, language, voiceName, runner = null, now = new Date() }) {
  const plan = planFor({ voiceId, provider, language })

  const hit = cached(plan.key)
  if (hit) return { ...hit, cached: true, url: `/api/voicelab/clip/${plan.key}.mp3` }

  // The daily character ceiling is the estate's only enforced spend guard, and
  // it refuses rather than quietly costing money — same posture as every other
  // run in this lab, checked here so an audition cannot be the one door that
  // walks past it.
  const spentToday = store.charsSpentToday(now)
  if (spentToday + plan.chars > lab.LIMITS.dailyCharCeiling) {
    throw Object.assign(
      new Error(`That would take today past the lab's ${lab.LIMITS.dailyCharCeiling.toLocaleString()}-character ceiling (${spentToday.toLocaleString()} spent so far). It refuses rather than quietly costing money — cached auditions still play.`),
      { status: 429, code: 'ceiling' }
    )
  }

  const run = runner || require('./runner.cjs')
  const cfg = configFor(plan, { voiceName })
  const { mastered, durationMs, renderMs, masterMs } = await run.renderOne({ text: plan.text, cfg })

  store.writeClip(plan.key, mastered)
  store.appendLedger({
    audition: plan.key,
    chars: plan.chars,
    provider: plan.provider,
    voiceId: plan.voiceId,
    language: plan.language,
  })

  const meta = writeMeta(plan.key, {
    key: plan.key,
    at: now.toISOString(),
    provider: plan.provider,
    voiceId: plan.voiceId,
    voiceName: voiceName || plan.voiceId,
    language: plan.language,
    languageName: plan.languageName,
    dialectOf: plan.dialectOf,
    steer: plan.steer,
    version: plan.version,
    text: plan.text,
    chars: plan.chars,
    durationMs,
    renderMs,
    masterMs,
    bytes: mastered.length,
    settings: plan.settings,
  })

  return { ...meta, cached: false, url: `/api/voicelab/clip/${plan.key}.mp3` }
}

/** Everything already paid for, newest first — so the free answers are findable. */
function history (limit = 60) {
  if (!fs.existsSync(META_DIR)) return []
  return fs.readdirSync(META_DIR)
    .filter((f) => /^[a-f0-9]{16}\.json$/.test(f))
    .map((f) => readMeta(f.slice(0, 16)))
    .filter((m) => m && store.readClip(m.key))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit)
    .map((m) => ({ ...m, cached: true, url: `/api/voicelab/clip/${m.key}.mp3` }))
}

module.exports = {
  META_DIR,
  renderSettings,
  settingsFingerprint,
  cacheKey,
  cached,
  readMeta,
  writeMeta,
  languages,
  voices,
  planFor,
  configFor,
  audition,
  history,
}
