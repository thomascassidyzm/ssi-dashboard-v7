# Popty now calls a language by its name

*2026-08-14 — for Kai*

## What Popty was showing

Popty had a list of language names buried in the course composable, and several
screens kept private copies of their own. Nothing on that list had ever heard of
Pennsylvania Dutch, so the course showed up as **PDC for English Speakers**, and
in a good number of places as the bare `pdc_for_eng`. Doug and Erik read that
every day.

It was never only Pennsylvania Dutch. Nine of the languages you build courses in
had no name anywhere in Popty and were shown as their three-letter code:

Hakka, Lombard, Taiwanese Hokkien, **Pennsylvania Dutch**, Romagnol, Romansh,
Northern Sami, Venetian and Yiddish.

A second, quieter problem sat underneath: several regional courses were being
labelled with the base language, so Quebec French read as "French", Swiss German
as "German" and Lebanese Arabic as "Arabic" — three courses each wearing another
course's name.

## Where the answer came from

The learner app already keeps a curated list of language names, and the courses
table in the live database already holds a proper name for every course —
"Pennsylvania Dutch for English Speakers" was sitting there the whole time. So
no new invented names: the learner app's own words were copied across exactly,
and for the languages the learner app doesn't name, the name came from the
course record itself.

Three of them disagreed with what a browser would say on its own, and the house
name won: a browser calls them Pennsylvania German, Hakka Chinese and Min Nan
Chinese. Popty says Pennsylvania Dutch, Hakka and Taiwanese Hokkien — and the
learner app has been changed to say the same, so the two products can't drift
apart on a name again.

## What it shows now

One place in Popty knows what a language is called, and every screen asks it.
The private per-screen name lists are gone. **96 individual places across 33
screens and shared components** now read a name where they read a code.

That covers the course library and its known/target columns, the course picker
and switcher, the navigation bar, every production screen (overview, seeds, text,
audio pipeline, QA review, team roster, calibration, feedback, recording
optimizer, pods), the approval gate, the quality dashboards, the validator, the
compile and progress screens, the maintenance picker, the jobs monitor, the voice
configuration lanes, both voice-lab course pickers and the VAD lab.

Where a code is genuinely a builder's identifier — the mono code column in the
library, the code chip beside a name, the "type the course code to confirm" box —
the code stayed exactly as it was. Nothing that the system keys on was touched:
no course codes, ids, routes, database fields or file names changed. This is only
what a person reads.

## What I could not name

- Two entries are not languages at all: the sandbox course and the end-to-end
  test course. They keep their codes, which is the honest answer.
- The Welsh anthem course sits in a language's place in its code; it is labelled
  "Welsh Anthem".
- Every other language on the estate — 86 codes in use across 144 courses — now
  has a name.

Where a code ever turns up that nobody has named, it is shown as the code rather
than blank, and it will read the same in both products.

## How it was checked

The app was built and run for real, logged in, and every affected screen was
loaded in a browser against the live database — 26 distinct URLs. Pennsylvania Dutch reads
as a name on every one of them and the string "PDC" no longer appears anywhere. The same sweep was
repeated for North Welsh as a control, to be sure no other course label broke,
and the course library was read by eye: the four Arabics, the two Portugueses and
the two Spanishes now each carry their own name instead of sharing one.

The repository's test suite runs with no new failures against the same suite run
on the unchanged code, and the production build compiles.

## One thing worth knowing, not fixed here

Six of these languages had no entry at all in the shared language reference the
services read — they do now, names only. But the clip-identity guard that audio
writes pass through builds its accepted-language list from a different column of
that same file, and it currently REJECTS nine of these languages outright,
Pennsylvania Dutch among them: asked to canonicalise "pdc" it raises "not in
language_codes.csv". Hakka, Lombard, Taiwanese Hokkien, Romagnol, Venetian,
Northern Sami, Romansh and Yiddish fail the same way. That is a real gap and it
is deliberately left alone here — closing it changes something the system keys
on, which is outside a display fix. Worth a separate look before any of those
courses reach audio.
