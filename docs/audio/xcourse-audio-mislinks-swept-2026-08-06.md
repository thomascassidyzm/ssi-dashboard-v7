# Cross-course audio mislinks — swept

**2026-08-06.** Kai approved the sweep. Relink-only: no TTS, no generation, no content-text edits, nothing deleted.

## Headline

| | |
|---|---|
| Cross-course links found | **46** across **26** courses |
| Legitimate sharing among them | **0** |
| Fixed by relinking (free, instant) | **45** |
| Needing generation — **not done**, awaiting your call | **1** (`bre_for_fra`) |
| Detector after the fix | **1** — exactly the held row, nothing else |

Your figure of 21 was low. The same clip was in **22** courses, not 21, and it was
one of **four** Japanese clips doing this, not one.

## 1. The known clip — verified, and it was 22

`ee9f424e…` (owner `zho_for_jpn`, voice `azure_ja-JP-ShioriNeural`, text `短.`)
was `known_audio_id` for lego `S0089L03` in **22** courses:

`ara_for_eng`, `ara_lb_for_eng`, `bre_for_fra`, `cat_for_spa`, `deu_for_zho`,
`eng_for_deu`, `eng_for_jpn`, `eng_for_zho`*, `eus_for_eng`, `fas_for_eng`,
`gle_for_eng`, `heb_for_eng`, `hrv_for_eng`, `hun_for_eng`, `isl_for_eng`,
`ita_for_zho`, `nep_for_eng`, `nld_for_eng`, `ron_for_eng`, `swa_for_eng`,
`swe_for_eng`, `tur_for_eng`, `ukr_for_eng`.

`eng_for_tam` and `eng_for_sin` are absent — confirming this morning's fix held.

## 2. The wider sweep — calibrated first

**Calibration statement, explicitly: the detector found the known 22 before any
wider number was reported.** It was run once before any write, and its first
output line was the calibration count.

The detector is a single join: for every content row that holds an audio
pointer, is the pointed-at `course_audio.course_code` different from the content
row's own `course_code`? Run across **every** audio-link column in the estate
that is course-scoped:

| Column | Cross-course |
|---|---|
| `course_legos.known_audio_id` | **46** |
| `course_legos.target1_audio_id` / `target2_audio_id` / `presentation_audio_id` | 0 |
| `course_practice_phrases` — all four slots | 0 |
| `course_seeds` — all three slots | 0 |
| `lego_introductions.audio_uuid` / `presentation_audio_id` | 0 |
| `seed_cycles` — all three slots | 0 |
| `pod_legos.explainer_audio_id` | 0 |

**EXPLICIT GAP:** `listening_pod_sentences` has **no `course_code` column**, so
this detector cannot scope it and it was not checked. That is also where
legitimate sharing lives (the `comp:leo` pod narrator is shared by design and is
not a defect), so a course-scoped test would be the wrong test there anyway. It
needs a different check, which this job did not do.

### Per course

| Course | Fixed |
|---|---|
| `deu_for_zho` | 6 |
| `eng_for_ara` | 5 |
| `fra_for_zho` | 5 |
| `ita_for_zho` | 5 |
| `spa_for_zho` | 4 |
| `ara_for_eng`, `ara_lb_for_eng`, `cat_for_spa`, `eng_for_deu`, `eng_for_jpn`, `eng_for_zho`, `eus_for_eng`, `fas_for_eng`, `gle_for_eng`, `heb_for_eng`, `hrv_for_eng`, `hun_for_eng`, `isl_for_eng`, `nep_for_eng`, `nld_for_eng`, `ron_for_eng`, `swa_for_eng`, `swe_for_eng`, `tur_for_eng`, `ukr_for_eng` | 1 each |
| `bre_for_fra` | **0 — held, see §4** |

All 46 trace to just **four** clips, all Japanese `Shiori`, all `role='known'`,
all generated in one batch on **2026-05-20**:

| Clip | Owner | Text | Linked into |
|---|---|---|---|
| `ee9f424e…` | `zho_for_jpn` | `短.` | 22 legos |
| `8c51b82d…` | `spa_for_jpn` | `有.` | 10 legos |
| `13fdb601…` | `spa_for_jpn` | `他.` | 9 legos |
| `e405f329…` | `ita_for_jpn` | `有.` | 5 legos |

## 3. Confirmed vs plausible — the criterion

**Criterion:** a cross-course link is a *confirmed defect* when the linked clip
fails either test against the lego it serves — (a) clip text ≠ the lego's
`known_text`, or (b) clip `voice_id` ≠ that course's configured known voice.
A cross-course link that passes both is *legitimate sharing* and was left alone.

**All 46 are confirmed. None are plausible-only, and none are legitimate.**

- **41** fail on text: a British-English learner at `S0089L03` was hearing a
  Japanese voice say `短` where the lego reads `in a short time`.
- **5** have text that coincidentally matches (`有`, `他`, `短` in the
  `*_for_zho` courses) but fail on voice: `azure_ja-JP-ShioriNeural` against a
  configured `azure_zh-CN-XiaochenNeural`. A Japanese voice reading a Chinese
  character is the wrong sound, not a shortcut.

No shared-audio or pod narration was touched. `pod_legos` and the `comp:leo`
narrator came back clean at zero.

