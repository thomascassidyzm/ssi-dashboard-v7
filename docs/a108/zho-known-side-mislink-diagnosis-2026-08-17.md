# zho_for_eng — 236 known-side seed links speak a different sentence. The mechanism, named.

**2026-08-17. READ-ONLY throughout: nothing written to the database, no audio generated, no links changed, no money spent.**

Commissioned by Kai: *"Find the MECHANISM before repairing 236, so we do not invite the 237th."*

---

## Headline

**The 236 are real. They are not a comparator artefact — this is not jpn.** Byte-verified against the audio a learner is served today: the clip speaks a completely unrelated English sentence.

**The mechanism is not a mislinker.** Nothing ever pointed audio at the wrong seed. The links were *correct when they were made*. What broke them was a **seed text correction landing on a table that had no audio-nulling trigger** — and what stopped them healing was a **relinker that only fills FKs that are NULL**. Two locks. The second is why six weeks of correct audio has been sitting in the course, unlinked and unheard.

**The hole was open ~6 months and closed today.** The trigger that would have caught this, `trg_null_seed_audio_on_text_change`, was installed on `course_seeds` on **2026-08-17** — hours before this investigation, by the edit-impact work. Before today the trigger existed on `course_legos` and `course_practice_phrases` only.

**The repair costs nothing.** All 236 correct clips already exist, in the identical voice. **0 clips need rendering.**

| | |
|---|---|
| Calibrated true defects | **236** known-side seed links, 236 distinct seeds |
| Byte-verified by hand | **6 / 6** confirmed wrong-sentence |
| Rejected as false positive | 20 target-side links (real, but a different and minor class — §3) |
| Punctuation-only among the 236 | **0** |
| Question-mark diffs among the 236 | **0** |
| Mechanism still live? | **No — closed 2026-08-17.** But see the caveat in §5 |
| Relinkable, zero TTS | **236 / 236** |
| Clips needing a render | **0** |

---

## 1. Calibration first — the count is evidence, not a hit count

I re-derived the pilot's comparator independently and it reproduces to the digit:

| role | links | stale (correct comparator) | stale (stored-column only — the inflated one) |
|---|---|---|---|
| known | 668 | **236** | 334 |
| target1 | 668 | 10 | 163 |
| target2 | 668 | 10 | 163 |

The correct comparator is the one that accepts *either* the stored `text_normalized` *or* the clip's real text re-normalised now — the `OR` that stops the 41,900-row backfill artefact from inventing defects. That artefact is exactly what put jpn_for_eng, with zero real defects, at the top of a repair queue.

### Then I listened to the audio

A `course_audio` row asserting the right text is precisely what has been lying to everybody, so the row was never the evidence. I fetched six clips from the **live learner endpoint** (all six returned HTTP 200 — these are being served right now) and transcribed them with whisper:

| seed | seed's English text (what the learner is shown) | what the clip **actually says** (whisper, from the served bytes) |
|---|---|---|
| 351 | No he didn't want to leave me on my own. | *"He said that... I want to see the new movie that just came out."* |
| 357 | No she just wanted to send her a message. | *"She wants to buy a new car."* |
| 361 | He was quiet. | *"He said that he's too busy to help right now."* |
| 373 | It was beautiful. | *"He said that he'll be there in 10 minutes."* |
| 500 | Why don't you want to sit between the two girls? | *"He doesn't like to waste time."* |
| 668 | I hope you'll all be able to go | *"I think that this is the beginning of something great."* |

**6 of 6 confirmed.** In every case the transcript matches `course_audio.text` exactly and bears no relation to the seed. So the clip rows are *honest* — the text column tells the truth about the bytes. The **link** is what is wrong. That distinction is what makes the repair cheap.

Duration corroborates it independently: seed 361 is "He was quiet." — three short words — and its clip runs 3,096 ms. The correct clip for that text, which exists, runs 1,608 ms.

---

## 2. Hunting my own false positives

**Pass 1 — the punctuation ruling.** Stripping *all* punctuation and whitespace from both sides:

- rows that become identical (punctuation-only, **not** a defect): **0 of 236**
- of those, question-mark diffs: **0**

None of the 236 survive on punctuation. They are not full stops, not question marks, and not a pronunciation aid.

**Pass 2 — is the comparison even measuring the right thing?** Mean word-overlap between seed text and clip text across the 236 is **0.042**, and **122 of the 236 share not one single word with their seed**. These are not edits, drifts or normalisations. They are other sentences.

**Worth recording for the campaign:** under the *correct* comparator, punctuation is a rounding error estate-wide — **4 of all 1,071 stale links** (2 full-stop-only, 2 question-mark). Punctuation dominated only the *inflated* comparator, which is what produced the jpn false alarm. The question-mark count Kai asked to be reported separately is **2 estate-wide, 0 in zho**.

