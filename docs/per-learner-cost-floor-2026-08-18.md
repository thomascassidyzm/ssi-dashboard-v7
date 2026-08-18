# What one active learner actually costs us — server floor and payment processing

**2026-08-18. Built from live data, for the India regional-pricing decision.**

## The headline

**An active learner costs us about 0.1p per month in marginal server terms.** Not 10p. Not 1p. A tenth of a penny.

**Payment processing costs 49p per learner per month on a ₹253 monthly plan — a hundred times the server floor, and a quarter of the price.** Infrastructure was never the constraint. Paddle's fixed **$0.50 per transaction** is, and it is the number that decides India pricing. Billing annually instead of monthly saves **₹557 (£4.28) per learner per year**, which is worth more than every infrastructure optimisation in this document put together.

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

Only 2.2% of plays cost us a byte. Across the entire estate that is roughly **150 MB of real audio egress per month** — comfortably inside AWS's 100 GB free tier, so plausibly billed at zero.

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
| Mean clip size | **33.9 KB** (median 27.3 KB, p90 51 KB) | **full census, 5,127,351 objects** |
| Clip format | mp3 mono; 48 kHz @ ~72–84 kbps (modern bulk), 16 kHz @ 32 kbps (older) | ffprobe on real files |
| Distinct clips touched per learner/month | 453 (≈15 MB) | `player_events` |
| Real network fetches per learner/month | ≈31 (≈1.0 MB) | derived from `cacheHit` |

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
| Audio egress (proxied) | 1.0 MB | $0.30/GB | $0.00031 |
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
| S3 Standard storage | **165.7 GB across 5,127,351 objects** (censused) @ $0.023/GB | $3.81 |
| **Total learner-path fixed** | | **$48.81 ≈ £38/month** |

Marked **ESTIMATED-FROM-PUBLISHED-RATES**, not a bill — see the gaps section.

### The three scale points

| Active learners | Fixed per learner | Marginal | **Total per learner/month** |
|---|---|---|---|
| 100 | £0.38 | £0.001 | **≈£0.39** |
| 332 (today) | £0.12 | £0.001 | **≈£0.12** |
| 10,000 | £0.004 | £0.001 | **≈£0.005** |
| 1,000,000 | £0.0003 | £0.0026 | **≈£0.003** |

At a million learners the picture inverts: fixed cost vanishes and the floor becomes Supabase's **$0.00325 per monthly active user** beyond the first 100,000 — about 0.26p. Vercel edge requests add most of the rest. **Audio never becomes the dominant cost at any scale.**

## Payment processing — the cost that actually bites

The server floor is not the constraint. **Payment processing is between 10x and 100x larger than the server cost at every India price point on the table**, and at the lowest ones it is larger than the entire payment.

### Paddle's published schedule

Paddle Billing's standard rate is **5% + $0.50 per checkout transaction**, retrieved 2026-08-18 from Paddle's own pricing page. The percentage is not the problem. **The $0.50 is.**

| Item | Figure | Source |
|---|---|---|
| Standard transaction fee | **5% + $0.50** per successful checkout transaction | paddle.com/pricing, 2026-08-18 |
| Volume tiers / fee caps / regional variation | **None published** — single flat rate | paddle.com/pricing |
| Micro-transaction handling | *"If you're selling products under $10 or require invoicing contact us for custom pricing"* | paddle.com/pricing |
| Minimum transaction size | None published | — |
| Payout fee | None, except **$/€/£15 SWIFT fee** where the payout crosses currency/country | Paddle Help, *Is there a fee taken for payouts?* |
| Minimum payout threshold | **$100 / £100 / €100**, paid on the 1st, arriving by the 15th | Paddle Help, *When and how do I get paid?* |
| Payout FX margin | **up to 1.5%** if payout currency ≠ balance currency | Paddle Help, *Is there a fee taken for payouts?* |
| Chargeback fee | **$15/£15/€15** card, **$20/£20/€20** PayPal; returned if the bank sides with us | Paddle Help, *Understanding Chargebacks* |
| Refunds | The Paddle fee is **not** returned; a `retained_fee` is held "to cover gateway costs" | developer.paddle.com, payout reconciliation + adjustments |
| Tax (merchant of record) | Paddle is the seller of record, collects and remits Indian GST, and pays us net of tax and fees | Paddle Help, tax handling |

Crucially, **Paddle publishes no different rate for local payment methods**. UPI is supported — Paddle presents it automatically for INR prices to customers in India, and **UPI AutoPay covers recurring billing** — but the developer documentation for UPI is silent on fees, which on the evidence available means the standard 5% + $0.50 applies. The hope that a near-zero-fixed-fee local rail rescues the monthly tier **is not supported by anything Paddle publishes.**

