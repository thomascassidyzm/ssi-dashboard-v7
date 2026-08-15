# yor_for_eng — recording pack, and the ingest gap

**Addendum to the [build report](https://watson-1.tail4968cb.ts.net/d/5169b967).** Still no audio generated: `course_audio` for this course is one row, the pre-existing `welcome` clip, exactly as before.

**The three things to look at:**

- 📋 **[Questions for our Yoruba speakers](https://watson-1.tail4968cb.ts.net/d/ec4d46e7)** — send this to the volunteers
- 🎙️ **[Recording script, Voice 1](https://watson-1.tail4968cb.ts.net/d/3583a6fa)** — 251 lines, 5 sessions
- 🔗 **[How a returned file matches back to its row](https://watson-1.tail4968cb.ts.net/d/83999f5e)**

---

## 1. The recording pack

Built by `tools/build-yor-recording-pack.cjs` (committed; reads text, writes markdown and JSON, generates nothing).

| Script | For | Lines | Sessions | Speaking time |
|---|---|---|---|---|
| `script-t1-target1.md` | Yoruba Voice 1 | **251** | 5 | ~29 min |
| `script-t2-target2.md` | Yoruba Voice 2 | **251** | 5 | ~29 min |
| `script-en-known.md` | English prompt voice | **252** | 5 | ~29 min |
| `manifest.json` | the machine-readable join | — | — | — |

251 lines cover all **289 content rows** — 22 lines serve more than one row, because the same Yoruba sentence appears as a building block and again inside several practice phrases, and is recorded once.

**Reading order** is seed by seed: the seed sentence, then each building block, then that block's practice phrases. The speaker stays in one topic instead of jumping around. Sessions are ~45 lines and **never split a seed** across a session boundary.

**Each line is marked** as a whole sentence, a building block, or a single word, because the script legitimately contains 35 single-word lines (`mo`, `fẹ́`) and a volunteer who hits one unwarned will think the file is broken. The script tells them these are deliberate and to say them as they would inside a normal sentence, not over-pronounced.

**Dedupe is case-folded but diacritic-exact.** `Mo sọ` and `mo sọ` are one line — capitalisation does not change how a word is spoken. `kọ́` and `kọ` are **two** lines and always will be: they are different verbs. I verified this on the generated manifest, not just in the code — exactly one set of forms would have been wrongly merged by a diacritic-blind dedupe, and it survived as separate lines.

The script also tells volunteers, in plain terms, that the tone marks and dots are part of the word, and that if a line looks wrong they should **record it as written and then tell us**.

---

## 2. How a returned file matches back to its row

The chain is:

```
volunteer's audio file
  → session number  (spoken aloud at the top of the file)
  → line number     (spoken aloud before each line)
  → line_id         in manifest.json
  → rows[]          { table, row id, seed_number, lego_index, position }
  → ??? course_audio row
  → known_audio_id / target1_audio_id / target2_audio_id on the content row
```

`manifest.json` is the authority for everything down to `rows[]`. It is deterministic, it is committed, and it goes out with the recordings. (One caveat, stated in its README: `line_id` numbering is stable only for a given manifest — regenerating after the course grows renumbers. Keep the manifest that went out.)

I chose **spoken slates plus one file per session** over one-file-per-line deliberately. Expecting a non-technical volunteer to produce and correctly name 251 separate files is where this fails in practice; a spoken number is robust, works on any phone, and matches the house pattern — the repo already has take-slicing and `align-audio.cjs --chunks` for exactly this.

---

## 3. 🚨 The gap: nothing can ingest those files today

**Those last two arrows do not exist.** I traced it and then confirmed it against the code rather than trusting the doc comments.

The only audio-ingest endpoint is `POST /api/production/:courseCode/recording/upload` (`services/production-api.cjs:4442`). It has three modes (`:4457-4458`), and **not one of them can attach an externally recorded file to a course row that has no audio yet**:

**Regeneration mode** — updates `course_audio` and marks it `origin='human'` (`:4599-4604`). But it looks the row up by uuid first and **404s if it doesn't exist** (`:4491-4508`). It re-records an existing clip. `yor_for_eng` has **zero** content `course_audio` rows, so there is nothing to regenerate.

**Pod mode** — does upsert a `course_audio` row (`:4607`), but it commits against `listening_pod_sentences`. It is for dialogue pods, not seeds, LEGOs or practice phrases.

**Script mode** — this is the one that sounds like it should work, and it doesn't. Grepping the entire upload handler, `course_audio` is touched in exactly **two** places, and both are inside the regeneration branch. **Script mode writes an S3 object and a `recording_provenance` row, and nothing else.** The take never becomes a `course_audio` row, so it is never playable and never linked. The `recording_provenance.audio_uuid` it writes points at an id with no row behind it.

And there is no other way in:

- **No file-upload route exists at all.** No `multer`, no `multipart`, no `formidable` anywhere in `services/`. The endpoint takes base64 in a JSON POST, one take at a time, from the in-browser recorder.
- **No bulk-import tool.** I searched `tools/` for import/ingest/attach: the only matches (`audio-link-reconcile.cjs`, `relink-superseded-known-audio.cjs`) re-point links between `course_audio` rows that already exist. None ingest an external file.
- The only thing that mints `course_audio` rows for course content is **the TTS generation path — which we are forbidden to run.**

**So: the course is in a state where human recording is the plan, and human recording is the one thing the pipeline cannot currently accept.** That is the finding, and I would rather say it plainly now than after the volunteers have recorded.

### A second, smaller trap

If anyone points volunteers at the production console route `/production/:courseCode/recording`, **every take gets stamped `target1` regardless of who is speaking.** That route mounts the autocue without a slot; the component's own comment says so (`src/components/production/autocue/AutocueStudio.vue:250-254`): *"Left at defaults when mounted from the production console... the session falls back to the explicit target1 default."* Voice 2's entire session would be mislabelled as Voice 1. The Record Room shell (`src/views/RecordRoom.vue:150`) does pass the slot correctly — that is the entry point to use.

---

## 4. What I recommend

**The fix is small, and it costs nothing.** A `course_audio` row is just a database row: text, role, and an `s3_key`. Nothing about it requires audio to have been generated.

So: **mint the rows empty.** For each of the 289 content rows × 3 roles, insert a `course_audio` row carrying the text, the role, `origin='human'`, and a NULL `s3_key`, and write its id into the content row's `known_audio_id` / `target1_audio_id` / `target2_audio_id`. That gives every line a real uuid before anyone records.

Two things then fall out for free:

1. The recording pack can carry the **actual `course_audio` uuid** per line, so the join is exact rather than positional.
2. **Regeneration mode starts working as-is.** It looks the row up, finds it, and repoints `s3_key` at the human take with `origin='human'` — which is precisely the behaviour we want, already written and already in use.

That turns "build a new ingest path" into "populate a table", and it stays inside the make-before-break rule: nothing is deleted, and an unrecorded row with a NULL `s3_key` is inert.

**I have not done this.** It writes ~867 rows to a live shared table and changes how a course bootstraps for human recording, so it is your call and Tom's, not mine to take unilaterally. It is reversible and free, and I can do it as soon as you say go.

**Do that before the volunteers record, not after.** Recording first and ingesting later is survivable; it just means matching 500-odd takes by hand.

---

## 5. Still outstanding

- **Two sub-workers have not reported back.** **#632** (corpus-wide audit of all 668 Yoruba translations — Unicode integrity, tone minimal pairs, ZUT collisions, translation-fidelity flags) and **#653** (independent trace of this same ingest path, to check my reading). Neither had returned when I wrote this. **None of their findings are in here**, and #653 in particular could contradict section 3 — if it finds a route I missed, that is good news and I will say so.
- **295 of 305 seeds are still undecomposed** — unchanged from the build report, and still deliberate.
- **The recording pack covers only the 10 built seeds.** Regenerate it as the course grows; the tool is committed and re-runnable.
- **No Yoruba speaker has reviewed anything yet.** That is what the questions document is for, and it is now the thing standing between us and a course we can trust.

---

*No TTS, no machine voice, no audio of any kind was generated in this job. Humans are doing the recording.*
