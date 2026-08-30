# A-135 — eng_for_kor: 39 phrases that show and speak English where Korean should be

**Course:** `eng_for_kor` (English for Korean speakers) — `new_app_status = beta`, so these rows reach learners today.
**Date:** 2026-08-17. **Branch:** `fix/jpn-paren-kor-english-2026-08-17`. **Nothing was written to the DB and no audio was generated.**

---

## 1. The defect, and why the audio is the worse half

39 rows of `course_practice_phrases` in `eng_for_kor` carry English on the **known** side — the side that is supposed to be the learner's own Korean. `known_text` is byte-identical to `target_text`.

All 39 also carry a `known_audio_id`, and every one of those clips is the course's Korean voice — `azure_ko-KR-SunHiNeural`, `language = 'kor'` — **reading the English sentence aloud**. A Korean learner is shown an English prompt and then hears a Korean-voiced TTS attempt at English:

| clip | what SunHi actually says |
|---|---|
| `66b426b0-b8ac-46c3-bd60-97d018d98ac0` | "she only had to do the job but she didn't want to stay" |
| `ec6e349d-e0bb-475f-b9e5-ae4ac1c49c6e` | "how do you feel at the moment about speaking English?" |
| `bd2f320d-2223-4307-a12e-7ec9edc2d6fc` | "most people I know don't mind speaking English" |

`target1_audio_id` on all 39 is a separate, correct en-GB clip, so the learner also hears the *same English sentence twice* — once mangled by a Korean voice as their "prompt", once correctly as the answer. The prompt half of the exercise is not merely missing; it gives the answer away.

---

## 2. Verification (re-derived independently)

I did not use the identity test as the finder. I tested for **absence of Hangul by codepoint block**, covering the trap that Korean can appear as compatibility jamo: `AC00–D7A3` (syllables) + `1100–11FF` and `A960–A97F`/`D7B0–D7FF` (conjoining jamo) + `3130–318F` (**compatibility jamo**).

| check | result |
|---|---|
| `eng_for_kor` phrase rows total | 5,408 |
| known side containing **no Hangul at all** | **39** |
| …of which byte-identical to `target_text` | **39** (perfect overlap) |
| no-Hangul but *not* identical | 0 |
| `phrase_role` of the 39 | `use`, all 39 |
| seed spread | S40(2) S280(3) S282(4) S284(1) S288(5) S290(1) S292(4) S294(3) S296(4) S298(4) S300(8) |

**Confirmed: exactly 39, and the seed spread matches Kai's.** The two tests (Hangul-absence and byte-identity) select the same 39 rows independently.

**Lego and seed rows are clean.** `course_legos` for `eng_for_kor`: 546 rows, **0** with a Hangul-free known side, 0 identical. `course_seeds`: 668 rows, **0** and 0. The corruption is confined to the phrase table.

### Estate sweep — this is not only eng_for_kor's problem

Byte-identity alone is a bad estate test (Latin-known courses have legitimate cognate identities — `cat_for_spa` has 240). So I swept for the real shape: courses whose known side is **>90 % non-ASCII** but which still carry **pure-ASCII known rows**.

| course | phrase rows | pure-ASCII known | of which identical to target | clips? |
|---|---|---|---|---|
| `por_for_jpn` | 6,791 | 344 | 48 | none linked |
| `zho_for_jpn` | 3,999 | 50 | 0 | — |
| **`eng_for_kor`** | 5,408 | **39** | **39** | **all 39 linked, Korean-voiced** |
| `eng_for_jpn` | 10,770 | 4 | **4** | **all 4 linked** |
| `cym_for_yor`, `fra_for_zho`, `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_hin` | — | 1–3 each | 0 | — |

Two other courses carry the same defect:

- **`eng_for_jpn` — 4 rows**, same shape exactly (identical, no Japanese, clips linked): `S0248L02U05`, `S0248L01U04`, `S0267L01U04`, `S0269L02U04`. These are learner-reaching in the same way and are **not fixed by this plate**.
- **`por_for_jpn` — 344 rows across whole seeds** (S74, S76, S77, S78, S163 …), all roles, Portuguese copied into the Japanese known side. Different pattern — entire seeds were never translated, not a tail-fill — and **no clips are linked**, so it is a build gap rather than a live audio defect.

