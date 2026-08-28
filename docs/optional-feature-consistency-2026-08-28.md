# Does each course pick one way and stick to it?

**43 of 49 courses do. Six do not. Four of those six are one bad authoring day each and are cheap to fix. Two are not — Egyptian Arabic and English-for-German — and those need a real pass.**

Survey only. Nothing was changed, no course row was touched, no audio was made.

## In fifteen seconds

Lots of languages let you say the same thing two ways — Spanish can say *"I found it"* with the word "I" or without it, German can address you formally or informally, Korean can be honorific or not. Neither way is wrong. What *is* wrong is a course that **teaches one way in a lesson and then drills the learner on the other way**, or that quietly changes its mind halfway through.

We checked 49 courses across a dozen such features, comparing each lesson against its own practice sentences.

| | |
|---|---|
| Courses checked | **49** |
| Internally consistent | **43** |
| Not consistent | **6** |
| …of those, one bad batch | **4** |
| …of those, a course-wide habit | **2** |

The two course-wide ones are **Egyptian Arabic** (`ara_eg_for_eng`) and **English for German speakers** (`eng_for_deu`). Everything else that came back dirty is a single day's authoring work that can be re-touched without disturbing the rest of the course.

*Vocabulary, once: a **lesson** is what the app calls a "lego" — the unit that introduces a bit of language. A **practice sentence** (or drill) is a "phrase" — what the learner is asked to produce. A **seed** is just a numbered position in the course.*

## What to do with the six

One row per repair. The column that matters is the last one.

| Course | The fix | Size |
|---|---|---|
| **Arabic (Egyptian)** | Drills say "I know" with the pronoun, lessons say it without — everywhere. Bring the drills in line with the lessons. | **FULL PASS** |
| **English for German** | 7.2% of contractions written out long ("I will" for "I'll"), scattered through the same day's work. Standardise on contracted. | **FULL PASS** |
| **Portuguese (Portugal)** | The 2026-02-11 batch reintroduced the subject pronoun (37% vs 1% the day before). Re-touch that batch to dropped. | **TARGETED BATCH RE-TOUCH** |
| **Portuguese (Brazil)** | The 2026-07-15 batch is 53% explicit against 5% in March. Re-touch that batch to dropped. *(First-person plural is a separate open question — see below.)* | **TARGETED BATCH RE-TOUCH** |
| **Korean for Hindi** | Seeds 642–653, written 29 July, use a different honorific register from the rest. Bring them back to the earlier form. | **TARGETED BATCH RE-TOUCH** |
| **Korean for English** | Three outliers inside the 2026-06-10 formal-address batch: one lesson whose drills drop the honorific, two plain lessons whose drills add it. Fix the three. | **TARGETED BATCH RE-TOUCH** |
| *(not one of the six)* **English for Hindi, Punjabi, Sinhala, Gujarati, Marathi, Telugu** | "I'll" written out as "I will" at seeds 465 and 490, dated 2026-07-17–21 — a later pass than the original build. Relabel back to each course's own majority. | **TARGETED BATCH RE-TOUCH**, six courses at once |

**How the count of six was arrived at, and one honest wrinkle.** Six is the number of courses whose *own* lessons and *own* drills disagree with each other: Egyptian Arabic, English-for-German, both Portuguese courses, Korean-for-Hindi and Korean-for-English. 43 + 6 = 49, and the arithmetic closes.

The "I'll → I will" cluster is a **seventh repair, not a seventh broken course**. Those six English-target courses are internally consistent — their lessons and drills agree with each other — but at two specific seeds a later authoring pass wrote the long form against each course's own majority everywhere else. It is the cheapest fix on this page (one relabel, six courses, two seeds each) and it would be a mistake to lose it just because it does not fit the "broken course" frame. It is listed above with the row it deserves and excluded from the six on purpose.

## The standard the six should be held to

**The pipeline can change convention cleanly when it means to.** This is the most useful result in the survey and it is not a defect at all.

