# The splice bench — record it yourself, cut it both ways, move the settings

24 August 2026. Kai asked for a working bench, not a report: *"I want to use the
recording tool, in a few different ways, hear how it splices the takes … and
then some real phrases that are built out of what I recorded, with the ability
to change settings. I want to test the whole flow, not just listening."*

**Bench:** `/evidence/splice-bench-2026-08-24/index.html` on the Command Surface.

It is a single static page. It records through the phone's microphone, cuts and
glues entirely in the browser, and keeps his takes in that phone's own storage.
No server does any of the work, so there is nothing to keep running and nothing
to die when this session ends. No TTS. No database or S3 writes. Sascha's
recordings are read-only copies; the originals are untouched.

---

## 1. Kai is right about the two mechanisms, and my earlier framing was wrong

I previously reported "one cutter, two piece sizes". That was true about the
two-pool work but it answered the wrong question, and it missed the distinction
Kai was actually making. His two mechanisms are both real, and both are in
`services/voice-engine/align.cjs`, as two branches of the same function
`alignTakePair()`:

**(a) Cut the SLOW take at its pauses.** Reached when there is no natural take.
`alignSlowGapTake` runs silence detection over the slow read, maps the voiced
runs 1:1 onto the `chunksString`, and the segments are cut straight out of that
slow take — `cadence: 'slow'`. The pieces carry the slow delivery.

**(b) Cut the NATURAL take, guided by the slow take's rhythm.** Reached whenever
a natural take exists. The slow take is aligned first — that is the only place a
chunk map can come from — and then the code tries, in order:
1. plain silence detection on the natural take, used if the count happens to
   match (`naturalMethod: 'direct'`);
2. otherwise `transferBoundaries()`, which drops the slow take's gaps and
   stretches each chunk's share of the total voiced time across the natural
   take's voiced span (`naturalMethod: 'transferred'`).

The file's own header calls the natural-cut path *the model*, and (a) is written
as the no-natural-take fallback. So (b) is the designed path in the code as it
stands today. Whether it is also the chronologically *original* one is being
checked against the history by job **#266**; that report is not in yet and this
document does not claim it either way.

### The crux, and it cuts against the obvious move

**Mechanism (b) cannot run without the slow take's pauses either.** The chunk
map only ever comes from aligning the slow read. Step 1 of (b) is not an
alternative source of boundaries — it is a *check* on the natural take that, if
it fails, falls back to stretching the slow take's timings anyway.

So "undo the pause mechanism" does not leave (b) standing. It removes the input
both mechanisms depend on. That is the single most decision-relevant thing on
this page, and the bench is built so Kai can watch it happen rather than take my
word for it: record a clear read with no slow read and both panels say the same
thing — nothing can start.

### Measured, and it is not a small effect

On Sascha's real material, step 1 of (b) — the branch that would cut on genuine
silences in the natural take — **never fires. 15 of 15 sentences fell through to
proportional transfer.** Every cut mechanism (b) made on her recordings is an
estimate stretched off the slow read. The bench colours those cuts red and says
so in words on the panel.

---

## 2. What the bench actually does

**Step 1 — record.** Ten real course lines, chosen by job **#267** using the
shipped `buildPoolB()` so that eight real target phrases can be rebuilt from
them. Each line is read twice, clear and slow. The microphone is requested with
echo cancellation, noise suppression and auto-gain **off** — the same request
the real Autocue Studio makes, because those three reshape the very energy
envelope the cutter reads. Takes are held in IndexedDB, so closing the page does
not lose them.

**Step 2 — both mechanisms, labelled.** For the chosen line, Way A and Way B are
shown side by side with a waveform, the cut positions drawn on it (amber for a
detected gap, red for an estimate), each individual piece playable on its own,
the glued result, and the untouched take to compare against. When a mechanism
refuses, the refusal is shown as itself — not hidden, not worked around.

