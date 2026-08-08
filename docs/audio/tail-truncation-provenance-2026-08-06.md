# Tail-clip damage — what ran, when, and how far it reached

**2026-08-06. Forensic scout, supply side.** Provenance only: the audit log, the live
DB, the live S3 bucket and git history. No audio analysis — that is a separate worker.

---

## The verdict

The truncated tails were **written at render time by `repairTailDefect`**, a trim-and-re-pad
step inside the mastering chain. Clips were not corrupted later; each damaged clip was
**born amputated** in a re-render, and the DB faithfully recorded the amputated duration,
which is why every duration-consistency check in the estate passes on them.

**The mechanism is dead.** `repairTailDefect` was deleted from the render path on
2026-08-05 21:22 UTC (`8415f2d9`), and that deletion **is merged into `main`** — only
tombstone comments remain. `tools/verify-tail-repair-mode.cjs` now asserts the function is
not exported, so a silent return would fail a test rather than ship.

---

## Why it cut good audio

`repairTailDefect`'s only protection against a trim that eats speech was
`verifyTrimKeepsText`, which shells out to `whisper-cli`. **When the binary is missing or
not on the render process's PATH it returns `null`, and the caller treats `null` as
"proceed"** — so the amputation guard was silently OFF.

That is not hypothetical on watson-1:

- `whisper-cli` was only installed here on **2026-07-28 16:55**; before that the guard
  could not run at all.
- Even after installation, the comment at `services/audio-processor.cjs:27` records that
  on **2026-08-04** the binary was present and working "while the bare spawns still died
  with ENOENT, because that directory was not on the PATH the render process inherited".

So for the whole exposure window on this host, the tail repair trimmed with its safety
check disabled. The detector driving it was **9% precise by ear and fired on ~70% of
brand-new TTS output** (`docs/audio-repair-2026-08-05/deu-seeds1-5-naked.md`), so it was
cutting healthy audio at scale.

A second, independent route to the same artefact was found on 2026-08-04 (`f8c380bd`):
each repair pass walked the cut point further back until a short word was gone entirely,
turning a healthy 648 ms render of "weak" into 100 ms of −91 dB silence.

---

## Timeline (all UTC)

| When | What | Evidence |
|---|---|---|
| **2026-07-24 03:02** | `repairTailDefect` introduced. **Unconditional — `TAIL_REPAIR_MODE` did not exist yet, so for 12 days there was no off switch at all** | `44fef862` |
| 2026-07-28 16:55 | `whisper-cli` first installed on watson-1 | binary mtime |
| 2026-08-03 09:00–11:59 | **Re-link event**, 162,322 `course_audio` rows: `s3_key` changed, duration/voice/text **unchanged** — no audio characteristics altered | `content_audit_log` |
| **2026-08-03 17:00–23:59** | **Re-voice run**, 42,256 rows: `s3_key`, `duration_ms` and `voice_id` all changed — legacy Azure voices → house voices. This is the run that produced Tom's ear-confirmed clips | `content_audit_log` + S3 LastModified |
| 2026-08-04 11:50 | Partial fix — hold rather than trim when a cut eats >half the clip or leaves silence | `f8c380bd` |
| **2026-08-04 23:29:49** | **watson-1 protected in practice** — systemd drop-in `tail-repair-mode.conf` sets `TAIL_REPAIR_MODE=flag` on the phase8 unit | drop-in file birth time |
| 2026-08-05 01:24 | `TAIL_REPAIR_MODE` default flipped from repair → flag in code | `d5ad9f2c` |
| **2026-08-05 21:22** | Mutation path **deleted entirely**; merged to `main` | `8415f2d9` |
| 2026-08-06 00:06–00:10 | Tom's 93 accepted deu repairs swapped in | `course_audio_revisions` |

**Exposure window: 2026-07-24 03:02 → 2026-08-04 23:29:49** on watson-1 (the drop-in beat
the code default by two hours); → 2026-08-05 01:25 on any host running the code default.
Fully closed everywhere by the deletion at 2026-08-05 21:22.

