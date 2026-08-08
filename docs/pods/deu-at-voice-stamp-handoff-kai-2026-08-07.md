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
