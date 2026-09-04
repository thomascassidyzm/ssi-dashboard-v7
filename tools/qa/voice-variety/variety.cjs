/**
 * VARIETY — what variety does a voice CLAIM, and does the course claim the same?
 *
 * Tom's ruling, carried by 環 RBF on 2026-09-03:
 *
 *     THE VOICE IS A CLAIM ABOUT THE CONTENT. It asserts: this is how a speaker
 *     of THIS variety says THIS. … TARGET-SIDE AUDIO MUST BE NATIVE TO THE
 *     VARIETY THE COURSE CLAIMS TO TEACH. Known-side may be anyone, because
 *     there is nothing there to acquire.
 *
 * and, upstream of it, Tom's dialect ruling already in the code
 * (services/shared/cast-language-key.cjs): dialects are different LANGUAGES in
 * this product. So a voice tagged ar-SA on Modern Standard Arabic content, or a
 * cym_north voice on a cym_south course, is a defect on a JOIN — checkable,
 * not a taste call.
 *
 * ── WHY THE EXISTING CHECKS CANNOT SEE IT ───────────────────────────────────
 * tools/audio/voice-mismatch-census.cjs compares a clip's voice against the
 * COURSE'S OWN voice_config, so a course configured with the wrong variety is
 * consistent with itself and invisible. services/voicelab/registry.cjs compares
 * voices.languages against a language "on the two-letter base" (its own
 * comment) — which is exactly why an ar-SA voice on an `ara` course reads as a
 * match. This module compares at VARIETY granularity, which is precisely what
 * those two decline to do.
 *
 * ── THE HAND-WRITTEN PART, AND WHAT HAPPENS WHEN IT IS WRONG ────────────────
 * An Azure locale and an estate cast key are not written in the same alphabet
 * ('ar-SA' vs 'ara_sa'; 'es-MX' vs 'spa_mx'), so REGION_VARIETY and HOME_REGION
 * below are a HAND-WRITTEN SNAPSHOT of the estate as it stood on 2026-09-04 —
 * the same honesty services/shared/tts-provider-policy.cjs shows about its
 * Cartesia language list. When a pairing cannot be mapped it is reported
 * UNKNOWN, in its own bucket: never counted as a mismatch and never counted as
 * clean. A wrong entry therefore mis-files a row into a bucket a human reads,
 * and never silently clears or condemns one.
 *
 * ── THE TWO DEFAULTS CHOSEN HERE (2026-09-04), FOR TOM TO OVERRULE ──────────
 * 1. A LOCALE IS A VARIETY CLAIM ONLY WHERE SOMETHING DISTINGUISHES VARIETIES.
 *    A fi-FI voice on Finnish claims nothing controversial — Finnish has one
 *    variety on the estate and Azure publishes one locale for it. So a locale
 *    counts as a claim only when (a) the estate itself teaches two or more
 *    varieties of that base language, or (b) the provider publishes more than
 *    one locale for it. Otherwise the pairing is `no-claim` and is not counted
 *    against anybody. Without this rule, Welsh, German and Spanish rows are
 *    noise and the check gets ignored on night three.
 * 2. THE BASE LANGUAGE IS ITS OWN VARIETY, AND IT IS NOT THE HOME COUNTRY'S.
 *    `ara` on this estate means Modern Standard Arabic; MSA has no country, so
 *    EVERY regional Arabic locale is a mismatch against it. `spa`, by contrast,
 *    means European Spanish, so es-ES matches it — that is what HOME_REGION
 *    records, one line per language, deliberately explicit.
 */

'use strict';

const { tryCanonicalLanguage } = require('../../../services/shared/clip-identity.cjs');

/**
 * Locales whose region names a variety the estate has its own key for. Left
 * side is `<lang>-<region>` lowercased; right side is a cast key as
 * services/shared/cast-language-key.cjs spells it.
 */
const REGION_VARIETY = Object.freeze({
  'es-mx': 'spa_mx',
  'de-at': 'deu_at',
  'de-ch': 'deu_ch',
  'fr-ca': 'fra_ca',
  'pt-br': 'por_br',
  'ar-eg': 'ara_eg',
  'ar-sy': 'ara_sy',
  'ar-lb': 'ara_lb',
});

/**
 * The region whose locale MEANS the bare base language, per base.
 *
 * A language absent from this table has no home region, which is a statement
 * rather than an omission: `ara` is Modern Standard Arabic and no country
 * speaks it, so ar-SA, ar-AE and ar-EG are all something other than `ara`. That
 * single absence is what makes the Saudi-MSA case fire.
 */
