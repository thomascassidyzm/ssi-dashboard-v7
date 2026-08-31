/**
 * The language cast resolver. The first test is the one that matters: with no
 * cast rows, resolution is the stored config, unchanged — that is the promise
 * that let this ship against an estate of 94 configured courses and an empty
 * voice_language_roles table.
 */
import { describe, it, expect } from 'vitest'
import pkg from './language-voice-cast.cjs'
const { applyLanguageCast, genderForRole, pickCastVoice, CAST_ROLES, isGuideRole, slotForRole } = pkg

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
    // 'absent' is a role the course does not carry at all — this fixture has no
    // instruction/encouragement block, which is itself a real shape. Neither
    // 'stored' nor 'absent' touches anything.
    expect(decisions.every((d) => d.source === 'stored' || d.source === 'absent')).toBe(true);
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


// ── THE GUIDE VOICE ─────────────────────────────────────────────────────────
//
// Tom, 2026-08-29: instructions and encouragements "are not linked to a course
// per se - they are linked to every course with the same known language,
// because these are messages to the learner". These tests hold the three things
// that could go wrong: an uncast guide must change nothing; a cast guide must
// resolve on the KNOWN language; and a cast ElevenLabs guide must keep its
// provider, or Aran quietly becomes an Azure voice on the next render.

/** A course config that carries the two guide roles, as ~94 real courses do. */
const guideConfig = () => ({
  version: '1.0',
  voices: {
    known: { name: 'Tom (clone)', voiceId: 'gfzdpspr5fdp', language: 'en', provider: 'xai', settings: { speed: 1 } },
    target1: { name: 'Eve', voiceId: 'eve', language: 'fr', provider: 'xai', settings: { speed: 1 } },
    instruction: { name: 'Aran', voiceId: 'elevenlabs_FVdzAUsp8apoOdc0907A', language: 'en', provider: 'elevenlabs', settings: { speed: 1 } },
    encouragement: { name: 'Aran', voiceId: 'elevenlabs_FVdzAUsp8apoOdc0907A', language: 'en', provider: 'elevenlabs', settings: { speed: 1 } },
  },
});

const guideVoices = [
  ...voices,
  { voice_id: 'elevenlabs_FVdzAUsp8apoOdc0907A', gender: null, tts_engine: 'elevenlabs', is_active: true, display_name: 'English Narrator (Aran Clone - Source)' },
  { voice_id: 'elevenlabs_NEW', gender: 'f', tts_engine: 'elevenlabs', is_active: true, display_name: 'A different guide' },
  { voice_id: 'elevenlabs_BACKUP', gender: 'm', tts_engine: 'elevenlabs', is_active: true, display_name: 'The backup guide' },
  { voice_id: 'elevenlabs_GONE', gender: 'm', tts_engine: 'elevenlabs', is_active: false, display_name: 'A deactivated guide' },
];

const guideRow = (language, rank, voice_id, gender = 'm') => ({ language, gender, rank, voice_id, slot: 'guide' });
const phraseRow = (language, gender, rank, voice_id) => ({ language, gender, rank, voice_id, slot: 'phrase' });

describe('the guide roles — the empty-table invariant, again and for real', () => {
  it('leaves a populated legacy config UNTOUCHED, byte for byte, with zero cast rows', () => {
    const cfg = guideConfig();
    const before = JSON.stringify(cfg);
    const { config, decisions } = applyLanguageCast({ voiceConfig: cfg, course, roles: [], voices: guideVoices });
    expect(config).toBe(cfg);                       // reference equality
    expect(JSON.stringify(config)).toBe(before);    // and byte for byte
    for (const role of ['instruction', 'encouragement']) {
      expect(decisions.find((d) => d.role === role).source).toBe('stored');
      expect(config.voices[role].voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
      expect(config.voices[role].provider).toBe('elevenlabs');
    }
  });

  it('is untouched when a PHRASE cast exists for the same languages but no guide is cast', () => {
    const cfg = guideConfig();
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices: guideVoices,
      // A full phrase cast on both the known and the target language. The
      // guide slot is empty, so the guide roles must not move.
      roles: [phraseRow('fra', 'f', 0, 'cartesia_fr-f-1'), phraseRow('eng', 'f', 0, 'cartesia_en-m-1')],
    });
    for (const role of ['instruction', 'encouragement']) {
      expect(decisions.find((d) => d.role === role).source).toBe('stored');
      expect(config.voices[role].voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
    }
  });

  it('a GUIDE cast on the TARGET language does not reach the guide roles', () => {
    // fra is the target; the guide speaks the KNOWN language, eng.
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [guideRow('fra', 0, 'elevenlabs_NEW')],
    });
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('stored');
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
  });
});

