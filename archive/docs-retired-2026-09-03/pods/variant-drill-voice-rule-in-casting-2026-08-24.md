# The variant-drill voice rule, now enforced in casting

*2026-08-24. Commissioned by Tom, in five words: "Should just be what happens in casting, right?"*

**Landed: one rule module, three tools wired, one release-gate check, 31 tests green, a
read-only census of all 22 live pod-1 courses. No TTS. No database writes. Nothing rendered,
nothing deleted, £0.**

---

## 1. The rule, in Tom's words

From the Italian Pod 1 recast thread, 2026-08-24:

> "It makes sense in the context of the extra phrases for the same voice to give alternative
> responses etc."

and then, on being told it had been written down as doctrine:

> "That's just common sense though. Should just be what happens in casting, right?"

Stated as the rule:

- **Variant drills belong on ONE voice.** Several alternative phrasings, or several alternative
  answers to the same question, are a list when one person reads them and audible nonsense when
  two people do — a character contradicting itself.
- **A line earns the SECOND voice only when it is a genuine, single, uncontested answer to a
  real question.**
- **Scenes that are entirely learner practice have no second speaker at all.** Italian 18 and 19
  are ten consecutive learner lines by design. One voice there is correct — Aran's chunk ruling
  of 2026-08-06 — and nothing built here may flag it as a defect.

The failure it prevents, live in Italian scene 21 until Tom's rollback:

> **Learner:** Is there a toilet here?
> **Voice B:** It's down there on the left.
> **Voice B:** It's down there on the right.
> **Learner:** Can you say that again?
> **Voice B:** Yes, I said it's over there.

One person, three incompatible directions, the last matching neither.

## 2. Why no code could see it

The cast is **per role**. The ruling is **per line**. Nothing in `listening_pods.speakers` can
say "this role, but only on these lines" — so after Tom put seven lines back on the learner
voice, the pod's own cast still disagreed with the decision, and `checkPodCast` went green
because **both voices are legitimately in the cast**. That is the whole trap: this is not an
off-cast clip. Every clip was on-cast, every gate passed, and eleven lines read as nonsense.

Until today the rule existed only as prose, in two memory files and three docs. There was no
code. `rerender-off-role-pod-turns.cjs`, run dry against `ita_for_eng:pod-1` an hour after the
ruling, reported Tom's own seven reverted turns — 14 slots — as work to do, and `--apply`
would have re-rendered them onto the second voice, undone the ruling, and charged for it.

## 3. How the detector operationalises it

`tools/pods/variant-run.cjs` — pure, no DB, no I/O. **This is the ONE place the rule is
expressed**; nothing else reimplements it, on the same discipline `pod-cast-gate.cjs` states
for itself.

A **variant run** is an **unanswered repetition**. A pair of rows is a variant link when all
four hold:

1. **ADJACENT in script order.** Anything at all in between is the answer that makes the earlier
   line a real exchange.
2. **SAME SCENE.**
3. **SAME SPEAKER** (canonical, paren groups stripped).
4. **The two known-side texts rephrase the same beat** — Dice coefficient over lightly-stemmed
   tokens, at or above 0.50.

Links chain, so 21.11↔21.12↔21.13 is one run of three. Every row in a run of 2+ is
**variant-locked**. A row in no run is second-voice-eligible.

**Why it is not "has a paraphrase sibling somewhere in the scene."** Italian 17.2 keeps the
second voice even though 17.4 and 17.5 are rephrasings of it, because 17.3 — the learner
answering — sits in between. 17.2 is a real exchange; 17.4/17.5 are the desk asking again after
it was already answered. Adjacency is load-bearing, not similarity at a distance.

**Why conditions 1–3 alone are not enough — measured, not assumed.** Run length on its own
flags the wrong things. Live `ita_for_eng:pod-1` has eleven maximal same-speaker non-Learner
runs of length 2+, and only three are Tom's. The other eight are ordinary drama: the Barista
saying "No, we've only got drinks." then "Yes, would you like the menu?"; the Waiter welcoming
you then asking about water. A character taking two turns is drama, not a casting fault.

**Why condition 4 reads the known (English) side, said out loud.** Similarity is a text measure
and the target track is 22 languages. The known track of every live `<course>:pod-1` is English
— all 22 are `*_for_eng` — and the eleven reattributed lines were matched fleet-wide by
known-side text in the first place. Judging on the known side is what makes **one verdict
correct for all 22 courses at once**. Conditions 1–3, which do most of the work, are purely
structural and language-blind.

**The measured margin**, all adjacent same-scene same-speaker pairs on the live Italian pod:

| | Dice range |
|---|---|
| Tom's seven locked lines | **0.67 – 0.83** (lowest: 17.4→17.5) |
| genuine non-Learner continuations | **0.00 – 0.14** (highest: Local 13.4→13.5) |

