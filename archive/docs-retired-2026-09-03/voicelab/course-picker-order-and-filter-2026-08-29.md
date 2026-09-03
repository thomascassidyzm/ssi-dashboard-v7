# The course picker: alphabetical, searchable, and one component

**2026-08-29.** Tom, of the Voice Lab's "or pull one from a course" dropdown:
*"can we have the drop down menu to select a course to pull the language from have
the same filter at the top? this is a nightmare to parse - and it is not even
alphabetical by either target or known language."*

**Before and after, with screenshots:**
https://watson-1.tail4968cb.ts.net/evidence/voicelab-course-picker-2026-08-29/index.html

## What it was

A native `<select>` holding every course the lab can read text from, in the order
the backend returned them — `seed_count` descending. That is why it opened on
Quebec French and then jumped to English for Bengali: the list was ordered by how
much content a course has, which is a fact about the database and not about
anything a human is looking for.

## What it is now

**Order.** `sortCourses` in `src/utils/languageNames.js` sorts by **target
language name, then known language name**, on the *display* names rather than the
codes. That distinction matters: the codes put `zho` beside `zul`, the words put
"Chinese" beside "Cornish", and it is the words that are on the screen.

**Filter.** The lab no longer has its own picker. It uses `CoursePicker.vue` —
the searchable component `ListeningConfig`, `SpeakingConfig` and `PodLab` were
already using, with the fuzzy `courseSearch` ranking behind it, so `cym`, `welsh`
and `welch` all reach the Welsh courses. Job #85's shared `.ui-*` tokens dress
the filter chrome, so it matches the Course Library instead of approximating it.

That shared component gained four things, and every screen using it gets them:

- an optional `courses` prop, so a caller can supply its own list (the lab picks
  from courses its backend says have text — 114, not the estate's 149);
- the **Known / Target** dropdowns, hidden when there is only one of either;
- 44px rows and a menu that fits a phone rather than a fixed 340px that hangs off
  the side of one;
- English course names. The lab's list carries the DB's `display_name`, which is
  the *learner app's localized* label — it hands over 现代标准阿拉伯语 for
  `ara_for_zho`, and a list sorted on English names but printed in six scripts
  reads as unsorted. Localization belongs to `ssi-learning-app`; Popty names
  courses in English, as `useCourses` has always said.

## Where else the same list was showing up

The Voice Lab endpoint `/api/voicelab/courses` has **two** consumers and both had
the identical unordered `<select>`: the **Play** tab's sentence picker (Tom's
screenshot) and the **Engineering → Tests** tab's "From a course". Both now use
the shared picker, and Tests keeps its "this lab cannot steer Welsh" warning.

A third dropdown, **Audio Preview** in production, reads a different endpoint
(`/api/courses`) and sorted by raw course *code* — ordered, but by codes nobody
is shown. It now uses the same comparator.

The ordering fix is deliberately **client-side**, not in the SQL: only the browser
knows the curated display names (`languageNames.js`), and the server's
`seed_count` order is still what decides the *default* selection, which is
unchanged behaviour.

## What did not change

Nothing about what the picker *does*. Choosing a course still searches that
course's sentences; clicking a sentence still fills the box; the default course
is still the one the lab picked before; no render, casting or spend path was
touched. Verified end to end: filter to "spanish english", pick the course, click
a seed, and "I want to speak English with you now" lands in the Sentence field.

## How it was verified

Real browser (Playwright), read-only — every non-GET request aborted, so nothing
could write or render.

- **Locally, against the real lab backend** at 1280×900 and 390×844: 114 courses
  ordered Arabic → Armenian → Austrian German → Basque → Brazilian Portuguese;
  "welsh" narrowing to four; Target = Korean narrowing to five; the Engineering
  tab's picker driving its sentence search; a picked sentence landing in the box.
- **Live on popty.app**, both widths, after the Vercel rebuild: 149 courses in the
  same order, search working, build stamp `4efb0557`.

**One honest gap:** the Voice Lab's *own* backend (`watson-1` over the Tailscale
funnel) is not reachable from the box this verification ran on, so the live
popty.app check exercised the deployed picker on the Listening config page rather
than inside the Voice Lab. The Voice Lab itself was driven against a real lab
backend locally, and the deployed chunk `CoursePicker-fmFoSo5i.js` was confirmed
to carry the new code.
