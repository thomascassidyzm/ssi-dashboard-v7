# eng_for_sin — අහනවා ask/hear disambiguation: per-row change plan

*2026-08-17. Authored for Kai. **NOTHING IS APPLIED.** This is a proposal.*

Route: Kai's option 2b, realised as the course-attested **ablative addressee** (`-ගෙන්`).
ASK = ablative addressee + අහනවා. HEAR = bare අහනවා, no addressee.

---

## 0. Sanity-check of the diagnosis (it holds, with one correction)

The brief's "7/7 ablative on ASK, 0/10 on HEAR" is right in substance but the wrong
denominator. Full census of the 36 ask/hear-bearing seeds:

* **Every seed that expresses an addressee at all and means ASK marks it ablative — 9/9**:
  30, 99, 136, 176, 177, 190, 203, 208, 223. (Plus 267 `ඔයාගේ යාළුවා ගෙන්` "heard *from*
  your friend", which is ablative-as-source on `ලැබුණාද`, not on අහනවා.)
* **Zero HEAR seeds carry an ablative — 0/12.**
* At phrase level the negative side is exceptionless too: **0 of 125** HEAR-glossed
  practice phrases contain `-ගෙන්/-යෙන්`; 40 of 133 ASK-glossed ones do.
* The **only two** ASK seeds that express an addressee *without* the ablative are 415 and
  465 — which are exactly the two naturalness fixes in section B. That convergence is the
  strongest evidence for the rule.

So the correct statement is narrower and safer than "ASK always takes an ablative":
**when an addressee is expressed, ASK marks it ablative; HEAR never does.** Seeds like
405 (`අපි ඇහුවොත්`) and 423 (`ප්‍රශ්නේ අහන්නේ`) are ASK with no addressee and are fine as they are.

---

## A. The three collisions — mandatory

### Seed 380 — `I asked what` (ASK) vs seeds 364/368/509 `I heard that` (HEAR)

| table | id / key | field | before | after |
|---|---|---|---|---|
| course_seeds | 380 | known_text | `ඇය ඇතුළු කරන්නට ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා.` | `ඇය ඇතුළු කරන්නට ඕනේ කළේ මොකක්ද කියලා මම ඇයගෙන් ඇහුවා.` |
| course_seeds | 380 | target_text | `I asked what she wanted to include.` | `I asked her what she wanted to include.` |
| course_legos | S0380L03 (380:3) | known_text | `මොකක්ද කියලා මම ඇහුවා` | `මොකක්ද කියලා මම ඇයගෙන් ඇහුවා` |
| course_legos | S0380L03 | target_text | `I asked what` | `I asked her what` |
| phrase | S0380L03B01 | known / target | `මොකක්ද කියලා මම ඇහුවා` / `I asked what` | `මොකක්ද කියලා මම ඇයගෙන් ඇහුවා` / `I asked her what` |
| phrase | S0380L03B02 | known / target | `… ඇහුවා අද` / `I asked what today` | `… ඇයගෙන් ඇහුවා අද` / `I asked her what today` |
| phrase | S0380L03B03 | known / target | `… ඇහුවා ගොඩ` / `I asked what a lot` | `… ඇයගෙන් ඇහුවා ගොඩ` / `I asked her what a lot` |
| phrase | S0380L03U01 | known / target | `ඇය ඇතුළු කරන්නට ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා` / `I asked what she wanted to include` | `… මම ඇයගෙන් ඇහුවා` / `I asked her what she wanted to include` |
| phrase | S0380L03U02 | known / target | `ඇය ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා` / `I asked what she wanted to` | `… මම ඇයගෙන් ඇහුවා` / `I asked her what she wanted to` |
| phrase | S0380L03U03 | known / target | `ඔහුට ලැබෙන්නේ නෑ මොකක්ද කියලා මම ඇහුවා` / `I asked what he can't have` | `… මම ඇයගෙන් ඇහුවා` / `I asked her what he can't have` |
| phrase | S0380L03U04 | known / target | `ඔහු ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා` / `I asked what he wanted` | `… මම ඇයගෙන් ඇහුවා` / `I asked her what he wanted` |
| phrase | S0380L03U05 | known / target | `ඒ අය ඕනේ කළේ මොකක්ද කියලා මම ඇහුවා` / `I asked what they wanted` | `… මම ඇයගෙන් ඇහුවා` / `I asked her what they wanted` |

Structural precedent is exact: seed 177 already reads
`ඇය යන්න ඕනේ කොහෙද කියලා මම ඇයගෙන් අහනවා` — same content clause + `කියලා` + `මම ඇයගෙන්` + ask.
The card's 7 `L01` phrases are untouched. One addressee (`her`) is used across the whole
card so the learner meets one form, not a mixture.

### Seed 381 — the card contradicts its own seed

Seed says "I didn't **ask**"; card S0381L03 says "I didn't **hear** if". The card is wrong today.

| table | id / key | field | before | after |
|---|---|---|---|---|
| course_seeds | 381 | known_text | `ඔහු අපිව ගෙන ආවොත් ඕනේ කළාද කියලා මම ඇහුවේ නෑ.` | `ඔහු අපිව ගෙන ආවොත් ඕනේ කළාද කියලා මම ඔහුගෙන් ඇහුවේ නෑ.` |
| course_seeds | 381 | target_text | `I didn't ask if he wanted to follow us.` | `I didn't ask him if he wanted to follow us.` |
| course_legos | S0381L03 (381:3) | known_text | `කියලා මම ඇහුවේ නෑ` | `කියලා මම ඔහුගෙන් ඇහුවේ නෑ` |
| course_legos | S0381L03 | target_text | `I didn't hear if` | `I didn't ask him if` |
| course_legos | S0381L03 | components | `[{කියලා→if},{මම ඇහුවේ නෑ→i didn't hear}]` | `[{කියලා→if},{මම ඔහුගෙන් ඇහුවේ නෑ→I didn't ask him}]` |
| phrase | S0381L03C01 | — | `කියලා` / `if` | **unchanged** |
| phrase | S0381L03C02 | known / target | `මම ඇහුවේ නෑ` / `I didn't hear` | `මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him` |
| phrase | S0381L03B01 | known / target | `කියලා මම ඇහුවේ නෑ` / `I didn't hear if` | `කියලා මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if` |
| phrase | S0381L03B02 | known / target | `මම ඇහුවේ නෑ කියලා ගොඩ` / `I didn't hear if a lot` | `මම ඔහුගෙන් ඇහුවේ නෑ කියලා ගොඩ` / `I didn't ask him if a lot` |
| phrase | S0381L03B03 | known / target | `ඔහු ඕනේ කළාද කියලා මම ඇහුවේ නෑ` / `I didn't hear if he wanted` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if he wanted` |
| phrase | S0381L03U01 | known / target | `ඔහු අපිව ගෙන ආවොත් ඕනේ කළාද කියලා මම ඇහුවේ නෑ` / `I didn't hear if he wanted to follow us` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if he wanted to follow us` |
| phrase | S0381L03U02 | known / target | `ඔහුට ලැබෙන්නේ නෑ කියලා මම ඇහුවේ නෑ` / `I didn't hear if he can't have it` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if he can't have it` |
| phrase | S0381L03U03 | known / target | `ඇය ගොඩ නිශ්ශබ්ද කියලා මම ඇහුවේ නෑ` / `I didn't hear if she was rather quiet` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if she was rather quiet` |
| phrase | S0381L03U04 | known / target | `ඒ අයට වැදගත් දෙයක් තිබිල කියලා මම ඇහුවේ නෑ` / `I didn't hear if they had something important` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him if they had something important` |
| phrase | S0381L03U05 | known / target | `ඇය කළේ මොකක්ද කියලා මම ඇහුවේ නෑ` / `I didn't hear if what she was doing` | `… මම ඔහුගෙන් ඇහුවේ නෑ` / `I didn't ask him what she was doing` |

U05's English is ungrammatical today ("if what she was doing"); the rewrite fixes it in passing.
Precedent: seed 176 `… කියලා මම ඔහුගෙන් අහනවා`.

### Seed 382 — the reuse card must become its own ASK card

`S0382L04` is **`is_new = false`** (verified in the live DB) and shares `known_audio_id`
`9df6163f-c6e1-4721-aad4-7d638720b6d3` with `S0366L03`. It has zero practice phrases.

| table | id / key | field | before | after |
|---|---|---|---|---|
| course_seeds | 382 | known_text | `ඔහු ඒ දාන්නයි ඕනේ කළේ කොහෙද කියලා ඔයා ඇහුවාද?` | `ඔහු ඒ දාන්නයි ඕනේ කළේ කොහෙද කියලා ඔයා ඔහුගෙන් ඇහුවාද?` |
| course_seeds | 382 | target_text | `Did you ask where he wanted to put it?` | `Did you ask him where he wanted to put it?` |
| course_legos | S0382L04 (382:4) | known_text | `ඔයා ... ඇහුවාද` | `ඔයා ඔහුගෙන් ඇහුවාද` |
| course_legos | S0382L04 | target_text | `did you hear` | `did you ask him` |
| course_legos | S0382L04 | is_new | `false` | `true` |
| course_legos | S0382L04 | known_audio_id | `9df6163f…` (shared with S0366L03) | `NULL` (trigger does this; new clip binds on the audio pass) |

**New phrase rows** (8, mirroring `S0366L03`'s shape exactly — 3 × build, 5 × use, no
components, positions 1–8, id convention `eng_for_sin:S0382L04{B|U}nn`):

| id | pos | role | known_text | target_text |
|---|---|---|---|---|
| eng_for_sin:S0382L04B01 | 1 | build | `ඔයා ඔහුගෙන් ඇහුවාද?` | `did you ask him?` |
| eng_for_sin:S0382L04B02 | 2 | build | `ඔයා ඔහුගෙන් ඇහුවාද අද?` | `did you ask him today?` |
| eng_for_sin:S0382L04B03 | 3 | build | `ඔයා ඔහුගෙන් ඇහුවාද ගොඩ?` | `did you ask him a lot?` |
| eng_for_sin:S0382L04U01 | 4 | use | `ඔහු ඒ දාන්නයි ඕනේ කළේ කොහෙද කියලා ඔයා ඔහුගෙන් ඇහුවාද?` | `did you ask him where he wanted to put that?` |
| eng_for_sin:S0382L04U02 | 5 | use | `ඔයා ඔහුගෙන් ඇහුවාද ඔහු ඕනේ කළේ කොහෙද කියලා?` | `did you ask him where he wanted to?` |
| eng_for_sin:S0382L04U03 | 6 | use | `ඔයා ඔහුගෙන් ඇහුවාද ඔහුට ලැබෙන්නේ නෑ කියලා?` | `did you ask him if he can't have it?` |
| eng_for_sin:S0382L04U04 | 7 | use | `ඔයා ඔහුගෙන් ඇහුවාද ඇය ගොඩ නිශ්ශබ්ද කියලා?` | `did you ask him if she was rather quiet?` |
| eng_for_sin:S0382L04U05 | 8 | use | `ඔයා ඔහුගෙන් ඇහුවාද ඒ අයට වැදගත් දෙයක් තිබිල කියලා?` | `did you ask him if they had something important?` |

`S0366L03` and its 8 phrases are **not touched**; they keep the shared clip.
`S0382L02` (also `is_new=false`, sharing a clip with `S0366L02`) is not touched either.

### HEAR seeds left alone — verified

The plan file touches seeds **380, 381, 382, 415, 465 only** (checked programmatically
against the edit list). Seeds **71, 103, 196, 364, 365, 366, 368, 509, 533, 597, 598**:
zero rows. Cross-checked at string level too — the four strings being edited
(`මොකක්ද කියලා මම ඇහුවා`, `කියලා මම ඇහුවේ නෑ`, `මාව ලවා ඇහුවොත්`, `ඔයා ... ඇහුවාද`)
appear in no phrase row outside their own seed.

---

## B. Naturalness fixes with no English change

### B1 — seed 415 `ලවා` → `මගෙන්`. **Recommended, but it is not cheap, and it has a gate.**

`ලවා` is a causative-agent marker; `මාව ලවා ඇහුවොත්` reads "if someone gets me to ask",
not "if you ask me". The fix is right. Two things the brief under-counts:

1. It is **12 rows**, not one — the lego's known text is contiguous, so a seed-only edit
   would leave `S0415L03` un-tileable.
2. **`මගෙන්` is not attested anywhere in the course** — confirmed by the impact tool's
   own ordering check (`taught at seed NEVER`). `-ගෙන්` is well taught by 176/177 and
   `මගේ` by seed 51, so the form is derivable, and phrase `S0415L03C01` would itself
   become the teaching moment. **This needs Kai's ruling**, not my assumption.

| table | id | field | before | after |
|---|---|---|---|---|
| course_seeds | 415 | known_text | `මාව ලවා ඇහුවොත් ඒ ප්‍රශ්නයක් නෙමෙයි.` | `මගෙන් ඇහුවොත් ඒ ප්‍රශ්නයක් නෙමෙයි.` |
| course_seeds | 415 | target_text | `That wouldn't be a problem if you ask me.` | **unchanged** |
| course_legos | S0415L03 | known_text | `මාව ලවා ඇහුවොත්` | `මගෙන් ඇහුවොත්` |
| course_legos | S0415L03 | target_text | `if you ask me` | **unchanged** |
| course_legos | S0415L03 | components | `[{මාව→me},{ලවා ඇහුවොත්→if you ask}]` | `[{මගෙන්→me},{ඇහුවොත්→if you ask}]` |
| phrase | S0415L03C01 | known | `මාව` | `මගෙන්` |
| phrase | S0415L03C02 | known | `ලවා ඇහුවොත්` | `ඇහුවොත්` |
| phrase | S0415L03B01/B02/B03 | known | `මාව ලවා ඇහුවොත්` + `/ අද / ගොඩ` | `මගෙන් ඇහුවොත්` + same tails |
| phrase | S0415L03U01–U05 | known | `මාව ලවා ඇහුවොත් …` | `මගෙන් ඇහුවොත් …` |

All 10 phrase English strings unchanged. `ඇහුවොත්` alone is attested at seed 190.

### B2 — seed 465. **Recommended, and it genuinely is one row.**

`S0465L03` is `මම ... අහනවා` — a discontinuous frame — so the `...` absorbs an inserted
`ඇගෙන්` and **no lego or phrase row needs to change**. Use `ඇගෙන්`, which the course already
teaches at seed 136 (`ඇත්තෙන්ම ඔයාට ඇගෙන් අහන්න පුළුවන්` — "of course you can ask her").

| table | id | field | before | after |
|---|---|---|---|---|
| course_seeds | 465 | known_text | `ඊළඟ සැරේ මම ඇගේ නම මොකක්ද කියලා අහනවා.` | `ඊළඟ සැරේ මම ඇගෙන් ඇගේ නම මොකක්ද කියලා අහනවා.` |
| course_seeds | 465 | target_text | `Next time I will ask her what her name is.` | **unchanged** |

I keep `ඇගේ නම` rather than Kai's sketched `ඇගෙන් නම`, because the English says "**her** name"
and dropping the genitive loses it. The `ඇගෙන් … ඇගේ` sequence is grammatical but slightly
heavy — **one for the native ear** (see residue).

The impact tool flags `ඇගෙන්` as "taught late" because it only knows lego-level teaching;
it is attested at phrase level at seed 136, 329 seeds earlier. That flag is a false positive.

---

## C. Phrase coverage per sense

Counted over the 277 practice phrases whose Sinhala carries an අහ-/ඇහු-/ඇහෙ- form.

| | ASK | HEAR | neither | total |
|---|---|---|---|---|
| **before** | 133 | 125 | 19 | 277 |
| **after this plan** | **150** | **116** | 19 | **285** |

Movements: seed 381's 9 phrases flip HEAR→ASK (they were mislabelled); seed 382 gains 8
new ASK phrases; seed 380's 8 and seed 415's 9 stay ASK but become correctly marked.

Marker coverage — the number that matters for the rule:

| | ASK w/ ablative | ASK bare | HEAR w/ ablative | HEAR bare |
|---|---|---|---|---|
| **before** | 40 | 93 | **0** | 125 |
| **after** | **74** | 76 | **0** | 116 |

Both senses stay heavily drilled (Kai's rule 4 satisfied), and the ablative signal roughly
doubles on the ASK side while staying at exactly zero on the HEAR side.

### Vocabulary attestation for the 8 new seed-382 phrases

Every Sinhala token verified against `course_legos` / `course_practice_phrases` /
`course_seeds` for a debut at or below seed 382 (whole-corpus scan, earliest-occurrence per token):

| token | first taught | where |
|---|---|---|
| `ඔයා` | 1 | lego S0001L04 |
| `ඔහුගෙන්` | **176** | lego S0176L01, A-type, glossed `him`; drilled in 13 phrases at 176 |
| `ඇහුවාද` | 366 | lego S0366L03 |
| `අද` | 7 | lego + phrase |
| `ගොඩ` | 13 | lego + phrase |
| `ඒ දාන්නයි` | 382 | this seed's own L01 |
| `ඕනේ කළේ` | 204 | phrase 209, lego 237 |
| `කොහෙද` | 70 | phrase 170, lego S0382L03 (A) |
| `කියලා` | 8 | lego + phrase |
| `ලැබෙන්නේ නෑ` | 313 | lego + phrase |
| `නිශ්ශබ්ද` | 34 | lego + phrase |
| `වැදගත් දෙයක් තිබිල` | 356 | phrase |
| `ඇය` | 17 | lego |
| `ඒ අයට` | early | lego + phrase |

English side: `him` first at seed 176, `her` at 21, `ask him` at 176, `ask her` at 136.
I deliberately avoided `ඒ අයගෙන්` — the `-ගෙන්` marker is attested only on `ඔයා/ඔහු/ඇය`,
never on `ඒ අය`, so building it would be derivation, not attestation.

---

## D. Impact check — every proposed edit

`node tools/edit-impact-check.cjs --course eng_for_sin --plan docs/a134-sin-ask-hear/plan-edits.json`
(the tool lives on branch `feat/edit-impact-check-2026-08-17`, worktree `.worktrees/edit-impact`; it is not on `main`).

**36 edits checked. Overall decision: `RECONSIDER` (exit 20). 39 danger, 124 warn, ≈150 clips.**

| edit | verdict |
|---|---|
| course_seeds 380 / 381 / 382 / 415 / 465 | `reconsider` (×5) |
| course_legos 380:3 / 381:3 / 382:4 / 415:3 | `reconsider` (×4) |
| 27 phrase edits (380 ×8, 381 ×9, 415 ×10) | `proceed-with-repairs` (×27) |

### The headline RECONSIDER is mostly noise, and I proved it

The scariest line — **"COURSE-WIDE BREAKAGE: 135–143 phrases elsewhere tile through a chunk
this edit removes"** — is a **pre-existing baseline the tool does not subtract**. I ran a
control edit on a completely unrelated lego (`176:3`, `next year` → `next year time`): it
reported **172** broken phrases, in the same seeds (396, 403, 410, 412, 427, 441, 485, 489,
490, 492 …). Intersecting the sets:

| lego edit | reported broken | in the control set (pre-existing) | **edit-caused** |
|---|---|---|---|
| 380:3 | 143 | 135 | **8** — its own phrases, which this plan rewrites |
| 381:3 | 135 | 135 | **0** |
| 382:4 | 135 | 135 | **0** |
| 415:3 | 0 | — | **0** |

So the real collateral damage outside the edited seeds is **zero**. eng_for_sin has ~135
phrases that already fail the tiling check today; that is a separate finding worth its own
plate item, and it is not caused by anything here.

### The dangers that are real

1. **Stale seed audio — `course_seeds` has no audio-nulling trigger.** All five seed edits
   raise this. The learner would keep hearing the OLD sentence with no signal. Repair, per
   the tool: **NULL `known_audio_id`, `target1_audio_id`, `target2_audio_id` by hand in the
   same transaction**, so `audio_autolink` binds the new clips when the pass renders. Named
   stale clips: 380 `d8cf428e / a1d66785 / 1793eced`; 381 `d81a3055 / a872bf67 / d1268275`;
   382 `5ff52ce5 / 77507944 / 13716681`; 415 `1d4d22a8`; 465 `8a499630`.
2. **Presentations go stale — 44 distinct intro clips** embed the old seed sentence and are
   built at render time. Repair: `POST /regenerate-presentations` (self-scopes to missing),
   then queue the audio pass.
3. **`මගෙන්` taught nowhere** (415) — the one genuine "reconsider" in the plan, flagged in B1.
   Needs a ruling, not a fix.
4. **"Same text elsewhere — decide explicitly."** For lego 382:4 the tool names
   `course_legos` 366:3 and phrase `S0366L03B01`. **The explicit decision is NO.** 366 is a
   HEAR seed and keeping its wording is the entire point. The clip they share stays with
   366; only 382's link is nulled. All other "same text elsewhere" hits are the edited
   seed's own rows, already in the plan.
5. Trigger behaviour, verified against the live DB: `trg_null_phrase_audio_on_text_change`
   and its lego counterpart re-resolve via `audio_id_for_text()` — for every one of these
   new texts that resolves to NULL, i.e. a silent slot until the pass runs, not a
   silent re-point to a wrong voice. That is the safe failure mode.

### TTS volume — **no audio is to be generated by this plan**

Tool sum ≈150 clips, which double-counts presentations across sibling edits. De-duplicated:
**82 row clips + 44 distinct presentation clips = 126**, plus ~24 for the 8 new seed-382
phrase rows (which the tool cannot see, because it only checks rows that already exist) =
**≈150 clips**. Voice throughout: `azure_si-LK-SameeraNeural` on the Sinhala side.
The pass must end by **queueing** (`tools/course-optimization/queue-audio-pass.cjs eng_for_sin`),
never by running TTS, and make-before-break applies to every link swap.

---

## E. Learner-progress migration

`S0381L03` changes sense, and `S0382L04` changes from a reuse card to its own card with 8 new
phrase rows — both keep their `lego_id`, i.e. their **slot**, so this is exactly the shape the
content-change migration protocol exists for (rule 6: "a sentence that changed at all counts
as new, not as surviving"). The tool raises the `pod-content-migration` flag on every edit
because eng_for_sin has 1 pod.

**Verified against the live DB, the protocol has nothing to migrate today:**

* `listening_pods` for eng_for_sin: 1 pod (`pod-0`, 142 sentences). **Zero** of those
  sentences contain any අහ-/ඇහු-/ලවා form or any English `ask`/`hear`. The pod is untouched.
* `lego_progress`: **0 rows** for eng_for_sin (the course does not appear in the table at all).
* `seed_progress`: **0 rows** for eng_for_sin.
* `learner_practice_history`: 0 rows globally.

But `courses.new_app_status = 'beta'` — the course **is** learner-reachable, so that window can
open at any time. The plan should therefore still be applied as a single transaction and these
four counts re-checked at apply time rather than trusted from this document.

`courses.content_stamp` bumps automatically (`touch_course_content_stamp`), so learner script
caches invalidate on the next read.

---

## Confidence, per decision

| decision | confidence | why |
|---|---|---|
| The ablative marks the ASK addressee; HEAR never takes one | **high** | 9/9 seeds, 0/12 HEAR seeds, 0/125 HEAR phrases; the only 2 exceptions are the 2 known bugs |
| 380 → `ඇයගෙන්`, "I asked her what" | **high** | frame-identical to attested seed 177 |
| 381 → `ඔහුගෙන්`, "I didn't ask him if" | **high** | frame-identical to attested seed 176; also repairs a card that contradicts its own seed |
| 382 → own ASK card + 8 phrases | **high** on the card, **medium** on the 8 phrase wordings | the card is unambiguously wrong today; the phrasings mirror S0366L03 but are my authorship |
| B1 (415, `මගෙන්`) | **medium** | the diagnosis of `ලවා` is solid; `මගෙන්` is unattested and it is 12 rows, so it needs Kai's ruling |
| B2 (465, `ඇගෙන්`) | **high** on the fix, **medium** on the wording | one row, no English change, `ඇගෙන්` attested at 136; the `ඇගෙන් … ඇගේ` sequence wants an ear |
| "no collateral breakage" | **high** | proved by baseline subtraction against a control edit |
| "no progress migration needed today" | **high** | four live counts, all zero |

## Residue that needs a native speaker's ear

1. **Can `මම ඔහුගෙන් ඇහුවා` be misread as "I heard *from* him"?** The ablative is a general
   source marker, and seed 267 already uses it that way (`ඔයාගේ යාළුවා ගෙන් … ලැබුණාද`,
   "heard from your friend"). With a `කියලා` complement I believe "asked him" is the
   overwhelming reading, but the whole plan rests on this and I cannot settle it from corpus alone.
2. **`ඊළඟ සැරේ මම ඇගෙන් ඇගේ නම මොකක්ද කියලා අහනවා`** — is the `ඇගෙන් … ඇගේ` doubling natural,
   or should `ඇගේ` drop (at the cost of losing "her" from the English)?
3. **`ලවා` appears the same way at seed 365** — `ඇය ඔහු ලවා කිව්ව දේ` = literally "what she got
   him to say", for "what she said to him". Same non-idiom as 415, on `කිව්ව` not on අහනවා.
   Out of scope here (365 is a protected HEAR seed) but it is the same defect class.

## Newly found, NOT planned — the same bug at two more seeds

While censusing I found two more cards whose English says *ask* and whose card says *hear*,
both additionally using `ඇහෙනවා` (the involuntary "be audible") rather than `අහනවා`:

* **Seed 420** — seed: "They don't need to **ask** how old he is." Card `S0420L03`:
  `ඒ අයට ඇහෙන්නේ ඕනෑ නෑ` / "they don't need to **hear**". 9 phrases follow the card.
* **Seed 432** — seed: "They could mean that they want you to **ask**." Card `S0432L01`:
  `ඔයා ඇහෙන්නයි ඒ අය ඕනේ කරනවා` / "they want to **hear** you". 10 phrases follow the card.

Also **seed 103** is broken in a different way: English "We're not trying to hear many more
words", Sinhala `ගොඩ ඉගෙනෙන්නේ ඕනේ නෑ` — which says *learn*, not *hear*.

These are outside the brief and I have planned nothing for them. If they were fixed, the
HEAR phrase count would fall from 116 to 97, which is still ample.

---

*Nothing in this document has been applied. The machine-readable edit list is
`docs/a134-sin-ask-hear/plan-edits.json` (36 edits); the raw impact report is
`impact.json` / `impact.txt` in the same directory.*
