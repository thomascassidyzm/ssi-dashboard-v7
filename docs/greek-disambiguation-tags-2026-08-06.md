# Greek disambiguation tags — what is actually wrong

**2026-08-06 · diagnosis only, nothing changed · source: live Supabase + running app code**

Triggered by the forum thread of 14–17 July (robin-williams-2, RichardBuck, Aran) on **ell_for_eng** — "Greek for English Speakers", the course's real code in the live DB.

---

## The three answers

### 1. The wrong-person bug: **not live.** 0 confirmed cases.

This was the serious one — a learner being taught a wrong sentence. Richard thought you might have fixed it already. **You did.**

I checked every place in the Greek course where a chunk introduced as an English infinitive ("to X") but stored as a *finite* Greek verb is reused inside a practice phrase, and compared the Greek verb's person-ending against the subject the English actually names.

- **559** such reuses exist.
- **559** have the right person.
- **0** mismatches.

That is the whole population of cases where the English names the subject explicitly, not a sample.

There is a **residual of 42** cases where the English names *no* subject at all, so the Greek had to pick one. Those are not the same defect and most of them are probably fine — details in §Residual below. **2 of the 42 look genuinely wrong to me and I flag them for a Greek speaker.**

### 2. The tags are **separate, not baked in.** The fix is presentational.

This is the cost question and the answer is the good one.

| Where | Column | Tagged? |
|---|---|---|
| `course_legos.known_text` | the English chunk itself | **0 of 1,023** — clean |
| `course_legos.target_text` | the Greek form | **0 of 1,023** — clean |
| `course_audio.text` where `role='presentation'` | the spoken intro line | **69 of 993** — tagged |

The tag lives **only** in the pre-rendered spoken intro line. Nothing downstream inherits it: no practice phrase, no LEGO, no seed carries a tag. **Table `course_audio`, column `text`, rows with `role = 'presentation'`.**

Practical consequence: this is 69 audio clips to re-render, not a data-wide content repair. No phrase endings are wrong because of it.

### 3. **Not Greek-only — Greek is 13th.** 38 courses, ~2,280 intros.

Greek's 69 is a small share of a much larger estate-wide pattern. See §6.

---

## What the learner actually hears

Everything below is fully scaffolded — no Greek judgement required to read it.

**The stored intro line (S0043L03):**

> `The Greek for: 'to answer (I, aorist)', is:`

**What was actually spoken.** I did not have to guess. Azure's TTS writes a per-word timing record into `course_audio.word_boundaries`, listing every token it voiced. For this clip it reads:

> `The Greek for : 'to answer ( I , aorist )', is :.`

The brackets, the "I" and the "aorist" are all in the spoken-token list. **The tag was voiced.** This is robin-williams-2's report reproduced exactly from the database — they heard *"the Greek for to answer I is…"*.

Corroboration: the clip is 4,056 ms. Clean Greek intro clips run at 86.4 ms per character (n=924). The full tagged text predicts ~3,700 ms; the text with the tag removed predicts ~2,500 ms. **69 of 69** tagged clips fit the full-text duration; **0 of 69** fit the stripped duration.

