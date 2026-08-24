# Pod scripts: listen to a whole pod hands-free

Live now on **popty.app/pods/scripts/ita_for_eng**. Hard-refresh once.

## What changed

A **sticky listen bar** sits under the navbar and stays there while you scroll:

- **▶▶ Play all** — starts at the top and runs to the end of the pod, straight
  through scene boundaries. **■ Stop** halts it and leaves the highlight where
  it stopped.
- **▶▶ on every line** — starts the run *at that line* and carries on to the end.
- Three toggles for what the run includes: **Target** (on), **Splits**,
  **English**. The clip count next to Stop tells you how long the run is.

The line you are **hearing** now takes a green left bar and a ring, and scrolls
itself to the middle of the screen as the run moves. Underneath the bar, a
one-line strip names the scene, the speaker, **the voice**, which clip, and the
clip's own words — so you can judge Enzo against Ara without hunting for the
highlight.

A single tap on any clip button behaves exactly as before: plays that one clip,
stops. Comparing two clips by ear is unchanged.

Nothing here writes anything. Same read-only page, same learner URLs.

## Taste calls I defaulted — one word each changes any of them

1. **What the run plays**: the target whole-turn clip of each line. English
   and splits are off unless you toggle them.
2. **A line with no whole turn** plays its split clips in order rather than
   being skipped.
3. **Auto-scroll follows the run only** — a single tap never moves the page
   under your thumb.
4. **The now-playing strip earns its space** — one line tall, always on while
   something is sounding.
5. **The violation filter narrows the listen** to what is on screen, and
   changing the filter mid-run stops the run rather than playing lines you
   can no longer see.
6. **A toggle change mid-run restarts from the line you are on**, not from
   scene 1.
7. **A clip that will not load** shows its error on its own row and the run
   carries on after about ¾ of a second.

## Explainers are gone from this page

Per your ruling: no Explainer button on any line, no explainer toggle, and the
continuous-play queue can never contain one. The pod data still carries 124
explainer clips for Italian — the page now ignores every one of them, and I
checked in the browser that not a single explainer byte is requested during a
run. I also stopped the "references point at no clip" count in the summary card
from counting dangling *explainer* refs, which was the last way one could still
show up here, as a red number.

The estate-wide pipeline deprecation is a separate job; this is the viewer only.

## Two bugs found and fixed on the way

- **Stop was unclickable.** The bar was sticking to the top of the window, and
  the app navbar is sticky there too — so the navbar swallowed the taps. Fixed:
  the bar now sits below the navbar.
- **Light mode on this page has never worked.** The overrides were written in a
  form that Vue's compiler silently turns into a rule on `<html>`, dropping the
  target. So in light mode a flagged row was still wearing its *dark* wash on a
  near-white page — the exact illegibility the code was written to prevent, live
  since the page shipped this morning. All thirteen overrides now compile
  properly. Worth a look in light mode.

## What I could not test

No course in the fleet has a dangling clip reference or a line missing its
whole-turn clip, so the skip-a-dead-clip path could not be exercised against
real data. I proved it two other ways: unit tests, and by flipping one real
ita_for_eng clip to dangling in the browser — the run never requested it and
carried straight on. A 404 mid-run was tested the same way.

Playback itself was driven in headless Chromium with substitute audio bytes, so
the advance logic is proven but the actual sound is not. That is the bit only
your ears can sign off.
