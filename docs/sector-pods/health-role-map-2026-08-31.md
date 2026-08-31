# The health role map

**Measurement only — 2026-08-31.** Every one of the 438 turns in Aran's health corpus read and
classified by hand; the arithmetic below is over that classification. Nothing here executes
anywhere: no course content authored, no DB touched, not one line of Aran's corpus edited.

Source: `docs/sector-pods/source/health-sector-conversations-v3.md` @ `eb7222dfc`
(branch `origin/docs/aran-health-sector-conversations`, 704 lines, not on main).

---

## One page — the verdict

**Are the roles separable in the material, or only in the brochure?** In the material — but not the
three roles that were named.

1. **General is not a third role. It is a strict subset of nurse.** All 85 turns a general
   health worker would produce are also nurse turns — 100%, not 90%. Nothing authored for
   general is ever re-authored for nurse; general *is* the first 51% of the nurse walk.
   That kills one of the three candidates outright, and it kills it in the cheapest possible way.
2. **Nurse and doctor are genuinely separate.** Only 44 of 219 professional turns (20%) are
   producible in all three roles. 53 turns are doctor-only, 27 are nurse-only. The brochure claim
   is honest — which is the expensive answer, not the cheap one.
3. **The two of them exhaust the corpus.** Nurse (166) ∪ doctor (151) = 219 = every professional
   turn, overlapping on 98. So doctor costs **+53 turns on top of nurse (+32%)**, not +151.
4. **Role assignment is NOT deterministic.** The corpus carries no per-turn role label at all, and
   only 15 of 219 professional turns (6.8%) name a role in their own text. 80 turns (36.5%) fall
   out of the Part heading; **139 (63.5%) needed a human call.** The residue is coherent, not
   scattered: it is exactly "everything that is not a scope-locked clinical procedure".
5. **Nobody had looked at the patient. The patient is the strongest single-role candidate in the
   file.** 219 turns already written, half the words of the professional side, and every one of the
   14 safety-critical lines sits in the *patient's* mouth — meaning in the professional walk they
   are comprehension targets, and in the patient walk they are production targets.

**My verdict on Tom's default (general only for v1): it stands, with one correction and one
addition.** The correction: call it what it is — the ward-floor walk, the first tranche of nurse,
not a separate authoring line. The addition: the second role should be **patient**, not nurse and
nowhere near doctor. Argued in §7.

---

## 1. The projections, with counts and overlap

Method: for each of the 219 healthcare-worker turns I asked *would a learner working in this role
need to produce this turn, essentially as written* (allowing only the swap of a self-identifying
role word). G = general health worker / HCA / ward assistant. N = registered nurse. D = doctor.

| Bucket | Turns | % of 219 |
|---|---|---|
| all three (G∩N∩D) | **44** | 20.1% |
| nurse + doctor, not general | 54 | 24.7% |
| general + nurse, not doctor | 41 | 18.7% |
| general only | **0** | 0% |
| nurse only | 27 | 12.3% |
| doctor only | 53 | 24.2% |

| Projection | Turns | Words | Word types |
|---|---|---|---|
| **General** | 85 | 1,616 | 397 |
| **Nurse** | 166 | 3,120 | 617 |
| **Doctor** | 151 | 2,944 | 594 |
| Nurse ∪ doctor | 219 | 4,215 | 742 |
| **Patient** | 219 | 2,189 | 601 |

Pairwise: **G∩N = 85 = 100% of general** (containment, not overlap) · G∩D = 44 = 51.8% of general,
22.9% of their union · **N∩D = 98 = 64.9% of doctor, 44.7% of their union.**

### What is shared — the 44-turn three-way core

The whole of §1.0 and §2.0 (the linguistic openers, 30 turns), the whole of §1.1 (names and first
meeting, 9), and the pain question itself (5 turns from §1.4). Attested:

> **#1** §1.0 Welsh flow 1 *(happy path)* — "I'm learning Welsh at the moment, so I'll try to stay in
> Welsh as much as possible, but if we get stuck I might need to ask you to speak English, if that's
> okay."
>
> **#49** §1.1 flow 3 *(human moment)* — "Hello, my name's Siân, I'm looking after you today. What
> would you like me to call you?"
>
> **#91** §1.4 flow 1 *(happy path)* — "How's your pain at the moment? On a scale of nought to ten,
> with ten the worst you can imagine? Would you like something for it?"