**No runtime record survives for the 08-03 run.** The `popty-phase8-audio.service` journal
and its `~/.local/log/` file both begin **2026-08-04 16:49 UTC**, and no systemd timer, cron
entry or `at` job on this box runs anything audio-related. So `content_audit_log` is the only
surviving witness to what happened on 08-03 — which is why the audit log, not file mtimes,
carried this investigation. Within the log that does exist, every `TAIL_REPAIR_MODE=` line
reads `flag` (20/20) and no `repair`-mode line appears anywhere — consistent with the window
having already closed before that log begins.

### Worked example — one ear-confirmed clip

`0ae519fb…` — *"The German for: 'with someone else' …"*

| | s3_key | duration | voice |
|---|---|---|---|
| Row created 2026-03-12 | `mastered/8DC36EDB…` | 5904 ms | `azure_en-GB-SoniaNeural` |
| **2026-08-03 19:02:14** re-voice | `mastered/D881AA61…` | **4176 ms** | `eve` |
| 2026-08-05 21:52 repair | `repair-candidates/4AB6C12E…` | **5208 ms** | `eve` |

`ffprobe` of the 08-03 object returns 4138 ms — matching the DB's 4176 ms. The clip was
amputated *as it was rendered*; the correct render is 5208 ms. Roughly **1.0 s of speech
lost** on that clip.

---

## Blast radius — triage order, not a damage list

The damaging run did **not** corrupt every clip it touched, so this is the population that
passed through the amputating path, ranked for triage. Courses absent here go last.

### Clips rendered inside the exposure window (new renders)

| course | clips | | course | clips |
|---|---:|---|---|---:|
| kor_for_hin | 43,424 | | eng_for_tam | 22,403 |
| kor_for_tam | 42,529 | | por_br_for_eng | 21,295 |
| zho_for_hin | 39,461 | | eng_for_guj | 21,024 |
| deu_at_for_eng | 38,158 | | eng_for_pan | 20,292 |
| fra_ca_for_eng | 34,781 | | eng_for_ben | 19,855 |
| zho_for_tam | 32,166 | | eng_for_hin | 19,273 |
| fra_for_eng | 28,369 | | eng_for_sin | 19,242 |
| eng_for_tel | 24,902 | | eng_for_urd | 17,338 |
| eng_for_kan | 24,547 | | spa_mx_for_eng | 15,704 |
| eng_for_mar | 23,636 | | deu_for_eng | 3,559 |

Long tail: spa_for_eng 1,340; rus_for_eng 224; deu_for_zho 196; eus_for_eng 192;
tur_for_eng 144; hun_for_eng 126; lit_for_eng 105; ita_for_zho 86; bul_for_eng 67;
lav_for_eng 60. **Total ≈ 490,000 clips.**

### Re-renders on existing rows (voice changed), by day

| day | course | clips |
|---|---|---:|
| 08-03 | **deu_for_eng** | **41,449** |
| 08-03 | eng_for_ben | 1,550 |
| 08-03 | eng_for_sin | 476 |
| 08-02 | eng_for_hin | 14,946 |
| 08-02 | eng_for_ben | 12,219 |
| 08-02 | eng_for_kan | 2,617 |
| 08-02 | eng_for_tel | 1,931 |
| 07-31 | eng_for_hin | 5,238 |
| 07-27 | deu_at_for_eng | 2,085 |
| 08-04 | deu_for_eng | 1,038 |
| 08-04 | fra_for_eng | 244 |

**deu_for_eng is the priority**: 41,449 clips re-voiced on 08-03 evening straight through
the amputating path, of which **95 have been repaired**. The rest are unexamined.

Earlier re-voice runs — spa_for_eng 16,662, kor_for_eng 12,937, jpn_for_eng 11,430 (all
07-20), deu_for_eng 11,233 (07-11), hrv_for_eng 3,293 (07-16) — fall **before** 07-24 and
are therefore *not* exposed to this mechanism.

---

## Exonerated

**The 07-29 de-hiss pass is not the cause.** It kept a per-file ledger in the bucket at
`backups/hiss-reprocess-logs-2026-07-29/` (19 files, 15 courses). Every record carries
`oldDur` and `newDur` and they are **equal**, and the pass wrote to **new** keys rather
than mutating originals. Its own ledger clears it.

