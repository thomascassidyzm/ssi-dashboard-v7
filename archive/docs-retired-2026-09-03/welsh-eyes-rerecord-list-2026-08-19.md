# Welsh "eyes" re-record list — cym_n_for_eng / cym_s_for_eng

**Forensics only. Read-only. Nothing applied to the DB.** Built 2026-08-19 for Kai.

## Context (given, not re-derived)

In both Welsh-target courses, the course TEXT correctly asks for **angry eyes** (`llygaid blin` north, `llygaid crac` south) but the human RECORDINGS say **pretty eyes** (`del`) — confirmed by ear. The text does not need to change; the audio does.

---

## 1. Exact scope

| course | course_audio rows matching `llygaid` (target1+target2) | unique lines | seed(s) introducing the vocab |
|---|---|---|---|
| cym_n_for_eng | 20 | 10 | **S0272** (lego L05) |
| cym_s_for_eng | 48 | 24 | **S0290** (legos L03, L07) |
| **total** | **68** | **34** | |

How I found it:
- `course_audio.text ILIKE '%llygaid%'` — 20 (north) + 48 (south) rows, all `role IN ('target1','target2')`, all `origin='human'`, all `voice_id='legacy_import'`.
- `course_legos.target_text ILIKE '%llygaid%'` — confirms the base vocab lego and its seed: north `S0272L05` (`these angry eyes` → `y llygaid blin yma`), south `S0290L03` (`these angry eyes` → `y llygaid crac yma`) and `S0290L07` (`angry eyes` → `llygaid crac`). `known_text` on all three is genuinely "angry eyes" — the TEXT is correct, confirming the brief's framing.
- `course_seeds.target_text ILIKE '%llygaid%'` — the seed-level sentence: north S0272, south S0290. One seed each.
- The vocab is **reused** in later seeds' practice phrases (normal SSi recycling), which is where the other 31 lines of the 34 come from: south alone spans seeds **290, 291, 292, 293, 299, 301, 321**. North stays inside **272, 273, 274**. Every one of those rows is a genuine `llygaid` hit (checked — see full list in §3), so "the whole affected seed" for north is really three seeds and for south is really seven; I did not find any seed content contaminated *without* the word `llygaid` itself appearing (no alternate spelling/mutation of `blin`/`crac`/`llygaid` slipped past the regex — Welsh soft-mutation of `llygaid` after a vowel/certain particles would still contain the substring `llygaid`, and I did not find a mutated form starting differently).
- `course_practice_phrases` — 31 of the 34 lines live here (`phrase_role='build'`); the other 3 are the base lego reading itself (no separate phrase row).
- `listening_pod_sentences` — **zero hits**. Both `cym_n_for_eng:pod-0` and `cym_s_for_eng:pod-0` exist and were searched; neither pod script contains `llygaid`. Pods are clean.

### A 4th suspect category found while checking `course_legos`: the 3 presentation clips

The three `course_legos.presentation_audio_id` rows for the base vocab (S0272L05, S0290L03, S0290L07) point at `course_audio` rows whose **text field** is English-only narration ("Right, let's get you using 'these angry eyes' which is:") — but their **duration is 10.4–11.3 seconds**, far longer than that short English sentence would take to read. SSi presentation clips are known to be known-side-only in the *text* column but the *audio* commonly continues into a spoken example of the target phrase after the narration (see memory: presentation clips are known-side only in the DB record, not necessarily in the actual audio). I could not confirm this by ear (no transcription/whisper permitted), so **I am flagging these 3 clips as suspects on duration evidence alone, not confirming them** — Kai should listen to at least one before deciding whether they're in scope:

