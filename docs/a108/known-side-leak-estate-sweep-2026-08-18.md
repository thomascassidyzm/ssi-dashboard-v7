# Known-side language leaks — estate sweep

**For Kai · 2026-08-18 · sweep of all 145 courses, 1,008,468 known-side rows**

A "known-side leak" is target-language text sitting in the English (known) prompt field,
so the learner reads a word in a language they do not know. Deborah found it as `yaskot`
in `ara_lb_for_eng`. This is the estate-wide follow-through.

---

## 1. Why that phrase kept coming up

**It was never the phrase. It was the slot.**

Seed **S0034** — *"He doesn't want to be quiet when other people are here"* — is shared
master English text carrying a "quiet" lego in roughly **50** of the English-known courses.
It is the one prompt guaranteed to appear in every course Deborah reviews. So a defect
sitting in that slot looks like "this phrase keeps breaking" when it is really
"this slot is the one I always see."

The same authoring session left **four more** romanised Arabic words in English slots on
unrelated legos: `yihki` (S0034L02B01), `bido` (S0034L03B01), `baddha` (S0035L01B01),
`min` (S0038L02B01). Same session, different phrases — so the phrase was never the variable.

---

## 2. What actually broke, and the `target_phrase_id` thread

The open lead was that the leaked rows had `target_phrase_id` NULL. **I pulled that thread
and it does not lead anywhere — but the reason it doesn't is itself the finding.**

| | rows |
|---|---|
| phrase rows estate-wide | 831,932 |
| with `target_phrase_id` NULL | **825,348 (99.2%)** |
| courses with *any* non-NULL | **3 of 117** |

Only `eng_template` is fully populated. `ara_for_eng` has 42 and `eus_for_spa` has 437.
NULL is the estate default, not a fingerprint — **every** row in **every** normally-built
course is NULL. It tells us only that these rows came through the ordinary build path
(`/api/seed/complete`), not the translate path. That kills the lead, and it independently
confirms the earlier verdict that the target-for-known fallback in `seed-translate.cjs`
built almost nothing and caused none of this.

**So where did they come from?** Three pieces of evidence:

1. **Timing.** The leaked rows were created `2026-05-14 19:45:45` — in the *same batch* as
   their clean siblings. Not a bad migration, not a bad backfill. One authoring pass that
   was mostly right.
2. **Role.** `build` phrases are **34.6%** of the estate but **71.3%** of confirmed leaks
   (365 of 512) — a **2.1× enrichment**. `use` phrases are 55% of the estate but 17% of
   leaks. **Zero** seeds leaked. Build phrases are where a *new* lego's English gloss is
   authored fresh; seeds carry shared master English and are clean.
3. **Spelling.** The course romanises that verb `yiskat` / `yuskit` / `yuskat` / `yiskit`.
   It never once writes `yaskot`. The leak used a **different romanisation scheme than the
   course's own data** — so it was not copied from any field. It was independently
   romanised by the authoring model.

**Diagnosis: an authoring-time LLM error.** When the model had to write the English gloss
for a brand-new lego and didn't commit to one, it emitted the romanised target word instead.

### Can it happen again?

I replayed all seven confirmed leaks through the **current** known-side vocab gate,
rebuilt from the live `ara_lb_for_eng` lego set (1,546 legos, 871 known-side stems):

```
BLOCK  "yaskot"               unknown gloss "yaskot"
BLOCK  "doesn't want yaskot"  unknown gloss "yaskot"
BLOCK  "yaskot today"         unknown gloss "yaskot"
BLOCK  "yihki"                unknown gloss "yihki"
BLOCK  "bido"                 unknown gloss "bido"
BLOCK  "baddha"               unknown gloss "baddha"
BLOCK  "min"                  unknown gloss "min"
PASS   "be quiet"             (correct English — clean)
PASS   "he doesn't want to be quiet"
```

**7/7 blocked, both correct forms pass.** The gate's `_default_eng` contract fallback landed
**2026-07-27** — ten weeks *after* these rows were written on 2026-05-14. The hole is closed
for this course.

**But it is still open elsewhere.** The gate is skipped entirely for any course with no pair
contract:

| | courses |
|---|---|
| covered by the known-side vocab gate | **85 / 145** |
| **no contract → gate silently skipped** | **60** |

All 60 are non-English-known (`por_for_jpn`, `spa_for_jpn`, `zho_for_jpn`, `eng_for_kor`,
`eng_for_spa`, …). **Every course in the largest leak population below sits in that blind
spot.** That is not a coincidence — it is the same defect in the courses nothing is watching.