---

## The de-hiss hypothesis — tested and refuted

Tom's prime hypothesis (2026-08-06): Deborah reported hiss in the new female Spanish intro
voice on 29 July; Kai said he'd "process the clips", that "it'll work automatically from
now", and ran a pass over the files. A de-noise pass with a **noise gate or trim-silence
step** is exactly the mechanism that clips tails — and it might be wired in permanently.

**The run was found.** `docs/handoff-kai-2026-08-04/local-tooling/reprocess-xai-hiss.cjs`
on `origin/docs/kai-local-handoff`. Three things refute it as the tail-clipping mechanism,
each from the script itself:

1. **The filter chain is `afftdn=nf=-25:nt=w` and nothing else.** A pure FFT denoise. No
   `silenceremove`, no gate, no `atrim`, no fade. `afftdn` cannot shorten a clip; it does
   not touch the time domain.
2. **It never overwrites.** Output goes to a fresh `mastered/<uuid>.mp3`; the original key
   is left intact, and the script carries a rollback that restores the old `s3_key`.
3. **Durations are preserved and measured.** Its ledger at
   `backups/hiss-reprocess-logs-2026-07-29/` records `oldDur` and `newDur` per file and
   they are equal throughout.

**Is it live? No.** `afftdn` appears nowhere in `origin/main`, nowhere in the deployed
checkout, and nowhere in the running process:

- The phase8 service runs from **`/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`** (not
  the dev tree), on `main` at `010c294f`, restarted **2026-08-06 03:00:03** from files
  written 2026-08-05 22:03 — i.e. after the `repairTailDefect` deletion.
- The live TTS master chain is `PRE_COMPRESS → volume → TRUE_PEAK_LIMIT → ANTI_CLICK_FADE`.
  **No denoise, no silence removal, no gate.**
- The de-hiss lives only on unmerged branches, as **open PR #17**
  (`fix/xai-hiss-denoise`, not merged). Kai's "automatically from now" describes that PR's
  intent, which was never landed.

The only `silenceremove` in the tree is in `processRecordingBuffer` (human webm recordings
from the browser recording suite) and `pod-explainer-composite.cjs` — neither is on the
TTS course-clip path.

**The 08-03 morning event was almost certainly a second de-hiss run.** Its signature is
exactly Kai's script's: `s3_key` changes on 162,322 rows with duration, voice and text all
unchanged — across 12 xAI-voiced courses (kor_for_hin 43,424; kor_for_tam 26,928;
eng_for_ben 22,288; eng_for_hin 22,275; zho_for_tam 20,250; eng_for_sin 10,230;
eng_for_kan 5,843; eng_for_tel 4,577; eng_for_tam 3,215; eng_for_guj 1,190; eng_for_urd
1,063; eng_for_pan 1,043). Non-destructive by construction, and the originals survive at
the old keys.

### Spanish does not share German's window

| spa_for_eng event | day | updates | duration changed | voice changed |
|---|---|---:|---:|---:|
| **Voice replacement** (Azure → xAI) | **2026-07-20** | 19,718 | 19,640 | 16,662 |
| **De-hiss relink** | **2026-07-29** | 18,403 | **4** | 4 |

No Spanish activity at all on 08-02 or 08-03. And the 07-20 voice replacement falls
**before `repairTailDefect` existed (07-24)** — so Spanish was never exposed to the
amputation mechanism. If Deborah's Spanish clips are bad, the cause is Tom's secondary
candidate, the voice-replacement window, not a tail-clipping pass.

Separately: Deborah's "under the CD means" vs "under the bridge" is a **wrong-content**
defect, not a tail clip. Different failure class, different fix — worth tracking apart.

---

## Worker findings folded in

### The 142,973-clip scenario is closed — refuted, not unresolved

The code-forensics worker's decisive open question was whether Kai's de-hiss reprocess
called `masterAudio` — the difference, in their words, "between ~1,000 clips and the whole
estate." They could not find the script on this machine and asked for someone to read
Kai's Mac.

