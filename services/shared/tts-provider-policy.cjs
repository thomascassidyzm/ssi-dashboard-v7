/**
 * tts-provider-policy.cjs — THE PROVIDER LADDER. One ordering, in one place,
 * that every caller reads instead of deciding for itself.
 *
 * OWNER RULING (Tom, 2026-08-27/28). Five rungs, in priority order:
 *
 *   1. HUMAN RECORDING WINS WHEREVER IT EXISTS. Used for the more obscure
 *      courses — Welsh is the standing example, where even Azure is not good
 *      enough. Nothing here may ever cause a synthetic render to displace a
 *      human-recorded clip. This is a STOP, not a preference: for a human-voice
 *      course this module throws rather than naming any provider at all.
 *   2. CARTESIA is the standing default for synthesis. No dropdown, no
 *      per-course pick — "a choice in the UI is a thing you then have to keep
 *      making".
 *   3. AZURE is the fallback for any language or voice Cartesia does not cover.
 *   4. ELEVENLABS stays available and is still used for some things, but it is
 *      EXPENSIVE and must NEVER be reached automatically. Explicit choice only.
 *      There is deliberately no "Cartesia missing, Azure missing, try
 *      ElevenLabs" chain: if Azure cannot cover it either, the honest answer is
 *      to fail and surface the gap, not to quietly spend money.
 *   5. xAI is RETIRED FROM SELECTION. New renders can never choose it.
 *
 * ── WHAT "RETIRED" MEANS, AND WHAT IT DOES NOT ──────────────────────────────
 * Retirement is removal from the SELECTABLE path for NEW renders. It is NOT
 * removal from the data model. There are hundreds of thousands of course_audio
 * rows carrying `xai_…` voice ids and voice_id is part of clip identity, so
 * `PROVIDER_ALIASES` in services/shared/clip-identity.cjs keeps `xai`, voice-id
 * spelling resolution keeps handling both the bare and `xai_`-prefixed forms,
 * and every read, playback, relink and identity path is untouched. Nothing is
 * deleted from S3 or the database. Break that and every historic xAI clip stops
 * resolving and learners hear silence.
 *
 * ── WHY COVERAGE IS TWO QUESTIONS, NOT ONE ──────────────────────────────────
 * "Can Cartesia speak this language?" and "do we have a Cartesia voice cast for
 * it?" are different questions, and only the first one is answered by a vendor
 * doc. Measured on the live estate 2026-08-28: the `voices` table holds 165
 * Azure rows, 118 xAI rows, 2 ElevenLabs rows, 17 human rows and **zero
 * Cartesia rows**; the only Cartesia voice anywhere in the estate is Tom's
 * clone (91 clips, English only, pods). A policy that answered "cartesia"
 * purely on the vendor's language list would hand an Azure voice NAME
 * ("es-ES-…Neural") to Cartesia's API, which wants a bare UUID — a hard fail
 * mid-build, in a language that reads as covered. So Cartesia is selected only
 * when a Cartesia VOICE is actually resolvable, and where it is not the ladder
 * falls honestly to Azure and says so in `reason`.
 *
 * That makes casting, not language coverage, the live blocker on Cartesia
 * becoming the estate's default in practice — see the gap report in
 * docs/tts-provider-policy-2026-08-28.md. It also makes adoption FORWARD-ONLY
 * by construction (Tom, standing, 2026-08-27): nothing here regenerates
 * anything; it only decides what a NEW render uses.
 */

const {
  isHumanVoiceCourse,
  isHumanVoiceLang,
} = require('./human-voice-courses.cjs');

/**
 * Cartesia's published language list.
 *
 * PROVENANCE, STATED PLAINLY BECAUSE IT MATTERS: this is a HARDCODED SNAPSHOT
 * transcribed from Cartesia's own model docs, fetched 2026-08-26/27. It is NOT
 * a live query — Cartesia publishes no coverage API we call, so nothing in this
 * repo verifies the list against the running service. If Cartesia adds or drops
 * a language, this file is wrong until a human edits it.
 *
 * MODEL MISMATCH, ALSO STATED PLAINLY: the list below is the **sonic-3.5**
 * list, which is the only one published in a form we could transcribe.
 * Production is pinned to **sonic-3.6** (`CARTESIA_MODEL` in
 * services/tts-service.cjs, shipped 2026-08-27). Whether 3.6's list is
 * identical to 3.5's is UNVERIFIED — confirming it needs either a doc fetch or
 * a live API call, and a live call renders billable audio, which is an approval
 * gate. Treated as identical here because that is the conservative reading for
 * a list used to route AWAY from Cartesia when a language is absent; a language
 * 3.6 added and 3.5 lacked simply keeps going to Azure, which is safe.
 *
 * The same list, with the same fetch date, also lives in
 * tools/tts-bakeoff/adapters/cartesia.cjs as `languageSupport()`. That is the
 * bake-off harness's copy and is not on the render path; this module is the one
 * production reads. They agree as of 2026-08-28.
 */
