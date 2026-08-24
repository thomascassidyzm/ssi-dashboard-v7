/**
 * Canonical form of an audio clip's IDENTITY key.
 *
 * The content-addressed design (docs/architecture/
 * AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md) makes a clip's logical
 * identity `(language, text_normalized, voice_id)`: one stored object per unique
 * combination. That only dedups if two clips that ARE the same combination are
 * always SPELT the same. On 2026-08-06 they were not:
 *
 *   language  — 137 distinct values for ~60 languages: ISO-639-3 ('eng'),
 *               ISO-639-1 ('en'), BCP-47 ('en-GB', 'pt-BR', 'fr-CA'), and the
 *               literal 'auto' (7,847 rows, 36 courses).
 *   voice_id  — the same voice under 2-3 spellings: 'azure_en-GB-SoniaNeural'
 *               vs 'en-GB-SoniaNeural' (414,061 rows between them), 'xai_eve'
 *               vs 'eve', 'xai_leo' vs 'comp:leo' vs 'leo'. ~100 voice bases
 *               carry more than one spelling.
 *
 * Every one of those pairs is a dedup miss: the lookup asks "does this clip
 * exist?", spells it one way, finds nothing, and pays for a render that already
 * exists — or worse, writes a second row that a reader filtering the other
 * spelling can never see.
 *
 * ── THE CANONICAL FORMS ──────────────────────────────────────────────────────
 *
 * LANGUAGE = the estate's own database_code, region-free.
 *   The `database_code` column of tools/sync/reference/language_codes.csv — the
 *   same code course codes are built from (`zho_for_eng`, `fra_for_eng`). Three
 *   lowercase letters. Region is DROPPED: 'fr-CA' → 'fra', 'pt-BR' → 'por',
 *   'ar-LB' → 'ara'.
 *
 *   Dropping region is safe *because voice is in the identity*. A Canadian
 *   French clip and a metropolitan French clip of the same text are told apart
 *   by their voice (azure_fr-CA-SylvieNeural vs azure_fr-FR-CelesteNeural), so
 *   the region carried on the language column adds nothing and only splits the
 *   key. The estate already agrees with itself here: fra_ca_for_eng stores
 *   'fra' on 61,030 rows and por_br_for_eng stores 'por'.
 *
 * VOICE = '<provider>_<provider's own voice id>'.
 *   Lowercase provider from a closed set, an underscore, then the provider's id
 *   verbatim (Azure voice names are case-significant, so they are NOT
 *   lowercased). This is the majority spelling already (1.94M of 2.53M rows),
 *   it is the composition `courses.voice_config` already stores in two fields
 *   ({provider: 'azure', voiceId: 'en-GB-SoniaNeural'}), and it is the
 *   convention services/voice-gender-map.cjs documents.
 *
 * TEXT = normalizeForDb() from ./text-normalize.cjs, which is byte-identical to
 *   the SQL normalize_text() the course_audio trigger runs. Read that file's
 *   header before trusting any text match: the column holds two historical
 *   conventions.
 *
 * ── WHAT DELIBERATELY THROWS ─────────────────────────────────────────────────
 *
 * Some values cannot be canonicalised because they are not a language or a
 * voice at all — 'auto', 'legacy_import', a bare 'human'. Guessing at them is
 * how a wrong clip gets linked, so they throw. A caller that hits one must
 * resolve the real value (from the course code + role, or from the render job)
 * rather than fall back. Use the `is*Canonical` / `try*` helpers where a
 * read-only audit needs to survive bad data.
 */

const { normalizeForDb } = require('./text-normalize.cjs');
const langService = require('./../language-code-service.cjs');

/** Separator for the flat key string. A unit separator cannot occur in a text. */
const SEP = '\u001f';

/** Providers we accept as the prefix of a canonical voice id. */
const PROVIDERS = ['azure', 'xai', 'elevenlabs', 'google', 'narakeet', 'human'];

/**
 * Spellings that appear in the live estate and mean a provider, plus the older
 * separators. 'comp:' is deliberately NOT here — a composite is a splice of two
 * takes, not a provider (see canonicalVoiceId).
 */
const PROVIDER_ALIASES = {
  azure: 'azure',
  ms: 'azure',
  microsoft: 'azure',
  xai: 'xai',
  elevenlabs: 'elevenlabs',
  eleven: 'elevenlabs',
  '11labs': 'elevenlabs',
  google: 'google',
  gcp: 'google',
  narakeet: 'narakeet',
  human: 'human',
};

/**
 * Unprefixed voice ids in the estate whose provider is known from the `voices`
 * registry. Without this table a bare 'eve' has no provider and cannot be
 * canonicalised; with it, 'eve' and 'xai_eve' become one identity.
 * Source: `select voice_id, tts_engine from voices` plus the six xAI names the
 * registry carries, checked against course_audio on 2026-08-06.
 */
