# yid_for_eng — Yiddish for English speakers: text-side build

**No audio of any kind was generated.** `course_audio` for this course is still the single pre-existing `welcome` row it had before I started. Nothing was proposed for TTS, no voice was looked for, and the build stops exactly where audio generation would begin.

---

## 1. How far it got, in numbers

| | Before | After |
|---|---|---|
| `course_seeds` (translated) | 668 | 668 — **not one row touched** |
| `course_legos` | 0 | **29** |
| `course_practice_phrases` | 0 | **239** (70 BUILD, 117 USE, 52 component) |
| `course_audio` | 1 | **1** (unchanged) |

**Seeds decomposed: 10 of a 300-seed build target — 3%.** All ten went through the real course-builder API (`POST /api/seed/complete`), which ran its own ZUT, tiling, syllable-cap, untaught-word, known-side and anti-template gates on every submission. All ten returned HTTP 200.

I stopped at ten deliberately, for the same reason the `calibrate` skill gives: golden decomposition is the canonical reference every later build agent copies, it is a human-in-the-loop step, and **nobody on this project speaks Yiddish**. Ten seeds is a set a Yiddish speaker can rule on in one sitting. Three hundred would be ~7,500 unreviewable phrases with any systematic error baked in throughout.

**Verification results on what was written:**

- **Untaught-word rule: 0 violations** across all 239 stored phrases — checked with the server's own `checkVocabViolations`, accumulating vocabulary in seed/idx order exactly as `seed-complete.cjs` does, including the 52 component rows the server generated itself.
- **ZUT: 0 collisions** across 29 LEGOs and 187 BUILD/USE phrases.
- **Round-trip: 29/29 LEGO targets and 187/187 phrase targets byte-identical** on read-back from Postgres. Not one Hebrew byte changed.

---

## 2. Two premises in the brief were wrong. Both matter.

**a) "The frame for a right-to-left, non-Latin-script course has not been made here before."** It has, five times, and they are all live:

| Course | Status | Seeds | LEGOs | Phrases |
|---|---|---|---|---|
| `ara_lb_for_eng` | beta | 668 | 1,546 | 12,333 |
| `ara_for_eng` | beta | 668 | 1,401 | 12,638 |
| `ara_eg_for_eng` | beta | 668 | 1,386 | 11,421 |
| `fas_for_eng` | beta | 668 | 852 | 7,252 |
| **`heb_for_eng`** | beta | 668 | 629 | 5,756 |

`heb_for_eng` is the direct precedent — same script, same direction — and I read its seed 1-3 decomposition before designing anything. So the RTL/non-Latin part of this job was **not** novel. What is genuinely Yiddish-specific is the verb structure in §3, and that is where the real work went.

**b) Romanisation as an app-side toggle is real, and the plumbing already exists.** `target_text_roman` is a column on `course_seeds`, `course_legos` *and* `course_practice_phrases`; `useScriptMode.ts` in player-vue is a per-course `roman`/`native` toggle persisted to localStorage; `heb_for_eng` and `fas_for_eng` have all 668 romanisations filled. Kai's ruling rests on a true premise. **`yid_for_eng` has 0 of 668 filled** — that is a real, separate, un-started job, and it is not blocked by anything I did.

---

## 3. The decomposition rule I adopted, and why

### 3.1 The problem in one sentence

Yiddish is a verb-second language whose middle field is filled in a fixed order:

```
[subject] [FINITE VERB] [זיך] [time adverb] [צו] [INFINITIVE] [objects]
```

The reflexive **זיך**, the infinitival **צו** and the **time adverb** are placed by the *clause*, not by the word they belong to. So an English "to learn" does not correspond to any contiguous Yiddish string that stays the same across frames — and the English-shaped tiling the pipeline assumes will either drop the זיך or glue it to the wrong verb.

### 3.2 The corpus proves the attachment — I did not guess it

Seed 2 is `איך פּרוּוו זיך צו לערנען` ("I'm trying to learn"). The tempting decomposition is *"I'm trying" → איך פּרוּוו זיך* + *"to learn" → צו לערנען*. **Seed 8 disproves it:** `איך וועל פּרוּוון צו דערקלערן` — the same governor פּרוּוון, taking צו, with **no זיך at all**, because דערקלערן ("explain") is not reflexive whereas לערנען זיך and דערמאָנען זיך are. The זיך belongs to the *embedded* verb and merely surfaces next to the finite one.