| id | course | seed/lego | text (DB) | duration |
|---|---|---|---|---|
| 5bc5bbde-6a01-4a60-ba64-644e06e32f39 | cym_n_for_eng | S0272L05 | Right, let's get you using "these angry eyes" which is: | 10.5s |
| 63631a85-9d21-405b-90ec-44fe7d7fe070 | cym_s_for_eng | S0290L03 | Okay, the way you're going to say "these angry eyes" is: | 11.3s |
| 042a3478-5f52-41a4-b266-1450661f0e51 | cym_s_for_eng | S0290L07 | Right, I'd like you to say "angry eyes" like this: | 10.4s |

These 3 are **excluded** from the counts, list, and time estimate below unless Kai confirms them.

---

## 2. Which voice — explicit gap

**I cannot establish which of Aran or Catrin recorded `target1` vs `target2` for these clips, and I am not guessing.** Evidence gathered and why none of it resolves it:

- All 68 rows are `voice_id='legacy_import'` — the bulk-import stub used for the original Welsh recordings, which does not distinguish speaker.
- `courses.voice_config` for both courses has no populated `target1`/`target2` voice entries (empty `name`/`voiceId`) — the only real cast data in `voice_config` is `podCast` (dialogue speakers), which doesn't cover lego/phrase roles.
- `recording_provenance` (345 rows, links `audio_uuid` → `recorded_by`) has **zero rows** for either Welsh course — no help.
- The only non-`legacy_import` tags in either course: `human_aran_cym_n` / `human_aran_cym_n_2`, and **all 111 of them are on `role='target1'` in cym_n_for_eng, none on `target2`**. That's a real but narrow signal (a later fix-pass re-recorded some target1 lines specifically by Aran) — it does not prove target1=Aran across the whole course, and cym_s_for_eng has **no** non-`legacy_import` tags at all, so even this weak signal doesn't exist for the south course.
- `docs/AUDIO_SPLICING_SPEC.md` documents a *general* SSi convention of "target1 (female) / target2 (male)" — for a different course, and it directly **contradicts** the Aran/target1 signal above (Aran is male). I am not resorting to this generic doc as an attribution for Welsh.
- `language_recording_policy` (the real, current source of truth for who reads Welsh) confirms **Aran = m, Catrin = f** for the language as a whole, but has no column mapping role→gender.

**Because of this, the list below is grouped by ROLE (target1 / target2), not by name.** My best evidence-backed guess, stated only as a guess: **target1 = Aran (m)** in cym_n_for_eng, on the strength of the 111-row tag — but I would not act on it for cym_s_for_eng or without Kai spot-checking one clip from each role by ear first (fastest way to resolve this: play one target1 and one target2 clip from the SAME line and note which voice is male/female — 30 seconds, definitive).

---

## 3. The list

Deduplicated by text. Every line needs **2 takes** (one `target1` clip, one `target2` clip) — no line in this set needs only one. Welsh text copied byte-for-byte from the DB (U+2019 apostrophes preserved).

### cym_n_for_eng (10 lines, seeds 272–274)

| seed | lego | pos | target text (read exactly as shown) | takes needed |
|---|---|---|---|---|
| S0272 | L05 | (lego) | y llygaid blin yma | 2 |
| S0272 | L05 | 1 | dianc rhag y llygaid blin yma | 2 |
| S0272 | L05 | 3 | dydy hi ddim isio meddwl am y llygaid blin yma | 2 |
| S0272 | L05 | 4 | i ystyried y llygaid blin yma | 2 |
| S0272 | L05 | 5 | mae o'n deud rhywbeth am y llygaid blin yma | 2 |
| S0272 | L05 | 6 | rhag y llygaid blin yma | 2 |
| S0272 | L05 | 7 | y llygaid blin yma ydy'r unig obaith real | 2 |
| S0273 | L01 | 2 | i fod o dan y llygaid blin yma | 2 |
| S0273 | L01 | 4 | o dan y llygaid blin yma | 2 |
| S0274 | L07 | 1 | dw i ddim isio gwylio'r llygaid blin yma byth eto | 2 |

### cym_s_for_eng (24 lines, seeds 290–293, 299, 301, 321)

