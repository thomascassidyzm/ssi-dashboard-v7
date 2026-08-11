# How far into a course does the join stop mattering?

**For Kai.** Before committing to a "record every phrase in full" mode, judge by ear whether a phrase glued from separately-recorded pieces (the fast pass) sounds worse than the same phrase read in one continuous take — and, the question that actually decides the build, **how far into a course that stops being true**. Seed 1 is a total beginner with nothing to compare against; by seed 300 the ear is a different instrument.

**Live now, on any phone:** <https://watson-1.tail4968cb.ts.net:8443/concat-listening-test/>

Served by `tools/concat-listening-test/serve.cjs` (loopback :4788), path-mounted on the funnel that was already public on :8443. Nothing else on the box changed. To take it down: `tailscale funnel --https=8443 --set-path=/concat-listening-test off` and stop the node process.

Once this branch is merged and the dashboard deploys, the same page ships as a static asset at `/concat-listening-test/` and the standalone host is no longer needed.

---

## What Kai does

Thirty-five Welsh phrases, in course order. For each one, two versions: **A** and **B**. One is glued, one is a single take. Which is which changes per phrase and per listener, and nothing in the layout, the labels or the file names says which is which until a verdict is in.

Every phrase carries a banner saying **where in the course a learner meets it** — "Early in the course · seed 6", "Later in the course · seed 298". That is context for the judgement, and it says nothing about which side is glued.

| Band | Seeds | Pairs |
|---|---|---|
| Early in the course | 1, 6, 9, 12, 16, 21, 26, 30 | 8 |
| Middle of the course | 93, 107, 119, 132, 150, 169, 179, 200 | 8 |
| Later in the course | 260, 269, 280, 286, 290, 298, 304, 334 | 8 |
| Pod extras (no course position) | — | 11 (8 confirmed carved, 3 same-words-different-take) |

Tap to play each, as many times as you like, then pick **A better**, **B better**, or **they sound the same**. The reveal follows immediately: which was glued, the Welsh text, and the pieces it was glued from.

At the end the results lead with a **per-band table** — one-take / glued / same, counted separately for early, middle and late. That table is the answer: if the preference for a single take fades as the seeds climb, the join stops mattering, and the row where it flattens says roughly where.

Verdicts are kept in the browser as you go, so a half-finished session survives a phone lock or a reload. At the end there's a tally, a per-phrase table, **Download**, **Copy**, and **Save to server** (`POST /api/production/concat-listening-test/verdicts`, read back with the matching `GET`, stored under `scripts/concat-listening-test/verdicts/`). The server copy is a convenience, not the source of truth — the page works fully with the API unreachable.

---

## Where the audio came from

**No audio was generated.** No TTS call, no recording session, no S3 write. Every byte is an existing clip from `course_audio`.

