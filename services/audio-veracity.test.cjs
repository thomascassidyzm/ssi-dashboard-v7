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

describe('Rule 3 — the last word of the script must have been SPOKEN', () => {
  // The defect this rule was built for, in Tom's words (2026-08-07): "the final
  // word is wholly missing and the clip ends in a gap". Rules 1 and 2 are blind
  // to it — the clip is full of speech and one short word is a handful of edits.
  describe('a dropped final word is still caught — this is the whole point', () => {
    it('catches the case that motivated the rule', () => {
      // Rule 2 happens to reach this particular one first — losing "French" is
      // 7 edits on a 22-character script, over both the floor and the threshold.
      // It is the SHORTER drops below that Rule 2 misses and Rule 3 exists for.
      const v = V.verdictFromDecode('I want to speak', 'I want to speak French', 'en')
      expect(v.pass).toBe(false)
    })

    it('catches drops that Rule 2 waves through as small', () => {
      for (const [expected, heard] of [
        ['ce que tu as dit hier', 'ce que tu as dit.'],
        ['nous devons travailler dur', 'Nous devons travailler.'],
        ['je vois ces choses différemment maintenant', 'Je vois ces choses différemment.'],
        ['il ne connaissait pas ça', 'il ne connaissait pas.'],
      ]) {
        const v = V.verdictFromDecode(heard, expected, 'fr')
        expect(v.pass, `${expected} -> ${heard}`).toBe(false)
        expect(v.reason, `${expected} -> ${heard}`).toBe('last_word_missing')
        expect(v.cer, `${expected} -> ${heard}`).toBeLessThan(V.CER_THRESHOLD)
      }
    })

    it('convicts on a tie — a word truncated MID-WAY is the defect, not a variant', () => {
      // "Je suis sur..." is whisper reporting that the audio stopped inside the
      // final word. Whole and headless fit equally well; the rule stays suspicious.
      const v = V.verdictFromDecode('Je suis sur...', 'je suis surpris', 'fr')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('last_word_missing')
    })
  })

  describe('transcription variance is not a missing word (the 2026-08-13 precision fix)', () => {
    // All four were hand-checked against live S3 bytes by the 2026-08-12 render
    // audit and found to be healthy audio. Every one of them used to fail here.
    it('passes the four clips the audit proved healthy', () => {
      for (const [expected, heard, iso] of [
        ['it is okay', 'It is OK.', 'en'],          // orthography, not a fault
        ['come se', 'Come si?', 'it'],
        ['più di', 'PUD', 'it'],                     // 9/9 fresh renders failed identically
        ['più di', 'Pewdie!', 'it'],
      ]) {
        const v = V.verdictFromDecode(heard, expected, iso)
        expect(v.pass, `${expected} -> ${heard}`).toBe(true)
        expect(v.reason, `${expected} -> ${heard}`).toBe('ok')
      }
    })

    it('passes re-segmentation and homophone spellings', () => {
      for (const [expected, heard] of [
        ['why are you not happy any more', 'Why are you not happy anymore?'],
        ['you like to', 'You like too.'],
        ["it's difficult to", "It's difficult, too."],
      ]) {
        const v = V.verdictFromDecode(heard, expected, 'en')
        expect(v.pass, `${expected} -> ${heard}`).toBe(true)
      }
    })

    it('marks HOW a rescued pass was granted, so the class stays countable', () => {
      expect(V.verdictFromDecode('It is OK.', 'it is okay', 'en').lastWordVia).toBe('not_truncated')
      expect(V.verdictFromDecode('PUD', 'più di', 'it').lastWordVia).toBe('decode_does_not_track_script')
    })

    it('leaves an ordinary pass unmarked — Test 1 heard the word plainly', () => {
      expect(V.verdictFromDecode('Ich bin jetzt fertig.', 'Ich bin jetzt fertig', 'de').lastWordVia).toBeUndefined()
    })
  })

  describe('abstention — the rule says nothing when it cannot see the final slot', () => {
    it('does not convict when the decode is not recognisably this script', () => {
      // Two-word fragment whisper simply failed to hear. There is no "final slot"
      // to reason about; whole-string wrongness is Rule 2's job, not Rule 3's.
      const v = V.verdictFromDecode('Oscar.', 'ask her', 'en')
      expect(v.reason).not.toBe('last_word_missing')
    })

    it('hands such a clip to Rule 2, which still fails it when it is bad enough', () => {
      const v = V.verdictFromDecode('completely different words here', 'ask her', 'en')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('cer_above_threshold')
    })
  })

  it('never opines on a single-word script — Rule 1 already owns that case', () => {
    expect(V.verdictFromDecode('Mia.', 'mir', 'de').reason).not.toBe('last_word_missing')
    expect(V.verdictFromDecode('', 'mir', 'de').reason).toBe('non_speech_decode')
  })
})

