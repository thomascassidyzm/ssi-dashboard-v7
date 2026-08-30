# Irish public services mapped onto the shape metagraph — the port test

**2026-08-30.** The second sector, and the first PORT: does the trunk that survived health hold when
the sector, the language, the country and the buyer all change? Health tested the trunk against a
hand-authored corpus. This job tests it against a sector nobody has written down: the recurring
spoken encounters of an Irish frontline public servant, who is under a legal mandate to deliver 20%
of interactions in Gaeilge. The buyer is an agency that must hit a percentage, not an individual who
fancies a language.

**One thing is different from the health mapping and it governs how to read every table below: there
is no corpus.** Aran's 73 health flows were attested evidence; the Irish encounter inventory in §3
is derived — constructed by this mapping, because the thing does not exist anywhere to be read. So
this is a *derivation* test, not an attestation test: it can show what the trunk CAN and CANNOT
express for this sector, and where the mints concentrate; it cannot show corpus frequencies, and no
percentage in this document pretends to be one. Every encounter is labelled for how much of it is
knowable versus invented. Where the register of Irish administration matters (does a specific agency
actually do X?), we are offering the patterns, not guaranteeing any agency's exact procedure.

---

## 0. The prediction, written down and committed before any mapping was done

Stated now, frozen by commit, scored in §8.

**P1 — Family A re-attests, 5 of 6.** The health mapping's own §8 made the falsifiable claim this
job exists to test: *"a mechanic, a solicitor and a passport office all take consent, narrate an
act, check identity, deliver a result and signpost the encounter. Family A is the cheap prediction
to test next."* I predict `N101` medium contract, `N103` identity check, `N104` result delivery,
`N105` deferred grant and `N110` signposting all re-attest as primary assignments in the Irish
inventory — and `N102` consent-and-narrated act does **not**, or attests only thinly, because no
public servant acts on the citizen's body. The K4 analogue here acts on the FILE, and I predict that
difference is where the sector's real novelty sits.

**P2 — two to four mints, and I name where they will fall.** Both on the same single variable, which
I predict is this sector's contribution the way asymmetry was health's: **the official holds the
kinds in trust for an absent principal.** The refusal is not theirs, the apology is not theirs, the
timetable is not theirs. Predicted mints: (a) a *bound refusal with a contest path* — refusal
disowned by the refuser and handed over with the instrument to contest it; (b) a
*suspend-and-task* — the encounter that neither completes nor fails but suspends, with the re-entry
burden handed to the asker; (c) possibly an *institutional apology* move — sorry on behalf of a
party that is not the speaker, expecting no absolution; (d) nothing else at node grain. If the
inventory needs eight or more genuine shape-mints, or Family A re-attests at two or fewer of its
six, **the trunk does not port and that is the finding.**

**P3 — the rung.** The official holds K2 and K3; K1 is *split* (the official knows the rules, the
citizen knows their own circumstances, and both shares are load-bearing); K4's stake (money, child,
status) is real but sits on the citizen's side of the table and I predict it changes **cost, not
positions** — failing the recorded test — except where it meets K2, where I predict it forces the
contest-path position into existence. I predict the encounter set splits across rungs roughly 1–3
rather than sitting on one number.

**P4 — the three collapsing families.** F18 *That's normal, isn't it?* dies at K3 exactly as in
health — the record decides what normal is. F11 *And you?* dies at K2 — the identical question is
not returnable across a counter. F15 *I'm not sure* — the interesting one, and I take a position
rather than hedge: **it splits by seat.** The citizen's F15 survives and is taken up (the split K1
gives the citizen facts they are allowed to be unsure of); the official's F15 does not survive bare
and converts to `N105` routed form, exactly as in health.

**P5 — O7 stays invariant**, all five positions, which would be its third independent confirmation.

**P6 — P2 reckoning-and-pay re-attests.** Health could not attest it (NHS, no money). Irish public
services charge fees, so the port should recover a piece of trunk the health corpus went dark on.

**P7 — the second axis.** The cost-of-failing-to-recover weight lands on the same shapes it landed
on in health (`N107` conditional instruction, `N106` stop-and-verify) plus the two predicted mints —
shape-level, not line-level, confirming health's refinement. And I predict one caveat health could
not show: the sector's costliest failure (an entitlement never claimed) produces **no encounter at
all**, and a weight defined on shapes cannot carry a failure that never speaks.

---

## 1. What was read, and what there was to count

