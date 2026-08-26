/**
 * Shared helpers for bake-off adapters.
 *
 * The one rule that matters here: a built request is a REVIEWABLE ARTEFACT that
 * gets written to disk as metadata. It must therefore never contain a real
 * credential. buildRequest() puts an env REFERENCE in the header slot; only
 * synthesise() resolves it, at call time, and never writes the resolved value
 * anywhere.
 */

/** A placeholder that stands in for a secret inside a serialisable request. */
function envRef(name) {
  return `\${env:${name}}`;
}

/** Resolve any ${env:NAME} references in a headers object. Throws if missing. */
function resolveHeaders(headers, providerId) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    out[k] = String(v).replace(/\$\{env:([A-Z0-9_]+)\}/g, (_m, name) => {
      const val = process.env[name];
      if (!val) {
        throw new Error(
          `no credential: phase 2 blocker — ${providerId} needs ${name}, which is not set in this environment`
        );
      }
      return val;
    });
  }
  return out;
}

/** Every env var in requiredEnv that is missing from the environment. */
function missingEnv(adapter) {
  return (adapter.requiredEnv || []).filter((name) => !process.env[name]);
}

/**
 * The single loud failure every unkeyed adapter raises from synthesise().
 * Phase 1 spends zero, so this is the expected end of the road for
 * Cartesia / MiniMax / OpenAI on this box.
 */
function noCredentialError(adapter) {
  const missing = missingEnv(adapter);
  const err = new Error(
    `no credential: phase 2 blocker — ${adapter.displayName} cannot be called: ` +
      `${missing.join(', ')} not set. Phase 1 spends zero; request shape is still ` +
      `reviewable via --dry-run. Do not work around this by spending.`
  );
  err.code = 'NO_CREDENTIAL';
  err.provider = adapter.id;
  err.missingEnv = missing;
  return err;
}

/**
 * Every adapter refuses to spend in phase 1. This is the belt to the --live
 * flag's braces: even --live hits this unless PHASE2_SPEND_APPROVED=1 is
 * exported by a human who has read the approval gate in CLAUDE.md.
 */
function assertSpendAllowed(adapter, opts) {
  if (!opts.live) {
    throw new Error(`${adapter.id}: synthesise() called without --live (internal error)`);
  }
  if (process.env.PHASE2_SPEND_APPROVED !== '1') {
    const err = new Error(
      `SPEND GATE — ${adapter.displayName} live synthesis is blocked. Phase 1 of the ` +
        `bake-off spends zero. Set PHASE2_SPEND_APPROVED=1 only after Tom has approved ` +
        `a costed plan (CLAUDE.md approval gates: "Never generate TTS audio without approval").`
    );
    err.code = 'SPEND_GATE';
    throw err;
  }
}

/** ISO-639-3 (our estate's codes) -> the BCP-47-ish tags vendors want. */
const ISO3_TO_SHORT = {
  cym: 'cy', eng: 'en', deu: 'de', fra: 'fr', ita: 'it', spa: 'es', por: 'pt',
  nld: 'nl', pol: 'pl', rus: 'ru', jpn: 'ja', kor: 'ko', zho: 'zh', yue: 'yue',
  fin: 'fi', swe: 'sv', dan: 'da', nor: 'no', ces: 'cs', ell: 'el', tur: 'tr',
  ara: 'ar', heb: 'he', hin: 'hi', ben: 'bn', tha: 'th', ukr: 'uk', hun: 'hu',
  ron: 'ro', bul: 'bg', hrv: 'hr', cat: 'ca', eus: 'eu', gle: 'ga', gla: 'gd',
  bre: 'br', cor: 'kw', glg: 'gl', isl: 'is', est: 'et', lav: 'lv', lit: 'lt',
  mlt: 'mt', srp: 'sr', mkd: 'mk', slk: 'sk', afr: 'af', swa: 'sw', yor: 'yo',
  ind: 'id', fas: 'fa', mar: 'mr', tel: 'te', kan: 'kn', nep: 'ne', hye: 'hy',
  yid: 'yi', sme: 'se', pdc: 'pdc',
};

function shortLang(iso3) {
  return ISO3_TO_SHORT[iso3] || iso3;
}

module.exports = {
  envRef, resolveHeaders, missingEnv, noCredentialError, assertSpendAllowed,
  shortLang, ISO3_TO_SHORT,
};
