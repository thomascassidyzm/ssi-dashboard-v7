# The export — reference for workers and humans

Written 2026-10-28 ~19:50Z from live Popty code and the job reports of 27–28 Oct. **Code wins over this page.** If it disagrees with `services/production-api.cjs`, `services/shared/export-*.cjs` or `tools/remaster-mp3-headers.cjs`, the code is right. Facts that change by the hour (pass/fail per course) are NOT here: read `GET http://localhost:3470/api/production/<course>/export-state`.

## In plain English

**What it is.** "The export" is how a finished course is handed to the legacy native app. Popty builds a manifest (the course's list of seeds, LEGOs and every audio clip), checks that every clip really is in the stage S3 bucket and is a clean, correctly-timed MP3, publishes the manifest, and finally copies the audio from the stage bucket to the production bucket.

**Which courses.** The "export set" Kai named on 27–28 Oct is twelve courses: the nine paid for-English courses (`ara`, `fra`, `spa`, `deu`, `deu_at`, `kor`, `jpn`, `por`, `zho` — all `_for_eng`) plus `fra_ca_for_eng`, `por_br_for_eng` and `spa_mx_for_eng`. `ita_for_eng` was exported earlier and is also in the checks. There is no flag in the database for "ready for export" (`courses.export_ready` is false for all courses, checked 28 Oct by job #39·AA), so the list lives in Kai's head and on the done board.

**The steps (the UI calls them Step 1–4):**
1. **Step 1 — Generate the manifest.** Builds the course manifest from the database (seeds, LEGOs, audio ids). With audio, it also joins existing clips into the combined intro clips with ffmpeg. This never renders new voice audio. Fails if a text has no audio sample entry.
2. **Step 2 — Verify S3 Audio.** The check that every file exists, plays and is the right length. For every audio id in the manifest it (a) checks the file exists in the stage bucket `ssi-audio-stage`, (b) downloads it and measures its real length with `sox` and compares with the manifest, (c) checks the MP3 format. Length mismatches are auto-fixed in the manifest and in `course_audio.duration_ms` (so Step 2 **writes to the database**; there is no read-only mode). Format failures are not auto-fixed; they block.
3. **Step 3 — Publish manifest.** Writes `Courses/<id>.json` into the `course-configs` git clone (branch `author`), pushes it, and can stage-deploy / restart the stage server over SSH to `ssi@apidev` (a Ruby `./check -e stage deploy` tool that asks Y/N questions; Popty answers them with pexpect). **Needs a `course-configs` clone and SSH keys that watson-1 does not have today**, so it currently runs from Kai's own machine (see Planned).
4. **Step 4 — Deploy audio to production.** Copies the audio from `ssi-audio-stage` to `ssiborg-assets`, then re-measures the production copies with sox against the published manifest; a course is marked deployed only if every file matches.

**What "pass" means now.** Since 28 Oct a course passes Step 2 only if the sox length check AND the MP3 format check actually ran on every file (Kai's ruling: "if it's not run, we can't allow a course to be exported to the legacy app"). Before that, sox was missing on watson-1 and twelve courses showed as passing on file presence alone — which is why the 23:26Z 27 Oct "Export ready" card was wrong.

**The ID3v2 header problem.** Clips encoded by ffmpeg's MP3 muxer carry an ID3v2 wrapper and a malformed LAME-extension field. iOS/AVPlayer clips the end of such files and can stop decoding in concatenated streams. The format check flags them as `has_ID3v2_wrapper` + `encoded_by_ffmpeg:Lavf…`. Files made with the real `lame` encoder are fine.

**How a failing clip is fixed — and what is NOT done.** The precedent is job #39·AA (28 Oct), which fixed 3 French clips (`j'apprends le français` target2; `lundi`, `avec du lait mais sans sucre` target1) **without re-rendering any voice audio and without TTS spend**. It ran the committed tool unchanged:

```
node tools/remaster-mp3-headers.cjs --execute --keys-file <file of "mastered/<UUID>.mp3" lines> --no-update-duration
```

(with `S3_BUCKET` = the stage bucket; `lame` on PATH). For each key the tool: backs the original up to `mastered_backup_lavf/<uuid>.mp3` (skips if the backup exists); downloads it; re-encodes the *existing audio* with ffmpeg `loudnorm` piped into the real `lame` binary; checks the new file has a clean `ff fb` header AND the same sox sample count as the original; only then uploads over `mastered/<uuid>.mp3`. `--no-update-duration` means no database write; the clip's length shifts by ~24 ms, which Step 2's own auto-fix corrects on the re-run. Then re-run Step 2. It is resumable (already-clean files are skipped). Never re-render the voice for this; if a fix would need a re-render, stop and ask.

**Who consumes it.** The legacy native app's learners, served from the production bucket `ssiborg-assets` via the manifests in `course-configs` / apidev. The sources I read name no other consumer (see gaps).

## Where it stands (as of 2026-10-28 ~19:45Z — re-read the export-state routes before relying on this)

| Course | State |
|---|---|
| `ita_for_eng` | Step 2 PASS, 38,100 files, 0 missing, 0 format failures (run 16:32–16:57Z, job #27·AA). |
| `fra_for_eng` | Step 2 PASS after the 3-clip remaster (#39·AA). |
| `spa_for_eng` | 46,167 files, 0 missing, 0 duration errors, **10 clips fail format** (ID3v2/Lavf). #39·AA's driver remastered exactly those 10 at 19:41Z (10 re-mastered, 0 errors) and started Step 2 attempt 2 (due ~20:12Z). **#96·AA is waiting on that result.** No final `s3Verified` yet. |
| `kor_for_eng` | Never exported before today. #95·AA ran Step 1 (656 seeds, 1,332 LEGOs, 34,614 audio ids; validation clean) and Step 2. At 19:43Z the stored state shows 35,415 files, 0 missing and **10 format failures** (same ID3v2/Lavf signature), `s3Verified` false — the run may still have been in progress. Not fixed yet. |
| `por, deu, ara, zho, jpn` (`_for_eng`), `fra_ca`, `por_br`, `spa_mx` | Stored state says `s3Verified: true`, but the timestamps are **15–19 May 2026** and the file totals are the old ones (e.g. ara 17,182 files then vs 37,217 now). **These are NOT current passes under the fail-closed rule.** #39·AA's sequential driver (`cs-long-keep-step2-all4`) will re-run them after spa. Separately, job #994 (`077b853d`) ran `ara_for_eng` through the CLI verifier on 28 Oct: sox measured all 37,217 files, all valid MP3, 13,294 durations corrected — a pass, but it is recorded in `~/ssi-evidence/export994/out/`, not in the stored export state. #994 has its own unit (`cs-long-keep-export994-analyse2`, expected 20:30–21:00Z) verifying the remaining courses — a second runner alongside #39·AA's driver; check for overlap before starting any Step 2. |
| `deu_at_for_eng` | No stored export state at all (28 Oct 19:46Z). |

**The done card must be corrected.** Card #4578 / plate item S-481 (27 Oct 23:26Z) says "all nine paid courses plus French Canadian, Brazilian Portuguese and Mexican Spanish pass both export checks, 0 files missing". That was file-presence only. The correction has to wait until spa and kor have final Step 2 results.

## Planned / open
- Correct the "Export ready" card once spa + kor finish (Kai's instruction, 28 Oct).
- Export target date: Kai said on 27 Oct he wanted to export **28 Oct**. Whether that date still holds is not stated in any source I read.
- Move Step 3 to watson-1 (job #40·AA recommendation, not approved): clone `course-configs` for the `popty` user, a GitHub deploy key, a locked-down `ssi@apidev` key (`command=`, `restrict`, `from=`), outbound-only, scoped stage-bucket IAM user, one audit line per publish. Needs someone to confirm apidev is reachable from watson-1.
- Step 4 caution (#994): deploying "new-only" leaves old production files whose bytes differ from stage (613 for ara), and Step 4 then refuses to mark the course deployed.
- Open data questions: Step 2 logged 3–9 database sync errors on fra/spa that nobody has examined; por_br `S0532L01C01` has target text "-" (needs a text fix, does not block); newly rendered clips store ffprobe lengths that sox disagrees with by 24–40 ms, so Step 2 will keep auto-correcting them.

## Short technical section
- Routes (production-api, :3470): `POST /api/production/:course/export-legacy-with-state` (Step 1; use `withAudio:true`; the Step 1 *button* overwrites saved export state), `POST|GET|DELETE /api/production/:course/verify-s3` (Step 2), `GET /api/production/:course/export-state`, `POST /api/production/:course/publish-manifest`, `POST …/stage-deploy`.
- Step 2 code: `services/shared/export-step2-run.cjs` (`runStep2`), run in a **detached worker** `tools/audio/export-step2-worker.cjs <course> <stateDir>` that survives API restarts (job #27·AA: before it, every push to main restarted the API mid-run). Progress file: `services/shared/export-step2-state.cjs`. A full course takes ~25–40 min.
- Verdict: `services/shared/export-audio-check.cjs` (`stageVerdict`, `audioCheckGap`) — fail closed (job #994). Read-only twin: `tools/audio/verify-export-stage.cjs <pending_manifest.json>` (writes nothing; exit 2 = would fail).
- sox: built without sudo into `vendor/sox/bin/sox` (`tools/deploy/build-user-sox.sh`, job #176); use `sox stat`, not `soxi -D`.
- Header fix: `tools/remaster-mp3-headers.cjs` (above). Tests for the check: `services/shared/export-audio-check.test.cjs`, `export-step2-run.test.cjs`, `tools/audio/verify-export-stage.test.cjs`.
- Stage bucket `ssi-audio-stage` → production bucket `ssiborg-assets`. Combined intro clips are built in Step 1 "with audio"; the census (#498) failed 9,211 Step 2 files only because it ran Step 1 without audio.

## Gaps in this page
- The source of apidev's `deploy.rb` / `./check` is not in any repo I can see; Step 3's prompt list comes from `services/stage-deploy.py` only.
- I did not run any export step (Step 2 writes to the database). All state above is from stored export state and worker reports.
- The consumer/deadline beyond "legacy app, 28 Oct" is not in the sources.
