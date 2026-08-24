# The veracity gate's numeral hole, closed — and the 35 clips it was holding

2026-08-13. Follow-on from the pod-0 English distinct-text render
(`docs/audio/english-distinct-text-render-applied-2026-08-13.md` §5), on Tom's approval.

**Headline: 35 of 35 were healthy audio wrongly flagged. Zero of them were defective.** The gate
fix cleared the bytes that were already sitting in quarantine, and two different speech models
agree those bytes say exactly what the script asks for. The 35 clips were then rendered through
the normal publish path — not because the audio was wrong, but because quarantined audio never
reaches S3 or `course_audio`, and the 104 slots behind it needed a published clip to point at.
Every one of the 35 fresh renders passed the gate on its **first attempt**, which is the same
finding stated a second way.

---

## 1. What was wrong with the checker

Whisper writes what English orthography prefers, and English prefers digits. A script reading
*"That's forty-eight pounds altogether"* comes back **"That's £48 altogether"**. Nothing is
missing — the transcript is fifteen characters shorter purely because a number was *spelt*
differently. But CER is a character ratio, so that lands at 0.50 against a 0.3 threshold, and
Rule 2 convicts every price, room number and time in the estate.

This is the same shape of mistake as `d951ddae` earlier the same night: *the check asked how a
number is WRITTEN when the question is which number was SAID.*

## 2. The fix — canonicalisation, not exemption

`services/audio-veracity.cjs`, commit `e12383d8`.

Both strings are re-read into the same currency — **words** — before anything is measured, and
the comparison then runs unchanged at the same operating point. No calibrated constant was
re-tuned.

- **Readings are plural.** "709" is *"seven hundred and nine"* in one clip and *"seven zero nine"*
  in the next; "£12.50" is *"twelve pounds fifty"*. Each numeral offers its plausible readings and
  the best-fitting combination scores. The untouched text is always among the candidates, which is
  what makes this a **no-op for any clip with no digits on either side**.
- **Currency symbols are spoken words** and are read as such. Without that, *"a hundred and fifty
  pounds"* heard as "£150" has lost its final word to Rule 3.
- **A new Rule 4 keeps the sensitivity** canonicalisation would otherwise have cost. Once "£150"
  reads as "one hundred and fifty", it is three characters from "two hundred and fifty" — far
  under the six-edit floor, invisible to Rule 2. So numerals are checked as their own event, the
  way the last word is: the digits must agree end to end, notation and grouping ignored, **or**
  every number the script says must still appear spelt out inside the decode's own reading. That
  second path is what forgives whisper swallowing a neighbouring word into the numeral
  (*"nine thousand won"* → "9001").
- **Rule 4 abstains when the decode carries no number at all.** A dropped number leaves the
  script's numeral words wholly unaccounted for and Rule 2 already convicts on it —
  *"that's 250 pesos"* heard as *"that's pesos"* is 22 edits — while convicting here too would
  invent a false-alarm class on *"one moment"* heard as *"a moment"*.
- **Deliberately given up, and it is Rule 2's business:** path 2 tolerates *extra* numeric
  material, so *"room seven"* heard as "room 79" passes this rule.

### Evidence the fix does not blind the gate

26 new tests (79 in the file, all green). Five genuine numeral defects must still fail, and do:

| defect | script | decode | verdict |
|---|---|---|---|
| substituted number | two hundred and fifty pesos | "150 pesos" | `numeral_mismatch` |
| wrong number, spelt out | eight pound forty | "eight pound fourteen" | `numeral_mismatch` |
| dropped digit | room seven hundred and nine | "room 79" | `numeral_mismatch` |
| wrong pence | twelve pound fifty | "£12.15" | `numeral_mismatch` |
| order of magnitude | fifteen thousand won | "50,000 won" | `numeral_mismatch` |
| number gone entirely | two hundred and fifty pesos | "that's pesos" | `cer_above_threshold` |

### Evidence of no collateral damage

`tools/reverify-veracity-cache.cjs` re-judged the whole verdict cache through the new scorer:
**5,341 remembered decodes, 345 failures before, 345 after, 0 verdicts changed.** That corpus is
French course content and carries almost no numerals, so it is evidence of no collateral damage —
not evidence the fix works. The 35 clips are that evidence.

---

## 3. The 35 clips, re-verified against their actual audio

Not a replay of stored transcripts: each quarantined `.mp3` was decoded again from disk and put
through the fixed gate.

