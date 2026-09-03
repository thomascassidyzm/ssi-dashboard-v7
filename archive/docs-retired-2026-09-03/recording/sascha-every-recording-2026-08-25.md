# Every recording Sascha has ever made — including the ones that never became clips

**2026-08-25 · read-only scout · nothing was changed**
Sascha (they/them) is the recordist for `deu_at_for_eng`, identity `sasha.wanasky@gmail.com`, voice slot `human_sasha_wanasky_deu_at`.

---

## The short answer

**Kai's hunch is right about the mechanism, but it is not the mechanism he named.**

There is **no straight-through / continuous-blob capture path**. I followed the code and there is nowhere in this system that keeps an unsegmented session recording. What there *is* — and it is exactly the shape Kai predicted, a holding area that is not a `course_audio` row — is the **`raw/` archive**, and it contains **26 Austrian takes that have no row in any database table at all**. They are invisible to every query anyone has run, including job #601's and including the listening page job #619 is building.

**Kai is also right that "only ever ONE human 'i wü'" is wrong.** There are **110** Sascha takes whose text contains `i wü`. Job #601 was matching the exact standalone string `i wü`, of which there is indeed only one bound clip — and that one *is* junk, which I re-verified on both the mastered clip and its raw original.

**Kai is wrong about 2026-08-24, and I checked it in every location.** There is genuinely no recording activity that day, anywhere.

---

## 1. What recording modes actually exist

Followed from `services/recording-upload-helpers.cjs` outward.

