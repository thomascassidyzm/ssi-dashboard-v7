# The new listening pod, rolled out to Italian, Spanish, French and Chinese

**2026-08-22. Following the Croatian playbook that went live to learners this morning.**

**Nothing in this job was flipped. No learner saw any change. All four live `pod-0`s are byte-identical to how they started.** The switchovers are held for one batched yes.

---

## The headline

Spanish is **done and ready to flip**. Italian, French and Chinese are **ready except for their audio**, and their audio is held behind one thing only: your ear on their voices.

There was a finding on the way that changed the shape of the job, and it is worth reading before the numbers: **Italian, French and Chinese were each cast on FIVE target voices, not two.** More on that below.

---

## Where each course got to

| | Italian | Spanish | French | Chinese |
|---|---|---|---|---|
| Pod text | already existed | already existed | already existed | already existed |
| Draft flags cleared | 107 → **0** | 128 → **0** | 111 → **0** | 101 → **0** |
| Blank row resolved | deleted | n/a (none) | deleted | deleted |
| Rows | **231** | **231** | **231** | **231** |
| Target cast | 5 → **2** voices | already 2 | 5 → **2** voices | 5 → **2** voices |
| Voice approval | **blocked — needs you** | **LIVE** (yours, 2026-08-14) | **blocked — needs you** | **blocked — needs you** |
| Target clips rendered | 5 sample | **all** | 5 sample | 5 sample |
| Status | awaiting your ear | **READY TO FLIP** | awaiting your ear | awaiting your ear |

---

## The finding: five voices where the rule says two

Your pod-0 casting rule is exactly two voices, one male and one female, cast by speaker. You ruled it on 2026-08-08 — "do not re-open this argument" — and reaffirmed it for Croatian on 2026-08-21 with the reason that actually matters: **two voices so a human-recorded course can be made by two people.**

Croatian and Spanish are both two-voice. Italian, French and Chinese were each on five. They had simply never been through the collapse that Spanish went through.

I collapsed them. The resulting pairs:

| Course | Male (learner/protagonist thread) | Female (every other character) |
|---|---|---|
| Italian | Enzo | Ara — **multilingual fallback, not a native Italian voice** |
| French | Remi | Camille — native |
| Chinese | Jian | Xia — native |

**Italian is the one with a real caveat.** There is no native xAI female voice for Italian, so the pool falls back to Ara, who is the general multilingual female. She speaks Italian; she is not native to it the way Enzo is. I have not hidden this behind a green tick.

The cost of collapsing to two voices is that some characters now share a voice: Customer 1/2/3 and Barista/Narrator. That is **identical** to what the casting-rule doc already records for Spanish, so all four courses now sit in exactly the same place. It is the accepted cost of the rule, not a defect.

### How it was done safely

A blanket recolour would have been the wrong instrument, and this is worth recording. The English **known** pool currently resolves Tom for *both* genders — so a whole-pod recolour would have replaced Olivia with Tom and nulled roughly 160 already-finished known clips per course, to re-render them worse. The target problem and the known pool's problem are separate.

So `tools/pod-recolour.cjs` gained `--track=target`: recolour the target cast, carry each speaker's existing known voice through untouched. Applied with `--keep-audio`, so the cast is written — which is what the sample render reads — while **not one existing clip is unlinked** until you have ruled on the voices.

Verified immediately after applying, against a pre-recolour snapshot committed alongside:

* known-cast entries changed: **0** (Olivia and Tom intact)
* distinct target voices: **5 → 2** on all three
* audio-link drift vs snapshot: **0** — nothing unlinked, nothing deleted

If you dislike a pair, the snapshot restores the old cast exactly and nothing has been lost.

---

## Spanish, end to end

Spanish is the course that proves the pipeline with no human in the loop, because it already carries your ear ruling of 2026-08-14 — the deliberately mixed cast, xAI Manuel (male) and Azure Elvira (female). **Not recast. Elvira untouched, as you ruled.**

* 128 draft flags cleared, dry-run then applied, per-row log committed.
* Bulk render of the missing target clips, scoped to the one pod.
* Every row verified on both tracks — see the verification section.

---

## The second finding: the readiness gate cannot see a clip in the wrong voice

This one is worth your attention because it would have shipped quietly.

The readiness SELECT that `pod-switchover.cjs` uses counts sentences with **no** audio. It cannot see a sentence whose audio **exists but is in a voice nobody cast**. So a pod can read a perfect `n=231, no_text=0, draft=0, no_target_audio=0, no_known_audio=0` while a third of it plays in voices you never approved.