const KNOWN_BARE_VOICES = {
  eve: 'xai',
  leo: 'xai',
  ara: 'xai',
  sal: 'xai',
  rex: 'xai',
  gfzdpspr5fdp: 'xai',
  bedd6226: 'xai',
};

/** Values that are placeholders, not voices. Never guess these. */
const NON_VOICE_SENTINELS = new Set([
  'legacy_import',
  'legacy',
  'human',
  'human_recording',
  'unknown',
  'default',
  'auto',
  '',
]);

/** Values that are placeholders, not languages. */
const NON_LANGUAGE_SENTINELS = new Set(['auto', 'unknown', 'multi', 'und', '']);

class ClipIdentityError extends Error {
  constructor(field, value, why) {
    super(`cannot canonicalise ${field} ${JSON.stringify(value)}: ${why}`);
    this.name = 'ClipIdentityError';
    this.field = field;
    this.value = value;
  }
}

// ─── language ────────────────────────────────────────────────────────────────

/**
 * Canonicalise any language code to the estate's region-free database_code.
 * Accepts ISO-639-3 ('eng'), ISO-639-1 ('en'), BCP-47 ('en-GB', 'pt_BR').
 * Throws ClipIdentityError on a sentinel or an unrecognised code.
 *
 * @param {string} code
 * @returns {string} three-letter database_code, e.g. 'eng', 'zho', 'fra'
 */
function canonicalLanguage(code) {
  const raw = String(code == null ? '' : code).trim().toLowerCase();
  if (NON_LANGUAGE_SENTINELS.has(raw)) {
    throw new ClipIdentityError('language', code, 'not a language — resolve it from the course code and role');
  }

  // Region is not part of the identity: 'fr-CA' and 'pt_BR' reduce to their
  // primary subtag before anything else is tried.
  const primary = raw.split(/[-_]/)[0];
  if (!primary) throw new ClipIdentityError('language', code, 'empty');

  if (ESTATE_OVERRIDES[primary]) return ESTATE_OVERRIDES[primary];

  // Already a database_code? (What course codes use, e.g. 'eng', 'zho'.)
  if (DATABASE_CODES.has(primary)) return primary;

  // A manifest/ISO-639-1 code the CSV knows? ('en' → 'eng', 'zh' → 'zho')
  const viaCsv = langService.standardToLegacy(primary);
  if (viaCsv && DATABASE_CODES.has(viaCsv)) return viaCsv;

  // A 639-1 code whose CSV row uses a different manifest code ('zh' is filed
  // under manifest 'cmn'): resolve name-first, then take that row's db code.
  const viaName = langService.getCode(primary);
  if (viaName) {
    const dbCode = langService.standardToLegacy(viaName);
    if (dbCode && DATABASE_CODES.has(dbCode)) return dbCode;
  }

  throw new ClipIdentityError('language', code, 'not in tools/sync/reference/language_codes.csv');
}

/**
 * Where two database_codes name one language, the estate's own choice wins —
 * the code its course codes are built from. The CSV files Chinese under both
 * 'cmn' and 'zho'; every Chinese course code and all 111,472 Chinese audio rows
 * say 'zho', so 'zho' is canonical and 'cmn' resolves to it.
 */
const ESTATE_OVERRIDES = { cmn: 'zho', zh: 'zho' };

/** Every database_code the reference CSV defines (the keys of its db→manifest map). */
const DATABASE_CODES = (() => {
  const set = new Set();
  for (const code of Object.keys(langService.LEGACY_TO_STANDARD)) {
    const c = String(code).toLowerCase();
    if (c.length === 3 && !ESTATE_OVERRIDES[c]) set.add(c);
  }
  return set;
})();

// ─── voice ───────────────────────────────────────────────────────────────────

/**
 * Canonicalise a voice id to '<provider>_<provider voice id>'.
 *
 * @param {string} voiceId  e.g. 'en-GB-SoniaNeural', 'azure_en-GB-SoniaNeural',
 *                          'comp:leo', 'eve'
 * @param {object} [opts]
 * @param {string} [opts.provider] provider from the caller's own context —
 *                 e.g. courses.voice_config.voices.<role>.provider. Used when
 *                 the id carries no prefix. If the id DOES carry a prefix and
 *                 they disagree, the id's own prefix wins and the mismatch is
 *                 thrown, because silently picking one is how a clip gets
 *                 filed under the wrong voice.
 * @returns {string}
 */
