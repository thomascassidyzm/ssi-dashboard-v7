# The non-English rebuild queue, recounted per language — 2026-08-13

**READ ONLY. No audio was generated, no DB row was written, nothing was triggered on popty.app.**
Every number is read live from the DB by a tool committed alongside this doc
(`tools/noneng-distinct-recount/`), so it can be re-run and checked.

Tom's ruling being costed (2026-08-13): *pods are per LANGUAGE, not per course — each language's
content should render ONCE and be shared across every course in that language.* This is the same
method as this morning's English pod-0 recount
([`docs/audio/english-distinct-text-recount-2026-08-13.md`](./english-distinct-text-recount-2026-08-13.md),
landed as `c57b219c`), generalised to all 66 non-English target languages.

---

## RULING SINCE PUBLICATION — Welsh is out of the queue, permanently (Tom, 2026-08-13)

§5 below recommended that `cym` come out of the TTS rebuild queue and that Welsh work be scoped as
a recording task. **Tom has now ruled, as a hard rule and not a one-off: Welsh is permanently
excluded from every TTS render queue. Aran's and Catrin's recordings are never overwritten by
synthesis.** Welsh gaps are a recording worklist, never a render backlog.

So **every cym figure in the tables below is superseded, not merely disputed.** Read them as the
count that *was* proposed, not as work anyone may schedule:

| the premium queue | renders | cost |
|---|---:|---:|
| as published below, 8 languages including cym | 321,970 | $121.17 |
| **cym, removed by the ruling** | **−23,442** | **−$11.99** |
| **the premium render queue, 7 languages** | **298,528** | **$109.18** |

The exclusion is now enforced in code, not by anyone remembering this note:
`services/shared/human-voice-courses.cjs` holds the one rule (`isHumanVoiceLang`,
`assertNoHumanVoiceInQueue`), and `tools/noneng-distinct-recount/` filters at the query and asserts
on its output, so this recount can no longer produce a Welsh line at all. There is deliberately no
runtime override: putting Welsh back would take a code change with Tom's sign-off.

---

## The headline, and the honest shape of it

**The ~210k number was already per-language deduped.** It is the sum of distinct target texts across
the 8 premium languages in the 2026-08-12 queue (`docs/audio/premium-first-rebuild-queue-2026-08-12.md`
§3, "deduped per language"). I reproduced it within 1% — my figure is **207,227**. So the 17× collapse
that English got is **not available here**, and saying otherwise would be inventing a saving.

The lever that *is* available is the other half of this morning's method: **crediting clips that
already exist on the exact voice the language would render onto**, wherever in the estate they sit.
The 2026-08-12 doc explicitly refused that credit ("`existing_clips` is legacy-engine debris"). That
rule was written for a *voice swap* and is right for one. It is wrong for kor, zho and ita, where
tens of thousands of clips already sit **on `ara`/`leo` — the very voices those languages would
render onto** — merely owned by a sibling course.

| the 8 premium languages | renders | cost |
|---|---:|---:|
| per-course, per-slot (no dedupe at all) | 573,326 | $168.00 |
| per-course distinct text × 2 voices | 479,484 | — |
| **OLD — per-language distinct × 2 voices, no reuse credit** (the ~210k queue) | **414,454** | **$135.16** |
| **NEW — per-language + credit for clips already on the intended voice** | **321,970** | **$121.17** |
| the cut | **−92,484 renders (−22%)** | **−$13.99** |

All costs here are recomputed from real character counts. The 2026-08-12 doc costed the same
414,454 renders at **$136.77** using a 22-character estate average; the two agree to within 1.2%.

Estate-wide across all 66 non-English languages: **1,195,942 → 1,047,444 renders, $394.65 → $385.50.**
The cost falls less than the render count because every credited render is a *short* clip.

**The pod scope on its own is tiny.** Tom's brief called this a pod queue; the ~210k is in fact
course content (seeds, LEGOs, practice phrases) plus pods. Counted alone, non-English pods are
**12,717 slots → 8,009 render units → 1,996 actually needing render, $1.57**. Full table in §4.