- **German** switches from informal to formal address in a deliberate block at the end of each course — cued by "sir", sitting on a single date, at the tail of five courses. **0 disagreements in 1,757 pairs.**
- **Japanese** does the same for polite verb forms: 1,265 of 1,273 lessons plain, the polite ones in one unbroken run on one date. **0 disagreements in 223 pairs.**
- **Korean** does it for honorifics, in a small deliberate pocket per course.

**1,980 lesson-vs-drill pairs between German and Japanese, and not one of them contradicts itself.**

So the standard is not "never change register". The standard is:

> **A deliberate register change, in a block, is fine and good. A lesson disagreeing with its own drills is not.**

The six broken courses are not being asked to be uniform. They are being asked to look like German does.

## Korean honorifics, in full

The honorific `-시-` behaves nothing like the dropped pronoun. It is not spread across the course — it lives in **one deliberate formal-address pocket, under 1% of each course's lessons**. So "the course mostly drops it" is trivially true and tells you nothing. The only real question is whether the course is consistent *inside* that pocket.

| Course | Inside the pocket |
|---|---|
| **Korean for Tamil** | Clean — **0 disagreements in 11**, one register throughout, across several batches. No action. |
| **Korean for English** | Pocket is seeds 628–653, one 2026-06-10 batch. **3 of 12 lessons** disagree. Fix the three. |
| **Korean for Hindi** | Two registers split by a one-day boundary. **0 of 9** internal disagreements — the batches are each clean, they just disagree with each other. |

**Korean for Hindi in detail.** Seeds 14–527, written 27–28 July, use the informal-polite form. Seeds 642–653, written 29 July, use the formal-deferential one. Neither batch contradicts itself; the course simply changed its mind overnight.

And the point worth stating plainly: **bringing the 29 July batch back to the earlier form does more than make the course internally consistent.** At those identical seed numbers, teaching identical content, *both* sibling Korean courses use the earlier form — and so does this course's own default. The repair aligns Korean-for-Hindi with itself, with Korean-for-English, with Korean-for-Tamil, and with the convention the course otherwise keeps. There is no trade-off to weigh here.

## The open call — nobody can settle this but you

**Brazilian Portuguese, first-person plural, sits at 53% / 47%.**

Every other recommendation on this page says the same thing: *go with what the course already mostly does.* That works because there is always a clear majority to defer to. Here there isn't one — it is a coin-flip, and the course has genuinely not made a choice.

The two options:

1. **Standardise on the dropped form** — matches what the rest of the course does with the singular, and matches every other Portuguese and Spanish course in the estate.
2. **Standardise on the explicit form** — matches how a great many Brazilian speakers actually talk, and is the register the July batch drifted towards.

This is a taste call, not a repair. It is recorded here open, on purpose.

## Worth a separate look, outside this brief

**An Egyptian Arabic drill was found containing Lebanese forms** — `إنو` and `بتحكي` — sitting inside the Egyptian course.

That is dialect mixing, not an optional-feature inconsistency, so **this scan did not measure it and the amount of it is unknown**. It is flagged here rather than dropped, because it did not fit the brief and would otherwise disappear. It deserves its own look.

## What came back empty, and where this survey stops

**This is the honesty section, not more findings.** Everything below is either a feature we looked for and did not find, or a place where the survey deliberately stopped. It is recorded so nobody pays to look twice, and so the numbers above are not read as covering more than they do.

### Checked, came back empty

- **Arabic two-way spellings — EMPTY.** What looks like variant spellings is diacritics present in some rows and absent in others. A rendering artefact, not a choice anybody made.
- **Chinese measure words and the `了` particle — EMPTY.** Four courses, **0 real disagreements**.
- **French `il y a` vs `y a` — a NON-FINDING after a bug fix.** The first pass mis-read `il n'y a pas` as a dropped form. Once corrected, there was nothing there.

### Gaps — not clean results

