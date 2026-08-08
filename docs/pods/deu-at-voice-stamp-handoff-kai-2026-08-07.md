# deu_at voice stamp — over to you, Kai

Austrian German (deu_at) has no human voice assigned to its recording slot, so every real take you record there — including the ones you just did — gets stamped in the database with an Azure text-to-speech voice id (`de-AT-IngridNeural`) instead of your own. The database currently claims a synthetic voice sang lines you actually read. Finnish is fine; this is specific to Austrian German.

**My recommendation: assign your own voice as the human voice on the deu_at slot, then back-stamp the affected takes** — because until that happens, anything downstream that trusts `voice_id` will treat your real recordings as machine-generated. There's no competing option here worth weighing; it's a casting call only you can make, followed by a small mechanical fix.

## What's affected right now
- The 10 deu_at takes just recovered from the Autocue studio recovery (blob `E79EFD14`), covering: "i wü iatz wos auf Deitsch sogn", "i wer mit wem aundern reden übn", "i versuch zum lernen, wia ma redt", "i wü mit dir lernen, wia ma wos sogt", "wia ma so oft wia möglich redt".
- One earlier short deu_at take you recorded before that recovery — it carries the same wrong stamp, so this predates the recovery work and isn't damage from it.
- All 20 recovered takes (deu_at + Finnish) are verified alive in the production S3 bucket already.
- I checked whether a human deu_at voice slot has appeared since this was flagged — the only recent changes I found touch the Autocue *pod* (TTS) voice pools, a separate system, and deu_at is still mapped to Azure `de-AT` there too. So as far as I can tell the gap is still open on your end.

## Sequencing
1. Casting: assign a human voice to the deu_at_for_eng recording slot — yours, since you're the voice on these takes.
2. Once that's set, on your nod: back-stamp the affected rows above from `de-AT-IngridNeural` to your voice id.

Do this before any of that audio gets spliced into anything downstream. It's small and reversible.

Full recovery report, if useful: https://watson-1.tail4968cb.ts.net/d/284c9b17

---

# Second Austrian German question, added 2026-08-08 — the TTS cast

*Same course, different system, and it's also yours. Keeping it on this page so there's one
Austrian German picture rather than two notes from two nights.*

Aran's new pod-0 script (231 sentences, 22 scenes) was piloted on `deu_at_for_eng` overnight —
translated into Austrian German and voiced by text-to-speech. 100 clips rendered, about 50 of
them lines the course has never had before. That pilot was built to be shown to Tom for a cast
approval, and he's ruled it out: *"T16 is nonsense - I don't speak Austrian German."* The Spanish
sample has replaced it as his listening test. **So the Austrian cast question comes to you.**

Listen here: https://watson-1.tail4968cb.ts.net/d/74c9ab17

*(That page was written for Tom before the re-point, so it opens by asking "you" to decide. Ignore
the framing — the clips and the notes underneath them are what matters.)*

**What I want from you:** your ear on the two German voices, **Sonja** (female) and **Felix**
(male). Two things specifically:

1. **Is this cast right?** One male, one female is Aran's rule and isn't in question. Whether these
   two are the right two is.
2. **Does it sound Austrian enough?** Sonja and Felix come from the *German* voice pool — there is
   no separate Austrian pool. The **words** are properly Austrian, carried over from how this
   course already speaks; only the accent is standard German. Whether that gap is acceptable is a
   judgement call, and it applies to the whole fleet, not just this course.

There's also a content point in that page worth a glance: Aran's script measures distances in
miles and prices things in pounds, which reads oddly in an Austrian course. Faithful translation
was the default; changing it is a call, not a fix.

**This is separate from the voice-stamp casting call above.** That one is about your *human*
recorded takes being stamped with an Azure voice id. This one is about which *synthetic* voices
speak the pod. Both need you; neither blocks the other.

Nothing is running on Austrian German. No bulk generation is queued, nothing was deleted, and the
100 clips already rendered stay where they are until you say.
