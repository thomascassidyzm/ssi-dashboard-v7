# Pod 1 speaker attribution — the 11 lines, 22 courses

**2026-08-24.** Text and attribution only. No TTS, no clip generated, deleted or relinked,
no change to any pod's cast.

---

## The answer in one paragraph

**The 11 lines are correctly attributed in all 22 courses. Verified live, 22 of 22.**
4 lines now read `Staff`, 7 read `Interlocutor`, exactly as the 8 August audit proposed,
and `Learner` in scenes 15–21 has fallen 73 → 62 in every course. **It does block the
pending fleet render**, and that is the one thing needing you: `Staff` and `Interlocutor`
exist in no course's cast, so the cast gate now refuses them, and the render sweep stops at
its first step. That block is not a bug to route around — the pod now correctly says two
people are speaking and only one of them has a voice. Un-blocking it means casting those
two names, which is your decision and the same decision you were already going to make
about whether scenes 15–21 get a second voice at all.

---

## What was wrong

On 2026-08-06 an agent building the canonical script read Aran's note about how many
**voices to render** as a ruling about **who is speaking**, and wrote the literal string
`Learner` onto all 73 drill lines of scenes 15–21 — including 11 that only a shop, a hotel
or a waiter could say. It had already inferred a second character for exactly those lines
and then overruled itself, in its own commit message (`9cc3fbc33`):

> *"Consequence applied — 11 lines in scenes 16/17/21 that I had inferred as an alternating
> 'Friend' are now 'Learner'."*

Two days later `pod0-speaker-inference-audit-2026-08-08.md` found the same 11 lines
independently and wrote the fix out line by line. Nobody applied it. It has been live in 22
languages for 16 days. That audit is what has now been applied, verbatim.

---

## The 11 lines

| audit # | line | was | now |
|---:|---|---|---|
| 160 | No, we only take cash. | Learner | **Staff** |
| 164 | Do you want to pay by cash or card or put it on the room? | Learner | **Staff** |
| 166 | Would you like to pay by cash or card or on the room? | Learner | **Staff** |
| 167 | Did you want to pay by cash or card? | Learner | **Staff** |
| 171 | No, it's a little cold today. | Learner | **Interlocutor** |
| 211 | It's down there on the left. | Learner | **Interlocutor** |
| 212 | It's down there on the right. | Learner | **Interlocutor** |
| 214 | Yes, I said it's over there. | Learner | **Interlocutor** |
| 217 | Would you like to order some drinks? | Learner | **Interlocutor** |
| 218 | Do you want to order some drinks first? | Learner | **Interlocutor** |
| 219 | Did you want something to drink first? | Learner | **Interlocutor** |

The commission that reached me compressed all eleven as "Learner → Staff". The audit's own
per-line proposal is 4 / 7, and the audit won. Line 172, *"It's not bad."*, is untouched —
the audit calls it genuinely undecidable and leaves it `Learner` under protest.

The Italian already agreed with the audit before anything moved: line 164 renders as
*"Vuole pagare in contanti, con la carta, o metterlo sul conto della camera?"* — formal
*Lei*, which is a receptionist addressing a guest, not a learner talking about themselves.

---

## Per-course results — 22 of 22

Every course was matched on the known-side **text**, never on scene or sentence number
(the audit numbers these scenes 16/17/21, other repo documents number the same conversation
differently, and the pod was renumbered pod-0 → pod-1 yesterday). Any course not yielding
exactly 11 matches would have been refused and reported. None was.

| course | matched | Staff | Interlocutor | Learner 15–21 | rows | null audio | audit-log rows |
|---|---:|---:|---:|---:|---:|---:|---:|
| ara_eg_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| ara_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| deu_at_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| deu_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| eus_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| fra_ca_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| fra_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| gle_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| hin_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| hrv_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| isl_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| **ita_for_eng** (pilot) | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| jpn_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| kor_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| nld_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| por_br_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| por_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| ron_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| spa_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| spa_mx_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| swe_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |
| zho_for_eng | 11/11 | 4 | 7 | 73 → 62 | 231 | 0 | 11 |

The last column is the reconciliation: `content_audit_log` recorded exactly **242** rows
across the fleet, 11 per course and not one more. Nothing else moved.

Italian ran first as a single-course pilot and was read back clean — all 11 rows on the new
speaker, **both audio links byte-identical to their pre-change values** — before the other
21 were touched.

---

## Safety, checked rather than assumed

**Audio.** Before writing anything, one row was updated inside a transaction that was then
rolled back, and every column compared. The only columns a speaker edit touches are
`speaker` and the trigger-maintained `updated_at`. All seven audio columns
(`target_audio_id`, `known_audio_id`, `sentence_audio_ids`, `sentence_known_audio_ids`,
`takeg_audio_ids`, `explainer_audio_id`, `note_audio_id`) were byte-identical afterwards.
There is **no audio-nulling trigger** on `listening_pod_sentences` — the three triggers on
it are `audit_content_change` (which snapshots the old row, so this is reversible from the
log alone), `touch_course_content_stamp` and `touch_listening_pods_updated_at`.

**Learner progress — the migration protocol does not apply, and here is the check.**
`learner_pod_state` keys on `sentence_id`, which is the row's own id
(`ita_for_eng:pod-1:SC17-S002`, or `<id>:s<k>` for a split unit); and
`pod-migration-protocol.md` matches survivors on the **known text**. This pass changes
neither the row id nor any text, so no slot moves and nothing needs migrating.

**Money.** Nothing was rendered, deleted, relinked or queued. Fleet-wide there are **zero**
NULL audio slots on any of the 22 pods, so no render path has work to do on these rows in
any case.

---

## The block on the pending render — read this before scheduling it