Note the gate is a *submit-time* gate. It blocks new bad rows; it has never looked at the
~1M rows already in the database. Nothing does. That is why this sweep found what it found.

---

## 3. The sweep — two halves, no gaps, no overlaps

Split by **detectability**, which is the only split with no seam:

- **Half A — script mismatch.** Known-side text containing a writing system the known
  language doesn't use. Keyed to **each course's own `known_lang`** from the `courses`
  table — never "known side should be Latin", which is false for the 66 courses whose known
  side is Japanese, Chinese, Welsh, Hindi, Tamil, Arabic, etc. Each of the 25 known languages
  got its own allowed-script set.
- **Half B — romanised / Latin script.** Everything Half A structurally cannot see, because
  `yaskot` is Latin letters. Detected instead by *vocabulary*, not script.

Every row went through exactly one half based on whether its offending token was in a foreign
script. Nothing was examined twice; nothing was skipped.

### Half A funnel

| step | rows |
|---|---|
| raw script-mismatch hits | **42,709** |
| − CJK punctuation `。、！？` in Japanese/Chinese/Korean-known courses (legitimate) | −37,250 |
| − shared Indic danda `।` U+0964, which sits in the *Devanagari* block but is standard punctuation in Bengali, Gurmukhi, Kannada too | −4,285 |
| **after removing two systematic false-positive classes** | **1,174** |

Those two classes were **97.3%** of the raw count. A raw hit count here would have been
worthless.

### Half B funnel

The English master corpus is shared estate-wide, so a genuine English token appears in *many*
courses while a leaked target word is course-local. I built the lexicon from the estate itself
(79 English-known courses, 627,559 rows, 3,742 distinct English tokens) — there is no system
dictionary on this machine.

| step | rows |
|---|---|
| raw: row contains a token with course-frequency ≤3 | **35,246** |
| − language/nationality names (`Spanish`, `Welsh` — legitimately course-local English) | −23,554 |
| − proper nouns (77 tokens that only ever appear capitalised) | −242 |
| − tighten to tokens in exactly **one** course estate-wide | −6,964 |
| candidates | **4,486** |
| **stage 5:** token also appears in that course's **own target corpus** (`target_text`, or `target_text_roman` for non-Latin targets) | **561** |
| **stage 5b:** fuzzy recovery from the residual | **+69** |
| **into triage** | **630** |

**Calibration, run before any number was reported:** the seven confirmed `yaskot`-family
strings were replayed through the detector. **7/7 flagged.** Stage 5 alone caught only 4/5 —
`yaskot` failed because the course spells it `yiskat`, not `yaskot`. Stage 5b (edit distance
≤2) recovered it: **5/5 end-to-end**. Stage 5b is deliberately low-precision — 69 recoveries
of which most are junk (`azure~az'ra`, `cease~chast`) — and its output was triaged by hand,
not counted.

---

## 4. What is actually broken

### Half B — romanised leaks (630 triaged)

| bucket | rows | with audio |
|---|---|---|
| **A · untranslated row** — known field is the target text (352 byte-identical) | **364** | 73 |
| **B · interleaved — the `yaskot` pattern** — English sentence with target words spliced in | **120** | 71 |
| **C · bare romanisation** — the exact shape of `yaskot` | **14** | 14 |
| D · parenthetical annotation (counted in §5, not here) | 50 | 49 |
| **E · FALSE POSITIVE** — real English loanwords (`québécois`, `pronto`) | **82** | — |

**498 real defects.** Worst concentrations: `deu_ch_for_eng` 291 untranslated (Swiss German
prompt = Swiss German answer, no audio attached), `spa_mx_for_eng` 54, `gla_for_eng` 49
interleaved, `gle_for_eng` 31, `swe_for_eng` 20, `hye_for_eng` 21.

**Bucket C is `yaskot` living elsewhere** — `hye_for_eng` has 10 bare romanised Armenian
words in English slots (`dzhvar` → դժվար, `gisher` → հանդիպեծի, `ognutyun` → ոգնուտյուն).
Same defect, same shape, different course, never reported.

Bucket B reads exactly like Deborah's find:
> `gla_for_eng` — *"I want to know **cuin** I will be ready"*
> `gle_for_eng` — *"I think that **athraíonn sé** everything when you understand that mistakes are fine"*

### Half A — script mismatches (1,174 triaged)

