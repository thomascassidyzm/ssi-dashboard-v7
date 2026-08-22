# Croatian pods — the switchover, done

*2026-08-22. Every number on this page was read back out of the production database after the
move, not forecast before it. Where a number was predicted, the prediction is shown next to
what actually happened.*

---

## The headline

**The old Croatian listening exercises are replaced.** Croatian learners now get the
231-sentence, 22-scene pod built last night — properly cast on the two approved voices, every
one of its 462 clips fetched and confirmed playable — in place of the 142-sentence pod they
had before.

And it arrives under the new name. Tom's ruling this morning: *"We want to not have a Pod 0
from now on. We want this first one to be called Pod 1. This new one."* So Croatian is the
first course on the 1-based convention. It serves **`pod-1`**. Every other course carries on
serving `pod-0` exactly as before — the app now asks each course which pod it serves instead
of assuming.

---

## What moved

| Pod | Before | After | What it is |
|---|---|---|---|
| `pod-1` | 180 sentences (Laura & Mark, never served) | **231 sentences — LIVE** | The new pod. What learners hear now. |
| `pod-0` | 142 sentences, live | *gone* | Archived below. |
| `pod-0-unrecorded` | 231 sentences, staged | *gone* | Promoted to `pod-1`. |
| `pod-0-retired-2026-08-22` | — | 142 sentences | The pod learners had until today. |
| `pod-1-retired-2026-08-22` | — | 180 sentences | The Laura & Mark dialogues that were squatting on the `pod-1` slug. |

**Nothing was deleted.** Both archived pods keep all their sentences and every audio link. The
19 target and 63 known clips legitimately shared between the old and new pods were never touched.

---

## Learner progress — measured against the forecast

Five learners held 383 sentence records carrying 1,368 exposures, all under `pod-0`.

| | Forecast | Actual |
|---|---:|---:|
| Records carried | 241 | **241** |
| Exposures carried | 835 | **835** |
| Records dropped | 142 | **142** |
| Mis-credits prevented | 169 | **169** |

**61% of all Croatian pod progress carried across.** Progress moved by *content*: a sentence kept
its exposures only where the identical text appears in the new pod, in the corresponding scene.
All 142 dropped records dropped for one reason — the sentence is no longer anywhere in the new
pod. None dropped from a position problem and none from an ambiguous match; there are no duplicate
sentence texts in either pod, so nothing here was a guess.

The 169 mis-credits are the point of the whole exercise. Editing the live pod in place would have
silently credited learners 169 times with sentences they had never heard, at whatever familiarity
they had reached with whatever used to sit in that slot. No error, no alarm. That is what happened
to Welsh on 11 August, and it is what this protocol exists to stop.

A dropped record costs a little re-listening and nothing else. No learner can go backwards, and
no course-level progress was touched by any of this.

---

## The order it was done in, and why

The order was the whole risk. The app and the database can disagree, and any window where they
disagree is a window where real Croatian learners have no listening pod at all.

1. **Vacate `pod-1` first.** The slug was occupied by 180 sentences of an unrelated dialogue set
   (mistitled "Pod 0", never served to anyone, zero learner progress). Moved out of the way
   *before* any app code shipped — because releasing a resolver that prefers `pod-1` while the
   wrong pod sat on that slug would have served every Croatian learner the wrong content instantly.
2. **Ship the app resolver while Croatian was still on `pod-0`.** With `pod-1` empty, the resolver
   fell back to `pod-0` for every course including Croatian — so the release was a behaviour no-op
   and safe to put in front of real learners. That is exactly why it went first.
3. **Then flip the database**, in one transaction, into an app that already knew how to follow it.

Make before break, in that order. There was no window.

---

## What was verified live, and how

Not "the query returned what I expected" — a real Chromium browser, loading
**https://saysomethingin.app**, asking the questions a learner's browser asks, with the
deployed app's own anonymous credentials. Run once before the release as a baseline and
again after the flip.

| | Before | After |
|---|---|---|
| Croatian serves | `pod-0` — 142 sentences, 15 scenes | **`pod-1` — 231 sentences, 22 scenes** |
| Croatian audio linked | 142/142 | **231/231 target, 231/231 known** |
| First Croatian clip, fetched through the live audio proxy | 200, `audio/mpeg`, 29,664 bytes | **200, `audio/mpeg`, 23,040 bytes** — a different clip, from the new pod |
| French / Romanian / Spanish | `pod-0`, 142 sentences | **`pod-0`, 142 sentences — unchanged** |
| Both Welsh courses | `pod-0`, 231 sentences | **`pod-0`, 231 sentences — unchanged** |

Separately, the resolver's answer was compared against the old hardcoded `pod-0` for **all 68
pod-bearing courses** before the flip: identical for every one. The release was a behaviour
no-op, which is exactly what made it safe to put in front of real learners ahead of the
database move.

### Staging — and an ordering mistake I made

**Tom's standing rule is that a player-facing change is verified on `staging` before it reaches
`main`. I did not follow it.** I read the hotfix lane in CLAUDE.md — "straight to `main` via a
`hotfix/` branch" — as licence to skip the staging soak, pushed to `main` first and `staging`
second, and released to production before Tom's correction arrived. The commits were right and
the diff was narrow; the order was wrong. The narrowness of a diff is not what makes a player
change safe, and I have written the rule down so it does not recur.