function canonicalVoiceId(voiceId, opts = {}) {
  const raw = String(voiceId == null ? '' : voiceId).trim();
  if (NON_VOICE_SENTINELS.has(raw.toLowerCase())) {
    throw new ClipIdentityError('voice_id', voiceId, 'a placeholder, not a voice');
  }

  // A composite is a splice of two takes, not a voice — 'comp:' names a recipe
  // ('comp:ga-IE-OrlaNeural+en-GB-SoniaNeural' is the Irish chunk voice over the
  // English known voice). It keeps its own namespace and each part is
  // canonicalised, so a spliced clip never collapses onto a plain single-voice
  // render of the same text. Nothing produces composites since explainers were
  // deprecated on 2026-08-24, but the existing clips still have to be read.
  if (/^comp:/i.test(raw)) {
    const parts = raw.slice(5).split('+').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) throw new ClipIdentityError('voice_id', voiceId, 'composite with no parts');
    return 'comp:' + parts.map((p) => canonicalVoiceId(p, opts)).join('+');
  }

  const hint = opts.provider ? PROVIDER_ALIASES[String(opts.provider).trim().toLowerCase()] : null;
  if (opts.provider && !hint) {
    throw new ClipIdentityError('voice_id', voiceId, `unknown provider hint ${JSON.stringify(opts.provider)}`);
  }

  const split = splitProvider(raw);
  if (split) {
    if (hint && hint !== split.provider) {
      throw new ClipIdentityError(
        'voice_id',
        voiceId,
        `id says provider ${split.provider} but caller says ${hint}`
      );
    }
    if (!split.id) throw new ClipIdentityError('voice_id', voiceId, 'provider prefix with no voice id');
    return `${split.provider}_${split.id}`;
  }

  const provider = hint || KNOWN_BARE_VOICES[raw.toLowerCase()] || inferProvider(raw);
  if (!provider) {
    throw new ClipIdentityError('voice_id', voiceId, 'no provider prefix and provider not inferable — pass opts.provider');
  }
  return `${provider}_${raw}`;
}

/** Split 'azure_en-GB-SoniaNeural' / 'comp:leo' into {provider, id}, or null. */
function splitProvider(raw) {
  const m = raw.match(/^([A-Za-z0-9]+)[_:](.*)$/);
  if (!m) return null;
  const provider = PROVIDER_ALIASES[m[1].toLowerCase()];
  if (!provider) return null;
  // 'human_spa_for_eng_target1' is one human voice id, not provider+id — keep
  // the whole thing after the prefix, which splitProvider already does.
  return { provider, id: m[2] };
}

/**
 * Infer the provider from the *shape* of an unprefixed id. Only shapes that
 * cannot be anything else: an Azure voice name is always
 * '<lang>-<REGION>-<Name>Neural'.
 */
function inferProvider(raw) {
  if (/^[a-z]{2,3}-[A-Za-z]{2,4}-[A-Za-z]+Neural$/.test(raw)) return 'azure';
  return null;
}

// ─── the identity ────────────────────────────────────────────────────────────

/**
 * Build a clip's canonical identity. Throws if any component is not
 * canonicalisable — an identity you had to guess at is worse than no identity.
 *
 * @param {object} clip
 * @param {string} clip.language
 * @param {string} clip.text      raw text (normalised here)
 * @param {string} [clip.text_normalized] use instead of text if already normalised
 * @param {string} clip.voiceId   (or clip.voice_id)
 * @param {string} [clip.provider]
 * @returns {{language: string, text_normalized: string, voice_id: string, key: string}}
 */
function clipIdentity(clip) {
  const language = canonicalLanguage(clip.language);
  const voice_id = canonicalVoiceId(clip.voiceId != null ? clip.voiceId : clip.voice_id, {
    provider: clip.provider,
  });
  const text_normalized =
    clip.text_normalized != null ? String(clip.text_normalized) : normalizeForDb(clip.text);
  if (!text_normalized) throw new ClipIdentityError('text', clip.text, 'normalises to empty');
  return {
    language,
    text_normalized,
    voice_id,
    key: [language, text_normalized, voice_id].join(SEP),
  };
}

// ─── audit helpers (never throw) ─────────────────────────────────────────────

/** @returns {string|null} canonical form, or null if it cannot be derived. */
function tryCanonicalLanguage(code) {
  try {
    return canonicalLanguage(code);
  } catch {
    return null;
  }
}

/** @returns {string|null} canonical form, or null if it cannot be derived. */
function tryCanonicalVoiceId(voiceId, opts) {
  try {
    return canonicalVoiceId(voiceId, opts);
  } catch {
    return null;
  }
}

/** True when the stored value is already exactly its own canonical form. */
function isCanonicalLanguage(code) {
  return tryCanonicalLanguage(code) === code;
}

/** True when the stored value is already exactly its own canonical form. */
function isCanonicalVoiceId(voiceId) {
  return tryCanonicalVoiceId(voiceId) === voiceId;
}

module.exports = {
  canonicalLanguage,
  canonicalVoiceId,
  clipIdentity,
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
  isCanonicalLanguage,
  isCanonicalVoiceId,
  ClipIdentityError,
  SEP,
  PROVIDERS,
  PROVIDER_ALIASES,
  KNOWN_BARE_VOICES,
  NON_VOICE_SENTINELS,
  NON_LANGUAGE_SENTINELS,
};
