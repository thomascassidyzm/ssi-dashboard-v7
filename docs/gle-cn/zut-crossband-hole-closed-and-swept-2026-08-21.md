# The cross-band collision hole, closed — and what had already got through

**Course:** gle_cn_for_eng · **21 Aug 2026** · zero TTS spent, zero clips touched

---

## Part 1 — the hole, and the fix

There were **two** holes, not one, and between them they account for every cross-band collision in
this course.

**Hole 1 — a new teaching unit is compared against earlier UNITS only.** The lego conflict check
reads the lego table and nothing else. A new unit could therefore be handed the same English as a
**practice phrase** written an hour earlier and nothing anywhere objected. That pairing — unit
against phrase — had no gate at all, in the server or in either local pre-checker.

**Hole 2 — every check was filtered to seeds BELOW you.** A clean local pass meant only "consistent
with what is underneath me". Four workers on non-contiguous bands are blind to each other *by
construction*: a clean check at seed 68 says nothing whatsoever about seed 194 being written at the
same moment.

Hole 2 also explains collisions that look impossible. Two units at seeds 60 and 85 both gloss
*I don't know*, one as *I don't know a fact*, the other as *I don't know a person* — and the
existing gate should have caught that, since 60 comes before 85. It didn't, because the bands were
built **out of order**: when 85 was written, 60 did not yet exist, and when 60 was written the gate
only looked downwards and never saw 85. The same shape produced the *to read* pair at seeds 180 and
239 and the *doing* pair at 72 and 100.

**The fix** checks every submitted unit gloss **and** every submitted phrase prompt against the
English of **all** units and **all** practice phrases, **course-wide — above and below** — plus
against the rest of the same submission. It is **committed into the tools tree**, not left in the
gitignored scratch area, which is exactly the mistake that cost the overnight shift hours. Both
existing pre-checkers now call it, so any worker who runs either one already has it, and it names
which side of you the collision is on so a hit from a parallel band above is obvious rather than
baffling.

One instruction for the four workers currently building: **re-run it immediately before posting, not
once at the start of the seed.** The collision you are racing is a phrase someone else banks while
you are still writing.

It also runs as an audit over what is already banked — that is what produced Part 2.

---

## Part 2 — the sweep

### The strings, as measured — not as quoted

Every string below was read from the database, so the fadas are the course's own:

| | Seeds | Irish | English |
|---|---|---|---|
| duplicate | 68, 194 | `céard atá tú a chuartú?` | *what are you looking for?* |
| duplicate | 68, 194 | `céard atá tú a chuartú anois` / `…anois?` | *what are you looking for now* / *…now?* |
| duplicate | 150, 161 | `an bhfuil tú in ann teacht ar ais` | *can you come back* |
| split | 21 / 25 | `a bhfuil tú` / `an bhfuil tú` | *are you* |
| split | 212 / 231 | `Ba mhaith liom cabhair a iarraidh` / `ba mhaith…` | *I'd like to ask for help* |
| split | 208 / 119 / 223 | `fiafraí díot` / `a fhiafraí díot` / `fhiafraí díot` | *to ask you* |

Two notes the raw strings make visible. The first *chuartú* pair at 68 and 194 is **byte-identical on
both sides** — the same sentence, the same prompt, twice. The second differs **only by a question
mark**, on the Irish and on the English alike, which is a duplicate wearing a disguise rather than
two sentences. And `an bhfuil tú in ann teacht ar ais` is byte-identical at 150 and 161 too.

On *to ask you*: the database holds **three** forms, not the two in the brief. The third is the
teaching unit at seed 208, `fiafraí díot`, bare with no particle and no lenition.

### The three known-side splits — all three verified, one is cosmetic

**1. "are you" — REAL, and the fix is not to touch the Irish.**
Seed 21 teaches it as the indirect form inside *why are you*; seed 25 teaches the direct
interrogative inside *are you going to*. **Both are correct Irish in their own frames** — Irish
requires the indirect form after *why*, and the direct form at the head of a question. The defect is
that both seeds also split *are you* out as a **standalone component**, and a learner drilled on that
component alone has one English prompt and no way to choose between two Irish forms. The repair is an
upchunk — drop or re-gloss the seed-21 component and let the direct form be the one true *are you* —
**not** a rewrite of either sentence.

**2. "I'd like to ask for help" — COSMETIC.** Seeds 212 and 231 differ by a single sentence-initial
capital letter and nothing else. But it is cosmetic on top of something that is not: those same two
rows are **also a genuine duplicate**, the identical sentence taught twice, and appear again in the
list below. Fixing the capital fixes the smaller of the two problems.

