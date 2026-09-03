# spa_for_eng — known/target mismatch: detector, sweep, and 58 repairs

**2026-08-26.** A paying learner at seed ~267 reported that some Spanish practice
sentences do not say what the English says. He was right. This is what the
detector found, what was fixed, and what a human still has to decide.

---

## 1. The two calibration numbers

The detector is a **candidate generator**, not a judge, and the numbers say so.

| measure | method | result |
|---|---|---|
| **False positives among flagged** | 60 randomly-sampled flagged rows, read individually | **~88%** — 7 of 60 were real defects on my own read |
| **False negatives among clean** | 60 randomly-sampled rows the detector cleared, read individually | **1.7%** — 1 of 60 was a real defect it had missed |

Read those together. The detector is **very good at clearing rows** and **weak at
convicting them**: it throws away 9,053 of 10,072 rows and only ~1 in 60 of what
it throws away is a defect, but only ~1 in 8 of what it keeps is one. That is the
right shape for a pre-filter and the wrong shape for an automatic fixer, so
everything it flagged was read by a person before anything was written.

The one missed row it is worth naming: *"I haven't been able to explain this well
yet"* → *"Todavía no puedo explicar esto bien"* — a present perfect flattened to a
present. A tense loss with no missing words is the shape it is least able to see.

**Recall gate.** Before any of this, the detector was pointed at rows already
known to be defective from earlier human read-throughs. It surfaces **16 of the
20** in-scope known-bad rows, including **both** rows at the learner's own seed
267 (`S0267L01U08`, `S0267L01U11`) and `S0151L03U14`, the row an earlier
job's readers failed to find at all. Four it misses, and the reasons are precise:
a word the course uses only once has no lexicon entry (*naturally*); a very
frequent content word is treated as structural (*think*); Spanish subjunctive is
not read as a past (*tenga* for *had to*).

## 2. What was swept

**Every use phrase in the course — 10,072 rows across all 663 existing seeds. No
sampling.** Build phrases (5,133) and components (1,123) were left alone: the
defect population is entirely in use phrases, and the sweep confirms it.

| | rows |
|---|---|
| use phrases swept | 10,072 |
| cleared by the detector | 9,053 |
| flagged for a human read | 1,019 |

