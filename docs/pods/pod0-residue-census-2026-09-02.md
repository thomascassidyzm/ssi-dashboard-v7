# Pod-0 residue: the estate census

**2026-09-02, read live from the database. No writes were made.**

## The answer

**Welsh was not missed. There was never a fleet cutover to miss it from.**

The August "22-course pod-1 move" was not a migration. It is a tool —
`tools/pods/pod-switchover.cjs` — run **one course at a time, by hand**, 22 times
since 2026-08-22. There is no skip list, no status filter, no language filter and no
run that errored partway. Welsh is not excluded from anything; it is simply one of the
**45 courses nobody has run it on yet**.

So the belief that pod-0 is gone estate-wide is wrong by a wide margin, and Welsh is
the least of it:

| | courses |
|---|---|
| Have a pod slug `pod-1` | **22** |
| Still have a pod slug `pod-0` | **45** |
| — of those, `pod-0` is **LIVE and serving learners** | **43** |
| — of those, `pod-0` is **held** (Welsh only) | **2** |
| Courses with pods, total | 67 |

Nothing is broken by this. `pod-0` is a **supported serving slug by design** — see
"is anything broken" below. But the estate is two-thirds on pod-0, not clean.

## The 43 courses serving live pod-0 today

All fifteen English courses:
`eng_for_ara` `eng_for_ben` `eng_for_deu` `eng_for_fra` `eng_for_guj` `eng_for_hin`
`eng_for_ita` `eng_for_jpn` `eng_for_kor` `eng_for_pan` `eng_for_por` `eng_for_sin`
`eng_for_spa` `eng_for_tam` `eng_for_urd` `eng_for_zho`

The Japanese-known set: `deu_for_jpn` `fra_for_jpn` `ita_for_jpn` `spa_for_jpn` `zho_for_jpn`

And: `ara_sy_for_eng` `bul_for_eng` `cat_for_eng` `cat_for_spa` `dan_for_eng`
`ell_for_eng` `est_for_eng` `eus_for_spa` `fas_for_eng` `fin_for_eng` `heb_for_eng`
`hye_for_eng` `lav_for_eng` `lit_for_eng` `nep_for_eng` `nor_for_eng` `pol_for_eng`
`swa_for_eng` `tha_for_eng` `tur_for_eng` `ukr_for_eng` (+ `zzz_test2_for_eng`, scratch)

**Held pod-0:** `cym_n_for_eng`, `cym_s_for_eng` — 231 sentences each, 462 total, which
is exactly the number #145 reported.

**The 22 already on pod-1:** ara, ara_eg, deu, deu_at, eus, fra, fra_ca, gle, hin, hrv,
isl, ita, jpn, kor, nld, por, por_br, ron, spa, spa_mx, swe, zho — all `_for_eng`.

*One reconciliation note: today's own census file `docs/pods/pod1-eligibility-census-2026-09-02.json`
(17:15Z) says 46 pod-0 courses. Live now says 45. The difference is `zzz_test_for_eng`,
deleted this evening on your authorisation. Not a discrepancy.*

## Why Welsh specifically is still pod-0 — the mechanism, quoted

Welsh **was** run through `pod-switchover.cjs`. On **2026-08-11** — eleven days
*before* the one-based ruling. From the applied log
(`docs/pods/cym_n_for_eng-pod0-promote-applied-log.json`):

```
"promote": "cym_n_for_eng:pod-0-unrecorded  ->  cym_n_for_eng:pod-0",
"archive": "cym_n_for_eng:pod-0  ->  cym_n_for_eng:pod-0-gated-2026-08-06",
```

It promoted **onto pod-0**, because the tool's default does exactly that:

```js
const PROMOTE_TO = arg('promote-to') || LIVE   // LIVE defaults to 'pod-0'
```

and the tool's own header says why that default exists:

> "Croatian is the first course across: it archives `pod-0` and promotes onto `pod-1`.
> The other ~68 courses **stay on `pod-0` until somebody decides to move them**, so this
> is a **per-course fact, not a fleet rename**, and the default keeps it that way."

So Welsh got the new 231-row canonical content in August — it just landed on the old
slug name, because on 2026-08-11 that was the only name there was. Everything since
has been per-course, opt-in, and nobody opted Welsh in.

**This is the load-bearing point: the cutover cannot have "missed" other courses,
because it never had an input set.** Every one of the 43 is in the same position as
Welsh — untouched, not skipped.

The real gate on the other 43 is readiness, not oversight. `pod-switchover` refuses to
promote an uncast pod, and 17 of the 43 have a staged `pod-0-unrecorded` sitting ready
(pol, bul, nor, dan, swa, est, fas, hye, nep, tur, lav, ukr, lit, cat, ell, heb, tha);
the other 26 — including all the eng_for_* courses — have no staged pod at all.