| finding | rows | with audio |
|---|---|---|
| **Untranslated English known side in Japanese-known courses** (`por_for_jpn` 277, `zho_for_jpn` 50) | **328** | 51 |
| **Target leak into known side** (`por_for_jpn` 103, `eng_for_sin` 7, `eng_for_jpn` 2) | **113** | 10 |
| **Language-name placeholder never substituted** — `"彼女、German話せる。"` | **62** | 24 |
| CJK full stop `。` in a non-CJK English/Tamil prompt | **490** | 30 |
| Parenthetical annotations (§5) | 103 | 89 |
| Inverted components JSON | 6 | 0 |
| **PROPER NOUN — false positive** (`Jane` in Hindi prompts) | **28** | — |
| Corrupt single codepoints in Kannada (known corpus corruption, not a leak) | 2 | — |

**The language-name placeholder also leaked into the target side** — `zho_for_jpn` S0285
has `target_text = "她会说Chinese。"`. A Chinese sentence with the English word "Chinese" in
it, which a Chinese voice will read aloud. That is a template-substitution bug, not a
translation error.

---

## 5. The parenthetical-annotation defect — the count was wrong

Grammar notes written for authors, shown to learners: *"I understand (1sg present indicative
of فهمیدن)"*, *"differently (with -లా)"*, *"known (past participle)"*.

The previous figure was **31 legos**. **The real number is 2,035 rows** (1,575 legos + 460
phrases) across 25 courses. The two reconcile: **31** counted only the narrow subclass with
non-Latin *target script inside the parenthesis*, in English-known courses. Estate-wide that
subclass is **128** — the extra 97 are in non-English-known courses (`spa_for_jpn` 86,
`por_for_jpn` 12) that the earlier pass never looked at.

Worst: `tel_for_eng` 364, `nep_for_eng` 286, `fas_for_eng` 159, `swa_for_eng` 146,
`ron_for_eng` 122, `est_for_eng` 114. **1,619 have a known-side clip; 1,421 have a
presentation clip** — voices may be reading the metalanguage aloud.

**The number that matters is the collisions.** Stripping the parenthetical looks mechanical,
but for **276 rows (58 lego groups)** the annotation is the *only* thing preventing a ZUT
violation — two legos whose English collapses to one prompt with two different target forms:

| stripped prompt | course | two targets |
|---|---|---|
| `I understand` | fas_for_eng | می‌فهمم / بفهمم |
| `said` | swe_for_eng | sagt / sa |
| `knows` | isl_for_eng | viti / þekkir |
| `we` | hin_for_eng | हमें / हमने |
| `your` | nep_for_eng | तपाईंकी / तपाईंको |

**1,755 rows strip cleanly. 276 cannot be stripped at all** — the annotation is papering over
a genuine methodology gap, and stripping it would *create* the defect it hides. Those need a
human writing two distinct English prompts, not a script.

---

## 6. What I changed

Every write logged. **No TTS was generated. Not one clip. $0 spent.**

| # | change | rows | audio cost |
|---|---|---|---|
| 1 | `ara_lb_for_eng` — stripped stray CJK full stop `。` from English prompts | **460** | **$0** |
| 2 | `tel_for_eng` — un-inverted known/target on 6 component phrases + the 3 lego `components` JSON they were copied from | **9** | **$0** |

**Both were free, and I verified that rather than assuming it.** All 460 rows had
`known_audio_id` NULL before; I re-checked all 460 after — still NULL, **nothing orphaned,
nothing re-linked, nothing owed**. On the fix itself: `。` was *removed*, not replaced with
`.`, because **0 of 12,332** known-side rows in that course end with an ASCII period and
11,561 end with no terminal punctuation. The convention decided it, not me.

The tel_for_eng six were all `status=draft` with *every* audio field NULL.

