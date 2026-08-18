# منيح → منيحة: not a hallucination, and not the voice

**2026-08-18 · ara_lb_for_eng · probe only — no rows repointed, no audio regenerated, $0.00 spent**

Deborah caught by ear that the female voice says `منيحة` where the stored text says `منيح`.
Two explanations were on the table: **(A)** the voice systematically feminises the word, or
**(B)** a one-off TTS hallucination. Kai judged (B) likely and flagged that a repeat test
would be meaningless if the engine is deterministic.

**He was right, the repeat test was skipped, and the answer is neither (A) nor (B).**

## Step 0 — the engine

All `ara_lb_for_eng` target audio is **Azure Neural**: 5,390 rows `azure_ar-LB-LaylaNeural`
(female, target1) and 5,390 rows `azure_ar-LB-RamiNeural` (male, target2). Azure Neural is
deterministic for identical input, and this codebase depends on that fact — `applyRegenerationVariation()`
in `services/azure-tts-service.cjs` exists purely to *perturb the input* on a retry, because
re-sending the same string returns the same audio. A repeat test could not have distinguished
anything. It was not run.

*(It could not have run anyway: `AZURE_TTS_KEY`/`AZURE_TTS_REGION` in `.env` on this box are
the literal placeholders `your_azure_..._here`. Noted as a gap, not a blocker.)*

## Step 1 — corpus comparison, from clips that already exist

Every clip in the estate whose stored text contains `منيح`, comparing stored text against the
`word_boundaries` recorded alongside the clip:

| voice | rows with bare `منيح` in text | rows where boundaries say `منيحة` |
|---|---|---|
| `azure_ar-LB-LaylaNeural` (f) | 332 | **24** |
| `azure_ar-LB-RamiNeural` (m) | 332 | **0** |

**24/332.** Not "always", so not a blind per-word voice rule. But it is not random either —
the 24 are grammatically selected:

- `منيح` sentence-initial (`منيح إنو…`, "good that…") → feminised, 14 rows
- `كان منيح…` → rewritten to **`كنت منيحة…`** ("I was well"), 5 rows — the *verb* changed too
- `حاسس منيح` → `حاسة منيحة`, 2 rows
- `منيح` alone, `فهمت منيح`, `فكرة منيح`
- post-verbal adverbial `منيح` (`بتحكي عربي منيح`, "you speak Arabic well") → **never** feminised

The control breaks it open. The **male** voice does the mirror image, 6 rows:

| stored text | boundaries say |
|---|---|
| `فكرة منيحة` ("a good idea") | `فكرة منيح` |
| `فرصة منيحة` ("a good opportunity") | `فرصة منيح` |
| `مش منيحة` | `مش منيح` |

Here `منيحة` was **correct** — it agrees with the feminine nouns `فكرة`/`فرصة`, nothing to do with
the speaker — and the male render stripped it, producing ungrammatical Arabic. No TTS engine
de-feminises noun agreement based on voice gender.

**Verdict (C): our own pipeline rewrote the text before synthesis.** The gender-adaptation pass
(`services/gender-haiku-service.cjs`, backed by the `course_gender_expansions` table with its
`expanded_f` / `expanded_m` columns) parses the sentence and applies speaker agreement. It
over-applied to an invariable adverb in 24 female rows, and mis-applied to noun agreement in 6
male rows. Systematic, directional, and ours.

**One honest wrinkle.** `course_gender_expansions` stores, for `وأنا حاسس منيح`, `expanded_f =
وأنا حاسة منيح` — it feminises the participle but leaves `منيح` alone. The *clip* (rendered
2026-05-18) says `وأنا حاسة منيحة`. The stored expansion was written 2026-07-21, two months after
the render. So the table is not a record of what was sent at render time; a later, more
conservative pass has already superseded it. I have not established whether today's pass still
over-applies. **Gap.**

## Step 2 — does `word_boundaries` work as an estate-wide detector?

Azure's SDK emits a WordBoundary event per token; `generateAzure()` in `services/tts-service.cjs`
captures them into `course_audio.word_boundaries`. **Nothing in the pipeline has ever read them back.**

Tool: `tools/audio-script-departure-scan.cjs`. **Calibration passes** — on stored text exactly
`منيح` it flags `منيح => منيحة`.

`ara_lb_for_eng`, 16,638 rows carrying boundaries:

| | count |
|---|---|
| match | 14,299 |
| **MISMATCH** | **382 (2.30%)** |
| `no-text-in-wb` — detector blind | 1,957 |

**What it honestly is.** WordBoundary echoes the text **sent to** the synthesiser, not a
transcript of the sound produced. So it catches the pipeline rewriting text behind a clip's
back — it **cannot** catch a TTS hallucination, where correct text goes in and the voice
departs anyway. For that class, text and boundaries still agree and this scanner is silent.
**Kai's original hypothesis (B) remains untested by this tool, and needs ASR or an ear.**

