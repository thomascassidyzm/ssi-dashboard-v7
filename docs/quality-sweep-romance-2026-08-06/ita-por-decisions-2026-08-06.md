# Italian and Portuguese — what's fixed, and the three things that need you

*`ita_for_eng`, `por_for_eng`, `por_br_for_eng`. 2026-08-06. No TTS was run. No audio was deleted.*

**90 broken or missing audio introductions across the three courses have been repaired at zero cost**,
by pointing them at recordings that already existed and already said the right thing. European
Portuguese — the one course in the earlier sweep that never got read by a human — has now been read,
and the 19 defects that read proved are fixed. Three things are left that are genuinely yours: a small
audio spend, one methodology ruling, and one Portuguese repair pass.

*Shape taken from `docs/spa-padding-rewrite-2026-08-06.md`, the most recent completed sweep doc.*

---

## The numbers

Raw is what a detector matched. Confirmed is what survived hand-reading. Nothing below is a raw count.

| | raw | confirmed | done |
|---|---|---|---|
| **Presentation audio wrong or missing** (all 3 courses) | 227 | **227** | **90 repaired free**, 137 need audio |
| Portuguese defects from the missing hand-read | — | **19** | **all 19 fixed** |
| USE phrases ending mid-phrase on a contraction | 30 | **21** | 1 cut, 20 need a rewrite |
| Exact duplicate practice rows in one LEGO | 654 | **654** | none — deleting is worse, see below |
| LEGO repeated verbatim as its own practice phrase | 4,172 | **4,172** | none — needs your ruling |
| LEGO gloss never appears in its own prompts | 109 | **0** | nothing to do — see below |
| Vocabulary used before it's taught (Check 11 leftovers) | 3 | **3** | none worth fixing — see below |
| Dialogue used as a seed | 2 | **1** | not a per-course defect — see below |
| Late-tranche components with no English gloss | — | **0** | absent from all three |

Counts read from the live database, reconciled against `count(*)` per table per course.

---

## What was fixed

### 1. Ninety audio introductions repaired for nothing

When a learner meets a new chunk, a voice says *"The Italian for: 'easier', as in — 'much easier', is:"*.
On these three courses 227 of those were either **silent** or **announcing a different English phrase
than the screen was showing**. 105 of the Italian silences were made yesterday, by the earlier sweep
unlinking clips that said the wrong thing — the right call at the time, but it left a live course
mute at the moment that matters most.

The recordings were never deleted, only unlinked. So for 90 of them a clip already existed, in the
course, saying exactly the right words. Those are now relinked:

| | Italian | Portuguese | Brazilian |
|---|---|---|---|
| repaired by relinking | **22** | **5** | **63** |

Judge these on the English alone — this is what the voice said before and after:

| | was heard | now heard |
|---|---|---|
| screen says *friend* | "friend **(f.)**" | "friend" |
| screen says *saying* | "saying **(gerund)**" | "saying" |
| screen says *them* | "them **(feminine plural)**" | "them" |
| screen says *ask* | "ask **(in the future)**" | "ask" |
| screen says *worse* | "I feel as if" | "worse" |
| screen says *you left* | "left" | "you left" |
| screen says *people* | "people who speak Portuguese" | "people" |
| screen says *easier* | *(silence)* | "easier" |
| screen says *I wonder* | *(silence)* | "I wonder" |

The annotation cases are the interesting ones. The screen text was cleaned of builder annotations at
some point — `(f.)`, `(gerund)`, `(feminine plural)` — but the audio was never re-cut, so the voice
kept reading them out. A clean recording was sitting in the table the whole time.

**No TTS. No deletion** — 7,408 presentation recordings before and after. Every row's previous state
is in `itapor-logs/relink-applied-log.json`, so this is reversible line by line.

### 2. European Portuguese, finally read

`por_for_eng` is released, live and public, and it was the one course whose reviewer was killed by
yesterday's server restart. 42 seeds have now been read end to end. Its report is at
`docs/quality-sweep-romance-2026-08-06/por_for_eng.md`. What it proved is fixed:

| | was | now |
|---|---|---|
| she said it happened | *ela disse que **acontecido*** | *ela disse que **tinha** acontecido* |
| he said it happened | *ele disse que **acontecido*** | *ele disse que **tinha** acontecido* |
| they said it happened | *disseram que **acontecido*** | *disseram que **tinha** acontecido* |
| this is a surprise | ***este** é uma surpresa* | ***esta** é uma surpresa* |
| *(seed prompt, English side)* | "that was a **surrpise**, because he's my friend" | "that was a **surprise**…" |
| she said the dog is dirty because… | *…sujo **Porque** esteve…* | *…sujo **porque** esteve…* (×13) |
| I wanted her to help you to deal with | *…ajudasse a tratar **dos*** | **row deleted** |

*"que acontecido"* is not a Portuguese clause — it's a participle with the auxiliary missing. The
repair uses the form the LEGO's own sibling row already used, so the phrase still contains its LEGO
and nothing came loose. The typo was being **spoken**: the recording said "surrpise".

The 13 capitalisation rows were **not** unlinked, deliberately. `É` → `é` changes nothing a listener
can hear, and `course_audio.text_normalized` is case-folded, so unlinking would have manufactured a
13-clip regeneration backlog for free. Same call the Brazilian reviewer made for its 99 rows.

**9 clips unlinked** by the edits that genuinely changed what is said. An audio-pass request is
**queued, not run**. No recording deleted — 46,768 before and after.

---

## Found, deliberately not fixed, and why

### The duplicate rows are a symptom, and deleting them makes the course worse

The earlier sweep left 654 exact duplicate practice rows (Italian 304, Portuguese 308, Brazilian 42)
as "safe and obvious to delete". They are not. I measured what deleting them does:

| | Italian | Portuguese | Brazilian |
|---|---|---|---|
| LEGOs pushed below the 4-BUILD floor | **244** | **235** | 25 |
| …below even the validator's 3-BUILD minimum | 24 | 34 | 0 |

Your own rule is that fewer phrases is a fail. A blind delete would breach the floor on roughly 500
LEGOs across two live courses and give the learner nothing.

Then I looked at what the duplicates actually *are*, and it reframes the whole thing: **93% of them
are the LEGO itself, repeated verbatim as a practice phrase, twice.** So a LEGO whose four build
phrases satisfy the floor really has *two* — the other two are the tile copied out.

Swept course-wide, that padding is the norm, not the exception:

| | LEGOs with at least one | rows |
|---|---|---|
| Italian | 1,198 of 1,384 (87%) | 1,448 |
| Portuguese | 1,182 of 1,360 (87%) | 1,460 |
| Brazilian | 1,231 of 1,414 (87%) | 1,264 |

**The comparison that settles whether this is design or drift:** across the whole estate, generated
courses run 20–32% of build phrases being the LEGO repeated. Welsh — the hand-built original — is at
**0.1%** (5 rows in 4,005), and Telugu at 1.1%. The method doesn't do this. The generator does, and it
does it because bolting a copy of the tile into the basket is the cheapest way to satisfy the
5-per-LEGO forcing function. That is the same mechanism behind the Spanish padded phrases.

It also actively hides defects: a check for "does this LEGO's gloss ever appear in its own prompts"
returns almost nothing, because the copied-out tile always satisfies it. Both of my calibration cases
were missed until I excluded the copies.

**Left alone.** This is decision 2 below.

### The 109 "wrong gloss" hits are deliberate, not broken

A detector found 109 LEGOs across the three courses whose English gloss never appears in any of their
own practice prompts — the shape behind the `por_for_eng` S204 finding. Hand-read, almost all are
**deliberate disambiguators**, and I could prove it:

- `S0416` teaches *"the path"* → `caminho`, but all its drills say *"the way"* — because
  **"the way" is already taken** by `S0491` → `a maneira`.
- `S0437` teaches *"to collect"* → `angariar`, drills say *"to raise"* — **"to raise" is taken** by
  `S0529` → `levantar`.
- `S0497` teaches *"some"* → `um pouco`, drills say *"a little"* — **taken** by `S0009` → `um pouco de`.
- `S0502` teaches *"right direction"* → `direita`, drills say *"to the right"* — **"right" is taken**
  by `S0387` → `razão`.

Re-glossing any of them to the natural word would mint a live same-English-two-targets collision. This
is the `"the (masculine)"` trap, and here it is four times over. **Confirmed count: 0.**

### The three vocabulary-ordering leftovers are real and not worth fixing

