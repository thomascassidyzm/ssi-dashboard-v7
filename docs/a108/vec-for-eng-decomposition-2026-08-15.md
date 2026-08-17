# vec_for_eng — decomposition build report

**2026-08-15 · Venetian for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **30** | **638** |
| LEGOs | **0** | **86** | — |
| Practice phrases | **0** | **656** (247 BUILD + 409 USE) | — |
| Component rows | 0 | 63 | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**30 of 668 seeds (4.5%) are decomposed.** The course is **not** built. It is a
quality-gated opening block with everything downstream of decomposition in place for
those 30 seeds, and a clean runway to continue from seed 31.

**No TTS was run. No audio was generated.** `course_audio` still holds exactly the one
clip it held before this session. Kai's hard rule was observed without exception.

---

## Premise check — the brief was wrong about the tier

Verified against the live database before anything was written:

- `vec_for_eng` exists, created **2026-07-07**, status `draft`, visibility `hidden`.
- **668 seeds**, numbered 1–668 with no gaps, every one carrying a Venetian `target_text`.
- **0 LEGOs, 0 practice phrases** before this session. Confirmed.

**The census's "300-seed standard tier" is wrong.** The corpus is **668** — the same shape
as the nap_for_eng and yor_for_eng flagship builds. The census flagged this honestly as
inferred rather than read, and the inference did not hold. `courses.seed_count` is **NULL**,
so the tier still is not readable from the database; the 668 figure is the actual row count.
**Treat this as a 668-seed flagship build.**

---

## Orthography: which Venetian spelling do the existing seeds use?

**Verdict: Grafia Veneta Unitaria (GVU), the 1995 unified proposal — consistently, with
16 identified word-level exceptions.** Measured across all 668 seeds:

| GVU convention | What GVU prescribes | What the corpus does | Seeds |
|---|---|---|---|
| Evanescent L written `ł` | `ła`, `paroła`, `queło` | same | 344 |
| `x` for voiced /z/ | `xe`, `bixogno`, `piaxe`, `mexe` | same | 233 |
| `n` (not `m`) before p/b | `tenpo`, `inparar`, `senpre` | same; **zero** `m`+p/b counter-examples | 66 |
| Infinitive in `-ar` (apocopated) | `parlar`, `inparar`, `andar` | same | 322 |
| No doubled consonants | `bela` not `bella` | **zero** doubled consonants estate-wide | 0 |
| `ç` before front vowels | `scominçiar`, `atençion` | same | 7 |
| Venetian articles `el / ła / i / łe` | not Italian `il/la/le/lo` | same | 164 |

The two apparent `-are` Italianate infinitives and two `il/la/le/lo` hits are **false
positives** on inspection — `mare` (mother), `pare` (father), `vènare` (Friday) and the
object clitic `lo`. No Italianising drift was found.

### The real internal inconsistency: 16 words spelled two ways

This is in the **existing translation**, not introduced by this build. Nothing was
normalised — counts and evidence only, per the brief.

| Word | Variant A | Variant B |
|---|---|---|
| we want | `volemo` (2) | `vołemo` (3) |
| nearly | `squasi` (2) | `squaxi` (1) |
| work | `laoro` (4) | `łaoro` (2) |
| works | `laori` (2) | `łaori` (1) |
| there | `là` (9) | `łà` (2) |
| that | `quel` (6) | `queł` (3) |
| the last | `l'ùltima` (1) | `ł'ùltima` (1) |
| then | `laora` (2) | `łaora` (1) |
| so/then | `alora` (1) | `ałora` (1) |
| only | `solo` (1) | `soło` (6) |
| it | `lo` (2) | `ło` (8) |
| near | `visin` (2) | `vixin` (3) |
| half | `meso` (1) | `mexo` (2) |
| house | `casa` (1) | `caxa` (6) |
| to go | `'ndar` (2) | `ndar` (5) |
| with the | `co'l` (1) | `col` (3) |

Fourteen are the `ł`/`l` choice, two the `x`/`s` choice, two the apostrophe. In every
case the GVU-conformant spelling is the *majority* form for some words and the *minority*
form for others — so this is drift, not a competing house style.

**Exposure to tonight's build: 2 seeds.** `volemo` (S18) and `squasi` (S26). Both were
used exactly as the seed already spelled them. See speaker question G.

