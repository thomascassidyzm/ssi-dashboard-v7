/**
 * Tests for the provider ladder.
 *
 * The cases that matter are the ones where getting it wrong costs money, ships
 * a wrong voice to a learner, or silences audio that already exists:
 *   - a human-voiced course can NEVER be answered with a synthetic provider
 *   - the automatic path can NEVER yield ElevenLabs
 *   - the automatic path can NEVER yield xAI
 *   - Welsh is not covered by Cartesia
 *   - the read paths (clip identity, voice-id spelling) still know xAI
 */

import { describe, it, expect } from 'vitest';

const policy = require('./tts-provider-policy.cjs');
const { canonicalVoiceId, PROVIDER_ALIASES } = require('./clip-identity.cjs');

const {
  selectProvider,
  cartesiaCoversLanguage,
  toCartesiaLangCode,
  cartesiaVoiceCanSpeak,
  cartesiaVoiceFor,
  assertSelectableProvider,
  ProviderPolicyError,
  AUTOMATIC_LADDER,
  CARTESIA_LANGUAGE_SNAPSHOT,
} = policy;

const TOM_CLONE = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2';

describe('language coverage', () => {
  it('knows the languages Cartesia publishes, via iso3, iso1 and locale alike', () => {
    for (const l of ['spa', 'es', 'es-ES', 'eng', 'en-GB', 'zho', 'zh-CN', 'jpn', 'deu']) {
      expect(cartesiaCoversLanguage(l), l).toBe(true);
    }
  });

  it('does NOT cover Welsh — the case the whole gap-map turned on', () => {
    for (const l of ['cym', 'cy', 'cy-GB', 'cym_n', 'cym_s']) {
      expect(cartesiaCoversLanguage(l), l).toBe(false);
    }
  });

  it('does not cover the other human-voiced languages either', () => {
    expect(cartesiaCoversLanguage('bre')).toBe(false);
    expect(cartesiaCoversLanguage('pdc')).toBe(false);
  });

  it('treats an unknown or absent language as NOT covered, never as covered', () => {
    // Erring toward "not covered" costs an Azure render; erring the other way
    // is a hard failure mid-build.
    for (const l of ['', null, undefined, 'auto', 'unknown', 'xyz', 'gle', 'gla']) {
      expect(cartesiaCoversLanguage(l), String(l)).toBe(false);
    }
  });

  it('normalises language codes down to the form the vendor list is written in', () => {
    expect(toCartesiaLangCode('spa')).toBe('es');
    expect(toCartesiaLangCode('zh-CN')).toBe('zh');
    expect(toCartesiaLangCode('cym_n')).toBe('cy');
    expect(toCartesiaLangCode('auto')).toBe(null);
  });

  it('is honest in its own metadata about being an unverified snapshot', () => {
    expect(CARTESIA_LANGUAGE_SNAPSHOT.verified).toBe(false);
    expect(CARTESIA_LANGUAGE_SNAPSHOT.fetchedAt).toBeTruthy();
    // The production model is pinned to 3.6 while the list transcribed is 3.5 —
    // the mismatch is recorded rather than smoothed over.
    expect(CARTESIA_LANGUAGE_SNAPSHOT.model).not.toBe(CARTESIA_LANGUAGE_SNAPSHOT.productionModel);
  });
});

