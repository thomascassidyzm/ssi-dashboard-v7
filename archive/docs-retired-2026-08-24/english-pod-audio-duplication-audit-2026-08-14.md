# English pod audio is rendered once per course, not once. Audit, read-only.

**2026-08-14. Live DB + code. Nothing written, nothing rendered, nothing deleted.**

Tom's ruling: every English pod line — known side or target side, any course — is THE SAME line
and should be rendered once and shared. He suspected the schema. He is right, and the schema is
where it is enforced: **course_code is part of the clip's identity key.** One English sentence
cannot exist as one clip. It is physically obliged to exist once per course.

---

## 1. The number

Scope: every `course_audio` row in English (`language` in `en`/`eng`) that is either a pod role
(`pod_fine_known`, `pod_explainer`, `pod_take_g`) or is referenced by a `listening_pod_sentences`
row.

| | |
|---|---|
| English pod clips stored | **58,170** |
| Distinct S3 objects behind them | **58,169** — one per clip. **Zero byte sharing.** |
| Clips actually needed, keyed `(normalised text, voice)` | **17,545** |
| **Redundant clips** | **40,625 — 70% of the estate** |
| Characters rendered | 1,637,380 |
| Characters a dedupe would have needed | 652,725 |
| **Redundant characters paid for** | **984,655 — 60%** |
| Courses involved | 66 |

Every one of those 58,169 S3 objects was a separate paid xAI/Azure render. There is no case
anywhere in the English pod estate of two courses pointing at the same bytes.

**Sharing that does exist is a rounding error.** Of the 10,988 English clips reachable from pod
sentence FKs, **10,490 serve exactly one course**. Only 498 clips (4.5%) are referenced by more
than one course's pods, and only 548 clips are referenced by a course that does not own them —
residue of the pod-0 switchover migration, not a working reuse mechanism.

### Worked example — the same sentence, fifty times

| English line | Voice | Clips | Courses |
|---|---|---|---|
| "I'd like a large glass of white wine, please." | Tom clone | 50 | 50 |
| "Good morning. … Two Americanos and a cup of t…" | Tom clone | 49 | 49 |
| "Could I see the wine list? … I want a glass o…" | Tom clone | 45 | 45 |
| "Excuse me, is this seat taken?" | Olivia | 37 | 37 |
| "Good morning. How are you?" | Olivia | 35 | 35 |

39 distinct (text, voice) pairs are rendered in 32 different courses. 29 more in 30 courses.
The distribution has a long fat middle: this is not a handful of outliers, it is the design.

### By voice

| Voice | Clips | Redundant |
|---|---|---|
| `gfzdpspr5fdp` — **Tom clone** (xAI) | 44,616 | 29,528 |
| `leo` (xAI) — **off-cast** | 6,765 | 5,982 |
| `bedd6226` — **Olivia** (xAI) | 3,549 | 2,478 |
| `en-GB-SoniaNeural` + Azure Libby/Hollie/Ryan — **off-cast** | 3,002 | 2,620 |
| `eve`, human takes, test rows | 238 | 17 |

Secondary finding, not the ask: Tom named Olivia and the clone as the entire English cast.
**9,767 English pod clips — 17% — are on Leo or Azure voices that are not on that cast.**

### The £ answer, honestly

xAI per-character pricing is not in this repo and I did not have a billing source, so I will not
fake a figure. 984,655 wasted characters is, at published neural-TTS rates, somewhere between
tens and a few hundred pounds. **The money is not the story.** The story is that the estate
carries 58,170 objects where 17,545 would do: every QC sweep, every veracity pass, every
whisper decode, every cast change and every revoice pass runs against 3.3× more audio than the
content contains — for ever, and the multiplier grows with every new course.

### Re #518 (deu_at 155, spa 128)

Those per-course English known-audio counts are **per-course duplicate renders, not shared
references.** Measured directly on pod known-side clips:

| Course | Pod known-side rows | Distinct S3 objects |
|---|---|---|
| spa_for_eng | 812 | 727 |
| deu_for_eng | 373 | 264 |
| deu_at_for_eng | 231 | 231 |

Rows exceed objects only because several sentences inside the *same* course reuse one clip.
Across courses, nothing is shared. deu_at_for_eng shares zero bytes with anything.

---

## 2. Why — the exact schema line and the exact code line

### The schema makes it impossible to share

`course_audio`, the unique constraint that defines clip identity:

```
"unique_course_audio_per_voice" UNIQUE, btree (course_code, text_normalized, language, role, voice_id)
"course_audio_course_code_fkey" FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
```

`course_code` is **inside the identity key**, and the row is owned by a course via a cascading
FK. The table cannot express "this clip belongs to the estate." A canonical English clip has no
legal home. That is the schema fault Tom suspected — it is one column in one constraint.

Two further axes of duplication fall out of the same key:

- `role` is in the key, so the same English sentence stored as `known` and as `pod_fine_known`
  is two clips by construction.
- `language` is in the key and the estate writes English under **both `en` and `eng`**.
  1,652 `pod_fine_known` texts exist under both spellings — rendered twice for the spelling alone.

### The render path never looks outside the course

`services/phases/phase8-audio-v13.cjs`

- **`generatePodAudio()` — line 6375.** The only reuse check before paying for a pod render is
  `findExistingAudio(courseCode, …)`.
