# Slow-cadence chunk calibration — Austrian German (`deu_at_for_eng`)

**For:** Kai · **Date:** 2026-08-21 · **Code read at:** `origin/main` `f65137e65`
**Scope:** measurement only. No production code changed, no course data written, no audio generated.

Kai, 2026-08-19, after the first session with Sascha (they/them): *"the Austrian German has some VERY
tiny chunks, which made the recording sound unnatural; can it be calibrated — bigger chunks and more
recording, smaller chunks and less recording?"*

---

## Headline

1. **There is no minimum chunk length anywhere in the pipeline.** None. The splitter emits a chunk per
   LEGO and stops. A one-letter LEGO is a chunk. This is the root cause. (§a)
2. **Kai's assumption is inverted at the line level — and correct at the campaign level.** Bigger chunks
   do **not** mean more recording *per line*; they mean measurably **less** — the number of takes is
   fixed at 2 per line regardless of chunk count, and each extra chunk adds a mandatory ≥400 ms pause
   *inside* the slow take. What bigger chunks cost is **coverage**: merged chunks destroy the LEGO
   boundaries the splicer extracts from, and those LEGOs must then be recorded separately. That is where
   "more recording" really lives. (§d)
3. The conservative fix — merge one-word chunks of ≤3 letters into a neighbour, with a 6-word ceiling —
   removes **346 of 348** fragments across the whole campaign, makes **zero** lines worse on any of four
   regression axes, and costs **+124 direct-record items ≈ +19 minutes** on a ~2.7-hour campaign. (§c, §e)
4. **Separate pre-existing defect, worth its own ruling:** the optimiser reports "100% coverage, 0
   direct-record items" for this course, but **278 of 1248 LEGOs (22.3%) are already not extractable as a
   standalone chunk** from the script it produced. Glue-merging and max-munch swallow them. This is true
   *today*, before any change. (§f)

---

## (a) The rule as numbers

**Unit split on:** the LEGO. Nothing else.

The chunker is `chunkPhraseByLegos()` → `mergeGlueIntoLegos()`, and it exists in two places that are
kept byte-identical on purpose:

| what | file | line |
|---|---|---|
| wired planner (what the recordist is served) | `tools/recording-optimizer/generate-recording-script.cjs` | `chunkPhraseByLegos` :186, `mergeGlueIntoLegos` :124, assembled :606–625 |
| voice-engine port (what the splicer looks up) | `services/voice-engine/chunking.cjs` | :61, :102, `recordingChunksForPhrase` :150 |
| autocue resolver (what the recordist sees) | `src/utils/phraseChunks.js` | `resolvePhraseChunks` :17, `legoChunkCount` :60 |

The algorithm, exactly:

1. Tokenise the phrase on whitespace.
2. Left-to-right **maximum munch**: at each position try the longest LEGO match first, `maxLen` capped at
   **8 tokens** (`chunking.cjs:75`, planner `:203`). Longest match wins; emit it as a chunk.
3. Any token matching no LEGO is a **glue** singleton.
4. **Merge step — glue only.** `mergeGlueIntoLegos(chunks, 'left')` absorbs glue into the *previous*
   chunk (leading glue goes right, to the next LEGO). After this step **every remaining chunk is a LEGO.**
5. Join with `|` → `chunksString` → served to the autocue.

**Minimum chunk length in words: none. In characters: none. There is no floor constant to tune.**
The only merge that exists is step 4, and it only ever merges *non*-LEGO material. Two adjacent one-word
LEGOs stay two one-word chunks, forever. That is the defect.

Constants that do exist, and what they actually govern:

| constant | value | file:line | governs |
|---|---|---|---|
| max-munch token cap | 8 | `chunking.cjs:75` | longest LEGO match, not a chunk floor |
| `chunkPauseDuration` | **400 ms** | `src/composables/useVAD.ts:156` | how long a pause must be to *count* as a chunk boundary |
| `interChunkSilenceDuration` | 4000 ms | `useVAD.ts:136` | silence tolerated mid-phrase while chunks are outstanding |
| `silenceDuration` | 800 ms | `useVAD.ts:108` | silence that ends the take once the last chunk is read |
| `SILENCE_MIN_MS` | 150 ms | `services/voice-engine/align.cjs:33` | aligner's silence floor when cutting |
| `MIN_CHUNK_MS` | 120 ms | `src/utils/takeChunks.js:23` | discards sub-120 ms "chunks" in review playback |
| `SECONDS_PER_PHRASE` / `_DIRECT` | 4 / 3 | planner `:41` / `:43` | the time estimate — **chunk count is not an input to it** |

Note the last row. The shipped estimate is `(phrases×4 + direct×3) × 2` (planner `:568–570`) and
`items.length × 6` (`services/production-api.cjs:8490`). Neither has ever priced a pause.

---

## (b) Calibration on the real lines

**Course:** `deu_at_for_eng` — "Austrian German for English Speakers", 668 seeds, target2 =
`human_sasha_wanasky_deu_at` (Sascha, `sasha.wanasky@gmail.com`). Confirmed from `courses.voice_config`.

I ran the **actual wired optimiser** (`generateRecordingScript`) against the **live database**, not a
reimplementation. It produced the real campaign script:

| | |
|---|---|
| recording lines | **496** |
| LEGOs to cover (`is_new = true`) | **1248** |
| delivery corpus that must be spliceable | **13,219** (12,551 practice phrases + 668 seeds) |
| chunks the recordist is asked to produce | **2250** |
| pauses they must hit, each ≥400 ms | **1754** |
| mean chunk length | **1.81 words** |

### Chunk-length distribution (current rule, 2250 chunks)

| chunk length (words) | current | B ≤3ch | D 1-word |
|---|---|---|---|
| 1 | 1144 | 703 | 27 |
| 2 | 622 | 588 | 341 |
| 3 | 321 | 402 | 331 |
| 4 | 107 | 144 | 243 |
| 5 | 40 | 48 | 135 |
| 6 | 10 | 23 | 115 |
| 7 | 5 | 5 | 5 |
| 8 | 1 | 1 | 1 |

**Half of every chunk the recordist reads is a single word** — 1144 of 2250 (50.8%). 348 are a single
word of ≤3 letters. 89 are a single word of ≤2 letters. Kai is not imagining this and the detector did
not have to be coaxed: the very first histogram bucket is the biggest one.

### Ground truth — Sascha's actual session, 2026-08-19

`recording_provenance` holds the verbatim chunk map and the VAD's measured pauses for every take of that
session (`script_session_id: session_1787146421353`, role target2, 13:34 UTC). Five lines, five slow takes:

| line as chunked | chunks asked for | pauses the VAD heard | verdict |
|---|---|---|---|
| `i wü \| iatz \| wos \| auf Deitsch \| sogn` | 5 | **1** | **MISS** |
| `i versuch zum \| lernen, \| wia ma redt` | 3 | **2** | **MISS** |
| `i wü \| mit dir \| lernen, \| wia ma wos sogt` | 4 | 4 | ok |
| `i wer \| mit wem aundern \| reden übn` | 3 | 3 | ok |
| `wia ma so oft wia möglich redt` | 1 | 1 | ok |