| seed | lego | pos | target text (read exactly as shown) | takes needed |
|---|---|---|---|---|
| S0290 | L03 | (lego) | y llygaid crac yma | 2 |
| S0290 | L03 | 1 | fyddai dim byd yn fy ngwneud i'n hapusach na dianc rhag y llygaid crac yma | 2 |
| S0290 | L03 | 2 | y llygaid crac 'ma o'n blaenau ni | 2 |
| S0290 | L03 | 4 | wnaeth hi anghofio'r llygaid crac 'ma | 2 |
| S0290 | L03 | 5 | dianc o ddifri rhag y llygaid crac 'ma | 2 |
| S0290 | L03 | 6 | dydy hi ddim yn hoffi'r llygaid crac 'ma | 2 |
| S0290 | L03 | 7 | mae dianc rhag y llygaid crac 'ma'n hawdd | 2 |
| S0290 | L07 | (lego) | llygaid crac | 2 |
| S0290 | L07 | 1 | mae llygaid crac yn her | 2 |
| S0290 | L07 | 2 | dianc rhag y llygaid crac | 2 |
| S0290 | L07 | 4 | aros ar gyfer y llygaid crac | 2 |
| S0290 | L07 | 5 | y llygaid crac o'n blaenau ni | 2 |
| S0290 | L07 | 6 | dianc rhag y llygaid crac yw yr her nawr | 2 |
| S0291 | L01 | 6 | ma fe o dan y llygaid crac | 2 |
| S0291 | L01 | 7 | hapusach o dan y llygaid crac | 2 |
| S0291 | L04 | 5 | ar ochr arall y llygaid crac | 2 |
| S0292 | L02 | 7 | mae'r llygaid crac yn fy ngwneud i'n hapus | 2 |
| S0292 | L08 | 5 | fydda i byth yn gweld y llygaid crac | 2 |
| S0293 | L02 | 5 | pa un o y llygaid crac 'ma | 2 |
| S0293 | L03 | 7 | fydda i byth yn caru'r llygaid crac byth eto | 2 |
| S0293 | L04 | 4 | y llygaid crac diddorol | 2 |
| S0299 | L05 | 4 | agor a chau'r llygaid crac yna | 2 |
| S0301 | L01 | 2 | tasen i ond yn ymddiried yn y llygaid crac | 2 |
| S0321 | L04 | 3 | er mwyn cyfri'r llygaid crac | 2 |

**Totals: 34 unique lines, 68 takes (10 lines / 20 takes north, 24 lines / 48 takes south).**

---

## 4. How long

Method (as instructed): sum `course_audio.duration_ms` of the **existing** (wrong) clips as the read-time baseline, then apply a multiplier for setup/retakes.

Raw existing-audio duration, by course and role:

| course | role | clips | total duration |
|---|---|---|---|
| cym_n_for_eng | target1 | 10 | 24.0s |
| cym_n_for_eng | target2 | 10 | 25.0s |
| cym_s_for_eng | target1 | 24 | 77.5s |
| cym_s_for_eng | target2 | 24 | 94.9s |
| **total** | | **68** | **221.4s (3.7 min)** |

**Multiplier used: ×5.** Grounded in a real measured session, not a guess: `docs/a108/welsh-known-side-tts-scout-2026-08-15.md` §6 records Aran's 2026-08-10 session — 63 timestamped takes in 15m40s = ~14.9s of wall-clock per clip. Existing clips in this same course run ~2.4–3.9s of actual speech. 14.9s ÷ ~2.8s average ≈ 5.3×, so ×5 is a defensible round number from real throughput, not an arbitrary guess — and it cross-checks: 68 clips ÷ Aran's measured 4.0 clips/min throughput ≈ 17 minutes, versus the ×5-on-duration estimate below of 18.5 minutes. The two independent methods agree within ~10%.