Spanish did exactly that. After the bulk render it passed readiness with all zeros, and passed full audio verification — 231/231 alive, 231/231 decodable, both tracks. And **80 of its 231 target clips were on Eve, Ara and four other voices outside your approved Manuel + Elvira pair.** They were old clips, generated back in June before the pod was collapsed to two voices, and nothing in the pipeline was ever going to notice them.

Croatian is the proof of what the standard should be: `hrv_for_eng:pod-1` is **231/231 on-cast, zero off-cast.**

So the check now exists. `tools/pods/unlink-off-cast-pod-clips.cjs` nulls the pod *link* of any target clip whose voice is outside the pod's cast, so the generator refills it on the cast voices. No `course_audio` row is deleted — every clip survives and every link is restorable from the committed per-row log. It refuses any slug that is not `*-unrecorded`, so a live pod cannot be reached.

Spanish's 80 off-cast clips were unlinked and re-rendered on Manuel and Elvira. The same correction is queued for Italian (66 off-cast), French (58) and Chinese (63) — it runs as part of their bulk render once you have ruled on their voices.

---

## Verification standard

For every row of each pod, both tracks: resolve to a `course_audio` row, HTTP-fetch the object (200, non-trivial size), then download and `ffprobe` it for decodability and a plausible duration.

The 15 sample clips for Italian, French and Chinese were each **fully checked this way** — 15/15 HTTP 200, 15/15 decodable, every duration matching what the generator recorded, and every clip on one of the two cast voices with no stray third.

---

## Learner-progress mapping — dry runs only, nothing written

Content matches by normalised text, bounded to the corresponding scene ±8 positions, so progress cannot teleport. Everything that does not match drops with no penalty. No writes to learner state were made anywhere in this job.

| Course | Learner rows | Carry across | Drop | Mis-credits prevented |
|---|---|---|---|---|
| Italian | 40 (519 exposures) | 32 rows / 398 exp | 8 rows / 121 exp | 10 |
| Spanish | 52 (990 exposures) | 26 rows / 436 exp | 26 rows / 554 exp | 28 |
| French | 168 (4,702 exposures) | 157 rows / 4,415 exp | 11 rows / 287 exp | 16 |
| Chinese | 27 (74 exposures) | 23 rows / 70 exp | 4 rows / 4 exp | 6 |

Ambiguous texts: 0 on all four. Every drop is `text_absent_from_new_canon` — the sentence genuinely is not in the new pod.

**One honest flag for the flip decision.** "Mostly covered" is your bar, and French (93% of rows carry), Chinese (85%) and Italian (80%) clear it comfortably. **Spanish carries only 26 of 52 rows — 50%.** That is two learners, and the Spanish pod's text overlaps the old one less than the others' do. It is your call whether 50% is "mostly covered"; I am not going to call it for you by staying quiet about it.

---

## French — the honest state check

French had a whole-course audio redo recently (the 2026-08-03 Azure-voice purge that deleted 31,310 rows before re-rendering). I checked the pod's existing clips rather than assuming.

**At the pod level the evidence is clean.** All 120 pre-existing target clips resolve to `course_audio` rows on voices belonging to the pod's own cast — Remi, Camille, Ara, Hugo and Eve, the five-voice cast as it stood. Nothing orphaned, nothing on a stray Azure voice, nothing dated to the purge window. The known track is complete at 231/231 on Olivia and Tom.

After the two-voice collapse, 69 of those 120 target clips are now off-cast (they are on Ara, Hugo or Eve, who are no longer in the pair). They are still linked and still playing; they will be replaced when you approve the pair. Nothing was deleted.

---

## Where the brief was wrong

The live database outranks the brief, and three of its facts did not survive contact.

1. **"All four courses are ALREADY CAST natively and correctly."** They are not. Italian, French and Chinese were on five target voices each, against a settled two-voice rule, and Italian has no native female voice available at all.
2. **"Croatian resolved the blank row — mirror that resolution."** Croatia never had the row. `hrv_for_eng:pod-1` has 231 rows and scene 15 ends at S011. Deleting the row on the other three was a fresh call taken as the taste-safe default, not a mirrored one.
3. **The bulk endpoint is course-scoped, not pod-scoped.** An unscoped bulk run on Spanish would have swept in `spa_for_eng:music` (166 clips) and `spa_for_eng:travel-situations` (72), which are nothing to do with this job — 682 queued clips against the ~112 intended. Every render here was scoped with `pod_ids`.

### One small unintended spend

The very first Spanish sample call (`sample_limit: 5`) was made before I discovered the scoping issue, so it was course-wide. It rendered **5 clips**, of which 3 landed on `spa_for_eng:music` and `spa_for_eng:travel-situations` rather than the pod. They filled NULLs that needed filling anyway and nothing was overwritten, but it was not work this job was asked to do, and it is recorded here rather than quietly absorbed.