**Explicit gap:** I scoped my repair work to `eng_for_kor` as briefed. The `eng_for_jpn` 4 and the `por_for_jpn` 344 are reported, not fixed.

---

## 3. The overwrite-bug question — VERDICT

**Verdict in plain words: these rows were never overwritten. They were born English, by a single phrase top-up run on 2026-05-14, which inserted the rows and rendered their audio 24 minutes later without ever producing a Korean known side.** This is a *generator gap*, not a data-loss event — which means there is no prior Korean to restore for 36 of the 39, and no destructive bug still at large in the edit path.

The evidence is a perfect 1:1 partition, not a correlation:

**(a) `created_at` is a clean, exclusive cluster.**

- All 39 defective rows were created between **2026-05-14 21:15:10 and 21:16:02 UTC**.
- **Zero** other `eng_for_kor` phrase rows were created that day. The set "rows created 2026-05-14" and the set "rows with English on the known side" are *the same 39 rows*.
- Their clean siblings in the same seeds were created **2026-02-25** (the original build) or **2026-06-16** (a later, clean top-up that produced correct Korean). The defect belongs to one run, bracketed by two healthy ones.

**(b) They are gap-fills, not the tail.** They occupy the *missing* U-slots in their legos, which is the fingerprint of a "top this basket up to N use-phrases" pass: S0280L03 had U03 and U07 and gained **U04, U05, U06**; S0288L01 had U05 and gained **U01–U04**; S0284L01 had U05 and U07 and gained **U06**. So the generator was asked for more USE phrases, produced English sentences, and filled `known_text` with the same English instead of translating it.

**(c) The audio was rendered by the same run.** All 39 known clips were created **2026-05-14 21:39:45–21:39:48**, ~24 minutes after the inserts, with `language='kor'` and the course's Korean voice. Text-to-clip was faithful; the text was already wrong when it arrived.

**(d) `content_audit_log` shows no edit — and cannot show the birth.** The log's coverage window is **2026-07-03 00:21:45 → 2026-08-17 11:39:22** (3,369,181 rows). It therefore *begins seven weeks after* both the 2026-05-14 insert and the 2026-06-02 touch, so it can neither confirm nor deny a pre-July Korean value — that is the key negative and I am stating it rather than reading absence as proof. What it does say: the log holds **893** `course_practice_phrases` UPDATE rows for `eng_for_kor`, and **not one of them is any of the 39**. Since 2026-07-03 these rows have not been touched at all.

**(e) `version` is uninformative and I am not leaning on it.** The trigger `increment_version` is unconditional and counts touches, not edits; the 39 sit at v8 alongside clean February siblings also at v8. `decomposition_course_version` is NULL across the whole course.

**(f) A contemporaneous sibling run explains seed 40's oddity.** The reverse-direction course `kor_for_eng` received **168 rows the same evening, 20:12–21:49**, and the `eng_for_kor` 39 fall inside that window. The only other course touched in that six-hour window was `ara_lb_for_eng`. So this was a Korean-pair top-up session, and `eng_for_kor` was the leg of it that had no translation step. Seed 40 is not an outlier in kind — it is simply the one early basket the same run also topped up.

**What I could not establish (honest gaps):**

- **Which code path** ran on 2026-05-14. `changed_by_uid` is NULL estate-wide, the audit log does not reach back to May, and I found no committed generator in this repo with a `known_text := target_text` fallback that I can pin to this run. The *shape* of the bug is proven; the *module* is not named. Anyone re-running a phrase top-up on a non-English-known course should be assumed to reproduce it until the generator is identified.
- **Whether the same run damaged other courses.** `kor_for_eng`'s 185 rows from that evening are all clean Korean-target rows, and the estate sweep in §2 shows no other course with a 2026-05-14 cluster. But I only swept the *current* state; a course repaired since would not show.
- **`eng_for_kor` has no pair contract.** `docs/pair-contracts/` holds eight courses; `eng_for_kor` is not among them, so the known-side gate silently skips this course entirely. Even had it run, `tokenizeKnown` splits on an ASCII-only class, so it is inert for Hangul regardless. **Nothing in the pipeline would ever have caught this**, which is why it survived three months in a beta course.

---

## 4. Recovery vs authoring

| | count |
|---|---|
| **Recovered** (the exact Korean for that exact English already exists in this course) | **3** |
| **Authored** (composed from Korean already given to the learner at or before that seed) | **36** |

