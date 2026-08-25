# Sector competence in 30 + 30 hours — the exploration

*Written 2026-08-24 for Tom and Aran, at Tom's request: "this is an interesting thing to explore
and we can get a worker with skill to just start capturing all the things we could think about …
how MIGHT we get people to sector-level competence in 90% of their regular conversations in 30
hours? or 30 hours core + 30 hours sector-specific? … we suspect it's MOSTLY about the listening
… but, let's have an explore."*

*This is an exploration, not a plan and not a recommendation. It captures the option space, the
genuine forks, the bets the whole design rests on, and some ways of carving the problem that
nobody in the conversation has raised yet. Where I hold a view I say so and label it as mine.
Grounding: the Least-Time Learning canonical statement (ruled and landed today,
`distinction-physics/docs/canonical/least-time-learning.md`), the pod ladder proposal
(`docs/pods/pod-ladder-proposal.md`, 2026-07-12), and the build machinery as it actually runs
(ralph-methodology, synonym-choice-architecture, the pod seeding and generation pipeline).
HISE = High-Intensity Speaking Exercises — verified against the treatise, not guessed.*

---

## 0. The question in least-time currency

Tom's own framing is the right one and it is worth pinning before anything else: **"what are we
trying to do here? least time to competence in any domain."**

In the currency of the canonical statement, the question becomes: for a learner whose regular
conversations live in a sector, what is the geodesic — the path of least effort-time — from
zero to holding 90% of those conversations? The three cost terms all bite here, and each one
cuts against a naive answer:

- **The charge** says the sector's distinctions must be paid for, and the price grows with
  distance from what the learner owns. So sequencing sector content early, before the core
  scaffolding exists, raises the unit price of every sector distinction.
- **The idle charge** says a distinction held but unused costs effort × time. This is precisely
  why a sector strand that goes live at hour 0 is *not obviously free* — but see §1.3, because
  the idle-charge test runs against the learner's *life*, not against the course's internal
  sequence, and that changes the answer for some learners entirely.
- **The debt** says a false bridge charges twice. The sector design's biggest debt risk is
  teaching general-register forms that the sector then contradicts (the ward doesn't say what
  the coursebook says), forcing unlearning downstream.

And the objective function — **minimum admitted, maximum minted** — is the sharpest tool in
this whole document. Applied to sectors it asks: what is the *minimum* sector-specific content
we must admit, such that the learner *mints* 90% of their regular conversations from it plus
the core? Every architecture below is really an answer to that one question, and they differ
mainly in what they think the minimum admitted actually is: a lexicon, a register, a set of
discourse moves, or a listening diet.

---

## 1. THE MAP — what we could think about

### 1.1 First, a naming collision that will bite if left silent

Two meanings of "Pod 2" are now in circulation and they are not the same thing:

- **The pod ladder** (2026-07-12) numbers the general climb: Pod 0 transactions, Pod 1 social
  conversation, **Pod 2 real discussion**, Pod 3 extended speech — with specialist pods sitting
  *beside* the ladder, unnumbered, adding domain vocabulary on top.
- **Tom's current usage** is "Pod 2 = the first chosen specialist pod, integrated into the main
  flow once they complete the general one — POD 1", with the Method Pod as specimen one and
  health as the inspiration draft.

These are different architectures wearing the same number. In the ladder's world, a learner who
finishes Pod 1 still has two general rungs (discussion, extended speech) before any specialist
pod makes sense — because a specialist pod *borrows its discourse frames from Pods 0–3* and a
learner who hasn't met "the explainer move" can't pour health vocabulary into it. In Tom's
current usage, the specialist layer starts immediately after general conversation.

