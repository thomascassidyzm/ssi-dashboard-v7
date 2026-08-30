# The response-family inventory — mined from the canon pod

**Corpus:** `canonical_pod_scenarios` where `pod_slug = 'pod-0'` — the live learning-app POD 1
(Sarah's day / transactional / Aran's rewrite of the Croatian experiment), 231 rows, 22 scenes.
Verified against the two sacked slates at read time: `pod-0.5` (27 rows, 7 scenes) and `pod-1`
(236 rows, 16 scenes) were **not** read as attestation. No row from either is cited below.

**Date:** 2026-08-29. Read-only. Every count in this document is re-derivable from the row
identifiers cited; the per-row classification is in Appendix A so a second reader can disagree
with a specific line rather than with a number.

**Row identifier convention:** `g<global_order>` — `global_order` is a single stable ordinal
across the whole pod (1–231) and is unique, so it is used alone. Scene and sentence numbers for
each cited row are in Appendix A.

---

## Headline — what the corpus actually attests

The canon is **smaller than 231 rows for this purpose**. Of 231 rows, **16 are narrator vocab
codas** and **73 are single-speaker drill lines** in the seven "Extra phrases" scenes (15–21),
which have no partner turn and are all attributed to `Learner` regardless of who is plainly
speaking. **The dialogic corpus is 142 rows**, containing **47 exchanges** and **96
response-position turns**. Against that base the corpus attests **twenty response families
densely enough to name**, of which **four carry ten or more attestations**, **seven carry three
to eight**, and **nine are thin (one or two)**. Four of the thin ones sit entirely inside a
single scene and may be scene artefacts rather than families: F5 in scene 4; F16, F17 and F18
in scene 22. Aran's four —
happy path / question / problem / human moment — are **all four present and all four
sector-invariantly attested**, which confirms the seed; but the mass is grotesquely uneven:
happy-path families carry 75 of 96 response turns, the human-moment cluster carries 7 and
**all 7 are in scene 22**. The corpus can support a real inventory of the transactional floor.
It **cannot** support an inventory of the conversational layer — that layer is attested by one
scene, and the honest reading is that POD-2 must mint it, not mine it.

---

## The inventory

One row per family. **Count** = response-position turns attested (a turn may carry two families;
the column sums to more than 96 for that reason). **Cited rows** are complete, not a sample.