A gap of 0.53 with nothing in it. The floor sits at **0.50** — *below* the midpoint on purpose,
because the two errors do not cost the same. A false positive costs a missed improvement: a
line keeps the single voice it has had for two years, and can be freed later for nothing. A
false negative ships a character contradicting itself to learners. **Undecidable pairs lock
too** — if a pair has no known-side text, it is treated as a variant link and flagged
`undecidable`, because locking is the free direction.

## 4. The fixture result — 4 / 7, exactly

The acceptance test is Tom's per-line ruling reproduced from the script alone, with **no
Italian special case anywhere in the detector**:

| | line | text | verdict |
|---|---|---|---|
| **KEEP** | 16.9 | "No, we only take cash." | second-voice-eligible |
| **KEEP** | 17.2 | "Do you want to pay by cash or card or put it on the room?" | second-voice-eligible |
| **KEEP** | 17.9 | "No, it's a little cold today." | second-voice-eligible |
| **KEEP** | 21.8 | "Yes, I said it's over there." | second-voice-eligible |
| **LOCK** | 17.4, 17.5 | the desk asking how you're paying, twice more | run `s17/4-5` |
| **LOCK** | 21.5, 21.6 | left, then right, to the same question | run `s21/5-6` |
| **LOCK** | 21.11, 21.12, 21.13 | the waiter offering drinks three times | run `s21/11-13` |

**Exactly four eligible, exactly seven locked.** Confirmed twice: `tools/pods/variant-run.test.cjs`
(17/17 green, carrying the eleven lines plus scenes 18 and 19 asserting zero flags, plus the
four genuine dialogue continuations that a naive rule would flag), and again against the live
231-row script read from the database.

No exception list was needed. Nothing in the module names Italian, a course, a scene or a line.

## 5. Every call site — wired, or exempt and why

| tool | what it does | disposition |
|---|---|---|
| **`rerender-off-role-pod-turns.cjs`** | renders replacements and moves live audio links | **WIRED, hard.** Variant-locked rows are measured, printed with the reason, and excluded from the render scope by default. Live dry run goes **14 slots → 0 candidates**. `--include-variant-runs` overrides and prints a warning naming the ruling. Both dry-run and applied logs carry the excluded set. |
| **`unlink-off-cast-pod-clips.cjs`** | NULLs links so `/generate-pods` refills them | **WIRED, hard.** Unlinking a variant-drill line is exactly how the contradiction would be built on the other 21 courses — generate refills on the *role's* cast voice. Excluded by default, same escape hatch. The rule is computed over the **full script**, not the tool's own inner-joined row set: a row with no clip is absent from that join, and judging adjacency on it would weld two non-adjacent lines into a false run. |
| **`pod1-two-voice-cast.cjs`** | writes the per-role cast map | **WIRED, reporting.** A per-role cast physically cannot express a per-line exception, so it cannot enforce the rule by writing a different cast. It now refuses to be silent: it names every line the cast it is about to write would place on the second voice while variant-locked, and says which paths exclude them. Non-blocking — the cast is not wrong, only mute. |
| **`verify-pod-audio-fidelity.cjs`** | the permanent release gate | **WIRED, Leg 3.** See §6. |
| **`pod1-percall-recast.cjs`** | the per-conversation solver | **EXEMPT, deliberately.** It solves *which role gets which voice* to eliminate same-voice exchanges, on the edge definition `pod-cast-gate.cjs` re-uses. It is per-role like the cast tool, so it has the same expressive gap and the same answer; wiring a second warning here would duplicate the cast tool's without adding a constraint. Its output is written by `pod1-two-voice-cast.cjs`'s path, which does warn. |
| **`pod-cast-gate.cjs`** | Tom's two-number cast measurement | **EXEMPT, deliberately.** Its verdict is Tom's acceptance criterion of 2026-08-23 (zero same-voice exchange pairs, exactly two voices). Widening what that gate calls a failure would drift the flip path and the recast path apart on what "cast" means — the exact thing its own header forbids. The new check went into the release gate instead. |
| **`splice-sentence-clips.cjs`** | re-cuts split arrays | **EXEMPT.** It re-cuts an existing take; the voice comes from the take, not from the cast, so it cannot move a line between voices. |
| `rescue-wrong-language-clips.cjs`, `rescue-child-voice-clips.cjs`, `a108/a136-nld-noor-drop.cjs` | one-off rescues of wrong-language / child-voice / named-voice defects | **EXEMPT.** Each targets a named clip defect by identity, not a role's cast assignment. None can move a variant line onto the second voice. |
| `services/phases/phase8-audio-v13.cjs` | `known_audio_id` writes | **EXEMPT.** That write is on `course_practice_phrases` component rows, not `listening_pod_sentences`. Different table. |
| `pod-recast.cjs`, `clone-pod.cjs`, `revert-cym-n-pod0-move-*.cjs` | cast copies and reverts | **EXEMPT.** They carry a cast across or restore a snapshot; they originate no new role→voice decision. |

