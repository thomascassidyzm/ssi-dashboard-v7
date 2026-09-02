# Text ahead of audio — the standing count

**2 September 2026. Read-only pass against the live database, spot-checked against S3 directly. Nothing was rendered, edited, deleted or moved.**

Yesterday's forensic pass into twelve silent English prompts found roughly a thousand more by accident. This turns that accident into a number that gets counted every night at 05:10, per course, with an alarm on any increase.

**The number is 1,052.** That is how many prompts a learner currently cannot be given, in courses that have already been rendered, because the text was edited and no render pass followed.

---

## 1. The headline

| | Prompts |
|---|---|
| **Known-side prompts with no audio, in rendered courses** | **1,052** across 34 courses |
| — of which have never been rendered at all | 1,045 — fixing costs a TTS pass |
| — of which already have a clip saying exactly those words | 7 — a relink, free |
| Prompts whose attached audio no longer says what the text says | 30 |
| Target-side clips missing in the same courses | 1,181 |

"Prompt" here means a practice row — a phrase or a LEGO. Those are the rows the learner's walk actually pulls from.

## 2. What this costs a learner — it is not silence, it is absence

The delivery code drops any phrase missing its audio rather than schedule a cycle the player would only skip (`cycles.ts`, `phraseHasFullAudio`). So these 1,052 are not prompts that play silently. They are **authored content the learner never meets**, with no error message and no alarm anywhere. That is precisely why it had to be counted rather than watched for.

## 3. The mechanism, and one correction to the brief

The brief expected **stale audio** — a clip rendered before the text's last edit — to be the larger number, possibly much larger. **It is not, and the database explains why.**

Two triggers govern this. One nulls the audio link on *any* text change. The other, the only path that ever restores a link, fires only when brand-new audio is inserted. So editing a sentence does not leave the old recording attached to the new words — it leaves nothing attached at all.

Measured across every course, seed, LEGO and phrase in the estate: **107 rows** carry audio whose words no longer match the text, against **1,052** on the headline. Stale audio is a rarity here, not the iceberg. A *rise* in that 107 would be its own signal — it would mean something wrote a link directly, going round the triggers — so the nightly watches it separately.

There is a third thing that looks like staleness and is not: 810,000 rows whose clip predates the row's `updated_at` while saying exactly the right words. `updated_at` is bumped by bulk passes that never touch the text. That number is printed in the nightly report on purpose, labelled as noise, so nobody re-derives it in three months and believes it.

## 4. Which courses, how many, how old

Rendered courses with a gap, worst first. "Oldest" and "newest" are the dates of the text edits the audio never caught up with.

| Course | Status | Prompts | Target clips | Oldest | Newest |
|---|---|---:|---:|---|---|
| Spanish for English speakers | released | **329** | 451 | 6 Aug | 31 Aug |
| Chinese for English speakers | released | **138** | 149 | 16 Jul | 2 Aug |
| Chinese for Japanese speakers | beta | 90 | 53 | 27 Aug | 27 Aug |
| German for Japanese speakers | beta | 71 | 15 | 27 Aug | 27 Aug |
| Korean for English speakers | released | 52 | 57 | 2 Aug | 2 Aug |
| Spanish for Japanese speakers | beta | 41 | 14 | 27 Aug | 27 Aug |
| Italian for English speakers | released | 41 | 73 | 2 Aug | 6 Aug |
| Italian for Japanese speakers | beta | 40 | 15 | 27 Aug | 27 Aug |
| English for Marathi speakers | released | 32 | 18 | 6 Aug | 17 Aug |
| South Welsh for English speakers | released | 30 | 7 | 11 Jul | 13 Aug |
| Brazilian Portuguese for English speakers | beta | 24 | 45 | 29 Jul | 1 Sep |
| Portuguese for English speakers | released | 20 | 28 | 2 Aug | 3 Aug |
| Quebec French for English speakers | draft | 19 | 54 | 29 Jul | 17 Aug |
| French for Japanese speakers | beta | 17 | 4 | 27 Aug | 27 Aug |
| Modern Standard Arabic for English speakers | beta | 17 | 17 | 2 Aug | 2 Aug |
| North Welsh for English speakers | released | 16 | 0 | 15 Jul | 13 Aug |
| Mexican Spanish for English speakers | beta | 13 | 29 | 29 Jul | 1 Sep |
| Nepali for English speakers | beta | 12 | 2 | 28 Jul | 28 Jul |
| English for Portuguese speakers | beta | 10 | 33 | 6 Aug | 26 Aug |
| Danish for English speakers | beta | 9 | 0 | 11 Aug | 11 Aug |
| Basque for Spanish speakers | beta | 7 | 0 | 18 Aug | 18 Aug |
| Catalan, North Welsh rebuild, French for English | mixed | 4 each | 0–8 | 11 Jul | 1 Sep |
| Dutch, Turkish for English speakers | beta | 3 each | 0–8 | 28 Jul | 26 Aug |
| Russian, Italian-for-Italophones, Irish, Ukrainian, Sinhala, Hindi | beta | 1 each | 0–6 | 11 Jul | 17 Aug |
| English for Spanish speakers | beta | 0 | 0 | — | 23 rows with mismatched audio |

