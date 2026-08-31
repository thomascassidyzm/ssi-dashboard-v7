/**
 * The rows here are TRANSCRIBED FROM THE LIVE `voices` TABLE on 2026-08-31, not
 * invented, because the whole failure being fixed was a rule that looked right
 * in the abstract and was wrong against the estate. Two of them
 * (`bedd6226`, `azure_en-GB-ThomasNeural`) broke the first version of this
 * module and would have refused 1,367 live cast sites between them.
 */
import { describe, it, expect } from 'vitest'
import personhood from './voice-personhood.cjs'

const { classify, isAboutAPerson, requiresConsent } = personhood

// ── real rows, verbatim ────────────────────────────────────────────────────
const TOM_CARTESIA = { voice_id: 'cartesia_e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac', type: 'tts', tts_engine: 'cartesia', display_name: 'Tom_002', metadata_source: 'cartesia-clone (Voice Lab)', notes: 'Cloned from the Voice Lab by thomas.cassidy+ssi@gmail.com.', consent_status: 'not_recorded' }
const TOM_XAI = { voice_id: 'gfzdpspr5fdp', type: 'tts', tts_engine: 'xai', display_name: 'Tom', metadata_source: "human-known: Tom's own voice clone (en-GB male); xAI clone id, absent from the by-id catalogue", consent_status: 'not_recorded' }
const ARAN_11L = { voice_id: 'elevenlabs_FOIN928B9X0jwgJ95cLt', type: 'tts', tts_engine: 'elevenlabs', display_name: 'English Narrator (Aran Clone - Presentation)', metadata_source: null, notes: 'English presentation voice (Aran clone) for longer narration', consent_status: 'not_recorded' }
const OLIVIA_XAI = { voice_id: 'bedd6226', type: 'tts', tts_engine: 'xai', display_name: 'Olivia', metadata_source: 'xai:GET /v1/tts/voices/{id}', notes: 'A-133 EAR VERDICT (Tom, 2026-08-17): LEAD / PRIMARY for English. He listened to the 55-clip phrase test and named this voice and his own clone (gfzdpspr5fdp) "the BEST".', consent_status: 'not_recorded' }
const DARIO_CARTESIA = { voice_id: 'cartesia_35b2cfc1-e6fb-4d69-a598-c1780612be4a', type: 'tts', tts_engine: 'cartesia', display_name: 'Darío', metadata_source: 'cartesia-catalogue (Voice Lab)', notes: '', consent_status: 'not_recorded' }
const OLLIE_AZURE = { voice_id: 'en-GB-OllieMultilingualNeural', type: 'tts', tts_engine: 'azure', display_name: 'Ollie Multilingual', metadata_source: null, consent_status: 'not_recorded' }
const PROBE_ROW = { voice_id: 'azure_en-GB-ThomasNeural', type: 'tts', tts_engine: 'azure', display_name: 'Consent probe (test)', metadata_source: 'voicelab:clone (test row, 2026-08-31)', consent_status: 'not_recorded' }
const KAI = { voice_id: 'human_kai_fin', type: 'human', tts_engine: null, display_name: 'Kai (TEST — Finnish)', metadata_source: null, consent_status: 'not_recorded' }

describe('the five clones of the two real people', () => {
  it('recognises the ones the clone flow made', () => {
    expect(classify(TOM_CARTESIA.voice_id, TOM_CARTESIA)).toBe('clone')
    expect(classify(TOM_XAI.voice_id, TOM_XAI)).toBe('clone')
  })

  it("recognises Aran's ElevenLabs clones, whose ONLY evidence is the name they were given", () => {
    // The old row test read metadata_source alone, which is null here, and
    // waved a real clone of a real person straight through.
    expect(classify(ARAN_11L.voice_id, ARAN_11L)).toBe('clone')
  })
})

