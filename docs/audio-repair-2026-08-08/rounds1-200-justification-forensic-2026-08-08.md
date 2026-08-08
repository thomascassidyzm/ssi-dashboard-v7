# Did rounds 1-200 need redoing? The forensic answer

**You were right about the reason and it was wrong — but the German half of the spend fixed real, widespread damage; only the French half, about £1.30, went on audio that was almost entirely fine.**

---

## Was Tom right?

Yes, on every part of the argument he made.

He said cross-course borrowing could only ever pull in known-language clips, because French-for-English and German-for-English share nothing but their English side. That is exactly what the code does and exactly what the data shows. A clip is only a candidate if its language matches, so a German clip can never fill a French slot. On the night, cross-course borrowing supplied **56 clips, every single one English**, and every one of them was free — not a penny of the spend.

He said those English lines were already his clone voice and already correct. Also true. The English layer of both courses had already been recast in his clone voice, and last night's run left it alone: it re-rendered **four** known-language clips out of 6,107.

So "cross-course reuse might have pulled in suspect audio" cannot be the reason rounds 1-200 were redone. It was never capable of being the reason. That explanation was wrong.

What it was not, though, is a repeat of the day before. The 7 August pass did the English side and deliberately left the French target audio exactly as it found it — 2,019 French target-1 clips and 1,620 target-2 clips were logged as "already fine, leave them". Last night's run did precisely those. Two different layers, one day apart.

---

## What the job actually did

Counted from the live database, not from the job's own reports.

| | French | German | Total |
|---|---:|---:|---:|
| **Re-rendered** (money spent) | 3,513 | 2,594 | **6,107** |
| Reused from another course (free) | 48 | 8 | 56 |
| Reused inside the course (free) | 2 | 6 | 8 |
| Left alone, already good | 3,891 | 3,470 | 7,361 |

And the same re-rendered clips split by which language was spoken:

| Layer | French | German | Total |
|---|---:|---:|---:|
| **Target language** (the French / the German) | 3,510 | 2,593 | **6,103** |
| **Known language** (English) | 3 | 1 | **4** |
| **Presentation** (intros) | 0 | 0 | **0** |

Presentation gets its own line because policy forced it to be rendered fresh rather than borrowed. In the event it rendered nothing at all: all 200 intro clips in each course were already good and were left alone.

A note on the four English clips. They sit under a role called `pod_fine_known`, not `known` — the role column in this table is not the tidy four-value list people assume, and I counted what is actually there rather than what the four names suggest. Pod roles were otherwise out of scope and excluded.

---

## What it really cost

The commissioning note said "roughly $5". The real figure is lower, because far fewer clips were rendered than the ~12,000 estimated.

The clips actually rendered carry 214,588 characters of text. At the rate written into the render code — $16 per million characters — that is **$3.43**. At the pod path's $15 per million it is $3.22. Cross-checked a third way, against the big overnight run's own $26.32 for 57,434 clips, 6,107 clips comes to $2.80.

So: **between $2.80 and $3.43**, call it three dollars. The estimate was about 50% high, because it assumed all ~12,000 clips in rounds 1-200 would need rendering when in fact more than half were already good and were skipped.

---

## What actually triggered the re-renders

Three things could have caused a clip to be re-rendered. The answer is not a mix — it is one of them, completely.

**All 6,107 re-rendered clips were re-rendered by the date rule, and nothing else.** Every one of them had been created before 5 August. Not one had a missing link, an unset column or a wrong voice; not one was rendered because of cross-course borrowing. I checked the creation date of all 6,107 rows directly: 6,107 before 5 August, zero on or after it.

That date rule has nothing to do with other courses. It is a filter on a course's **own** old clips, applied to every layer equally, and the reason written into the code is a bug of our own making: until 5 August the audio pipeline ran a tail-repair step that trimmed each clip at a detector's timestamp. The detector cannot tell a click at the end from a natural pause in the middle, so it sometimes cut everything after the pause. That is how the German course shipped "Ich will jetzt mit dir Deutsch sprechen" with "sprechen" missing. Any clip that went through that step could carry that damage.

So the honest sentence is: the run distrusted the old French and German audio because our own post-processing may have eaten words off the end of it. Somewhere between that fact and the note you read, it got retold as a story about borrowing from the German course, and that retelling was simply wrong.

**On whether target audio could ever cross between the two courses:** it cannot, and there are three independent barriers, though only two of them are reliable. The clip's language must match, which alone settles it. The text must match, and a French sentence is not a German one. The voice must match — but that one would *not* have stopped it, because both courses use the same voice for their second target speaker. The language check is what actually holds the line, and it holds it properly: a clip with no language recorded is rejected too, rather than waved through.

**The counterfactual, which settles it.** The same planner ran over the same French rounds 1-200 the previous morning without the date rule switched on, and classified those very target clips as already satisfied. Turn the date rule off and last night's run renders nothing. It is the only thing that fired.

---

## Were the replaced clips actually defective?

The answer is different for the two languages, and that is the most important thing in this document.

**The old audio survives.** Every re-render wrote to a brand-new file, and the revision history kept the old file's name and its old length, so nothing was overwritten and all 6,107 replaced clips can still be heard. That let me do two things: compare every single replaced clip's old length against its replacement — all 6,107, not a sample — and then listen to a deterministic sample across the range.

**The population test.** If the tail-repair bug had eaten words, the old clips would be systematically shorter than their replacements.

- **French: no such pattern.** The old French clips were, on average, exactly as long as the new ones — the median is a dead heat, and there are almost as many that came out *shorter* on re-render as longer. That is ordinary voice variation, not damage.
- **German: a real pattern.** The old German clips were systematically shorter, and 41% of them were shorter than their replacement by more than 8%.