Two more independent confirmations from the 668-seed corpus:

- Every one of the 94 occurrences of זיך follows a **finite** verb or auxiliary (האָט, האָב, האָבן, וויל, דאַרף, וועט, פּרוּוו …) — never an infinitive.
- Seed 20, `דו ווילסט זיך גיך לערנען זײַן נאָמען`, shows the full middle field with a modal: *finite* ווילסט → זיך → adverb גיך → **bare** infinitive לערנען, no צו. Modals take a bare infinitive; lexical and predicative governors (פּרוּוון, גרייט, ליב, אָנגעהויבן, ווי אַזוי) take צו.

### 3.3 The rule

> **R1 — Every infinitive A-LEGO is BARE.** רעדן, לערנען, זאָגן, דערקלערן. Never `צו רעדן`. The צו is selected by the governor, not carried by the verb.
>
> **R2 — צו, זיך and the middle-field time adverb never sit at a LEGO edge and are never atomised.** They appear only *inside* a **frame M-LEGO** that spans from the finite verb (or predicative governor) to the infinitive, and that M-LEGO is glossed with the whole English intention — `"I'm trying to learn" → איך פּרוּוו זיך צו לערנען`, `"I want to speak now" → איך וויל איצט רעדן`.
>
> **R3 — A verb-governed preposition travels with its verb inside the frame, never with the object noun.** `"I'm trying to remember" → איך פּרוּוו זיך צו דערמאָנען אין`, then `"a word" → אַ וואָרט` separately.

This is a deliberate departure from the English-shaped tiling, and it is the Yiddish instance of a mechanism the methodology already has: construction-features are absorbed into whole thoughts, never atomised (`ralph-methodology.md`, *Intention-units vs construction-features*). זיך and צו are textbook construction-features — a learner never forms an intention to "say צו".

### 3.4 Why this keeps ZUT intact

Because צו only ever appears inside a frame LEGO, and each frame LEGO carries a distinct whole-intention English gloss, **the learner is never asked to decide whether to say צו**. "to learn" maps to לערנען, always, one form. The alternative I rejected — teaching `זיך צו לערנען` as the unit for "to learn" — is attested contiguously in the corpus four times (seeds 73, 75, 79, 109) and is a real Yiddish chunk, but it collides on the known side with the bare לערנען needed after a modal. **R2 was chosen over it because ZUT outranks naturalness.** The runner-up is recorded here so a speaker can overrule me.

### 3.5 The teaching mechanism this buys

The middle-field adverb slot is taught by **contrastive twin debut** — the methodology's own prescribed device for a construction-feature — rather than explained:

```
seed 1   איך וויל איצט רעדן        "I want to speak now"      (איצט after the finite verb)
seed 7   איך וויל הײַנט פּרוּוון      "I want to try today"      (הײַנט, same slot)
```

Same slot, two adverbs, no rule stated. Bare `"now" → איצט` is then withheld until **seed 9**, after the learner has seen the slot twice. Seed 9 also puts finite `איך רעד` beside the infinitive `רעדן` from seed 1, so the inflection is inferred from overlap.

### 3.6 Where the standard method would have produced a non-unit — and didn't

The untaught-word gate caught my own rule-breaking while I built, which is the point of running it during authoring rather than after. It rejected `פּרוּוון צו רעדן` ("to try to speak") in seed 7 because `צו רעדן` is not a taught chunk and צו is not standalone vocabulary — exactly the outcome R1/R2 predict. Fourteen phrases were rewritten for this reason before anything was submitted. **The machine enforced the rule I wrote, which is the strongest evidence the rule is real and not just narration.**

---

## 4. Script integrity: round-trip evidence

### 4.1 The corpus and everything I wrote are NFC, and that is load-bearing

All 668 pre-existing seeds and all 268 Yiddish strings I wrote are **NFC, with zero Alphabetic Presentation Form codepoints (U+FB1D–U+FB4F)**. Hebrew points are stored as base letter + combining mark (`א` + U+05B7), never as precomposed `U+FB2E`.

This is not cosmetic bookkeeping, and the reason is a genuine trap:

```
'אַ' as U+FB2E        .normalize('NFC') →  U+05D0 U+05B7   (DECOMPOSES)
'אַ' as U+05D0 U+05B7 .normalize('NFC') →  U+05D0 U+05B7   (unchanged)
```