- **German dropped final `-e`** (`ich hab` vs `ich habe`) — **NEVER EXERCISED.** 487 instances, every single one the full form. You cannot be inconsistent about something the course never does. **This is a gap, not a pass.**
- **The Japanese topic particle — NOT TESTABLE.** A trustworthy test needs a dictionary or a morphology table, which was ruled out. It remains an open candidate and was **not tested at all**.
- **French `tu` vs `vous` — DELIBERATELY NOT SCORED.** It looks like 78%/22% variation, but the outliers are grammatically *forced* plurals ("are you all ready") and deliberate honorific address ("with you sir"). Singular-informal was never separated from plural-formal, so **those counts must not be read as a defect**.
- **French `on` vs `nous` on the Japanese and Chinese known sides — UNANCHORABLE.** No reliable anchor exists on those known sides, and nothing was substituted for it. Not measured.
- **German Perfekt vs Präteritum — A ~40-LESSON SPOT CHECK, NOT A CENSUS.** The pattern found is normal German verb-by-verb selection rather than free variation. Closing it properly needs a verb-by-verb sweep, which was not run.
- **Korean detection used four unambiguous honorific endings only.** Single-syllable markers were rejected because they collide with ordinary words — "again", "start", "time", "office", "mistake", "fact". Rarer honorific forms would have been missed.
- **Italian Lei/tu — TOO SMALL TO CALL.** Only 33 instances exist. Each lesson is internally consistent, but this is **reported unresolved, not cleared**.
- **Chinese possessive `的` and the `是…的` frame** — one spot-checked at 7 instances, the other never reached.
- **One Chinese-target course is thin** (1–12 instances per feature), so its clear verdict carries less weight than its siblings'.
- **The calibration example did not reproduce.** The Korean lesson named in the original brief is fully consistent live. The live analogue was found elsewhere in the same course and is reported above. Live database rows were used throughout; no document was treated as an authority.

## One more thing worth a word from you

**Seed 87, across all 19 English-target courses.** "they are people" is written out long in essentially every English-target course, while every neighbouring "they're" lesson is contracted. Same seed, same choice, in courses built months apart.

That repetition says *template decision*, not drift — but it does contradict the pattern used everywhere else in the same course. Intentional or not?

## Every course, one line each

The full detail behind the summary. Format: **direction (counts) · lesson-vs-own-drill disagreement · clustered or scattered · what to do**

### Pro-drop — the subject pronoun

| Course | Finding |
|---|---|
| **Portuguese (Portugal)** | Dropped 2,976 / explicit 1,070 in 1st person · **64 of 1,149** · **clustered by date** (Feb 10 batch 1%, Feb 11 batch 37%) · standardise dropped, re-touch the mixed batches |
| **Portuguese (Brazil)** | Dropped 80% of phrases but only 57% of lessons · **99 of 1,058** · **clustered hard** (Jul 15 batch 53% explicit vs Mar 12 batch 5%) · standardise dropped; 1st-person plural needs a human call |
| **Portuguese for Japanese** | Dropped 99.3% of lessons · 32 of 1,837 · lightly clustered, rising with seed number · keep dropped, incidental cleanup |
| **Spanish (Spain)** | Dropped 6,340 / explicit **0** in 1st person · 3 of 2,059 · nothing to cluster · already consistent; 15 stray `tú` rows on two dates |
| **Spanish (Mexico)** | Dropped 4,017 / explicit **0** · 2 of 1,499 · nothing to cluster · already consistent; matches Spain on every person |
| **Spanish for Japanese** | Dropped 625 of 629 lessons · 45 of 6,960 · **clustered by lesson** — 8 named lessons, all ambiguous 3rd-person verbs · fix the 8, not the course |
| **Spanish for Chinese** | Dropped 570 of 574 lessons · 20 of 4,227 · **clustered by lesson** — 6 named lessons, same cause · fix the 6 |
| **Italian** | Dropped 97.2%; 1st person 100% · 3 of 2,373 · scattered but each exception self-consistent · convert 9 exception lessons |
| **Italian for Japanese** | Dropped; 7 of 601 lessons explicit · small · scattered · fix a named handful |
| **Italian for Chinese** | Dropped; 5 of 644 lessons explicit · small · scattered · fix a named handful |
| **Arabic (MSA)** | Dropped 94–100% every person · 33 of 2,406 · scattered, low everywhere · keep dropped |
| **Arabic (Lebanese)** | Dropped — 154/154, 104/104, 57/57 · **22 of 2,609** · nothing to cluster · the most consistent course found |
| **Arabic (Egyptian)** | Lessons dropped 89%, **drills explicit 54%** · **425 of 2,296 (18.5%)** · **scattered — every batch, every date** · bring the drills in line with the lessons |
| **Japanese** | 1st person dropped 35/35 · none · categorical · no action (3rd person too thin to judge) |
| **Chinese ×4 courses** | Subject pronoun uniform · **0 real disagreements** · nothing to cluster · no action |

