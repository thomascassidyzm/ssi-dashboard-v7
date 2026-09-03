# Testing the LEGO-tiling mismatch detector — spa_for_eng

**Calibration run, 26 August 2026. Read-only. No course data was written, no audio was generated, and nothing was committed.**

The idea under test: throw away the general word lexicon and use the course's own
LEGO pairs as the bilingual dictionary. Every phrase is built from LEGOs, every
LEGO has an English gloss and a Spanish form, so check both directions and treat
any asymmetry as a candidate mismatch. The hope was that idiom would stop being
noise, because an idiomatic rendering *is* a LEGO pair and should match itself.

It does not work. Here is the evidence.

---

## The four numbers

| | tiling | what we have today |
|---|---|---|
| **A. Recall on the 89 real defects** | **86 of 89** — dropped 44/47, tense 31/31, person 11/11 | 89/89, but see the warning below |
| **B. Faithful rows correctly cleared** | **175 of 907 — 19%** | n/a |
| **C. Rows flagged for a human to read** | **6,951 of 10,072 — 69% of the course** | 1,019 — 10% |
| **D. The 20 independently known-bad rows** | **20 of 20** | 16 of 20 |
| **New findings: defects the human pass missed** | **0 of 60 read** | 7 of 60 on its own list |

**Read A and D together with C or they will mislead you.** Tiling flags more than
two thirds of every sentence in the course. Something that flags 69% of the course
catches 61 of the 89 defects by luck alone, so 86 of 89 is a lift of 1.4× over
tossing a coin — not the 97% it looks like. And the 89 defects were themselves
found by today's detector, so today's detector scores 89 of 89 on them by
construction. That comparison is rigged in its favour and I am not claiming it.

**D is the only honest head-to-head**, because those 20 rows came from human
read-throughs, not from either detector. So compare at the same amount of human
reading:

| reading list | rows a person must read | known-bad rows found |
|---|---|---|
| today's detector | 1,019 | **16 of 20** |
| tiling, tightened to the same size | 1,168 | **9 of 20** |
| tiling, loosened until it matches 16/20 | 1,936 | 16 of 20 |
| tiling as proposed | 6,951 | 20 of 20 |

At equal cost today's detector finds nearly twice as many. To beat it, tiling
needs a person to read twice as much.

---

## My position

**This design is worse than what we have, and it is not complementary either. Do
not build it.** The one thing it is measurably better at — finding all 20
known-bad rows — it buys by flagging seven times as many rows, and the 60 rows it
flags that the human sweep never saw contain, on three independent readings, not
one real defect. There is a narrow salvage: used only to *subtract* from today's
list rather than to generate its own, tiling would remove 175 rows from the 1,019
a person has to read while losing none of the 20 known-bad ones. That saves about
an hour of reading and costs three real defects out of 89. I do not recommend
taking that trade — three real defects are worth more than an hour — but it is the
only configuration where tiling earns its keep, and it is the one to revisit if
the reading pile ever gets genuinely unaffordable.

**The central claim fails outright.** Idiom does not stop being noise: tiling
clears only 19% of the rows a human already confirmed were faithful. The reason is
worth stating precisely, because it is not a bug and no amount of tuning fixes it.
The rule that one English prompt maps to exactly one Spanish answer constrains the
course in *one* direction only. It says nothing about the other direction, and in
practice many different English wordings share one Spanish rendering. The course
teaches *with someone else → con otra persona*; the practice sentences also say
*with someone*, and *with another person*. It teaches *I believe → creo*; the
sentences say *I think*. It teaches *therefore → así que*; the sentences say *so*.
Every one of those legitimate variations breaks the dictionary lookup in both
directions at once, producing a phantom missing word on the English side and a
phantom extra word on the Spanish side of the very same sentence. The LEGO table
is a one-way dictionary and this algorithm needs a two-way one.

I tested whether the damage was concentrated in a handful of bad entries that
could be patched by hand. It is not — repairing the fifteen worst offenders leaves
5,514 of the 6,951 false alarms standing. I also tested the most generous possible
version of the Spanish dropped-pronoun exemption, since English "I" alone drives a
third of the flags. Volume fell from 6,951 to 6,490. There is no setting at which
this design becomes usable.

