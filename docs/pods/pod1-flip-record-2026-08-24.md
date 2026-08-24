# Pod 1 flip — 21 courses live

**2026-08-24, 08:30–08:36 UTC.** On Tom's 08:22Z GO, and his correction that it is
*courses* that flip, not languages — a course is a (target, known) pair.

## The gate, as Tom stated it

> Only flip a course where BOTH its target track AND its known track are 100% complete —
> every one of its 231 lines has verified audio on both tracks, every clip in the voice cast
> for its own speaker, zero off-cast.

Re-measured from the live database at flip time. The 02:24Z done card and the render logs
were not trusted for this; they agree, but agreement was the outcome, not the input.

## Flipped — 21 of 21

Every one: 231 sentences, both tracks fully linked to live `course_audio` rows with S3 keys,
zero off-cast clips on either track, cast gate green (exactly two voices, zero same-voice
exchange pairs), pod `visibility=live` on slug `pod-1`, zero orphaned progress rows at commit.

`ara` · `ara_eg` · `deu` · `deu_at` · `eus` · `fra` · `fra_ca` · `gle` · `hin` · `hrv` ·
`ita` · `jpn` · `kor` · `nld` · `por` · `por_br` · `ron` · `spa` · `spa_mx` · `swe` · `zho`

Held list: **none**. All 21 candidates cleared the gate.

Every old pod is **archived, not deleted** — `pod-0-retired-2026-08-24` or
`pod-1-retired-2026-08-24` — and every flip carries a one-line rollback in its log under
`scripts/flip-d7255a65/apply/`.

### Two measurement corrections on the way in

Both were bugs in *my* first census, caught because the answer was implausible, and both are
worth knowing because either one would have held courses that were fine:

1. **Provider prefixes.** `xai_69smp8rm` and `69smp8rm` are one voice. Comparing raw
   `voice_id` reported 127–231 off-cast clips per course — up to 100% of the pod. The
   estate's own tool already strips `^(xai_|azure_|eleven_)`; reusing its comparison took
   every course to zero off-cast. **Read the tool that already does the measurement.**
2. **Staging slug is not uniform.** 18 courses stage on `pod-1-staged-2026-08-23`;
   `gle`, `hin` and `nld` stage on the older `pod-0-unrecorded`. A census keyed on one slug
   reports the other three as "no staged pod" — which reads as a content gap and is a naming
   fact.

### The draft-flag gate, and why clearing it was not a new decision

`pod-switchover.cjs` refused five courses — `gle` 117, `hin` 132, `nld` 115, `deu_at` 155,
`fra_ca` 112 — on sentences still marked `target_text_draft`. Every one of those rows already
carried a `target_text_approved_at` stamp from `verifier:claude-opus-5`.

Tom waived the human-proofread gate on machine-drafted target text on 2026-08-22 — we do not
speak the 100 target languages and cannot scale a human proofread across them. The other 16
courses had `waive-proofread-draft-flag.cjs` run against them at the time; these five simply
never did. Applying the standing ruling through the canonical tool, not overriding a gate:
631 rows cleared, per-row logs in `docs/pods/*-proofread-waiver-applied-log.json`.

## Learner progress

Migrated in the same transaction as each move, by content and corresponding scene, per
`pod-migration-protocol.md`. **214 rows across the 21 courses, 4,247 exposures, zero
mis-credits, zero orphans at commit.**

The largest carries: `swe` 72 rows / 2,505 exposures · `hrv` 46 · `fra` 24 · `por` 15 ·
`eus` 13 / 450 · `ron` 11 / 302.

Several courses report "0 carried" against a plan of N — `fra`, for instance, planned 24 and
carried 0. That is correct and not a no-op: where the promoted slug equals the retired slug,
a sentence that matched by content lands on the *same* slot key, so the tool skips the write
(`if (target === a.sentence_id) continue`). The in-transaction post-check then asserts that no
state row points at a non-existent sentence, and it passed on every course.

`hin` dropped one row. A removed sentence drops with no penalty — protocol rule 5.

## One real finding: the in-flight session race

`nld_for_eng` committed at 08:34:44Z. At **08:35:31Z — 47 seconds later** — a real human
learner (`jackbrooks_25`, whose last course is Dutch) wrote **14 new** `learner_pod_state`
rows keyed on `nld_for_eng:pod-0:…`, a slug that no longer exists. Their client had resolved
pod-0 before the flip and carried on writing to it.

The migration did its job: it was clean at commit, and these rows were created afterwards.
But the flip has no defence against a session that is already open, and those 14 rows are now
dead progress for a real person.

**The canonical repair tool cannot express this fix, and was not forced.**
`pod-state-migrate.cjs --from=pod-0-retired-2026-08-24 --to=pod-1` plans to drop all 16 rows
with reason `slot_not_in_old_canon`: the archive rename re-keyed the old pod's sentence ids to
`…:pod-0-retired-2026-08-24:…` while the learner's rows still say `…:pod-0:…`, so nothing
matches — and it would delete this learner's two *valid* pod-1 rows along with the dead ones.
Dry run only, nothing applied: `docs/pods/nld-inflight-session-repair-2026-08-24-dryrun.json`.

A content-matched repair under the protocol is running as job #227, with the two good rows
protected by `greatest()` so progress cannot go backwards.

Worth Tom's ruling separately: **should a flip defend against open sessions at all?** Cost
today is one learner re-listening to three scenes of Dutch. Cost at scale is one such learner
per flip per popular course.

## Explicit gaps

- **Player-path verification is not in this document.** Job #225 is probing the deployed read
  path — the shared pod-slug resolver and the five player read sites, then the deployed API
  for all 21 courses. Until it reports, "live in the database" is proven and "loads in the
  player" is not.
- **Served-bytes coverage is a sample, not a census.** The 2026-08-24 render verified 10 clips
  per pod on the served bytes (voice, VAD, STT) and every sample came back CLEAN. This flip's
  gate checked all 462 links per course in the database — that every clip exists, resolves and
  is on-cast — not that all 462 decode. Nothing regressed; the coverage is just narrower than
  the phrase "verified audio" might suggest.