This is not pedantry; it decides what a sector pod has to *contain*. If the specialist pod comes
after Pod 3, it can be pure lexicon poured into owned frames (the ladder's §6 model — "the
learner never meets a new *move* and a new *word* in the same breath"). If it comes straight
after Pod 1, it must smuggle the discussion and extended-speech moves in *alongside* the sector
vocabulary — which is exactly the thing the ladder was designed to avoid, and also exactly what
"gradually from greetings to lecturing" describes. Both are coherent; they are different
products.

**My read, labelled as mine:** keep numbers for the general ladder and give sectors names, not
numbers — "the Health Pod", "the Method Pod". Then "the specialist layer" is a layer, not a
rung, and the real design question — *where the layer attaches to the ladder* — stays visible
instead of being buried in a numeral. But the attachment point itself is a genuine fork (Fork 1,
§2).

### 1.2 What is "sector competence" actually made of?

Before choosing an architecture, decompose the target. A nurse holding 90% of ward
conversations needs, on any honest analysis, four separable things:

1. **The core language.** Pronouns, tenses, questions, negation, time, feeling — everything the
   existing 30-hour core and Pod 1 already deliver. Nothing sector-specific here, and it is the
   majority of every conversation by token count in any corpus anyone has ever counted. This is
   the safest claim in the whole document: even highly technical talk is mostly made of
   ordinary words.
2. **The sector lexicon.** The delta vocabulary: symptoms, referral, discharge, blood pressure.
   Smaller than intuition says (see Bet 2, §3) — plausibly hundreds of items per role, not
   thousands — and sharply Zipf-distributed within itself.
3. **The sector register and its formulae.** Not words but *wirings*: "Good morning madam, how
   can I help you today?" is Tom's own B-strand example and note what it is — almost entirely
   core vocabulary in a sector-specific *register and formula*. The formulae are few, high
   frequency, and formulaic precisely so they can be acquired as wholes.
4. **The discourse moves at the required altitude.** Explaining, hedging, persuading, holding
   the floor — the ladder's Pods 2–3 inventory. The pod ladder's central claim (§1 there) is
   that this is *the* distance from B1 to B2 listening: "a discourse-type distance, not a
   vocabulary distance."

The architectures below are all ways of packaging 2, 3 and 4 relative to 1. Keep this
decomposition in hand throughout, because several apparent forks dissolve when you ask *which
of the four* a given mechanism is delivering.

### 1.3 The triple helix — A/B/C from Zenjin Maths, taken seriously

Tom's seed: A is core; B and C are options that become live when chosen, "maybe at the
beginning … in which case we might have sector specific phrases that start coming in alongside
the core SEEDS". His worked pair:

> A — I want to speak Chinese with you now
> B — Good morning madam, how can I help you today?

What does this actually mean when pushed into the object model the machine runs on?

**(a) What a B-strand item *is*.** Two honest possibilities, and they route through different
machinery:

- **B-items as seeds** — full course citizens: decomposed into LEGOs, tiled, ZUT-gated,
  BUILD/USE phrased, entering the round and Fibonacci review structure. This is what "sector
  specific phrases … alongside the core SEEDS" most literally says.
- **B-items as pod turns** — listening citizens: whole intentions, S-LEGO segmented, rendered
  as dialogue, never decomposed for production drill. This is what the existing specialist-pod
  design says.

This is the deepest fork in the whole exploration (Fork 2, §2), and Tom's two instincts
currently point at opposite sides of it: the helix instinct says seeds; the "mostly about the
listening" instinct says pods. They can coexist with a ratio — but the ratio is then the design.

**(b) The vocabulary-availability rule constrains the helix hard.** The course machinery's law
is that a LEGO may draw only on what has already been introduced. A B-strand seed arriving at
hour 0 cannot tile from core vocabulary that doesn't exist yet. So the helix, if it runs
through the seed machinery, has exactly three options:

  1. **Early B-items enter as unanalysed wholes** — formulaic chunks learned as single moves
     ("Good morning madam, how can I help you today?" as one intention), decomposed only later
     when the core has caught up. This is respectable — it is how humans actually acquire
     service formulae, and it is how Pod 0 already works — but it is a *different learning
     object* from a seed, and the machinery would need to know that.
  2. **B-strand ordering is slaved to A-strand coverage** — each B-seed waits until its
     assembly distance from the covered graph is one. Elegant, pure least-time
     (order-by-assembly-distance applied across strands), and it means the helix is *not*
     parallel strands at all but one interleaved trajectory through one graph with sector
     items scheduled at their earliest legal moment. This reading dissolves a lot of the
     helix's apparent machinery cost — see Frame-breaker 1.
  3. **B is a separate mini-course** with its own self-contained early vocabulary. Expensive,
     duplicative, and it forfeits the overlap that is the teaching mechanism. I list it for
     completeness and to dismiss it: it fails better × simpler × cheaper on all three legs.

**(c) ZUT across strands.** ZUT is course-wide: one known prompt, one target form. Sector
content creates real collision pressure — the core may map "How can I help?" informally while
the sector needs the formal service register; health-English "theatre" is not
entertainment-English "theatre". Three live options:

  - One course-wide ZUT namespace, with sector prompts disambiguated *naturally on the known
    side* — context words and vocatives, never annotations. Note that Tom's own B-example
    already self-disambiguates: "Good morning **madam**, how can I help you **today**?" — the
    vocative does the work, exactly per the no-parentheses law. My read: this is the answer,
    and the fact that Tom's instinctive example already obeys it is evidence the law is the
    right one.
  - Strand-scoped ZUT namespaces. Simpler for authors, but it re-imports the fork ZUT exists
    to kill: a learner who has both strands live *does* face one known prompt with two target
    forms. I'd dismiss this — it spends the method's central guarantee to save authoring
    effort.
  - Sector-as-separate-course sharing a common core by reference. Clean ZUT, but the review
    machinery then can't interleave strands, and interleaving is most of the helix's point.

  Register note: the sector is also where **tu-first meets its own exception legitimately**.
  "Tu first as default, unless context insists" — a customer-facing or clinical sector is
  the context that insists. Sector strands will be the main lawful home of formal register in
  the estate, and that is worth saying out loud so nobody sweeps it as a violation later.

**(d) Review bandwidth is finite and strands compete for it.** The review slot cap and the
Fibonacci offsets don't grow because a second strand arrived. A live B-strand dilutes A-strand
review density (or extends the session). This is a real, quantifiable cost of "live from the
beginning" — the helix is paid for in review slots, and the interleave ratio (2 A : 1 B?
3 : 1?) is a genuine tunable that telemetry should set, not the armchair.

**(e) Switching sector at hour 12.** If B entered via seeds, an abandoned strand strands
half-built paradigms and sunk production drill — real idle charge with no downstream work. If
B entered via listening, switching is cheap: comprehension generalises partially, nothing
half-drilled rots in the review queue. This asymmetry is one of the strongest structural
arguments for the listening-led sector entry (Bet 1).

**(f) Choosing no sector at all.** A must be a complete course with zero dependency on B or C.
Dependency is strictly one-way: B may assume A, never the reverse. This sounds obvious and is
worth writing down anyway because it forbids the tempting move of letting a really good sector
phrase teach a core pattern first.

**(g) When should B go live? The idle-charge answer is: it depends whose clock.** Here is the
one place this exploration pushes back on a too-quick application of the theory, and it is
worth a labelled paragraph:

> **A tension with Least-Time, stated rather than worked around.** The idle charge prices a
> distinction held but unused — which seems to argue against sector content at hour 0, since
> the course won't *use* "referral" for weeks. But the integral runs over the learner's
> effort-time, not the course's, and for a nurse already on a ward in the target country,
> "referral" is load-bearing at hour 0 *in their life*: it does work tonight, on shift. For an
> aspirational learner in another country, the same item at hour 0 is pure idle charge. The
> load-bearing-at-introduction law therefore doesn't give one answer for "when does the
> sector strand start" — it gives one answer *per learner motive*. The theory is not in
> tension with itself; it is in tension with any design that fixes the strand entry point
> globally. Consequence: sector entry timing should be a learner-facing choice (or an
> onboarding question — "are you using this at work now?"), not an architectural constant.
> That is, I think, exactly what Tom's "options that become live when chosen" was groping at,
> and the theory says he was right, with the refinement that *when chosen* should be allowed
> to be *at the beginning* precisely for the in-sector learner and probably shouldn't be for
> anyone else.