**Why the saving is concentrated and not general: 60 of the 66 languages have no voice decided.**
A recount cannot credit a voice nobody has chosen. Their new number equals their old number exactly.

---

## 1. Per language — old vs new

Costs recomputed from **real character counts of the distinct texts**, not the 22-char average the
2026-08-12 doc used, at xAI's $15.00/1M (`services/phases/phase8-audio-v13.cjs`
`POD_CHARS_TO_COST`). Where the two bases disagree the real-char figure is the true one — it is why
zho costs $6.65 and not $21.32 for the same work: Chinese texts are short.

### Tier 1 + 2 — the premium queue

| # | lang | distinct texts (per-lang) | per-course distinct | OLD renders ×2 | OLD cost | already on the intended voice | **NEW renders** | **NEW cost** | intended pair |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | **kor** | 34,684 | 39,949 | 69,368 | $13.20 | **49,458** | **19,910** | **$4.20** | ara+leo |
| 2 | **zho** | 32,306 | 38,648 | 64,612 | $6.65 | **41,160** | **23,452** | **$2.44** | ara+leo |
| 3 | **ita** | 21,200 | 25,204 | 42,400 | $18.69 | 1,866 | 40,534 | $17.92 | ara+leo |
| 4 | **ara** | 34,931 | 36,481 | 69,862 | $23.97 | 0 | 69,862 | $23.97 | **none cast** |
| 5 | **spa** | 33,697 | 41,841 | 67,394 | $33.26 | 0 | 67,394 | $33.26 | **none cast** |
| 6 | **por** | 28,116 | 33,470 | 56,232 | $24.30 | 0 | 56,232 | $24.30 | **none cast** |
| 7 | **cym** | 11,721 | 12,910 | 23,442 | $11.99 | 0 | 23,442 | $11.99 | **none cast — see §5** |
| 8 | **jpn** | 10,572 | 11,239 | 21,144 | $3.09 | 0 | 21,144 | $3.09 | **none cast** |
| | **total** | **207,227** | **239,742** | **414,454** | **$135.16** | **92,484** | **321,970** | **$121.17** | |

**kor and zho carry the entire saving.** 49,458 of kor's 69,368 render units and 41,160 of zho's
64,612 already exist on `ara`/`leo` — rendered for `kor_for_hin`/`kor_for_tam` and
`zho_for_hin`/`zho_for_tam`, never shared with the flagship `kor_for_eng`/`zho_for_eng`. Under Tom's
ruling those are not a rebuild at all; they are a relink. **kor's real bill is $4.20 and zho's is
$2.44.**

### fra + deu — still excluded, still pending #334, but recounted

| lang | distinct | OLD ×2 | OLD cost | on intended voice | NEW renders | NEW cost | pair |
|---|---:|---:|---:|---:|---:|---:|---|
| deu | 45,610 | 91,220 | $38.28 | 27,023 | 64,197 | $24.50 | ara+leo |
| fra | 33,720 | 67,440 | $30.02 | 28,991 | 38,449 | $17.46 | eve+leo |
| **total** | | **158,660** | **$68.30** | **56,014** | **102,646** | **$41.96** | |

Not being added to the queue here — only recounted, so the number is ready when #334 reports.

### Tiers 3 + 4 — the remaining 56 languages

**622,828 OLD renders / $222.36 → 622,828 NEW renders / $222.37. Zero change, and that is the
finding.** Not one of these 56 languages has an xAI voice cast at course level, so there is no
"intended voice" against which to credit anything. Per-language dedupe of their content saves just
**4,720 renders** (313,774 per-course distinct texts → 311,414 per-language) — real, tiny, and
unavailable until a voice exists anyway.

---

## 2. The relink step, counted separately

Content slots carry explicit FKs (`target1_audio_id` / `target2_audio_id` on `course_seeds`,
`course_legos`, `course_practice_phrases`), so this is a count, not an estimate.

