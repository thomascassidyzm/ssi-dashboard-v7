// Unit tests for the ellipsis → SSML <break> shim (Azure only; xAI/ElevenLabs
// get '…' literally, unchanged). Run: npx vitest run services/shared/ellipsis-ssml.test.js
import { describe, it, expect } from 'vitest'
import { ellipsisToSSMLBreaks, buildAzureSSMLBody, ELLIPSIS_BREAK_MS } from './ellipsis-ssml.cjs'

describe('ellipsisToSSMLBreaks', () => {
  it('passes text with no ellipsis through unchanged (still XML-escaped)', () => {
    expect(ellipsisToSSMLBreaks('Bok, kako si?')).toBe('Bok, kako si?')
  })

  it('substitutes a single ellipsis for a <break> tag', () => {
    const out = ellipsisToSSMLBreaks('Malo je frustrirajuće… kad ne mogu razmišljati.')
    expect(out).toBe('Malo je frustrirajuće<break time="400ms"/> kad ne mogu razmišljati.')
  })

  it('substitutes every ellipsis in a multi-break sentence', () => {
    const out = ellipsisToSSMLBreaks('Malo je frustrirajuće… kad ne mogu dovoljno brzo razmišljati… da bih se ispravno izrazio')
    expect(out.match(/<break time="400ms"\/>/g)).toHaveLength(2)
    expect(out).toBe(
      'Malo je frustrirajuće<break time="400ms"/> kad ne mogu dovoljno brzo razmišljati<break time="400ms"/> da bih se ispravno izrazio'
    )
  })

  it('honours a custom break duration', () => {
    const out = ellipsisToSSMLBreaks('a…b', 250)
    expect(out).toBe('a<break time="250ms"/>b')
  })

  it('XML-escapes each side of the break independently, never the tag itself', () => {
    const out = ellipsisToSSMLBreaks('Tom & Jerry…say "hi" <now>')
    expect(out).toBe('Tom &amp; Jerry<break time="400ms"/>say &quot;hi&quot; &lt;now&gt;')
  })

  it('handles null/undefined/empty input safely', () => {
    expect(ellipsisToSSMLBreaks(null)).toBe('')
    expect(ellipsisToSSMLBreaks(undefined)).toBe('')
    expect(ellipsisToSSMLBreaks('')).toBe('')
  })

  it('default break duration is 400ms (the verified render-test value)', () => {
    expect(ELLIPSIS_BREAK_MS).toBe(400)
  })

  it('a bare "..." (three dots, not the single-glyph ellipsis) is left untouched — only U+2026 is the canonical mark', () => {
    expect(ellipsisToSSMLBreaks('wait...')).toBe('wait...')
  })
})

describe('buildAzureSSMLBody (inline-SSML passthrough, kai-stage port 2026-07-28)', () => {
  it('escapes plain text exactly as before (delegates to ellipsisToSSMLBreaks)', () => {
    expect(buildAzureSSMLBody('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('passes inline <phoneme> markup through raw, unescaped', () => {
    const text = 'I <phoneme alphabet="ipa" ph="æm">am</phoneme> here'
    expect(buildAzureSSMLBody(text)).toBe(text)
  })

  it('passes inline <sub> markup through raw', () => {
    const text = '<sub alias="ay">a</sub>'
    expect(buildAzureSSMLBody(text)).toBe(text)
  })

  it('still substitutes ellipsis for <break> in inline-SSML texts', () => {
    const out = buildAzureSSMLBody('<sub alias="ay">a</sub>… slowly')
    expect(out).toBe('<sub alias="ay">a</sub><break time="400ms"/> slowly')
  })

  it('does not treat a stray < comparison as inline SSML', () => {
    expect(buildAzureSSMLBody('5 < 6')).toBe('5 &lt; 6')
  })
})
