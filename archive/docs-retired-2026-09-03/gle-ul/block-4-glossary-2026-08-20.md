# Block 4 (seeds 289–384) — Donegal glossary and translation decisions

`gle_ul_for_eng`. 96 seeds, translated 2026-08-20. Output: `scripts/gle-ul/out/block-4.json`.

The block JSON is a strict array (that is what `scripts/gle-ul/apply.cjs` validates), so the running
glossary the brief asked for lives here instead.

---

## 1. Recurring chunk → Irish, applied uniformly across the block

| English chunk | Irish used | Seeds |
|---|---|---|
| what (interrogative / embedded) | `caidé` | 347, 348, 365, 366, 372, 375, 380 |
| I think that … | `Sílim go …` | 303, 314, 325, 335 |
| I think that … not / I don't think that … | `Sílim nach …` / `Ní shílim go …` | 304, 315, 318, 326, 330, 336, 339 |
| do you think that …? | `an síleann tú go …?` | 316, 327, 337 |
| he/she said that … | `dúirt sé/sí go …`, neg. `nach …` | 301, 302, 312, 313, 322, 323, 333, 334, 358, 359 |
| want to | `tá … ag iarraidh` | 23 seeds |
| trying to | `ag iarracht` (per brief; see §4) | 372 |
| can (present ability) | `tig le` / `ní thig le` / `nach dtig le` | 331–337, 339 |
| could (conditional ability) | `thiocfadh le` / `ní thiocfadh le` / `nach dtiocfadh le` | 310, 311, 312, 313, 314, 315, 316, 317, 318, 358, 359, 384 |
| be able to (explicit English) | `ábalta` | 291, 292, 352 |
| need to + verb | `tá ar` / `níl ar` / `an raibh ar` | 319, 320, 322, 323, 325, 326, 327, 353, 354, 355 |
| need + noun | `de dhíth ar` | 296 |
| have to | `caithfidh` | 293 |
| ought to | `ba chóir do` (`gur cheart di`) | 328 |
| someone / something | `duine inteacht` / `rud inteacht` | 301, 341, 342, 356 |
| anyone / anything / anywhere | `duine ar bith` / `rud ar bith` / `áit ar bith` | 360, 367, 370, 376, 377 |
| nothing | `dada` | 298 |
| very | `iontach` | 330, 374 |
| all (the lot) | `uilig` | 313, 331 |
| also | `fosta` | — (does not occur in this block) |
| to me | `domh` | 367 |
| yet | `go fóill` | 345 |
| after (temporal) | `i ndiaidh` | 362 |
| about / concerning | `fá` (+ `fán` before the article) | 310, 343 |
| for (purposive) | `fá choinne` | 378 |
| around | `thart fá` | 353 |
| new | `úr` | 332 |
| open | `foscail` / `foscladh` | 336 |
| help | `cuidiú le` | 344 |
| call (phone) | `scairt a chur ar` | 294 |
| minute / moment | `bomaite` | 384 |
| watch / look / see (non-past) | `amharc` | 313, 371 |
| to go (verbal noun) | `a ghabháil` | 349 |

## 2. Grammar conventions held across the block

- **Ulster lenition after simple preposition + singular article.** `ar an bhean`, `ar an fhear`,
  `ar an bhord`, `ar an bhóthar`, `leis an ghrúpa`, `leis an bhean`, `chuig an chóisir`,
  `ón bhaile`, `ag an mhac léinn`, `fán fhear`, `fán gheilleagar`, `thart fán pháirc` —
  never the eclipsing `ar an mbean`. Coronals (d, t, s) are left alone. **This is not currently in
  the spec and it should be** — see §4.
- Analytic 1st plural throughout; synthetic 1sg present kept (`sílim`).
- Object + `a` + verbal noun everywhere (`an doras a fhoscladh`, `an comhlacht a dhíol`).
- Interrogatives keep particle and mutation (`An raibh …?`, `Ar chuala tú …?`, `An bhfaca tú …?`,
  `An ndeachaigh tú …?`).
- Capitalisation and terminal punctuation mirror the English seed exactly, line by line.

## 3. The yes/no convention

Irish has no word for yes or no, and this block contains 19 answer seeds. The convention used:

> **echo the verb that the yes/no actually answers, comma, then the full answer.**

The important half of that rule is *which* verb. For a "do you think that X?" question, the yes/no
answers **X**, not the thinking — so 317 answers 316 with `thiocfadh` (not `tá`), and 374 answers 372
with `chonaic` (not `tá`). The base `gle_for_eng` course got both of those wrong, writing `Tá` after
`an bhfaca tú …?`. Where the echo would immediately repeat itself, the answer's own verb carries it.

## 4. Where I think the brief or the spec is wrong

1. **`ag iarracht` for "trying" (brief, decisions table).** `iarracht` is a noun; the progressive is
   `ag déanamh iarrachta`, and `ag iarracht a chruthú` is not, as far as I can find, grammatical.
   Used at seed 372 as instructed and flagged `genuinely uncertain`. If the intent is only to keep
   "trying" distinct from "wanting", `ag déanamh iarrachta` does that and is correct Irish.
2. **The spec is silent on Ulster lenition after preposition + article**, which is one of the most
   audible Donegal grammar features and fires 12 times in this block alone. It should be added to
   §1f, otherwise a later consistency pass may "correct" `ar an bhean` back to `ar an mbean`.
3. **Spec §3 open question 5 (`ábalta` vs `tig le`) is answered here by convention, not by
   evidence**: `tig le`/`thiocfadh le` for "can"/"could", `ábalta` for explicit "be able to". It is
   consistent and it maps cleanly to the English, but a Donegal speaker should ratify it, because it
   is 12 + 3 seeds wide in this block and will be several hundred wide across the course.
4. **"need to" → `tá ar`** merges "need" toward "have to". The Ulster `de dhíth` is only usable with
   a noun. If a better Donegal rendering of "need to + verb" exists, it should be set course-wide.

## 5. Negation

The `cha`/`ní` ruling file (`docs/gle-ul/cha-vs-ni-ruling-2026-08-20.md`) **did not exist** when this
block started or when it was written. The interim rule was followed: `ní` / `níl` / `níor`
throughout, no improvised `cha`.

37 of 96 seeds carry a negative and every one is annotated:

- `independent` — **28**
- `subordinate` — **9** (302, 304, 313, 315, 323, 333, 345, 358, 364)
- `question`, `imperative`, `copula` — **0**

So if #536 rules for `cha`, the sweep over this block is exactly the 28 independent rows; the 9
subordinate rows keep `nach`/`nár` and must not be touched. Four of the 28 are the negative echo
tokens of an answer seed (309, 339, 351/357/362/367/375/378 pattern) — they are independent clauses
and take `cha` too, but a reviewer should confirm that a bare `chan fhuil,` reads naturally as an
answer opener before that is applied mechanically.