Kai left these as "candidates needing the is-there-a-bridge judgement". Judged:

- **Italian "myself"** — 12 rows, never taught as a tile. But the English is natural ("I need to help
  myself"), and both it and "helping me" land on the same Italian `aiutarmi`. **Two Englishes on one
  target is not a defect.** Leave.
- **Italian "while"** — 5 rows, "for a while" → `per un po`, against a tile taught at S180. The
  Italian is the already-taught chunk; only the English label is early. Leave.
- **Brazilian "already"** — 2 rows. One uses `já` 17 seeds before its debut; the other says "already"
  in English with nothing corresponding in the Portuguese. Real but trivial. Leave.

### The dialogue seed is a seed-list problem, not an Italian one

`ita_for_eng` S82 — *"I'm not going to wait for you. Why not?"* — is two speakers used as one seed.
**The same English seed is in 72 courses.** And the sibling courses already show the right answer:
Portuguese and Brazilian both treat "why not" as a *proposal* — *"why not start now?"*, *"why not
learn Portuguese?"* — which is natural and productive. Italian alone drills it as a tag bolted onto a
statement (*"I'm ready to start. Why not?"*).

So Italian is the island, and the fix is visible in its own siblings. Not fixed here: it is 5 phrase
rewrites plus clips, and it belongs with the Portuguese repair pass in decision 3 rather than as its
own ask. Worth knowing the seed itself is upstream of 72 courses.

### Also found, not fixed

- **137 presentation recordings genuinely need generating** (Italian 92, Portuguese 17, Brazilian 28)
  — no existing clip says the right words. Decision 1.
- **15 near-miss announcements left linked** ("we wanted" vs "we wanted to", "car" vs "the car").
  Present-and-nearly-right beats missing; nulling them would mint 15 TTS jobs for a difference nobody
  notices.
- **7 Portuguese seeds whose own sentence doesn't tile from their own LEGOs** — decision 3.
- **Portuguese forward references**: `problemas` used 121 seeds before it's taught, `disso` 50 seeds,
  `forma` 10. Low severity, single occurrences.
- **Italian's "it" → `questo` class** (59 rows before the enclitic is taught) — scoped precisely by
  the earlier Italian review, still unresolved, still needs a design call rather than a row edit.

---

## Corrections to the earlier sweep, and to myself

**Presentation clips come in three carrier formats, not two.** The coordinator's correction identified
a second format that `scan-course.md` Check 18 misses. There is a third — `por_for_eng` carries
*"The Portuguese for 'X', as in 'Y', is:"* with no colon after "for" and no em-dash, 201 clips of it.
With all three handled, **0 of 7,408 clips are unparsed**. Any course scanned with Check 18 as written
has this blind spot, and the two-format fix does not close it.

**Brazilian presentation drift was never dealt with.** The earlier sweep unlinked 8 severe cases there.
The live count was **45**, including annotation leaks and swapped siblings. European Portuguese had
**22** and got no attention at all. Most of both are now repaired.

**My own first detector was wrong twice, and I hand-checked rather than believed it.** The
gloss-absence detector missed both of its calibration positives, because the copied-out LEGO rows
satisfy it — that failure is what exposed the padding finding. And my contraction sweep flagged 30
dangling USE phrases of which **9 were `encontrar-nos`, `seguir-nos`, `ajudar-me`** — European
Portuguese enclitic pronouns, entirely correct. The hyphen isn't a letter, so it read as a word
boundary. That is the fourth time the word-boundary trap has bitten this sweep.

**One claim of mine that the data refuted.** I predicted `ita_for_eng` S0063 would show a LEGO whose
gloss never appears in its own prompts. It does appear, several times. The detector was right and I
was wrong; recorded rather than quietly dropped.

---

## Explicit gaps

1. **Nothing was verified by ear.** Every audio claim rests on `course_audio.text`, `voice_id` and
   the link structure — not on listening to a single S3 object. A relinked clip is correct *as text*;
   I have not heard one.
2. **The 90 relinks assume the recording matches its own text row.** If a clip's stored text is wrong,
   my repair inherits that error. I did not check `word_boundaries` on the relinked set.
3. **Italian was not re-read by hand.** I trusted the earlier Italian review's 34-seed read and worked
   from its residue. A different 34 seeds would surface classes neither of us saw.
4. **No native speaker read anything.** Italian and both Portuguese judgements are mine and the
   worker's. The Portuguese repairs rest on rows provable from their own siblings, which is the
   weakest dependence on an ear I could arrange, but it is not zero.
5. **I created one shared recording.** Two Brazilian LEGOs both glossed "my" now point at the same
   "The Portuguese for: 'my', is:" clip. Their *targets* differ (`meu`/`minha`) and are separate
   recordings, so the shared carrier is correct for both — but it is a sharing I introduced.
6. **`course_round_index` was not refreshed** after these direct writes, and no learner-facing surface
   was checked. If the app reads the materialised view, the Portuguese text fixes may not show yet.
7. **The estate-wide scope of the padding finding is measured but unread.** I have the per-course rates
   for 62 courses; I hand-read the pattern only in these three.

---

# DECISIONS

## 1. Italian and Portuguese learners hear silence where a voice should introduce a new phrase — 137 of them

Across the three courses, 137 moments where the app should say *"The Italian for 'easier' is:"* are
either silent or say the wrong thing, and there is no existing recording to fix them with. I repaired
90 others for free today; these are the remainder. Italian is worst at 92, and most of its silences
were created yesterday by an earlier sweep correctly removing recordings that said the wrong words.

**My recommendation: generate them.** These are short English carrier sentences, it is the smallest
audio job on the estate right now, and it sits at the exact moment a learner meets something new on
three live public courses.

**Approve / Hold**

*Better × simpler × cheaper:* Better — it restores the introduction on three courses people are paying
for today. Simpler — it is one narrow job with an exact list, not a course-wide re-bake. Cheaper —
137 clips is the entire remaining cost, because relinking already absorbed 90 of the 227 for nothing.

## 2. Our course generator pads a quarter of all practice phrases by repeating the tile back at the learner

When a course teaches a new chunk, the learner should then practise it in new sentences. In these
three courses, 87% of chunks have at least one "practice" phrase that is just the chunk itself,
copied out — 4,172 of them. It happens because the builder must produce a minimum number of phrases,
and copying the tile is the cheapest way to hit that number. Welsh, which was built by hand, does this
in 0.1% of cases; the generated courses run 20–32%, and it is not confined to Italian or Portuguese.

**My recommendation: rule that a practice phrase may never be the chunk alone, and fix the generator
rather than patching courses.** Patching three of sixty-odd courses would breach the phrase floors and
leave the cause running.

**Generator / Courses / Leave**

*Better × simpler × cheaper:* Better — every learner on every course gets a real drill instead of an
echo. Simpler — one change at the point of creation, versus a rewrite pass on sixty courses. Cheaper
— fixing it upstream costs no audio at all, whereas rewriting existing rows would mint thousands of
new recordings for courses that are otherwise fine.

## 3. Twenty Portuguese practice sentences stop dead in the middle, and seven seeds teach words their own sentence doesn't contain

Both Portuguese courses have chunks that end on a word meaning "of the" — so the learner is asked to
say *"you found the path through"*, or *"it wasn't in front of the"*, with nothing after it. Those are
not sentences in either language. All five practice sentences under four separate chunks are like
this, so they cannot simply be deleted — there would be nothing left. Separately, seven European
Portuguese seeds use different wording from the chunks they are supposed to be demonstrating.

**My recommendation: do the repair pass, and where a seed disagrees with its own chunks, change the
seed.** The chunks are five or six mutually-consistent rows each and the seed is one, and the
Brazilian course already had exactly this fixed the same way.

**Do it / Leave**

*Better × simpler × cheaper:* Better — it removes sentences that are wrong in both languages from a
released course. Simpler — changing the single seed row beats rewriting six consistent rows around it.
Cheaper — about 27 rows and roughly 60 clips, and it wants a Portuguese reader on it, which is the
real cost rather than the audio.

---

## Reversibility

Every write today is logged row by row with its previous value, in
`docs/quality-sweep-romance-2026-08-06/itapor-logs/`:

- `relink-applied-log.json` — all 90 relinks, with the recording each LEGO pointed at before.
- `fix-por-applied-log.json` — all 18 Portuguese text edits, old and new.
- `cut-s204-backup.json` — the one deleted row, in full.

No recording was deleted anywhere: 7,408 presentation clips and 46,768 `por_for_eng` clips, before
and after.