**3. "to ask you" — REAL, and there are THREE forms, not two.** Seed 208 teaches the bare verbal
noun; seed 119 teaches it with the object particle and lenition; seed 223 has it **lenited with no
particle at all**. The first two are each well-formed in their own frame — the particle appears
because the object is fronted — so they collide on the English gloss and need an upchunk to separate
them. The third is a straightforward **mis-segmentation**: the particle was assigned to the
neighbouring chunk, leaving behind a fragment carrying lenition without its trigger, which is not a
well-formed Irish chunk standing alone. **I have not touched seed 223** — it sits on the *going to*
construction that is under the standing containment freeze and is Kai's call.

### Seven more splits nobody had counted

The audit found **ten** normalised known-side splits, not three, because it is the first check to
look at units and phrases together across the whole course. Beyond the three above:

- ***I know*** — *know a fact* at seed 59 versus *know a person* at seed 230. Real, and the most
  worth fixing: it is a classic sense split that needs the English prompts differentiated.
- ***I don't know*** — the same fact/person split, seeds 60 and 85. Real.
- ***doing*** — the progressive form at seeds 72 and 114 versus the verbal-noun-object form at 100.
  Real; needs an upchunk.
- ***to change*** (104 / 188) and ***to read*** (180 / 239) — the particle-present versus
  particle-absent alternation, the same shape as *to ask you*. Both are REAL, and *to read* is
  adjudicated in full in the addendum at the foot of this document — where "minor" turns out to be
  the wrong word, and *to change* is shown to be the same break.
- ***I*** and ***you*** — glossed as the present form at seeds 1, 163 and 20, and as the **past**
  form at seeds 30 and 31. Real: a bare pronoun prompt cannot select a tense.

At **raw, case-sensitive** comparison there are **twelve** splits, because the normalised view
lowercases. The extra two are capitalisation-only — but the server compares these fields **raw**, so
a capitalisation-only split is a live gate risk, not a cosmetic nothing. Three units glossing
*I wanted* differ only in an initial capital.

### The repeated phrase targets, triaged

Your measurement — 67 strings and 91 excess rows — has grown while the four live workers built; it
now reads **80 distinct strings, 109 excess rows**. Flat, that number reads far worse than the course
actually is. Split by kind:

| Kind | Groups | What it is |
|---|---:|---|
| **REAL-DUP** | **25** | Same Irish **and** same English, in seeds far apart. **The learner is taught the identical sentence twice.** This is the category that needs a ruling. |
| KNOWN-SPLIT | 24 | One Irish, two different English prompts. Legal — the one-prompt-one-target rail governs the English→Irish direction, not the reverse — but worth a look. |
| CHUNK | 29 | The repeated target **is itself a taught unit or component**. A bare-chunk drill, not a repeated sentence. **Benign** — this is the category you suspected. |
| ADJACENT | 2 | Same sentence in consecutive seeds. Normally a deliberate carry-over. |

So of 109 excess rows, **the great majority are benign**, and the real problem is **25 sentences
taught twice**. Both examples you named are in that 23 and are confirmed real: *what are you looking
for* at seeds 68 and 194 (twice over — the bare question and its *now* variant), and *can you come
back* at seeds 150 and 161. The heaviest clusters are seeds **184 and 216** and seeds **110 and
219**, which share **three** sentences apiece; seeds 23/28, 212/231 and 68/194 share two each.

One caution on the 24 KNOWN-SPLIT groups: **most of them are the want/trying alternation** — the same
Irish glossed *I want to* in one seed and *I'm trying to* in another, across seeds 1/2, 18/102,
19/50, 20/67, 47/50 and 149/277. That is the **"try" ruling**, which two other workers own, and I
have deliberately stayed off it. Whoever rules on *try* should expect those groups to resolve as a
side effect, and should not be surprised to find them in this list.

### What I did not do

I have triaged and reported; **I have not mutated any content**. Every remaining decision here is a
methodology ruling — whether to upchunk *I know*, which of the twenty-three duplicates to drop and
which to keep — and those are Kai's to make, not a sweeper's. Say the word and the repairs are
mechanical from this list.

---

## Re-measured at the end

Four workers were building throughout. Between my first audit and my last, the course grew by **40
units and 290 phrases** — 698 units and 5,657 phrases at the start, 738 and 5,989 at the end.

