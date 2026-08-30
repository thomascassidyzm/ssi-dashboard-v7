# A-157 — Arabic `!` on the wrong side: the rendering fix

**2026-08-18. Rendering layer only. No Supabase writes, no content edits, no audio, no queued audio pass.**

Deborah, reviewing `ara_lb_for_eng`: *"Is `!` still placed on the wrong side in Arabic (appearing
right, like English, should be left/end-of-sentence)?"* — and separately, that `?` is fine.

That asymmetry was the whole diagnosis, and it is now confirmed by measurement rather than by eye.

---

## The bug, measured

Rendering the real stored strings in headless Chromium and measuring the x-position of the final
character against the Arabic run:

| string ends in | bidi class | before the fix | after the fix |
|---|---|---|---|
| `!` U+0021 | ON (neutral) | **RIGHT of the run — wrong** | LEFT of the run — correct |
| `؟` U+061F | AL (strong RTL) | LEFT of the run — correct | LEFT of the run — correct |
| `.` U+002E | ON (neutral) | **RIGHT of the run — wrong** | LEFT of the run — correct |

A trailing neutral inherits the **paragraph** direction, so under an LTR paragraph it is pushed to
the visual right. `؟` is strong RTL, joins the Arabic run, and was never affected — which is exactly
why Deborah saw one mark misplaced and the other fine.

Screenshot of the same three strings before and after:
`/evidence/arabic-bidi-a157-2026-08-18/before-after.png`

**The text is stored correctly.** Every target string read during this job had its mark at the
logical end. Nothing in the database needed changing, and nothing in the database was changed.

## Wider than `!`, and wider than `ara_lb_for_eng`

- **Not just `!`.** `.` `,` `:` `;` quotes and brackets are all bidi class ON and all misplaced the
  same way. Deborah happened to spot the loudest one.
- **13 RTL courses, not one:** `ara_for_eng`, `ara_eg_for_eng`, `ara_lb_for_eng`, `ara_sy_for_eng`,
  the `_for_jpn` / `_for_zho` / `_for_cym` variants, plus `fas_for_eng` and `heb_for_eng`.
- **Two courses have an RTL KNOWN side** — `eng_for_ara` and `eng_for_urd`, 668 seeds each, Arabic
  and Urdu on the known side with English as the target. A target-side-only fix would have left
  those two entirely unfixed. They are covered (see below).

## The fix

One helper, script-detected, in both repos:

- `isRtlText(text)` / `dirFor(text) → 'ltr' | 'rtl'`
- learner app: `packages/core/src/text/direction.ts`, exported from `@ssi/core`
- Popty: `src/utils/textDirection.js` (Popty does not consume `@ssi/core`; the two copies change
  together, same duplication debt as the syllable counters)

Direction is read from the **script of the text**, never from a course code and never from an
allowlist — course codes lie about their language (`spa_mx_for_eng` has `target_lang = 'spa'`), and
detection means Hebrew, Persian, Urdu and any future RTL course are covered with no further code
change.

It uses a **majority-of-strong-letters** rule rather than the browser's first-strong-character rule
that `dir="auto"` implements. `auto` gets exactly the cases wrong that this bug is made of: a string
opening with a Latin loanword, a numeral or a quote mark.

Applied as `dir` on the element that paints the string, plus `unicode-bidi: isolate` where the run
shares a line with English chrome — that mixed-direction line is where the bug actually lived.
`text-align` alone is not a fix: it moves the block while still resolving the neutral against the
wrong paragraph direction.

### Taste calls, flagged rather than assumed

- **Detection over configuration.** No per-course RTL flag, no allowlist.
- **No page-level or `<html>` direction anywhere.** Navigation, progress bars and layout are
  untouched; direction sits on the text elements only.
- **Alignment pinned.** `dir="rtl"` changes an element's default text alignment. Where an element
  was a block or flex item with no explicit `text-align`, alignment was pinned back to today's
  value — the fix moves the mark, not the column.
- **The known side was included after all.** The brief's "target side only" default assumed the
  known side is always English. `eng_for_ara` / `eng_for_urd` disprove that. Because direction is
  detected from the string, binding the known side is free for every English-known course —
  `dirFor('speak Arabic now!')` is `'ltr'`, so their rendering is byte-identical.

## What landed

**Learner app** (`ssi-learning-app`) — highest priority, the learner path:
`LegoAssembly`, `LearningPlayer`, `TeleprompterScroll`, `ListeningOverlay`, `PronunciationOverlay`,
`CourseExplorer`, `PodStageAuditioner`. `PodTurnDisplay` needed no edit — it delegates its rendering
to `TeleprompterScroll`.

