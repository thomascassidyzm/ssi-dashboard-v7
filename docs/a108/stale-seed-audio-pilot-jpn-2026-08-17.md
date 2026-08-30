# Stale seed audio — the jpn_for_eng pilot

**Commissioned by Kai, 2026-08-17:** *"repair the 674 seed rows course-by-course, and sanity-check each by hand — there might be unexpected things we miss by just blindly regenerating the audio."*

**Headline: the hand sanity-check earned its keep before a single clip was rendered. jpn_for_eng has nothing to repair — not 155 rows, zero. And the four other courses named as worst-affected are, between them, wrong by a factor of three in both directions.**

Nothing was rendered. Nothing was written. No money was spent.

---

## 1. What the pilot was asked to fix, and what is actually there

The commissioning numbers were: zho_for_eng 398, gle_for_eng 299, fra_ca_for_eng 286, por_for_eng 270, jpn_for_eng 155 — with the honest caveat *"numbers overlap-uncertain — re-derive."* Re-derived, they do not survive.

There are **two comparators** in play and the brief carries one course-level number from each.

**The correct comparator** — seed text vs `course_audio.text_normalized` **OR** the clip's real text re-normalised now. This is the tool's own comparator, and the reason for the `OR` is the 41,900-row artefact the edit-impact work documented: `normalize_text()` was redefined to strip a trailing `.?!¿¡。？！` and the stored column was never backfilled, so 41,900 clips hold a normalisation the current function would not produce.

Run live against the estate, it returns **1,071 stale links across 674 seed rows in 19 courses — 285 known, 395 target1, 391 target2.** That is an exact match for the figure the edit-impact page published, so the comparator is calibrated: same query, same answer, independently reconstructed.

| course | stale links | stale seed rows | known | target1 | target2 |
|---|---|---|---|---|---|
| fra_ca_for_eng | 572 | 286 | 0 | 286 | 286 |
| zho_for_eng | 256 | 240 | 236 | 10 | 10 |
| hye_for_eng | 124 | 62 | 0 | 62 | 62 |
| eus_for_eng | 29 | 15 | 1 | 14 | 14 |
| ell_for_eng | 18 | 9 | 0 | 9 | 9 |
| swe_for_eng | 12 | 12 | 12 | 0 | 0 |
| gle_for_eng | 10 | 10 | 10 | 0 | 0 |
| eng_for_tam | 8 | 8 | 8 | 0 | 0 |
| eng_for_ita | 8 | 8 | 8 | 0 | 0 |
| tur_for_eng | 6 | 6 | 6 | 0 | 0 |
| kor_for_eng | 6 | 3 | 0 | 3 | 3 |
| fra_for_eng | 4 | 4 | 0 | 4 | 0 |
| hrv_for_eng | 4 | 3 | 2 | 1 | 1 |
| por_br_for_eng | 4 | 2 | 0 | 2 | 2 |
| spa_for_eng | 3 | 2 | 1 | 1 | 1 |
| nld_for_eng | 2 | 1 | 0 | 1 | 1 |
| deu_for_eng | 2 | 1 | 0 | 1 | 1 |
| eng_for_sin | 2 | 1 | 0 | 1 | 1 |
| fas_for_eng | 1 | 1 | 1 | 0 | 0 |
| **total** | **1,071** | **674** | **285** | **395** | **391** |

**`jpn_for_eng` is not on that list. Neither is `por_for_eng`.**

**The inflated comparator** — seed text vs the stored `text_normalized` column *alone*, with no live re-normalisation. This is the one the edit-impact page explicitly warns reads `1,033/1,305/1,304` because of the 41,900-row artefact. Run per-course, it returns:

| course | stale seed rows (stored-column only) |
|---|---|
| gle_for_eng | **299** |
| zho_for_eng | **398** |
| fra_ca_for_eng | **286** |
| por_for_eng | **270** |
| jpn_for_eng | **155** |

Those are the brief's five numbers, to the digit, in order. **The 674 headline came from the correct comparator; the per-course breakdown that named jpn came from the inflated one.** The two were never comparable, and the pilot was pointed at a course selected by the wrong one.

---

## 2. jpn_for_eng, row by row

668 seeds, all three roles linked on every one — 2,004 links, no holes.

- **Correct comparator: 0 stale.** known 668/668 match, target1 668/668, target2 668/668.
- **Inflated comparator: 310 flagged** (155 target1 + 155 target2; the known side is clean under both).

All 310 classify identically, and it is class (d) — normalisation-only, no defect:

| seed | seed text | what the clip says | stored `text_normalized` | live `normalize_text(clip.text)` |
|---|---|---|---|---|
| 1 | 今、一緒に日本語を話したい | 今、一緒に日本語を話したい**。** | 今、一緒に日本語を話したい**。** | 今、一緒に日本語を話したい |
| 3 | できるだけ、たくさん話したい | できるだけ、たくさん話したい**。** | できるだけ、たくさん話したい**。** | できるだけ、たくさん話したい |
| 14 | 一日中、日本語を話してる**？** | 一日中、日本語を話してる**？** | 一日中、日本語を話してる**？** | 一日中、日本語を話してる |

The clip speaks the seed's exact sentence. The only difference is a trailing `。` or `？` that the *current* `normalize_text` strips and the *stored column* still carries, because the column predates the redefinition. Counted mechanically: of the 310 flagged links, **310 are explained by the stale stored column and 0 are genuinely different text.**

**A blind repair pass would have re-rendered 310 Japanese clips to replace them with clips saying exactly the same words.** That is the unexpected thing Kai predicted, and it is worth stating in its strongest form: the defect was never in the audio, it was in the measurement, and the repair would have been indistinguishable from success — new clips, correct text, matching ASR, a clean verification report, and not one learner-audible improvement.

**Class table for the pilot course:**

| class | meaning | jpn_for_eng |
|---|---|---|
| (a) audio right / text drifted | the TEXT is the defect | 0 |
| (b) text right / audio stale | re-render | **0** |
| (c) both changed / divergent authorship | judgement | 0 |
| (d) normalisation-only | no defect — fix the comparator's view, not the content | **310** |

Repaired: **0 of 0**. Held for judgement: **0**. The correct outcome for this course is to touch nothing.

---

## 3. The unexpected things — what the hand check found in the 674 that IS real

The pilot was to produce a method the other courses inherit, and jpn yielded no rows to exercise it on. So the classification step was run read-only across the genuinely-stale set. **Nothing below was repaired — it is out of pilot scope and is reported for Kai's judgement.** What it establishes is that the four classes are not evenly distributed, and that at least two of these courses must not be handed to a bulk re-render.

### 3a. zho_for_eng's known side is not stale — it is linked to the wrong sentence entirely

236 of the 240 zho stale rows are on the **known (English) side**, and the clip does not speak a drifted version of the seed's English. It speaks **an unrelated English sentence**:

| seed | seed's English text | what the linked clip actually says |
|---|---|---|
| 351 | No he didn't want to leave me on my own. | *"I want to see the new movie th…"* |
| 353 | She needed to run around the field. | *"I need to make a decision soon…"* |
| 357 | No she just wanted to send her a message. | *"she wants to buy a new car"* |
| 361 | He was quiet. | *"he said that he's too busy to…"* |
| 373 | It was beautiful. | *"very beautiful"* → *"he said that he'll be there in…"* |

This is a different failure from the one the campaign was scoped around. A stale link points at *the previous version of this sentence*; these point at *somebody else's sentence*. The seed rows were last touched 2026-07-02→07-11 and the clips date from 2026-02-16→05-03, so the link survived an edit — but the clip it survived onto was never this seed's clip. **236 Chinese-course seeds are reading a learner an English prompt that has nothing to do with the Chinese they are about to hear.** This is the most learner-damaging finding in the sweep and it is the one worth acting on first.

### 3b. fra_ca_for_eng is a dialect conversion whose audio was never re-rendered

All 572 fra_ca stale links are target-side (286 seeds × target1 + target2; the known side is 100% clean). The pattern is uniform:

| seed | seed text (Québécois) | clip says (metropolitan French) |
|---|---|---|
| 1 | J'veux parler **québécois** avec toi **là** | Je veux parler **français** avec toi **maintenant** |
| 2 | J'ess**a**ye d'apprendre | j'ess**ai**e d'apprendre |
| 3 | comment parler **le plus souvent possible** | comment parler **aussi souvent que possible** |
| 4 | comment dire quelque chose en **québécois** | comment dire quelque chose en **français** |
| 5 | **M'as** pratiquer à parler avec quelqu'un d'autre | **Je vais m'entraîner** à parler avec quelqu'un… |
| 6 | J'essaye de **me rappeler un mot** | j'essaie de **me souvenir d'un mot** |

The text was converted to Québécois (seeds touched 2026-07-16→08-06); the audio is the pre-conversion metropolitan French (clips 2026-04-16→28) across 4 voices. Mechanically this is textbook class (b) — text right, audio stale, re-render. **But it is not a repair, it is the second half of an unfinished course conversion**, and it carries a question a bulk render would answer by accident: *can the four voices currently on this course actually produce Québécois?* Rendering `M'as pratiquer` through a metropolitan French voice gives you correct words in the wrong accent, which is a new defect wearing the old one's clothes. This one needs a voice decision before a render decision.