## Is anything broken today? No.

**Learners: fine.** `pod-0` is a first-class serving slug. The single resolver
(`ssi-learning-app/packages/player-vue/src/composables/servedPod.ts`) is explicit:

```js
export const SERVING_POD_SLUGS = ['pod-1', 'pod-0'] as const
export const FALLBACK_POD_SLUG = 'pod-0'
```

pod-1 preferred, pod-0 fallback — #145's claim, verified. The download bundle API
(`api/courses/[code]/bundle.ts:412`) mirrors it as a literal `.in('slug', ['pod-1','pod-0'])`,
with a comment explaining the duplication. A learner on `eng_for_spa` or `tur_for_eng`
is served correctly and would not notice a flip.

**Learner progress: clean.** I checked every `learner_pod_state` row against the
sentences that actually exist: **877 rows, 0 dangling.** The A-107 mis-credit class has
not recurred through any of the 22 flips.

**Welsh: intentionally silent, and correct.** `cym_n_for_eng:pod-0` is `visibility='held'`,
reason recorded on the row: *"Mid-recording. Catrin recorded four takes 2026-08-23;
three were 45-90s of background noise. Held until recording is finished AND a human
releases it."* RLS cascades from the pod to its sentences, so anon queries return
nothing — Welsh learners get no pod content at all. That is the gate working, not the
slug failing.

*One real gap: `cym_s_for_eng:pod-0` is also held but carries **no held_reason and no
held_at** — an unexplained hold. Worth a look, separate from all of this.*

**Tomorrow's recording session: unaffected by the slug.** The take renderers
(`tools/render-sentence-takes.cjs:88`, `tools/render-take-g.cjs:260`) hard-code
`` `${COURSE}:pod-0` ``, which is coincidentally *correct* for Welsh. The hazard runs
the other way: those tools would fail on any of the 22 pod-1 courses with
"no speakers cast".

### Hard-coded pod literals, classified

| File:line | Literal | Path |
|---|---|---|
| `tools/render-sentence-takes.cjs:88,97` | `${COURSE}:pod-0` | **artist** — correct for Welsh, breaks on pod-1 courses |
| `tools/render-take-g.cjs:260,276` | `${COURSE}:pod-0` | **artist** — same |
| `tools/render-fine-knowns.cjs:91` | `${COURSE}:pod-0` | artist/back-office |
| `tools/author-window-knowns.cjs:104` | `${COURSE}:pod-0` | back-office |
| `services/run-pod-explainer-batch.cjs:86` | `TARGET_POD_SUFFIX = 'pod-0'` | back-office |
| `services/pod-lego-extractor.cjs:325` | `TARGET_POD_SUFFIX = 'pod-0'` | back-office |
| `services/pod-explainer-composite.cjs:50` | `POD_SLUG = 'pod-0'` | back-office |
| `services/pod-bulk-migrate.cjs:71` | `POD_SLUG = 'pod-0'` | back-office |
| `services/production-api.cjs:4607,4825` | default `'pod-0'` | back-office (defaulted, overridable) |
| `tools/lib/pod-arg.cjs:3` | default `'pod-0'` | back-office (defaulted) |
| `tools/persist-stage0-pod0.cjs:57`, `tools/pod-state-report.cjs:30`, `tools/breakdown-fine.cjs:133` | `'pod-0'` | back-office |

**None on a learner path.** #145's claim stands as reported.

### One thing the cutover does leave behind

`pod_legos.first_seen_sentence` still points at `<course>:pod-0:...` ids on **19 of the
22 flipped courses — 7,802 rows** naming sentences that no longer exist.
`pod-switchover.cjs` doesn't touch that table. It is **provenance metadata only**: every
consumer reads `pod_legos` by `(course_code, lego_key)` or `explainer_audio_id`, never
by `first_seen_sentence`. So it is drift, not breakage — but it will keep accruing one
course at a time, and it is worth folding into the tool rather than sweeping later.

## What a safe Welsh cutover would cost

Clone-and-cutover, never a rename. Rows that move, per Welsh course (×2):

| Table | rows | what happens |
|---|---|---|
| `listening_pod_sentences` | **231 each / 462 total** | id rewritten `…:pod-0:…` → `…:pod-1:…`; audio ids carried, no clip touched |
| `listening_pods` | 1 header each / 2 total | live pod archived to a dated slug, staged clone promoted onto `pod-1` |
| `learner_pod_state` | **45 (cym_n) + 59 (cym_s) = 104**, 4 learners | slot keys remapped old-canon → new-canon in the same transaction |
| `course_audio` | **0** | UUID-keyed, never embeds a slug — 156 distinct clips ride across untouched |
| `pod_legos` | 0 | Welsh has no rows |