const CARTESIA_LANGUAGE_SNAPSHOT = Object.freeze({
  model: 'sonic-3.5',
  productionModel: 'sonic-3.6',
  fetchedAt: '2026-08-26',
  source: 'https://docs.cartesia.ai/build-with-cartesia/models/tts',
  verified: false,
  verificationNote:
    'Hardcoded snapshot of the published sonic-3.5 list. No live coverage query exists; ' +
    'the sonic-3.6 list is unverified against it.',
});

/** The 42 ISO-639-1 codes Cartesia publishes for Sonic. Welsh (cy) is NOT here. */
const CARTESIA_LANGUAGE_CODES = Object.freeze(new Set([
  'en', 'fr', 'de', 'es', 'pt', 'zh', 'ja', 'hi', 'it', 'ko', 'nl', 'pl', 'ru',
  'sv', 'tr', 'tl', 'bg', 'ro', 'ar', 'cs', 'el', 'fi', 'hr', 'ms', 'sk', 'da',
  'ta', 'uk', 'hu', 'no', 'vi', 'bn', 'th', 'he', 'ka', 'id', 'te', 'gu', 'kn',
  'ml', 'mr', 'pa',
]));

/**
 * ISO-639-3 (how courses store target_lang) → ISO-639-1 (what Cartesia lists).
 * Only the languages that actually appear on live courses need an entry; an
 * unmapped code falls through to the two-letter prefix test and, failing that,
 * is treated as NOT covered — which routes to Azure. Erring toward "not
 * covered" is the safe direction: the cost is a render on Azure, whereas erring
 * the other way is a hard failure or a wrong-sounding voice.
 */
const ISO3_TO_ISO1 = Object.freeze({
  eng: 'en', fra: 'fr', deu: 'de', ger: 'de', spa: 'es', por: 'pt', zho: 'zh',
  cmn: 'zh', jpn: 'ja', hin: 'hi', ita: 'it', kor: 'ko', nld: 'nl', dut: 'nl',
  pol: 'pl', rus: 'ru', swe: 'sv', tur: 'tr', tgl: 'tl', fil: 'tl', bul: 'bg',
  ron: 'ro', rum: 'ro', ara: 'ar', ces: 'cs', cze: 'cs', ell: 'el', gre: 'el',
  fin: 'fi', hrv: 'hr', msa: 'ms', may: 'ms', slk: 'sk', slo: 'sk', dan: 'da',
  tam: 'ta', ukr: 'uk', hun: 'hu', nor: 'no', nob: 'no', nno: 'no', vie: 'vi',
  ben: 'bn', tha: 'th', heb: 'he', kat: 'ka', geo: 'ka', ind: 'id', tel: 'te',
  guj: 'gu', kan: 'kn', mal: 'ml', mar: 'mr', pan: 'pa',
  // Present on live courses, deliberately mapped to codes Cartesia does NOT
  // list, so they resolve to "not covered" rather than falling through by
  // accident: Welsh, Breton, Cornish, Irish, Scottish Gaelic, Manx, and the
  // rest of the long tail all take this path.
  cym: 'cy', bre: 'br', cor: 'kw', gle: 'ga', gla: 'gd', glv: 'gv', pdc: 'pdc',
});

/**
 * Normalise anything a caller might hold — 'spa', 'es', 'es-ES', 'spa_419',
 * 'zh-CN' — to the two-letter code Cartesia's list is written in. Returns null
 * for 'auto' and for empty input, both of which mean "we do not know", and a
 * language we do not know is never claimed as covered.
 */
function toCartesiaLangCode(language) {
  const raw = String(language || '').trim().toLowerCase();
  if (!raw || raw === 'auto' || raw === 'unknown') return null;
  const base = raw.split(/[-_]/)[0];
  if (ISO3_TO_ISO1[base]) return ISO3_TO_ISO1[base];
  if (base.length === 2) return base;
  return base; // 3-letter code with no mapping — will not be in the list
}

