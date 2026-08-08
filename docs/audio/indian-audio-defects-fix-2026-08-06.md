# Two learner-facing audio defects, English-for-Indian-languages — fixed 2026-08-06

Both were **relink-only**. **No TTS was generated, no clip was deleted, £0 spend.**
Kai authorised regeneration if needed; it wasn't needed — the correct clips already existed
inside the same courses.

---

## Defect 1 — a Japanese clip playing in Tamil and Sinhala courses

**Before.** `S0089L03` in *both* `eng_for_tam` and `eng_for_sin` had
`known_audio_id = ee9f424e…`, a clip owned by **`zho_for_jpn`**: language `jpn`,
voice `azure_ja-JP-ShioriNeural`, text **短.** Learners heard a Japanese woman say
"short" where they should have heard their own language.

**After.** Each lego now points at the correct clip that already existed in its own course:

| course | lego | known text | now plays |
|---|---|---|---|
| eng_for_tam | S0089L03 | நான் செய்தேன் | `2c28fcbd…` — tam / known / azure_ta-LK-**Saranya** / "நான் செய்தேன்" |
| eng_for_sin | S0089L03 | කෙටි | `111e607b…` — sin / known / azure_si-LK-**Sameera** / "කෙටි" |

**Measured proof.**

- Text matches the lego exactly, and `word_boundaries` — which record what the TTS actually
  voiced, token by token — confirm it: the Tamil clip voiced `நான்` (53ms, 382ms) then
  `செய்தேன்` (447ms, 684ms); the Sinhala clip voiced `කෙටි`.
- Both S3 objects live: HTTP 200, 16,992 bytes, 1368 ms.
- Median F0 229 Hz (Saranya) / 138 Hz (Sameera) — matching each course's configured known voice.
- Not truncated. The Sinhala clip's trailing pad is 835 ms with tail RMS 0.0063 measured on the
  50 ms **before** the silence, not inside it; five sibling Sameera clips baseline at
  pad 791–1076 ms, tail RMS 0.0025–0.0084. It sits squarely in normal range.

---

## Defect 2 — both voices were the same speaker in eng_for_tel

Worse than reported: the two slots didn't merely share a *speaker*, they pointed at
**byte-identical S3 objects**. The learner heard the same recording twice.

**Before.** 10 legos, 5 distinct clips, all with `target1` = `gfzdpspr5fdp` = **Tom** —
who is the course's configured `target2`. The course voice config
(`courses.voice_config`) is unambiguous: target1 = **Olivia** `bedd6226`, target2 = **Tom**
`gfzdpspr5fdp`. So **target1 was the wrong slot**, not target2.

**After.** Each of the 5 was relinked to the Olivia (`xai_bedd6226`) clip that already
existed in `eng_for_tel` with the same normalised text:

| text | target1 before (Tom) | target1 after (Olivia) | legos |
|---|---|---|---|
| how do you feel | 667d18be… | f24e5257… | S0040L02, S0642L01 |
| are you ready | 117036be… | 9a23c747… | S0095L01, S0649L01 |
| where do you want to meet | 9c7be7cc… | eacdb828… | S0154L01 |
| what do you think | 84097977… | 5c27590b… | S0162L01, S0651L01 |
| do you mind | 82686c96… | 0411e839… | S0190L01, S0281L01, S0653L01 |

**Measured proof — the two voices are now demonstrably different people.**
Median F0 by autocorrelation over voiced frames:

| clip | Tom (before) | Olivia (after) |
|---|---|---|
| are you ready | 89 Hz | 190 Hz |
| do you mind | 136 Hz | 222 Hz |
| how do you feel | 114 Hz | 262 Hz |
| what do you think | 113 Hz | 213 Hz |
| where do you want to meet | 132 Hz | 219 Hz |

Clean separation, male vs female range, no overlap. All five new clips alive on S3 (HTTP 200),
tail measured before the trailing pad on each — no truncation.