| | slots | courses |
|---|---:|---:|
| the 8 premium languages | **573,326** | 34 |
| fra + deu | 217,644 | 11 |
| all 66 non-English languages | **1,552,680** | 123 |

**Today, zero of those 1,552,680 slots point at a clip owned by another course.** Every non-English
content slot links to a course-local clip — the estate has never shared a non-English clip across
courses. That is what makes the relink the real work item here: it is a metadata write, it costs
nothing, and it is the entire mechanism by which kor's 49,458 credited units reach `kor_for_eng`.

396,785 slots (25.6%) have no clip linked at all — por 18,707, ara 29,539, deu 48,331 are the
largest. They are counted in the render numbers above and flagged here because a relink run must
not mistake "unlinked" for "already correct".

---

## 3. What "already on the intended voice" is worth — checked, not asserted

The credit is only ever taken for a clip **already on the voice we want**, live in S3, non-`pending/`.
Sampled 15 credited clips per (language, voice) by `md5(s3_key)` so the draw is not clustered, and
ranged-GET the real object:

| | |
|---|---:|
| sampled | 165 |
| **alive** | **164** |
| dead | 1 |

The one dead object is `deu_for_eng` clip `0de7b2d9…`, key `repair-candidates/550B988C….mp3`, HTTP
403. Systematic, and quantified rather than waved away: **1,303 non-English clips estate-wide sit
under the `repair-candidates/` prefix** (deu only — eve 581, ara 360, leo 346) against 1,836,063
under `mastered/`. Any run taking this credit should exclude that prefix; it moves deu's credit by
under 1,300 and no other language at all.

---

## 4. The pod scope on its own

Non-English pod target audio, counted the way English pod-0 was. A pod's cast is already recorded
per speaker in `listening_pods.speakers.<speaker>.target.voice_id`, so the render unit is
(distinct normalised text × that cast voice), shared across every course in the language.

| | |
|---|---:|
| non-English pod target slots | **12,717** in **50 courses**, 92 pods, 36 languages |
| distinct texts | 7,750 |
| render units (text × cast voice, per language) | **8,009** |
| already alive on that cast voice | **6,013** |
| **actually need rendering** | **1,996** |
| characters | 104,952 |
| **cost** | **$1.57** |
| slots with no castable target voice | 71 |

Top languages by work remaining:

| lang | courses | pods | slots | distinct | units | on cast | **to render** |
|---|---:|---:|---:|---:|---:|---:|---:|
| spa | 3 | 7 | 1,592 | 1,258 | 1,362 | 290 | **1,072** |
| cym | 2 | 2 | 462 | 428 | 462 | 65 | **397** |
| deu | 3 | 4 | 634 | 449 | 460 | 266 | **194** |
| hrv | 1 | 3 | 435 | 322 | 322 | 156 | **166** |
| cat | 2 | 3 | 399 | 232 | 232 | 193 | **39** |
| tha | 1 | 2 | 267 | 142 | 174 | 144 | **30** |
| every other language | | | | | | | ≤ 19 each |

**Read this credit differently from the content one.** Here "on cast" means the clip matches the
voice the pod *currently* names, which for most languages is Azure. If Tom re-casts a language onto
new-engine voices, that credit disappears and the number returns to the 8,009 render units. The
content table in §1 has no such ambiguity — there the credited voices are the xAI voices the courses
themselves point at.

---

## 5. Welsh — the queue would render TTS over human recordings

> **RULED, 2026-08-13.** The recommendation at the end of this section is now Tom's standing hard
> rule: Welsh is permanently excluded from every TTS render queue, and the 1,077 unrecorded texts
> are a recording worklist for Aran and Catrin. See the ruling banner at the top of this doc.

`cym` sat at #7 in the premium queue for 23,442 renders. Before any of that could be approved:

- **39,351 `cym` clips have `origin='human'`** — 20,295 distinct texts, voice `legacy_import`,
  created Jan–Mar 2026, plus Aran's and Catrin's named recordings.
- **23,960 Welsh content slots currently link to a human-origin clip.**
- Those human recordings cover **10,644 of cym's 11,721 distinct texts — 91%**.

So the cym line in the old queue is not a rebuild of TTS. It is a proposal to synthesise over real
people's voices, at 91% overlap, and this repo's own make-before-break doctrine
(`docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b) plus this morning's D2 recommendation exist
precisely to stop that. **Recommendation: cym comes out of the TTS rebuild queue entirely and any
Welsh work is scoped as "the 1,077 texts no human has recorded", pending Tom.** No action taken
here — this is a recount, and the queue is unchanged on disk.

Separately and already known: the 23 Welsh pod-0 English human recordings are 834-byte undecodable
stubs (reported in `c57b219c`). Untouched by this recount.

---

## 6. Method — so it can be re-run

Committed as `tools/noneng-distinct-recount/`, read-only throughout:

| script | what it counts |
|---|---|
| `content-counts.cjs` | slots / per-course distinct / per-language distinct / chars, per language |
| `coverage.cjs` | for every language × voice, how many of the language's distinct texts already exist as a live clip on that voice, anywhere in `course_audio` |
| `pods.cjs` | the pod scope: slot → cast voice → render unit → credit, per language |
| `relink.cjs` | content slots and courses that would repoint, from the real FKs |
| `credit-liveness.cjs` | ranged-GETs a sample of credited clips against S3 |
| `rollup.cjs` | joins the above into `rollup.json`, the table in §1 |

Identity key is the same expression behind `course_audio.text_stripped` — the generated column the
audio layer already uses — so a dedupe computed this way is one the existing pipeline can honour:

```sql
lower(btrim(regexp_replace(txt,'[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+','','g')))
```

Voice IDs are compared with the `xai_`/`azure_` prefix stripped, because both spellings exist in
`course_audio` and comparing raw would badly under-count coverage.

---

## 7. Gaps — stated, not papered over

1. **The reuse credit is a floor.** `text_stripped` is written by the `audio_normalize_text`
   trigger; I normalise the raw source text with the same expression. Where the trigger's output
   differs, a real match is missed. That error direction makes the NEW render counts slightly **too
   high**, never too low.
2. **Liveness is sampled (165), not exhaustive.** A full sweep of the 92,484 credited units is cheap
   and should be a precondition of any render run, not an assumption — exactly as this morning's
   run swept its 440.
3. **"Alive on the right voice" is not "good".** None of the credited clips has been through the
   truncation or veracity checks, and the 2026-08-12 finding stands: 98.4% of non-English pod-0
   target clips predate the 2026-08-05 mastering fix. A clip can be credited here and still be a
   clip Tom would reject by ear. This recount is a **volume** recount.
4. **Cross-language text collisions on multilingual voices.** `ara`/`leo`/`eve` are `{mul}` voices,
   so crediting by (text, voice) could in principle match an identical string rendered for a
   different language. Checked in the languages that matter and it is negligible (the scripts do not
   overlap), but it is not zero for latin-script pairs.
5. **60 of 66 languages have no voice decision**, so their recount is arithmetically identical to
   the old one. Nothing in this doc unblocks them.
6. **Course counts differ slightly from the 2026-08-12 doc** (e.g. spa 5 vs 7) because I count
   courses that actually hold content rows; empty draft shells contribute no texts and no cost.

---

## 8. Nothing is proposed here

No render, no relink, no voice decision, and no change to the queue on disk. Tom asked for the
recount as a precondition to any future spend decision, and this is only that. The two things a
future decision would rest on, stated plainly:

- **kor and zho are almost entirely paid for already** — $4.20 and $2.44 of genuinely new audio,
  the rest being a relink of clips that exist.
- **cym should not be in a TTS queue at all** until someone rules on the 91% human-recording
  overlap.