Yiddish presentation forms are on the Unicode **composition-exclusion** list, so **NFC is the decomposed form** — NFC never recomposes them. Like Yoruba, *Yiddish in NFC still contains combining marks*, and that is correct, not corruption.

The trap is that the gates disagree about it:

| Function | Unicode-normalises? | Precomposed vs decomposed |
|---|---|---|
| `normalizeForZUT` | yes — calls `NFD` | treated as **the same** |
| `normalizeForContainment` | **no** | treated as **different** |
| `normalizeForStorage` | **no** | treated as **different** |

So a single pasted presentation-form character would pass ZUT while silently failing the containment and untaught-word gates — a LEGO that can never match its own phrase. **Nothing in the pipeline fixes this**, because NFC (composition-excluded) will not repair it. The correct guard is to *reject* any codepoint in U+FB1D–U+FB4F on intake, not to call `.normalize()`. Today the corpus is clean, so this is a guard worth adding, not a live defect.

### 4.2 Hebrew points are meaning-bearing, and the pipeline preserves them

The 668 seeds contain **7 minimal pairs distinguished only by the vowel point**:

```
וואָרט (word)    vs  וואַרט (wait)        אָן (without) vs אַן (a)
דאַרף (need)     vs  דאָרף (village)      אַרט         vs אָרט (place)
האַלט (hold)     vs  האָלט (fond)         פֿאָרן (travel) vs פֿאַרן (for the)
פֿאַר (for)      vs  פּאָר (pair)
```

Strip U+05B0–U+05C7 and all fourteen words collapse to seven. **I audited every normalisation function on the build path: none of them strip Hebrew points.** They strip Arabic tashkeel (U+064B–U+0652) and Latin combining diacritics (U+0300–U+036F); the Hebrew range is untouched. A grep for the Hebrew point range across `services/` and `tools/` returns exactly one hit — `azure-tts-service.cjs:234`, which uses it to *detect* RTL, not to strip.

Verified directly: `normalizeForContainment('אַ') !== normalizeForContainment('אָ')`. **The untaught-word gate is orthography-strict for Yiddish**, which is the single most important property here and it is good news.

### 4.3 Round-trip, byte for byte

Wrote through the real API, read straight back out of Postgres, compared UTF-8 bytes:

```
LEGO targets:              29 byte-identical, 0 differ, 0 missing
Authored phrase targets:  187 byte-identical, 0 not found
Stored Yiddish strings:   268 | non-NFC: 0 | presentation-form cps: 0 | unexpected chars: none
```

**Zero deltas.** (The equivalent Yoruba job had three, from `stripBookendPunctuation` lowercasing a leading capital. Hebrew script is caseless, so that transform cannot touch it — a small structural advantage worth knowing.)

Sub-worker **#656** independently verified the same corpus over the **PostgREST/supabase-js** path — the one the dashboard's `supabase-client.cjs` actually uses — comparing SHA-256 digests for all 668 rows against the pg-direct read. No mismatches.

### 4.4 Bidi: one finding, and I disagree with my own worker about it

**In the data: clean.** Across all 668 seeds and all 268 strings I wrote there are **zero Latin letters, zero digits, zero explicit bidi controls (U+200E/F, U+202A–E, U+2066–9), zero ZWSP/BOM, zero parentheses.** The dangerous case — a Latin word or digit embedded in Hebrew text — **does not occur anywhere**, and I did not create any.

What does occur is bidi-*neutral* punctuation: 111 question marks, 78 commas, 2 periods, across 174 of 668 rows.

Worker #656 concluded these are cosmetic, reasoning that under UAX#9 rules P2/P3 the paragraph direction resolves to RTL from the first strong character (Hebrew in all 668 rows), so the punctuation lands at the visual left edge where a Yiddish reader expects it. **That reasoning is right about the algorithm but I think wrong about HTML.** P2/P3 apply only when the higher-level protocol does not set a direction — and HTML *does*: the default is LTR unless `dir="rtl"` or `dir="auto"` is set.

I checked the learning app:

- `packages/player-vue/index.html` → `<html lang="en">`, **no `dir` attribute**
- **zero `dir="…"` attributes anywhere** in `packages/player-vue/src` or `packages/core/src`
- the only bidi-aware CSS is one `unicode-bidi: isolate` on the *romanisation* ruby in `LegoAssembly.vue:1175`, which forces the Latin gloss LTR — evidence someone already hit RTL tiles and fixed the narrow case

So the prediction is that a trailing `?` on those 111 seeds renders at the visual **right** — where a Yiddish reader sees the sentence *begin*. **Neither of us verified this in a browser**, so treat it as a well-founded prediction, not a confirmed defect. It is cheap to settle and cheap to fix (`dir="auto"` on the target-text element), and it is an *app-side* issue that affects the five existing RTL courses too, not just Yiddish.

---

## 5. Orthography: the 668 seeds are internally consistent

Sub-worker **#657** ran the census. Headline: **the corpus is internally self-consistent to an unusually high degree — one candidate variant in 668 seeds across 932 distinct tokens.** There is no seed-range split and no cluster of seeds disagreeing with the rest, so this is *not* a "translated by several hands under different conventions" corpus.

Measured clean at or near 100%: pey/fey pointing, veys-rafe reserved to the Hebrew-origin stratum (all 5 occurrences), silent-alef placement (two disjoint lexeme sets, each spelled identically every time, 0 exceptions), traditional unpointed spelling of loshn-koydesh words, final-form usage (**0 real violations** — the 4 raw hits are maqaf-joined compounds `סוף־וואָך`, `יום־טובֿים` where a whitespace tokeniser mis-split the word), and sentence-final punctuation (**111 of 111** English questions carry a Yiddish `?`; **0 of 668** targets end in a period).

My own independent checks agree and add two YIVO-pointing signals #657 flagged as unmeasurable: **melupm-vov** (`וּ` — פּרוּוו, וווּ, געוווּסט) and **khirik-yud** (`יִ` — ייִדיש, פֿריִער, ייִנגל) are both used, consistently, and both are specifically YIVO disambiguation marks. Hebrew-origin words are spelled traditionally (משפּחה, שבת, מזל, חבֿר, מלחמה, מתּנה, צדקה).

**What I will not claim:** that this *is* YIVO. The markers all point that way and #657 was right to refuse the label without a speaker — both YIVO and traditional/Hasidic writing retain traditional loshn-koydesh spelling, so that marker is weaker evidence than the brief assumes. **I normalised nothing.** No seed row was edited.

**The one candidate inconsistency: seed 419.** `אויב זיי ווילן אַז מענטשן זאָלן זיי האָלט האָבן` uses **האָלט** (komets) where six other seeds (47, 123, 163, 185, 261, 303) use **האַלט** (pasekh). Speaker question 2.

---

## 6. Questions for a Yiddish speaker

Nothing below should be treated as settled. These are the judgements I refused to fake — not a failure list.

**On the existing 668 translations (a wrong answer here is inherited by every seed anyone builds later):**

1. **"Remember" has two different Yiddish verbs in this corpus, and the split looks unprincipled.** Seed 6 uses `דערמאָנען זיך אין` ("I'm trying to remember a word"); seed 10 uses `געדענקען` ("if I can remember the whole sentence"). Both also appear with "can": seed 113 has `קען איך זיך נישט דערמאָנען`, seed 57 has `איך קען נישט געדענקען`. **Is this a real meaning distinction (recall-to-mind vs retain-in-memory), or are the two used interchangeably?** If it is real, what is the English cue that picks each one? I kept the two knowns distinct ("I'm trying to remember" vs "if I can remember") so no bare "to remember" LEGO exists in either seed, but that is a holding pattern, not an answer.
2. **Seed 419** — is `האָלט` in `זאָלן זיי האָלט האָבן` ("so people like them") a typo for `האַלט` ("think/hold", six other seeds), or a genuinely different word that happens to look similar?
3. **"Speak Yiddish" vs "say something in Yiddish."** The corpus uses bare `רעדן ייִדיש` (seeds 1, 15, 22) but `זאָגן עפּעס אויף ייִדיש` (seeds 4, 160) — `אויף` appears only with *say*, never with *speak*. Is that a real distinction, or an inconsistency? I followed the corpus strictly and never generated `רעדן אויף ייִדיש`.
4. **Register.** The corpus is consistently familiar 2sg (`דו` / `דיר`). For a community course whose learners may address elders, is familiar-throughout right, or should some material teach `איר`?