| # | Family (corpus name) | Decision procedure — re-runnable | Count | Cited rows (`global_order`) | Exchange shape, and position within it | Survivability prerequisites / composition |
|---|---|---|---|---|---|---|
| F1 | **Just do it** | The responder supplies exactly what the prior turn asked for, adds nothing beyond it, and does not qualify it. Includes selecting from an offered set and physically handing something over. | 34 | 4, 11, 17, 18, 26, 27, 29, 39, 41, 43, 45, 46, 47, 54, 56, 60, 70, 72, 77, 78, 81, 82, 85, 88, 92, 95, 98, 99, 100, 112, 113, 121, 222, 225 | TICKET → **GRANT** → (delivery) → receipt. Position 2. | Prerequisite to everything. Composes into every other shape. |
| F2 | **Do it and throw something in** | The responder grants, then volunteers material the ticket did not ask for: an attribute, a recommendation, a limit, a warning, a reassurance, a location. Test: delete the extra clause and the ticket is still fully answered. | 20 | 6, 16, 30, 32, 35, 49, 51, 55, 65, 74, 76, 102, 104, 106, 115, 117, 126, 128, 132, 139 | TICKET → **GRANT+** → receipt. Position 2. | Presupposes F1. Presupposes the asker can survive being handed information they did not ask for — i.e. presupposes **F7 repair** survivable. |
| F14 | **The done thing** | The turn's whole job is to return a ritual with its matching ritual: greeting/greeting, pleased-to-meet-you/too, thanks/you're-welcome, see-you-later/see-you-then, welcome. No propositional content is exchanged. | 17 | 2, 4, 19, 21, 22, 24, 27, 28, 36, 70, 93, 94, 95, 98, 108, 118, 129 | HAIL → **RETURN**. Position 2. Also the closing position of most transaction shapes. | No prerequisites. Composes into the open and the close of every other shape. |
| F12 | **Nice one** | The responder assesses the other party, their choice, their offering or their help — "excellent choice", "how interesting", "you've been very helpful", "I'm impressed", "lovely". Test: the turn expresses a valuation, not a fact or a request. | 11 | 31, 36, 82, 93, 94, 100, 129, 222, 226, 228, 229 | OFFERING → **ASSESSMENT** → (uptake). Position 2. | Presupposes F1 and F14. Prerequisite for F13, F17, F18. |
| F3 | **Answer with a question** | The response position is filled by a question rather than by an answer or a compliance — the responder asks before proceeding. Covers the server's option-offer ("regular or large?"), the pre-answer elicit ("what are your symptoms?"), and the customer's own counter-question at the reckoning. | 8 | 40, 42, 48, 80, 111, 133, 138, 224 | TICKET → **COUNTER-Q** → SPECIFY → grant. Positions 2 and 3 as a bound pair. | Presupposes **F7/F8 repair survivable** — you cannot ask a question you may not understand the answer to unless you can survive it. This is the corpus's clearest survivability edge. |
| F6 | **Not that, but this** | The responder does not supply the thing asked for and supplies a different thing that serves the same purpose, without an apology or an account. Test: the ticket is declined in substance and something is substituted in the same turn. | 5 | 15, 59, 84, 108, 136 | TICKET → **SUBSTITUTE** → re-select. Position 2. | Presupposes F1 and F4. Presupposes the asker can re-select, i.e. composes the option-choice shape. |
| F4 | **Roughly, and it depends** | The answer is given with an explicit hedge, an approximation or a condition attached — "maybe", "perhaps", "about", "I think so, but", "if we're not unlucky", "if you have it". Test: remove the hedge and the turn asserts something the speaker has not committed to. | 5 | 9, 41, 90, 121, 134 | Q → **HEDGED A** → (uptake). Position 2. | Presupposes F1. Presupposes the asker can act on an uncommitted answer. `g90` extends it — the hedge hands the checking back ("you'll have to look to make sure"). |
| F11 | **And you?** | The responder answers and hands the identical question straight back, in the same turn, with a minimal form ("And you?", "And what do you do?"). Test: the return question is the same question, not a new one. | 4 | 26, 29, 32, 34 | Q → **A + RETURN** → A + return → … Position 2, and it is what makes the shape recursive. | Presupposes F1. **Composes the acquaintance shape** — without it the shape is an interrogation, not an exchange. This is the corpus's one attested chain-extender that is not a new ticket. |
| F21 | **Anything else?** | The responder completes the ticket and immediately solicits a further one in the same turn — "would you like anything else?", "would you like the menu?", "the table by the window is free". Test: the turn closes one piece of business and opens another. | 3 | 16, 45, 51 | GRANT → **ONWARD SOLICIT** → new ticket. Position 2→1 pivot. | Presupposes F1. Composes the transaction shape into a chain. Same move occurs in initiating position at `g71`, `g83` — not counted here. |
| F9 | **Let me check I've got it** | The responder offers back a candidate version of what they just heard, as a question or as a confirming restatement, and the other party confirms — usually by repeating and extending. Test: the turn's content is a version of the prior turn's content, not new content. | 3 | 98, 122, 123 | INSTRUCTION → **READ-BACK** → **CONFIRM-AND-EXTEND**. Positions 2 and 3, bound. | Presupposes **F8** — a read-back that is wrong gets corrected, so the reader must survive correction. `g123` attests the correction ("past the church **and the post office**"). Composes into every instruction-giving shape. |
| F16 | **Fair enough, but I still** | The responder concedes the other's point and then holds their own position with a "but" — "it's a bit difficult…, though", "it's just frustrating…, but I know that I need to keep practising". Test: both a concession and a retained position in one turn. | 3 | 225, 227, 229 | ASSESSMENT → **CONCEDE-AND-HOLD** → counter-assessment. Position 2. | Presupposes F12. Presupposes disagreement survivable. **All three attestations are in scene 22** — see the caveat below. |
| F19 | **Here's how I am** | The responder answers a formulaic wellbeing enquiry with a state report — "I'm very well, thank you", "Yes, very. I'm very tired now". Test: the question was ritual, the answer reports an internal state. | 2 | 3, 24 | WELLBEING-Q → **STATE REPORT**. Position 2. | Presupposes F14. May be a sub-case of F14 rather than a family — split here per the splitting default; two attestations cannot settle it. |
| F5 | **No, and here's why, and here's instead** | The responder declines a proposal, gives an account for the decline, and offers a counter-proposal — all three parts. Test: all three parts present. | 2 | 21, 22 | PROPOSAL → **DECLINE+ACCOUNT+COUNTER** → decline+account+counter → accept. Positions 2 and 3. | Presupposes F1 and F14. Presupposes **surviving the other's counter-decline** — uniquely attested here: `g21` declines and `g22` declines the counter. **Both attestations are in scene 4** — possibly a scene artefact, though it is the corpus's only two-sided negotiation and is structurally load-bearing. |
| F13 | **Kind of you, but** | The responder receives a compliment, thanks for it, and immediately downgrades the claim about themselves — "that's very kind of you! … I need to practice more", "thank you, that's good to know. I need to learn more words". Test: acceptance token followed by self-downgrade. | 2 | 95, 223 | COMPLIMENT → **THANK-AND-DOWNGRADE** → (counter-assessment). Position 2. | Presupposes F12 and F14. Prerequisite for F17 — the downgrade is what a counter-assessment answers. |
| F17 | **No you're not** | The responder contradicts the other party's account of themselves, positively — "you should be confident already", "you're doing much better than you realise", "you seem to speak it very well". Test: the turn asserts the opposite of what the other just said about themselves. | 2 | 226, 228 | SELF-DOWNGRADE → **COUNTER-ASSESSMENT**. Position 2. | Presupposes F12 and F13. **This is the corpus's only disagreement of any kind.** Both attestations are in scene 22. |
| F18 | **That's normal, isn't it?** | The responder normalises the other's difficulty and invites agreement with a tag; the partner agrees emphatically. Test: a tag question or an emphatic agreement token ("it really is"). | 2 | 230, 231 | DIFFICULTY → **NORMALISE+TAG** → **EMPHATIC AGREE**. Positions 2 and 3, bound. | Presupposes F12 and F16. Both attestations are in scene 22, and they are the last two rows of the corpus. |
| F7 | **Say that again** | The responder declares non-understanding and requests a repeat, usually with an account and a speed request. Test: the turn asks for the prior turn to be redone. | 1 dialogic (+2 drill) | 33 · drill: 153–154, 213 | TURN → **REPAIR REQUEST** → repeat/reformulate. Position 2. | No prerequisites. **Prerequisite to almost everything else** — the corpus places it inside the very first acquaintance scene. |
| F8 | **Said again, differently** | The responder grants a repair request and reformulates rather than merely repeating — shorter sentences, simpler structure. Test: the content is the same as an earlier turn of the same speaker, the wording is not. | 1 dialogic (+1 drill) | 34 · drill: 214 | REPAIR REQUEST → **REPAIR GRANT**. Position 2. | Presupposes F1. Prerequisite for F3 and F9. Note `g214` ("Yes, I said it's over there") gives the **learner** the granter role, but only as a drill line — no exchange attests it. |
| F10 | **Keep going** | A minimal turn whose only content is a request to continue — "And then?". Test: no propositional content, no new question, just continuation. | 1 | 125 | LONG TURN → **CONTINUER** → continuation. Position 2, inside a chain. | Presupposes F7 survivable (you must survive the continuation you just invited). Composes into any multi-part instruction shape. Single attestation. |
| F15 | **I'm not sure** | The responder declines to commit either way and buys time, usually with a counter-request — "I'm not sure if I'm hungry. Do you have a menu?". Test: neither accept nor decline; the decision is deferred. | 1 | 64 | OFFER → **NON-COMMITMENT + DEFER** → resource → decide. Position 2. | Presupposes F1 and F3. Single attestation; named because it is the only turn in the corpus that refuses to decide. |