Because the rows were born English, there is nothing to recover from the audit log or from an earlier value — recovery here means *the course already contains that sentence elsewhere*. Three do:

| row | English | recovered Korean | already exists as |
|---|---|---|---|
| `S0282L01U01` | no, that's not a problem at all | 아니요, 전혀 문제없어요 | `S0282L01B03` (build) |
| `S0282L01U02` | no, that's not a problem for me | 저에게 아니요, 문제없어요 | `S0282L01B02` (build) |
| `S0300L01U03` | I'm surprised that she seems unfriendly | 그녀가 불친절해 보여서 놀랐어요 | `S0300L01U05` (**use**) |

**⚠ These three are duplicates, and repairing them is arguably the wrong move.** Filling in the recovered Korean makes each row a byte-identical twin of a phrase that already exists — same known side, same target side. For `S0300L01U03` the twin is another **USE** phrase, so the course would carry the same card twice in the eternal spaced-repetition pool. My recommendation to Kai: **delete `S0300L01U03` rather than repair it**, and treat the two S282 rows (whose twins are BUILD rows) as a judgement call. I have supplied the text for all three in the plan so either route is available; the plan flags them with `duplicate_of`.

One more of the same kind, in the authored set:

- **`S0298L01U04`** ("when I'm tired I've got nothing left to say") is a paraphrase of the existing `피곤할 때 저는 할 말이 없어요` = "I've got nothing left to say when I'm tired". Any faithful Korean prompt for this row means the same thing as that sibling, so the learner gets two near-identical Korean prompts wanting two different English word orders — a ZUT fork in spirit even though the strings differ. It is the **only `low` confidence row** and my recommendation is to **delete rather than repair**.

### How the 36 were authored

Rails applied (per `ralph-methodology.md` §"The Known Side Is a Controlled Language", inverted for this pair — here the controlled language is **Korean**):

- Every proposed Korean composes only from Korean the learner has already been given **at or before that seed**, checked against the 546 legos and 5,369 clean phrases of this course filtered by seed number. Where a piece debuts *later* than the row's seed, I said so and downgraded confidence (this is what pins `S0290L01U05` to medium: the course's own `알아야 해요` debuts at S293, three seeds after the row).
- Slightly stilted but tileable Korean is the correct outcome, not a defect — the known side mirrors "ZUT over naturalness".
- I preferred substituting into an *attested frame* over writing free native Korean. Every `high` row is an attested frame plus attested pieces.

### ZUT / collision check — clean

Every one of the 39 proposals was checked against **all** `eng_for_kor` `course_practice_phrases.known_text` and `course_legos.known_text` under the DB's own `normalize_text()` (lowercase, trim, strip trailing `.?!¿¡。？！`), plus against each other:

- **0 collisions among the 39 proposals.**
- **0 ZUT forks** — no proposed Korean maps to a *different* English than an existing row.
- The only 3 matches are the 3 recovered rows, which match rows carrying the **same** English. That is duplication, flagged above, not a fork.

`S0296L01U02` was worded `저는 연습할 시간이 더 필요하다고 말했어요` (not `…더 많은 시간이…`) specifically to avoid colliding with the existing `저는 더 많은 시간이 필요하다고 말했어요` = "I said that I needed more time".

### Confidence distribution

| | count | rows |
|---|---|---|
| **high** | 26 | attested frame + attested pieces, no composition risk |
| **medium** | 12 | a form or collocation the course never shows as a unit, or a piece that debuts later |
| **low** | 1 | `S0298L01U04` — ZUT-risk duplicate, recommend deletion |

**Honesty gap — I am not a Korean speaker and the estate has none.** Per Kai's standing ruling I have made the best attempt and labelled it. The confidence labels measure **conformance to the course's own controlled Korean**, which I can verify mechanically, **not native-speaker naturalness**, which I cannot. The single weakest line, called out explicitly: `S0300L02U02` — `그는 어렵게 보이고 싶어하지 않는다고 생각해요` for "I think he doesn't want to seem difficult". `어렵게 보이다` about a *person* is not idiomatic Korean; it reads closer to "look hard (to do)". I kept it parallel to the seed's `불친절하게 보이고` on controlled-language grounds, but a Korean speaker should confirm or replace it before it ships. `S0300L02U04` (`긴장하게 보이고`) carries a milder version of the same doubt.

Full per-row table with source and reason: **`kor-39-plan.json`** (39 objects, one per row).

