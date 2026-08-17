# Rescued reports — Saturday 2026-08-15

These are finished analysis reports written on the night of **2026-08-15** that were
never committed to any branch. They existed only as untracked files in one working
tree on watson-1, one `git clean` away from gone. This directory is a **verbatim copy**
— nothing was edited, reworded, trimmed or re-run. The original scratch files were
left in place (the rescue was additive; nothing was deleted or moved).

## The selection criterion (and why it is a criterion, not a list handed to me)

The brief for this rescue said a reconstruction of Saturday had identified **three**
finished-but-unsaved reports, the largest a Cornish analysis. **I could not find that
reconstruction document.** It is not in `ssi-dashboard-v7-clean` and not in
`ssi-learning-app`, on any branch (searched by filename, by date, and by content for
"Cornish", "Saturday", "reconstruct", "usage limit", and for references to the
`.a108-*` / `.a74-scratch` paths). So I could not confirm *which* three it meant.

Rather than guess three, I applied an explicit, checkable rule:

> Copy every **finished, standalone prose analysis report** with an mtime of
> 2026-08-15 whose content exists **nowhere in git**, on any branch.

"Nowhere in git" was established two ways: the file's blob hash is absent from the
object store, and no committed document covers the same subject (checked by path
across `git log --all` and by topic keyword across every branch).

That rule yields **21 reports here plus 5 already-`docs/`-shaped ones** committed in
place alongside (see below) — not three. Every one of them was one `git clean` from
permanent loss, so the wider net is deliberate. If Kai wants this trimmed to three,
the extra files are additive docs and can be dropped in a follow-up with nothing lost.

**What was deliberately NOT rescued:** probe scripts (`*.cjs`), JSON/TSV data dumps,
raw frequency lists, seed caches, split fragments of reports that also exist whole
(`report-head.md` / `report-part1.md` / `REPORT_TAIL.md` and friends), and raw
evidence tables with no prose (`.a108-zut/defects-table.md`, `.a108-kan/partA.md`,
`.a108-scn-zut/*_top200.md`). Those remain untracked scratch.

**One withdrawn document was deliberately not rescued:** `.a74-scratch/PLAN.md`
(3,909 words, a presentation-clip repair change set). Its own successor,
`FINAL.md` — rescued here as
`presentation-clip-repair-gated-plan-2026-08-15.md` — states that it *replaces* PLAN.md
and that the author withdrew it because its "262 ready for approval" figure was
derived mechanically and never gated on a human reading the row. Rescuing a document
its author retracted would be preserving a wrong number. It is still on disk at
`.a74-scratch/PLAN.md` if anyone wants it.

## What is here

### The Cornish night (`.a108-cor/`) — the report named in the brief

| File | Was | Headline |
|---|---|---|
| `cor-for-eng-decomposition-2026-08-15.md` | `.a108-cor/REPORT.md` | Seeds 1–25 of 668 decomposed and banked: 73 LEGOs, 642 practice phrases, zero TTS spend. 25/300 of the stated target — a good bank of content, not a finished course. Carries a self-correction: two of its own checks reported a *false clean* because the join key was empty, caught only because an independent verifier found six things where it had found zero. |
| `cor-for-eng-orthography-audit-worker670-2026-08-15.md` | `.a108-cor/report-670.md` | Cornish orthography audit over the full 668-seed corpus. |
| `cor-for-eng-zut-fork-scan-worker672-2026-08-15.md` | `.a108-cor/report-672.md` | ZUT fork scan, 668 seeds — string co-occurrence only, flagged explicitly as candidates for a human, not confirmed forks. |
| `cor-for-eng-verification-worker707-2026-08-15.md` | `.a108-cor/report-707.md` | The adversarial verification of seeds 1–25 that found the six findings above. |

