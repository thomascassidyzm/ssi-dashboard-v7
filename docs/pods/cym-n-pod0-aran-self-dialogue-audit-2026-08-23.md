# Welsh pod-0 (cym_n_for_eng): is Aran cast as both sides of the conversation?

Read-only audit, 2026-08-23. Aran (he/him) reported a strong sense that he has been
assigned both the diner's and the waiter's lines. **He is right, and it is not one
scene — it happens 45 times across 12 speaker pairs, in exactly the pattern the
Spanish pod-0 audit found on 2026-08-08: casting was dealt by a gender/role guess,
not by solving the conversation graph.**

## The one-sentence answer

**Yes — Aran is cast as both sides of a conversation, at least 20 times in real
two-character exchanges (plus 6 more against a non-conversational "Narrator" drill
insert), most visibly in the restaurant scene he named: Waiter and Customer 2 are
both him, in the same scene, ordering food from himself and serving it to himself.**
Catrin has the identical defect on her side, 19 times, in the café/bar/train scenes.

## Numbers, in the same currency as the Spanish pod-0 finding (71→11 collisions, 17→4 pairs)

| | This audit (cym_n_for_eng:pod-0) | Spanish pod-0, pre-fix (2026-08-08) |
|---|---|---|
| Adjacent-turn collisions | **45** | 71 |
| Distinct speaker pairs | **12** | 17 |
| Hypothetical optimal (max-cut on the real conversation graph) | **~13** | 11 |

- 26 of the 45 collisions are on Aran's voice (20 real two-way exchanges + 6 where
  he collides with "Narrator", a non-participant reciting numbers/colours/days
  mid-scene — see caveat below); 19 are on Catrin's voice, all real two-way.
