# fin_for_eng — hand-check of 12 reverse-ZUT candidates

**Read-only.** Nothing in the database was changed. No TTS. No commits.
**Key used:** `SUPABASE_SERVICE_KEY` (`sb_secret_…`) via `scripts/fin-recheck/db.cjs`. Pulled fresh: 668 seeds, 1,425 legos, 14,032 practice phrases.
**Boundary trap:** all matching done by Unicode tokenisation (`/\p{L}+/gu`, `scripts/fin-recheck/tok.cjs`). No `\b` anywhere.

---

## Headline

**Of the 12 candidates, 1 is a real defect. 11 are false positives at the sentence level.**

But 6 of those 11 hide a *different*, real, smaller defect that the sweep wasn't looking for: the **bare component tile**. The sentences are fine; the one-word tile the learner is drilled on is not.

---

## The table

| # | English | Variants | Verdict | Reason | Action |
|---|---|---|---|---|---|
| 4 | to watch | katsoa (9 seeds) vs **kattomaan** (seed 371 only) | **REAL DEFECT** | Not a register split. The whole course uses standard `katso-`; seed 371 is the only `katto-` in it. Same construction elsewhere: "I want to go look" = "mä haluun mennä **katso**maan". | **MERGE onto `katsomaan`.** Seed 371 only. |
| 1 | how | kuinka vs miten | LEGITIMATE | `kuinka` + degree/quantity (kauan, monta, vanha, korkealle, paljon, nopeesti, hyvin); `miten` = manner ("how to say", "how do you feel", "how it's going"). Zero crossovers in 187 rows. | No change. Fix tile ↓ |
| 2 | ever | koskaan vs ikinä | LEGITIMATE | Not the same word-sense. `koskaan` = ever/never (temporal, negative). `ikinä` occurs *only* inside `-ever` compounds: mitä ikinä = whatever, kuka ikinä = whoever. | No change. Fix tile ↓ |
| 3 | happy | tyytyväinen vs onnellinen | LEGITIMATE | English polysemy. `tyytyväinen` = "happy **with**" (satisfied) — all 33 rows are "happy with/about". `onnellinen` = happy (emotion). `onnellisia` is the same lexeme, plural. | No change. Fix tile ↓ |
| 5 | very | tosi vs kovin | LEGITIMATE | Polarity. `kovin` is a negative-polarity intensifier: 35 of 40 rows are "not very / didn't / haven't". `tosi` is the affirmative one. Real Finnish grammar, consistently applied. | No change. Fix tile + fragments ↓ |
| 6 | thing(s) | juttu vs asia | LEGITIMATE | The "3 variants" were case inflection of 2 stems (juttu/jutut/jutusta; asia/asiaa/asiat/asioita). `juttu` = concrete object ("that blue thing", "those things in a room") + fixed idiom "hyvä juttu". `asia` = abstract matter ("the same thing", "the sensible thing", "do things differently"). | No change. Fix tile ↓ |
| 7 | on my own | itse vs yksin | LEGITIMATE | English polysemy. `itse` = unaided/by myself ("I do it myself", "I manage on my own"). `yksin` = unaccompanied ("leave me on my own", "live alone", "went to a film on my own"). | No change. Fix tile ↓ |
| 8 | after | kun / sen jälkeen kun / jälkeen | LEGITIMATE *(thin evidence)* | Three different syntactic slots. `jälkeen` = postposition after a noun ("after the meal") — grammatically obligatory. Clause complement splits by tense: non-past → `kun` (seeds 11, 15, 110); past → `sen jälkeen kun` (362, 371). Motivated — bare `kun` + past tense would read "when", i.e. simultaneous. **But only one past-tense seed exists**, so the "rule" rests on 2 rows. | No change. See GAPS. |
| 9 | different | erilaisia vs eri | REDUNDANT | Defensible (`eri` = various/separate, `erilainen` = of a different kind) but the course never marks it, and "different words" (erilaisia) vs "different areas" (eri) sit in the same slot. Harmless to comprehension. | Leave. Not worth a pass. |
| 10 | something else | jonkin muun vs jotain muuta | LEGITIMATE — **false positive** | One lexeme `jokin muu`, two cases. Genitive `jonkin muun` is governed by the verb frame at seed 98; partitive `jotain muuta` by "tell/say/do" at 250. Exactly the mua/mulle/mun case. | None. |
| 11 | idea | idean / idealta / aavistusta | LEGITIMATE — **false positive** | `idea/idean/idealta` are one lexeme in nominative/genitive/ablative (`kuulostaa idealta` — ablative is governed by the verb). `aavistusta` only in the fixed idiom "not the faintest idea". | None. |
| 12 | most | useimmat vs eniten | LEGITIMATE — **false positive** | Different parts of speech. `useimmat` = quantifier ("most people"); `eniten` = degree adverb ("it hurts most"). Superlative "the most important" uses neither. | None. |

---

## The one real defect, in detail

**Seed 371 is an island.** Two anomalies in one seed:

| | seed 371 | rest of course |
|---|---|---|
| to watch | `kattomaan` | `katsoa / katsomaan / katsoin` — 9 seeds |
| a film | `leffaa` | `elokuva` — seeds 221, 248, 433, 452 |

Both are colloquialisms used **nowhere else**. The course register is already colloquial throughout (mä, sä, oot, haluut) — `katto-` and `leffa` are a *further* step the learner is never given elsewhere.

The direct collision: `S0371L01C02` teaches the tile **"to watch" = kattomaan**, while `S0287L03U01` and others require `katsoa` for the same English, and `S0107` teaches "I want to go look" = "mä haluun mennä **katsomaan**" — identical construction, different stem.