### 3c. eus_for_eng is three different campaigns overlapping

15 seeds, and the classes are genuinely mixed within one course — which is the case that proves per-row classification cannot be skipped:

- **class (b), grammar repair** — `Ez naiz erraz gogoratu` vs clip `ez dut erraz gogoratu`; `gustatzen zaio` vs clip `gustuko du`. The text was corrected, the audio speaks the error.
- **class (b), the his/her campaign** — seed 20 known reads *"You want to learn **his** name quickly"*, the clip says *"**her** name"*. Same expansion campaign as the recent fin work.
- **class (a), the audio is right and the TEXT is suspect** — seed 190 target reads `Galdera batzuk egin al diezazkizut?` and the clip says `¿Galdera batzuk egin al diezazkizut?` — a Spanish inverted question mark voiced into a Basque sentence. The *clip* carries the artefact here, so this is a clip-text hygiene defect, not a seed defect; re-rendering from the seed text is right but the reason matters for the log.

### 3d. gle_for_eng — the number that triggered Kai's hold is an artefact

The brief flagged gle's **299** as recolouring the Irish quality picture, with instructions to flag and not touch. Re-derived: **gle_for_eng has 10 stale links across 10 seeds, all known-side, one voice, clips from 2026-02-18.** The 299 is the stored-column artefact.

**Untouched, as instructed** — but Kai should know before the decision lands that this campaign contributes 10 rows to the Irish picture, not 299.

### 3e. por_for_eng has no stale seed audio at all

270 under the inflated comparator; **0** under the correct one. Like jpn, entirely artefact.

---

## 4. Gaps — what this pilot did NOT establish

Reported as gaps rather than papered over.

1. **The bytes were never checked.** Every finding above compares the seed text against `course_audio.text` — which is *metadata about* a clip, not the clip. The pilot's own premise is that a row can claim one thing while the audio says another, so "jpn has 0 stale" is proven to the row level and **not** to the byte level. The planned ASR spot-check of 20 jpn clips against their seed text did not run: **Supabase became unreachable from this machine mid-run** (pooler `Failed to connect to database: {:error, :timeout}`, and the REST endpoint hung too) and had not recovered. Step 3 of the runbook below exists specifically to close this, and it should be run on jpn before the course is declared clean.
2. **Relinkability was not measured.** The query that splits the 1,071 stale links into *"a correct clip already exists in this course, role and voice — relink, free"* versus *"nothing matches — this is the only bucket that costs TTS"* timed out and then lost the connection. Given `tools/audio-link-reconcile.cjs`'s history — 1,324 slots in `ara_lb_for_eng` that were linkable rather than missing — this number could remove most of the render spend from the campaign and it should be taken before any budget is approved.
3. **No adversarial second opinion was taken** on the class assignments in §3, for the same outage reason.
4. **The classification in §3 is sampled, not exhaustive** for fra_ca (572) and zho (256). The patterns shown were uniform across every row inspected, but "uniform across the sample" is not "uniform".

---

## 5. THE RUNBOOK — per-course stale seed audio repair

Written to be queued as a background job, one course at a time, per Kai's *"a bit at a time in the background."* Steps 0–2 are read-only and cost nothing; **step 4 is the first step that spends money and it has a gate in front of it.**

### Step 0 — derive with the correct comparator. Never the stored column alone.

```sql
WITH r AS (
  SELECT s.course_code, s.seed_number, 'known' AS role, s.known_text AS seed_text, s.known_audio_id AS aid
    FROM course_seeds s WHERE s.course_code = :course AND s.known_audio_id IS NOT NULL
  UNION ALL SELECT s.course_code, s.seed_number, 'target1', s.target_text, s.target1_audio_id
    FROM course_seeds s WHERE s.course_code = :course AND s.target1_audio_id IS NOT NULL
  UNION ALL SELECT s.course_code, s.seed_number, 'target2', s.target_text, s.target2_audio_id
    FROM course_seeds s WHERE s.course_code = :course AND s.target2_audio_id IS NOT NULL
)
SELECT r.*, ca.text AS clip_text, ca.voice_id, ca.language, ca.origin, ca.created_at
FROM r JOIN course_audio ca ON ca.id = r.aid
WHERE NOT ( normalize_text(r.seed_text) = ca.text_normalized          -- index-assisted first disjunct
         OR normalize_text(r.seed_text) = normalize_text(ca.text) );  -- the authority
```

**The `OR` is not optional and it is not a widening for safety.** Drop it and you inherit the 41,900-row `text_normalized` backfill artefact, which is what put a course with zero defects at the top of a repair queue. If a course's count collapses when you add the second disjunct, the course is clean and the runbook ends here — **write that down and close it, do not go looking for something to fix.**

