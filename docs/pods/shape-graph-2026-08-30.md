# The shape graph — derived from POD-1, with survivability as the second edge kind

**Date:** 2026-08-30. Read-only against Supabase. No writes of any kind were issued. Nothing here
executes: the document is the artefact.

**Corpus read:** `canonical_pod_scenarios` where **`pod_slug = 'pod-0'`** — 231 rows, 22 scenes.
The slug is `pod-0` and it **is** the live POD 1, Aran's rewrite of the Croatian experiment. That
off-by-one is stated here because it bites every worker on this line.

**Sacked slates, positively excluded.** `pod_slug = 'pod-1'` (236 rows) and `pod_slug = 'pod-0.5'`
(27 rows) were counted at read time to confirm which slug is which, and **not one row from either
was read as content or cited anywhere below**. `docs/pods/pod-1-english-canonical.md` was not
opened. Every `g<n>` in this document is a `global_order` in `pod-0`.

**Row identifier:** `g<global_order>`, matching the response-family inventory (`/d/1bf2b483`) so the
two documents read side by side. Method Pod citations are `M:part:line` and are kept in visibly
separate rows and tables throughout.

**Inputs:** the 231 rows themselves; the response-family inventory of 2026-08-29 (its twenty
corpus families and its 96-row Appendix A, re-counted here, with one correction); the two Method
Pod documents.

---

## One page — what this derives, and the number

The shape graph is **17 nodes** (exchange shapes), **20 moves** (positions filled inside them),
**19 composition edges** and **10 survivability edges** from the transactional corpus, plus **5
survivability edges that rest on the Method Pod only**. Twelve of the nodes come out of `pod-0`;
five exist only because the summit corpus attests them.

**It reproduces the live 231 completely.** 16 rows are scene-exit vocabulary drips, 73 are
one-move truncated walks, 138 lie on 47 complete walks, and **4 rows are alternatives hanging off
three nodes rather than steps on a path**. Three of those four are surface variance. The fourth,
`g15`, is the corpus's single stored alternative *outcome* — and the fact that the storage format
cannot express it is the branch-point ruling already latent in the data.

**The headline of the derivation is a null result.** Ten survivability edges are attested in the
142 dialogue rows. Every one of them rests on a **non-delivery, a chaining move or a relational
move**. **Not one rests on anything failing.** The machine test — enumerate the response positions
attested at a shape's answer slot — finds that the answer slot in `pod-0` is never occupied by a
failure. The corpus does not merely under-attest recovery; it attests the *branch* and never the
*recovery*, which is a sharper deficit than "the pod is too easy".

**The overlay is nine scenes.** Nine outcome shapes earn a slot under the selector — surviving
them requires a shape the learner does not already own. Each is sited on the ask where the wrong
turn is widest, and sequenced by redemption latency. Four of the nine are attested **nowhere**, in
either corpus, and must be minted; three are attested in the Method Pod only; two are attested
thinly in `pod-0`.

**"And you?" does not force a third edge kind.** It is a self-composition edge plus a walk-level
pivot annotation, and the test that this is right rather than a patch is that the same treatment
covers "anything else?" and the counter-question. Argument in §7.

**Ten undecidable pairs** are handed back, ranked by how much overlay hangs on each, in §8.

**One correction to the inventory.** It reports happy-path families carrying "75 of 96" in its
headline and "76" in its findings table. Re-counted from its own Appendix A: **76 is the
family-attestation sum and 67 is the distinct-turn count** — a turn carrying both F1 and F14 is
counted twice in the 76. Happy path is **67 of 96 turns, 70%**, not 79%. The brief I worked from
said 76; the document says 75; the rows say 76 attestations across 67 turns. Nothing downstream
of this changes, but the number is now derived rather than repeated.

---

## 1. The object model as this graph uses it

- A **node** is an **exchange shape**: a bound sequence of positions.
- A **move** is a **position in a shape**, filled by a family.
- A **walk** is a traversal of the graph. **Pods are listening walks; courses are producing walks.**
  A scene is a projection — a walk written down — exactly as a path is an example.
- **Composition edge (mechanical):** shape A composes shape B when B occurs as a move-position
  inside A. Structural, no judgement.
- **Survivability edge:** shape B presupposes shape A when **a learner who does not own A cannot
  recover when B goes off the expected path.** Not cannot produce B. Cannot recover.
- **ADMITS** is recorded per scene: the vocabulary and shapes a scene makes available. Heard is not
  owned, and an admitted item is never the target of a prompt.
- **Delivery position is derived** from the survivability edges, never authored.

### The machine test, as actually run

For each **ticket class** — the class of the move in the initiating position — enumerate the
response families **attested at its answer slot** across the whole dialogic corpus. If the set
contains anything the learner must take up and does not own, the survivability edge exists.