**No new known-side split arrived** — still ten normalised and twelve raw, unchanged across the whole
session. Repeated targets went from 73 distinct strings to 78, and the five arrivals are **all
benign**: four bare-chunk drills and one one-Irish-two-English group. **The count that matters did not
move — still exactly 23 sentences taught twice.** Nothing that arrived while I worked needs anyone to
fight anyone.

**No gaps.** Every unit, component and practice phrase in the course was read and checked; nothing
was sampled, capped or skipped.

**TTS: zero.** All three Irish courses held zero audio rows before I started and zero after. Nothing
was rendered and nothing was spent.

---

# Addendum — the "to read" break at unit level

Handed to me after the sweep above. It is inside remit and the brief was right that I would not
have surfaced it from a phrase-level lens — though my course-wide audit had in fact already caught
it, filed under "real but minor". Having now measured it properly, **"minor" was wrong**, and the
reading in the brief needs inverting.

## Neither Irish form is wrong, and they are not alternatives

The two units are:

- seed 180, unit 2 — *to read* → `a léamh`
- seed 239, unit 2 — *to read* → `léamh`

I read all 33 practice sentences in the course containing either form. They are in **perfect
complementary distribution, with not one counterexample**:

- `a léamh` occurs **only** where an object comes first — `mo leabhar a léamh`, `an leabhar sin a
  léamh`, `tada a léamh`.
- bare `léamh` occurs **only** where there is no object — `is maith liom léamh`, `tá mé ag iarraidh
  léamh`, `in ann léamh`, `ní maith le m'athair léamh`.

That is ordinary Irish: the verbal noun takes the particle `a`, with lenition, when its object is
fronted, and stands bare when there is no object. **So the question "which form should the course
use" has no answer — it needs both**, and swapping either one for the other would produce Irish that
is simply wrong.

I checked the same thing on `athrú`, which has the identical split, across roughly fifty more
sentences: `a athrú` always with a fronted object (`rud eicínt a athrú`, `an freagra a athrú`,
`cruth m'inchinne a athrú`), bare `athrú` always without (`ní gá dom athrú`). Again no
counterexamples.

## The corpus agrees, but only if you read the lines

Against the National Corpus of Irish, on the decisive frame — fronted object, particle present
versus absent:

| | occurrences |
|---|---:|
| `leabhar a léamh` | **306** |
| `leabhar léamh` | 3 |
| `rud a athrú` | **38** |
| `rud athrú` | 3 |

All six of the apparent counterexamples dissolve on inspection: they are the *noun* `léamh`
("a reading") or an intransitive `athrú` ("everything could change"), not a particle-less fronted
object. Ó Curnáin's Connemara grammar independently flags a particle-less example as doubtful, in
his words a speaker who "changed in mid-sentence".

Two measurement traps worth recording, because both would have produced a confident wrong answer.
A plain substring count of `athrú` in Ó Curnáin returns 180 — but most of those are `ceathrú`
("quarter") and `fiathrú`; with word boundaries it is 53. And raw corpus bigram counts *look* like
both forms appear in both frames until you read the concordance lines, at which point every
apparent exception turns out to have its object fronted a few words further left.

## Which is the deviation — the opposite of the reading in the brief

The brief's expectation was that seed 239, being later, is the deviation. **The measurement says the
reverse.** `léamh` at 239 genuinely means *to read*, and every sentence built on it is correct.
`a léamh` at 180 never means bare *to read* — it means *to read* **it**, with the object already
spoken. Seed 180 carries the wrong English, and 239 is innocent.

Seed 35 settles it. `tada a léamh` → *to read anything* is the **earliest** of the three, and it is
**correct**: it puts the object into the English, so the particle in the Irish is earned. Seed 180
broke a pattern seed 35 had already set, and seed 239 was never part of the break. The brief was
right to fence seed 35 off, and the reason is stronger than "different gloss" — it is the model the
other two should have followed.

**Cosmetic or real: real.** But real **in the English only**. No Irish anywhere in the course needs
to change, and no practice sentence needs rewriting.

## This is a family, not a one-off

**29 units** in the course teach a particle form `a X`. Five of them also have the bare form taught
as its own separate unit. Of those five:

- **2 collide outright** — *to read* (180 vs 239) and **`to change`, `a athrú` at 104 versus `athrú`
  at 188**, which is the identical break and is not yet on anyone's list.
- 3 escaped only because the English happened to differ — *to speak* / *speak*, *to explain* /
  *explain*, *understand* / *to understand*. That differentiation is ad hoc, and in one case it is
  inverted relative to the other two.