describe('Rule 4 — numerals: how a number is SPELT is not whether it was SAID', () => {
  // The 2026-08-13 pod-0 English render quarantined 35 clips and every one of
  // them was this: whisper writes "£48" where the script writes "forty-eight
  // pounds". The transcripts below are the real ones from that run
  // (tools/eng-distinct-render/quarantined.json).

  describe('the transcription variants that quarantined 35 healthy clips', () => {
    const REAL = [
      ["Here we are. That's twelve pound fifty.", "Here we are. That's £12.50."],
      ["That's forty-eight pounds altogether.", "That's £48 altogether."],
      ["Here we are. That's a hundred and fifty pounds.", "Here we are. That's £150."],
      ["Lovely. The room is on the third floor, room seven hundred and nine.", 'Lovely. The room is on the third floor, room 709.'],
      ["Lovely. The room is on the third floor, room seven zero nine.", 'Lovely, the room is on the third floor, Room 709.'],
      ["Here we are. That's twelve thousand and five hundred króna.", "Here we are. That's 12,500 kroner."],
      ["Here we are. That's one thousand two hundred and fifty baht.", "Here we are, that's 1,250 baht."],
      ["That's eleven hundred yen altogether.", "That's 1,100 yen altogether."],
      ["Here we are. That's fourteen hundred rupees.", "Here we are. That's 1,400 rupees."],
      ["That's nine thousand won altogether.", "That's 9001, altogether."],
      ["Here we are. That's twelve złoty fifty groszy.", "Here we are, that's 12's Wattie 50 Grushy."],
      ["Here we are. That's fifteen leva.", "Here we are, that's 15 lever."],
    ]
    for (const [script, heard] of REAL) {
      it(`passes ${JSON.stringify(script.slice(0, 42))} heard as ${JSON.stringify(heard)}`, () => {
        expect(V.verdictFromDecode(heard, script, 'en').pass).toBe(true)
      })
    }
  })

  describe('a number that is genuinely WRONG is still caught', () => {
    it('convicts a substituted number that canonicalisation would otherwise hide', () => {
      // Once "£150" reads as "one hundred and fifty", this is three characters
      // from the script — far under MIN_EDIT_DISTANCE. Rule 2 cannot see it.
      const v = V.verdictFromDecode("That's 150 pesos altogether.", "That's two hundred and fifty pesos altogether.", 'en')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('numeral_mismatch')
      expect(v.numerals).toEqual({ expected: '250', heard: '150' })
    })

    it('convicts a wrong number even when whisper spells it out too', () => {
      const v = V.verdictFromDecode("That's eight pound fourteen altogether.", "That's eight pound forty altogether.", 'en')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('numeral_mismatch')
    })

    it('convicts a dropped digit — 709 read as 79', () => {
      const v = V.verdictFromDecode('Lovely. The room is on the third floor, room 79.',
        'Lovely. The room is on the third floor, room seven hundred and nine.', 'en')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('numeral_mismatch')
    })

    it('convicts a wrong price where only the pence differ', () => {
      expect(V.verdictFromDecode("Here we are. That's £12.15.", "Here we are. That's twelve pound fifty.", 'en').pass).toBe(false)
    })

    it('convicts an order-of-magnitude error', () => {
      expect(V.verdictFromDecode("Here we are, that's 50,000 won.", "Here we are. That's fifteen thousand won.", 'en').pass).toBe(false)
    })
  })

  describe('a number that is missing altogether', () => {
    it('is Rule 2\'s conviction, not Rule 4\'s — the spelt-out words are simply gone', () => {
      const v = V.verdictFromDecode("That's pesos altogether.", "That's two hundred and fifty pesos altogether.", 'en')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('cer_above_threshold')
    })

    it('abstains rather than convicting "one moment" heard as "a moment"', () => {
      // The script's "one" is not a quantity. Convicting here would be a new
      // false-alarm class, and Rule 2 already scores this pair as healthy.
      expect(V.verdictFromDecode('A moment, please.', 'one moment please', 'en').pass).toBe(true)
    })
  })

  describe('the readings themselves', () => {
    it('reads a number the British way, "and" included', () => {
      expect(V.numberToWords(709)).toBe('seven hundred and nine')
      expect(V.numberToWords(12500)).toBe('twelve thousand five hundred')
      expect(V.numberToWords(9001)).toBe('nine thousand and one')
      expect(V.numberToWords(48)).toBe('forty eight')
    })

    it('parses spelt-out numbers back, whichever way they were grouped', () => {
      expect(V.cardinalsOf('a hundred and fifty')).toEqual([150])
      expect(V.cardinalsOf('one thousand two hundred and fifty')).toEqual([1250])
      expect(V.cardinalsOf('twelve hundred and fifty')).toEqual([1250])
      expect(V.cardinalsOf('nine thousand and one')).toEqual([9001])
      // A price is two numbers, not their sum: "twelve fifty" is 12·50, not 62.
      expect(V.cardinalsOf('twelve pound fifty')).toEqual([12, 50])
      expect(V.cardinalsOf('seven zero nine')).toEqual([7, 0, 9])
      expect(V.cardinalsOf('no numbers here')).toEqual([])
    })

    it('offers the digit-by-digit reading a room number is actually spoken with', () => {
      expect(V.numeralReadings('709')).toContain('seven hundred and nine')
      expect(V.numeralReadings('709')).toContain('seven zero nine')
      expect(V.numeralReadings('1250')).toContain('twelve hundred and fifty')
      expect(V.numeralReadings('£12.50')).toContain('twelve pounds fifty')
    })

    it('leaves a text with no digits exactly as it was — this change is a no-op there', () => {
      // Why the 5,341 remembered decodes re-judge identically: with no numeral
      // token there is one candidate reading and it is the plain normalisation.
      expect(V.numeralVariants('je suis surpris')).toEqual(['je suis surpris'])
    })
  })

  describe('the rules underneath still see the canonicalised text', () => {
    it('does not report a dropped final word when the word is written as a symbol', () => {
      // "£150" carries "pounds"; before the fix Rule 3 called it missing.
      expect(V.verdictFromDecode("Here we are. That's £150.", "Here we are. That's a hundred and fifty pounds.", 'en').reason).toBe('ok')
    })

    it('still catches a dropped final word in a sentence that contains a number', () => {
      const v = V.verdictFromDecode("Here we are. That's 150", "Here we are. That's a hundred and fifty pounds sterling", 'en')
      expect(v.pass).toBe(false)
    })

    it('still fails a silent clip whose script is a number', () => {
      expect(V.verdictFromDecode('[BLANK_AUDIO]', "That's forty-eight pounds altogether.", 'en').reason).toBe('non_speech_decode')
    })
  })
})

