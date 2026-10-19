# Nightly DB caps — job 943

Prepared changes; not deployed and no production timings claimed.

Five read-only QA services use `/home/tomcassidy/.config/ssi-db/agent.env` instead of the owner environment. Round-index retains owner access because REFRESH MATERIALIZED VIEW requires ownership. Every round-index statement is explicitly capped at 5 seconds on its backend, with a 1-second lock timeout. Drift reads are per course; the refresh itself cannot be split without replacing the materialised view design. If it exceeds the cap, the job fails rather than raising its timeout.

A shared helper serialises callers and runs one transaction per statement, setting the application name and 5-second statement timeout with SET LOCAL. It commits between batches and rolls back on failure. Voice-variety's two subchecks retain their distinct application names. Optional missing policy tables remain optional; timeouts are never swallowed as empty results.

Audio-gap pages 200 slots per course/side before joining audio, retains empty-text slots for cursor progress, and sums counts across pages. It no longer builds a distinct text set for the whole course. Sibling identity partitions complete grouping keys (course, language or pod), preserving siblings together. Voice-variety scopes its linked-voice and reconciliation counts by course. Voice-audit runs table/pointer aggregates separately. These are separate snapshots, not an atomic estate-wide census.

## Schedule

UTC: round-index 02:40; audio-gap 04:00; sibling-identity 04:20; debut-practice 04:45; voice-variety 05:05; voice-audit 05:35. Existing QA spacing is retained; round-index becomes fixed UTC. Each service has a 10-minute overall limit. Persistent catch-up is disabled so a missed night cannot start at a school-time boot. Latest scheduled completion is before 06:00 UTC, outside UK 08:00–16:00 throughout the year.

## Verification

The new regression failed against the old wiring and passed after the changes. Its mock checks also prove rollback/serialisation and retention of all 450 slots across three pages per side. Ten affected test files passed: 70 tests. The sibling-identity suite passed again after extending its partition keys. No production database was contacted.

## Review and rollout gap

Tom's database rule forbids running tools edited in this job until they are reviewed and merged to the base branch. Therefore all six dry runs, real statement timings, agent-role permissions and successful completion remain unverified. Per-course aggregates and audio pagination may still need tuning after those measurements; a five-second cap proves a safety ceiling, not completion or throughput.

Review and merge this Popty branch and the companion Command Surface watchdog branch first. Refresh the nightly/prod checkouts to the reviewed commits, install the five QA service/timer pairs and canonical `ops/systemd/popty-user/ssi-round-index` pair, then reload systemd. The watchdog recognises all six `qa:` and `popty-nightly:` names, including voice-variety's subchecks, cancelling and naming statements over five seconds at all hours.

Run each landed entry point once with notices suppressed and evidence/state redirected to scratch. Audio-gap supports `--no-save`; round-index supports `--check` for measurement without refresh, but a subsequent capped refresh is needed to prove the write path. Record wall time and each `statement_ms`/audio-gap batch timing, failures and final counts. Do not lift caps to make a run green. No unit installation, service restart, merge or deployment was performed by this job.