That query is re-runnable. The 96 response-position turns of the inventory's Appendix A were
joined to their immediately preceding row; each initiating row was assigned a ticket class by
reading it; the response families were then grouped by class. Forty-two classes came out. The
class assignment is the only judgement step and it is stated per row, so a second reader can
disagree with a line rather than with the number.

The full 42-class table is in Appendix A. The part that matters is what it did **not** find.

---

## 2. The nodes

### From `pod-0` — twelve

| Node | Bound sequence of positions | Attestations |
|---|---|---|
| **N1 Ritual open/close** | hail → return | `g1→g2`; `g20→g21`; `g23→g24`; `g27→g28`; `g69→g70`; `g93→g94`; `g117→g118`; `g128→g129` |
| **N2 Transaction** | solicit → order → (clarify → specify)* → deliver → reckoning → receipt | `g10→g11→g18→g19`; `g38→g43`; `g44→g49`; `g53→g56`; `g69→g85`; `g97→g100`; `g137→g139` |
| **N3 Availability enquiry** | is-there-X? → yes+locate / no+substitute | `g5→g6`; `g14→g15/g16`; `g73→g74`; `g87→g88`; `g89→g90`; `g101→g102`; `g127→g128`; `g135→g136` |
| **N4 Instruction-giving** | request → instruct → (read-back → confirm) → (continue → instruct) | `g120→g126`; `g113→g117` |
| **N5 Acquaintance** | Q → A+return → A+return → … | `g25→g30`; `g31→g32`; `g34→g36` |
| **N6 Repair** | turn → non-understanding+request → reformulate → resume | `g32→g33→g34→g35` — **the only dialogic attestation in 231 rows** |
| **N7 Arrangement** | proposal → decline+account+counter → decline+account+counter → accept | `g20→g21→g22` |
| **N8 Recommendation** | solicit → recommend with grounds → uptake | `g75→g76→g77`; `g63→g64→g65` |
| **N9 Feasibility request** | is-it-possible? → grant+limit+pre-empt | `g105→g106` |
| **N10 Compliment** | compliment → thank+downgrade | `g94→g95`; `g222→g223` |
| **N11 Mutual assessment** | self-downgrade → counter-assess → concede-and-hold → counter-assess → normalise+tag → emphatic agree | `g221→g231` |
| **N12 Trouble-and-advice** | trouble declaration → elicit → report → advise → dosage-Q → instruct | `g110→g117` |

### From the Method Pod only — five, kept separate

These attest moves the transactional pod structurally cannot. They are listed because the graph
needs them, and marked because no `g<n>` supports them.

| Node | Sequence | Method attestation |
|---|---|---|
| **N13 Not-knowing** | question → I-don't-know held with status → the question it licenses | `M:1:54`, `M:4:70`, `M:4:77` |
| **N14 Premise audit** | claim → how-do-we-know-that → ground supplied or conceded | `M:1:336–338` |
| **N15 Parked disagreement** | position → counter → counter held → explicit park | `M:2:386→2:401`; `M:4:85–87` |
| **N16 Precision haggle** | number → counterbid → counterbid → settlement formula | `M:2:120–132` |
| **N17 Interruption-and-bank** | turn → break → name it and bank the thread | `M:4:474` — the **recovery half is unattested**, the next session is lost |

---

## 3. The composition edges — nineteen, mechanical

| Contained (B) | Container (A) | Attestation |
|---|---|---|
| N1 ritual | N2 transaction | `g10→g11` open, `g18→g19` close; `g69→g70`; `g53` open |
| N1 ritual | N5 acquaintance | `g25`; `g27→g28`; `g35→g36` |
| N1 ritual | N7 arrangement | `g20→g21`; `g22` close |
| N1 ritual | N12 trouble-and-advice | `g110` open; `g117→g118` close |
| Option-choice pair (counter-Q → specify) | N2 transaction | `g39→g40→g41→g42→g43` — the extender that takes an order from two turns to six |
| N3 availability | N2 transaction | `g12–g14→g15/g16→g17` inside the café order; `g54→g55→g56` inside the pub order |
| Reckoning-and-pay pair | N2 transaction | `g47→g48→g49`; `g137→g138→g139` |
| N8 recommendation | N2 transaction | `g75→g76→g77` inside the restaurant order |
| N9 feasibility | N2 transaction | `g105→g106` inside the hotel check-in chain |
| Read-back pair | N4 instruction-giving | `g121→g122→g123`; `g97→g98` |
| Continuer pair | N4 instruction-giving | `g124→g125→g126` |
| Elicit pair | N12 trouble-and-advice | `g110→g111→g112` |
| N4 instruction-giving | N12 trouble-and-advice | `g113→g114→g115→g116→g117` — the dosage instructions are an instruction shape inside the consultation |
| N6 repair | N5 acquaintance | `g32→g33→g34` — the repair sits inside the occupation exchange and the exchange resumes at `g35` |
| **N5 acquaintance** | **N5 acquaintance** | `g25→g26→g27→g28→g29→g30` — self-composition via the return question. See §7 |
| N10 compliment | N5 acquaintance | `g30→g31`; `g35→g36` |
| N10 compliment | N2 transaction | `g92→g93→g94→g95` — the compliment arrives inside a shop transaction and shifts the topic |
| N10 compliment | N11 mutual assessment | `g222→g223` |
| Onward-solicit pivot | N2 transaction chain | `g45→g46`; `g16→g17`; `g51` — one transaction becomes several without a new opening |