// ---------------------------------------------------------------------------
// The three A-136 gate artefacts (2026-08-17 nld pod recast), generalised
// ---------------------------------------------------------------------------

describe('synthesis cues are direction, not speech', () => {
  it('strips the cue and leaves everything else alone', () => {
    expect(V.stripSynthesisCues('Ja, [pause] natuurlijk.')).toBe('Ja, natuurlijk.')
    expect(V.stripSynthesisCues('Wacht <break time="400ms"/> even.')).toBe('Wacht even.')
    expect(V.stripSynthesisCues('gewoon een zin')).toBe('gewoon een zin')
  })

  it('does NOT strip bracketed words that are actually spoken', () => {
    // 18,851 estate clips read "[atom] 17" aloud as "atom seventeen", and the
    // English prompts say "he wanted [someone] to". A bracket rule would blind
    // the gate to a dropped word in every one of them.
    expect(V.stripSynthesisCues('[atom] 17')).toBe('[atom] 17')
    expect(V.stripSynthesisCues("'he wanted [someone] to'")).toBe("'he wanted [someone] to'")
  })

  it('passes the clip A-136 was refusing — the cue was the whole error', () => {
    // CER 0.32 against a 0.25 job gate, for audio that says exactly the right
    // words. 16 of the 29 burnt clips were this and nothing else.
    const v = V.verdictFromDecode('Ja, natuurlijk.', 'Ja, [pause] natuurlijk.', 'nl')
    expect(v.pass).toBe(true)
    expect(v.cer).toBe(0)
  })

  it('still convicts a clip that dropped real words around the cue', () => {
    const v = V.verdictFromDecode('Buongiorno.',
      'Buongiorno. [pause] Non mi sento, [pause] molto bene — può consigliarmi qualcosa?', 'it')
    expect(v.pass).toBe(false)
  })

  it('a line of nothing but cues is UNCHECKED, never a pass', async () => {
    const r = await V.checkAudioVeracity(Buffer.from('x'), '[pause] [pause]', 'nld')
    expect(r.checked).toBe(false)
    expect(r.pass).toBeNull()
    expect(r.reason).toBe('unchecked_no_text')
  })
})