const HOME_REGION = Object.freeze({
  spa: 'es', deu: 'de', fra: 'fr', por: 'pt', ita: 'it', nld: 'nl',
  eng: 'gb', zho: 'cn', cmn: 'cn', jpn: 'jp', kor: 'kr', rus: 'ru',
  pol: 'pl', tur: 'tr', swe: 'se', nor: 'no', dan: 'dk', fin: 'fi',
  ell: 'gr', ces: 'cz', hun: 'hu', ron: 'ro', bul: 'bg', hrv: 'hr',
  ukr: 'ua', heb: 'il', hin: 'in', ben: 'in', tam: 'in', tel: 'in',
  mar: 'in', guj: 'in', kan: 'in', pan: 'in', urd: 'pk', tha: 'th',
  vie: 'vn', ind: 'id', msa: 'my', fil: 'ph', cym: 'gb', gle: 'ie',
  gla: 'gb', bre: 'fr', eus: 'es', cat: 'es', glg: 'es', isl: 'is',
  slk: 'sk', slv: 'si', srp: 'rs', lit: 'lt', lav: 'lv', est: 'ee',
  afr: 'za', swa: 'ke', fas: 'ir', pdc: 'us', epo: null,
});

/** Pull `<lang>-<region>` out of a voice id or a tts_locale column. */
function localeOf(voice) {
  if (!voice) return null;
  const direct = String(voice.tts_locale || '').trim();
  if (direct) return normaliseLocale(direct);
  // Azure ids carry their locale: 'ar-SA-ZariyahNeural', 'azure_es-MX-…'.
  const id = String(voice.voice_id || '').trim();
  const m = id.match(/(?:^|_)([a-z]{2,3})-([A-Za-z]{2,4})(?:-|$)/);
  return m ? normaliseLocale(`${m[1]}-${m[2]}`) : null;
}

