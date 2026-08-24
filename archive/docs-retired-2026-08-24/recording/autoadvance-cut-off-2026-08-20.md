# The recorder was cutting recordists off — what was wrong and what changes

**2026-08-20.** Written for anyone, not just engineers.

## What people saw

On 2026-08-19 Sascha was recording German in the course-phrase recorder (Autocue
Studio). While they were still speaking, the script moved on to the next line.
Kai was sitting with them:

> "I think Sascha was speaking a lot too quickly, partly because the tool kept
> auto-advancing before they were done, so the anxiety set in."

Five of nine takes from that session were reported as fragments. **That part
turned out not to be true — see the next section.**

The defect this job went looking for is one where **being cut off looks exactly
like finishing**. The script scrolls either way, so the only conclusion available
to the person reading is *"I must be too slow"* — and nothing in the recording,
and nothing in the database, says otherwise. That defect is real and I found it.
What I could not find is any trace of it in Sascha's own takes.

## First, a correction: the German takes were NOT fragments

I was asked to find the five fragment takes from Sascha's session and show the
cut in them before claiming any mechanism. **They do not exist.** This is the
part of the brief that the evidence killed, and it needs saying before anything
else.

Sascha's session is `session_1787146421353`, `deu_at_for_eng`, 13:33:50–13:34:41
on 2026-08-19 — 51 seconds, **ten** takes (five script lines × natural and slow),
not nine. That population was confirmed four ways: the provenance rows, the raw
S3 uploads in the window, the mastered S3 objects, and an independent re-query of
every recording made anywhere on the estate that day.

Every one of those ten raw browser uploads was measured before any server-side
trimming. **All ten are complete.** Each ends in real silence — the last 200ms
sits between −76dB and −87dB, which is room tone, not a voice — and each
transcribes as the whole script line. A take the tool cut mid-word ends at full
volume with 0–30ms of silence after it. Nothing here looks like that.

| | |
|---|---|
| Takes in the session | 10 (not 9) |
| Complete | 10 |
| Fragments | **0** |
| Trailing silence, natural takes | 822–866ms (≈ the 800ms the tool waits) |

So the mechanism below is real, and it did truncate takes on 2026-08-19 — but on
**Kai's Finnish session that same day**, not on Sascha's German one. The known
positive I calibrated against is one of Kai's: a take cut after "…ennen kuin",
with "me muutettiin" never recorded.

What made Sascha feel chased is therefore **not** in the audio, and I could not
measure it. Their gaps between one line closing and the next line starting were
1.5–1.9 seconds — an unhurried rhythm, on paper. I am not going to invent an
explanation for a feeling the data does not contain. What I can say is that the
tool gave them no way to say "wait", and no acknowledgement of anything; that is
named as an open item at the bottom.

*(Measurement by worker #460 — DB and S3 both reachable, no access gaps —
independently re-checked here against the provenance ledger.)*

## What was actually wrong — two separate faults

**Fault one: the recorder mistook quiet speech for silence.**

The recorder listens for a gap of 800ms to decide a line is finished. It judged
"is this a gap?" against a fixed loudness number, measured off the room before
recording starts. In an ordinary room — a laptop on a table — that number gets
pinned at its maximum, and that maximum sits *inside* ordinary speech. So the
quieter half of a sentence registered as silence, the 800ms clock ran out while
the person was still reading, and the take was cut mid-word.

This one was already found and fixed overnight on 2026-08-19, on a branch called
`fix/vad-cuts-speech-as-silence`. **That branch has not been merged to main and
is not deployed.** It changes the question from "is this quieter than a fixed
number?" to "has this dropped away from *this speaker's own* voice?" — which is
the right question. It is the root fix and this work sits on top of it.

**Fault two — the one this job fixes: closing a take and moving the script on
were the same event.**

The moment the recorder decided a take was over, it advanced the script. One
line of code, no gap, no check. That meant every misjudgement about "have they
stopped talking?" turned instantly into the one consequence you cannot take
back. And it caused a second, quieter piece of damage nobody had noticed:

> The recordist who gets cut off **is still talking.** The recorder hears that
> continuing speech as a brand-new take — but the script has already moved. So
> the tail of line 12 gets saved, uploaded and filed as *a recording of line 13*.
>
> Nothing errors. Nothing is flagged. A clip whose audio is the wrong sentence
> passes every later check that counts rows rather than listening.

Fault one is a threshold. Thresholds can always be wrong in some room, with some
voice. Fault two is what turned "the threshold was wrong" into "the session is
damaged and nobody can tell".

## What changed

