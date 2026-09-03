# ita_for_eng — subjunctive LEGO boundary repair (seeds 387, 615, 617)

*2026-09-01. Kai's ruling: the ten defective sentences were faithfully using a chunk
that had been drawn wrong. Each chunk carried a MARKED form (the imperfect
subjunctive) but not the thing that licenses it, so it was free to be dropped into
any `che`-clause at all — including ones that take the indicative. The repair is a
**boundary** repair, not a grammar repair: the mood stays, because the course needs
to teach it to reach the seed.*

## What licenses the subjunctive in each seed

All three seeds are licensed by the same thing — **`pensare che`**, in the past.
Nothing exotic: no `come se`, no `prima che`, no `se`-clause. The licensor was sitting
right there in the seed and had simply been left outside the chunk.

| Seed | Seed sentence | Licensor |
|---|---|---|
| 387 | *no, non pensavo che avesse ragione* | `non pensavo che` |
| 615 | *pensavo che fossi molto coraggioso a dirlo* | `pensavo che` |
| 617 | *pensavi che fosse un errore* | `pensavi che` |

## The three chunks: before → after

| | was | is now | what changed |
|---|---|---|---|
| **387 L02** | `avesse ragione` — "she was right" | `non pensavo che avesse ragione` — "I didn't think she was right" | merged leftward to swallow the licensor whole |
| **615 L02** | `fossi molto coraggioso` — "you were very brave" | `pensavo che fossi` — "I thought you were" | merged leftward onto `pensavo che`; `molto coraggioso` split off |
| **617 L02** | `fosse un errore` — "it was a mistake" | `pensavi che fosse` — "you thought it was" | merged leftward onto `pensavi che`; `un errore` split off |

The new chunks all follow the shape the course already uses correctly at seed 374
(`pensavo che fosse` — "I thought it was") and 247 (`pensavo che quel libro fosse`).

### Where the trailing material went

Kai asked for the trailing material to stand on its own. For **615** and **617** it
already does, and no new LEGO was needed:

- 615: `coraggioso` is L01, `molto` was taught at seed 13, so *molto coraggioso*
  tiles from vocabulary the learner already has. `molto coraggioso` also survives as
  a build phrase under L01.
- 617: `errore` is L01, `un` long taught, so *un errore* tiles the same way.

For **387** it does not, and no split was made — stated here explicitly because it is
a departure from the pattern:

- `avere ragione` is a fixed idiom; splitting `avesse` from `ragione` would force a
  gloss that lies ("I didn't think she had" + "right").
- A bare `ragione` LEGO glossed "right" is blocked by ZUT: the course already teaches
  known **"right" → `destra`**. Two targets for one known prompt is a reject.

So at 387 the licensor-merge swallows the whole predicate. The free-standing sister
is L01 `non pensavo`, which is unchanged and overlaps the new L02. Overlapping LEGOs
are fine and this seed now has one.

## The ten sentences

All ten now say the standard-Italian indicative after a fact-reporting verb.

| Phrase | now reads |
|---|---|
| S0387L02B03 | non potevo vedere **che aveva ragione** |
| S0387L02U04 | non sapevo **che aveva ragione** |
| S0615L02B03 | sapevo **che eri** molto coraggioso |
| S0615L02U03 | ha detto **che eri** molto coraggioso |
| S0615L02U04 | ha visto **che eri** molto coraggioso |
| S0615L02U05 | mi ha detto **che eri** molto coraggioso |
| S0617L02B02 | le ho detto **che era** un errore |
| S0617L02B03 | le ha detto **che era** un errore |
| S0617L02U03 | mi ha detto **che era** un errore |
| S0617L02U04 | ha visto **che era** un errore |

Phrases where the subjunctive is genuinely licensed were left alone:
`ho chiesto se avesse ragione`, `non ho chiesto se avesse ragione`,
`ho chiesto di sapere se avesse ragione` (indirect question with `se`),
`sono felice che fossi…`, `sospetto che fosse…`, and every `pensavo/pensavi che…`.

