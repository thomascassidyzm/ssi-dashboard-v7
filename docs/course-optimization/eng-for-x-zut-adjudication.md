# eng_for_X — ZUT quality check & release-readiness (2026-06-15)

*One structural-ZUT pass over all 16 `eng_for_X` draft courses via the gate-and-fix method,
adversarially calibrated to default-FP (the zho precedent: ~70% of raw flags are noise).
Read-only analysis — nothing in the DB changed. Per-course fix lists: `eng-for-x-fixes/<course>.json`.*

## The state we're checking

16 `eng_for_X` courses are built in Supabase — **decomposed to seed 300** (the canonical seed list is 668,
but legos+phrases stop at 300, the MVP tier), ~500–720 LEGOs, 5k–10k phrases — and **every one is still
`status=draft` (nothing released)**. So this is a *gate-and-release*
job, not a build job. The India-priority set is all present (Hindi, Bengali, Gujarati, Punjabi,
Tamil, Urdu, + Sinhala) plus East Asia (Chinese, Japanese, Korean) and the European/Arabic long tail.
**Not yet built** (if the full Indian set is wanted): Telugu, Marathi, Kannada, Malayalam, Odia, Assamese.

## Headline

**All 16 courses are fundamentally clean and releasable with targeted cleanup, not rework.**
Of **2,315 raw ZUT collisions**, **80% are false positives** (component sub-glosses never drilled
bare + same-lemma English inflection), leaving **467 real fixes**. Genuine release-blockers (a
high-frequency drilled token glossed incoherently) exist in only two cases — Chinese `好` and Japanese
`わかりません/あまり`; the other "high-severity" counts (Korean 7, Italian 3) are single *policy* decisions,
not scattered bugs.

## Update — fixes applied 2026-06-15

Both top levers were executed:

- **Lever 2 (USE/BUILD consolidation + data-error fixes) APPLIED to the DB.** 359 safe fixes
  (`real_consolidate` + `fp_wrong_data` carrying a canonical English) → **383 rows re-glossed** across all
  16 draft courses. 30 malformed/spurious matches were auto-guarded out (slash-composite canonicals; a
  short gloss spuriously matching a full-sentence row). **78 `real_differentiate` fixes were deliberately
  NOT applied** — they need known-side disambiguation or are inherent ambiguities (वह he/she, कल
  yesterday/tomorrow, ताকে him/her), a human call. Every changed row is backed up in
  `eng-for-x-fixes/_backups/<course>.json` (id + old gloss) → fully reversible. Scoped to `status=draft`.
  Re-sweep confirmed the drop: **raw collisions 2,315 → 1,983** (Tamil 117→66, Japanese 234→166 — exactly
  the predicted USE/BUILD effect). Applicator: `scripts/apply-zut-fixes.cjs` (dry-run default; `--apply`).
- **Lever 1 (flag-extractor) — SUPERSEDED by Tom's rule (2026-06-15): no regex ever for language.** The
  regex prototype (`scripts/zut-sweep-true.cjs`) only reached ~52% and under-caught (it can't judge
  convergence/adjunct-drop) — which is exactly why language judgment must be an **agent**, not a regex.
  The candidate-gathering sweep is fine (mechanical DB grouping), but the *classification* is the LLM
  adjudication — that IS the extractor. Do not invest further in regex normalisers/stemmers for this.

**Remaining to release-gate:** the 78 `real_differentiate` items (human review), the 2 true blockers
(zho `好`, jpn `わかりません/あまり`), and the known-side/tiling/vocab gates (below).

## Per-course result (raw flags at adjudication time)

| course | raw | sub-gloss FP | inflection FP | real fixes | blockers | grade |
|---|--:|--:|--:|--:|--:|---|
| eng_for_ara | 117 | 52 | 60 | 5 | 0 | light |
| eng_for_guj | 129 | 78 | 43 | 8 | 2 | light |
| eng_for_fra | 98 | 76 | 13 | 9 | 0 | light |
| eng_for_spa | 129 | 86 | 29 | 14 | 0 | light |
| eng_for_kor | 202 | 86 | 101 | 15 | 7* | light |
| eng_for_pan | 133 | 90 | 26 | 17 | 0 | cleanup |
| eng_for_hin | 148 | 65 | 63 | 20 | 0 | cleanup |
| eng_for_urd | 151 | 102 | 29 | 20 | 0 | cleanup |
| eng_for_deu | 117 | 65 | 32 | 20 | 0 | cleanup |
| eng_for_ita | 113 | 53 | 26 | 21 | 3* | cleanup |
| eng_for_por | 132 | 85 | 22 | 25 | 0 | cleanup |
| eng_for_sin | 132 | 88 | 10 | 34 | 0 | cleanup |
| eng_for_zho | 172 | 75 | 63 | 34 | 1 | cleanup |
| eng_for_ben | 191 | 90 | 51 | 50 | 0 | heavy |
| eng_for_tam | 117 | 61 | 4 | 52 | 0 | heavy |
| eng_for_jpn | 234 | 70 | 54 | 110 | 2 | heavy |

\* kor/ita "blockers" are one policy decision each (see levers 3 & 4), not distinct overloaded tokens.
ben/tam/jpn are graded "heavy" only because of the USE/BUILD drift bucket — lever 2 collapses most of it
(89 of Japanese's 110, all of Tamil's top 48).

## The seven cross-course levers (decisions, highest leverage first)