So this is not two bad rows, it is **a missing convention** for glossing the fronted-object verbal
noun. Whatever is decided for *to read* should be applied to *to change* in the same breath, and
written down, or the next particle unit will collide too.

## Blast radius — measured before writing anything, and it is one field

I have written **nothing**. The recommended repair is to re-gloss seed 180's unit from *to read* to
**"to read it"**, leaving both Irish forms untouched.

- **Phrase ids are position-derived, not text-derived** — they are built from seed number, unit
  index, role and position. Editing a unit's English therefore **reissues no phrase ids at all**.
  The expensive case the brief was rightly worried about is a unit *rename or reindex*; a gloss edit
  is not that.
- **The 8 practice sentences under seed 180 unit 2 need no change.** Every one already carries the
  object in its English — *I'd like to read my book*, *I want to read that book*. They were always
  consistent with the Irish; only the unit's own gloss was not.
- **Across the whole window between the two units, only 9 sentences involve reading at all** — the 8
  above plus one at seed 181, which also already carries its object. (A naive search returns 14; five
  are the word *ready*.)
- **Only two units in the entire course are glossed exactly *to read*** — the two in question. There
  is no third dependency.
- **The proposed gloss needs no new convention**: seed 37 already teaches *to think about it* →
  `ag smaoineamh air`, the same device of putting *it* in the English to mark an object-bearing
  form. The word *it* appears in 36 unit glosses and 547 sentences before seed 180, so it is
  thoroughly licensed.

**Total: one field, on one row.** Zero Irish edits, zero sentence rewrites, zero ids reissued, zero
audio — the course has none.

The equivalent fix for *to change* would be the same shape and the same size, but I have not assumed
the ruling extends there; that is one decision, not two.

## One more thing the sweep caught while this was being measured

Two identical sentences — *I like to be talking with people* and *I want to be talking with people*
— were banked at **seed 286** having already been taught at **seed 88**, during this session, by one
of the live workers. That took the twice-taught count from 23 to **25**.

The phrase-aware check would **not** have stopped them, and that is worth being plain about: it
hunts one English pointing at **conflicting** targets, whereas a duplicate is one English pointing at
the **same** target twice. Same family of defect, and it had no gate of its own. **I have added one**
— the pre-submit tool now warns when a submitted sentence of four words or more is already taught
elsewhere in the course. It warns rather than fails, because a sentence equal to a taught chunk is a
legitimate debut row.

## Counts at close

Still **10** normalised known-side splits and **12** raw, unchanged all session. Repeated targets are
now 80 strings and 109 excess rows; the twice-taught count is **25**, the two arrivals named above.
The course grew from 698 units and 5,657 phrases to **746 and 6,045** while all of this ran.

**TTS: zero.** All three Irish courses hold zero audio rows, before and after, as they did at the
start.

---

# Part 2, finished — the duplicates repaired

The earlier document triaged and did not repair. This section is the repair.

## What the repair had to be, and why it is not deletion

Of the 27 unambiguous cross-seed duplicates — the ones whose English is identical once case and a
trailing question mark are set aside — **exactly one** could have been deleted without consequence.
**Twenty-one sat on a teaching unit already at the floor** of three BUILD and five USE sentences, so
removing the duplicate row would have dropped the unit under the gate. That is the "remove or remap"
fork, and at the floor it resolves to remap.

That turns out to be the right answer for a second and better reason. **A practice sentence's id
encodes its slot** — seed, unit index, role, position — and progress is filed under the slot, not the
text. Deleting a row **orphans a slot**; editing its text **preserves one**. So the non-destructive
repair is to rewrite the later duplicate, and deletion is the destructive option. I therefore
rewrote all 22 rather than deleting even the one that could have gone.

**Nothing was deleted. No id was reissued. No unit was touched.**

## A warning about doing this automatically

My first pass generated replacements mechanically, by appending an already-taught tail to the
duplicate sentence. **All of them passed every gate — and several were nonsense**: *what are you
looking for now now?*, *I saw that book now*, *I want to relax now now*.

The gates check tiling, vocabulary, containment, known-side licensing and ZUT. **None of them can
tell good English from bad.** I threw that batch away and hand-wrote all 22, then validated each
against the same gates. Recording it because the automated route looks like it works right up until
you read the output.

I also re-read every affected basket *after* the repair, which caught two things the gates passed:
two USE sentences at seed 194 had become restatements of that unit's own BUILD rows — and USE is
supposed to buy a new pattern, not repeat one — and seed 216 had ended up with two sentences ending
*on the table*. Both were rewritten again.