describe('rung 1 — human recording wins, and it is a stop', () => {
  const humanCourses = ['cym_n_for_eng', 'cym_s_for_eng', 'bre_for_fra', 'pdc_for_eng', 'cym_for_yor'];

  it('never answers a synthetic provider for a human-voiced course', () => {
    for (const courseCode of humanCourses) {
      expect(() => selectProvider({ courseCode, language: 'eng' }), courseCode)
        .toThrow(ProviderPolicyError);
    }
  });

  it('never answers a synthetic provider for a human-voiced LANGUAGE, even with no course code', () => {
    for (const language of ['cym', 'cym_n', 'bre', 'pdc']) {
      expect(() => selectProvider({ language }), language).toThrow(/Human-voice content/);
    }
  });

  it('cannot be talked round by an explicit provider request', () => {
    // The stop is checked FIRST, ahead of the explicit door — otherwise
    // "explicitly render Welsh on Azure" would work, and it must not.
    for (const explicitProvider of ['azure', 'cartesia', 'elevenlabs', 'xai']) {
      expect(
        () => selectProvider({ courseCode: 'cym_n_for_eng', language: 'cym', explicitProvider }),
        explicitProvider,
      ).toThrow(/Human-voice content/);
    }
  });

  it('cannot be talked round by a stored config either', () => {
    expect(() => selectProvider({
      courseCode: 'cym_s_for_eng', language: 'cym', configuredProvider: 'azure', voiceId: 'cy-GB-NiaNeural',
    })).toThrow(/Human-voice content/);
  });
});

describe('rung 2/3 — Cartesia default, Azure fallback', () => {
  it('falls to Azure for a language Cartesia does not publish', () => {
    const r = selectProvider({ courseCode: 'gle_for_eng', language: 'gle', voiceId: 'ga-IE-ColmNeural' });
    expect(r.provider).toBe('azure');
    expect(r.reason).toMatch(/does not publish/);
  });

  it('falls to Azure for a covered language when no Cartesia voice is cast for it', () => {
    // The live state of the estate as of 2026-08-28: the language list says yes,
    // the voice registry says there is nobody to say it.
    const r = selectProvider({ courseCode: 'spa_for_eng', language: 'spa', voiceId: 'es-ES-AlvaroNeural' });
    expect(r.provider).toBe('azure');
    expect(r.reason).toMatch(/no Cartesia voice is cast/);
  });

  it('chooses Cartesia once a voice IS cast for the language', () => {
    const registry = { 'uuid-es-1': { languages: ['es'], autoCast: true } };
    const r = selectProvider(
      { courseCode: 'spa_for_eng', language: 'spa', voiceId: 'es-ES-AlvaroNeural' },
      { cartesiaVoices: registry },
    );
    expect(r.provider).toBe('cartesia');
    // and it swaps the voice too — handing an Azure voice NAME to Cartesia's
    // UUID-shaped API is the failure this prevents.
    expect(r.voiceId).toBe('uuid-es-1');
  });

  it('honours a config that already names a Cartesia voice', () => {
    const r = selectProvider({
      courseCode: 'spa_for_eng', language: 'eng', role: 'known',
      configuredProvider: 'cartesia', voiceId: TOM_CLONE,
    });
    expect(r.provider).toBe('cartesia');
    expect(r.voiceId).toBe(TOM_CLONE);
  });

  it("will not point Tom's English-only clone at a target-language line", () => {
    const r = selectProvider({
      courseCode: 'spa_for_eng', language: 'spa', role: 'target1',
      configuredProvider: 'cartesia', voiceId: TOM_CLONE,
    });
    expect(r.provider).toBe('azure');
    expect(r.voiceId).toBeUndefined();
    expect(cartesiaVoiceCanSpeak(TOM_CLONE, 'spa')).toBe(false);
    expect(cartesiaVoiceCanSpeak(TOM_CLONE, 'eng')).toBe(true);
  });

  it('does not auto-cast the clone — that is a casting decision, not a routing default', () => {
    expect(cartesiaVoiceFor('eng')).toBe(null);
  });
});