These are *one-fix-fixes-many* — most of the 467 are absorbed by a handful of policy calls:

1. **Tighten the flag-extractor** (tooling, not content). Suppress `role=component` slices and
   same-lemma English inflection (to-X/X, friend/friends, a/an, say/said/speaks) — they are 65–90% of
   every course's flags and are never drilled bare. This alone removes the bulk of the noise everywhere
   and gives a true signal for the next sweep. *(My `scripts/gen-zut-flags.cjs` is where the suppression goes.)*
2. **USE/BUILD consolidation policy** — the single largest *real* bucket. The same source sentence is
   glossed once in literal/build word-order and once in natural/use order (or differs only by a dangling
   to/it/is/now/again). **Policy: the natural USE rendering is canonical; drop decorative adjuncts with no
   source counterpart.** Clears most of Tamil (48), Japanese (89), Bengali, Sinhala, Portuguese, Urdu.
3. **Statement→question convergence is designed, not a bug** (Romance especially; also some zho/kor).
   One identical declarative source → "you speak X" and "do you speak X?". **Confirm-and-suppress**, or
   attach a `…?` cue. One decision clears Italian's blockers and most Romance noise.
4. **One canonical modal/desiderative per construction**, course-wide (Korean 해야 need-to/must &
   싶지 않아요 don't-want/wouldn't-like; Gujarati …નું છે; Tamil வேண்டும்/விரும்புகிறேன்; German möchte;
   like/enjoy split in zho/urd/deu). This is what makes Korean's 7 "blockers" from only 15 real fixes.
5. **Genderless / number-neutral pronoun cue** (Indo-Aryan + East Asian): Hindi वह, Bengali তাকে/সে,
   Urdu اسے, Italian suo, Bengali বন্ধু (friend/friends). Same prompt → he/she or him/her. One
   prompt-side disambiguation convention fixes the family.
6. **find-out vs know fork** on a single source verb (Gujarati જાણવા, Korean 알다, Arabic, zho) — one
   differentiate-by-context rule travels across courses.
7. **True blockers only:** Chinese `好` (Well/Yes/Good/Great) and Japanese `わかりません/あまり`. Fix these
   two directly before those courses ship.

## Recommended release sequence

India first, led by the cleanest, holding the heavy Indian pair until lever 2 lands; then East Asia
gated on their genuine blockers; then the very clean European long tail:

> **guj → hin → urd → pan → ben → tam → zho → kor → jpn →** spa → fra → por → ita → deu → ara → sin

## Known-side contracts authored 2026-06-15 (India cluster)

The 7 India-cluster known-side pair-contracts are written and validated:
`docs/pair-contracts/eng_for_{hin,urd,ben,guj,pan,tam,sin}.contract.cjs` (first-pass, `ratified:null`).
Each was derived by an Opus **agent** from the course's **real corpus** (token-frequency + LEGO inventory)
plus the zho/fra contracts. They are written as **knowledge BRIEFS** (Tom's rule: no regex for language) —
plain data + prose for a known-side *agent* to read, NOT regex-gate configs: the corpus-derived free class
(copulas/case-postpositions/particles), NPI items, negation markers (as a reference list, not a regex),
and the language's machinery as `knownConstructions` — ergative ने, honorific-only आप, gender/number
agreement, dative-experiencer को, aspect→tense mapping (Hindi); analogues per language. Corpus-faithfulness
check: **every free-class token is present in its course's corpus**. Tools: `scripts/export-known-corpus.cjs`,
`scripts/assemble-contracts.cjs`.

### The known-side check is AGENT-driven (Tom's rule, 2026-06-15: no regex ever for language)

The existing `checkKnownSide` in `validation.cjs` is a regex gate (ASCII `tokenizeKnown`, English
`KNOWN_GRAMMAR`/`DO_AUX`, `negationMarkers` regexes) — it both breaks on non-Latin scripts AND is the
wrong pattern. **Do not extend it / do not write a Unicode-regex tokenizer.** Instead the known-side check
becomes an **agent** that, per seed (or batch), reads the prompt + the language brief (`eng_for_<iso>.contract.cjs`)
+ the introduced-vocab list and judges: is this prompt controlled, negation/NPI legal, machinery licensed,
gloss-rules honoured. The brief is the agent's reference; the judgment is the agent's. Building that
agent-driven gate is the next step (replaces the regex `checkKnownSide` for non-`eng`-known courses).

## What this pass did NOT cover

This was the **structural ZUT gate** (same prompt → one answer), which runs language-agnostically
because English is the shared *target*. Still outstanding for full release-gating:

- **Known-side controlled-language gate** — needs a per-*known*-language pair-contract (Hindi/Tamil/
  Korean free class, NPI, negation), since the existing contracts are English-*known*
  (`zho_for_eng`, `fra_for_eng`). Typological clusters share most of it: one Indo-Aryan contract ≈
  hin/urd/ben/guj/pan; one Dravidian ≈ tam. → `docs/pair-contracts/_TEMPLATE.contract.cjs`
- **Tiling + vocab gates** — not yet run over these drafts.

## Artifacts

- Per-course actionable fix lists: `docs/course-optimization/eng-for-x-fixes/<course>.json`
- Synthesis: `docs/course-optimization/eng-for-x-fixes/_synthesis.json`
- Tooling (read-only DB): `scripts/inventory-courses.cjs`, `scripts/zut-sweep-eng-for-x.cjs`,
  `scripts/gen-zut-flags.cjs`