Note what the core is: it is *arrival* language. Declaring the medium, giving your name, asking how
someone is. Nothing clinical survives into all three roles except the pain question.

### What separates them — the turns that do the work

**Doctor-only (53).** §2.4 examination, §2.5 explanation, §2.6 test ordering, §2.7 prescribing,
§2.9 results, §2.10 ward round. These are not register differences; they are speech acts only a
doctor performs:

> **#319** §2.4 flow 2 *(safety-critical ⚠)* — "Now I'm going to press on your tummy - tell me if
> anything hurts."
>
> **#367** §2.7 flow 1 *(happy path)* — "I'm going to give you a course of antibiotics. Take one
> twice a day, morning and evening, and finish the whole course even if you feel better."
>
> **#409** §2.9 flow 2 *(question - how high)* — "It was 48. We like under 42, and diabetes starts at
> 48 - so you're right at the doorstep."

**Nurse-only (27).** The drug round (§1.5, all 9 turns), analgesia decisions, pre-op preparation
(§1.10), and — decisively — every turn that refers to the doctor in the third person:

> **#109** §1.5 flow 1 *(happy path)* — "Here are your tablets for this morning. Have you got some
> water there? Just the two white ones now, the other one's after lunch."
>
> **#105** §1.4 flow 3 *(safety-critical ⚠)* — "There are different ones we can try - I'll speak to
> the doctor about something gentler on your stomach."
>
> **#199** §1.10 flow 1 *(happy path)* — "Nothing to eat or drink after midnight, alright? They'll
> come for you about nine. You'll need to take your jewellery off and pop this gown on."

**General-and-nurse but not doctor (41).** §1.2 settling in, §1.3 observations, §1.7 meals, §1.8
mobility, §1.9 comfort round. The ward floor:

> **#55** §1.2 flow 1 *(happy path - valuables)* — "Let's get you comfortable. This is your call bell,
> press it any time you need us. The bathroom's just through there."
>
> **#181** §1.9 flow 1 *(happy path - small requests)* — "Just checking in on you. Are you
> comfortable? Do you need the toilet? Can I get you anything before I go?"

### On "if they share ninety per cent, that kills two of three"

They do not share ninety per cent, so that test does not fire — **except between general and nurse,
where the figure is a hundred.** General is killed as an independent role by containment, and it is
killed cleanly: shipping it costs nothing that nurse would not also need.

### The measurement that undercuts an easy "just merge them"

