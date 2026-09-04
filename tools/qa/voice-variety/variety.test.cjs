/*
 * The two things that decide whether this check is worth running nightly: it
 * must FIRE on the known positive, and it must stay QUIET on the pairings that
 * are not making a claim. A check whose Welsh rows are noise gets ignored on
 * night three, and then it misses the real one.
 *
 * Run: npx vitest run tools/qa/voice-variety
 */
import { describe, it, expect } from 'vitest'

const { judge, varietyOfLocale, localeOf, sharedAcrossVarieties, VERDICT } = require('./variety.cjs');

const world = (estate, provider) => ({
  estateVarieties: new Map(Object.entries(estate).map(([k, v]) => [k, new Set(v)])),
  providerLocales: new Map(Object.entries(provider).map(([k, v]) => [k, new Set(v)])),
});

// The estate as it stood on 2026-09-04: four Arabics, two Welshes, one Finnish.
const ESTATE = world(
  { ara: ['ara', 'ara_eg', 'ara_sy', 'ara_lb'], cym: ['cym_north', 'cym_south'], fin: ['fin'], spa: ['spa', 'spa_mx'], nld: ['nld'] },
  { ara: ['ar-sa', 'ar-eg', 'ar-lb', 'ar-sy'], cym: ['cy-gb'], fin: ['fi-fi'], spa: ['es-es', 'es-mx'], nld: ['nl-nl'], eng: ['en-gb', 'en-us'] },
);
const azure = (id) => ({ voice_id: id, tts_engine: 'azure' });

describe('the known positive — a Saudi voice on Modern Standard Arabic', () => {
  it('fires, and names both varieties', () => {
    const v = judge({ claimed: 'ara', voice: azure('ar-SA-ZariyahNeural'), world: ESTATE });
    expect(v.verdict).toBe(VERDICT.MISMATCH);
    expect(v.carried).toBe('ara_sa');
    expect(v.locale).toBe('ar-sa');
  });

  it('fires the same way on the provider-prefixed spelling of the id', () => {
    expect(judge({ claimed: 'ara', voice: azure('azure_ar-SA-HamedNeural'), world: ESTATE }).verdict).toBe(VERDICT.MISMATCH);
  });

  it('does NOT fire on the Egyptian course, which is correctly cast', () => {
    expect(judge({ claimed: 'ara_eg', voice: azure('azure_ar-EG-SalmaNeural'), world: ESTATE }).verdict).toBe(VERDICT.MATCH);
  });
});

describe('staying quiet where nothing is being claimed', () => {
  it('a Finnish voice on Finnish claims nothing — one variety, one locale', () => {
    expect(judge({ claimed: 'fin', voice: azure('fi-FI-SelmaNeural'), world: ESTATE }).verdict).toBe(VERDICT.NO_CLAIM);
  });

  it('cy-GB on Northern Welsh is UNKNOWN, never a mismatch — no locale carries north vs south', () => {
    const v = judge({ claimed: 'cym_north', voice: azure('cy-GB-NiaNeural'), world: ESTATE });
    expect(v.verdict).toBe(VERDICT.UNKNOWN);
  });

  it('a Cartesia voice is UNKNOWN, because Cartesia publishes no locale at all', () => {
    const v = judge({ claimed: 'ara', voice: { voice_id: 'cartesia_002622d8', tts_engine: 'cartesia' }, world: ESTATE });
    expect(v.verdict).toBe(VERDICT.UNKNOWN);
    expect(v.carried).toBe(null);
  });

  it('es-ES on Spanish matches — the home region MEANS the bare base language', () => {
    expect(judge({ claimed: 'spa', voice: azure('es-ES-ElviraNeural'), world: ESTATE }).verdict).toBe(VERDICT.MATCH);
  });

  it('es-MX on European Spanish does not', () => {
    expect(judge({ claimed: 'spa', voice: azure('azure_es-MX-DaliaNeural'), world: ESTATE }).carried).toBe('spa_mx');
  });
});

describe('a voice speaking the wrong language entirely still fires', () => {
  it('an English voice on a Dutch course', () => {
    const v = judge({ claimed: 'nld', voice: azure('azure_en-GB-AdaMultilingualNeural'), world: ESTATE });
    expect(v.verdict).toBe(VERDICT.MISMATCH);
    expect(v.carried).toBe('eng');
  });
});

describe('one voice cast across two varieties — provable with no locale at all', () => {
  const baseOf = (k) => k.split('_')[0];
  it('catches one Cartesia voice standing in for four Arabics', () => {
    const rows = ['ara', 'ara_eg', 'ara_lb', 'ara_sy'].map((language) => ({ language, voice_id: 'cartesia_x', gender: 'f', rank: 0, slot: 'phrase' }));
    const out = sharedAcrossVarieties(rows, baseOf);
    expect(out).toHaveLength(1);
    expect(out[0].varieties).toEqual(['ara', 'ara_eg', 'ara_lb', 'ara_sy']);
  });

  it('does not convict a voice cast once, nor two different languages', () => {
    const rows = [
      { language: 'spa', voice_id: 'a', slot: 'phrase' },
      { language: 'fra', voice_id: 'a', slot: 'phrase' },
      { language: 'deu', voice_id: 'b', slot: 'phrase' },
    ];
    expect(sharedAcrossVarieties(rows, baseOf)).toHaveLength(0);
  });

  it('ignores the guide slot — guides are the known side, which is exempt', () => {
    const rows = [
      { language: 'ara', voice_id: 'g', slot: 'guide' },
      { language: 'ara_eg', voice_id: 'g', slot: 'guide' },
    ];
    expect(sharedAcrossVarieties(rows, baseOf)).toHaveLength(0);
  });
});

describe('reading a locale off a voice', () => {
  it('finds it in the id when the column is empty', () => {
    expect(localeOf({ voice_id: 'azure_pt-BR-FranciscaNeural' })).toBe('pt-br');
  });
  it('prefers the tts_locale column when it is set', () => {
    expect(localeOf({ voice_id: 'whatever', tts_locale: 'de_AT' })).toBe('de-at');
  });
  it('answers null for an id that carries none', () => {
    expect(localeOf({ voice_id: 'cartesia_002622d8-19d0-4567-a16a-f99c7397c062' })).toBe(null);
  });
  it('maps an unnamed region to a readable key rather than throwing it away', () => {
    expect(varietyOfLocale('ar-ae')).toBe('ara_ae');
  });
});
