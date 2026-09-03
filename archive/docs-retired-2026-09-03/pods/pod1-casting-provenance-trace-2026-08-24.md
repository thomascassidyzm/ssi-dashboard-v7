# Pod 1 casting provenance — who cast it, and why scene 17 is one voice

**Read-only trace, 2026-08-24.** No content changed, no cast changed, no character
reassigned, no audio rendered, no TTS run. This morning's Italian Pod 1 split-array
repair (`ab0ee8ac3`, `129ea775d`) was treated as out of bounds and was not touched.

Commissioned by Tom: *"I do NOT understand the casting. Which model did this? You would
have to be a buffoon to think the same voice all the way through would work here."*

---

## The answer in one paragraph

Nobody cast scene 17 badly. **Scene 17's single speaker is not a casting decision at all —
it is a TEXT decision, made on 2026-08-06 and written down at the time.** An agent building
the canonical English script had already inferred a second character for exactly the lines
Tom is angry about, and then deliberately deleted that inference and collapsed all 73 drill
lines to the literal speaker string `Learner`, because it read Aran's voicing note — *"beyond
that it seemed faster to do them as chunks, without scene-based to and fro… kind of fits with
what I've been saying about not needing multiple voices"* — as a ruling about **who the
speaker is**, when Aran was talking about **how many voices to render**. The casting pipeline
downstream is innocent: it faithfully gave one voice to one speaker string. Two days later a
different audit found the same 11 lines again and proposed fixing them; that proposal was
never applied, and the wrong attribution is now published in 22 languages.

---

## Q1. Which model, which pipeline

### The pipeline, and the dates — fully recorded

| When | What | Where |
|---|---|---|
| **2026-08-06 10:53Z** | Aran's own hand-written 22-scene English script seeded into `canonical_pod_scenarios` as `pod_slug='pod-0'`, 231 rows, via `tools/seed-canonical-pods.cjs` | commits `c65d4d1fe` (10:48Z), `9cc3fbc33` (10:55Z) |
| 2026-08-06 → 2026-08-11 | Flexed per course into `listening_pod_sentences`; `source_file` stamped `generated:canonical` | `f285483a6`, `23d1bf0d0` |
| 2026-08-22 | Per-course pods staged and cast on approved two-voice pairs (Italian: Enzo m / Ara f) | `docs/pods/ita-pod-1-cutover-record-2026-08-22.md` |
| 2026-08-22 → 08-23 | Tom's 1-based ruling: pod slugs renumbered, old pod-0 retired | `9c7f6f2f7` |
| **2026-08-24 08:27–08:33Z** | 21 courses flipped live at slug `pod-1` | `92b445cd7` |

**The pod learners now call "Pod 1" is Aran's pod-0 script renumbered**, not a new pod. Every
one of the 22 live `pod-1` pods still carries `metadata.sections[0] = {"label":"Pod 0","title":"A Day of Greetings…"}`.

### Tom's structural fact, sharpened

`docs/pods/pod1-scene-review.md` (14 scenes, all dialogues, `301c0e120`, 2026-07-14) is **not**
the approval pack for scenes 1–14 of the live pod. It is the review pack for a **completely
different, never-approved pod** — the real canonical `pod-1`, a 16-scene slate of two-hander
dialogues with English character names (Grace/Paul, Amy/Joe, Sam/Ana…), seeded 2026-07-16 and
still sitting in `canonical_pod_scenarios` unbuilt in any language. Its own header says
*"Status: DRAFT, pending review… Nothing downstream renders until this set is approved."*
It never was. So scenes 15–21 did not "come from somewhere other than the approved pack" —
**there is no approved pack in play at all.** The live pod is Aran's pod-0, start to finish.

### Which model — the honest answer

**At the data level: UNRECORDED.** `canonical_pod_scenarios` has **zero rows** in
`content_audit_log` — the table where the speaker strings were invented has no audit coverage
whatsoever. Neither `canonical_pod_scenarios` nor `listening_pods` has any model, agent or
author column. Nothing in the database records who or what decided that scene 17 has one
speaker.

**At the commit level: recorded, with a caveat.** Both commits that created the speaker labels
carry the trailer `Co-Authored-By: Claude Opus 5`. That is a real record and it is the only
one there is. The caveat, stated plainly so it is not over-read: this is the harness's standard
trailer, present on 232 of the last 300 commits in this repo (26 more say Claude Sonnet 5). It
names the model that ran the session that made the commit. It is not a purpose-built provenance
record of the decision, and no decision-level attribution exists.