- **`findExistingAudio()` — line 6292**: `.eq('course_code', courseCode)`. Course-scoped, full stop.
- A correct cross-course lookup **already exists** in the same file:
  **`findSiblingCourseClip()` — line 379**, `.neq('course_code', courseCode)`, whose own comment
  reads *"every miss is a duplicate paid render."*
- It is called from exactly two places — **line 2257 and line 5429**, the non-pod course-audio
  paths. **It is never called from the pod path.** That is the whole bug: the right function was
  written, and the pod renderer does not call it.
- Even where it *is* called, it shares **bytes, not clips** — it inserts a *new* `course_audio`
  row pointing at the sibling's `s3_key`. Cheaper, but the row count still grows per course,
  because the constraint above leaves it no choice.

### The read path assumes per-course rows too

`ssi-learning-app/packages/player-vue/src/composables/listeningMetaCache.ts:327-331`

```ts
.from('course_audio')
.eq('course_code', courseCode)
.eq('role', 'pod_fine_known')
```

The player builds its fine-known map by text, **scoped to the course**. So a fix cannot be a
write-side patch alone — the reader has the same assumption baked in. Good news inside that:
fine-known clips are resolved **by normalised text**, not by id, so a canonical store is a
smaller change than the FK columns suggest.

---

## 3. The structural fix — sized, not built

**Principle: make it physically impossible.** A clip's identity becomes `(normalised text,
language, role, voice)`. Course membership becomes a reference, not part of identity.

### Shape

1. New table `audio_clips` — identity `UNIQUE (text_normalized, language, role, voice_id)`,
   carrying `s3_key`, `duration_ms`, `word_boundaries`, `origin`, veracity columns, `audio_revision`.
   **No `course_code` column at all** — that is what makes the violation unrepresentable.
2. `course_audio` becomes a thin join: `(course_code, clip_id, lego_id, sequence)`. Every existing
   FK holder (`listening_pod_sentences` ×7 columns, `course_legos` ×3, `course_practice_phrases`
   ×4, `audio_clip_flags`, `audio_clip_signoffs`, `audio_repair_candidates`,
   `course_audio_envelope`, `course_audio_revisions`) keeps pointing at a `course_audio` id, so
   **no downstream table changes in phase 1.**
3. Render path: `findExistingAudio` collapses into a clip-store lookup with no course predicate.
   `findSiblingCourseClip` is deleted — it becomes meaningless, which is the point.
4. Reader: `listeningMetaCache` joins through the membership table instead of filtering on
   `course_code`. Same query shape, same text key.

### Size

| | |
|---|---|
| English pod clips collapsed | 58,170 → 17,545 (**40,625 rows deduped**) |
| S3 objects that become orphans | ~40,600 — **keep them**, deletion is a separate approved pass |
| Whole-estate `course_audio` rows to migrate | **1,113,187 English** (+ ~1.2M non-English, same table) |
| Whole-estate English collapse if applied beyond pods | 1,113,187 rows → 712,714 canonical (**400,473 redundant**) |
| Code sites to change | 2 in phase8, 1 in the player cache, plus `tools/render-fine-knowns.cjs`, `pods-registration.cjs`, `pod-bulk-migrate.cjs` |
| Effort | **~3-4 days**: 1 day migration + backfill script, 1 day render path, 1 day reader + e2e, 1 day reconciliation |

### Make-before-break, per the doctrine

The migration is **additive and reversible**: build `audio_clips` and the membership table
alongside the live `course_audio`, backfill by choosing one surviving clip per identity group
(prefer `origin='human'`, then veracity-passed, then oldest), repoint reads, verify served bytes,
and only then consider the orphan objects. No clip is deleted to make the migration work.

### Better × Simpler × Cheaper

- **Better** — one English line, one take. A cast change or a re-voice touches 17,545 clips, not
  58,170, and can never leave half the estate on the old voice.
- **Simpler** — deletes a whole function (`findSiblingCourseClip`), a whole failure mode
  (the `en`/`eng` spelling split), and the "did this course get the reuse pass?" question.
- **Cheaper** — 60% of English pod render spend never happens again, and the QC/veracity/whisper
  estate it feeds shrinks 3.3×.

The one thing it costs: `course_audio` stops being a single flat table, so any ad-hoc SQL that
selects `course_code` from it needs a join. That is the trade, and it is small.

---

## 4. Gaps, declared

- **xAI/Azure per-character billing rates** are not available to me in this repo or from any
  source I could reach read-only. Character counts above are exact; the currency figure is not
  computed rather than estimated dishonestly.
- **S3 object sizes** were not summed — I did not list the bucket (read-only scope, and
  `file_size_bytes` is null on most pod rows). The storage cost of the 40,625 redundant objects
  is therefore unquantified.
- **Non-English duplication** was measured only in aggregate (`text_stripped` counts). The same
  key defect applies to every language, but target-side text genuinely differs per course far
  more often, so the English figure should not be extrapolated.
- The `texts_multi_role` figure (112,315 English texts existing under more than one role) is
  reported but **not** counted as waste — some role pairs carry legitimately different renders.

---

## 5. What this needs from Tom

One decision, not a re-promise: **approve the identity change** — clip identity becomes
`(normalised text, language, role, voice)` with course as a reference — and the ruling stops
depending on anyone remembering it. Until that constraint changes, every new course renders
"Good morning. How are you?" again, because the schema gives it no other option.