UPI's own limits are not a constraint for us: ₹100,000 for one-off, **₹15,000 per subscription renewal**. Nor is India's recurring-payment regime: the RBI e-mandate framework requires additional-factor authentication only above **₹15,000** per recurring transaction, so every tier here auto-debits without re-authentication. What does apply is the mandatory **24-hour pre-debit notification** before each renewal — a friction and a churn surface, not a cost.

### The arithmetic

All conversions at **£1 = ₹130 = $1.284** (the rate implicit in this document's existing figures — ₹253 ≈ £1.95, ₹627/yr ≈ £0.40/mo — stated here so the arithmetic is checkable). At that rate the fixed **$0.50 fee = ₹50.60 = £0.389**.

| Billing shape | Gross | Paddle fee | **As % of gross** | Processing £/learner/mo | Server £/learner/mo |
|---|---|---|---|---|---|
| **Monthly ₹40** (Tom's probe) | ₹40/mo | ₹52.60/mo | **131.5%** | **£0.405** | £0.005 |
| **Monthly ₹253** (IME D2C) | ₹253/mo | ₹63.25/mo | **25.0%** | **£0.487** | £0.005 |
| **Annual ₹400** | ₹400/yr | ₹70.60/yr | **17.7%** | £0.045 | £0.005 |
| **Annual ₹500** | ₹500/yr | ₹75.60/yr | **15.1%** | £0.048 | £0.005 |
| **Annual ₹627** (IME institutional) | ₹627/yr | ₹81.95/yr | **13.1%** | £0.053 | £0.005 |
| **One-off ₹34** (publisher) | ₹34 once | ₹52.30 | **153.8%** | — (loses ₹18.30 outright) | £0.005 |
| **IME block invoice** | one wire per block | ~£15 wire + ~0.5–1% FX | **~0.5–2%** | **≈£0.004** | £0.005 |

Two lines there are not tight margins, they are impossibilities. **A ₹40 monthly charge and a ₹34 one-off both cost more to collect than they collect** — ₹52.60 and ₹52.30 respectively against ₹40 and ₹34. Neither can be sold as an individually-processed transaction at any volume; the loss is structural, not a scale problem.

The ₹253 D2C monthly tier survives, but processing takes **a quarter of it** — £0.487 a month, against a server floor of half a penny. And if the ₹253 is what the learner pays rather than what reaches us, Indian GST at 18% takes a further ~₹38.59 of it before we see anything.

### The annual lever, quantified

Tom named this one himself. It is worth exactly what you would expect, and the answer is clean and price-independent:

**Moving a learner from monthly to annual billing avoids the fixed fee eleven times: 11 × ₹50.60 = ₹556.60 per learner per year = £4.28/year = 36p/month.**

That is the whole lever. It does not depend on the price point, because the saving is entirely in the fixed component.

| Same revenue, two shapes | Gross/yr | Paddle fee/yr | Effective rate |
|---|---|---|---|
| ₹253 × 12, billed monthly | ₹3,036 | ₹759 | **25.0%** |
| ₹3,036 billed once, annually | ₹3,036 | ₹202 | **6.7%** |

**An 18.3-point swing on the same revenue.** For comparison, the entire server floor at scale is 0.3% of that revenue.

**When does the lever stop mattering?** Only when the fixed fee falls below ~1% of the monthly charge — that is a monthly price of about **₹5,060**, roughly £39/month. At any price India will bear, the fixed fee dominates and annual billing is worth more than every infrastructure optimisation in this document combined.

### The IME block-invoice route

If SSi invoices IME once for a block of seats, Paddle is not in the path at all. The cost is one international bank transfer plus an INR→GBP conversion: call it £15 plus 0.5–1% FX. Across 1,000 institutional seats at ₹627 (≈£4,823 of revenue) that is roughly **1% all-in, or £0.004/learner/month** — at parity with the server floor, and 13x cheaper than putting the same learners through Paddle individually.

**The real cost of this route is not processing. It is commercial** — IME's own margin and their cost of collecting from learners, which is a negotiation, not an infrastructure line. But on the pure mechanics of getting money from India to us, block invoicing is the cheapest route by an order of magnitude, and it is the only route on which the ₹34 publisher tier works at all.

## Verdict against IME's price sheet

Recomputed with processing included. The earlier "clears by 390x" figures counted server cost only and were misleading by roughly two orders of magnitude.

| Tier | Gross | Server floor | **Processing** | Total cost | Verdict |
|---|---|---|---|---|---|
| **D2C monthly** | ₹253/mo ≈ **£1.95/mo** | £0.005/mo | **£0.487/mo** | £0.492/mo | **Clears by ~4x** — processing is 99% of the cost |
| **Institutional** | ₹627/yr ≈ **£0.40/mo** | £0.005/mo | **£0.053/mo** | £0.058/mo | **Clears by ~7x** |
| **Publisher / EdTech** | ₹34 one-off ≈ **£0.26** | ~£0.06 lifetime | **£0.402 per transaction** | £0.46 | **FAILS as a card transaction** — clears only if invoiced in bulk |
| **D2C monthly at ₹40** | ₹40/mo ≈ **£0.31/mo** | £0.005/mo | **£0.405/mo** | £0.410/mo | **FAILS** — costs £0.10/mo more than it earns |

The two tiers that clear, clear on server cost by hundreds of times and on processing by single digits. **Processing is now the whole cost model.** The ₹34 publisher tier and Tom's ₹40 probe price are not viable as individually-processed payments — but both are fine the moment they are aggregated into a block invoice, which is what a publisher or institutional deal would do anyway.

**At today's 332 active learners the institutional tier is tighter still** (~£0.12 fixed server share on top of £0.053 processing, against £0.40 net), but that is an artefact of a small base, not a structural cost. It resolves itself with volume — and the India deal is precisely what brings volume.

Note that ₹40 is Tom's probe price and does not appear on IME's sheet; it is modelled here as commissioned, and the gap between it and the sheet's ₹253 is itself worth noting.

## The sensitivity that actually matters: cache eviction

The 97.7% hit rate is the whole argument. It rests on a persistent IndexedDB cache (`AudioCache.ts`) which is **LRU-evicted under storage-quota pressure**.

A full large course is substantial — `fra_for_eng` is 66,711 clips ≈ **2.2 GB**. A typical mobile browser quota is 1–2 GB. On a cheap Android with a full course and a busy learner, **the cache will thrash**, and a one-off download becomes a recurring one.

The worst realistic case — a p99 learner (32,766 plays/month) whose cache evicts constantly:

| Scenario | Bytes/month | Cost/month |
|---|---|---|
| p99 learner, cache working | 25 MB | £0.006 |
| **p99 learner, cache thrashing** | **1.06 GB** | **£0.25** |
| p99 learner, thrashing, with opus | 0.29 GB | £0.068 |

**£0.25/month would consume 63% of the institutional tier's £0.40 net.** This is the only scenario in the whole analysis where the floor is genuinely threatened — and it is a device-storage problem, not a bandwidth problem.

## The two levers, honestly costed

**Lever 1 — download-once device caching: already built, already delivering.** Measured at 97.7%. There is no saving left to capture. What there *is* to protect is the eviction risk above.

**Lever 2 — opus re-encoding: real, large, but its value is not our bill.** I re-encoded real clips to opus mono and measured:

| Encoding | Byte reduction (modern 48 kHz clips) |
|---|---|
| opus @ 24 kbps | **72–73%** |
| opus @ 32 kbps | **63–64%** |

Durations preserved exactly; the older 16 kHz/32 kbps clips only yield ~35%, being already low-bitrate.

Applied to our current 1.0 MB/learner/month, a 73% cut saves about **0.02p per learner per month — nothing.** The case for opus is not egress. It is:

1. **Cache durability.** A 2.2 GB course becomes ~0.6 GB, which fits inside a cheap Android's quota. That protects the 97.7% hit rate, which is what keeps the whole floor at a tenth of a penny — and it neutralises the one scenario above that threatens the institutional tier.
2. **The learner's own mobile data bill.** In India this is a product and pricing argument, not an infrastructure one, and it is worth more to an Indian buyer than to us.

**Recommendation: build the opus variant for India, and justify it on device storage and learner data cost — not on our server bill.** Do not justify it on egress savings; that argument does not survive contact with the numbers.

## Explicit gaps

Reported honestly rather than papered over:

**On payment processing:**

- **No India-specific Paddle rate was found, published or otherwise.** Paddle's pricing page shows one flat rate with no regional variation, and the UPI documentation does not mention fees at all. I have modelled UPI and Indian cards at the standard 5% + $0.50. **This is an assumption of parity, not a verified figure** — and it is the single most valuable thing to confirm with Paddle directly, because a lower fixed fee on UPI would change the monthly tier's viability outright.
- **We are outside Paddle's published pricing already.** Paddle's own page says *"if you're selling products under $10 or require invoicing contact us for custom pricing."* Every India tier here is under $10, so the standard rate modelled above may not be the rate we would actually be offered. **A negotiated micro-transaction rate is a live commercial lever and has not been explored.**
- **Whether the 5% is charged on gross-including-GST or on the pre-tax subtotal is unresolved.** Third-party summaries of Paddle's payout-reconciliation documentation say the fee derives from the transaction total including tax; Paddle's own page does not state it in those words. The difference is about ₹1.93 on a ₹253 transaction — immaterial next to the ₹50.60 fixed fee, but stated rather than hidden.
- **The FX cost of INR→GBP is only partly pinned.** Paddle publishes a *"conversion margin of up to 1.5%"* on payouts where the payout currency differs from the balance currency. What Paddle takes on converting an INR sale into a GBP balance is not published; third-party sources put it at 1–2%, which I have not treated as fact and have not included in the tables. **If it is 2%, every effective rate above rises by two points.**
- **The chargeback fee is a tail risk nobody has sized.** At $15 per card chargeback against a ₹253 payment, **one chargeback costs the equivalent of six months of that learner's revenue.** No dispute-rate data exists for an Indian consumer base on our product.
- **The £1 = ₹130 = $1.284 conversion is this document's own internal rate**, back-derived from figures already in it. It is not a market quote for any particular day, and every ₹/£ figure here moves with it.
- **The block-invoice route's ~1% all-in is my construction**, not a quote: £15 wire plus 0.5–1% FX amortised across a notional 1,000 seats. Real bank charges, IME's payment terms, and any withholding tax on a cross-border invoice have not been checked.
- **Whether IME's ₹253 is what the learner pays or what reaches SSi is ambiguous in the source sheet.** I have modelled it as the price charged, with Paddle in the path. If it is genuinely net to SSi after IME collects locally, the entire processing section applies only to the direct-to-learner route and the D2C tier is far healthier than shown.
- **No live Paddle account data was consulted** — this is entirely desk research against Paddle's published material, retrieved 2026-08-18. An actual Paddle contract or invoice would supersede all of it.

**On server cost:**

- **No billing data was reached.** AWS Cost Explorer, Vercel billing and Supabase billing were not accessible from this environment. Every cost above is computed from **published rates** (AWS eu-west-1, Vercel dub1 regional pricing, Supabase Pro, all retrieved 2026-08-18) applied to **measured usage**. Usage is real; prices are list. An actual invoice could differ, most likely downward on committed-use discounts.
- **`course_audio.file_size_bytes` is NULL on 2,562,676 of 2,565,615 rows**, so per-course byte totals cannot be read from the database. Course sizes here are derived from clip counts × the censused 33.9 KB mean. The full S3 census has now completed and is reflected above — it lowered the mean clip size from a sampled 40.5 KB to a true 33.9 KB, which moved every egress figure *down* by about 14%.

- **Roughly half the audio in the bucket is not referenced by any course.** The census found **5,127,351 objects** under `mastered/`, against **2,565,615 rows** in `course_audio`. That gap is ~2.5M objects and ~80 GB, costing about **$1.85/month** in storage. It is immaterial to the per-learner floor, but it is real money for no benefit and worth a separate look — I have not investigated whether these are superseded takes, orphans from regeneration events, or content simply not yet linked. **No deletion should follow from this line without the standing make-before-break verification.**
- **Whether S3 → Vercel transfer is billed at internet rate is unconfirmed.** AWS does not charge for S3 egress to same-region compute, and Vercel's dub1 runs in eu-west-1 — so the true proxied rate may be $0.15/GB rather than $0.30/GB. I have used the conservative (higher) figure throughout. This only moves numbers that are already negligible.
- **All four dispatched workers failed to deliver** — three were lost to transient API overloads, and the fourth ended its session while its bucket scan was still running, killing it. I completed all four scopes directly instead. The usage answer came out stronger for it, since the `cacheHit` field gave a measurement where a worker would have produced a model.

- **The fixed-cost line is my own construction, not a verified server census.** I have counted the learner path as Vercel + Supabase + S3 only, and excluded the Popty build machines (watson-1, Camberley) as content-creation infrastructure on the architectural grounds that the learner app reads Supabase and S3 directly and never touches them. If that split is wrong — if any Popty service sits on the live learner path — the fixed line rises and the small-scale numbers move. The conclusion would not, because it rests on marginal cost, which is independent of it.
- **Per-learner figures use the 142 learners who actually played audio**, not the 332 with any activity. This is the conservative choice: it concentrates all cost onto fewer heads.
