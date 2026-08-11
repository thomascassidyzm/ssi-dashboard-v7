# PodLab: manual voice choice in casting — what landed, 2026-08-11

**Branch:** `fix/podlab-casting-two-voice-2026-08-11`. **Not merged, not deployed.**

## What you can now do

Open PodLab → Casting & approval for a course. Above the cast table there are
**two dropdowns**: a male slot and a female slot for the **target** voices, plus
a ▶ on each and an **Apply**.

- Both open on **the voice the pod is cast on today** — open the panel, change
  nothing, and nothing changes.
- The list leads with the **curated pool** for the course's language, and the
  pool key is printed (`spa` vs `spa_mx` — that is the whole Iberian question),
  then the wider discovered xAI inventory below it.
- Every row shows **name · provider · voice id · locale**, and any voice steered
  at a locale that isn't the course's target language is marked **⚠ WRONG
  LANGUAGE** by the same check that already flags it in the cast table.
- ▶ plays a few seconds of that voice reading **a real line of this pod**. It
  supersedes anything already playing — never two at once. This is the one place
  the feature spends money, per click.
- **Apply** writes casting for the pod on screen and nothing else. **No audio is
  generated. No clip is deleted or unlinked.** The cast fingerprint moves, so the
  previous approval goes stale and generation re-locks — the page says so.

## The Spanish finding — read this before recasting

The stored cast for `spa_for_eng` pod-0 is **already Iberian**:
`es-ES-ElviraNeural` / `es-ES-AlvaroNeural`.

But **zero** of the pod's clips were rendered on it. The Spanish target audio on
`spa_for_eng:pod-0` and `pod-0-unrecorded` sits on older **xAI** voices —
`yis75yfp`, `ekhwx401`, `jupvcf34`, `d2313a0d`, `f2f41225` — and xAI's Spanish
default leans Latin American. So the Mexican pronunciation was in the *audio*,
not in the cast the page shows.

Two ways to fix it, and the picker supports both:
1. Pick the **Azure es-ES pair** (Iberian by construction), approve, re-render.
2. Keep an **xAI** voice and let it carry `locale: es-ES` — for xAI that tag *is*
   the accent, and the picker sends it with the choice.

Either way the audio has to be re-rendered afterwards; changing the cast alone
changes nothing a learner hears.

## Things to know

- **Target track only.** That is where the miscast was and where the ear judges.
  The endpoint already accepts a known-track override, so adding a second pair of
  selects later is a template change, not a rebuild.
- **Scope is the pod on screen**, resolved the same way the sampler resolves it —
  never assumed to be `<course>:pod-0`. Course-wide is available on the endpoint
  (`scope: "course"`) but is not wired to a button: a cast you cannot hear is a
  cast you cannot judge.
- **A re-sync stomps the choice.** The pick lives only in `listening_pods.speakers`.
  Re-running `tools/pod-sync.cjs` on the pod's markdown re-casts from the pool and
  silently reverts it. There is no separate override table on purpose — one source
  of casting truth — so re-apply in PodLab after any re-sync.
- **Approval invalidation is deliberate**, not a bug: an approval is only valid
  for the exact cast it was granted against.