Vocabulary overlap between the nurse and doctor projections is **50.4% of word types** — but
**4.9% of 3-word sequences and 2.7% of 4-word sequences.** The two roles share their *words* and
share almost none of their *sentences*. Since pods never cut below a phrase (Tom's ruling), the
figure that governs authoring cost is the phrase figure, not the vocabulary figure. The roles are
cheap at LEGO level and expensive at pod level.

---

## 2. Is role assignment deterministic? No — 63.5% of it is a human call

**The corpus carries zero per-turn role names.** Every turn is `**HW:**` or `**P:**` — 219 each,
perfectly alternating, HW-initial in all 73 flows. The nurse/doctor distinction is carried entirely
by the Part heading. This is the *opposite* of the health calibration read's finding, and I am
recording the disagreement plainly: that read concluded "the speaker's role name is the reliable
mechanical signal". **In this corpus there is no speaker role name to be reliable.** The finding
does not transfer; the calibration read was working from the pod files, not from v3.

**The only in-text signals** are 15 turns (6.8%) that name a role in the third person or self-identify:

- 8 turns exclude the speaker from being the doctor: *#71, #77, #105, #117, #131, #135, #161, #207*
  — e.g. **#77** §1.3 flow 1 — "It's 135 over 80 today - much better. **The doctor** will be pleased
  with that."
- 4 turns exclude the speaker from being the nurse: *#349, #359, #361, #413* — e.g. **#349** §2.6
  flow 1 — "I'd like to send you for a blood test... **The nurse** will do it today."
- 2 turns self-identify as nurse: **#37**, **#43** — "Hello, my name's Siân, **I'm one of the
  nurses** looking after you today."
- 1 is neutral (**#219**, "the district nurse will call on Thursday").

**The split.** Taking the Part heading as the mechanical rule (Part 1 → nurse, Part 2 → doctor):

- **80 turns (36.5%) are mechanical** — 27 nurse-only in Part 1, 53 doctor-only in Part 2. The rule
  and the reading agree.
- **139 turns (63.5%) required a call** — every turn where the reading found a role the Part heading
  cannot see. Distribution: §1.0 (18), §1.8 (9), §1.9 (9), §1.1 (9), §2.0 (12), §2.1 (9), §2.2 (9),
  §2.3 (9), §2.8 (9), §1.2 (8), §1.3 (8), §1.11 (8), §1.6 (7), §1.7 (7), §1.4 (5), §1.10 (2), §2.4 (1).

**They are a coherent class, not scattered.** The 139 are precisely the turns that are not
scope-locked clinical procedures: arrival, comfort, explanation, reassurance, safety-netting, and
the medium contract. The mechanical 80 are exactly the procedures — drug round, venepuncture-with-
handover, examination, prescribing, results.

**What that costs.** Not a person-week of Aran's time. It is one careful pass over 219 turns, which
is this document. What Aran's time *is* needed for is ratifying it — and the one honest way to make
it mechanical in future is to ask him to write the role name into the speaker label
(`**HW/nurse:**`) on the next corpus, which costs him minutes and removes the judgement pass
permanently. **Taste-safe default taken:** where a turn was plausible-but-marginal for a role, I
included it (e.g. a doctor taking blood in §1.6, a nurse running a triage consultation in §2.1). That
inflates the overlap and therefore *under*states role separation — the separation is at least as
strong as reported, never weaker.

---

## 3. Who the learner is — and the patient nobody had looked at

**In this corpus the learner is the professional.** Every `HW` turn is the learner's turn if the
learner is health staff, and the patient is the fluent native. That inversion is already recorded in
the medium-contract extraction (`/d/e34f9913`).

**Nobody had looked at the patient turns as a productive walk before this document.** The
metagraph mapping read them for shape attestation; the calibration read read them for register; the
medium-contract extraction read only §1.0 and §2.0. None counted them as a role.

**The patient projection: 219 turns, 2,189 words, 601 word types, mean 10.0 words per turn** —
against the professional's 19.2. It is the *cheapest* walk in the file by a wide margin and the
most linguistically varied (94% of its 3-word sequences are unique, against 82% on the professional
side — patients repeat almost nothing).

**Producibility: 218 of 219 clean.** The single exception is **#314**, which carries a stage
direction — `*(breathes)* "Like this?"` — and needs the direction stripped, not rewritten.

**All 14 safety-critical ⚠ turns are patient turns. Zero are professional turns.** In the
professional walk those are comprehension targets — the lines a learner must catch first time. In
the patient walk they are the highest-value production targets in the entire corpus:

> **#302** §2.3 flow 2 ⚠ — "I'm allergic to penicillin. It brings me out in a terrible rash."
>
> **#152** §1.7 flow 2 ⚠ — "What's in the soup? I can't have dairy."
>
> **#170** §1.8 flow 2 ⚠ — "I feel a bit dizzy when I stand up. Is that normal?"
>
> **#230** §1.11 flow 3 ⚠ — "Who do I ring if something goes wrong over the weekend?"
>
> **#380** §2.7 flow 3 ⚠ — "Antibiotics upset my stomach terribly last time. Is there something else?"

**My position: the patient is a real fourth candidate and the strongest one on cost per learner.**
A Welsh learner who is a patient, or a member of the public dealing with the health service, is a
much larger population than Welsh-learning nurses, and the walk is already written, already half
the size, and already carries the sentences that matter most.

**One split inside it, and it is free.** 24 patient turns carry a vocative — "It's this cough,
**doctor**" (#240), "That's no trouble, **doctor**. You're very clear" (#248). That splits patient into
patient-of-nurse (117 turns) and patient-of-doctor (102), but the split is one word and costs
nothing to author.

---

## 4. The medium contract — where it sits

N1201, the medium contract, now ratified as CORE scene 0 (`/d/e34f9913`, and the ratification
landed on main at `cd9d93e2f`). In health the learner is the professional, which makes this the
first thing they need — you cannot practise the ask if you never got permission to speak.

**Twenty turns carry it in the professional's mouth: 19 in §1.0/§2.0, and exactly one outside.**
This confirms the extraction's own targeted sweep of all 73 flows, independently.

Declaring the limitation (10 turns — the canonical opener, both realisations, both sequences):

> **#1** §1.0 Welsh flow 1 — "I'm learning Welsh at the moment, so I'll try to stay in Welsh as much
> as possible, but if we get stuck I might need to ask you to speak English, if that's okay."
>
> **#19** §1.0 English flow 1 — "English isn't my first language, so if you have any trouble
> understanding me, just let me know and I'll explain myself more clearly."
>
> **#235** §2.0 Welsh flow 1 — "**Before we start** - I'm learning Welsh at the moment... Is that
> alright?"

Issuing the repair licence (5):

> **#3** §1.0 — "Diolch, that's very kind. And remember, if anything I say isn't clear, just stop me
> - any time at all."
>
> **#237** §2.0 — "And if I use a word you don't know, or you'd rather I explained something in
> English, just say - I won't be offended."
>
> **#247** §2.0 English flow 1 — "...please stop me, because it's important you understand
> everything. **And I'll do the same if I don't follow you.**"

Handling the decline and the switch (4):

> **#15** §1.0 Welsh flow 3 — "Of course, no problem at all. English it is. Let's get you sorted."
>
> **#243** §2.0 Welsh flow 2 — "That's completely sensible, and exactly the right instinct. English
> it is - clarity matters most here."

The licence exercised mid-business — the one hit outside the openers, and the proof the contract is
load-bearing rather than ceremonial:

> **#338** §2.5 flow 2 *(P)* — "Sorry, could you explain that again? What does that mean, exactly?"
> → **#339** *(HW)* — "Of course. There's an infection in the tubes of your lungs - a bug, basically."

**Where it sits relative to the walk: at the front of all four of them, unconditionally.** All 30
opener turns are in the three-way core — the medium contract is the only block in the corpus with
*zero* role content. The patient side of it is real too: 16 of the 30 patient opener turns carry the
grant, the decline or the diversion ("Chwarae teg i chi!", #2; "I'd rather stick to English today",
#14; "with something medical I'd feel safer in English", #242).

One precision for the authoring brief: the opener's *pivot* line is role-neutral but its content is
not — **#5** "Right then, first things first - I need to take your blood pressure" is a nurse pivot,
**#239** "Right, what can I do for you today?" is a doctor pivot. The pivot swaps per role; the
contract above it does not.

---

## 5. The size of the productive walk — turns, and estimated LEGOs

Turn counts are counted. **LEGO counts are an estimate and are labelled as one.**

**Method.** Pods never cut below a phrase, so I cut a sample of six turns spread across the corpus
(#1, #73, #109, #181, #313, #367) into phrase-sized chunks by hand: 165 words → 51 chunks, **3.24
words per chunk**. I then scaled each projection's word count by that ratio, and discounted for
repetition using each projection's measured 3-gram distinctness (80–94%). The **lower bound** is the
projection's distinct word types — every meaningful word type is at least one A-LEGO. The **upper
bound** is distinct phrase chunks — as if every chunk became its own M-LEGO. The truth is between.

| Projection | Turns | Words | LEGO estimate (range) | Centre |
|---|---|---|---|---|
| **General** | 85 | 1,616 | 400 – 400 | **~400** |
| **Nurse** | 166 | 3,120 | 617 – 797 | **~700** |
| **Doctor** | 151 | 2,944 | 594 – 735 | **~660** |
| Nurse ∪ doctor | 219 | 4,215 | 742 – 1,064 | **~900** |
| **Patient** | 219 | 2,189 | 601 – 636 | **~620** |

At the phrase floor (≥4 BUILD + ≥5 USE per LEGO) that is **~3,600 phrases for general, ~6,300 for
nurse, ~8,100 for nurse+doctor** — plus audio for every one. Marginal cost of doctor on top of
nurse: **+53 turns, +148 word types, ~+200 LEGOs (range 125–270).**

**The discount that changes the picture — and the figure I am least confident about.** Only **8.0%
of the professional side's word types are clinical** (59 of 742, by a hand-built term list), and
5.5% on the patient side. The other 92% is everyday Welsh — comfort, family, time, weather,
reassurance — which the CORE course already owns and which the helix design dedupes at authoring
time. So the *genuinely new* sector authoring is a fraction of the table above; my indicative figure
is **120–250 new LEGOs for the whole professional union**, and I would not defend the precision of
that number, only its order of magnitude. My hand term list certainly undercounts institutional
language ("call bell", "visiting", "name band", "discharge sheet") that is health-specific without
being clinical.

**What else I am least confident about:** (a) the 3.24 words-per-chunk ratio comes from six turns,
not sixty; (b) the distinctness discount is a proxy — real LEGO reuse across a course is higher than
3-gram novelty suggests, so the upper bounds are soft ceilings; (c) **the corpus does not saturate**
— at the end of the nurse walk it is still introducing ~2.2 new word types per turn, so cost scales
close to linearly with turns and there is no "second half is cheap" effect to bank on.

---

## 6. Explicit gaps

- **The clinical/everyday vocabulary split is my hand list, not a lexicon lookup.** Indicative only.
- **Scope of practice is my judgement, not a clinician's.** Whether an HCA narrates a blood-pressure
  reading, or a nurse runs a §2.1-style opening consultation, are calls I made and Aran or a
  practising clinician may overturn. I flagged the direction of the error in §2: my calls inflate
  overlap, so they understate separation.
- **Aran's own clinical caveat still stands** and I did not touch it: "the clinical specifics
  (nil-by-mouth medication handling, safety-netting thresholds, the blood-sugar figures) want a pass
  from a practising clinician before anything ships."
- **Nothing here was checked against a live course or the DB.** Read-only by brief.

---

## 7. Verdict on Tom's default

**The default — general role only for v1 — stands. I would ship it. Two changes to how it is
framed, and one to what comes second.**

**Why it stands, on my numbers rather than on caution:**

1. **It is free optionality.** General ⊂ nurse at 100%. Every turn, every LEGO, every audio clip
   authored for the general walk is a turn, LEGO and clip the nurse walk needs. There is no
   throwaway work in this decision, which is the rarest property a v1 can have.
2. **It is the only role-free projection.** Two turns in the whole 85 carry a role word (#37, #43,
   "one of the nurses") and both are a one-word swap. Nothing else in the general walk asserts who
   the learner is — so it validates the projection mechanism without committing to a role taxonomy.
3. **It is segment-sized, not course-sized.** ~85 turns and ~400 LEGOs is a sector segment. Nurse ∪
   doctor at ~900 LEGOs and ~8,100 phrases is a whole course, and building a whole course to test a
   projection mechanism is the wrong bet.
4. **It carries the medium contract entire** — all 30 opener turns, the highest-transfer content in
   the file and the one thing that instantiates in every other sector unchanged.

**Change one — the name.** "General" reads as *generic*, and it is not: it is a specific job. It is
the ward floor — settling someone in, taking obs, meals, mobility, comfort rounds, the pain
question. Call it that in the brief, because a learner choosing "general" expects the union of the
roles and will get the intersection-plus-ward-floor, which is a different and better thing than it
sounds.

**Change two — what a general learner cannot say.** The general walk has no medication, no blood, no
pre-op preparation, no discharge. That is honest for an HCA and thin for a nurse. Say so in the
product copy rather than discovering it in feedback.

**Change three, and this is where I argue against the shape of the question rather than the
default.** The named candidates were general, nurse, doctor. On the arithmetic, **the second role
should be patient, not nurse** — and doctor should be last, not second:

- Patient: 219 turns already written, ~620 LEGOs, half the words per turn, 94% of it linguistically
  novel, and it holds all 14 safety-critical lines as *production* targets. Largest audience by a
  wide margin.
- Nurse: +81 turns on general, ~+300 LEGOs, and it completes a job the general walk leaves half-done.
- Doctor: +53 turns on nurse, ~+200 LEGOs, the most role-locked content in the file (§2.4–§2.10 is
  53 turns of examination, diagnosis, prescribing and results that transfer to nothing else), and
  the smallest population of Welsh-learning speakers in the whole set.

**So: v1 general. v1.1 patient. v2 nurse. Doctor last, and only once a learner has validated the
mechanism.** If that ordering is wrong, it will be wrong because Welsh Government's interest is
specifically in the professional workforce rather than the public — and that is a fact about the
mandate, not about the corpus, which is why it is Tom's call and not mine.

---

*Read-only. 438 turns classified by hand; counts computed from that classification. Aran's corpus
unedited.*
