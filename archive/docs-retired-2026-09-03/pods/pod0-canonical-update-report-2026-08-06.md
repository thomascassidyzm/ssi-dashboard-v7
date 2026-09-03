# Pod 0 canonical — Aran's new text is live (2026-08-06)

**231 sentences across 22 scenes**, replacing the previous 142 across 15. Built from Aran's
own file — all 231 lines are character-identical to it once three mechanical fixes are
applied. **Nothing has propagated to learners.** No audio was generated, no per-course pod
dialogue was regenerated, nothing was deleted.

## Source and provenance

Aran's original, `pod0-aran-original-2026-08-06.txt`, is archived byte-identical — UTF-8 BOM
and CRLF line endings and all — and is what the build reads.

The canonical was first built from a copy recovered out of the conversation transcript,
before the original was on disk. **The two were diffed and are identical on every non-blank
line**, trailing spaces included; the original differs only in BOM, CRLF and extra blank
lines between scenes. Rebuilding from the original reproduced all 231 lines byte-for-byte and
produced exactly the same three corrections. The transcript recovery was faithful — no
content discrepancy to report. Both copies are kept.

## Scene-by-scene count

| Scene | Title | In Aran's file | Seeded | Was |
|---|---|---|---|---|
| 1 | A Day of Greetings (i) - 8 am - Morning to night | 4 | 4 ✓ | 4 |
| 2 | A Day of Greetings (ii) - a seat - Morning to night | 5 | 5 ✓ | 2 |
| 3 | A Day of Greetings (iii) - 3 pm - Morning to night | 10 | 10 ✓ | 3 |
| 4 | A Day of Greetings (iv) - 7 pm - Morning to night | 3 | 3 ✓ | 3 |
| 5 | A Day of Greetings (v) - 10:30 pm - Morning to night | 2 | 2 ✓ | 2 |
| 6 | Introductions - Pleased to meet you | 13 | 13 ✓ | 13 |
| 7 | Coffee Shop - A flat white, please | 15 | 15 ✓ | 15 |
| 8 | Pub - A pint of bitter | 16 | 16 ✓ | 16 |
| 9 | Restaurant - A booking for two | 18 | 18 ✓ | 18 |
| 10 | Shop | 10 | 10 ✓ | 10 |
| 11 | Hotel - A booking under the name Jones | 13 | 13 ✓ | 13 |
| 12 | Chemist's - Something for a sore throat | 10 | 10 ✓ | 10 |
| 13 | Directions - Past the church and the post office | 11 | 11 ✓ | 11 |
| 14 | Taxi | 10 | 10 ✓ | 10 |
| 15 | Extra phrases | 11 | 11 ✓ | new |
| 16 | Extra phrases | 11 | 11 ✓ | new |
| 17 | Extra phrases | 11 | 11 ✓ | new |
| 18 | Extra phrases | 11 | 11 ✓ | new |
| 19 | Extra phrases | 11 | 11 ✓ | new |
| 20 | Extra phrases | 11 | 11 ✓ | new |
| 21 | Extra phrases | 14 | 14 ✓ | new |
| 22 | First conversation | 11 | 11 ✓ | 12 |
| | **Total** | **231** | **231** | **142** |

Every row matches. Verified after seeding: 231 rows stored, `global_order` contiguous 1-231,
per-scene `sentence_number` contiguous across all 22 scenes, and every stored
`english_text`/`speaker`/`author_notes` identical to the committed markdown.

## What changed in the shape

- Old scenes **1-14 map 1:1** onto new scenes 1-14.
- Old scene 15 **First conversation** is now **scene 22**.
- New **scenes 15-21, seven "Extra phrases" scenes** (80 sentences) are brand new.
- Scene 2 grows 2 -> 5, scene 3 grows 3 -> 10.
- **Nothing was lost.** All 142 previous rows were matched by text exactly once. The drill
  tail that used to end First conversation (`100,000. 60. 70. 1 o'clock. 11 o'clock.`) has moved
  to the end of the new scene 15 — that is the only line that changed scene.

## Voicing — Aran's ruling, recorded in the canonical doc

Aran, verbatim: *"Did some interleaving in the first few scenes and then beyond that it
seemed faster to do them as chunks, without scene-based to and fro for everything, they'll
work fine like that (also kind of fits with what I've been saying about not needing multiple
voices)."* Tom adds: **a minimum of two voices where needed, especially for less-well-served
TTS languages.**

This is now in the STATUS header of the canonical doc, so the future audio pass inherits it
rather than re-deriving it. What it changed here:

- **Scenes 1-14 and 22 stay genuinely interleaved dialogue** with their own characters
  (Sarah/Neighbour, Barista/Customer 1-3, Waiter, Guest/Receptionist, Learner/Friend). Two
  voices is the floor, not the target — distinct voices per character where the TTS supports it.
