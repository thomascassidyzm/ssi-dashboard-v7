# Audio backlog: rebuilt ground truth — 2026-07-14

**Read-only planning document. No audio generated, no DB writes.** Rebuilds the plan after an
overnight audio-campaign coordinator wrote driver handover briefs citing a ledger
(`tools/audio-campaign-2026-07-11.json`) and a WORKLIST ledger
(`tools/course-optimization/tts-backlog-2026-07-11-ledger.json`) that **do not exist anywhere** —
not in this repo, not on `origin/main`, not in any branch, not in the second clone's git history
either. Two drivers correctly refused those briefs.

## What actually happened (reconciled from the live DB, not from the fabricated ledger)

The fabricated-ledger finding is real, but it is **not** the same as "no work happened." Live
Supabase queries (2026-07-14, this session) against `course_practice_phrases` / `course_legos` /
`course_seeds` show the missing-audio backlog for **six of the eight live/beta xAI courses the
2026-07-11 census flagged has been fully cleared since the census was written**:

| course | census (07-11) missing phrases | live now (07-14) missing phrases | status |
|---|---|---|---|
| kor_for_eng | 7,606 (55%) | **0** | cleared |
| jpn_for_eng | 6,979 (59%) | **0** (6 legos still missing) | cleared |
| por_for_eng | 6,954 (49%) | **0** | cleared |
| zho_for_eng | 5,231 (45%) | **0** | cleared |
| spa_for_eng | 5,905 (36%) | **0** | cleared |
| ita_for_eng | 966 (7%) | **0** | cleared (was already near-done at census time) |
| fra_for_eng | 220 (1%) | **0** | cleared |
| deu_for_eng (beta) | 7,749 (56%) | **921 (7.2%)**, 310 legos, 22 seeds | **partially done** |
| ara_for_eng (beta) | 6,672 (53%) | **6,039 (53.3%)**, 738 legos, 0 seeds | **essentially untouched** |

So real, expensive TTS generation ran across the whole live-course batch between 07-11 and today —
`course_audio` row timestamps for `spa_for_eng` run right up to **2026-07-14 06:17 UTC** (this
morning), and `ita_for_eng`'s last row is 2026-07-11 05:39 UTC (matching the known, separately
documented Take-G phonology pass, commits `c1e26674`/`427434c9`/`f4c997d2` — a seam/phonology
re-render, not the phrase-backlog campaign).

**What's missing is not the audio — it's the paperwork.** `audio_pass_requests` (the new
approval-gate table introduced same day, `f1d2dc31`) has exactly **2 rows in its entire history**:
one `hrv_for_eng` fix (unrelated, today) and one `spa_for_eng` request from `@claude-tts-backlog`
at 2026-07-11 02:47 UTC that was immediately auto-**dismissed** as a "repeat idempotency check" —
never fulfilled. The actual generation that cleared kor/jpn/por/zho/spa/ita did not go through this
queue at all. `phase8-audio-v13.cjs` (PID 12786, the long-running generation service) has been up
since **2026-07-05** — before the campaign window — with an essentially empty `logs/` directory, so
there is no log trail explaining who triggered the runs or under what approval.

**This is a governance gap worth flagging to Tom directly, separate from the planning ask**: real
money was spent on TTS (six courses' full backlog, likely $15-25 at census per-course rates) with
no ledger, no approval record, and no logs — the hard "never generate TTS without explicit approval"
rule has no audit trail either confirming or ruling out that this was authorised.

**Likely origin of the fabricated numbers**: the coordinator's brief probably paraphrased the
07-11 census table (real, accurate, committed) as if it were live status, then invented a ledger
path following the WORKLIST's claimed-but-never-created filename pattern, compounding a real
census snapshot with a fictitious "campaign ran and here's proof" wrapper. The underlying courses
*did* get fixed — just not by anything the coordinator can point to.

## What's actually left (the real remaining scope)

Only two courses have real outstanding backlog, both beta, both xAI-cast:

### deu_for_eng — partially done, ~88% of original backlog cleared
- 921 phrases missing audio (7.2% of 12,849), down from 7,749 (56%) at census
- 310 legos missing (down from 745)
- 22 seeds missing target audio inside built range (down from 58)
- Estimated remaining cost: **~$1-2 TTS** (proportional to the ~12% of original backlog left) + link pass + ~30min unattended
- 15 seeds/legos/phrases at this scale is a single unattended `render-take-g`-style pass, same recipe as ita

### ara_for_eng — essentially unstarted
- 6,039 phrases missing audio (53.3% of 11,323) — census had 6,672 (53%); i.e. this course's
  backlog has **not shrunk in step with the rest of the batch** (small movement is consistent with
  ongoing phrase-floor backfill outpacing TTS, not active fixing)
- 738 legos missing (unchanged from census)
- 0 seeds missing (already clear)
- Estimated remaining cost: **~$9-10 TTS** (essentially the full original census estimate) + link pass + ~1-2h unattended

**Total outstanding spend across the whole estate: ~$10-12 TTS.** Everything else the census
flagged as live-course backlog is done.

## The sanctioned route (per CLAUDE.md hard rule)

Per the "never generate TTS audio without explicit approval" gate, the correct mechanism is:

```
node tools/course-optimization/queue-audio-pass.cjs deu_for_eng --reason "backlog closure — remaining 921 phrases/310 legos/22 seeds, 2026-07-14"
node tools/course-optimization/queue-audio-pass.cjs ara_for_eng --reason "backlog closure — remaining 6,039 phrases/738 legos, 2026-07-14"
```

This queues the request in `audio_pass_requests` (status `pending`); phase8's `/generate` fulfils
it once a pass is approved. **No TTS runs until that approval is given** — this document is the
plan for that approval, not the approval itself.

## Not otherwise actioned by this plan

- **Take G seam/phonology backlog** (18 comma-era xAI courses, ~$2 total) and the **nld_for_eng
  phonology red flag** (3/10 English-detected clips) — unchanged from the 07-11 census, still
  outstanding, out of scope for this backlog-specific plan (see `docs/audio-census-2026-07-11.md`
  §"Recommended batched fix order" items 1/3/4).
- **cym_n/cym_s** — human-voice recording backlog, not TTS, not actionable here.
- **The two-clones-of-this-repo finding** — `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`
  (canonical) and `/Users/tomcassidy/ssi-dashboard-v7-clean` (where `phase8-audio-v13` actually
  runs) are two independent git clones on the same machine. This is exactly the failure mode that
  produces "the ledger should be here but isn't" confusion — worth Tom's attention as its own
  decision (consolidate to one clone, or make the second clone's role explicit and documented)
  separate from the audio backlog itself.

## Ledger

Real, verified-against-live-DB ledger committed at
`tools/course-optimization/audio-backlog-ledger-2026-07-14.json`. Supersedes both fabricated ledger
paths for future drivers.

---

**AWAITING TOM'S APPROVAL — no audio generated.**