All 1,019 flagged rows were then read individually by six independent readers
(jobs #729–#734), 170 rows each, every row, no sampling.

## 3. Triage

| tier | meaning | count |
|---|---|---|
| **HIGH** | the target is genuinely missing content the known side has, or the tense/person contradicts | **87** |
| **MEDIUM** | the target carries content the English did not ask for — needs a human read | **25** |
| **REJECTED** | flagged, read, and faithful after all | **907** |

The 907 rejections are one class almost end to end: **idiomatic rendering**.
*"right now"* → *en este momento*, *"on my own"* → *solo*, *"someone else"* →
*otra persona*, *"it's a long time since we saw each other"* → *hace mucho tiempo
que no nos vemos*. Word-for-word absence is not content loss, and a detector that
cannot tell the difference will keep producing this pile. Length ratio was never
used as a signal for exactly this reason.

HIGH breaks down as 45 dropped content, 31 tense, 11 person.

## 4. What was fixed — 58 rows

All 58 are live in the database now. Every one was checked against the rule that
binds every repair: **the new Spanish must be buildable from LEGOs the learner has
already met at that seed.** A tool (`lego-available.cjs`) checks each word and
prints TAUGHT / INFLECTED / UNTAUGHT.

That gate rejected **24 of my first-draft repairs** — correct Spanish that the
learner could not have produced. Examples: *había visto* (pluperfect, untaught at
s217), *también* (untaught at s248), *tuviste* (untaught at s267), *siempre*
(untaught at s152), *empezamos* (untaught at s151). Those 24 are listed in §6 and
were **not** applied.

Representative repairs:

| row | English | was | now |
|---|---|---|---|
| S0115L01U14 | …more time to learn **before we try to speak** | …antes de que tenga que irme *(before I have to leave)* | …antes de intentar hablar |
| S0153L03U13 | …**and it is important to know** | …de la misma manera *(clause replaced)* | …y es importante saberlo |
| S0267L01U11 | …so **I won't worry** | …no me preocupo *(present)* | …no voy a preocuparme |
| S0428L01U03 | I was sure **she'd be** here on Tuesday | …estará *(future)* | …estaría |
| S0225L03U02 | …**but I would if I could** | …si pudiera hacerlo *(clause merged away)* | …pero te ayudaría si pudiera |
| S0123L02U07 | practise as much as **you** can | …todo lo que pueda *(wrong person)* | …todo lo que puedas |
| S0597L03U05 | he **already knew** a hundred stories | ha oído *(has heard)* | ya sabía |

**ZUT holds.** No English prompt now maps to two different Spanish answers —
checked across the whole course after the write, zero collisions.

**Seed approval:** **0 seeds were unapproved.** A practice-phrase text edit does
not unapprove its seed in this schema — the seeds remain `released`. Their stored
decomposition is now stale for these 58 rows, which is a separate thing to fix.

## 5. Audio — 56 rows are SILENT, not stale

This differs from what the brief assumed and it matters.

A text edit fires `trg_null_phrase_audio_on_text_change`, which does **not** leave
the old clip attached. It looks for an existing same-voice clip that speaks the
new text and, failing to find one, **nulls the link**. Of the 58 edits: 4 relinked
to an existing clip, **110 links were nulled**, leaving **56 rows with no target
audio at all**.

So those 56 rows now have correct text and no sound, rather than correct text and
a wrong clip. **No audio was generated — that costs real money and needs Kai's
explicit approval.** An audio-pass request has been queued for `spa_for_eng`
naming this pass, which is how a content pass is supposed to end; the drops are
also recorded row-by-row in `content_audio_link_drops`.

## 6. What still needs a human

**24 defects blocked by the taught-vocabulary rule.** The Spanish is wrong, and
every correct Spanish rendering uses a word the learner has not met yet. These are
the class where *the honest fix is probably the English prompt, not the Spanish* —
the same diagnosis an earlier read-through reached on 2026-08-24. Named examples:

- **S0267L01U08** — *"When did you have news from your friend?"* → *¿Cuándo has
  tenido…?* The English asks for a preterite; *tuviste* is untaught at s267. This
  is the learner's own seed.
- **S0151L03U14** — *"when we started learning"* → *cuando aprendemos*. Needs
  *empezamos*; only *empecé* (s37) and *empezaste* (s79) are taught.
- **S0152L02U15** — *"I always think"* → *a menudo* (often). *siempre* is not
  taught until s181.
- **S0217L02U06, S0237L02U08, S0589L01U02** — three past perfects with no
  pluperfect available at their seeds.

**30 defects left for a human read** — mostly reported speech and modality, where
the repair changes what the sentence is doing rather than what words it uses:
*"She asked if we could…"* rendered as *"She said she wanted to…"* (S0277L01U10,
S0274L03U12), *"may have gone home"* rendered as settled fact (S0184L03U15,
S0185L02U03), *"Just give me…"* rendered as a question (S0250L02U15).

**4 register concerns** raised by the independent verifier on rows I fixed:
*más y más fácil*, *lo más frecuentemente posible*, *bonito* for *beautiful*,
*es tan bueno practicar*. Its suggested wordings (*cada vez más*, *tan a menudo
como sea posible*, *hermoso*, *seguir practicando*) are **all untaught at those
seeds**, so my versions stand as the best reachable rendering. Worth a native
speaker's eye when the vocabulary catches up.

## 7. The detector, and its portability

`tools/qa/known-target-mismatch/detect-mismatch.cjs <course_code>`

The bilingual lexicon it needs is **derived from the course's own parallel
corpus** by Dice co-occurrence — no dictionary, no morphology, no external
resource. That part works for any language pair on day one. Only the clause-link
list and the tense reader are language-specific, and they live in `packs/`; a
course with no pack runs on `packs/generic.cjs`, which keeps every
content-completeness signal and reports the tense signal as **unavailable** rather
than guessing it.

Signals: unrendered content in the known side's final clause; unrendered content
elsewhere; target content with no known counterpart; clause-link asymmetry;
question-mark parity; tense-class conflict. **Length ratio is deliberately not a
signal.**

Known blind spots, stated rather than discovered later: a word the course uses
once has no lexicon entry and cannot be judged; a very frequent content word is
treated as structural; subjunctive and other moods are not read by the Spanish
pack; and the ~88% false-positive rate means **its output is a reading list, never
a fix list**.
