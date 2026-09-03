# Croatian pod-0 — four things for Aran, one reply

**22 Aug 2026.** Everything below is **already built and verified on the pilot pod** (`hrv_for_eng:pod-0-unrecorded`). **The live pod is untouched** — 142 rows, 284 clips, all alive, nothing written to it. Nothing goes to learners until you say so, and every edit has a recorded way back.

Tom's ruling that produced it: *the FRIEND is the female, named character; the protagonist stays male-voiced and unnamed.* This is a change to the canonical **English**, so it propagates to every language pair built from pod-0 — which is why it needs your name on it rather than a model's.

**Four questions. Each has a recommendation, so a single "yes to all" closes the lot.**

---

## 1. The wording of the three edited lines

Only the name moved. Nothing else in any of these lines changed — the edit tool refuses any change where removing the name doesn't leave the two sides otherwise identical, so that's a mechanical fact rather than a claim.

**SC01-S001 · Neighbour, 8 am · female voice**

| | text |
|---|---|
| before EN | Good morning, **Sarah**! |
| **after EN** | **Good morning!** |
| before HR | Dobro jutro, **Sarah**! |
| **after HR** | **Dobro jutro!** |

**SC05-S001 · Neighbour, 10:30 pm · female voice**

| | text |
|---|---|
| before EN | Good evening, **Sarah**. Did you have a long day? |
| **after EN** | **Good evening. Did you have a long day?** |
| before HR | Dobra večer, **Sarah**. Jesi li imao dug dan? |
| **after HR** | **Dobra večer. Jesi li imao dug dan?** |

**SC04-S002 · the protagonist · male voice** — this is the one place in the pod where he greets the Friend, so this is where the name lands.

| | text |
|---|---|
| before EN | Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? |
| **after EN** | **Hello, Sarah!** I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? |
| before HR | Bok! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra? |
| **after HR** | **Bok, Sarah!** Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra? |

**Recommendation: approve as written.** The two Neighbour lines lose a name the protagonist should no longer carry; SC04-S002 gains it at the only natural point of address in the pod.

**Hear them**

SC01-S001 · *Good morning!* / *Dobro jutro!*
- https://ssi-audio-stage.s3.amazonaws.com/mastered/AF765072-37C2-4DBB-8385-6F785DA55EAA.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/653D891E-C113-462C-AD6A-06164CB882B5.mp3

SC04-S002 · *Hello, Sarah! I'm sorry but I can't talk at the moment…* / *Bok, Sarah! Žao mi je…*
- https://ssi-audio-stage.s3.amazonaws.com/mastered/33A3D0C6-1EAD-467E-8C23-DE84FFE73DC2.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/809E548D-37C5-428F-A450-E76DDC45C2E8.mp3

SC05-S001 · *Good evening. Did you have a long day?* / *Dobra večer. Jesi li imao dug dan?*
- https://ssi-audio-stage.s3.amazonaws.com/mastered/2EADE7CF-7D62-43A1-9EE7-4CA8C6054CEF.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/65D9081B-B28B-47EB-BEBA-969A1B7B6CA2.mp3

---

## 2. Does the Friend get named a second time, in scene 22?

As built, she is named **once** — scene 4. Scene 22 is the flagship conversation and uses the same `Friend` speaker key, and the Croatian there already has her female (`Bi li imala…`, `Impresionirana sam`).

**The tradeoff.** Naming her again would go in the opening line, SC22-S001: *"Would you mind if I tried to practise speaking Croatian with you?"* → *"Sarah, would you mind if I tried…"*. That makes it unambiguous that scene 4's Friend and scene 22's Friend are the same person — but that line reads more like a request to a new acquaintance than to an old friend, so the name sits slightly oddly on it. Cost either way is one long line re-rendered on both tracks.

**Recommendation: leave her named once.** The ruling didn't require a second naming, the scene reads naturally as it stands, and whether those two scenes are the same person is a story call that is yours. If you'd rather they were explicitly one person, say so and SC22-S001 takes the name.

---

## 3. 13 rows relabelled from `Sarah` to `Learner`

The protagonist's **speaker label** in scenes 1–5 was literally the string `Sarah`. Left alone, SC04-S002 would read as speaker *Sarah* saying *"Hello, Sarah!"* — and casting resolves per speaker key, so labelling the Friend `Sarah` later would have put her on the male voice. One name can't be two characters.

These 13 rows moved to `Learner`, the pod's own label for the protagonist thread (79 lines), already cast to the same male voice:

SC01-S002, SC01-S004, SC02-S001, SC02-S003, SC02-S004, SC03-S002, SC03-S003, SC03-S004, SC03-S005, SC03-S008, SC03-S010, SC04-S002, SC05-S002.

**No voice changed and not one clip was re-rendered by this.** Speaker labels are never spoken and aren't the learner-progress key. Same shape as the `Passenger` → `Fellow passenger` relabel on the 21 August list.

**Recommendation: approve.** It's forced by the ruling and has no audible consequence — but it is a change to the speaker column of your canonical English, so you should see it.

---

## 4. The reused "Good morning" clip

SC01-S001 was filled by an existing clip whose recorded text is *"Good morning."* / *"Dobro jutro."* — the row now reads *"Good morning!"* / *"Dobro jutro!"*. Same words, full stop instead of exclamation mark, so it may land a touch flatter than a neighbour's morning greeting. This is the renderer's ordinary reuse-per-distinct-text behaviour; the 21 August pass accepted the same thing at SC20-S008. It is a note, not a failure — the clip is verified alive and word-correct.

**Recommendation: take a fresh one.** This is the very first line of the pod, on both tracks, and the opening greeting sets the register for everything after it. It's two clips, it's the cheapest possible fix, and a declarative reading of a cheery 8 am greeting is exactly the kind of thing that's invisible on paper and obvious in the ear. Straightforward disagreement is fine — the links in §1 let you judge it yourself, and if it sounds right to you it stays.

---

## FYI, settled — not a question

**"Sarah" as the Friend's name in Croatian is correct as it stands, undeclined.** Two independent language reviews, each given only the text and the cast, both returned PASS on all three lines. The substantive point was the vocative: foreign feminine names ending in a consonant are treated as **indeclinable in the Croatian vocative**, so *Bok, Sarah!* is right — and decisively, the pod already used undeclined `Sarah` as a vocative in both Neighbour lines before any of this, so it's the course's own existing precedent, not a new choice. A purist could argue the native a-stem `Saro`, but that means respelling the name and breaking the English-spelling convention the pod uses throughout. **Recommendation already taken: keep `Sarah`.** No action needed unless you actively want `Saro`.

---

## What's still open elsewhere, for completeness

Not part of this ask, and untouched by this pass:
- Your sign-off on the **16 Croatian gender edits** from 21 August.
- The `hrv_for_eng:pod-1` naming collision.
- An inert `Sarah` key left in the cast map — no row uses it; it wants tidying when the switchover plan is written, deliberately not touched here because moving it would invalidate the render approval for no gain.

**Nothing above ships to a learner until the switchover, and the switchover runs under the content-change migration protocol** — these three rows change the English, and learner progress keys on English text, so they migrate rather than being edited in place.

*Full evidence, every count read back off the live database after the write: `docs/pods/hrv-pod0-sarah-to-friend-2026-08-22.md`, branch `docs/hrv-pod0-sarah-to-friend-2026-08-22`.*