- **Cause: 100% (a) — the conversation graph was never solved for Welsh.** Every
  single collision is a genuine two-character (or narrator-insert) exchange where
  both parties happen to share a voice by construction, not a mislabelled speaker.
  I checked every collision's content against its own seed/scene and found no case
  where a line demonstrably belongs to the *other* character (cause (b), the
  Spanish-audit's `Learner` mislabelling pattern) among the collision set itself.
  See §4 for a *separate*, non-colliding label issue found in the drill scenes.
- **How much of Aran's active recording work is affected: 0 of his 125 queued
  lines, by the evidence available to me** — see the reconciliation in §3, which is
  also the most important and most surprising finding of this audit.

## One sentence Tom can paste to Aran

*"You're right — you are cast as both the diner and the waiter, and seven other
character pairs besides, because the Welsh cast was dealt by a gender guess and
never solved for the actual conversation graph, exactly like the Spanish pod was
before the August 8th fix. But every line already in pod-0 that has this problem
already has your voice recorded against it from August 10th — so whatever your
recordist queue is showing you right now to read, it is very unlikely to be
pod-0 dialogue at all; keep recording, and we'll get you confirmation of what's
actually in the 125 before your next session."*

---

## 1. The headline scene — the restaurant (scene 9)

Aran's specific complaint, confirmed directly. Scene 9 is a two-diner restaurant
scene: `Customer 1` (Catrin) and `Customer 2` (Aran) are dining together;
`Waiter` (Aran) serves them both. `Waiter` and `Customer 2` collide three times:

| order | from → to | shared voice | line |
|---|---|---|---|
| 71→72 | Waiter → Customer 2 | human_aran_cym_n | "Would you like still or sparkling water to start?" → "We'd like one bottle of sparkling water and one bottle of still, please." |
| 78→79 | Customer 2 → Waiter | human_aran_cym_n | "And the risotto for me. With a small green salad to start." → "Of course. And what would you like to drink?" |
| 81→82 | Customer 2 → Waiter | human_aran_cym_n | "A bottle of the house red would be lovely." → "Excellent choice. I'll bring it right over." |

Aran reads the waiter offering water, and — as the same voice — reads the diner
accepting it. This is the exact shape of Aran's report.

## 2. Every collision, enumerated

Full machine-readable version (all 45 rows, both languages, scene/order/voice):
published alongside this report — see the JSON companion,
`docs/pods/cym-n-pod0-aran-self-dialogue-audit-2026-08-23.json`.

### 2a. Aran's voice (human_aran_cym_n) — 20 real two-way collisions

**Scene 8 (bar), Customer 2 ↔ Customer 3** (two customers at the bar ordering from
each other, not the bartender):
- 57→58: "Ga i hanner seidr?" (Can I get a half cider?) → "Ga i weld y rhestr gwin?" (Can I see the wine list?)

**Scene 9 (restaurant), Waiter ↔ Customer 2** — 3 instances, see §1.

**Scene 12 (pharmacy), Customer ↔ Pharmacist** — 8 consecutive instances
(orders 110–118): a full symptom/advice exchange, entirely one voice on both sides.

**Scene 13 (directions), Tourist ↔ Local** — 8 consecutive instances
(orders 120–129): the entire wayfinding exchange, one voice on both sides.

### 2b. Aran's voice vs. "Narrator" — 6 collisions (see caveat)

Six times, Aran's dialogue voice is immediately followed (same scene) by a
`Narrator` line reciting numbers/colours/days/times as a drill insert — e.g.
scene 8 order 67→68: "Do you have any sandwiches? I'd like a cheese sandwich,
please." → "Four. Six. Eight. Blue. Yellow." `Narrator` is cast to Aran too, so
this technically meets the adjacent-turn-collision definition, but it is not a
second character in the conversation — it's a between-beat drill, and I have kept
it in a separate bucket rather than folding it into the headline count so as not
to overstate the conversational-realism defect. Full list: scene 8 (67→68), scene
9 (85→86), scene 10 (95→96), scene 12 (118→119), scene 13 (129→130), scene 14
(139→140).

### 2c. Catrin's voice (human_catrinlliar_cym_n) — 19 real two-way collisions

The identical defect, on her side, not part of Aran's complaint but the same root
cause and worth Tom having in one place:
- **Scene 2 (train), Sarah ↔ Passenger** — 3 instances (orders 5–9).
- **Scene 3 (café), Barista ↔ Sarah** — 5 instances (orders 10–19).
- **Scene 7 (café), Barista ↔ Customer 1** — 5 instances (orders 38–43).
- **Scene 8 (bar), Bartender ↔ Customer 1** — 6 instances (orders 53–66).

---

## 3. The reconciliation against his 125-line queue — the most important finding

I pulled `services/voice-engine/recordist-queue.cjs` (the live source behind
`/r/human_aran_cym_n`) to understand what "125 to do" actually means, because it
does **not** match a naive per-speaker read of pod-0 alone. Three facts, all
verified against the live DB, that change what this audit can honestly claim:

1. **The recordist queue is not pod-0-scoped.** It is built *by language and
   gender* (`cym`, dialect `north`, gender `m`), across every Welsh-north course
   (`cym_n_for_eng` — the only one with any pod rows — and `cym_nnew_for_eng`,
   which has none), collapsed by clip identity, **plus** any `course_audio` row
   anywhere in the Welsh-north courses flagged `rerecord_wanted` with
   `voice_gender: "m"` — a completely separate, non-pod-dialogue content stream.
   I found **93 such flagged rows on `cym_n_for_eng`**, 83 of them `voice_gender:
   m` (Aran) — narration/example-sentence text tied to a 2026-08-19 Kai ruling
   about a Welsh "angry eyes" translation defect, **unrelated to pod-0 dialogue
   entirely**.
2. **Every one of Aran's 87 pod-0 lines already has his voice linked.** Correctly
   canonicalising speaker labels (stripping the "(8 am)"/"(3 pm)" scene-time
   qualifiers the draft-writer appended — `Barista (3 pm)` is `Barista`,
   `Neighbour (8 am)` is `Neighbour`, etc. — via the same `canonicalSpeakerName()`
   the live system uses), Aran is cast on **87 of 231** pod-0 lines, Catrin on
   **144**, and **there are zero genuinely uncast lines** once that normalisation
   is applied. All 87 of those Aran-cast rows carry a `target_audio_id` pointing
   at a `course_audio` row voiced `human_aran_cym_n` or `human_aran_cym_n_2`,
   recorded 2026-08-10 (one as recently as today). **Every row in every
   Aran-side collision in §2 already has his recorded voice against it.**
3. **6 of those 87 rows would still show as "not recorded" to the live queue
   logic**, purely on a text-normalisation mismatch: the pod line's text carries
   `…` pause cues the stored `course_audio.text` doesn't (a known, previously
   logged issue — pod clip text carries a pause cue that raw-text comparison
   over-reports as missing). Two of those six (`SC12-S004`, `SC12-S006`) are
   inside the pharmacy collision, and one (`SC13-S001`) opens the directions
   collision — so if his live queue is showing him these at all, it would be
   re-reading lines he has already voiced, not filling a real gap.

