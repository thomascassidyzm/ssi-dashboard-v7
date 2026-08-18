# Check 18 — the detector now covers the estate

**2026-08-18. Read-only against course content. No writes, no audio, no spend.**

## The finding, restated and confirmed

scan-course Check 18 ("LEGO presentation/text drift") extracted the announced phrase with one English template requiring the literal connector `, as in`:

```
/^The \w+(?:\s\w+)?\s+for:\s+'([\s\S]*?)'\s*,\s*as in/i
```

and did `if (!m) continue` on everything else.

**Baseline, measured live before any change:**

| | |
|---|---|
| presentation clips reachable from a LEGO | **72,063** |
| matched the template | **21,342** (29.6%) |
| silently skipped | **50,721** (70.4%) |
| known-drifted rows it flagged | **2 of 229** |

The known-drifted set is the prior worker's 232 (LEGO `known_text` clean, narration still speaks a bracket). It is **229 today**, not 232 — the same worker re-rendered three `por_for_eng` rows yesterday afternoon. I re-derived the set from the live DB rather than reusing their number.

## The connector census — done exhaustively, not guessed

I censused all 72,063 clip texts. There is no small connector vocabulary to enumerate: **13,762 distinct narration skeletons**. The largest families:

| clips | shape |
|---|---|
| 1,503 | `கொரியன்-ல். ⟪⟫. ⟪⟫ போல். :` (Tamil-known) |
| 1,500 | `कोरियाई में — ⟪⟫ — जैसे — ⟪⟫ — में :` (Hindi-known) |
| 1,443 | `ಇಂಗ್ಲಿಷ್ — ⟪⟫ — ⟪⟫ —:` (Kannada-known) |
| 1,246 | `The German for: ⟪⟫, as in — ⟪⟫, is:` ← **the only shape the old check saw** |
| 1,097 | `The Spanish for: ⟪⟫, is:` |
| 611 | `德语里。⟪⟫。如⟪⟫。是：` (Chinese-known) |
| 583 | `En catalán — ⟪⟫ — como en — ⟪⟫ — es:` |
| 456 | `Em inglês — ⟪⟫ — como em — ⟪⟫ — é:` |
| 415 | `Auf Englisch ist — ⟪⟫ — wie in — ⟪⟫ — :` |
| 349 | `⟪⟫. ⟪⟫처럼. 를 영어로 하면:` (Korean-known) |

Plus two families with **no quotes at all**, which no connector list would have found:

- **legacy Welsh** (3,275 clips): `The Welsh for <src>the football</src> is <tgt>y pêl-droed</tgt>.` — freeform narration with `<src>`/`<tgt>` markup.
- **Japanese-known** (2,459 clips): `〜を学んでいる を英語で言うと：` — the phrase is bare, framed only by the trailing `を…で言うと：`.

And one that actively poisons a quote scanner: some Dutch clips wrap the phrase in SSML, `The Dutch for — <phoneme alphabet='ipa' ph='æm'>am</phoneme> — as in …`, where the attribute values are quoted and the phrase is not.

**Conclusion: enumerating connectors is the wrong fix.** The right fix is to parse *delimiters*, not sentences. Every family marks the announced phrase with one of eight quote pairs, a `<src>` tag, or the Japanese frame. That is language-independent.

## After

| | before | after |
|---|---|---|
| clips parsed | 21,342 / 72,063 (29.6%) | **72,058 / 72,063 (99.99%)** |
| unparsed | 50,721 **silently dropped** | **5, counted and printed** |
| known-drifted rows flagged | **2 / 229** | **226 / 229** |

The 3 not flagged are **correct refusals**, verified by hand: all three are Welsh multi-part narrations where the LEGO phrase *is* announced (`<src>These days</src> is <tgt>y dyddiau'ma</tgt>`) and the bracket sits elsewhere in the clip. The 229-row set contains 3 members that are not presentation drift; the new detector declines them and the old set was slightly over-counted.

The 5 remaining unparsed are one-offs, and they are **printed, not dropped**: two Welsh "if you put X and Y together" asides, one Welsh sentence with no markup, one `cym_anthem_for_jpn` freeform line, and one `tur_for_eng` LEGO whose `known_text` is literally `?`.