---

## 4. The survivability edges

### 4a. Attested in the transactional corpus — ten

Each cites the **attested response position** that put the edge there. "Recovery attested?" is the
column that carries the finding.

| # | B — attemptable only if… | …A is survivable | Attested response position | Recovery attested? |
|---|---|---|---|---|
| S1 | Any ticket (N2, N3) | Re-select after a substitute | `g14→g15` "no, we've only got drinks"; `g58→g59`; `g83→g84`; `g107→g108`; `g135→g136` | **Once.** `g59→g60` re-selects. `g15` has no uptake at all |
| S2 | Any information question (N3, N4) | Acting on a hedge | `g8→g9` "maybe three or four miles"; `g89→g90` "you'll have to look to make sure"; `g120→g121`; `g133→g134`; `g40→g41` | **Never.** No turn in the corpus takes up a hedge; `g91` opens new business after `g90` |
| S3 | Asking anything at all | Repair — F7 request, F8 reformulation | `g32→g33→g34` | **Yes, and only here.** `g35` resumes. The corpus's one complete off-path-and-recover cycle |
| S4 | A personal question (N5) | The question coming straight back | `g25→g26`; `g28→g29`; `g31→g32` | Yes — `g27`, `g29`, `g32` all answer the return |
| S5 | Instruction-giving (N4) | Being corrected inside a confirm | `g121→g122→g123` — "past that church?" / "yes, past the church **and the post office**" | **Once.** The correction is silent; the learner is never shown noticing it |
| S6 | A proposal (N7) | A second no | `g20→g21→g22` — the decline is itself declined | Once, and one scene only |
| S7 | Closing a transaction | An unsolicited topic shift and a compliment | `g92→g93→g94→g95` | Twice: `g95`, `g223` |
| S8 | Any self-account (N11) | Being contradicted | `g223→g226`; `g227→g228` | Scene 22 only — seven of the nine relational rows |
| S9 | An offer (N8) | Declining to decide | `g63→g64→g65` | Once |
| S10 | A long instruction (N4) | Inviting an unbounded turn | `g124→g125→g126` | Once |

**The null result, stated plainly.** Classify each of those ten by what occupies the answer slot:
S1, S2, S9 are **non-delivery**; S3, S4, S5, S10 are **chaining**; S6, S7, S8 are **relational**.
**None is a failure.** Across 142 dialogue rows the answer slot is never filled by a bare no, by
"I don't know", by a native failing to understand the learner, or by a complaint with a partner
turn. The inventory said the corpus never lets anyone fail; the machine test says something one
degree more precise: **the corpus attests the branch and withholds the recovery.** Of the ten
edges, seven have exactly one attested recovery and one — S2, the hedge — has none at all.

**Where the seed specimen actually lives, and it is worse than the brief assumed.** `g158`–`g161`
— *can we pay / can we pay by card / no, we only take cash / I'm sorry, I don't have any cash* —
verified in the rows and confirmed as the only ask-refusal-survival run in 231 sentences. It sits
in **scene 16, an "Extra phrases" drill scene**, and all four rows carry `speaker = 'Learner'`.
It is not attested as an exchange at all. The one specimen of the thing the whole overlay is for
is a monologue.

### 4b. Attested in the Method Pod only — five, kept separate

| # | B — attemptable only if… | …A is survivable | Method attestation |
|---|---|---|---|
| M1 | Asking a question | The answer being "I don't know", held with status | `M:1:54`, `M:4:70`, `M:4:77` — and there it *licenses* the next question |
| M2 | Making a claim | The premise being audited | `M:1:336–338` — the audit received as a gift |
| M3 | Telling a story | A sceptical challenge landing mid-story | `M:4:148→4:152` — "what's happened to that group now?" / "it's gone a little bit cold" |
| M4 | Holding a position | The disagreement being parked rather than resolved | `M:2:386→2:401` |
| M5 | Stating a number | The haggle | `M:2:120–132` |

**The Method Pod's own null, quoted from its round-two deficit list:** *bare refusal,
complaint-with-a-partner-turn, and native-fails-to-understand-learner* are unattested there too,
and structurally unattestable in an L1-English corpus between two people who understand each other
perfectly. So four of the nine overlay scenes rest on nothing in either corpus. That is stated in
§6 per scene rather than hidden in a total.