## 4. The one held back — `bre_for_fra`, needs your decision

`bre_for_fra` `S0089L03` (`en peu de temps`). This course has **no lego audio at
all**: 630 legos, and the only linked slot in the whole course was this wrong
Japanese clip. There is no in-course clip to relink to, so per your rails **no
audio was generated and the row was left as-is**.

The nearest clip is `a1e601ca…` in `eng_for_fra` — right text, right language,
`azure_fr-FR-CelesteNeural`. Borrowing it would be another cross-course link, so
I did not.

**My recommendation, for you to accept or reject:** null the link rather than
generate. One silent slot matches the other 629; a Japanese voice does not.
That is one statement and it is written down, unrun, in the revert file's
sibling section. **Say the word and I will run it — it costs nothing.**

## 5. Proof, per fix, before and after

Every one of the 45 was checked before the write and again after:

- clip's `course_code` **==** the lego's course — 45/45
- clip text **exactly** equals the lego's `known_text` (trailing punctuation
  normalised) — 45/45
- clip `voice_id` **==** that course's configured known voice, taken as the
  modal known-role voice actually in use in that course — 45/45
- the S3 object exists and is non-trivial — **45/45 HEAD-checked live**

After the write, the same three checks were re-run by reading the DB back:
**45/45 pass, zero failures.** 38 of the 45 replacement clips had been sitting in
their own course unlinked — generated, paid for, never pointed at.

The write ran as **one transaction** with a per-row before-state assertion
(`WHERE known_audio_id = <the wrong id>`); any row that had drifted would have
aborted the whole pass. None did: 45 rows, 45 updates.

## 6. Detector re-run after the fix

```
TOTAL cross-course links: 1
BY PAIR: zho_for_jpn -> bre_for_fra  (1)
```

One row: the held `bre_for_fra` slot. Everything else is zero.

## 7. Rollback

Nothing was deleted. All four Japanese clips are still present and untouched;
only the 45 lego pointers moved. The revert is 45 statements in one transaction:

`docs/audio/xcourse-mislink-revert-2026-08-06.sql`

## 8. The cause — what it is not, and what I could not name

I could **not** name the guilty code path, and I am not going to invent one.

**Ruled out, by reading the actual definitions:**

- `link_audio_to_content()` — the `AFTER INSERT` trigger on `course_audio`.
  Every one of its twelve `UPDATE`s carries `WHERE course_code = NEW.course_code`.
  **Correctly scoped.**
- `link_all_audio_ids(p_course_code)` — the bulk RPC. Every subquery carries
  `ca.course_code = cl.course_code`. **Correctly scoped.**
- `tools/audio-link-reconcile.cjs`, the standing relink tool — loads its audio
  universe with `FROM course_audio WHERE course_code = $1`. **Correctly scoped.**
- `services/phases/phase8-audio-v13.cjs` link paths, and
  `services/supabase-client.cjs` `upsertCourseAudio`. **Correctly scoped.**

**Searched and found nothing:** a scan of both repos for any write to
`known_audio_id` keyed on `lego_id` in a context lacking `course_code` returns
**zero hits**. Whatever wrote these links is not in the current tree — it was
either removed, or it was a one-off script, or it ran outside these repos.

**What the evidence does say.** The links were **first-fills** (NULL → the
foreign id), which is why `content_audit_log` has no record of them: the audit
trigger deliberately skips first-fills. The link key was `lego_id`, not text —
41 of 46 have no text relationship whatsoever, and the same handful of lego ids
(`S0089L03`, `S0131L01`, `S0151L02`, `S0176L01`, `S0207L01`, `S0222L01`,
`S0131L05`) recur across unrelated courses. That is positional, lego-id-keyed
assignment from a query that never filtered by course.

**A real upstream defect, separately.** The four clips are themselves malformed
and always were. Each holds **Chinese** text (`短`, `有`, `他`) with
`language='jpn'`, a Japanese voice, under a `*_for_jpn` course whose known side
is Japanese — and three of the four are not used by their own course at all.
They came from one batch within fifteen minutes on 2026-05-20. Something wrote
Chinese known-side text into Japanese-course audio rows. That is worth its own
job; it is not fixed here.

**Related, and also not fixed here:** `zho_for_jpn` `S0089L03` has
`known_text = 短` — Chinese text in a Japanese-known course. A content defect,
out of this job's rails (no content-text edits).

**The durable fix I would propose** — and did **not** implement, since you asked
for no pipeline changes in this job — is a database constraint rather than
another careful caller: a `BEFORE INSERT OR UPDATE` trigger on `course_legos`,
`course_practice_phrases` and `course_seeds` that raises if the referenced
`course_audio.course_code` differs from the row's own. That makes the defect
class unrepresentable instead of merely undone, and it is the only version of
this fix that survives the next script nobody remembers writing.

One residual propagation risk worth noting, though it is **not** the origin:
`resolveHolders()` in `tools/regen-seed-clips-from-scratch.cjs` reverse-looks-up
holders of a clip id across **all** courses with no course filter. It repoints
old→new for the same clip, so it preserves cross-course sharing rather than
creating it — but under the proposed constraint it would start failing loudly,
which is the correct outcome.
