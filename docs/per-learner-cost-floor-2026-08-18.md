# What one active learner actually costs us — the server floor

**2026-08-18. Built from live data, for the India regional-pricing decision.**

## The headline

**An active learner costs us about 0.1p per month in marginal server terms.** Not 10p. Not 1p. A tenth of a penny.

At today's scale, fixed infrastructure divided across our active base adds about **11p/learner/month**. At 10,000 active learners that falls to **half a penny**. The asymptotic floor, at a million learners, is about **0.3p/learner/month** — and it is set by Supabase's per-user charge, not by audio at all.

**Every tier on IME's price sheet clears this floor with enormous room.** The question of whether we can afford Indian pricing is not close.

## Why audio turned out not to matter

The instinct behind this question was that audio streams per device, so cost scales per learner. That is true in principle. In practice the caching already in the player has all but eliminated it.

Every play logs a `cacheHit` flag. Over the last 30 days:

| | |
|---|---|
| Audio plays recorded | 201,472 |
| **Served from device cache** | **196,759 (97.7%)** |
| Actually fetched over the network | 4,442 (2.2%) |

Only 2.2% of plays cost us a byte. Across the entire estate that is roughly **180 MB of real audio egress per month** — comfortably inside AWS's 100 GB free tier, so plausibly billed at zero.

The "download-once device caching" lever in the brief is therefore **not an available saving — it is already banked**, and it is the reason the current bill is invisible.

## The measured inputs

All figures from live tables and real S3 objects, sampled 2026-08-18.

| Input | Value | Source |
|---|---|---|
| Active learners (30d) | 332 | `player_events` |
| Of whom actually played audio | 142 | `player_events` |
| Registered learners | 1,114 | `learners` |
| Plays per learner/month | mean 1,419 · median 6 · p90 2,859 · p99 32,766 | `player_events` |
| Sessions per learner/month | mean 19.2 · median 1 | `player_events` |
| Mean clip size | **40.5 KB** (median 34 KB, p90 57 KB) | 5,000 real S3 objects |
| Clip format | mp3 mono; 48 kHz @ ~72–84 kbps (modern bulk), 16 kHz @ 32 kbps (older) | ffprobe on real files |
| Distinct clips touched per learner/month | 453 (≈18 MB) | `player_events` |
| Real network fetches per learner/month | ≈31 (≈1.3 MB) | derived from `cacheHit` |

The play distribution is savagely skewed — the median active learner plays 6 clips a month, the p99 plays 32,766. Any average here hides more than it shows, which is why the sensitivity case below is the one that matters.

## The delivery path — and a 3x cost multiplier hiding in it

Audio does **not** stream direct from S3. It goes through a Vercel serverless proxy at `/api/audio/:id`, which streams S3 → Vercel function → learner. That route deliberately sets `Vercel-CDN-Cache-Control: no-store` (to dodge an iOS Safari byte-range bug), so there is **no cross-user edge caching** — every cache miss pays the full path.

Per GB delivered on that path:

| Leg | Rate |
|---|---|
| S3 egress, eu-west-1 | $0.09/GB |
| Vercel Fast Origin Transfer | $0.06/GB |
| Vercel Fast Data Transfer (dub1) | $0.15/GB |
| **Total proxied** | **$0.30/GB** |
| Direct presigned S3, for comparison | $0.09/GB |

So proxied bytes cost **3.3x** what direct-S3 bytes would. A presigned direct-S3 path already exists (`/api/audio/batch-urls`) but is only used by bulk download. At current volumes this multiplier is worth roughly £0.0003/learner/month — genuinely not worth touching. It would start to matter only if the cache-hit rate ever collapsed, which is the risk covered below.

## Marginal cost per active learner per month

| Component | Quantity | Rate | Cost |
|---|---|---|---|
| Audio egress (proxied) | 1.3 MB | $0.30/GB | $0.00039 |
| S3 GET requests | ~31 | $0.0004/1,000 | $0.00001 |
| Vercel edge requests | ~300 | $2.40/1M | $0.00072 |
| Supabase row writes / DB egress | small | within plan | ~$0 |
| **Total marginal** | | | **≈$0.0011 ≈ 0.09p** |

**Marginal cost is under a tenth of a penny per learner per month.** At any plausible usage this is not a business constraint.

## Fixed cost, and where it divides

Learner-path infrastructure only. Content-creation infrastructure — the Popty build servers, and the 22 GB `content_audit_log` that pushes the database from 6.8 GB to 29 GB — is deliberately excluded, because it does not scale with learners and would not shrink if we sold fewer courses.

| Component | Basis | Monthly |
|---|---|---|
| Supabase Pro | learner-path DB is 6.8 GB, inside the 8 GB allowance; 250 GB egress and 100k MAU included | $25.00 |
| Vercel Pro | 1 seat; usage inside included 1 TB transfer / 10M edge requests | $20.00 |
| S3 Standard storage | ~104 GB (2.57M objects × 40.5 KB) @ $0.023/GB | $2.39 |
| **Total learner-path fixed** | | **$47.39 ≈ £37/month** |

Marked **ESTIMATED-FROM-PUBLISHED-RATES**, not a bill — see the gaps section.

### The three scale points

| Active learners | Fixed per learner | Marginal | **Total per learner/month** |
|---|---|---|---|
| 100 | £0.29 | £0.001 | **≈£0.30** |
| 332 (today) | £0.11 | £0.001 | **≈£0.11** |
| 10,000 | £0.004 | £0.001 | **≈£0.005** |
| 1,000,000 | £0.0003 | £0.0026 | **≈£0.003** |

