# Spanish build and use phrases: are we following our own one-distinction rule?

An audit of `spa_for_eng` — 668 seeds, 1,475 LEGOs, 5,133 BUILD phrases, 10,072 USE phrases.
Read-only. Nothing in the course was changed.

---

## The short answer

**No, not late in the course — and the reason is not that the phrases are badly written.**

The Spanish and the English in this course are good. A 220-phrase sampled read in both languages
found the prose almost entirely clean. What is wrong is structural, and it has never been measured
before: **late in the course, half the BUILD phrases connect the new LEGO to nothing at all.**

| | early (1–150) | middle (151–400) | **late (401–668)** |
|---|---|---|---|
| BUILD phrases connecting to **nothing** | 36.2% | 39.9% | **50.7%** |
| Mean previous LEGOs per BUILD phrase | 0.99 | 0.91 | **0.62** |
| Distinct partners a new LEGO ever touches | 3.37 | 3.02 | **1.90** |
| LEGOs whose whole BUILD set draws ≤1 edge | 16.6% | 23.0% | **44.5%** |
| LEGOs never re-used as a partner again | 30.4% | 58.1% | **63.3%** |
| BUILD phrases below the floor of 4 | 38.5% | 54.3% | **71.2%** |

Read the fourth row twice. **In the late course, 228 of 512 LEGOs — 44.5% — have three or more
BUILD phrases between them that manage a single connection to the existing graph.** In the early
course that figure is 16.6%. The late course is not producing worse sentences. It is producing
sentences that do less work.

Your suspicion was right, and it was right for a sharper reason than "corners were cut on quality".

---

## What was measured, and how

A new LEGO is a node. Its BUILD phrases are the edges it draws into the graph of everything the
learner already has. Nothing in the estate had ever recorded those edges, so nothing could say
whether we follow our own rule of one new distinction at a time.

The tool computes, for every LEGO in the course: the introduced inventory at that moment — every
LEGO of every earlier seed plus the earlier-indexed LEGOs of its own seed — and then, for each of
its BUILD phrases, which of those previously-introduced LEGOs the phrase actually contains.

It uses **two independent sources and plays them against each other**, because one source cannot
check itself:

- **the builder's own record.** Every phrase already carries a stored tiling that names a LEGO for
  each piece of the Spanish. Nobody had ever aggregated it.
- **an independent match.** A longest-match, non-overlapping tiling of the Spanish against the
  introduced inventory, the way the validator's containment logic thinks about it.

They agree on 70.2% of phrases. Both were wrong when first run, in opposite directions, and both
corrections are in the tool:

- The independent matcher was **shredding a multi-word new LEGO into its older parts**. "el mayor
  tiempo posible" scored four edges when it draws none. The new LEGO's own text is now consumed
  whole before anything else. Unmatched Spanish tokens fell from 5,357 to 438.
- It was also **crediting a whole LEGO when only one of that LEGO's components matched** — the word
  "que" scoring as a connection to "mejor que". A component hit now covers the text without
  counting as an edge.
- The builder's own record **hides taught material**. "Quiero que hables muy bien" stores "muy" and
  "bien" as untiled ghosts, although "muy bien" is a taught LEGO. 27.6% of BUILD phrases have at
  least one ghost that is in fact a taught LEGO, so the builder's own edge count under-reports.

What the matcher still cannot see is stated rather than scored as zero: contractions, clitics fused
onto verbs, and agreement changes. Those land in a named bucket. After the fixes the entire
unaccounted-for residue is 438 Spanish tokens across 5,133 phrases — 0.9% of the text, half of it
ordinary glue. **The counts above are conservative: where the tool cannot see an edge, it does not
invent one.**

---

## The shape of the late-course failure, in the course's own words

This is the pattern, quoted character-for-character from the live database. It repeats 218 times in
the late course.

**S0413L03 — "the edge" / "borde"** (three BUILD phrases, one connection between them)

```
B01  | edge               | borde
B02  | the edge           | el borde
B03  | close to the edge  | cerca del borde
```

**S0412L04 — "we couldn't" / "no podíamos"**

```
B01  | we could           | podíamos
B02  | we couldn't        | no podíamos
B03  | we could do it     | podíamos hacerlo
```

**S0409L02 — "what we do" / "lo que hagamos"**

```
B01  | we do              | hagamos
B02  | what we do         | lo que hagamos
B03  | we do it here      | hagamos aquí
```

**S0404L01 — "before Thursday" / "antes del jueves"**

```
B01  | del                | del jueves
B02  | before Thursday    | antes del jueves
B03  | finish before Thursday | terminar antes del jueves
```

