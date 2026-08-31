# The nightly insights dump — who actually consumes it

**2026-08-31. Short answer: two admin pages read it, no human has looked at it, and for the last 36 nights it contained nothing at all. It is now fixed and it produced a real finding on the first run back.**

---

## What it is

`scripts/insight-discovery.cjs` in ssi-learning-app. It runs on **holmes** at 03:10 every night via the `com.ssi.insight-discovery` launchd agent. It builds a 30-day aggregate telemetry digest (school-demo accounts excluded), hands it to `claude -p` on the Max subscription — never the billed API — and writes 4-6 ranked findings to the `insight_discoveries` table, plus a ~10 KB JSON on holmes' Desktop.

## Who consumes it

Two surfaces, both real, both wired end to end:

- **learning app `/admin/insights`** — `DiscoveryFeed.vue`, reads the latest row via the `get_latest_insight_discovery` RPC.
- **popty `/insights`** — reads it through `GET /api/insight-discovery/latest`; it also has "Run discovery" and "Demo run" buttons.

Both work. Neither shows any sign of a human. There is no trigger in any log since July, and — the decisive one — `DiscoveryFeed` carries a loud **"Generation stale"** alarm banner built precisely to catch a dead cron. It has been shouting into an empty room since **25 July**. Nobody reported it.

So: something opens the file. Nobody sees the result.

## And the dump was empty anyway

The table's last row was **2026-07-25**. Every night since then the job ran and the wrapper logged `OK`.

Two faults, stacked:

1. **holmes' service-role key was revoked.** Its `.env.local` held a Vercel-pulled `sb_secret_rjn…` that returns **401 Unregistered API key**. So every read came back empty and every write 401'd. Claude was handed an all-zero digest and honestly reported "we are flying blind" — 36 nights running.
2. **A failed write did not fail the run.** The script printed `WRITE FAILED` and exited 0, so the cron wrapper recorded a success. A job that reports OK while writing nothing is worse than a job that is switched off.

Meanwhile the telemetry itself was fine the whole time: **178,794 real-learner events from 81 distinct learners** in the last 30 days.

## Fixed, tonight

- Restored the working service-role key on holmes (`.env`, backed up to `.env.bak-insight-2026-08-31`). Read and write both 200 now.
- Ran the job by hand: **row id 15, 2026-08-31** — the first real one in 37 days.
- Made the silent success impossible: a failed write now exits non-zero. Branch `fix/insight-discovery-fail-loud` on ssi-learning-app, pushed, **not merged**.

The first run back found things worth reading — a 0.09% audio fail rate that is actually one build (`194b98b`, 55 of 138 fails) and desktop-only; `eng_for_hin` falling 11 active-30d to 0 active-7d; Welsh the only course with people going past the scripted rounds.

---

## Recommendation: make it earn its keep — but change what it ranks

Not retire. The engine is cheap (one Max-subscription call a night, no billed spend) and the data is real. What it lacked was a signal that terminates in a decision.

Its flagship signal, "where does everyone stall", ranks friction by **raw skip count**. So its top-12 is always S0001–S0008: everyone passes the first seeds, nobody reaches seed 300. That is an exposure artefact, and it is why every finding reads as a lead rather than a ticket.

Ranked instead by **skips per learner who actually met the lego**, 30 days, minimum 5 learners exposed:

```
rate  skips  exposed  who-skipped  course           lego
 6.5     39        6         100%  fra_for_eng      S0003L04   "as often as possible" → "aussi souvent que possible"
 5.0     30        6          67%  fra_for_eng      S0002L02   "I'm trying to"        → "j'essaie de"
 4.8     24        5          80%  fra_for_eng      S0002L03
 4.5     27        6          67%  deu_for_eng      S0003L01   "as often as possible" → "so oft wie möglich"
 3.2     19        6          83%  deu_for_eng      S0001L05
```

**Every one of the six learners who met `fra_for_eng` S0003L04 skipped it, 6.5 times each** — and the top German row is the *same intention*, "as often as possible", at seed 3 in a different course. A four-word English chunk that early, twice, independently. That is a decomposition question for popty, not a French problem, and the raw ranking buried it under S0001.

Built, not proposed: `tools/insights/lego-friction-rate.cjs`, read-only, on branch `feat/lego-friction-rate` (Popty), pushed, **not merged**.

**Honest limits.** The base is thin — 5 to 13 learners per lego. Below about 5 exposed the list is one enthusiastic tester and means nothing; I've floored it there deliberately. And the ranking still clusters in early seeds because that is where the learners are; per-exposure narrows that, it does not abolish it.

## The one thing left for you

Delivery. The findings still land on two admin pages you don't open — that is the whole reason this dump went dark for 37 days without a sound. The fix isn't another dashboard: it's **one line in the 07:00 digest** — the top friction lego by rate, with its n, when the n clears the floor, and silence when it doesn't. That publishes into your morning thread, so it's your call, not mine.

If you'd rather not have that line, then retire the whole thing — because an insight nobody reads is a nightly Claude call spent on nobody.