---

## 5. The acceptance test — the live 231 as a walk

**Result: the graph reproduces all 231 rows.** The accounting is exact and every class is a
legitimate element of a walk.

| Class | Rows | Count | How it walks |
|---|---|---|---|
| Narrator vocab codas | `g37, g52, g68, g86, g96, g109, g119, g130, g140, g151, g162, g173, g184, g195, g206, g220` | 16 | **Not moves.** Scene-exit vocabulary drips — pure ADMITS, attached to the scene boundary, never a position in a shape and never the target of a prompt |
| Drill lines, scenes 15–21 | `g141`–`g219` less codas | 73 | **Truncated walks.** Each is a visit to an initiating position with the walk stopping there. Legitimate for a listening walk: the initiating move is exposed without its continuation. Four of them (`g158`–`g161`) form one complete three-move walk mislabelled as drill |
| Rows on complete walks | the remaining dialogic rows | 138 | 47 walks over N1–N12. Every one of the 96 response-position turns resolves to a preceding initiator with no orphans — the join ran clean |
| **Alternatives at a node** | `g7`, `g12`, `g13`, `g15` | **4** | **Not path elements.** Three are surface variance; one is outcome variance |
| | | **231** | |

### The four rows that do not walk as a path — and why that is the graph working

| Row | Kind | What the graph says |
|---|---|---|
| `g7` "How far is it into town?" | **Surface variance** | `g7` and `g8` are two phrasings of one ticket. `g8` carries the continuation to `g9`. One node, two surface realisations; the walk takes one |
| `g12`, `g13` | **Surface variance** | `g12`/`g13`/`g14` are three phrasings of one availability ticket. `g14` carries the continuation. Same treatment |
| `g15` "No, we've only got drinks." | **OUTCOME variance** | `g15` and `g16` are **mutually exclusive answers to the same ticket, stored as consecutive sentences.** `g16→g17→g18` is the walk. `g15` is the other branch, and it is the negative one |

Read linearly, `g14→g15→g16` makes the barista say "no we've only got drinks" and then "yes,
would you like the menu?" in successive turns. That is not a defect of the content; it is the
storage format having no way to say *branch*. `variant_key` is null on all 231 rows.

**Three things follow, and they are the acceptance test passing rather than failing.**

1. The graph reproduces the 231 as a walk, with exactly one row that a path cannot hold and a
   branch can. A graph that could not distinguish `g15` from `g16` would be the wrong graph.
2. **The corpus already contains one genuine branch point** — one, in 231 sentences — and it is
   invisible to anything reading `pod-0` linearly. The product ruling that a pod is a branch point
   with its continuations attached is not a new requirement laid over the canon; it is the canon's
   own latent structure, unexpressible in its current storage.
3. The distinction the brief insists on holds up under counting: **surface variance is present and
   done well** — `g7`/`g8`, `g12`/`g13`/`g14`, `g164`/`g166`/`g167`, `g217`/`g218`/`g219` —
   **outcome variance is present exactly once**, at `g15`, and once more in drill at `g160`. The
   fanning mechanism is built and shipping. It is fanning surface.

### Rows that walk but carry defects — reported, not fixed

- **Speaker attribution is unusable in scenes 15–21.** All 73 drill rows carry `speaker = 'Learner'`,
  including `g160` "No, we only take cash", `g211`, `g214`, `g217`. Positions in those scenes were
  assigned by reading the content, never by the speaker column. Any tool partitioning `pod-0` by
  speaker will mis-partition it.
- `g100` — "The room is on the third floor, room 709."
- `scene_label` is inconsistent across scenes 1–5, 6, and 7–22; `difficulty` is null on 14 of 22.

---

## 6. The outcome-shape count, and the overlay

### The selector applied

**An outcome earns a slot when surviving it requires a shape the learner does not already own.**
The unit is the **recovery shape**, not the outcome's name — two differently-named outcomes with
the same recovery are one slot, because the shape transfers and the content is the mask.

That merge does real work. *Refusal-with-reason*, *can't-comply-with-reason* and *licence-refused*
are three names with one recovery: absorb non-delivery, then re-select or ask what is possible.
**One slot.** *I-don't-know* looks adjacent and is not: there, nobody supplies your next move, so
the recovery is to re-route the ask. **Separate slot.**

### The count: nine