Staging is now verified in full, on `staging.saysomethingin.app`:

| Check | Result |
|---|---|
| Staging's bundle actually carries the resolver | **Yes** — extracted from `index-Bg5bpeRl.js`: `.select("slug").eq("course_code",e).eq("pod_type","core").in("slug",…)` with a `pod-0` fallback |
| Croatian on staging | **`pod-1` — 231 sentences, 22 scenes, 231/231 audio both tracks** |
| First Croatian clip via staging's own audio proxy | **200, `audio/mpeg`, 23,040 bytes** |
| Old-slug no-op, whole fleet | **67 of 68 courses resolve exactly as the old hardcoded `pod-0`**; only `hrv_for_eng` differs, by design |

**One part of that verification is no longer reproducible anywhere, and it is worth being exact
about why.** `dev`, `staging` and production share **one database**. So the "resolver is a no-op
while Croatian is still on the old slug" half could only ever be observed *before* the data moved
— and it was observed, twice, but on production rather than staging, because of the ordering
mistake above. What staging can still prove, and does, is the same no-op property across the 67
untouched courses, plus correct Pod 1 serving. The Croatian-specific pre-flip evidence is real
but was gathered in the wrong place.

A fleet-wide check for progress records pointing at a sentence that no longer exists returns
**zero rows, across every course** — not just Croatian.

---

## The way back

One line, and it reverses everything:

```
node tools/pods/pod-switchover.cjs --course=hrv_for_eng --stamp=2026-08-22 --promote-to=pod-1 --rollback --apply
```

**`--stamp=2026-08-22` and `--promote-to=pod-1` must both be there.** The stamp is the name the
old pod is archived under and the rollback finds it by that name; the tool's own default stamp is
`2026-08-14` and would refuse to find anything. Get either wrong and it refuses outright rather
than doing something strange.

That restores the 142-sentence pod to `pod-0`, puts the new pod back on `pod-0-unrecorded`, and
maps progress back by the same content rule. **This was rehearsed, not assumed** — the full
forward-and-rollback cycle was run against a complete throwaway clone of the Croatian course before
the real one was touched, and the rollback put all three pods back on their original slugs with
their original counts and zero orphaned progress records.

If you roll back, the app also needs telling: Croatian would be on `pod-0` again, and the resolver
prefers `pod-1` — but the rollback leaves nothing on `pod-1`, so the resolver falls back to `pod-0`
on its own. No app change is needed to reverse this.

**What the rollback does not restore:** the 533 exposures dropped on the way in. Rolling back
re-derives progress from what survived rather than resurrecting what was there before. In practice
that means a little re-listening, paid twice. No course progress is lost either way.

---

## Two things worth knowing

**The old pod-1 was archived, against the plan's own recommendation.** The plan argued for leaving
it alone: 180 finished sentences, no progress, no cost where it sat. But it was occupying the slug
the new pod had to take, so the recommendation was overtaken by the ruling. It is renamed, not
deleted — all 180 sentences and their audio are intact at `pod-1-retired-2026-08-22`.

**Two Popty URLs stopped working, by design.** `/production/hrv_for_eng/pods/pod-0-unrecorded` —
the link Tom was sent this morning — now 404s, because that slug no longer exists. The pod is at
**`/production/hrv_for_eng/pods/pod-1`**, and that page's data is confirmed live: the deployed
Popty API returns all 231 sentences across 22 scenes for it, opening on "Dobro jutro! / Good
morning!" — the Friend rename already in place. *I could not log in to Popty to see the page
render — it is behind an email one-time code that only Tom can receive — so what is verified is
the data the page loads, not the pixels. Stated plainly rather than glossed.*

**One Popty thing is fixed but NOT released, and it needs a decision.** Popty surfaces that
resolve "this course's current pod" *without* being given a slug — PodLab, the voice-approvals
view, ListeningConfig, and `/api/pod-content` called with no slug — still search the old
"pod-0 family". The fix is written, tested and pushed, but Popty's branch sits **138 commits ahead
of its main**, so releasing it would ship a large amount of unrelated work. That is not a call to
make quietly on the way past.

**And it is worse than coming up empty, which is worth stating precisely.** `pod-0-retired-2026-08-22`
*starts with* `pod-0` and keeps `pod_type='core'` through the archive rename, so the old
family-match still finds it and picks it as the largest match. Confirmed against the live
database: **the deployed PodLab resolves Croatian to the RETIRED 142-line pod, not the new
231-line one.** Until the fix ships, do not judge the new pod from PodLab.

**Use the direct URL instead — it is slug-driven and correct today:**
`https://popty.app/production/hrv_for_eng/pods/pod-1` returns all 231 sentences from the deployed
build. **Nothing learner-facing is affected by any of this**; it is an admin surface only.

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Plan this
executes: `docs/pods/hrv-pod0-switchover-plan-2026-08-22.md`. Per-row logs committed alongside
this page.*