**On my decompositions:**

5. **Is the whole frame rule (§3.3) right?** Concretely: should `"to learn"` be taught as bare `לערנען`, with `זיך` and `צו` only ever appearing inside `איך פּרוּוו זיך צו לערנען` — or should the unit be `זיך צו לערנען` (which the corpus does show contiguously four times)? This is the single highest-value question here; it decides the shape of the other 290 seeds.
6. **`זיך לערנען` with a direct object.** I generated `איך פּרוּוו זיך צו לערנען ייִדיש`. Corpus seeds 64 (`זיך לערנען ייִדיש`) and 111 (`מיר לערנען זיך עפּעס נײַעס`) support it, but please confirm — it is used in 9 phrases.
7. **`זיך געניטן אין רעדן`** ("to practise speaking") — is `אין` obligatory before the thing practised, and is `זיך געניטן אין רעדן ייִדיש` ("practise speaking Yiddish") grammatical? Used in 11 phrases.
8. **`דערמאָנען זיך אין` before a noun only.** Seed 113 drops `אין` before a clause (`זיך נישט דערמאָנען וואָס דו האָסט געזאָגט`). I therefore kept every phrase for this LEGO on a noun object. Is that the right rule?
9. **Adverb placement outside the frame.** I only ever put `איצט`/`הײַנט` immediately after the finite verb, because that is what the corpus shows. **Is a clause-final time adverb also acceptable?** If yes, the frame LEGOs are optional rather than necessary and §3 gets simpler.
10. **`ווי אַזוי` for "how".** Is bare `ווי` ever the right form for "how to …"? `ווי` appears 58 times and `אַזוי` 37 in the corpus; I treated `ווי אַזוי` as the single unit for "how".
11. **`דעם גאַנצן זאַץ`** — I taught the accusative article + declined adjective + noun as one unbreakable chunk so the learner never computes case. Correct in the recombinations I generated (`זאָגן דעם גאַנצן זאַץ`, `לערנען דעם גאַנצן זאַץ`)?
12. **`אַזוי שטאַרק ווי איך קען`** ("as hard as I can") — I split it into components `אַזוי שטאַרק` + `ווי איך קען`. Does `ווי איך קען` stand as a reusable unit, or only inside this fixed comparative?

---

## 7. Explicit gaps

- **290 of the 300 target seeds are not decomposed.** They have translated text and nothing else. This is the bulk of the remaining work and it is deliberately not done — §1.
- **No Yiddish speaker has reviewed anything**, including the 668 translations, which have sat at `status=draft` since 2026-07-07. My 10 seeds inherit whatever is wrong with them.
- **`target_text_roman` is 0 of 668.** The romanisation toggle exists and works for `heb_for_eng`/`fas_for_eng`; Yiddish has no romanisation banked at any level. Not started, not blocked.
- **The bidi rendering prediction (§4.4) was not verified in a browser** by me or by #656. It is UAX#9 reasoning plus a source audit, not a screenshot.
- **`/api/resume/yid_for_eng` is stuck on the wrong pass.** It still returns `"action": "TRANSLATE ONLY - DO NOT CREATE LEGOs"` and `GOLDEN_DECOMPOSITIONS: null` **after** 29 LEGOs were written, because the orchestrator gates the pass transition on `courses.translation_analysis`, which is `NULL` for this course. **The next agent that calls `/api/resume` will be told to re-translate 668 already-translated seeds.** I did not write `translation_analysis` myself — that is a course-level record and I would be inventing a Yiddish translation analysis I am not qualified to write.
- **Seed count is ambiguous.** `courses.seed_count` is `NULL`, `/api/resume` targets 300, and 668 seed rows exist. Nobody should assume 668 is the build target without your call.
- **I could not poll sub-worker status** (`/api/jobs/{n}` returns `not found`); both reports arrived via the automatic parent hand-back.
- The frame-coverage gate emitted `low_frame_diversity` warnings on some early baskets. It is **warn-only by design** and I did not chase it — with a seed-4 vocabulary of ~18 chunks the available frames are genuinely few, and padding would have meant inventing Yiddish.

---

## 8. Recommended next step

Put **§6 in front of a Yiddish speaker.** Question 5 is worth more than the rest combined — it decides the decomposition shape for the remaining 290 seeds, and building them before it is answered just multiplies whatever is wrong. Questions 1-4 are about the *existing translations*, so a wrong answer there is a defect inherited by every future seed; question 1 in particular looks like a live inconsistency sitting in the corpus today.