| # | Outcome shape | Recovery the learner must own | Attested? | Sited on | Why there |
|---|---|---|---|---|---|
| **O3** | **The native does not understand you** | Reformulate your own turn — shorter, slower — and check it landed | **Nowhere.** Absent from `pod-0`; explicitly unattestable in the Method corpus | **The café order** — `g38→g43` | The shortest, most drilled ticket the learner owns. Failure on the one sentence they are surest of is unmistakable, and the recovery is one turn |
| **O1** | **Non-delivery with a reason** | Absorb the no; re-select, or ask what is possible | Drill only — `g158`–`g161`; every dialogic refusal (`g15`, `g59`, `g84`, `g108`, `g136`, `g21`, `g22`) arrives with an account *and* a substitute | **Payment** — the reckoning at `g47`/`g137` | No-cash-only is unmistakable; the wrong turn is widest where the learner has already received the goods. The seed specimen is already written for this ask |
| **O4** | **Your read-back was wrong** | Take the correction and read back again | Thinly — `g121→g122→g123`, once, and the correction is silent | **Hotel booking details** — `g97→g98` | The receptionist already reads back. Numbers, nights and dates make a mis-hearing concrete and checkable in one turn |
| **O2** | **Nobody knows** | Re-route the ask — another person, another means | Method Pod only — `M:1:54`, `M:4:70`, `M:4:77` | **Directions** — `g120→g126` | The corpus's longest chain, and the place being stranded mid-instruction is most obvious. `g90` "you'll have to look to make sure" is the nearest thing `pod-0` has and it delegates rather than fails |
| **O5** | **The premise of your ask is wrong** | Drop the premise; ask the prior question | Method Pod only — `M:1:336–338` | **Transport** — the bus/boat drill frame, `g177`–`g179` | A wrong premise is visible in one sentence: there is no bus today, the boat does not run in winter. The learner already owns the ask |
| **O6** | **Trouble that is your own fault** | Admit it, supply what you can, accept the consequence | **Nowhere as an exchange.** `g182`, `g183` supply the material as monologue with no partner turn | **The ticket** — `g147`/`g148`/`g182`/`g183` | The material is already written and already learner-side. All that is missing is the other party |
| **O7** | **The native discloses worry or difficulty** | Acknowledge without fixing, then continue | **Nowhere.** `g186`, `g187` are the learner disclosing, in drill. `g110→g111` is the corpus answering trouble with an elicit — the starkest absence of sympathy in the canon | **The chemist's** — `g110→g117` | The register shift is largest against a transactional frame, and the scene is already about a body |
| **O8** | **You are disagreed with** | Hold or yield, explicitly | Method Pod, in the **parked** form only — `M:2:386→2:401`, `M:4:148→4:152`. `pod-0` attests disagreement only with a person's account of themselves (`g226`, `g228`), never about the world | **The recommendation** — `g75→g76→g77` | Order the thing the waiter advised against. A one-turn wrong turn with a visible fork, and the shape is already built |
| **O9** | **A second no** | Produce a third position, or yield | Once, one scene — `g20→g21→g22` | **The arrangement** — `g20→g22` | The corpus's only two-sided negotiation. Extending its own scene by one refusal is the smallest possible mint |

**Nine scenes.** Four of them — O3, O1, O6, O7 — rest on nothing attested in either corpus and
must be minted outright. That is a fact about the corpora, stated rather than smoothed.

### What did NOT earn a slot, and why — the selector cutting

- **Question back (F3).** Eight dialogic attestations with the learner taking them up every time.
  The learner owns it. **Free.**
- **The licence pair.** Attested once (`g221→g222`) and granted. The only thing missing is the
  refusal branch — which is O1 on a different mask, and **the shape transfers**. **Free.**
- **Negotiate-the-when.** Carried inside O9's counter-offer; no separate scene. **Free.**
- **Comply-with-read-back as a move.** The *move* is attested twice and is free; only the
  *correction inside the confirm* earns O4.
- Every happy-path family. Twenty-two variations of the happy path have already shipped.

### The sequence — by redemption latency

Shortest strand first: how many turns the learner is stuck before the recovery lands.

**O3 → O1 → O4 → O2 → O5 → O6 → O7 → O8 → O9**

O3 and O1 redeem in one to two turns and are the two failures most likely on a learner's first
real day. O4 redeems in one turn but presupposes the learner read back at all, so it follows O1.
O2 and O5 need the learner to generate the next move themselves. O6 runs to a consequence. O7 has
no redemption at all — nothing is fixed, the conversation simply continues — which is why it is
late. O8 and O9 require the learner to hold a position under pressure, and O9 requires them to
invent a third one, which is the summit.

**One scene per outcome shape, sited on its widest ask.** A learner who survives no-cash-only owns
non-delivery and does not need it again off the bus ticket or the ice cream.

---

## 7. "And you?" — the verdict, and the argument

**Verdict: no third edge kind. F11 is a self-composition edge plus a walk-level pivot annotation.**

The strain is real and the inventory named it honestly: the acquaintance shape re-enters itself,
and "B occurs inside A" reads oddly when B *is* A.

**Why a self-loop is enough.** A composition edge from a node to itself is a well-formed edge. The
only thing it could break is the one job composition edges do downstream — deriving delivery
position — and it does not break that, because a self-loop adds no constraint between distinct
nodes. State one line of policy and it is closed: *composition permits reflexive edges; delivery
order is computed on the graph of distinct nodes, with self-loops dropped before the sort.* If you
own the shape, you own its recursive instance; there is nothing to order.

