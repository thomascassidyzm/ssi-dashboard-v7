# Voice Lab — the text is gone, the page is not

**Before and after, eight paired screenshots:** [/evidence/voicelab-text-weight-2026-08-31/index.html](/evidence/voicelab-text-weight-2026-08-31/index.html)

Your ruling: "this page has way too much text - all of it is too text heavy". Landed on `main` as `ffe83e765`. Popty rebuilds itself from main in about six minutes, so it is on popty.app by the time you read this.

## What the page looks like now

The landing view opens on the table. Between the title and the first language row there used to be three subtitles, a spend sentence, an intro paragraph, an xAI paragraph and a "complete means two voices" line — about 900px of reading before any state. All of it is gone, and the state it described is now on screen: the spend is a meter in the title row, the xAI deprecation rides on the xAI chip as **xAI · retiring 29**, the fallback tally sits on the count that was already there.

Under the table there were nine paragraphs of doctrine — completeness, dialects, known-only, guide voices, in-use, castable. That was the single largest block of text on the page. It is doctrine, it lives in the repo, and nobody standing in front of the casting table needs to read it. Gone.

The expanded language panel is the same story: the human-recorded essay, "casting decides who speaks", the guide-voice explanation and the preview-clip paragraph are now the human-recorded courses as pills, `61 unheard · 2745 chars`, and `2 courses taught from French · not counted above`.

Play now fits on one screen with the Generate button on it. Parameters lost a long provider paragraph that was sitting in a narrow column and pushing the fields 300px down the page; a control a provider does not have now says `not on this provider` and stops.

Nothing was moved into a tooltip. The removed prose is removed, not hidden behind a hover.

## One thing I fixed that was not text

Expanding a language put four voice-slot cards side by side, and at that width the flex layout squeezed every candidate's **name** to zero — the one thing you choose a cast by. Every row read as a bare `azure · 1.02x · 0.78 easy · Cast`. Two columns now, one on a phone. The names read: Alain, Claude, Charline, Antoine, Sylvie. Same complaint, so I did it in the same pass.

## Nothing the page can do has changed

Driven in a real browser as an admin against the live backend, 19 of 19 checks passed: the table renders 88 languages, search filters, both chip rows filter, a language expands, 204 Cast buttons are there, a free sample plays, the clone form reads 7 speakers out of the archive, the three Play sliders are live, the course-sentence picker returns 40 sentences and the cost estimate appears, and all four Engineering tabs render.

The recording flow was not touched. This branch rebased cleanly onto job #480's work twice, with no conflict, and the new template-symbol gate that landed with it passes.

## Heights, before → after

Languages 10,626 → 9,214px. Expanded language 13,772 → 12,140px. Make-a-voice 11,666 → 9,792px. Play 2,342 → 2,000px. Parameters 3,856 → 2,698px. 343 lines of markup deleted against 106 added.