Once those are settled, seeds 1-10 become a trustworthy calibration and the rest can be built against it at speed.

Two things that are worth doing regardless of the speaker, and are not Yiddish-specific:

- Add an intake guard rejecting U+FB1D–U+FB4F (§4.1). It protects all six Hebrew/Arabic-script courses, and `.normalize()` will not do the job.
- Settle the `dir` question in player-vue (§4.4). It affects the five RTL courses already in beta.

---

*Sub-workers: **#656** (script integrity) and **#657** (orthography census), both sonnet, both read-only. Their full reports are linked from this document's companion files. No audio was generated at any point in this job.*

---

## 9. Mis-pairing self-check (requested after the estate scan)

**Headline: 0 instances of the estate defect, and 0 missing LEGOs, across 29 LEGOs and 52 server-generated component rows — 81 known/target pairings.** Method below, so the zero is checkable rather than asserted.

I ran this against the **stored** rows, not my authoring file, so it covers the 52 component rows the **server** generated itself — machine output is exactly where this defect would live. Script: `docs/yid-for-eng-build-2026-08-15/mispairing-selfcheck.cjs`.

| # | Test | Result |
|---|---|---|
| 1 | same KNOWN → different TARGETS | **0** |
| 2 | same TARGET → different KNOWNS | **0** (was 1 — fixed, below) |
| 3 | LEGO target is not a contiguous span of its seed target | 1 — adjudicated, deliberate |
| 4 | LEGO known is not a contiguous span of its seed known | 7 — all adjudicated benign |
| 5 | **MISSING LEGO** — a seed target word no LEGO teaches | **0** |
| 6 | seed known word claimed by no LEGO in that seed | 1 — adjudicated benign |
| 7 | **the estate signature run explicitly** | **0** |

**Test 7 is the one that matters.** The scan's signature is *"the borrowed counterpart belongs to a NEIGHBOURING lego in the SAME seed, and the course contradicts itself elsewhere by pairing those two correctly."* So for every LEGO I asked directly: does its known appear anywhere else in the course paired with a **sibling's** target? Does its target appear elsewhere paired with a **sibling's** known? **Zero hits, both directions.** Combined with Test 1 = 0 (no known is ever paired with two different targets), no known side in this output can have been borrowed from a sibling.

### The one real finding, and I fixed it

Test 2 initially flagged **`רעדן` glossed "to speak" in S1L01/S1L04/S3L01 but "speaking" in S5L02** — seed 5 is "I'm going to practise *speaking*", where English uses a gerund for the same Yiddish infinitive.

This was **not** the estate defect: "speaking" belongs to neither of seed 5's siblings (`זיך געניטן אין` "to practise", `מיט עמעצן אַנדערש` "with someone else"), and Test 7 confirms it. It was a genuine convergence, which the methodology permits. But it is exactly the shape the scan flags, so I normalised it to "to speak" — row `yid_for_eng:S0005L02C02`, a component with `introduce:false`, no presentation and no audio of any kind attached, so a single-column update with zero learner impact. Kai's standing rule (change a LEGO text, fix its presentation in the same pass) has nothing to fix here; I checked before touching it. The source file was aligned to match.