**Consistency, not just correctness.** The resulting pairing — target1 `xai_bedd6226` +
target2 `gfzdpspr5fdp` — is already the second-most common pairing in `eng_for_tel`
(445 legos before this change). This fix moves 10 legos *into* an existing majority pattern
rather than inventing a new one.

---

## Verification: the detection checks, re-run

| check | before | after |
|---|---|---|
| lego audio link owned by a different course | 2 (both the Japanese clip) | **0** |
| lego text ≠ linked clip text | 2 | **0** |
| clip `role` ≠ the slot it's linked into | 0 | **0** |
| target1/target2 same speaker | 10 (eng_for_tel) | **0** |
| target1/target2 identical `s3_key` | 10 (eng_for_tel) | **0** |

All 12 legos re-inspected individually: known clip is in the course's known language, in the
course's configured known voice, with text matching `known_text` exactly; target1 is Olivia,
target2 is Tom, both saying `target_text`.

**Live.** The learning app reads `course_legos.*_audio_id` straight from Supabase per request
(`api/courses/[code]/cycles.ts`) and resolves the id → `s3_key` at request time — there is no
manifest or rebuild between the DB and the learner, so the fix was live the moment the rows
changed. Verified on production: `https://saysomethingin.app/api/audio/<new-id>` returns
HTTP 200 with byte sizes matching the S3 objects for all four sampled new clips. The
`content_stamp` trigger fired on all three courses (13:26 UTC), so devices holding the old
clip bytes cached by id will refetch metadata and stream the new ids.

The authenticated `/api/courses/.../cycles` payload could **not** be fetched — it returns
403 `subscription_required` without a learner session. That is an explicit gap: the read path
is proven by code and by the DB state, not by an end-to-end authenticated player fetch.

---

## Rollback

Pointer-only — every superseded clip row still exists, untouched. Full statements in
`scripts/indian-audio-fix/rollback.sql` (before-state in `before-state.json`), e.g.:

```sql
update course_legos set known_audio_id='ee9f424e-51f7-4f83-827e-2ab276376161'
  where course_code='eng_for_tam' and lego_id='S0089L03';
update course_legos set target1_audio_id='667d18be-52e0-4068-a5d4-145db9c4013b'
  where course_code='eng_for_tel' and lego_id in ('S0040L02','S0642L01');
```

No view refresh needed: `course_round_index` carries no audio columns.

---

## Same-pattern check in these three courses

- **Wrong-language / cross-course links:** exactly the 2 named instances. **Zero others** in
  `eng_for_tam`, `eng_for_sin`, `eng_for_tel` — across legos, practice phrases and seeds.
- **Duplicate-voice legos:** exactly the 10 named, all in `eng_for_tel`. **Zero** in
  `eng_for_tam` or `eng_for_sin`; **zero** in practice phrases or seeds in any of the three.

Nothing beyond the named instances needed fixing in these courses.

---

## ⚠️ The pattern IS general beyond these courses — flagged, not swept

That single Japanese clip `ee9f424e…` is still linked as `known_audio_id` by **22 courses**.
Only `zho_for_jpn` owns it. `eng_for_jpn` is a legitimate same-language borrow. The other
**21 courses are hearing Japanese where they should not**:

| known language of the borrowing course | courses |
|---|---|
| eng (16) | ara_for_eng, ara_lb_for_eng, eus_for_eng, fas_for_eng, gle_for_eng, heb_for_eng, hrv_for_eng, hun_for_eng, isl_for_eng, nep_for_eng, nld_for_eng, ron_for_eng, swa_for_eng, swe_for_eng, tur_for_eng, ukr_for_eng |
| zho (2) | deu_for_zho, ita_for_zho |
| deu (1) | eng_for_deu |
| fra (1) | bre_for_fra |
| spa (1) | cat_for_spa |

The shape suggests a linker that matched on `lego_id` (all of these are the *same* lego id)
without constraining `course_code` — one clip captured the slot in every course that has it.

This is **outside this job's rails** and has not been touched. It is a separate decision.
Note the same fix shape would apply and would very likely also be free: each of those courses
probably already holds its own correct clip, exactly as tam and sin did.