### Korean honorific `-시-`

| Course | Finding |
|---|---|
| **Korean for English** | Honorific pocket = seeds 628–653, one batch · **3 of 12 lessons** · **clustered** in that single 2026-06-10 batch · fix 3 outliers |
| **Korean for Hindi** | Two registers split by a one-day boundary — 4 lessons informal-polite, 5 formal-deferential · **0 of 9** · **clustered, clean date boundary** · bring the later batch into line |
| **Korean for Tamil** | One register throughout · **0 of 11** · consistent across several batches · no action |

### Other optional features found while looking

| Course / feature | Finding |
|---|---|
| **German — informal vs formal "you"** ×5 courses | **0 disagreements** in 1,757 pairs · formal block at the tail of each course, single date, cued by "sir" · **deliberate register arc, not a defect** |
| **Japanese — polite vs plain form** | 1,265 of 1,273 lessons plain; polite ones in one unbroken run, one date · **0 of 223** · **deliberate teaching block** · no action |
| **French — dropping `ne`** ×4 courses | 99% explicit in France/Japanese/Chinese courses; 99.4% **dropped** in Quebec (correct for the vernacular) · **0 disagreements in all four** · clean ~35 colloquial outliers in the France course |
| **French — `on` vs `nous`** | `nous` 841 / `on` 144 in France course · 1 of 579 · **scattered — a habit, not a batch** · a deliberate pass if wanted; Quebec correctly keeps `on` |
| **19 English-target courses — contractions** | All 92–100% contracted · essentially **zero** lesson-vs-drill disagreement (max 4 in ~1,000) · two clusters worth fixing |
| **English for Hindi/Punjabi/Sinhala/Gujarati/Marathi/Telugu** | "I'll" becomes "I will" at seeds 465 and 490, all dated 2026-07-17–21 — a later pass than the original build · **clean batch signature** · relabel back to each course's own majority |
| **English for German speakers** | 7.2% expanded — the worst of the 19 · **same-day scatter**, no batch boundary · small but habit-shaped |
| **Italian — Lei/tu** | Only 33 instances exist; each lesson internally consistent · **too small to call** — reported unresolved, not cleared |

## How this was measured

Two detectors, both conservative, both eyeballed before anything was counted.

Where the known side is English, the English subject pronoun anchors the question: the lesson says "I found", so does the target say it with the pronoun or without? Where the known side is Japanese, Chinese, Hindi or Tamil — languages that drop pronouns themselves — that anchor is useless, so a second method compares each lesson's own wording against its own drills directly.

**Counts are bucketed by grammatical person, and that turned out to be essential.** Portuguese third person is 98% explicit and Spanish third person 59% — because the verb alone doesn't say who did it. Merging persons into one number would have reported both languages as wildly inconsistent when they are doing exactly the right thing. Only first person, and informal "you", are genuinely optional.

Several false trails were caught and discarded before they became findings: unaccented `tu` and `el` in Spanish are the possessive and the article, not pronouns (≈240 phantom findings avoided); Austrian `des` is a demonstrative, not a genitive; `il n'y a pas` is not a dropped `y a`; "have to" never contracts to "I've to"; and across several languages, bare-stem drilling fragments look like disagreements but are not sentences.