**Judgement calls flagged in the rows above, for one sentence from Tom:**
- F19 may be a sub-case of F14 rather than a family. Split here; two attestations cannot settle it.
- F5's two attestations are both in scene 4 and F16/F17/F18's seven are all in scene 22. Reported as families because they are structurally load-bearing, but a reader is entitled to call them scene artefacts.
- F2 and F21 could be one family ("give more than was asked") — split here because F21 opens new business and F2 does not.

---

## The edges

### Composition edges (shape B contains shape A)

| Contained (A) | Container (B) | Evidence |
|---|---|---|
| Question–answer | Transaction (solicit → order → deliver → receipt) | `g10→g11→g18→g19`; `g38→g39…g43`; `g97→g98→g99→g100` |
| Option-choice (F3 pair) | Transaction | `g39→g40→g41→g42→g43` — the counter-question is what extends the order chain from two turns to six |
| Repair pair (F7→F8) | Acquaintance | `g32→g33→g34` — the repair sits inside the occupation exchange and the exchange resumes after it |
| Read-back pair (F9) | Instruction-giving | `g121→g122→g123` (directions); `g97→g98` (booking details read back) |
| Reciprocal return (F11) | Acquaintance | `g25→g26→g27→g28→g29→g30`; the return is the only attested chain-extender that is not a new ticket |
| Assessment (F12) | Closing | `g93`, `g129`, `g36` — thanks and assessment travel together at every close |
| Proposal–accept | Arrangement (F5) | `g20→g21→g22` — the only two-sided negotiation in the corpus |
| Assessment (F12) + concession (F16) | Mutual assessment (scene 22's shape) | `g222→g223→…→g231` |
| Onward solicit (F21) | Transaction chain | `g45→g46`; `g16→g17` — one transaction becomes several without a new opening |

### Presupposition-of-survivability edges (B attemptable only by a learner who can survive A going wrong)

| B (attemptable only if…) | …A is survivable | Evidence that put the edge there |
|---|---|---|
| F3 answer-with-a-question | F7/F8 repair | Asking generates an answer of unknown length and speed. `g111→g112`, `g40→g41` — the responder must take up an answer they did not author. |
| F9 read-back | F8 repair-grant, and being corrected | `g122→g123` — the confirm silently corrects the candidate by extending it. A learner who cannot survive correction cannot read back. |
| F5 decline-with-counter | F14 ritual close, and the other's counter-decline | `g21→g22` — the first decline is itself declined. Attemptable only by someone who can absorb a second no. |
| F2 grant-plus-extra (as receiver) | F7 repair | The extra clause is unrequested material; `g132` ("there's a lot of traffic"), `g106` ("no extra charge") arrive unbidden. |
| F13 thank-and-downgrade | Being complimented | `g94→g95` — the compliment is unsolicited and off-topic from the transaction. |
| F17 counter-assessment | F12 assessment, and disagreement | `g226`, `g228` contradict the learner's own account of herself; `g227` holds a position against encouragement. |
| F16 / F18 relationship families | F12 and F17 | `g225→g226→g227→g228→g229→g230→g231` — the whole cluster only runs once assessment and contradiction are both survivable. |
| F10 continuer | F7 repair | `g124→g125→g126` — the continuer invites a turn of unbounded length. |
| F6 substitute | F4 hedged answer, and re-selection | `g15`, `g59` — the asker must hear "not that" and choose again in the same breath. |

**The two edge kinds were sufficient.** Nothing in the corpus needed a third kind. The closest
strain is F11 (**And you?**), which is neither containment nor survivability but *recursion* —
the shape re-enters itself. It is recorded as a composition edge on the reading that the
acquaintance shape contains a further instance of itself, and that reading works, but it is the
one place a reader might want a third edge kind, and it is named here rather than smuggled in.

---

## The exchange shapes

Each shape as a bound sequence of positions, with every attestation.

| Shape | Bound sequence of positions | Attestations (`global_order` runs) | Count |
|---|---|---|---|
| **Ritual open/close** | hail → return | 1→2; 20→21; 23→24; 25(part)→26; 27→28; 53(open); 69→70; 93→94 | 8 |
| **Transaction** | solicit → order → (clarify → specify)* → deliver → reckoning → receipt | 10→11→18→19; 38→39→40→41→42→43; 44→45→46; 47→48→49; 50→51; 53→54→55→56; 58→59→60; 71→72; 79→80→81→82; 97→98→99→100; 137→138→139 | 11 |
| **Availability enquiry** | is there X? → yes+locate / no+substitute | 12–14→15/16→17; 87→88; 89→90; 91→92; 101→102; 107→108; 127→128; 135→136; 163(drill) | 8 |
| **Instruction-giving** | request → instruct → (read-back → confirm) → (continue → instruct) | 120→121→122→123→124→125→126; 110→111→112→113; 114→115; 116→117 | 4 |
| **Acquaintance** | Q → A + and-you? → A + and-you? → … | 25→26→27; 28→29→30; 31→32; 34→35→36 | 4 |
| **Repair** | turn → non-understanding + request → repeat/reformulate → resume | 32→33→34; 213→214 (drill); 152–154 (drill) | 1 dialogic + 2 drill |
| **Arrangement** | proposal → decline + account + counter → decline + account + counter → accept + close | 20→21→22 | 1 |
| **Recommendation** | solicit → recommend with grounds → uptake | 75→76→77(→78); 63→64→65 | 2 |
| **Feasibility request** | is it possible? → grant + limit + pre-empt | 105→106 | 1 |
| **Compliment** | compliment → thank + downgrade | 94→95; 222→223 | 2 |
| **Mutual assessment** | self-downgrade → counter-assessment → concede-and-hold → counter-assessment → normalise + tag → emphatic agree | 221→231 (one continuous run) | 1 |
| **Trouble-and-advice** | trouble declaration → elicit → report → advise → dosage Q → instruct | 110→115 | 1 |

**Exchange-length distribution across all 47 attested exchanges:**

| Turns in the exchange | Exchanges | Share |
|---|---|---|
| 2 | 24 | 51% |
| 3 | 12 | 26% |
| 4 | 7 | 15% |
| 6 | 2 (`g38–g43` order; `g110–g115` symptoms) | 4% |
| 7 | 1 (`g120–g126` directions) | 2% |
| 11 | 1 (`g221–g231` scene 22) | 2% |

---

## DEFICIT — theory suggests it, the canon does not attest it

**This section is deficit only. Nothing in it is counted in the inventory above.** The sitting's
own deficit read against live POD-1 was: backchannel, recounting, news, disagreement between
equals, teasing, topic shift, story ticket, resisted goodbye, sympathy, persuasion. Confirmed,
corrected and extended:

| Deficit item | Verdict against `pod-0` | Evidence |
|---|---|---|
| Backchannel | **Corrected — thinly attested.** One minimal continuer exists. True overlapping backchannel absent. | `g125` "And then?" — the only one in 142 dialogue rows |
| Disagreement between equals | **Corrected — thinly attested, one kind only.** Disagreement with the other's *account of themselves* is attested twice. Disagreement about the world, a fact, or a proposal is absent. | `g226`, `g228`; nothing else |
| Topic shift | **Corrected — attested twice, never flagged.** Both shifts are unmarked; no shift is negotiated or apologised for. | `g94` transaction→person; `g31` person→place |
| Recounting / story ticket | **Confirmed absent.** No row narrates a past event to a listener. | 0 rows |
| News | **Confirmed absent.** | 0 rows |
| Teasing | **Confirmed absent.** | 0 rows |
| Resisted goodbye | **Confirmed absent.** Every close is accepted first time. | `g4`, `g19`, `g22`, `g24`, `g36`, `g95`, `g108`, `g129`, `g231` — nine closes, nine first-time acceptances |
| Sympathy | **Confirmed absent, and starkly.** The pharmacist answers "I'm not feeling great" with an elicit, not a sympathy token. | `g110→g111` |
| Persuasion | **Confirmed absent.** The one recommendation is accepted without resistance; nobody is talked round. | `g76→g77` |

**Added to the deficit by this pass** — absences the sitting did not name, each checked across all 142 dialogue rows:

| Added deficit | Why it matters | Evidence of absence |
|---|---|---|
| **"I don't know"** | No responder in the canon ever fails to know. The closest is a hedge that delegates the checking. | Lexical sweep for "know": `g120`, `g135` (both "do you know how…"), `g223`, `g227` (both "good to know" / "I know that"). Zero instances of not-knowing. Nearest neighbour is `g90` "I think so, but you'll have to look to make sure". |
| **Repair initiated by the native speaker** | The learner is always the repairer-requester and the native always the granter. The role is never reversed in an exchange. | `g33→g34` is the only dialogic repair. `g214` gives the learner the granter role but is a drill line with no partner. |
| **Complaint / service gone wrong** | Nothing has ever gone wrong in the canon. No responder must absorb a complaint. | Drill lines `g182`, `g183` ("my son lost his ticket") exist as monologue; no exchange. |
| **A bare no** | Every refusal in the canon arrives with an account and an alternative. A learner has never heard an unsoftened refusal. | `g21`, `g22` (both accounted and countered), `g15`, `g59`, `g84`, `g108`, `g136` (all substituting). Zero bare refusals. |
| **Interruption / overlap** | Every turn completes. | 0 rows |
| **Pursuit of a return** | The reciprocal return `g26`/`g29`/`g32` is always volunteered by the answerer; nobody ever has to *ask* for reciprocity. | 4 attestations of F11, all volunteered |

---

## Findings

**1. The three-turn ceiling is real, and the number is four.** 36 of 47 exchanges (77%) are two
or three turns. Seven more reach four. **Only four exchanges in the entire canon exceed four
turns**, and they are diagnostic: the coffee order (`g38–g43`, six), the pharmacy consultation
(`g110–g115`, six), the directions (`g120–g126`, seven) and the meta scene (`g221–g231`, eleven).
The mechanism that extends the first three is **not** topic development — it is **serial
sub-ticketing**: each extra turn adds another piece of the same transaction, and the extender is
almost always F3 (**Answer with a question**) or F9 (**read-back**). Scene 22 is the only place
in the canon where turns follow one another because of what was *said*, rather than because
another piece of business remains. So the boundary between POD-1 and conversation is precisely
this: **POD-1 chains turns by outstanding business; conversation chains them by uptake.** F3, F9,
F11 and F10 are the four attested chain-extenders, and F11 and F10 are the only two that extend a
chain without adding business — which makes them the highest-value bridging moves the corpus
gives us, at four and one attestations respectively.

**2. Aran's four are confirmed, and the ratio is the finding, not the four.** Mapping the twenty
families onto happy path / question / problem / human moment:

| Aran's family | Corpus families | Response turns | Share of 96 |
|---|---|---|---|
| Happy path | F1, F2, F14, F19, F21 | 76 | 79% |
| Question | F3, F7, F9, F10 | 13 | 14% |
| Problem | F4, F5, F6, F8, F15 | 14 | 15% |
| Human moment | F11, F12, F13, F16, F17, F18 | 24 | 25% |

(Turns carrying two families are counted in both; the column exceeds 96 and exceeds 100%.)
The four are all present and none is sector-bound — they occur in the café, the pub, the
chemist's, the taxi and the acquaintance scene alike, which is the sector-invariance claim
holding up under counting. But the human-moment column is misleading on its own: strip F11 and
F12 (which are ritual-adjacent and spread across the corpus) and the genuinely relational
families — F13, F16, F17, F18 — occupy **nine distinct rows, eight of them in scene 22 and one
in scene 10** (`g95`, `g223`, `g225`–`g231`).

**3. Scene 22 is not a scene, it is the entire conversational layer of the canon.** Eleven rows,
one exchange, and it is the sole attestation of F16, F17 and F18, the sole attestation of the
mutual-assessment shape, and the only exchange longer than seven turns. Everything the POD-2
brief calls "relationship-in-the-conversation" rests on eleven rows written as a meta scene about
language learning itself. **This is the honest gap in the deliverable**: the canon supports the
transactional inventory at full strength and supports the conversational inventory at one scene's
worth of evidence. An inventory that presented F16/F17/F18 with the same confidence as F1/F2
would be padding. They are named because they are load-bearing for the POD-2 shape, and they are
flagged because a single scene is not attestation.

**4. Confirmation-by-repetition is attested in canon, not only in Aran's health work.** The
sitting recorded the read-back as a find from Aran's v3 patients. It is in `pod-0` at
`g122`/`g123` — "Past that church?" / "Yes, past the church and the post office" — and in a
second form at `g98`, where the receptionist reads the booking back before proceeding. That
matters because it means the receptive-to-productive bridge does not have to be imported from
the health sector; it has a general attestation and its own shape already, and the corpus's
version carries the thing Aran's does not: **the confirm silently corrects the read-back by
extending it.** That correction-inside-a-confirm is the whole survivability edge.

**5. The corpus never lets anyone fail.** No responder says "I don't know"; no refusal arrives
without an account and an alternative; nothing is ever complained about; no goodbye is resisted;
no native speaker ever fails to understand the learner. Every exchange in `pod-0` succeeds. A
learner leaving this pod has heard the happy path in twenty-two variations and has never once
heard the interaction wobble in a way they must handle. Set against the brief's own frame —
survivability edges are what make the graph a graph — **the canon attests the shapes but almost
never attests them going wrong**, which is precisely why the survivability column above is
argued from structure as often as from a citable failure. That is the single largest thing POD-2
has to mint.

**6. Data observations — reported, not fixed** (all read-only; nothing was written):
- **Scenes 15–21 (73 rows, `g141`–`g219` less codas) carry `speaker = 'Learner'` on every row**, including rows that are plainly the other party: `g160` "No, we only take cash.", `g211` "It's down there on the left.", `g214` "Yes, I said it's over there.", `g217` "Would you like to order some drinks?". Speaker attribution in those scenes is unusable, and any downstream tool that partitions the corpus by speaker will mis-partition it.
- `variant_key` is **null on all 231 rows**, yet the corpus plainly contains authored variants — `g7`/`g8` (bare vs. softened question), `g12`/`g13`/`g14` (three phrasings of one ticket), and most consequentially `g15`/`g16`, which are **mutually exclusive alternative responses to the same ticket** stored as consecutive sentences. Anything reading `pod-0` linearly will read `g15` and `g16` as a self-contradicting speaker.
- `author_notes` is populated on exactly 16 rows, all the identical narrator coda string. **The column carries no per-line authorial intent** — the brief's hope that it would be corroborating evidence for family assignment did not survive contact with the data, and no family above rests on it.
- `scene_label` is inconsistent: scenes 1–5 are all "Pod 0", scene 6 is "Pod 0b", scenes 7–22 are "1"–"16". `difficulty` is null on 14 of 22 scenes.
- Content inconsistency at `g100`: "The room is on the third floor, room 709."

---

## Appendix A — the 96 response-position turns, classified

A **response-position turn** is a dialogue turn that takes up the business of the immediately
preceding turn. Rows that open new business, narrator codas, and the 73 single-speaker drill
lines are excluded. A second reader applying that rule to `pod-0` should recover this list.

| g | scene.sent | speaker | families |
|---|---|---|---|
| 2 | 1.2 | Sarah | F14 |
| 3 | 1.3 | Neighbour | F19 |
| 4 | 1.4 | Sarah | F1, F14 |
| 6 | 2.2 | Passenger | F2 |
| 9 | 2.5 | Passenger | F4 |
| 11 | 3.2 | Sarah | F1 |
| 15 | 3.6 | Barista | F6 |
| 16 | 3.7 | Barista | F2, F21 |
| 17 | 3.8 | Sarah | F1 |
| 18 | 3.9 | Barista | F1 |
| 19 | 3.10 | Sarah | F14 |
| 21 | 4.2 | Sarah | F5, F14 |
| 22 | 4.3 | Friend | F5, F14 |
| 24 | 5.2 | Sarah | F19, F14 |
| 26 | 6.2 | Anna | F1, F11 |
| 27 | 6.3 | James | F1, F14 |
| 28 | 6.4 | Anna | F14 |
| 29 | 6.5 | James | F1, F11 |
| 30 | 6.6 | Anna | F2 |
| 31 | 6.7 | James | F12 |
| 32 | 6.8 | Anna | F2, F11 |
| 33 | 6.9 | James | F7 |
| 34 | 6.10 | Anna | F8, F11 |
| 35 | 6.11 | James | F2 |
| 36 | 6.12 | Anna | F12, F14 |
| 39 | 7.2 | Customer 1 | F1 |
| 40 | 7.3 | Barista | F3 |
| 41 | 7.4 | Customer 1 | F1, F4 |
| 42 | 7.5 | Barista | F3 |
| 43 | 7.6 | Customer 1 | F1 |
| 45 | 7.8 | Barista | F1, F21 |
| 46 | 7.9 | Customer 2 | F1 |
| 47 | 7.10 | Barista | F1 |
| 48 | 7.11 | Customer 2 | F3 |
| 49 | 7.12 | Barista | F2 |
| 51 | 7.14 | Barista | F2, F21 |
| 54 | 8.2 | Customer 1 | F1 |
| 55 | 8.3 | Bartender | F2 |
| 56 | 8.4 | Customer 1 | F1 |
| 59 | 8.7 | Bartender | F6 |
| 60 | 8.8 | Customer 3 | F1 |
| 64 | 8.12 | Customer 1 | F15 |
| 65 | 8.13 | Bartender | F2 |
| 70 | 9.2 | Waiter | F1, F14 |
| 72 | 9.4 | Customer 2 | F1 |
| 74 | 9.6 | Waiter | F2 |
| 76 | 9.8 | Waiter | F2 |
| 77 | 9.9 | Customer 1 | F1 |
| 78 | 9.10 | Customer 2 | F1 |
| 80 | 9.12 | Customer 1 | F3 |
| 81 | 9.13 | Customer 2 | F1 |
| 82 | 9.14 | Waiter | F12, F1 |
| 84 | 9.16 | Customer 1 | F6 |
| 85 | 9.17 | Customer 2 | F1 |
| 88 | 10.2 | Assistant | F1 |
| 90 | 10.4 | Assistant | F4 |
| 92 | 10.6 | Assistant | F1 |
| 93 | 10.7 | Customer | F12, F14 |
| 94 | 10.8 | Assistant | F14, F12 |
| 95 | 10.9 | Customer | F13, F1, F14 |
| 98 | 11.2 | Receptionist | F9, F1, F14 |
| 99 | 11.3 | Guest | F1 |
| 100 | 11.4 | Receptionist | F12, F1 |
| 102 | 11.6 | Receptionist | F2 |
| 104 | 11.8 | Receptionist | F2 |
| 106 | 11.10 | Receptionist | F2 |
| 108 | 11.12 | Receptionist | F6, F14 |
| 111 | 12.2 | Pharmacist | F3 |
| 112 | 12.3 | Customer | F1 |
| 113 | 12.4 | Pharmacist | F1 |
| 115 | 12.6 | Pharmacist | F2 |
| 117 | 12.8 | Pharmacist | F2 |
| 118 | 12.9 | Customer | F14 |
| 121 | 13.2 | Local | F4, F1 |
| 122 | 13.3 | Tourist | F9 |
| 123 | 13.4 | Local | F9 |
| 125 | 13.6 | Tourist | F10 |
| 126 | 13.7 | Local | F2 |
| 128 | 13.9 | Local | F2 |
| 129 | 13.10 | Tourist | F12, F14 |
| 132 | 14.2 | Driver | F2 |
| 133 | 14.3 | Passenger | F3 |
| 134 | 14.4 | Driver | F4 |
| 136 | 14.6 | Driver | F6 |
| 138 | 14.8 | Passenger | F3 |
| 139 | 14.9 | Driver | F2 |
| 222 | 22.2 | Friend | F1, F12 |
| 223 | 22.3 | Learner | F13 |
| 224 | 22.4 | Friend | F3 |
| 225 | 22.5 | Learner | F1, F16 |
| 226 | 22.6 | Friend | F12, F17 |
| 227 | 22.7 | Learner | F16 |
| 228 | 22.8 | Friend | F17, F12 |
| 229 | 22.9 | Learner | F12, F16 |
| 230 | 22.10 | Friend | F18 |
| 231 | 22.11 | Learner | F18 |

**96 rows.**

## Appendix B — the drill lines, held separate

Scenes 15–21 supply 73 single-speaker lines with no partner turn. They are **not** counted as
attestation anywhere above. Three of them supply the repair kit in a form no exchange in the
corpus does, and are cited in the inventory as drill-only:

| g | line | family it would carry |
|---|---|---|
| 153–154 | "You spoke a little too quickly, so I'm not sure if I understood." / "Can we try again?" | F7 |
| 213 | "Can you say that again?" | F7 |
| 214 | "Yes, I said it's over there." | F8 — **the learner as repair-granter, attested nowhere in dialogue** |
| 160–161 | "No, we only take cash." / "I'm sorry, I don't have any cash." | F6 + trouble-report |
| 180–181 | "Is that correct? Am I correct?" / "Am I wrong about that?" | F9-adjacent self-check |
| 182–183 | "I'm sorry, my son lost his ticket." / "We have paid, but my daughter has lost her ticket." | complaint — **the only complaint material in the canon, and it has no partner turn** |