Closing a take no longer moves the script. It only *arms* the move.

1. **The script waits before moving.** After a take closes, the recorder holds
   the line for a further 300ms of quiet. Added to the 800ms it already waits,
   that is about 1.1 seconds of real silence before the script moves — well
   clear of the pauses people make inside a sentence.

2. **If you start speaking in that window, the move is cancelled.** You were
   never finished. The line stays where it is and what you say next is filed
   against the line you were actually reading. This is structural, not a
   setting: no threshold anywhere can now file the tail of one line under the
   next line's name.

3. **A take the recorder knows it cut short does not advance at all.** The
   recorder can now measure how far your voice had dropped when it decided you
   were finished. A real ending is far down into room tone. A few decibels means
   it interrupted you. In that case the script stops, and says so:

   > **We stopped that take early — that one is on us, not you.**
   > The recorder thought you had finished and cut in while you were still
   > reading. **We have stayed on this line** — read it again from the start, at
   > your natural pace. There is no need to hurry.
   >
   > [ Read it again ]   [ That take was fine — move on ]

## What a recordist will now experience

- Reading normally: the next line appears about a third of a second later than
  before. That is the whole cost.
- Being cut off mid-sentence: **the script does not move.** An amber panel says
  the tool interrupted you and that it was not your fault. You read the line
  again. Your interrupted take is still saved — nothing you recorded is thrown
  away.
- Carrying on talking after a cut: your words stay attached to the line you were
  reading. They can no longer end up filed as the next line.

## The trade, written out rather than hidden

The recorder needs 800ms of silence to close a take. So a recordist who begins
the **next** line between 800ms and 1100ms after finishing the previous one gets
that read filed against the previous line, and is told to read it again.

That band is narrow: any shorter a gap and the two lines already merged into one
take, which is how the tool behaved before this change too. The cost is one
re-read, and the person is told. The failure it replaces is silent and permanent.
We take the loud, recoverable one.

**And we can now say how narrow, from a real session rather than a guess.**
Sascha's ten takes give the only measurement of how long a recordist actually
takes to start the next line: 1.5–1.9 seconds after the previous take closed.
The window that would cost them a re-read is the first 0.3 seconds. Not one of
their ten takes would have tripped it.

We considered requiring a tap to move on after **every** take. We did not do it.
Continuous flow mode exists so a recordist can read a script without touching the
machine, a tap per line is a different tool, and a mis-tap is just as
unrecoverable as a mis-cut. The confirmation is spent only where there is reason
to doubt the cut.

## The test that would have caught it

`src/components/production/autocue/advanceGate.test.js` replays the real
50-millisecond loudness trace of an actual take from 2026-08-19 — one cut after
"…ennen kuin", with "me muutettiin" never recorded — through the real speech
detector and the new gate together, in a room noisy enough that the overnight fix
is pinned back to the old behaviour and the cut reappears on real audio. Then it
adds the speech the recordist kept making, which the recorder never got to write
down.

Against the old code that test asserts the script moved to line 13. Against the
new code it asserts the script is still on line 12. Reduce the gate to an
immediate advance and five of its seven cases fail.

## Honest gaps

- **The premise I was given is contradicted by the audio.** There were no
  fragment takes in Sascha's German session; all ten are complete. The
  truncation mechanism is real and evidenced, but on Kai's Finnish takes.
- **Sascha's actual experience is unexplained.** Their takes are clean, their
  pacing looks unhurried on paper, and I could not find anything in the
  recordings that corresponds to "the tool kept auto-advancing before they were
  done". The honest next step is to ask Sascha and Kai which takes they meant,
  and on which screen — this may have been how the recorder *looked* during the
  session rather than what it wrote. I did not chase that; it needs a person,
  not a query.
- **Nothing here is live.** The overnight root fix
  (`fix/vad-cuts-speech-as-silence`) and this fix are both on branches, not
  merged to main and not deployed. Recordists using the tool today still have
  both faults.
- Two of Sascha's slow takes sat for **4.0 seconds** of silence before closing —
  the recorder waiting out its inter-chunk timeout because the expected number of
  pauses never arrived. That is the opposite failure (over-waiting, not cutting)
  and is untouched by this work.
- One slow take closed after only **628ms** of trailing silence, below the 800ms
  the tool is supposed to wait. That is the same anomaly the overnight
  investigation flagged and could not explain, and it remains unexplained.
- The tool still offers a recordist **no way to say "wait"**. Every pacing
  decision is the recorder's. This change makes the recorder stop when it knows
  it interrupted someone; it does not give the person a pause button.
