#!/usr/bin/env node
/**
 * The pair-overlay parser's own cheap test. Single process, no suite, no DB.
 *   node tools/pods/parse-health-overlay.test.cjs
 *
 * The fixture is INLINE rather than the real document, on purpose: the overlay
 * lives on its own branch (docs/health-welsh-pair-overlay-2026-09-01) and the
 * database is canon the moment it is ingested, so a test that read the file
 * would fail on main and pass for the wrong reason later.
 *
 * The property that matters most is the last one: THE PARSER NEVER TOUCHES THE
 * WELSH. Every target string must come back as the document's own bytes.
 */
const { parseHealthOverlay } = require('./parse-health-overlay.cjs')

let fails = 0
const ok = (cond, msg) => { console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`); if (!cond) fails++ }
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`)

const FIXTURE = `# The Welsh pair overlay

## 0. Standing decisions

**R1 — chi throughout.** Not a seed; must not be parsed as one.

| English frame | Welsh frame | seeds |
|---|---|---|
| "let's X" | "dewch i ni X" | HG10 |

## 1. The mapping — 57 seeds, chunk by chunk

### Block A — the contract, on the ward

**HG01** — "If I say anything that isn't clear, please stop me."
> **Draft:** "Os dw i'n deud rhywbeth sydd ddim yn glir, stopiwch fi."

| chunk | Welsh | class | note |
|---|---|---|---|
| if I say *(core)* | os dw i'n deud 🏔 | D | Welsh present in the if-clause |
| please stop me | stopiwch fi | D | |

**HG02** — "This isn't my first language, so if you have any trouble
understanding me, just let me know."
> **Draft:** "Dim Cymraeg ydy fy iaith gynta i, felly os dach chi'n cael
> unrhyw drafferth fy nallt i, rhowch wybod i mi."

| chunk | Welsh | class | note |
|---|---|---|---|
| this isn't my first language | dim Cymraeg ydy fy iaith gynta i | I | fronting |

### Block B — names and first meeting

**HG03** — "What would you like me to call you?"
> **Draft:** "Be fasach chi'n licio i mi'ch galw chi?"

| chunk | Welsh | class | note |
|---|---|---|---|
| what would you like | be fasach chi'n licio | D | |

## 2. The four classes

**HG99** — "after the mapping ends, this is not a seed"
`

const { scenarios, steps } = parseHealthOverlay(FIXTURE, { slug: 'health-general-welsh', targetLang: 'cym_n' })

eq(scenarios.length, 3, 'three seeds — the §0 frame table and the §2 tail are not seeds')
eq(steps.length, 0, 'a pair overlay declares no walk steps')
eq(scenarios.map(s => s.id).join(','),
   'health-general-welsh:HG01,health-general-welsh:HG02,health-general-welsh:HG03',
   'ids are slug:HGnn, in document order')
eq(scenarios[0].scene_number, 1, 'Block A is scene 1')
eq(scenarios[2].scene_number, 2, 'Block B is scene 2')
eq(scenarios[0].scene_title, 'the contract, on the ward', 'the block title carries')
eq(scenarios[2].scene_label, 'Block B', 'the block letter is the scene label')
eq(scenarios[1].global_order, 2, 'global order is document order across blocks')

eq(scenarios[0].english_text,
   "If I say anything that isn't clear, please stop me.",
   'the English is unquoted')
eq(scenarios[1].english_text,
   'This isn\'t my first language, so if you have any trouble understanding me, just let me know.',
   'a wrapped English sentence is rejoined with one space')

eq(scenarios[0].target_text,
   "Os dw i'n deud rhywbeth sydd ddim yn glir, stopiwch fi.",
   'the Draft line is the target, unquoted and untouched')
eq(scenarios[1].target_text,
   "Dim Cymraeg ydy fy iaith gynta i, felly os dach chi'n cael unrhyw drafferth fy nallt i, rhowch wybod i mi.",
   'a blockquote-wrapped Draft is rejoined with one space')
eq(scenarios[0].target_lang, 'cym_n', 'the target language is stamped on the row')

ok(/if I say \*\(core\)\* → os dw i'n deud 🏔 \[D\]/.test(scenarios[0].author_notes),
   'the chunk mapping is carried on author_notes, not dropped')
ok(scenarios[0].author_notes.split('\n').length === 3,
   'a heading line plus one line per chunk')
ok(!/\| chunk \|/.test(scenarios[0].author_notes), 'the table header row is not a chunk')

// THE RAIL: no Welsh is authored, normalised or repaired anywhere in here.
for (const s of scenarios) {
  ok(FIXTURE.includes(s.target_text.split(' ')[0]), `${s.id}: the target's own words come from the document`)
}
const raw = scenarios[0].target_text
eq(raw, raw.normalize('NFC'), 'no re-normalisation of the target string beyond what the file holds')

console.log(fails ? `\n${fails} FAILED` : '\nall good')
process.exit(fails ? 1 : 0)
