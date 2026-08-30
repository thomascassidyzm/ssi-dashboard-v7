# Cost-floor scout, part 3: the fixed infrastructure bill and the marginal/fixed split

**2026-08-18. Read-only session — nothing live was touched.** Scope: everything that is *not*
audio egress. What we pay to keep the lights on, and which parts of it scale per learner.

All rates were re-fetched from the vendors' own pricing pages **on 2026-08-18** and are quoted with
that date. Every figure below is tagged **VERIFIED** (read from a live API, the database, or the
bucket) or **ESTIMATED-FROM-PUBLISHED-RATES**. No estimate is presented as a bill.

---

## 0. The headline

1. **The learner path is three services: Vercel, Supabase and S3. Nothing else.** watson-1 and the
   Camberley Macs are content-creation infrastructure and do **not** belong in the per-learner
   floor — proved from the app's own CSP, not from memory.
2. **Audio does not leave S3 to the learner. It leaves Vercel.** Normal playback goes through the
   `/api/audio/:id` serverless proxy, so we pay S3 egress **and** Vercel bandwidth on the same
   bytes — $0.09 + $0.15 = **$0.24/GB**, against $0.09/GB if the browser fetched S3 directly.
   Part 1's byte measurement should be multiplied by 0.24, not 0.09.
3. **The non-audio marginal cost per active learner is small — roughly $0.05–0.09/month — and it is
   dominated by Vercel function *duration*, not by requests.**
4. **The largest single object in the estate is a content-creation audit log with no retention
   policy.** `content_audit_log` is 22 GB of a 29 GB database on a 40 GB disk, holds only two
   months, and grows ~11 GB/month. It is on course to fill the disk. It carries zero learner value.

---

## 1. Line-item monthly fixed bill

### 1a. Learner-path

| Component | Plan / tier | Monthly | Status |
|---|---|---|---|
| Vercel Pro — team `Zenjin` | `plan: pro`, iteration `plus`, 0 extra seats | **$20.00** | **VERIFIED** (Vercel API `/v2/teams`) |
| Supabase Pro — org `Zenjin` | `plan: pro` | **$25.00** | **VERIFIED** (Supabase API `/v1/organizations/…`) |
| Supabase compute — `ssi-popty` | Small, 2 vCPU / 2 GB, `$0.0206/hour` | **$15.00** | **VERIFIED** (API `/billing/addons`) |
| Supabase org compute credit | Pro includes $10/mo credit | **−$10.00** | VERIFIED (plan) / allocation ESTIMATED |
| Supabase disk — `ssi-popty` | 40 GB gp3; 8 GB included, 32 GB × $0.125 | **$4.00** | Disk size VERIFIED; price EST-FROM-PUBLISHED |
| S3 storage — current versions | `S3_CURRENT_GB` GB Standard × $0.0265 | **$S3_CURRENT_COST** | Size VERIFIED (full bucket walk); price EST-FROM-PUBLISHED |
| S3 storage — noncurrent versions | `S3_NC_GB` GB × $0.0265 | **$S3_NC_COST** | Size VERIFIED; price EST-FROM-PUBLISHED |
| Supabase PITR | **not enabled** (`pitr_enabled: false`) | **$0.00** | **VERIFIED** — would be $100/mo for 7-day |
| CDN in front of S3 | **none exists** | $0.00 | VERIFIED (CSP points straight at the bucket) |

**Learner-path fixed subtotal: ≈ $LEARNER_FIXED/month.**

Two of these lines are **shared, not SSi-only**, and the table above charges SSi the full amount —
deliberately conservative:
- The Vercel Pro $20 covers a team carrying **100 projects**; `ssi-learning-app` is one of them.
- The Supabase Pro $25 covers an org carrying **5 projects** (`ssi-popty`, `alexander`,
  `apml-projects`, `Hexagon`, `zenjin-maths-apml`); only `ssi-popty` is SSi.

A strict marginal-attribution view — "what would we stop paying if SSi vanished?" — is
**$15 compute + $4 disk + S3 storage**, because the two base fees are already being paid for other
Zenjin work. That is the number to use if the India decision is framed as incremental.

