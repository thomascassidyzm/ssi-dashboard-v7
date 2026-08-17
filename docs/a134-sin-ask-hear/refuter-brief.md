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
listed in the file's §6 — especially the uncounted `විමසන්න` frequency.

Course orientation: `eng_for_sin` teaches English TO Sinhala speakers. **Sinhala is the known /
prompt side; English is what the learner produces.** The ambiguity is in the prompt.

### Claims under test

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

**C4. THE LOAD-BEARING CLAIM — attack this hardest.** The route rests on the ablative addressee
`-ගෙන්`/`-යෙන්` marking ASK: 7/7 precision, 0/10 in the hear column (§1). But recall is only
7/17 — ten ASK seeds are bare (99, 119, 380, 381, 382, 405, 415, 420, 423, 465). I have already
conceded in the evidence file that "bare ⇒ hear" is **not** corpus-supported. Now press it
properly: is a rule that is precise-but-low-recall **teachable at all**? After the fix, a learner
meeting a bare `ඇහුවා` at seed 405 or 420 still cannot tell which sense is wanted. Argue that
marking only three cards produces an **incoherent half-system** that is worse than the honest
status quo, and that the only defensible versions are *mark all 17 ASK seeds* or *do something
else entirely*. Cost that out from the phrase counts in §4.

**C5.** I rejected the different-word route — swapping ASK to `විමසන්න` (seed 99) — as a single
attestation, in a reflexive frame ("ask yourself"), in a more formal register. **Argue FOR it.**
Note that Kai's own procedure named this the *preferred* route, so rejecting it needs to be
earned, not assumed. §6 admits its frequency was never counted; if you have a connection, count
it. If `විමසනවා` is natural in the 380/381/382 frames, it beats my route outright, because it
needs no addressee added to either side and no English change at all beyond the verb.

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