> **Careful:** `se`/`xe`, `so`/`xo` and `sa`/`xa` look like `x~s` splits but are
> **different words** (`se`=if, `xe`=is; `so`=his, `xo`=down; `sa`=knows, `xa`=already).
> They are excluded above. This is the same false-positive class as the apostrophe trap.

### Recommended authority

Kai ruled that the comparable Neapolitan course follows Neapolitan Wikipedia. **For
Venetian I recommend naming the Grafia Veneta Unitaria standard itself, not Venetian
Wikipedia**, for two reasons:

1. GVU is a **published, written-down standard** with explicit rules; Neapolitan has no
   equivalent, which is exactly why Wikipedia had to serve as the proxy there.
2. The corpus **already conforms to GVU** on every convention measured. Naming GVU
   ratifies what is there and gives an unambiguous rule for the 16 split words.

> **EXPLICIT GAP:** I did not verify this against `vec.wikipedia.org`. Worker **#689**,
> dispatched to do exactly that comparison, **died on an account rate-limit without
> delivering**. The conformance table above is my own measurement of the corpus against
> the GVU rules; it is *not* an independent second opinion, and it contains no sampled
> quotations from Venetian Wikipedia. Anyone who wants the Wikipedia comparison should
> re-dispatch that job.

---

## THE MIS-PAIRING SELF-CHECK — result, with method

The estate scan reports a defect from the shared decomposition machinery: a LEGO's known
and target sides fail to correspond because one side was sliced from a **different word in
the same seed sentence**. I ran three tests on my own output.

### Result: **0 instances of the estate defect in all 86 LEGOs.**

| Test | What it checks | Checked | Found |
|---|---|---|---|
| **T1 round-trip** | submitted JSON vs stored DB rows, **byte-exact** | 86 LEGOs (known, target, every component) | **0 drifted** |
| **T2 self-contradiction** | same known → different targets; same target → different knowns | 149 lego+component pairs | **0 known-side forks**; 4 convergences, all adjudicated legitimate |
| **T3 coverage** | every word of the seed claimed exactly once; nothing unclaimed | 30 seed sentences | **0 missing LEGOs**, **0 non-nesting overlaps** |
| **T4 untaught-word** | every phrase tiles from already-introduced whole chunks | 656 phrases | **0 violations** |

### Method, so the zero is checkable

Two false-positive classes were corrected before the numbers were taken — both inherited
from the nap build's run the same night, and both **would have fired here**:

1. **Apostrophes are letters, not punctuation.** Venetian `no vedo l'ora de`, `co'l`,
   `no'l`, `che'l` are distinct from `lora`, `col`, `nol`, `chel`. The normaliser strips
   sentence punctuation only; `'` and `’` are preserved in every sameness test.
2. **Intentional overlap ≠ double-claiming.** The methodology deliberately teaches a small
   unit inside a larger one. Discriminator applied: a real defect has two rows pointing at
   **different parts of the sentence with swapped counterparts**; intentional overlap has
   one target a literal **substring** of the other with the glosses nesting the same way.

I also added a third discriminator the nap run did not need, because Venetian forced it:

3. **Shared word ≠ shared claim — test the span.** Seed 17 `ła vol saver cosa che xe ła
   risposta` flagged L1 `ła vol` (*she wants*) against L3 `ła risposta` (*the answer*) as a
   non-nesting overlap. It is a **false positive**: `ła` simply occurs **twice** in that
   sentence as two different words. The four LEGOs occupy spans `[0-1] [2-2] [3-5] [6-7]`
   — **disjoint, covering all 8 words exactly once**. After adding the span test, this
   class resolves correctly and the hard-issue count is 0.

### The four convergences, adjudicated

All are one *target* carrying several English glosses — the **reception** direction, which
ZUT permits. None is a known-side fork (`0`), which is the direction ZUT actually governs.

- `parlar` ← *to speak* / *speaking* / *talking* — English splits infinitive from gerund; Venetian does not.
- `inparar` ← *to learn* / *learning* — same.
- `ła` ← *the* / *she* — genuinely one Venetian word doing two jobs. **Speaker question A.**
- `andar` ← *to go* / *go* — same word, differing only by the English infinitive marker. This is the one flagged *same-seed* (S25), and it is benign.

### Evidence about the tool

