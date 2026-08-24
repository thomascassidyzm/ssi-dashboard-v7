# nap_for_eng — decomposition build report

**2026-08-15 · Neapolitan for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **30** | **638** |
| LEGOs | **0** | **93** | — |
| Practice phrases | **0** | **707** (270 BUILD + 437 USE) | — |
| Component rows | 0 | 86 | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**30 of 668 seeds (4.5%) are decomposed.** The course is *not* built. It is a solid,
quality-checked opening block with everything downstream of decomposition in place for those 30
seeds, and a clean runway for the next agent to continue from seed 31.

**No TTS was run. No audio was generated. `course_audio` still holds exactly the one clip it held
before this session.** Kai's hard rule was observed without exception.

---

## Premise check (done first, before anything was written)

The scout's description was verified against the live database, not assumed:

- `nap_for_eng` exists, created **2026-07-07**, status `draft`, visibility `hidden`.
- **668 seeds**, numbered 1–668 with no gaps, every one carrying a Neapolitan `target_text`.
- **0 LEGOs, 0 practice phrases** before this session.

The premise was correct, so the build proceeded.

---

## Orthography: does the existing translation follow Neapolitan Wikipedia?

**Verdict: YES. The 668 existing translations already follow Neapolitan Wikipedia conventions.
This is not a systematic divergence and nothing needed normalising.** Kai's ruling and the corpus
agree — which is the good outcome, and worth stating plainly because the brief expected it might
not be.

Measured across all 668 seeds against nap.wikipedia.org (its articles *Lengua napulitana* and
*Napule*):

| Convention | Neapolitan Wikipedia | The corpus | Seeds affected |
|---|---|---|---|
| Definite article | `'o` / `'a` / `'e` with leading apostrophe — *"'A cità 'e Napule"* | Identical | 290 |
| Bare `lo`/`la`/`le` articles | not used | not used | 0 |
| Final-stressed infinitives take a grave accent | `vedé`, `fà` | `parlà`, `sapé`, `fà`, `vedé` | throughout |
| Syntactic doubling written into the spelling | `cchiù`, `ddoje`, `ggente`, `tturiste` | `cu tte`, `cu mme`, `ê sseje`, `chelli pperzone` | 111 |
| Doubling after `cu` | present | present in 5/5 cases; **zero** counter-examples | 5 |
| `d''o` / `d''a` double-apostrophe contraction | *"d''o paese"*, *"d''a Magna Grecia"* | same form used | 24 |
| Circumflex contractions `ô` / `ê` / `â` | *"Int'ô XIII seculo"* | `int'â borza`, `ô stesso tiempo`, `ê sseje` | 19 |
| `cchiù`, `assaje`, `mo`, `cu` | as spelled | as spelled | throughout |

### The one real inconsistency found

The corpus spells the "in / on" prefix **three different ways**, and none of them quite matches
Wikipedia's. This is an internal inconsistency in the existing translation, not something this
build introduced:

| Spelling | Seeds | Example |
|---|---|---|
| `'n` as a separate word | 4 (S4, S160, S379, S462) | `dicere quaccosa **'n** napulitano` |
| `'ncopp'a` joined, with apostrophe | 12 (S83, S84, S133, S134, S195, S358 …) | `ditto **'ncopp'a** ll'amico tujo` |
| `ncopp'a` joined, no apostrophe | 1 (S310) | `scrivere na storia **ncopp'a** chill'ommo` |

Neapolitan Wikipedia writes it joined, with **no** leading apostrophe and with a **g**:
`'A cità 'e Napule sta **ngopp'a** cinche culline`.

Seed 195 additionally has `'ncopp''a tavula` with two apostrophes where seed 83 has one — probably
a typo. **This is a ruling for a Neapolitan speaker, not a normalisation to run silently** — see
question F in the native-speaker list. Total exposure is 17 seeds; none of them is in the 1–30 band
built tonight, so nothing built tonight is affected.

---

## What was built, and how

Method followed: `ralph-methodology.md` + `.claude/commands/layered-decomposition-brief.md` +
`synonym-choice-architecture.md`. Calibrated against **`ita_for_eng`** — the closest existing
sibling course, whose seeds map almost one-to-one onto the Neapolitan ones — so the English known
side stays consistent with the rest of the estate.

Every seed went in through `POST /api/seed/complete` on the live course-builder, which means every
one of them passed, atomically: tiling, ZUT, the 8-syllable LEGO cap, phrase containment, the
BUILD anti-template gate, and the vocabulary gate.

Shape of the result: 3.1 LEGOs per seed, 23.6 practice phrases per seed, USE outnumbering BUILD
1.6 : 1.