| Thing that sounds like straight-through | What it actually is |
|---|---|
| `ModeSelector.vue` — *"The course itself, straight through from the start"* | A **reading order**, not a capture mode. `?order=course` vs `?order=coverage`. Both capture per line. |
| `useContinuousRecorder.ts` — *"Continuous Flow Recorder"* | The mic stays open across the whole session, but a VAD cuts a **separate blob per phrase** and each is uploaded on its own. The mic being continuous is what gives each take its pre-roll (Tom's 2026-08-21 ruling on capture boundaries). No session-length blob is ever assembled. |
| `PodLongTakeStudio.vue` — *"LongTake"* | `commitLine(index, blob)` on every tap: one upload per line. `// Deliberately no raw-blob fallback: the studio keeps no local copy`. |

**There is no unsegmented blob, no session bucket, no pending queue, no holding table.** Segmentation happens *in the browser, before upload*. I listed the whole S3 bucket to be sure: the only prefixes are `mastered/` (5,158,013), `raw/` (592), `repair-candidates/`, `audit-archive/`, `info/`, `mastered-v2/`, `probe/`, `backups/`, `staging/`, `scratch/`, `courses/`, `exports/`, `demo-splices/`, `voicelab/`, plus 5,947 root-level objects. `vad-lab/`, `pending/`, `sessions/`, `uploads/`, `longtake/`, `takes/`, `tutorial/` are all **empty**.

### But there IS a place that is not a `course_audio` row

`services/production-api.cjs` retains the untouched take at `raw/{UUID}.{ext}` **first**, then processes it. Three refusal branches then `return` — at lines 5299 (unprocessable / trimmed-to-nothing) and the speech-content gate below it — and **all three return before the `recording_provenance` INSERT at line 5596**.

So a refused take leaves:
- bytes in `raw/` ✅
- **no `recording_provenance` row**
- **no `course_audio` row**
- nothing, anywhere, that names it

The comment in the code says this out loud: *"orphans under `raw/` are wanted"*. It just never says that nothing can find them again. And there is **no `raw_s3_key` column** — the pointer lives inside `quality_notes` JSON and in the mastered object's S3 metadata, so a raw with no provenance row is unreachable from SQL by construction.

This class is already proven: two takes on 2026-08-21 carry `"recovered from raw archive after the 2026-08-21 trim-duration refusal (db439d0ab)"`. Somebody rescued two. **Ten more from that same cluster were never rescued.**

---

## 2. Every artifact of Sascha recording, per location

| Location | Count | Date range |
|---|---|---|
| `recording_provenance` (`recorded_by = sasha.wanasky@gmail.com`) | **331** | 2026-08-07 15:41 → 2026-08-23 17:59 |
| `course_audio` (`voice_id = human_sasha_wanasky_deu_at`) — live, learner-reachable | **225** | 2026-08-19 17:19 → 2026-08-23 17:56 |
| `s3://ssi-audio-stage/raw/` **with no DB row anywhere** (course code `deu_at_for_eng` in object metadata) | **26** | 2026-08-21 10:54 → 2026-08-23 17:52 |
| `audio_clips`, `target_audio`, `shared_audio` | 0 | — |
| `vad-lab/` and every other candidate prefix | 0 | — |

**Total known Sascha takes: 357.** Of those, 132 are not reachable by any query anyone has run.

Provenance breakdown (mode is `script` for all 331):

| cadence | role | count |
|---|---|---|
| natural | target2 | 276 |
| slow | target2 | 25 |
| slow | target1 | 22 |
| natural | target1 | 6 |
| *(null — the two 08-21 raw-archive recoveries)* | target2 | 2 |

Sessions by day: 08-07 (3), 08-08 (25), 08-19 (10), 08-21 (49), **08-23 (244)**.

### 2026-08-24 and 2026-08-25 — checked in every location

| Location | 08-24 | 08-25 |
|---|---|---|
| `recording_provenance`, any recordist | **0** | **0** |
| `course_audio` where `origin='human'`, any course | **0** | **0** |
| `audio_clips`, any | **0** | **0** |
| `s3://ssi-audio-stage/raw/` | **0 objects** | **0 objects** |
| Whole bucket (5,167,493 objects enumerated) | 10,031 objects — **all under `mastered/`** | 60 objects — **all under `mastered/`** |

Those 10,091 objects are TTS renders: the matching `course_audio` rows created 08-24/25 are `origin='tts'` across hrv, deu_at, spa_mx, fra_ca, jpn, nld, ara, por_br, fra — Azure and xAI voices, no human voice among them.

**#601's null result for 08-24 is correct and is not an artifact of where it looked.** I looked in five more places and it is still zero.

---

## 3. "i wü" — every artifact

### The bare phrase `i wü`, standalone

Three artifacts exist in the whole system, all on 2026-08-21:

| when | who | s3 | verdict |
|---|---|---|---|
| 10:10:02 | `verification-probe` (not Sascha) | `mastered/66FA5B20-…` | tool probe |
| **15:32:21** | **Sascha** | `mastered/E0C0EC74-0C5A-4EDC-BEC1-08E092CE3BDF.mp3` | **this is the clip bound to the course** |
| 15:32:38 | Sascha | `raw/CBFD7F1B-…` only, refused | 2.8s, ASR "Vielen Dank" |

I fetched `E0C0EC74` and transcribed it — **whisper-medium reads it as "Platt!"** — and then fetched its **raw original** (`raw/E0C0EC74-….webm`, 4.7s) in case the mastering had amputated a good read, and **the raw says "Platt!" too**. So the bad take is bad at source; it is not a processing casualty. It sits inside the four-take burst at 15:32:17–15:32:29 whose prompts were `i wü iatz mit dir Deitsch reden` / `i wü` / `reden` / `i wü reden` — the tool-test burst #601 described.

**On that narrow point #601 was right, and I confirmed it independently rather than repeating it.**

### But `i wü` as a phrase — 110 takes

`#601`'s conclusion was scoped to the exact string. Sascha has recorded **110 takes** whose text begins `i wü…`, across 08-07, 08-08, 08-19, 08-21 and above all the big **08-23 session (244 natural takes, 15:10 → 17:56)**: `i wü Deitsch reden`, `i wü mit dir reden`, `i wü lernen, wia ma wos sogt`, `i wü's so fest versuchen, wia i kann`, `i wü a bissl Deitsch lernen`, and so on. Most are live in `course_audio` today.

**If Kai remembers hearing a correct "i wü", this is overwhelmingly where he heard it.** The course carries both spellings — Sascha also recorded a parallel `i wer…` set — so a good `i wü` is in the estate in quantity; it is only the *standalone lego* that is junk.

### The refused takes — the 26 nobody can see

Whisper-medium, forced to German, on all 26. **Treat these reads as indicative only**: forcing German normalises Austrian dialect, so `i wü` / `i wer` / `i wär` / `ich will` are not reliably distinguishable by ASR. Only an ear can settle which is which. Marked ★ are the ones whose read looks like an `i wü` line.

| uuid (`raw/<uuid>.webm`) | when | dur | whisper-medium (indicative) |
|---|---|---|---|
| 5FBB1AF0-63DA-46C1-9B84-F2DFCB64F614 | 08-21 10:54 | 1.4s | "Vielen Dank." |
| 56145868-AAFA-4C7B-A8EF-FE17EDA06D25 | 08-21 12:51 | 5.0s | "Kannst die Tür offen halten, solange ich die Schlüssel hole." |
| 716BE457-58C6-4E19-942F-2A083626C6F6 | 08-21 12:52 | 14.5s | "kannst die Tür offen halten solange ich dich schlüssel hole" |
| 9E7462AB-CD50-4920-B299-E17844AAAB8E | 08-21 12:55 | 3.7s | "und die Tür offen halten, solange eh die Schlüssel" |
| ADEAC3DF-2619-460C-8610-2A994D878D70 | 08-21 12:56 | 9.2s | "Kannst die Tür offen halten, solang ich die Schlüssel hol?" |
| A978A91B-F343-4831-A3E3-BEAF7A8FD5CB | 08-21 12:56 | 12.4s | "kannst die Tür offen halten, solang ich die Schlüssel hol." |
| 1F5EB784-F98A-4878-900A-A87C094F9BD2 | 08-21 12:56 | 4.5s | "Wer immer gesagt hat, dass es" |
| 099095F8-EFA3-4B01-9126-E315476A5B28 | 08-21 12:56 | 8.5s | "Wer er immer gesagt hat, dass das schwer wird, der hat voll recht gehabt." |
| 2845D911-2888-4BDE-B131-927A7CB05AD5 | 08-21 12:57 | 13.4s | "Wer auch immer gesagt hat, dass es schwer wird, der hat voll Recht." |
| 1303E78D-6DD5-4278-BED7-A8BE913A912E | 08-21 12:57 | 11.0s | "Wer hat immer gesagt 'Hot dass des'" |
| DF3C4BA6-977D-4178-98B6-75CE0D9B16B1 | 08-21 12:57 | 5.8s | "Recht kappt. Ach, sorry." |
| 5E64A95D-5290-4516-BBEA-D4549DB44832 | 08-21 13:00 | 8.0s | "Kannst die Tür offen halten, solange ich die Schlüssel hole." |
| 2C266841-79AC-4D21-9EAD-94559C157E8A | 08-21 13:00 | 13.9s | "Kannst die Tür offen halten, solange die Schlüssel holt." |
| 4F682978-838E-43A1-957B-4D4CF23E223D | 08-21 13:00 | 9.3s | "Wer er immer gesagt hat, dass das schwer wird, der hat voll recht gehabt." |
| CBFD7F1B-23F2-45B4-974C-42DD9884E90D | 08-21 15:32 | 2.8s | "Vielen Dank." |
| 00C0A915-ADB0-4EAA-8545-7B85ACD8854D | 08-23 17:32 | 3.3s | "Ich versuch heut, was auf Dein" |
| ★ 3858E69E-DB3F-40DE-BCF5-E3AEBD8FEDFA | 08-23 17:36 | 5.7s | "I wär heut so fest üben, wie er i kann." |
| ★ 7967C6C7-E67C-4FF4-9855-6A28C6C887ED | 08-23 17:37 | 5.7s | "Die Wü halt so fest üben, wie er i kann." |
| ★ 7A3C1CFC-F9C8-40D8-91C3-B48CF147D3F8 | 08-23 17:37 | 5.5s | "I wär so fest lernen, wie er i kann." |
| ★ E7ED23BA-77F9-4226-898F-57FBEE30D97C | 08-23 17:37 | 5.3s | "Ich werde versuchen, zum erklären, was sie meinen." |
| 46D88EDD-CA8D-4129-951A-A65AC92EF8C3 | 08-23 17:40 | 6.6s | "Ich rede heute mit wem andern." |
| ★ 0BF33106-5AA1-4CC4-A565-6ECA360640C1 | 08-23 17:41 | 4.5s | "I wer heit a bissl üben." |
| 860AD748-D6EE-4555-8008-8AC718F2239E | 08-23 17:41 | 3.9s | "Ich bin mal nicht sicher, ob ich mal den ganzen" |
| BB4B6624-7F6B-483C-AD28-F55325274B10 | 08-23 17:41 | 2.7s | "[Musik]" |
| ★ 3CD539E5-9D01-4B53-8367-B903DE591C9C | 08-23 17:50 | 6.2s | "Ich will heute versuchen, was auf Deutsch zum Sagen." |
| B7E3E075-7806-4A29-9BA9-D6DA7A3C1043 | 08-23 17:52 | 7.0s | "Ich bin mir nicht sicher, ob immer den ganzen Satz merken kann." |

The 08-21 12:51–13:00 cluster is the **long-sentence set**: `kannst d'Tür offen hoitn, solang i de Schlüssl hol?` and `wer a immer gsogt hot, dass des schwa wird, der hot voi recht ghobt`, killed by the trim-duration refusal that day. Two of that cluster were hand-recovered from raw; **ten were not, and several of the unrecovered reads sound complete.**

None of these 26 are reachable by the course. They are bytes in a bucket.

---

## 4. What job #619's listening page will not know about

`tools/deu-at-listen/manifest.cjs` filters `cadence='natural' AND role='target2'`. For `deu_at_for_eng` that selects **278 of Sascha's 331** provenance takes.

It will therefore miss:

- **53 provenance takes** — 25 slow/target2, 22 slow/target1, 6 natural/target1. The slow takes are real reads of real lines (they are the chunked reads the aligner uses); they are just not filed as clips.
- **All 26 raw-only orphans** above, which are not in the database for it to query.

**79 Sascha takes in total that the page will not show.** The six starred `i wü`-shaped orphans are precisely the ones worth adding first. They are playable: `raw/<uuid>.webm` in `ssi-audio-stage`, WebM/Opus, and every one of them decodes.

---

## 5. Explicit gaps

- **Pre-2026-08-14 takes have no raw archive at all.** Raw retention started 2026-08-14 (`0d76bd5c`). 28 of Sascha's takes (08-07: 3, 08-08: 25) carry `raw_s3_key: null`. Any take *refused* on those two days left nothing behind and is permanently unrecoverable. I cannot tell you how many there were.
- **Whisper is not an authority on Austrian dialect.** Every transcript above is indicative. `i wü` vs `i wer` vs `i wär` is exactly the distinction it flattens, and the whole question turns on it. Kai's ear settles this, not mine.
- **Take acceptance is not recorded anywhere.** The recordist's Approve tick is client-only state and never leaves the browser, so nothing in this report can tell you which takes Sascha themself thought were good.
- **I did not enumerate `mastered/` for orphans.** 5.16M objects; a mastered object with no DB row is possible in principle but the refusal branches all return *before* the mastered PUT, so refused takes cannot produce one. Orphaned masters would have a different cause.
- No blocks on scope, credentials or access. DB and S3 were both reachable.

---

## 6. What I changed

Nothing. No DB writes, no S3 writes, no TTS, no relinking, no commits. Probe scripts were written to the gitignored `scripts/` workspace and audio to this conversation's scratch directory.