**Conclusion I can defend from the data: Aran's 125-line queue is almost
certainly dominated by the 83 off-pod `rerecord_wanted` narration rows (matching
the "~37 off-pod Aran clips" Tom mentioned, though my count is larger — I cannot
account for the exact gap between 83 and 37, or between (87 pod lines + 83
off-pod ≈ 170 candidates) and 125, without running the live endpoint itself,
which this audit's read-only scope does not include.** That gap is a genuine,
explicit hole in this report, not a number I am willing to paper over: I have not
executed `buildQueue()` against the live DB, only reverse-engineered its inputs.
**What I can say with confidence is that pod-0's dialogue — the content this
entire audit is about — is not what is currently unrecorded**, which is why the
headline advice in the one-sentence-for-Aran box does not tell him to stop.

## 4. A second, separate defect found while checking the brief's warning — not part of Aran's queue

The brief asked me to check whether the Spanish pod's `Learner`-mislabelling
defect (staff-side lines sitting under a single generic learner label) recurred in
Welsh. **It does, on Catrin's side, in the drill scenes 15–22 (79 rows, all
labelled `Learner`, all cast to Catrin).** Sampling them turned up unmistakably
staff-side utterances sitting under the same label as learner-side ones — e.g.
order 160 "No, we only take cash", order 164/166 "Would you like to pay by cash or
card or on the room?", order 211 "It's down there on the left"/order 212 "...on
the right", order 217/219 "Would you like to order some drinks?" / "Did you want
something to drink first?". Because every one of these rows carries the *same*
speaker label throughout (`Learner` never changes), it produces **zero**
adjacent-turn collisions by the metric this audit uses — the speaker never
changes, so it can't trip a same-voice-different-speaker check — and it is
entirely on Catrin's side of the cast, not Aran's. I'm flagging it because it's
the second failure mode the brief asked me to rule in or out, but it does **not**
affect the headline answer to Aran's question and I have made no attempt to size
or fix it.

## 5. Hypothetical optimal recast (read-only comparison only — not run, not applied)

Building the actual conversation graph (weighted by how often each canonical
speaker pair sits adjacent, across the whole pod, independent of current casting)
and running a two-colour max-cut local search over it — the same idea as
`exactColourTwoVoices` in `tools/pod-voice-colour.cjs`, computed by hand rather
than by invoking that tool, since 22 speaker nodes is comfortably tractable by
inspection — the best achievable same-voice-collision count is **~13**, against
the current **45**. That's roughly the same proportional improvement the Spanish
fix achieved (71→11). One candidate partition: Voice A ≈ {Sarah, Passenger,
Customer, Customer 1/2/3, Local, Driver, Guest, Anna, Learner}; Voice B ≈
{Barista, Bartender, Waiter, Tourist, Pharmacist, Friend, James, Neighbour,
Assistant, Receptionist, Narrator}. **I have not run this against gender-realism
tie-breaking or against `tools/pod-voice-colour.cjs` itself**, so treat it as an
order-of-magnitude sanity check, not a final answer.

## 6. What I did not do (settled decisions, per the brief)

No database writes, no TTS, no recast, no unlinking. Gender-mismatch castings
(if the optimal partition above would flip anyone against apparent gender) are
not reported as defects — that's the accepted cost per Tom's 2026-08-08 ruling.

## 7. If a recast looks warranted

**Yes, a recast looks warranted for pod-0**, on the same reasoning as the Spanish
fix: 45 collisions and 12 self-talking pairs is a bigger conversational-realism
cost than the two-voice constraint has to pay, and an ~13-collision partition is
achievable without abandoning cast-by-speaker. I recommend running
`tools/pod-voice-colour.cjs`'s `exactColourTwoVoices` for real (not my by-hand
approximation) against the north-Welsh speaker graph as a separate, approved job
under make-before-break and the pod-migration-protocol — not today, not by me.

---

## What landed, what didn't, what needs Tom

**Landed:** the full collision audit (§1–2), the queue reconciliation with an
honest gap flagged (§3), the second label-defect check (§4), and a hypothetical
recast comparison (§5) — all read-only, all against live data pulled today.

**Failed / incomplete, plainly:** I could not fully reconcile 125 against my
computed candidate total (~170 before dedup/recorded-filtering) without running
the live `buildQueue()` endpoint, which is out of this audit's read-only scope.
That gap is real and I have not guessed past it.

**Needs Tom:** (1) whether to approve a real recast job for pod-0 under
make-before-break, given §5; (2) whether the 79-row `Learner` label-collapse in
§4 is worth a follow-up audit on Catrin's side; (3) whether the exact composition
of Aran's live 125-line queue is worth confirming directly (e.g. by asking Popty
engineering to log what `buildQueue()` actually returns him right now), since
this audit could only reconstruct it from first principles.

---

**Landing line:** commits are on `docs/aran-catrin-recording-verify-2026-08-23`.
Not merged to `main`. Not deployed anywhere — this is a documentation-only change
(two files in `docs/pods/`); there is nothing to deploy and I did not attempt to.
