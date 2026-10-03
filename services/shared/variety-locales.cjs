/**
 * VARIETY → PROVIDER LOCALE (Tom, 2026-10-03: "The issue is the voices are
 * usually named like CA"). A variety is cast as its own language, but the
 * providers do not know our variety codes — they label a regional voice by
 * locale: Cartesia by its native accent locale (fr-CA), Azure by the prefix of
 * the voice id (fr-CA-SylvieNeural). This is the one place the two meet, so
 * the casting page can offer a variety its own regional voices first.
 *
 * The keys are cast keys (services/shared/cast-language-key.cjs). A variety
 * with no entry has no provider locale to look for: Welsh north/south and the
 * Irish dialects are regions of ONE provider locale (cy-GB, ga-IE), so there
 * is nothing regional to find and the page says so rather than inventing one.
 */
'use strict';

const VARIETY_LOCALES = Object.freeze({
  fra_ca: ['fr-CA'],
  spa_mx: ['es-MX'],
  por_br: ['pt-BR'],
  deu_at: ['de-AT'],
  deu_ch: ['de-CH'],
  ara_eg: ['ar-EG'],
  ara_sy: ['ar-SY'],
  ara_lb: ['ar-LB'],
});

/** The provider locales to look for on a cast key; [] when the variety has none. */
function localesForVariety(castKey) {
  return VARIETY_LOCALES[String(castKey || '').toLowerCase()] || [];
}

/**
 * The locale a candidate voice is labelled with: the vendor's native accent
 * locale when it states one (Cartesia), else the locale prefix of an Azure id.
 * Null when the voice states none — never guessed.
 */
function localeOfCandidate(c) {
  if (!c) return null;
  if (c.accentLocale) return String(c.accentLocale);
  const m = /^([a-z]{2,3})-([A-Z]{2})-/.exec(String(c.voiceId || '').replace(/^azure_/, ''));
  return m ? `${m[1]}-${m[2]}` : null;
}

/**
 * Mark and order a variety's candidates: its regional voices first, each
 * carrying `locale` and `regional:true`. Cartesia first, Azure only for a
 * locale Cartesia has no voice for (Tom's standing preference — see CLAUDE.md,
 * a preference and not a gate, so an Azure regional voice is still listed when
 * that is all there is). Owned clones keep their lead. Order inside each group
 * is untouched.
 */
function orderForVariety(candidates, castKey) {
  const locales = localesForVariety(castKey);
  const tagged = (candidates || []).map((c) => {
    const locale = localeOfCandidate(c);
    return locale ? { ...c, locale } : c;
  });
  if (!locales.length) return tagged;
  const isRegional = (c) => locales.includes(c.locale);
  const cartesiaLocales = new Set(tagged.filter((c) => isRegional(c) && String(c.engine || c.kind).toLowerCase() === 'cartesia').map((c) => c.locale));
  const regional = tagged
    .filter((c) => isRegional(c) && !(String(c.engine || c.kind).toLowerCase() === 'azure' && cartesiaLocales.has(c.locale)))
    .map((c) => ({ ...c, regional: true }));
  const taken = new Set(regional.map((c) => c.voiceId));
  const rest = tagged.filter((c) => !taken.has(c.voiceId));
  const owned = (c) => Number(Boolean(c.owned));
  return [...regional.slice().sort((a, b) => owned(b) - owned(a)), ...rest];
}

module.exports = { VARIETY_LOCALES, localesForVariety, localeOfCandidate, orderForVariety };
