# deu_at_for_eng — quote strip + target2 restore (2026-08-25)

**The course went from playing 2.1% of itself to playing 100% of itself, and Sasha's
225 recordings came through untouched.**

Authorised by Kai: *"let us strip the quote marks and restore the backed up voice clips."*
Then, on a later ruling — *"I would like you to push Austrian live (as beta) as soon as
you can"* — **the course was flipped to beta and is now live to learners.** No TTS was
generated. No audio file was deleted. Nothing of Sasha's was deleted.

The flip was done **last**, only after steps 1–5 below were each proven, and then
verified end to end against the deployed learner app rather than from the database row.

---

## Headline numbers

| | before | after |
|---|---|---|
| Practice-phrase rows the player would actually schedule | 258 / 12,551 (**2.1%**) | 12,551 / 12,551 (**100%**) |
| Rows with literal quote marks in their text | 529 | **0** |
| `target2` links — phrases / legos / seeds | 258 / 28 / 25 | 12,551 / 1,259 / 668 |
| Sasha's human clips in `course_audio` | 225 | **225 — unchanged** |

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
Sasha lost nothing.**

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
RESTORED SET: sampled 400 of 12411 -> alive 400, dead 0
```

Worker **#558** repeated this independently with its own calibration and a 420-key stride
sample: **420 alive, 0 dead**.

**One correction, caught by #558.** An earlier draft of this report claimed the snapshot's
`file_size_bytes` matched the real object length on every clip. That claim was vacuous:
**all 12,411 snapshot rows have `file_size_bytes: null`** — the field was never populated
when the snapshot was taken — and both probes silently skipped the comparison rather than
failing it. There is no size cross-check available, and it should not be counted as
evidence. What can honestly be said is that no sampled object was zero-byte or truncated:
lengths ran 22,176–55,584 bytes, consistent with real short MP3 clips.

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

### Trap (b): the guard on Sasha's recordings

**The guard is `WHERE target2_audio_id IS NULL`, and it is safe by construction rather
than by a list that could go stale.**

First, the fact that makes it sound: every occupied `target2` slot in the course was theirs.
311 slots, and all 311 resolve to `origin = 'human'`, `voice_id = human_sasha_wanasky_deu_at`
— **0 non-human, 0 dangling**. So a write that refuses to touch a non-NULL slot cannot
touch them, and it does not depend on my enumeration being right.

Their occupancy: **258 practice phrases + 28 legos + 25 seeds = 311 slots, from 225 clips**
(several slots share a clip). That is the brief's 311, independently reproduced.

**Proven on a small batch before the full run**, exactly as required:

```
BEFORE  human clips: 225   occupied target2 slots p/l/s: 258 28 25
clips inserted: 20 of 20
linked course_practice_phrases 68 (candidates 91)   <- 23 skipped, all theirs
linked course_legos             1 (candidates  4)   <-  3 skipped, all theirs
linked course_seeds             0 (candidates  1)   <-  1 skipped, theirs
AFTER   human clips: 225   slots still held by Sasha p/l/s: 258 28 25
```

27 of the first batch's candidate slots were theirs, the guard skipped all 27, and their
counts were identical before and after. Only then was the full set run.

Full run, and the arithmetic closes exactly:

| table | candidates | linked | skipped | skipped = |
|---|---|---|---|---|
| `course_practice_phrases` | 12,551 | 11,944 | 607 | 349 already restored + **258 Sasha** |
| `course_legos` | 1,259 | 1,230 | 29 | 1 already restored + **28 Sasha** |
| `course_seeds` | 668 | 643 | 25 | **25 Sasha** |

`human clips AFTER: 225 UNCHANGED`.

All 12,551 phrase `target2` links resolve to a live clip, all have an `s3_key`, all are
role `target2`. Zero dangling.

*(The insert phase took longer than one 10-minute window because `audio_autolink` runs
three correlated subqueries per row. All 12,411 clips landed; the link phase was completed
as a separate pass. No partial state was left behind — the final counts above are the
verification.)*

---

## Sasha's 225 links: parked, not deleted

Kai's call: for the beta, one real human voice appearing for a single line among synthetic
voices at unpredictable points reads as a fault, so the course speaks with one voice until
there is enough human audio to switch wholesale.

**311 slots were pointed at the restored synthetic clip. Nothing was deleted.**

- their **225 `course_audio` rows are still there** — all 225 with an intact `s3_key` and a
  non-zero `duration_ms`
- **all 225 of their S3 audio objects were probed directly and all 225 came back alive**
  (`SASHA: 225 clips -> alive 225, dead 0`), using the same calibrated probe as above —
  so this is their recordings verified at file level, not merely a row count
- every slot had a synthetic replacement available (311 of 311), so parking left **no
  silent slots**
- `target2` now resolves to exactly **one voice** across the course

### Putting them back — one command

```
APPLY=1 node tools/deu-at/unpark-sasha-links.cjs
```

It reads `docs/audio/deu_at_for_eng-sasha-parked-links-2026-08-25.json` (311 entries,
each recording `table`, `slot_id`, `human_audio_id`, `parked_to_synthetic`) and reverses
each swap. It only reverses a slot that still holds exactly what we parked it to, so a
newer delivery is never clobbered; drifted slots are reported and left alone.

**Verified by dry run: `would restore: 311 of 311`.**

---

## Job 3 — will Sasha's next recordings overwrite the restored clips?

**Yes — they overwrite automatically. Nobody has to do anything, and the restore is
harmless to their work.** Of the three possible answers this is (1).

*(An earlier draft of this report said the opposite. That was wrong: it was reasoned from
the phase8 relink path and the autolink trigger without finding the writer that Sasha's
takes actually flow through. The correct path is below, and it was found by worker #556.)*

### The path their takes actually take

`services/production-api.cjs:5536` — on upload, when the take is in **script mode** it is
filed as a `course_audio` row and then immediately attached:

```js
if (scriptFiling?.filed) {
  const attachPlan = planAttach({ metadata, courseAudioId: scriptFiling.courseAudioId })
  const attachResult = await attachScriptTake({ ... })
```

`attachScriptTake` (`services/script-take-attach.cjs:129-139`) writes the FK with **no
null guard at all**:

```js
for (const spec of targets.values()) {
  const { error } = await supabase
    .from(spec.table)
    .update({ [column]: courseAudioId })      // <- unconditional
    .eq('course_code', courseCode)
    .eq(spec.idColumn, spec.id)
```

It updates the item the take was recorded for — named directly, so it lands regardless of
what the slot already held — plus every sibling item in the course whose text matches
exactly. A filled slot is simply overwritten.

Their takes qualify. `recording_provenance.quality_notes` on their most recent takes reads
`"mode":"script"`, `"role":"target2"`, with `seed_number` and `lego_id` present — full
item identity, which is exactly the condition the attach requires. (A take recorded from
the *coverage* script carries no item identity and is filed but not attached; that is not
what they are doing.)

This also explains the puzzle in finding 1 below: the autolink trigger has been refusing
their clips all along, and `attachScriptTake` is what linked their 311 slots anyway.

### The consequence Kai should actually weigh

Because the attach is unconditional and automatic, **parking is not a permanent state.**
Every new take Sasha files goes live in its slot the moment they record it, over the top
of the restored synthetic clip, with no pass to run and no approval step.

So the beta problem the parking was meant to solve — one human voice surfacing among
synthetic voices at unpredictable points — **will start coming back on its own** as soon
as they record again. Parking cleared the 311 that already existed; it does not hold the
line against the 312th.

If the course is to stay single-voiced through the beta, that needs a deliberate decision
about their recording — pause it, or let the takes bank and accept that they surface — and
that is Kai's call, not something this repair can settle. Nothing else about the restore
is affected: their audio is safe either way, and no manual relink is needed to make their work
count.

---

## Live as beta — and verified from the deployed app, not from the DB row

**`new_app_status` flipped `not_available` → `beta` on 2026-08-25, after every gate below
passed.** `status` and `visibility` were set to `beta` at the same time so the row matches
the shape of the other working betas (`deu_for_eng`, `gle_for_eng`), which had
`visibility: 'beta'` where this course still said `'public'`.

### What actually governs delivery — checked, because the estate has a trap here

The brief warned that a visibility flag and a slug can disagree. On the learner path they
do not, because **only one field gates a course**: `new_app_status`.

- `packages/player-vue/src/App.vue:449` — the in-app catalogue query is
  `.from('courses').select('*').in('new_app_status', ['live','beta'])`
- `api/courses/available.ts:35` — the same filter
- `api/entitlement/grant.ts:91` — `!['live','beta'].includes(course.new_app_status)` →
  *"That course is not available"*

`courses.visibility` is **not read anywhere on the course-gating path** — the one comment
that mentions it (`api/courses/[code]/bundle.ts:398`) records a pod being retired by
setting `visibility='held'` and that change *not reaching the consumer*, "because nothing
here reads visibility". So setting it was housekeeping, not the thing that opened the
door. `courses.status` gates nothing on the learner path either.

### End-to-end proof against `ssi-learning-app.vercel.app`

| check | result |
|---|---|
| `GET /api/courses/available` | **`deu_at_for_eng` present, `new_app_status: beta`** — 1 of 83 live courses |
| `GET /api/courses/deu_at_for_eng/round-map` | **200, 1,253 rounds** — the full course, first is `S0001L01` |
| `GET /api/courses/deu_at_for_eng/cycles?from=S0001L01` | **200, 15 cycles**, types intro/debut/build/use/spaced_rep |
| `target2_id` populated on those cycles | **15 of 15 — zero missing** |
| `GET /api/audio/<restored target2 id>` | **200 `audio/mpeg`, 22,176 bytes** |
| the bytes actually decode | **`ffprobe`: mp3, 1.80 s** |

The clip fetched is `c5ab6493-…`, one of the 12,411 restored on this job — so this is the
restore proven at the learner's ear, through the live host, not a database assertion.

**No cap applies.** `api/_utils/courseBoundary.ts` holds a hard ceiling for MVP courses
whose content stops short; the map contains only `ara_lb_for_eng` and `ara_eg_for_eng`, so
`courseMaxSeed('deu_at_for_eng')` returns `null` and the course serves its full authored
length. The 1,253-round map confirms it.

**Anything past seed 1 returns `403 {"error":"Subscription required","reason":"preview_only"}`
for me, and that is correct, not a fault.** `cycles.ts:493` sets
`previewOnly = !access.canAccess`; I was calling unauthenticated. The course is
`pricing_tier: premium`, so a learner reaches it via a paid entitlement or a trial grant —
`trialDaysForCourse` gives German the commercial class, 30 days.

## Explicit gaps and things Kai should know

0. **Parking will undo itself.** Because the take-attach path overwrites unconditionally
   (Job 3), every new recording Sasha files goes live in its slot immediately. The 311
   parked links stay parked, but the 312th onward will not. If the beta must stay
   single-voiced, that needs a decision about their recording schedule — this repair cannot
   hold it.
1. **A pre-existing bug: the autolink trigger has been refusing Sasha's own clips since
   19 August, and this restore did not cause it.** The configured target2 voice reads
   `human_human_sasha_wanasky_deu_at` — a doubled `human_` prefix — while their clips carry
   `human_sasha_wanasky_deu_at`. `audio_voice_matches` returns false, so
   `relink_refusals` holds **319 voice-mismatch rows against their clips**, dated 19, 21 and
   23 August, before this job ran. Their 311 slots were therefore linked by some other
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
4. ~~`recording_provenance` holds 0 rows for Sasha's clips.~~ **Withdrawn — that finding
   was my own lookup error, not a real gap.** `recording_provenance.audio_uuid` keys on the
   *take's* S3 uuid, not on `course_audio.id`, so joining the two returns nothing whether
   or not the data exists. They in fact have **331 provenance rows** spanning 2026-08-07 to
   2026-08-23, and `quality_notes` carries the full take context — course, mode, role,
   voice, seed and lego identity, chunk boundaries and session id. Their recording history is
   intact and well documented.
5. **111 clip labels in `course_audio.text` still carry quote marks** (the collision set in
   Job 1), as do 519 of the restored target2 labels for the same reason. This is cosmetic —
   the labels differ from the phrase text, the audio is correct and the links are written
   by id. The consequence worth knowing: a *future* text edit to one of those rows will
   trip the same nulling trigger. The fix, if wanted, is to repoint those rows at their
   unquoted twin and orphan the quoted clip.
6. **6 legos have no presentation audio** (last at seed 321), so their intro cycle falls
   back to the known-side clip. Per `courseBoundary.ts` this is the scattered-gap case that
   explicitly must *not* cap the course, so it plays through — but it is 6 slightly thinner
   intros, and it is not something this job created or fixed.
7. **The 49 presentation clips are now verified as NOT speaking the quotes**, which closes
   the item flagged earlier as unverified. There are no `word_boundaries` on `xai` clips, so
   the test was 29 matched pairs — the same word, same voice, same template, one clip with
   quotes and one without: **mean −44 ms, median −72 ms, 20 of 29 shorter or equal**. A
   voice reading "quote … unquote" would add roughly 700 ms consistently. It does not. The
   clip labels are still cosmetically wrong; nothing a learner hears is.

## Backups

- pre-change state (529 quoted rows with their links, all 225 Sasha clips, all 311
  occupied slots) — `$CS_SCRATCH/pre-restore-state.json` on the machine that ran this
- the restore source — `docs/audio/deu_at_for_eng-target2-clear-snapshot-2026-08-06.json.gz`
  at `40d54dbc2`, already in git
- the park ledger — `docs/audio/deu_at_for_eng-sasha-parked-links-2026-08-25.json`, in git