## The 22 repairs

| Slot | was | now |
|---|---|---|
| S0028L02B01 | I want to start talking | he wants to start talking |
| S0028L02B02 | I'd like to start talking | we want to start talking |
| S0057L05B01 | to say a few words | to say a few words with you |
| S0057L05B02 | to say something in Irish | to say the answer |
| S0067L02B01 | I don't want to stop | we don't want to stop |
| S0067L02B03 | you want to stop | he wants to stop |
| S0140L01B01 | I'm sorry today | I'm sorry this evening |
| S0161L01B04 | can you come back | can you stop |
| S0167L01B02 | I want to do something | I'd like to do something else |
| S0193L01B02 | I'm sorry but I don't want to stop | I'm sorry but I'm not able to stop |
| S0193L01U03 | I'm sorry but I'm not sure | I'm sorry but I'm not ready |
| S0194L01U01 | what are you looking for? | can you look for that book? |
| S0194L01U02 | what are you looking for now? | I'm not sure if I can look for the answer |
| S0216L01B02 | I saw that book | I saw my book |
| S0216L01U02 | I saw that book last week | I saw my book this evening |
| S0216L01U03 | I saw someone else this evening | I saw someone else last week |
| S0219L02B01 | I want to relax | he wants to relax |
| S0219L02B02 | I'd like to relax | we want to relax |
| S0219L02U01 | I want to relax now | I'd like to relax for a while |
| S0222L01B03 | can you tell me | can you tell me now |
| S0231L03B01 | I want to ask for help | he wants to ask for help |
| S0231L03B02 | I'd like to ask for help | we want to ask for help |

In every case the **earlier** seed keeps the sentence and the later one changes, so the seed that
established the pattern is left alone.

## The three numbers, before and after

| | before | after |
|---|---:|---:|
| repeated practice-sentence targets | 80 | **58** |
| excess rows | 109 | **87** |
| twice-taught sentences (the count that matters) | 25 | **5** |
| known-side splits (normalised) | 10 | 10 |
| known-side splits (raw) | 12 | 12 |

The **five** remaining twice-taught sentences are all in live worker bands, listed below. The
known-side splits did not move because **every one of them needs a ruling** — they are the category I
was told not to touch. The raw count stayed at 12 rather than falling to 11 because I repaired one
(*I'd like to ask for help*) and a live worker banked a new capitalisation split at seed 288 while I
worked.

Measured against a course that grew from 746 units to **766** and from 6,045 sentences to **6,151**
while this ran.

## What I deliberately did NOT touch — the list for Kai

1. **Five duplicates inside live worker bands** — seeds 30/204, 59/277, 88/286 (two), 139/274.
   *Needs:* not a ruling, just coordination — a worker is in those seeds now and I will not edit
   under them.
2. **"to read": `a léamh` at 180 versus `léamh` at 239** — and **"to change": `a athrú` at 104 versus
   `athrú` at 188**, the identical break. *Needs:* a decision on how the course glosses a
   fronted-object verbal noun. Both Irish forms are correct and neither can be dropped; the fix is one
   field on seed 180, but the convention is yours to set, and it should be set once for both.
3. **"to ask you" — three forms at 208, 119 and 223.** *Needs:* an upchunk ruling to separate 208 from
   119. Seed 223 additionally sits on the frozen *going to* construction.
4. **"are you" — `a bhfuil tú` at 21 versus `an bhfuil tú` at 25.** *Needs:* an upchunk ruling. Both
   are correct Irish in their own frame; the defect is that both seeds also split the fragment out as
   a standalone component.
5. **"I know" / "I don't know" — know-a-fact versus know-a-person**, seeds 59/230 and 60/85.
   *Needs:* the English prompts differentiated. This is the one I would fix first.
6. **"doing" — `ag déanamh` at 72 and 114 versus `a dhéanamh` at 100.** *Needs:* an upchunk ruling.
7. **"I" and "you" glossed as both present and past** — seeds 1, 163, 20 versus 30, 31. *Needs:* a
   ruling; a bare pronoun prompt cannot select a tense.
8. **Three capitalisation-only splits at raw level** — *I wanted* (units at 30 and 204/246), *likes*
   (288), and one sentence at 30/204. Cosmetic, but the server compares raw so they are live gate
   risks. *Needs:* nothing but a moment — **except that all three are inside live worker bands**, which
   is the only reason I left them.

Items 2 through 7 all touch **teaching units**, not sentences. None was attempted.

**TTS: zero.** All three Irish courses hold zero audio rows, before and after.
