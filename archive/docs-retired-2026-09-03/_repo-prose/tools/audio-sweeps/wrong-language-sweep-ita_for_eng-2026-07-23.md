# Wrong-language audio sweep — ita_for_eng pod clips (2026-07-23)

Companion to `tools/rescue-wrong-language-clips.cjs` (why + method in its header).
Trigger: Tom heard "Come stai?" play English 'come' — the June sentence slices
were cut from pre-phonology-gate 2026-06-10 xAI turn takes.

## Method

1. **Sweep**: all 377 ita_for_eng pod-0 clip ids (target_audio_id + sentence_audio_ids
   from `listening_pod_sentences`) run through whisper-cli (ggml-small) auto
   language-detect. Raw results: `*-results.json`.
2. **Verify flags**: whisper misdetects short clips constantly, so every non-`it`
   flag was re-decoded FORCED `-l it` and `-l en` against the expected text
   (`*-verify.json`); the four still-ambiguous sub-second clips were additionally
   looped 4x (concat) for a stronger detect signal, and cross-checked against
   sibling slices cut from the SAME turn take (a take cannot switch phonology
   mid-sentence).

## Tally

| stage | count |
|---|---|
| clips swept | 377 (377/377 decoded, 0 errors) |
| flagged non-Italian by auto-detect | 37 |
| already fixed before this pass (the come-stai pair: old ids 5a9b2052/3cbde8d2, replaced by take eadddadf/slice 333929bc, relinked) | 2 |
| verified false positives | 35 |
| **confirmed wrong-language** | **0 new** (1 total incl. come stai) |
| regenerated this pass | 0 — rescue tool not run, nothing to feed it |

New come-stai slice 333929bc verified independently: forced decode "Come stai",
auto-detect `it` p=0.80 on 4x loop.

## False-positive shapes (for the next sweep's triage)

- Transcript IS the correct Italian, lang tag wrong anyway (Grazie→pl 0.96,
  Buonasera→es 0.90, Sono infermiera→pl): the dominant shape.
- Numbers come back as digits ("Trenta"→"30") and get tagged by the digit, not
  the audio.
- Cross-script transliterations of correct audio (Rosa→Роза, Buongiorno→Devanagari,
  E lei?→اللي — phonetically /e lɛi/, i.e. correct Italian, not English "ee lay").
- English loanwords in the Italian text fool the detector ("Avete il contactless?").
- Words phonetically identical in en/it (Blu/blue, Sei/say, L'una/Luna, Scusi):
  undecidable by ear and therefore harmless even if wrong.
- Sibling-take check is the strongest discriminator for sub-second clips: if the
  same take's other slices verify Italian, the short slice is Italian.

## Scope beyond ita (REPORTED ONLY — no action without approval)

~65 courses hold pod clips minted before the 2026-07-10 phonology gate — roughly
20k clips total (per-course counts in the session log; almost every course is
90-100% pre-gate). The ita base rate — 1 real defect in 377, and that one an
English homograph ("come") — suggests real defects cluster on target words that
are ALSO English words; a cheap cross-course pre-filter would be "flag only clips
whose target text contains an English-dictionary word" before paying for whisper.
