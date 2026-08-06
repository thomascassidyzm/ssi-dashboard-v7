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
| **2026-07-24 03:02** | `repairTailDefect` introduced, mutating by default | `44fef862` |
| 2026-07-28 16:55 | `whisper-cli` first installed on watson-1 | binary mtime |
| 2026-08-03 09:00–11:59 | **Re-link event**, 162,322 `course_audio` rows: `s3_key` changed, duration/voice/text **unchanged** — no audio characteristics altered | `content_audit_log` |
| **2026-08-03 17:00–23:59** | **Re-voice run**, 42,256 rows: `s3_key`, `duration_ms` and `voice_id` all changed — legacy Azure voices → house voices. This is the run that produced Tom's ear-confirmed clips | `content_audit_log` + S3 LastModified |
| 2026-08-04 11:50 | Partial fix — hold rather than trim when a cut eats >half the clip or leaves silence | `f8c380bd` |
| 2026-08-05 01:24 | `TAIL_REPAIR_MODE` default flipped from repair → flag | `d5ad9f2c` |
| **2026-08-05 21:22** | Mutation path **deleted entirely**; merged to `main` | `8415f2d9` |
| 2026-08-06 00:06–00:10 | Tom's 93 accepted deu repairs swapped in | `course_audio_revisions` |

**Exposure window: 2026-07-24 03:02 → 2026-08-05 01:25**, fully closed 2026-08-05 21:22.

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
