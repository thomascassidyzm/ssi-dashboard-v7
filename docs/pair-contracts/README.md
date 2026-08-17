# Pair contracts — how a known-side contract is chosen

A **known-side contract** tells the course-builder's known-side vocabulary gate what the
*prompt* language is allowed to do: which function words are free glue, which items are
negative-polarity and what licenses them, which negation markers exist, and which grammatical
constructions are machinery rather than vocabulary the learner must have been given.

## The precedence rule

Contracts are resolved by `loadPairContract(courseCode, knownLang)` in
`services/course-builder/lib/validation.cjs`, in this order:

| # | File | Wins when |
|---|------|-----------|
| 1 | `<course_code>.contract.cjs` | a course-specific contract exists — **it always wins** |
| 2 | `_lang_<iso639-3>.contract.cjs` | the course's known language has a language-level contract — **the fallback** |
| 3 | `_default_eng.contract.cjs` | the known language is English and neither of the above matched |
| 4 | *(null)* | nothing resolves — the caller must say so out loud, never pass silently |

A trailing `_vN` is stripped from the course code first, so `zho_for_eng_v2` inherits
`zho_for_eng.contract.cjs`.

## Why the language, and why the override

The known side is a property of the **known language**, not of the pair. Everything the gate
consumes is Tamil grammar, and Tamil grammar does not change because the target language is
Korean instead of English. Keying resolution on `course_code` alone meant `eng_for_tam` was
checked while `kor_for_tam` and `zho_for_tam` got no check at all — not a lenient check, *no
check*. Measured 2026-08-17: **34 courses holding real lego content, across 17 known
languages, had no known-side contract of any kind.**

The course-specific file still wins because a pair can carry genuine pair-specific knowledge
the language-level contract cannot: a construction that matters only because of what *this*
target teaches, or a contract that has been calibrated and ratified against *this* corpus.
Overriding is rare and deliberate — when a course-specific file exists, it is there because
somebody decided the language-level default was wrong for that pair.

## The two dialects, and which one to write

**Mechanical** — `freeGlue` / `npiTokens` / `negationWords` / `negationMarkers` /
`constructions[{id, test}]`. These are regexes the gate *executes*. `isMechanicalContract()`
returns true, and a vocabulary breach under a mechanical contract **blocks the submission**.

**Agent brief** — `freeClass` / `npi` / `npiLicensing` / `negation` /
`knownConstructions[{id, marker, description}]` / `glossRules`, plus prose. This is reference
knowledge for a human or an agent, written under Tom's rule *"no regex for language"*.
`isMechanicalContract()` returns false, and every finding is **advisory**.

> **Language-level contracts are written in the brief dialect, deliberately.** Kai's ruling,
> 2026-08-17: for these languages an exact-form matcher is **triage, not pass/fail** — it
> reports lists, it never fails a build. Under agglutinative or root-and-pattern morphology
> the matcher cannot tell an inflected form of an introduced word from a genuinely new word,
> so a high finding count is a reading list, not a verdict. The one exception is `_lang_eng`,
> which re-exports the long-calibrated `_default_eng` scaffold and stays mechanical.

`services/course-builder/lib/known-side-language-contracts.test.cjs` asserts this: every
`_lang_*` file other than `_lang_eng` must be non-mechanical, so nobody can turn a reporting
layer into a build-breaker by using the wrong key names.

## Re-exports

Where a language's knowledge already lives in a pair file, `_lang_<iso>` **re-exports** it
rather than copying:

```js
module.exports = require('./eng_for_tam.contract.cjs');
```

One source of truth per language. The seven `eng_for_<Indic>` briefs and `_default_eng` are
all reached this way, so editing the pair file updates every course of that known language.

## Reporting

`tools/course-optimization/known-side-sweep.cjs` runs the gate over live course content and
prints findings **raw and confirmed separately**. It never writes, and it never fails a build
on a brief-backed finding however many there are.

```
node tools/course-optimization/known-side-sweep.cjs kor_for_tam --examples 15
node tools/course-optimization/known-side-sweep.cjs --all --json sweep.json
```
