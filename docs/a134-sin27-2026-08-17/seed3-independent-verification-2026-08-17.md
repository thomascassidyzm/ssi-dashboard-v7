# eng_for_sin seed 181/207/261 — independent adversarial verification

Post-hoc second-pass verification of three `course_seeds` edits already live in production (applied ~2026-08-17 10:57Z). This pass is genuinely independent — new session, own git worktree (`docs/sin-seed3-verify-2026-08-17` off `fix/sin-27-seed-rebuild-2026-08-17`), own Node/`pg` connection to the live DB, no counts or quotes accepted from the source documents without reproduction. Default posture was refute-until-proven. Read-only throughout; no data changed.

## Verdicts

| Seed | Verdict | Confidence |
|---|---|---|
| 181 | **CONFIRMED**, with one disclosed gap (audio timing evidence weaker than 207/261) | High on text/vocab/ZUT; medium on audio-timing independence |
| 207 | **CONFIRMED** | High |
| 261 | **CONFIRMED** | High |

No refutation found on any of the five hard gates (counts, verbatim, introduced-before-used, ZUT, meaning). One soft finding on audio-provenance format for seed 181 (below) — not a refutation, but the weakest link in this pass and worth a human decision on whether it needs closing before this counts as fully closed out.

---

## 1. Counts (seed 181 claims)

Reproduced directly against live `course_seeds` / `course_legos` / `course_practice_phrases` for `eng_for_sin`:

| Claim | Claimed | Reproduced |
|---|---|---|
| ලෙකරට in legos | 0 | **0** ✓ |
| ලෙකරට in phrases | 0 | **0** ✓ |
| අරගෙන in legos | 0 | **0** ✓ |
| අරගෙන in phrases | 0 | **0** ✓ |
| දොස්තර in phrases | 13 | **13** ✓ |
| එක්කගෙන in phrases | 9 | **9** ✓ |
| total phrases in course | ~11,719 | **11,719** ✓ |

Note: the "1 seed" leg of the ලෙකරට/අරගෙන claim is now unfalsifiable live — those words lived only in seed 181's own *pre-edit* text, which has since been overwritten, so a live query correctly returns 0 everywhere post-edit. Not a discrepancy, just moot.

## 2. Verbatim claims

Pulled every `course_practice_phrases` row for seeds 181/207/261 and diffed character-for-character:

- **Seed 207**: new known_text `ඔයාට කරන්න ඕනේ වුණ දේ ඔයා කරලා තියෙනවා` is an **exact match**, Sinhala and English both, to the seed's own `lego_index=2`, `phrase_role='use'` row (target_text `"you've done what you needed to do"`, differing from the new seed's `"You've done what you needed to do."` only by leading capitalization and terminal period). Confirmed.
- **Seed 261**: new known_text `මම හිතනවා ඒක වැදගත් දෙයක් වෙන්න පුළුවන් කියලා` is an **exact match** to `lego_index=1`, `phrase_role='use'` (target_text `"I think it might be something important"`, differing from the seed's `"I think it might be something important."` only by terminal period). Confirmed.
- **Seed 181**: new known_text `ඒත් මට මගේ අම්මව දොස්තර ළඟට එක්කගෙන යන්න වෙනවා` = literally `ඒත් ` + the seed's `lego_index=2`, `phrase_role='use'` row `මට මගේ අම්මව දොස්තර ළඟට එක්කගෙන යන්න වෙනවා` (target_text `"I have to take my mother to the doctor"`), with `ඒත්`/"But " prepended on both sides and a period added. This matches the brief's own framing that the ඒත් prefix is the one addition to an otherwise verbatim splice. Confirmed.

The prior worker's self-correction (English differs by case/period, not word-for-word) is itself confirmed: in all three cases the Sinhala is exact, the English differs only by capitalization/terminal-period (plus, for 181, the added "But " that mirrors the added ඒත්).

## 3. Introduced-before-used (the decisive check)

**Method, disclosed as required:** wrote a custom Unicode-aware tokenizer (`SIN_RUN = /[඀-෿‍]+/g`, Sinhala block U+0D80–U+0DFF plus ZWJ U+200D, which is kept *inside* tokens — never treated as a separator — since Sinhala conjuncts depend on it). Sinhala in this corpus is space-delimited between words, so splitting on runs of the Sinhala block against whitespace/punctuation is a valid word tokenizer here; this is **not** a syllable- or grapheme-level segmenter. Comparison is **exact surface-form string equality — no stemming, no lemmatization**. Pulled all 5,201 `course_legos` rows and all 11,719 `course_practice_phrases` rows for `eng_for_sin`, built a word→earliest-seed_number map for each table, then looked up every token of each new known_text.

**Which way this errs:** exact-surface matching cannot invent false breaches out of stemming ambiguity (it never merges e.g. වෙනවා/වෙන්න/වෙන්නට as "the same" word), but by the same token it also cannot excuse a breach by crediting a related inflection as prior exposure — if the exact form used in the new sentence was genuinely new, this method reports it as new. That makes it the *stricter* of the two possible errors (over-flag, not under-flag) for the introduced-before-used direction, which is the right side to err on for a controlled-known-language gate.

Spot-checked two results directly against SQL regex-word-boundary queries (`වෙනවා`→47, `දේ`→113) — both matched the tokenizer exactly, cross-validating the method.

**Result — zero breaches in all three seeds.** Every token's earliest LEGO-card seed and earliest practice-phrase seed is ≤ the seed it's now used in (own-seed introductions, e.g. දොස්තර/ළඟට/එක්කගෙන/අම්මව all first appear exactly at 181, are expected and correct — that's this seed's own new vocabulary). Full per-word breakdown:

- **181**: ඒත්(19/19) මට(1/1) මගේ(51/51) අම්මව(181/181) දොස්තර(181/181) ළඟට(181/181) එක්කගෙන(181/181) යන්න(25/25) වෙනවා(80/47) — all clean.
- **207**: ඔයාට(20/20) කරන්න(1/1) ඕනේ(1/1) වුණ(207/138) දේ(113/57) ඔයා(1/1) කරලා(152/152) තියෙනවා(73/73) — all clean.
- **261**: මම(2/1) හිතනවා(47/47) ඒක(47/47) වැදගත්(65/65) දෙයක්(35/35) වෙන්න(5/5) පුළුවන්(7/7) කියලා(8/8) — all clean.

(format: lego_first_seed/phrase_first_seed)

## 4. ZUT collision check

Queried all three tables in `eng_for_sin` for exact matches of the three new known_text strings. Only each seed's own row and its source practice phrase appear — no other seed or card carries this exact known_text with different English. **No hard collision.**

## 5. Meaning

- **Seed 261**, ඕනේ vs පුළුවන්: `වෙන්න පුළුවන්` is the standard construction for "might be" (possibility — literally "can become"); `වෙන්නට ඕනේ` reads as obligation ("should be"/"needs to be"), which does not match target_text "might be something important". The swap to පුළුවන් is linguistically correct. ඒක (pronoun "it") vs ඒ (bare determiner) — ඒක matches the subject-pronoun role needed and matches the sourced phrase's own component card `ඒක = "it"`. Confirmed, not merely plausible.
- **Seed 181**, ඒත් dominance and lateness of හැබැයි: reproduced independently — ඒත් debuts as a LEGO at seed **19** (claimed 19, exact), with **69** phrase drills (claimed 69, exact). හැබැයි debuts as a LEGO at seed **469** (claimed 469, exact — 288 seeds after 181, exact), though it does surface once in a practice phrase earlier, at seed 246 — still 65 seeds after 181, so the "too late for 181" conclusion holds under either measure. Total ratio across seeds+legos+phrases: ඒත් **84** vs හැබැයි **34** — claimed "81:34". My habei count matches exactly (34); my ath count is 3 higher than claimed (84 vs 81). Direction and magnitude of the dominance claim both hold regardless of that ±3, so I record this as a discrepancy, not a refutation.

## 6. Audio

| Seed | known_audio_id | text match | created_at | reused? | word_boundaries |
|---|---|---|---|---|---|
| 181 | b278ab82… | exact | 2026-08-17T10:57:41Z (fresh, matches apply timestamp) | no — freshly rendered | **text-only, no offset/duration** |
| 207 | 8e34c01d… | exact | 2026-06-15T12:53:30Z (pre-dates this edit) | **yes**, reused | full offset+duration |
| 261 | 9c5ec694… | exact | 2026-06-15T12:58:44Z (pre-dates this edit) | **yes**, reused | full offset+duration |

Cross-checked against `seed3-apply-log.json` in the source worktree: it explicitly records `"reused": false` for 181 and `"reused": true` for 207/261, matching what the timestamps independently show. The old clips (181: `caf1d997…`, 207: `aeda6600…`, 261: `63f515dc…`) are still present in `course_audio`, not deleted — consistent with make-before-break (old asset untouched; seeds just relinked/replaced).

**207 and 261**: word_boundaries carry full per-token offset+duration. Token count matches word count exactly (8 tokens = 8 words each), in the correct order, text identical to known_text. No filler tokens, no repeated placeholder pattern, specifically **no "ඒ ගෙ"** anywhere in either array. This is real, timing-bearing ASR/TTS boundary data — strong, independent evidence of what was actually spoken. Confirmed clean.

**181**: word_boundaries has 9 entries (`ඒත්, මට, මගේ, අම්මව, දොස්තර, ළඟට, එක්කගෙන, යන්න, වෙනවා`) matching known_text exactly, token-for-token, no filler, no "ඒ ගෙ" pattern. **However**, unlike 207/261, this array carries `{"text": ...}` only — no `offset`/`duration` fields. Cross-referenced against `seed3-render-log.json` in the source worktree: the render tool that generated this clip only ever captured `word_boundary_tokens` (a bare text list), separately from `gate3_headword_voiced`/`gate7_full_text_voiced` boolean self-checks — it never captured Azure's per-token timing. So for seed 181 I can confirm the **token list matches with no filler**, but I cannot independently confirm from timing data (silence gaps, per-token duration) that this is real continuous speech rather than, hypothetically, a malformed render — I only have the pipeline's own self-reported pass/fail gates, which are not independent of the worker that applied the change. **This is an explicit gap**, not a refutation: I have no positive evidence of a defect (no placeholder pattern, exact text match, `expected_ms 3495` vs `ffprobe_ms 3636` are close), but the audio-timing check specified in the brief could not be run at full strength for this one seed the way it could for the other two.

I did not fetch/decode raw audio bytes from S3 for any of the three (out of scope for this pass — file_size_bytes/duration_ms are non-null and non-zero for all three, which is the extent of the reachability check I ran).

## Where I could not reach full independence

- Seed 181's audio-timing verification relies partly on the same pipeline's self-reported gates (see §6) rather than independently-derived timing data, because the render tool didn't capture per-token offsets. Token-list match is independent; timing confirmation is not.
- I did not decode/listen to any of the three audio files directly.
- ඒත් total-occurrence count differs from the claimed figure by 3 (84 vs 81) — reported, not resolved to a root cause (most likely explanation: my count includes the seed 181 row itself post-edit, or a different table scope than the original claim used).

---

**Landing line**: no commits. This was a read-only verification pass; the only artifact is this document, published for review — nothing was staged or pushed to any branch.