### The untaught-word rule — the check, and its result

> *A practice phrase may only use LEGOs the learner has already been taught at that point.*

This was checked **as the build ran** (the API rejects a violating seed outright and inserts
nothing — it did so 9 times, and each rejection was fixed rather than bypassed), and then
**re-verified independently afterwards**: a separate script read all 93 LEGOs and all 707 phrases
back out of the database, rebuilt the learner's vocabulary in strict seed-then-LEGO order, and
re-tiled every phrase from scratch.

**Result: 707 phrases checked, 0 violations.**

Three near-misses the gate caught and that are worth knowing about:

- The known side is policed too, and it does **no** stemming. `"I like coming back"` was rejected
  because only `come back` had been taught, not `coming`. Prompts were rewritten, not waved through.
- `'o cchiù spisso ca pozzo` literally means "as often as **I** can". It has been kept off every
  *you*-subject sentence in the course. That is a deliberate restriction, flagged for a speaker.
- Contractions are brittle: `can't` fails the gate (it stems to a non-word), `don't` passes. Where
  `can't` was wanted, the sentence was rewritten rather than forced.

---

## Two things produced alongside the content

**1. A pair-contract for the language pair** — `docs/pair-contracts/nap_for_eng.contract.cjs`.
The methodology says to derive one on first contact with a pair, and there was none. It records
the convergences found in the corpus (`pruvà` = try *and* practise; `chello ca` = "what"), the
bound English units (`as often as possible`, `as hard as I can`), and which English machinery is
licensed by which Neapolitan carrier (`I'm going to` by `aggi'a` at seed 5; negation by `nun` at
seed 10). It is deliberately marked **`ratified: null`** — nobody here speaks Neapolitan, so it
runs advisory until a speaker signs it off.

**2. A native-speaker question list** —
`docs/a108/nap-for-eng-native-speaker-questions-2026-08-15.md`. Nine areas, in plain English, that
a Neapolitan speaker with no technical knowledge can answer. Four are marked BLOCKING, meaning the
course currently teaches a guess. The biggest by far is **where the little words me/te/ce go**
(section A): the existing translations put them in two different places, and until that is ruled
on, whole classes of sentence are being avoided — which is why the "remember" lesson at seed 6 is
thinner than it should be.

---

## Explicit gaps

1. **638 of 668 seeds are not decomposed.** The course is 4.5% built. Seeds 31 onward are
   untouched.
2. **The pair-contract is written but not live.** The running course-builder service executes from
   a *different* checkout (`ssi-dashboard-v7-clean-prod`, on `main`), which is outside this
   session's workspace. The contract therefore sat on the branch while the build ran, and the
   known-side gate used the generic `_default_eng` fallback instead. Practical effect: the gate was
   **stricter**, not looser (it flagged `going to` as unlicensed 11 times as harmless warnings), so
   no bad content got through because of it. It becomes active only when the branch reaches `main`
   and the service restarts.
3. **Three sonnet workers finished but their reports never reached this conversation.**
   #631 (orthography audit), #633 (ZUT fork map), #634 (morphology sheet) all exited 0 and are
   marked `done`, but the surface only exposes a truncated one-line summary and no API route serves
   the body. Their full findings are readable in their own worker chats. **The orthography question
   was therefore redone from scratch in the main session** — the table above is first-hand
   measurement of all 668 seeds plus direct fetches of nap.wikipedia.org, not a restatement of
   #631's summary.
4. **No Neapolitan speaker has reviewed any of this.** Self-assessed USE scores average about 7.4
   and are honest about the weak ones (thirteen phrases scored 6, none below 6), but a self-score
   from a non-speaker is a statement about pedagogical shape, not about whether a Neapolitan would
   say it.
5. **No QA checkpoint ran.** Checkpoint 1 (after seed 10) auto-approved rather than spawning the QA
   agent. `/checkpoint-qa` has not been run against this content.

---

## Addendum — the three worker reports landed after this was written

