# French pods — the switchover, done

*2026-08-22. This is the fourth and final course in today's rollout, and the only one
that needed a real code fix first. Every number on this page was read back out of the
production database after the move, not forecast before it.*

---

## The headline

**The old French listening exercises are replaced.** French learners now get the
231-sentence, 22-scene pod, including the one row (`SC11-S008`) that was quarantined
this morning — `pod-1` is 231/231 audio-complete, cast Remi/Camille only, zero
off-cast. It arrives under the same convention as Croatian, Spanish, Italian and
Chinese: `pod-1`, no vacate pre-step needed.

**This was blocked earlier today and Tom unblocked it directly.** The first pass
(see `fra-pod-switchover-stopped-2026-08-22.md`) diagnosed `SC11-S008` as a false
quarantine — a comparator gap, not a script or audio defect — and stopped rather than
guessing. Tom's ruling, 14:12Z: *"Resolve the checker."* — the script stays, the
checker gets fixed, estate-wide, then re-verify and flip. That is what this record
covers.

---

## The checker fix, in one paragraph

`services/audio-veracity.cjs` already had a per-language numeral lexicon (French
included, commit `e12383d8b`, 2026-08-13) that reads a bare cardinal correctly in
either notation — "709" and "sept cent neuf" already scored as the same clip. What it
did not know is that French clock time is not a cardinal: whisper writes "7h30"
regardless of how the time was actually said, and "30" read as the bare number
"trente" is never what a French script says for the half hour — French says "et
demie". Fixed with a new `.time(hh, mm)` method on the French lexicon only (0h/12h as
minuit/midi, 1h/13h as "une heure" never "un heure", the quarter- and half-hour idioms
offered alongside the plain digital reading) and a new Rule 4c that checks it before
falling through to the per-number rule — purely additive, so every language without
`.time()` (everyone except French, today) is bit-for-bit unchanged.

**Verified before it went anywhere near production data:**
- 26 new unit tests, including the real `SC11-S008` pair, all twelve hour/idiom
  shapes, a plain non-time "30" still reading as "trente" (proving the fix is scoped
  to actual clock notation, not numbers in general), and a genuinely wrong time still
  convicted.
- The full 173-test `audio-veracity.test.cjs` suite green.
- The whole persisted verdict cache re-judged (`tools/reverify-veracity-cache.cjs`,
  the same tool the original English fix used for its own no-collateral-damage
  evidence): **5,341 entries, 345 failures before, 345 after, 0 verdicts changed.**

**Landed on `main`, not a side branch — this is shared production code.** Committed
on `fix/veracity-numeral-french-2026-08-22`, fast-forward merged straight onto
`origin/main` (`a897097` → `7805ac3e`, 2026-08-22 14:12Z), matching this repo's
current branch doctrine ("everything on Popty goes to main, branches are transient").
The two services that actually run the comparator (`production-api`, `phase8-audio`)
were pulled to the new commit and restarted on this box; `production-api`'s own
`/health` confirms `commitShort: 7805ac3e` post-restart. Both are internal
content-creation services behind the dashboard, not the learner-facing path — this
restart carried no learner-facing downtime.

---

## SC11-S008, re-verified through the fixed checker

Re-rendered target-track only, scoped explicitly (`pod_ids` + `sentence_ids`, so
nothing else in the pod could be touched), through the now-restarted phase8:

```
generated: 1, failed: 0, veracity: { checked: 1, passed: 1, quarantined: 0 }
```

Passed on the **first** attempt — `veracity_pass: true`, `veracity_cer: 0`,
`veracity_reason: 'ok'`. Voice confirmed as `69smp8rm` = **Camille**, the
Receptionist's own cast voice, on-cast. Fetched live through the audio proxy on both
staging and production: 200, `audio/mpeg`, 86,112 bytes, same clip.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | did not exist | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |

**Nothing was deleted.** The archived pod keeps all its sentences and every audio
link.

---

## Learner progress — measured against the forecast

Six learners held 168 sentence records carrying 4,702 exposures, all under `pod-0` —
the largest progress base of today's four courses.

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 157 | **157** |
| Exposures carried | 4,415 | **4,415** |
| Records dropped | 11 | **11** |
| Mis-credits prevented | 16 | **16** |

All 11 dropped records dropped for one reason — the sentence text is no longer
anywhere in the new pod (`text_absent_from_new_canon`). Zero ambiguous-text matches.

---

## What was verified, in order

1. **Readiness dry run** (`pod-switchover.cjs`, no `--apply`) — matched the
   pre-measured forecast exactly: 142 live / 231 staged, 0 untranslated / draft /
   missing-audio on either track (SC11-S008 now clear), 157 carry / 11 drop.
2. **Full rehearsal on a throwaway clone** (`rehearse-switchover.cjs
   --scratch=zzz_rehearsal_fra`) — forward flip and rollback both run for real
   against a disposable copy. Verdict: PASS. Forward produced the same 157/11 split;
   rollback restored both pods to their original slugs and counts with zero orphaned
   progress.
3. **Prospective per-record migration log** saved and committed before touching the
   real course: `docs/pods/fra-pod0-switchover-prospective-2026-08-22.json` — 114
   content survivors, 157 carry / 11 drop, matching the dry run exactly.
4. **Applied**, one transaction: `switched. archived 142 → pod-0-retired-2026-08-22,
   promoted 231 → pod-1. learner progress: 157 carried, 11 dropped.`
