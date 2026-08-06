# Spanish padded phrases — rewritten

*spa_for_eng only. 2026-08-06. No TTS was run. No audio was deleted.*

Deborah's finding — practice phrases that are just the round's LEGO with a stock adverbial bolted on ("here", "yesterday", "before", "for everyone"), some of them ungrammatical — is fixed for 349 rows. **1,041 audio clips now need generating**, and that spend needs your approval separately.

---

## The numbers

| | rows |
|---|---|
| Padded rows measured at the start (CONFIRMED) | **394** |
| …of those, `phrase_role = use` | 291 |
| …of those, `phrase_role = build` | 103 |
| **Rows rewritten** | **349** |
| Padded rows remaining now | **34** |
| **Clips needing generation** | **1,041** |

The clip count is 349 English + 346 Spanish voice 1 + 346 Spanish voice 2, read back from the live database after the writes — not an estimate. (Three rows kept an existing Spanish clip because the new text already had one.)

**The Use role was the bulk of this**, exactly as briefed: 259 of the 349 rewrites are Use rows. A build-only fix would have left three quarters of the defect in place.

---

## Before and after

Deborah's own examples. The English side is enough to judge these:

| | |
|---|---|
| **was** | I am feeling sad yesterday |
| **now** | I am feeling sad, so it's a good idea to try and breathe slowly |
| **was** | whenever you feel here |
| **now** | whenever you feel alone around here |
| **was** | small here |
| **now** | the small door is open |
| **was** | in the mud yesterday |
| **now** | I found the dog alone in the mud |
| **was** | was absolutely right before |
| **now** | whoever said that it would be difficult was absolutely right |
| **was** | because he has been playing for us |
| **now** | I'm afraid that the dog is dirty and wet because he has been playing |
| **was** | I'm afraid that here |
| **now** | I'm afraid that I don't want it |
| **was** | I don't mind if here |
| **now** | I don't mind if it's a bit late |
| **was** | nowhere anywhere |
| **now** | to go nowhere |

Every one of the 349 changes, old and new text in both languages, is recorded in `docs/spa-padding-rewrites-2026-08-06.json`.

---

## How the prerequisite constraint was enforced

A replacement that uses vocabulary the learner hasn't met yet is a worse defect than the padding. This was enforced **mechanically, not by asking nicely**:

For every round, I built the cumulative set of every English and every Spanish word introduced by any LEGO up to and including that round. Every proposed replacement had each of its words checked against that set, and anything containing an unseen word was rejected and sent back to be rewritten.

**The gate was calibrated before it was trusted**: run against the course's existing, non-padded phrases in R1000–1200, 95.7% pass on the English side and 98.9% on the Spanish side. So the rule matches how the course actually behaves, and isn't just an arbitrary filter.

Final check across all 349 rewrites: **0 prerequisite leaks, 0 duplicate phrases, 0 ZUT violations** (no known-side text pointing at two different Spanish forms), 0 rows still matching the padding pattern, and every row still contains its own LEGO.

---

## Quality control — and the thing worth knowing

The first draft was **not** good enough. A separate native-Spanish adversarial proofreading pass, told to assume the replacements were flawed, rejected **182 of 367** — and it was right to. Real errors it caught:

- `antes pensaba que **es** un coche rápido` — needs *era*
- `lo menos que **podría** hacer **era**` — conditional glued to a past tense
- "I am feeling sad because he has been playing without the car" — two clauses with no sensible relation
- "because I have got to be inside the entrance **before we moved**" — present obligation, past clause

Rejected rows were regenerated against the specific criticism and re-reviewed, five times over. Pass rate went 185 → 259 → 298 → 316 → 326 → 332, then flattened.

**I stopped there rather than force the rest.** Shipping Spanish that a proofreader had already rejected would have replaced one defect with a subtler one.

---

## What I did NOT fix — explicit gaps

**34 padded rows remain live.** They break down as:

- **35 rows** whose replacements never passed the proofreader after five repair cycles. Left as they were.
- **8 rows** where no replacement was possible without introducing unmet vocabulary. The prerequisite rule won; these need either a later course position or new material.
- **3 rows** at R256 ("Why can't I remember what you said today/this morning/yesterday?") that were never adjudicated — a tooling drop-out, not a judgement. They are plausibly fine, but I did not verify them and am not claiming they are.
- **16 rows** deliberately spared as false positives (see below).

(These overlap with the 34 count because fixing a round's other rows moves its survivors out of the CONFIRMED band into PLAUSIBLE.)

**One rewrite I'd flag.** `you're all doing very well` / `estáis haciendo muy bien` was flagged only because the Spanish was missing *lo*. The rewrite changed the phrase to "what you're all doing" rather than just adding the missing word. Grammatical, but a heavier edit than the fault required.

---

## The false-positive question — read this bit

I ran an independent audit of my own adjudication. It reports that **~30% of the rows I rewrote (95% CI 23–38%) were not *linguistically* broken** — phrases like "I'd like to read my book tomorrow" or "a table for four tonight", which are perfectly natural.

That number is real and I'm not hiding it, but it needs its criterion stated: the auditor judged "is this sentence *wrong*?" The brief's defect, and Deborah's, is broader — the LEGO with a trailing adverbial *instead of exercising varied material the learner already knows*. "I'd like to read my book tomorrow" is not wrong; in a round where five of six phrases are the same stem plus a different time word, it is still the defect.

**What this costs, concretely:** those rows were replaced by phrases that passed grammar review, the prerequisite gate, and the duplicate/ZUT checks. So nothing was degraded — a fine phrase became a more varied one. The actual cost is that a share of the 1,041 clips is being regenerated for rows that were acceptable. If you'd rather not pay that, the revert below is row-level and lossless.

The audit also found **18 genuinely broken rows my round-based rule had spared** because they were alone in their round — "I'm afraid that here", "I don't mind if here", "nowhere anywhere", `¿Quién **era** allí?` (needs *estaba*). **I fixed those 18 plus 3 more**, including Deborah's own "small here", in a second pass. So the audit improved the result rather than just grading it.

Full audit: `scripts/spa-padding/fp-audit.md`.

---

## Rollback

Every changed row's original English and Spanish is recorded. To revert all 349:

```
node scripts/spa-padding/revert.cjs --apply
```

This is lossless. **No audio was deleted** — restoring the old text makes the trigger relink the original clips automatically.

---

## The gate that should have caught this

Not touched in this job, as instructed. It needs two changes:

1. **Cover the Use role.** The anti-template gate runs on Build baskets only (`services/course-builder/routes/seed-complete.cjs:1218`), which is why 291 of the 394 rows sat in a role nothing was watching.
2. **Drop the comma requirement.** Its filler-tag regex requires a comma before the tag, so "small yesterday" passes even in the role it does watch.

A worked, implementable spec — including which rule to use, the false-positive risk of each option, whether it should reject or warn, and a test plan naming real rows it must and must not flag — is in `docs/spa-padding-gate-spec-2026-08-06.md`.

Worth noting the forcing function is still live: `phrase-structure.cjs` requires 5 Use phrases per LEGO. When prior vocabulary is thin, bolting on an adverbial is the cheapest way to satisfy that. **The other 73 affected courses have not been touched** — Spanish is 6th worst; `eng_for_zho` is at 17%.

---

## Next step for you

Approve (or don't) the generation of **1,041 clips** for spa_for_eng. Nothing was queued and no TTS was run.