Components and build ladders under each redrawn LEGO were re-cut to decompose the new
chunk (e.g. 617: `pensavi che` + `fosse`, building to `pensavi che fosse`).

## Audio

Nothing was deleted. Make-before-break throughout: every clip was rendered, verified
and inserted before any link moved.

- **24 links re-used existing clips for free** — the text-change trigger's same-voice
  relink path handled them, logged in `content_audio_link_drops`.
- **32 clips were generated** (Azure, matching each row's incumbent voice:
  en-GB-Sonia known/presentation, it-IT-Elsa target1, it-IT-Benigno target2).
  **Every one of the 32 was transcribed back with whisper and checked against its
  script before being linked** — sampling was forced to 100% for this run. All 32
  passed; worst character error rate 0.09 against a 0.30 threshold, 24 of 32 exact.
  All 32 objects confirmed live in S3.
- **Presentation clips were re-cut in the same pass**, per Kai's standing rule — all
  three redrawn LEGOs announce their new card phrase.

### Why phase 8 could not do the render

`courses.voice_config` for ita_for_eng names **xAI** voices, and xAI is a retired
provider — `/regenerate-phrase` and `/regenerate-lego` return
*"Retired provider xai reached tts-service.generate (403)"* for every role. But every
clip these rows actually hold is Azure, so Azure is the correct voice here (match the
row's incumbent, not the course config). The render was done through the pipeline's
own chain (same TTS service, same `masterAudio`, same S3 convention, same veracity
gate) with the voice pinned to the incumbent.

**Side effect worth knowing about:** before failing on the target roles, phase 8's
cross-course reuse copied an **xAI Eve** clip of *"you thought it was"* into the course
and linked it to S0617L02. That would have put a different voice mid-lesson. It was
replaced with an Azure Sonia render; the xAI row was left in place, unlinked.

## Open items — not touched, not ruled on

1. **`ita_for_eng` voice_config vs reality.** The course is served almost entirely on
   Azure but configured for a retired provider. Any future TTS on this course fails
   until someone decides which way it goes. This is the real blocker, not this repair.
2. **S0615L02U06** (*pensavo davvero che fossi molto coraggioso*) sits on xAI voices —
   Eve/Ara/Leo — while every sibling phrase in the same LEGO is Azure. Pre-existing,
   text unchanged, so this repair did not touch it. A learner hears a voice change on
   that one line.
3. **S0558L01U05** — *non sapevo che fosse così tardi* — is the same defect
   (`sapere che` + subjunctive) outside the three seeds. A course-wide scan for the
   pattern finds exactly this one and nothing else. Left alone: not in the sweep, not
   ruled on.
4. **Filing.** Sixteen phrases under the redrawn LEGOs no longer contain their own
   LEGO — they are the indicative-contrast sentences, and after the redraw the chunk
   they practise is the seed's *other* LEGO (`coraggioso`, `errore`). Their word-level
   decompositions were rebuilt and now correctly anchor onto that sister LEGO, so
   nothing renders wrong; but strictly they would be better filed under it. Moving
   them means reissuing phrase ids, and at 387 there is no LEGO to move them to (see
   the ZUT block above), so it was not done. Kai's call.
5. **Seed 70 pos 11 and seed 479 pos 9/10** — flagged but unconfirmed by the sweep —
   were left untouched as instructed.

## Verification

Read back live from the database after the fact: three LEGO texts, three presentation
clips, all 30 phrases under the redrawn LEGOs, every audio link's voice and spoken
text, every stored decomposition recomposing to its row's text, seed tiling for all
three seeds, and zero missing audio across the three seeds. Seed sentences themselves
were not modified. `is_new` unchanged on every LEGO, so no round-index shift and no
learner-progress migration was required.