5. **Independent database re-read** (not the tool's own summary): `pod-1` — 231
   sentences, titled "French Listening Pods — Pod 1"; `pod-0-retired-2026-08-22` —
   142 sentences; all 157 remaining progress rows re-keyed onto `pod-1`. Target-track
   cast on `pod-1` confirmed as exactly the two approved voices —
   `0p0rt7o1` (Remi) and `69smp8rm` (Camille) — with zero off-cast rows and zero
   missing audio on either track.
6. **Fleet-wide orphan check** — progress records pointing at a scene/sentence that
   no longer exists in their claimed pod, across every course carrying pod progress:
   **zero**.
7. **Fleet no-op check** — German still serves `pod-0`/`pod-0-unrecorded` at its
   original counts (142/232); Croatian, Spanish, Italian and Chinese all still serve
   `pod-1` (231 each). This move touched French and nothing else.

---

## What was verified live, in a real browser — staging then production

A real Chromium browser, the deployed app's own anonymous Supabase credentials, run
against **`https://staging.saysomethingin.app`** first and then
**`https://saysomethingin.app`**, asking the questions a learner's browser asks.
**Every check below passed on both.**

| Check | Staging | Production |
|---|---|---|
| Served bundle carries the pod resolver | **Yes** — `index-Bg5bpeRl.js` | **Yes** — `index-CWh28bMu.js` (different build, same resolver shape) |
| French resolves to | **`pod-1`** | **`pod-1`** |
| French sentence / scene count | **231 sentences, 22 scenes** | **231 sentences, 22 scenes** |
| French audio linked | **231/231 target, 231/231 known** | **231/231 target, 231/231 known** |
| SC11-S008 has target audio linked | **Yes** | **Yes** |
| First French clip via the live audio proxy | **200, `audio/mpeg`, 16,128 bytes** | **200, `audio/mpeg`, 16,128 bytes** (same clip, same DB) |
| SC11-S008's own clip via the live audio proxy | **200, `audio/mpeg`, 86,112 bytes** | **200, `audio/mpeg`, 86,112 bytes** (same clip, same DB) |
| Spanish / Croatian / Italian / Chinese (untouched fleet check) | **`pod-1`, 231 each** | **`pod-1`, 231 each** |

**The honest caveat, stated plainly rather than glossed: this is one data move,
verified through two front ends, not two independent moves.** `dev`, `staging` and
production all read the same Supabase database — so "French resolves correctly" was
necessarily the same fact checked twice, not two different facts. What staging
genuinely adds here is independent confirmation that the **staging bundle itself**
carries the resolver code and that the fleet no-op holds through staging's own
deployed JS, not just the database.

The browser environment fix used for Italian earlier today
(`LD_LIBRARY_PATH=$HOME/.ssi-sentinel-libs`) was already in place for this run — no
repeat gap. Both `page.goto` calls logged a `networkidle` timeout (the page kept some
connection open past 45s) — harmless: it was caught, and every subsequent assertion
on the loaded page and the live database passed regardless.

---

## The Popty admin page

`/production/fra_for_eng/pods/pod-1` — **could not be logged into**, Popty is behind
an email one-time code only Tom receives. What is verified is the data the page
loads, not the pixels, stated precisely: the same open API the page calls
(`GET /api/pods/fra_for_eng/pod-1`, running locally against production data) returns
title "French Listening Pods — Pod 1", slug `pod-1`, target voices confirmed Remi and
Camille in the speaker map. The old link,
`/production/fra_for_eng/pods/pod-0-unrecorded`, now 404s as documented.

The known PodLab trap (resolves "current pod" by picking the largest `pod-0`-prefixed
match, so it will show the *retired* 142-line pod, not the new 231-line one) applies
here exactly as it does for the other three courses today. The fix for it is written
but unreleased — not touched or released as part of this job.

---

## The way back

Two moves happened today and can be reversed independently. Rolling back the pod
switchover does **not** require reverting the checker fix — they are separable, and
the checker fix stays correct/beneficial regardless of which pod is live.

**Undo the pod flip:**
```
node tools/pods/pod-switchover.cjs --course=fra_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```
Rehearsed on a throwaway clone before the real course was touched (step 2 above);
rollback restores both pods to their original slugs and counts with zero orphaned
progress. It does not restore the 287 exposures dropped on the way in — rollback
re-derives progress from what survived. No app change is needed: the resolver
prefers `pod-1`, falls back to `pod-0` on its own.

**Undo the checker fix**, if it ever needed reverting: `git revert 7805ac3eb` on
`main`, then pull + restart `production-api` and `phase8-audio-v13` on the deployed
checkout. This would put `SC11-S008` back into quarantine on notation alone — nothing
else in the estate depends on `.time()` existing, since it is additive and
French-only.

---

## What's untouched, stated once more

`spa_mx` and `fra_ca` were not touched — out of scope, separate casting. German
remains on `pod-0`/`pod-0-unrecorded`, unflipped, unrelated to this job. No other
language's veracity behaviour changed — the corpus re-judge (5,341 entries, 0 verdicts
flipped) is the evidence.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16).
Checker-fix commit: `7805ac3eb` on `main`. Prospective migration log committed
alongside this page: `docs/pods/fra-pod0-switchover-prospective-2026-08-22.json`. The
earlier stop-and-diagnose record: `fra-pod-switchover-stopped-2026-08-22.md`.*
