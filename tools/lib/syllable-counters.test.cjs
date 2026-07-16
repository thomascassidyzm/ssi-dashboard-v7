import { describe, it, expect } from 'vitest'
import { countSyllables, countSyllablesHrv } from './syllable-counters.cjs'

// Each fixture is a hand-counted (natural, native-speaker) syllable total for
// the whole phrase. The vowel-group heuristics are approximations — these
// sentences were chosen to be unambiguous under normal syllabification rules
// for their language, not cherry-picked to flatter the algorithm.
describe('countSyllables', () => {
  it('hrv — unchanged Croatian counter (vowels + syllabic r)', () => {
    expect(countSyllablesHrv('Dobro jutro, kako si?')).toBe(7) // do-bro ju-tro ka-ko si
    expect(countSyllablesHrv('Hrvatska')).toBe(3) // hr(vatska): hr = syllabic r, va, tska
    expect(countSyllables('Dobro jutro, kako si?', 'hrv')).toBe(7)
  })

  it('eng — English, silent endings and contractions', () => {
    expect(countSyllables("Sorry, I didn't catch that", 'eng')).toBe(7) // sor-ry i did-n't catch that
    expect(countSyllables('Could you say that again, a bit slower?', 'eng')).toBe(10) // could you say that a-gain a bit slow-er
    expect(countSyllables("Anyway, I'd better go", 'eng')).toBe(7) // an-y-way i'd bet-ter go
    expect(countSyllables("We'll just have to agree to disagree", 'eng')).toBe(10) // we'll just have to a-gree to dis-a-gree
    expect(countSyllables('houses', 'eng')).toBe(2) // hou-ses (sibilant keeps -es)
    expect(countSyllables('likes', 'eng')).toBe(1) // silent -es
    expect(countSyllables('walked', 'eng')).toBe(1) // silent -ed
    expect(countSyllables('wanted', 'eng')).toBe(2) // -ed kept after t
    expect(countSyllables('tables', 'eng')).toBe(2) // consonant+le keeps its nucleus
    expect(countSyllables('miles', 'eng')).toBe(1) // vowel+les is silent
    expect(countSyllables("can't", 'eng')).toBe(1) // n't after vowel adds nothing
  })

  it('spa — Spanish, including accented-hiatus (días, país)', () => {
    expect(countSyllables('Buenos días, cómo estás', 'spa')).toBe(8) // bue-nos dí-as có-mo es-tás
    expect(countSyllables('país', 'spa')).toBe(2) // pa-ís
  })

  it('ita — Italian diphthongs merge as one nucleus', () => {
    expect(countSyllables('Buongiorno, come stai', 'ita')).toBe(6) // buon-gior-no co-me stai
  })

  it('por — Portuguese, including accented-hiatus (país, saída)', () => {
    expect(countSyllables('Bom, como está o país', 'por')).toBe(8) // bom co-mo es-tá o pa-ís
    expect(countSyllables('saída', 'por')).toBe(3) // sa-í-da
  })

  it('deu — German, diphthongs merge as one nucleus', () => {
    expect(countSyllables('Guten Morgen, wie geht es dir', 'deu')).toBe(8) // gu-ten mor-gen wie geht es dir
  })

  it('fra — French, silent final -e is not its own nucleus', () => {
    expect(countSyllables('Je ne sais pas', 'fra')).toBe(4) // je ne sais pas
    expect(countSyllables('une table', 'fra')).toBe(2) // une table (both 1 syllable, final -e silent)
  })

  it('nld — Dutch, "ij" digraph counts as one nucleus', () => {
    expect(countSyllables('Goedemorgen, hoe gaat het', 'nld')).toBe(7) // goe-de-mor-gen hoe gaat het
    expect(countSyllables('mijn vrijheid', 'nld')).toBe(3) // mijn vrij-heid
  })

  it('cym — Welsh, w/y count as vowels', () => {
    expect(countSyllables('Bore da, sut wyt ti', 'cym')).toBe(6) // bo-re da sut wyt ti
  })

  it('fails loudly for an unregistered language instead of guessing', () => {
    expect(() => countSyllables('hello there', 'xyz')).toThrow(/no syllable counter registered/)
  })
})
