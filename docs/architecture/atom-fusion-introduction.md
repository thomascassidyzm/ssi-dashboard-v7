# Atom-Fusion Introduction — design spec (v2)

> **Status:** Design agreed (Tom + Claude, 2026-06-12). Not yet built — gated on
> the upstream persistence step (see *Data contract*) and on the corpus-first
> inventory pass (see *Atom granularity*). This document is the contract between
> the dashboard (Popty) content pipeline and the learning app.
>
> **v2 (2026-06-12)** folds in the decisions taken after the original draft:
> the note taxonomy, *atom = LEGO*, the persisted corpus-first pod-LEGO
> inventory, the target/explainer dedup split, and — following from those —
> app-side assembly with the per-clause explainer "walk" file dissolved into
> inventory clips + `note_audio`. Changes are marked **[v2]**.

## The problem

On first encounter, a whole clause is too big to parse, and the current
explainer is a single baked clip that walks the breakdown as a wall — the
learner can't practise the parts or build them up. Meaning is "explained" but
not *acquired*.

## The model: introduce by atoms, fuse back to the whole

A clause is broken into **atoms** — the smallest pieces that still mean
something alone (usually one word; glue-words glue into a neighbour, e.g.
`na posao` = "to work"; multi-word atoms only for glue or genuine fixed
expressions; a clause/verb phrase is never one atom). See the explainer-atom
rules in the dashboard generator (commit 67e40842).

Stage one then **meets each atom, then fuses them back together**, one join at a
time, until the learner hears the whole clause as one understood chunk. The
"sticking back together" is literal: we shrink the gaps between atoms tier by
tier until the clause plays unbroken.

Stages 2–9 (the existing `algorithm_config.pods` translation + speed ladder) are
unchanged — Stage one *builds* the phrase; later stages *lock it in*.

## Atom granularity — **the atom is the LEGO** [v2]

The hardest part of this system is deciding *where the clause splits*. The
answer is not a single-word heuristic — it is the **LEGO**, the SSi
methodology's atomic recombinable unit of meaning.

- "Smallest unit of meaning" and "LEGO" are the same concept by design. The
  "usually one word" rule in commit 67e40842 was a typology artifact of its
  Croatian examples: in a synthetic language the LEGO often *is* one word
  (`Ideš` = "you're going"); in an analytic language the same unit is several
  words ("are you going"). The language-independent law is **one LEGO**, and
  LEGO size varies by how the language packages meaning.
- The governing rule is therefore **"never larger than one LEGO,"** not "never a
  verb phrase." The glue rules ("na posao" glues) are approximations of *snap to
  the LEGO seam*.

Granularity is a **hierarchy**, mirroring the main course's own structure
(M-type LEGO `components`; the basket cycle Components → LEGO debut → BUILD →
USE):

```
clause  →  LEGOs            ← the default atoms (meet + fuse)
            └ components     ← crack open ONLY when the LEGO is itself new
                 └ job-notes ← sub-word form-glosses, only ever as a note
```

"Meet the atoms, then fuse" *is* "components → LEGO," rendered as audio slices of
one clause instead of separate practice phrases.

### The pods have no shared LEGO inventory — so we build one [v2]

The listening pods are a **separate corpus** from the speaking practice / main
learning flow, so there is no existing LEGO inventory to snap to. We therefore
run a **corpus-first, two-pass** extraction — the course-builder's own
methodology (`course_seeds` → `course_legos`, tiling, ZUT), re-pointed at the
pod sentences:

**Pass 1 — extract the inventory (once per course's pod set).**
Scan *all* pod sentences together (not clause-by-clause) and pull out the
recurring known↔target meaning-units into a canonical **pod-LEGO inventory**:
`molim`, `na posao`, "are you going to"… each defined once for the whole corpus.

**Pass 2 — allocate (per clause).**
Tile each clause against the inventory (longest/best match — the course-builder
"seed must be constructable from its LEGO targets" gate). The **residue** —
words no inventory unit covers — is where the agent earns its keep: glue it to a
neighbour, promote it to a new singleton inventory entry, or mark it
`passthrough` (a name).

Why corpus-first is the unlock, not just a tidy-up:

1. **Consistency.** Per-clause atomisation drifts — the same phrase splits one
   way here, another way there. A corpus inventory atomises every occurrence
   *identically*. This is the single biggest quality lever.
2. **It is the dedup/cache key set.** "Key audio by text" only works if a unit
   is *the same everywhere*. The inventory is what makes that true.
3. **It makes "taught once" real.** Order the inventory by **first appearance
   across the pod sequence**: the first pod where a unit shows up is where it is
   the teachable atom; every later appearance is `passthrough`. Without a corpus
   inventory you cannot even define "first encounter."
4. **It bounds the agent's judgement.** Most of a clause becomes deterministic
   lookup; the model only adjudicates the unmatched residue.

Two disciplines carried over from the course-builder, non-negotiable:

- **ZUT consistency.** One unit → **one canonical known↔target mapping** across
  the whole corpus. If `molim` is "please" in one clause and "I ask" in another,
  the cache key splits *and* the learner is confused. The literal nuance lives in
  a **note** on first encounter (see below), never as a competing gloss.
- **Total tiling.** Every millisecond of clause audio belongs to exactly one
  allocated unit — no gaps, no overlaps — because the fusion ladder inserts a gap
  at *every* seam.

**Cross-pair bonus.** The pods are a different corpus but the *same language
pair*. Where a pod-unit coincides with an existing main-course LEGO, prefer the
course's mapping and share the key — free transfer (the learner recognises a
speaking-course unit in a listening pod) without making pods depend on the
course.

## Data contract (Popty → app)

Per `listening_pod_sentences` row, **two per-clause audio files + one atom map**,
plus the inventory-owned per-atom explainer audio (shared, not per-clause):

| Asset | What | Per-clause? | Sliced? |
|---|---|---|---|
| `target_clause` | whole clause, target language (the natural take) | yes | yes — at atom offsets |
| `known_clause` | whole clause, known language (holistic meaning) | yes | no — played whole |
| `note_audio` | clause-specific clarifying asides only (often absent) | yes | yes — at note offsets |
| *(per-atom explainer)* | "X means …" for each atom | **no — inventory-owned, cited by `lego_key`** | n/a — whole canonical clip |

**The per-clause explainer "walk" file is gone [v2].** Because per-atom explainer
audio is canonical and owned by the inventory (see *dedup split*), the app
assembles meet-the-atoms by citing each atom's inventory explainer clip — it
never plays a baked per-clause walk. The only genuinely clause-specific explainer
audio left is the **notes**, which get their own small `note_audio` file (only
when notes exist). This *tightens* "few files forever" rather than breaking it.

**Atom map** — ordered, one entry per atom. Each entry *references* a pod-LEGO
inventory unit and carries this clause's physical target offsets:

```jsonc
atoms: [
  {
    "lego_key": "na_posao",         // → pod-LEGO inventory (identity + its explainer clip)
    "kind": "atom",                 // atom | passthrough | note   [v2]
    "gloss": "to work",             // known-language text (for the screen)
    "target_start_ms": 0,           // offset into target_clause (this clause)
    "target_end_ms":   620
    // no explainer offsets: the atom cites the inventory's canonical
    // explainer clip for `na_posao`, played whole.   [v2]
  }
]
```

- **Atoms carry only target offsets** — the explainer audio is the inventory's
  whole canonical clip, cited by `lego_key`, not a slice. Notes are the only
  entries with explainer offsets (into `note_audio`).
- **Offsets are the only genuinely new clip-level data.** The extraction pass
  already knows the atom boundaries — this is a *persistence* step, not new
  generation.