**Step 3 — the settings.** Eight sliders, every one of them a constant that
already exists in the code, named in plain words with the code name given:
`SILENCE_DB`, `SILENCE_MIN_MS`, `MIN_VOICED_MS`, `PAD_MS`, the join fade, the
inserted gap, and the two that decide the shape of the whole recording
programme — `minPieceWords` and `maxPieces`. Moving any of them re-cuts and
re-glues everything above and below immediately. Nothing needs re-recording.

**Step 4 — real phrases from his own pieces.** Eight actual course phrases he
did *not* read, assembled out of pieces cut from the ten he did, with every
piece labelled with the line it came from, and the result playable.

Verified against the shipped assembler, text-only so the result is exact:

| smallest piece | targets that build | depths |
|---|---|---|
| **1 word** | **8 of 8** | 2, 2, 3, 3, 4, 4, 5, 5 pieces |
| **2 words** | **1 of 8** | 2 pieces |

That one slider is the entire recording-programme decision, in his hand, with
his own voice coming out of it. When a phrase cannot be built the bench
distinguishes *you never said that word* from *you said it, but at this piece
size there is no legal way to cut it out* — those need opposite instructions,
and telling him to re-record something he already recorded would be the worst
failure this page could have.

---

## 3. Pre-loaded material, and one honest wrinkle

14 of Sascha's 15 usable slow reads are staged so the bench is not empty before
he records anything, each with its clear counterpart.

The fifteenth is staged too, and it refuses. That is not a mistake: it is a real
line where the browser's detector counts six gaps where the script asked for
five, and it is worth seeing. The bench marks it with a cross in the line picker
and never lands on it by default.

**The wrinkle, stated because it will otherwise look like a bug.** The server's
cutter and the browser port do not agree on every take. The server uses an
absolute −35 dBFS on a loudness-normalised mp3; the browser peak-normalises
first and guards against a noisy room floor. Measured over the 15 staged lines:
**14 agree, 1 does not.** So a line the server can cut may still refuse on the
bench. Nothing here papers over that.

---

## 4. Consistency evidence

Kept from the earlier measurement pass, and shown at the bottom of the bench
under the hands-on part rather than mixed into it. Across 15 of Sascha's
sentences: 56 cuts at the small-piece setting against 15 at the large-piece one;
median distance from a real gap 220 ms vs 241 ms; 79% vs 67% of cuts landing
more than 100 ms inside speech. **The per-cut risk is the same — only the number
of cuts differs.** Failure is by refusal, not degradation: 6 of 21 slow reads
could not be cut at all.

Full derivation: `docs/recording/splice-mechanisms-listening-harness-2026-08-24.md`.

---

## 5. What it does not do

- **His recordings never leave the phone.** Nothing is uploaded, and nothing is
  written to any course. That is deliberate, but it also means he cannot hand a
  take to anyone else from this page.
- **It is not the Autocue Studio.** It makes the same microphone request and
  runs the same cutting rules, but it is a standalone page, not that Vue
  component, and it does not file takes as clips. Driving the real studio would
  have meant writing takes to the live database.
- **Sascha's own tab cannot demonstrate Step 4.** None of her near-miss targets
  build — the best covers 80% of its words. That is the same coverage finding as
  before, and it is exactly why job #267 was asked to choose a script where
  Kai's own recordings *can* build real phrases.

---

## 6. How it was verified

Driven end to end in Playwright at 390×844 with a fake microphone: 10 line cards
and 8 setting sliders render, no console errors, no horizontal overflow, tap
targets 52 px (record), 50 px (tabs), 46 px (line picker), 44 px (sliders). A
recording round trip completes and persists. Both mechanism panels render on
Sascha's material with 4 playable clips, 2 waveforms and the estimated-cut
warning shown. Moving `SILENCE_MIN_MS` from 150 to 900 changed a live result
from "heard 3, wanted 2" to "heard 1, wanted 2" — proof the settings re-cut
rather than just redraw. The assembly path was separately proven to emit
non-silent audio through the bench's own modules.
