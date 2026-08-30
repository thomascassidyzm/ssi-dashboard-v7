# Health sector mapped onto the shape metagraph

**2026-08-30.** The first independent test of whether the shape trunk is general or just café-shaped.
Aran's hand-authored health-sector conversations, mapped exchange by exchange onto the stored
metagraph at `services/shared/metagraph/`.

---

> ## ⚠ CLINICAL CAVEAT — read before anything else
>
> **The conversational shapes are solid. The clinical specifics are not signed off.** The author of
> the source flows states plainly that **nil-by-mouth medication handling, the safety-netting
> thresholds, and the blood-sugar figures want a pass from a practising clinician before anything
> ships.** Nothing in this document has had that pass, and nothing in it constitutes clinical review.
> This mapping is about the *shape* of the exchanges; where a clinical figure appears it is quoted
> as evidence of a shape, never endorsed as correct.

---

## The answer, in one sentence

**The trunk survived contact — it minted ten new nodes, not twenty; 14 of its 17 nodes and 5 of its 6
bound pairs are traversed by the health corpus, and 17 of its 20 move families are attested — but it
survived as a set of shapes, not as a complete inventory: 116 of 219 exchanges (53%) need one of the
ten new nodes as their primary assignment, and the thing POD-1 turned out to be missing was not
café-ness, it was ASYMMETRY.**

The three move families the health corpus cannot attest — F11 *And you?*, F15 *I'm not sure*, F18
*That's normal, isn't it?* — all fail for the same single reason, and it is the reason the ten mints
exist: in POD-1 the two parties are equals swapping tickets, and in a health encounter one party has
the authority, the instrument, the record and the other party's body. That is one variable, not a
different world. It is why this reads as *the trunk survived* rather than *the trunk was café-shaped*.

---

## 0. The prediction, written down before any mapping was done

Watson's, from the source conversation, verbatim:

> "his five response families should map onto existing move positions, and the ⚠ strand should be the
> thing that mints something new — because safety-critical recovery is precisely the shape POD-1 has
> no reason to contain."

And its stake, also verbatim:

> "If its 21 contexts land mostly on nodes that already exist, 'shapes are general' survives its first
> real contact. If it mints twenty new nodes, the trunk was café-shaped all along and we'd want to
> know that before building three more sectors on it."

Scored in §8. It was **right on both of its claims and blind to a third**.

---

## 1. What was read, and the counts

| | Stated in the brief | Measured here | Which I trust |
|---|---|---|---|
| Numbered contexts | 23 | **23** (nurse 1.0–1.11 = 12; doctor 2.0–2.10 = 11) | agree |
| Flows (`###`) | 73 | **73** | agree |
| Turns | ~430–440 | **438** — every one of the 73 flows is exactly 6 turns | mine, it is exact |
| Exchanges (HW/P adjacency pairs) | — | **219** (73 × 3) | mine |
| Lines carrying ⚠ | 29 | **14** conversation lines. The other 15 are 13 flow *headings* and 2 lines of prose | **mine** — the brief's 29 counts headings and prose; only 14 ⚠ lines are things a learner hears |

That last row matters for the safety strand and is used throughout §7.

Source: `docs/sector-pods/source/health-sector-conversations-v3.md` on branch
`docs/aran-health-sector-conversations` @ `eb7222dfc`. Store: `services/shared/metagraph/` @
`8215a7462`, read through `index.cjs` — the markdown specification was not re-derived.

---

## 2. The rubric, fixed before mapping

**Unit.** The *exchange* — one HW/P adjacency pair. Every flow is exactly three exchanges, which
makes 219 assignments, rolled up to a per-flow spine and then to a per-context verdict. The
regularity of the source (6 turns, always) made this unit free; I did not need a better one.

**LANDS on an existing node when** the flow's position sequence matches the store node's position
sequence, allowing all four of these:
1. **Clinical vocabulary is the mask.** "Chicken or the soup?" and "coffee or tea?" are the same
   position. Never mint on words.
2. **Role assignment is a walk annotation, not a shape distinction.** N2's *solicit* is the café
   server's move and the nurse's move; who occupies a position does not change the position.
   *This is the single biggest judgement in the mapping and it is stated here so it can be argued
   with. If it is wrong, roughly 30 assignments move.*
3. **An opening or closing ritual may be present or absent.**
4. **At most one position may be unfilled** (partial traversal), as the store already records for
   POD-1.

**MINTS when** the sequence contains at least two consecutive positions no store node has, **and**
those positions cannot be got by composing store nodes and bound pairs. One position's worth of
novelty is a *move*, not a node.

