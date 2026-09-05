/**
 * P2 — AUDIO IDENTITY CHARACTERISATION.
 *
 * Four separate pieces of code each decide, independently, whether two audio
 * identities (a text, a language, a voice) are "the same thing":
 *   1. services/shared/text-normalize.cjs   — normalizeForAudio / normalizeForDb
 *   2. services/shared/clip-identity.cjs    — canonicalLanguage / canonicalVoiceId
 *   3. services/shared/relink-voice-guard.cjs — bareVoiceId / voicesMatch
 *   4. the DATABASE — normalize_text(), audio_bare_voice_id(), audio_voice_matches()
 *      (database/migrations/20260819_relink_must_match_voice_config.sql)
 *
 * None of these throw on disagreement. A disagreement silently links the wrong
 * clip, or fails to link one and leaves a slot silent. THIS FILE DOES NOT FIX
 * ANYTHING — it pins what each implementation currently does, and pins EVERY
 * point where two of them currently disagree, so a future change to any one of
 * them fails a test instead of failing a learner.
 *
 * Fixture set 2 (SQL cross-check) needs a live DB and is SKIPPED — not failed —
 * when DATABASE_URL cannot be reached. When it runs, its literal SQL query
 * results are asserted equal to hardcoded expectations verified live on
 * 2026-09-05 against the production Supabase project (job #591), so the
 * skipped-vs-run paths pin the same claims either way.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
const { normalizeForAudio, normalizeForDb, audioKeyCandidates } = require('./text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId, tryCanonicalVoiceId, tryCanonicalLanguage } = require('./clip-identity.cjs')
const { bareVoiceId, voicesMatch } = require('./relink-voice-guard.cjs')

// ============================================================================
// 1. TEXT NORMALIZATION — text-normalize.cjs vs its own claim to be
//    "byte-identical" to the SQL normalize_text() trigger function.
// ============================================================================

describe('normalizeForDb — pinned against normalize_text() as verified live on the production DB, 2026-09-05', () => {
  // Each pair is [input, expected]. The expected values for every row were
  // captured by running `select normalize_text($1)` against the live
  // Supabase project (aws-1-eu-west-1 pooler) on 2026-09-05, and separately
  // running normalizeForDb() locally on the same input — see the divergence
  // test below for the one row where they printed different answers.
  const AGREES_WITH_SQL = [
    ['What?!', 'what'],
    ['Hello.', 'hello'],
    ['Hi there', 'hi there'],
    ['  Bonjour!  ', 'bonjour'],
    ['¿Qué tal?', '¿qué tal'],       // leading ¿ is NOT stripped — only rtrim, never ltrim
    ['Wǒ hěn hǎo。', 'wǒ hěn hǎo'],
    ['Emin misin?', 'emin misin'],   // the case text-normalize.cjs's own header cites
    ['a.b.c...', 'a.b.c'],           // trailing dots only; internal dots survive
    ['   ', ''],
    ['', ''],
    ['newline\nend', 'newline\nend'],  // internal whitespace untouched by either side
    ['tab\tend', 'tab\tend'],
    ['Bonjour!!!', 'bonjour'],
    ['What???', 'what'],
    ['ALLCAPS TEXT.', 'allcaps text'],
    ['Über cool!', 'über cool'],
    ['trailing space ', 'trailing space'],
    [' leading space', 'leading space'],
  ]

  for (const [input, expected] of AGREES_WITH_SQL) {
    it(`normalizeForDb(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
      expect(normalizeForDb(input)).toBe(expected)
    })
  }

  // ── THE DIVERGENCE ──────────────────────────────────────────────────────
  // Postgres's bare `trim(text)` (no explicit character list) strips ONLY the
  // ASCII space character, 0x20. JS's String.prototype.trim() strips the full
  // Unicode WhiteSpace/LineTerminator class — tabs, newlines, NBSP, etc.
  // normalizeForDb() calls .trim() and therefore removes a leading/trailing
  // tab that normalize_text() leaves untouched. This contradicts the
  // "byte-identical to normalize_text()" claim in this file's own header
  // comment for any text edge-padded with a tab or newline rather than a
  // space. Verified live: `select normalize_text(E'\t Hi \t')` returned
  // '\t hi \t' (only lowercased — the tabs blocked trim from ever reaching
  // the inner spaces), while normalizeForDb('\t Hi \t') returns 'hi'.
  //
  // BLAST RADIUS: this only bites text literally edge-padded with a tab or
  // newline, which is rare in authored course content — LATENT, not
  // presently known to have mis-linked anything. Reported as a finding, not
  // fixed here.
  it('DIVERGES from the live DB on tab-padded text — normalizeForDb strips the tab, normalize_text does not', () => {
    expect(normalizeForDb('\t Hi \t')).toBe('hi')
    // The DB's actual behaviour for the same input (pinned as a literal,
    // not re-queried, so this test does not depend on DB reachability):
    const DB_NORMALIZE_TEXT_OF_SAME_INPUT = '\t hi \t'
    expect(normalizeForDb('\t Hi \t')).not.toBe(DB_NORMALIZE_TEXT_OF_SAME_INPUT)
  })
})

describe('normalizeForAudio — the pre-trigger JS convention, keeps trailing "?"', () => {
  it('keeps a trailing question mark that normalizeForDb would strip', () => {
    expect(normalizeForAudio('Emin misin?')).toBe('emin misin?')
    expect(normalizeForDb('Emin misin?')).toBe('emin misin')
  })

  it('still strips trailing . and ! and collapses internal whitespace (unlike normalizeForDb)', () => {
    expect(normalizeForAudio('Hello!!!')).toBe('hello')
    expect(normalizeForAudio('a   b')).toBe('a b')
    expect(normalizeForDb('a   b')).toBe('a   b') // normalizeForDb does NOT collapse internal whitespace
  })
})

describe('audioKeyCandidates — reaches both stored conventions', () => {
  it('returns both forms for a question, de-duplicated for a non-question', () => {
    expect(audioKeyCandidates('Emin misin?')).toEqual(
      expect.arrayContaining(['emin misin', 'emin misin?'])
    )
    expect(audioKeyCandidates('Emin misin?')).toHaveLength(2)
    expect(audioKeyCandidates('Hello.')).toEqual(['hello']) // both conventions agree -> deduped to one
  })
})

// ============================================================================
// 2. VOICE IDENTITY — clip-identity.cjs vs relink-voice-guard.cjs (and the SQL
//    twin, which is asserted to match relink-voice-guard.cjs exactly).
// ============================================================================

describe('voice identity — clip-identity.cjs recognises more provider aliases than relink-voice-guard.cjs', () => {
  // clip-identity.cjs's PROVIDER_ALIASES maps 'ms'->'azure' and 'eleven'/'11labs'
  // ->'elevenlabs'. relink-voice-guard.cjs's bareVoiceId() (and the SQL twin,
  // audio_bare_voice_id) only strip the four LITERAL prefixes xai|azure|
  // elevenlabs|google — no alias table. So a voice id spelt with an alias
  // prefix is ONE identity to clip-identity.cjs but TWO identities (a
  // mismatch) to relink-voice-guard.cjs and to the live DB function.
  const ALIAS_DIVERGENCE_PAIRS = [
    ['ms_en-GB-SoniaNeural', 'azure_en-GB-SoniaNeural'],
    ['eleven_abc', 'elevenlabs_abc'],
    ['11labs_abc', 'elevenlabs_abc'],
  ]

  for (const [a, b] of ALIAS_DIVERGENCE_PAIRS) {
    it(`${a} / ${b}: clip-identity says SAME, relink-voice-guard says DIFFERENT`, () => {
      expect(tryCanonicalVoiceId(a)).toBe(tryCanonicalVoiceId(b)) // clip-identity: converges
      expect(voicesMatch(a, b).match).toBe(false)                  // relink-voice-guard: does not
      // The SQL twin's regex is byte-identical to relink-voice-guard's
      // PROVIDER_PREFIX, verified live on 2026-09-05:
      //   select audio_bare_voice_id('ms_en-GB-SoniaNeural')  -> 'ms_en-GB-SoniaNeural' (unchanged)
      //   select audio_bare_voice_id('azure_en-GB-SoniaNeural') -> 'en-GB-SoniaNeural'
      //   select audio_voice_matches('ms_en-GB-SoniaNeural','azure_en-GB-SoniaNeural') -> false
      // i.e. the DB agrees with relink-voice-guard.cjs here, not with clip-identity.cjs.
    })
  }

  // A cartesia-prefixed id is a case clip-identity.cjs CAN canonicalise (its
  // provider list includes 'cartesia', added 2026-08-27) but relink-voice-guard
  // and the SQL twin have never been extended to strip — cartesia is simply
  // absent from PROVIDER_PREFIX. Verified live:
  //   select audio_bare_voice_id('cartesia_xyz') -> 'cartesia_xyz' (unchanged)
  //   select audio_voice_matches('cartesia_xyz','xyz') -> false
  it('cartesia_xyz / xyz: clip-identity canonicalises the prefixed form; bare "xyz" cannot be canonicalised at all; relink-voice-guard treats them as different voices', () => {
    expect(canonicalVoiceId('cartesia_xyz')).toBe('cartesia_xyz')
    expect(tryCanonicalVoiceId('xyz')).toBe(null) // no provider prefix, not azure-shaped, not a known bare voice
    expect(voicesMatch('cartesia_xyz', 'xyz').match).toBe(false)
  })

  // The one case all three DO agree on: the provider-era merge Tom ruled on
  // 2026-08-07 (bare vs xai_-prefixed is one voice). This is the case the
  // whole relink-voice-guard module exists to get right, so it is pinned
  // explicitly as the CONVERGENCE baseline, not just the divergences above.
  it('xai_eve / eve: ALL THREE implementations agree — same voice (the one case this machinery was built for)', () => {
    expect(tryCanonicalVoiceId('xai_eve')).toBe(tryCanonicalVoiceId('eve')) // clip-identity: 'xai_eve' both
    expect(voicesMatch('xai_eve', 'eve').match).toBe(true)                  // relink-voice-guard: match
    expect(voicesMatch('xai_eve', 'eve').viaAlias).toBe(true)
    // select audio_voice_matches('xai_eve','eve') -> true (verified live 2026-09-05)
  })

  it('azure_x / azure_x: identical strings agree everywhere, trivially', () => {
    expect(canonicalVoiceId('azure_x')).toBe('azure_x')
    expect(voicesMatch('azure_x', 'azure_x').match).toBe(true)
    // select audio_voice_matches('azure_x','azure_x') -> true (verified live 2026-09-05)
  })
})

describe('bareVoiceId — relink-voice-guard.cjs pinned against the four literal provider prefixes it strips', () => {
  it('strips exactly xai_, azure_, elevenlabs_, google_ — nothing else', () => {
    expect(bareVoiceId('xai_eve')).toBe('eve')
    expect(bareVoiceId('azure_en-GB-SoniaNeural')).toBe('en-GB-SoniaNeural')
    expect(bareVoiceId('elevenlabs_abc')).toBe('abc')
    expect(bareVoiceId('google_abc')).toBe('abc')
    // Not in the list — a human artist id keeps its own provider word, which
    // is deliberate (see this file's own 2026-08-25 postmortem comment): the
    // artist's own id already carries 'human_' as part of the id itself.
    expect(bareVoiceId('human_sasha_wanasky_deu_at')).toBe('human_sasha_wanasky_deu_at')
    expect(bareVoiceId('narakeet_abc')).toBe('narakeet_abc')
    expect(bareVoiceId('cartesia_abc')).toBe('cartesia_abc')
  })
})

describe('canonicalLanguage — clip-identity.cjs, the only implementation with language logic', () => {
  it('collapses ISO-639-1, ISO-639-3 and BCP-47 region variants to one database_code', () => {
    expect(canonicalLanguage('en')).toBe('eng')
    expect(canonicalLanguage('eng')).toBe('eng')
    expect(canonicalLanguage('en-GB')).toBe('eng')
    expect(canonicalLanguage('en-US')).toBe('eng')
    expect(canonicalLanguage('fr-CA')).toBe('fra')
    expect(canonicalLanguage('pt-BR')).toBe('por')
  })

  it('applies the estate override collapsing cmn/zh onto zho', () => {
    expect(canonicalLanguage('cmn')).toBe('zho')
    expect(canonicalLanguage('zh')).toBe('zho')
    expect(canonicalLanguage('zho')).toBe('zho')
  })

  it('throws on sentinels rather than guessing — "auto" is not a language', () => {
    expect(tryCanonicalLanguage('auto')).toBe(null)
    expect(tryCanonicalLanguage('unknown')).toBe(null)
    expect(tryCanonicalLanguage('')).toBe(null)
  })
})

// ============================================================================
// 3. LIVE-DB CROSS-CHECK. Confirms (rather than merely asserts from a comment)
//    that the SQL functions in 20260819_relink_must_match_voice_config.sql
//    still behave exactly as pinned above. SKIPPED (not failed) when
//    DATABASE_URL cannot be reached, per the job brief's fallback instruction.
// ============================================================================

let pgAvailable = false
let pgClient = null

beforeAll(async () => {
  try {
    require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql') })
    if (!process.env.DATABASE_URL) return
    const { Client } = require('pg')
    pgClient = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
    await pgClient.connect()
    pgAvailable = true
  } catch {
    pgAvailable = false
  }
}, 10000)

afterAll(async () => {
  if (pgClient) await pgClient.end().catch(() => {})
})

describe('live DB cross-check (skipped if DATABASE_URL unreachable)', () => {
  it('normalize_text() live matches the pinned fixtures, INCLUDING the tab divergence', async () => {
    if (!pgAvailable) return
    const r1 = await pgClient.query('select normalize_text($1) as n', ['What?!'])
    expect(r1.rows[0].n).toBe(normalizeForDb('What?!'))

    const r2 = await pgClient.query('select normalize_text($1) as n', ['\t Hi \t'])
    expect(r2.rows[0].n).toBe('\t hi \t')
    expect(r2.rows[0].n).not.toBe(normalizeForDb('\t Hi \t')) // the divergence, live
  })

  it('audio_voice_matches() live agrees with relink-voice-guard.cjs.voicesMatch, not clip-identity', async () => {
    if (!pgAvailable) return
    const cases = [
      ['ms_en-GB-SoniaNeural', 'azure_en-GB-SoniaNeural', false],
      ['xai_eve', 'eve', true],
      ['azure_x', 'azure_x', true],
      ['cartesia_xyz', 'xyz', false],
    ]
    for (const [a, b, expected] of cases) {
      const r = await pgClient.query('select audio_voice_matches($1,$2) as m', [a, b])
      expect(r.rows[0].m).toBe(expected)
      expect(r.rows[0].m).toBe(voicesMatch(a, b).match)
    }
  })
})
