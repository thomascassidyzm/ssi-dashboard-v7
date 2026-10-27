// The server's spoken-words key and the booth's copy must give the same answer for every text, or
// the booth would drop a line from the flow that the server still asks for (or the reverse).
//   npx vitest run services/shared/spoken-words.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import { spokenWordsKey as clientKey, twinKey, saidTwinKeys } from '../../src/views/recordist/spoken-words.js'

const require = createRequire(import.meta.url)
const { spokenWordsKey: serverKey, sameSpokenWords } = require('./spoken-words.cjs')

const TEXTS = [
  'Esgusodwch fi, dach chi’n barod?', "esgusodwch fi dach chi'n barod", 'be’ ddudoch chi?', 'Be ddudoch chi',
  'os dw i’n deud … rhywbeth sydd ddim yn glir — stopiwch fi, plîs', '<tgt>Iawn.</tgt>', "a'i frawd", 'ai frawd',
  "'n barod", 'yn barod', 'blasus', 'flasus', 'ar-lein', '¿Qué tal?', 'Ŵy, ŷd a ŵyn', '  spaced   out  ', '', null,
]

describe('spoken-words: one key on both sides of the wire', () => {
  it('server and booth agree on every text', () => {
    for (const t of TEXTS) expect(clientKey(t), JSON.stringify(t)).toBe(serverKey(t))
  })
  it('same words with different case or punctuation match; different words never do', () => {
    expect(sameSpokenWords('Esgusodwch fi, dach chi’n barod?', "esgusodwch fi dach chi'n barod")).toBe(true)
    expect(sameSpokenWords('blasus', 'flasus')).toBe(false)
    expect(sameSpokenWords("a'i frawd", 'ai frawd')).toBe(false)
    expect(sameSpokenWords('', '')).toBe(false)
  })
  it('a twin is the same words on the same side; a gapped Take G read has none', () => {
    expect(twinKey({ role: 'target2', text: 'Iawn.' })).toBe(twinKey({ role: 'target1', text: 'iawn' }))
    expect(twinKey({ role: 'known', text: 'iawn' })).not.toBe(twinKey({ role: 'target2', text: 'iawn' }))
    expect(twinKey({ kind: 'takeg', role: 'target', text: 'iawn' })).toBeNull()
    const said = saidTwinKeys([{ id: 'a', role: 'target2', text: 'Iawn.' }, { id: 'b', role: 'target2', text: 'na' }], (l) => l.id === 'a')
    expect([...said]).toEqual([twinKey({ role: 'target2', text: 'iawn' })])
  })
})
