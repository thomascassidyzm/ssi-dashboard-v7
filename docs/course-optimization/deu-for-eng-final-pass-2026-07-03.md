# deu_for_eng (German) — Final Pass Report — 2026-07-03

**Architecture:** Opus orchestrator + 6 Sonnet reviewers (read-only). Targeted pass over 372 drafted seeds (34, 51, 52, 81, 301–668). 296 seeds were already complete and out of scope.

**Result:** 45 phrases deleted, 6 seeds flagged for rebuild, 2 seeds backfilled. Two large systematic issues were **deliberately left** for a text-sweep / methodology decision (see below) — they are NOT grammar errors that deletion can fix.

---

## 45 phrases deleted (isolated grammar errors)

| Category | Phrases |
|---|---|
| Subject case (`niemanden`→`niemand` as subject of `war`) | S0370L01B03, U05, U06 |
| Negation word order (`aber nicht konnte`→`aber konnte nicht`) | S0372L02B03, U05 |
| Sep-verb `zu`-infinitive built as `[verb] zu wollen` | S0380L02U05, S0382L02U06, S0384L02U05 |
| Modal + `zu`-infinitive (`anzuhalten`→`anhalten`) | S0402L03U02, U03, U05, U06 |
| Modal + finite verb (`könnten sie dachten`) | S0444L01U06 |
| Modal + `zu`-infinitive (`nachzudenken`→`nachdenken`) | S0475L04U03, U04, U05, U06 |
| Locative case after `in` (`in deine Augen`→`deinen Augen`) | S0486L02U05 |
| Wrong verb / meaning mismatch (`wollen` for "do that again") | S0490L02U02 |
| Adjective ending (`ein sicheren`) | S0510L01U04 |
| Hurt = dative (`für ihn`→`ihm`) | S0513L01U07 |
| Transitive `bewegen` missing object | S0513L03U01, U03 |
| Modal+infinitive (`bewege`→`bewegen`) | S0513L04U03, L05U06, L05U07 |
| Predicate adj over-inflected (`ist laute`→`laut`) | S0557L01U01, U02, U05 |
| Prep case (`von deine Idee`→`deiner`) | S0573L02U02, U07 |
| Prep case (`bei die Feiertage`→`den Feiertagen`) | S0573L04U05 |
| Equative case (`ist diesem Teil`→`dieser Teil`) | S0583L02U07 |
| Modal + `zu`-infinitive (`aufzuwachen`→`aufwachen`) | S0584L02U05 |
| Incomplete subordinate clause | S0587L03U06 |
| `haben`+`gewesen`→`sein`+`gewesen` (sein takes sein) | S0589L02U07, S0599L04U06, U07, S0612L01B02, U04, S0616L01B02, B03, U07 |
| Known/target content mismatch | S0603L03U07 |
| Tense mismatch (present known, past target) | S0364L02U05 |

BUILD fragments were deleted only as companions to USE phrases deleted in the same LEGO (same error), to keep scaffolding consistent.

## 6 seeds FLAGGED for rebuild (whole-LEGO systematic target errors)

Deletion would gut these; backfill can't fix a wrong LEGO target. Need re-decomposition:

- **454** L01 — `unsere Ansatz` throughout; `Ansatz` is masculine → `unser`/`unseren Ansatz` (all of B02/B03/U01–U06)
- **518** L05 — `vorstellen` reflexive `sich`/`mir` missing across whole LEGO (`ich kann es mir nicht vorstellen`)
- **522** L05 — `einigen` reflexive `sich uns` missing across whole LEGO; also `sie haben einigen`→`sich geeinigt`
- **529** L03 — `ihr alle` 2nd-pl agreement failure across LEGO (bare infinitives / missing finite verb)
- **567** L06 — `zuzusehen` after modals across whole LEGO → bare `zusehen`
- **580** L03 — `hinzubringen` after modals across whole LEGO → bare `hinbringen`

---

## ⚠️ Systematic issues LEFT (for Kai — not deleted, not grammar errors)

### 1. Lowercase bare-noun BUILD lemmas (course-wide)
Every seed's `L0xB01` bare-noun debut fragment is stored **lowercase** (`frau`, `gruppe`, `zeit`, `kinder`, `zug`, `italien`, `dienstag`…) while the same noun is correctly capitalized in every other phrase of the seed. All 6 reviewers independently confirmed this is **consistent course-wide** (a storage/generation convention, not per-phrase corruption). It affects ~80+ fragments across the reviewed range alone.
- **Not deleted:** deletion removes the noun debut and cannot fix casing; casing does not affect TTS.
- **Fix:** a course-wide bare-noun **capitalization PATCH sweep** (like the `eng_for_X` lowercase-`I` cap sweeps). Also includes: `S0639L01B01 ihnen`→`Ihnen` (meaning-changing: formal "you" vs "them"), `S0465` `Nächstes Mal`→`nächstes Mal` (adjective over-capitalized, 8×).

### 2. Present-vs-past tense-backshift in reported speech (seeds ~396–420)
~50 phrases: `ich dachte/wusste, dass wir … müssen/muss / ist/sind` where the known is past ("I thought we **had to**…"). Reviewer-2 flagged as a single root-cause defect.
- **Not deleted:** German does **not** mandate sequence-of-tense backshift — `ich dachte, dass wir gehen müssen` is grammatically valid. This is a **translation-fidelity / course-consistency** call, not a grammar error. Within the same seeds other modals (`sollte/wollte/konnte`) do backshift, so a consistency argument exists, but enforcing it is a methodology decision + targeted regen, not a delete-and-backfill.
- **Recommendation:** targeted regex/regen across 396–420 to backshift `müssen/muss`→`mussten/musste` and `ist/sind`→`war/waren` in `dachte/wusste`-framed clauses, IF Kai wants backshift enforced.

### Minor left / noted (grammatical, low impact)
- `S0420L03U05` extra modal `kann` (grammatical, slight meaning drift)
- `S0443L03B03` `den gleiche Ansatz`→`gleichen` (build fragment; adj declension)
- `S0457L04B03` `sehr verschiedenen`→`verschieden` (build predicate adj)
- `S0463L01B02` `meine Zimmer`→`mein Zimmer` (build; neuter)
- `S0544L02B02` `sie wäre recht`→`hätte recht` (build; isolated)
- `S0582L01B03` `möchte hier aufzuwachsen`→`aufwachsen` (build; modal+zu)
- Known-side English typos (`family live`, `please could we had to go`) — translate intent, batch to Ivan.
- Konjunktiv I reported speech (`er denke`/`er versuche`, S0636/S0638) — grammatically CORRECT, left intentionally.
