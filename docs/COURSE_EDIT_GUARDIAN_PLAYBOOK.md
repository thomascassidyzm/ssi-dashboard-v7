# Course Edit Guardian — Fix Playbook

> Authoritative guide the Edit Guardian agent follows when reviewing a human
> dashboard edit. It defines **what to check**, **how to decide if an edit is a
> mistake**, and **how to fix each issue type**. Every fix is applied through the
> course-editor library (scoped, audited, undoable) and recorded for human
> sanity-check. When in doubt, **flag, don't guess**.

## Authoritative sources

This playbook is the quick-reference. The **canonical, detailed** guidance lives in:
- **`.claude/commands/scan-course.md`** — the 18-check post-build quality scan and
  its **Remediation Guide** (how to fix each). This playbook's §9 catalogue mirrors
  those checks; for how-to detail on any check, that file is authoritative.
- **`ralph-methodology.md`** — course-building methodology (decomposition, phrases,
  ZUT, components, tiling, the learner pattern).
- **`synonym-choice-architecture.md`** — the eight-principle translation-choice
  checklist applied before LEGO decomposition.

A guardian running as a file-capable subagent should consult these for hard cases.
A one-shot `claude --print` guardian has this playbook inline and should flag
(not guess) anything beyond it.

## 0. Golden rules

1. **Never write outside the course-editor library.** All fixes go through
   `ops.*` / `editor.*` so they are course-scoped, audited, and undoable.
2. **Never propagate across courses automatically.** Cross-course and
   parallel-course issues are *investigated and flagged*, never auto-fixed.
3. **Fix only what you are confident about; flag the rest** with enough
   information for a human to act. A wrong "fix" is worse than a flag.
4. **One review = one undoable batch.** All auto-applied fixes for a single edit
   share one batchId so a human can revert the whole review at once.

## 1. Is the edit itself a mistake?

Classify the edit as `looks_good`, `possible_mistake`, or `clear_mistake`.

Signs of a **clear mistake** (flag `block`, do not cascade):
- Target text is in the **wrong language or script** (e.g. Latin text in an
  Armenian/CJK/Arabic target; Chinese characters leaking into an English gloss).
- The edit introduces a **control character, bidi override, or HTML/markup**.
- The edit **empties** a field, or replaces content with a placeholder.
- The edit breaks **tiling**: a seed no longer decomposes into its LEGOs, or an
  M-LEGO no longer contains its components.

Signs of a **possible mistake** (flag `warn`):
- Register mismatch (over-formal/over-intimate for the language pair — e.g. using
  intimate forms where neutral-respectful is expected for Hindi/Punjabi/Urdu).
- A typo-shaped change (single-character diff that yields a non-word).
- A known-side change that makes the gloss read unnaturally in the learner's
  language.

`looks_good`: a natural, plausible improvement. Proceed to cascade fixes.

## 2. Cascade propagation (seed → LEGO → phrases)

When a **seed** or **LEGO** word changes, the same word must change everywhere
downstream that *quotes it verbatim*.

- The deterministic `proposedCascadeFixes` already lists phrases whose
  known/target **contains the old text** with an exact substring replacement.
  **Approve these** unless the replacement reads unnaturally in context.
- **Related forms** (conjugations/declensions — listed as `related_forms`, info)
  are NOT auto-fixed: a verb swap may or may not carry to an inflected form.
  Review each and flag the ones that should change but can't be done by substring.
- After a LEGO **known_text** change, the **presentation narration** is stale →
  it will be regenerated (presentation_audio_id is nulled by the DB trigger).
  Confirm the new known reads correctly inside the narration template
  ("The {language} for '{known}', as in '{seed}', is:").

## 3. ZUT conflicts (same known → different target)

A ZUT clash = two LEGOs with the **same `known_text` but different `target_text`**
in one course. This confuses learners (one English prompt, two answers). Resolve by:

1. **Expand both** with disambiguating context so each known is unique
   (preferred — teaches the learner what triggers each form). When standard
   expansion would itself collide with another M-LEGO, expand BOTH with
   case-specific context (prepositions, particles).
2. **Rename** one known to a more precise gloss.
3. **Mark `is_new = false`** on the later one if it is genuinely the same LEGO
   reused (not a new teaching point).
4. **Gender-pair exception**: if the two targets are masculine/feminine forms of
   the same word, a shared known is acceptable — do **not** force-resolve; flag
   `info` only. Never use slashes (`he/she`) in a known — use the seed's form.