The oldest gap is **11 July**, seven weeks and change. Spanish's 329 remains the single biggest block, and the forensics found its bulk stamped 6 August in one batch — new phrases from a gap-fill pass that were never rendered.

## 5. Two things kept out of the headline on purpose

**Seed-level prompts — 12,793.** Seed audio feeds the listening and seed-phase reviews, and in the rendered courses 12,793 seed prompts have none. This is *not* drift: it stops at a uniform boundary near seed 300 across some thirty courses, which is a render-plan boundary — seed audio was simply never rendered past there. Real, worth a decision, but a different question, so it is counted on its own line and never mixed into the 1,052.

**Courses still being built — 166,142.** A course that has not had its render pass yet is not drifting; it is unfinished. Anything below 90% rendered goes in this bucket: Hakka (27,198), Finnish (15,542), Marathi (13,920), Telugu (12,605), Swiss German (11,233), Cantonese (10,165) and forty-one others. If a course crosses the line, the nightly reports it as a bucket move rather than as a mystery jump.

**A free 893.** Across the whole estate, 893 known-side prompts have no link but *do* already have a clip saying exactly those words — the relink trigger only fires when new audio is inserted, so an existing recording can sit unlinked indefinitely. 770 of them are Basque, 103 Breton. No render, no money, just a link. That is a decision for another day, but it is now visible.

## 6. Verified against S3, not against a database field

A database row is not proof of a file, so three checks were run directly against the bucket:

* **40 clips the count treats as present** — every one asked for by object key. **40 of 40 alive.** The link is a reliable proxy for a live file.
* **25 rows the count treats as missing** — searched the course's whole known-clip inventory for the exact text, using the database's own normaliser. **0 of 25 had a clip.** They are genuinely missing, not mislinked.
* **20 rows called "free relinks"** — the matching clip's object fetched from S3. **20 of 20 alive.** The relink really is free.

The count neither over- nor under-reports on this evidence.

**One thing I could not establish:** the sample is 85 objects out of ~800,000. It rules out a systematic hole, not a scattered one. A full sweep of every linked object is a separate, slower job and has not been run.

## 7. It is now counted every night

`ssi-audio-gap.timer` on watson-1, 05:10 London, chosen to miss the 03:00 CI run and the sweeps either side of it. No GitHub Actions — estate policy. Baseline snapshot written 2 September; one snapshot per night from here, so the series itself becomes the record.

It follows the nightly-CI doctrine: **quiet is silent, a rise is loud.**

* Nothing went up → it writes the snapshot and says nothing.
* Any course went up → one plain-English notice in the Popty channel, naming the courses and the amounts. A rise means somebody edited course text and no render followed.
* It could not count at all → also loud. A count that silently stops running is how this became invisible in the first place.

Read-only throughout: it never renders, never edits, never deletes.

## 8. What still needs Tom

Nothing in this pass required a decision, and none was taken. Two are now sitting in plain view:

1. **The 1,052 — render them, and in which voice?** Still open from yesterday's forensics; this only sharpens the number.
2. **The 12,793 seed prompts past seed 300** — was that boundary deliberate, or did seed audio just stop?

The 893 free relinks are a third, much smaller question, and the cheapest of the three.

---

*Tooling: `tools/qa/audio-gap/` — `count-audio-gap.cjs` (the count), `nightly.cjs` (the timer leg), `README.md` (why the categories are what they are), `count-audio-gap.test.cjs` (7 tests on the alarm logic, green).*
