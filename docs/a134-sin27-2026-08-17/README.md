# A-134 — the 27 corrupt eng_for_sin presentation clips, re-recorded

**Listen page v2 (current, for Kai, by ear, on a phone):** https://watson-1.tail4968cb.ts.net/d/75ab15fd
**Listen page v1 (superseded — said 27 example sentences needed authoring; they did not):** https://watson-1.tail4968cb.ts.net/d/81770eaa

> **SUPERSEDED IN PART.** The gap this document states — "27 Sinhala example sentences want authoring by a speaker" — is not real. The example slot is selected by the course's own composer from existing seed/USE content, not authored. 12 of the 27 get a real example restored; 15 are correct exactly as recorded below. See `composer-finding.md`, `gate-report.md` and `seed-coherence-analysis.md`.

Kai approved the spend on 2026-08-17. Actual spend: **$0.014** across 81 Azure renders
(27 shipping takes + 54 spares). Nothing is live; the swap waits on his word.

## Calibration first — the count was not taken on trust

Rebuilding detection from scratch, independent of the 2026-08-15 identification:

| | |
|---|---|
| corrupt presentation clips in `eng_for_sin` | **33** |
| of those, linked to a LEGO (learner-reachable) | **27** ← the approved set |
| unlinked, same defect, not played | **6** (S0181L03, S0181L04, S0197L03, S0198L03, S0202L03, S0204L02) |
| clips re-recorded | 27 |

So the "27" is correct as a count of live damage, and it was arrived at independently.
The 6 unlinked ones are housekeeping, not a live defect — a learner resolves audio by
`course_audio.id`, so nothing plays them. Left alone, per scope.

## What the defect actually is

The stored text is corrupt and the voice read it faithfully. Every one of the 33 carries
a run of the filler `ඒ ගෙ` repeated 3–9 times in its example-sentence slot:

```
ඉංග්‍රීසිෙන්. 'ප්‍රශ්නෙ'. 'ප්‍රශ්නෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :
```

**This is why a re-record could not simply repeat the old text** — the same text
produces the same gibberish, byte for byte. The upstream generator degenerated: seeds
and LEGO cards are clean, so the corruption was introduced when the example sentence
was composed, not authored into the content.

Three independent confirmations that the filler is *spoken*:

1. **`word_boundaries`** — the provider's own per-token log shows `ඒ` and `ගෙ` voiced as
   separate tokens with real durations: 715–2,243ms of filler speech per clip. 32 of 33
   show ≥3 filler pairs; S0184L02 shows 2 plus a doubled word.
2. **Duration** — all 33 are 3.4–13.6 sd too long for the filler-free text, and within a
   few tenths of the filler-bearing text, against a model fitted on 2,199 clean clips of
   this course and voice (`ms ≈ 3143 + 45.4 × chars`, residual sd 221ms).
3. **All 33 decode cleanly**, file duration matching the DB within 36ms. No broken files.

## Second defect found, not looked for

On **24 of the 27** the old clip's headword did not match the LEGO card either — the
learner read one thing and heard a different word (S0197L02: card teaches *works as a
teacher*, clip says **පුතා**, "son"). S0198L02's headword slot *is* the gibberish. The new
clips take the headword from the card, so card and audio now agree.

## The text decision — and the gap it leaves

Rendered as `ඉංග්‍රීසිෙන්. '<headword>'. '' ඉතින්. :` — headword restored from the card,
**example slot empty**. That is the form **665 of this course's 2,237** presentation clips
already ship in, including S0201L02 and S0203L02, direct siblings of two of the 27.

**EXPLICIT GAP: 27 Sinhala example sentences are not written and need a Sinhala speaker.**
The known side is a controlled language; inventing them would guess at both the language
and the vocabulary licensed by that seed. This is a real loss of content, stated rather
than papered over, and it is Kai's call whether to ship the shorter form or wait.

## Verification — six gates, all 27 passing on the first take

1. decodes with no ffmpeg error
2. duration within 3 sd of the fitted model (all 27 within **1.4 sd**)
3. **headword voiced** — every headword word present in the provider's token array.
   Duration cannot do this job: for the 4-char headword මහලු the duration test is blind
   (z = 0.0). This gate is why the first batch was re-rendered rather than shipped.
4. no truncation — final word `ඉතින්` present in the same token array
5. **no filler regression** — zero `ඒ ගෙ` pairs voiced (the defect gets a permanent gate)
6. no end click — tail floor −87.6 to −88.4 dB rel. peak, against a −40 dB threshold

Mastered on the compressor-free chain: `667a6e09` cherry-picked onto this branch, because
`fix/a131-clean-render-chain-2026-08-17` is **not merged to main** and `origin/main` still
carries the old `normalizeAudio` compressor.

## Files

| file | what it is |
|---|---|
| `listen-page.md` | the published ear-check page, one row per clip, old vs new |
| `clip-ledger.json` | the 27 rows: old clip id, new S3 key, both texts, measurements |
| `ship-log.json` | per-clip gate results and the captured `word_boundaries` |
| `old-clip-measurements.json` | decode/duration/burst measurements of all 33 old clips |
| `relink.cjs` | the swap, make-before-break, dry-run by default — **not run** |
| `relink-dryrun-log.json` | dry run output: 27/27 planned, all S3 objects and links verified |

New audio is staged at `s3://ssi-audio-stage/repair-candidates/a134-sin27-2026-08-17/`.
Additive only — no existing object overwritten, none deleted, no live row repointed.