**False-positive classes absorbed** (each rule earned by a measured class, not a guess):
the `…` pause cue stored in text but sent as a `<break>`; the trailing punctuation added by
`applyShortWordHint()`/`applyRegenerationVariation()` (TTS-input-only, never persisted);
Azure tokenising unlike whitespace (it emits `— 'You` as one token and `,` as its own);
Arabic tashkeel and Hebrew niqqud.

**Coverage limits — both real:**
1. **Azure only.** 1,483,728 of ~2.4M rows carry boundaries. xAI (448,700 rows), ElevenLabs
   and the cloned voices return no boundary events at all. Permanently invisible.
2. **A second boundary shape.** Some rows store `[[offset, duration]]` — timing with no token
   text. 1,957 of 16,638 in this course alone (11.8%). Reported as `no-text-in-wb`, never
   counted as a pass.

### Estate census (job #99) — complete, no timeouts

**1,548,757 rows** carrying boundaries, all 90 courses scanned:

| verdict | count | share |
|---|---|---|
| match | 1,166,549 | 75.3% |
| **MISMATCH** | **8,440** | **0.545%** |
| `no-text-in-wb` (detector blind) | 373,766 | 24.1% |

47 courses have ≥1 flag. Top: `hrv_for_eng` 1,363 · `ara_eg_for_eng` 1,283 · `fra_ca_for_eng` 1,011
· `spa_for_eng` 834 · `spa_mx_for_eng` 443 · `spa_for_jpn` 430 · `cym_n_for_eng` 412 ·
`fra_for_jpn` 386 · `ara_lb_for_eng` 382. 60 distinct voices touched.

**Taxonomy** — from a 132-row stratified eyeball (≤4 per course across 47 courses). Class
proportions are **directional, not exact**; do not multiply them out as if they were measured.

| class | share of sample | note |
|---|---|---|
| gender rewrite | 47% | by design — the pass above. Explained, not new |
| synonym-annotation leak | 18% | `"Excuse me."` spoken `"sorry /excuse me"`, repeats across ~15 courses |
| markup/SSML leak | 9% | literal `</voice>`, `&lt;src&gt;` tags spoken |
| **wrong sentence** | **6%** | **most severe — see below** |
| content rewrite (paraphrase) | 4.5% | |
| omission | 3.8% | `afr_for_eng` drops clauses |
| script corruption | 2.3% | `hye_for_eng` Armenian |
| detector noise | 2.3% | soft hyphen, `<phoneme>` tag, smart quotes — a normalisation fix absorbs these |

**Precision: 3/132 (2.3%) pure noise.** 129/132 are genuine text≠spoken. Excluding the by-design
gender class, **~60/132 (45%) are worth a human's time.**

### The wrong-sentence class is a mislinked-audio detector, and it is the real finding

I verified these directly rather than taking them on report. `mastered/1E045668-…mp3` is **one audio
object carried by three course rows**:

| course | stored text | |
|---|---|---|
| `pol_for_eng` | `I'm familiar with a young woman who can remember the answer` | ✓ matches the boundaries — the rightful owner |
| `ell_for_eng` | `I am excited and it's starting to feel easier` | ✗ mispointed |
| `ara_for_eng` | `I'm excited because that's an idea` | ✗ mispointed |

The boundaries are the **fossil of the original render** (`origin=tts`, genuine Azure
`{text,offset,duration}` shape, not an ASR transcript — I checked). So where a row was later
repointed at another clip by cross-course reuse, the fossil still names the sentence the audio was
actually made for. Two courses' learners see one sentence and hear another. Same story for
`I do well` → `I don't do`, which `hye_for_eng` and `ara_lb_for_eng` **share**, so fixing one row
would not fix the other.

**This detects a defect class nobody was looking for, and it is not what we set out to find.**

**Gap.** 24.1% of the estate (373,766 rows) is blind to this method, and the 132-row sample is not a
random draw over the 8,440.

## It already found two learner-facing English defects

Both on the **known** (English) side of `ara_lb_for_eng`, both free, neither gender-related:

| stored text | boundaries say |
|---|---|
| `I do well` | **`I don't do`** |
| `the new one` | **`new ( with article )`** |

The second is an authoring annotation read aloud to learners. These are the strongest
calibration available, because they can be judged by ear in English.

## The listen page

**https://watson-1.tail4968cb.ts.net/evidence/ara-lb-tts-departure-earcheck-2026-08-18/index.html**

Mobile-first, 365 paired male/female clips from live production audio, each labelled with what
the text says versus what the timing data claims was spoken. The two English clips are pinned
at the top. Nothing on the page has been modified — these are the clips learners hear today.

## What is NOT claimed

- Not that the audio *sounds* like the boundary text. Boundaries prove what was **sent**.
  Kai's ear on that page is what settles it — and if the female clip does say `منيحة`, the
  detector is validated for every Azure course we have.
- Not that hallucination doesn't happen. This method cannot see it.
- No row repointed, no content changed, no regeneration. Scope of a fix is Kai's call.
