# The Voice Lab, restyled — before and after

*2026-08-29. Everything below is interface. The voice quality is not in question:
**Tom has used the lab and his Cartesia clone is excellent.***

Base for images: `https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/`

---

## 1 · The Languages tab

**Before** — a native text box, a native dropdown, a plain-text Refresh, a run-on
stats line and small red text where a badge should be.

![before](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/before-languages.jpg)

**After** — the Course Library's own search field, filter chips, pill badges and table.

![after](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/languages.png)

What changed, and why:

- **The status chips ARE the summary.** There used to be a stats line and, under
  it, a dropdown that filtered by the same six values. Now there is one row:
  `Every status 68 · Complete 0 · Partial 0 · Uncast 33 · No Cartesia 32 ·
  Human-voiced 3`. The count and the way to act on it are the same object, and
  the selected chip is painted in its own meaning's colour.
- **Status is a pill badge**, drawn exactly like PRICING and STAGE on the courses
  page. The five statuses keep their separate colours — complete, partial,
  uncast, no-Cartesia and human are not interchangeable and the colour still says so.
- **A proper search field**, full width, courses-page styling.
- **A right-aligned count** — "68 of 68 languages" — with the explanation
  ("Complete means 2 voices — one male, one female. Backups are insurance, not
  required.") moved out of the run-on line and under it.
- **The courses-page table** — `--surface-2` header row, row hover, same borders
  and radii, language code in mono green like a course code.
- **The duplicated prose is cut.** The page said "casting writes nothing but the
  casting" twice, in two paragraphs. The page subtitle keeps it; the panel's
  copy is gone, and the panel now carries one line — where the rows come from.
  **The spend-ceiling line is untouched.**

**On a phone** the table drops *Courses* and *Default provider*, the way the
courses page drops KNOWN and TARGET, so the language, its voice count and its
status all fit without a sideways scroll.

![phone](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/phone-languages.png)

---

## 2 · The A/B control

**Before** — the mode switch was a small underlined text link beside the heading;
the A row was unlabelled and its value sat on the LEFT, while the B row's value
sat on the RIGHT.

![before](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/before-play-compare.jpg)

**After** — a segmented control reading **One setting | Compare two**, in the same
idiom as the Languages/Play/Engineering tabs directly above it. In compare mode
each slider becomes one box holding two labelled rows, A above B, with **both
value readouts in the same column**, so the eye reads straight down the page.
The ends (slower/faster) sit once under the pair instead of twice.

![after](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/play-compare.png)

The guidance sentence is kept and re-sited as helper text on the comparison
itself: *"Two renders of the same sentence, side by side. **Both sides are
identical** — move one slider on the B row, or the comparison measures nothing."*
Once the sides differ it becomes *"Change one thing at a time and you can hear
what it did."*

**Nothing about the sliders themselves changed** — same three, same ranges, same
stops, same effect on the audio. Engineering is untouched.

![phone compare](https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/phone-play-compare.png)

---

## 3 · One look, one file

The courses-page styling lived as `<style scoped>` inside `CourseBrowser.vue` —
which is why `.filter-select` had already been copy-pasted into three other
views. It now lives once, in `src/assets/ui-tokens.css`, and **both** the Course
Library and the Voice Lab read from it: search field, filter chips, pill
dropdowns, recents chip, dense table, and five named hues for status badges.

**Proof the Course Library did not move.** Two full-page captures of `/courses`,
one from `origin/main` and one from this branch, same viewport, same moment in
load:

| | |
|---|---|
| before | https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/courses-base.png |
| after | https://watson-1.tail4968cb.ts.net/evidence/voicelab-look-2026-08-29/courses-after.png |

Same dimensions (1280 × 6301) and **246 differing pixels out of 8,065,280** —
0.003%, all of them the little green build-hash badge, which naturally differs
between two builds. Getting there took two fixes worth recording: Tailwind's
`text-sm` and `text-xs` carry line-heights (1.25rem, 1rem) that a bare
`font-size` does not, and without pinning them every table row grew 1px.

**What was NOT migrated, deliberately:** CourseBrowser still builds its PRICING
and STAGE pills from inline Tailwind utility strings in JS, because its
light-mode AA overrides hang off those exact class names (`.pp-free`,
`.sp-live`). The shared file carries the same hues under `.ui-pill` +
`.ui-hue-*`, which is what the Voice Lab wears. The three other views that
copy-pasted `.filter-select` were also left alone — out of scope here.

---

## 4 · Verification

Looked at, in a real Chromium, at 1280px and 390px: Languages, Play, Play in
compare mode, Engineering and the Course Library. `e2e/voice-lab/shots.spec.js`
is the camera and now covers the Languages tab, the courses page and a phone
viewport; screenshots above come straight from it.

The two targeted specs were updated for the new control names
(`Compare two` / `One setting`, `.cmp-row` instead of `.slider-track.second`).
`e2e/voice-lab/play-mode.spec.js` now passes 3 of the 4 non-rendering tests,
up from 1 — its `beforeEach` never opened Play after Languages became the
landing tab yesterday.

**One test still fails, identically before and after this change:** *"the default
voice is the clone, and pace is disabled WITH ITS REASON on xAI"*. The default
voice is now the Cartesia clone, so the pace slider is live rather than dead —
the assertion encodes the old xAI default and is stale, not broken by this work.

**No TTS was generated.** The two specs that render real clips were not run;
that spends money and needs a decision, not an assumption.