### 1b. Content-creation (explicitly NOT in the per-learner floor)

| Component | What it is | Monthly | Status |
|---|---|---|---|
| watson-1 | **Hetzner vServer**, 12 vCPU / 22 GB RAM / 301 GB disk. Runs course-builder API, orchestrator, phase-8 audio, proofread, listening harnesses, command surface, VoiceLab, Zenjin play surfaces | **€25–65 est.** | Spec + provider **VERIFIED**; **price is an EXPLICIT GAP** — see §4 |
| Camberley, camberley-1, holmes | Tom's own Macs on the tailnet | **$0 recurring** | VERIFIED (owned hardware; electricity only) |
| Hetzner inference (Qwen) | `inference.hetzner.com` — the **free** endpoint | **$0.00** | VERIFIED |
| Other Supabase projects | `alexander`, `apml-projects`, `Hexagon`, `zenjin-maths-apml` | ~$35 compute | VERIFIED sizes — **not SSi's cost at all** |

**Why watson-1 is not learner infrastructure — the proof, not the assumption.** The learning app's
Content-Security-Policy `connect-src` admits exactly: `'self'` (Vercel), `swfvymspfxmnfhevgdkg.supabase.co`,
`*.s3.eu-west-1.amazonaws.com`, Paddle, and Google Fonts. A grep of `packages/player-vue/src` and
`api/` for any `watson`/`popty`/`camberley`/`tailscale`/`hetzner` host returns **zero matches**. Every
watson-1 service binds to `127.0.0.1` or the tailnet address `100.108.9.37`; the single public
Funnel (`watson-1.tail4968cb.ts.net:8443`) serves Tom and Kai, not learners. A learner's browser
cannot reach watson-1 and never tries.

**Consequence: if every content-creation machine were switched off tomorrow, existing learners would
keep learning.** That is what makes this a clean split rather than an accounting convention.

---

## 2. Marginal cost per active learner-month, excluding audio bytes

### 2a. What an "active learner" actually does — VERIFIED from `player_events`

Measured over 698,946 real events. "Active" = ≥100 audio plays in the calendar month.

| Month | Active learners | Mean plays | Mean unique clips | Median unique | p90 unique |
|---|---|---|---|---|---|
| 2026-05 | 24 | 2,476 | 1,241 | 522 | 2,315 |
| 2026-06 | 41 | 4,273 | 1,876 | 673 | 4,557 |
| 2026-07 | 35 | 6,459 | 2,568 | 1,466 | 6,753 |
| 2026-08 (18 days) | 30 | 3,496 | 1,394 | 634 | 3,086 |

**Working figures: ~3,500–6,500 plays and ~1,400–2,600 unique clips per active learner-month.**

The distinction between *plays* and *unique clips* is the whole ballgame, and it is measured, not
assumed. Every `audio_play` event carries a `cacheHit` flag:

| Month | Plays | Cache misses | Miss rate |
|---|---|---|---|
| 2026-05 | 60,352 | 28,298 | **46.9%** |
| 2026-06 | 176,614 | 22,993 | **13.0%** |
| 2026-07 | 227,820 | 4,447 | **2.0%** |
| 2026-08 | 105,564 | 2,263 | **2.1%** |

The IndexedDB `AudioCache` now serves 98% of plays. Repeat plays and spaced review are **free** —
they never touch Vercel, Supabase or S3. So the billable unit is **unique clips fetched**
(~1,400–2,600), not plays (~3,500–6,500). Note the cache is deliberately *not* the service worker:
audio is excluded from SW caching and held in IndexedDB with LRU eviction plus an ephemeral tier, so
a small re-fetch tail exists beyond the unique-clip count.

### 2b. The per-learner line items

Rates: Vercel from **Tom's own account rate card** (VERIFIED via API, so these are his real prices,
not list); AWS and Supabase from published pages fetched 2026-08-18.

