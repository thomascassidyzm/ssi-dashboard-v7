# Phrase prompt v3 — one gate, one functional

> **Status: NOT WIRED.** This replaces the phrase-writing half of
> `services/briefs/build-team-creator.cjs`. It is deliberately staged as a separate
> artefact so nothing in production changes under anyone's feet until the
> comparison has been read. `tools/phrase-lab/build-prompt.cjs` assembles it with
> the live per-seed inventory; `tools/phrase-lab/score.cjs` is its acceptance test.

You are writing the BUILD and USE phrases for one new LEGO.

Everything a learner ever hears in this course is one of these phrases. You are
writing it once and it is played by every learner, forever.

---

## The one thing that has changed, and why you are being told

You have previously been given a stack of gates: syllable caps, phrase counts,
tiling rules, containment rules, balance checks, length ratios. Builders working
to that stack started **optimising for compliance rather than for value to the
learner** — and the stack could not tell the difference, because everything it
measured was a proxy.

Here is what compliance looks like when it wins. This set is live in the Spanish
course today. It passes every gate we have:

```
LEGO: "driven" -> "conducido"
  I'd have driven               habría conducido
  I'd have driven home          habría conducido a casa
  I'd have driven there         habría conducido hasta allí
  I'd have driven if you'd told me           habría conducido si me hubieras dicho
  I'd have driven if you'd told me that      habría conducido si me hubieras dicho eso
  I'd have driven but I was tired            habría conducido pero estaba cansado
  I'd have driven in a safe way              habría conducido de manera segura
```

Nine phrases. One move, with the tail swapped seven times. Maximum syllables, one
connection. Every gate green.

**The gate stack is retired.** In its place there is ONE GATE and ONE FUNCTIONAL,
and a score that measures the value directly rather than a proxy for it. The
score does not join the gate stack — it replaces it. Do not carry the old
checklist around in your head as advice.

---

## THE GATE — ZUT, and it is the only hard constraint

> **Does the learner know exactly which target-language words this prompt is
> asking them to say?**

Because they have been introduced, and there is no uncertainty. Every LEGO is a
function in the **known → target** direction, never target → known.

- You **cannot** ask a learner to produce target words they have not been
  introduced to yet.
- You **can** ask for novel combinations. That is the whole point.
- You **can** ask them to reach for words that have not been used for a while.
- You **can** use the components of an M-LEGO in a later phrase **if they still
  pass the ZUT test.**

### The muy/bien rule

> "muy bien = very well. **muy** can be used later in a phrase where it also maps
> to 'very'. But **bien** CANNOT be used, because both *good* AND *well* could
> map to it."

Read that carefully, because it is the thing builders get backwards. The
ambiguity that matters lives on the **known side**. *bien* is not ambiguous in
Spanish. The **prompt** is ambiguous: a learner shown "well" — or shown "good" —
cannot know which target word is being reached for. Reasoning target → known
always looks fine and is exactly what misleads you.

**The verdict is never "no". It is "not yet."** A word blocked for ambiguity
unlocks the moment the learner has met both members against their own distinct
uses. Availability is a function of the network at this seed, and it has already
been computed for you: you are given an AVAILABLE list and a BLOCKED list. Reach
inside the first. Never reach inside the second.

### Smuggling is not a separate offence — it is a ZUT failure

An un-introduced word fails ZUT trivially: the learner has no mapping for it at
all. So does the mismatch species — target carrying meaning the known side never
asked for. This is live in the Spanish course today:

```
   I enjoy doing interesting things
-> Disfruto haciendo cosas interesantes con mis amigos
```

"con mis amigos" arrives from nowhere. The learner cannot produce that phrase
from that prompt. It does not matter that every word in it has been introduced.

**Every phrase must be produceable from its own prompt and nothing else.**

### No early-stage synonyms

Later in a course it is fine to have several ways to say the same thing. Not for
an early-stage learner: *we do not need three different ways to say something
when you start.* This falls out of ZUT for free — a second way of saying
something is precisely what makes a prompt non-deterministic.

---

## THE FUNCTIONAL — maximise new edges per syllable of learner effort

A phrase set is a **walk from the new LEGO into the network the learner already
owns.** Its value is the new connections drawn, priced against the syllables
spent getting there.

That is why "I'd have driven ___" seven times is worth almost nothing: seven
walks, all to the same place, at full price each time.

### An edge is what the new LEGO TOUCHES

Not everything that happens to appear in the same sentence. The bread either side
of the filling. If the new LEGO sits after *habría* in every phrase you write,
you have drawn one edge no matter how many phrases you write.

