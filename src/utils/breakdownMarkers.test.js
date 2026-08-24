import { describe, it, expect } from 'vitest'
import { stripBreakdownMarkers } from './breakdownMarkers'

// Verbatim rows from `listening_pod_sentences` on the live DB, 2026-08-23 —
// the shapes Catrin was actually reading when the ellipses threw her.
const REAL_LINES = [
  ['Fedrwch chi ddeud wrtha i… pa mor bell ydy hi i\'r dre?',
   'Fedrwch chi ddeud wrtha i pa mor bell ydy hi i\'r dre?'],
  ['Esgusodwch fi,… ydy\'r sedd yma… wedi\'i chymryd?',
   'Esgusodwch fi, ydy\'r sedd yma wedi\'i chymryd?'],
  ['Mae\'r oen yn ardderchog. Mae o… wedi\'i goginio\'n… araf, efo rhosmari.',
   'Mae\'r oen yn ardderchog. Mae o wedi\'i goginio\'n araf, efo rhosmari.'],
  ['Liciwn i wydraid mawr… o win gwyn,… os gwelwch yn dda.',
   'Liciwn i wydraid mawr o win gwyn, os gwelwch yn dda.'],
  ['Croeso. Dewch gyda fi,… os gwelwch yn dda. Dyma\'r bwydlenni.',
   'Croeso. Dewch gyda fi, os gwelwch yn dda. Dyma\'r bwydlenni.'],
]

describe('stripBreakdownMarkers', () => {
  it.each(REAL_LINES)('reads cleanly aloud: %s', (before, after) => {
    expect(stripBreakdownMarkers(before)).toBe(after)
  })

  it('leaves no double space where the marker abutted a comma', () => {
    expect(stripBreakdownMarkers('Dewch gyda fi,… os gwelwch')).toBe('Dewch gyda fi, os gwelwch')
    expect(stripBreakdownMarkers('Dewch gyda fi, … os gwelwch')).toBe('Dewch gyda fi, os gwelwch')
  })

  it('does not fuse two words when the marker abuts one with no space', () => {
    expect(stripBreakdownMarkers("goginio'n…araf")).toBe("goginio'n araf")
    expect(stripBreakdownMarkers("goginio'n… araf")).toBe("goginio'n araf")
  })

  it('strips the ASCII three-dot variant too', () => {
    expect(stripBreakdownMarkers('Mae o... wedi\'i goginio')).toBe('Mae o wedi\'i goginio')
    expect(stripBreakdownMarkers('Esgusodwch fi,... ydy hi?')).toBe('Esgusodwch fi, ydy hi?')
    expect(stripBreakdownMarkers('Mae o . . . yma')).toBe('Mae o yma')
  })

  it('leaves an unmarked line byte-identical', () => {
    const plain = 'Dyma\'r bwydlenni.'
    expect(stripBreakdownMarkers(plain)).toBe(plain)
  })

  it('leaves punctuation that is NOT a breakdown marker alone', () => {
    // Real rows in the same table: a Lithuanian en-dash range and a quoted slash.
    expect(stripBreakdownMarkers('kas keturias–šešias valandas')).toBe('kas keturias–šešias valandas')
    expect(stripBreakdownMarkers('en dos pies / comenzamos a migrar')).toBe('en dos pies / comenzamos a migrar')
  })

  it('survives empty and nullish input', () => {
    expect(stripBreakdownMarkers('')).toBe('')
    expect(stripBreakdownMarkers(null)).toBe('')
    expect(stripBreakdownMarkers(undefined)).toBe('')
  })

  it('is stateless across calls — a global regex must not carry lastIndex', () => {
    const line = 'Mae o… yma… rŵan'
    expect(stripBreakdownMarkers(line)).toBe('Mae o yma rŵan')
    expect(stripBreakdownMarkers(line)).toBe('Mae o yma rŵan')
    expect(stripBreakdownMarkers(line)).toBe('Mae o yma rŵan')
  })
})