`LegoAssembly` was the one place with **pre-existing** partial RTL handling — a local regex reading
only `blocks[0]`, so a sentence whose first tile was a Latin loanword or a numeral laid its tiles out
left-to-right. It now uses the shared helper over the joined sentence, and each tile run is isolated
so a neutral at a tile boundary cannot resolve against its neighbour. (The commissioning brief stated
no RTL handling existed anywhere; that was not correct for this component.)

**Popty** — the production surfaces the team and Deborah read:
`ScriptViewer`, `SeedEditor`, `CalibrationReview`, `PhraseRow`, `TextGeneration`, `CyclePlayer`,
`LearningJourneyView`, `PhraseQA`, `PhraseEditModal`, `PodDetailView`, `PodLab`, `SpeakingConfig`,
`ListeningConfig`, `Maintenance`, `LearningCyclePlayer`, `AudioPreviewPlayer`, `PipelineItem`, plus
`PhraseCard`, `LegoBasketViewer`, `VoiceConfiguration`, `VadLab` and four voicelab panels that a
wider grep turned up outside the briefed lists.

Two Popty surfaces needed a **container** direction rather than a per-run one, and this is a
deliberate layout change: PodLab's seam editor and PhraseCard's chunked view split one sentence
across sibling elements with clickable seams between them, so the order the boxes lay out in *is* the
reading order. An LTR container rendered Arabic back-to-front with every seam pointing at the wrong
gap.

`PodDetailView`'s target textarea already carried `dir="auto"` — an earlier partial attempt. `auto`
is the first-strong-character guess this helper exists to replace; it is now content-detected.

The Popty helper also gained `isolateText()` for plaintext slots that can hold no element and so no
`dir` — an `<option>`, which additionally carries an LTR `"12. "` index prefix.

## Tests

| suite | result |
|---|---|
| `@ssi/core` helper unit tests | 10 passed |
| `@ssi/core` full suite | 672 passed, 9 skipped |
| player-vue bidi component test | 6 passed |
| player-vue full suite | **2,237 passed**, 3 skipped, 2 todo |
| Popty helper + bidi component suites | 127 passed |
| Popty full suite | **1,941 passed**, 5 failed — all pre-existing |

The helper tests use **real `ara_lb_for_eng` rows** pulled from Supabase, not invented Arabic:
`أحكي عربي هلق!` ("speak Arabic now!"), `بدي أحكي عربي، معك!`, `بدي أحكي معك عربي هلق.`

The component test is a genuine regression pin, not a rubber stamp: with the `dir` binding reverted
it fails 4 of 5; with it restored it passes. It also asserts the `eng_for_ara` shape — Arabic known
side `rtl`, English target `ltr` — so a future target-only refactor cannot silently un-fix those two
courses.

**Popty's 5 failures are pre-existing and not ours.** Verified by running the same suite on a clean
`origin/main` worktree: the failing files and the individual failing test names are identical on both
sides. They are 4 `LearningJourneyAudioFlags` tests and 1 `clip-identity` migration test; the failing
*files* also include e2e specs that need a running app. One further test, `PodLab.casting`, is
**flaky** — it failed in one run and passed in the next, on unmodified `origin/main`, which is what
briefly made our branch look one worse than baseline.

## Needs Tom

1. **Exported scripts still carry the bug.** `ScriptViewer`'s markdown export is plain text with no
   direction metadata, so a reviewer reading an exported script in any LTR editor sees the same
   misplaced `!`. Fixing it means embedding invisible bidi control characters (RLM/FSI) in text a
   human copies out — that is a taste call, not an engineering one. Left alone deliberately.
2. **`:title` tooltips are still unfixed.** Browser-rendered, so no CSS or `dir` reaches them.
   `isolateText` would fix them, at the cost of invisible control characters in tooltip text for low
   value — flagged rather than done.
3. **Kai's proofreading tool was not touched.** It lives off `main` on
   `tool/proofread-hosted-2026-08-06` at `tools/proofread`, and committing to someone else's branch
   is a hygiene violation here. It would benefit from the same helper.

Deborah's second question — whether "I speak" at S0009L01 should be the Levantine progressive
عم بحكي or the plain habitual بحكي — was explicitly out of scope: it is a content judgment needing
her ear, and it stays logged in `ara-lb-native-reviewer-triage-2026-08-18.md`.

## Not merged

Both branches are `fix/arabic-bidi-rendering-2026-08-18`, pushed to origin in their own repos.
Neither is merged to `main` and neither is deployed. Popty's work was done in a separate worktree
(`/home/tomcassidy/SSi/popty-bidi-2026-08-18`) so that another session's in-flight branch in the main
checkout was never disturbed.