**86 of 86 LEGOs round-tripped byte-identical** — known side, target side, and every
component. Combined with the nap build's 93 of 93, that is **179 hand-authored LEGOs across
two unrelated language pairs with zero corruption in the submit path.** The estate defect
did not reproduce here. That is the expected-good answer, reported with its method rather
than as silence.

### The honest limit of this result

The self-contradiction test only catches a pairing that **contradicts another pairing in
the same course**. It **cannot** catch a pairing that is wrong **consistently everywhere**,
because nothing contradicts it. **A clean self-check does not mean this content is verified
correct.** Only a Venetian speaker closes that gap — see the questions document.

---

## The untaught-word rule

**0 violations across 656 phrases**, verified twice: once by the course-builder API at
submission (atomic — a failing seed inserts nothing), and once independently by replaying
introduction order straight from the database afterwards.

This was not free. Seeds 23–30 were **rejected on first submission** and nothing was
inserted for them. The blocking cause was a known-side breach of my own making: I wrote
`talk` in prompts when only `talking` had been introduced. **The gate does no stemming —
teaching "talking" does not license "talk".** Eight seeds were reworked and resubmitted
clean. Seed 1 also failed first time (a duplicate phrase and an under-filled USE basket)
and was restructured so that LEGO 1 carries `vojo parlar` as a molecule, which gives
LEGO 2 enough vocabulary to form a distinct USE phrase.

Also worth recording for the next agent: the phrase floors **ramp**. Seed 1 LEGO 1 needs
0 BUILD / 0 USE; the rest of seed 1 and seeds 2–3 need 1/1; **from seed 4 onward it is
3 BUILD / 5 USE per LEGO**, with at least 2 BUILD phrases genuinely recombining prior
vocabulary. Budget for that before authoring, not after.

---

## Method notes — where this departed from the standard process, and why

Followed `ralph-methodology.md` and the pair-contract layer throughout. Three deliberate
departures, all forced by Venetian:

1. **Pedagogical reordering against sentence order.** Seed 4 was authored `calcosa` →
   `dir` → `in vèneto` rather than sentence order, because `dir` (*to say*) alone forms no
   complete USE sentence without an object. Seed 10 and seed 17 were likewise reordered.
   The methodology licenses this explicitly (§Pedagogical Ordering).
2. **Clitics taught as whole chunks, never glossed separately.** `te parli` (*you speak*),
   `tuto el dì` (*all day*) and `el so nome` (*his name*) are single units. Glossing the
   clitics apart would have created two hard ZUT forks — `you` → `ti`/`te` and `the` →
   `ła`/`el`. Teaching the whole chunk is both correct Venetian and ZUT-clean.
3. **One ZUT fork fixed by re-glossing, not by contortion.** `catarse` and `conoser` both
   surface as English *to meet* (S18, S22). Rather than force one Venetian word onto both,
   `conoser` is taught as **"to get to know"**. Needs speaker confirmation — question B.

A **first-pass pair contract** is committed at `docs/pair-contracts/vec_for_eng.contract.cjs`
with `ratified: null`, recording the 4 measured gloss-synonyms, 6 bound gloss-units and 4
constructions with their verified carrier seeds (`going-to` → `farò`, S5; `negation` → `no`,
S10; `do-support` → `pàrlitu`, S14; `past` → `vołeva`, S30).

---

## Explicit gaps

1. **Worker #689 (orthography census) died on an account rate-limit, delivering nothing.**
   There is no independent second opinion on the orthography, and no comparison against
   `vec.wikipedia.org`. The census in this report is my own measurement.
2. **Worker #690 (ZUT fork / gloss map) had not returned when this report was written.**
   Its findings — a corpus-wide fork inventory across all 668 seeds — would strengthen the
   pair contract beyond the 30-seed band I measured directly. The contract should be
   revisited when it lands.
3. **638 of 668 seeds are not decomposed.** The course is 4.5% built.
4. **No Venetian speaker has seen any of this.** Ten questions are banked; nothing was
   fudged past them.
5. Seed 21's English says *her name* while its Venetian says `el so nome`, the same form
   taught for *his name* at seed 20. I kept the taught gloss consistent and avoided "her"
   in every practice phrase rather than guess. **Speaker question E.**

---

## Where to pick up

Resume at **seed 31**. Read the pair contract first, then this report's method notes. The
introduced-vocabulary list is server-injected in every `/api/seed/complete` response, so
it survives compaction — recombine BUILD phrases from that list rather than from memory.
