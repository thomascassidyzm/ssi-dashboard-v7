# Pod switchover and learner-progress migration — the detail

*2026-08-14. Components 4 and 5 of the pod programme. The short page written for Tom is
`pod-migration-rules-2026-08-14.md`; this is everything long that sits behind it.*

Nothing learner-facing was moved by this work. No migration code was written — the rules
need blessing first. The numbers below are live reads of the production database on
2026-08-14, reproducible with `node tools/pods/pod-overlap-report.cjs`, and the raw output
is committed as `pod-overlap-2026-08-14.json`.

---

## 1. The serving path, verified

Five player read paths and one server path. **Every player path hardcodes the pod id
`` `${courseCode}:pod-0` ``** — there is no slug column lookup, no `pod_order` walk, no
config flag:

| Path | Evidence |
|---|---|
| `packages/player-vue/src/composables/useListeningPods.ts:161` | `` const podId = `${course}:pod-0` `` |
| `packages/player-vue/src/composables/listeningMetaCache.ts:269` | `` const podId = `${courseCode}:pod-0` `` |
| `packages/player-vue/src/composables/usePodLapScheduler.ts:483` | `` .eq('pod_id', `${courseCode}:pod-0`) `` |
| `packages/player-vue/src/providers/generateLearningScript.ts:491` | `` .eq('pod_id', `${courseCode}:pod-0`) `` |
| `packages/player-vue/src/composables/usePodStage0.ts:96` | reads `listening_pod_sentences` on the same convention |
| `api/courses/[code]/bundle.ts:387` | **`.eq('course_code', code)` and nothing else** |

This is the single most useful fact in the job, because it means **the switchover pointer
already exists and it is the slug `pod-0`**. A new pointer column or config table would be
a sixth thing five call sites have to learn; moving content into the slug they already read
is better, simpler and cheaper on every leg. `tools/pods/clone-pod.cjs` states the same
convention in its header and built the staging half of it on 2026-08-06.

### 1a. A live defect found on the way — the bundle ignores the slug

`bundle.ts:387-390` selects **every** `listening_pods` row for the course with no slug and
no `pod_type` filter, then at `:666` fetches sentences for all of them. `pod_order` is NULL
for every pod row in the database, and `:713` coerces null to `0`, so the pods arrive in
arbitrary order.

Consequently the offline bundle already ships:

- `<course>:pod-0-unrecorded` — the working copy whose own title says *"UNRECORDED working
  copy, not learner-facing"*, of which ~110 of 232 sentences currently have **empty target
  text and no target audio**;
- `cym_n_for_eng:pod-0-gated-2026-08-06` — an archived row;
- choice pods such as `spa_for_eng:music` (749 sentences, 0 target audio).

The staging model that `clone-pod.cjs` relies on — "a pod on any other slug is invisible to
learners" — is true of the player and false of the bundle.

**Severity, stated honestly: latent, not an active incident.** `BundlePod` is a type
declaration with no runtime consumer — nothing outside tests reads `bundle.pods`, and
`iterateBundleAudio`, which the comment at `bundle.ts:408` says collapses duplicate pod
downloads, does not exist yet; that name appears only in the comment. So the staged pod is
serialised into the bundle response and then read by nobody, and no learner is currently
hearing unfinished content through this path. Job #484 reached the same conclusion
independently and flagged it as unproven-by-grep rather than certain; I confirmed it by
searching for consumers and for `iterateBundleAudio` directly.

It still needs the filter, for two reasons: it becomes a real incident the day offline
listening is wired up, and it is precisely the place the bundle path learns the switchover
contract. I have not exercised the deployed endpoint (auth-gated); the finding is from the
code, which is unambiguous.

## 2. What "the new content" actually is

Not an edit in place, and not a new `pod_order`. It is a **sibling pod row**:

- live: `<course>:pod-0`, slug `pod-0`, 142 sentences across 15 scenes;
- staged: `<course>:pod-0-unrecorded`, slug `pod-0-unrecorded`, 232 sentences across 22 scenes.

37 courses carry a staged copy. The staged English canon is genuinely uniform: comparing
every staged pod against `fra_for_eng`, only 180 slots differ across 36 courses — five per
course — and every one is the sentence that names the language ("I'm learning French" /
"I'm learning Danish"). That is correct parameterisation, not drift.

The **live** canon is a different story: 50 of 51 live pods differ from `fra_for_eng:pod-0`,
`isl_for_eng` by 59 sentences. That drift is why survival rates vary by language below.

## 3. The trap, measured

