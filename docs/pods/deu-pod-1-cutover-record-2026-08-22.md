# German pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. This record was written after the flip — the flip itself landed
earlier in today's bulk render chain and switchover run, ahead of this job — but every check below
was re-run independently by this job, not copied from an earlier report.*

---

## The headline

**German (`deu_for_eng`) listening exercises are replaced.** Learners now get the 231-sentence,
22-scene pod that was staged and verified — 231/231 rows independently proven playable and
on-cast — in place of the 142-sentence pod they had before.

It arrives on `pod-1`, the same 1-based convention Croatian, Spanish, Italian, French, Chinese,
Japanese, Arabic (MSA), Mexican Spanish, Egyptian Arabic, Korean and Brazilian Portuguese already
carry.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all its sentences and every audio link.

---

## The cast, disclosed plainly

Two target voices, both **native German Azure voices**: **Moritz** (`41321eb41295`, male) and
**Lena** (`3a7889066fa2`, female) — this production pair was kept over the official pool's
Felix/Sonja on 2026-08-17. Lena carried a gender mislabel in an earlier audit (shown as male when
she is female); the cast itself is correct and unaffected. The known (English) side uses the
estate's standard xAI voices, as normal for the known track.

**Approval provenance, for the record.** No approval row existed for `deu_for_eng` specifically —
only for Austrian German (`deu_at`) — because the two share the pool key `deu`. Tom's
language-level ruling ("we're doing these per language rather than per course") covers it; a fresh
approval row was written for `deu_for_eng` rather than reusing `deu_at`'s.

**A latent hazard, carried forward from the previous worker's own flag, not fixed here.** Austrian
German (`deu_at`) shares the pool key `deu` and its own approved ruling wants the *opposite* voices
(Felix/Sonja) to standard German's Moritz/Lena. A future `pod-sync.cjs` re-sync on that shared pool
key could silently stomp one course's cast with the other's. This belongs to whoever owns
`pod-sync.cjs`; it is not touched here, only carried into the record so it is not lost.

---

## Render

The systemd render chain (`pod-render-chain-2026-08-22`) reached German and rendered its missing
target clips: **149 generated, 0 failed, 0 blocked, veracity 11/11 sampled clips checked and
passed, 0 quarantined.**

---

## What was verified, in order — all re-run independently by this job

1. **Full probe-all audio verification** (`verify-pod-audio.cjs --probe-all`) against the live
   `pod-1`: 231 rows, HEAD ok=231/231 on both tracks, ffprobe ok=231/0 bad on both tracks.
2. **On-cast check**: 231 rows, 231/231 target audio, 231/231 known audio, exactly **2 distinct
   target voices** (`xai_3a7889066fa2`/`3a7889066fa2` = 137 clips, `xai_41321eb41295`/`41321eb41295`
   = 94 clips — the bare/`xai_`-prefixed forms are the same voice, so this is 2 voices, not 4) —
   **0 off-cast**.
3. **Prospective migration log** (already committed pre-flip):
   `docs/pods/deu-pod0-switchover-prospective-2026-08-22.json` — 108 content survivors, 0
   ambiguous, **17 rows carried, 2 dropped ("No, it's free. Please, take a seat." had no exact
   match in the new canon, which reads "No, it's free. Please, go ahead." at the same position — a
   genuine wording change, not a defect), 2 mis-credits prevented**.
4. **Independent database re-read**, done by this job, not any tool's own summary: `pod-1` — 231
   sentences, 231/231 both audio tracks, titled `German Listening Pods — Pod 1`;
   `pod-0-retired-2026-08-22` — 142 sentences, 142/142/142, archived intact; `learner_pod_state`
   for `deu_for_eng` — **17 rows across 2 learners**, consistent with the prospective forecast.
5. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that no longer
   exists in their claimed pod, across every course carrying pod progress, re-run after this job's
   own Korean/Brazilian-Portuguese/Portuguese flips: **zero**.
6. **Live browser verification, staging then production** — see below.

---

## Learner progress — measured against the forecast

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 17 | **17** |
| Exposures carried | 31 | **31** |
| Records dropped | 2 | **2** |
| Mis-credits prevented | 2 | **2** |

---

## What was verified live, in a real browser — staging then production

A real headless Chromium session, the deployed app's own anonymous Supabase credentials, driving
the actual course picker on **`https://staging.saysomethingin.app`** and then
**`https://saysomethingin.app`** to select "German" and reading the app's own network calls to
Supabase — no synthetic queries.

| Check | Staging | Production |
|---|---|---|
| Course resolves to | **`pod-1`** (`listening_pods` slug lookup) | **`pod-1`** |
| First sentence fetched | `deu_for_eng:pod-1:SC01-S001`, target "Guten Morgen, Sarah!", target and known audio both linked | Same row, same ids |

**The honest caveat, stated plainly: this is one data move, verified through two front ends, not
two independent moves.** `dev`, `staging` and production all read the same Supabase database, so
"German resolves correctly" is necessarily the same fact checked twice. What staging genuinely adds
is confirmation that the staging bundle's resolver logic (`servedPod.ts`, merged to `main`
2026-08-22 as part of the pods-are-1-based ruling) is exercised correctly against real data, not
just present in source.

The Popty admin page itself was not opened (behind an email one-time code only Tom receives); the
database reads above are the equivalent check against the same data the page would show.

---

## The way back

```
node tools/pods/pod-switchover.cjs --course=deu_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

No app change is needed to reverse this: the resolver prefers `pod-1`, falls back to `pod-0`, and
will find nothing on `pod-1` and serve `pod-0` on its own if rolled back.

---

## What needs Tom

**One thing, answerable cold, and it is not a blocker:** the `deu`/`deu_at` shared pool-key hazard
above. Not this job's file to fix (`pod-sync.cjs` is owned elsewhere), but worth a look before
anyone next runs a pool sync touching German.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Prospective
migration log: `docs/pods/deu-pod0-switchover-prospective-2026-08-22.json`.*