Calibrate before trusting: pick five seeds the query calls *clean* and eyeball them. A comparator that flags everything is as useless as one that flags nothing.

### Step 1 — classify every row before fixing anything. This is the gate.

Per row, on the seed text against the clip's real `text`:

| class | test | action |
|---|---|---|
| **(d) normalisation-only** | live-normalised clip text **equals** live-normalised seed text | **no defect.** Do not render. The row is a comparator artefact |
| **(b) text right / audio stale** | genuinely different words, and the seed text is the intended content | eligible for repair — go to step 2 |
| **(a) audio right / text drifted** | the clip is correct and the *seed text* carries the error (typos, a stray `¿`, an unintended edit) | **do not render.** List for judgement — the fix is a text fix |
| **(c) both changed / divergent authorship** | the two are different intentional versions, or the clip speaks an unrelated sentence, or the course is mid-conversion | **do not render.** List for judgement |

Two hard rules, both learned here:

- **A whole course landing in one class is a finding about the campaign, not a green light.** fra_ca's 286 uniform rows are an unfinished dialect conversion; zho's 236 uniform rows are wrong-sentence links. Both look like clean class (b) from a distance. Neither should be bulk-rendered without a decision above it.
- **Classes mix inside a single course.** eus_for_eng's 15 rows hold a grammar campaign, a his/her campaign and one class-(a) text defect. Per-row, always.

### Step 2 — relink before you render. Free beats paid.

For each class-(b) row, ask whether the course already owns a clip speaking the seed text in that role:

```sql
SELECT id, voice_id, origin, created_at FROM course_audio
WHERE course_code = :course AND role = :role
  AND (text_normalized = normalize_text(:seed_text) OR normalize_text(text) = normalize_text(:seed_text))
ORDER BY (origin='human') DESC, created_at DESC;
```

Same voice → relink, zero cost. Different voice → **this is a voice swap and is a decision, not a repair** (`docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b); surface it, do not take it silently. Nothing → step 4.

Use `tools/audio-link-reconcile.cjs` rather than hand SQL; it already models the four buckets and it never spends.

### Step 3 — verify the bytes on the sample, not the row.

Before declaring any course clean *or* queueing any render, ASR-check ~20 clips against their seed text end-to-end. A `course_audio` row that says the right thing is exactly what has been lying to everybody (`tools/verify-relinked-audio-bytes.cjs`). This step is what §4 gap 1 leaves open on jpn.

### Step 4 — render only what survived. **Approval gate.**

Only class (b) rows with no relinkable clip. Never generate TTS without showing the plan and getting explicit approval; the standing route is to **queue an audio pass**, not to run TTS:

```
node tools/course-optimization/queue-audio-pass.cjs <course> --reason "stale seed audio repair — N class-(b) rows"
```

Course's own voice from `courses.voice_pool_key` (**never** `poolKeyFor(target_lang)` — regional variants share a pool key otherwise), compressor-free chain (667a6e09), spares, the seven gates including text-voiced-per-token.

### Step 5 — make before break, then invalidate.

Generate → verify each new clip alive and correct-voiced → swap links atomically → only then retire the old clip. Never the other order; the 2026-08-03 fra_ca purge left ~2,000 slots silent for two days by deleting first. Then bump `content_stamp` / `courses.audio_stamp`, and verify on served bytes through the production endpoint.

### Step 6 — write the ledger.

Per course: rows derived, class counts, relinked, rendered, **held for judgement and why**. A course that ends at "0 to repair" is a completed run with a real result — record it as one.

---

## 6. Recommendation

1. **Close jpn_for_eng as clean** once step 3's byte check runs. No render, no spend.
2. **Re-point the campaign at the corrected ledger.** It is 674 rows across 19 courses, but 828 of the 1,071 links sit in just two courses, and *neither is a straightforward re-render*.
3. **zho_for_eng's 236 wrong-sentence known-side links are the priority** — a learner is being read an unrelated English prompt. Investigate the mislink's origin before repairing; a link that points at somebody else's clip suggests a bad autolink, and repairing 236 rows without finding the cause invites the 237th.
4. **fra_ca_for_eng needs a voice ruling before a render ruling.** Its 286 seeds are an unfinished Québécois conversion; ask whether the course's voices can speak Québécois at all.
5. **Tell Kai that gle_for_eng contributes 10 rows, not 299**, before the Irish decision lands on the larger number. Still untouched, as instructed.
6. **Run step 2's relinkability count first** on the whole 1,071. It costs nothing and may remove most of the render spend from the campaign.

---

*Pilot run 2026-08-17. Read-only throughout: no content written, no audio rendered, no links changed, no approval spent.*
