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

Estate-wide census dispatched as job **#99**; numbers not in hand at time of writing. **Gap.**

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
