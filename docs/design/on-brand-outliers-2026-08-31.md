# Popty on-brand — the two outliers, fixed

**Look at this first: https://watson-1.tail4968cb.ts.net/evidence/popty-on-brand-2026-08-31/index.html** — every screen, before and after, dark and light, side by side. Tap any image for full size. Judge it there; the words below are only what the pictures cannot say.

One note on the pictures: in the *before* shots the emoji show as empty boxes. That is this Linux box having no emoji font, not the page. On your screen they are a clapperboard, a spanner and theatre masks — which is the point.

## Basket Lab — the white rectangle is gone

It declared its own palette inside the iframe, black-on-white, so on the dark shell it showed as a lit rectangle pasted onto the page. It now carries a literal mirror of the house tokens, and the shell tells it which theme to be: the wrapper puts the current theme on the frame's URL, watches the navbar toggle, and threads the theme through prev / next / grid / verdicts so it survives a click inside the frame. Cards instead of flat boxes, green links, Inter, pass/fail on the house green and red.

There was also a real light-mode bug, and it is the reason for the recommendation at the bottom: the page title was written as `var(--text, #e5e7eb)`. There is no `--text` token in Popty, so the fallback won and the words "Basket Lab" rendered near-white on the light canvas. Invisible. Nothing warned anybody.

Every control and every word is intact, and that was proved rather than asserted: the old server was run beside the new one and the rendered text and a full control inventory — every form action, input, button, select, textarea, datalist option and link target — were diffed across all four pages. Identical.

## Autocue Studio — a different language, now the same one

Not drift. It had its own display font, monospace body copy, a serif teleprompter line, emoji for icons, a glowing red mic badge, neon green, and "MODE 1 / MODE 2 / MODE 3". All of it is gone. Real icons from the icon system, the shared type scale, house cards, house accents, and **zero hex and zero rgba literals left anywhere on that route**.

The three modes now say what they are for: **Record a new course**, **Re-record flagged lines**, **Record listening pods**. Every other word on those cards is untouched.

**The navigation, which is what you actually named.** It had one bespoke "Back to Dashboard" link and, once you were inside a mode, no route back to the choice page at all — the teleprompter had no way back whatsoever. It now carries the house trail on every phase: *Home / Spanish for English Speakers / Recording / Reading*. Tapping **Recording** returns you to the three cards. I tested that by hand in a browser, from the teleprompter: three cards come back.

One thing worth knowing: the studio is also embedded in the Record Room, whose `/r/` links are deliberately public and navbar-free so a volunteer sees the line and nothing else. The trail is switched off there, so nobody holding a recording link is handed a route into the admin dashboard.

## Every change was checked in both modes

Both pages, both themes, every screen in the evidence page. Light is where hard-coded colour shows itself, and it is where both of these were broken.

## What still needs you

**1. The second palette — this is the real decision.** The census found **1,545 genuine hard-coded colour hits across 134 files**, and about 96% of a sampled bucket were real, not grep noise. But most of them are not sloppiness: they are a *second, unofficial status palette* — info blue, special purple, extra reds and ambers — used consistently for the same meanings right across the estate, because the ten-token house set never covered those meanings. Everybody routed around the same gap the same way. So: does the token set **grow** to name those statuses, or does everything get **remapped** onto amber, green and red? One sentence from you decides it, and nothing lasting can be built until it is decided.

**2. Breadcrumbs are the exception, not the rule.** "Breadcrumbs on every page" is currently true of **11 of 72** routed views. 22 more use a one-off "back" link instead. That is a bigger job than these two pages and I have not started it.

**3. Two small ones.** The Basket Lab shows the course/seed/show form **twice** — once in the Vue wrapper, once inside the framed lab. Both are real controls, so nothing was removed. And the recording tool's siblings that are *not* on this route — the pod long-take studio, the tutorial studio, the recordist room — still speak the old language, so they will now look inconsistent with the page beside them.

## The one mechanism I recommend

**A third check in the CI gate that already exists** — `.github/workflows/explainer-check.yml`. That file already carries two dependency-free node gates and says in its own comment why a second workflow was never created. A third rides along the same way: `tools/check-design-tokens.cjs`, no npm install, two rules and no more.

**Rule 1 — a `var(--name, #hex)` fallback where `--name` is not a real token fails the push.** This is a name lookup against `src/style.css`, so it cannot produce a false positive, and it catches exactly the bug that made the Basket Lab title invisible and the same bug sitting in the Environment Switcher today. This one is worth having on its own, whatever you decide about the palette.

**Rule 2 — a *newly added* hex or rgba literal in `src/**/*.vue` or `labs/**` fails the push.** Diff-scoped on purpose: the 1,370 that exist stay, and the estate simply stops getting worse. A rule that failed on all of them would be switched off inside a week, which is worse than no rule.

**What it would not catch, plainly.** It cannot see a colour that is a real token but the wrong one. It cannot see spacing, radius or type drift, all-caps display headings, emoji used as icons, or a missing breadcrumb. And it cannot tell you a page looks wrong — the Basket Lab's white rectangle was every colour it declared, correctly. The only instrument for that is looking at both themes, which is a person's job and stays one.

**Order matters:** Rule 2 is only fair once the palette question is answered, because until there is a blue token, someone who needs blue has no legal way to write it. Rule 1 can go in today.

I have **not built it** — you asked for a recommendation so you could rule.