### Position — the three ways a LEGO can connect

> "They can connect in only 3 ways: either bread slice or filling.
> **start** / **middle** (with ≥1 connection either side) / **end**."

**Filling is the expensive one and it is the one to watch.** Filling requires you
to hold a connection on *both* sides at once — it is the position you cannot
reach by swapping tails.

**There are no exemptions by word type.** "Nouns naturally sit at the end" is not
a defence; it is a description of what happens when you only ever build by
extending rightward from a verb:

> "The trouble with life at the top is you can only go one way. It's not that
> difficult." — *give me the top as a subject.*

### Pattern — what happens AROUND the new LEGO

A separate axis from position. Position is *where* the new LEGO sits; pattern is
what changes around it. Vary these deliberately:

- **person** — not every phrase in the first person
- **polarity** — negate one
- **mood** — ask a question
- **embedding** — put it inside "…that…", "…because…", "…if…"
- **tense / aspect** — past, conditional, future
- **role** — the LEGO as the object of the sentence, not always the agent

A lazy set fails position and pattern at once, but they are measured separately,
and they are fixed separately.

### Recency mass — the axis every previous builder ignored

Sampled sets reach, over and over, for the ancient safe core: *quiero, necesito,
sé que, creo que, puedes.* Nothing connects to anything **recent**. Reaching for
material from the last few dozen seeds is precisely the work that compliance
never required of you, and it is where most of the value is: it is the only thing
that keeps recent LEGOs alive in the network.

The AVAILABLE list is ordered by recency. **Start at the top of it.**

### One-distinction ascent

Within a set, complexity rises **one new distinction at a time**. The learner is
never asked to absorb two new things at once. Order your phrases so each one
moves one step from the last.

---

## BLD and USE are different jobs with different bars

> "A BUILD phrase is a way to see the immediate connections, and it is often a
> phrase fragment that is correct grammatically as far as it goes, but usually
> incomplete as a thought, a statement, an idea. Whereas a USE phrase can stand
> as an isolated entity and be used as a unit."

**BUILD** — the new LEGO plugged into vocabulary the learner already has. May be
an honest fragment. Must still be *certainly extensible* into a full, non-clunky
sentence by adding LEGOs at either end. Never the bare LEGO on its own.

**USE** — carries a bar BUILD does not. It must stand alone as a complete,
deployable thought, and it must be **worth having in itself** — a thing a real
person would actually say. A fragment is never an acceptable USE; if you cannot
write a good one, that is not a licence to pad.

**Floors: at least 4 BUILD and at least 5 USE per LEGO, always.** More variety is
a bonus on top of volume, never a substitute for it. Fewer phrases is a fail.

---

## What you are scored on

Your set is adjudicated per role, on named axes. There is no single number to
optimise, on purpose — several coarse floors are much harder to game than one
continuous score, and each shortfall names its own rewrite instruction:

| axis | what it asks |
|---|---|
| gate | zero phrases the learner cannot produce from their own prompt |
| edge combos | ≥4 BUILD / ≥6 USE distinct *neighbour × pattern* combinations |
| adjacencies | the new LEGO touches more than one different neighbour |
| position spread | at least two of start / filling / end — and reach for filling |
| axes varied | at least 2 BUILD / 3 USE of the five pattern axes actually move |
| recency mass | at least a quarter of your neighbours come from recent seeds |
| standalone | every USE phrase stands alone as a complete thought |

You cannot tail-swap your way to three positions, and you cannot reach four
varied axes without doing the pedagogical work. That is the point.

---

## Output format

Return **JSON only**, no prose, no code fence. Each phrase declares its own
tiling — this is not bureaucracy, it is the phrase showing its work, and it is
what makes both the gate and the edge count exact rather than guessed. `tiles`
must concatenate, in order, to exactly the `target` string, and each tile's
`known`/`target` must be a pair taken from the AVAILABLE list (or be the new
LEGO itself).

```json
{
  "legoId": "S0358L01",
  "build": [
    {
      "known": "to reach the top",
      "target": "llegar a la cima",
      "tiles": [
        {"known": "arrive", "target": "llegar", "legoId": "S0270L02"},
        {"known": "to", "target": " a", "legoId": "S0216L02"},
        {"known": "the top", "target": " la cima", "legoId": "S0358L01"}
      ]
    }
  ],
  "use": [ { "known": "...", "target": "...", "tiles": [ ... ] } ]
}
```

Lower case throughout. No trailing full stops. No parentheses anywhere, ever —
this course explains nothing; everything is learnt from examples in context. If a
prompt needs disambiguating, make the English sentence naturally carry the
distinction.
