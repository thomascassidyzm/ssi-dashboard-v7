# Presentation-clip repair — GATED PLAN (nothing applied)

**Nothing here has been applied.** No database writes, no audio generated, no commits, nothing merged. This replaces the plan of earlier tonight, which I withdrew because its "262 ready for approval" was derived mechanically and never gated on a human reading the row.

**Top item needs one word from you: 27 corrupt `eng_for_sin` clips, $0.0087 to fix. See §1.**

---

## 1. TOP ITEM — 27 corrupt clips, parked for your ruling

27 `eng_for_sin` presentation clips do not narrate a sentence. They are a stutter-loop of a repeated syllable — `ඉංග්‍රීසිෙන්. 'සම්බන්ධව'. 'සම්බන්ධව ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :` — with 6–8 second durations, so learners hear the gibberish today.

I scanned **all 72,063** presentation clips for this pattern. **27 corrupted, every one in `eng_for_sin`, none anywhere else in the estate.** It is contained.

| | |
|---|---|
| clips | 27 |
| total characters | 2,172 |
| voice | `azure_si-LK-SameeraNeural` (single voice) |
| **cost, Azure S0 @ $4/1M chars** | **$0.0087** |
| cost, xAI @ $15/1M chars | $0.033 |

**Not a single clip has been generated.** Under a penny — the cost is not the reason to hesitate, the rule is. This is the only bucket in the whole sweep where learners currently hear nonsense, and I'd put it first.

---

## 2. The gated repoint set — 134 rows, every one read by a human

**Gating rule applied:** a row enters this plan only if a named reader individually read it and returned REAL-MISROUTE. Nothing extrapolated, nothing pattern-extended, nothing resting on my string matching.

### 2a. `fra_ca_for_eng` — all 385 rows re-read from scratch (115 misroutes)

The earlier fra_ca verdict read 137 of 386 rows and extrapolated the rest. **I discarded that extrapolation entirely** and put all 385 rows through a fresh row-by-row read by five readers. Every chunk reports **zero unread rows**, and the verdicts reconcile exactly to 385.

| chunk | reader | REAL-MISROUTE | REAL-STALE | false positive | row-by-row table |
|---|---|---|---|---|---|
| 1 | #640 | 21 | 8 | 48 | https://watson-1.tail4968cb.ts.net/d/59425fc2 |
| 2 | #641 | 31 | 9 | 37 | https://watson-1.tail4968cb.ts.net/d/fd1d99a4 |
| 3 | #642 | 23 | 23 | 31 | https://watson-1.tail4968cb.ts.net/d/1e76a5db |
| 4 | #643 | 26 | 23 | 28 | https://watson-1.tail4968cb.ts.net/d/2684b0be |
| 5 | #644 | 14 | 52 | 11 | (table inline in report) |
| **total** | | **115** | **115** | **155 (40%)** | 385 rows, 0 unread |

Each reader named the specific LEGO each misrouted clip should point to. **Those per-row targets live in the five linked tables** — they are the change set for this course, and I have not retyped them here rather than risk transcription error.

### 2b. Other courses — 19 rows

Reader-confirmed misroutes with a concrete target, from #626 / #628 / #629:

`hye_for_eng` 5 · `eng_for_sin` 9 · `eng_for_kor` 3 · `spa_for_eng` 3 (only the 3 individually named — the other 58 were pattern-extended and are **excluded**)

**Gated total: 115 + 19 = 134 proposed repoints.**

---

## 3. Why the mechanical set did not survive — auditable, not just asserted

My withdrawn plan proposed 484 repoints derived by exact string match of a clip's headword against `known_text`. Three independent tests killed it as an approvable set:

**a) The readers' false-positive rates.** Every slice came back 38–91% false positive:

| slice | reader | rows | REAL | FP | FP rate |
|---|---|---|---|---|---|
| long tail (26 courses) | #630 | 108 | 6 | 102 | 94% |
| Welsh/Croatian | #627 | 132 | 2 | 130 | 98% |
| South Asian/Korean | #628 | 187 | 50 | 137 | 73% |
| Germanic/Romance | #629 | 196 | 83 | 113 | 58% |
| zho family | #626 | 363 | 206 | 157 | 43% |
| fra_ca | #640–#644 | 385 | 230 | 155 | 40% |

Applied to the zho-family repoints alone, that predicted **~43 of 90 would have targeted rows whose current link was fine** — repointing those would have *created* defects.

**b) String identity is not sense identity.** #644 caught two homograph traps in one 77-row chunk: headword "work" matched a LEGO meaning *work-the-noun* (`de l'ouvrage`) when the example was *work-the-verb* (`marcher`); "well" matched an interjection LEGO when the example was the adverb. **48% of my 471 proposals (225) had a single-word headword** — exactly the shape at risk.

**c) The target often isn't free.** #641 found that only 2 of its 31 misroute targets were actually available. I tested this across all 484: **155 proposed target clips are already linked to another LEGO.** Repointing those would either steal a working clip or create clip sharing — and **the estate currently has zero shared presentation clips**. Only **329 of 484** targets are genuinely free, and freeness alone was never sufficient anyway.