`Staff` and `Interlocutor` are in no course's `listening_pods.speakers` map. So:

- **The cast gate now FAILS.** `checkPodCast` reports them uncast. Measured: 20 of 22
  courses flipped PASS → FAIL. (`spa_for_eng` and `spa_mx_for_eng` were already failing
  beforehand, on pre-existing same-voice pairs — that is not new.)
- **That is a hard refusal, not a warning.** `tools/pods/unlink-off-cast-pod-clips.cjs`
  throws *"refusing to guess which voice they should be in"* on an uncast speaker, and that
  tool is **step 1 of `pod1-render-sweep.cjs`**. The sweep will not start.
- **The script viewer** shows the two lines as red `uncast-character` fails, plus 13 amber
  "cannot check male-female" warnings on the exchanges they now form. It reads honestly:
  two characters speak, one has no voice.

**I have not fixed this, deliberately** — assigning a voice to `Staff` is casting, and
casting is yours.

**The smallest unblocking option, and an honest finding about it.** The obvious cheap move
is to reuse role names that are *already* cast in all 22 courses — `Waiter`, `Local`,
`Receptionist`, `Assistant` all exist with voices. I simulated it. It does **not** unblock:
it clears `uncast` and immediately trips the same-voice rule instead, because
`Receptionist` is cast on the Learner's own voice in every course
(`Learner↔Receptionist on ara, 4 turns`).

That is worth stating plainly, because it is a real structural fact rather than a snag:
**there is no casting that keeps the gate green while keeping scenes 15–21 on one voice.**
The gate encodes "if two characters exchange, they are two voices." So the block resolves
only when you decide the voice question — which is the decision this pass existed to make
possible. My recommendation: cast `Staff` and `Interlocutor` to the opposite voice from the
Learner in each course, which is one mechanical pass across 22 cast maps once you say the
word, and then the render sweep runs. If you would rather keep one voice, the honest route
is to waive the gate for these pods explicitly rather than to un-fix the attribution.

---

## Two flags

**1. `Interlocutor` is a placeholder, and it covers two different roles.** Of the seven
lines it now carries, three are a passer-by giving directions (211, 212, 214), three are a
waiter or host offering drinks (217, 218, 219), and one is a weather reply (171). You may
well prefer real role names — `Local` and `Waiter`, say, both of which already exist and are
already cast in all 22 courses. I applied the audit's strings as written rather than
deciding this myself. It is a one-line follow-up pass on the same tool: change two strings
in the work order and re-run. Worth settling at the same time as the casting question above,
since they are the same conversation.

**2. Line 171, *"No, it's a little cold today."*, is marked "arguable" by the audit itself**
— not plainly wrong like the other ten, just reading better as the other party answering
*"Is the water warm?"*. It has been changed along with the rest. If your ear says it is the
learner's own line, reverting that one is a single row per course and costs nothing.

---

## The flagger rule — applied

Your rule, verbatim from the provenance trace: *"any same-voice finding must be reported as
(course, scene, speaker-pair, voice), never as a bare scene number."*

The cause is that the Welsh audit published its results as a list of scene numbers. Scenes
13 and 14 were on that list **truthfully** — Welsh pod-0 was read by one human, so Tourist
and Local really were one voice. A scene-number list reads as a property of the script, so
it travelled to Italian, where they are Ara and Enzo, and pointed at two scenes that
alternate perfectly.

Changed, and enumerated:

- **`pod-cast-gate.cjs`** — the estate's one definition of "cast correctly". Every
  same-voice pair now carries its course and the scenes it actually occurs in, and the
  failure line is built by one shared `sameVoiceAddress()` helper.
- **`pod-script-view.cjs`** — the tool measured live in the trace. Every finding carries
  `course`; the voice and pair findings also carry structured `speakers`, `voice` and
  `voice_name`, and their prose is prefixed with course and scene.
- **`pod-switchover.cjs`** — its staged-cast line printed a bare *count* of same-voice
  pairs, which is exactly the banned shape. Each pair is now named underneath it.

It reads like this now:

> `ita_for_eng scene 3: 4 consecutive lines on one voice — Ara, female voice (Sarah)`
> `ita_for_eng scene 13: Local↔Tourist both on ara (5 turns)`

**Which findings fire is deliberately unchanged** — this is about how a finding is
reported, not about what counts as one. Confirmed live: still **zero** findings on Italian
scenes 13 and 14.

A side-effect worth knowing, measured on Italian before and after: the attribution fix
**removed the "every spoken line in this scene is one voice" finding from scenes 16, 17 and
21** — your original complaint. It was flagged on all seven of scenes 15–21 before; it now
fires on 15, 18, 19 and 20 only, which the audit says are genuinely all learner-side.

Tests: 62 green across the two changed test files, 2,627 green across `tools/pods`.

---

## What failed

Nothing that reached the data. One process slip, fixed and covered by a test: the
fleet-wide apply ran after the Italian pilot, correctly refused to write Italy's already-
finished rows — but classified them as *drift* and overwrote Italy's applied log with a
refusal record. The tool now distinguishes "already reattributed" (a no-op that leaves the
log alone) from "drifted to an unexpected speaker" (a refusal), a half-applied course is
still treated as drift, and a fleet re-run is now a clean 22/22 no-op. Italy's log was
regenerated from its identical dry-run plan and its rows re-verified against the live
database. No row was written twice and no row was written wrongly.

---

**Landing line.** Two commits are on branch `fix/pod1-speaker-attribution-2026-08-24`
(`be28bc639`, `97934c279`), pushed to origin. **Not merged** — they are awaiting the merge
step. The database changes are already live in all 22 courses and verified there by
read-back; the code changes are not deployed to any running service, and I have not verified
them on a running service.
