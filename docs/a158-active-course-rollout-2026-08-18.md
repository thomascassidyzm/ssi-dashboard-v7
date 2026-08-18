# The nine active courses are re-addressed — 129,660 clips, no bytes, no spend

**Plate A-158 · 2026-08-18 · rollout of the approved activity-first sequence**

The [pilot](https://watson-1.tail4968cb.ts.net/d/508a48bc) proved the shape on 394
`eus_for_eng` clips. This ran the same guarded remediation across the nine active
courses, one at a time, each fully verified before the next one started.

**All nine landed. Nothing was skipped, nothing failed, no course needed a render.**

---

## The table

| # | course | actors since June | clips bumped | residue before → after | sampled clips verified |
|---|--------|------|--------|--------|--------|
| 1 | `zho_for_eng` | 1,321 | **14,630** | 14,630 → **0** | 3/3 identical |
| 2 | `hrv_for_eng` | 183 | **3,553** | 3,553 → **0** | 3/3 identical |
| 3 | `fra_for_eng` | 163 | **1,391** | 1,391 → **0** | 3/3 identical |
| 4 | `spa_for_eng` | 145 | **38,511** | 38,511 → **0** | 3/3 identical |
| 5 | `eng_for_hin` | 122 | **22,294** | 22,294 → **0** | 3/3 identical |
| 6 | `deu_for_eng` | 112 | **18,183** | 18,183 → **0** | 3/3 identical |
| 7 | `jpn_for_eng` | 91 | **27,804** | 27,804 → **0** | 3/3 identical |
| 8 | `ita_for_eng` | 87 | **3,150** | 3,150 → **0** | 3/3 identical |
| 9 | `pol_for_eng` | 85 | **144** | 144 → **0** | 3/3 identical |
| | **total** | | **129,660** | | **27/27** |

With the `eus_for_eng` pilot, **130,054** clips now carry an address that has
actually moved since their bytes did.

Two courses came in well under the pilot's estimate — `ita_for_eng` at 3,150 and
`pol_for_eng` at **144**, not the five figures the headline count might suggest.
Both numbers are real: those courses simply had little in-place churn. This is the
same point the pilot made about `eng_for_ben` — the estate-wide 474,100 was never
a work list, and the per-course truth is much smaller than the total implies.

---

## What was actually done to each clip

`audio_revision` was incremented by one. Nothing else. `buildAudioRef()` turns
revision ≥ 2 into `<uuid>.vN`, so the learner's address for the clip changes and
a device holding the pre-swap audio behind `max-age=31536000, immutable` is
forced to re-ask the origin.

**Zero TTS spend, and no render was ever close to being needed.** The bytes at
`s3_key` were already correct — that was the whole premise. The ledger proves it
independently: all 130,054 rows have `previous_s3_key = new_s3_key`.

```
 course_code | rows  | minrev | maxrev | bytes_moved
-------------+-------+--------+--------+-------------
 spa_for_eng | 38511 |      2 |      2 |           0
 jpn_for_eng | 27804 |      2 |      2 |           0
 eng_for_hin | 22294 |      2 |      2 |           0
 deu_for_eng | 18183 |      2 |      3 |           0
 zho_for_eng | 14630 |      2 |      2 |           0
 hrv_for_eng |  3553 |      2 |      2 |           0
 ita_for_eng |  3150 |      2 |      2 |           0
 fra_for_eng |  1391 |      2 |      3 |           0
 eus_for_eng |   394 |      2 |      2 |           0
 pol_for_eng |   144 |      2 |      2 |           0
```

`maxrev = 3` on `fra_for_eng` and `deu_for_eng` is expected, not an anomaly: a
few of their clips had already earned a legitimate revision 2, so their bump
lands on 3.

**No dormant course was touched.** Querying the ledger for any `course_code`
outside the ten returns **0**.

---

## How each course was gated

Per course, in this order, and the next course did not start until the previous
one finished all six:

1. **Snapshot** — the exposed set, written to CSV.
2. **Dry run** — the full transaction, then `ROLLBACK`.
3. **Verify PRE** — three sampled clips fetched from `/api/audio/:id` on
   production. **All three had to return 200 before any address was moved**, so a
   ref could never be pointed at a missing object.
4. **Apply** — one transaction: drift guard (every snapshotted row still matching
   live `s3_key` *and* `audio_revision`, or `RAISE EXCEPTION` and roll back),
   ledger insert first, then the `UPDATE`, then a post-write assertion that the
   bump took on every row.
5. **Reconcile** — the detector re-run for that course; it had to return **0**.
6. **Verify POST** — the same three clips, on both the old bare-uuid ref and the
   new `.vN` ref.

Every drift guard reported `snapshot_rows = still_agreeing` exactly. Nothing
moved under the run.

### Verified on served bytes, not on the row

For all 27 sampled clips across the nine courses: bare uuid **200**, `<uuid>.vN`
**200**, and the md5 identical to the pre-bump capture — byte counts equal too.
Sample from `zho_for_eng`:

```
OK 2b5c3853-… pre=13140928… bare=200/13140928… v2=200/13140928… bytes=29088/29088/29088
OK 808a4e09-… pre=ddebe5f8… bare=200/ddebe5f8… v2=200/ddebe5f8… bytes=31392/31392/31392
OK d53a1f99-… pre=e7078fc1… bare=200/e7078fc1… v2=200/e7078fc1… bytes=28800/28800/28800
```

So the bump is address-only and **nothing went silent** — the failure mode that
actually matters here. The old ref keeps playing for anyone still holding it,
which is why `previous_s3_key = new_s3_key` is correct rather than sloppy.

---

## One tooling change, and why it is not a shortcut

`snapshot-eus.sql` scanned the whole of `content_audit_log` and filtered to the
course at the very end. Generalised to `snapshot.sql`, the scan is now restricted
to the course's own clips **up front**, which is what makes a 38,511-clip course
finish in minutes rather than grinding.

That is an equivalence, not an approximation: exposure is only ever asserted of a
live `course_audio` row for the course, so an audit row belonging to any other
clip could never have produced an output row.

It was checked rather than assumed, on two controls before a single write:

- `eus_for_eng` → `post=180, pre=214`, exposed **0**. The 180/214 split is exactly
  the pilot's 394, and the 0 confirms the pilot is still reconciled.
- `fra_for_eng` → **1,391**, matching the full-scan estate figure exactly.

---

## Gaps, stated

- **Exposure remains inferred, not measured.** `player_events` says a course was
  played; no per-clip cache telemetry exists, so "actors since June" is still a
  proxy for who is actually holding a stale clip.
- **Sampling is 3 clips per course, 27 of 129,660.** The drift guard and the
  post-write assertion cover all rows at the DB layer, and the reconcile covers
  all rows at the detector layer, but the *served-bytes* claim is a sample. It is
  a strong sample — a systematic failure would have to spare all 27 — not a census.
- **Browser-level cache behaviour was not re-tested per course.** It was proven
  once, on `eus_for_eng`, in a real headless Chromium (job #195): `.v2` misses a
  warm HTTP + IndexedDB cache while the bare uuid still hits it. The mechanism is
  URL-keyed and course-independent, so it is taken as established rather than
  re-run nine times.
- **`content_audit_log` starts 2026-07-03.** Any in-place swap before that date is
  invisible to this method, in every course. These counts are a floor.

---

## What was deliberately not done

**Dormant and under-construction courses were not touched** — roughly 109k clips
with no devices holding them. Bumping them would force re-downloads that buy
nobody anything, and now that the six in-place writers move the cache key
themselves (`254a2f4d`), their next real build re-addresses them for free.

The long tail of *active* courses below `pol_for_eng` was also left alone; the
tooling is course-scoped and re-runnable whenever those are worth doing.
