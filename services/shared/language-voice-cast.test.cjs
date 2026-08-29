/**
 * The language cast resolver. The first test is the one that matters: with no
 * cast rows, resolution is the stored config, unchanged — that is the promise
 * that let this ship against an estate of 94 configured courses and an empty
 * voice_language_roles table.
 */
import { describe, it, expect } from 'vitest'
import pkg from './language-voice-cast.cjs'
const { applyLanguageCast, genderForRole, pickCastVoice, CAST_ROLES } = pkg

const course = { course_code: 'fra_for_eng', known_lang: 'eng', target_lang: 'fra' };

const storedConfig = () => ({
  version: '1.0',
  voices: {
    known: { name: 'Tom (clone)', voiceId: 'gfzdpspr5fdp', language: 'en', provider: 'xai', settings: { speed: 1 } },
    target1: { name: 'Eve', voiceId: 'eve', language: 'fr', provider: 'xai', settings: { speed: 1 } },
    target2: { name: 'Leo', voiceId: 'leo', language: 'fr', provider: 'xai', settings: { speed: 0.9 } },
    presentation: { name: 'Tom (clone)', voiceId: 'gfzdpspr5fdp', language: 'en', provider: 'xai', settings: { speed: 1 } },
  },
});

const voices = [
  { voice_id: 'xai_eve', gender: 'f', tts_engine: 'xai', is_active: true, display_name: 'Eve' },
  { voice_id: 'xai_leo', gender: 'm', tts_engine: 'xai', is_active: true, display_name: 'Leo' },
  { voice_id: 'gfzdpspr5fdp', gender: 'm', tts_engine: 'xai', is_active: true, display_name: 'Tom (clone)' },
  { voice_id: 'cartesia_fr-f-1', gender: 'f', tts_engine: 'cartesia', is_active: true, display_name: 'Amélie' },
  { voice_id: 'cartesia_fr-m-1', gender: 'm', tts_engine: 'cartesia', is_active: true, display_name: 'Hugo' },
  { voice_id: 'cartesia_fr-m-2', gender: 'm', tts_engine: 'cartesia', is_active: true, display_name: 'Rémi' },
  { voice_id: 'cartesia_en-m-1', gender: 'm', tts_engine: 'cartesia', is_active: true, display_name: 'Oliver' },
];

const cast = (...rows) => rows;
const row = (language, gender, rank, voice_id) => ({ language, gender, rank, voice_id });

describe('applyLanguageCast — the empty-table invariant', () => {
  it('returns the SAME config object when nothing is cast', () => {
    const cfg = storedConfig();
    const { config, decisions } = applyLanguageCast({ voiceConfig: cfg, course, roles: [], voices });
    expect(config).toBe(cfg); // reference equality: nothing was touched
    expect(decisions.every((d) => d.source === 'stored')).toBe(true);
  });

  it('is unchanged when the cast covers OTHER languages only', () => {
    const cfg = storedConfig();
    const { config } = applyLanguageCast({
      voiceConfig: cfg, course, voices,
      roles: cast(row('spa', 'f', 0, 'cartesia_fr-f-1'), row('deu', 'm', 0, 'cartesia_fr-m-1')),
    });
    expect(config).toBe(cfg);
  });
});

describe('applyLanguageCast — the cast winning', () => {
  it('replaces the target voices with the language primaries, keeping each role its gender', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: storedConfig(), course, voices,
      roles: cast(row('fra', 'f', 0, 'cartesia_fr-f-1'), row('fra', 'm', 0, 'cartesia_fr-m-1')),
    });
    // target1 is female today (Eve) so it takes the female primary; target2 male.
    expect(config.voices.target1.voiceId).toBe('cartesia_fr-f-1');
    expect(config.voices.target1.provider).toBe('cartesia');
    expect(config.voices.target2.voiceId).toBe('cartesia_fr-m-1');
    expect(decisions.find((d) => d.role === 'target1').source).toBe('language-cast');
  });

  it('leaves presentation alone — it is the course\'s own presenter', () => {
    const { config } = applyLanguageCast({
      voiceConfig: storedConfig(), course, voices,
      roles: cast(row('eng', 'm', 0, 'cartesia_en-m-1'), row('eng', 'f', 0, 'cartesia_fr-f-1')),
    });
    expect(config.voices.presentation.voiceId).toBe('gfzdpspr5fdp');
    expect(CAST_ROLES).not.toContain('presentation');
    // `known` DOES take the English cast, at the gender its stored voice has (m).
    expect(config.voices.known.voiceId).toBe('cartesia_en-m-1');
  });

  it('drops the old voice\'s speed correction, which belonged to the old voice', () => {
    const { config } = applyLanguageCast({
      voiceConfig: storedConfig(), course, voices,
      roles: cast(row('fra', 'm', 0, 'cartesia_fr-m-1')),
    });
    expect(config.voices.target2.settings.speed).toBe(1.0);
  });

  it('does not rewrite the role when the cast names the voice already stored', () => {
    const cfg = storedConfig();
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices,
      roles: cast(row('fra', 'f', 0, 'xai_eve')), // 'eve' canonicalises to xai_eve
    });
    expect(config).toBe(cfg);
    expect(decisions.find((d) => d.role === 'target1').source).toBe('cast-same');
  });
});

