// The Talk Bollocks canonical English is Tom's and Aran's own words and nothing else
// (Tom, 2026-10-20: "never paraphrase, never polish, never add a word").
//   npx vitest run tools/pods/talk-bollocks-canon.test.cjs
const { describe, it, expect } = require('vitest')
const fs = require('fs')
const path = require('path')
const {
  readTranscript, applyEdits, splitSentences, words, subsequenceBreak, loadPart, renderCorpus,
  correct, corpusPath, PARTS, SOURCE_DIR, REPO,
} = require('./talk-bollocks-canon.cjs')
const { parsePod } = require('./parse-pod-markdown.cjs')

const emptyStore = { nodeIds: new Set(), moveIds: new Set(), outcomeIds: new Set() }
const sourceText = n => fs.readFileSync(path.join(REPO, SOURCE_DIR, `part-${n}.md`), 'utf8')

describe('the Talk Bollocks canonical English', () => {
  for (const n of Object.keys(PARTS)) {
    describe(`Part ${n}`, () => {
      const built = loadPart(n)
      const out = built.chapters.flatMap(c => c.turns.flatMap(t => splitSentences(t.text)))

      it('adds no word, reorders no word: its words are an in-order subsequence of the transcript', () => {
        const source = words(correct(sourceText(n)))
        expect(subsequenceBreak(words(out.join(' ')), source)).toBe(-1)
      })

      it('keeps every word of every line the edits did not drop', () => {
        const dropped = new Set(PARTS[n].edits.drop)
        const kept = readTranscript(sourceText(n)).filter(l => !dropped.has(l.line))
        // only square-bracket editor's notes may go from a kept line
        const expected = words(correct(kept.map(l => (PARTS[n].edits.text || {})[l.line] || l.text.replace(/\[[^\]]*\]/g, ' ')).join(' ')))
        expect(words(out.join(' '))).toEqual(expected)
      })

      it('names a real transcript line in every edit', () => {
        const lines = new Set(readTranscript(sourceText(n)).map(l => l.line))
        const e = PARTS[n].edits
        for (const l of [...e.drop, ...Object.keys(e.speaker || {}), ...Object.keys(e.text || {}), ...Object.keys(e.split || {})]) {
          expect(lines.has(Number(l)), `line ${l}`).toBe(true)
        }
      })

      it('is two voices, alternating, with no Descript markup left', () => {
        for (const c of built.chapters) {
          for (let i = 1; i < c.turns.length; i++) expect(c.turns[i].speaker).not.toBe(c.turns[i - 1].speaker)
        }
        for (const s of out) expect(s).not.toMatch(/\*\*|__|\[|\]|^-\s/)
      })

      it('is committed exactly as the builder makes it, and ingests one row per sentence', () => {
        const text = renderCorpus(n, built)
        expect(fs.readFileSync(corpusPath(n), 'utf8')).toBe(text)
        const { scenarios, steps } = parsePod(text, { slug: PARTS[n].slug, unit: 'Chapter', targetLang: null, store: emptyStore })
        expect(scenarios.length).toBe(out.length)
        expect(steps.length).toBe(0)
        expect(new Set(scenarios.map(r => r.speaker))).toEqual(new Set(['TOM', 'ARAN']))
        expect(new Set(scenarios.map(r => r.id)).size).toBe(scenarios.length)
      })
    })
  }

  it('the proof bites: one added word breaks the subsequence', () => {
    const source = words('so we say ten days or how many hours')
    expect(subsequenceBreak(words('so we say ten days'), source)).toBe(-1)
    expect(subsequenceBreak(words('so we really say ten days'), source)).toBe(3)
    expect(subsequenceBreak(words('ten days so we say'), source)).not.toBe(-1)
  })

  it('splits sentences without touching a character, and never after "Dr."', () => {
    const t = 'from a guy called Dr. Robert Bjork, who. Certainly used to work... Yeah! Is it? yes'
    const s = splitSentences(t)
    expect(s).toEqual(['from a guy called Dr. Robert Bjork, who.', 'Certainly used to work...', 'Yeah!', 'Is it?', 'yes'])
    expect(s.join(' ')).toBe(t)
  })

  it('joins a sentence Descript cut across a speaker label', () => {
    const lines = readTranscript('- Tom\n- There\'s so\n- Aran\n- many different ones!\n')
    const ch = applyEdits(lines, { drop: [], speaker: { 2: 'ARAN' }, chapters: { 1: 'x' } })
    expect(ch[0].turns).toEqual([{ speaker: 'ARAN', text: "There's so many different ones!", lines: [2, 4] }])
  })
})
