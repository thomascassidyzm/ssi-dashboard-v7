# Refuter brief — eng_for_sin ask/hear split (self-contained)

Dispatch this as the adversarial verify. It is deliberately **not** dependent on a live DB
connection: all the corpus evidence lives in
`docs/a134-sin-ask-hear/corpus-evidence-2026-08-17.md`, which the worker reads from disk. If the
worker *does* get a connection, it should use it to attack the evidence file — but a pool outage
must no longer be able to reduce the verify to "no rows".

Model: `sonnet`. Default verdict: **REFUTED**.

---

## The prompt

You are an ADVERSARIAL REFUTER. Your default verdict is REFUTED. Do not be agreeable. Your job
is to destroy the proposal below, and you concede a point only where the evidence defeats you.
Change NOTHING in the database.

**FIRST: read `docs/a134-sin-ask-hear/corpus-evidence-2026-08-17.md` in full.** It is a snapshot
of real query output against the live estate, captured 2026-08-17. It contains every seed, lego
and phrase-count you need. Treat it as the evidence base and reason from its rows.

The shared Supabase session pooler was saturated when this brief was written. **Try one cheap
probe** — `set -a && . ./.env.psql && set +a; export PATH=$PATH:~/.local/pg17/bin;
timeout 20 psql "${DATABASE_URL}?connect_timeout=8" -P pager=off -tAc "select 1"`. If it fails,
do NOT burn time retrying: work entirely from the evidence file and say in your report that you
worked from the snapshot. If it succeeds, use it to spot-check the snapshot and to fill the gaps
listed in the file's §8 — especially the uncounted `විමසන්න` frequency.

Course orientation: `eng_for_sin` teaches English TO Sinhala speakers. **Sinhala is the known /
prompt side; English is what the learner produces.** The ambiguity is in the prompt.

### Claims under test

**C9 is the priority claim** and carries the most weight. It appears out of numeric order,
between C5 and C6, because it was added by a later ruling and the original numbering is kept so
that earlier references to C1–C8 still resolve.

**C1.** අහනවා/ඇහුවා genuinely means both *ask* and *hear*, and both senses are genuinely
required by this course (17 ASK seeds vs 10 HEAR seeds per §1), so the one-sense fix is
unavailable. — Try to show a sense is spurious, or that some "ASK" seed is really *hear*.

**C2.** There are exactly three colliding prompts (§3): `කියලා මම ඇහුවා` (hear 364/368/509 vs ask
380); `මම ඇහුවේ නෑ` (hear 365 vs ask 381); `ඔයා ඇහුවාද` (hear 366 vs ask 382). Find a **fourth**
collision the snapshot missed, or show one of the three is not really a collision. Pay attention
to seeds 597/598 (`ඇහුවා ඇති`, `කතා ඇහුවා`) and 533/103 (*listen* vs *hear*) — I may have waved
those through too fast.

**C3.** The cards at 381 and 382 contradict their own seed sentences, and `S0382L04` is an
`is_new=false` reuse of the seed-366 hear card with zero phrases. I claim **the seed is
canonical** and the card is the defect. Refute either the facts or the canonicality claim — argue
the *card* is right and the *seed English* is what should change.

**C4.** The route rests on the ablative addressee
`-ගෙන්`/`-යෙන්` marking ASK: 7/7 precision, 0/10 in the hear column (§1). But recall is only
7/17 — ten ASK seeds are bare (99, 119, 380, 381, 382, 405, 415, 420, 423, 465). I have already
conceded in the evidence file that "bare ⇒ hear" is **not** corpus-supported. Now press it
properly: is a rule that is precise-but-low-recall **teachable at all**? After the fix, a learner
meeting a bare `ඇහුවා` at seed 405 or 420 still cannot tell which sense is wanted.

Attack the **marker choice itself**, not the scope — the scope question has since been settled by
ruling and moved to **C9**, so do not spend your effort there. What I want from you here: is the
ablative the right cue at all? Is `-ගෙන්` on `අහනවා` doing *disambiguating* work in a Sinhala
speaker's ear, or is it merely compatible with ASK and I have mistaken correlation in a 27-row
sample for a grammatical rule? Seven examples is a small base. Argue that the true disambiguator
in every one of those seven is something else entirely — the `කියලා` complement, the frame, plain
context — and that the ablative is an epiphenomenon riding along with it.

**C5.** The different-word alternative — swapping ASK to `විමසන්න` (seed 99). Kai has clarified
that this is **not** a preferred route: the distinct-word and expanded-context options have
**equal standing**, and he has endorsed the ablative-context route in principle for this case. So
you are no longer arguing that `විමසන්න` *should* have won. Test it as an **option** only: count
its attestations across seeds, legos and phrases (§8 admits I never did), and say whether it
would be *cleaner* in the 380/381/382 frames — it needs no addressee on either side and no
English change beyond the verb. If it is clearly cleaner, say so; the route is endorsed, not
mandated. Note also that seed 99 means the course **already** uses a distinct word for one ASK
card, so a mixed system is the status quo, not a novelty.