All three sonnet workers (#631 orthography, #633 ZUT forks, #634 morphology) delivered after the
first version of this report. Gap 3 above is therefore **closed**. What they change:

**1. A fork that touches content already built — needs a ruling.** #633 found, and I verified
directly against all 668 seeds, that "he/she wants" is spelled **three** ways: `vole` (4 seeds —
16, 17, 34, 35), `vò` (9 seeds — 177, 299–304, 469, 480), `vo'` (3 seeds — 222, 230, 533). `vole`
appears *only* in the 16–35 band and never again. **The build teaches `vole`** — it is the "he
wants" card at seed 16 and "she wants" at seed 17, and it is in **47 practice sentences now in the
database**. If a speaker rules for `vò`, those two LEGOs and 47 phrases need rewriting (and, under
Kai's standing rule, the presentations that introduce them in the same pass). This is now question
**A0**, at the top of the speaker list, and it is the only open question that implicates built
content.

**2. Strong evidence on the clitic question (was BLOCKING A1).** #634 swept the corpus and found
**no** case anywhere of a clitic suffixed to an infinitive — Neapolitan here never does the Italian
*ricordarmi*; with `voglio`/`pozzo`/`aggi'a` the clitic climbs to the front. That points at
`me voglio arricurdà`, i.e. the form the build deliberately avoided was indeed the wrong one. It is
corpus inference, not a speaker's judgement, so A1 stays open — but the caution was correct and the
question is now much cheaper to answer.

**3. Two more forks, both beyond seed 30, added as A4 and A5.** "need to" splits between the
`aggi'a`/`avimm'a` family and `tené bisogno 'e` with no visible pattern (lands ~seed 104), and
`ampressa` already covers *soon* as well as *quickly*, which makes the course's separate `priesto`
(taught at seed 23) look like free variation.

**4. Corroboration, no change needed.** #633 independently reached the same call the build made on
"more" — bare `cchiù` premodifies, `'e cchiù` postmodifies — which is exactly how seed 23 teaches
it. It also confirms English "that" needs three-way known-side splitting (`ca` complementiser /
`chello ca` relative / `chesto` demonstrative); the build has split the first two correctly and has
not yet reached the third.

**5. One correction to the orthography table above.** #631 established that **nap.wikipedia has no
codified orthography or style guide at all** — a full-text search returns only an unrelated 1789
Wikisource document. Every "what Wikipedia does" cell in the table above is therefore *observed
usage in live articles*, which is the best available proxy for Kai's ruling but is not itself a
ruled convention. #631 also notes that Wikipedia's `d''o`/`d''a` doubled apostrophe is produced by
a template emitting curly marks to stop MediaWiki reading `''` as italics — so the corpus's
straight-apostrophe `d''o` is very likely the same convention, not a divergence, but the rendering
difference is a wiki artifact rather than a typographic choice. The verdict is unchanged: **broadly
aligned, no smoking-gun divergence, nothing to normalise.**

**6. A morphology fact worth having before seed 73.** #634 established that `avé` and `tené` are
two verbs in this corpus, not one: `avé` (aggio/haje/ha/avimmo) is the perfect **auxiliary only**,
`tené` (tengo/tiene/tene/tenimmo) is **possession**. Seeds 73 and 75 (`tengo cchiù cose 'a 'mparà`)
depend on it. `essere` is also a perfect auxiliary, restricted to reflexives and reciprocals
(`te si' scurdato`, `ce simmo viste`).

---

## Mis-pairing self-check (estate scan, 2026-08-15)

Full write-up: `docs/a108/nap-for-eng-mispairing-selfcheck-2026-08-15.md`.

Ran against all 93 LEGOs and 86 component rows produced tonight, in response to the confirmed
estate defect class (a LEGO whose known and target sides don't correspond because one was sliced
from a different word in the same seed).

- **Zero instances of the estate defect.** No known or target side borrowed from a sibling LEGO.
- **Zero missing LEGOs** — every word of all 30 seed sentences is taught.
- **93 of 93 LEGOs round-tripped byte-identically** between the JSON I submitted and the rows the
  API stored — known side, target side, every component. The shared machinery altered nothing on
  the `/api/seed/complete` path.
- **One real defect found and fixed**, of a different kind: S25L2 had two learner-facing cards both
  prompting "before" (`primma ca` and `primma`) — a plain ZUT collision from a gloss I duplicated
  when splitting a chunk, not a mis-slice. The component is now `introduce:false`; no text changed;
  untaught-word check re-verified at 707 phrases, 0 violations.
- Two false-positive classes flagged for whoever runs the estate scan: **stripping apostrophes**
  merges `'e` ("of") with `e` ("and") and will fire across every apostrophe-heavy orthography, and
  **intentional A-inside-M overlap** produced 8 "double-claim" hits in 30 seeds.

---

## Where the next agent picks up

Next seed is **31** (`vulive parlà cu mme stasera` — "You wanted to speak with me tonight").
Everything needed is on the branch: the authored seed files under `.a108-nap/` show the working
format, `submit.cjs` posts them, `lint.cjs` catches most rejections before they cost a round trip,
and `verify-untaught.cjs` re-checks the whole course from the database.

Before seed 51 someone should settle question **D1** — `me piace` vs `me piace 'e` — because seed
51 contradicts what seeds 26–29 currently teach.