**(h) What the helix costs to build.** A sector strand through the seed machinery costs what a
course costs: translation choice, decomposition, ZUT sweeps, phrase floors, audio — *per
language pair*. Sectors × roles × language pairs is a cliff (see §1.4). A sector strand
through the pod machinery costs one canonical English master + per-language rendering — the
pipeline the estate already runs at scale. The build-cost asymmetry between the two answers to
Fork 2 is roughly an order of magnitude, and it compounds across every sector added. This is
the "cheaper" leg doing real work, and it pushes the same direction as (e) and as Bet 1.

### 1.4 Role — nurse, porter, doctor, hospital manager

Tom: "we'd probably need role-based things in there … a nurse is perhaps different from a
porter and a doctor and a hospital manager and so on … and leadership positions would also be
contextual."

The combinatorial threat first, because it disciplines everything: sectors × roles ×
language pairs. Four hospital roles × ten sectors × the estate's language pairs is not a
content plan, it is a content apocalypse. So the question is Tom's own: *what is the cheapest
structure that still gets a porter what a porter needs?* Five candidate structures:

1. **Role as a third strand (C).** The helix's literal reading: A core, B sector, C role.
   Maximum machinery, maximum build cost, and it dignifies role with more structure than the
   evidence yet supports. Dismissed by me on cheaper-and-simpler grounds unless a pilot shows
   role deltas too large for the lens model (option 4).
2. **Role as its own pod per role.** Four health pods. Honest but quadruples authoring, and
   almost all content would be shared — the waiting room, the handover, the corridor
   conversation are the *same scenes* from four chairs.