- **Scenes 15-21 are chunks, and no to-and-fro has been forced onto them.** I had inferred an
  alternating `Friend` on **11 lines** that read as a second party's reply — `No, we only take
  cash.`, `It's down there on the left.`, `Would you like to order some drinks?` and eight more.
  **Those 11 are now all `Learner`.** Every line in scenes 15-21 is `Learner`, except the drill
  tails. If a future pass wants a second voice there it is a free choice, not something the
  data dictates.
- **Drill tails remain `Narrator`**, as under canon v2.

## Corrections made to the source

Three, all mechanical, all itemised in the corrections doc:

1. **Scene 3 numbering** — Aran numbers his last line `6.` a second time after `9. Here's your coffee.`
   Renumbered to `10.`; text untouched. The only numbering anomaly in the file.
2. **Curly apostrophes -> straight** — the source mixes 112 straight against 12 curly, across 8
   lines. Normalised to straight ASCII. **A default taken, reversible on one word.**
3. **Trailing whitespace stripped** — 14 lines. The archive keeps it, the canonical does not.

The BOM and CRLF line endings are file format, not content — stripped on read, not counted as
corrections, preserved in the archive.

## Left alone deliberately — questions for Tom or Aran

- `practice` as a verb in scene 10.9 (`I need to practice more`) where Aran writes `practise`
  in scenes 22.1, 22.3 and 22.7. British English wants `practise`. It is a spelling judgment
  inside his prose, not a mechanical typo, so I left it. It was in the old text too.
- Aran uses **hyphens** where the old DB rows had em dashes (`Excuse me - do you have anything
  gluten-free?`, `I'm not feeling great - could you recommend something?`). Kept as he wrote them.
- `sit-in` hyphenated as a noun (scene 7.5, 7.14) — his form, unchanged from the old rows.

## Speakers: 142 carried across, 89 inferred

Every one of the 142 old rows was consumed exactly once, so all their speakers carried over.
The 89 inferred are the new lines. No new speaker names were invented — all names used
already exist in pod-0/pod-0.5. **These are the ones for Aran to correct in the dashboard if
any are wrong:**

| Scene.line | Speaker | Line |
|---|---|---|
| 2.3 | Sarah | How far is it into town? |
| 2.4 | Sarah | Can you tell me how far it is into town? |
| 2.5 | Passenger | It's not very far. Maybe three or four miles. |
| 3.3 | Sarah | Do you have any food? |
| 3.4 | Sarah | Do you have any snacks? |
| 3.5 | Sarah | Do you have crisps, or nuts, or anything? |
| 3.6 | Barista | No, we've only got drinks. |
| 3.7 | Barista | Yes, would you like the menu? |
| 3.8 | Sarah | Yes, please. |
| 3.9 | Barista | Here's your coffee. |
| 15.1 | Learner | How much is that? |
| 15.2 | Learner | Can you tell me how much that is? |
| 15.3 | Learner | How much does it cost to get a taxi into town? |
| 15.4 | Learner | How much does it cost to get a bus into town? |
| 15.5 | Learner | Where can we get a bus? |
| 15.6 | Learner | Where can we get a taxi? |
| 15.7 | Learner | Four single tickets to town, please. |
| 15.8 | Learner | Two return tickets to town, please. |
| 15.9 | Learner | I prefer to try to speak your language, I think it's polite. |
| 15.10 | Learner | I'm sorry I can't speak very quickly. |
| 16.1 | Learner | But if you can speak slowly I think we'll be able to manage. |
| 16.2 | Learner | You spoke a little too quickly, so I'm not sure if I understood. |
| 16.3 | Learner | Can we try again? |
| 16.4 | Learner | Can we see the menu? |
| 16.5 | Learner | Can we see the dessert menu also? |
| 16.6 | Learner | Do you have anything to eat? |
| 16.7 | Learner | Can we pay? |
| 16.8 | Learner | Can we pay by card? |
| 16.9 | Learner | No, we only take cash. |
| 16.10 | Learner | I'm sorry, I don't have any cash. |
| 16.11 | Narrator | A million. 80. 90. 2 o'clock. 10 o'clock. |
| 17.1 | Learner | Is there a cash machine near here? |
| 17.2 | Learner | Do you want to pay by cash or card or put it on the room? |
| 17.3 | Learner | Can we put it on the room, please? |
| 17.4 | Learner | Would you like to pay by cash or card or on the room? |
| 17.5 | Learner | Did you want to pay by cash or card? |
| 17.6 | Learner | We'll pay by card again, please. |
| 17.7 | Learner | It's hot today, again. |
| 17.8 | Learner | Is the water warm? |
| 17.9 | Learner | No, it's a little cold today. |
| 17.10 | Learner | It's not bad. |
| 17.11 | Narrator | 3 o'clock. 9 o'clock. January. February. |
| 18.1 | Learner | That's a bad idea. |
| 18.2 | Learner | Do you have any orange juice? |
| 18.3 | Learner | Do you have any apple juice? |
| 18.4 | Learner | Does the boat leave from here? |
| 18.5 | Learner | Does the bus leave from here? |
| 18.6 | Learner | Where does the bus leave from? |
| 18.7 | Learner | Is that correct? Am I correct? |
| 18.8 | Learner | Am I wrong about that? |
| 18.9 | Learner | I'm sorry, my son lost his ticket. |
| 18.10 | Learner | We have paid, but my daughter has lost her ticket. |
| 18.11 | Narrator | 4 o'clock. 8 o'clock. March. April. |
| 19.1 | Learner | That makes me happy. |
| 19.2 | Learner | That makes me feel a little worried. |
| 19.3 | Learner | When you talk quickly, it makes me feel stupid. |
| 19.4 | Learner | Is it okay if I sit here? |
| 19.5 | Learner | Is it okay if we put this here? |
| 19.6 | Learner | I don't want to be late. |
| 19.7 | Learner | Are we going to be late? |
| 19.8 | Learner | I promise I won't be late. |
| 19.9 | Learner | I promise we won't be late. |
| 19.10 | Learner | I'd like two scoops of ice-cream, please. |
| 19.11 | Narrator | 5 o'clock. 7 o'clock. May. June. |
| 20.1 | Learner | Can I have one scoop of chocolate and one of strawberry? |
| 20.2 | Learner | And then another cone with one scoop of lemon and one of blueberry. |
| 20.3 | Learner | Do you have any ice-cream? |
| 20.4 | Learner | Thank you for all your work. |
| 20.5 | Learner | I wish you good luck with everything. |
| 20.6 | Learner | Thank you for helping me. |
| 20.7 | Learner | Good luck with that! |
| 20.8 | Learner | That's very kind of you. |
| 20.9 | Learner | You're very kind. |
| 20.10 | Learner | Thank you for being so friendly. |
| 20.11 | Narrator | 6 o'clock. July. August. September. |
| 21.1 | Learner | It sounds as though we need to leave soon. |
| 21.2 | Learner | It sounds as though you want us not to do that. |
| 21.3 | Learner | Is there a toilet here? |
| 21.4 | Learner | Can you tell me where the toilet is? |
| 21.5 | Learner | It's down there on the left. |
| 21.6 | Learner | It's down there on the right. |
| 21.7 | Learner | Can you say that again? |
| 21.8 | Learner | Yes, I said it's over there. |
| 21.9 | Learner | What is that? |
| 21.10 | Learner | What is that over there? |
| 21.11 | Learner | Would you like to order some drinks? |
| 21.12 | Learner | Do you want to order some drinks first? |
| 21.13 | Learner | Did you want something to drink first? |
| 21.14 | Narrator | October. November. December. |

