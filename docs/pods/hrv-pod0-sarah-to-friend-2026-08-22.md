# The name moves to the Friend — the three lines Aran needs to sign off

**22 Aug 2026.** Tom's ruling on the Croatian pod-0 pilot, a third option beyond the two carried to him on 21 August:

> Rewrite the genders so it's the FRIEND character who is female and named — keep the protagonist male-voiced as already cast. Adjust the canonical English script so the named/female role belongs to the Friend, not the protagonist. Only re-render the specific lines the text change touches.

His reasoning: pod-0 should stay simple with two voices across every language it is built into, and a small text adjustment to match the casting is an acceptable trade.

**This is a canonical ENGLISH change and it is NOT canon yet.** It propagates to every language pair built from pod-0. Three lines need Aran's personal sign-off on the wording. Every edited row carries a `sarah_to_friend_pending_signoff` block in the database naming him as signatory, and the `old` column below is the way back.

**Branch** `docs/hrv-pod0-sarah-to-friend-2026-08-22`, a child of `docs/hrv-pod0-two-voice-2026-08-21` (`80748e389`). **The live pod is untouched** — see §5.

---

## 1. What the pod actually said, before anyone proposed anything

Two facts found by reading all 231 rows, and they shaped the whole rewrite:

**"Sarah" is spoken exactly twice, and both times it is the NEIGHBOUR greeting the protagonist** — `SC01-S001` and `SC05-S001`. The Friend is not present in either scene. So the name could not simply move *within* a line; it had to be removed where it is said and given to the Friend at the one place the protagonist greets her.

**The protagonist is ALREADY named James, and already male, in Aran's canon.** Scene 6: *"I'm James. Pleased to meet you… I'm on holiday here with my wife and children."* So scenes 1-5 calling the protagonist Sarah was already an internal inconsistency in the script, independent of any casting question. Tom's ruling resolves it rather than inventing anything.

The only other spoken names in the pod are Anna (scene 6, the stranger James meets) and the booking names Davies and Jones. A full scan for gendered English found nothing else touching the protagonist or the Friend — the only `she/her/his` in the pod is `SC18-S009/010` (*my son lost his ticket* / *my daughter has lost her ticket*), which is noun agreement and was correctly left alone by the 21 August sweep too.

---

## 2. The three lines — PROPOSED, not canon

Both tracks are edited. Nothing else in any of these lines moved: the tool refuses any edit where stripping the name does not leave the two sides identical, so "minimal scope" here is a mechanical fact, not a claim.

### SC01-S001 · Neighbour (8 am) · Voice B female

| | old | new |
|---|---|---|
| **EN** | Good morning, **Sarah**! | Good morning! |
| **HR** | Dobro jutro, **Sarah**! | Dobro jutro! |

*Why:* the Neighbour is greeting the protagonist, who is male-voiced and is no longer the named character.

### SC05-S001 · Neighbour (10:30 pm) · Voice B female

| | old | new |
|---|---|---|
| **EN** | Good evening, **Sarah**. Did you have a long day? | Good evening. Did you have a long day? |
| **HR** | Dobra večer, **Sarah**. Jesi li imao dug dan? | Dobra večer. Jesi li imao dug dan? |

*Why:* same greeting, evening. `imao` already agrees with the male addressee — that was the 21 August edit and it stays correct.

### SC04-S002 · the protagonist · Voice A male

| | old | new |
|---|---|---|
| **EN** | Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? | Hello, **Sarah**! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? |
| **HR** | Bok! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra? | Bok, **Sarah**! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra? |

*Why:* this is the one place in the pod where the protagonist greets the Friend. The name lands here, on her.