describe('stock provider voices are not people', () => {
  it('leaves the vendor catalogues alone', () => {
    expect(classify(OLLIE_AZURE.voice_id, OLLIE_AZURE)).toBe('stock')
    expect(classify(DARIO_CARTESIA.voice_id, DARIO_CARTESIA)).toBe('stock')
    expect(isAboutAPerson('en-US-JennyNeural', null)).toBe(false)
    expect(isAboutAPerson('Skylar', null)).toBe(false)
  })

  it('does not make a catalogue voice into a person because a NOTE says "clone"', () => {
    // Olivia is cast in 1,367 places. A word-search over her notes refused all
    // of them.
    expect(classify(OLIVIA_XAI.voice_id, OLIVIA_XAI)).toBe('stock')
  })

  it('does not make a catalogue voice into a person because a STRAY ROW says "clone"', () => {
    // You cannot clone into Azure's namespace: this estate has no Azure clone
    // flow at all, so the row is mislabelled and the voice is still stock.
    expect(classify(PROBE_ROW.voice_id, PROBE_ROW)).toBe('stock')
  })

  it('does not make a catalogue voice into a person because a status got written on it', () => {
    // The clause that used to do exactly this is the bug being fixed: writing
    // any consent state onto a stock row made it a person for good.
    expect(classify('en-GB-OliverNeural', { ...OLLIE_AZURE, voice_id: 'en-GB-OliverNeural', consent_status: 'awaiting_authorisation' })).toBe('stock')
  })
})

describe('real people stay absolutely blocked', () => {
  it('treats a human_* id as a person with or without a row', () => {
    expect(classify('human_aran_cym_n', null)).toBe('recordist')
    expect(classify('human_sasha_wanasky_deu_at', null)).toBe('recordist')
    expect(classify(KAI.voice_id, KAI)).toBe('recordist')
  })

  it('treats a named person, or a recorded no, as a person', () => {
    expect(classify('some_voice', { voice_id: 'some_voice', type: 'tts', tts_engine: 'cartesia', consent_person: 'Aran' })).toBe('named')
    expect(classify('some_voice', { voice_id: 'some_voice', type: 'tts', tts_engine: 'cartesia', consent_status: 'refused' })).toBe('named')
    expect(classify('some_voice', { voice_id: 'some_voice', type: 'tts', tts_engine: 'cartesia', consent_status: 'withdrawn' })).toBe('named')
  })

  it('never lets a provenance rule talk a recordist into being stock', () => {
    // Rewritten 2026-08-31 with the third category. This fixture — a `human_*`
    // row carrying an AZURE ENGINE — was written to prove a catalogue rule
    // cannot make a person into stock, and it still cannot: what it is now is
    // `clone`, because a recordist row that has acquired a vendor voice is
    // something SYNTHESISING in that person's voice, not their own takes. The
    // point of the test is unchanged and stronger: never stock, always gated.
    const hybrid = { voice_id: 'human_tom_zzz', type: 'human', tts_engine: 'azure', metadata_source: 'cartesia-catalogue (Voice Lab)' }
    expect(classify('human_tom_zzz', hybrid)).not.toBe('stock')
    expect(requiresConsent('human_tom_zzz', hybrid)).toBe(true)
  })
})

/**
 * TOM'S RULING, 2026-08-31: "gate anything CLONED from a person's voice. Do NOT
 * gate a person's own recording — the recording session IS the consent."
 *
 * The rows below are the live `human_*` estate on that date: every one of the
 * 17 carries null in `tts_engine`, `provider_id` and `tts_voice_name`, because
 * a person's own recordings are files and not a voice at a provider.
 */