**C9. THE MANDATORY COHERENCE TEST — this is now the live question, weight it accordingly.**
Kai's ruling: because the ablative rule is one-directional, "any phrases that can be
misinterpreted by the learner should be removed or fixed", and the shipped state must leave **no
phrase a Sinhala speaker could read as the wrong sense**. Wider scope is authorised if that is
what it takes.

Your job here is to be the learner who gets it wrong. Go through **every** row in the evidence
file — all 28 seeds, all 20 legos, and the phrase families — and for each one where the known side
carries a bare `අහ`/`ඇහු` with no ablative, no `ප්‍රශ්න` question-noun and no `විමස`, state
whether a Sinhala speaker reading only that prompt could land on the wrong English sense. Be
literal and unsympathetic. Flag in particular:

- **`S0030L02`** — card known side is bare `අහන්න` → "to ask", even though **seed 30 itself
  carries `ඔයාගෙන්`**. The card strips the very disambiguator its seed had. This is the same
  defect class as 381/382 and I only noticed it late. Its ~8 phrases (`මට අහන්න ඕනේ` = "I want to
  ask", etc.) are bare too. Confirm or refute.
- **Seed 30's phrases use the DATIVE `ඔයාට`** for the person asked (`මට ඔයාට මොකක් හරි අහන්න ඕනේ`,
  `මම ඔයාට අහන්න උත්සාහ කරනවා`) where the seed uses the **ablative `ඔයාගෙන්`**. Is dative even
  grammatical for the addressee of `අහනවා`? If not, those phrases are independently wrong and
  fixing them to ablative costs **no English change**. Rule on this.
- **Seeds 405 and 420** — `අපි ඇහුවොත් ඕනේද` ("Should we ask if we have to book?") and
  `ඒ අයට අහන්නේ ඕනෑ නෑ` ("They don't need to ask how old he is"). Neither English has an
  addressee, so the ablative cannot be added without inventing one. These are the hard cases.
  Say what you would do, or say plainly that they cannot be made unambiguous without changing the
  seed's meaning — that is a legitimate answer and I need it stated.
- **Seed 423** — is `ප්‍රශ්නේ අහන්නේ` genuinely unambiguous? One can *hear* a question as well as
  *ask* one. Do not wave this through because I did.
- **Seed 119** — `මොකක් හරි අහන්නට පුළුවන්ද?` ("Can I ask you something?"). English already has
  "you", so `ඔයාගෙන්` can be added at zero English cost. Confirm.

Then answer the coherence question directly: **once every ASK row is marked, does "bare ⇒ hear"
become reliable in both directions?** I claim it does — that the 41% recall gap is not a flaw in
the rule but a measure of the work needed to make the rule true, and that closing it converts a
one-directional cue into a bidirectional one at 100%. Attack that. If any ASK row cannot be
marked (405, 420), then the gap never closes, the rule stays one-directional, and I need you to
say so loudly.

**C6.** Alternatives not chosen — argue one beats mine:
(a) the involuntary `ඇහුණා` / `මට ඇහුණා` for HEAR — standard colloquial Sinhala, but **zero**
attestations in this course and it shifts the subject from nominative `මම` to dative `මට`;
(b) the periphrastic `අහලා තියෙනවා` for HEAR — **is** attested (seed 196 / `S0196L02`, "have you
heard"), but it is present-perfect, would drag the English at 364/365/366/368 off simple past,
and would create a *new* ZUT collision with `S0196L02`'s existing mapping;
(c) cheapest of all — fix only the English at 381/382 to match their seeds, change no Sinhala,
and accept that the bare prompt stays ambiguous. Argue (c) is the correct engineering call given
that collisions 2 and 3 are currently *masked*.

**C7.** The proposal adds an addressee the seed English does not have: seed 380 gains "her", 381
and 382 gain "him". Argue that mutating an anchor sentence to rescue a card is backwards, and
check whether `ඔහුගෙන්`/`ඇයගෙන්` — the *pronoun*, not the clitic — is available at those seeds.
The clitic `ගෙන්` is in the contract's `freeClass` (§5) so it needs no introduction, but the
pronoun does; `ඔහු`/`ඇය` debut early per the contract's `3sg` construction (S16), so check
whether the **ablative** forms specifically are attested before 380.

**C8.** The evidence file itself. Its §1 regex `known_text ~ 'ගෙන්'` **missed seed 136**, which
marks its addressee `ඇයෙන්`. I caught that one by hand. Find what else that regex, or my
hand-annotation of the `sense` column, got wrong. If the ablative count is wrong, C4 collapses.

### Method

Quote rows. Assertions with no row behind them are worthless. For each claim return
**REFUTED / SURVIVES / PARTIALLY REFUTED** with the evidence, then end with your single best
argument that this proposal should not be applied as written. If you cannot break a claim, say
SURVIVES and say what forced you — but do not concede cheaply. Say explicitly whether you worked
from the snapshot, a live DB, or both.

Your final message IS the deliverable.
