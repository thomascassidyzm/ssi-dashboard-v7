# Your voice, and what language it is actually speaking

**2026-08-27.** You asked me to audit the 91 `spa_for_eng` Pod 1 lines that went out on your Cartesia clone, revert every one that is not English, and then fix the manifest so this cannot happen by accident again.

**The headline is that there is nothing to revert. All 91 lines are English — not by the field that says so, but by listening to the audio.** The manifest defect you identified is real and is now fixed; it just had not yet caused the damage you were told to expect.

---

## What I actually checked, and why the obvious check is worthless

You warned me not to trust a role label or a DB field, and that warning is the whole job. Every field on these rows agrees with every other field, and they would all agree with each other just as happily if the audio were Spanish. So I checked in three independent layers, weakest first:

| Layer | What it can prove | Result |
|---|---|---|
| The line's TEXT in the live DB | what we *meant* to say | 91/91 English |
| Which track and voice the link sits on | where it *should* have gone | 91 on the known track, **0 on the target track** |
| **Whisper `-l auto` on the actual audio from S3** | what the clone **said** | **91/91 detected `en`** |

The third one is the only witness that is independent of the pipeline, and it is the one that answers your question. I downloaded all 91 clips from the bucket, converted them, and had whisper detect the language of each with no prompt and no hint of what it was supposed to be. **Ninety-one out of ninety-one came back English**, lowest confidence 0.955. The transcripts match the English text word for word.

**English: 91. Target-language: 0. Reverted: none — there was nothing to revert.**

Reverting would have meant taking your voice *off* 91 correct English lines, so I have not touched them. If you want them rolled back anyway for a different reason, the path is still five minutes: `docs/pods/pod1-tom-voice-2026-08-27/spa_for_eng-applied-log.jsonl` holds every slot's original `known_audio_id`, and no old clip was deleted.

### I also checked the whole estate, not just Spanish

There are exactly **91 clips in existence on your Cartesia clone**, and they are these 91. Nothing else in production is voiced by it — nothing on any target track, in any course. The "152 extra listening clips" from the earlier sampling run never entered the production tables.

---

## The manifest defect is real, and it is now closed

You were right about the shape of the bug, even though it had not fired. The old selector was:

> `speakers[<speaker>].known.voice_id` is Tom's clone

That answers **which speaker** correctly and **which language** not at all. It trusts a convention — that the known track holds English — which is written down nowhere and enforced nowhere, across 5,082 rows nobody re-reads. One mis-slotted row and your voice ships in Spanish, silently, with every field agreeing.

**The manifest now selects on two independent things, and a line must pass both:**

1. **CAST** — the speaker is voiced by you on the known side. Unchanged; it was always right.
2. **LANGUAGE** — the line's own **text** is English, read off the text itself. Never the role, never the track name, never the `language` column, never the speaker — those are precisely the fields that would be wrong in the case this exists to catch.

The language test is four layers, cheapest first: non-Latin script (absolute — covers 7 of the 22 languages); known-text-identical-to-target-text (catches a straight field swap between two Latin-script languages); foreign function words; and an English character-trigram model.

**And a text gate cannot bound what a multilingual clone SAYS.** So there is now a second gate at render time: before any link moves, whisper decodes the clip it just made and it must come back English. Proven on real clips from your bucket —

- your English clip → `{ ok: true, lang: "en", p: 0.977 }`
- the Spanish clip in the same slot → `{ ok: false, why: "clip SPEAKS es (p=0.795), not English" }`

A clip that fails leaves the slot on its old audio. Nothing is deleted, nothing goes silent.

### How well it works — measured, not asserted

I validated it **held-out**: trained on half the English lines and 11 languages, then tested on the other half and on **11 languages it had never seen**. Then scored the shipped version against the real corpus of all 2,051 English lines and all 2,051 of their target-language twins across all 22 pods:

| | Result |
|---|---|
| Target-language lines wrongly accepted as English | **0 of 2,051** |
| English lines wrongly thrown away | **0 of 2,051** |
| English lines auto-accepted with no human | 1,924 |
| English lines **held for your ear** | 127 |

Zero in both directions on the real data. The numbers are re-derived by the test suite rather than written in a comment, so they cannot quietly rot.

---

## The one thing I need from you — seven lines, one look

The 127 held lines are only **7 distinct lines**, repeated across the 22 pods. They are the Narrator's drill lines, and they are the honest limit of any text-based test: no statistic on earth separates these from their foreign twins, because they are bare nouns and numerals.

> "October. November. December."
> "7. 9. 11. Orange. Purple."
> "12. 13. 14. Pink. Grey."
> "3 o'clock. 9 o'clock. January. February."
> "4 o'clock. 8 o'clock. March. April."
> "6 o'clock. July. August. September."
> "5 o'clock. 7 o'clock. May. June."

Compare "October. November. December." with the Swedish line in the same slot — "Oktober. November. December." — and you can see why I would rather hold these than have a gate that pretends to adjudicate them.

They are English, they are already live in your voice in Spanish, and they sound right. **I did not want to auto-pass them on my own judgement.** Say the word and they go straight into the render list for all 22 pods; the gate keeps holding them until you do.

---

## The rollout is still held

Nothing has been fired. The corrected manifest is staged and is **1,924 lines across 22 pods, 92,086 characters** — down from 2,051, the difference being the 127 held lines above. Zero lines were rejected as non-English anywhere in the estate, which is the same finding as the Spanish audit, extended to all 22 languages.

`spa_for_eng` is already rendered and live. The other 20 live pods and the held `deu_at_for_eng` wait on your ear and your ruling on those seven lines.

---

## What is in the code

- `tools/pods/tom-voice-language-gate.cjs` — the four-layer language test, with the operating point and the reasoning
- `tools/pods/tom-voice-language-gate.test.cjs` — 10 tests, scored against the real 4,102-line corpus
- `tools/pods/build-tom-voice-manifest.cjs` — rebuilds the manifest, cast **and** language, nothing silently dropped
- `tools/pods/pod1-tom-voice-render.cjs` — text preflight before a credit is spent, audio check before a link moves
- `tools/tts-bakeoff/pod1-tom-voice-manifest.json` — the corrected work-list

The superseded `pod1-tom-voice-manifest-2026-08-27.json` is left in place as history; the driver no longer reads it, and would refuse the lines it lists.