---

## 5. Audio plan — make-before-break, and it is automatic

**Verified trigger behaviour, read from the live DB** — `trg_null_phrase_audio_on_text_change` → `null_phrase_audio_on_text_change()`:

```sql
IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
  NEW.known_audio_id := audio_id_for_text(NEW.course_code, NEW.known_text, 'known');
END IF;
```

and `audio_id_for_text` selects the newest live clip (`s3_key IS NOT NULL`, human origin preferred) whose `text_normalized` equals `normalize_text(new text)`, or **NULL** if there is none.

So the moment `known_text` is patched, the wrong Korean-voice-reading-English clip is dropped from the row automatically. Two consequences:

1. **This is make-before-break by construction.** The trigger only *re-points* the link; it never deletes a clip. The 39 defective clips survive in `course_audio` as orphans, so the change is fully reversible from `kor-39-before-images.json`. **No clip may be deleted as part of this plate** — orphan cleanup is a separate decision with its own approval.
2. **The window between the text edit and the render is silent.** A learner hitting one of the 36 unrendered rows in that window gets a correct Korean prompt with no audio. That is strictly better than today's state (English prompt, English audio in a Korean voice), but it should be short: patch text and queue the audio pass in the same sitting.

### Which rows need a render

| | count |
|---|---|
| **Auto-relink to an existing correct Korean clip — no render** | **3** |
| **New render required** | **36** |

The 3 that relink for free (verified live: all `language='kor'`, `azure_ko-KR-SunHiNeural`, `s3_key` present):

| row | new known_text | relinks to | duration |
|---|---|---|---|
| `S0282L01U01` | 아니요, 전혀 문제없어요 | `f1772583-1f9c-4c6a-ae35-d06753ba227f` | 3408 ms |
| `S0282L01U02` | 저에게 아니요, 문제없어요 | `553cfd4a-8d1e-44e1-af69-d8cf56c7196e` | 3600 ms |
| `S0300L01U03` | 그녀가 불친절해 보여서 놀랐어요 | `e7ce0985-5265-4c50-9443-7ce94c91807e` | 3696 ms |

(These are exactly the 3 recovered rows — the estate pattern that a repaired text usually already has a clip holds here, but only for the three that were recoverable at all. The other 36 are new sentences that have never existed in this course, so no clip can exist for them.)

**Voice for the 36 renders comes from the course's own `voice_config`, not from preference** — read live from `courses.voice_config` for `eng_for_kor`:

```
known:  Sun-Hi  /  ko-KR-SunHiNeural  /  azure  /  speed 0.9
```

`target1_audio_id` is **untouched** on all 39 — `target_text` does not change, so the trigger's target branch never fires and the correct en-GB Sonia clips stay linked. No target audio is at risk.

### Sequence I propose (for Kai to run — I have executed none of it)

1. Take `kor-39-before-images.json` as the rollback point (already captured; full row + both linked clips for all 39).
2. Decide the 4 duplicate/ZUT-risk rows first — repair or delete: `S0300L01U03` (recommend delete), `S0298L01U04` (recommend delete), `S0282L01U01`/`S0282L01U02` (judgement call).
3. Run the known-side and ZUT gates on the surviving proposals.
4. Patch `known_text` for the approved rows. 3 relink instantly; the rest go to `known_audio_id = NULL`.
5. **Queue an audio pass** — `node tools/course-optimization/queue-audio-pass.cjs eng_for_kor --reason "A-135 known-side Korean restored on 36 use phrases"` — rather than running TTS. Phase8 `/generate` fulfils it once approved.
6. Leave the 39 orphaned English-in-a-Korean-voice clips in place until the replacements are verified live; propose their deletion separately.

---

## 6. Files

| file | what it is |
|---|---|
| `kor-39-report.md` | this report |
| `kor-39-plan.json` | 39 objects: `row_uuid`, `seed_number`, `old_known_text`, `new_known_text`, `provenance`, `source`, `confidence`, `confidence_reason`, `clip_id`, `clip_action`, `relinks_to`, `needs_render`, `duplicate_of` |
| `kor-39-before-images.json` | full pre-change state of all 39 rows plus their linked known and target1 clips — the rollback image |
| `kor-39-proposals.cjs` | the authored proposals with their provenance notes, as the source the plan was built from |

Nothing in this plate was committed, written to the database, or rendered.