The line Sascha read straight through without pausing at all is **the one with two adjacent one-word
chunks** — `iatz` then `wos`. A chunk-count mismatch is a hard refusal in `align.cjs` ("chunk-count
mismatch", by design), so that take cannot be cut and the line has to be re-read.

> **EXPLICIT GAP.** This is n=5. It is the entire human target2 slow-take record for this course. It
> is a vivid illustration, not a statistic, and I have not used it to claim a retake rate. Kai's own
> takes on the same day hit 6, 7, 8 and 9 chunks perfectly — a practised recordist *can* hit many
> boundaries. The complaint is about how it **sounds**, and that is the thing the numbers below price.

### 25 real lines, worst first

Ranked by fragment count. `NOW` = current rule, `A`/`B`/`D` = candidates from §c. Every one-word chunk is
visible as a bare word between pipes.

**seed 315  "I think that he couldn't afford the car that he wanted"**

```
NOW: i glaub, dass er si | des | Auto, | des | wos er wollt, | ned | leisten | hot | können
A  : i glaub, dass er si | des | Auto, | des | wos er wollt, | ned | leisten | hot | können
B  : i glaub, dass er si des | Auto, des | wos er wollt, ned | leisten hot | können
D  : i glaub, dass er si des | Auto, des | wos er wollt, ned leisten hot | können
```

**seed 367  "no nobody told me"**

```
NOW: na, | des | hot | ma | kana | gsogt
A  : na, des | hot ma | kana | gsogt
B  : na, des hot ma | kana | gsogt
D  : na, des hot ma kana gsogt
```

**seed 518  "I could not imagine that at all"**

```
NOW: i kunnt | ma | des | goa | ned | vurstelln
A  : i kunnt ma | des | goa | ned | vurstelln
B  : i kunnt ma des goa ned | vurstelln
D  : i kunnt ma des goa ned | vurstelln
```

**seed 151  "that wasn't what I was hoping would happen"**

```
NOW: des | wor | ned | des, | wos i ghofft hob, dass passiert
A  : des | wor | ned | des, | wos i ghofft hob, dass passiert
B  : des wor ned des, | wos i ghofft hob, dass passiert
D  : des wor ned des, | wos i ghofft hob, dass passiert
```

**seed 616  "you were very brave to say you thought that"**

```
NOW: du | worst | voi | mutig, | dassd gsogt host, | dassd | des | glaubst
A  : du worst | voi | mutig, | dassd gsogt host, | dassd | des | glaubst
B  : du worst voi | mutig, | dassd gsogt host, | dassd des | glaubst
D  : du worst voi mutig, | dassd gsogt host, dassd des glaubst
```

**seed 364  "I heard that he didn't like that place"**

```
NOW: i hob | ghört, dass | eahm | des | Platzl | ned | gfoin | hot
A  : i hob | ghört, dass | eahm | des | Platzl | ned | gfoin | hot
B  : i hob | ghört, dass | eahm des | Platzl ned | gfoin hot
D  : i hob | ghört, dass eahm des Platzl ned | gfoin hot
```

**seed 132  "that's less exciting than what she was saying"**

```
NOW: des is | weniger | spannend | als | des, | wos sie | gsogt | hot
A  : des is | weniger | spannend | als | des, | wos sie | gsogt | hot
B  : des is | weniger | spannend als des, | wos sie | gsogt hot
D  : des is weniger spannend als des, | wos sie gsogt hot
```

**seed 544  "whoever said it would be difficult was absolutely right"**

```
NOW: wer a immer | gsogt | hot, dass | des | schwa | wird, der | hot | voi | recht ghobt
A  : wer a immer | gsogt | hot, dass | des | schwa | wird, der | hot | voi | recht ghobt
B  : wer a immer | gsogt | hot, dass des | schwa | wird, der hot voi | recht ghobt
D  : wer a immer gsogt | hot, dass des schwa | wird, der hot voi | recht ghobt
```

**seed 112  "that was very interesting, and I wasn't expecting it"**

```
NOW: des | wor | voll | interessant, | und | i hob's ned erwartet
A  : des | wor | voll | interessant, | und | i hob's ned erwartet
B  : des wor | voll | interessant, und | i hob's ned erwartet
D  : des wor voll interessant, und | i hob's ned erwartet
```

**seed 513  "it hurts most when I move my head up and down"**

```
NOW: es tuat am meisten | weh, | wenn i in | Kopf auf | und | ob | beweg
A  : es tuat am meisten | weh, | wenn i in | Kopf auf | und ob | beweg
B  : es tuat am meisten weh, | wenn i in | Kopf auf und ob | beweg
D  : es tuat am meisten weh, | wenn i in | Kopf auf und ob beweg
```

**seed 133  "you get to know someone very well when you work together"**

```
NOW: ma | lernt | wen | richtig guat | kennen, wenn | ma | zamm arbeitet
A  : ma lernt | wen | richtig guat | kennen, wenn ma | zamm arbeitet
B  : ma lernt wen | richtig guat | kennen, wenn ma | zamm arbeitet
D  : ma lernt wen | richtig guat | kennen, wenn ma | zamm arbeitet
```

**seed 456  "he might be there but it's not very likely"**

```
NOW: er kunnt | scho do | sein, | oba | sehr wahrscheinlich | is's | ned
A  : er kunnt | scho do | sein, | oba | sehr wahrscheinlich | is's | ned
B  : er kunnt | scho do | sein, oba | sehr wahrscheinlich is's ned
D  : er kunnt | scho do sein, oba | sehr wahrscheinlich is's ned
```

**seed 143  "it's the same thing as we were talking about earlier"**

```
NOW: des is | des Gleiche, über | des | wos | ma | vorher | gredt hobn
A  : des is | des Gleiche, über | des | wos ma | vorher | gredt hobn
B  : des is | des Gleiche, über des wos ma | vorher | gredt hobn
D  : des is | des Gleiche, über des wos ma | vorher gredt hobn
```

**seed 358  "your friend said that she couldn't reach the top"**

```
NOW: dei | Freindin | hot | gsogt, dass sie | ned | bis ganz auffi | kummen is
A  : dei | Freindin | hot | gsogt, dass sie | ned | bis ganz auffi | kummen is
B  : dei Freindin hot | gsogt, dass sie ned | bis ganz auffi | kummen is
D  : dei Freindin hot | gsogt, dass sie ned | bis ganz auffi | kummen is
```

**seed 63  "are you sure you don't mind helping me?"**

```
NOW: bist da | sicher, dass | da | des | nix | ausmocht, wennst | ma helfst?
A  : bist da | sicher, dass da | des | nix | ausmocht, wennst | ma helfst?
B  : bist da | sicher, dass da des nix | ausmocht, wennst | ma helfst?
D  : bist da | sicher, dass da des nix | ausmocht, wennst | ma helfst?
```

**seed 279  "yes because there wasn't much time left"**

```
NOW: jo, | weil | nimma | viel | Zeit | übrig | wor
A  : jo, weil | nimma | viel | Zeit | übrig | wor
B  : jo, weil | nimma | viel | Zeit | übrig wor
D  : jo, weil nimma viel Zeit übrig | wor
```

**seed 333  "she said that she can't spend much time with the group"**

```
NOW: sie hot | gsogt, dass s' | ned viel | Zeit | mit | da | Gruppn | verbringen | kann
A  : sie hot | gsogt, dass s' | ned viel | Zeit | mit da | Gruppn | verbringen | kann
B  : sie hot | gsogt, dass s' | ned viel | Zeit mit da | Gruppn | verbringen | kann
D  : sie hot | gsogt, dass s' | ned viel Zeit mit da Gruppn | verbringen kann
```

**seed 100  "you shouldn't worry about doing something similar"**

```
NOW: du | sollst | da | koane Sorgen | mochen, | dass'd | wos Ähnliches | mochst
A  : du sollst da | koane Sorgen | mochen, | dass'd | wos Ähnliches | mochst
B  : du sollst da | koane Sorgen | mochen, | dass'd | wos Ähnliches | mochst
D  : du sollst da | koane Sorgen mochen, dass'd | wos Ähnliches mochst
```

**seed 384  "I couldn't agree with what he said a moment ago"**

```
NOW: i hob dem | ned | zuastimmen | kennan, | wos er | grod | gsogt | hot
A  : i hob dem | ned | zuastimmen | kennan, | wos er | grod | gsogt | hot
B  : i hob dem ned | zuastimmen | kennan, | wos er | grod | gsogt hot
D  : i hob dem ned zuastimmen kennan, | wos er grod gsogt hot
```

**seed 411  "we would like to reserve a table for four tonight"**

```
NOW: wir | mechatn | heit auf d'Nocht an | Tisch | für | vier | reservieren
A  : wir | mechatn | heit auf d'Nocht an | Tisch | für | vier | reservieren
B  : wir mechatn | heit auf d'Nocht an | Tisch für | vier | reservieren
D  : wir mechatn | heit auf d'Nocht an Tisch für | vier reservieren
```

**seed 499  "maybe we should open the door and close the window"**

```
NOW: vielleicht | soitn mir de | Tür | aufmochn | und | s'Fenster | zuamochn
A  : vielleicht | soitn mir de | Tür | aufmochn | und | s'Fenster | zuamochn
B  : vielleicht | soitn mir de Tür | aufmochn und | s'Fenster | zuamochn
D  : vielleicht soitn mir de Tür aufmochn | und s'Fenster zuamochn
```

**seed 61  "could you say that again a little more slowly?"**

```
NOW: kannst | des | no | amoi | a bissl | langsamer | sogn?
A  : kannst | des no | amoi | a bissl | langsamer | sogn?
B  : kannst des no | amoi | a bissl | langsamer | sogn?
D  : kannst des no amoi | a bissl langsamer sogn?
```

**seed 161  "can you give me that book on Sunday morning?"**

```
NOW: kannst | ma | des | Buach | am Sonntog in der | Früah | gebn?
A  : kannst ma | des | Buach | am Sonntog in der | Früah | gebn?
B  : kannst ma des | Buach | am Sonntog in der | Früah | gebn?
D  : kannst ma des Buach | am Sonntog in der Früah gebn?
```

**seed 475  "there are many reasons to consider waiting"**

```
NOW: do gibt's | viele | Gründe, zum | überlegn, | ob | ma | wartet
A  : do gibt's | viele | Gründe, zum | überlegn, ob ma | wartet
B  : do gibt's | viele | Gründe, zum | überlegn, ob ma | wartet
D  : do gibt's viele | Gründe, zum überlegn, ob ma wartet
```

**seed 268  "yes she sent me two emails last week"**

```
NOW: jo, | sie hot | ma | letzte Wochn | zwoa | E-Mails | gschickt
A  : jo, sie hot ma | letzte Wochn | zwoa | E-Mails | gschickt
B  : jo, sie hot ma | letzte Wochn | zwoa | E-Mails | gschickt
D  : jo, sie hot ma | letzte Wochn zwoa E-Mails gschickt
```


---

## (c) The trade, measured

### Candidate rules

All four are **pure functions of the phrase text**, which is mandatory: `splicer.cjs:88` re-derives a
phrase's chunks from its text at splice time, so recording-side and splice-side chunking cannot diverge.
Each candidate adds one post-step after `mergeGlueIntoLegos`:

> **merge any chunk that is a single word of ≤N characters into a neighbour (left-preferred, matching the
> existing glue direction), provided the result does not exceed 6 words. Repeat to fixpoint.**

- **A** — N=2
- **B** — N=3  ← *conservative*
- **C** — N=4  ← radical
- **D** — merge every one-word chunk regardless of length  ← radical

The 6-word ceiling is not decoration: without it, B creates eight lines carrying a new chunk of up to 9
words, and would fail Kai's "better on every line" bar. With it, the ceiling refuses those merges and
leaves the fragment alone — which is why B still shows 2 residual ≤3-char fragments rather than 0.

### Numbers, over the same 496 real lines

| metric | current | A ≤2ch | B ≤3ch | C ≤4ch | D 1-word |
|---|---|---|---|---|---|
| recorded chunks (496 lines) | 2250 | 2162 | 1914 | 1733 | 1198 |
| pause boundaries the recordist must hit | 1754 | 1666 | 1418 | 1237 | 702 |
| mean chunk length (words) | 1.81 | 1.89 | 2.13 | 2.36 | 3.41 |
| longest chunk (words) | 8 | 8 | 8 | 8 | 8 |
| one-word chunks | 1144 | 1030 | 703 | 489 | 27 |
| **fragments: 1 word ≤2 chars** | 89 | 1 | 1 | 1 | 1 |
| **fragments: 1 word ≤3 chars** | 348 | 250 | 2 | 2 | 4 |
| fragments: 1 word ≤4 chars | 535 | 434 | 172 | 2 | 6 |
| LEGOs extractable as standalone chunk (/1248) | 970 | 947 | 846 | 710 | 281 |
| **extra direct-record items needed** | 278 | 301 | 402 | 538 | 967 |
| course corpus spliceable % | 42.78 | 39.78 | 29.22 | 22.15 | 12.01 |
| min: natural pass | 41.9 | 41.9 | 41.9 | 41.9 | 41.9 |
| min: slow pass | 69.1 | 68.3 | 65.8 | 64 | 58.6 |
| min: extra direct items | 51 | 55.2 | 73.7 | 98.6 | 177.3 |
| **min: TOTAL** | 162 | 165.4 | 181.4 | 204.5 | 277.8 |

### Regression check — does a candidate ever make a line worse?

| rule | lines w/ more chunks | lines w/ more fragments | lines w/ new >6-word chunk | chunks spanning a sentence end |
|---|---|---|---|---|
| R0_current | 0 | 0 | 0 | 0 |
| A_chars2_cap6 | 0 | 0 | 0 | 0 |
| B_chars3_cap6 | 0 | 0 | 0 | 0 |
| C_chars4_cap6 | 0 | 0 | 0 | 0 |
| D_words2_cap6 | 0 | 0 | 0 | 0 |

**All zero, for every candidate, on all four axes.** The `linesWithNewOverlongChunk` column is what the
6-word ceiling buys; it reads 8 for a ceiling-less B.

### Recording-time model — stated explicitly

The shipped estimate ignores chunk count entirely, so I built one that doesn't:

```
slow pass    = totalWords / 2.2 wps  +  pauseBoundaries × 0.6 s  +  lines × 2.5 s
natural pass = totalWords / 3.2 wps  +  lines × 2.5 s
extra direct = extraItems × (2 × 3.0 s read  +  2 × 2.5 s overhead)
TOTAL        = slow + natural + extra direct
```

- **2.2 words/sec** slow, **3.2** natural — slow-cadence read rates.
- **0.6 s per pause** — the recordist must clear the 400 ms `chunkPauseDuration` threshold with margin.
- **2.5 s per item** — read-ahead plus the advance-gate settle, applied to each of the 2 takes per line.
- **Retake cost is excluded from every column.** I can price it (fewer boundaries ⇒ fewer chunk-count
  mismatches ⇒ fewer forced re-reads, and B saves ~17 expected re-reads under a per-boundary p=0.06),
  but p=0.06 is a guess I cannot validate on n=5. Excluding it makes every candidate look *worse* than it
  is, which is the safe direction. Flagged rather than smuggled in.

### Reading the table

Every candidate makes the **slow pass shorter** (fewer pauses to hold) and the **campaign longer**
(more LEGOs to top up). The two effects have opposite signs and the second is bigger:

| | fragments (≤3ch) removed | slow pass | extra direct items | net total |
|---|---|---|---|---|
| **A** ≤2ch | 98 of 348 | −0.8 min | +23 | **+3.4 min** |
| **B** ≤3ch | **346 of 348** | −3.3 min | +124 | **+19.4 min** |
| C ≤4ch | 346 of 348 | −5.1 min | +260 | +42.5 min |
| D 1-word | 344 of 348 | −10.5 min | +689 | +115.8 min |

Note that **C buys nothing over B on the fragment metric** — both land at 2 residual — while costing
double. C merges genuine content words (`iatz`, `Zeit`, `Tisch`) for no fragment gain. The knee of the
curve is unambiguously at B.

---

## (d) Kai's assumption — **FALSE at the line level, and that changes the answer**

> "bigger chunks and more recording, smaller chunks and less recording"

**Chunk count does not drive how many takes the recordist does.** `services/production-api.cjs:8420–8452`
pushes exactly **two** items per phrase — one `natural`, one `slow` — and nothing between those two lines
reads `chunkCount`. A 9-chunk line and a 1-chunk line are both two takes.

The slow take is **one continuous recording of the whole line**, read with a deliberate pause at each
LEGO boundary. `takeChunks.js` says it outright, and the VAD implements it: `useVAD.ts:527` counts a
boundary when silence clears `chunkPauseDuration` (400 ms) and keeps the take alive for up to
`interChunkSilenceDuration` (4000 ms) while chunks are outstanding. The chunk pieces the review screen
plays are *cut out of that one take afterwards* (`chunkRangesFromGaps`), never recorded separately.

So, per line, chunks are **pure cost**:

- **more chunks ⇒ a longer slow take**, by ≥400 ms of mandatory pause per boundary (0.6 s in my model).
  Across the campaign that is 1754 pauses ≈ **17.5 minutes of deliberate silence**.
- **more chunks ⇒ more chances to be forced to re-read the line.** `AutocueStudio.vue:670` (`judgeSlowTake`)
  refuses a slow take whose detected pause count ≠ `legoChunkCount(phrase)` and shows the retry panel —
  Kai's own 2026-08-19 ruling, quoted in that comment. Every boundary is another chance to miss.

**Bigger chunks make the per-line recording shorter, not longer.** Kai has the sign backwards there.

**Where Kai is right:** at the *campaign* level. The segment store is keyed by chunk text
(`splicer.cjs:95`), so merging `für` + `vier` into `für vier` means `für` and `vier` no longer exist as
standalone pieces from that line. If no other recorded line yields them alone, they must be recorded as
separate direct-record items. That is the "more recording", and it is the dominant term — the
`extra direct items` row. Kai's instinct was right about the *existence* of the trade and wrong about its
*mechanism*, which matters because it means the lever to tune is coverage top-up, not read time.

---

## (e) Conservative vs radical

### CONSERVATIVE — **B: merge one-word chunks of ≤3 characters, ceiling 6 words**

Qualifies on Kai's bar:

- removes **346 of 348** (99.4%) clearly-awkward ≤3-char fragments, and 441 of 1144 one-word chunks
- **lines made worse: 0** — zero on all four axes (more chunks, more fragments, new over-long chunk,
  chunk spanning a sentence end). *The required empty list is empty.*
- ≤3 characters is a defensible, language-neutral line: in this dialect it catches `des`, `wos`, `ned`,
  `ma`, `da`, `und`, `no`, `ob`, `voi`, `für` — function words. It does **not** touch content words.
- bounded, priceable cost: +124 direct-record items, ≈ **+19 minutes on a ~162-minute campaign (+12%)**
- the 2 residual fragments are ceiling refusals — the rule declining to make a line worse. Correct.

**Minimum-risk fallback if +19 min is unacceptable: A (≤2 chars), +3.4 min, 23 extra items.** But A
leaves 250 of 348 fragments standing and does not fix Sascha's failing line — it does not solve the
problem Kai reported.

### RADICAL — do not land, for Kai to rule on

- **C (≤4 chars)** — merges content words (`iatz`, `Zeit`, `Tisch`, `gehn`). **Zero fragment gain over B**
  at double the cost. There is no numeric argument for C; it is purely a judgement about how the course
  should sound.
- **D (every one-word chunk)** — the most natural-sounding read by a distance (mean chunk 3.41 words, 27
  one-word chunks left) and by far the shortest slow pass. Costs **+689 direct-record items ≈ +116 min**
  and drops standalone LEGO extraction from 970 to 281. A wholesale re-think of what the LEGO grain is
  for. Kai's call, not mine.

### Both candidates change the aligner's contract

B changes `chunksString`, which is the aligner's expected chunk map. **Any slow take already recorded
against the old map will fail chunk-count validation after the change.** For `deu_at_for_eng` that is
5 takes — trivially re-recordable — but it is not automatically true of `cym_n`/`cym_s`, which hold 676
and 641 human clips. Scope this to Austrian German, or audit Welsh first.

---

## (f) Separate finding — the optimiser's coverage number is not the coverage that matters

Under the **current, unchanged** rule:

- the optimiser reports **coverage 100.0%, direct-record items 0**
- but only **970 of 1248 LEGOs (77.7%)** appear as a standalone chunk anywhere in the 496 lines
- **278 LEGOs (22.3%) are not extractable at all** — max-munch swallowed them into a longer LEGO, or
  glue-merging fused them. Examples: `i kann` (only ever inside `wia i kann`), `wos Guats`, `des Gfühl`,
  `uns treffen`, `heit in da Fruah`, `waun`, `di selber`.
- whole-phrase spliceability across the 13,219-item delivery corpus is **42.8%**

The optimiser counts a LEGO as covered when its text appears as a *contiguous subsequence* of a selected
phrase. The splicer needs it to survive as an *emitted chunk*. Those are different tests and nothing
reconciles them. This predates the chunk-size question entirely and is arguably the larger problem.

---

## Machine-readable summary

Full numbers, per-rule, plus the 25 worked examples: **`docs/slow-chunk-calibration/calibration.json`**
(next to this file). Key shape:

```json
{
  "inputs": {"recordedLines": 496, "legosIsNewTrue": 1248, "corpusPracticePhrases": 12551, "corpusSeeds": 668, "corpusTotal": 13219},
  "rules": { "<rule>": { "totalChunks", "pauseBoundaries", "meanChunkWords",
      "chunkWordDistribution", "oneWordChunks", "fragments_1word_le2chars",
      "fragments_1word_le3chars", "fragments_1word_le4chars",
      "legosRecoverableStandalone", "extraDirectRecordItems",
      "corpusSpliceablePct", "minutes_naturalPass", "minutes_slowPass",
      "minutes_extraDirectItems", "minutes_TOTAL",
      "regressions": { "linesWithMoreChunks", "linesWithMoreFragments",
                       "linesWithNewOverlongChunk", "chunksSpanningSentenceEnd" } } },
  "examples": [ { "seed", "known", "line", "current", "A_chars2_cap6",
                  "B_chars3_cap6", "D_words2_cap6" } ]
}
```

---

## Explicit gaps

| gap | count | why |
|---|---|---|
| Sascha's slow takes available as ground truth | **5** | the whole human target2 record for this course. Used illustratively; no retake rate claimed from it. |
| Retake cost in the time model | **excluded** | per-boundary failure probability cannot be estimated from n=5. Excluding it understates every candidate's benefit — the safe direction. |
| Audio listened to | **0 clips** | brief is calibration-only. Every "sounds unnatural" judgement here is Kai's, inherited; I measured structure, never audio. |
| Delivery-corpus phrases the chunker bails on | **810 of 13,219** (6.1%) | `chunkPhraseByLegos` returns the whole phrase as one non-LEGO chunk when tokenisation and word count disagree (punctuation). Counted as unspliceable in every column, identically across all rules, so it does not bias the comparison. |
| Other courses checked | **0** | scoped to `deu_at_for_eng` as briefed. `cym_n`/`cym_s` hold 1317 human clips against the current chunk map and were **not** audited — see §e. |

---

*Reproduce: scripts in `scripts/` of this worktree — `gen-deuat-script.cjs` (runs the real wired
optimiser against the live DB, read-only), then `final.cjs`. Both are gitignored throwaways.*