---

## Two things worth knowing that were not the question

**The prediction that tense would be invisible is wrong, and pleasantly so.** The
brief expected near-zero on the 31 tense defects and 11 person defects, on the
grounds that a tense carried by inflection tiles perfectly. In fact tiling catches
all 31 and all 11, and still runs at nearly 3× chance when tightened to a fifth of
the course. The mechanism is real: Spanish teaches each conjugated form as its own
separate chunk, so swapping a tense swaps the surface word and breaks the match.
*They already said → ya dijeron* rendered as *ya saben* is caught because *saben*
and *dijeron* are different taught chunks. This is a genuine property of the
approach and it is the piece worth carrying into any future design.

**The blind spot is somewhere else entirely, and it is larger.** Just under half
the practice sentences in the course — 4,919 of 10,072 — contain at least one
English content word that no LEGO covers at all. *I think*, *learning*, *start*,
*with someone*, *discussing*: none of these is a LEGO in this course. Any defect
living in those words is invisible to this design by construction, not by
tuning. That is a fact about the course's own chunk inventory rather than about
the detector, and it is probably the most useful thing this run turned up.

**One live error found in passing.** Three sentences say *mucho agua* where Spanish
requires *mucha agua*. It is a gender-agreement slip, not a meaning mismatch, so
neither detector is looking for it. I have not touched them.

---

## How this was measured

Everything ran against the live database, which outranks the written record. The
ground truth is the existing full sweep: all 10,072 practice sentences, 1,019 of
them flagged, every flagged row read by a person, and the result triaged into real
defects and false alarms. I recovered the exact list of all 1,019 from the working
files of that job, so the comparison is against the same rows, not a re-run.

Three things I had to correct for before trusting any number:

- **Fifty-eight of the defects have already been repaired and the repairs are
  live.** Scoring the corrected Spanish would have faked recall on sentences that
  are no longer broken, so I put the original wording back for those rows only,
  in memory, for the measurement.
- **The word matcher had to tolerate inflection without destroying it.** A recent
  job elsewhere used a matcher that truncated words and silently merged distinct
  ones. I built the English equivalences only where the result was already a word
  the course teaches, then printed all 72 of them and read them. Four were wrong —
  *thing* was being merged into *the*, and *evening* into *even*, *news* into
  *new*, *willing* into *will*. Those are blocked. Spanish is matched on exact
  accent-preserving forms with no truncation at all, so it cannot suffer this
  failure.
- **Overlapping chunks are treated as coverage, never as a partition**, and glue
  words, articles and dropped Spanish subject pronouns are exempt throughout, kept
  in a clearly separate Spanish-only layer.

The sixty new rows were read three times independently — by me and by two separate
readers who were told to ignore the machine's guess. All three returned zero
defects. All three independently picked out the same two rows as the closest
calls: *use the words* rendered as *say the words*, and *very good at it* rendered
as *very good*. Neither is a defect.

## Gaps

- **Recall against this ground truth is structurally biased toward the existing
  detector**, because the ground truth is that detector's own output. Number A
  should be read as "does tiling agree with a list someone else drew up", and only
  number D is a fair contest. A genuinely unbiased recall test needs a set of
  defects found by reading the course cold, which does not exist at this size.
- **The written record disagrees with its own data files and I have used the data
  files.** The write-up of the earlier sweep says 87 serious defects split 45
  dropped / 31 tense / 11 person, with 25 in the softer tier. The files it ships
  alongside contain 89 and 23, split 47 / 31 / 11. Two rows sit on the wrong side
  of the line. It changes none of the conclusions but somebody should know.
- **The false-alarm rate of tiling was not measured directly**, only inferred. I
  read 60 of its new flags and found nothing; at 6,951 flags that is consistent
  with anything from a handful of real defects to none, and I am not going to put
  a percentage on it.
- **Spanish only.** Nothing here transfers to another language pair without being
  measured again, and the one-way-dictionary problem will look different in a
  language whose chunks are shaped differently.