---

## 3. What I rejected: the 20 target-side links are a different, minor class

The 10 target1 + 10 target2 links (10 seeds) are **not** wrong-sentence. They are the correct Chinese sentence, one small edit behind:

| seed | seed text (Chinese) | clip says |
|---|---|---|
| 395 | 我们需要在下一个路口**向**左转 | 我们需要在下一个路口左转。 |
| 517 | **但是**他们是一起离开的 | **但**他们是一起离开的。 |
| 537 | **但是**我错了 | **但**我错了。 |

Real word differences — `但是`→`但`, `向左转`→`左转` — so audibly different, but the same meaning and the same sentence. The trailing `。` present on every one of them is, per the ruling, **not** a defect and must not on its own trigger anything. **These 20 links are genuine but low-severity, and they are NOT part of the 236.** Keeping them separate is the point: folding them in would have inflated the headline and mixed two different repairs.

---

## 4. The mechanism

### 4a. Where the wrong words came from — proven at offset exactly 0

Every one of the 236 clip texts is the English that **`fra_for_eng`** carried at the **same seed number**.

I found the corpus in the repo's own history: a February 2026 one-off, `scripts/insert_fra_translations_301_668.cjs`, which hardcodes `course_code: 'fra_for_eng'` and upserts English/French pairs for seeds **301–668**. Matching all 236 clip texts against that corpus:

```
clip texts found in the fra corpus:  236 of 236
offset distribution (seed_number − corpus_number):  { 0: 236 }
```

**236 out of 236, at offset zero, no other offset present at all.** So this is not an off-by-one, not a shuffled batch, and not an orphan of a deleted seed. zho_for_eng's known side for seeds 351–668 was carrying the *French course's* placeholder English, seed number for seed number.

### 4b. The batch that voiced it

One tight machine run — not a trickle, and not a human:

- **2026-05-03, 17:44:15Z → 17:52:16Z** — 8 minutes, **237 clips**, a steady ~30/minute
- all `origin='tts'`, all `role='known'`, all `course_code='zho_for_eng'`, all `voice_id='azure_en-GB-SoniaNeural'`
- **`lego_id` NULL on all 237**, **`veracity_pass` NULL on all 237** — nothing ever listened to them
- 237 distinct clips, 237 distinct texts, each linked to exactly one seed across 351–668

Crucially: these texts exist **nowhere else in the estate** — 1 row, 1 course, 1 file each. So this batch really did spend TTS on the placeholder text; it was not file reuse.

### 4c. Why the links were correct when made, and what broke them

The only way this system links a seed to a clip is **text equality**. `link_all_audio_ids()` and `audio_id_for_text()` both match on `ca.text_normalized = normalize_text(seed_text)`. Neither can link a clip that says *"He was quiet."* to a seed that says anything else — so **nothing mislinked anything**. On 2026-05-03 the clip and the seed genuinely agreed.

Then the text was corrected:

- **2026-07-02** — 192 of the 236 seeds updated
- **2026-07-11** — the remaining 44 updated

And here is the hole. The February 2026 migration that nulls audio FKs on a text change created its triggers on **`course_practice_phrases`** and **`course_legos`** — verified in the migration source. **`course_seeds` was never included.** The 2026-05-02 relink migration says so in its own header: *"The text-edit trigger … NULLs the audio_id FK columns on course_legos / course_practice_phrases."*

So the correction rewrote `known_text` and left `known_audio_id` sitting on the placeholder clip. Silently. No error, no alarm.

### 4d. The second lock — why it never healed itself

Someone *did* generate the correct audio, twice:

- **2026-07-05** — 164 correct clips (voice `gfzdpspr5fdp`)
- **2026-07-11** — 38 correct clips (voice `azure_en-GB-SoniaNeural`)
- plus 4 older ones

**206 correct clips are sitting in zho_for_eng right now, unlinked.** They could not be adopted, because `link_all_audio_ids()` only updates rows `WHERE known_audio_id IS NULL` — and these FKs were never NULLed, precisely because of 4c. The estate's self-healing relinker was structurally incapable of fixing this. That is the finding that matters more than the row count: **a missing trigger did not just break 236 links, it made them invisible to the machinery built to repair exactly this.**

### 4e. Corroboration — zho was the odd one out

The correct English for seed 351, *in the identical voice*, sits on one shared S3 object (`mastered/62231DEF-…mp3`, 2,880 ms) serving **16+ courses** — `ara_for_eng`, `bul_for_eng`, `gle_for_eng`, `heb_for_eng`, `hin_for_eng`, `ita_for_eng`, `tur_for_eng`, `ukr_for_eng` and more. Many of them were given it **on 2026-05-03 — the same day zho was given the placeholder.** The right words, in the right voice, existed estate-wide that day. zho_for_eng alone was voiced from stale text.