**Not needed.** The script is in the repo, on `origin/docs/kai-local-handoff` at
`docs/handoff-kai-2026-08-04/local-tooling/reprocess-xai-hiss.cjs`. Its only import from
the audio code is:

```js
const { ffmpegFilterToLameMp3, getAudioMetadata } = require('../services/audio-processor.cjs');
...
await ffmpegFilterToLameMp3(inPath, outPath, { filterChain: DENOISE });  // DENOISE = 'afftdn=nf=-25:nt=w'
```

No `masterAudio`, no `normalizeAudio`, no `repairTailDefect`. `ffmpegFilterToLameMp3` is a
raw ffmpeg wrapper that applies exactly the chain it is handed. **The de-hiss run could not
have invoked the amputating path.** The estate-wide scenario does not happen.

A related worry can also be retired: the worker noted the commit claims "originals retained
for rollback" while citing log paths, and that no raw pre-masters are kept. True in general
— but irrelevant *for this run*, because the de-hiss wrote to **fresh keys** and left every
original in place. The script even ships a `rollback` that restores the old `s3_key`.

### First real damage count: 959 clips

Five run logs recovered from `/tmp`, all on **2026-08-04 within two hours**:

| Log (UTC) | Course | Clips cut |
|---|---|---:|
| fra-bulk-repair-run1 11:50:33 | fra | 99 |
| fra-bulk-repair2 12:00:12 | fra | 198 |
| deu-repair-run 13:30:24 | deu | 449 |
| revoice-full 13:50:37 | deu | 38 |
| revoice-run2 13:57:42 | deu | 175 |
| | | **959** |

Median cut **0.61 s**, max **2.07 s** — word-scale on short LEGO clips. Every one of these
runs was a human typing a command; nothing scheduled did it. The repair and re-voice tools
were the delivery mechanism, because they re-render through `masterAudio`.

**This is a floor, not a total.** `/tmp` is luck, not an archive: no amputating run log
survives for 07-25 → 08-03, and the 08-03 deu event is evidenced only by the audit log and
S3. Absence of a log there is weak evidence, not proof of absence.

### The 08-03 German window, confirmed twice independently

`content_audit_log` puts the deu re-voice at **08-03 17:00–23:59**; S3 LastModified analysis
independently narrows deu's damaging window to **08-03 19:34–23:41**. Two different sources,
same event.

### A third, earlier event — not the culprit

An estate-wide overwrite on **2026-05-23** touched ~48% of sampled objects across 90+
courses. Files mostly **grew**, it has clean before/after version history, and it is two
months outside the window. Not the truncation bug — recorded so nobody re-finds it and
raises the alarm.

### Correction: how much of German is actually repaired

A worker reported all ear-confirmed clips sitting at `audio_revision = 1`. For Tom's three
named examples that is not so — they are at revision 2, on `repair-candidates/` objects.
But the underlying signal is real and worth stating plainly:

**Of 47,266 deu_for_eng clips, 95 have been repaired.** The "as often as possible" R9 batch
has ~30 sibling clips; **two** were repaired. Revision 1 means *never examined* — not
*proven healthy*.

---

## Measured damage — the ASR scan, and what the byte tests cannot do

### `duration_ms` is corrupted evidence. Do not audit with it.

Whatever rewrote the audio also rewrote `duration_ms`, so the DB agrees with the damaged
object and no duration/size arithmetic can see this defect. The blast-radius worker proved
it against ground truth: a duration-inversion detector catches **0 of 93** ear-confirmed
truncated clips at every threshold, and `ffprobe` of 15 of them shows `duration_ms`
agreeing with the *live damaged object* 15/15. Treat `duration_ms` as untrustworthy in any
future audit. My own earlier scratch script `probe-duration.cjs` had exactly this flaw; the
worked example above does **not** — its 4176 ms comes from `content_audit_log.old_row`,
which records the value as it stood on 08-03, not the post-repair value.

**Consequence:** scope must be set by **listening**, never by byte arithmetic.

### Estate-wide in-place truncation on live clips: zero