/**
 * Does Cartesia publish support for this language?
 *
 * A LANGUAGE fact only. It says nothing about whether we own a voice that can
 * speak it — see `cartesiaVoiceFor`. Both must hold before Cartesia is chosen.
 */
function cartesiaCoversLanguage(language) {
  const code = toCartesiaLangCode(language);
  return code != null && CARTESIA_LANGUAGE_CODES.has(code);
}

/**
 * Cartesia voices known to this estate.
 *
 * `autoCast: false` on every entry, and that is the whole point rather than an
 * oversight. Tom's clone is HIS voice: auto-assigning it to every English line
 * in 67 courses is a casting decision with his name on it, not a routing
 * default, so the policy will use it only when a caller already names it.
 * Until a voice is cast for a language — either by adding an `autoCast` entry
 * here or by registering a `voices` row with `tts_engine='cartesia'` and
 * passing a DB-backed lookup as `opts.cartesiaVoices` — Cartesia has no voice
 * to offer for that language and the ladder falls to Azure.
 *
 * This is the lever that turns Cartesia on per language. It is one line each,
 * and it is deliberately a human's line to write.
 */
const CARTESIA_VOICES = Object.freeze({
  '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2': Object.freeze({
    label: 'tom_001',
    // ENGLISH ONLY (Tom, standing, 2026-08-27): his clone must never voice a
    // target-language line. Enforced independently at two gates that landed in
    // 754d40117 — tools/pods/tom-voice-language-gate.cjs on the text before it
    // is sent, and a whisper `-l auto` pass on the rendered clip before its link
    // is swapped. This entry is a third statement of the same rule, at the
    // routing layer, and it does not weaken either of the others.
    languages: Object.freeze(['en']),
    autoCast: false,
    note: "Tom's Cartesia clone. English lines only. Explicit cast only — never auto-assigned.",
  }),
});

/** Is this voice id one of our known Cartesia voices? Accepts either spelling. */
function knownCartesiaVoice(voiceId) {
  const bare = String(voiceId || '').replace(/^cartesia_/, '');
  return CARTESIA_VOICES[bare] || null;
}

/**
 * Can a known Cartesia voice legitimately speak this language?
 * A voice with no declared language list is unconstrained; a voice that
 * declares one is held to it. Tom's clone declares `['en']`, so this is what
 * stops the routing layer pointing his clone at a Spanish line.
 */
function cartesiaVoiceCanSpeak(voiceId, language) {
  const voice = knownCartesiaVoice(voiceId);
  if (!voice) return true; // unknown-to-us Cartesia voice: not ours to constrain
  if (!voice.languages) return true;
  const code = toCartesiaLangCode(language);
  return code != null && voice.languages.includes(code);
}

/**
 * Find an auto-castable Cartesia voice for a language, if one exists.
 *
 * @param {string} language
 * @param {object} [opts]
 * @param {object} [opts.cartesiaVoices] - registry override; same shape as
 *   CARTESIA_VOICES. Pass a DB-derived map (voices rows where
 *   tts_engine='cartesia') to let casting happen without a code change.
 * @returns {{voiceId: string}|null}
 */
function cartesiaVoiceFor(language, opts = {}) {
  const registry = opts.cartesiaVoices || CARTESIA_VOICES;
  const code = toCartesiaLangCode(language);
  if (code == null) return null;
  for (const [voiceId, voice] of Object.entries(registry)) {
    if (!voice || voice.autoCast !== true) continue;
    if (voice.languages && !voice.languages.includes(code)) continue;
    return { voiceId };
  }
  return null;
}

/** Providers a new render may never choose, whatever any config says. */
const RETIRED_PROVIDERS = Object.freeze(new Set(['xai']));

/**
 * Providers reachable only when a caller NAMES them. Never returned by the
 * automatic ladder, never a fallback, never a silent promotion. ElevenLabs is
 * here because it is expensive and this is a money-path constraint.
 */
const EXPLICIT_ONLY_PROVIDERS = Object.freeze(new Set(['elevenlabs']));

/** Providers the automatic ladder is allowed to return, in order. */
const AUTOMATIC_LADDER = Object.freeze(['cartesia', 'azure']);

class ProviderPolicyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ProviderPolicyError';
    this.code = code;
  }
}