**Why the tag exists at all** (RichardBuck's explanation, which is the reference I used): Modern Greek has no infinitive. "I want to answer" is *Θέλω να απαντήσω* — literally "I want that I answer" — so the verb's ending changes with the subject, and Greek additionally splits one-off from habitual aspect. A bare "to answer" is genuinely ambiguous across at least six forms. The tag is a real attempt to solve a real problem. Aran has confirmed it is intentional and not yet working as wanted. **The presentation design is Aran's call; this document does not propose phrasings.**

---

## §4 — How many, and the calibration

**Detector:** an intro line counts as tagged when a parenthesis appears *inside the quoted headword* — `/'[^']*\([^)]+\)[^']*'/`. This deliberately ignores parentheses elsewhere in the line.

**Calibration against robin-williams-2's two named examples — read this before the count.**

| Their example | Found? |
|---|---|
| `to answer I` | **YES.** Caught verbatim: `The Greek for: 'to answer (I, aorist)', is:` (S0043L03), and the word-boundary record confirms it was spoken. |
| `to take I present` | **NO — it no longer exists.** No row in any course contains `(I, present)`. |

I searched every presentation row in the Greek course for "take". The live S0027L02 intro now reads `The Greek for: 'to take', is:` and its spoken-token record is clean: `The Greek for : 'to take ', is :`. **So the detector caught 1 of the 2 named examples exactly, and the other is gone from the data** — which is itself evidence that a partial repair happened between July and now. I cannot date that repair (see Gaps).

**The count, with calibration stated: 69 tagged intros out of 993 presentation rows in ell_for_eng = 6.9% of the course's intros.**

**How many reach the learner — two different answers, because there are two read paths.** This matters and I could not fully collapse it:

| Read path | Resolves intro by | Tagged intros it serves |
|---|---|---|
| `packages/player-vue/.../CourseDataProvider.ts:551` `getIntroductionAudio()` — called from `LearningPlayer.vue:7634` and `:7792` | `course_audio` where `role='presentation'` AND `lego_id` matches — **ignores the link column** | **69** |
| `api/courses/[code]/cycles.ts:460`, `bundle.ts:545` | `course_legos.presentation_audio_id` | **17** |

The difference is a half-finished repair: for **32** LEGOs someone re-pointed `presentation_audio_id` at a *clean* clip belonging to a different LEGO (e.g. S0152L03's own row says `'if (conditional conjunction)'` but its link points at S0165L03's clean `'if'` clip), and for **38** more they set the link to NULL. The tagged rows themselves were left in place with their `lego_id` intact — so the player path still finds and serves them. **The link was fixed; the text was not.**

I have not established which path a given learner is on today. Treat **69** as the exposure and **17** as the floor.

## §5 — Confirmed vs plausible

**Confirmed tag-leak — 69 of 69.** Criterion: the parenthetical is grammatical metadata about the form (person, tense, aspect, case, gender, part of speech) rather than meaning, **and** the TTS word-boundary record shows the bracket tokens were voiced. Both hold for all 69. This is not a raw regex count — every one is corroborated by the spoken-token record.

**False positives in Greek: zero.** Every one of the 69 bracket contents is grammatical. Frequency: `(1sg present)` ×5, `(neuter)` ×4, `(adverb)` ×3, `(1sg aorist subjunctive)` ×2, `(3sg imperfect)` ×2, `(2sg present)` ×2, `(interrogative adverb)` ×2, `(masculine nominative)` ×2, and 53 singletons including `(I, aorist)` and `(you, present)`.

**The false-positive class does exist — just not in Greek.** Across the estate, plenty of parentheses are legitimate *semantic* disambiguation in readable English, and would sound fine spoken:

- `The Nepali for: 'to take (there)', is:`
- `The Croatian for: 'to take (someone)', is:`
- `The Italian for: 'they couldn't (manage to)', is:`
- `The Hungarian for: 'I know (a person)', is:`

These are a different device and I have kept them out of the grammar-tag counts.

**A separate, healthier device is already in use in Greek:** 178 of the 993 intros use the `as in — '<example sentence>'` frame, e.g. `The Greek for: 'already', as in — 'I'm very happy with how much I've learnt already.', is:`. That reads naturally when spoken. It is generated by the same code path as the tagged ones.

## §6 — Is it Greek-only? No.

Courses enumerated from the live `courses` table (**143** courses, not a hardcoded list). All `role='presentation'` rows scanned: **127,678** estate-wide.

**38 of 143 courses carry at least one grammar tag. Estate total ≈ 2,280.** Greek ranks 13th.

| Course | Grammar tags | Total intros | % | Example |
|---|---|---|---|---|
| nep_for_eng | 282 | 1,587 | 17.8% | `'interesting', as in — 'an interesting book (complete)'` |
| fas_for_eng | 179 | 1,638 | 10.9% | `'you get / you take (2sg subjunctive)'` |
| swa_for_eng | 177 | 1,242 | 14.3% | `'I (present)'` |
| rus_for_eng | 162 | 1,086 | 14.9% | `'weekends (gen pl)'` |
| ron_for_eng | 161 | 1,212 | 13.3% | `'interesting (fem sg)'` |
| hin_for_eng | 126 | 1,426 | 8.8% | `'"wanted(pl)"', as in — 'wanted to? (question)'` |
| lit_for_eng | 119 | 1,523 | 7.8% | `'"I"', as in — 'I woke up (past)'` |
| swe_for_eng | 119 | 1,110 | 10.7% | `'which (plural)'` |
| isl_for_eng | 118 | 581 | 20.3% | `'the arrangements (definite)'` |
| est_for_eng | 115 | 912 | 12.6% | `'"to (someone's place)"'` |
| srp_for_eng | 88 | 1,354 | 6.5% | `'"I (past aux)"', as in — 'I went out'` |
| lav_for_eng | 71 | 972 | 7.3% | `'sister's (genitive)'` |
| **ell_for_eng** | **69** | **993** | **6.9%** | `'to answer (I, aorist)'` |
| bul_for_eng | 55 | — | — | `'which (feminine)'` |
| ukr_for_eng | 54 | — | — | `'you can (2sg)'` |
| cat_for_eng | 53 | — | — | `'you think/believe (2sg)'` |
| hrv_for_eng | 44 | — | — | `'two (feminine)'` |
| nld_for_eng | 36 | — | — | `'young (adjective)'` |
| hye_for_eng | 35 | — | — | `'not (negation particle)'` |
| eus_for_spa | 31 | — | — | `'puedo (1sg potencial)'` |
| afr_for_eng | 30 | — | — | `'left behind (past)'` |
| por_br_for_eng | 23 | — | — | `'that (feminine)'` |
| fra_ca_for_eng | 18 | — | — | `'you all are going (formal)'` |
| spa_mx_for_eng | 16 | — | — | `'that (conjunction)'` |
| dan_for_eng | 14 | — | — | `'met (past of meet)'` |
| ces_for_eng | 12 | — | — | `'you (pl) work'` |
| ita_for_eng | 12 | — | — | `'could you (formal)'` |
| nor_for_eng | 11 | — | — | `'finished (pl.)'` |
| heb_for_eng | 10 | — | — | `'words (plural)'` |
| ara_for_eng | 8 | — | — | `'that (conjunction)'` |
| gle_for_eng | 7 | — | — | `'learned (past participle)'` |
| tha_for_eng | 7 | — | — | `'different (Thai reduplication base)'` |
| ara_eg_for_eng | 5 | — | — | `'happy (plural)'` |
| hun_for_eng | 5 | — | — | `'I know (people)'` |
| kor_for_eng | 4 | — | — | `'could you? (polite request)'` |
| por_for_eng | 2 | — | — | `'my (plural)'` |
| tur_for_eng | 1 | — | — | `'(Q-2sg-back)'` |
| zho_for_eng | 1 | — | — | `'if (conditional marker)'` |

**105 courses have zero.** (Most are drafts with no presentation audio generated yet, so this is not evidence they are immune.)

**2,280 is a lower bound.** My grammar-vs-semantic classifier keys on full words (`aorist`, `nominative`, `plural`…) and therefore misses abbreviated tags. A further **2,631** parenthetical intros landed in the "other" bucket, and that bucket is visibly mixed — it contains genuine semantic disambiguation (`'to meet (someone)'`) *and* abbreviated grammar tags (`'the chance (acc)'`, `'come (inf)'`, `'your (instr m)'`, `'unusual (masc adj)'`). Splitting those reliably needs a per-language judgement I cannot make. **Realistic estate-wide range: 2,280 to ~4,900.**

Greek is notable for one thing only: it is the sole course where **100%** of its parentheticals are grammar tags — 69 grammar, 0 semantic.

## §3 — Where the tags come from

**Generic rule, not per-LEGO authoring — but the tags are not emitted by the generator.**

The intro line is rendered by `services/phases/presentation-author.cjs`:

- `renderIntro()` (line ~119) interpolates a per-known-language template, substituting `{known}` with the chunk verbatim.
- `judgeBatch()` (line ~144) runs a Claude CLI call whose only job is choosing **Frame A** (bare: `The X for '<chunk>', is:`) or **Frame B** (with context: `…, as in — '<seed sentence>', is:`). Its prompt is quoted in full at lines 165–181 and asks *nothing* about person or aspect. It is also explicitly told to flag content errors and **not to fix them**.
- `stripSeedClause()` (line ~111) derives Frame A from Frame B.

Nowhere in that file is a `(person, aspect)` annotation constructed. So the tag was already inside `{known}` — i.e. inside `course_legos.known_text` — **at the moment the intro was rendered**, and the LEGO text was cleaned afterwards. All 1,023 Greek LEGOs are clean today; the 69 intros are frozen renderings of a dirtier earlier state. That is consistent with the varied, hand-written feel of the tags (`(3sg imperfect of can)`, `(2sg present, idiomatic progress)`) — they read as an LLM decomposition step annotating ambiguous forms, not as a uniform template.

**There is already a guard that should have prevented this**, and it did not fire. `services/phases/phase8-audio-from-baskets.cjs:163`:

```js
// Strip parenthetical notes so TTS doesn't read them aloud
ttsText = ttsText.replace(/\s*\([^)]*\)/g, '').trim();
```

Added **2026-03-09** (commit `6c0fcc46`, kai-saraceno) — *seven days before* these Greek clips were created (2026-03-16). Yet the word-boundary records prove the tags were spoken. **So these clips were not rendered through phase8's TTS path.** Supporting evidence: their `voice_id` is a bare `en-GB-SoniaNeural` rather than the `azure_`-prefixed form phase8 uses, and none of the 993 Greek presentation clip IDs reproduce under `uuid-v11.generateSampleId()` — including clean ones (0 of 50 controls) — so they were minted by a different generator entirely. **I have not identified which one.** That is the single most useful open thread: the guard exists and works, and something is going around it.

Note the guard has a side effect worth knowing: it strips parens from `ttsText` but stores the *unstripped* `text` in the DB. For any clip that *did* go through phase8, a parenthesis in `course_audio.text` does **not** imply it was spoken. That is exactly why I verified via `word_boundaries` rather than trusting the text column — and why the estate-wide counts in §6 are counts of *rows*, not of confirmed audible leaks.

## Residual — the 42 no-subject cases

Where the English names no subject, the Greek must still choose one. 42 such reuses exist. Two shapes:

**(a) 40 impersonal — "it is ADJ to X".** Concentrated on a few LEGOs: `to find` = *να βρεις* (2sg) ×14, `to speak` = *μιλάω* (1sg) ×8, `to improve` = *βελτιωθώ* (1sg) ×4, `to relax` ×4, `to remember` ×3, `to think` ×3, plus 4 singletons.

Example — `it is not easy to find` → *δεν είναι εύκολο να βρεις*, literally "it is not easy that **you** find". Generic second-person in impersonal statements is idiomatic in many languages, so this may be entirely correct. **I cannot judge it and neither can Kai — flagged for a Greek speaker.** Note it is inconsistent, though: some use generic 2sg (*να βρεις*) and others generic 1sg (*βελτιωθώ*), which a learner may find harder to pattern-match than either choice alone.

**(b) 2 wh-complements where I think it is genuinely wrong.** These have the same shape as the bug Richard described:

| Phrase | English | Greek | Literal gloss | Why I think it is wrong |
|---|---|---|---|---|
| `S0070L03U04` | "I don't know where to find it" | *δεν ξέρω πού να βρεις* (`den xero pou na vreis`) | "I don't know where **you** find it" | The speaker is "I". In `πού να` + verb the person should follow the matrix subject, so this should be first-person, not second. |
| `S0017L01U04` | "she wants me to learn how to say something in Greek" | *θέλει να μάθω πώς να λέω κάτι στα ελληνικά* (`thelei na matho pos na leo kati sta ellinika`) | "she wants that I learn how **I** say something in Greek" | Person is arguably fine here; what looks off is aspect — *λέω* is the habitual form where a one-off "say something" would want *πω*. |

**Both need a Greek speaker's confirmation. Do not act on them on my say-so.**

---

## Explicit gaps

Things I could not measure or could not judge. None of these are papered over.

1. **I cannot date the partial repair.** `course_audio` has no `updated_at`, and every Greek presentation clip carries the same bulk `created_at` of 2026-03-16T17:31:50Z. So I can show that `to take` is clean *now* and was reported dirty in July, but I cannot show when or by whom it was cleaned.
2. **I could not identify the generator that produced these clips.** It is not phase8 (whose paren-strip guard predates them) and not the `uuid-v11` sample-ID path. Until that is found, the paren-strip guard cannot be assumed to protect future generations.
3. **I did not establish which read path a live learner is on.** Both `getIntroductionAudio()` (69 tagged) and `cycles.ts` (17 tagged) exist and both are wired up. I report the range rather than pick.
4. **The grammar-vs-semantic split at estate scale is imperfect** and needs per-language eyes; 2,280 is a floor, ~4,900 a ceiling (§6).
5. **Every Greek grammatical judgement is unconfirmed.** I derived person from verb endings (-ω 1sg, -εις 2sg, -ει 3sg, -ουμε 1pl, -ετε 2pl, -ουν 3pl) using RichardBuck's forum explanation as the reference. That is a mechanical rule and it may mis-handle irregular or contracted forms. **The "0 mismatches" headline rests on it.** It is a strong result — 559/559 with no near-misses — but a Greek speaker should spot-check a sample before it is treated as settled.
6. **Aspect was not audited at all.** Richard's one-off vs habitual distinction (*Θέλω να μιλήσω* vs *Θέλω να μιλάω*) is a second axis of correctness. I checked person only. There may be an aspect-level defect of unknown size sitting underneath a clean person audit.

## How to reproduce

Read-only scripts are in `scripts/` (gitignored): `_gk_person4.cjs` (person audit + coverage), `_gk_spoken.cjs` (word-boundary proof), `_gk_reach.cjs` (read-path exposure), `_gk_cross.cjs` (estate sweep).

**Nothing was written. No DB mutation, no TTS, no content edit, no approval requested.**
