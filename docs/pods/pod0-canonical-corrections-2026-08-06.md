# Pod 0 canonical — corrections to Aran's source (2026-08-06)

Aran's own file (`pod0-aran-original-2026-08-06.txt`, 22 scenes, 231 sentences) is the source
of truth. It is archived byte-identical to what he sent, UTF-8 BOM and CRLF line endings and
all. This file lists **every** change made downstream of it in `pod0-english-canonical.md`.
Nothing else was touched — no wording, no register, no British-English spellings, no lines
dropped or merged from the old text.

Verified independently: all 231 lines are character-identical to the source once these
three fixes are applied.

## Provenance — two copies, proven to agree

The canonical was first built from a copy recovered out of Tom's conversation transcript
(`pod0-aran-raw-2026-08-06.txt`) before Aran's original file was on disk. Both are kept.
They were diffed: **identical on every non-blank line**, trailing spaces included. The
original differs only in file format — a UTF-8 BOM, CRLF line endings, and more blank lines
between scenes. Rebuilding the canonical from the original reproduced all 231 lines
byte-for-byte, and produced exactly the same three corrections below. The transcript
recovery was faithful; the original is now what the build reads.

The BOM and the CRs are file format, not content, so they are stripped on read and are not
counted as corrections. The archive keeps them.

## 1. Scene 3 numbering — one line renumbered

Aran's Scene 3 runs 1-9 and then numbers its last line `6.` a second time:

```
9. Here's your coffee.
6. Thank you very much. Goodbye.   <- should be 10.
```

Renumbered to `10.`. **The text is untouched.** This is the only numbering anomaly in the
whole file — every other scene numbers 1..N contiguously, asserted by the build script.

## 2. Curly apostrophes normalised to straight ASCII

The source mixes both, sometimes in adjacent lines: **112 straight (`'`) against 12 curly (’)**,
across 8 lines. All normalised to straight, on the majority-wins argument and to avoid
encoding surprises downstream in TTS and the player. No curly double quotes exist in the source.

**This is a default taken, not a ruling — one word from Tom or Aran reverses it.**

| Scene | Line as stored |
|---|---|
| 2 | It's not very far. Maybe three or four miles. |
| 3 | No, we've only got drinks. |
| 3 | Here's your coffee. |
| 16 | A million. 80. 90. 2 o'clock. 10 o'clock. |
| 17 | 3 o'clock. 9 o'clock. January. February. |
| 18 | 4 o'clock. 8 o'clock. March. April. |
| 19 | 5 o'clock. 7 o'clock. May. June. |
| 20 | 6 o'clock. July. August. September. |

## 3. Trailing whitespace stripped (14 lines)

Stripped in the canonical output only. The raw archive keeps it. Invisible in the text,
but it would otherwise reach the DB and the TTS input.

| Scene | Line |
|---|---|
| 2 | It’s not very far. Maybe three or four miles. |
| 3 | Do you have any food? |
| 16 | No, we only take cash. |
| 17 | We'll pay by card again, please. |
| 18 | I'm sorry, my son lost his ticket. |
| 19 | That makes me feel a little worried. |
| 19 | Is it okay if I sit here? |
| 19 | I don't want to be late. |
| 19 | I promise we won't be late. |
| 20 | Thank you for helping me. |
| 20 | Thank you for being so friendly. |
| 21 | It sounds as though you want us not to do that. |
| 21 | What is that? |
| 21 | October. November. December. |

## Deliberately NOT changed

- **Drill tails** — `13. 1. 2. 3. White. Black.`, `7 o'clock. May. June.` and the rest are
  intentional content (the numbers/colours/times/months drip), kept whole and in place.
- **`[target language]` placeholders** — 6 occurrences, preserved exactly, square brackets and all.
- **British English** — crisps, takeaway, pint of bitter, Chemist's, eight pound forty. House style.
- **Hyphens where the old rows had em dashes** — Aran writes `Excuse me - do you have anything
  gluten-free?` (scene 9.5) and `I'm not feeling great - could you recommend something?` (scene 12.1);
  the previous DB rows had `—`. Aran's punctuation kept. Question for Tom if he wants the em dash back.
- **`practice` as a verb** (scene 10.9, `I need to practice more`) — British English prefers
  `practise`, and Aran himself writes `practise` in scenes 22.1/22.3/22.7. Left alone: it is a
  spelling judgment inside his prose, not a mechanical typo. **Question for Tom/Aran.**
- **`sit-in`** (scene 7.5, 7.14) — hyphenated as a noun. Aran's form, and it was already in the
  previous canonical rows unchanged. Left alone.