**None of the 350 mechanical candidates outside the gated set are proposed.** They are not disproven — they are unread, and under your rule unread is not approvable.

---

## 4. What the readers established about the mechanism

Four readers independently reached the same conclusion, which I now treat as established rather than hypothesised: **an off-by-one shift in a bulk link pass**. `zho_for_jpn` seed 27 is the clearest proof, verified mechanically —

`S0027L01` holds the clip for `S0027L03` · `S0027L02` holds `S0027L01`'s · `S0027L03` holds `S0027L04`'s · `S0027L04` holds a clip belonging to no LEGO at all.

A rotation by one position. But note these are **chains, not pairs** — `S0025L01`'s clip belongs to `S0119L01`, a different seed. Each chain must be resolved end to end, which is why I am not proposing them as simple swaps.

**The dominant false-positive source** was also identified independently by #640, #642, #643 and #630: the phrase-vs-LEGO boundary. Clips legitimately narrate a decomposed component or a cumulative build-up phrase rather than the LEGO's trimmed `known_text`. That is course methodology, not a defect, and it inflated my original 1,365 more than anything else.

---

## 5. Evidence for the known_text audit (handed over, not investigated)

Flagged for the separate scan already running. **These must be excluded from every re-render route — regenerating them would entrench the error**, because in each case the clip is faithful and the *text* is wrong:

| course | LEGO | what is wrong |
|---|---|---|
| `eng_for_zho` | S0011L01 | known=`我想` ("I want"), target="To be able", clip says 能 — the clip matches the target; `known_text` is the wrong field |
| `eng_for_jpn` | S0195L01 / S0195L02 | `target_text` itself is wrong; the clip faithfully voices the wrong value |
| `fas_for_eng` | S0056L03 | known="a few" paired with target=`کلمه` ("word"); clip correct, pairing broken |

**Plus 23 LEGOs in CJK-known courses whose `known_text` is plain English** — 2 in `zho_for_jpn` (`S0052L02` "last week", `S0053L01` "bag") and **21 in `por_for_jpn`** (e.g. `S0175L01` "what do you want to do", `S0166L01` "my name"). `por_for_jpn` has no presentation layer at all, so nothing else in this sweep would ever have surfaced them.

---

## 6. A second presentation surface I had not checked — coverage correction

`course_practice_phrases` has its **own** `presentation_audio_id`: **56,671 linked rows across 77 courses**. Every figure in my earlier reports described only the `course_legos` surface.

| | lego surface | phrase surface |
|---|---|---|
| linked rows | 72,063 | 56,671 |
| raw hits | 6,054 | 2,287 |
| residue after the same cuts | 1,365 | **206** |
| divergence rate | ~1.9% | **~0.36%** |

Five times cleaner — but it **corrects a claim I made**: three courses I reported as clean are not. `kor_for_eng` (50), `jpn_for_eng` (43), `eng_for_urd` (7) have zero divergences on the LEGO surface and real ones here.

The 206 are **detector output, not read rows** — they are an unread list, not proposed changes.

---

## 7. Gaps — stated, not papered over

- **350 mechanical candidates are unread** and therefore not proposed (§3).
- **206 phrase-surface rows are unread** (§6).
- **`hye_for_eng` has a systematic narration defect** outside this plan's shape: its clips quote *romanised Armenian* where the English prompt belongs — `"The Armenian for: 'yeghbayrov', as in — 'I can work with ko yeghbayrov'"`. Needs its own look.
- **Nobody has listened to any audio.** Every verdict rests on `course_audio.text`; `word_boundaries` is NULL across these clips, so not even token-level confirmation was possible. If a clip's stored text is right and its audio is wrong, this sweep cannot see it.
- **6 South Asian rows need a native speaker** (Armenian, Sinhala, Punjabi nuance) — flagged by the reader as beyond its competence rather than guessed.
- **`cym_*` courses cannot be TTS re-rendered at all** — `/^cym_/` 403s at the chokepoint. Repointing is the only machine route; anything else needs a recording session.
- **Practice phrases can never be a repoint destination** — `presentation_audio_id` links only to `course_legos`, and `course_practice_phrases.lego_id` is NULL throughout `fra_ca_for_eng`. Some misroutes are therefore unresolvable by repointing.
- **Croatian is not a human-voice language.** `services/shared/human-voice-courses.cjs` names only `cym_n_for_eng`, `cym_s_for_eng`, `bre_for_fra` plus `/^cym_/`. My earlier "68 hrv clips breach policy" finding was wrong and is withdrawn.
- **The Welsh human re-record bucket is 2, not the 45 I first reported.**

---

## 8. Recommended order, when you rule

1. **The 27 `eng_for_sin` corrupt clips** — $0.0087, contained, learners hear gibberish now.
2. **The 134 gated repoints** — free, reversible, each backed by a named reader's sense judgement. Apply the `fra_ca` chains end-to-end, not pairwise.
3. **The `known_text` audit** (§5) must land before any re-render is ordered anywhere, or fixes will entrench text errors.
4. **The 115 `fra_ca` REAL-STALE rows** — genuine re-render candidates, cost not yet estimated.
5. Everything unread stays unread until someone reads it.