**Then I listened.** I took clips by a fixed rule — sort by length ratio, take the most extreme, then the first two by id in each of five bands spanning the whole range — and ran each old file through speech recognition to see what it actually said.

*German, and this is grim:*

| The clip should say | The old file actually said |
|---|---|
| du verstehst es gut | "Du versch…" |
| früh aufzuwachen | "Frühe." |
| müde zu werden | "Mütet." |
| ich möchte dir sagen es ist wichtig sich Zeit zu nehmen um sich selbst zu testen | "…um sich selbst" |
| du weißt schon, dass ich mich verbessern will, und ich freue mich darauf | "…und ich freue mich" |
| Ich denke, dass sie heute Nachmittag hier ist, und ich will Deutsch sprechen | "…und ich will deutlich" |

That last one is the exact failure you already knew about — "sprechen" cut off. Six of the seven German clips I sampled below the damage line were cut short. All four above it were complete. So the German replacements were not just justified, they were overdue: somewhere between 600 and 1,100 German clips in rounds 1-200 were playing learners half a sentence.

Hear it. The broken one, then its replacement:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/C5E1542D-569B-4F31-8A39-1BC8F5D3A2F5.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/E700061E-2DBF-4D09-9C8E-FA0A81625D50.mp3

And the "sprechen" case, before and after:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/DE6F9D33-8628-4925-B964-A267DEE389A9.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/30759416-D06E-407A-AFD6-FC211A9B3FEE.mp3

*French, and this is the other half of the answer:*

For French I did not sample — I transcribed **every one of the 170 French clips in the danger band**, that is every replaced clip whose old file was more than 15% shorter than its replacement. If the damage were there, it would be in that band.

**168 of the 170 said their full text.** One was genuinely cut — "je ne veux pas" came out as "je ne veux", losing the negation. One more is doubtful: "il ne veut pas se taire en ce moment" trails into mush at the end. Everything else was complete, including "découvrir quelle est la réponse", the single most-shortened French clip in the whole population, which was simply spoken faster than its replacement.

So the French damage rate in rounds 1-200 is about **one clip in a hundred within the worst band, and one or two in 3,513 overall** — against German, where six of the seven I checked below the line were cut. Same bug, same pipeline, wildly different blast radius.

One caveat worth having, because it cuts against me. The same overnight rebuild that ran rounds 201 onwards — a separate job, not this one — *does* contain properly broken French: "alors j'espère que" missing its "que", "le verre d'eau est ici" reduced to "le verre d'eau". So French was not immune to this bug. It just barely touched rounds 1-200.

The worst old French clip, complete, then its replacement:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B59B70E8-6B02-4E51-A1A8-25A940E85090.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/D32AB44A-4F77-4CA0-A454-2B24E12305F5.mp3

**So:** the German half of the spend, about £1.20, fixed real and widespread damage — hundreds of clips playing learners half a sentence. The French half, about £1.30, bought the repair of one or two clips and re-rendered 3,511 that were already correct.

---

## Two things this turned up that were not the question

**There is a second, different defect, and it is live right now.** A French clip that nothing has replaced — "Oui, je peux avoir un verre d'eau **aussi**, s'il vous plaît" — is missing "aussi" from the **middle** of the sentence. The tail-trim bug can only ever eat the end, so this is something else, and it is serving to learners today. It surfaced by luck in a sample of seven. Worth a proper look.

**The detector we would reach for next does not work.** `word_boundaries`, the column that proves what the voice actually spoke, is populated on 67 of 66,626 French rows and **zero** of 61,447 German rows. Any plan that relies on it to find damage at scale will silently find nothing.

---

## Gaps

- **French is cleared thoroughly in the danger band, not everywhere.** All 170 clips whose old file was >15% shorter were transcribed; the other 3,343 were not. A defect that does not shorten a clip would show up in neither test.
- **German is the reverse — sampled, not exhaustive.** Eleven clips across the range. The population length test covers all 2,594, but the "600 to 1,100 damaged" figure is inferred from where the sampled damage starts, not counted.
- **The German damage line is not crisp.** One clip at the boundary was fine while a slightly shorter-relative one was cut. "600 to 1,100 clips" is an honest range, not a count. Counting it exactly would mean transcribing all 2,605, which is a bigger job than this question needs.
- **The cost is derived, not billed.** No invoice was consulted. $3.43 comes from the characters actually rendered at the rate written into the render code; two other methods gave $3.22 and $2.80. If the real rate differs, so does the figure — but the shape of it, roughly three dollars rather than five, does not change.
- **My re-render count is 6,107; the job's own logs say 6,122.** I am reporting mine, from the database. The 15-clip gap is most likely a few renders falling just outside the time window I counted, but I have not chased it and it changes nothing.
- **A much larger number is floating about, and it is wrong.** Counting everything the database did on 8 August gives ~46,700 re-renders, not 6,107. That figure sweeps in the big rounds-201-onwards rebuild, which ran from 02:00 to 04:40 and was reported separately. This job ran 04:47 to 05:45. Split by the hour, the two are cleanly distinct, and the 05:00 hour alone matches the job's own log to within three clips.
- **German's paper trail before this week is thinner than French's.** French has a documented rounds 1-200 pass on 7 August; German has no equivalent artifact, so I cannot say from records alone what state the German English layer was in before last night — only that the database shows it was already good and was left alone.

---

*Job reference: c6412b2c-fac4-4698-a5d3-bc34a7e51328, completed 05:45Z on 8 August 2026. Every figure here comes from the live database and the live audio files, not from the job's own reports.*