**Recommendation: merge onto `katsomaan`** (13 rows, seed 371 only). `katsomaan` is the form the other 9 seeds already establish, and the object case is unaffected. Whether to also normalise `leffaa` → `elokuvaa` is a separate call — same class of defect, same seed, but "a film" is a noun the learner may reasonably meet twice.

---

## The real pattern the sweep didn't ask about: component tiles

Six "legitimate" candidates share one flaw. The **sentences** are correct; the **bare one-word tile** is not. A tile shows the learner one English word and demands one Finnish word — with no context to disambiguate:

| Tile English | Taught as | …and also as | Fix |
|---|---|---|---|
| how | kuinka (S0033, S0420, S0470) | miten (S0040, S0642) | Retitle: "how (how long/how much)" vs "how (in what way)" |
| very | tosi (S0013, S0147) | kovin (S0055) | Retitle S0055 tile: "very (in a negative)" |
| happy | tyytyväinen (S0076) | onnellinen (S0129, S0408) | Retitle S0076 tile: "happy with / satisfied" |
| thing | juttu (S0047) | asiaa (S0243) | Retitle S0243 tile: "thing / matter (abstract)" |
| on my own | itse (S0173) | yksin (S0351) | Retitle S0173 lego: "myself / by myself" |
| ever | koskaan (S0309) | ikinä (S0480) | Retitle S0480 tile: **"-ever"** — it is not a free word |

This is a **known-side labelling fix, not a target-side rewrite** — the Finnish is right in every case. It costs no TTS on the target side.

Scale note, deliberately not a headline: 161 of 1,732 component tiles share an English gloss with a different Finnish form. **Most of that 161 is pure inflection** (mä/mun/mulle, sanoi/sanoit) and is not a defect. I hand-checked only the six above; I have **not** audited the remainder, and I am not offering 161 or my crude 85-row stem filter as a count of anything.

---

## "really / very" untranslated

Machine sweep: 418 rows where the English contains *really* or *very*; 15 with no Finnish intensifier.

**12 of those 15 were my own false positives** — my stem list missed **`oikeesti`** (colloquial `oikeasti`). Adding it clears seeds 496 and 522 entirely. I have added it to the list.

### HIGH CONFIDENCE (2)

| Seed | Phrase | English | Finnish | Why real |
|---|---|---|---|---|
| 346 | `S0346L03U02` | I really liked it today | mä tykkäsin siitä tänään | Its own siblings prove the intent: `S0346L04U03` "I really liked her book" = "…**tosi paljon**", `S0346L03U04` "I liked it very much" = "…**tosi paljon**". Worse — this row is now identical to what plain "I liked it today" would be, so "I liked it" and "I really liked it" collide. |
| 556 | `S0556L01U05` | they really like to play music in the evening | ne tykkää soittaa musiikkia illalla | Course convention is set at `S0628L01U01` "he really likes tea" = "tykkää teestä **tosi paljon**". Nothing carries *really* here. |

### POSSIBLE (1)

| Seed | Phrase | English | Finnish | Note |
|---|---|---|---|---|
| 571 | `S0571L01U04` | i'm not really convinced yet | mä en oo vielä vakuuttunut | "not really" is an English hedge, not a degree word. "en oo **oikein** vakuuttunut" would be closer, but the current Finnish is idiomatic and the meaning largely survives. Judgement call — I would not spend a pass on it alone. |

**Clustering: no.** Both high-confidence hits are lone rows inside legos that are otherwise correct (seed 346's other five *really/very* rows all carry `tosi paljon`). This looks like two isolated generation slips, not a bad batch.

---

## Verified along the way

**The formal `te` block boundary is seed 639, not 640.** Seeds 639–668 use formal/plural `te`. Three earlier hits exist — **133, 501, 529** — and all three are genuine *plural* "you" ("when you work together", "you play together", "can you all put your hands up?"), not formal address. So the register block is clean; there are no leaks below 639.

---

## GAPS

1. **Candidate 8 ("after") rests on two rows.** The past-tense → `sen jälkeen kun` rule is only witnessed at seed 362 and its reuse at 371. One counter-example would flip this from LEGITIMATE to REAL DEFECT. I could not test it further — the course contains no other past-tense "after + clause". Flagged, not resolved.
2. **The remaining ~155 component-tile collisions are unaudited.** I hand-checked six. I do not know how many of the rest are inflection (most) versus real lexical splits, and I will not guess.
3. **I did not audit the reverse direction** (two English → one Finnish). Kai has ruled that out of scope, so this is by design, not omission.
4. **My intensifier stem list is hand-built and was demonstrably incomplete once** (`oikeesti`). Another colloquial intensifier I have not thought of could be hiding a further false positive in the 2 high-confidence hits — though both are corroborated by their own siblings, which is stronger evidence than the stem list.
5. **Fan-out was refused.** I tried to dispatch the intensifier sweep to a worker; the surface returned a depth-ceiling 400 (this session already sits at the allowed worker depth). I ran it myself in-turn instead. No coverage was lost.

---

## Recommended actions, in priority order

1. **Seed 371: `kattomaan` → `katsomaan`** (13 rows). The only real defect found.
2. **Six tile relabels** (known-side text only, no target change).
3. **Two phrase fixes**: `S0346L03U02` and `S0556L01U05` — add `tosi paljon`.
4. Leave candidates 9, 10, 11, 12 alone. They are not defects.

Any of these would need an audio pass queued for the changed rows — none were changed here.