**35 of 35 pass. Highest CER in the set: 0.23. Zero unchecked.** Every fresh decode was identical
to the one recorded at quarantine time, so the perception never changed — only the judgment.

### Spot-check with a second, independent model

Seven clips, including the one Tom was told to want an ear on, decoded again with **ggml-medium**
instead of the ggml-small the gate uses. A different model is the closest thing to an ear
available here, and on the decisive case it transcribes the script word for word:

| script | ggml-small (the gate) | ggml-medium (independent) |
|---|---|---|
| Here we are. That's a hundred and fifty pounds. | "Here we are. That's £150." | **"Here we are, that's a hundred and fifty pounds."** |
| That's forty-eight pounds altogether. | "That's £48 altogether." | "That's 48 pounds altogether." |
| Lovely. The room is on the third floor, room seven zero nine. | "…Room 709." | "…room 709." |
| Here we are. That's twelve thousand and five hundred króna. | "That's 12,500 kroner." | "That's 12,500 Kroner." |
| That's nine thousand won altogether. | "That's 9001, altogether." | "That's 9,001 altogether." |
| Here we are. That's twelve pound fifty. | "That's £12.50." | "That's £12.50." |
| Here we are. That's twelve złoty fifty groszy. | "that's 12's Wattie 50 Grushy" | "that's 12-Swati 50-Grushy" |

The medium model writing "a hundred and fifty pounds" out in full is the direct proof: the clip
speaks English words, and the digits in the other transcripts are whisper's spelling, not the
renderer's output.

**The Polish line still deserves an ear.** Two models independently mangle *złoty/groszy* into
"Wattie"/"Swati" and "Grushy" — both get the numbers right and both fail on the Polish words. That
is consistent with an English voice reading Polish currency names, and no text-only method can
separate "read them with an English accent" from "read them wrong". It is a
listen-if-you-care item, not a defect finding.

---

## 4. The render, and why it still happened

Quarantined audio is never uploaded and never inserted — that is the point of the gate. So while
the bytes on disk were healthy, there was no published clip for the 104 slots to point at. The
35 units were re-rendered through the estate's own path (`render.cjs` → gate → S3 →
`course_audio`), which is cheaper and safer than writing a bespoke publish-the-quarantine path to
save two pence.

Make-before-break, in order (CLAUDE.md §approval gates): render → verify → relink. **Nothing was
deleted and nothing was overwritten**; the previously-linked clips are still exactly where they
were, and only the slot pointers moved.

| step | result |
|---|---|
| render, 3-clip shakedown then 32 | **35 rendered, 0 failed, 0 quarantined, 0 re-rendered** — every clip passed the gate on attempt 1 |
| verify (alive · voice_id · decodable · rate) | **655 of 655** clips in the pack verified; 655 alive, 655 right voice, 655 decodable |
| relink, dry run then `--apply` | **104 slots relinked, drift 0**, across 53 courses |

Voice check is `voice_id`, never pitch: the 35 new rows are 19 × `xai_gfzdpspr5fdp` (clone) and
16 × `xai_bedd6226` (Olivia) — both approved — and all 35 carry `veracity_pass = true` in the row
itself.

Independent DB reconciliation after the apply: **104 pod slots now point at the 35 new clips**,
and `relink-gaps.json` went from **142 gaps to 0**. Gap #1 of the render report is closed.

Cost: 35 units, ~1.6k characters, roughly **2p**.

---

## 5. Also fixed, because it bit during this run

`tools/eng-distinct-render/verify.cjs` died on its 655th object with `curl 35` (SSL connect error)
and threw away a complete pass over the estate. Transport failures now get exactly one retry — a
curl exit code is not a verdict about a clip. A dead object still answers 200/404 and is judged on
the answer; two failures in a row still throw, because a check that swallows its own inability to
run is the bug this pipeline exists to avoid.

---

## 6. What this does NOT claim

- **Nobody listened.** Two speech models agree with the scripts; that is transcript evidence, not
  an ear. The Polish złoty/groszy line is the one item where I would still want one.
- **The numeral rule is validated on English.** The readings, the currency words and the "and" are
  British English. A non-English *known* language will get the plain normalisation and behave
  exactly as before — no worse, but no better either.
- **Rule 4 tolerates extra numeric material** in a decode (§2). That class remains Rule 2's.
- The other two gaps in the render report are untouched by this pass: **Aran's 23 Welsh
  recordings are still 834-byte stubs**, and **39 pod-0 slots still have no English text at all**.