**One residual hole, named honestly.** `/generate-pods` (phase 8) fills a **NULL** slot on the
voice the cast gives the row's role. A pod staged from scratch with empty slots would therefore
still render a variant line onto the second voice — the unlink path that used to create those
NULLs is now closed, but a fresh stage is not. Closing it means teaching a money-spending
service to render a line on a voice its own cast does not name for that role, which is a
behaviour change in the render path and not something to slip in unannounced. See §8.

## 6. The release gate

`verify-pod-audio-fidelity.cjs` — described in its own header as the permanent release gate for
pod work — now reports **variant runs split across two voices**, per track, naming the rows and
quoting the contradiction in plain English.

It is **counted separately and does not flip the verdict**, for two reasons and the second is
the load-bearing one. First, it is a content-attribution defect, not a broken clip: nothing is
missing, mis-served or off-cast, and the output says so explicitly to keep it distinct from the
existing off-cast class. Second, this is a gate people run to decide whether pod work is safe to
ship, and quietly widening what FAIL means would retro-fail work that is fine today. The census
(§7) says the expected count is **zero**, so a non-zero one is news rather than noise.
`--variant-runs-blocking` scores it for anyone who wants it in a pipeline.

A variant run wholly on ONE voice is **never** reported. That is the correct state, not a defect.

**Verified live, both directions:**

- `verify-pod-audio-fidelity.cjs ita_for_eng` → 231 rows, 1,109 checks, **0 scored failures, 0
  variant splits**, verdict `REPAIRED+VERIFIED`. Unchanged from before this work.
- **Negative control**: put 21.6 back on the second voice, as the pre-revert state had it, and
  the check fires — `s21/5-6 Interlocutor: ara[21.5] / x7avnu1k[21.6]`. It is not silent by
  accident.

## 7. The fleet census — read-only, no writes

All 22 live `<course>:pod-1` courses, both tracks, judged on the voice each row's whole-turn
link actually resolves to.

| | |
|---|---|
| courses censused | **22 of 22, no gaps** |
| variant runs found | **462** (21 per course — the drill scripts are structurally identical English across the fleet) |
| runs split across two voices, target track | **0** |
| runs split across two voices, known track | **0** |
| runs wholly single-voiced — the correct state | **462** |
| free-rollback work outstanding | **none, anywhere** |

**The zero is real, not an artefact.** Two things were checked before it was believed: every one
of the 462 runs resolved a voice on **both** tracks — no unresolved clips fleet-wide, so nothing
is hiding behind a null — and every course genuinely uses **two distinct voices** across the
drill scenes 15–21, so the result is not "one voice was ever used". `ita_for_eng` came out clean
on both tracks, matching Tom's rollback line for line, which is what proved the measurement
before the fleet number was trusted.

**So the Italian defect was isolated to Italian.** No other course currently carries the
contradiction, and no repair work is owed anywhere. Full per-course JSON:
`variant-run-fleet-census.json` in the census worker's scratch directory (job #368).

## 8. What is still Tom's

Everything below was deliberately **not** taken.

- **The self-describing fix.** Splitting the roles in the pod script into `Staff (variant)` /
  `Interlocutor (variant)`, cast to the learner voice, is the only option that makes the data
  state the decision instead of tooling working around it. It is a **text change** and therefore
  engages the standing content-change migration protocol. Not taken, per the brief and per the
  memory record. **Recommendation: not yet** — the enforcement now holds without it, and it
  costs 66 writes and a migration across 22 live courses to buy tidiness rather than safety.
- **The `/generate-pods` hole** (§5). A freshly staged pod with NULL slots would still render
  variant lines onto the second voice. **Recommendation: leave it** — the unlink path that
  created those NULLs is closed, the census says no live pod is exposed, and teaching the render
  service to override its own cast is a bigger change than the risk it removes.

Both are one-word answerable. Neither blocks anything.

## 9. Reproduce

```
node tools/pods/variant-run.test.cjs                                 # 17/17 green
node tools/pods/rerender-off-role-pod-turns.test.cjs                 # 14/14 green
node tools/pods/rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1   # dry, 0 candidates
node tools/pods/verify-pod-audio-fidelity.cjs ita_for_eng            # PASS, 0 splits
```

## 10. Taste-safe defaults leaned on, each flagged

- **Ambiguity locks.** The similarity floor sits below the measured midpoint, and an
  uncomparable pair is treated as a variant link. Single-voice is the free, reversible state.
- **The gate does not flip the verdict.** A new, separately-counted defect class rather than a
  silently widened release gate (§6), with the fleet count stated so nobody has to guess.
- **`pod-cast-gate.cjs` was left alone** rather than extended, so Tom's two-number acceptance
  criterion means today what it meant on 2026-08-23.
- **Reporting over enforcing where the schema cannot express the rule.** The cast tools warn;
  only the per-line writers block.