## What changed in the code

- **`tools/presentation-drift.cjs`** (new) — the matcher. Delimiter-based. Returns `ok` / `drift` / **`unparsed`**; `unparsed` exists so nothing can be silently skipped again.
- **`tools/check-presentation-drift.cjs`** (new) — the runnable check. Always prints `coverage: parsed/clips`; **exits non-zero if coverage < 99%**, so an unreadable run can never read as a pass.
- **`.claude/commands/scan-course.md`** — Check 18 now points at the tool instead of carrying an inline regex, records why the old one was removed, and the report template requires the coverage line.

Four false-positive mechanisms were found and killed during development, each verified by re-running the calibration: the Japanese `「」のように` empty-example clause (1,178 spurious flags), the SSML `<phoneme>` attribute quotes, the apostrophe trap in `'didn't have', as in` (mangled labels), and Spanish `¿…?` edge punctuation.

## New rows surfaced — NOT fixed, for your decision

**2,744 drift rows across 70 courses.** A raw count is not a finding, so here is the breakdown:

| class | rows | in live courses | what it is |
|---|---|---|---|
| **B alternation-pick** | 1,194 | — | LEGO reads `yet / still`, narration announces `yet`. **Looks deliberate — I would not call this a defect.** |
| **E3 unrelated phrase** | 852 | **120** | LEGO reads `happy`, learner hears `I'm surprised at`. The real thing. |
| **C announced-superstring** | 270 | 58 | LEGO `pub`, narration `in the pub`. |
| **D announced-substring** | 254 | 39 | LEGO `about a week`, narration `about`. |
| **A bracket-only** | 152 | 36 | LEGO `short`, narration `short (adjective)`. Your known class. |
| **E1 contraction-equivalent** | 14 | 13 | LEGO `I'd like`, narration `I would like`. Cosmetic. |
| **E2 freeform narration** | 7 | 7 | Welsh multi-part clips; detector limitation, low confidence. |
| **F empty announced** | 1 | 0 | one `spa_mx_for_eng` row. |

**My high-confidence subset: the 120 E3 rows in live courses.** I hand-checked 14 at random against the full clip text and 13 were unambiguous drift; the one miss (`cym_s_for_eng` S279L3) is a freeform Welsh aside my E2 filter should have caught. So call it ~93% precision on this subset. Earlier I sampled 18 more from E3 across all courses and found 18/18 real.

By course: `spa_for_eng` 55, `hrv_for_eng` 33, `zho_for_eng` 19, `por_for_eng` 6, `cym_s_for_eng` 4, `cym_n_for_eng` 2, `ita_for_eng` 1.

**I have fixed none of them.** This job ended at the detector.

### The 120 rows