**Why the recursion reading is not actually what is happening, which is the stronger argument.**
F11 does not nest anything. It **transfers the initiating role**: position 2 of the current
instance becomes position 1 of the next, in the same turn. Nothing is contained.

But that is not unique to F11, and this is the test. **"Anything else?" (F21) does exactly the
same pivot** — the inventory itself calls it a "position 2→1 pivot" — and it is recorded as a
composition edge with no complaint. So does the counter-question (F3), which hands the floor back
before the ticket is complete. Mint a third edge kind for F11 and you must mint it for F21 and F3,
and you have named the third kind *chaining*, covering four families.

**And chaining should not be an edge kind at all.** Edges do two jobs: say what a shape is made of,
and say what must be delivered first. Chaining does neither. It says what a shape does at **run
time** — how a walk continues past a node. That is a property of the walk, not of the graph.
Recording it as an edge would put traversal information into the node graph, which is exactly the
mistake that "scenes are walks, not artefacts" is there to prevent.

**So: record F11 as a self-composition edge on N5, which is true and harmless, and record its real
content as a walk annotation on the position — "this position can pivot to position 1".** The same
annotation covers F21 at `g45`/`g16`/`g51` and F3 at `g40`/`g42`/`g80`. A frame that fixed only
"And you?" would be a patch; one that covers all four chain-extenders with one annotation is the
frame doing its job.

**Recommendation, argued, for one-word overrule:** keep two edge kinds. If Tom wants chaining
visible in the graph rather than on the walk, it is a **node annotation** — "pivot-capable
position" — not a third edge.

---

## 8. The undecidable pairs — ranked, two at a time

The machine test cannot decide these because **the corpus attests no failure branch at the slot in
question**. Each is one question, answerable in a sentence. Ranked by how much overlay hangs on the
answer, most consequential first. **None of these is guessed below.**

| # | The question | What hangs on it |
|---|---|---|
| **U1** | **Does asking for anything presuppose surviving a plain no — a refusal with no substitute offered?** | The order of all nine scenes. Every refusal in `pod-0` dialogue arrives with an account *and* an alternative; the bare no exists only at `g160`, in drill. If yes, O1 moves to position 1 ahead of O3 and becomes the floor of the whole overlay |
| **U2** | **Do the 73 drill lines ADMIT their shapes, or only their vocabulary?** | The size of O1, and of everything else. The seed specimen `g158`–`g161` is a drill line. If drill admits shape, refusal is already half-taught and O1 shrinks to the native turn; if it admits only vocabulary — the standing rule, heard is not owned — O1 is untouched and so are O5 and O6, whose material is also drill-only |
| **U3** | **Is "the native does not understand you" a prerequisite for the learner asking anything at all?** | Whether O3 is scene 1 of the overlay or a later rung. `pod-0` trains the learner to ask — roughly seven native turns in seventy-odd drill sentences — and never once attests the native failing to understand |
| **U4** | **Does surviving a hedge count as surviving non-delivery, or is a hedge happy path?** | Whether O2 needs its own scene. Five hedges are attested (`g9`, `g41`, `g90`, `g121`, `g134`) and **not one is taken up by the next turn**. The corpus cannot tell us whether a learner needs teaching to act on an uncommitted answer |
| **U5** | **Is worry-disclosure survivable on owned material?** | Whether O7 exists. The learner owns *"that makes me feel a little worried"* as production at `g186`, and has never heard it aimed at them |
| **U6** | **Does the relational cluster presuppose anything, or is it free once assessment is owned?** | Whether O8 exists. All seven attestations of concede-and-hold, counter-assessment and normalise-and-tag are in scene 22, and the Method Pod attests disagreement only in the parked form |
| **U7** | **Does the licence pair need its own refusal, or does non-delivery transfer to it?** | Whether the overlay is nine scenes or ten. I have taken the transfer as read on Tom's own ruling, but no permission is ever refused anywhere in the corpus, so the corpus cannot test the transfer |
| **U8** | **Is a counter-decline a distinct outcome shape, or the second turn of non-delivery?** | Whether the overlay is nine scenes or eight. One attestation, one scene (`g21`/`g22`). I split on the argument that O9 requires the learner to *generate* a third position while O1 only requires them to *accept* one — a split on thin evidence |
| **U9** | **Does the read-back presuppose surviving correction, or does being corrected teach the read-back?** | O4's position in the sequence. The only attestation runs the second way: `g122` reads back first and `g123` corrects inside the confirm, silently |
| **U10** | **Is "here's how I am" a family, or a sub-case of the ritual return?** | Node granularity only, inherited from the inventory. Split here per the splitting default. Two attestations (`g3`, `g24`) cannot settle it |

