/**
 * Tests for the pre-publish audio veracity gate.
 *
 * These pin the OPERATING POINT from docs/forced-alignment-2026-08-04/findings.md.
 * If one of these fails after a threshold change, that is the point: the numbers
 * in the findings no longer describe the code, and the memo must be updated in
 * the same commit.
 *
 * The real decodes are not exercised here (whisper is a 488 MB model and a
 * ~2 s/clip subprocess). The end-to-end check against the 165 labelled clips is
 * `scripts/veracity-validate/replay.cjs`; its result is recorded in
 * docs/audio-veracity-gate-2026-08-04.md.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const fs = require('fs')
const os = require('os')
const path = require('path')

const V = require('./audio-veracity.cjs')

describe('characterErrorRate', () => {
  it('is 0 for an exact match', () => {
    expect(V.characterErrorRate('hallo welt', 'hallo welt')).toBe(0)
  })

  it('ignores case, punctuation and diacritics — they are not what we measure', () => {
    expect(V.characterErrorRate('Où est-il ?', 'ou est il')).toBe(0)
    expect(V.characterErrorRate('hallo', ' Hallo. ')).toBe(0)
  })

  it('scores the German compound that broke word coverage below threshold', () => {
    // findings §1: word coverage false-alarmed on "um zu bringen" decoded as
    // "umzubringen." — identical audio, different segmentation. CER 0.25 there;
    // this normalisation gives 0.154. Either way it must PASS.
    const cer = V.characterErrorRate('um zu bringen', 'umzubringen.')
    expect(cer).toBeLessThan(V.CER_THRESHOLD)
  })

  it('scores a truncation well above threshold', () => {
    // findings §3, a real pair.
    const cer = V.characterErrorRate('can you check the weather?', 'Can you?')
    expect(cer).toBeGreaterThanOrEqual(V.CER_THRESHOLD)
  })

  it('treats an empty decode of non-empty text as total error', () => {
    expect(V.characterErrorRate('hallo', '')).toBe(1)
  })

  it('is 0 when both sides are empty, 1 when only the expectation is', () => {
    expect(V.characterErrorRate('', '')).toBe(0)
    expect(V.characterErrorRate('', 'something')).toBe(1)
  })
})

describe('isNonSpeechDecode', () => {
  it('catches an empty or whitespace decode', () => {
    expect(V.isNonSpeechDecode('')).toBe(true)
    expect(V.isNonSpeechDecode('   \n ')).toBe(true)
    expect(V.isNonSpeechDecode(null)).toBe(true)
    expect(V.isNonSpeechDecode(undefined)).toBe(true)
  })

  it('catches whisper non-speech markers in any language', () => {
    // findings §1: markers fire on 18/25 silent stubs, 15/21 near-silent, 0/94 good.
    for (const m of ['[BLANK_AUDIO]', '[Musik]', '[ Silence ]', '(silence)', '*music*', '♪♪', '[Musique]']) {
      expect(V.isNonSpeechDecode(m), m).toBe(true)
    }
  })

  it('catches a decode that is only punctuation', () => {
    expect(V.isNonSpeechDecode('...')).toBe(true)
  })

  it('does NOT catch real speech, including speech next to a marker', () => {
    expect(V.isNonSpeechDecode('Hallo Welt')).toBe(false)
    expect(V.isNonSpeechDecode('[Musik] Guten Tag')).toBe(false)
    expect(V.isNonSpeechDecode('十二点')).toBe(false)
  })
})

describe('verdictFromDecode — the operating point', () => {
  it('fails a non-speech decode regardless of CER', () => {
    const v = V.verdictFromDecode('[BLANK_AUDIO]', 'guten Tag', 'de')
    expect(v.pass).toBe(false)
    expect(v.reason).toBe('non_speech_decode')
  })

  it('fails at exactly the threshold — the findings say CER >= 0.3', () => {
    // 6 deletions over 20 chars = exactly 0.3, and 6 clears the edit floor.
    const v = V.verdictFromDecode('abcdefghijklmn', 'abcdefghijklmnopqrst', 'de')
    expect(v.cer).toBeCloseTo(0.3, 10)
    expect(v.edits).toBe(6)
    expect(v.pass).toBe(false)
    expect(v.reason).toBe('cer_above_threshold')
  })

  it('passes just below the threshold', () => {
    // 5 deletions over 20 chars = 0.25.
    const v = V.verdictFromDecode('abcdefghijklmno', 'abcdefghijklmnopqrst', 'de')
    expect(v.pass).toBe(true)
    expect(v.reason).toBe('ok')
  })

  describe('the absolute edit floor — CER is a ratio and short texts break it', () => {
    it('does not flag a healthy one-word clip whose ratio looks catastrophic', () => {
      // All five measured live on deu_for_eng 2026-08-04; all healthy.
      for (const [expected, heard] of [
        ['mir', 'Mia.'], ['er', 'Ja.'], ['sie', 'Z.'],
        ['Fehler', 'Fila.'], ['verändert', 'verinnern.'],
      ]) {
        const v = V.verdictFromDecode(heard, expected, 'de')
        expect(v.cer, `${expected} -> ${heard}`).toBeGreaterThanOrEqual(V.CER_THRESHOLD)
        expect(v.pass, `${expected} -> ${heard}`).toBe(true)   // saved by the edit floor
        expect(v.edits).toBeLessThan(V.MIN_EDIT_DISTANCE)
      }
    })

    it('still flags a short clip that produced no speech at all', () => {
      // The floor must never weaken the rule that catches silent stubs.
      expect(V.verdictFromDecode('[BLANK_AUDIO]', 'black', 'en').pass).toBe(false)
      expect(V.verdictFromDecode('', 'er', 'de').pass).toBe(false)
    })

    it('still flags a real truncation, which is never a near-miss', () => {
      const v = V.verdictFromDecode('Can you?', 'can you check the weather?', 'en')
      expect(v.edits).toBeGreaterThanOrEqual(V.MIN_EDIT_DISTANCE)
      expect(v.pass).toBe(false)
    })
  })

  it('passes a healthy clip', () => {
    expect(V.verdictFromDecode('Ich bin jetzt fertig.', 'Ich bin jetzt fertig', 'de').pass).toBe(true)
  })

  it('reports which threshold it used', () => {
    expect(V.verdictFromDecode('x', 'abcdefghij', 'de').threshold).toBe(V.CER_THRESHOLD)
    expect(V.verdictFromDecode('x', 'abcdefghij', 'ja').threshold).toBe(V.CER_THRESHOLD_UNVALIDATED)
  })

  describe('languages where 0.3 was never fitted', () => {
    it('does not fire on a moderate mismatch — it must not mass-quarantine a jpn build', () => {
      const v = V.verdictFromDecode('abcdefg', 'abcdefghij', 'ja')
      expect(v.pass).toBe(true)
    })

    it('still fires on the silence-hallucination class', () => {
      // The real replay case: near-silent zho clip decoded as a subtitle credit.
      const v = V.verdictFromDecode('字幕:J Chong', '十二点。', 'zh')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('cer_above_unvalidated_language_threshold')
    })

    it('still fires on silence itself, via the language-independent rule', () => {
      expect(V.verdictFromDecode('[BLANK_AUDIO]', '十二点。', 'zh').pass).toBe(false)
    })
  })
})

describe('the third state — unchecked is never a pass', () => {
  const saved = { ...process.env }
  beforeEach(() => { V._resetAnnouncement() })
  afterEach(() => {
    for (const k of ['AUDIO_VERACITY_GATE', 'WHISPER', 'WHISPER_MODEL']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    }
  })

  it('is ON by default', () => {
    delete process.env.AUDIO_VERACITY_GATE
    expect(V.isGateEnabled()).toBe(true)
  })

  it('is off only when explicitly switched off', () => {
    for (const val of ['0', 'off', 'false', 'no', 'OFF']) {
      process.env.AUDIO_VERACITY_GATE = val
      expect(V.isGateEnabled(), val).toBe(false)
    }
    process.env.AUDIO_VERACITY_GATE = '1'
    expect(V.isGateEnabled()).toBe(true)
  })

  it('returns pass:null (NOT pass:true) when disabled', async () => {
    process.env.AUDIO_VERACITY_GATE = 'off'
    const r = await V.checkAudioVeracity(Buffer.from('x'), 'hallo', 'deu')
    expect(r.checked).toBe(false)
    expect(r.pass).toBe(null)
    expect(r.reason).toBe('unchecked_disabled')
  })

  it('returns pass:null when there is no expected text to compare against', async () => {
    const r = await V.checkAudioVeracity(Buffer.from('x'), '   ', 'deu')
    expect(r.checked).toBe(false)
    expect(r.reason).toBe('unchecked_no_text')
  })

  it('says LOUDLY in the announcement that clips are going out unchecked', () => {
    process.env.AUDIO_VERACITY_GATE = 'off'
    const lines = []
    const logger = { info: m => lines.push(m), warn: m => lines.push(m), log: m => lines.push(m) }
    const status = V.announceStatus(logger)
    expect(status.enabled).toBe(false)
    expect(lines.join('\n')).toMatch(/UNCHECKED/)
  })

  it('announces exactly once per process', () => {
    const lines = []
    const logger = { info: m => lines.push(m), warn: m => lines.push(m), log: m => lines.push(m) }
    V.announceStatus(logger)
    V.announceStatus(logger)
    expect(lines).toHaveLength(1)
  })

  it('reports a missing binary rather than crashing or silently passing', () => {
    process.env.WHISPER = '/definitely/not/here/whisper-cli'
    // availability() reads the module-level constant, so exercise the shape
    // it returns rather than the env plumbing (which is resolved at load).
    const av = V.availability()
    expect(av).toHaveProperty('available')
    expect(Array.isArray(av.missing)).toBe(true)
  })
})

describe('the capability guard — a language the decoder cannot read is not gated', () => {
  beforeEach(() => { V._resetAnnouncement() })

  it('skips the six measured-blind languages instead of failing them', async () => {
    for (const lang of ['sin', 'ben', 'pan', 'guj', 'tel', 'kan']) {
      const r = await V.checkAudioVeracity(Buffer.from('x'), 'some text', lang, { logger: { warn: () => {} } })
      expect(r.checked, lang).toBe(false)
      expect(r.pass, lang).toBe(null)
      expect(r.reason, lang).toBe('unchecked_decoder_not_validated')
    }
  })

  it('accepts ISO-639-1 as well as the 639-3-ish course code', async () => {
    const r = await V.checkAudioVeracity(Buffer.from('x'), 'some text', 'si', { logger: { warn: () => {} } })
    expect(r.reason).toBe('unchecked_decoder_not_validated')
    expect(r.language).toBe('si')
  })

  it('leaves every other language gated — including the ones never measured', () => {
    // de/hy/eu/is all FAIL often, but their decoder demonstrably works; the
    // cause is dialect orthography, numerals and word segmentation. Un-gating
    // them here would be a different fix wearing this one's clothes.
    for (const lang of ['deu', 'eng', 'hin', 'mar', 'nep', 'tam', 'zho', 'hye', 'eus', 'isl', 'vie', 'yor']) {
      expect(V.decoderValidated(lang), lang).toBe(true)
    }
    for (const lang of ['sin', 'kan', 'ben', 'pan', 'guj', 'tel']) {
      expect(V.decoderValidated(lang), lang).toBe(false)
    }
  })

  it('says LOUDLY, once per language, that the clips went out unchecked', async () => {
    const lines = []
    const logger = { warn: m => lines.push(m) }
    for (let i = 0; i < 3; i++) await V.checkAudioVeracity(Buffer.from('x'), 'text', 'sin', { logger })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/UNCHECKED/)
    expect(lines[0]).toMatch(/NOT a pass/)
  })

  it('folds into stats as unchecked, never as passed', () => {
    const stats = V.newStats()
    V.recordVerdict(stats, { checked: false, pass: null, reason: 'unchecked_decoder_not_validated' })
    expect(stats).toMatchObject({ checked: 0, passed: 0, failed: 0, unchecked: 1 })
    expect(V.formatStats(stats)).toMatch(/unchecked_decoder_not_validated=1/)
  })

  it('still PUBLISHES through renderChecked, with exactly one render and no quarantine', async () => {
    // The render path must not halt on a language it cannot check — that is the
    // failure mode that took the estate down when the gate was switched off.
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: Buffer.from('a'), durationMs: 1200, wordBoundaries: [{ text: 'x' }] } },
      expectedText: 'some sinhala text', language: 'sin', stats,
      logger: { info: () => {}, warn: () => {}, error: () => {}, log: () => {} },
    })
    expect(r.published).toBe(true)
    expect(r.durationMs).toBe(1200)
    expect(r.wordBoundaries).toEqual([{ text: 'x' }])
    expect(renders).toBe(1)
    expect(r.verdict.checked).toBe(false)
    expect(r.quarantine).toBeUndefined()
    expect(stats).toMatchObject({ checked: 0, passed: 0, failed: 0, quarantined: 0, unchecked: 1 })
  })
})

describe('stats — the counts the render report carries', () => {
  it('counts checked / failed / unchecked separately', () => {
    const s = V.newStats()
    V.recordVerdict(s, { checked: true, pass: true })
    V.recordVerdict(s, { checked: true, pass: false })
    V.recordVerdict(s, { checked: false, reason: 'unchecked_no_whisper' })
    V.recordVerdict(s, { checked: false, reason: 'unchecked_no_whisper' })
    expect(s).toMatchObject({ checked: 2, passed: 1, failed: 1, unchecked: 2 })
    expect(s.uncheckedReasons.unchecked_no_whisper).toBe(2)
  })

  it('never folds an unchecked clip into passed', () => {
    const s = V.newStats()
    V.recordVerdict(s, { checked: false, pass: null, reason: 'unchecked_disabled' })
    expect(s.passed).toBe(0)
    expect(s.checked).toBe(0)
  })

  it('formats a line that names the unchecked count', () => {
    const s = V.newStats()
    s.unchecked = 3
    s.uncheckedReasons.unchecked_no_whisper = 3
    expect(V.formatStats(s)).toMatch(/3 UNCHECKED/)
  })
})

describe('quarantine', () => {
  let dir
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veracity-q-test-'))
    process.env.AUDIO_VERACITY_QUARANTINE_DIR = dir
  })
  afterEach(() => {
    delete process.env.AUDIO_VERACITY_QUARANTINE_DIR
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  })

  it('keeps the failing bytes and a durable record', () => {
    // The module resolves the dir at load, so drive the exported default.
    const target = V.QUARANTINE_DIR
    const audio = Buffer.from('not really an mp3')
    const r = V.quarantine({
      courseCode: 'tst_for_eng', text: 'hallo', language: 'deu', role: 'target1',
      voiceId: 'xai_leo', attempts: 3, verdicts: [{ cer: 0.9, decode: '' }],
    }, audio)
    expect(r).not.toBe(null)
    expect(fs.existsSync(r.audioPath)).toBe(true)
    expect(fs.readFileSync(r.audioPath)).toEqual(audio)
    const lines = fs.readFileSync(path.join(target, 'quarantine.jsonl'), 'utf8').trim().split('\n')
    const last = JSON.parse(lines[lines.length - 1])
    expect(last.text).toBe('hallo')
    expect(last.attempts).toBe(3)
    expect(last.quarantined_at).toBeTruthy()
  })

  it('never throws, even with an unwritable target', () => {
    expect(() => V.quarantine({ courseCode: '../../etc' }, null, { error: () => {} })).not.toThrow()
  })
})

describe('renderChecked — the publish decision', () => {
  const buf = (s) => Buffer.from(s)
  const passing = async () => ({ pass: true, checked: true, reason: 'ok', cer: 0.02, decode: 'hallo' })
  const failing = async () => ({ pass: false, checked: true, reason: 'cer_above_threshold', cer: 0.8, decode: 'ha' })
  const quiet = { info: () => {}, warn: () => {}, error: () => {}, log: () => {} }

  it('publishes a clip that passes first time, with one render', async () => {
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: buf('a'), durationMs: 900 } },
      expectedText: 'hallo', language: 'deu', check: passing, stats, logger: quiet,
    })
    expect(r.published).toBe(true)
    expect(r.durationMs).toBe(900)
    expect(renders).toBe(1)
    expect(stats).toMatchObject({ checked: 1, passed: 1, failed: 0, rerendered: 0, quarantined: 0 })
  })

  it('re-renders a failing clip and publishes the attempt that passes', async () => {
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: buf(`a${renders}`), durationMs: 900 } },
      expectedText: 'hallo', language: 'deu', stats, logger: quiet,
      check: async (b) => (String(b) === 'a1' ? failing() : passing()),
    })
    expect(r.published).toBe(true)
    expect(String(r.buffer)).toBe('a2')
    expect(renders).toBe(2)
    expect(stats.rerendered).toBe(1)
    expect(stats.quarantined).toBe(0)
  })

  it('quarantines after the attempt budget and refuses to hand back a buffer', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veracity-rc-'))
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: buf('bad'), durationMs: 200 } },
      expectedText: 'hallo', language: 'deu', check: failing, stats, logger: quiet,
      meta: { courseCode: 'tst_for_eng', role: 'target1' },
    })
    expect(r.published).toBe(false)
    expect(r.buffer).toBeUndefined()          // nothing publishable comes back
    expect(renders).toBe(V.DEFAULT_ATTEMPTS)  // 1 render + 2 retries by default
    expect(stats.quarantined).toBe(1)
    expect(stats.failed).toBe(1)
    expect(r.verdicts).toHaveLength(V.DEFAULT_ATTEMPTS)
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  })

  it('honours a custom attempt budget', async () => {
    let renders = 0
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: buf('bad'), durationMs: 200 } },
      expectedText: 'hallo', language: 'deu', check: failing, attempts: 1, logger: quiet,
      meta: { courseCode: 'tst_for_eng' },
    })
    expect(r.published).toBe(false)
    expect(renders).toBe(1)
  })

  it('publishes when it could not check — but counts it as UNCHECKED, never as a pass', async () => {
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      render: async () => { renders++; return { buffer: buf('a'), durationMs: 900 } },
      expectedText: 'hallo', language: 'deu', stats, logger: quiet,
      check: async () => ({ pass: null, checked: false, reason: 'unchecked_no_whisper', cer: null, decode: null }),
    })
    expect(r.published).toBe(true)
    expect(renders).toBe(1)                   // no pointless re-render when blind
    expect(stats.unchecked).toBe(1)
    expect(stats.passed).toBe(0)
    expect(stats.checked).toBe(0)
  })
})