| course | lego | reads | learner hears |
|---|---|---|---|
| cym_n_for_eng | S262L3 | `mean` | `meddwl` |
| cym_n_for_eng | S301L1 | `I find it` | `I'm finding it` |
| cym_s_for_eng | S129L2 | `had you` | `you had` |
| cym_s_for_eng | S148L1 | `the young boy` | `the boy` |
| cym_s_for_eng | S201L1 | `did you have time?` | `did you get?` |
| cym_s_for_eng | S279L3 | `mean` | `meddwl` |
| hrv_for_eng | S15L2 | `you to speak` | `that you speak` |
| hrv_for_eng | S23L4 | `I'm going to` | `I will` |
| hrv_for_eng | S38L1 | `I am learning` | `I learn/am learning` |
| hrv_for_eng | S51L3 | `with friends` | `with my friends` |
| hrv_for_eng | S59L2 | `to make` | `to do` |
| hrv_for_eng | S60L1 | `still` | `yet` |
| hrv_for_eng | S65L3 | `to test yourself` | `that you test yourself` |
| hrv_for_eng | S65L2 | `take time` | `to take for yourself` |
| hrv_for_eng | S68L1 | `are you looking for` | `you are looking for` |
| hrv_for_eng | S72L2 | `you're doing` | `it's going for you` |
| hrv_for_eng | S74L2 | `for helping me` | `that you helped me` |
| hrv_for_eng | S88L3 | `to people I don't know` | `with people I don't know` |
| hrv_for_eng | S92L3 | `doing this` | `to do/work` |
| hrv_for_eng | S114L2 | `as if I'm doing` | `as if it's going for me` |
| hrv_for_eng | S143L2 | `that we were talking about` | `that we were chatting about` |
| hrv_for_eng | S145L1 | `not any more` | `you not, any more` |
| hrv_for_eng | S158L1 | `let's talk` | `let's chat` |
| hrv_for_eng | S171L1 | `me to help you` | `that I help you` |
| hrv_for_eng | S181L1 | `mum` | `my mother` |
| hrv_for_eng | S190L2 | `if I ask` | `if I pose, as in, to pose a question,` |
| hrv_for_eng | S204L1 | `I wanted her to` | `I wanted (someone) to` |
| hrv_for_eng | S207L3 | `you needed to make` | `you needed to do` |
| hrv_for_eng | S217L1 | `had` | `drank` |
| hrv_for_eng | S222L1 | `he's trying to` | `he/she is trying` |
| hrv_for_eng | S237L2 | `me to tell` | `I tell/say` |
| hrv_for_eng | S238L2 | `you to tell` | `you tell/say` |
| hrv_for_eng | S246L1 | `I wanted her to` | `I wanted [someone] to` |
| hrv_for_eng | S249L1 | `you to help me` | `you help (subjunctive)` |
| hrv_for_eng | S260L1 | `I don't have the faintest idea` | `I don't have a clue` |
| hrv_for_eng | S263L1 | `who you mean` | `whom` |
| hrv_for_eng | S274L1 | `you have to` | `you must` |
| hrv_for_eng | S279L1 | `there wasn't much time left` | `there wasn't left` |
| hrv_for_eng | S288L2 | `people I know` | `which I know (people)` |
| ita_for_eng | S122L1 | `it's starting to` | `it is starting` |
| por_for_eng | S114L2 | `as if I were` | `I'm doing worse` |
| por_for_eng | S114L3 | `doing worse` | `than yesterday` |
| por_for_eng | S281L2 | `my coffee` | `I finish` |
| por_for_eng | S281L1 | `if I finish` | `do you mind if` |
| por_for_eng | S286L2 | `people who like` | `speaking Portuguese` |
| por_for_eng | S286L1 | `they like` | `people who like` |
| spa_for_eng | S52L3 | `friend` | `last week` |
| spa_for_eng | S60L2 | `yet` | `enough different words` |
| spa_for_eng | S69L1 | `the dog` | `young` |
| spa_for_eng | S71L3 | `no one` | `anyone` |
| spa_for_eng | S74L1 | `for` | `have you got` |
| spa_for_eng | S76L2 | `how much` | `how quickly` |
| spa_for_eng | S76L1 | `happy` | `I'm surprised at` |
| spa_for_eng | S83L2 | `you said` | `what he said` |
| spa_for_eng | S85L1 | `I know` | `it wasn't possible` |
| spa_for_eng | S86L1 | `it was` | `they are people` |
| spa_for_eng | S89L3 | `in a short time` | `that would be great` |
| spa_for_eng | S89L2 | `a lot` | `speak more slowly` |
| spa_for_eng | S90L2 | `slowly` | `think quickly enough` |
| spa_for_eng | S90L1 | `you can` | `it's difficult to` |
| spa_for_eng | S90L3 | `that` | `to answer in time` |
| spa_for_eng | S91L3 | `in time` | `this for a while` |
| spa_for_eng | S104L3 | `doing` | `the answer` |
| spa_for_eng | S110L2 | `friends` | `something new` |
| spa_for_eng | S112L1 | `that` | `why can't I remember` |
| spa_for_eng | S113L1 | `you said` | `I feel as if` |
| spa_for_eng | S116L2 | `to do` | `than I was last time` |
| spa_for_eng | S120L1 | `to go` | `it's unusual that` |
| spa_for_eng | S122L3 | `easy` | `a good idea` |
| spa_for_eng | S127L2 | `that` | `someone` |
| spa_for_eng | S132L1 | `that` | `you get to know` |
| spa_for_eng | S143L1 | `the same thing` | `I woke` |
| spa_for_eng | S145L2 | `happy` | `seems to be working` |
| spa_for_eng | S149L2 | `difficult` | `what your name is` |
| spa_for_eng | S150L1 | `can you` | `that wasn't` |
| spa_for_eng | S151L1 | `that` | `I would have done it` |
| spa_for_eng | S163L1 | `who` | `that` |
| spa_for_eng | S166L1 | `my` | `what do you need to do` |
| spa_for_eng | S166L2 | `unusual` | `tomorrow afternoon` |
| spa_for_eng | S172L2 | `that` | `I can manage on my own` |
| spa_for_eng | S174L1 | `you can` | `what do you want to do` |
| spa_for_eng | S184L1 | `yes` | `I think` |
| spa_for_eng | S186L1 | `different` | `I'm happy` |
| spa_for_eng | S195L1 | `to find` | `have you heard` |
| spa_for_eng | S196L3 | `idea` | `a teacher` |
| spa_for_eng | S201L1 | `we wanted` | `nobody was sure` |
| spa_for_eng | S207L2 | `to do` | `how to say it` |
| spa_for_eng | S218L1 | `not` | `it was nice` |
| spa_for_eng | S233L1 | `young` | `I met someone` |
| spa_for_eng | S233L3 | `your` | `who works with` |
| spa_for_eng | S234L2 | `someone` | `who said that` |
| spa_for_eng | S236L2 | `to help` | `tell you` |
| spa_for_eng | S248L1 | `my` | `I want you to help me` |
| spa_for_eng | S250L1 | `to tell me` | `I don't want to find out` |
| spa_for_eng | S255L1 | `to leave` | `when do you think` |
| spa_for_eng | S288L2 | `I know` | `like watching television` |
| spa_for_eng | S293L1 | `where` | `I have to find out` |
| spa_for_eng | S297L1 | `I know` | `I don't know many people` |
| spa_for_eng | S297L2 | `many` | `who speak Spanish` |
| spa_for_eng | S505L2 | `I don't stay` | `I don't get` |
| spa_for_eng | S531L1 | `anyone` | `whoever` |
| zho_for_eng | S10L4 | `remember the whole sentence` | `to remember` |
| zho_for_eng | S14L3 | `do you speak Chinese?` | `do (you) speak Chinese?` |
| zho_for_eng | S33L2 | `how long have you been learning Chinese?` | `how long (up to now)` |
| zho_for_eng | S50L1 | `finish as quickly as possible` | `to finish` |
| zho_for_eng | S69L3 | `one` | `measure word` |
| zho_for_eng | S74L1 | `to really understand` | `to comprehend` |
| zho_for_eng | S83L1 | `to agree` | `agree about` |
| zho_for_eng | S97L1 | `as long as` | `as soon as` |
| zho_for_eng | S130L1 | `surprising` | `outside` |
| zho_for_eng | S174L1 | `to follow what someone's saying` | `understand` |
| zho_for_eng | S198L1 | `the council` | `city` |
| zho_for_eng | S204L1 | `arrangements` | `deal` |
| zho_for_eng | S204L2 | `these` | `arrangements` |
| zho_for_eng | S223L1 | `going to ask` | `will ask` |
| zho_for_eng | S229L2 | `if she could` | `if (conditional marker)` |
| zho_for_eng | S230L1 | `know a young man` | `to know; to recognize` |
| zho_for_eng | S245L1 | `did so much in a short time` | `in short time do so much` |
| zho_for_eng | S251L3 | `we'll deal with it later` | `after that then` |
| zho_for_eng | S310L1 | `she can write` | `write about` |

## Honest gaps

- I did not verify any of these by **listening**. `course_audio.text` is what the row claims was spoken; the authoritative record of what TTS actually voiced is `word_boundaries`, which I did not check. For bracket-class rows that distinction has bitten before.
- Class B (1,194 alternation picks) is judged benign from 7 samples plus the shape of the data. It is the one class I would want a second opinion on before anyone deletes it from a report.
- Coverage is 99.99%, not 100%. The 5 unparsed rows are named above rather than rounded away.