Scenes 2 and 3 are early interleaved dialogue, so the existing characters continue there
(`Sarah`, `Passenger`, `Barista`). Scenes 15-21 are chunks: all `Learner`, per Aran's ruling
above. Drill tails are `Narrator`, which pod-0 already used, and they carry the same canon-v2
`vocab coda` author-note — 16 rows now, up from 10, because there are seven more drill tails.

## What is now stale — nothing has propagated

**67 `listening_pods` rows carry slug `pod-0`** — 66 real courses plus `zzz_test_for_eng`. Every
one holds **142 sentences generated from the OLD canonical**, so every one is now 89 sentences
behind. Most already have full audio (142 of 142 clips); the exceptions are `cym_s_for_eng` (0),
`deu_at_for_eng` (0), `fin_for_eng` (0), `cym_n_for_eng` (28) and the 16 `eng_for_*` courses (139).

A future approved propagation pass would therefore have to cover **66 courses × 89 new sentences
≈ 5,900 new dialogue lines**, plus their audio. It is not purely additive either: First
conversation moves from scene 15 to scene 22, so any regen has to remap scene numbers rather
than append. Aran's chunk ruling should cut the voice-casting cost of that pass.

**I have not run any of it.** No `pod-bulk-migrate regen`, no `pod-sync`, no TTS, no deletions.
Queueing audio-pass requests for the affected courses would record the backlog properly — say
the word and I will, but I have queued nothing unasked.

## Recoverability

The seed tool DELETEs the slug before inserting, so the previous 142 rows were snapshotted to
`docs/pods/pod0-live-snapshot-2026-08-06.json` and committed **before** the first execute.
Restoring the old canonical is a re-insert of that file.

One tool change came with this: `seed-canonical-pods.cjs` now reads an optional 4th `Notes`
column into `author_notes`. Without it, a re-seed silently dropped the canon-v2 vocab-coda notes
on the drill rows — the markdown is now lossless.

## One gap, reported honestly

The read API on :3470 answered `401 Authentication required` for
`GET /api/admin/canonical-pods/pod-0`, so I could not verify through that surface. The route
exists and is up. I verified against `canonical_pod_scenarios` directly instead, which is the
same store that endpoint reads, ordered the same way.