describe('applyLanguageCast — precedence', () => {
  it('an explicit per-role override beats the cast', () => {
    const cfg = storedConfig();
    cfg.voices.target1.overrideLanguageCast = true;
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices,
      roles: cast(row('fra', 'f', 0, 'cartesia_fr-f-1'), row('fra', 'm', 0, 'cartesia_fr-m-1')),
    });
    expect(config.voices.target1.voiceId).toBe('eve');
    expect(config.voices.target2.voiceId).toBe('cartesia_fr-m-1'); // the other role still casts
    expect(decisions.find((d) => d.role === 'target1').source).toBe('course-override');
  });

  it('a course-level override beats the cast for every role', () => {
    const cfg = storedConfig();
    cfg.overrideLanguageCast = true;
    const { config } = applyLanguageCast({
      voiceConfig: cfg, course, voices,
      roles: cast(row('fra', 'f', 0, 'cartesia_fr-f-1'), row('fra', 'm', 0, 'cartesia_fr-m-1')),
    });
    expect(config).toBe(cfg);
  });

  it('a legacy stored config is NOT an override — that is the whole point', () => {
    const { config } = applyLanguageCast({
      voiceConfig: storedConfig(), course, voices,
      roles: cast(row('fra', 'f', 0, 'cartesia_fr-f-1')),
    });
    expect(config.voices.target1.voiceId).toBe('cartesia_fr-f-1');
  });
});

describe('pickCastVoice — the backup is insurance, not a preference', () => {
  const byId = new Map(voices.map((v) => [v.voice_id, v]));
  it('prefers the primary', () => {
    const got = pickCastVoice(cast(row('fra', 'm', 0, 'cartesia_fr-m-1'), row('fra', 'm', 1, 'cartesia_fr-m-2')), byId, 'fra', 'm');
    expect(got.voice.voice_id).toBe('cartesia_fr-m-1');
  });
  it('falls to the backup when the primary is deactivated', () => {
    const b = new Map(byId);
    b.set('cartesia_fr-m-1', { ...byId.get('cartesia_fr-m-1'), is_active: false });
    const got = pickCastVoice(cast(row('fra', 'm', 0, 'cartesia_fr-m-1'), row('fra', 'm', 1, 'cartesia_fr-m-2')), b, 'fra', 'm');
    expect(got.rank).toBe(1);
  });
  it('falls to the backup when the primary voice row has gone', () => {
    const got = pickCastVoice(cast(row('fra', 'm', 0, 'vanished'), row('fra', 'm', 1, 'cartesia_fr-m-2')), byId, 'fra', 'm');
    expect(got.voice.voice_id).toBe('cartesia_fr-m-2');
  });
  it('answers nothing when every rank is unusable — the stored config then stands', () => {
    expect(pickCastVoice(cast(row('fra', 'm', 0, 'vanished')), byId, 'fra', 'm')).toBe(null);
  });
});

describe('genderForRole — the data wins over the default', () => {
  const genders = new Map([['xai_eve', 'f'], ['eve', 'f'], ['xai_leo', 'm'], ['leo', 'm']]);
  it('reads the configured voice\'s gender, through either spelling', () => {
    expect(genderForRole('target1', { voiceId: 'eve', provider: 'xai' }, genders)).toBe('f');
    expect(genderForRole('target1', { voiceId: 'xai_leo' }, genders)).toBe('m');
  });
  it('falls to the documented default only when there is no voice to read', () => {
    expect(genderForRole('target1', { voiceId: '' }, genders)).toBe('f');
    expect(genderForRole('target2', {}, genders)).toBe('m');
    expect(genderForRole('known', {}, genders)).toBe('f');
  });
});