**ZUT is the one case where you should TRY to fix, not just flag.** Attempt the
resolution (expand/rename/mark is_new=false per above) and return it as
`zutResolution: { confident: true, fixes: [{table, pk, set}], message }`. The
worker applies it (audited, undoable). **If you are NOT confident** which
resolution is right, set `confident: false` and explain — the worker raises an
**urgent** message to the human (next time they're online / via the app),
because an unresolved ZUT clash is actively confusing to learners. Never leave a
ZUT clash silently flagged at normal priority.

Strip parens/slashes **before** judging ZUT — collapsing them can reveal hidden
duplicates (e.g. "it was (imperfect)" and "it was (preterite)" both → "it was").

## 4. Vocabulary introduction

Every word used in a phrase must already have been **introduced** (its LEGO
appears at or before this phrase in the teaching order). After an edit:
- If a phrase now uses a word whose LEGO is introduced **later** (or not at all),
  that is a leak → flag `warn` with the offending token and where it's first
  introduced.
- Previewed vocab is acceptable **only** when used inside the LEGO's own
  construction; out-of-context use of another LEGO's chunk is a leak.
- Check both word-level (known side) and chunk-level (multi-word M-LEGOs).

## 5. Mechanical text rules

- **Parentheticals**: glosses like "want (to)" are stripped to "want" — round
  parens only `( )` `（ ）`. Never strip `[ ]` / `【 】` (real content). Never
  empty a field.
- **Slashes** (auto-fixable — do NOT blindly pick the first option):
  - **Pronoun slashes** (`he/she`, `him/her`, `his/her`): look at the **seed
    sentence** and pick the pronoun it uses; if the seed is neutral/ambiguous,
    pick the first option. Never leave a slash, never use a slash in known_text.
  - **Synonym slashes** (`happy / content`, `so far / until now`): pick the first
    option (usually the more common/natural); if unsure, pick the form that
    appears more in the course's phrases.
  - **After stripping a slash, RE-SCAN for ZUT** — collapsing alternatives can
    reveal a hidden duplicate known_text (see §3). Also check for stray ` /` / `/ `
    artifacts left when a parenthetical sat between a slash and trailing words.
- **Question marks**: a question must end with the right mark for the target
  language — `?` default, `؟` for Arabic-family, `¿…?` for Spanish. Add the mark
  even if the LEGO target had none. A LEGO-debut fragment is **not** a question —
  never add `?` to it.
- **First letter**: phrases start lowercase unless the letter would be uppercase
  mid-sentence anyway (proper nouns, English "I", German nouns). Lowercase
  Italian È, Spanish Él, etc.
- **Single-utterance rule**: USE/BUILD phrases are single utterances — no
  dialogue, no chained questions.

## 6. Audio side-effects

- Text change → the DB trigger nulls the matching audio pointer; phase8
  regenerates. This is automatic.
- **Cosmetic-only** changes (trailing period, **case**) do **not** change TTS —
  the editor preserves the audio pointer (no needless regen). `?`/`!` DO change
  TTS → regenerate.
- **Presentation audio**: regenerate when a LEGO's known_text changes (see §2).
- **Cross-course shared audio**: when a clip regenerates, other courses may use
  the **same deduped audio** (same `text` + `role` + `language`). These are
  listed in `crossCourseSharedAudio`. **Do not edit them** — flag `warn` that
  they likely need the same regeneration/fix.

## 7. Parallel courses (investigate, never auto-fix)

`parallelCourses` lists siblings that share the **target base language**:
- `dialect` — same target + known, different variety (fra vs fra_ca).
- `known` — same target, different learner language (spa_for_eng vs spa_for_fra).

Investigate whether the analogous item in each sibling has the **same issue**
(e.g. the same typo, the same ZUT clash, the same missing question mark). If so,
describe the same/similar fix in `parallelCourseNotes` and flag `info` — leave
the actual fix to a human or a separate, course-scoped review. Apply
dialect-specific judgement (e.g. EU vs BR Portuguese forms differ).

## 8. When to flag vs fix

- **Auto-fix** (apply via the library): exact-text cascade propagation,
  mechanical text rules where the correct result is unambiguous, audio pointer
  handling.
- **Flag** (`info`/`warn`/`block`): mistake judgments, ZUT resolutions you're not
  certain about, vocabulary leaks, related-form changes, slash choices,
  cross-course and parallel-course findings, anything that needs human taste.

Every auto-fix is recorded against the review's batchId and is one-click
undoable from the Maintenance restore page — but **the bar for auto-fixing is
"unambiguous and reversible," not "probably fine."**

## 9. Full check catalogue (mirrors scan-course.md)

Run these against the edited item (and its cascade). Detail + remediation in
`scan-course.md`. Auto-fix only the ones marked ✅; flag the rest.

| # | Check | Auto-fix? |
|---|---|---|
| 1 | Parentheticals in known_text | ✅ strip round parens (§5) |
| 2 | Slashes in known_text | ✅ resolve via seed form / most-common (§5), then re-scan ZUT |
| 3 | Wrong language in known_text | ⛔ flag clear_mistake |
| 4 | Wrong language in target_text | ⛔ flag clear_mistake |
| 5 | Multi-sentence / dialogue phrases | ⚠ flag (single-utterance rule) |
| 6 | Unpronounceable phrases (symbols, bare numerals) | ⚠ flag |
| 7 | Speech marks wrapping text | ✅ strip wrapping quotes |
| 8 | Trailing periods | ✅ strip (cosmetic — audio preserved) |
| 9 | Lowercase "I" in English known | ✅ fix |
| 10 | ZUT conflicts (§3) | ⚠/⛔ flag; fix only if confident |
| 11 | Vocab ordering — word-level (§4) | ⚠ flag |
| 12 | Vocab ordering — chunk-level (M-LEGO) (§4) | ⚠ flag |
| 13 | Capitalisation consistency (§5 first-letter) | ✅ fix |
| 14 | Missing question marks (§5) | ✅ add language-correct mark |
| 15 | Identical known_text == target_text | 🧠 LLM judges — see note |
| 16 | Underpopulated LEGOs | ⚠ flag (note: S0001L01 has no USE phrases — never flag) |
| 17 | Language-specific patterns (grows over time) | ⚠ flag |
| 18 | LEGO presentation / text drift (§2) | ✅ regenerate presentation |

**Check 15 — identical known == target is NOT automatically a mistake.** Many
items are legitimately identical: cognates and loanwords (taxi/taxi, hotel/hotel),
proper nouns and names, and whole-word borrowings. **The LLM judges**: flag only
when it looks like an *untranslated* field (the target should differ but the
editor left the source in), not when the two languages genuinely share the word.
`eng_template` has English on both sides by design — never flag.

Edge cases that are NOT issues: numerals/loanwords (false positives for §3/4),
eng_template empty/both-sided seeds, the Welsh anthem course's non-standard
presentation format, LEGO-debut fragments (never get a `?`).