3. **Role as a register knob.** Treats role as how-you-speak rather than what-you-say.
   Captures the leadership point (a manager's register is contextual, as Tom says) but misses
   that a porter and a doctor genuinely say different *things*, not just differently.
4. **Role as a lens over one shared sector spine.** One set of scenes; the role determines
   *which lines you drill for production and which you only comprehend*. This is the one I
   want on the table with force, because it falls straight out of the listening hypothesis:
   **in a real ward conversation, the porter must *understand* the doctor's lines but only
   *produce* the porter's.** Everyone in the room shares one listening target — the whole
   conversation — and differs only in their production slice. One authored dialogue, four
   role-views; production drill (the HISE content) is per-role, the listening diet is shared.
   Authoring cost ≈ one pod plus role-tagging of lines; role-fit ≈ what a per-role pod would
   give. On better × simpler × cheaper this wins so cleanly against 1–3 that I'll call it:
   **this is not a fork, it is an answer** — *if* the listening hypothesis holds and *if*
   scenes really are shared across roles, both of which are cheap to test (Bets 1 and 3).
5. **Role stops mattering above the lexical floor.** The null hypothesis: once the shared
   sector spine (scenes + lexicon) exists, role differences are small enough to leave to the
   learner's own selective attention. Worth keeping alive because it costs nothing and might
   be true for many sectors outside the steeply hierarchical ones.

Where does role stop mattering? My read: role lives almost entirely in layer 3 of §1.2
(register + formulae) and in the *production slice*, barely at all in layers 2 and 4 — the
sector lexicon and the discourse moves are shared across the ward. That is exactly what the
lens model assumes, which is why Bet 3 matters.

And Tom's leadership remark generalises: "leadership positions would also be contextual" —
leadership register is arguably not sector content at all but a *cross-sector role*, the same
chairing/delegating/feedback moves in a hospital, a kitchen, a bank. If so, "Leading in
[language]" is a spine-level module that every sector pod can reference — one more piece of
evidence for the spine idea (§1.6), and a rather attractive product in its own right.

### 1.5 "We suspect it's MOSTLY about the listening" — the load-bearing hypothesis

Take it seriously and see what it commits the design to.

**Why it is plausible, in three independent ways:**

- **The asymmetry of the 90% target.** "90% of their regular conversations" is mostly a
  *reception* target: a conversation is held if you follow it and can produce your slice.
  Production can circumlocute around a missing word; comprehension cannot — the interlocutor
  chooses the words, not you. So the coverage burden falls overwhelmingly on recognition, and
  the recognition lexicon needed is much larger than the production lexicon — but each
  recognition item is *far cheaper to acquire* than a production item (no ZUT, no drills, no
  phrase floors — exposure in comprehensible context). Mostly-listening is what
  minimum-admitted-maximum-minted looks like when the target is comprehension coverage.
- **The pod ladder's discourse-distance claim.** If the B1→B2 distance is a discourse-type
  distance, and discourse types are acquired by *hearing them enacted* (you don't drill
  "holding the floor" as a phrase), then the vehicle for layer 4 of §1.2 is necessarily
  listening.
- **Fifteen years of SSi's own evidence runs the other way for the core** — speaking-first is
  the method — and that is not a contradiction: the core builds the *production engine*
  (layers 1 and 3); the sector layer mostly extends the *recognition surface* (layers 2 and
  4). The hypothesis, sharpened: **speaking-led for what you'll say, listening-led for what
  you'll hear, and the sector delta is mostly things you'll hear.**

**What follows for the build if it's true:**

- The 30 sector hours are predominantly a curated listening diet — pod scenes at ramping
  complexity and speed — with a thin HISE production layer for the role's own slice
  (the formulae and the learner's professional utterances). Perhaps 25 h listening : 5 h
  speaking rather than anything like parity. The "flexing of HISE content by domain choices"
  Tom mentions is then a *small, surgical* flex: the sector changes maybe a few hundred
  production items and a register, not the speaking course's spine.
- Authoring economics shift decisively toward the pod pipeline (canonical English master,
  per-language rendering) and away from per-pair seed authoring — an order-of-magnitude
  cheaper per sector, and safely parallelisable, as the ladder already notes.
- The measurement problem becomes tractable: comprehension coverage of real sector audio is
  testable cheaply (play held-out real conversations, probe understanding); production
  coverage of a role's slice is a small enumerable set.

**What would refute it:** learners who complete a listening-heavy sector pod and follow the
ward perfectly but freeze on production of their own slice beyond the drilled formulae — i.e.
the production engine built on general content fails to transfer to sector production without
sector-specific speaking volume. If that shows up, the ratio swings back toward HISE and the
sector strand must run through the seed machinery after all. This is Bet 1 in §3, with a
cheap test attached.

### 1.6 The ramp inside a specialist pod — and the spine idea

Two connected instincts from the source conversation, both Watson's rather than Tom's, both
worth testing hard rather than adopting:

**(a) Watson's flag on "gradually from greetings to lecturing":** that inside a *specialist*
pod the greetings end may be redundant, because Pod 1 graduates already own greetings, and the
real specialist ramp is **anecdote → shop-talk → explanation → lecture**. My verdict: accept
the diagnosis, refine the prescription. The front of a sector pod shouldn't re-teach greeting
*moves* — but it should still *open* in transactional and social frames, because that is where
the sector *lexicon* gets its cheapest first exposures (booking the appointment, the waiting
room — precisely the ladder §6 health draft's opening rows). Old moves, new words, then new
moves on now-familiar words. The ramp is real; it just ramps *moves* and *lexicon* on
alternating steps — never both in the same breath, which is the ladder's own law and survives
contact with this refinement intact.

**(b) Watson's discourse-spine / swappable-domain-lexicon split:** a common spine of hedging,
argument, abstraction and connective tissue runs through every specialist pod; the domain
lexicon is the swappable layer; and the Bologna pitch becomes "here's the spine; bring your
own domain." Tested hard:

- **Where it holds.** Across *sectors*, strongly: the ladder's move inventory (disagreeing,
  hedging, conceding, signposting, digression-and-return, structured argument) is visibly
  domain-independent — a cardiologist and an economist hedge with the same machinery. The
  evidence is the ladder's own §6 table, where eight health scenes borrow eight general
  frames without strain, and the same table "works for sport, the economy, travel, food."
- **Where it fractures, honestly named.** (i) Across *target languages*, partially: discourse
  markers, hedging idiom and irony are exactly the things the ladder flags as flexing worst
  across languages (its own open question 1). The spine's *inventory* generalises; its
  *realisations* are per-language work — which is fine, because that is precisely what the
  canon-fidelity renderer already does, but it means the spine is a per-language asset, not a
  free universal. (ii) Some sectors have genuinely sector-specific *moves*, not just words:
  clinical history-taking is a ritualised question sequence with no general-conversation
  ancestor; air-traffic phraseology is a closed code; legal advocacy has its own turn
  economy. The spine covers the conversational 90% Tom named; the last professional 10% in
  ritualised sectors is real spine-extension work, and pretending otherwise would be a false
  bridge — debt. (iii) Register interacts with the spine: hedging *as a nurse to a
  consultant* is not hedging *as a mate in the pub* — the move is shared, the calibration is
  sector work.
- **Verdict, labelled mine:** the spine is real and it is the single most valuable asset in
  the whole architecture — build it once per language in Pods 2–3 of the general ladder, and
  every sector pod inherits it. But sell it as "the spine plus each sector's own ritual
  moves", not "the spine is everything." The Bologna pitch survives in stronger form:
  *the spine is ours and comes with the methodology; the lexicon is yours; the ritual moves
  are where your community's expertise makes the course only you could make.*

### 1.7 The Method Pod as specimen one

Tom and Aran want the first specialist pod to be the two of them talking about their own
method — learning, the brain, the trial-and-error experience, the retrospective theories.
What does it mean that specimen one is a domain where the authors are the world experts and
the vocabulary is their own coinage?

**What it proves well:**

- The authoring pipeline end-to-end: canonical master → rendering → S-LEGO segmentation →
  audio, on real discussion-and-explainer discourse (Pods 2–3 moves) rather than survival
  transactions. That is the machinery every later sector pod needs, exercised where content
  risk is zero because the canon-holders are in the room.
- The spine hypothesis, in its hardest useful form: the method domain is *abstract* talk —
  ideas held up and examined — which is exactly the spine's upper end. If the spine carries
  Tom and Aran discussing idle charge and minted distinctions in Welsh or Spanish, it will
  carry a health explainer.
- Vocabulary discernment where discernment is cheapest: the domain lexicon is their own
  coinage (LEGO, seed, minting, the charge), so the translation-choice question — normally
  the expensive, taste-laden step — is answered by the people who own the terms. ZUT is
  maximally safe: one mind coined the known side.
- **A measurement gift nobody has noticed out loud:** for this one sector, "their regular
  conversations" have a literal corpus — years of Tom-and-Aran recorded conversation about
  the method. The 90% target can be *computed* against real data for specimen one in a way
  no other sector allows on day one. Use it (Bet 2's cheapest instance).
- And a product truth worth stating plainly: the Method Pod is self-advertising content.
  A learner acquiring the language by listening to the inventors explain why the acquisition
  is working is a loop that markets the method while delivering it — legitimately, because
  the content is true. For Bologna, it is the perfect demo *of the demo*.

**What it deliberately does not prove — name it so nobody over-claims later:**

- It is a **one-role sector**: no porter/manager spread, so it tests nothing about role
  structure (§1.4). Health remains the first real test of the lens model.
- It has **no register spread**: two peers in one register. The formal/service register
  machinery goes untested.
- It proves nothing about the **community-author case** — the Bologna promise is that a
  community member with domain expertise but no methodology expertise can build a sector
  course with popty. Tom and Aran are the *maximally unrepresentative* authors for that
  claim. Specimen two, not specimen one, is where the community-authoring claim gets its
  evidence — ideally a sector pod authored by someone outside the building with the tool
  and the spine, watched closely.
- Its ZUT safety is unrepresentative for the same reason its discernment is cheap: real
  sectors have contested terminology and synonym forks that their communities will fight
  about. The Method Pod will sail through the gate that health will genuinely exercise.

### 1.8 C1/C2 and the denominator question

Tom: "getting people from comfortable with everyday conversations into C1/C2 on the CEFR
following the least-time principle which means we have to choose the vocabulary perfectly —
well, at least, with discernment…"

CEFR is his frame here, so use it — and it earns its place in two roles: the *export label*
(the outside world, including a Bologna audience of polyglots, prices ability in CEFR) and a
rough altitude gauge (the C-levels do gesture at exactly the spine: flexibility, implicit
meaning, structured discourse on complex subjects).

But I'll take the licence offered and argue the denominator point: **CEFR is the wrong
quantity to minimise against, and least-time already says so.** CEFR is domain-general by
construction — C1 certifies you across *whatever* topics the examiners sample. Tom's target
is "90% of *their regular* conversations": a learner-specific distribution, sharply
concentrated by sector and role. Driving a nurse to global C1 spends effort-time on
distinctions their ward will never use — pure idle charge against their actual life — while
under-serving the ward's own long tail. The geodesic to *their* 90% passes through sector
competence *before* global C1, and may deliver "functions at C1 *in their domain*" for a
fraction of the effort-time global C1 costs. In least-time terms: the denominator is the
learner's own conversation distribution; CEFR is the certificate you print afterwards.

This also resolves "choose the vocabulary perfectly … with discernment" into something
buildable: discernment = *frequency-ranking against the sector's real corpus*, per role, cut
off where marginal coverage per admitted item collapses. Perfection is unnecessary; the Zipf
curve does most of the discerning, and telemetry does the rest. Minimum admitted, maximum
minted, with the corpus as the referee — which is Bet 2.

### 1.9 The 30 + 30 budget and the 90% measurement problem

*Ruled 2026-08-25 — the numbers posture here is reframed; see the Rulings addendum at the end of
this document.*

Is 30 + 30 a hypothesis, a constraint, or a marketing number? **My read: the first 30 is an
empirical anchor** — fifteen years of SSi says 30-ish core hours reaches conversational
production, and that number has earned its place. **The second 30 is a hypothesis riding on
two other bets:** that the sector delta-lexicon is small (Bet 2) and that listening delivers
it cheaply (Bet 1). If both hold, 30 sector hours is generous; if either fails, no number
survives. And it is *also* a marketing number, which is fine — "30 + 30" is a beautiful
claim for a Bologna stage — provided the measurement behind it is honest, because a polyglot
audience will ask exactly the question this section answers.

**"90% of their regular conversations", made measurable.** Whose conversations: the role's,
not the sector's — a porter's distribution, not "hospital language". Counted how — three
defensible instruments, in ascending cost:

1. **Corpus coverage (cheap, do first).** Assemble real or realistic sector dialogue per role
   (health has abundant open material — simulated patient dialogues, handover corpora;
   the Method Pod has the back-catalogue). Compute token coverage of (core course + Pod 1
   vocabulary + candidate sector lexicon). The claim "90%" becomes a number on real text
   before a single scene is authored. This also *sizes the delta-lexicon* — the single most
   design-relevant unknown in the whole architecture.
2. **Held-out comprehension probes (moderate).** Learners who finish the sector pod hear
   real sector audio they've never met and answer move-level probes ("what did the doctor
   ask her to do?"). Comprehension of held-out material is the honest operationalisation of
   "holding the conversation" on the reception side.
3. **Production-slice audit (moderate).** The role's own utterance inventory is small and
   enumerable; test the learner's production of a sample under time pressure. Reception
   coverage plus production of your slice *is* sector competence as defined in §1.5.

What 90% should *not* mean: 90% of dictionary lemmas, 90% of a CEFR wordlist, or
90%-of-utterances-perfectly-parsed. Token coverage weighted by frequency, plus move-level
comprehension, is the defensible reading — and it is the one that makes 30 hours plausible,
because the frequency curve does the heavy lifting.

### 1.10 Options nobody in the conversation has raised yet

Captured because Tom asked for the whole space, not just his seeds:

- **Motive-gated strand entry** (from §1.3g): ask at onboarding "are you living or working in
  this language now?" and let that answer, not architecture, set when B goes live. One
  question converts the idle-charge tension into a feature.
- **Bridge re-renders as sector on-ramps.** The ladder's speed machinery (same canonical
  text, faster profile, zero authoring cost) applies to sector pods too: the Health Pod at
  *careful* is the hour-0-friendly version of itself; at *native* it is the ward. One
  authored sector pod is several rungs for the price of one TTS pass.
- **The production/reception ledger as a first-class object.** If role = production slice
  (§1.4), the system should *know*, per item, whether it owes the learner production or only
  recognition. Today the machinery has one kind of "introduced". A two-tier ownership model
  (mint for production / admit for recognition) is the object-model change that makes the
  whole listening-led architecture legible — and it is also, quietly, what the idle charge
  wants priced, since the two tiers carry different holding costs.
- **Leadership as a cross-sector module** (§1.4): chairing, delegating, difficult
  conversations — one spine-level pod referenced by every sector, rather than re-authored
  inside each.
- **Sector switch as a product event, not a failure.** If listening-led entry makes
  switching cheap (§1.3e), say so in the product: "try a sector for a week" becomes a
  feature no seed-strand architecture could offer.
- **The learner's own corpus as the eventual selector.** Long-run and speculative, flagged
  as such: the honest denominator (§1.8) is the learner's actual conversation distribution.
  A learner who (consentingly) lets the app hear their working day gives the selector the
  true frequency table to mint against. Heavy privacy engineering, real wow, not needed for
  Bologna — but it is where "least time to competence in any domain" logically terminates:
  the domain defined by the learner's life rather than by our sector list.

---

## 2. THE FORKS — the genuine either/ors

**Fork 1 — Where the sector layer attaches: after Pod 1, or after Pod 3?**
After Pod 1 (Tom's current usage): sector motivation arrives early, retention story strong,
but the sector pod must carry discussion/extended-speech moves itself, mixing new moves with
new words. After Pod 3 (the ladder's design): sector pods stay pure cheap lexicon-pours, but
the learner waits longest for the content they came for — and a nurse who needs the ward
*now* may not forgive the wait. **Not resolvable by better × simpler × cheaper alone**,
because the legs disagree: cheaper-to-author says after Pod 3; least learner-time-to-*their*-
competence plausibly says early, interleaved. A middle path exists (sector pod authored in
two bands, transactional/social band unlocked after Pod 1, discussion/explainer band after
Pod 2–3 equivalents) and might dissolve the fork — but the band boundary is then a taste
call. **Genuine fork; it needs Tom and Aran's call, and it interacts with the naming
decision (§1.1).**

**Fork 2 — Does sector content run through the seed machinery or the pod machinery?**
The helix instinct says seeds (production citizens: LEGOs, ZUT, reviews). The listening
instinct says pods (reception citizens: whole turns, rendered listening). Order-of-magnitude
build-cost difference per sector per language; switching-cost difference; review-bandwidth
difference. **My call, labelled:** the evidence assembled here — the 90% target's reception
asymmetry, the switching argument, the build arithmetic, and the two-tier ownership model —
resolves this one: **pods carry the sector; seeds carry only the role's production slice**
(the formulae and professional utterances, a few hundred items entering the course machinery
with full ZUT citizenship). That is not a compromise between the two instincts; it is each
instinct assigned to the layer it is right about. I'd defend this as a
better × simpler × cheaper three-leg win — but it stands on Bet 1, so it is a call with a
falsifier attached, which is the best kind.

**Fork 3 — Role: lens over a shared spine, or per-role content?**
Stated in §1.4. My call: the lens (option 4) wins on all three legs *conditional on Bet 3*
(scene-sharing across roles holds). If a sector pilot shows role-exclusive scenes dominating,
the fork reopens. Cheap to test before committing anything.

**Fork 4 — Is the sector strand interleaved into the core sessions, or a parallel track the
learner alternates by choice?**
Interleaved (true helix): one session stream, strands woven, review machinery shared —
maximum method control, review-slot dilution priced in. Parallel (a "sector shelf" beside
the core): simpler machinery, learner agency, but the method loses control of spacing and
the strands can drift apart. Zenjin's original triple helix is the precedent for woven; the
pod shelf is the precedent for parallel; the two-tier model of Fork 2 softens the stakes
(listening tolerates looser scheduling than production drill). **Genuine fork, taste-heavy,
and it is really a question about how much of the method's authority extends over the
listening diet.**

**Fork 5 — Community sectors: curated gate or open field?**
The Bologna promise is the free community tool building sector courses on the methodology.
Open field: anyone pours any domain into the spine; scale, and scale's quality variance.
Curated: SSi-blessed sector pods only; quality, and a bottleneck that betrays the pitch.
The spine-plus-gates architecture (spine and validators are the method's, content is the
community's, the ZUT and clunkiness gates run regardless of author) is the obvious synthesis
— but where the *taste* pass comes from for a community course in a sector nobody at SSi
knows is genuinely unresolved. **Real fork, and it is the one Bologna's audience will walk
into the room already asking about.**

*(Non-forks, called as such: strand-scoped ZUT — dismissed, §1.3c, it spends the method's
central guarantee; B as a self-contained mini-course — dismissed, §1.3b; role as a third
helix strand — dismissed pending contrary pilot evidence, §1.4.)*

---

## 3. THE TESTABLE BETS

**Bet 1 — "It's mostly about the listening."** The load-bearing hypothesis; Forks 2–4 all
lean on it. *Confirmed by:* sector-pod completers passing held-out comprehension probes AND
producing their role slice from a thin HISE layer. *Refuted by:* comprehension passing while
production of the learner's own professional slice fails beyond drilled formulae. *Cheap
test:* the Method Pod cohort — completers listen to a never-heard Tom-and-Aran conversation
and are probed for comprehension, then interviewed in-language about the method. One cohort,
weeks not months, and the content is being built anyway.

**Bet 2 — The sector delta-lexicon is small (hundreds per role, not thousands).** This is
what makes 30 sector hours arithmetically possible at all. *Confirmed by:* corpus coverage
runs (§1.9 instrument 1) showing core + Pod 1 vocabulary already covering the large majority
of real sector dialogue tokens, with a compact ranked delta closing to ~90%+. *Refuted by:*
a fat, flat tail. *Cheap test:* one afternoon of scripting against open health-dialogue
corpora, and the Method Pod's own back-catalogue for specimen one. **Do this first; it is
the cheapest number in the whole exploration and everything prices off it.**
*Ruled 2026-08-25 — unchanged and still first, but its job changes; see the Rulings addendum.*

**Bet 3 — Scenes are shared across roles; role is a production slice, not a content set.**
Underwrites the lens model (Fork 3). *Confirmed by:* drafting the health scene slate and
finding most scenes multi-role with role-tagged lines. *Refuted by:* role-exclusive scenes
dominating the slate. *Cheap test:* it is a whiteboard exercise on the ladder §6 table
before any authoring — an hour of Tom and Aran's time, no machinery.
*Ruled 2026-08-25 — this is the same insight as the archetype method; see the Rulings addendum.*

**Bet 4 — The discourse spine generalises across sectors (with named ritual-move
exceptions).** Underwrites the Bologna pitch and the authoring economics. *Confirmed by:*
the same general frames carrying two very different sectors (say health and the Method Pod
— deliberately far apart in register and abstraction) without new move types beyond a
countable ritual residue. *Refuted by:* every new sector demanding new moves. *Cheap test:*
the two specimen pods ARE the test; instrument them as one rather than treating specimen
two as routine.

**Bet 5 — 30 sector hours suffice for 90% by the honest measures.** The compound bet the
others feed. *Confirmed/refuted by:* §1.9's instruments on the first real sector cohort.
*Note:* if Bets 1 and 2 both confirm, this one is close to arithmetic; if either fails,
no cohort study will save the number. Sequence accordingly — corpus first, cohort later.
*Ruled 2026-08-25 — this is a working estimate, not a bet to be won or lost; see the Rulings
addendum.*

**Bet 6 — A community author plus the spine plus the gates produces a shippable sector
course.** The Bologna claim itself. *Cheap test:* one supervised community-authored sector
pod (specimen two or three), with the supervision effort *measured* — because the
supervision cost is the honest price of the open field in Fork 5.

---

## 4. THE FRAME-BREAKERS — different ways to carve the problem entirely

**Frame-breaker 1 — There are no strands. There is one graph, and a sector is a path
through it, not a place in it.**
The helix frame assumes sector content is a *separate strand* woven against the core. Drop
that. There is one distinction network per language — core and every sector's items all
nodes in it — and "choosing health" doesn't activate a strand, it *re-weights the
selector*: the order-by-assembly-distance law keeps choosing the next node one step from
the covered graph, but distance ties are now broken by the health corpus's frequency table
instead of the general corpus's. Every consequence the helix machinery struggles with
dissolves: no strand-ZUT question (one course, one namespace); no interleave-ratio knob
(the selector just selects); switching sectors is re-weighting, not abandonment — everything
learned stays one graph; role is a further re-weighting within the sector. The cost moves
from *authoring strands* to *building corpora and the selector* — which is software once,
not content per sector per language. This is "it's a bloody graph — you can go in any
direction you like" applied to the sector question, and I think it is where the architecture
ends up in the limit even if the strand vocabulary is kept for the humans. The near-term
version is modest: rank the sector lexicon by corpus frequency and let the existing
scheduling admit items at their earliest legal moment — which is option 2 of §1.3b wearing
different clothes.

**Frame-breaker 2 — Don't author the sector at all; annotate it. The learner's real world
is the content.**
*Ruled 2026-08-25 — rejected in its authentic-audio form; see the Rulings addendum at the end of
this document.*
Every frame so far assumes SSi (or the community) *authors* sector content. Flip it: if
sector competence is mostly listening, the best sector listening is the sector's *own
authentic audio* — real podcasts, real briefings, real meetings. SSi's machinery becomes an
*annotation and rendering pipeline over authentic material*: transcribe, S-LEGO segment,
gloss against the learner's covered graph, re-render at speed profiles, generate the thin
production layer for the learner's slice. The 30 sector hours are scaffolded descent into
the real thing rather than a simulacrum of it — and the scaffold is *personal*, because the
gloss is computed against what this learner already owns. Blockers are real (rights,
transcription quality, and the gates were built for authored canon, not wild text) and the
production layer still needs authoring — but as the *end state* of "least time to
competence in any domain", scaffolded-authentic likely beats authored-synthetic, because
the target distribution is sampled directly rather than imitated. The near-term hybrid:
authored pods carry the ramp; the pod's final rung is annotated authentic audio. The
ladder's Pod 3 capstone ("Episode One — a whole small podcast") is already reaching for
this.

**Frame-breaker 3 — Sell the 60 hours as one product: the competence loop, not a course
plus an add-on.**
Core-then-sector, 30 + 30, is a syllabus frame: content fixed in advance, learner walks
it. Replace it with a *closed loop*: measure the learner's gap against their target
distribution (the corpus instruments of §1.9, run continuously rather than at the end),
mint content on demand to close the largest measured gap, re-measure. "30 + 30" stops
being a promise about content volume and becomes a promise about the loop's convergence
rate — which is what least-time actually is: the geodesic is found by the descent, not
drawn on the map beforehand. The pieces exist in embryo (telemetry sets the weights, "we
only get there by testing", the generation pipeline is cheap enough to mint to order);
what doesn't exist is the measurement running *inside* the product rather than inside our
audits. This is the deepest cut at the marketing number too: the honest Bologna claim
under this frame is not "60 hours of content" but "a loop that gets *you* to *your* 90%
and shows you the needle moving" — a strictly stronger pitch, if the loop can be shown
live on stage.

---

## 5. Where this leaves the room

The one-paragraph version, position taken and labelled mine: the sector layer should be
**listening-led through the pod machinery, with a thin per-role production slice as full
seed citizens** (Fork 2, called); **role as a lens over shared scenes** (Fork 3, called,
pending the whiteboard test); the **spine built once per language and sold at Bologna as
the thing the community pours its domain into** (§1.6, with the ritual-move caveat spoken
aloud); **strand entry timing gated by learner motive, not fixed by architecture** (§1.3g);
and the **corpus-coverage number computed before anything is authored**, because Bet 2 is
an afternoon's work and every other number in the design prices off it. The genuine
undecided forks needing Tom and Aran are the attachment point (Fork 1), woven versus
parallel (Fork 4), the community gate (Fork 5) — and the naming collision (§1.1), which
costs one sentence to settle and gets more expensive every week it isn't.

And the sentence to keep from the whole document, in the house currency: **the sector
question is not "what extra content do we add?" but "what is the minimum admitted — mostly
heard, barely taught — from which this learner mints 90% of their own conversations?"**
The corpus knows the answer; we should ask it first.

---

*Explicit gaps, honestly reported: no corpus coverage run exists yet (Bet 2 is proposed,
not performed — every "hundreds not thousands" sizing above is prior, not measurement);
the Zenjin triple-helix internals were not re-read for this document, so the A/B/C
treatment leans on Tom's description in the source conversation; and the community-tool's
current authoring UX was not audited against the Fork 5 claims. None of these gaps was
papered over; each is named where it bears.*

---

## Rulings addendum — 2026-08-25

*Everything above is the exploration as written on 2026-08-24 and it stands as that snapshot.
On 2026-08-25, reading it, Tom ruled on two of its open questions, via the RBF room. The rulings
are recorded here verbatim, with what each one settles. This addendum reports; it does not
re-argue, and it does not alter a word of the exploration's own positions.*

### Ruling 1 — the numbers posture. We are estimating, not claiming.

> numbers do NOT need to be stated as claims - the first 30 hours is broad evidence base
>
> the sector specific stuff, we genuinely have no idea and 90% is an aspiration
>
> it might be acceptable at 70%
>
> or it might jsut be incremental over the lifetime of the learner right up to ~ 100%
>
> we do NOT need to agonise over these numbers, we are using them as 'most likely estimates'
> based on our experience
>
> but we have zero evidence right now of sectro-specific teaching

— Tom, 2026-08-25, via the RBF room.

**What this settles.** §1.9 and Bet 5 are reframed. The first 30 hours stands as an empirical
anchor: fifteen years of SSi is a broad evidence base, and §1.9 already says so correctly, so
that half of the section survives untouched. The second 30, and the 90%, are working estimates —
most likely estimates based on our experience — not claims, not targets to be defended, and not
promises to be met. The document must no longer be read as though 90% is a number we owe anyone.

**The band is open, and all three readings are Tom's.** 90% is an aspiration; 70% may be
perfectly acceptable; it may equally be incremental over the learner's lifetime, right up to
~100%. These are not alternatives to be narrowed down to one. They are the honest width of what
we do not know, and recording all three is the point.

**The load-bearing sentence is the last one: we have zero evidence right now of sector-specific
teaching.** Bet 5 — "30 sector hours suffice for 90% by the honest measures" — should therefore
be read as a working estimate rather than a bet to be won or lost. The agonising stops.

**The consequence for sequencing, precisely.** The corpus-coverage run — Bet 2, §1.9
instrument 1 — still runs first. That is unchanged, and §5's "the corpus-coverage number computed
before anything is authored" still holds exactly as written. What changes is the run's *job*. It
is no longer there to defend a promise; it is there to inform the estimate. Same run, same
afternoon's scripting, different posture. A future reader will get this wrong if it is not said
plainly, so: the sequencing survives intact, the burden of proof it was carrying does not.

### Ruling 2 — no aggregation. Frame-breaker 2 is rejected in its authentic-audio form.

> we do NOT want to be an aggregator of other people's content
>
> people come to SSi because they TRUST that we've done the selection for them (mostly - ok, I
> know it will now depend on sectors)
>
> but they do NOT want to be having to make decisions about which podcast to listen to next
>
> the thinking is that SSi will RESULT in them developing sector-competence in the language
>
> by just playing the app, making their sector selections
>
> and so we need to research the field to find the archetypes rather than the specific examples
>
> which saves us on any issues with copyright and so on

— Tom, 2026-08-25, via the RBF room.

**What this settles.** Frame-breaker 2 as written — "Don't author the sector at all; annotate it.
The learner's real world is the content" — is rejected in its authentic-audio form. There is no
annotation pipeline over wild audio: no transcribe-and-gloss over real podcasts, real briefings
or real meetings. Its near-term hybrid goes with it — the pod's final rung is not annotated
authentic audio. That last sentence of the frame-breaker is rejected along with the rest.

This touches the ladder's Pod 3 capstone, "Episode One — a whole small podcast", insofar as that
capstone was reaching for authentic material: under this ruling the capstone episode is authored
by SSi, not sampled from the wild. That is a consequence for `docs/pods/pod-ladder-proposal.md`,
flagged here rather than applied — this addendum does not edit that document.

**What survives from Frame-breaker 2, and it is the valuable half: the field corpus is the
measuring instrument.** Bet 2 is unchanged and still runs first — assemble real sector dialogue,
extract the scene inventory, the move inventory and the frequency distribution. We read the field
to learn its shape. We do not ship the field.

**The content is authored from archetypal scenes carrying that distribution.** Tom's phrase is
"research the field to find the archetypes rather than the specific examples". The corpus tells
us which scenes recur, which moves fill them, and at what frequency; SSi then authors archetypal
scenes that carry that distribution. This is measurement-led authoring, and it is materially
different from both authored-from-intuition and annotate-the-wild — the first has no referee, the
second ships someone else's material. It also, in Tom's words, "saves us on any issues with
copyright and so on", which is a stated benefit of the approach rather than a lawyer's
afterthought.

**The selector stays with SSi.** "People come to SSi because they TRUST that we've done the
selection for them." The learner makes exactly one selection — the sector — and SSi holds the
selector thereafter. No choose-your-next-podcast, no menu of materials, no learner-side curation
burden. Sector competence *results* from just playing the app and making sector selections. This
is the product-identity half of the ruling and it is Tom's call.

### Bet 3 and the archetype method are the same insight

Worth naming, because the two rulings sharpen an existing bet rather than adding a new one.
Bet 3 says scenes are shared across roles: role is a production slice, not a content set — one
authored dialogue, several role views. The archetype method says the corpus's recurring scene
shapes are what we author, not the specific instances we found in the field. Both are the same
move: **author the shape once, and let role, sector and learner be views onto it rather than
separate content sets.** Bet 3 is sharpened, not replaced — and its cheap test grows a second
answer. The whiteboard hour on the ladder §6 scene slate is now the archetype-identification
exercise too: which scenes recur, and which of them are one shape seen from several chairs. One
test, two answers.

### Two frame-breakers untouched

Frame-breaker 1 — one graph, sector as a re-weighting of the selector rather than a new strand —
is untouched by these rulings and if anything reinforced by Ruling 2: the learner's one sector
selection is exactly the selector re-weighting it describes. Frame-breaker 3 — the competence
loop — is likewise untouched, and Ruling 1's posture helps it, because a loop that converges
towards your own 90% is easier to state honestly than a fixed promise of 90%.