describe('the guide roles — the cast winning', () => {
  it('resolves both guide roles against the KNOWN language, not the target', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [guideRow('eng', 0, 'elevenlabs_NEW')],
    });
    for (const role of ['instruction', 'encouragement']) {
      const d = decisions.find((x) => x.role === role);
      expect(d.source).toBe('language-cast');
      expect(d.language).toBe('eng');       // the KNOWN language
      expect(d.slot).toBe('guide');
      expect(config.voices[role].voiceId).toBe('elevenlabs_NEW');
    }
  });

  it('KEEPS A CAST ELEVENLABS GUIDE ON ELEVENLABS — the failure that would make Aran an Azure voice', () => {
    const { config } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [guideRow('eng', 0, 'elevenlabs_NEW')],
    });
    // The provider travels with the voice, read from the voices row, and is
    // handed downstream as configuredProvider — which selectProvider honours at
    // rung 4. Anything else here and the ladder would demote it to Azure.
    expect(config.voices.instruction.provider).toBe('elevenlabs');
    expect(config.voices.encouragement.provider).toBe('elevenlabs');
  });

  it('ignores gender: a guide is one voice, so a female guide serves a course whose known voice is male', () => {
    const { config } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      // elevenlabs_NEW is female; the course's stored guide (Aran) is male.
      roles: [guideRow('eng', 0, 'elevenlabs_NEW', 'f')],
    });
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_NEW');
  });

  it('falls to the rank-1 guide only when the primary is deactivated', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [guideRow('eng', 0, 'elevenlabs_GONE'), guideRow('eng', 1, 'elevenlabs_BACKUP')],
    });
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_BACKUP');
    expect(decisions.find((d) => d.role === 'instruction').rank).toBe(1);
  });

  it('says nothing changed when the cast names the voice the course already stores', () => {
    const cfg = guideConfig();
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices: guideVoices,
      roles: [guideRow('eng', 0, 'elevenlabs_FVdzAUsp8apoOdc0907A')],
    });
    expect(config).toBe(cfg);
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('cast-same');
  });

  it('honours an explicit per-course override on a guide role', () => {
    const cfg = guideConfig();
    cfg.voices.instruction.overrideLanguageCast = true;
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices: guideVoices,
      roles: [guideRow('eng', 0, 'elevenlabs_NEW')],
    });
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('course-override');
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
    // …and the role NOT overridden still moves.
    expect(config.voices.encouragement.voiceId).toBe('elevenlabs_NEW');
  });
});

describe('the guide slot and the phrase slots do not leak into each other', () => {
  it('a GUIDE row never fills a phrase role, even on the same language and rank', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [guideRow('fra', 0, 'cartesia_fr-f-1', 'f')],
    });
    expect(decisions.find((d) => d.role === 'target1').source).toBe('stored');
    expect(config.voices.target1.voiceId).toBe('eve');
  });

  it('a PHRASE row never fills a guide role', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [phraseRow('eng', 'm', 0, 'elevenlabs_NEW')],
    });
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('stored');
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
  });

  it('a row with NO slot column is a phrase row — old rows must not become guides', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: guideConfig(), course, voices: guideVoices,
      roles: [row('eng', 'm', 0, 'elevenlabs_NEW')],   // no `slot` key at all
    });
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('stored');
    expect(config.voices.instruction.voiceId).toBe('elevenlabs_FVdzAUsp8apoOdc0907A');
  });

  it('names the guide roles and only the guide roles', () => {
    expect(CAST_ROLES).toContain('instruction');
    expect(CAST_ROLES).toContain('encouragement');
    expect(CAST_ROLES).not.toContain('presentation');
    expect(isGuideRole('instruction')).toBe(true);
    expect(isGuideRole('known')).toBe(false);
    expect(slotForRole('encouragement')).toBe('guide');
    expect(slotForRole('target1')).toBe('phrase');
  });
});

// ── THE TWO GAPS FOUND ON 2026-08-31 ────────────────────────────────────────
//
// The cast reader landed on 2026-08-29 and, on the estate as it actually
// stands, could not reach the thing Tom asked for. Two counts, taken from the
// live DB that day:
//
//   0 of 150 courses carry an `instruction` or `encouragement` block, and
//   56 of 150 carry no `voices` block at all.
//
// The old reader skipped an absent role and returned early on an absent block,
// so a GUIDE cast was a write nothing could read, anywhere, and a PHRASE cast
// silently missed 56 courses. Both are fixed; these tests are what keeps them
// fixed. Tom's acceptance test is the sentence they encode: cast a voice on one
// language once, and every course in that language generates with it.

describe('applyLanguageCast — reaching roles the course does not store', () => {
  it('SEEDS a guide role that the stored config has never carried', () => {
    const { config, decisions } = applyLanguageCast({
      voiceConfig: storedConfig(), course, voices,
      roles: cast({ language: 'eng', gender: 'm', rank: 0, voice_id: 'cartesia_en-m-1', slot: 'guide' }),
    });
    expect(config.voices.instruction.voiceId).toBe('cartesia_en-m-1');
    expect(config.voices.encouragement.voiceId).toBe('cartesia_en-m-1');
    expect(config.voices.instruction.provider).toBe('cartesia');
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('language-cast');
    // and it did not touch a phrase role on the way past
    expect(config.voices.target1.voiceId).toBe('eve');
  });

  it('BUILDS a config for a course that stores no voices block at all', () => {
    const { config } = applyLanguageCast({
      voiceConfig: null, course, voices,
      roles: cast(row('fra', 'f', 0, 'cartesia_fr-f-1'), row('fra', 'm', 0, 'cartesia_fr-m-1')),
    });
    expect(config.voices.target1.voiceId).toBe('cartesia_fr-f-1'); // default gender f
    expect(config.voices.target2.voiceId).toBe('cartesia_fr-m-1'); // default gender m
  });

  it('still changes NOTHING for an absent role when nothing is cast for it', () => {
    const cfg = storedConfig();
    const { config, decisions } = applyLanguageCast({
      voiceConfig: cfg, course, voices,
      roles: cast(row('spa', 'f', 0, 'cartesia_fr-f-1')),
    });
    expect(config).toBe(cfg);
    expect(decisions.find((d) => d.role === 'instruction').source).toBe('absent');
  });

  it('leaves a null config null when nothing is cast', () => {
    const { config } = applyLanguageCast({ voiceConfig: null, course, voices, roles: [] });
    expect(config).toBe(null);
  });
});
