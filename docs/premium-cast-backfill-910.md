# Premium cast backfill — 17 October 2026

Blocked: Popty staging shares the live Supabase database. A staging API request that changes a course audio pointer also changes production. The committed `tools/promote-staging.cjs` in the staging checkout documents this explicitly: “staging is for reviewing CODE, not for data isolation”. No clip render or pointer change was attempted.

Read in full through GET /api/rulings?id=: r-2026-10-17-premium-courses-make-clips-for-all, r-2026-10-17-spa-mx-backfill-triggered-re-voice, r-2026-10-16-voice-casting-10-16-cast-spa, and r-2026-10-11-premium-re-voicing-cartesia-follows-where.

The requested opening band remains seeds 1–100 of every premium course, followed by work just ahead of the furthest active learner. The existing unchanged revoice tool uses library-first rendering and link-clip with replace/expectCurrent and content_version reporting, but its default verification URL is the production learner audio proxy.

## This job's changes

| Course | Clips reused | Clips rendered | Slots switched on | TTS characters spent |
| --- | ---: | ---: | ---: | ---: |
| Spanish (Mexico) | 0 | 0 | 0 | 0 |
| Spanish (Spain) | 0 | 0 | 0 | 0 |
| French | 0 | 0 | 0 | 0 |
| German | 0 | 0 | 0 | 0 |
| Italian | 0 | 0 | 0 | 0 |
| Portuguese (Portugal) | 0 | 0 | 0 | 0 |
| Portuguese (Brazil) | 0 | 0 | 0 | 0 |
| Chinese | 0 | 0 | 0 | 0 |

These are this job's counts, not estate totals. No content_version changed through this job. No tests ran because no application code changed.

## Explicit gaps

- An isolated staging data destination is required to execute this brief as written. Otherwise the scope must explicitly authorise changes to the shared live course data.
- No standalone Mexican Spanish revoice process was visible in the process check. API-managed activity was not established; no duplicate run was started.
- Current daily estate TTS spend, live per-course gaps and active learner frontiers were not established. The original page uses the 03:30 UTC backup and is not evidence of current live counts.
- The original published page is an immutable snapshot; this report is a separate status supplement, not a refreshed census or a replacement for its figures.

Original census: https://watson-1.tail4968cb.ts.net/d/88d06bf3