At a million learners the picture inverts: fixed cost vanishes and the floor becomes Supabase's **$0.00325 per monthly active user** beyond the first 100,000 — about 0.26p. Vercel edge requests add most of the rest. **Audio never becomes the dominant cost at any scale.**

## Verdict against IME's price sheet

| Tier | Nets SSi | Server floor | Verdict |
|---|---|---|---|
| **D2C monthly** | ₹253/mo ≈ **£1.95/mo** | ~£0.005/mo at scale | **Clears by ~390x** |
| **Institutional** | ₹627/yr ≈ **£0.40/mo** | ~£0.005/mo at scale | **Clears by ~80x** |
| **Publisher / EdTech** | ₹34 one-off ≈ **£0.26** | ~£0.06 lifetime server cost per learner-year at scale | **Clears by ~4x** |

All three clear. Even the one-off publisher tier — the hardest case, because ₹34 must cover a learner forever — survives, since a learner who consumes an entire large course generates roughly £0.18 of direct-S3 egress once, and at institutional scale the fixed share is negligible.

**At today's 332 active learners the institutional tier is tighter** (~£0.11 fixed share against £0.40 net), but that is an artefact of a small base, not a structural cost. It resolves itself with volume — and the India deal is precisely what brings volume.

## The sensitivity that actually matters: cache eviction

The 97.7% hit rate is the whole argument. It rests on a persistent IndexedDB cache (`AudioCache.ts`) which is **LRU-evicted under storage-quota pressure**.

A full large course is substantial — `fra_for_eng` is 66,711 clips ≈ **2.7 GB**. A typical mobile browser quota is 1–2 GB. On a cheap Android with a full course and a busy learner, **the cache will thrash**, and a one-off download becomes a recurring one.

The worst realistic case — a p99 learner (32,766 plays/month) whose cache evicts constantly:

| Scenario | Bytes/month | Cost/month |
|---|---|---|
| p99 learner, cache working | 30 MB | £0.007 |
| **p99 learner, cache thrashing** | **1.33 GB** | **£0.31** |
| p99 learner, thrashing, with opus | 0.36 GB | £0.085 |

**£0.31/month would consume 78% of the institutional tier's £0.40 net.** This is the only scenario in the whole analysis where the floor is genuinely threatened — and it is a device-storage problem, not a bandwidth problem.

## The two levers, honestly costed

**Lever 1 — download-once device caching: already built, already delivering.** Measured at 97.7%. There is no saving left to capture. What there *is* to protect is the eviction risk above.

**Lever 2 — opus re-encoding: real, large, but its value is not our bill.** I re-encoded real clips to opus mono and measured:

| Encoding | Byte reduction (modern 48 kHz clips) |
|---|---|
| opus @ 24 kbps | **72–73%** |
| opus @ 32 kbps | **63–64%** |

Durations preserved exactly; the older 16 kHz/32 kbps clips only yield ~35%, being already low-bitrate.

Applied to our current 1.3 MB/learner/month, a 73% cut saves about **0.03p per learner per month — nothing.** The case for opus is not egress. It is:

1. **Cache durability.** A 2.7 GB course becomes ~0.8 GB, which fits inside a cheap Android's quota. That protects the 97.7% hit rate, which is what keeps the whole floor at a tenth of a penny — and it neutralises the one scenario above that threatens the institutional tier.
2. **The learner's own mobile data bill.** In India this is a product and pricing argument, not an infrastructure one, and it is worth more to an Indian buyer than to us.

**Recommendation: build the opus variant for India, and justify it on device storage and learner data cost — not on our server bill.** Do not justify it on egress savings; that argument does not survive contact with the numbers.

## Explicit gaps

Reported honestly rather than papered over:

- **No billing data was reached.** AWS Cost Explorer, Vercel billing and Supabase billing were not accessible from this environment. Every cost above is computed from **published rates** (AWS eu-west-1, Vercel dub1 regional pricing, Supabase Pro, all retrieved 2026-08-18) applied to **measured usage**. Usage is real; prices are list. An actual invoice could differ, most likely downward on committed-use discounts.
- **`course_audio.file_size_bytes` is NULL on 2,562,676 of 2,565,615 rows**, so per-course byte totals cannot be read from the database. Course sizes here are derived from clip counts × the measured 40.5 KB mean. A full S3 census was started but did not return in time; it would refine storage cost, which is ~£2/month and immaterial to the conclusion.
- **Whether S3 → Vercel transfer is billed at internet rate is unconfirmed.** AWS does not charge for S3 egress to same-region compute, and Vercel's dub1 runs in eu-west-1 — so the true proxied rate may be $0.15/GB rather than $0.30/GB. I have used the conservative (higher) figure throughout. This only moves numbers that are already negligible.
- **Two of four dispatched workers were lost to transient API overloads.** Their scope — usage modelling and the cache-lever code audit — I completed directly instead; the usage answer came out stronger for it, since the `cacheHit` field gave a measurement where a worker would have produced a model. The fixed-infrastructure worker was still running at publication; if its server census contradicts the learner-path/creation-path split used here, the fixed line above is what would move — not the conclusion, which rests on marginal cost.
- **Per-learner figures use the 142 learners who actually played audio**, not the 332 with any activity. This is the conservative choice: it concentrates all cost onto fewer heads.
