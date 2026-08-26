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
 * The single loud failure an unkeyed adapter raises from synthesise().
 * Phase 1 spends zero, so this is the expected end of the road for
 * Cartesia / MiniMax / OpenAI on this box.
 *
 * Only ever thrown when something is ACTUALLY missing — see assertCredentialled.
 * An adapter that threw this unconditionally would start lying the moment Tom
 * added the key, which is exactly the handover moment we cannot afford to fumble.
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

/** Throw the no-credential error only if a required env var is genuinely absent. */
function assertCredentialled(adapter) {
  if (missingEnv(adapter).length) throw noCredentialError(adapter);
}

/**
 * The one HTTP synthesis path, shared by every vendor adapter.
 *
 * Order matters and is the same everywhere:
 *   1. credentials — "no key" is the honest message when there is no key
 *   2. the spend gate — refuses in phase 1 even under --live
 *   3. the call
 * Skipping (2) because (1) usually fires first is how a stubbed adapter turns
 * into an unguarded spender the day its key arrives.
 */
async function httpSynthesise(adapter, req, opts) {
  assertCredentialled(adapter);
  assertSpendAllowed(adapter, opts);
  const headers = resolveHeaders(req.headers, adapter.id);
  const payload = req.bodyKind === 'ssml' ? req.body : JSON.stringify(req.body);
  const res = await fetch(req.endpoint, { method: req.method, headers, body: payload });
  if (!res.ok) throw new Error(`${adapter.displayName} ${res.status}: ${await res.text()}`);

  const meta = { http_status: res.status, content_type: res.headers.get('content-type') };

  if (req.responseKind === 'json-hex-audio') {
    // MiniMax does not return bytes: it returns JSON with the audio hex-encoded.
    // Hashing the envelope instead of the audio would silently corrupt axis E.
    const json = await res.json();
    const hex = req.responseAudioPath.split('.').reduce((o, k) => (o == null ? o : o[k]), json);
    if (!hex) throw new Error(`${adapter.displayName}: no audio at ${req.responseAudioPath} — got ${JSON.stringify(json).slice(0, 300)}`);
    meta.envelope = { ...json, data: undefined };
    return { audioBuffer: Buffer.from(hex, 'hex'), metadata: meta };
  }

  return { audioBuffer: Buffer.from(await res.arrayBuffer()), metadata: meta };
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
  envRef, resolveHeaders, missingEnv, noCredentialError, assertCredentialled,
  assertSpendAllowed, httpSynthesise, shortLang, ISO3_TO_SHORT,
};
