# Splice or render — settled, with the clips to prove it

*2026-08-24. The fleet render (#342) is still stopped. Nothing below spent a penny of TTS.*

**Listen first:** https://watson-1.tail4968cb.ts.net/evidence/splice-vs-render-2026-08-24/index.html

## Your question, answered

> *"why are we doing them again? because it's faster to do them again? rather than splice the
> existing clips? … are you sure we have a whole turn version and then a per sentence version and
> they can't be re-used? this does NOT make sense to me"*

You were right on both counts, and the second one first because it is the sharper correction:

**There is no per-sentence version to re-use.** Pod 1 never had per-sentence clips rendered. The
arrays that looked like per-sentence clips were pointing at a *retired pod's* clips — that was this
morning's bug, and NULLing them is what left every multi-sentence turn playing as one block. So
"re-use the ones we have" isn't available. Italian is the sole exception, because last night's job
rendered its 311 sentence clips for real.

**But splicing the whole-turn clip works, and we should do it.** That is the new evidence, and it
is measured, not asserted.

## What I did

Took nine real Pod 1 turns — three Italian, three German, three Spanish — pulled their whole-turn
clips down the *learner production path* (`saysomethingin.app/api/audio/<id>`, not S3), and cut each
one into its sentences with ffmpeg alone. Splicer: `scripts/splice-fork/splice.py`. It finds
silences at −35 dB / 100 ms, keeps the **N−1 longest interior gaps** for an N-sentence turn, cuts at
each gap's midpoint, keeps 50 ms of the pause either side, and fades 15 ms at both ends.

## Three measurements

**1. The sentence gaps are a different population from the comma pauses.** On every turn the gaps
the splicer chose were 1.7× to 6.3× longer than the longest gap it rejected. On five of the nine
turns there was no competition at all — exactly N−1 interior gaps existed. This is not a close call
anywhere in the sample.

**2. No cut landed inside a word.** All 32 spliced pieces measured at their edges: the loudest
sound in the first and last 30 ms of any piece is **−62 dB**, and most are −91 dB. That is room
tone. The seams are clean because the splicer can only cut where a silence already is.

**3. Splice and render independently agree on where each sentence lives.** Italian and one Spanish
turn have both. Thirteen sentences with a spliced piece *and* a separately rendered piece:

| sentence | spliced | rendered | diff |
|---|---|---|---|
| Buonasera. | 1.03s | 0.98s | +0.05 |
| Vorrei un caffè, per favore. | 2.06s | 1.96s | +0.10 |
| Con latte ma senza zucchero. | 2.15s | 2.05s | +0.10 |
| Per asporto. | 1.17s | 1.13s | +0.05 |
| Ciao! | 0.76s | 0.71s | +0.05 |
| Mi dispiace ma non posso parlare adesso. | 2.50s | 2.39s | +0.10 |
| Devo tornare a casa ora. | 1.64s | 1.54s | +0.10 |
| Possiamo parlare domani? | 1.50s | 1.73s | −0.23 |
| Sì, oggi ho una giornata impegnativa. | 2.83s | 2.93s | −0.10 |
| Spero che tu abbia una buona giornata. | 2.54s | 2.11s | **+0.42** |
| Ci vediamo dopo. | 1.29s | 1.18s | +0.12 |
| No, lo siento, mañana estoy ocupado. | 2.77s | 2.71s | +0.06 |
| Pero hablamos el sábado. | 1.68s | 1.58s | +0.10 |
| Hasta luego. | 1.15s | 1.11s | +0.05 |

Twelve of thirteen agree to within a tenth of a second, which is mostly just the 50 ms of pause kept
at each internal edge. Two entirely separate processes finding the same boundaries is the strongest
evidence here.

The one outlier is *"Spero che tu abbia una buona giornata"* — 0.42 s **longer** spliced. That is
not a bad cut. It is the fresh render being faster than the original performance, which is exactly
the risk that rendering carries and splicing does not.

## Cost, time, quality — honestly

| | **Splice** | **Render** |
|---|---|---|
| Money | **£0** — local ffmpeg | ~380k chars TTS, single-digit to low-tens of dollars |
| Wall clock, 1,489 turns | **~10 min** (390 ms/turn measured, one core) | 2–3 h at safe concurrency |
| Voice & delivery | **Identical to what learners hear today** — same take, same breath | New performance; pace and emphasis drift |
| Starts / ends | Cut at a measured silence, 50 ms room tone, 15 ms fade | Guaranteed clean by construction |
| Failure mode | **Refuses** — too few gaps, no clip made. Cannot cut mid-word if the gap isn't there | Silently ships a clip that doesn't match its neighbours |
| Reversible | Yes — whole-turn clip never touched | Yes — nothing deleted |
| Open risk | Languages that run sentences together; a comma pause as long as a full stop | Voice instability (`xai_ara` already open) |

## Recommendation

**Splice the fleet, don't render it.** It is free, it takes ten minutes instead of three hours, and
it hands the learner the *same performance* they already hear rather than a second, subtly different
one — and where both exist, the spliced piece and the rendered piece are the same length to within a
tenth of a second, so we are not trading quality for the saving. Render stays available as the
fallback for exactly the turns the splicer refuses, which is the honest way round: spend money only
where the free path measurably cannot do the job.

## Explicit gaps

1. **I have not verified by ear.** Duration agreement, edge silence and gap margin are strong, but
   they are not listening. The page above is for your ear and that is the real gate.
2. **The sample is European.** Nine turns, three Latin-script languages. A fleet census over ~120
   turns across all 22 courses is running as **job #347**, aimed squarely at Japanese, Chinese,
   Korean and Arabic. Its key number is the **refusal rate** — the turns that would still need TTS.
   Until it lands, "splice the fleet" is proven for ita/deu/spa and *inferred* elsewhere.
3. **The splice-mechanisms bench of this morning is a different problem** and should not be read as
   contradicting this. That bench cuts *human recordist takes* into **words**, guided by a slow read,
   and it is rightly pessimistic: a third of the slow reads refused, all 15 of Sascha's Way-B cuts
   were estimates, and 0 of 198 unrecorded phrases could be assembled. Word-level splicing of human
   takes is hard. **Sentence-level splicing of TTS turns is not the same job** — the gaps are an
   order of magnitude longer and the piece count is 3–4, not 14.
4. **Nothing is written to the course.** No `sentence_audio_ids` were set, no clips uploaded, no
   progress migrated. This is evidence only; the next step needs your word.
5. **Whisper still cannot confirm the words.** `word_boundaries` is empty on xAI clips and whisper
   is unreliable at this length — same limit the #315 report declared.
