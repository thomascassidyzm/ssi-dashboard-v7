# deu_at_for_eng — quote strip + target2 restore (2026-08-25)

**The course went from playing 2.1% of itself to playing 100% of itself, and Sascha's
225 recordings came through untouched.**

Authorised by Kai: *"let us strip the quote marks and restore the backed up voice clips."*
No TTS was generated. No audio file was deleted. No course status was changed —
`new_app_status` was not touched, deliberately: the repair was authorised, the launch
was not.

---

## Headline numbers

| | before | after |
|---|---|---|
| Practice-phrase rows the player would actually schedule | 258 / 12,551 (**2.1%**) | 12,551 / 12,551 (**100%**) |
| Rows with literal quote marks in their text | 529 | **0** |
| `target2` links — phrases / legos / seeds | 258 / 28 / 25 | 12,551 / 1,259 / 668 |
| Sascha's human clips in `course_audio` | 225 | **225 — unchanged** |

The playability rule is not an inference. `ssi-learning-app/api/courses/[code]/cycles.ts:295`:

```ts
/** All three clips present — the walk drops any phrase without them rather
 *  than schedule a cycle the player would only skip. */
function phraseHasFullAudio(p: CoursePhraseRow): boolean {
  return !!(p.known_audio_id && p.target1_audio_id && p.target2_audio_id)
}
```

`known` and `target1` were already 12,551/12,551. `target2` was the whole gap.

---

## Job 1 — the 529 quoted rows

**529 rows de-quoted on both sides. Zero ambiguous. Zero audio links lost.**

### What was actually there

Every quote mark in the entire course was a wrapper. Proven, not assumed — each of the
529 rows carried **exactly two** `"` characters on the known side and exactly two on the
target side, in first and last position, with no interior quote, no edge whitespace and
no empty payload. 2,116 characters were removed and every one of them was an ASCII
double quote. Nothing else in the text changed.

The check that establishes this rebuilds the original from the stripped form and requires
a byte-for-byte match (`'"' + inner + '"' === original`). All 529 passed, so **no row had
to be left behind**. `course_seeds` and `course_legos` had no quoted rows at all.

Seeds affected: 567–581 and 626–641 (31 seeds).

### Does stripping change the text-match key that links a row to its audio?

**Yes — and left alone it would have silently emptied all 1,058 audio slots on those rows.**

`course_practice_phrases` carries `trg_null_phrase_audio_on_text_change`. On any
known/target text edit it re-derives the link: it keeps the clip if
`normalize_text(clip.text)` still equals `normalize_text(new_text)`, otherwise it looks
for a same-voice clip speaking the new text, and if there isn't one it **nulls the link**.

`normalize_text` is `rtrim(lower(trim(input_text)), '.?!¿¡。？！')`. It strips trailing
sentence punctuation. **It does not strip quote marks.** So `"Zeit"` and `Zeit` are two
different keys, and a naive strip makes every clip on those rows look stale.

That is not a hypothesis. It was measured on a deliberate 5-row calibration batch before
anything else was touched:

```
link_drops: target1_audio_id nulled-no-same-voice-clip-for-new-text  5
            known_audio_id   nulled-no-same-voice-clip-for-new-text  5
post-state: known links 0/5, target1 links 0/5
```

Five clean rows, five silent rows. Across all 529 that would have been 1,058 dead slots —
a course made *worse* by a text fix, and the exact failure `docs/fix-agent-rules.md` §6
warns about.

### Why the existing clips are still the right audio

`course_audio.word_boundaries` records what the TTS engine actually uttered. Across all
529 target1 clips the closing `"` appears as its own token 467 times, and its duration is:

- **average 42 ms, maximum 100 ms, zero tokens over 150 ms**

That is punctuation silence, not speech. The opening quote isn't even a separate token —
it is glued to the first word (`"de`, `"Zeit`). **The voice never read the quote marks
aloud.** They were a defect the learner could *see* and not one they could hear, so the
recorded audio is already correct for the de-quoted text and the right move was to keep
every clip, not to re-render one.

### How the links were kept

The clip labels were corrected first, so the trigger's own "the clip still speaks this
text" branch does the work:

1. **925 clip labels de-quoted** in `course_audio.text` (known + target1). This is a
   metadata correction, not an audio change — the file is byte-identical and the label now
   describes what the clip demonstrably says. `trg_course_audio_normalize` recomputed
   `text_normalized` on write (verified: 0 of 925 still normalise with a quote).
2. **111 clips left quoted on purpose.** Stripping them would have collided with an
   existing same-voice clip already holding the unquoted text —
   `unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)`.
   Skipping them is the better outcome anyway: the trigger's
   `audio_id_for_text_same_voice` found those pre-existing twins and **relinked 59 target1
   and 55 known rows onto them**, which is a cleaner clip than the one we'd have edited.
3. **524 phrase rows updated**, and the trigger preserved or relinked every one.
4. The 5 calibration rows were repaired from the pre-change backup, each verified to
   point at a clip whose text matches before the write.

**Result: `known` 12,551/12,551 and `target1` 12,551/12,551 — no net link loss.** Across
the whole affected seed range (1,289 rows, not just the 529), every row's known clip and
target1 clip normalise-match its text. Zero missing, zero mismatched.

Every update was guarded on the row still holding the exact pre-change text, so a
concurrent writer could not be silently overwritten.

---

## Job 2 — restoring the 12,411 backed-up clips

**12,411 clips restored. 12,293 phrase slots, 1,231 lego slots and 643 seed slots filled.
Sascha lost nothing.**

### The backup was complete — checked before trusting it

`docs/audio/deu_at_for_eng-target2-clear-snapshot-2026-08-06.json.gz`, committed at
`40d54dbc2`, holds all 12,411 deleted `course_audio` rows with every column, plus the
link maps for 12,551 phrases / 1,259 legos / 668 seeds.

- 12,411 audio rows, **12,411 distinct ids, 12,411 distinct `s3_key`** — no gaps, no dupes
- every `target2_audio_id` referenced by the 12,551 phrase links **resolves inside the
  snapshot** (12,551/12,551)
- **0 rows missing an `s3_key`**

No shortfall, so the no-TTS limit was never in tension with finishing the job.

**The S3 objects are genuinely still there**, checked with a calibrated probe rather than
assumed. Calibration first: a known-live `target1` key returned 36,576 bytes, and the same
key with `.DOES-NOT-EXIST` appended returned null — so the probe can tell alive from dead.
Then a 400-key sample strided across the whole restored set:

```
RESTORED SET: sampled 400 of 12411 -> alive 400, dead 0, size-mismatch 0
```

`file_size_bytes` in the snapshot matched the real object length on every one, so these
are complete objects, not alive-but-truncated.

### Trap (a): the automatic linker refuses these clips — confirmed in the function body

`audio_autolink` (AFTER INSERT on `course_audio`) → `link_audio_to_content()` opens with a
voice gate:

```sql
v_wanted := audio_configured_voice(NEW.course_code, NEW.role);
IF NOT audio_voice_matches(v_wanted, NEW.voice_id) THEN
  INSERT INTO relink_refusals (...)   -- log and link nothing
```

Live values: configured target2 voice is `human_human_sasha_wanasky_deu_at`; the restored
clips are `azure_de-AT-JonasNeural`; `audio_voice_matches` returns **false**. So the links
had to be written directly, exactly as briefed.

Even past the gate, every branch of that function is `WHERE ... target2_audio_id IS NULL`.
It only ever fills empty slots.

### Trap (b): the guard on Sascha's recordings

**The guard is `WHERE target2_audio_id IS NULL`, and it is safe by construction rather
than by a list that could go stale.**

First, the fact that makes it sound: every occupied `target2` slot in the course was hers.
311 slots, and all 311 resolve to `origin = 'human'`, `voice_id = human_sasha_wanasky_deu_at`
— **0 non-human, 0 dangling**. So a write that refuses to touch a non-NULL slot cannot
touch her, and it does not depend on my enumeration being right.

Her occupancy: **258 practice phrases + 28 legos + 25 seeds = 311 slots, from 225 clips**
(several slots share a clip). That is the brief's 311, independently reproduced.

**Proven on a small batch before the full run**, exactly as required:

```
BEFORE  human clips: 225   occupied target2 slots p/l/s: 258 28 25
clips inserted: 20 of 20
linked course_practice_phrases 68 (candidates 91)   <- 23 skipped, all hers
linked course_legos             1 (candidates  4)   <-  3 skipped, all hers
linked course_seeds             0 (candidates  1)   <-  1 skipped, hers
AFTER   human clips: 225   slots still held by Sascha p/l/s: 258 28 25
```

27 of the first batch's candidate slots were hers, the guard skipped all 27, and her
counts were identical before and after. Only then was the full set run.

Full run, and the arithmetic closes exactly:

| table | candidates | linked | skipped | skipped = |
|---|---|---|---|---|
| `course_practice_phrases` | 12,551 | 11,944 | 607 | 349 already restored + **258 Sascha** |
| `course_legos` | 1,259 | 1,230 | 29 | 1 already restored + **28 Sascha** |
| `course_seeds` | 668 | 643 | 25 | **25 Sascha** |

`human clips AFTER: 225 UNCHANGED`.

All 12,551 phrase `target2` links resolve to a live clip, all have an `s3_key`, all are
role `target2`. Zero dangling.

*(The insert phase took longer than one 10-minute window because `audio_autolink` runs
three correlated subqueries per row. All 12,411 clips landed; the link phase was completed
as a separate pass. No partial state was left behind — the final counts above are the
verification.)*

---

## Sascha's 225 links: parked, not deleted

Kai's call: for the beta, one real human voice appearing for a single line among synthetic
voices at unpredictable points reads as a fault, so the course speaks with one voice until
there is enough human audio to switch wholesale.

**311 slots were pointed at the restored synthetic clip. Nothing was deleted.**

- her **225 `course_audio` rows are still there** — all 225 with an intact `s3_key` and a
  non-zero `duration_ms`
- **all 225 of her S3 audio objects were probed directly and all 225 came back alive**
  (`SASCHA: 225 clips -> alive 225, dead 0`), using the same calibrated probe as above —
  so this is her recordings verified at file level, not merely a row count
- every slot had a synthetic replacement available (311 of 311), so parking left **no
  silent slots**
- `target2` now resolves to exactly **one voice** across the course

### Putting them back — one command

```
APPLY=1 node tools/deu-at/unpark-sascha-links.cjs
```

It reads `docs/audio/deu_at_for_eng-sascha-parked-links-2026-08-25.json` (311 entries,
each recording `table`, `slot_id`, `human_audio_id`, `parked_to_synthetic`) and reverses
each swap. It only reverses a slot that still holds exactly what we parked it to, so a
newer delivery is never clobbered; drifted slots are reported and left alone.

**Verified by dry run: `would restore: 311 of 311`.**

---

## Job 3 — will Sascha's next recordings overwrite the restored clips?

**No — they will not overwrite anything. Her clips will land in the database and reach no
learner until a person deliberately puts them into the slots.** Of the three possible
answers, this is (2): the ingest path silently skips a slot that is already filled.

That is a real consequence of this restore and Kai should weigh it before we call the
course finished. It is also, for the beta, the *intended* state — the parking decision
says her audio should not reach learners yet — but it must be a decision, not a surprise
in three weeks.

### The two steps, and what each one does

**Step 1 — the upload.** A take is filed and a `course_audio` row is written with
`origin: 'human'` (`services/voice-engine/db.cjs:194`, `services/script-take-filing.cjs:175`).
That part works and will keep working. Her clip count will keep climbing.

**Step 2 — the linking.** This is where it stops, in two independent places:

- **The automatic path refuses on voice.** `audio_autolink` (AFTER INSERT on
  `course_audio`) calls `link_audio_to_content()`, which opens with a voice gate and logs
  a refusal instead of linking when the clip's voice isn't the configured one. **This is
  already failing for her, and has been since before this restore** — see finding 1 below.
- **The manual relink path only fills empty slots.** `linkAudioIdsBatch()` in
  `services/phases/phase8-audio-v13.cjs:1731` is the function that links audio to content,
  including its `humanOnly: true` "human-first pre-pass" (called at line 1674). Its own
  header says it *"batch-updates each table's NULL audio_id columns"*, and the query
  filters `.is(audioCol, null)`. **Before this restore, every target2 slot she recorded
  for was NULL, so this pass would have adopted her clip. After it, none are NULL, so this
  pass will find nothing and report zero.**