describe('numerals in the language the clip is actually in', () => {
  // Every spelling below is the standard reading in that language; if one of
  // these changes, the lexicon has drifted and the readings it offers are wrong.
  const SPELLINGS = {
    nl: [[1, 'een'], [21, 'eenentwintig'], [79, 'negenenzeventig'], [100, 'honderd'], [709, 'zevenhonderdnegen'], [2000, 'tweeduizend']],
    de: [[1, 'eins'], [21, 'einundzwanzig'], [30, 'dreißig'], [100, 'einhundert'], [709, 'siebenhundertneun'], [2021, 'zweitausendeinundzwanzig']],
    fr: [[21, 'vingt et un'], [70, 'soixante-dix'], [71, 'soixante et onze'], [80, 'quatre-vingts'], [81, 'quatre-vingt-un'], [91, 'quatre-vingt-onze'], [200, 'deux cents'], [709, 'sept cent neuf']],
    es: [[16, 'dieciséis'], [21, 'veintiuno'], [31, 'treinta y uno'], [100, 'cien'], [101, 'ciento uno'], [500, 'quinientos'], [709, 'setecientos nueve']],
    pt: [[21, 'vinte e um'], [100, 'cem'], [101, 'cento e um'], [500, 'quinhentos'], [709, 'setecentos e nove']],
    it: [[21, 'ventuno'], [23, 'ventitré'], [28, 'ventotto'], [100, 'cento'], [709, 'settecentonove'], [2000, 'duemila']],
  }
  for (const [iso, list] of Object.entries(SPELLINGS)) {
    for (const [n, want] of list) {
      it(`${iso}: ${n} reads as "${want}"`, () => {
        expect(V.lexNumberToWords(n, V.lexiconFor(iso))).toBe(want)
      })
    }
  }

  it('passes the A-136 clip — "kamer 709" IS "kamer zevenhonderd negen"', () => {
    // CER 0.257 against a 0.25 gate before this: a full re-render burnt on the
    // transcriber's notation.
    const v = V.verdictFromDecode('kamer 709', 'kamer zevenhonderd negen', 'nl')
    expect(v.pass).toBe(true)
    expect(v.cer).toBeLessThan(0.1)
  })

  const SAME_UTTERANCE = [
    ['de', 'Zimmer siebenhundertneun', 'Zimmer 709'],
    ['es', 'la habitación setecientos nueve', 'la habitación 709'],
    ['fr', 'chambre sept cent neuf', 'chambre 709'],
    ['pt', 'o quarto setecentos e nove', 'o quarto 709'],
    ['it', 'la camera settecentonove', 'la camera 709'],
    ['nl', 'dat is twaalf vijftig', 'dat is 12,50'],
  ]
  for (const [iso, script, heard] of SAME_UTTERANCE) {
    it(`${iso}: ${JSON.stringify(script)} heard as ${JSON.stringify(heard)}`, () => {
      expect(V.verdictFromDecode(heard, script, iso).pass).toBe(true)
    })
  }

  describe('a wrong number is still wrong — Rule 4b keeps the teeth', () => {
    it('convicts a substituted number the lexicon would otherwise align away', () => {
      // "achthonderd negen" is five edits from "zevenhonderd negen" — under
      // MIN_EDIT_DISTANCE, so Rule 2 cannot see it once the digits canonicalise.
      const v = V.verdictFromDecode('kamer 809', 'kamer zevenhonderd negen', 'nl')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('numeral_mismatch')
    })

    it('convicts a wrong price in Spanish', () => {
      const v = V.verdictFromDecode('son 250 pesos', 'son ciento cincuenta pesos', 'es')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('numeral_mismatch')
    })

    it('does NOT reach under the edit floor to convict a short clip', () => {
      // Caught by replaying the 5,341 cached decodes: the French one-word clip
      // "tout" comes back "2.", and a naive "the decode has a digit the script
      // does not" convicts it. That is the class MIN_EDIT_DISTANCE exists for.
      const v = V.verdictFromDecode('2.', 'tout', 'fr')
      expect(v.pass).toBe(true)
    })

    it('says nothing when the decode wrote its number out in words too', () => {
      // Rule 4b is about NOTATION. A spelt-out decode was never a notation
      // problem, and the English word parser cannot read Dutch.
      expect(V.verdictFromDecode('kamer zevenhonderd negen', 'kamer zevenhonderd negen', 'nl').pass).toBe(true)
    })
  })

  describe('the gap, stated rather than papered over', () => {
    it('a language with no lexicon behaves exactly as it does today', () => {
      // Tamil, Hindi, Korean and 79 others have no lexicon here, so a
      // digit-vs-word decode is still refused. No worse than before, and the
      // only way to close it is to add the lexicon.
      const v = V.verdictFromDecode('kamer 709', 'kamer zevenhonderd negen', 'ta')
      expect(v.pass).toBe(false)
      expect(v.reason).toBe('cer_above_threshold')
    })

    it('English is untouched by the registry', () => {
      expect(V.lexiconFor('en')).toBeNull()
      expect(V.verdictFromDecode("That's £48 altogether.", "That's forty-eight pounds altogether.", 'en').pass).toBe(true)
    })
  })

  describe('Rule 4c — French clock time (2026-08-22, fra_for_eng SC11-S008)', () => {
    // The actual quarantined clip: whisper wrote the standard French clock
    // shorthand for a script that spelled the time out in full idiomatic
    // words. CER on this pair is 0.1682 — well under the 0.3 gate — so Rule 4c
    // was the only thing standing between this clip and a pass.
    it('passes the real SC11-S008 pair', () => {
      const script = "De sept heures et demie jusqu'à dix heures. Nous avons des fruits et des céréales ou un petit-déjeuner chaud."
      const heard = "de 7h30 jusqu'à 10h. Nous avons des fruits et des céréales ou un petit-déjeuner chaud."
      const v = V.verdictFromDecode(heard, script, 'fr')
      expect(v.pass).toBe(true)
    })

    const SAME_TIME = [
      ['7h30 = sept heures et demie', '7h30', 'sept heures et demie'],
      ['7h30 = sept heures trente (digital reading also offered)', '7h30', 'sept heures trente'],
      ['10h = dix heures', '10h', 'dix heures'],
      ['15h = quinze heures OR trois heures (24h and 12h both offered)', '15h', 'trois heures'],
      ['15h = quinze heures, the 24h reading', '15h', 'quinze heures'],
      ['1h = une heure, never un heure', '1h', 'une heure'],
      ['13h = une heure (12h reading of the 24h hour)', '13h', 'une heure'],
      ['0h = minuit', '0h', 'minuit'],
      ['12h = midi', '12h', 'midi'],
      ['9h15 = neuf heures et quart', '9h15', 'neuf heures et quart'],
      ['9h45 = neuf heures quarante-cinq', '9h45', 'neuf heures quarante-cinq'],
      ['minuit et demie for 0h30', '0h30', 'minuit et demie'],
    ]
    for (const [label, heard, script] of SAME_TIME) {
      it(label, () => {
        expect(V.verdictFromDecode(`il est ${heard}.`, `il est ${script}.`, 'fr').pass).toBe(true)
      })
    }

    it('still convicts a genuinely wrong time', () => {
      // Same shape of clip, wrong hour — Rule 4c must not go blind just because
      // it now tolerates notation. (On a clip this short the raw mismatch may
      // trip Rule 2's CER floor before Rule 4c even runs — either is a correct
      // refusal, so only the pass/fail is pinned, not which rule caught it.)
      const v = V.verdictFromDecode('il est 8h30.', 'il est sept heures et demie.', 'fr')
      expect(v.pass).toBe(false)
    })

    it('still convicts wrong minutes on the right hour', () => {
      const v = V.verdictFromDecode('il est 7h45.', 'il est sept heures et demie.', 'fr')
      expect(v.pass).toBe(false)
    })

    it('a plain non-time number is unaffected by the time lexicon', () => {
      // "30" alone is not a clock — it must still read as "trente", not "demie".
      const v = V.verdictFromDecode('trente personnes.', '30 personnes.', 'fr')
      expect(v.pass).toBe(true)
    })

    it('other languages are untouched — no .time() means Rule 4c never runs', () => {
      // Only French has clock-time vocabulary today; every other lexicon
      // (including Dutch, which has cardinals) is exactly as it was.
      expect(V.lexiconFor('nl').time).toBeUndefined()
      expect(V.lexiconFor('de').time).toBeUndefined()
    })
  })

  describe('THREE numerals in a line still reach their own language (2026-08-22, por_for_eng)', () => {
    // The lexicons were reached only through the cartesian product. Past
    // MAX_NUMERAL_VARIANTS the code fell back to three fixed reading positions —
    // raw, English long-form, digitwise — and the TARGET-language reading, the
    // entire point of the lexicons, was never among them. Two numerals stayed
    // under the cap and were fine; three fell through. These are the three real
    // pod lines quarantined at CER 0.33-0.50 with every non-numeric word decoded
    // exactly right.
    const REAL_QUARANTINED = [
      ['Dezanove. … Vinte. … Vinte e um. … Quarta-feira. … Quinta-feira.',
        '19. 20. 21. Quarta-feira. Quinta-feira.'],
      ['Trinta. … Quarenta. … Cinquenta. … Sexta-feira. … Sábado.',
        '30 - 40 - 50 - sexta-feira - sábado'],
      ['Cem mil. … Sessenta. … Setenta. … Uma hora. … Onze horas.',
        '100 mil, 60, 70, uma hora, 11 horas.'],
    ]
    for (const [script, heard] of REAL_QUARANTINED) {
      it(`passes: ${script.slice(0, 34)}…`, () => {
        expect(V.verdictFromDecode(heard, script, 'pt').pass).toBe(true)
      })
    }

    it('the fallback offers the target reading, not just raw/English/digitwise', () => {
      // Three tokens x five readings = 125 combos, well past the cap, so this
      // exercises the fallback and not the cartesian path.
      const vars = V.numeralVariants('19. 20. 21. Quarta-feira.', 'pt')
      expect(vars.some(v => v.includes('dezanove'))).toBe(true)
    })

    it('is not Portuguese-specific — every lexicon language gets the same rescue', () => {
      expect(V.verdictFromDecode('19, 20, 21 personas.', 'diecinueve, veinte, veintiuno personas.', 'es').pass).toBe(true)
      expect(V.verdictFromDecode('19, 20, 21 Personen.', 'neunzehn, zwanzig, einundzwanzig Personen.', 'de').pass).toBe(true)
    })

    it('a genuinely WRONG number in a three-numeral line is still convicted', () => {
      // The rescue must not become a blanket amnesty for number-heavy lines:
      // same shape, but the middle number is not what the script says.
      const v = V.verdictFromDecode('19. 99. 21. Quarta-feira. Quinta-feira.',
        'Dezanove. Vinte. Vinte e um. Quarta-feira. Quinta-feira.', 'pt')
      expect(v.pass).toBe(false)
    })
  })
})