**AMBIGUOUS when** two store nodes each match and the corpus supplies no discriminator. Recorded as
`AMBIG`, not coin-flipped. There is exactly one.

**Smoke test, held loosely.** A shape belongs on the trunk only if it would attest in a
non-Indo-European column. Applied to all ten mints; it is recorded per node in the patch file. It
changed my mind once — see §5, N102.

**Settled context I did not re-open:** shapes are language-agnostic compressions and content is the
mask; a sector branch adds shapes once and admissions per pair; survivability is defined by the
failure branch, not production; **POD-1 is attested evidence and is extended, never re-cut** — no
store file is modified by this work, and I checked that (§9).

---

## 3. The exchange table — all 23 contexts, all 73 flows, all 219 exchanges

Ids `N1`–`N17`, `P1`–`P6`, `F1`–`F21`, `O1`–`O9` are the **existing store**. Ids from **101 up
(`N101`+, `P101`, `F101`+) are proposed mints** — the full definitions are in
`services/shared/metagraph/proposed/health-additions-2026-08-30.json`. `+` means the exchange runs
two shapes; the first is primary.

| Context | Flow | Exchange 1 | Exchange 2 | Exchange 3 |
|---|---|---|---|---|
| **1.0** | W-f1 happy | N101 | N101 | N110 + N4 |
|  | W-f2 question | N101 + N5 | N5 | N10 + N110 |
|  | W-f3 problem | N7 | P101 | N110 |
|  | E-f1 happy | N101 | N101 | N102 |
|  | E-f2 question | N101 + N5 | N5 | N5 + N110 |
|  | E-f3 human | N101 + N9 | F102 | N110 |
| **1.1** | f1 happy | N5 | N102 | N103 |
|  | f2 question | N5 + N6 | N6 | AMBIG:N7/N2 |
|  | f3 human | N5 | N10 | F13 + N103 |
| **1.2** | f1 happy | N4 + N3 | N8 | N107 |
|  | f2 question | N4 + N3 | N9 | N107 |
|  | f3 problem | O7 + N12 | N105 | N1 |
| **1.3** | f1 happy | N102 | N102 | N104 |
|  | f2 question | N102 | O7 + N8 | N104 |
|  | f3 problem | N102 + O1 | F6 + N102 | N102 |
| **1.4** | f1 happy | P5 | N12 | N107 |
|  | f2 question | P5 | N6 | N12 |
|  | f3 SC | P5 + O1 | F101 + N105 | P101 |
| **1.5** | f1 happy | N2 + N4 | N102 | N107 |
|  | f2 question | N2 + N3 | F6 + P3 | N10 |
|  | f3 SC | N106 | N106 + N103 | N106 + N105 |
| **1.6** | f1 happy | N102 | N102 | N10 |
|  | f2 question | N102 + N3 | O7 | N102 + N8 |
|  | f3 problem | N102 + N7 | F102 + N102 | N102 |
| **1.7** | f1 happy | N2 + P1 | N2 + F21 | N107 |
|  | f2 SC | N108 | N108 + F6 | N108 |
|  | f3 SC | O1 + O7 | P5 + N12 | N105 + P101 |
| **1.8** | f1 happy | N102 | N102 + P3 | N102 |
|  | f2 SC | O7 | N106 + F101 | N7 |
|  | f3 problem | N109 | N109 | N102 |
| **1.9** | f1 happy | N2 | N2 + F2 | N107 |
|  | f2 question | N3 | N3 + N5 | N107 |
|  | f3 problem | N2 + P101 | P101 | P101 |
| **1.10** | f1 happy | N107 + P3 | N4 | N107 |
|  | f2 SC | N108 + F101 | N105 + F103 | N105 |
|  | f3 human | O7 + N3 | F102 | N3 |
| **1.11** | f1 happy | N4 + P3 | N4 + F103 | N1 |
|  | f2 question | O5 + F6 | N107 | N107 |
|  | f3 SC | N107 | N107 + P3 | N1 |
| **2.0** | W-f1 happy | N101 | N101 | N110 + N2 |
|  | W-f2 problem | N7 | P101 | N110 + N2 |
|  | E-f1 happy | N101 | N101 | N110 + N2 |
|  | E-f2 human | N101 + N9 | N9 | N110 |
| **2.1** | f1 happy | N1 + N12 | P5 | N110 |
|  | f2 question | N2 + N3 | P5 | N110 |
|  | f3 human | N11 + N12 | P101 | N17 |
| **2.2** | f1 happy | P5 | P5 | P5 |
|  | f2 question | N6 | N6 + P5 | P5 |
|  | f3 problem | P5 + F4 | P5 | N110 |
| **2.3** | f1 happy | P5 + F4 | P5 | N110 + N102 |
|  | f2 SC | N108 | N108 + F103 | N9 |
|  | f3 human | O1 | P5 + O2 | N8 + N102 |
| **2.4** | f1 happy | N102 | N102 | N110 |
|  | f2 SC | N102 | P5 | F101 + N102 |
|  | f3 SC | N102 | N102 + P5 | N110 |
| **2.5** | f1 happy | N8 | N8 | N8 + N107 |
|  | f2 question | N6 | N6 + P3 | P6 |
|  | f3 human | O7 | N109 | N8 + N107 |
| **2.6** | f1 happy | N7 | N9 | N107 |
|  | f2 question | N7 + N3 | N8 | N107 + P3 |
|  | f3 problem | N7 | N8 | N107 + P3 |
| **2.7** | f1 happy | N4 + P3 | N4 + P4 | N4 |
|  | f2 question | N4 + N3 | N9 | N4 |
|  | f3 SC | N12 + F6 | N107 + O6 | F16 + N109 |
| **2.8** | f1 happy | N107 | N107 | F21 |
|  | f2 SC | N107 | N107 | F104 + P3 |
|  | f3 problem | N107 + O8 | N109 + F16 | F21 |
| **2.9** | f1 happy | N104 | N104 | N104 + N107 |
|  | f2 question | N104 | N104 | N105 |
|  | f3 human | N104 + O8 | F16 | N104 + N107 |
| **2.10** | f1 happy | N1 + P5 | N107 | F16 + N15 |
|  | f2 question | P5 + N109 | N109 + O1 | N109 + N110 |
|  | f3 SC | F101 + N106 | P5 | N110 + N109 |