There is exactly one writer that *does* overwrite: `linkComponentAudio()`
(`phase8-audio-v13.cjs:6352`), which updates whenever the mapped clip differs from the
current one and whose `pickPreferredAudioRow` prefers `human > newest`. But it only
touches **component** phrases, and it only runs from the phase8 components-generation
route — an operator action that also generates TTS. It is not a general answer and it is
not something that happens on its own.

### So: exactly what, and exactly who

**What.** For the rows Sascha has newly recorded, the target2 slot must be emptied before
the relink runs — `UPDATE … SET target2_audio_id = NULL` for those specific slots — and
then the phase8 human-first pre-pass will adopt her clips. Writing her clip id straight
into the slot works equally well; `tools/deu-at/unpark-sascha-links.cjs` already does
exactly this shape of write for the 311 parked ones.

**And first, the voice id has to be fixed**, or the automatic path will keep refusing her
regardless of whether the slot is empty (finding 1).

**Who.** Whoever runs the audio pass for `deu_at_for_eng` — this is Kai's call, not a
thing that any tool currently does by itself. Nobody is going to be prompted. There is no
alert, no queue entry and no error: the pass will simply report zero linked and look like
a clean run.

**The practical read for the beta:** because Kai has chosen to park her audio anyway, the
course is in the right state today, and the cost of this is deferred rather than paid. The
thing to protect against is the moment the decision reverses — at that point somebody has
to run the unpark tool *and* clear the slots for everything she has delivered since.

---

## Explicit gaps and things Kai should know

1. **A pre-existing bug: the autolink trigger has been refusing Sascha's own clips since
   19 August, and this restore did not cause it.** The configured target2 voice reads
   `human_human_sasha_wanasky_deu_at` — a doubled `human_` prefix — while her clips carry
   `human_sasha_wanasky_deu_at`. `audio_voice_matches` returns false, so
   `relink_refusals` holds **319 voice-mismatch rows against her clips**, dated 19, 21 and
   23 August, before this job ran. Her 311 slots were therefore linked by some other
   writer, not by the automatic path.
2. **49 presentation clips carry the quote marks inside the sentence they speak** —
   `The German for: '"is"', is:` — linked to 61 component rows inside the 529. **Not
   fixed:** correcting them means re-rendering, which needs Kai's approval and money, and
   the no-TTS limit stands. **Not verified either:** these are `xai` clips with no
   `word_boundaries`, so unlike the target1 clips there is no evidence available as to
   whether the quotes are audible. Someone should listen to one before deciding. The links
   were left intact rather than nulled, because nulling them would create 61 certainly-silent
   presentation slots to fix a defect that may not be audible at all.
3. **This restore wrote 14,167 rows into `relink_refusals`** (2026-08-25, all
   `azure_de-AT-JonasNeural`, all `voice-mismatch`) — unavoidable log noise from inserting
   12,411 gate-refused clips. They were **left in place**, not deleted: they are a
   production log and removing them was not authorised. They do bury the 319 rows in
   finding 1, so anyone reading that table should filter by date and `candidate_voice`.
4. **`recording_provenance` holds 0 rows for Sascha's 225 clips.** Pre-existing — this work
   never wrote to that table. It means her takes have no recorded consent reference,
   device, or speaker metadata attached in the DB. Flagging it, not fixing it.
5. **111 clip labels in `course_audio.text` still carry quote marks** (the collision set in
   Job 1), as do 519 of the restored target2 labels for the same reason. This is cosmetic —
   the labels differ from the phrase text, the audio is correct and the links are written
   by id. The consequence worth knowing: a *future* text edit to one of those rows will
   trip the same nulling trigger. The fix, if wanted, is to repoint those rows at their
   unquoted twin and orphan the quoted clip.
6. **The course status was not changed.** `new_app_status` is untouched.

## Backups

- pre-change state (529 quoted rows with their links, all 225 Sascha clips, all 311
  occupied slots) — `$CS_SCRATCH/pre-restore-state.json` on the machine that ran this
- the restore source — `docs/audio/deu_at_for_eng-target2-clear-snapshot-2026-08-06.json.gz`
  at `40d54dbc2`, already in git
- the park ledger — `docs/audio/deu_at_for_eng-sascha-parked-links-2026-08-25.json`, in git