---

## 9. Reconciliation — the general family list against the corpus families

The general layer was minted once from Aran's health v3 and is sector-invariant; a sector
re-weights the selector and adds vocabulary. The corpus families F1–F21 are a different naming of
an overlapping space. **The gap is the overlay.**

| General family | Corpus family | Attested in `pod-0`? | Method Pod? | Verdict |
|---|---|---|---|---|
| **Question back** | F3 | **Yes, densely** — 8, learner takes up every one | — | **Owned. Free** |
| **Comply-with-read-back** | F9 + F1 | Thinly — `g98`, `g122`, `g123` | — | Move free; the **correction inside the confirm** earns O4 |
| **Clarify** | F7 + F8 | Once dialogically (`g33`/`g34`), plus drill `g153`, `g154`, `g213`, `g214`. **Native-initiated repair: absent** | — | The reversed role earns **O3** |
| **Negotiate-the-when** | F5's counter | Twice, one scene — `g21`, `g22` | `M:2:120–132` haggle | Carried inside O9. **Free** |
| **Licence pair** | — | Once, granted — `g221→g222`; drill `g188`, `g189` | — | **Free** on transfer from O1. See **U7** |
| **Can't-comply-with-reason** | F6 partially | **Never without a remedy.** All five F6 rows substitute | — | Merged into **O1** |
| **Refusal-with-reason** | F5 | **Drill only** — `g160`, `g161`. Never as an exchange | Unattestable there — its own deficit list | **O1** |
| **Worry-disclosure** | — | **Never native-side.** Drill only — `g186`, `g187` | — | **O7** |
| **Third-party admission** | — | **Never as an exchange.** Drill only — `g182`, `g183` | — | **O6** |
| **Challenge-the-premise** | F17 is adjacent but challenges the *person*, not the premise | **Never** about the world | `M:1:336–338` | **O5** |

**Reading of the table.** Of ten general families, **one** is densely attested and owned, **four**
are attested thinly or in a form that does not put the learner on the receiving side, and **five**
are attested only as monologue or not at all. Two shapes earn slots that are on neither list —
*nobody knows* (**O2**), and *your read-back was wrong* (**O4**) — because the machine test found
them at answer slots the family list does not name. Nine slots is the arithmetic of that table
plus those two, minus the three merges.

**A corpus family with no general counterpart, worth naming:** F4, the hedged answer, five
attestations and zero uptake. It is the largest thing the general list does not have a name for,
and **U4** is the question about it.

---

## Appendix A — the machine test, all 42 ticket classes

For each class: the response families attested at its answer slot across all 96 response-position
turns, and whether any of them is off the modal path. Re-runnable from the rows.