| Read | At | Note |
|---|---|---|
| The store, via `index.cjs` | `services/shared/metagraph/` @ `7540fddb6` (origin/main) | 17 nodes, 6 bound pairs, 20 move families, 19 composition edges, 15 survivability edges, 9 outcome shapes |
| The health mapping, in full | `docs/sector-pods/health-metagraph-mapping-2026-08-30.md` | the model for this document |
| The health proposal | `services/shared/metagraph/proposed/health-additions-2026-08-30.json` | ids 101–110, P101, F101–F104, C101–C110, S101–S107, O101 |
| The outcome-mints proposal | `services/shared/metagraph/proposed/outcome-mints-2026-08-30.json` | ids 201+; the `ladder` block with K1–K4 and the recorded test |

**There is no Irish corpus, so there are no counts to reconcile.** The unit of this mapping is the
*encounter*, not the exchange: 15 derived encounter types (§3), each written as a position sequence
with its failure branch, each mapped whole. No exchange percentages appear anywhere below because
none would be honest.

---

## 2. The rubric, fixed before mapping

The health rubric is inherited whole — clinical vocabulary swapped for administrative: **content is
the mask** (a PPS number is a date of birth is a blood-sugar reading; Intreo, Revenue, a county
council counter are all furniture); **role assignment is a walk annotation, not a shape
distinction**; **an opening or closing ritual may be present or absent**; **at most one position
unfilled**. MINTS require at least two consecutive positions no store or proposed node has, not
obtainable by composition. One position's worth of novelty is a move.

Two additions forced by the port situation:

1. **The comparison base is store + health proposal.** Health's ten mints exist precisely so the
   next sector can land on them — that was the health mapping's own §8 prediction. So every
   assignment below is tagged **[store]**, **[health]** (lands on a health-proposal id), or
   **[mint]** (needs a new Irish id, 401–499). The three-way split is the finding, and §9 states
   plainly what happens to the numbers if the health proposal is rejected.
2. **Attestation honesty.** Every encounter and every mint carries a label: **derived-confident**
   (the encounter type is definitional to any public counter — an application is taken, an identity
   is verified, a refusal is delivered; no knowledge of Irish specifics is needed to assert it
   exists) or **constructed** (the position ordering and the failure branch are this mapping's own
   invention). Nothing below is looked up, because nothing exists to look up; nothing is laundered
   as attested.

Settled context not re-opened: shapes are language-agnostic and Gaeilge is overlay, never a node;
asymmetry is graded with kinds K1–K4 and the test for a kind changing a shape is **"a position
appears, disappears or changes hands — not merely gets harder or dearer"**; survivability is
defined on the failure branch; POD-1 is extended, never re-cut — no store file is touched (§9).

---

## 3. The encounter inventory — written down for the first time

The recurring structured spoken encounters of an Irish frontline public servant — a counter, a
phone line, an office visit. The learner seat is the **official** (the buyer is an agency that must
deliver 20% of interactions in Gaeilge; its staff are the learners), which matches health, where
the learner was the professional. Each encounter is a position sequence; the failure branch is
stated because survivability is defined on it.