describe('rung 4 — ElevenLabs is reachable only when named', () => {
  it('is never in the automatic ladder', () => {
    expect(AUTOMATIC_LADDER).not.toContain('elevenlabs');
  });

  it('is never returned by any automatic selection, across every live language', () => {
    // The money-path guarantee, swept rather than asserted on one case: no
    // combination of language and stored config reaches ElevenLabs on its own.
    const langs = [
      'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'nld', 'pol', 'rus', 'swe', 'dan',
      'nor', 'tur', 'bul', 'ron', 'ces', 'ell', 'hrv', 'hun', 'ukr', 'ara', 'heb',
      'zho', 'jpn', 'kor', 'tha', 'hin', 'ben', 'gle', 'gla', 'glv', 'cor', 'eus',
      'cat', 'fin', 'est', 'lav', 'lit', 'mkd', 'sme', 'yor', 'kan', 'sin', 'xyz',
      'auto', '',
    ];
    const configs = [null, 'azure', 'cartesia', 'xai', undefined];
    for (const language of langs) {
      for (const configuredProvider of configs) {
        const r = selectProvider({ courseCode: 'x_for_eng', language, configuredProvider, voiceId: 'v' });
        expect(r.provider, `${language}/${configuredProvider}`).not.toBe('elevenlabs');
        expect(r.provider, `${language}/${configuredProvider}`).not.toBe('xai');
      }
    }
  });

  it('is honoured when a caller explicitly asks for it', () => {
    const r = selectProvider({ language: 'eng', explicitProvider: 'elevenlabs', voiceId: 'EL1' });
    expect(r.provider).toBe('elevenlabs');
    expect(r.rung).toBe(4);
  });

  it('is honoured when a stored config names it — a deliberate choice, not a fallback', () => {
    const r = selectProvider({ language: 'eng', configuredProvider: 'elevenlabs', voiceId: 'EL1' });
    expect(r.provider).toBe('elevenlabs');
    expect(r.reason).toMatch(/deliberate choice/);
  });

  it('does NOT promote to ElevenLabs when neither Cartesia nor Azure looks like a fit', () => {
    // The forbidden chain, stated as a test: an unknown language yields Azure,
    // and the honest gap, never a quiet spend.
    const r = selectProvider({ language: 'zzz', voiceId: 'v' });
    expect(r.provider).toBe('azure');
  });
});

describe('rung 5 — xAI is retired from SELECTION only', () => {
  it('is never returned automatically, even when the stored config says xai', () => {
    const r = selectProvider({ courseCode: 'fra_for_eng', language: 'fra', configuredProvider: 'xai', voiceId: 'eve' });
    expect(r.provider).toBe('azure');
    // The xAI voice id is dropped with it — an xAI preset name is not an Azure
    // voice, so carrying it forward would swap the provider and keep the wrong voice.
    expect(r.voiceId).toBeUndefined();
    expect(r.reason).toMatch(/retired/);
  });

  it('throws loudly rather than silently substituting when asked for explicitly', () => {
    expect(() => selectProvider({ language: 'fra', explicitProvider: 'xai' }))
      .toThrow(/retired/);
  });

  it('assertSelectableProvider catches a retired provider that slipped past', () => {
    expect(() => assertSelectableProvider('xai', 'phase8')).toThrow(/Retired provider/);
    expect(assertSelectableProvider('azure')).toBe('azure');
    expect(assertSelectableProvider('cartesia')).toBe('cartesia');
    expect(assertSelectableProvider('elevenlabs')).toBe('elevenlabs');
  });

  // ── THE READ PATHS. Retirement must not touch any of these. ──────────────
  it('clip identity still knows xai — hundreds of thousands of clips depend on it', () => {
    expect(PROVIDER_ALIASES.xai).toBe('xai');
    expect(canonicalVoiceId('xai_eve')).toBe('xai_eve');
    expect(canonicalVoiceId('eve', { provider: 'xai' })).toBe('xai_eve');
    // Both spellings are ONE voice, and a canonicaliser that lost that
    // under-counts the estate by about 14%.
    expect(canonicalVoiceId('eve', { provider: 'xai' })).toBe(canonicalVoiceId('xai_eve'));
  });

  it('a historic xAI clip id still resolves after the retirement', () => {
    expect(canonicalVoiceId('xai_gfzdpspr5fdp')).toBe('xai_gfzdpspr5fdp');
    expect(canonicalVoiceId('xai_025a38c5')).toBe('xai_025a38c5');
  });
});