---

## 4. The distribution — which is the finding

### 4.1 Headline counts

| | Exchanges | % of 219 |
|---|---|---|
| Land on the store alone | 91 | 42% |
| Cite **both** a store id and a mint | 36 | 16% |
| Need a mint alone | 91 | 42% |
| Genuinely ambiguous | 1 | 0.5% |
| **Cite at least one existing store id** | **127** | **58%** |
| **Have a mint as their PRIMARY assignment** | **116** | **53%** |

Two readings of the same data, and both are true:

- **Node-level: the trunk survived comfortably.** Ten mints against seventeen existing nodes, and
  every mint is a shape, not a topic. Twenty would have condemned it; ten does not.
- **Exchange-level: it did not survive comfortably.** More than half the corpus's exchanges need
  something the store does not have.

The reconciliation is the concentration: **two of the ten mints carry 40% of the mint mass.**
`N102 Consent-and-narrated act` (23 exchanges) and `N107 Conditional instruction` (23 exchanges)
are, between them, 46 of the 116. Add `N110 Signposting` (14) and `N101 Medium contract` (12) and
four shapes account for 72 of 116. **The corpus is not scattered across a hundred novelties; it
leans very hard on a handful of things POD-1 had no occasion to contain.**

### 4.2 Primary assignment, ranked

| Shape | Exchanges as primary |
|---|---|
| N102 | 23 |
| N107 | 23 |
| P5 | 18 |
| N110 | 14 |
| N101 | 12 |
| N4 | 10 |
| N104 | 9 |
| N8 | 8 |
| N2 | 8 |
| N5 | 6 |
| N7 | 6 |
| P101 | 6 |
| N6 | 6 |
| O7 | 6 |
| N108 | 6 |
| N109 | 6 |
| N9 | 5 |
| N105 | 5 |
| N1 | 5 |
| N10 | 4 |
| N106 | 4 |
| F102 | 3 |
| N12 | 3 |
| F101 | 3 |
| N3 | 3 |
| F16 | 3 |
| F6 | 2 |
| O1 | 2 |
| F21 | 2 |
| N103 | 1 |
| AMBIG:N7/N2 | 1 |
| F13 | 1 |
| O5 | 1 |
| N11 | 1 |
| N17 | 1 |
| P6 | 1 |
| F104 | 1 |

### 4.3 Store coverage by the health corpus

**14 of 17 nodes traversed, 5 of 6 bound pairs traversed — 19 of 23 shapes.**
(For comparison, the Script Lab currently scores POD-1 at 18 of 23.)

Never traversed, and each for a reason worth stating:

| Never traversed | Why |
|---|---|
| **N13 Not-knowing** | The professional never says "I don't know" and stops there. They say "I'll check" — which is `N105`, the routed form. The register substitutes a resolution for the bare admission. |
| **N14 Premise audit** | Nobody asks the other party "how do we know that?". The doctor audits the patient's premise *implicitly* (2.9 flow 3 re-weights "is that the diabetes coming?") but never names the operation. |
| **N16 Precision haggle** | Numbers appear constantly and are never negotiated. `N104` exists precisely because the health number is *explained*, not bid on. |
| **P2 Reckoning-and-pay pair** | No money changes hands anywhere in 73 flows. NHS. This is a genuine sector-content absence, not a shape finding. |

Three of those four are method-pod nodes, so the health corpus's non-traversal of them says nothing
about POD-1.

### 4.4 The contexts that produced the mints

Every one of the 23 contexts produced at least one mint. But the mints cluster into **two families**,
and that clustering is the report's main new information:

**Family A — the asymmetric professional encounter (5 mints, 59 exchanges as primary).**
`N101` medium contract · `N102` consent-and-narrated act · `N103` identity check · `N104` result
delivery · `N110` signposting. None of these has anything to do with safety. They exist because one
party controls the encounter, holds an instrument, holds a record, and acts on the other's body.
**The prediction did not foresee this family at all.**