describe('speech rate — the clip being replaced is not a duration reference', () => {
  it('accepts a correct render whose predecessor was a different voice', () => {
    // Femke reads this in 1176ms where Noor took 3288ms. The old ratio check
    // called 0.36 a truncation; both clips are perfect.
    const v = V.speechRateVerdict({ text: 'Wat interessant.', durationMs: 1176, language: 'nld' })
    expect(v.ok).toBe(true)
    expect(v.reason).toBe('speech_rate_plausible')
  })

  it('accepts the correct render that a TRUNCATED predecessor was rejecting', () => {
    // Noor's own take of this line is 936ms — itself cut short — and was being
    // used as the standard against which the 3096ms Femke render was refused.
    const text = 'Pardon — heeft u ook iets glutenvrijs?'
    expect(V.speechRateVerdict({ text, durationMs: 3096, language: 'nld' }).ok).toBe(true)
    // ...and the truncated take is what this check actually convicts.
    expect(V.speechRateVerdict({ text, durationMs: 936, language: 'nld' }).ok).toBe(false)
    expect(V.speechRateVerdict({ text, durationMs: 936, language: 'nld' }).reason).toBe('too_fast_for_text')
  })

  it('convicts a clip cut in half and a render that hung', () => {
    const text = 'Goedemorgen, ik wil graag een tafel voor twee personen reserveren.'
    expect(V.speechRateVerdict({ text, durationMs: 700 }).ok).toBe(false)
    expect(V.speechRateVerdict({ text, durationMs: 60000 }).reason).toBe('too_slow_for_text')
  })

  it('spans the whole observed band A-136 measured, 6.9 to 20.9 chars/sec', () => {
    const text = 'x'.repeat(100)
    for (const cps of [6.9, 12, 20.9]) {
      expect(V.speechRateVerdict({ text, durationMs: (100 / cps) * 1000 }).ok).toBe(true)
    }
  })

  it('abstains rather than guessing — short texts, no duration, unmeasured scripts', () => {
    expect(V.speechRateVerdict({ text: 'Ja.', durationMs: 200 }).reason).toBe('text_too_short_to_rate')
    expect(V.speechRateVerdict({ text: 'een hele zin hier', durationMs: 0 }).reason).toBe('not_measurable')
    // One Chinese character is a whole syllable, so chars/sec means something
    // else there and no band has been measured. Abstain, never invent.
    const cjk = V.speechRateVerdict({ text: '我想要一杯咖啡谢谢你', durationMs: 3000 })
    expect(cjk.ok).toBe(true)
    expect(cjk.reason).toBe('no_band_for_logographic')
  })

  it('rates the words, not the cues', () => {
    const cued = V.speechRateVerdict({ text: 'Buongiorno. [pause] Non mi sento molto bene.', durationMs: 3000 })
    const plain = V.speechRateVerdict({ text: 'Buongiorno. Non mi sento molto bene.', durationMs: 3000 })
    expect(cued.cps).toBe(plain.cps)
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
  // These tests are about the GATE's decision, not about which clips the sampler
  // picks, so they run with sampling pinned open. Graduated sampling has its own
  // block below. Before 2026-08-13 there was no sampler and every clip was checked,
  // which is why these calls used to need no `sampler` at all.
  const always = V.createSampler({ first: 1, trusted: 1, floor: 1 })
  const buf = (s) => Buffer.from(s)
  const passing = async () => ({ pass: true, checked: true, reason: 'ok', cer: 0.02, decode: 'hallo' })
  const failing = async () => ({ pass: false, checked: true, reason: 'cer_above_threshold', cer: 0.8, decode: 'ha' })
  const quiet = { info: () => {}, warn: () => {}, error: () => {}, log: () => {} }

  it('publishes a clip that passes first time, with one render', async () => {
    let renders = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      sampler: always,
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
      sampler: always,
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
      sampler: always,
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
      sampler: always,
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
      sampler: always,
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

/**
 * The verdict a clip carries into the database.
 *
 * These exist because the audio-preview page used to infer "this clip was
 * checked" from created_at, and docs/gate-bypass-audit-2026-08-05.md measured
 * that inference as false for 100% of the 1,413 rows it selected. The columns
 * are only worth anything if they cannot repeat the same lie in a new place —
 * so the rule under test is that an admission never becomes an approval.
 */
describe('verdictColumns', () => {
  it('records a pass with its evidence', () => {
    const c = V.verdictColumns(
      { checked: true, pass: true, reason: 'ok', cer: 0.0125 },
      { checker: 'phase8-generate', attempts: 1 })
    expect(c.veracity_pass).toBe(true)
    expect(c.veracity_reason).toBe('ok')
    expect(c.veracity_cer).toBe(0.0125)
    expect(c.veracity_attempts).toBe(1)
    expect(c.veracity_checker).toBe('phase8-generate')
    expect(Date.parse(c.veracity_checked_at)).not.toBeNaN()
  })

  it('records a failure as a failure', () => {
    const c = V.verdictColumns({ checked: true, pass: false, reason: 'non_speech_decode', cer: 1 })
    expect(c.veracity_pass).toBe(false)
  })

  /**
   * THE rule. `checked: false` is the gate saying it could not look. Stored as
   * `false` it would read as "we looked and it was bad"; stored as `true` it
   * would be a fabricated pass. It is NULL, and the checked_at still lands so
   * the admission itself is on the record with its reason.
   */
  it('stores a could-not-check as NULL — never true, never false', () => {
    const c = V.verdictColumns({ checked: false, pass: null, reason: 'unchecked_no_whisper' })
    expect(c.veracity_pass).toBeNull()
    expect(c.veracity_reason).toBe('unchecked_no_whisper')
    expect(c.veracity_checked_at).toBeTruthy()
    expect(c.veracity_cer).toBeNull()
  })

  it('writes nothing at all when no check was run', () => {
    // A caller that did not check must leave the row honestly blank rather
    // than stamping it with a verdict it never obtained.
    expect(V.verdictColumns(null)).toEqual({})
    expect(V.verdictColumns(undefined)).toEqual({})
  })

  it('overwrites every verdict column, so a stale pass cannot survive a re-render', () => {
    // The re-render paths spread this over a copy of the OLD row. Any column
    // it failed to set would keep the previous clip's verdict next to new
    // audio — a lie with a fresh timestamp on it.
    const stale = {
      veracity_checked_at: 'old', veracity_pass: true, veracity_reason: 'ok',
      veracity_cer: 0.01, veracity_attempts: 1, veracity_checker: 'old-tool',
    }
    const merged = { ...stale, ...V.verdictColumns({ checked: false, pass: null, reason: 'unchecked_disabled' }) }
    for (const k of Object.keys(stale)) expect(merged[k]).not.toBe(stale[k])
    expect(merged.veracity_pass).toBeNull()
  })
})

describe('graduated sampling — per COURSE (Tom, 2026-08-13; scope corrected 2026-08-17)', () => {
  const quiet = { info: () => {}, warn: () => {}, error: () => {}, log: () => {} }
  const buf = (s) => Buffer.from(s)
  const passing = async () => ({ pass: true, checked: true, reason: 'ok', cer: 0.02, decode: 'hallo' })
  const failing = async () => ({ pass: false, checked: true, reason: 'cer_above_threshold', cer: 0.8, decode: 'ha' })

  it('samples ~10% of the first course', () => {
    const s = V.createSampler()
    s.startCourse('spa_for_eng')
    const taken = Array.from({ length: 100 }, () => s.shouldCheck()).filter(Boolean).length
    expect(taken).toBe(10)
  })

  // FLIPPED 2026-08-17. This used to assert the relaxation happened on the NEXT
  // course. Tom's ruling scopes sampling per course — and the old shape made the
  // cheap end of the ladder unreachable, because one course per run is how the
  // estate is actually driven, so nothing ever banked.
  it('relaxes to ~1% WITHIN a course once the opening sample comes back clean', () => {
    const s = V.createSampler()
    s.startCourse('a')
    let sampled = 0
    for (let i = 0; i < 100; i++) if (s.shouldCheck()) { sampled++; s.recordVerdict({ checked: true, pass: true }) }
    expect(sampled).toBe(10)                        // 10% of the first 100 clips
    expect(s.state().rate).toBeCloseTo(0.01, 5)     // ...and that bought a rung
    // The wider walk now holds: one in a hundred, and no double-sample from the
    // step itself.
    const taken = Array.from({ length: 1000 }, () => s.shouldCheck()).filter(Boolean).length
    expect(taken).toBe(10)
  })

  // FLIPPED 2026-08-17: the ladder is now walked inside ONE course.
  it('keeps relaxing down the ladder within one course, but never to zero', () => {
    const s = V.createSampler()
    s.startCourse('one_long_course')
    const seen = [s.state().rate]
    for (let i = 0; i < 400000; i++) {
      if (s.shouldCheck()) {
        s.recordVerdict({ checked: true, pass: true })
        const r = s.state().rate
        if (r !== seen[seen.length - 1]) seen.push(r)
      }
    }
    expect(seen[0]).toBeCloseTo(0.10, 5)
    expect(seen[1]).toBeCloseTo(0.01, 5)
    expect(seen[2]).toBeCloseTo(0.005, 5)
    expect(seen[3]).toBeCloseTo(0.0025, 5)
    // The floor holds. A run that stops looking cannot notice it has gone wrong.
    expect(Math.min(...seen)).toBeGreaterThan(0)
    expect(Math.min(...seen)).toBeCloseTo(0.002, 5)
  })

  it('a failure snaps the rate back to the opening rate, mid-course', () => {
    const s = V.createSampler()
    s.startCourse('a')
    for (let i = 0; i < 100; i++) if (s.shouldCheck()) s.recordVerdict({ checked: true, pass: true })
    expect(s.state().rate).toBeCloseTo(0.01, 5)   // relaxed a rung, within the course
    const snap = s.recordVerdict({ checked: true, pass: false })
    expect(snap.snapped).toBe(true)
    expect(s.state().rate).toBeCloseTo(0.10, 5)
    // Every rung is forfeit, not just the last one: the cheap rate was a claim
    // that turned out not to hold, so it is withdrawn in full.
    expect(s.state().step).toBe(0)
  })

  // NEW 2026-08-17, the invariant the scope ruling actually turns on.
  it('starts every course fresh, however clean the previous one was', () => {
    const s = V.createSampler()
    s.startCourse('a')
    for (let i = 0; i < 100; i++) if (s.shouldCheck()) s.recordVerdict({ checked: true, pass: true })
    expect(s.state().rate).toBeCloseTo(0.01, 5)
    s.startCourse('b')
    expect(s.state().rate).toBeCloseTo(0.10, 5)   // trust does NOT cross the boundary
    expect(s.state().step).toBe(0)
  })

  it('a course that sampled nothing relaxes nothing — no evidence, no relaxation', () => {
    const s = V.createSampler()
    s.startCourse('a')          // never calls shouldCheck: a course with no clips
    expect(s.state().rate).toBeCloseTo(0.10, 5)
    s.startCourse('b')
    expect(s.state().rate).toBeCloseTo(0.10, 5)
  })

  it('spreads the sample across the course instead of clumping it', () => {
    const s = V.createSampler({ first: 0.01, trusted: 0.01, floor: 0.01 })
    s.startCourse('a')
    const picks = []
    for (let i = 0; i < 500; i++) if (s.shouldCheck()) picks.push(i)
    expect(picks).toEqual([0, 100, 200, 300, 400])
  })

  it('an unsampled clip is published, rendered once, and recorded as not_sampled — never as a pass', async () => {
    const never = V.createSampler({ first: 0, trusted: 0, floor: 0 })
    never.startCourse('a')
    let renders = 0
    let checks = 0
    const stats = V.newStats()
    const r = await V.renderChecked({
      sampler: never,
      render: async () => { renders++; return { buffer: buf('a'), durationMs: 900 } },
      check: async () => { checks++; return passing() },
      expectedText: 'hallo', language: 'deu', stats, logger: quiet,
    })
    expect(r.published).toBe(true)
    expect(renders).toBe(1)
    expect(checks).toBe(0)                        // no whisper cost at all
    expect(stats.not_sampled).toBe(1)
    expect(stats.checked).toBe(0)
    expect(stats.passed).toBe(0)
    // The row must say "not checked", never a fabricated pass.
    expect(V.verdictColumns(r.verdict).veracity_pass).toBeNull()
    // And a policy skip is NOT the alarming "we could not look" counter.
    expect(stats.unchecked).toBe(0)
  })

  it('a sampled failure still quarantines — sampling changes WHICH clips are checked, not what a failure means', async () => {
    const always = V.createSampler({ first: 1, trusted: 1, floor: 1 })
    always.startCourse('a')
    const stats = V.newStats()
    const r = await V.renderChecked({
      sampler: always,
      render: async () => ({ buffer: buf('a'), durationMs: 900 }),
      check: failing, attempts: 2,
      expectedText: 'hallo', language: 'deu', stats, logger: quiet,
    })
    expect(r.published).toBe(false)
    expect(stats.quarantined).toBe(1)
  })
})