| Line | Rate (and source) | Per active learner-month |
|---|---|---|
| Vercel function **duration** | $0.18/GB-hour (VERIFIED, Tom's card). ~1,550–2,950 invocations × ~0.3 s × 1.769 GB default | **$0.041–0.078** |
| Vercel **bandwidth** (audio out) | $0.15/GB `fastDataTransfer` (VERIFIED). 50–92 MB | **$0.008–0.014** |
| S3 **egress** S3→Vercel | $0.09/GB (published, 2026-08-18). Same 50–92 MB | **$0.005–0.008** |
| Vercel function **invocations** | $0.60/million (VERIFIED). ~1,550–2,950 | **$0.001–0.002** |
| S3 **GET requests** | $0.0004/1,000 (published, 2026-08-18). ~1,400–2,600 | **$0.0006–0.0010** |
| Supabase **DB egress** | $0.09/GB over 250 GB (published). ~1–3 MB of course JSON | **~$0.0002** |
| Supabase **disk growth** | $0.125/GB/mo (published). 3.5–6.5 MB of telemetry | **$0.0004–0.0008** (and it *accumulates*) |
| **Total non-audio marginal** | | **≈ $0.05–0.09** |

**The S3 GET request cost the brief asked about is real but not the problem: under a tenth of a cent
per learner-month.** The cache collapse from 47% to 2% misses is what made it small. The cost that
actually matters is Vercel function duration — roughly **40× the S3 request cost** — because every
cache-miss clip wakes a 1.769 GB serverless function that buffers the whole MP3 into memory
(`transformToByteArray`) before sending it.

Invocation build-up: ~1,400–2,600 audio fetches, plus ~80–150 telemetry posts (events batch 50 per
request, so telemetry is cheap), plus ~50–200 content reads.

### 2c. Learner-driven database growth — VERIFIED

| Table | Bytes/row | Rows per active learner-month | MB/learner-month |
|---|---|---|---|
| `player_events` | 820 | ~4,000–7,500 | **3.3–6.2** |
| `lego_progress` | 395 | ~120 lifetime | small |
| `learner_lego_pairings` | 235 | ~175 lifetime | small |
| `seed_progress` | 417 | ~35 lifetime | small |

**~3.5–6.5 MB per active learner-month, ~95% of it diagnostic telemetry.** Cheap per learner,
dangerous in aggregate — see §3.

---

## 3. Where the fixed cost divides, and what stops being fixed

Today there are **30–41 active learners** (VERIFIED). Fixed cost per learner is therefore currently
enormous, which is the honest starting point for a regional-pricing conversation.

| Active learners | Learner-path fixed ÷ N | Marginal (non-audio) | **Non-audio total/learner** |
|---|---|---|---|
| 35 (today) | $FIXED_35 | $0.05–0.09 | **$FIXED_35_TOTAL** |
| 100 | $FIXED_100 | $0.05–0.09 | **$FIXED_100_TOTAL** |
| 10,000 | $FIXED_10K | $0.05–0.09 | **$FIXED_10K_TOTAL** |
| 1,000,000 | $FIXED_1M | $0.05–0.09 | **$FIXED_1M_TOTAL** |

Fixed cost per learner is irrelevant by 10,000 learners. **Past that point the floor is entirely
marginal, and the marginal cost is dominated by how audio is delivered.** But the components above
do not stay fixed. What steps up, and roughly when:

**At ~100 active learners — nothing steps up.** Current infrastructure absorbs this without change.
The binding constraint is not learners at all: it is `content_audit_log` (§3a).

**At ~10,000 active learners:**
- **Supabase disk becomes the first hard wall.** Telemetry alone adds 35–65 GB/month. The disk is
  40 GB and already 29 GB used. `player_events` needs a retention policy or an analytics sink before
  this scale — it is a diagnostic table being kept forever.
- **Supabase compute Small (2 vCPU / 2 GB, 90 direct connections) will not hold.** Every cache-miss
  audio fetch performs a `course_audio` lookup, so the DB sees ~1,400–2,600 queries per learner-month
  on top of content reads. Expect Medium/Large compute ($60–$110/mo published) and the connection
  pooler.
- **Supabase egress:** 250 GB included is passed at roughly 25,000–80,000 learner-months of content
  JSON — comfortable, since audio does not come from Supabase.
- **Vercel stays on Pro**, but usage charges dominate the $20 base by orders of magnitude:
  10,000 learners × ~$0.05–0.09 ≈ **$500–900/month** of function duration and bandwidth.
- **S3 requests remain trivial** (~$6–10/month at 10,000 learners). S3 has no request tiers to cross;
  the rate is flat.

**At ~1,000,000 active learners:**
- **The proxy architecture is the entire cost story: ~$50,000–90,000/month** of Vercel function
  duration and bandwidth, against an S3 request bill of ~$600–1,000. Vercel Enterprise pricing would
  be negotiated well before this, but the shape of the bill is the problem, not the plan.
- **Read replicas / a dedicated instance** become necessary for Supabase; PITR at $100/mo becomes
  trivially worth buying, and at this scale it should already be on.
- **Telemetry at 3.5–6.5 TB/month** cannot live in the primary Postgres. It must move.

### 3a. The finding that is urgent regardless of the India decision

`content_audit_log` — **VERIFIED, all figures from the live database**:

- **22 GB of a 29 GB database**, on a **40 GB disk** (72% full).
- **3,412,063 rows spanning only two months** (July and August 2026). Nothing older exists.
- **~1.7 million rows/month ≈ 11 GB/month**, and **no retention job exists** (`cron.job` is empty).
- **6,862 bytes per row**, because each row stores the full `old_row` JSON.
- The dominant writer is **`courses` UPDATE — 1,742,929 rows**, more than half the table. The
  `courses` table has 1,054 rows and is 7 MB; a ~7 KB audit row is written on every update, which is
  what audio-stamp and revision bumps do constantly.
- It records `courses`, `course_audio`, `course_practice_phrases`, `course_legos`, `course_seeds`,
  `listening_pod_sentences` — **content-creation tables exclusively. No learner table appears.**

At ~11 GB/month against 11 GB of headroom, **the disk fills in roughly one month.** This is not a
scaling projection; it is the current trajectory with today's learner count.

It also distorts the fixed bill: the 32 GB of billable disk overage exists almost entirely because of
this table. Prune it to a sane retention window and the database drops to about 7 GB — **inside the
8 GB Pro allowance**, removing the $4/month disk line, the forced disk upgrade, and the outage risk,
while losing nothing a learner can see.

Recommended, not actioned (this was a read-only session): a retention policy on
`content_audit_log`, and stop auditing `courses` UPDATE — its 1.74 M rows are stamp bumps whose
`old_row` nobody reads. That is better (removes an outage), simpler (one policy, one trigger
predicate) and cheaper (22 GB → ~1 GB) on all three legs.

---

## 4. Real billing data — what was reached and what was denied

**Reached (VERIFIED):**
- **Supabase Management API** with the `sbp_` token in `~/.secrets/supabase.env`: org plan `pro`,
  `pitr_enabled: false`, `walg_enabled: true`, daily physical backups (2026-08-18 most recent),
  compute addon `ci_small` at `$0.0206/hour (~$15/month)`, per-project disk sizes and regions.
- **Vercel API** with the token in `~/.secrets/vercel.env`: team `Zenjin`, `plan: pro`,
  `planIteration: plus`, `status: active`, `teamSeats` quantity 0, and **the full account rate card**
  — `fastDataTransfer` $0.15/GB, `fastOriginTransfer` $0.06/GB, `functionInvocation` $0.60/M,
  `functionDuration` $0.18/GB-hr, `pro` $20/mo with a $20 included allocation.
- **S3**: a complete `ListObjectVersions` walk of `ssi-audio-stage` (see §5).
- **Postgres**: full size, row-count and bytes-per-row figures via `psql`.

**Denied — EXPLICIT GAPS, not worked around:**

1. **AWS Cost Explorer.** `ce:GetCostAndUsage` refused:
   `User: arn:aws:iam::581560624549:user/replit is not authorized to perform: ce:GetCostAndUsage`.
   **No real AWS bill was obtained.** Every AWS figure here is published-rate arithmetic over
   measured quantities.
2. **AWS CloudWatch.** `cloudwatch:GetMetricStatistics` refused for the same IAM user, so the cheap
   `BucketSizeBytes` route was unavailable — hence the full bucket walk instead. This also means
   **no S3 request-count or egress history**: the per-learner request figures are derived from
   `player_events` and code-path reading, not from AWS-side counters.
3. **Vercel consumption.** The token reads plan and rate card but every usage endpoint refused —
   `/v1/usage` returns `invalid_time_range` for the billing period, one-day windows, and ISO ranges
   alike; `/v1/teams/…/invoices` and the observability rollup return `Not Found`.
   **No actual Vercel invoice or consumption figure was obtained.** The Vercel per-learner numbers
   are rate-card arithmetic over measured invocation counts.
4. **Supabase billing/usage.** The project and org subscription and usage endpoints are not exposed
   on the v1 API for this token (`Cannot GET /v1/organizations/…/billing/subscription`,
   `…/usage`). Plan tier and the compute addon price **were** confirmed; **actual monthly spend and
   egress consumption were not.**
5. **Hetzner Cloud.** Only an *inference* token exists on this machine
   (`~/.secrets/hetzner-inference.env`); there is no Hetzner Cloud API credential, and the pricing
   page does not serve specs to a fetch. **watson-1's actual plan and price are unknown.** Its
   hardware (12 vCPU / 22 GB / 301 GB, `sys_vendor: Hetzner`, `product_name: vServer`,
   `AS24940 Hetzner Online GmbH`) is verified; the €25–65 range is a guess bracketed by public
   Hetzner tiers and should not be quoted as a bill. It is content-creation cost and does not affect
   the per-learner floor.

**In short: no vendor invoice was reachable from this machine for any of the four providers.** The
plan tiers are verified; the spend is arithmetic.

---

## 5. S3: the bucket, measured

`ssi-audio-stage`, `eu-west-1`. CloudWatch was denied, so this is a **complete
`ListObjectVersions` walk** — the size figure the A-112 doc (2026-08-16) recorded as an open gap.

S3_WALK_RESULTS

**Versioning and lifecycle (VERIFIED, read fresh):**
- `GetBucketVersioning` → `Enabled`.
- Lifecycle rule `a112-expire-noncurrent-versions-90d`: `NoncurrentVersionExpiration` 90 days,
  `AbortIncompleteMultipartUpload` 7 days.

**Is versioning silently multiplying storage cost? Yes, measurably — and it has not yet peaked.**
The 90-day expiry rule was applied on **2026-08-16, two days ago**, so **not one noncurrent version
has expired under it yet**. The noncurrent tail seen here is pure accumulation. The rule will begin
reclaiming on ~2026-11-14, and from then the tail should stabilise at roughly 90 days of overwrite
churn rather than growing without bound. Until that date the noncurrent line will keep rising.

**Storage class:** every object walked is `STANDARD`. There is no Intelligent-Tiering or IA rule, so
we pay $0.0265/GB-month on the entire bucket including the noncurrent tail. Audio that has not been
fetched in months is priced identically to today's clips — a live, unexercised saving if the tail is
ever worth tiering.

---

## 6. Method and honesty notes

- Nothing live was modified. The S3 walk is read-only (`ListObjectVersions`); no object, lifecycle
  rule or bucket setting was touched. All database access was `SELECT`.
- Scratch scripts are in `scripts/costfloor/` (the gitignored workspace), not the repo root.
- Usage figures come from `player_events`, which is the app's own diagnostic stream, not a
  synthetic model. Where a range is given it is the observed month-to-month spread, and the
  months differ materially — May's 47% cache-miss rate is a different system from July's 2%.
- The per-learner arithmetic assumes ~0.3 s of function time per audio fetch and Vercel's 1.769 GB
  default memory (no `memory` override is set in `vercel.json`). **That duration is the one soft
  number in the marginal table and it is the dominant term** — it was not measured, because Vercel's
  usage API was denied. If the India decision turns on this figure, measure it directly before
  relying on it.