/**
 * THE ONE DECISION. Replaces the scattered `provider || 'azure'` defaults and
 * the per-site if/else chains: callers ask this, they do not decide.
 *
 * @param {object} input
 * @param {string} [input.courseCode]        - course the render belongs to
 * @param {string} [input.language]          - the line's language (iso3, iso1 or locale)
 * @param {string} [input.voiceId]           - the voice the caller already holds
 * @param {string} [input.role]              - 'known' | 'target1' | … (informational)
 * @param {string} [input.configuredProvider]- what voice_config / a pod cast says
 * @param {string} [input.explicitProvider]  - a caller DELIBERATELY naming a provider
 *                                             (the only door to ElevenLabs)
 * @param {object} [opts]
 * @param {object} [opts.cartesiaVoices]     - registry override (see cartesiaVoiceFor)
 * @returns {{provider: string, voiceId: string|undefined, rung: number, reason: string}}
 * @throws {ProviderPolicyError} for human-voice content, for an explicit xAI
 *   request, and when no automatic rung can cover the language.
 */
function selectProvider(input = {}, opts = {}) {
  const {
    courseCode,
    language,
    voiceId,
    configuredProvider,
    explicitProvider,
  } = input;

  const norm = (p) => (p == null ? null : String(p).trim().toLowerCase() || null);
  const explicit = norm(explicitProvider);
  const configured = norm(configuredProvider);

  // ── RUNG 1: HUMAN RECORDING. A STOP, NOT A PREFERENCE. ───────────────────
  // Checked first and unconditionally, ahead of every explicit request, so
  // there is no state in which this function answers a synthetic provider for
  // human-voiced content. tts-service.assertNotHumanVoiceCourse still fires
  // independently at the render chokepoint — this is the earlier of the two,
  // not a replacement for it.
  if (isHumanVoiceCourse(courseCode) || isHumanVoiceLang(language)) {
    throw new ProviderPolicyError(
      `Human-voice content (403): ${courseCode || language} is human-recorded only — ` +
      'no TTS provider may be selected for it, ever (Tom 2026-07-25, 2026-07-27, ' +
      '2026-08-13, 2026-08-14). A human recording wins wherever it exists. Its gaps ' +
      'are a recording worklist for its recordists, not a render backlog. To genuinely ' +
      'change that, edit services/shared/human-voice-courses.cjs with Tom\'s sign-off — ' +
      'there is no runtime override on purpose.',
      'HUMAN_VOICE',
    );
  }

  // ── xAI: RETIRED FROM SELECTION ──────────────────────────────────────────
  // An explicit request for it is an error, loudly, so a caller learns rather
  // than silently getting something else.
  if (explicit && RETIRED_PROVIDERS.has(explicit)) {
    throw new ProviderPolicyError(
      `Provider "${explicit}" is retired and cannot be selected for a new render ` +
      '(Tom 2026-08-27). Historic clips on it keep playing untouched — retirement is ' +
      'from selection only, never from clip identity or any read path.',
      'RETIRED_PROVIDER',
    );
  }

  // ── RUNG 4: EXPLICIT CHOICE ──────────────────────────────────────────────
  // A caller naming a provider outright is honoured — that is what makes
  // ElevenLabs reachable at all. Deliberately AFTER the human-voice stop and
  // the retirement check, and deliberately NOT reachable from the automatic
  // ladder below.
  if (explicit) {
    return {
      provider: explicit,
      voiceId,
      rung: EXPLICIT_ONLY_PROVIDERS.has(explicit) ? 4 : 0,
      reason: `explicitly requested: ${explicit}`,
    };
  }

  // A stored config naming a retired provider does NOT get honoured — this is
  // exactly where xAI's retirement bites, and where the policy overrides
  // per-course config. Fall through to the ladder.
  const configuredIsRetired = configured != null && RETIRED_PROVIDERS.has(configured);

  // A stored config naming ElevenLabs IS a deliberate human choice made at
  // config time, so it is honoured — nothing is being "reached for
  // automatically" here, and the two live ElevenLabs voices serve the welcome /
  // presentation / encouragement paths. What is forbidden is the ladder
  // PROMOTING to ElevenLabs on its own, and it never does: ElevenLabs is not in
  // AUTOMATIC_LADDER.
  if (configured && EXPLICIT_ONLY_PROVIDERS.has(configured)) {
    return {
      provider: configured,
      voiceId,
      rung: 4,
      reason: `configured explicitly as ${configured} (stored config is a deliberate choice, not an automatic fallback)`,
    };
  }

  // ── RUNG 2: CARTESIA, THE STANDING DEFAULT ───────────────────────────────
  // Two conditions, both required: the language is on Cartesia's published
  // list, AND a Cartesia voice is actually resolvable for it. Language alone is
  // not enough — see the header note on why routing on the vendor list alone
  // hands an Azure voice name to a UUID-shaped API.
  const languageCovered = cartesiaCoversLanguage(language);

  // A config that names BOTH Cartesia and a Cartesia voice, for a language we
  // cannot resolve ('auto', or simply unset), is a deliberate opt-in by a
  // caller holding a Cartesia-shaped voice id — the voice-preview path does
  // exactly this. Honour it rather than kicking it to Azure, which would hand
  // Azure a bare UUID. Nothing is weakened by allowing it: generateCartesia
  // still hard-fails on a MISSING steer and warns on an explicit 'auto', and
  // the clone's English-only rule is independently enforced at two gates that
  // do not consult this module (the text gate in tools/pods/
  // tom-voice-language-gate.cjs and the whisper `-l auto` pass on the rendered
  // clip). A language we DO recognise and that the voice may not speak is a
  // different case entirely and still falls through to Azure below.
  if (!languageCovered && configured === 'cartesia' && voiceId && toCartesiaLangCode(language) == null) {
    return {
      provider: 'cartesia',
      voiceId,
      rung: 2,
      reason: 'cartesia: configured provider and voice, with no resolvable language to check coverage against',
    };
  }

  if (languageCovered) {
    // The config already names a Cartesia voice: use it, provided the voice is
    // allowed to speak this language (Tom's clone is English-only).
    if (configured === 'cartesia' && voiceId) {
      if (cartesiaVoiceCanSpeak(voiceId, language)) {
        return {
          provider: 'cartesia',
          voiceId,
          rung: 2,
          reason: 'cartesia: language covered and the configured voice is a Cartesia voice',
        };
      }
      return {
        provider: 'azure',
        voiceId: undefined,
        rung: 3,
        reason:
          `azure: the configured Cartesia voice ${voiceId} is not permitted in ` +
          `"${language}" (per-voice language restriction) — falling back rather than ` +
          'voicing a line in a language this voice may not speak',
      };
    }

    // Otherwise: is there a voice cast for this language?
    const cast = cartesiaVoiceFor(language, opts);
    if (cast) {
      return {
        provider: 'cartesia',
        voiceId: cast.voiceId,
        rung: 2,
        reason: `cartesia: language covered and voice ${cast.voiceId} is cast for it`,
      };
    }

    return {
      provider: 'azure',
      voiceId: configuredIsRetired ? undefined : voiceId,
      rung: 3,
      reason:
        (configuredIsRetired ? `azure: configured provider "${configured}" is retired; ` : 'azure: ') +
        `Cartesia publishes "${language}" but no Cartesia voice is cast for it ` +
        '(the estate holds exactly one Cartesia voice, English-only, explicit-cast only). ' +
        'Casting, not language coverage, is what is missing here.',
    };
  }

  // ── RUNG 3: AZURE, THE FALLBACK ──────────────────────────────────────────
  return {
    provider: 'azure',
    voiceId: configuredIsRetired ? undefined : voiceId,
    rung: 3,
    reason: configuredIsRetired
      ? `azure: configured provider "${configured}" is retired; Cartesia does not publish "${language}"`
      : `azure: Cartesia does not publish "${language}"`,
  };
}