`learner_pod_state.sentence_id` is not a UUID (the brief's working assumption) and is not
the sentence text. It is a **slot key**:

```
cym_n_for_eng:pod-0:SC04-S002:s0
└── course ──┘ └slug┘ └─slot─┘ └split unit
```

The staged canon inserts sentences *mid-scene*, so scene and sentence numbers shift. The
slot key therefore survives a swap while the sentence sitting in it changes. Nothing
orphans — which is precisely what makes it dangerous. The learner is silently credited with
a sentence they have never heard, at whatever ladder rung they had reached on the old one,
so the new sentence is served late and rarely and is effectively never taught.

Estate-wide, a do-nothing swap would mis-credit **538 learner state rows carrying 4,837
exposures**, across 29 courses and 39 learners.

### This already happened

`cym_n_for_eng` and `cym_s_for_eng` were swapped in place on 2026-08-11. All 64 and 72 state
rows still resolve — zero orphans — and on `cym_n_for_eng` **6 rows carrying 68 exposures
now point at a different sentence than the learner actually heard**. The starkest single
row, live today:

| Slot | The learner heard | They are now credited with |
|---|---|---|
| `SC03-S003` | "Thank you very much. Goodbye." | "Do you have any food?" |
| `SC05-S002` | "Yes, very long. I'm very tired now. Good night." | "Yes, very. I'm very tired now. Good night. See y…" |
| `SC07-S015` | "Five. Ten. Fifteen. Red. Green." | "5. 10. 15. Red. Green." |
| `SC08-S006` | "Could I see the wine list? I'd like a glass of w…" | "Could I see the wine list? I want a glass of win…" |

Three of those four are near-misses. The first is a category error.

## 4. Overlap per language

Matched on the **known (English) side**, which is the identity of a pod sentence across
languages. Normalisation, stated so it can be argued with: trim, collapse internal
whitespace, case-fold, and fold U+2026 → `...`, curly quotes → straight, en/em dash → `-`.
Nothing else — no punctuation stripping, which is why "Five. Ten." and "5. 10." correctly do
**not** match. Strict verbatim differs from normalised by 1–2 sentences per course; the gap
is entirely the ellipsis character.

There are **zero duplicate sentence texts** in either canon, in any course. Text-matching is
therefore unambiguous, which removes an entire edge-case class the rules would otherwise
have to adjudicate.

| Course | Survive | Dropped | New | Slots that swap sentence | Learners | Rows mis-credited | Exposures |
|---|---|---|---|---|---|---|---|
| hrv_for_eng | 106 | 36 | 126 | 47 | 5 | 163 | 519 |
| swa_for_eng | 112 | 30 | 120 | 41 | 2 | 125 | 173 |
| fra_for_eng | 114 | 28 | 118 | 38 | 6 | 15 | 390 |
| por_for_eng | 113 | 29 | 119 | 41 | 2 | 39 | 59 |
| isl_for_eng | 87 | 55 | 145 | 66 | 4 | 42 | 1099 |
| ron_for_eng | 121 | 21 | 111 | 32 | 1 | 11 | 744 |
| swe_for_eng | 108 | 34 | 124 | 45 | 2 | 22 | 754 |
| eus_for_eng | 113 | 29 | 119 | 40 | 1 | 20 | 546 |
| spa_for_eng | 91 | 51 | 140 | 59 | 2 | 28 | 124 |
| ita_for_eng | 117 | 25 | 115 | 36 | 3 | 10 | 134 |

Full table for all 37 courses in `pod-overlap-2026-08-14.json`.

## 5. Readiness — no language can flip today

| Course | Staged sentences | With target text | With target audio |
|---|---|---|---|
| hrv_for_eng | 232 | 113 | 113 |
| fra_for_eng | 232 | 120 | 120 |
| spa_for_eng | 231 | 231 (128 draft) | 119 |
| isl_for_eng | 232 | 95 | 95 |
| nep_for_eng | 232 | 131 | 131 |

Every staged canon holds roughly the ~110 surviving sentences and little else: the ~110
brand-new sentences have **no target text and no target audio**. That is job #481's
in-flight work. `spa_for_eng` is the exception on text (231 translated) but 128 are marked
draft and only 119 have audio.

**Explicit gap:** the switchover mechanism cannot be verified against genuinely complete new
content in any language today, because no language has it yet. It is verified against staged
data and against the archive/rollback path instead, and the readiness precondition is
enforced in code so a flip is impossible before the content lands.

English is the exception worth checking separately: `eng_for_*` courses have 142/142 target
and known audio on the live pod and no staged sibling, consistent with Tom's "we've done all
the audios for English" — but there is no new English canon staged to switch *to*.

## 6. Per language versus per course

Tom's settled ruling is that pods are per language. Today the schema is per course at three
points: `listening_pods.course_code`, `learner_pod_state.course_code`, and the pod id string
itself. **No schema change is needed to honour the ruling**, because the content is already
per language in everything but naming: one English canon, parameterised by language name,
translated once per target. A flip executed course-by-course over the courses that share a
target language *is* a per-language flip, and it is one write per course rather than a
migration of live learner progress. Better, simpler, cheaper — so that is what the tool does,
and the per-language grouping lives in the operator's invocation, not in the schema.

The one place this genuinely bites is a future `cym_n_for_spa` sharing Welsh content with
`cym_n_for_eng`: they would be separate pod rows with separately-keyed progress. That is not
a problem today — no such course exists — and it is not worth a migration of live progress
to pre-solve.

## 7. The switchover mechanism

`tools/pods/pod-switchover.cjs`, dry-run by default, one course per invocation, one
transaction:

1. **Preconditions, all refusing loudly:** staged pod exists; every staged sentence has
   non-empty target text; no `target_text_draft` rows; every staged sentence has a target
   audio id; live pod exists. And — the important one — **if the course has learner pod state
   and no migration has been recorded, it refuses**, so the mis-crediting measured in §3
   cannot happen by accident.
2. **Archive, never delete:** the live pod row and its sentence rows are renamed to
   `pod-0-retired-<date>`. Nothing is dropped, and audio ids are left pointing at the same
   `course_audio` rows.
3. **Promote:** the staged pod row and its sentence rows are renamed onto the `pod-0` slug,
   re-keying sentence ids to embed it.
4. **Rollback:** `--rollback` performs the exact inverse and restores the prior learner
   experience.

Make-before-break holds throughout: the new content is verified complete before the old is
touched, and the old is renamed rather than deleted.

## 8. What is deliberately not built

The learner-state migration. The rules for it are in the short page and need Tom's blessing
before the code exists. Until then `pod-switchover.cjs` refuses any course carrying learner
state, which is 29 of the 37 candidates.