Full bucket enumeration — 5,048,251 keys, 7,388,425 versions, 0 null version IDs
(versioning never suspended). 19,278 currently-linked objects shrank in place, all in the
May/June clusters, and 348 ffprobe'd version pairs show these are **duration-preserving
re-encodes** (VBR ~100–120 kbps → 96 kbps CBR); 0 of 300 lost a millisecond. Real
truncation events exist further back (Dec 2025, Feb 2026) but every key they damaged is now
unlinked. A naïve byte reading would have reported 5,113 truncations in the May event;
ffprobe says none are real.

**The 08-03 damage is invisible to version history**, because it wrote *fresh objects*: 91
of the 93 ear-confirmed clips have exactly one version, dated 08-03, no delete markers. The
prior audio is unrecoverable.

### Exposure, measured rather than estimated

**404,299 live clips (15.89% of the estate) point at an object that did not exist when their
row was created** — 203,773 of them written on 08-03 alone. All `origin=tts`. `kor_for_hin`
100%, `deu_for_eng` 90.14%, and **83 course codes at 0%**. It selected on course and voice
(overwhelmingly the `xai_*` and in-house families), **not** on role — known/target1/target2
split near-evenly. This supersedes the ~490k estimate earlier in this document.

### The measured truncation rate — and the correction that matters

`tools/audio-word-loss-scan.cjs` ASR-scanned 600 deu_for_eng clips:
**93 truncated, 15.5%.** Split by whether the object was written after its row
(independently replicated by me):

| population | n | truncated | rate |
|---|---:|---:|---:|
| object rewritten after row creation | 443 | 77 | **17.4%** |
| never rewritten | 157 | 16 | **10.2%** |

The worker read the ~10% baseline as the tail-cutting code "shipping damage on the ordinary
render path too", and concluded it should be fixed before more audio is generated. **The
first half is right; the conclusion needs correcting.** Dating those 16 never-rewritten
truncated clips by row creation:

- **13 of 16 were created 2026-08-04** — inside the `repairTailDefect` window.
- Only **3** predate it (2026-06-08, 06-10).

So the baseline is not a separate, older, still-live defect. It is the *same* mechanism
caught on the first-render path rather than the rewrite path — which is exactly what
"born amputated" predicts. Both paths ran through `repairTailDefect`, and both are closed:
the function is deleted and merged to `main`, and the deployed checkout confirms it.

The 3 June clips are genuine unexplained residue — too few to characterise, and plausibly
ASR false positives. Worth a look, not an alarm.

---

## Confidence, and the gaps

**High confidence** on: the mechanism, the exposure window, the fact the path is deleted
and merged, the identity and timing of the two 08-03 events, and the per-course exposure
counts. These come from `content_audit_log` cross-checked against S3 LastModified and
`ffprobe`, and the two agree independently.

**Explicit gaps:**

1. **How many of the ~490k exposed clips are actually amputated is NOT answerable from
   provenance.** The DB duration matches the truncated file, so every metadata-based test
   passes. I built a size-vs-duration detector and it correctly flags the known-damaged
   set only when compared against a *corrected* duration — swept across all 47,253
   deu_for_eng clips it returns zero, which is a **method artefact, not a clean bill of
   health**. Only the acoustic decay-time detector can size this.
2. `whisper-cli` PATH exposure is established for **watson-1**. I did not verify which
   host executed each individual run, so I cannot say the guard was off for every course
   in the table — Kai's Mac may have had a working guard.
3. The Maintenance page's stats endpoint returns HTTP 500, as Tom noted. The underlying
   `content_audit_log` table is healthy: 2,857,520 rows spanning 2026-07-03 → 2026-08-06,
   so the whole window was queryable live and **no S3 archive recovery was needed**.
4. The 08-06 01:52–02:00Z `courses` churn on ara_lb_for_eng was excluded as our own work,
   per Tom.
5. The 162,322-row morning re-link event on 08-03 changed no audio characteristics, so I
   did not chase which tool ran it.

---

## One thing worth fixing

`course_audio` has **no `updated_at` column**. Every question in this investigation was
harder than it needed to be because the row cannot say when it last changed; the audit log
saved it. Worth adding.