**E1 — The language-and-channel opening.** *(derived-confident: the 20% mandate makes this
encounter definitional; ordering constructed.)* Hail → return → the medium settled — the citizen
opens in Irish and the official holds it, or the official offers it, or the official declares a
limit and asks the licence ("my Irish is still coming on — if I get stuck may I switch and come
back?") → business opens. **Failure branch:** the official's Irish runs out mid-business → the
medium is re-negotiated in flight: declare, license the fallback, name the return path.

**E2 — Which-office triage.** *(derived-confident.)* A vague ask from someone who does not know
which service they want → elicit, repeatably → the actual need named and read back → the route:
a named desk, its hours, what to bring → the citizen banks it. **Failure branch:** "I've already
been there — they sent me here." The loop; the official either re-routes with a differentiator or
takes the routing on themselves ("let me ring them myself").

**E3 — Identity verification.** *(derived-confident.)* Known-answer questions — name, date of
birth, reference number — asked to confirm the person, not to learn the fact → supplied → the
silent match → business resumes. **Failure branch:** the answers don't match the record → halt,
re-verify from the top, withhold the file until certain.

**E4 — Application intake.** *(derived-confident; ordering constructed.)* Solicit the purpose →
elicit the fields, in chains → imprecise answers taken up rather than rejected — anchor them
("was it before or after Christmas you finished up?"), re-frame, or route to an artefact ("have
you a payslip with you?") → read back the completed form, with the read-back often *solicited* by
the official → commit it to the record, and say so → signpost what happens next and when they will
hear. **Failure branch:** a field cannot be filled at all → the encounter suspends (E7).

**E5 — Entitlement check with a verdict.** *(derived-confident.)* "Am I entitled?" → the record
consulted → the verdict delivered against a norm the citizen does not hold ("you need 520 paid
contributions — you're at 480") → banked, or challenged for its meaning → the reference points
supplied → what follows from it. The number is not negotiated; it is explained.

**E6 — Refusal of an application or benefit.** *(derived-confident; failure branch constructed.)*
The decision delivered negative → the reason given as a **rule the refuser did not author and
says so** ("it's not my decision — the threshold is set in the scheme") → the contest path handed
over **unbidden**: the review, the appeal, its deadline, where it goes → the citizen absorbs and
banks the path — **or contests the person.** **Failure branch:** the press lands on the official
("you people," "you could if you wanted") → the official drops the self and holds the rule ("being
cross with me won't change the figure — the appeals officer is the one who can") → the press is
re-routed to the process.

**E7 — Suspension with a task.** *(derived-confident.)* The application cannot proceed → the gap
named against a checklist → what is preserved, stated ("everything else is done — I'll hold it on
file") → the task handed **back across the counter**, with the re-entry condition and the
acceptable alternatives ("any one of these three documents, and we finish it on the spot") → the
citizen banks the task. **Failure branch:** no qualifying document can ever be produced → escalate
to a person who can waive (E2's route) or a refusal with a contest path (E6).

**E8 — A deadline explained.** *(derived-confident.)* The trigger condition — a date → the action
and what is lost if it passes → the threshold question ("what if I'm a day late?") → the boundary
enumerated → read back → where the record of it lives ("it's all in the letter").

**E9 — A form corrected.** *(constructed.)* The error named, with the evidence ("you've put the
old address here, but the licence says Cork") → the correction elicited → recorded → confirmed.

**E10 — A complaint received.** *(derived-confident; ordering constructed.)* The complaint → the
telling ratified ("you're right to raise it") → an apology **on behalf of the institution**, no
personal fault conceded, no absolution sought → recorded → routed to the process that owns it.
**Failure branch:** the complainer wants the official to own it personally → the E6 hold.

**E11 — A fee paid.** *(derived-confident.)* Motor tax, a certificate, a licence: order →
reckoning → pay-request → grant → receipt. Money changes hands. (Health could not attest this —
NHS. Ireland can.)

**E12 — An appointment made.** *(derived-confident.)* Proposal → decline with an account and a
counter → counter again → accept.

**E13 — The queue held.** *(constructed.)* The summons ("next, please") → holds ("I'll be with you
in one moment") → and the desk that closes mid-queue: the thread named and banked **with its
recovery** ("I'll flag you to the next window — you won't lose your place").

**E14 — A service explained to someone who doesn't know what they want.** *(derived-confident.)*
Solicit → recommend, with grounds → uptake.

**E15 — A stake disclosed mid-business.** *(constructed; the type is certain at any welfare
counter.)* Business in progress → the citizen steps out of the frame unbidden ("if this doesn't
come through I don't know what I'll do — I've the two children") → acknowledged without fixing —
or, the pull of the counter, *routed* to a support service → the discloser closes the aside → the
business resumes. And the counter-direction: the official's own aside ("bear with me — the
system's been down all morning") → received → resumed.

---

## 4. The mapping — every encounter, LANDS or MINTS

| Encounter | Primary | Also traversed | Verdict |
|---|---|---|---|
| E1 language opening | N101 **[health]** | N1, N7/N9 composed in the opener; failure branch = N101's own | **lands** |
| E2 triage | N105 **[health]** | P5, F9; loop branch → N105 repeated or escalated | **lands** |
| E3 identity | N103 **[health]** | failure branch N106 **[health]**, via C103's own composition | **lands** |
| E4 intake | P5 chains **[store]** | P3, F104, F103, N110 **[health]**; hedge-uptake = S102's recovery | **lands** |
| E5 entitlement verdict | N104 **[health]** | S104's recovery (supply the thresholds either side) | **lands** |
| E6 refusal | **N401 [mint]** | N104 composed in (the rule-referenced reason); F16; N105 on escalation | **mints** |
| E7 suspension | **N402 [mint]** | F9, F103; escalation → N105 or N401 | **mints** |
| E8 deadline | N107 **[health]** | P3; the threshold is a date, same positions | **lands** |
| E9 correction | O5 recovery + P3 + F103 | composition only | **lands** |
| E10 complaint | F101 **[health]** + **F401 [mint, move]** | F103, N105 | **mints a move** |
| E11 fee | N2 + P2 **[store]** | — | **lands** — and re-attests P2, dark in health |
| E12 appointment | N7 **[store]** | N108 **[health]** where a standing constraint is recorded ("I can't do mornings — I'm a carer") | **lands** |
| E13 queue | F21 + N110 + N17 **[store/health]** | supplies N17's unattested recovery half, as health's agenda-parking did | **lands** |
| E14 service explained | N8 **[store]** | — | **lands** |
| E15 disclosure | N204/O7 **[overlay proposal]** | F204, or the violation-by-routing (N105) health also showed | **lands** |

**The distribution — which is the finding.** Fifteen encounter types: **six land primarily on the
original store, seven land primarily on health's proposed Family A/B shapes, and two mint at node
grain plus one at move grain.** Read that middle column again, because it is the whole result: the
port succeeded, and *what carried it was not the 17-node store alone — it was health's mints.*
N101, N103, N104, N105, N106, N107, N110, F101, F103, F104, N108, N109, F102 and P101 all
re-attest in a second sector, in a second country, against a different buyer, exactly as the health
mapping's §8 predicted a passport office would re-attest them. Of health's fifteen proposed shapes
and moves, **the only clean failure is N102 consent-and-narrated-act — the body shape — and its
failure is position-perfect: no public servant acts on the citizen's body, and the one Family A
shape that drops out is exactly the one whose defining position is the body.** The kinds are doing
real work: remove the body from the encounter and the body-shape vanishes, position for position.

Re-attestations of the second-order claims, for the record: **N109** attests ("when will I get the
money?" — "I can't promise a date; once it's with the processing team it's out of my hands, but
most clear inside three weeks") with one instructive difference — in health the bound on the
promise is *epistemic* (the doctor cannot know), here it is *jurisdictional* (the official does not
control). Same positions, different licence; a licence is not a position, so this is a note, not a
mint. **F102** attests ("six weeks is the standard processing time"). **N108** attests (the carer's
standing constraint written onto the file for encounters not yet arrived). **P101** attests,
citizen-side ("sorry to be a nuisance" — "not at all, that's what we're here for").

### 4.1 The moves pass — all twenty families against the inventory

Seventeen of twenty attest; the same three fail as in health, for the same single cause, with one
refinement that is this section's contribution.

| Move | In the Irish inventory? | Where |
|---|---|---|
| F1 | yes, everywhere | every grant at every counter |
| F2 | yes | "That's stamped — and I've put a note on so you won't be asked for it twice." |
| F3 | yes | intake counter-questions throughout E4 |
| F4 | yes, **citizen-side** | "Around March, I think it was." Official-side it converts — see F15 |
| F5 | yes | E12: "I can't do Thursday — I've the school run. Could it be the afternoon?" |
| F6 | yes | "You don't need the full renewal — just the update form." |
| F7 / F8 | yes | and licensed in advance by N101, exactly as health licenses them at 1.0/2.0 |
| F9 | yes, abundantly | the read-back is the form's whole life (E4, E7, E8) |
| F10 | yes, thin | "Go on — and then what happened with the tenancy?" |
| **F11** | **no** | the official's questions are not returnable: the citizen who has given their PPS number cannot ask the official's. **Dies at K2.** |
| F12 | yes, thin | "You've filled that in perfectly." |
| F13 | yes, thin | citizen-side, deflecting F12 |
| F14 | yes | counter ritual, open and close |
| **F15** | **splits by seat — the refinement** | see below |
| F16 | yes | the E6 hold: concede the anger, hold the rule |
| F17 | yes | "You're not wasting my time at all." |
| **F18** | **not in its strict form** | the citizen may *utter* it — "six weeks, that's not normal, is it?" — but the completing position (a peer's emphatic agreement) is unavailable: the official answers from the record with F102. Position 3 changes hands to the record. **Dies at K3.** |
| F19 | yes, as ritual | with health's §6.2 warning inverted intact: a wellbeing enquiry at a welfare desk may be a genuine elicit wearing ritual clothes |
| F21 | yes | "Anything else I can do for you today?" |

**The F15 refinement.** The brief asked whether *I'm not sure* survives when the official holds K1
only partially — the citizen knows their own circumstances, the official knows the rules. Ruling,
from the encounters: **F15 dies or survives by which side of the split K1 the unknown fact sits
on, not by who is speaking.** Three cases: (1) the *citizen* unsure about their own circumstances —
survives, and is *taken up*, which is S102's recovery running in the official's mouth (anchor it,
re-frame it, route to an artefact: E4). (2) The *official* unsure about the rules — does **not**
survive bare; it converts to N105 ("I'll check with the deciding officer and ring you Thursday"),
exactly health's finding. (3) The fact assigned to *neither* side — "will the scheme change next
year?" — and here the official's bare F15 **stands**: "honestly, I couldn't tell you." So the
health formulation "the professional may not stay uncertain" was one rung of a sharper rule: **the
K1-holder may not stay uncertain about facts K1 assigns to them; about unassigned facts, anyone
may.** One variable, three families, same deaths as health — the move layer ports.

---

## 5. The ladder — which kinds the official holds, ruled from the encounters

Tom's instruction, verbatim: *"a citizen-and-official encounter plainly holds K2 and K3 (the
official can refuse, and holds the record) and arguably not K4. Rule it explicitly and justify from
the encounters, not from intuition."* Ruled, using the recorded test throughout: **a position
appears, disappears or changes hands — not merely gets harder or dearer.**

**K2 — held, and the test fires twice.** The official can refuse and end the encounter (E6, E7).
But the holding is *qualified* in a way the test can see: (1) a position **appears** — the contest
path, handed over unbidden inside the refusal turn (N401 position 3; nothing in N201, F5 or F6 has
it); (2) a position **disappears** — the refuser's discretionary settle. W201's taxi driver can say
"I'll wait"; the deciding officer cannot concede against the rule, and N201's position 4 is simply
not available to them. Two position-changes → K2 is held, and *how* it is held changes the shape —
which is exactly why E6 mints rather than landing on N201.

**K3 — held, strongly; arguably the sector's centre of gravity.** The record is not an instrument
beside the business, as the chart is in health — the record IS the business. F103 saturates the
inventory; F18 dies to it; N106 attests off it (E3's mismatch); N108 writes to it for encounters
not yet arrived. No argument the other way worth the ink.

**K1 — split, and load-bearing in both directions.** The official knows the rules and the system;
the citizen knows their own circumstances — and the citizen's share *decides the outcome*, which
makes this a deeper split than health's (the patient knows their symptoms, but the doctor's
knowledge dominates the encounter). The test: the elicit pair runs in **both directions inside one
encounter** — the official elicits circumstances (E4), the citizen elicits rules (E5, E8) — so the
elicit position changes hands, repeatedly and structurally. The F15 seat-split (§4.1) is this
finding expressed at move grain.

**K4 — argued both ways, as instructed, then ruled.**
*For holding it:* the stake is genuine and can be enormous — a refused housing application, a
child's allowance, an immigration status are life events; money, home and child are on the table
as surely as a body is on a trolley. *Against:* run the test. In encounter after encounter the
stake makes positions harder and dearer — the close with nothing won costs more, the disclosure
(E15) is more likely — but no position appears, disappears or changes hands *because* the stake is
high. A stakeless E6 and a stake-bearing E6 walk the same positions. **Ruling: K4 is present as
the CITIZEN'S stake and it fails the test as a kind the official holds — with two carve-outs that
keep the ruling honest.** First, where K4 meets K2, a position does appear: the trivial refusal
("we close at four") carries no contest path; the stake-bearing refusal must — so the contest-path
position of N401 is a K4×K2 interaction, not K2 alone. Second, the body carve-out: the official
never holds the citizen's body, and the one health shape that fails to port (N102) is exactly the
body shape. K4's *body* reading is absent; its *stake* reading is real but operates through the
second axis (§6) — cost, not shape.

**Per-encounter rungs, not one number.** The inventory splits, as predicted:
- **Rung 1** (K1-split only): E2 triage, E13 queue, E14 service explained — a citizen asking a
  knowledgeable stranger.
- **Rung 2** (K1 + K3): E3, E4, E9, E11 — the record enters; the official still decides nothing.
- **Rung 3** (K1 + K2 + K3, the stake on the table): E5, E6, E7, E8, E10 — refusal, suspension,
  deadline, verdict.
- **Nothing at rung 4.** No body. Ireland sits *below* health on the ladder while minting two
  shapes health never needed — which is itself evidence the ladder is not a difficulty ladder and
  the mints do not come from rung height. They come from something the ladder does not currently
  say: see §5.2.

### 5.1 The three collapsing families, checked against this rung

Exactly as the ladder block predicts, and one refinement: **F18 dies at K3** (the record decides
what normal is — attested-by-construction at E5/E8, F102 replacing it). **F11 dies at K2** (the
question is not returnable across a counter). **F15 dies at K1 — but only on K1's own side of the
split**: the sharper rule in §4.1, which is consistent with health (the doctor's K1 covers nearly
everything, so health saw a total death) and explains both corpora with one statement.

**O7's invariance — the third confirmation, with its evidence honestly weighed.** Walked at E15:
business in progress ✓ → unbidden disclosure ✓ → acknowledge without fixing — and the counter's
pull is to *route* (N105), the exact violation health showed with the professional fixing; the
recovery position itself is unchanged ✓ → the discloser closes ✓ → resume ✓. **All five positions
stand at this rung too.** The kinds change only who is licensed to disclose (the official's own
asides — the broken printer, the long morning — flow more freely than the doctor's, because less
K4 sits on them) and how hard the resume is. But state the evidence class plainly: health's O7
confirmation was against an attested corpus; this one is against constructed encounters. It is a
consistency check passed, not an independent attestation.

### 5.2 What this sector actually contributes — proxy holding

Health's contribution was *asymmetry has kinds*. The Irish counter's candidate contribution is one
step further: **for whom the kinds are held.** The doctor holds K1–K4 in their own person — their
knowledge, their authority, their chart, their hands. The official holds K2 and K3 **in trust for
an absent principal**: the refusal is the rule's, the apology is the institution's, the timetable
is the processing team's. Every mint and near-mint in this mapping is this one variable surfacing:
N401 (the refusal disowned, with the principal's contest instrument handed over), F401 (sorry on
behalf), the N109 licence-shift (bounded by jurisdiction, not knowledge). The recorded test sees
it — positions appear and disappear (§5, K2) — so it is shape-relevant, not colour. My
recommendation, held loosely for Tom: **not a fifth kind** — it does not say *what* is held but
*how* — an annotation on the held kinds (`held_in_trust`) in the ladder block, carried on the
proposal file, costing the ladder nothing if wrong.

---

## 6. The second axis, tested rather than assumed

The candidate, from health: *weight the overlay selector by the cost of failing to recover* — with
health's refinement that the weight belongs on the SHAPE, not the line.

Ireland's cost inventory, from the encounters: **a benefit refused** (livelihood, E6); **a
deadline passed** (a right extinguished — the sharpest, because it is irreversible, E8); **a form
mis-filed** (weeks of delay, and worse: a wrong record propagates through K3 to encounters that
have not happened yet — N108's absent-beneficiary logic running in reverse, E4/E9); **an
entitlement never claimed** (the costliest, and the strangest — see below).

**Where the weight lands: on the same shapes it landed on in health, plus the two mints.** N107
carries it here as there — the deadline's conditional instruction is the highest-cost speech in
the sector, and it is the same shape that carried health's ⚠ strand. N106 carries it — the
mismatch caught at E3 is the medication-round halt in administrative clothes. And the two Irish
mints are both high-cost shapes: N401's contest path is the recovery whose absence costs the
citizen the decision; N402's banked task is the recovery whose absence kills the application
*silently*. Meanwhile the low-cost shapes inside high-cost encounters stay low-cost — E6's closing
F14 and P101's nuisance-apology sit inside the sector's heaviest encounter and carry no weight at
all — which is precisely the evidence that the weight tracks shapes and not encounters.
**Verdict: supported, shape-level, second sector — health's refinement confirmed.**

**The caveat health could not show.** The sector's single costliest failure — the entitlement
never claimed — produces **no encounter at all**. Nobody presents; nothing is said; no shape can
carry a weight for a conversation that never happens. In health the body eventually complains and
drags its owner into the room; a missed entitlement is silent forever. So the axis has a blind
zone in this sector: it can weight every recovery a learner might need to *hold*, and it cannot
reach the failure that consists of never speaking. That is a fact about the axis's scope, not a
defect in it — the fix, if anyone wants one, is outreach and product, not the overlay selector.

**What would have to be true for this verdict to be wrong:** if cost tracked encounters rather
than shapes — if everything inside a refusal encounter were high-weight — the line/shape question
would reopen. The E6 close and P101 counter-example above is why I rule it does not.

---

## 7. The two mints, the one move, and the nine things this mapping refused to mint

Full definitions with positions, neighbour arguments, smoke tests and attestation labels are in
`services/shared/metagraph/proposed/ireland-public-services-2026-08-30.json` (ids **401–499**,
fixed; nothing outside it). In brief:

| id | Name | The position pair that makes it new |
|---|---|---|
| **N401** | Bound refusal with a contest path | The refusal is **disowned** by the refuser ("it's not my decision") and the **contest instrument is handed over unbidden** — path, deadline, forum. N201's refuser owns the refusal and may settle; F5's counter is the refuser's own negotiable offer; N105 routes a *grant*. Nothing in the store or the health proposal routes a *contest*. |
| **N402** | Suspend-and-task | The encounter neither completes nor fails: the **state is preserved and declared** ("everything else is done, I'll hold it on file") and the **re-entry burden is handed back across the counter**. N105 keeps the burden on the responder's side (a named third party will settle it); N107 is contingent on an event that may never occur — N402's task is necessary; O1 leaves nothing alive — N402's application half-lives. |
| **F401** | Sorry-on-behalf *(move)* | Apology for a fault attributed to the speaker's party but not the speaker, conceding no personal fault, seeking no absolution, moving to record or remedy in the same turn. Not P101 (self-blame for imposing, absolved); not F203 (real own fault, priced); not F14 (there is propositional content). One position's worth of novelty = a move, per the rubric. |

All three are labelled **constructed** in the proposal file — no corpus attests them; the
encounters they rest on are derived, and the file says so on every attestation line. All three pass
the smoke test and are marked **trunk**: a visa desk, an insurance claim line, an exam board and a
referee all deliver bound refusals with contest paths; a garage awaiting a part and a tailor
awaiting a fitting both suspend-and-task; every employee of every organisation everywhere says
sorry on behalf.

**The nine refusals, each as informative as a mint:**

1. **The Gaeilge offer / the language opening** — lands on N101 whole. Minting on the language
   would be minting on vocabulary: the exact discipline the health worker held on "is that
   normal?", copied here deliberately.
2. **Redirect to another office** — N105; an office is a named third party. Minting would be
   minting on furniture.
3. **Form-filling** — P5 chains + P3 + F103 by composition; no two consecutive novel positions
   anywhere in it.
4. **The eligibility verdict** — N104 whole; 520 contributions are a blood-sugar reading in a
   different mask.
5. **The deadline warning** — N107 whole; a date is a threshold.
6. **The queue summons** — F21's solicit seat plus ritual; not a shape.
7. **The systemic bounded promise** ("out of my hands, but usually three weeks") — N109 with the
   bound licensed by jurisdiction instead of knowledge. A licence is not a position.
8. **Escalation to a supervisor** — N105, composed inside N401 position 5 when the contest is
   pressed; composition, not a node.
9. **The official who goes off-script and personally refuses** ("no, I won't do that") — that is
   N201, already in the outcome-overlay proposal; the trunk covers the official the moment they
   stop being a proxy.

**Mint zero outcome shapes, on purpose.** The sector's candidate outcome — "you are refused by a
rule, not a person" — is O1 walked at a new place on the ladder (K2 held in trust), and the ladder
block is the right carrier for that, not a tenth O. And the sector's costliest failure (§6) has no
conversation to be an outcome *of*.

---

## 8. The prediction, scored

**P1 — Family A re-attests 5 of 6, N102 the miss.** **Right, and the result is stronger than the
claim:** not five but *thirteen-plus* of health's fifteen proposed shapes and moves re-attest
(§4), and the single clean failure is N102, for the position-perfect reason predicted — no body.

**P2 — two to four mints, named in advance.** **Right on the count (2 nodes + 1 move) and right on
all three identities** — the bound refusal, the suspend-and-task, the institutional-apology move
were all named before mapping, and nothing else minted.

**P3 — the rung.** **Right:** K2+K3 held, K1 split, K4 failing the position test except through
K2, encounters split across rungs 1–3.

**P4 — the family deaths.** **Right, including the F15 seat-split** — though the mapping sharpened
it beyond the prediction: the death is assigned by *which side of the split K1 the fact sits on*,
not by seat alone, and the unassigned-fact case (the official's bare "honestly, I couldn't tell
you") was **not predicted.** That refinement is this mapping's F15 contribution.

**P5 — O7 invariant.** **Held** — all five positions at this rung — with the evidence-class caveat
of §5.1: a consistency check against constructed encounters, not an independent attestation.

**P6 — P2 re-attests.** **Held.** E11. The trunk recovers a bound pair the health corpus went dark
on.

**P7 — the second axis.** **Right on both halves:** shape-level, same shapes plus the mints; and
the silent-failure blind zone was predicted and confirmed in the analysis.

**The blind spot, because the health worker's most valuable finding was its own:** the prediction
did not foresee **proxy holding** as the sector's organising variable (§5.2). It predicted the
in-trust flavour of the mints, but not that *every* novelty in the sector — both mints, the move,
the N109 licence-shift, the K2 position-changes — would turn out to be one variable, the way
health's ten mints turned out to be asymmetry. That is the port's genuinely new information.

**One honesty caveat on the scoring itself.** Health's prediction was made by Watson and scored by
a different worker; this prediction and mapping are one mind in one sitting, and the prediction
was made *after* reading the health mapping in full. A prediction that nearly all comes true under
those conditions is weaker evidence than health's was. The commit order (prediction at
`bb39661b2`, mapping after) is real, but the epistemic independence is partial — the strong form
of this test is Aran authoring Irish flows *without reading §3*, then checking them against this
inventory.

**The stake, ruled: THE TRUNK PORTS.** Two node-mints against a 17-node store plus a 10-node
health proposal; 17 of 20 moves attested with the same three deaths for the same cause; O7
invariant a third time; P2 recovered; the second axis confirmed at shape level. And the port names
what it actually rode on: **health's Family A behaved as trunk, exactly as the health mapping
predicted it would.** The correction the trunk needs from this sector is one annotation (held in
trust), not a rebuild — the same class of result health delivered, one level up.

---

## 9. Honesty section — what this is and is not

**There is no corpus, and nothing here pretends otherwise.** Every encounter in §3, every
attestation of every mint, and both confirmations (O7, second axis) are **derived or constructed
by this mapping** — labelled per-encounter in §3 and per-item in the proposal file. What this
document can honestly claim: the trunk can *express* the derived Irish inventory with two node
mints; the mints concentrate on one variable; the family deaths and the O7 walk are *consistent*
with the ladder. What it cannot claim: frequencies, exchange distributions, or that any Irish
official has ever said any line quoted here. The 53%-style numbers in the health mapping have no
analogue in this one, and none was invented.

**The dependency that changes the numbers if it moves.** This mapping lands seven of fifteen
encounters primarily on **health-proposal ids that are themselves unapplied proposals.** If Tom
accepts health's additions, Ireland needs ids 401–403 and the port is as cheap as §4 says. If
health's Family A were *rejected*, roughly **eight further shapes** (N101, N103, N104, N105, N106,
N107, N110 and F103 at least) would have to mint here under Irish ids, and this document's "two
mints" headline would be false in that world. The trunk that ports is **store + Family A**, and
that is precisely why §10 asks the Family A question first.

**The least confident calls, named so they can be attacked:** (1) the N402/N105 boundary — both
defer; I split them on *who carries the burden away*; a stricter reader could call N402 an N105
variant and the mint count drops to one. (2) The K4 ruling leans on constructed encounters; a real
corpus with a housing refusal in it could surface a position I have not imagined — the ruling is
falsifiable and says how. (3) F401's independence from F14 ritual apology is argued from content
("the fault is real"), which is thinner ice than a position argument.

**What I did not do, and did not need to do:** no test suite (the one process run was
`tools/metagraph-selfcheck.cjs`); no DB reads or writes; no web research (none available, none
needed — the shapes are the deliverable, not Irish administrative fact); no fan-out; no Script
Lab, UI or course content; no store modification of any kind. **The store is byte-identical**:
`git diff origin/main -- services/shared/metagraph/nodes.json services/shared/metagraph/moves.json
services/shared/metagraph/edges.json services/shared/metagraph/outcome-shapes.json
services/shared/metagraph/walks/` is empty, and the self-check result is quoted in the report and
below. The proposal file carries the same schema notes as health's (the `provenance` enum needs
the same one-line widening; attestations carry a `constructed` array because there are no g-rows
and no flows to cite).

---

## 10. What this feeds, and the three decisions

- **The proposal file:** `services/shared/metagraph/proposed/ireland-public-services-2026-08-30.json`
  — 2 nodes, 1 move, 3 composition edges, 4 survivability edges, 0 outcome shapes, a ladder block
  with per-encounter rungs and the `held_in_trust` annotation. Ids 401–499, nothing loads it,
  applying it is a separate reviewed decision.
- **Aran:** §3 is an authoring spine — fifteen encounter types with their failure branches, in the
  register his health flows already use. If he authors Irish flows *without reading §3 first*, the
  comparison of his corpus against this inventory is the strong form of the test §8 says this
  document cannot run on itself. Start with E4, E6, E7 — they carry the sector's weight.
- **The ladder work:** O7's third confirmation; the F15 sharper rule (dies on K1's own side of a
  split, survives on unassigned facts); the K4 stake-versus-body distinction; the silent-failure
  blind zone on the second axis.

**Three decisions for Tom, each one-word answerable, with recommendations:**

1. **Does Family A graduate from "health branch" to trunk?** It re-attested in a second sector,
   second country, second buyer, exactly as health's §8 predicted. *Recommend: yes.*
2. **Is proxy holding a ladder ANNOTATION (`held_in_trust` on the held kinds) rather than a fifth
   kind?** It says how kinds are held, not what is held; the recorded test sees its effects.
   *Recommend: annotation.*
3. **Should Aran author the Irish flows blind — without reading §3 — so the inventory can be
   tested rather than merely used?** *Recommend: yes.*
