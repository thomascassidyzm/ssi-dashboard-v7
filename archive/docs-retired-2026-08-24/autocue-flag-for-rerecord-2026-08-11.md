# Autocue: flag a take, re-record just the flagged ones

**2026-08-11 · branch `fix/autocue-reject-flag-2026-08-11` · for Kai and Tom**

## What Kai reported

In Autocue Studio's script mode, the review screen shows Approve and Redo on
every take. Pressing Redo did nothing. The button was clickable, the card even
changed, and the take was never actually replaced.

## Why it did nothing

Kai's instinct was exactly right. In script mode the take is uploaded **while
he is still recording** — each phrase is pushed to a background upload queue
the moment the silence detector closes it. By the time the review screen
opens, every take is already on the server.

Redo, meanwhile, only added the take's id to an in-memory list. In the *other*
recording mode that list is a real gate: nothing is uploaded until you press
Finalize, so refusing a take genuinely stops it. In script mode nothing ever
read that list. So the click landed somewhere real, changed a colour, and had
no path to the take it was condemning.

That is the whole bug. Not a broken button — a button wired to a decision that
had already been taken.

## The half that already worked

Kai also said "the half that supersedes an old take with a new one already
works." Confirmed, and it is in better shape than that. Recording a phrase a
second time already:

- replaces its card in place rather than adding a duplicate beside it,
- points it at the new audio and frees the old,
- numbers it Take 2, Take 3… so a retake in the same voice is visible,
- drops the old take's verdict rather than letting it stick to the new one,
- and on the server, discards the earlier take still waiting in the queue and
  re-sends the slot, so the newest take wins.

Nothing on the receiving end needed changing. The missing piece was purely a
way to *get back there* and record those items again.

## What I built

A second pass, which is the batch flow Kai described.

**Listening.** Every take carries an obvious flag state. "Redo/Queued" now
reads **Flag / Flagged** throughout, and a flagged card is tinted red and
outlined rather than dimmed — it used to fade to 75% opacity, which read as
"dealt with, ignore me": precisely backwards for the one state you are
scanning thirty cards for. The header counts them as "Flagged for Re-record".

**Going back.** A **Re-record Flagged (N)** button parks the teleprompter on
the first flagged item and walks the flagged list *only*. Previous/Next move
along that list too, so Kai can never wander into items he was happy with and
record over them. A banner says which pass this is — "Re-recording flagged
takes — 2 of 5" — because otherwise a three-item out-of-order script looks
like the teleprompter has lost its place.

**Landing.** Each new take goes down the ordinary capture path, so it
supersedes the old one locally and on the server through the machinery above.
When the flagged items run out, it returns to **review** — not to the
end-of-session summary the pass was launched from — with the new takes waiting
to be judged. A re-recorded item clears its own flag, because the take that
was condemned no longer exists.

**One thing I fixed while in there.** Script mode's "Finalize & Upload" was
not telling the truth: those bytes went up during recording. Worse, pressing
it re-sent the same audio a second time under the wrong identity — the
script's internal id ("script-7") rather than the identity the server minted
for the take. In script mode that button is now **Done**; it ends the session,
and says so if flags are still outstanding rather than letting them go quiet.

## How I checked it

Unit tests for the pass itself — 9 new ones covering flagged-order, returning
to review, the other takes staying untouched, the flag clearing, refusing an
empty pass, navigation staying inside the list, and no stale pass leaking into
the next session.

More to the point, I ran the actual app — local API and dev server, real
browser, fake microphone playing real audio — and clicked through Kai's flow:

1. record both items of the test course,
2. flag one; the other visibly stays unflagged,
3. press Re-record Flagged (1),
4. record it again,
5. check what came back.

The flagged phrase came back as **Take 2** with its flag cleared. The other
phrase had no take badge at all — untouched. The server received exactly one
further upload, for the flagged phrase's text and nothing else. That run is
committed as a repeatable test, so this cannot quietly regress.

Full unit suite: no new failures. Four tests were already failing on `main`
before I started, in an unrelated learning-journey screen; they still are, and
they are not mine to fix here.

## Worth knowing

- **Kai should re-record from the review screen, not by starting a new
  session.** Starting again would re-record everything.
- Flagging alone still changes nothing on the server — by design. The flag is
  a note to himself; the re-record is what replaces audio. Ending a session
  with flags outstanding is allowed, and now says so on the button.
- I worked in a separate checkout. The shared working copy on this machine is
  239 commits behind `main` and has unrelated half-finished edits sitting in
  these very files; building there would have mixed my work into someone
  else's. Nothing in it was touched.
- I briefly killed the machine's live production API (port 3470) while
  stopping my own test server — the process names matched. systemd restarted
  it automatically within about a minute and it is serving normally again. No
  data involved, but it was my mistake and worth recording.

## Landing

Two commits on `fix/autocue-reject-flag-2026-08-11`, pushed to origin. **Not
merged** — `main` is untouched, and this is not deployed anywhere. It needs
Kai's ear on a real session before it goes further.