There is no stored pair of "one spliced clip + one whole clip of the same text in the same voice" anywhere on the estate, and there structurally cannot be: `course_audio` carries `UNIQUE (course_code, text_normalized, language, role, voice_id)`, so the second write upserts over the first. (Scout job #169 verified that end to end, and also confirmed the voice-engine splicer has never run in production — `segments/` is empty in every bucket.) So the glued side has to be assembled from pieces that already exist. It is, two ways.

### The twenty-four course pairs — placed in the course

The Welsh legacy imports hand us both halves for free. `cym_s_for_eng` and `cym_n_for_eng` hold ~6,700 and ~6,400 human clips per voice, and a great many phrases in there can be tiled completely out of *other* clips in the same course, role and voice — each piece being its own separately-recorded take. That is exactly the fast-pass shape.

Course position is not stored on the clips, so it is recovered by matching each clip's text back to the course's own practice phrases and seeds, earliest appearance winning — a phrase reused later is introduced at its first seed, and that is the position that decides how much language the learner had when they first met it. About 80% of clips match; the rest are legacy recordings of text the current course no longer carries.

**4,295 phrases qualify with a recoverable course position**, and every band is comfortably populated:

| Band | Available pairs |
|---|---|
| Early (seeds 1–30) | 741 |
| Middle (seeds 90–200) | 1,286 |
| Late (seeds 260+) | 2,268 |

Eight are drawn per band, deduplicated on text (the same phrase usually exists in all four course/voice combinations, and hearing it four times costs four judgements and teaches nothing) and spaced evenly across the band's seed range, so "early" is not secretly all seed 1.

One limit worth naming: the legacy audio covers roughly seeds 1–334 of a 668-seed course, so "late" means late-in-what-was-recorded, not the very end of the course.

### The pod extras — the joins with nothing else attached

On 2026-06-15 Aran recorded eleven whole pod utterances. On 2026-06-16 a pass cut those takes into clause pieces and registered each piece as its own `course_audio` row. Where that holds, re-gluing the pieces and comparing against the take they came out of isolates the join artefact and nothing else.

**It only holds for eight of the eleven, and that was measured rather than assumed.** Scout #169 inferred the carving from timestamps, missing provenance rows and clause containment — explicitly flagging that it had not checked the audio. Since the claim decides what the page tells the listener they are judging, the build now checks it: each piece is located inside its whole take by energy envelope, then confirmed by a sample-exact correlation in a tight window around the hit. Eight pieces correlate at 0.90–1.00 — genuine excerpts. Three come in at 0.04, 0.09 and 0.45: the same words, but a **different take**. Those three are relabelled `pod-retake` and say so on screen, because for them delivery can differ as well as the joins.

(The first attempt at this measurement scanned raw samples on a 5 ms grid and reported 0 of 11. That was a false negative, not a finding — at 8 kHz a 2.5 ms misalignment decorrelates speech completely. The envelope-then-refine method is in `build-pairs.cjs` with that failure written down next to it.)

They are pod material, so they have **no course position** — which is exactly why they come **last**. A listener who stops after the twenty-four course pairs has fully answered the question that was asked. Found by scout job #169; source list at `docs/concat-vs-whole-2026-08-11/B-human-aran-pieces-and-whole.json`.

The glued side is made with the live splice chain (`services/voice-engine/splicer.cjs`): each piece trimmed to its voiced span with the aligner's own settings (−35 dB, 20 ms padding), levelled to −16 LUFS, concat-demuxed, ffmpeg→lame encoded.

---

## Keeping the test honest

A blind test is worthless if a side is identifiable by anything other than the joins.

- **Loudness and encoding are matched.** The one-take side goes through the *identical* trim, normalise and lame encode as the glued side. Measured across pairs: mean volume agrees within 0.1 dB. Level cannot leak the answer.
- **Silence is trimmed on both sides.** These library clips each carry their own lead-in and tail silence; gluing them raw inserts dead air at every join and would have made the glued side sound far worse than a real fast pass ever does. Both sides get the aligner's edge trim.
- **Length is the one remaining tell, and it is recorded rather than filtered.** `pairs.json` carries a `paceRatio` (glued duration ÷ one-take duration) per phrase. Across the course pairs most sit near parity and a handful run over 1.5×; the eight confirmed carved pairs sit at 0.79–1.05. A glued version that drags is a genuine fast-pass artefact and Kai should hear it — but the verdicts deserve to be read against that column.

## The caveat worth stating plainly

The twenty-four course pairs are a **harder test than production**. Their pieces come from separate course recordings, so several are read more deliberately than the same words inside a flowing phrase. In the real fast pass the pieces are cut from one read of the phrase itself, so they sit closer to natural pace — which is precisely what the eight confirmed carved pairs already reproduce.

Which means the result is asymmetric in a useful way: **if a glued version sounds fine here, it will sound at least as good in production.** If Kai dislikes them here, the next question is whether the dislike tracks the `paceRatio` column or the joins themselves — and those two have very different answers.

---

## Files

| Path | What |
|---|---|
| `public/concat-listening-test/index.html` | the page (self-contained, no build step, no API needed) |
| `public/concat-listening-test/pairs.json` | the 35 pairs with their `band`, `seedNumber`, `kind`, `excerptCorrelation`, source `course_audio` ids and `paceRatio` |
| `public/concat-listening-test/audio/*.mp3` | the 70 rendered clips |
| `tools/concat-listening-test/build-pairs.cjs` | rebuilds the set (`--count N` = pairs across all bands, `--carved <file>`) from existing clips only |
| `tools/concat-listening-test/serve.cjs` | the standalone host behind the live URL |
| `docs/concat-vs-whole-2026-08-11/` | scout job #169's evidence: what concat audio exists estate-wide |
| `services/production-api.cjs` | `POST`/`GET /api/production/concat-listening-test/verdicts` |