**Ordering constraints, all already enforced by the tool:**
1. `pod-1` must be free — it is, on both Welsh courses.
2. Welsh has no staged pod (its content *is* pod-0), so `clone-pod.cjs` must build one first; `pod-switchover` refuses to promote onto an occupied slug and has no in-place rename path.
3. Archive → migrate progress → promote, **one transaction**, with the post-snapshot re-read pass that catches a learner writing mid-flip (the nld_for_eng lesson of 2026-08-24).
4. The cast gate will refuse: Welsh is mid-recording and single-voiced. Needs `--accept-uncast-pod`, consciously.
5. **`visibility='held'` must survive the flip.** The hold is the recording gate; a flip that quietly relives it would publish half-recorded Welsh.

Not done, per your instruction. And not the night before a session.

## Gaps

- The classification above is my own read of the code. Worker **#158** is doing an
  independent file-by-file pass over both repos; if it finds a learner-path literal I
  missed, that supersedes this table.
- `cym_s_for_eng:pod-0` held with no recorded reason — unexplained, not investigated.
- `canonical_script_versions` still holds six rows on `pod-0.5`; the 2026-09-01
  migration doc flags it as **an open decision for you**, still open.

---

## Addendum — worker #158's independent pass, folded in (2026-09-02)

#158 read both repos file-by-file, independently, running no DB queries (by
instruction). It confirms the substance and adds three things.

### 1. There are TWO resolvers, not one. #145 was right; I was short.

I reported only the learner resolver. The second lives in Popty:
`services/pod-voice-approvals.cjs:269`

```js
const SERVING_SLUGS = ['pod-0-unrecorded', 'pod-1', 'pod-0']
```

It answers a *different* question — "what is this course's current content for
review" — so it deliberately prefers the unrecorded working copy and includes held
pods by default. Its own comment block (lines 247-261) explains why the order differs
from the learner path. Not a drift, a different job. Both prefer pod-1 over pod-0;
neither hard-codes pod-1 without a fallback.

### 2. Correction to #158: Welsh has no `pod-0-unrecorded`.

#158 concluded the recordist queue "will find Welsh's `pod-0-unrecorded` (232 lines)".
**That pod does not exist.** Checked live, every Welsh pod row:

```
cym_n_for_eng:pod-0                    held   231
cym_n_for_eng:pod-0-gated-2026-08-06   held     0
cym_s_for_eng:pod-0                    held   231
cym_s_for_eng:pod-0-gated-2026-08-06   held     0
```

The `pod-0-unrecorded` copy was **consumed** on 2026-08-11 — promoted into `pod-0`,
per the applied log quoted above. #158 read the code and inferred it; it ran no query.

**The conclusion still holds**, by a different route: the approvals resolver falls
through `pod-0-unrecorded` (absent) → `pod-1` (absent) → **`pod-0` (present, 231 rows)**,
which the service-role client sees regardless of the `held` flag. Welsh queues fine
tomorrow. It just resolves via `pod-0`, not a working copy.

### 3. A real hazard for tomorrow that I missed

`services/production-api.cjs:4469` and `:4532` — the pod-script review endpoints:

```js
const slug = String(req.query.slug || 'pod-1')
```

The default is **`pod-1`**, and the fleet index is documented as *"every course that
has a live pod-1"*. So **Welsh does not appear on the pod-script review page, and
opening `cym_n_for_eng` there without `?slug=pod-0` finds nothing.** Overridable by
URL param, but the default is wrong for all 45 pod-0 courses, which is most of the
estate. Same shape at `src/views/CanonicalPodView.vue:67`, though that one defaults
the other way (`|| 'pod-0'`).

This is the one item here with a bearing on tomorrow: if you go looking at Welsh
through that page, add `?slug=pod-0` or it will look empty.

### 4. Take-render tools — #158 sharpens the point

`tools/render-take-g.cjs`, `render-sentence-takes.cjs`, `rescue-take-g.cjs`,
`slice-take-g.cjs`, `verify-breakdown.cjs`, `render-residue-atoms.cjs`,
`render-fine-knowns.cjs`, `rescue-wrong-language-clips.cjs` all take a `COURSE` CLI
arg but hard-code the slug. On a `pod-1` course they don't just fail loudly — several
would **silently target the wrong pod**. Correct for Welsh; a live trap for the 22.

### #158's own gaps, carried forward honestly

- It did not enumerate all ~150 `tools/pods/*.cjs` hits individually — most are dated,
  single-use rescue scripts with CLI-overridable defaults. Full table available on request.
- It could not find a `--slug` override in `services/pod-lego-extractor.cjs` or
  `services/run-pod-explainer-batch.cjs`; whether that is a real limitation or simply
  dead ground (the fleet may not run explainers on pod-1 courses yet) is **unverified**.