Audio-pass requests queued for both courses (the helper appends now — the old
reason-clobbering bug is fixed, so no sibling's request was destroyed).

## What I deliberately did NOT change

- **Anything with a clip attached.** Under make-before-break the clip is fixed in the same
  pass, and I have no spend approval. Listed below, stopped there.
- **The 276 colliding parentheticals** — they need a methodology ruling.
- **250 inverted `components` entries in `eng_for_tam`** — real, but **0 reached a
  learner-facing phrase row**; latent only, and a 250-row edit is past conservative scope.
- **No code merged to main.** Proposals only.

### The re-render bill, if you want the rest fixed

Azure S0 at $16/1M characters, computed from the actual strings:

| population | clips | cost |
|---|---|---|
| Parenthetical, cleanly strippable | 1,356 | $0.5149 |
| Romanised B — interleaved | 71 | $0.0581 |
| CJK full stop — `eng_for_tam` | 30 | $0.0177 |
| Latin-in-CJK untranslated | 51 | $0.0190 |
| Romanised A — untranslated | 73 | $0.0114 |
| Language-name placeholder | 24 | $0.0071 |
| Latin-in-CJK target leak | 10 | $0.0052 |
| Romanised C — bare romanisation | 14 | $0.0010 |
| **TOTAL** | **1,629** | **$0.63** |

---

## 7. Code fixes proposed (nothing merged)

1. **Extend the vocab gate to the 60 uncovered courses.** The blind spot and the biggest
   leak population are the same 60 courses. A `_default_<lang>` scaffold per known language,
   mirroring `_default_eng`, closes it. Highest value of the three.
2. **Guard the target-for-known fallback** — `seed-translate.cjs:188` (`known_text ||
   comp.target`) and `:219` (`|| tp.target_text`). Still zero live leaks, still latent. It
   should fail loudly rather than silently writing target text into a known field.
3. **Validate `components` orientation on write** — `phrase-structure.cjs:255` copies
   `comp.known` into `known_text` with no check. A script-orientation assert at the lego
   write would have stopped all 263 inversions at source.
4. **Make the sweep standing.** The gate only guards new submissions. These detectors, run
   monthly, are what would have caught `yaskot` in May instead of Deborah catching it in August.

---

## 8. Decisions for you — each answerable in one word

1. **Fix the 1,356 strippable parentheticals and re-render, for $0.51?**
   → *Recommend **yes** — it is half a dollar to stop learners being shown grammar jargon.*
2. **Fix the remaining leaked rows that have clips, 273 clips for $0.12?**
   → *Recommend **yes** — same pass, negligible cost, and bucket C is literally `yaskot` in Armenian.*
3. **Route the 276 colliding parentheticals to a human for distinct English prompts?**
   → *Recommend **yes** — stripping them would create ZUT violations, so no script can do it.*
4. **Build `_default_<lang>` contracts for the 60 uncovered courses?**
   → *Recommend **yes** — it is the single change that stops recurrence where it is still live.*
5. **Repair the 250 latent `eng_for_tam` inverted components now, or leave them?**
   → *Recommend **leave** — no learner is exposed today; do it with fix #3 so it cannot recur.*

---

## 9. Gaps — stated, not papered over

- **Half B covers the 79 English-known courses only.** The lexicon method needs many courses
  sharing a known language to separate "rare English" from "leaked target". `eng` has 79;
  `jpn` 15 and `zho` 14 are marginal; the remaining 20 known languages have 1–3 courses each,
  where the method cannot work at all. Those courses got **Half A only**. Their romanised
  leaks, if any, are **unmeasured** — this is the largest hole in the sweep.
- **The 3,925 Half-B residual rows were not individually read.** They are rows with a
  course-local token that is *not* in the course's target corpus. Spot checks read as genuine
  rare English (`hush`, `joyful`, `grab`), but stage 5 provably costs recall — it missed
  `yaskot` — so **the 498 confirmed is a lower bound, not a total.**
- **Bucket A/B/C severity is mechanical, not linguistic.** For languages I cannot read, the
  classification rests on byte-identity and target-corpus membership, not on judging meaning.
- **`known_audio_id` non-NULL means a clip exists, not that it says the wrong thing.** I did
  not listen to any clip, so "with audio" is exposure, not confirmed audible defect.
- **No psql on this machine**; everything went through the PostgREST API. Deep offset paging
  times out at ~300k rows — the phrase pull was redone with keyset pagination.

---

## 10. Coordination

Four sibling workers were active on `ara_lb_for_eng` during this sweep
(`ara-gender-adaptation-sweep`, `ara-untaught-word-leak`, two `deborah-ara-lb-triage`). I
checked the tables before writing: my 460 edits were in `course_practice_phrases`, last
touched 2026-08-17, while the live activity today was on `course_legos`. **No collision was
hit and nothing was clobbered.** Deborah's own seven fixes were left untouched.

Sweep worked by three sub-workers: **#14** (Latin-in-CJK triage), **#15** (parentheticals),
**#17** (romanised triage). I verified their headline numbers against the raw data myself
rather than taking them on trust — #15's own false-positive pass removed only 2 of 2,037
rows, which is why I re-derived the 2,035 and computed the collision count independently.
