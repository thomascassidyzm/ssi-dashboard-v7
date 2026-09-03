# ara_lb_for_eng — two learner-facing HEARS/SEES findings

**2026-08-18. Triage slice of Deborah's 2026-08-17 `ara_lb_for_eng` content-check.
Read-only. No DB writes, no audio generated, no fixes applied.**

Scope of this slice: findings about what the learner actually **hears** (the
audio) and **sees** (the on-screen text), as distinct from database-text-only
findings. Two findings below.

## Mapping sanity check (done before anything else)
`course_round_index` join verified against the given anchor: `S0022L03` →
`round_index = 61` for `ara_lb_for_eng`, matching Deborah's R61. Mapping trusted
for the round numbers cited below.

---

## Finding 1 — HEARS: female voice audibly disagrees with the on-screen text on ~380 clips

**VERIFIED**, live, independently counted (not taken from any prior scratch file).

### What I ran
Pulled all `course_audio` rows for `ara_lb_for_eng` voiced by the two Levantine
voices (`azure_ar-LB-LaylaNeural` — female, `azure_ar-LB-RamiNeural` — male),
compared each row's `word_boundaries` (what Azure's engine actually voiced) to
`text_stripped` (what's stored/shown):

- **10,780** rows compared (both voices, all roles, only rows with
  `word_boundaries` populated).
- **380 mismatches** total: **350** on Layla (female), **30** on Rami (male).
- Of those 380, **331** are explained by a single mechanism: the adjective's
  Arabic gender ending (ة, tā' marbūṭa) is present in one of {stored, spoken}
  and absent in the other. The remaining **49** are a different phenomenon
  (verb-person drift, e.g. كان→كنت "was"→"I was", and a handful of single-word
  substitutions) — not counted as this finding, flagged as a separate open
  item.

### What's actually happening (root cause, HIGH confidence)
This is **not mis-transcribed metadata** and **not a broken TTS clip**. Levantine
Arabic predicate adjectives must grammatically agree in gender with the speaker
when the sentence is self-referential ("I'm happy"). Azure's Arabic neural
voices enforce this agreement at synthesis time regardless of the literal input
string — so:
- **Layla (female voice)** given the masculine string مبسوط ("happy", m.)
  audibly says **مبسوطة** (f.) — this is linguistically *correct* for a female
  voice describing herself, but it doesn't match what's on screen.
- **Rami (male voice)** given a feminine string like مثيرة ("interesting", f.)
  audibly says **مثير** (m.) — same mechanism in reverse.

So **the audio is not wrong** — it's the stored/displayed `target_text` that's
frozen at a single gender-unmarked form while the two voices necessarily diverge
from it in opposite directions. `course_audio.text` / `text_stripped` was never
updated to reflect what each specific voice actually produces (matches the
established pattern already in project memory: *"Gender adaptation is invisible
in course_audio.text — female voice speaks feminine agreement; only
word_boundaries shows it."*).

### Concrete example (verified live against `course_audio`, `course_legos`, `course_practice_phrases`, `course_round_index`)
LEGO **S0076L01** — "happy" — round **R195** (`course_round_index` confirms
`seed_number=76, lego_index=1` → `round_index=195`):

| audio row | voice | stored text | actually spoken (word_boundaries) |
|---|---|---|---|
| `05650d0f-a286-42ad-a865-31d513da313e` (target1) | Layla (f) | مبسوط | **مبسوطة** |
| `4aef2c1f-e009-4c2a-b4d7-241cb1419f65` (target2) | Rami (m) | مبسوط | مبسوط (matches) |

Same LEGO's downstream "use" phrase **`ara_lb_for_eng:S0076L02U01`** (round
R196, "I'm very happy with how much I've learnt already") repeats the identical
divergence on its own `target1_audio_id` (`00a5842d-…`, Layla): stored مبسوط,
spoken مبسوطة.

A second, independent example at a different round, sampled from
`.a74-scratch/deborah-ara-lb/r37_audio.json` and re-verified: **R37**, "well"
— stored منيح (m.), Layla's clip (`11fdef4e-77c8-4d5c-a6fc-59238efd4c73`)
audibly says **منيحة** (f.).

### Does the learner notice / can they still produce the answer?
- **Scoring isn't broken**: the system of record for what counts as a correct
  typed/recalled answer is `target_text` (the masculine, gender-unmarked
  form) — a learner producing "مبسوط" is not marked wrong by this defect.
- **But it undermines trust and literacy**: any learner reading along with
  Layla's audio (which is most of the course — Layla is the dominant voice,
  350/380 of the mismatches) hears a word ending that isn't on the screen in
  front of them. For a debut LEGO (R195, first time "happy" is taught) that's
  exactly the moment a learner is trying hardest to map sound to spelling —
  worst place for the mismatch to land.
- This is **course-wide**, not a one-off: 350 Layla clips is roughly 3% of her
  10,780-clip inventory that this affects.

### Proposed fix — MEDIUM confidence
No audio needs generating — **the correct audio for both genders already
exists** (Layla's clip is already the linguistically correct feminine form;
Rami's is already the correct masculine form). This is a **display/metadata**
problem, not an audio problem:
1. For the 331 ta-marbūṭa rows, backfill a per-audio-row "as-spoken" caption
   (recoverable directly from each row's own `word_boundaries` — already
   stored, zero regeneration cost) and use *that* as the on-screen text when
   that specific audio clip is playing, instead of the single shared
   `target_text` field.
2. Leave the LEGO/phrase's canonical `target_text` (used for scoring,
   decomposition, and the abstract vocabulary card) as the unmarked masculine
   form — don't touch scoring.
3. The 49 non-ta-marbūṭa rows (verb-person drift, single-word subs) are a
   **different defect class** — not diagnosed here, flagged as a gap.

Confidence is MEDIUM rather than HIGH because I have not opened the actual
caption-rendering component to confirm `target_text` (vs. some other field) is
literally what's painted on screen during audio playback for every
surface (Listening vs. Pronunciation overlays render from the same
`target_text` column per grep of `PronunciationOverlay.vue` — I did not check
every player surface). This closes the "Gender-voice mismatch — explicitly NOT
measured for Arabic" coverage gap logged in
`docs/a108/ara-lb-native-reviewer-triage-2026-08-18.md` (finding 5) with a
real, live measurement: **380 confirmed instances, not "unknown."**

---

## Finding 2 — SEES: exclamation mark renders on the wrong side of Arabic text

**VERIFIED**, independently re-checked against live course data and the actual
learner-app source (not just cited from the prior triage doc).

### What I ran
- Confirmed live rows exist with this shape, e.g.
  `ara_lb_for_eng:S0001L05U04`: `target_text = "أحكي عربي هلق!"` ("speak Arabic
  now!"), and `ara_lb_for_eng:S0001L04U05`: `target_text = "بدي أحكي عربي،
  معك!"`.
- Confirmed independently (grep, not reused from the prior doc) that
  `ssi-learning-app/packages/player-vue/src` has **no `dir=` attribute, no CSS
  `direction:` rule, and no `unicode-bidi` rule** anywhere relevant to text
  rendering (the only `direction:` hits are unrelated `flex-direction`). Checked
  `PronunciationOverlay.vue` specifically (the component that selects and
  renders `target_text`) — no `dir`/`lang` scoping there either.

### Root cause (HIGH confidence — Unicode fact, not a judgment call)
- `؟` (Arabic question mark, U+061F) has bidi class **AL** (strong RTL) — it
  always renders correctly at the visual start/end of an RTL run regardless of
  surrounding paragraph direction. This is why Deborah confirmed `?` looks
  right.
- `!` (U+0021) has bidi class **ON** (neutral) — a neutral character at the
  edge of an RTL run inherits the **paragraph's** direction when there's no
  isolating markup. With no `dir`/`unicode-bidi` anywhere in the render path,
  the paragraph defaults to LTR, so the trailing `!` visually jumps to the
  *right* of the Arabic text instead of staying at the logical end (visual
  left, since Arabic reads right-to-left).
- The string itself is stored correctly — logical order is untouched. This is
  purely a rendering defect.

### Learner impact
Low — cosmetic, doesn't block comprehension or scoring (this never touches
`target_text` content, only how it paints). But it is **not specific to
`ara_lb_for_eng`** — it reproduces on every Arabic-script course rendered in
this app (any AL-class script in an LTR-default paragraph), so fixing it once
in the renderer fixes it estate-wide.

### Proposed fix — HIGH confidence (front-end, not content)
Wrap Arabic-script `target_text` spans with `unicode-bidi: isolate` (or
`isolate-override`) plus `dir="rtl"` at the container that renders known/target
text, e.g. in `PronunciationOverlay.vue` and the sibling `ListeningOverlay.vue`
/ `LegoAssembly.vue` components that render `target_text` (I confirmed
`target_text` is read in all of these via grep, but did not audit each one's
render markup individually — worth a quick sweep before shipping the fix
everywhere it's needed). No DB or audio work required; this is a CSS/markup
change in `ssi-learning-app`, not `ara_lb_for_eng` content.

This corroborates and tightens (with independent live verification and source
grep, not just re-quoting) finding 1 in
`docs/a108/ara-lb-native-reviewer-triage-2026-08-18.md`.

---

## Summary

| # | Finding | Learner sees/hears | Verified how | Fix type | Confidence |
|---|---|---|---|---|---|
| 1 | Female voice (Layla) audibly diverges from displayed gender-unmarked text on adjectives | HEARS | Live word_boundaries vs text_stripped diff, 10,780 rows, 380 mismatches (own count, cross-validated against a concurrent scratch sweep's identical 380) | Display fix (per-clip caption from word_boundaries); no new audio | MEDIUM |
| 2 | `!` renders right of Arabic text instead of left | SEES | Live rows + independent grep of learner-app source confirming no dir/bidi markup anywhere in the render path | Front-end CSS/markup fix (`unicode-bidi: isolate` + `dir="rtl"`), estate-wide | HIGH |

Both findings are safely actionable without Deborah's linguistic judgment —
finding 1's fix is a metadata/display change (audio and scoring untouched),
finding 2's fix is a rendering bug with no content dimension at all. Neither
needs a native-reviewer sign-off per the standing ruling; both are proposed
here as engineering tickets, not content-pass items.

No commits produced by this job — diagnosis only, written to this one file.
