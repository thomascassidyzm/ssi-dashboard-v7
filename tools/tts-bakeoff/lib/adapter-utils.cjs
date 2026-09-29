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

/** The words a request bills for: what the vendor will speak. */
function spendText(req) {
  const b = req.body;
  if (typeof b === 'string') return b.replace(/<[^>]+>/g, '');   // SSML: the spoken text, not the tags
  return String(b?.text ?? b?.input ?? b?.transcript ?? JSON.stringify(b ?? ''));
}
function spendVoice(req, opts) {
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const v = b.voice_id ?? b.voice ?? b.voice_setting?.voice_id ?? opts.voice ?? null;
  return v && typeof v === 'object' ? (v.id || JSON.stringify(v)) : v;
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
  // THE SPEND GUARD (job #430): this is a paid provider call like any other, so
  // it reserves in the shared ledger first — PHASE2_SPEND_APPROVED says a human
  // approved a bake-off, not that it may run past the estate's caps.
  // LIBRARY FIRST (job #677): the guard pays nobody who has not asked the clip
  // library, so the bake-off asks too — for the utterance's language, the words
  // it will send and the vendor's voice. A take that already exists in that voice
  // is refused, exactly as doorSynthesise refuses one: a bake-off scores fresh takes.
  const { lookupForRender } = require('../../../services/shared/clip-library.cjs');
  const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('../../../services/shared/clip-identity.cjs');
  const text = spendText(req);
  const rawVoice = spendVoice(req, opts);
  const language = opts.language ? tryCanonicalLanguage(opts.language) : null;
  if (!language) throw new Error(`${adapter.displayName}: cannot name this clip (language ${opts.language || 'unknown'}) — a line the clip library cannot be asked about is never rendered`);
  const voiceId = (rawVoice && tryCanonicalVoiceId(rawVoice, { provider: adapter.id })) || rawVoice;
  const { clip, ticket } = await lookupForRender({ text, language, voiceId, voiceBound: true });
  if (clip) throw new Error(`${adapter.displayName}: "${String(text).slice(0, 40)}" is already in the clip library in this voice (${clip.course_code}) — a bake-off needs a fresh take`);
  const guard = require('../../../services/shared/tts-spend-guard.cjs').spendGuard();
  const reservation = await guard.beforeProviderCall({
    provider: adapter.id, voiceId, language, text, job: opts.job || 'tts-bakeoff', ticket,
  });
  const headers = resolveHeaders(req.headers, adapter.id);
  const payload = req.bodyKind === 'ssml' ? req.body : JSON.stringify(req.body);
  let res;
  try { res = await fetch(req.endpoint, { method: req.method, headers, body: payload }); } catch (e) {
    guard.afterProviderCall(reservation, { ok: false, error: e });
    throw e;
  }
  guard.afterProviderCall(reservation, { ok: res.ok, error: res.ok ? null : new Error(String(res.status)) });
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
 * The Cartesia/Azure synthesis path: through the one TTS door (tts-service
 * speak), never a direct HTTP call — tools/check-tts-door.cjs fails the test
 * run otherwise. Same order as httpSynthesise: credentials, spend gate, call.
 * A bake-off compares FRESH takes, so a door answer that is an existing
 * recording is refused rather than scored as though it were a new render.
 */
async function doorSynthesise(adapter, provider, config, opts) {
  assertCredentialled(adapter);
  assertSpendAllowed(adapter, opts);
  const tts = require('../../../services/tts-service.cjs');
  const out = await tts.speak(config.text, provider, config.tts);
  if (out.existingClip) {
    throw new Error(`${adapter.displayName}: "${String(config.text).slice(0, 40)}" is already a recording in this voice (${out.existingClip.course_code}) — a bake-off needs text that is not a course line`);
  }
  return { audioBuffer: out.audioBuffer, metadata: { via: 'tts-service.speak', provider } };
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
  assertSpendAllowed, httpSynthesise, doorSynthesise, shortLang, ISO3_TO_SHORT,
};
