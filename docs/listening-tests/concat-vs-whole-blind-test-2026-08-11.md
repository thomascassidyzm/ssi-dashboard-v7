# Blind listening test: glued phrases vs one-take phrases

**For Kai.** Before committing to a "record every phrase in full" mode, judge by ear whether a phrase glued from separately-recorded pieces (the fast pass) actually sounds worse than the same phrase read in one continuous take.

**Live now, on any phone:** <https://watson-1.tail4968cb.ts.net:8443/concat-listening-test/>

Served by `tools/concat-listening-test/serve.cjs` (loopback :4788), path-mounted on the funnel that was already public on :8443. Nothing else on the box changed. To take it down: `tailscale funnel --https=8443 --set-path=/concat-listening-test off` and stop the node process.

Once this branch is merged and the dashboard deploys, the same page ships as a static asset at `/concat-listening-test/` and the standalone host is no longer needed.

---

## What Kai does

Twenty Welsh phrases. For each one, two versions: **A** and **B**. One is glued, one is a single take. Which is which changes per phrase and per listener, and nothing in the layout, the labels or the file names says which is which until a verdict is in.

Tap to play each, as many times as you like, then pick **A better**, **B better**, or **they sound the same**. The reveal follows immediately: which was glued, the Welsh text, and the pieces it was glued from.

Verdicts are kept in the browser as you go, so a half-finished session survives a phone lock or a reload. At the end there's a tally, a per-phrase table, **Download**, **Copy**, and **Save to server** (`POST /api/production/concat-listening-test/verdicts`, read back with the matching `GET`, stored under `scripts/concat-listening-test/verdicts/`). The server copy is a convenience, not the source of truth — the page works fully with the API unreachable.

---

## Where the audio came from

**No audio was generated.** No TTS call, no recording session, no S3 write. Every byte is an existing clip from `course_audio`.

The Welsh legacy imports hand us both halves of the comparison for free. `cym_s_for_eng` and `cym_n_for_eng` hold ~6,700 and ~6,400 human clips per voice, and a great many phrases in there can be tiled completely out of *other* clips in the same course, role and voice — each piece being its own separately-recorded take. That is exactly the fast-pass shape.

**6,392 phrases qualify** across the two courses and two target voices (South voice 1: 1,465 · South voice 2: 1,473 · North voice 1: 1,715 · North voice 2: 1,739). The page ships a spread of **20**, mixed across both courses, both voices, and 2- and 3-piece joins. `tools/concat-listening-test/build-pairs.cjs` rebuilds the set at any size.

The glued side is made with the live splice chain (`services/voice-engine/splicer.cjs`): each piece trimmed to its voiced span with the aligner's own settings (−35 dB, 20 ms padding), levelled to −16 LUFS, concat-demuxed, ffmpeg→lame encoded.

---

## Keeping the test honest

A blind test is worthless if a side is identifiable by anything other than the joins.

- **Loudness and encoding are matched.** The one-take side goes through the *identical* trim, normalise and lame encode as the glued side. Measured across pairs: mean volume agrees within 0.1 dB. Level cannot leak the answer.
- **Silence is trimmed on both sides.** These library clips each carry their own lead-in and tail silence; gluing them raw inserts dead air at every join and would have made the glued side sound far worse than a real fast pass ever does. Both sides get the aligner's edge trim.
- **Length is the one remaining tell, and it is recorded rather than filtered.** `pairs.json` carries a `paceRatio` (glued duration ÷ one-take duration) per phrase. Twelve of the twenty sit within ±0.3 of parity; **four run over 1.5×**. A glued version that drags is a genuine fast-pass artefact and Kai should hear it — but the verdicts deserve to be read against that column.

## The caveat worth stating plainly

This is a **harder test than production**. The pieces here come from separate course recordings, so several are read more deliberately than the same words inside a flowing phrase. In the real fast pass the pieces are cut from one slow read of the phrase itself, so they sit closer to natural pace.

Which means the result is asymmetric in a useful way: **if a glued version sounds fine here, it will sound at least as good in production.** If Kai dislikes them here, the next question is whether the dislike tracks the `paceRatio` column or the joins themselves — and those two have very different answers.

---

## Files

| Path | What |
|---|---|
| `public/concat-listening-test/index.html` | the page (self-contained, no build step, no API needed) |
| `public/concat-listening-test/pairs.json` | the 20 pairs, their source `course_audio` ids, and `paceRatio` |
| `public/concat-listening-test/audio/*.mp3` | the 40 rendered clips |
| `tools/concat-listening-test/build-pairs.cjs` | rebuilds the set (`--count N`) from existing clips only |
| `services/production-api.cjs` | `POST`/`GET /api/production/concat-listening-test/verdicts` |
