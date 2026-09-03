# PodLab casting: the two candidates are on the page now

**2026-08-11.** You went looking for the Spanish voice samples on Pods → Casting & approval
and found nothing, because they had been published as doc pages instead of built into the
product. That is fixed. The comparison, the clips and the approve button are now on that
one screen, live on popty.app.

## Where to click

**popty.app → Pod Lab → Casting & approval**, pick the course. You'll see:

- **CAST NOW** — the pair the pod is cast on today, with its sample clips, exactly as before.
- **+ Add as a candidate** — under the two dropdowns. Pick a male voice and a female voice,
  press it, and that pair appears as a second column beside the current cast.
- **HEARD TODAY** — appears by itself when the audio on the pod was rendered by exactly two
  voices that are not the cast. That is what the pod actually sounds like right now.

Each column carries its own two voices (name, provider, voice id, locale), a ▶ per voice,
and its own clips. **Approve** on any column makes that pair the cast and records the
approval in one press. **Reject** on a candidate just drops it from the comparison — the
pod's cast is untouched.

## The rule that keeps it honest

A column's clips are the ones this pod actually has **that were rendered on that column's
two voices** — read from the clip rows, never from the stored cast. So a pair with nothing
rendered on it says *"Nothing on this pod has been rendered on this pair yet"* and offers
to render one, instead of borrowing someone else's audio and looking like evidence.

## Spanish specifically

`spa_for_eng` pod-0 is cast Iberian (Elvira/Álvaro) but every clip on it was rendered on
older xAI voices — that is why it sounds Mexican. The page now shows that as two columns:
the Iberian cast with no clips of its own, and the xAI voices you can actually hear. To
judge them properly, one of them needs a sample rendered.

## What I did not do

**No audio was generated — zero clips.** The generate buttons are wired and capped at 10
clips, and they are yours to press. "Cast it and generate a sample" on a candidate casts
the pod on that pair first (phase-8 renders from the stored cast, so it has to), then runs
the same capped sample path. Nothing is deleted, and nothing bulk can start from this page.

Tests: 22 pass, including new ones that fail if the two columns ever collapse into one.