| Ticket class | n | Attested response families at the answer slot | Off-modal branch | Response rows |
|---|---|---|---|---|
| ORDER | 10 | F1×5, F2×3, F3×2, F21×2, F12×1 | F3 | g40 g42 g45 g47 g51 g55 g78 g82 g85 g132 |
| PERSONAL-Q | 8 | F1×4, F11×3, F2×3, F14×2, F7×1 | F11, **F7** | g4 g26 g27 g29 g30 g32 g33 g35 |
| INFO-Q | 8 | F2×4, F4×2, F6×2, F14×1 | **F4, F6** | g9 g102 g104 g108 g115 g117 g134 g136 |
| AVAILABILITY-Q | 7 | F2×4, F6×1, F1×1, F4×1 | **F6, F4** | g6 g15 g65 g74 g88 g90 g128 |
| SOLICIT-ORDER | 6 | F1×5, F3×1 | F3 | g11 g17 g39 g46 g54 g80 |
| ANSWER-OFFERING | 4 | F12×3, F14×3 | — | g31 g36 g118 g129 |
| HAIL | 3 | F14×3, F5×1, F19×1 | **F5** | g2 g21 g24 |
| OPTION-Q | 3 | F1×3, F4×1 | F4 | g41 g43 g72 |
| INSTRUCTION | 3 | F12×1, F14×1, F9×1, F10×1 | F9, F10 | g93 g122 g125 |
| CONCEDE-AND-HOLD | 3 | F12×2, F17×2, F18×1 | F17, F18 | g226 g228 g230 |
| RECKONING | 2 | F3×2 | F3 | g48 g138 |
| PAY-REQUEST | 2 | F2×2 | — | g49 g139 |
| OPTION-SET | 2 | F1×2 | — | g56 g60 |
| REQUEST-RESOURCE | 2 | F6×1, F1×1 | F6 | g59 g81 |
| OFFER-Q | 2 | F15×1, F6×1 | F15, F6 | g64 g84 |
| BOOKING-CLAIM | 2 | F1×2, F14×2, F9×1 | F9 | g70 g98 |
| COMPLIMENT | 2 | F13×2, F1×1, F14×1 | F13 | g95 g223 |
| READ-BACK | 2 | F1×1, F9×1 | F9 | g99 g123 |
| COUNTER-ASSESSMENT | 2 | F16×2, F12×1 | F16 | g227 g229 |
| WELLBEING-Q | 1 | F19×1 | — | g3 |
| SPURIOUS-VARIANT-PAIR | 1 | F2×1, F21×1 | — | g16 — **see §5; `g15`/`g16` are one node, not a pair** |
| ACCEPT-OFFER | 1 | F1×1 | — | g18 |
| DELIVERY | 1 | F14×1 | — | g19 |
| PROPOSAL | 1 | F5×1, F14×1 | **F5** | g22 |
| RITUAL-RETURN | 1 | F14×1 | — | g28 |
| REPAIR-REQUEST | 1 | F8×1, F11×1 | F8, F11 | g34 |
| RECOMMEND-SOLICIT | 1 | F2×1 | — | g76 |
| RECOMMENDATION | 1 | F1×1 | — | g77 |
| NEED-STATEMENT | 1 | F1×1 | — | g92 |
| THANKS | 1 | F14×1, F12×1 | — | g94 |
| COMPLY-HANDOVER | 1 | F12×1, F1×1 | — | g100 |
| FEASIBILITY-Q | 1 | F2×1 | — | g106 |
| TROUBLE-DECLARATION | 1 | F3×1 | F3 | g111 |
| ELICIT-Q | 1 | F1×1 | — | g112 |
| SYMPTOM-REPORT | 1 | F1×1 | — | g113 |
| DIRECTIONS-REQUEST | 1 | F4×1, F1×1 | F4 | g121 |
| CONTINUER | 1 | F2×1 | — | g126 |
| GRANT-PLUS-WARNING | 1 | F3×1 | F3 | g133 |
| PERMISSION-REQUEST | 1 | F1×1, F12×1 | — | g222 |
| SELF-DOWNGRADE | 1 | F3×1 | F3 | g224 |
| CHECK-Q | 1 | F1×1, F16×1 | F16 | g225 |
| NORMALISE-TAG | 1 | F18×1 | F18 | g231 |

**Twenty-two of the 42 classes have exactly one attested response family.** For those the machine
test is silent by construction: a slot with one attested filler cannot tell you what else could
fill it. That silence is where §8's undecidable pairs come from, and it is why the residue is
large rather than a handful of awkward cases.

---

## Appendix B — the ADMITS ledger, by scene band

What each band makes available. Availability, never a prompt target.

| Band | Rows | Admits — shapes | Admits — vocabulary |
|---|---|---|---|
| Scenes 1–5, *A Day of Greetings* | `g1`–`g24` | N1 ritual, N2 transaction, N3 availability, N7 arrangement | times of day, greetings, the coffee order |
| Scene 6, *Introductions* | `g25`–`g36` | N5 acquaintance, N6 repair, N10 compliment | origin, occupation, duration |
| Scenes 7–14, the sectors | `g38`–`g139` | N2, N3, N4, N8, N9, N12 | café, pub, restaurant, shop, hotel, chemist's, directions, taxi |
| Scenes 15–21, drill | `g141`–`g219` | **Nothing.** Truncated walks — initiating positions with no continuation. Vocabulary only, under the standing rule that heard is not owned | prices, tickets, transport, ice cream, thanks, toilets, drinks orders |
| Scene 22, *First conversation* | `g221`–`g231` | N11 mutual assessment — the entire relational layer of the canon, in eleven rows | the meta-vocabulary of learning itself |
| Codas | 16 rows | none | numbers, colours, days, hours, months |

---

## Gaps — explicit, nothing papered over

1. **The graph rests on one corpus and one auxiliary.** `pod-0` is 142 dialogue rows. Ten
   survivability edges from 142 rows is thin, and seven of the ten have a single attested recovery.
2. **Four of the nine overlay scenes are minted from nothing** — O3, O1, O6, O7 are unattested in
   `pod-0` and explicitly unattestable in the Method corpus. They are the deliverable's weakest
   ground and are marked as such in §6 rather than averaged into a total.
3. **The five Method Pod nodes are cited by `part:line` into corpus files I did not open.** I took
   the quotes and locations from the two published Method Pod documents rather than re-reading the
   session transcripts. If a `M:` citation matters to a decision, it should be checked at source.
4. **Ticket-class assignment is the one judgement step** in the machine test. Forty-two classes over
   96 rows, assigned by reading. A different splitter would get a different table; the per-row
   assignment is reproducible from Appendix A's response-row lists.
5. **`variant_key` is null on all 231 rows**, so surface variants and outcome branches are
   indistinguishable in the data. Everything in §5 about which rows are variants is read from the
   text, not from a column.
6. **Nothing was written to the database, no course was touched, and no content was authored.**
