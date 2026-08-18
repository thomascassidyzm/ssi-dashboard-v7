# fin_for_eng — triage of Kai's six flags, 2026-08-18

**Read-only investigation. Nothing applied, nothing written to Supabase, no audio, no course-data commits.**

Data: live Supabase (`course_practice_phrases`, `course_legos`, `course_seeds`, `course_code='fin_for_eng'`), **14,123 phrase rows**, read 2026-08-18. The proofread snapshot Kai works from holds 12,391 — it is stale, so every number below is live. Flags read from `scripts/proofread-live/tools/proofread/progress/fin_for_eng.json` (2,860 decisions; his last phrase is `S0105L02B05`, i.e. flag 6 is the edge of his progress).

> One measurement warning that changed an answer mid-investigation: **JavaScript `\b` does not fire next to `ä`/`ö`.** `/\bnimeä\b/` returns **zero** on a corpus containing 56 of them. The first census run here reported "nimeä total = 0" and was wrong. All counts below use `(^|[^\p{L}])word([^\p{L}]|$)` with the `u` flag.

---

## The single most important structural fact

**All six flagged rows, and four of the six specifically, are output of the campaign itself.**

| Flag | id | `metadata.pipeline` | created |
|---|---|---|---|
| 1 | S0030L02U06 | `his-her-expansion-2026-08-17` | 2026-08-17 |
| 2 | S0030L03U06 | `his-her-expansion-2026-08-17` | 2026-08-17 |
| 3 | S0052L01U08 | `his-her-expansion-2026-08-17` | 2026-08-17 |
| 4 | S0054L02U06 | `his-her-expansion-2026-08-17` | 2026-08-17 |
| 5 | S0062L01U06 | `his-her-expansion-2026-08-17` | 2026-08-17 |
| 6 | S0105L02B05 | `his-her-expansion-2026-08-17` | 2026-08-17 |

Kai is proofreading yesterday's expansion pass. All six are `status='draft'`, `version=1`, one day old, never released. `known_audio_id` is NULL on all six and **fin_for_eng has no Finnish audio at all** — so every fix or pull below costs **£0 in TTS and regenerates nothing**.

### A correction to the campaign document