**The Croatian was checked twice, independently** (jobs #907 and #914), each given only the text and the cast. Both returned PASS on all three. The substantive question was the vocative: foreign feminine names spelled with a final consonant are treated as **indeclinable in the Croatian vocative**, so `Bok, Sarah!` is correct — and, decisively, *the before-state already used undeclined `Sarah` as a vocative in both Neighbour lines*, so this is the course's own existing precedent rather than a new choice. #907 logged one judgment-fork for Aran, not a defect: a purist could argue the native a-stem vocative `Saro`, but that requires respelling the name and would break the English-spelling convention the pod uses throughout.

---

## 3. One more change, and it is forced rather than cosmetic

**The protagonist's speaker key in scenes 1-5 was literally `Sarah`.** 13 rows. Left alone, `SC04-S002` would read as speaker *Sarah* saying *"Hello, Sarah!"* — and worse, casting resolves per speaker KEY, so a future pass that labelled the Friend `Sarah` would resolve her onto Voice A male. One name cannot be two characters.

Those **13 rows move from `Sarah` to `Learner`**, which is the pod's own label for the protagonist thread (79 lines) and is already cast Voice A. **No voice changes and not one clip was re-rendered by this relabel.** Speaker labels are never spoken and are not the progress key. Precedent: the `Passenger` → `Fellow passenger` relabel in the 21 August pass, carried to Aran on the same sign-off list.

Rows relabelled: SC01-S002, SC01-S004, SC02-S001, SC02-S003, SC02-S004, SC03-S002, SC03-S003, SC03-S004, SC03-S005, SC03-S008, SC03-S010, SC04-S002, SC05-S002.

**The cast map was deliberately NOT touched.** `listening_pods.speakers` keeps its now-unused `Sarah` key on Voice A. Changing it would move the cast fingerprint and invalidate the render approval for no gain, since no row carries the key any more. It is inert — but it should be tidied at switchover time, and whoever writes that plan should know it is there.

---

## 4. Audio — six clips, and only six

**Exactly six clip pointers were unlinked** (three rows × two tracks) and re-rendered: 4 newly generated, 2 reused from existing identical-text clips, **0 failed**. Nothing else in the pod was re-rendered. **No clip was deleted at any point** — `course_audio` was asserted unchanged at 2,566,055 rows inside the same transaction as the edit, and every superseded clip id is in the applied log.

Then **all 462 clips in the pod were verified**, both tracks — the same method as the 21 August pass, deliberately re-run in full rather than narrowed to the six, so that a regression anywhere else in the pod would show up:

| check | result |
|---|---|
| clips checked | **462 / 462** |
| on the voice the two-voice rule requires | **462** — 150 + 150 Voice A, 81 + 81 Voice B |
| reachable on S3, plausible duration | **462** |
| clip words match the row's current words | **462** |
| veracity failures on any stored clip | **0** |
| rows still keyed `Sarah` | **0** (want 0) |
| lines speaking the name, per track | **1 each, both at SC04-S002, both on Voice A** |
| **FAILURES** | **0** |

The verifier re-derives the expected voice from Tom's rule rather than reading the stored cast, so a mis-cast character fails even if the rest of the system agrees with it. It also asserts the naming ruling directly against the pod's own text on both tracks, which the voice checks alone could not prove.

**One thing for Aran's ear, reported rather than buried.** `SC01-S001` reused an existing clip whose text is *"Good morning."* / *"Dobro jutro."* where the row now reads *"Good morning!"* / *"Dobro jutro!"* — same words, full stop instead of exclamation mark, so it may land slightly flatter than a neighbour's morning greeting should. This is the renderer's normal render-once-per-distinct-text reuse, and the 21 August pass accepted the same thing at `SC20-S008`. It is a note, not a failure. Say the word and it gets a fresh render.

### Listen

**SC01-S001 · Neighbour · Voice B female** — *Good morning!* / **Dobro jutro!**
- https://ssi-audio-stage.s3.amazonaws.com/mastered/AF765072-37C2-4DBB-8385-6F785DA55EAA.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/653D891E-C113-462C-AD6A-06164CB882B5.mp3

**SC04-S002 · the protagonist · Voice A male** — *Hello, Sarah! I'm sorry but I can't talk at the moment…* / **Bok, Sarah! Žao mi je, ali ne mogu sada razgovarati…**
- https://ssi-audio-stage.s3.amazonaws.com/mastered/33A3D0C6-1EAD-467E-8C23-DE84FFE73DC2.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/809E548D-37C5-428F-A450-E76DDC45C2E8.mp3

**SC05-S001 · Neighbour · Voice B female** — *Good evening. Did you have a long day?* / **Dobra večer. Jesi li imao dug dan?**
- https://ssi-audio-stage.s3.amazonaws.com/mastered/2EADE7CF-7D62-43A1-9EE7-4CA8C6054CEF.mp3
- https://ssi-audio-stage.s3.amazonaws.com/mastered/65D9081B-B28B-47EB-BEBA-969A1B7B6CA2.mp3

---

## 5. The live pod is untouched

`hrv_for_eng:pod-0` is still **142 rows / 142 target clips / 142 known clips**, and all **284 of its clips were probed and are alive**. **Zero of its rows were written in the last 24 hours** — the assertion ran inside the edit transaction as well as after it, and the edit tool aborts if the live pod's counts move. No switchover has been run, in any mode.

**A correction to the 21 August doc while we are here.** That doc reported the live pod's newest row as "last written 14 July". That figure was already wrong when it was written: the live pod's `updated_at` histogram shows 33 rows updated on **13 August**, eight days *before* that pass ran. Nothing has written to it since, and nothing in this pass reached it — but the number in the older doc should not be repeated.

---

## 6. What this leaves open for Aran

1. **The wording of the three lines in §2** — the actual sign-off. Is *"Hello, Sarah!"* the right place and the right register for the name to land?
2. **Should the Friend be named a second time, in scene 22?** She is named once, in scene 4. Scene 22 is the flagship conversation and shares the `Friend` speaker key — but the two scenes read slightly differently (scene 22 opens with *"Would you mind if I tried to practise speaking Croatian with you?"*, which reads more like a new acquaintance than an old friend). **Left alone: naming her twice was not required by the ruling, and whether scene 4's Friend and scene 22's Friend are one person is his call, not a model's.**
3. **`Saro` vs `Sarah`** — the purist Croatian vocative, flagged by #907 as a judgment-fork. Recommendation: keep `Sarah`, matching the pod's existing precedent and its English-spelling convention.
4. **The relabel in §3** — 13 rows from `Sarah` to `Learner`. Forced by the ruling, no audio consequence, but it is a change to the speaker column of his canonical English.
5. **`SC01-S001`'s reused clip** — full stop where the row has an exclamation mark (§4). One word and it gets a fresh render.
6. **The inert `Sarah` key in the cast map** (§3) — for whoever writes the switchover plan.

Still open from 21 August and untouched by this pass: the `hrv_for_eng:pod-1` naming collision, and Aran's sign-off on the 16 Croatian gender edits in `hrv-pod0-two-voice-text-2026-08-21-applied-log.json`.

**One consequence to carry forward, not dodged.** Unlike the 21 August pass, which held to Croatian only, this one edits the KNOWN (English) text — that is the whole point of the ruling. The progress matcher keys on English text, so these three rows will count as new at switchover and must be migrated under the standing content-change migration protocol (`docs/pods/pod-migration-protocol.md`) rather than edited in place on a live pod.

---

**Files.** `tools/pods/hrv-pod0-sarah-to-friend-2026-08-22.cjs` (the edit, dry-run first, before-state asserted per row, all-or-nothing) · `tools/pods/hrv-pod0-sarah-to-friend-verify-2026-08-22.cjs` (read-only) · `docs/pods/hrv-pod0-sarah-to-friend-2026-08-22-{dryrun,applied}-log.json` · `docs/pods/hrv-pod0-sarah-to-friend-verify-2026-08-22-report.json`