| grouping | raw | ×5 estimate |
|---|---|---|
| cym_n target1 | 24.0s | 2.0 min |
| cym_n target2 | 25.0s | 2.1 min |
| cym_s target1 | 77.5s | 6.5 min |
| cym_s target2 | 94.9s | 7.9 min |
| **combined, both roles, both courses** | **221.4s** | **≈18.5 min** |

Per-role total across both courses (if role maps 1:1 to a person — see §2 gap): role "target1" ≈ 8.5 min, role "target2" ≈ 10.0 min. **I cannot label these Aran/Catrin** per §2.

If the 3 suspect presentation clips (§1) are confirmed in scope: +32.2s raw, +~2.7 min at the same multiplier — but those are compound scripts (English narration + embedded Welsh phrase), so a full re-record of the clip, not a word swap; treat that figure as a soft floor, not a real estimate, until confirmed.

**Total: ≈18.5 minutes combined studio time for the confirmed 68-clip list**, split roughly 8.5/10.0 minutes across the two unidentified roles/voices.

---

## 5. The queue mechanism — described, NOT used

Read: `services/voice-engine/recordist-queue.cjs` (current on `main` via the `baseline-main` worktree — not present as a tracked file in this branch's checkout, confirmed via `git log`) and the `course_audio.rerecord_wanted` jsonb column.

**How it actually works today (2026-08-14 redesign, "one queue per language, not per course"):**

1. The queue is built **per language**, not per course or per role-in-isolation. Welsh (`cym`) is one queue for both `cym_n_for_eng` and `cym_s_for_eng` together.
2. It has two source tracks that both feed the same queue:
   - **Pod dialogue** (`listening_pod_sentences.rerecord_wanted`, shape `{"target": "<voiceId>"}`) — **not applicable here**, since none of these 34 lines are pod sentences (§1 confirmed zero pod hits).
   - **Everything else** (`course_audio.rerecord_wanted`) — **this is the track our 68 clips would use.** Shape read by the code (`fetchRerecordWanted` / the loop below it):
     ```json
     { "voice_gender": "m" | "f", "reason": "<free text, shown to the recordist>" }
     ```
3. The queue is **routed by required gender, not by original speaker** (the code comment is explicit: "who recorded the original is frequently unknowable... which voice the REPLACEMENT needs is always known"). This sidesteps my §2 gap entirely from the recordist's side — Kai does not need to resolve target1-vs-target2-speaker identity to use this mechanism, only to decide **which gender's voice each specific clip needs**, which is exactly the same unresolved fact stated the other way round. A 30-second spot-check (one clip from each role, same line, listen for male/female) would resolve it for both directions at once.
4. `language_recording_policy` row for `cym` (already in the DB, confirmed live) is the routing table: `m` → Aran (`human_aran_cym_n`, aliases incl. `human_aran_cym_s`), `f` → Catrin (`human_catrinlliar_cym_n`, aliases incl. `human_catrinlliar_cym_s`). A flag with `voice_gender: 'm'` on a `cym_s_for_eng` row correctly lands in Aran's queue even though his `cym_s` voice_id is only an alias — this part of the machinery is already correct and estate-wide.
5. What the recordist sees: their queue page lists each flagged clip's `text` (the Welsh line to read), badged "re-record" rather than "not recorded", with an A/B player against the OLD (wrong) clip still live — make-before-break, nothing is unlinked until the new take is verified and upserted onto the same clip identity (`course_code, text_normalized, language, role, voice_id`), which is why `role` (target1/target2) must be preserved on the flag: the new take needs to land on the correct one of the two roles, not just "a" Welsh take of that line.
6. Once a take lands, `clearRerecordWants` retires the flag on every clip in the language sharing that (text, voice) — so flagging once and getting one correct take clears the want everywhere it applies (relevant if the same line ever recurs verbatim in both courses, which it doesn't here since `blin`≠`crac` keeps every north/south line textually distinct).

### The SQL Kai would run — NOT RUN, shown for approval only

Two statements, one per role, each needing its `<VOICE_GENDER>` filled in once §2 is resolved by ear (`m` or `f`):

```sql
-- cym_n_for_eng target1 (10 clips) — role/gender TBD, see §2
UPDATE course_audio
SET rerecord_wanted = jsonb_build_object(
  'voice_gender', '<VOICE_GENDER>',
  'reason', 'cym eyes mixup: text says angry (blin), audio says pretty (del) — Kai forensics 2026-08-19'
)
WHERE id IN (
  '083abe44-d64f-49a3-9202-bfbbf5b13220','1a077a50-f4b3-4f5e-8b49-e3d92a975b1a',
  '2b2216d9-6285-4749-bb3d-f7e202cece46','4aab1040-c87f-4e15-9c3e-1b982ddfb7ae',
  '561e585e-d68b-452a-98b9-dab2f12d2bf6','9bbd7952-d7c0-4547-b225-2ef0a1129781',
  'b33ae82b-5392-4c1c-8a05-2dcdf16875dc','bddd01f2-e449-4f4a-b58f-836b14dfb9d1',
  'e2090518-a1ca-4640-8b5c-9c42c24a87f7','f0ad7ca8-87ff-417c-9366-e9e7c2ffa37f'
);

-- cym_n_for_eng target2 (10 clips) — the OTHER gender from target1's row above
UPDATE course_audio
SET rerecord_wanted = jsonb_build_object(
  'voice_gender', '<VOICE_GENDER>',
  'reason', 'cym eyes mixup: text says angry (blin), audio says pretty (del) — Kai forensics 2026-08-19'
)
WHERE id IN (
  '19b214da-9ff8-402f-bb3d-1186eada419f','262c78c1-a30d-49e5-814d-34763c45af5c',
  '2dc97ff8-9bf6-4ccd-b233-45ee1fafcfaf','3d3dc553-9a3b-4165-81a4-ff311339283d',
  '65b40d02-3834-4b41-87d7-98876e490c8c','7ee48b19-9c44-4fc1-8662-04f033bdeec8',
  'c154bfbd-6cfb-4a7e-a7cd-d37963188328','c5ae221c-0a66-4925-a098-3b536596d114',
  'e55aa8db-123a-46d9-b026-7eb5d02d723c','f75d87f5-a5dd-48f3-a394-c61365b850b5'
);

-- cym_s_for_eng target1 (24 clips) — role/gender TBD, see §2
UPDATE course_audio
SET rerecord_wanted = jsonb_build_object(
  'voice_gender', '<VOICE_GENDER>',
  'reason', 'cym eyes mixup: text says angry (crac), audio says pretty (del) — Kai forensics 2026-08-19'
)
WHERE id IN (
  '082bd5fb-fb0d-4b28-93ec-920ca40b60d9','087bf820-1ca2-4100-9a55-1449ec6c62b7',
  '0c5c10b4-b6dc-4feb-9271-2adf21c78e06','1a5299af-6889-4e18-9995-cb4b8f469cc0',
  '23d579c1-5273-4ace-b92e-5345fa1fd87f','34705439-51d4-40a7-81f0-ae5402bf0dd0',
  '42ee1af8-4c6a-4e5d-a74e-eee048e402d3','48c6a82b-cc6c-4c23-944f-b97c2a37fd0a',
  '5fcfcc9e-712d-4a9d-bcaa-d9737b551d2e','61eec354-6340-42ed-ac6b-a8015df24ec8',
  '6b5c4b8e-0ee4-4714-bf38-8f70b3cc340b','6cba104e-6687-4c10-9f9e-04b01e60925d',
  '73fec21d-5544-4313-82d5-7781845f2da1','74c38246-3ed6-4b21-8ed6-22f9643e9e7e',
  'a3db6b73-3828-4a15-b0c2-a301a6697e55','adde7edc-f03b-455a-9538-13f3ac5a9a92',
  'bb8867b0-bde7-418e-a3b7-14ad00fe4161','c40fd364-6289-4241-b35a-9149d1070a3c',
  'd6a78a71-70e5-449a-a62c-40055460c91b','df9d4d7b-78ed-4525-a8a7-e07dd88226c9',
  'e7f472aa-e773-4945-9a4a-f45b591ee483','f1181a08-15a7-41f4-9f6d-f79bb9554156',
  'f400f785-0839-4a28-9346-96a56d825221','f47a907c-0ea8-4c7c-8f1c-3679b8fbaa70'
);

-- cym_s_for_eng target2 (24 clips) — the OTHER gender from target1's row above
UPDATE course_audio
SET rerecord_wanted = jsonb_build_object(
  'voice_gender', '<VOICE_GENDER>',
  'reason', 'cym eyes mixup: text says angry (crac), audio says pretty (del) — Kai forensics 2026-08-19'
)
WHERE id IN (
  '20e8a38e-61b7-4a61-8de7-3fa8a9bb007a','2598a6a0-d493-4c4f-b44a-7ade2614137d',
  '375352d1-883c-41ee-b1fb-2a811ca65d4b','6a3b72a9-0f6c-4772-8ad4-f403a213fffa',
  '6d58514d-cf41-4aaf-84f1-0555beb3ae49','6e7ff4b0-4fdd-4265-9f67-32be546e0d07',
  '7970f607-29bd-4f70-8b45-ad65939134e1','8919662b-2205-4fda-aad0-8f4133310e53',
  '8e22ebdc-067a-4144-a4e5-0bd72a8f8170','908ac5dd-7401-4cd1-931b-615d2ce04f0a',
  '9b77577f-a9fd-431a-bc3f-188ebcab87d1','ac025d33-f85c-490f-98e5-a2e971eaed66',
  'adeebf9b-710a-4dae-9423-cbb05c09e2f2','b7dde9c1-e6c5-47f4-90df-3de3b41e31e1',
  'c8b7b18e-b3f1-43b3-80b1-68bb56112e33','cbf90552-c090-42c2-aac1-8b9c878e55aa',
  'cd6da9ea-9149-4202-b7ca-09ab9780ef3f','d34121f5-8609-4173-a1c1-0c5a598a150e',
  'da6c78bc-5a03-4df6-b708-2e993d5a1b7a','de939e15-adbf-43b3-a603-e516e01196fc',
  'e4317afa-613c-4cbc-b0b8-80daced332c4','f2da3009-5568-4136-8001-bef6c8dedb01',
  'f301e6cc-ea32-49f8-ba9b-659f140c07de','f6fdd11f-d085-4a79-b21f-1e290ab7ccf2'
);
```

This is a **single approval action, four statements** — one Kai-decision (`<VOICE_GENDER>` per role, resolved by a 30-second listen) away from being runnable. Confirmed `rerecord_wanted IS NULL` on all 68 rows today, so this is a clean write, not an overwrite of an existing flag. **Not run. Nothing applied.**

---

## Explicit gaps, summarized

1. **Target1-vs-target2 speaker identity is unresolved** (§2) — no DB signal distinguishes them for the bulk `legacy_import` rows; the 111-row Aran tag is a real but narrow, north-only signal that contradicts a generic cross-course convention doc. Resolve by listening to one target1 + one target2 clip of the same line.
2. **The 3 presentation clips are suspected but not confirmed** in scope (§1) — flagged on duration evidence (10.4–11.3s for a short English sentence), not heard.
3. **Reading-time multiplier (×5) is grounded in one measured session**, not a multi-day average (the source doc itself flags this as a burst rate, not daily capacity) — treat the 18.5-minute estimate as directionally solid (cross-checked two ways) but not a guaranteed studio-clock figure.
