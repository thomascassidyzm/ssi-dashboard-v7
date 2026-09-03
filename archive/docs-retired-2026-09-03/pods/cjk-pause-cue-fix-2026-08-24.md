# CJK pod turns never got their pause cue — fixed 2026-08-24

**Landed on `main` as `72b3a9e45`.** Code + tests only. No audio was rendered, queued or touched.

## The bug

When a pod TURN holds several sentences, `generatePodAudio` synthesises it as ONE take and
deliberately inserts a `" … "` pause cue between the sentences, so the engine pauses audibly
at each boundary. That engineered pause is the silence the splicer later cuts on to make
per-sentence clips.

The splitter that found those boundaries was `/(?<=[.!?…])\s+/`. It has neither the CJK
terminals `。！？` nor any way to fire without whitespace after the mark — and CJK text has no
such whitespace. So a five-sentence Japanese turn looked like **one** sentence, and no Chinese
or Japanese turn has ever received a pause cue.

That is why today's Pod 1 splice pass had to withdraw 3 Chinese turns: with no engineered
sentence pause, the splice margin could not tell a comma pause from a sentence end
(1.75 on a broken cut vs 1.65 on a fine one).

## The fix

`services/phases/phase8-audio-v13.cjs` now uses, verbatim, the expression the splicer already
cuts on (`tools/pods/splice-sentence-clips.cjs` `SENTENCE_SPLIT`, same in
`tools/render-sentence-takes.cjs`):

```js
/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
```

Whatever puts the cue IN and whatever cuts ON it must agree. The split is now a small exported
pure helper, `splitPodTurnSentences(text)`, so it is unit-testable in milliseconds without
standing up TTS or S3. `generatePodAudio` is otherwise unchanged.

Latin behaviour is identical — asserted, not claimed: the test runs ten Latin/German/Spanish
cases, including `"It costs 3.5 euros."`, `"Dr. Smith arrived."`, ellipsis and
leading/trailing whitespace, through both the old and the new expression and requires equal
output.

Test: `services/voice-engine/__tests__/pods-pause-cue-split.test.mjs` — 21 tests, every
CJK/Korean/Hindi fixture is REAL pod text pulled from `listening_pod_sentences` today, with the
row id in a comment.

## What would render differently

Read-only census over all 23,872 `listening_pod_sentences` rows, both tracks. These are the
turns the OLD splitter saw as one sentence and the NEW one sees as several — i.e. turns that
would now get a pause cue they have never had.

| Course | Track | Turns |
|---|---|---|
| jpn_for_eng | target | 302 |
| zho_for_eng | target | 270 |
| ita_for_jpn | known | 97 |
| zho_for_jpn | known | 97 |
| fra_for_jpn | known | 95 |
| deu_for_jpn | known | 94 |
| spa_for_jpn | known | 94 |
| eng_for_jpn | known | 92 |
| eng_for_zho | known | 92 |
| zho_for_jpn | target | 83 |
| ara_eg_for_eng | target | 29 |
| ara_for_eng | target | 29 |
| ara_sy_for_eng | target | 20 |
| fas_for_eng | target | 19 |
| eng_for_ara | known | 9 |
| eng_for_urd | known | 9 |
| **TOTAL** | | **1,431** |

17 course/track populations across 12 courses. The Arabic/Persian rows are the `؟` half of the
expression, not CJK — they were equally invisible before.

### The consequence, plainly

**The pause cue IS the canonical text for the clip.** It is what `findExistingAudio` dedups on
and what gets stored on the `course_audio` row. So the moment a CJK turn gets its cue, its text
no longer matches its existing un-paused clip, and a future render produces a **NEW** clip
rather than reusing the old one.

That is the intended design — the comment in the code says so — but it means the next render
touching any of those 1,431 turns is a **paid re-render**, not a free reuse. Nobody should be
surprised by it.

## Korean was never broken

The commission named Chinese, Japanese and Korean. Korean was not affected.

Korean orthography uses Latin `.` `!` `?` with a following space. **0 of 604 live
`kor_for_eng` pod rows contain any of `。！？`**, and 300 of them were already splitting as
multi-sentence under the old expression. Korean's lowest splice margin in the census was 2.29,
well clear of the failure band. Korean fixtures are in the test and they pass **before and
after** the fix — that is the point of keeping them.

## Devanagari danda — real, and deliberately not fixed here

Hindi and Nepali pod text does terminate sentences with `।`, and neither the old expression,
the new one, nor the splicer handles it:

| Course | Rows containing `।`/`॥` |
|---|---|
| nep_for_eng | 278 |
| hin_for_eng | 274 |
| eng_for_ben | 116 |
| eng_for_hin | 116 |
| eng_for_pan | 116 |

Worked example, `hin_for_eng:pod-0-retired-2026-08-24:SC04-S002` — three sentences collapse
into one piece under both old and new:

> `हेलो!` + `माफ़ कीजिए, लेकिन मैं अभी बात नहीं कर सकती। मुझे अभी घर जाना है। क्या हम कल बात कर सकते हैं?`

This was a **default I was given, not a decision I made**: keep phase8 identical to the
splicer's `SENTENCE_SPLIT`, because consistency between what inserts the cue and what cuts on
it is worth more than a unilateral improvement in one of them. The test pins the current
behaviour so the follow-up has to change both files, and that assertion, together.

Note one existing divergence found while grepping: `tools/pods/verify-spliced-sentences.cjs:106`
**already** includes `।` in its `SENTENCE_SPLIT`, so the verifier and the splicer do not agree
about Hindi today. Worth folding into the same follow-up.

## Other copies of the Latin-only boundary — findings, not work

Not swept in this commit, per the brief. Live (non-worktree) copies:

| File | CJK-blind? | Does it matter? |
|---|---|---|
| `src/lib/podArcCompose.js:157` | yes | Composes the pod arc from turn text. Worth a look — it will under-count CJK sentences. |
| `packages/player-vue/src/composables/podSentenceSplit.ts:20` (sibling repo) | yes | **No.** `splitRowUnits` takes its unit COUNT from the clip array and each unit's TEXT from that clip's own stored `course_audio.text`, so the learner reads exactly what the splicer wrote. Verified in the splicer's own comment block against the app's real code. |
| `tools/pods/splice-sentence-clips.cjs:168` `KNOWN_SPLIT` | yes | Only in a course whose KNOWN language is CJK — `eng_for_jpn` / `eng_for_zho` etc. are exactly that, and they are 184 of the 1,431 turns above. Real. |
| `tools/pods/unlink-known-mismatch-splits.cjs:77` `KNOWN_SPLIT` | yes | Same population as above. |
| `tools/pods/verify-spliced-sentences.cjs:107` `APP_LATIN_BOUNDARY` | yes, by design | It is deliberately modelling the app's Latin regex. Leave it. |
| `tools/verify-breakdown.cjs:18` | yes | Breakdown clips, not pods. Out of this scope. |

## What did not go perfectly

`services/voice-engine/__tests__/pods-origin-guard.test.mjs` has **3 failing tests** in this
checkout. They are **pre-existing and not mine**: stashing my phase8 change and re-running
reproduces the same 3 failures identically. Reported, not fixed — it is somebody else's live
work and outside this commission. The rest of the suite is green
(8,991 passed / 9,000, the other failures being co-workers' worktree copies under `scripts/`
that have no `node_modules`).

## Pre-flight gate

Noted and did not apply: one regex in one function, unit tests, and one read-only counting
query. No TTS, no whisper, no rendering, no sweep, nothing over the thousand-row write bar.