---

## 5. Is it still live? No — closed today. With one caveat.

`trg_null_seed_audio_on_text_change` **now exists on `course_seeds` and is enabled.** I read the live function definition: on a text change it prefers `audio_id_for_text_same_voice` (relink without a voice swap), else NULLs the link, and records every drop in `content_audio_link_drops`. It also correctly refuses to drop a link over trailing punctuation — the ruling is already coded in.

It landed **2026-08-17**, today, in the edit-impact work (*"seeds get an audio rule, without the voice swap that comes with it"*). **The hole was open from February to August 2026 and is now shut.**

**Two honest caveats:**

1. **`content_audio_link_drops` is empty.** The new trigger has not fired once in production. It is installed and it reads correctly, but it is **unexercised** — nobody has yet edited a seed's text with a linked clip since it landed. I did not provoke it (that would be a database write).
2. **The trigger fixes the future, not the past.** It cannot heal a link that was already broken. The 236 will sit there until someone repairs them, and so will any sibling the same six-month hole created in other courses.

**Estate-wide, this defect class is essentially zho's alone.** Classifying all 1,071 stale seed links language-aware (word-level for spaced scripts, character-level for Chinese/Japanese/Korean, which is where a Latin-shaped comparator goes wrong):

| class | links |
|---|---|
| minor edit — same sentence, text moved on | 414 |
| substantial rewrite | 368 |
| **UNRELATED SENTENCE — the wrong-clip class** | **285** |
| punctuation only — full stop (not a defect) | 2 |
| punctuation only — question mark (report separately) | 2 |