/**
 * Guard for anything that has ALREADY picked a provider by some other route and
 * wants to prove it did not pick a retired one. Cheap to call, and the point of
 * calling it on the result rather than the input is that a provider which
 * slipped past an upstream filter fails here rather than reaching the vendor.
 */
function assertSelectableProvider(provider, context = 'render') {
  const p = String(provider || '').trim().toLowerCase();
  if (RETIRED_PROVIDERS.has(p)) {
    throw new ProviderPolicyError(
      `Retired provider "${p}" reached ${context} (403). New renders may not use it ` +
      '(Tom 2026-08-27). Existing clips on it are untouched and still play.',
      'RETIRED_PROVIDER',
    );
  }
  return p;
}

module.exports = {
  CARTESIA_LANGUAGE_SNAPSHOT,
  CARTESIA_LANGUAGE_CODES,
  CARTESIA_VOICES,
  ISO3_TO_ISO1,
  RETIRED_PROVIDERS,
  EXPLICIT_ONLY_PROVIDERS,
  AUTOMATIC_LADDER,
  ProviderPolicyError,
  toCartesiaLangCode,
  cartesiaCoversLanguage,
  cartesiaVoiceFor,
  cartesiaVoiceCanSpeak,
  knownCartesiaVoice,
  selectProvider,
  assertSelectableProvider,
};