function normaliseLocale(s) {
  const m = String(s).trim().toLowerCase().replace('_', '-').match(/^([a-z]{2,3})-([a-z0-9]{2,4})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** The base language a locale belongs to, as an estate database_code. */
function baseOfLocale(locale) {
  if (!locale) return null;
  return tryCanonicalLanguage(locale.split('-')[0]);
}

/**
 * The variety a locale carries, as a cast key — or null when the locale says
 * nothing this estate can read.
 *
 * Three legs, in order: a named estate variety; the home region, which means
 * the bare base; anything else, which is a real variety the estate has no name
 * for and is spelled `<base>_<region>` so it can still be compared and read
 * ('ara_sa' — Saudi Arabic, a variety nobody here teaches).
 */
function varietyOfLocale(locale) {
  if (!locale) return null;
  const named = REGION_VARIETY[locale];
  if (named) return named;
  const [, region] = locale.split('-');
  const base = baseOfLocale(locale);
  if (!base) return null;
  if (HOME_REGION[base] === region) return base;
  return `${base}_${region}`;
}

/**
 * Does a locale on this base language say anything at all about variety?
 * Default 1 in the header: only where the estate teaches two or more varieties
 * of the base, or the provider publishes more than one locale for it.
 *
 * @param {string} base
 * @param {{estateVarieties: Map<string, Set<string>>, providerLocales: Map<string, Set<string>>}} world
 */
function localeIsAClaim(base, world) {
  if (!base) return false;
  const estate = world.estateVarieties.get(base);
  if (estate && estate.size > 1) return true;
  const published = world.providerLocales.get(base);
  return Boolean(published && published.size > 1);
}

/**
 * Can a LOCALE even express the distinction this estate makes for this base?
 *
 * Welsh is the sharp case and the reason this exists. The estate teaches
 * cym_north and cym_south as two languages, and every Welsh locale in the world
 * is cy-GB: the vendor's tag simply does not carry north-vs-south. Reading
 * cy-GB as "the bare `cym` variety" and convicting a Northern Welsh course on it
 * would be the check inventing a claim the data never made — the exact class of
 * false positive that gets a nightly ignored. So where the estate's own
 * varieties of a base appear nowhere in REGION_VARIETY, every locale on that
 * base is UNKNOWN rather than judged.
 *
 * Arabic passes this test (ar-EG, ar-SY, ar-LB are real locales and are mapped),
 * which is why the Saudi-MSA specimen still fires.
 */
function localeExpressesVarieties(base, world) {
  const estate = world.estateVarieties.get(base);
  if (!estate || estate.size < 2) return true;   // nothing to express
  const mapped = new Set(Object.values(REGION_VARIETY));
  for (const key of estate) {
    if (key !== base && mapped.has(key)) return true;
  }
  return false;
}

/** Verdict codes, so callers and tests cannot disagree about spelling. */
const VERDICT = Object.freeze({
  MATCH: 'match',
  MISMATCH: 'mismatch',
  NO_CLAIM: 'no-claim',
  UNKNOWN: 'unknown',
  NO_VOICE: 'no-voice',
  NO_KEY: 'no-cast-key',
});

/**
 * Judge one (course, role, voice) pairing on the target side.
 *
 * @param {object} args
 * @param {string} args.claimed  the course's cast key (targetCastKey)
 * @param {object} args.voice    a `voices` row, or null when nothing resolves
 * @param {object} args.world    { estateVarieties, providerLocales }
 * @returns {{verdict: string, carried: string|null, locale: string|null, why: string}}
 */
function judge({ claimed, voice, world }) {
  if (!claimed) return { verdict: VERDICT.NO_KEY, carried: null, locale: null, why: 'the course states no target language' };
  if (!voice) return { verdict: VERDICT.NO_VOICE, carried: null, locale: null, why: 'nothing resolves a voice for this role' };

  const locale = localeOf(voice);
  const base = baseOfLocale(locale) || tryCanonicalLanguage(claimed.split('_')[0]);

  if (!locale) {
    return {
      verdict: VERDICT.UNKNOWN, carried: null, locale: null,
      why: `${voice.voice_id} carries no locale — ${voice.tts_engine || 'this provider'} publishes none, so what variety it speaks cannot be read from the data`,
    };
  }
  if (!localeIsAClaim(base, world)) {
    return {
      verdict: VERDICT.NO_CLAIM, carried: null, locale,
      why: `${locale} is the only locale in play for ${base} — a vendor's single offering, not a claim about variety`,
    };
  }

  if (!localeExpressesVarieties(base, world)) {
    return {
      verdict: VERDICT.UNKNOWN, carried: null, locale,
      why: `this estate teaches ${[...(world.estateVarieties.get(base) || [])].join(' and ')}, and no locale distinguishes them — ${locale} says nothing either way`,
    };
  }

  const carried = varietyOfLocale(locale);
  if (!carried) {
    return { verdict: VERDICT.UNKNOWN, carried: null, locale, why: `${locale} maps to no language this estate knows` };
  }
  if (carried === claimed) {
    return { verdict: VERDICT.MATCH, carried, locale, why: `${locale} is ${claimed}` };
  }
  return { verdict: VERDICT.MISMATCH, carried, locale, why: `${locale} is ${carried}, the course teaches ${claimed}` };
}

/**
 * ONE VOICE, TWO VARIETIES — the collision that needs no locale at all.
 *
 * If dialects are different languages, then a single voice cast as the primary
 * for two of them is claiming to be native to both, and at most one of those
 * can be true. This is provable from the cast table alone, which matters
 * because 121 of the estate's voices are Cartesia and Cartesia publishes no
 * locale for any of them — `judge` can only say UNKNOWN about those, while this
 * can still convict.
 *
 * @param {object[]} roles voice_language_roles rows
 * @param {(key: string) => string} baseOf  cast key → base language
 * @returns {object[]} one row per (voice, base) cast across 2+ varieties
 */
function sharedAcrossVarieties(roles, baseOf) {
  const seen = new Map(); // `${voice_id}|${base}` → Set(cast keys)
  for (const r of roles) {
    if ((r.slot || 'phrase') !== 'phrase') continue; // guides are known-side
    const key = `${r.voice_id}|${baseOf(r.language)}`;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key).add(r.language);
  }
  const out = [];
  for (const [key, keys] of seen) {
    if (keys.size < 2) continue;
    const [voice_id, base] = key.split('|');
    out.push({ voice_id, base, varieties: [...keys].sort() });
  }
  return out.sort((a, b) => a.voice_id.localeCompare(b.voice_id));
}

module.exports = {
  REGION_VARIETY, HOME_REGION, VERDICT,
  localeOf, normaliseLocale, baseOfLocale, varietyOfLocale, localeIsAClaim, localeExpressesVarieties,
  judge, sharedAcrossVarieties,
};