**Family B — the safety-critical strand (4 mints, 39 exchanges as primary, plus `N105`'s 5 straddling both).**
`N106` stop-and-verify · `N107` conditional instruction · `N108` constraint declared and durably
recorded · `N109` commitment sought and bounded, with `N105` deferred grant straddling both families.
**This is the family the prediction called, and it called it correctly.**

---

## 5. The ten mints, and the seven things I refused to mint

Full definitions, positions, citations, smoke-test verdicts and "why not an existing node" for each
are in the patch file. In brief:

| id | Name | Attestations | The position that makes it new |
|---|---|---|---|
| N101 | Medium contract | 8 flows | The repair licence is issued **before** the trouble it covers. N6 handles trouble on arrival; nothing pre-negotiates it. |
| N102 | Consent-and-narrated act | 15 flows | The other party's job is to **undergo**, not to do. N4's recipient acts; N102's is acted upon. |
| N103 | Identity check | 3 flows *(thin)* | A **known-answer** question. N3 and N5 both have an asker who does not know. |
| N104 | Result delivery | 5 flows | **Norm-referencing**: "we like under 42, and diabetes starts at 48". N16 bids on a number; nobody here bids. |
| N105 | Deferred grant via a named third party | 7 flows | Not granted, not refused — **routed**, with a named person and a named time. |
| N106 | **Stop-and-verify** | 3 flows, all ⚠ | The recovery is to **halt**. Every recovery in the store is to keep going differently. |
| N107 | Conditional instruction | 24 flows | Unrequested, conditional, future, with an explicit **threshold** and a graded urgency. |
| N108 | Constraint declared and durably recorded | 3 flows | The turn's beneficiary is **a third party who is not in the room**. |
| N109 | Commitment sought and bounded | 6 flows | The **bound is the reassurance**: "I won't promise what I can't be sure of." |
| N110 | Signposting the encounter | 17 flows | Meta-talk that looks **forward** at a thread not yet begun. N17 looks backward at one that broke. |

Plus one bound pair (`P101` apology-and-absolution), four moves (`F101` ratify-the-telling, `F102`
assert-normality, `F103` write-it-down, `F104` solicit-the-read-back), ten composition edges, seven
survivability edges and one outcome shape.

**Where the smoke test changed my mind.** I had *consent-to-act* and *narrated procedure* as two
separate candidates. Testing them for a non-Indo-European column, I could not find a culture where
one attests without the other — announcing what you are about to do to someone and narrating it as
you do it is one shape everywhere it appears, from a barber to a dentist. **They were merged into
`N102`.** Kept apart, this document would report eleven mints for one shape's worth of novelty.

**The seven candidates I refused to mint**, each recorded in the patch file with its reasoning:
apology-and-absolution (it is **N11 positions 1–2**, offered as a bound pair instead) · diagnosis /
formulation delivery (**lands on N8** — grounds first and at length is still N8's sequence) ·
agenda-parking (**lands on N17**) · "let me check" as a move (it is a *position* inside N105/N106) ·
witnessed compliance (a variant of **P3**) · the normality enquiry "is that normal?" (**N3** with
F102 in the response position — minting on the clinical framing would have been minting on
vocabulary) · the threshold enquiry "how bad is bad?" (**N107 position 3**).

**A finding about N11 that does not re-cut it.** Six health flows attest N11's first two positions —
self-downgrade, then positive contradiction — standing entirely alone, with no concede-and-hold and
no normalise-and-tag following. That is evidence that N11 *decomposes*. It is recorded as bound pair
`P101` rather than as an edit to N11, because POD-1 is attested evidence. Whether N11 should
eventually be expressed as P101 + a tail is **Tom's call, not this document's**.

---

## 6. The moves pass — Aran's five families against the store's twenty

**First, a category correction.** Aran's five — *happy path*, *question*, *problem*,
*safety-critical ⚠*, *human moment* — are **flow-level path tags, not turn-level response families**.
They are not the same kind of object as F1–F21. They map onto the store's **outcome** axis, and the
prediction's phrase "map onto existing move positions" is best read as asking whether the store's
move inventory can *fill* them. It can, four times out of five:

| Aran's family | Fills with | Verdict |
|---|---|---|
| happy path | F1 *Just do it*, F2 *Do it and throw something in* in the response position | **lands** |
| question | F3 *Answer with a question*; nodes N3, N6 | **lands** |
| problem | F4 hedge, F5 *No, and here's why, and here's instead*, F6 *Not that, but this*; outcome O1 | **lands** |
| human moment | F12, F13, F16, F17, F18; nodes N10, N11 | **lands** |
| **safety-critical ⚠** | **nothing in the store** | **mints** — `F101` + `N106` |

### 6.1 All twenty move families against the corpus

| Move | Attested in health? | Citation |
|---|---|---|
| F1 Just do it | yes, everywhere | "Left arm's fine." (1.3 f1) |
| F2 Do it and throw something in | yes | "Water first, and let's sort this pillow out properly while I'm here." (1.9 f1) |
| F3 Answer with a question | yes | "Of course. Which arm do you want?" (1.3 f1) |
| F4 Roughly, and it depends | yes | "Hard to say, really. Months, maybe?" (2.2 f3); "Amlodipine, I think it's called" (2.3 f1) |
| F5 No, and here's why, and here's instead | yes | "I can't do today - I'm picking the grandchildren up at three. Can I come back tomorrow?" (2.6 f3) |
| F6 Not that, but this | yes | "instead of the old blue one, not as well as" (1.5 f2); "Never double up." (1.11 f2) |
| F7 Say that again | yes | "Sorry, could you explain that again?" (2.5 f2); "what was your name again?" (1.1 f2) |
| F8 Said again, differently | yes | "an infection in the tubes of your lungs - a bug, basically" (2.5 f2) |
| F9 Let me check I've got it | yes, abundantly | "Twice a day, morning and evening. Finish the lot." (2.7 f1) |
| F10 Keep going | yes, thin | "That's really helpful. One more thing -" (2.2 f1) |
| **F11 And you?** | **no** | The patient asks about the nurse (1.0 E-f2) and the nurse never hands the identical question back. **Blocked by role asymmetry.** |
| F12 Nice one | yes | "First time! You're hired." (1.6 f1) |
| F13 Kind of you, but | yes, thin | "Ah, it flies by." (1.1 f3) |
| F14 The done thing | yes, thin | 1.11 f1 close; "Good morning" (2.10 f1). Only 5 exchanges carry N1 at all — the corpus is nearly ritual-free. |
| **F15 I'm not sure** | **no** | The professional never leaves uncertainty unresolved. They say "I'll check with the doctor" — `N105`. **Blocked by role asymmetry.** |
| F16 Fair enough, but I still | yes | "Family history does raise the chances... But what you eat and how you move matters more." (2.9 f3) |
| F17 No you're not | yes, abundantly | "You're not wasting my time at all." (2.1 f3) |
| **F18 That's normal, isn't it?** | **not in its strict form** | The tag-seeking, agreement-requiring form is absent. The *asserted* form is everywhere → proposed as `F102`. **Blocked by role asymmetry.** |
| F19 Here's how I am | yes | "Not bad at all. The pain's nearly gone." (2.10 f1) — but see §6.2 |
| F21 Anything else? | yes | "Any last questions before you go?" (2.8 f1) |

**17 of 20 attested. All three failures have one cause.** F11 needs the question to be returnable,
F15 needs the speaker to be allowed to stay uncertain, F18 needs the two parties to be peers seeking
each other's agreement. None of those hold in a professional encounter. **That is one variable
failing three times, not three independent gaps** — and it is the clearest single piece of evidence
in this document that the *move* layer is general and the asymmetry is the sector's real contribution.

### 6.2 The same form, a different shape — worth its own paragraph

"How are you feeling today? How did you sleep?" (2.10 f1) wears F19's clothes exactly: a formulaic
wellbeing enquiry answered with a state report. **It is not one.** In the ward round it is a clinical
elicitation (`P5`) that has borrowed a ritual's surface. The patient's answer is diagnostic data, and
the next turn acts on it medically.

This runs the "content is the mask" rule *in reverse*: usually the content masks a shared shape; here
a shared **form** masks two different shapes. It is a warning for any future overlay built by
surface-matching. The mapping treats 2.10 f1 exchange 1 as `N1 + P5`, not as F19.

---

## 7. The safety-critical strand, the survivability edges, and the second-axis question

### 7.1 Seven survivability edges, and five of them rest on a failure

The store records its own null result, and it is worth quoting because this is the section that
changes it:

> "All ten corpus survivability edges rest on a non-delivery, a chaining move or a relational move.
> **Not one rests on anything failing.** The corpus attests the branch and withholds the recovery."

The health corpus does not withhold the recovery. Seven proposed edges, `S101`–`S107`, of which
**five carry `answer_slot_class: "failure"` — the class the store's ten corpus edges never use.**

| id | B is attemptable only if you survive… | Recovery attested | Note |
|---|---|---|---|
| **S102** | an answer that cannot be given precisely | **3×** | **This is the recovery pod-0's `S2` records as attested NEVER** — "no turn in the corpus takes up a hedge". Health takes it up three different ways: anchor it ("was it there at Christmas?" 2.2 f3), re-frame the question ("let me ask another way" 1.4 f2), route to an artefact ("do you have the repeat list?" 2.3 f3). |
| S101 | being halted mid-act by the person you are acting on | 3× | Complete cycles: halt, ratify, re-verify, withhold. |
| S106 | "I didn't follow that" | 3× | pod-0 attests N6 **once in 231 rows**; health attests it three times in 73 flows and licenses it in advance at `N101`. |
| S107 | the recipient declaring a disposition that will defeat your instruction | 2× | Both run: normalise (F102), hold (F16), extract a commitment (N109). |
| S104 | your number being challenged for its meaning | 2× | Recovery is to supply the thresholds either side, not to repeat the figure. |
| S103 | the recipient surfacing a gap your instruction did not cover | 1× | **The first edge in either corpus that rests on the speaker's own knowledge failing.** |
| S105 | a guarantee being demanded that you cannot honestly give | 1× | The bound *is* the reassurance. |

### 7.2 Outcome shapes — health delivers 7 of 9 to some degree, 3 of them strongly

POD-1 currently scores **0 of 9** on the Script Lab. Directly useful, with citations:

| | Health? | Evidence |
|---|---|---|
| **O1** Non-delivery with a reason | **strong, 6×** | 1.3 f3 (can't manage the sleeve, with a reason); 2.6 f3 (can't today + counter); 2.7 f2 ("best not with these"); 2.10 f2 (the refused promise); 1.7 f2 (soup ruled out + substitute); 2.3 f3. |
| **O3** The native does not understand you | **strong** | It is the corpus's *premise*: 1.0 and 2.0 exist to pre-arrange the recovery, and 2.5 f2 / 2.2 f2 / 1.4 f2 attest it in flight. The store classes O3 as **"minted — attested nowhere"**. Health attests it. |
| **O7** The native discloses worry or difficulty | **strong, 8×** | 1.2 f3, 1.6 f2, 1.8 f3, 1.10 f3, 2.1 f2, 2.5 f3, 2.8 f3, 2.9 f3. **But note:** in health the discloser is the *other* party and the learner is the professional — so the recovery the store names ("acknowledge without fixing, then continue") is attested *and also frequently violated*, because the professional fixes. Both are useful data. |
| **O6** Trouble that is your own fault | **thin, 1× — but dialogic** | 2.7 f3: "I'll admit, I just stopped them last time" / "A lot of people do... But the full course, every time. Deal?" The store records O6 as attested **only as monologue with no partner turn**. This is its first two-sided attestation. |
| **O8** You are disagreed with | thin, 3× | 2.10 f1 ("I'll believe it when I see the taxi"), 2.8 f3, 2.9 f3. pod-0 attests disagreement only about a person's account of themselves; these are about the world. |
| **O5** The premise of your ask is wrong | thin, 2× | 1.11 f2 ("do I take two the next time?" / "Never double up"); 2.9 f3 (the family-history premise re-weighted). |
| **O2** Nobody knows | **variant only** | 1.10 f2 and 2.3 f3 attest the *recovery* (re-route the ask to a third party, to a document) but never the bald "nobody knows" — the professional always knows who knows. Recorded as `N105`. |
| **O4** Your read-back was wrong | **absent** | Read-backs are everywhere (1.5 f2, 1.8 f1, 1.10 f1, 1.11 f1, 2.6 f3, 2.7 f1, 2.8 f2) and **every single one is correct**. Health attests the *solicited* read-back (`F104`, 2.8 f2), which is O4's precondition, and never the correction. Honest gap. |
| **O9** A second no | **absent** | Nothing in 73 flows declines twice. Every decline is accepted first time. The professional register appears to make a second no impossible. Honest gap. |

Plus one proposed new outcome shape, `O101` **"The other party stops you mid-act"** — the only
outcome in either corpus where **the learner *is* the wrong turn** and the recovery is to stop being
it. Every one of O1–O9 has the learner on the receiving end.

### 7.3 The ⚠ strand, counted honestly

14 ⚠ conversation lines. All 14 are **patient-initiated**; not one is professional-initiated. Their
responses:

- **7 answered with an explicit ratification** (`F101`): 1.4 f3 "That's really useful to know" · 1.5
  f3 "you're quite right to say" · 1.8 f2 "That's worth knowing" · 1.10 f2 "Good question" · 2.4 f2
  "That's important, thank you" · 2.9 f3 "you're right to mention it" · 2.10 f3 "I'm glad you've told
  me".
- **3 ratified by action rather than words**: 2.3 f2 ("I'm putting that in big letters on your record
  now"), 1.7 f2, 2.7 f3.
- **4 not ratified at all**: 1.11 f3, 2.8 f2, 2.4 f3 (partially), and —

- **1 not answered at all.** In **2.2 flow 2**, the patient's ⚠ line is *"Now you mention it, my
  trousers are looser on me. I thought that was a good thing."* — unexplained weight loss, arguably
  the most alarming red flag in the whole corpus — **and it is the last line of the flow.** No
  response, no ratification, no onward action. This is a gap in the source material, not in the
  mapping. **Flagged for Aran**, and it is a shape gap as well as a clinical one: the flow teaches
  the learner to *produce* a red flag and then shows them nothing about how it is received.

### 7.4 The second axis — tested, and supported with one refinement

The candidate: *weight the overlay selector by the cost of failing to recover.*

**Supporting evidence.** The ⚠ lines' recovery positions are exactly the positions that mint —
`N106` stop-and-verify occurs **only** under a ⚠ marker; `N108` is 3-for-3 ⚠; `F101` is the ⚠
strand's signature move. The recoveries are structurally different, not merely topically graver.

**Evidence against.** The ⚠ tag is applied to *lines*, and it is not a reliable predictor at line
level: 4 of 14 draw no ratification and one draws no response. Two ⚠ lines (1.7 f2's dietary
constraint, 1.11 f3's who-to-call) sit on shapes — `N108`, `N107` — that also occur repeatedly
*unmarked* elsewhere in the corpus.

**Verdict: supported, but the weight belongs on the SHAPE, not on the line.** `N106` and `N107`
carry the cost-of-failure weight wherever they occur, marked or not; a line-level ⚠ flag would both
miss the unmarked instances and over-weight the marked ones that turn out to be ordinary
constraint-intake.

**What would have to be true for this to be wrong:** if the ⚠ recoveries used the same positions as
the unmarked ones, the axis would be redundant with the existing selector ("an outcome earns a slot
when surviving it requires a shape the learner does not already own") — because the recovery shape
would already be owned. They do not. `N106` is owned nowhere else in either corpus. So the axis adds
information the existing selector does not carry.

---

## 8. The prediction, scored

**Claim 1 — "his five response families should map onto existing move positions."**
**Right, 4 of 5.** Happy path, question, problem and human moment all fill from F1–F21 and from
existing nodes (§6). The fifth, ⚠, does not.

**Claim 2 — "the ⚠ strand should be the thing that mints something new."**
**Right, and specifically right.** `N106` stop-and-verify occurs only under ⚠. `N108` is 3-for-3 ⚠.
`F101` ratify-the-telling answers half the ⚠ lines. `N107`'s threshold and urgency positions are ⚠
material. The reason given — "safety-critical recovery is precisely the shape POD-1 has no reason to
contain" — is confirmed by the store's own null result: no pod-0 survivability edge rests on anything
failing, and five of the seven health edges do.

**The blind spot — an entire second mint family the prediction did not see.**
`N101`, `N102`, `N103`, `N104`, `N110` — 59 of the 219 exchanges — have **nothing to do with
safety**. They exist because the encounter is asymmetric: one party holds the authority, the
instrument, the record and the other's body. The prediction implicitly assumed the non-⚠ material
would be POD-1 in clinical clothes. Roughly a third of it is not.

**The stake, scored.** "Mostly land → 'shapes are general' survives. Twenty new nodes → café-shaped
all along."

**Ten mints, not twenty. 19 of 23 store shapes traversed. 17 of 20 moves attested. 58% of exchanges
citing at least one store id. The trunk survived — and the correction it needs is one variable
(symmetry), not a rebuild.** On that basis I would build the next sector on this trunk, and I would
expect the next sector to re-attest most of Family A rather than mint its own: a mechanic, a
solicitor and a passport office all take consent, narrate an act, check identity, deliver a result
and signpost the encounter. **Family A is the cheap prediction to test next, and it is falsifiable.**

---

## 9. Honesty section — gaps, ambiguity, and what I did not do

**Unmapped material, as three separate numbers with three different owners:**

1. **Unmapped because the store has not encoded it: 0 exchanges.** Every one of the 219 either landed
   or is covered by a proposed mint. Nothing was left dangling.
2. **Out of scope by kind: not counted as exchanges.** The ⚠ glyph itself, the flow tags, the
   document's front matter, the design notes, the clinical figures, and the one stage direction
   (`*(breathes)*`, 2.4 f1). These are not conversational shapes.
3. **Genuinely absent from the trunk: 116 exchanges (53%),** which is exactly the mint count, and it
   is the finding rather than a gap.

**The one genuine ambiguity: 1.1 flow 2, exchange 3.** "Before we start, is there anything you need -
water, another pillow?" / "I'm fine as I am, thank you." An **unsolicited offer, declined.** It reads
equally as `N7 Arrangement` truncated to proposal-then-decline, and as `N2 Transaction` with the
solicit filled by the server rather than answered by the customer. The corpus gives no discriminator
and I did not coin-flip it. Recorded as `AMBIG:N7/N2`.

**The mapping's least confident calls, named so they can be attacked:**
- **The role-neutrality rule** (§2 allowance 2). If role assignment *is* part of a shape, roughly 30
  assignments move and the mint count rises. I believe it is not — the store's own N2 has the
  learner in both positions across different scenes — but it is the load-bearing judgement here.
- **The `N105` / `N109` boundary.** An undertaking is a promise. I separated them on *who names the
  third party*; 1.10 flow 2 is legitimately both.
- **`N103` (3 attestations) and `F104` (2, one of them an analogue)** are thin and flagged thin in
  the patch file. They would not survive a stricter attestation bar.

**What I did not do, and did not need to do:** no test suite (the one process I ran was
`tools/metagraph-selfcheck.cjs`); no DB queries of any kind, read or write; no Script Lab, route or
UI work; no course content, seeds, LEGOs, phrases or audio; no fan-out; no re-derivation of the
metagraph from `docs/pods/shape-graph-2026-08-30.md`; **no clinical correction of any kind** (see
the caveat at the top); and **no modification of any existing store file.**

**The store is byte-identical.** `git diff 8215a7462 -- services/shared/metagraph/{nodes,moves,edges,outcome-shapes}.json services/shared/metagraph/walks`
is empty, and `node tools/metagraph-selfcheck.cjs` reports **340 checks passed, 0 failed**. The
proposal lives in a new directory, `services/shared/metagraph/proposed/`, which `index.cjs` does not
read — nothing loads it, nothing executes it, and applying it is a separate reviewed decision.

**Two things for Tom, one line each:**
1. **The source file is not on `main`.** This document cites
   `docs/sector-pods/source/health-sector-conversations-v3.md`, which is deliberately preserved
   unmerged on `docs/aran-health-sector-conversations` @ `eb7222dfc`. Merging it is your call and I
   have not touched it. Until it is merged, every citation in this document points off `main`.
2. **The patch needs one schema line.** `schemas/metagraph-v1-schema.json` has
   `provenance: enum ["pod-0", "method-pod"]`. A health provenance needs that enum widened. It is a
   one-line change, it is not made here, and it is not needed unless and until the additions are
   applied.

**And one for Aran:** 2.2 flow 2 ends on an unanswered ⚠ weight-loss line (§7.3). Everything else in
the ⚠ strand is handled end to end exactly as the design notes claim; this one flow stops short.

---

## 10. What this feeds

- **The store.** `services/shared/metagraph/proposed/health-additions-2026-08-30.json` — 10 nodes, 1
  bound pair, 4 moves, 10 composition edges, 7 survivability edges, 1 outcome shape, every one with a
  citation and a "why not an existing node". Ids minted from 101 up in the existing register so
  nothing can collide.
- **The Script Lab coverage read-out.** The exchange table in §3 is a health overlay expressed in
  store node ids, which is what makes `/canonical/scripts` able to score a second corpus at all.
  Health's own read-out, in the page's own format: **19 of 23 shapes traversed, 7 of 9 outcome shapes
  delivered (3 strongly).**