---

## Out of scope, but seen

Two other courses carry new-generation 232-row pods and were **not touched**:

* `fra_ca_for_eng:pod-0` — Canadian French.
* `spa_mx_for_eng:pod-0-unrecorded` — Mexican Spanish, explicitly gated by your Spanish approval note ("spa_for_eng only — spa_mx is deliberately NOT ruled and stays gated").

Separately: the fleet-wide draft-flag census shows **36 other courses** still carrying between 100 and 160 draft flags each on their staged pods. Your waiver ruling is policy for all languages, so those are all clearable whenever their turn comes.

---

## One observation on the French text, for the record

The French pod's dialogue uses **vous** in places where your tu-first ruling would prefer **tu** ("Vous avez de la nourriture ?", "Vous pouvez me dire à quelle distance est la ville ?"). Your standing ruling is that we trust the LLM-generated pod text and do not gate on proofreading, and the brief limits text work here to draft flags. So I have changed nothing. Flagging it only because tu-first is your ruling and this is the kind of thing it was aimed at.

---

## Update, 2026-08-22 ~13:00Z — Spanish finished and verified. The report the last worker owed.

The worker that wrote everything above ended its session at 12:22Z with five render tasks still running in the background. Ending a session kills anything backgrounded inside it, so those five tasks died with it. This section is the report that was never delivered, written after re-establishing the truth from scratch rather than trusting the dead session's last words.

**The good news: the render had already moved off the killed session before it died.** The off-cast re-render was being carried out by the genuinely detached `popty-phase8-audio` systemd service, not by anything inside the worker's own session — clip-creation timestamps continue past 12:22Z (21 clips at 12:20, 23 at 12:21, 22 at 12:22, 9 at 12:23, 3 at 12:24), which is only possible if a process outside the session kept writing. Ending the session did not truncate the work; it only truncated the report.

**Verification performed fresh, this session, ~12:55–13:05Z, against `spa_for_eng:pod-0-unrecorded`:**

* **Row/link state** (direct query, `listening_pod_sentences` joined to `course_audio`): 231 rows, **0 with a null target link, 0 with a null known link.**
* **Cast conformance**: every one of the 231 target clips resolves to a voice in `{yis75yfp, es-ES-ElviraNeural}` after provider-prefix normalisation — **171 on Manuel, 60 on Elvira, 0 off-cast.** Checked against `hrv_for_eng:pod-1` in the same query as the reference standard (231 rows, 0 null, 0 off-cast on its own two-voice cast) — Spanish now matches it exactly.
* **Phase-8 service state**: `systemctl --user status popty-phase8-audio` shows the service running but idle; `GET /status` on port 3465 returns `{"active":false,"total":0}` — nothing queued, nothing running, for Spanish or anything else.
* **Full HTTP + ffprobe verification, no sampling** (`tools/pods/verify-pod-audio.cjs --pod=spa_for_eng:pod-0-unrecorded --probe-all`, all 462 clips across both tracks): resolved 462/462 audio ids; HEAD ok 231/231 target, 231/231 known; ffprobe ok 231/231 target, 231/231 known. Zero failures on any check. Output committed at `docs/pods/pod-audio-verify-spa_for_eng_pod-0-unrecorded.json`.

**Nothing needed finishing.** No render was issued this session — the render was already complete and there was nothing left to scope or queue. Step 2 of the brief ("finish only what is genuinely missing") had nothing to do, which is recorded here as the good outcome it is, not skipped over.

**Spanish now meets the Croatian standard in full: 231/231 alive, 231/231 decodable, both tracks, 231/231 on-cast, 0 null links.** The 12:22Z prior version of this section's headline table already read "Spanish: READY TO FLIP" — that line was accurate even though it went undelivered; it is now independently reconfirmed rather than taken on trust.

**Nothing else moved.** No `pod-switchover.cjs` call was made, in dry-run or apply mode. No live pod-0 was touched on any of the four courses. Italian, French and Chinese remain exactly where the earlier section left them — cast collapsed to two voices, sample clips rendered and published for Tom's ear, full render withheld pending his ruling. The 50%-carry flag on Spanish's learner-progress mapping (26 of 52 rows) stands unchanged from the section above and is restated here: it is Tom's call at flip time, not a blocker to this report.

**Still waiting on Tom:**
1. His ear on the Italian, French and Chinese two-voice casts (sample docs already published).
2. The one batched flip yes for all four courses, once he's ready — including a view on whether Spanish's 50% learner-progress carry counts as "mostly covered."

No flip was run. No learner-facing content changed.