The three worker reports are kept because the main report cites them by number
(#670, #672, #707) — it is not readable as evidence without them.

### Other minority-language analysis, same campaign

| File | Was | Headline |
|---|---|---|
| `bre-morphology-reference-2026-08-15.md` | `.a108-bre/bre-morphology-reference.md` | Breton (peurunvan/KLT) mutation + morphology reference for LEGO slicing. Leads with a tokenizer trap: `c'h` is **one letter**, so any regex that treats `'` as punctuation shears `c'hi` into `c` + `hi` and loses the consonant the mutation rules turn on. Honest about provenance — gathered second-hand via a summarising fetch tool, not primary sources. |
| `scn-for-eng-zut-risk-map-2026-08-15.md` | `.a108-scn-zut/report.md` | Sicilian corpus is unusually clean on verbs — but **5 of 668 seeds have the Sicilian word "yoruba"** in the target column, leftover Yoruba template text. |
| `scn-for-eng-orthography-audit-2026-08-15.md` | `.a108-scn-ortho/report.md` | Retroflex `ḍḍ` and the article system are clean 668/668; 32 seeds (4.8%) need normalising to majority spelling before decomposition or the learner gets the same word taught two ways. |
| `fur-for-eng-zut-fork-map-2026-08-15.md` | `.a108-fur/worker-zut-forks.md` | Friulian ZUT fork map, seeds 26–668, with per-claim MEASURED/INFERRED labels. |
| `fur-for-eng-orthography-audit-2026-08-15.md` | `.a108-fur/worker-orthography.md` | Friulian orthographic-consistency audit, 668 seeds. |
| `lmo-for-eng-blind-alignment-2026-08-15.md` | `.a108-lmo-align/report.md` | Independent blind word-level alignment of Lombard seeds 1–30, produced without reading the decomposer's own output. Apostrophes treated as letters throughout. |
| `kan-for-eng-script-forensics-2026-08-15.md` | `.a108-kan/kannada-forensics-report-2026-08-15.md` | All 668 Kannada seed strings are already precomposed NFC. Also records a moving baseline: a concurrent worker in the same shared directory inserted 22 LEGO rows *during* the investigation. |

### The estate-wide ZUT audit

| File | Was | Headline |
|---|---|---|
| `zut-estate-wide-audit-full-2026-08-15.md` | `.a108-zut/REPORT.md` | **145 courses live, 101 with content**, swept for untaught words. 13,722 words. A committed summary of this work exists at `docs/course-optimization/zut-audit-2026-08-15/report.md`, but that is **866 words** — the detailed audit was never saved. |

### Presentation-clip divergence campaign (`.a74-scratch/`)

| File | Was | Headline |
|---|---|---|
| `presentation-clip-divergence-estate-sweep-2026-08-15.md` | `.a74-scratch/REPORT.md` | Estate-wide: after three weeks of heavy text fixing, does the clip that introduces each LEGO still say what the LEGO now reads? Built from the live DB. |
| `presentation-clip-repair-gated-plan-2026-08-15.md` | `.a74-scratch/FINAL.md` | The gated repair plan, nothing applied. Explicitly replaces and withdraws the earlier mechanically-derived plan. |
| `presentation-clip-zho-family-verification-2026-08-15.md` | `.a74-scratch/zho-family-report.md` | 363 rows across seven Chinese-family courses verified. |
| `presentation-clip-fra-ca-verification-2026-08-15.md` | `.a74-scratch/fra-ca-report.md` | 386 fra_ca rows scored; honest that not every row got a hand-read verdict. |
| `presentation-clip-fra-ca-chunk1-2026-08-15.md` | `.a74-scratch/fraca-chunk1-job/report.md` | 77 rows read individually. Finds a **new false-positive class**: this course builds "as in" examples from a combined full-seed practice phrase, so a headword that isn't the literal `known_text` is usually FP-PARAPHRASE, not a misroute. Two genuine reciprocal sibling swaps (S0204L01 ↔ S0204L03). |
| `presentation-clip-fra-ca-chunk2-verdicts-2026-08-15.md` | `.a74-scratch/fraca-chunk-2-verdicts.md` | 77 rows. **Only 2 of 31 misroute targets are actually free** — the rest are duplicates whose true owner already has a clip, so this is not a simple repoint. |
| `presentation-clip-fra-ca-chunk4-2026-08-15.md` | `.a74-scratch/fraca-chunk-4-report.md` | 77 rows, every one read; `word_boundaries` NULL throughout so verdicts are text-only. |

Chunk 3 of that same fra_ca set was already written into `docs/` and is committed in
place — see below.

### Feasibility scouts

| File | Was | Headline |
|---|---|---|
| `minority-course-feasibility-scout-2026-08-15.md` | `.a74-scratch/scout/report.md` | Welsh-known, Neapolitan and Yiddish feasibility, live DB + code. |
| `yor-trio-feasibility-scout-2026-08-15.md` | `.a74-scratch/yor/report.md` | All three Yoruba courses are blocked by the same thing and it is **not content** — the estate has no Yoruba voice and its own reference table says none of the three TTS providers offers one. Yoruba is one of exactly three "Tier 0 — no TTS exists" languages; the other two, Breton and Scottish Gaelic, both have courses and **both have zero target-language clips**. They stalled exactly where Yoruba would. |

## Committed in place, not copied here

Five reports from the same night were already written to their proper `docs/` paths
and simply never `git add`ed. They are committed at those paths in the same commit
as this directory:

- `docs/a108/welsh-known-side-tts-scout-2026-08-15.md` — **no written policy blocks TTS for a Welsh-KNOWN course**, and Azure has an unused Welsh voice pair. The hard block in `services/shared/human-voice-courses.cjs` only matches codes *starting* `cym_`, so `spa_for_cym` would sail through the TTS chokepoint. Nine such drafts exist; none has audio yet, so the guard can still be extended before any TTS is minted.
- `docs/a108/spanish-for-welsh-reuse-scout-2026-08-15.md` — the "Spanish-for-Welsh is cheap" claim is **partly confirmed, mostly demolished**: the Spanish audio really is reusable (36,618 clean Spanish-only clips), but ~17,800 lego/phrase rows need re-derivation rather than translation, and ~1,190 clips have English narration baked into the same file and cannot be split. Closer to "the hardest 45% of the audio survives" than "only the known side is a rebuild."
- `docs/a108/lmo-orthography-census-2026-08-15.md` — Lombard 668-seed census; Western markers dominate (`minga` 158, `on`/`ona` 120).
- `docs/a108/zut-euro-residue-tail-audit-2026-08-15.md` — 68 residue rows across 20 courses, all 68 checked individually, no sampling.
- `docs/audio-forensics-2026-08-15/fraca-presentation-misroute-chunk3-2026-08-15.md` — chunk 3 of the fra_ca audit; flags that narration and spoken-target are separate tracks, so a "REAL" verdict is about narration wording only.

## Provenance and integrity

Nothing here was truncated or corrupt. Every file parses as complete markdown with a
closing section; several end in their author's own "Landing line: no commits" — which
is precisely how this work came to be at risk.
