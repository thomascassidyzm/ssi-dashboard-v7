# Uptime Monitoring Spec

## Why

When learners report "the app went down today", we currently have no way to confirm or refute. The `audio_plays` and `player_events` tables only capture *successes* — a learner who can't reach the app or whose audio request 5xx'd leaves no trace. Today's investigation could only say "activity dipped during this hour, dunno why". We need an outside-view prober that tells us, factually, whether the public URLs were reachable.

This spec covers option #3 from the proposal: external HTTPS probing + a Popty Maintenance-tab panel surfacing the data. It's the cheapest signal-per-effort piece of the three — client error events and server log drains can follow later.

## What to monitor

Three checks, all HEAD/GET to public URLs, every 60 seconds, from at least two geographic regions:

| Name | URL | Expected | What it tells us |
|---|---|---|---|
| Learner-path prod | `https://saysomethingin.app/` | 200 within 5s | Vercel edge + DNS + cert + SPA shell |
| Learner-path staging | `https://staging.saysomethingin.app/` | 200 within 5s | Same, for staging branch |
| Audio proxy | `https://saysomethingin.app/api/audio/health` (new lightweight endpoint, returns 200 fast) | 200 within 2s | S3 region reachability + Vercel function cold-start budget |

The audio proxy check needs a new endpoint added to the learning-app (`api/audio/health.ts`) that does a HEAD on a known-good S3 object and returns 200/503. Otherwise probing `/api/audio/[audioId]` requires picking a real audio ID and creates audio_plays noise.

**Alert thresholds**: 3 consecutive failures (3 minutes of unreachability) → notification. One-off failures get logged but don't page.

**Channels**: email (Tom) + Slack (#ssi-tech if/when it exists). No SMS — learners' forum reports are the existing fallback.

## Provider choice

Three viable options. Recommendation: **Better Stack** (formerly Better Uptime).

| Provider | Free tier | API for ingestion | Multi-region | Setup time |
|---|---|---|---|---|
| **Better Stack** | 10 monitors, 3-min check interval on free, 30s on paid (£10/mo) | yes — REST API | yes | 15 min |
| UptimeRobot | 50 monitors, 5-min interval free | yes — REST API | limited | 15 min |
| DIY cron + Supabase table | unlimited | n/a | only as multi-region as the runner | 2 hours |

Better Stack's free tier covers our needs and the 3-min interval is fine for catching multi-minute outages (we'd alert at the 9-min mark with 3-strikes). If we ever care about sub-minute resolution, the £10/mo upgrade gets 30s checks and is still trivial against the £30k/mo revenue base.

DIY is rejected because: an in-house prober pinning from Tom's machine or a single Vercel function is a single-point-of-failure observer — exactly the wrong thing for an uptime tool.

## Popty panel

**Route**: existing `/maintenance` view in the dashboard (the same tab as the audit log). Add a new section above "Content audit log".

**Layout**:

```
┌──────────────────────────────────────────────────────────────────┐
│ Uptime                                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Learner-path prod        ● up           1m ago    245ms         │
│  Learner-path staging     ● up           1m ago    320ms         │
│  Audio proxy              ● up           1m ago    98ms          │
│                                                                  │
│  Last 24h                                                        │
│  prod      ████████████████████████████████ 99.93%   1 incident  │
│  staging   █████████████████████████████░██ 99.41%   2 incidents │
│  audio     ████████████████████████████████ 100.00%              │
│                                                                  │
│  Recent incidents                                                │
│  16 May 21:04 UTC → 21:09 UTC  prod          5m down  503 errors │
│  16 May 14:22 UTC → 14:23 UTC  staging       1m down  timeout    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Three visual elements: live status, 24-h availability bars, recent incident list. Auto-refresh every 60s.

## Backend wiring

New endpoint in `services/production-api.cjs`:

```js
// GET /api/admin/uptime-summary — proxies Better Stack and returns shaped data
app.get('/api/admin/uptime-summary', async (req, res) => {
  if (!await requireAdmin(req, res)) return
  try {
    const apiKey = process.env.BETTERSTACK_API_KEY
    const [monitors, incidents] = await Promise.all([
      fetch('https://uptime.betterstack.com/api/v2/monitors', {
        headers: { Authorization: `Bearer ${apiKey}` }
      }).then(r => r.json()),
      fetch('https://uptime.betterstack.com/api/v2/incidents?from=' + new Date(Date.now() - 24*3600*1000).toISOString(), {
        headers: { Authorization: `Bearer ${apiKey}` }
      }).then(r => r.json())
    ])
    res.json({
      monitors: monitors.data.map(m => ({
        id: m.id,
        name: m.attributes.pronounceable_name,
        url: m.attributes.url,
        status: m.attributes.status,        // 'up' | 'down' | 'paused'
        last_checked_at: m.attributes.last_checked_at,
        last_response_time_ms: m.attributes.regions?.[0]?.response_times?.[0]?.response_time
      })),
      incidents: incidents.data.map(i => ({
        id: i.id,
        monitor_id: i.attributes.monitor_id,
        started_at: i.attributes.started_at,
        resolved_at: i.attributes.resolved_at,
        cause: i.attributes.cause
      }))
    })
  } catch (e) {
    logger.error('[Uptime] summary error:', e?.message)
    res.status(500).json({ error: e?.message || 'unknown error' })
  }
})
```

Auth via `requireAdmin` (same pattern as audit endpoints). Key lives in `.env` as `BETTERSTACK_API_KEY` — server-side only, never exposed to the browser.

## Frontend wiring

New Vue component `src/components/UptimePanel.vue`, mounted near the top of `src/views/Maintenance.vue`. Polls `/api/admin/uptime-summary` every 60s. Three sub-renders: live status row, 24h bar (compute uptime % from total minutes ÷ down minutes derived from incidents), incident table.

Existing `authedFetch` helper handles auth.

## Setup tasks

1. Create Better Stack account, add three monitors (URLs above) at 60s interval.
2. Create the `/api/audio/health` endpoint in the learning-app — HEAD against a fixed canary S3 key (or just return `200 OK` if Vercel + Node are alive; the audio-specific check requires reaching S3 from inside a function).
3. Get Better Stack API token, add to dashboard `.env` as `BETTERSTACK_API_KEY`.
4. Implement the backend endpoint.
5. Implement the panel.
6. Set up notification channels in Better Stack (Tom's email at minimum).

Sequence is independent — frontend can stub against mock data while monitors are being added.

## Out of scope (next phases)

- **Client error events** (option #1 from the original proposal) — extend `player_events` with an error taxonomy. Separate spec.
- **Server error log drains** (option #2) — Vercel Log Drain → Supabase. Separate spec.
- **Status page** for learners — Better Stack also offers a public status page on free tier. Could front it at `status.saysomethingin.app`. Worth adding once we trust the data.

## Open questions

- Does the audio health endpoint need to actually hit S3 (proper end-to-end), or is "the function returns 200" sufficient? End-to-end is stricter but creates dependency on S3 region uptime that we can't directly affect.
- Notification routing: do we want both staging + prod alerting Tom, or only prod by default (staging alerts going to a less-noisy channel)?
- Do we want to record the Better Stack data into our own Supabase table for longer-term retention, or is 30-day Better Stack retention enough?