**Honest trade-off:** this moved one row from Test 2 into Test 4 (the gloss "to speak" is now not a span of seed 5's English). I judged that the right direction — Test 2 is the estate signature, Test 4 is not — but it was a trade, not a free win.

### The remaining Test 3 finding is deliberate, and it matters for the scan itself

**S1L01: target `איך וויל רעדן` ("I want to speak") is not a contiguous span of seed 1's target `איך וויל איצט רעדן`** — `איצט` sits between the finite verb and the infinitive.

The known and target **correspond correctly**; nothing is borrowed. It is a synthesized-but-valid chunk, not a mis-slice, and it is documented in the seed note. It exists because seed 1 has zero prior vocabulary, so a bare second LEGO admits exactly one possible phrase and cannot fill BUILD and USE distinctly (the server rejects both a bare-LEGO BUILD and a BUILD/USE duplicate). The alternative that would remove it — make L1 the full frame `איך וויל איצט רעדן` and drop the separate L4 — is clean, and I would take it on a rebuild; I did not perform destructive surgery on already-written content to chase a non-defect.

**This generalises, and whoever runs the estate scan should know it: in a V2 / verb-bracket language, a LEGO's target legitimately need not be a contiguous span of its seed**, because the finite verb and the infinitive are separated by the middle field. Yiddish, German, Dutch and Afrikaans all do this. A span-contiguity test will therefore produce false positives on exactly those courses — and **`deu_for_zho` is one of the four confirmed cases**. Span-contiguity is not a safe discriminator there; the known↔target correspondence test (1, 2, 7) is.

Related: **"claimed twice" is not evidence of the defect in this methodology.** Overlapping LEGOs are *the* teaching mechanism — `ralph-methodology.md` says overlaps are "expected and encouraged" and the tiling gate is word-set-based by design. Seed 1 deliberately has `איך וויל` and `רעדן` claimed by both L1 and L4. A scan that flags double-claims will flag every correctly-built course.

### The other adjudications

- **Test 4 (7 findings), all benign.** Two are my frame LEGOs (S1L04, S7L02) where every English word is present but reordered — that reordering *is* the rule in §3. Five are component glosses that name the Yiddish word's meaning rather than a slice of the sentence: `וואָס`→"what", `עפֿטער`→"more often" (seed 3), `וועל`→"will" (seed 5), `איך בין`→"I am" (seed 10, just the contraction of "I'm"). Every one is a correct pairing, and `וואָס`→"what" is glossed identically in seed 3 **and** seed 8 — self-consistency, the opposite of the defect signature.
- **Test 6 (1 finding), benign.** Seed 9's English contains "Yiddish" but no seed-9 LEGO claims it — because `ייִדיש` was introduced in seed 1 and is correctly *not* re-taught (methodology principle 5, "don't re-teach the known"). Test 5 confirms the Yiddish word is taught. This is intended behaviour, not an incomplete decomposition.

### Gap

This check has **no Yiddish knowledge in it**. It proves internal consistency — that no row contradicts another and no side was borrowed from a sibling — which is precisely what the estate scan's language-free test proves. It **cannot** detect a pairing that is uniformly wrong throughout (if I mis-glossed a word the same way every time, every test above still reads zero). That residue is what §6's speaker questions are for.

---

## 10. Both sub-workers reported. One number disagreed, and resolving it found an estate-wide defect.

**#656 (script integrity)** and **#657 (orthography census)** both finished. Nothing is still in flight. Their findings are folded into §4 and §5 above; two things are worth pulling out.

**#656 caught a bug in its own test harness and said so.** Its first PostgREST pass showed 15 "mismatches" that turned out to be its own Buffer-concatenation error decoding HTTP chunks independently — not data corruption. After the fix: **0 mismatches across all 668 rows** on the anon-key REST path, matching the pg-direct read. Its remaining gap is real and worth naming: the learning app's own Vercel API routes and the supabase-js client library were **not** exercised — only the raw REST endpoint. It also confirmed it dropped its scratch table and never wrote to `course_seeds`.

**#657's question-mark count (111) disagreed with mine (109).** I chased it, and the discrepancy is not in the Yiddish:

```
seed 643   EN "Do you want sir"          YI  ווילט איר, הער?
seed 659   EN "Could you all say that"   YI  וואָלט איר אַלע געקענט זאָגן דאָס?
```

**The Yiddish is right and the English canonical seed is wrong** — both are questions missing their question mark (643 is also missing a comma before "sir"). All 111 Yiddish question marks are correct; 109 is the English count.

**This is estate-wide, not a Yiddish problem.** Both seeds are missing the question mark in the canonical English of every course I checked:

| seed | deu_for_eng | fra_for_eng | heb_for_eng | spa_for_eng | yid_for_eng |
|---|---|---|---|---|---|
| 643 | "do you want sir" | "do you want sir" | "Do you want sir" | "Do you want sir" | "Do you want sir" |
| 659 | "could you all say that" | "could you all say that" | "Could you all say that" | "could you all say that" | "Could you all say that" |

I did **not** fix it. Canonical seed text is shared across every course, so an edit cascades estate-wide and is well outside this brief — it is Tom's or Kai's call. Flagging it because it affects the known side of two seeds in every English-known course on the estate, and because a translator working from "Do you want sir" has no cue that it is a question.