---

## Q2. Why scene 17 is a single-voice phrase list

### The likely explanation is WRONG — tested and refuted

The hypothesis was a phrase-harvesting step that appended course phrases as a flat list under
one default speaker. **It did not happen.** Of the 73 drill lines in scenes 15–21, exactly
**1 of 73** matches any English text in the `ita_for_eng` course corpus (`course_practice_phrases`
+ `course_seeds`, normalised exact match). The text is not harvested. It is Aran's own writing,
pasted in one file, archived verbatim as `docs/pods/pod0-aran-original-2026-08-06.txt` — and
`SCENE 17: Extra phrases` appears in that file at line 218 exactly as it ships.

### What actually happened — the step, with the code and the words

Commit `9cc3fbc33`, 2026-08-06 10:55Z, in its own message:

> *"Consequence applied — **11 lines in scenes 16/17/21 that I had inferred as an alternating
> 'Friend' are now 'Learner'.** Scenes 15-21 are Learner throughout bar the drill tails."*

The agent had **already got it right**, then reverted itself. The trigger was a voicing note
from Aran, quoted verbatim in the canonical header (`docs/pods/pod0-english-canonical.md`):

> *"Did some interleaving in the first few scenes and then beyond that it seemed faster to do
> them as chunks, without scene-based to and fro for everything, they'll work fine like that
> (also kind of fits with what I've been saying about not needing multiple voices)."*

And the agent's own gloss of it, in the same header, naming Tom's exact lines:

> *"**Scenes 15-21, the Extra phrases, are CHUNKS.** They are a run of useful phrases, not a
> conversation… Every line is attributed to `Learner`. **Some read as a second party's reply
> ("No, we only take cash.", "It's down there on the left.")** — those are phrases in the chunk,
> and no alternating speaker has been forced onto them."*

**The one plain sentence:** an agent turned Aran's note about how many *voices to render* into
a decision about who the *speaker is*, wrote the literal string `Learner` onto all 73 drill
lines including 11 that only a shop, hotel or waiter could say, and because `speaker` is the
column the casting gate, the recast tool and the published script view all read, one authoring
shortcut about audio economy is now published as authorship in 22 languages.

### It was caught 16 days ago and never fixed

`docs/pods/pod0-speaker-inference-audit-2026-08-08.md` — two days later — found it
independently and named the same lines:

> *"Scenes 15-21 hold 80 rows… The draft run labelled all 73 drill lines `Learner`. **61 are
> genuinely learner-side, 11 are the other side of an exchange and cannot be the learner**, and
> 1 is undecidable."*

Its scene-17 rows are precisely Tom's complaint:

| # | Line | Audit verdict |
|---|---|---|
| 164 | Do you want to pay by cash or card or put it on the room? | → **Staff** |
| 166 | Would you like to pay by cash or card or on the room? | → **Staff** |
| 167 | Did you want to pay by cash or card? | → **Staff** |
| 171 | No, it's a little cold today. | → **Interlocutor** (arguable) |
| 172 | It's not bad. | undecidable, stays `Learner` under protest |

That audit also recorded the deeper fact: **the canonical script carries no speaker labels at
all.** 230 of 232 speaker strings on this pod are inference, not data. The only two the text
fixes are *"My name is Anna"* and *"I'm James"*.

---

## Is it Italian-only? No — 22 of 22

Measured live, every `listening_pods` row with slug `pod-1` and `visibility='live'`:

| | |
|---|---|
| Live `pod-1` courses | **22** |
| With 22 scenes / 231 rows | **22 of 22** |
| With scenes 15–21 as `Learner`-only phrase lists | **22 of 22** |

ara, ara_eg, deu, deu_at, eus, fra, fra_ca, gle, hin, hrv, isl, **ita**, jpn, kor, nld, por,
por_br, ron, spa, spa_mx, swe, zho — byte-identical structure. Italian is not special; it is
just the one Tom read. The same 7 scenes sit in every un-flipped `pod-0` course too, since they
are the same canonical rows.

---

## The same-voice flagger — what I see of the over-fire

Tom pointed at scenes 13 and 14 and said *"This is completely fine - not a problem."*
**He is right, and I could not make any committed check disagree with him.**

Measured on the live Italian pod:

- `tools/pods/pod-script-view.cjs` (the tool that annotates the published script): **17 findings
  across the pod, zero on scenes 13 or 14.** All 17 land on scenes 3, 8, and 15–21.
- The estate C5 sweep (`pod1-six-check-sweep-2026-08-24.md`): flags scenes **7/8/9** only.
- The rows themselves alternate cleanly — SC13 Tourist(Ara, f) ↔ Local(Enzo, m) throughout;
  SC14 Passenger(Enzo, m) ↔ Driver(Ara, f) throughout. Even the Narrator tails land on the
  opposite voice to the line before them.

The only document in the estate that names these scenes as defective is
`docs/pods/cym-n-pod0-aran-self-dialogue-audit-2026-08-23.md`:

> *"**Scene 13 (directions), Tourist ↔ Local** — 8 consecutive instances… the entire wayfinding
> exchange, one voice on both sides."*

That finding was **true of Welsh pod-0**, where one human recorder read every part, so Tourist
and Local were literally the same voice. It is false of Italian, where they are not.

**Why it travels wrongly:** a same-voice collision is a property of *(script × cast)*, but that
audit published its results as **a list of scene numbers** — scenes 13 and 14 among them —
and a scene-number list reads as a property of the script alone. Carry it to a course with a
different cast and it fires on scenes that are perfectly alternated. The zero-tolerance addendum
made this worse by folding the six Narrator-adjacency cases (including scene 13's 129→130 and
scene 14's 139→140) into the headline count, so two scenes whose only "defect" was a drill tail
on the recorder's own voice now appear in the defect inventory as ordinary collisions.

Fixing the flagger was not my job and I have changed nothing. Noted for whoever picks it up:
**any same-voice finding must be reported as (course, scene, speaker-pair, voice), never as a
bare scene number.**

---

## Recommendation — written down, not acted on

Per the standing instruction, no recasting was proposed to anyone, attempted, or applied.

The recast proposal already exists and needs no new analysis: **the 11 lines in
`docs/pods/pod0-speaker-inference-audit-2026-08-08.md` §"Every INFERRED-UNCERTAIN line"**
(scene 16 line 160; scene 17 lines 164, 166, 167, 171; scene 21 lines 211, 212, 214, 217, 218,
219) are the complete, line-by-line change set, worked once and never applied. If Tom wants
scenes 15–21 to read as conversation rather than drill, that document is the work order, and
it applies to all 22 courses at once because the rows are identical everywhere.

Two things a future pass must not miss:

1. **This is a text change, not a cast change.** Editing `speaker` on a live pod is governed by
   the standing content-change migration protocol (`docs/pods/pod-migration-protocol.md`) — and
   audio follows the speaker, so it is an audio-first sequencing job, not a column update.
2. **Aran's actual ruling still stands.** He said these scenes do not need scene-based
   to-and-fro. Correcting *who says a line* does not require re-rendering it as a dialogue —
   the attribution and the voice count are separable, which is precisely the distinction that
   was lost on 2026-08-06.

---

## Evidence index

| Claim | Source |
|---|---|
| Text is Aran's, not harvested | `docs/pods/pod0-aran-original-2026-08-06.txt` L218; 1/73 corpus match, measured |
| The collapse decision | commit `9cc3fbc33` message; `docs/pods/pod0-english-canonical.md` VOICING header |
| Aran's verbatim note | `docs/pods/pod0-english-canonical.md` |
| The 11 wrong lines, already found | `docs/pods/pod0-speaker-inference-audit-2026-08-08.md` |
| 230/232 speakers are inference | same document, "Method and honesty note" |
| pod-1 review pack is a different, unbuilt pod | `docs/pods/pod1-scene-review.md`; `canonical_pod_scenarios` pod_slug='pod-1', 16 scenes |
| Live pod-1 is renumbered pod-0 | `listening_pods.metadata.sections[0].label = "Pod 0"`, all 22 |
| 22/22 fleet shape | live query, `listening_pod_sentences` |
| No model recorded at data level | `content_audit_log` has 0 rows for `canonical_pod_scenarios` |
| Model at commit level | `Co-Authored-By: Claude Opus 5` on `c65d4d1fe`, `9cc3fbc33` |
| Scenes 13/14 clean | `pod-script-view.cjs` run live: 0 findings on 13/14 |
| Where the 13/14 flag comes from | `docs/pods/cym-n-pod0-aran-self-dialogue-audit-2026-08-23.md` L84, L97 |