- **Identity vs. position split [v2].** The *gloss*, canonical mapping,
  first-encounter status, and the *canonical explainer clip* live in the
  **persisted inventory** (taught once); the *target offsets* live per-sentence
  (physical positions in this clause's audio). This mirrors `course_legos`
  (canonical) vs. practice phrases (instances).

### Entry kinds [v2]

`kind` replaces the original `is_note` boolean, which was overloaded across three
distinct jobs:

| kind | spoken in clause? | fuses? | taught (meet tier)? | notes |
|---|---|---|---|---|
| `atom` | yes | yes | yes | the normal teachable unit |
| `passthrough` | yes | yes | no | names (*Maria*) + units taught in an earlier sentence (first-encounter discipline) |
| `note` | **no** | **no** | yes (plays from `note_audio`) | a clarifying aside; no target audio of its own |

- The **fusion ladder** includes `atom` + `passthrough` (anything with clause
  audio). **Meet-the-atoms** includes `atom` + `note`.

### Notes — clarifying asides over a *combination* of atoms [v2]

A note is for the explanation that is *worth more than a one-word gloss* —
typically a junction quirk, because confusion lives at multi-word granularity,
not at the single word (`azul` = blue is not a teaching problem; *why colour
follows the noun* is). A note:

- has **no target span** and **never enters fusion** — it is pure commentary;
- is **just an offset into the per-clause `note_audio` file** plus a `spans`
  range — the one genuinely clause-specific explainer asset, kept small;
- uses `spans` to do two jobs at once — **highlight** the on-screen atoms it is
  about, **and** place itself in the ladder:
  - `spans` length 1 → a longer explanation of one word; plays in
    meet-the-atoms, after that atom.
  - `spans` length 2+ → a junction/combination note; plays at the **fusion tier
    where those atoms first come together.**

```jsonc
{ "kind": "note",
  "gloss": "in Spanish the colour comes after the noun — 'thing blue'",
  "explainer_start_ms": 4200,    // offset into note_audio (this clause)
  "explainer_end_ms":   7300,
  "spans": [2, 3] }              // no target audio of its own
```

This puts *some* meaning back into the fusion tier — deliberately, and within a
sharp rule:

> Fusion audio stays **target-only**. Fusion may carry **at most one authored
> note per junction, only where a genuine quirk exists** — never a generated
> "these together mean X."

The banned thing was always the *mechanical composite gloss* (combinatorial, and
wrong because known reorders against target). An **authored junction note** is
the opposite: a single curated aside written *because* the naïve word-by-word
mapping misleads. Most clauses carry **zero** notes — they are the sprinkled
exception, which is what stops "we can annotate junctions" from quietly
rebuilding the wall of explanation we are retiring.

### What we deliberately do NOT send

**No per-composite known audio** ("1+2 means…", "1+2+3 means…"). Two reasons:

1. **Pedagogy** — meaning is taught at the *atom tier* (atom target + its
   explainer slice) and capped by the *known clause* at the end. The fusion
   tiers in between are **target-only** — the learner is parsing, not learning
   meaning. So meaning lives at the bottom and the top, never the middle.
2. **Linguistics** — known language reorders against target ("I have fifteen
   years" vs *tengo quince años*), so a target composite has no clean matching
   span in the known clause. Composite glosses would be combinatorial *and*
   wrong.

This cut is part of what keeps the asset set tiny.

### Which audio dedupes — explainer yes, target no [v2]

"Key audio by text" applies to **one** of the two atom audios:

- **Target atom audio is in-context, NOT deduped.** It is sliced from *this*
  clause's own take (the 67e40842 v2 word-boundary slice path), so the meet-tier
  atom sounds like it will when it fuses back, and the fusion seam stays
  invisible. In-context ⇒ per-sentence.
- **Explainer atom audio IS deduped, keyed by text, owned by the inventory.**
  "*molim* means please" is identical everywhere, so it is rendered once and
  reused across every clause the unit appears in.

So "taught once, reused everywhere" means the **teaching** (gloss + explainer
clip) is consistent and cached — not the audio of the word *in this mouth in
this sentence*, which should not be. Caching lands where it is free; it is not
paid where it would jar.

**Consequence — the per-clause explainer file dissolves [v2].** Once the
explainer clip per atom is inventory-owned, and assembly is app-side (it always
was — the atom map exists so the app composes the ladder), there is no per-clause
explainer *walk* to bake: the app cites inventory clips for atoms and plays
`note_audio` for the (rare) clause-specific asides. So the per-clause asset set is
`target_clause` + `known_clause` + optional `note_audio`.

## The Stage-one ladder (app)

Computed from the atom map + a few config knobs. For a clause of N atoms
(example: *Ideš na posao, Maria?* → `[Ideš] [na posao] [Maria]`):

1. **Orientation** — whole `target_clause` once. The destination.
2. **Meet the atoms** — for each teachable atom: target slice (from this clause's
   take) → its explainer clip (cited from the inventory by `lego_key`) →
   (optionally) target slice again. Screen highlights the atom + shows its gloss.
   Lowest cognitive load: one tiny meaning at a time. A second, lighter pass
   fades the scaffold (target + explainer once, no echo). Single-atom notes play
   here (from `note_audio`), after the atom they span.
3. **Fuse** — adjacent atoms join, **target-only**, the inserted gaps shrinking
   each tier: `[Ideš·na posao]` → `[Ideš·na posao·Maria]`. Screen: the chunks
   visually merge. A multi-atom note plays at the tier where its atoms first
   meet. Overlapping windows are allowed — a windowing choice, no extra audio.
4. **Arrive** — the whole `target_clause`, untouched, natural speed. The
   `known_clause` caps the holistic meaning. It parses now.

**Fusion rule [v2]** — **pairwise adjacent merge**, confirmed default. Odd-count
handling is deterministic: leave the odd atom un-fused at the pair tier; at the
next tier it joins the preceding pair to make a three. (Overlapping windows are
an allowed alternative, but the leave-then-join rule is the default.)

Config knobs (live, like `algorithm_config.pods`):
- **fusion rule** — pairwise adjacent merge (self-scales: gentle for short
  phrases, log-ish for long).
- **scaffold fade** — how fast the explainer drops across the meet-the-atoms passes.
- **gap curve** — the silence lengths per fusion tier, ending at 0 (= the take).
  Start *smaller* than instinct suggests (see coarticulation, below).
- **anchoring** — re-hear the whole clause per tier, or only orientation + arrive.

Tiers self-scale to atom count: a 2-atom clause collapses to a few steps; a
6-atom clause stretches. Reuses the **per-chunk row engine** already shipped —
atoms are sub-rows that merge; the gap-and-advance machinery already exists.

## Slicing reliability (the key risk — and why it's smaller than it looks)

The offsets must land on atom boundaries in the *target_clause*. The reassuring
part is **how** we use them — precision is only needed where errors are
cosmetic, and the natural-sounding part needs no cutting at all:

- **Fusion tiers (must sound natural):** we do **not** cut and re-concatenate.
  We play the **continuous, untouched clause take** and *insert shrinking
  silences at the boundary offsets*. A slightly-off offset just lands a pause a
  few ms early/late — imperceptible — and at zero insertion it's the original
  take, bit-for-bit. So the high-stakes part is **immune to slice imprecision.**
  - **Caveat [v2]:** immunity is to *offset placement*, not to the splice. The
    silence insertion still needs the usual **zero-cross snap + micro-fade** at
    the seam or it will click even with a perfect offset.
  - **Coarticulation [v2]:** pulling atoms apart at *wide* early-tier gaps can
    sound slightly unnatural (the tail of one atom was coarticulated toward the
    next); it resolves as gaps shrink to zero. Listen for it first in QA, and
    start the gap curve small.
- **Meet-the-atoms tier (must be intelligible):** here we *do* cut an atom out
  in isolation. But errors are **cosmetic, not semantic** — a clipped edge is
  ugly, not wrong, because meaning is carried by the explainer slice + the
  on-screen gloss, not by perfect audio edges. Apply a few-ms fade + zero-cross
  snap + small pad at cut edges to kill clicks.
- **Glued atoms help** — gluing glue-words into their neighbour means fewer
  internal boundaries, landing on more natural seams than word-level cuts.
- **Final tier is always clean** — it's the whole unsliced take, so the learner
  always ends on perfect audio regardless of slice quality.

**Where the offsets come from** decides upstream effort [v2 — recorded is the
norm]:
- **Recorded clause (the default for pods)** → forced-align once in the Popty
  pipeline (reviewable, correctable), never on-device. Given pods use human cast
  voices, this is the load-bearing path, not a fallback.
- **TTS clause** → only some engines help: **Azure emits word timings** (free,
  exact) but its voices are weaker; the **xAI clone gives no timings at all**.
  So forced-align is the path that always works; TTS timings are a lucky
  shortcut when the clause happens to be Azure-synthesised.

**QA hook** — reuse the existing admin QA Mode so the content team can audition
slices and flag bad boundaries; offsets are just data and can be corrected
without re-recording. The persisted inventory is the right unit to review: fix
one entry and every clause that references it inherits the correction.

## Persisted pod-LEGO inventory [v2]

The inventory is a **persisted, reviewable artifact** (a `pod_legos`-style table,
parallel to `course_legos`), not a throwaway parsing aid — so atomisations can be
audited and corrected without re-deriving the whole corpus.

Per unit it holds the **identity** layer:
- canonical known↔target mapping (ZUT-enforced),
- first-appearance index (→ teachable vs. `passthrough`),
- occurrence count,
- the **canonical explainer audio** (rendered once, reused everywhere),
- optional first-encounter note reference(s).

The per-sentence atom map holds the **position** layer (offsets) and references
units by `lego_key`.

## Retire the monolithic explainer [v2 — decided]

The single baked explainer clip is **retired** once atoms are persisted. The
reason is pedagogical, not merely DRY: there is no value to the learner in
explaining too much in one go, out of context — a wall of explanation is
actively anti-acquisition. The value is parsing *in context*, which the ladder
delivers.

**Transition:** keep the baked clip until the atom-driven version is proven, then
remove it. **Assembly is app-side** — the atom map exists precisely so the app
composes the ladder live (the config knobs stay tunable like
`algorithm_config.pods`). So there is no long-term competing assembler: today's
`pod-explainer-composite.cjs` baked walk is the transitional artifact, removed
once the ladder is proven, and the per-clause explainer walk is not replaced —
it dissolves into inventory explainer clips + `note_audio` (see *dedup split*).

## Resolved decisions

1. **Fusion rule** — pairwise-adjacent; odd-count = leave-then-join. *(v2)*
2. **Offset source** — recorded + forced-align is the contract; TTS timings
   (Azure only) a shortcut; the xAI clone gives none. *(v2)*
3. **Assembly** — app-side, from the atom map. The per-clause explainer walk
   dissolves into inventory clips + `note_audio`. *(v2)*

No open decisions outstanding at the design level. Remaining work is build +
calibration (gap curve, scaffold fade by ear; how cleanly real pod corpora tile
against their extracted inventory).

## Division of labour

- **Popty:** the corpus-first pod-LEGO extraction (Pass 1) + per-clause
  allocation (Pass 2); persist the inventory (identity + canonical per-atom
  explainer audio + first-appearance order) and the per-clause assets
  (`target_clause`, `known_clause`, optional `note_audio`) + per-sentence atom
  map (target offsets + gloss + kind + spans, notes' explainer offsets). Dedupe
  explainer audio by text; keep target slices in-context.
- **App:** the Stage-one introduction ladder (computed from the atom map + the
  config knobs), the slice/insert-gap playback, and the visual atom highlight.
  Stages 2–9 untouched.

## Implementation status (Popty)

First crack at the **cost-free data layer** — no TTS, no audio, no money:

| Piece | File | Status |
|---|---|---|
| Schema: `pod_legos` + `atom_map`/`note_audio_id` | `database/migrations/20260612_pod_legos_and_atom_map.sql` | built |
| Pass 1 fold + Pass 2 atom maps (pure core) | `services/pod-lego-extractor.cjs` | built |
| Unit tests (fold/ZUT/first-encounter/tiling/notes) | `services/pod-lego-extractor.test.cjs` | built, 14 green |
| CLI runner (`node … pod-lego-extractor.cjs <course> [--commit]`) | same file | built, **dry-run default** |

The extractor reuses each sentence's existing `explainer_decomposition` (the
chunk pairs the explainer generator already produces) as Pass-1 raw material, so
it spends nothing. It delivers the consistency wins that are safe to automate —
**canonical gloss (ZUT-resolved), first-encounter ordering, name detection,
total-tiling validation** — and flags the rest (`needs_review`) for the QA Mode.

**Deliberately deferred (cost-gated / language-aware):**
- **Cross-occurrence re-tiling** — the current build keeps each clause's own
  segmentation and flags *drift* rather than forcing a greedy re-tile (which
  needs language-aware tokenisation; whitespace splitting is wrong for CJK).
- **Audio** — the inventory's canonical per-atom explainer clips, per-clause
  `note_audio`, and forced-aligned target offsets are a separate pass requiring
  TTS spend + sign-off. Atom/note offsets are left `null`.

---

*Last updated: 2026-06-12 (v2 + Popty data-layer first crack)*