describe("a person's own recording is not a voice cloned from them", () => {
  const WELSH = { voice_id: 'human_welsh_target1', type: 'human', tts_engine: null, provider_id: null, tts_voice_name: null, display_name: 'Welsh Course Target 1 (Human)', human_name: 'Welsh Speaker 1', notes: 'Human recording from Welsh course JSON import', metadata_source: null, consent_status: 'not_recorded' }

  it('classifies them recordist and does NOT require consent', () => {
    for (const row of [WELSH, KAI]) {
      expect(classify(row.voice_id, row)).toBe('recordist')
      expect(requiresConsent(row.voice_id, row)).toBe(false)
      // Still a person, and a screen must still say so. Ungated is not stock.
      expect(isAboutAPerson(row.voice_id, row)).toBe(true)
    }
  })

  it('needs no row to do it — Sasha has none and still records', () => {
    expect(classify('human_sasha_wanasky_deu_at', null)).toBe('recordist')
    expect(requiresConsent('human_sasha_wanasky_deu_at', null)).toBe(false)
  })

  it('keeps every one of the five real clones gated', () => {
    for (const row of [TOM_CARTESIA, TOM_XAI, ARAN_11L]) {
      expect(requiresConsent(row.voice_id, row)).toBe(true)
    }
  })

  it('gates a clone MADE FROM a recordist, which is a row of its own', () => {
    // What services/voicelab/cartesia.cjs registerVoice() would write if a
    // recordist's takes were used as the clone sample: its own id, its own
    // provenance. It cannot inherit the source recordist's exemption because it
    // does not wear the source recordist's id.
    const fromRecordist = { voice_id: 'cartesia_9f2c1e77-0000-4000-8000-000000000000', type: 'tts', tts_engine: 'cartesia', provider_id: '9f2c1e77-0000-4000-8000-000000000000', display_name: 'Welsh Speaker 1 clone', metadata_source: 'cartesia-clone (Voice Lab)', consent_status: 'not_recorded' }
    expect(classify(fromRecordist.voice_id, fromRecordist)).toBe('clone')
    expect(requiresConsent(fromRecordist.voice_id, fromRecordist)).toBe(true)
  })

  it('gates a clone misfiled UNDER a human_* id, by provenance or by vendor voice', () => {
    const byProvenance = { voice_id: 'human_welsh_target1_clone', type: 'human', metadata_source: 'cartesia-clone (Voice Lab)', consent_status: 'not_recorded' }
    const byVendorVoice = { voice_id: 'human_welsh_target1_clone', type: 'human', tts_engine: 'cartesia', provider_id: 'aaaaaaaa-0000-4000-8000-000000000000', consent_status: 'not_recorded' }
    for (const row of [byProvenance, byVendorVoice]) {
      expect(classify(row.voice_id, row)).toBe('clone')
      expect(requiresConsent(row.voice_id, row)).toBe(true)
    }
  })

  it('does NOT gate the source recording because somebody noted a clone on it', () => {
    // The exact sentence the loose word-search would trip on, and the reason
    // recordist rows are judged by provenance and vendor identity only. A note
    // saying this audio was the SOURCE is a true fact about a recording, and
    // Tom's ruling exempts the recording.
    const source = { voice_id: 'human_welsh_target1', type: 'human', tts_engine: null, notes: 'Used as the source sample for the Welsh Speaker 1 clone (2026-09).', consent_status: 'not_recorded' }
    expect(classify(source.voice_id, source)).toBe('recordist')
    expect(requiresConsent(source.voice_id, source)).toBe(false)
  })

  it('still honours a recordist who has said no', () => {
    for (const status of ['refused', 'withdrawn']) {
      const row = { voice_id: 'human_welsh_target1', type: 'human', consent_status: status, consent_person: 'Welsh Speaker 1' }
      expect(classify(row.voice_id, row)).toBe('named')
      expect(requiresConsent(row.voice_id, row)).toBe(true)
    }
  })

  it('leaves stock exactly where it was — ungated, for the other reason', () => {
    for (const row of [OLIVIA_XAI, DARIO_CARTESIA, OLLIE_AZURE, PROBE_ROW]) {
      expect(classify(row.voice_id, row)).toBe('stock')
      expect(requiresConsent(row.voice_id, row)).toBe(false)
    }
  })
})