The ladder is always the same: the bare LEGO, then the bare LEGO again with an article or a
negation bolted on, then one real phrase. Three turns of a learner's attention buy one edge. And
`S0404L01B01` prompts the learner with the English word "del", which is not English.

Against that, here is the early course doing the thing properly — **S0003L01, "how" / "cómo"**:

```
B01  | How to speak       | Cómo hablar         -> to speak
B02  | How to learn       | Cómo aprender       -> to learn
B03  | How to speak Spanish | Cómo hablar español -> to speak + Spanish
```

One partner, then a *different* partner, then a combination. That is the rule, and seed 3 follows
it. Seed 413 does not.

### The bare-LEGO opener is a convention nobody wrote down

**1,180 BUILD phrases — 23% of every BUILD phrase in the course — are the LEGO repeated with
nothing added.** They are overwhelmingly the first phrase of the set: 86.5% of all B01 rows are the
bare LEGO, rising to **95.9% in the late course**.

The methodology is explicit that a BUILD phrase is not the LEGO alone. So either the doctrine is
being broken 1,180 times, or the course has a debut-echo convention that was never written down and
never exempted. It matters arithmetically, because it means the effective count is one lower than
it looks:

| | early | middle | late |
|---|---|---|---|
| BUILD phrases per LEGO, as counted | 4.10 | 3.89 | 3.28 |
| BUILD phrases that actually draw an edge | 2.45 | 2.17 | **1.53** |
| LEGOs with fewer than 4 edge-drawing BUILDs | 80.8% | 83.0% | **99.8%** |

Against a floor of four, the late course delivers an average of **1.53** phrases that connect the
new LEGO to anything. 99.8% of late LEGOs are under the floor on that measure. This is the single
number I would put in front of a builder redesign.

---

## Where the partners come from

The distance profile says the edges are not lazily local — 73.7% of connections reach back more than
50 LEGOs, and the median reach in the late course is 488 LEGOs. On the face of it that is your
"LEGO 41 connects with 17, 23, 26 and 4" working.

It is not, quite. Reaching a long way back is what happens automatically when the phrase uses
"quiero" or "no" — the oldest, commonest LEGOs. The distances are long because the partners are the
same handful of ancient high-frequency chunks, not because the builder is deliberately reaching for
a distant LEGO that needs revisiting. The corroborating number is the orphan count: **773 of 1,475
LEGOs, 52.4%, are never re-used as a partner in any later BUILD phrase**, and in the late course
that is 63.3%. The graph is not richly connected. It is a small hub of very old nodes with a long
tail of nodes that are taught once and never combined again.

---

## Is this Spanish, or is it the builder?

**It is the builder.** French was run as a control, same tool, same day, and French is *worse*:

| | spa_for_eng | fra_for_eng |
|---|---|---|
| BUILD phrases connecting to nothing | 42.3% | **55.9%** |
| Mean previous LEGOs per BUILD phrase | 0.84 | **0.53** |
| Distinct partners per LEGO | 2.70 | **1.56** |
| LEGOs never re-used as a partner | 52.4% | **65.6%** |
| Edge-drawing BUILDs per LEGO, late region | 1.53 | **1.23** |

Spanish degrades from early to late. French is already at the late-course level by its middle. So
the agents did not cut corners on Spanish in particular — **the way the builder chooses BUILD
partners degrades as the taught inventory grows, in every course**, and Spanish happens to be the
one where learners said so out loud. That is a better problem to have found, because fixing the
builder fixes every course rather than patching one.

---

## The quality read

_[QUALITY]_

---

## Two claims in the commission that needed checking

**The BUILD self-teaching gate landed tonight was reported to me as having found "120 confirmed
defects". The commit says 39, across six Japanese-prompt courses, and no document in the repo
carries a figure of 120. I could not source it, so I am not repeating it.** The real estate-wide
figure of record is 39.

**For Spanish specifically I ran the sweep myself: 5,133 BUILD rows, 4,667 pass, 0 violations, 466
unchecked** (423 morphology unresolved, 43 no cores). So the gate does cover English-prompt courses
— it is not Japanese-only — and Spanish is clean on it. The gate is working and it is not the thing
that is wrong here.

---

## What this audit did *not* re-find

Of the 174 `spa_for_eng` phrase rows named across the four prior Spanish documents — the two
read-throughs of 25 August, the tiling calibration and the known/target mismatch sweep of 26 August
— **three appear anywhere in the structural classes above.** The overlap is essentially nil. Those
audits were reading sentences; this one is reading the graph. Both are needed and neither
substitutes for the other.

Two further structural counts, new here, that a later pass may want:

- **407 BUILD phrases (7.9%) carry a stored tiling that no longer reconstructs their own text** —
  the phrase was edited and the tiling was never regenerated. This is concentrated brutally in the
  late course: **17.4% there against 2.7% early.** The same figure for French is 0.2%, so this is
  Spanish-specific debris, not a builder property.
- **576 BUILD phrases (11.2%) do not contain their own LEGO's known-side word** — "S0403L03" teaches
  "remain quiet" and prompts "quiet", "more quiet", "stay quiet". That is a *different* miss from
  the one tonight's gate catches, and the gate passes all of them.

---

## Gaps, stated plainly

- The quality read is a **sample**, not a census: 220 phrases of 15,205, stratified by region and
  role. Sampling error on a per-region tier rate at n=60 is roughly ±5 percentage points. The
  structural counts, by contrast, are a **full census** of all 5,133 BUILD rows.
- The matcher's residue — 438 unaccounted Spanish tokens, 0.9% — is not zero. Where it cannot
  attribute a token it declines to count an edge, so every edge count here is a floor.
- **USE phrases were graded for quality but not edge-mapped.** BUILD phrases are where the
  one-distinction rule lives, so that is where the tool looked. USE edges are a real and unmeasured
  question.
- The bare-LEGO opener needs a ruling before anyone counts it as 1,180 defects or as 1,180
  legitimate debut echoes. I have counted it separately throughout rather than deciding for you.

---

## The position

**Is the one-distinction rule being followed?** Partly, and by accident rather than by design.
38.3% of BUILD phrases draw exactly one edge, which sounds like the rule working — but 42.3% draw
*none*, and that number is the rule failing in the other direction. The intended ladder is one
partner, then a different partner, then a third. What the course actually produces is: the LEGO
alone, the LEGO alone again, then one partner. The rule is not being violated by dumping four
distinctions at once — only 1.1% of phrases do that. It is being violated by **teaching nothing at
all in three phrases out of five**.

**Is the late course materially worse?** Yes, decisively, and on one metric above the others:
**edge-drawing BUILD phrases per LEGO, 2.45 early against 1.53 late.** Everything else follows from
it. Notably it is *not* worse on prose quality, where the sample found no regional signal, and *not*
worse on the one-edge rate, which is flat across regions. If you fix one number, fix that one.

**What should edge-selection by least action optimise for?** Three candidate rules, each with the
number from this audit that argues for it:

1. **Ban the zero-edge BUILD phrase, and count the floor in edges rather than in rows.**
   The floor of four is currently met by rows, and 1,180 of those rows are the LEGO talking to
   itself. Counted in edges the late course delivers 1.53 against a floor of 4, and 99.8% of late
   LEGOs are non-compliant. This single change makes the existing floor mean what it was always
   supposed to mean, and it needs no new doctrine — only a new denominator.

2. **Require the partners across a LEGO's BUILD set to be DISTINCT.**
   44.5% of late LEGOs draw at most one edge across their entire BUILD set; 32.8% touch exactly one
   distinct partner ever. Your dictated rule is "one previous LEGO, and then a *different* previous
   LEGO, and then maybe a third" — the word doing the work is *different*, and nothing in the
   builder currently asks for it. A rule of "three BUILD phrases, three distinct partners" is
   directly checkable against the data this tool already produces.

3. **Spend one edge per LEGO on a node that has not been touched since its own debut.**
   52.4% of LEGOs are never re-used as a partner, rising to 63.3% late. Least action says the most
   valuable edge is not the cheapest one — it is the one that does double duty, introducing the new
   node while re-activating a node that is going cold. The builder currently reaches for whatever is
   frequent, which is why the partner hub is a handful of very old chunks. Choosing one partner from
   the never-re-used set would convert a dead node into a live one at no extra cost in phrases.

Rules 1 and 2 are mechanical and can be enforced at submission time by the gate that already runs.
Rule 3 needs the builder to hold the inventory's usage history, which this tool now computes.

---

## One question for you

The 1,180 bare-LEGO BUILD phrases — "edge / borde", "we could / podíamos", "twenty / veinte".

Are they a legitimate debut echo, or are they 1,180 wasted turns?

My recommendation: **legitimate as B01 only, and never counted towards the floor of four.** They
give the learner one clean look at the new chunk before it has to work, which is worth a turn, and
95.9% of late B01 rows are already this shape so the convention is entrenched. But they teach no
edge, and letting them count towards the floor is exactly what allows a LEGO to ship with 1.53
real BUILD phrases and look compliant.

One word: **keep**, **cut**, or **keep-uncounted**.