Of the 285 wrong-sentence links, **235 are zho_for_eng** and **50 are fra_ca_for_eng** (the unfinished Québécois conversion, another worker's). **No third course has this class.**

---

## 6. Relink vs re-render: 236 of 236 relinkable. Zero render spend.

Every one of the 236 correct texts already has a clip in the **identical voice** (`azure_en-GB-SoniaNeural`, canonicalising the `azure_`/`xai_` prefixes, which are tagging and not different voices):

| bucket | rows | cost |
|---|---|---|
| Correct clip already a `zho_for_eng` row, **same voice** — repoint the FK | **42** | free |
| Correct clip exists estate-wide on a shared file, same voice — needs a `zho_for_eng` row pointing at the existing S3 object | **194** | **free — no TTS** |
| Nothing exists anywhere | **0** | — |
| **Needs rendering** | **0** | **£0** |

The known side is shared **at the file level** by design — each course holds its own `course_audio` row pointing at a common `s3_key`, keyed by (text, voice). So bucket 2 is a row insert against an object that already exists, not a generation. This is the documented architecture, not a workaround.

**Do not use the 164 clips sitting in-course in voice `gfzdpspr5fdp`.** That is Tom's cloned English male voice; the zho known side is overwhelmingly `azure_en-GB-SoniaNeural`. Adopting them would be a silent voice swap on 164 prompts — a new defect wearing the old one's clothes. Same-voice sourcing avoids the decision entirely.

---

## 7. Repair plan — approvable in one word

Nothing below has been done.

1. **Relink 236 known-side seed FKs to the same-voice correct clip.** 42 repoint to an existing in-course row; 194 need a `zho_for_eng` row minted against an already-existing shared S3 object. **No TTS, no deletion, no voice change.** Use `tools/audio-link-reconcile.cjs`, which already models these buckets and never spends.
2. **Verify on served bytes, not on rows.** ASR-check a sample of the relinked slots through the production endpoint. The whole premise of this defect is that a row can assert one thing while the audio says another, so row-level agreement is not proof.
3. **Then, and only then, retire the 237 placeholder clips** — make-before-break, never the other order. They are learner-reachable today; two of them are also legitimately serving practice phrases whose text genuinely matches, so this is a *per-clip* check, not a bulk delete.
4. **Bump `content_stamp` / `courses.audio_stamp`** so cached learners pick the change up.
5. **Hold the 20 target-side links separately** (§3) — real, minor, same-sentence. Worth doing, not worth bundling.
6. **Sweep the six-month hole.** The trigger closed the leak on 2026-08-17, but every seed text edited between February and August 2026 with a linked clip is a candidate for the same silent breakage. This diagnosis found it in one course because the pilot happened to look there.
7. **Exercise the new trigger once, deliberately,** on a throwaway edit, and confirm a row lands in `content_audio_link_drops`. It is currently unproven in production.

---

## 8. Gaps — reported, not papered over

1. **I could not read the before-value of the seed text.** `content_audit_log` covers `course_seeds` only from **2026-07-03 09:02Z**, and holds **exactly one** zho_for_eng seed row in total — the 2026-07-02 and 2026-07-11 updates are not in it. So the claim in §4c that the text was corrected *from* the placeholder is an inference from converging evidence (offset-0 corpus match; the batch's internal consistency; text-equality being the only linking rule; 206 correct clips appearing days after each edit date; siblings holding the right words in the right voice on the same day) — **not a recovered old value.** The alternative reading, that a generator read its English from the wrong course at render time, is not fully excluded. **Both readings imply the same repair and the same fix**, so this gap does not change the plan, but it should not be reported as certainty.
2. **`scripts/` is gitignored**, so the sibling script that presumably placed the placeholder corpus into zho_for_eng is not recoverable. The `fra_for_eng` original survived only because it was committed once and later removed.
3. **Two estate-wide joins timed out** (clip text vs all content tables; `s3_key` fan-out, which appears unindexed). I worked around both with narrower queries; the specific counts I did not obtain are cross-table text provenance for all 236 at once.
4. **The new trigger is unexercised** (§5, caveat 2). I did not provoke it — that would be a database write, which this job forbade.
5. **A parallel worker (#938) is still running** an independent estate-wide liveness and batch-signature sweep. Its findings are not in this document. If it surfaces a batch with this signature dated *after* 2026-05-03, that would qualify §5 and should be read against it.
6. **fra_ca_for_eng's 50 wrong-sentence links were not investigated** — out of scope, another worker holds it.

---

---

## 9. Addendum — the independent sweep (#938) landed. §5 holds.

A second worker ran an independent estate-wide liveness and batch-signature sweep. **It converges with §5 by a completely different route:** it found **no genuine whole-sentence cross-course swap anywhere in the estate after 2026-05-03**. My evidence for "closed" was the trigger; theirs is the absence of later instances. Two independent routes, same answer.

**Three of its claims I checked and am correcting:**

1. **The 20 target-side zho links are NOT cross-course swaps.** The sweep reported donors `zho_for_jpn`/`zho_for_hin`/`zho_for_tam` and folded these into the incident. They are the edit-lag class the sweep itself correctly identified elsewhere. Verified directly:

   | seed | zho_for_eng (edited) | zho_for_jpn | zho_for_hin | zho_for_tam |
   |---|---|---|---|---|
   | 537 | **但是**我错了 | 但我错了。 | 但我错了。 | 但我错了。 |
   | 517 | **但是**他们是一起离开的 | 但他们是一起离开的。 | 但他们一起离开了。 | 但他们一起离开了。 |

   Mandarin target text is shared across the "Mandarin for X" family by design. `zho_for_eng` was edited `但`→`但是`; its siblings were not. The clip therefore matches the siblings because it is the *pre-edit* text, not because it came from them. **§3 stands: 20 minor same-sentence links, held separately from the 236.**

2. **`fra_ca_for_eng` is not an unreported new incident.** The sweep flagged its ~558 target-side rows as its headline discovery, *"not mentioned anywhere in the existing docs I can see."* It is: the pilot documents it at §3b as an unfinished Québécois conversion, and another worker is already on it — today's commit `6c1fd676` reads *"the repair is a relink — 556 of 572 clips already exist, 16 need rendering."* No action needed from this thread.

3. **Course count is 19, not 29.** My own derivation of the same 1,071 links returns exactly 19 distinct courses and 674 seed rows.

**Where it agrees and adds value:**

- **Blast radius is contained to `course_seeds`.** zho_for_eng legos (1,190 known links) and practice phrases (11,741) are **0 stale**. Confirms the damage never propagated.
- Phrase links to the May-3 batch: **4 links across 3 clips** (I counted clips, the sweep counted links — same underlying rows). All four have phrase text that *matches* the clip exactly, so they are legitimate reuse, not mislinks. Unchanged conclusion: check per clip before retiring any of the 237.
- **A real open gap it surfaced:** ~40 large post-May-3 render batches with the same *shape* (`role='known'`, `lego_id` NULL, `veracity_pass` NULL, `mastered/` keys) were **not content-verified** — the largest being `eng_for_tam` 2026-08-02 (611 rows) and `fra_ca_for_eng` 2026-07-29 (2,118 rows). Shape alone is not a defect and its spot-checks came back clean, but this is the honest residue of the liveness question and it maps onto §7 item 6.

---

*Read-only throughout. Comparator reproduced independently before any claim; audio verified from the live learner endpoint on 6 rows; punctuation ruling applied by type, not as one class.*
