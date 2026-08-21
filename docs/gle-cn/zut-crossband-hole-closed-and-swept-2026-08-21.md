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
  particle-absent alternation, the same shape as *to ask you*. Real but minor.
- ***I*** and ***you*** — glossed as the present form at seeds 1, 163 and 20, and as the **past**
  form at seeds 30 and 31. Real: a bare pronoun prompt cannot select a tense.

At **raw, case-sensitive** comparison there are **twelve** splits, because the normalised view
lowercases. The extra two are capitalisation-only — but the server compares these fields **raw**, so
a capitalisation-only split is a live gate risk, not a cosmetic nothing. Three units glossing
*I wanted* differ only in an initial capital.

### The 74 repeated phrase targets, triaged

Your measurement — 67 strings and 91 excess rows — has grown while the four live workers built; it
now reads **74 distinct strings, 103 excess rows**. Flat, that number reads far worse than the course
actually is. Split by kind:

| Kind | Groups | What it is |
|---|---:|---|
| **REAL-DUP** | **23** | Same Irish **and** same English, in seeds far apart. **The learner is taught the identical sentence twice.** This is the category that needs a ruling. |
| KNOWN-SPLIT | 21 | One Irish, two different English prompts. Legal — the one-prompt-one-target rail governs the English→Irish direction, not the reverse — but worth a look. |
| CHUNK | 28 | The repeated target **is itself a taught unit or component**. A bare-chunk drill, not a repeated sentence. **Benign** — this is the category you suspected. |
| ADJACENT | 2 | Same sentence in consecutive seeds. Normally a deliberate carry-over. |

So of 103 excess rows, **the great majority are benign**, and the real problem is **23 sentences
taught twice**. Both examples you named are in that 23 and are confirmed real: *what are you looking
for* at seeds 68 and 194 (twice over — the bare question and its *now* variant), and *can you come
back* at seeds 150 and 161. The heaviest clusters are seeds **184 and 216** and seeds **110 and
219**, which share **three** sentences apiece; seeds 23/28, 212/231 and 68/194 share two each.

One caution on the 21 KNOWN-SPLIT groups: **most of them are the want/trying alternation** — the same
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

Four workers were building throughout. Between my first audit and my last, the course grew by 25
units and 209 phrases. **No new known-side split arrived** — still ten normalised, twelve raw. **One**
new repeated target landed, and it is a benign bare-chunk drill. Nothing that arrived while I worked
needs anyone to fight anyone.

**No gaps.** Every unit, component and practice phrase in the course was read and checked; nothing
was sampled, capped or skipped.

**TTS: zero.** All three Irish courses held zero audio rows before I started and zero after. Nothing
was rendered and nothing was spent.
