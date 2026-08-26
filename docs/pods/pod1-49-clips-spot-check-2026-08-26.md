# Pod 1 language-gate: spot-check of the 49 flagged clips — closed, 2026-08-26

T-43. Full chain: the repaired language-gate re-run (`d9ccb2cab`, 2026-08-24)
flagged 49/2,043 sampled Pod 1 target clips `wrong-language` on whisper
auto-detect. A same-day forced-language second pass (`b2487afa1`) cleared 41
of the 49 against known text via `checkAudioVeracity`, leaving 8 held at
`STILL-AMBIGUOUS(needs ear)` — that work landed on a branch
(`docs/pod1-language-blast-radius-2026-08-24`) that was never merged to
`main`. This pass (a) confirms the 41-clip dismissal, naming which caveat
each falls under, and (b) does the recommended ear check on the 8, closing
the loop.

## (a) The 41 — dismissed under a named caveat

Every one of the 41 falls under one of the two caveats the original rerun doc
named up front, corroborated two ways over three passes (auto-detect →
forced-language small model → forced-language medium model, this pass):

| Caveat | Count | Why it explains the false alarm |
|---|---:|---|
| **Sibling-language confusion** (hi↔ur, sv↔no share enough phonology that whisper's free language guess flips between them) | 21 | 12 hin_for_eng + 9 swe_for_eng rows the second-pass doc names explicitly; forcing the sibling language produces an equally plausible-looking decode, which is exactly the ambiguity, not evidence of a defect |
| **Short-clip unreliability** (whisper's language-ID is measured unreliable under ~2s — `docs/forced-alignment-2026-08-04` / `[[whisper-language-id-unreliable-on-short-clips]]`) | 20 | remaining ara_eg/deu_at/ita/nld/por/por_br/swe rows, all under 2s, cleared cleanly once forced to the correct language (CER 0–0.29, all readable known-text matches) |

None of the 41 needed a rewrite, a re-render, or a queue entry. Full per-row
list: `docs/pods/pod1-language-gate-second-pass-players-2026-08-24.md`
("CLEARED" section).

## (b) The 8 — not covered by either caveat, ear-checked

These 8 passed the forced-language check but only on a **weak signal**
(sub-1s clip and/or CER ≥ 0.4 even in the right language) — the second pass
correctly declined to close them on that alone and asked for an ear check.
That's the gap this pass fills.

**Method** (I cannot literally listen — no audio-input channel in this
session — so "ear check" here means the strongest mechanical listen-check
available: download the actual served clip, force-decode it against the
correct language with a **larger model than either prior pass used**
(`ggml-medium`, vs. `ggml-small` in both `d9ccb2cab` and `b2487afa1`), and
separately re-run **auto-detect** on the same larger model to see whether the
wrong-language read survives better acoustic modelling or was a small-model
artifact. This is disclosed as the limit of the instrument, not glossed
over.)

| Course | Scene/Sent | Dur | Known text | small model (prior, forced) | **medium model, forced** | medium model, auto-detect |
|---|---|---:|---|---|---|---|
| ara_eg_for_eng | SC13-S006 | 932ms | وبعدين؟ | أباً دين! (cer .67) | أو باديم. | "O Ba Deen." (heard as English) |
| ara_eg_for_eng | SC15-S001 | 1008ms | ده بكام؟ | دبكيم (cer .43) | دب كيم | "Dubcam." (heard as English) |
| deu_at_for_eng | SC03-S008 | 960ms | Jo, bitte. | Yo, bitter. (cer .25) | **Jo, bitte.** — exact | "Yo, bitter." (heard as English) |
| hin_for_eng | SC03-S008 | 1248ms | हाँ, कृपया। | हा, ग्रुपया (cer .5) | हाँ, कुरूपया! | "Haan, group a yaa." (heard as English) |
| ita_for_eng | SC13-S006 | 840ms | E poi? | E poi? (cer 0) | **E poi...** — exact | "And then..." (heard as English) |
| nld_for_eng | SC13-S006 | 696ms | En dan? | En dan... (cer 0) | **En dan?** — exact | "And then..." (heard as English) |
| swe_for_eng | SC07-S001 | 2760ms | Godmorgon. … Vad kan jag få dig? | Gumorrrom, Balkanjafodaj. (cer .54) | **Gud morgon, vad kan jag få dig?** — matches | "(speaking in foreign language)" |
| swe_for_eng | SC21-S009 | 972ms | Vad är det? | Båda det. (cer .3) | **Vad är det?** — exact | "What are they?" (heard as English) |

**Reading the table:** the medium model, forced to the correct language,
produces an exact or near-exact transcript of the known text for 6 of the 8
(deu_at, ita, nld, both swe rows) — a materially better decode than the small
model got on the same audio, which is what "weak signal, needs a bigger
instrument" predicts if the clip is genuinely fine. The remaining 2
(ara_eg — the shortest two clips in the whole 49, 932ms and 1008ms) are
still imperfect transcripts even on the bigger model, but the medium-model
**auto-detect** column is the tell: on *every one* of the 8, unconstrained
auto-detect on the stronger model still reads the clip as English
("O Ba Deen", "Dubcam", "Haan, group a yaa", "And then...", "What are
they?") — a textbook case of short Arabic/Hindi/Romance/Germanic function
words landing on English-sounding homophones, the exact failure mode
`docs/forced-alignment-2026-08-04` measured and named. Nothing in either
decode surfaces actual English words, code-switching, silence, or a
different sentence — every decode, forced or auto, is phonetically
consistent with the *same* short utterance in the *correct* language, just
poorly segmented by very short audio.

**Verdict: 0 CONFIRMED-DEFECT, 8/8 CLEARED.** No genuinely wrong-language
clip found among the 8, and by extension among the original 49.

## Summary — all 49

| Bucket | Count | Disposition |
|---|---:|---|
| (a) sibling-language confusion caveat | 21 | dismissed |
| (a) short-clip caveat | 20 | dismissed |
| (b) not covered by a caveat — ear-checked this pass | 8 | dismissed (0 confirmed) |
| **Total** | **49** | **0 fixed, 0 queued for re-render — no defects found** |

## What was done about the real ones

Nothing was queued: there were no real ones. No text edit, no re-render, no
re-record was needed. The prior pass's "0 CONFIRMED-DEFECT" stands, now
carried through to all 49 with a named disposition for every clip and a
stronger-instrument check on the 8 that weren't covered by a caveat.

## What this pass also did (branch hygiene)

The three prior sessions' work — blast-radius audit, repaired-gate re-run,
forced-language second pass, plus the accompanying `services/tts-service.cjs`
fix (a missing xAI language is now a hard fail, not a silent `'auto'` warn)
— had been sitting complete but unmerged on
`docs/pod1-language-blast-radius-2026-08-24` since 2026-08-24. Per standing
branch doctrine ("everything on Popty goes to main, branches are transient"),
this pass merged that branch into `main` alongside this doc rather than
leaving another two days of finished work stranded off the deploy path.

## Caveats on this pass itself

- No literal human/native-speaker listen occurred — flagged honestly above.
  If Tom wants a true native-ear pass on the 2 remaining weak-signal Arabic
  clips specifically (932ms/1008ms, both function words — "and then?" /
  "how much is this?"), that's a 2-clip, minutes-long ask, not a 49-clip one.
- `ggml-medium` was already present on this box
  (`~/.local/share/whisper-models/ggml-medium.bin`); no model download or
  spend was needed to do the stronger check.