The published campaign doc ([/d/ebe9646d](https://watson-1.tail4968cb.ts.net/d/ebe9646d)) states that "her + nimen" is *not possible* and proposes 5 phrases at seeds 24/56 to "complete the fourth box", calling it "the one I'd do next". **In the live data that box is already full.**

| | `nimen` (total) | `nimeä` (partitive) | `nimi` |
|---|---|---|---|
| **his** | 23 | 33 | 5 |
| **her** | **29** | 22 | 11 |
| total | 55 | 56 | 35 |

29 "her + nimen" rows across 20 seeds (22, 23, 24, 25, 29, 30, 31, 32, 52, 56, 59, 61, 62, 84, 152, 170, 182, 184, 205, 380, 464, 521, 622). The 2026-08-17 expansion pass filled it — 34 of the 55 `nimen` rows carry that pipeline tag. **The proposed seed-24/56 job should not be re-run; it is done.** The gendered-`sen` inference is dead on the possessor axis.

---

## Flags 1, 2, 3, 5 — `kysyä` + `sen nimen`

**(a) The objection.** Four phrases put *kysyä* with the genitive-accusative total object `sen nimen`; Kai's ear wants partitive `sen nimeä`, and he says pull rather than fix.

**(b) REAL DEFECT — but not for the reason the flags imply, and the boundary matters.**

The tempting reading is "*kysyä* takes the partitive, so genitive is wrong." **That is false, and the course itself disproves it.** Seed 190 teaches `kysyä muutaman kysymyksen` — *kysyä* with a genitive/total object — across 4 rows (`S0190L03B02`, `B03`, `U01`, `U05`), and it is perfectly good Finnish. Live census of all **243** `kysy*` phrases: **13** carry a genitive/total object, **32** carry a partitive object (`jotain`/`mitään`), **0** have `kysyä … nimeä` in any form.

The real distinction is **aspectual**. The total object with *kysyä* is resultative: `mä kysyin sen nimen` = "I asked, and got, the name." That is why the pre-campaign row `S0380L01U07` — *"I asked his name → mä kysyin sen nimen"* (backfill, 2026-07-21) — reads perfectly well: completed frame, result obtained, total object earned.

All four flagged rows put that same resultative total object under a frame **where the result never occurred**:

- `mä halusin kysyä sen nimen` — *wanted to* ask (and didn't)
- `mä halusin kysyä sulta sen nimen` — same
- `se halusi kysyä sen nimen` — same
- `voinko mä kysyä sen nimen?` — *may I* ask (not yet asked)

The total object asserts an attained result inside a frame that denies one. That is a genuine aspect clash, not a stylistic preference — and it is exactly why Kai's ear rejects these four while the seed-380 row passes him without comment. **His intuition is picking up a real grammatical mismatch, and it is correctly localised.**

Note the modal frame alone does not force partitive — `mä haluun muistaa sen nimen` (seed 20) is fine, because *muistaa* denotes a state that the wanting can fully encompass. It is *kysyä*'s resultativity specifically that clashes.

**(c) The fix — pull four rows.**

| id | basket USE now → after | floor |
|---|---|---|
| `fin_for_eng:S0030L02U06` | 6 → 5 | OK |
| `fin_for_eng:S0030L03U06` | 6 → 5 | OK |
| `fin_for_eng:S0052L01U08` | 8 → 7 | OK |
| `fin_for_eng:S0062L01U06` | 6 → 5 | OK |

The floor is **USE ≥ 5 per LEGO** (`services/course-builder/lib/validation.cjs:25,40`). Honest caveat: that floor is an *authoring* standard surfaced to agents on the submit path — there is no delete-time gate that would block a pull. **No basket breaks; the two that land exactly on 5 leave no margin for a future pull.**

**A fifth row shares the construction and must NOT be pulled:** `S0380L01U11` — *"I asked her name → mä kysyin sen nimen"*, same 2026-08-17 pipeline. It is in the completed frame, so it is correct, and it is the *only* "her + kysyä" row that would survive. Pulling it would re-gender *kysyä*. Kai has not reached seed 380, so he has not ruled on it.

Rewriting to `kysyä sen nimeä` is the alternative, but it would mint a form-combination that appears **0 times** in 14,123 rows, and Kai explicitly said pull not fix. Not recommended without his word.

**(d) Campaign dependency — SUPPORTS, does not conflict.** All four are campaign output. Post-pull balance: `nimen` his 23 / her **25**, `nimeä` his 33 / her 22. Both boxes stay well populated across 20 seeds; the gendered-`sen` inference stays dead. The campaign loses 4 of its 34 `nimen` rows and nothing structural.

---

## Flag 4 — `mä haluun antaa jotain kaverillensa`

**(a) The objection.** "Reads a bit awkward."

**(b) REAL DEFECT — and a sharper one than "awkward". But it is not in the flagged row.**

`S0054L02U01` — *"I want to give something to **his** friend"* — has the **identical** Finnish string `mä haluun antaa jotain kaverillensa`, and predates the campaign (created 2026-07-15). The flagged row is its exact twin with only the English swapped. **Pulling U06 removes one of 18 `kaverillensa` rows and fixes nothing.**

What is actually wrong: the 3rd-person possessive suffix **-nsa must corefer with the clause subject**. Here the only subject is **`mä`** — 1st person. The suffix has **no licit antecedent anywhere in the sentence**. It is not a register wobble; it is a binding violation.

I checked every possessive-suffix row in the course (`kaverillensa`, `laukkuunsa`, `veljensä`, `itsensä` — 44 rows, 75 including all suffix forms) for a 1st/2nd-person subject with no 3rd-person antecedent:

> **Exactly 2 rows in 14,123 fail. Both are `S0054L02`: U01 and the flagged U06.**

Every other suffixed row has a licit `se` — either as the matrix subject (`se halusi kirjoittaa kirjeen kaverillensa`, 25 rows) or inside an embedded clause (`mä luulen, että se antaa sen kaverillensa`, which is fine), or is a subjectless infinitive fragment (10 rows, neutral). **Kai's ear found a real, rare, precisely-localised error — a 2-in-14,123 defect.**

Secondary point, also real: the English says "her friend" but the Finnish expresses no possessor at all, so "his friend" and "her friend" are the same string. That is *genderless and therefore campaign-consistent*, but it means the prompt is not fully recoverable from the answer.

**(c) The fix, and why it is not free.** The natural repair is `mä haluun antaa jotain **sen kaverille**` — explicit possessor, no suffix, exactly parallel to the course's own `sun kaverille` (11 rows at seed 306). It fixes the binding violation *and* expresses the possessor *and* stays genderless.

**But bare allative `kaverille` is not introduced until seed 306** — 252 seeds after this phrase. At seed 54 the only taught form is `kaverillensa`. So the clean fix introduces an untaught form and would fail the vocabulary gate. This is a sequencing problem, not a one-line edit, and it applies equally to U01.

Known-side legality is fine: "her" is introduced at **seed 21** (`her name → sen nimeä`), "friend" by seed 52. The English prompt is legal at seed 54.

**Basket cost if pulled:** `S0054L02` holds 9 (3 build, 6 use); USE 6 → 5, at the floor, OK. But pulling U06 alone leaves the identical, equally-broken U01 in place.

**(d) Independent of the campaign in substance** — the defect is 2026-07-15 vintage. The campaign only *surfaced* it by minting a twin. Fixing it properly is a small vocabulary-sequencing job at seed 54, not a campaign item.

---

## Flag 6 — "we could also add some 'she didn't know's"

**(a)** Not a defect. Kai says so himself. A suggestion.

**(b) He is right that Finnish does not distinguish them.** `se ei tiennyt sen nimeä` is "he didn't know her name" and "she didn't know her name" and "it didn't know his name" — Finnish has no grammatical gender in pronouns, and colloquial `se` covers 3sg regardless. **The course already proves this 88 seeds earlier**: seed 16 teaches `he wants → se haluu`, seed 17 teaches `she wants → se haluu`. Same Finnish, different English, by design.

**(c) Fully legal, and the local bias is real.** English "she" is introduced at **seed 17**, so it is available at 105 with 88 seeds of margin. The basket `S0105L02` holds **13 rows — and 13 of 13 say "he"**. 100% single-gender.

Course-wide the subject axis is balanced: **he 826 / she 824** (50.1% / 49.9%). But that balance is back-loaded:

| seeds | he | she | she % |
|---|---|---|---|
| 0–99 | 144 | 72 | **33%** |
| 100–199 | 44 | 24 | **35%** |
| 200–299 | 110 | 59 | 35% |
| 300–399 | 368 | 433 | 54% |
| 400–499 | 63 | 102 | 62% |
| 500–599 | 75 | 105 | 58% |
| 600–699 | 22 | 29 | 57% |

**The early course — exactly where a learner forms the gender hypothesis — runs two-to-one male.** That is the same shape of defect the possessor axis had, on the subject axis, and it is worse in the first 300 seeds than the global number suggests.

Any of the 13 rows can be twinned he→she. 2–3 additions would balance this basket, e.g. *"she didn't know the answer → se ei tiennyt vastausta"*, *"she didn't know what to say → se ei tiennyt mitä sanoa"*. ZUT is satisfied: these are new English prompts mapping to existing Finnish targets, which is one-known-one-target and legal. Basket would go 13 → 15/16; the USE floor is a minimum, and I found no maximum in the builder validation.

**(d) YES — plainly: this is the same mixing work, one axis over and 84 seeds later.** The seed-21 campaign mixed the *possessor* (his/her → nimen/nimeä). Kai is asking to mix the *subject* (he/she → se). Same defect class, same remedy, same genderless fact underneath. It should be treated as the campaign's next phase, not as a one-basket tweak — and on the numbers above, seeds 0–300 are where it pays.

---

## (A) Actionable under existing rulings — no new decision needed

1. **Pull the four `kysyä` rows** — `S0030L02U06`, `S0030L03U06`, `S0052L01U08`, `S0062L01U06`. Kai's note says pull; the defect is confirmed grammatically; no basket drops below the USE≥5 floor; zero audio cost. His flag *is* the ruling.
2. **Do not pull `S0380L01U11`** ("I asked her name") — correct as written, and the only surviving "her + kysyä" row.
3. **Do not re-run the campaign doc's "complete the fourth box" proposal** (5 phrases at seeds 24/56). The live data shows 29 her+nimen rows; the box is full. Re-running it would add redundant content.

## (B) Needs Kai's word — one sentence each, one-word answerable, smallest first

1. **`S0054L02U06` is an exact twin of the pre-existing `S0054L02U01`, which has the same error — pull both?**
   *Recommendation: yes.* Pulling one leaves the identical defect live.

2. **Should the two seed-54 `kaverillensa` rows be repaired to `sen kaverille` even though that form isn't taught until seed 306?**
   *Recommendation: no — pull them instead.* The repair needs a vocabulary-sequencing change; pulling is clean and the basket holds at 5 USE.

3. **Add 2–3 "she didn't know" rows to `S0105L02`, which is currently 13/13 "he"?**
   *Recommendation: yes.* Legal since seed 17, genderless in Finnish, no audio cost.

4. **Open the subject-axis (he/she) mixing pass across seeds 1–300, where the course runs 33–35% "she"?**
   *Recommendation: yes.* This is the biggest item here and the one flag 6 is really pointing at — but it is a campaign, not a fix, and it is your call whether it runs now.

---

*Triage only. No course data was modified, no audio generated, no Supabase writes performed.*
