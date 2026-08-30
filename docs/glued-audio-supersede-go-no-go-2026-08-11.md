# Does a real recording cleanly replace a glued placeholder, live?

**2026-08-11. Read-only investigation. No code changed, no database written, no course content touched.**

Kai asked for this to be confirmed rather than assumed, because a beta go/no-go rests on it.
Here is the confirmed answer.

---

## The short version

**It depends — and the thing it depends on is one line of code that today's recording tools do not run.**

The machinery for "a newer take supersedes an older one" is real, it is live in production, and I
watched it work on actual bytes served to actual learners this afternoon. But it only fires when
the replacement is written through **one specific path**. The paths a recorder actually uses —
the autocue re-record, the pod recording flow — do **not** use it. Write a new take through those,
and every learner who has already heard the old clip keeps hearing the old clip. Not for an hour.
Effectively for good.

The fix is small and it already exists in the estate. But it is not wired up, so the plan as
described today would quietly fail for exactly the learners the beta is meant to serve — the
early ones who started on the placeholders.

Two more things Kai needs before he decides, both of which change the shape of the plan:

- **Glued audio does not exist yet.** The gluer is written and tested but has never produced a
  single clip. And there is no supported way to glue the TTS audio we already have — the only tool
  that does that shape writes local files and touches neither the database nor S3.
- **Nothing would mark a clip as a placeholder.** A glued clip and a real recording are the same
  kind of row, with the same "human" origin and the same speaker's name on them. So nobody could
  ask "which phrases are still on placeholder audio?", and nothing could automatically prefer the
  real recording when it arrives.

---

## What I proved live, on production

The mechanism, when it is used, works end to end. This is not reasoning from code:

- Production (`saysomethingin.app`) hands the player **1,058 versioned clip references** for the
  German course — clips whose bytes have been replaced carry a version marker.
- Asking for version 1 of one such clip returns **9,216 bytes**. Asking for version 2, or asking
  for it plainly, returns a **different 8,064 bytes**. The old recording and the new one are both
  alive; the learner gets the new one.
- Across the estate, **51,254 clips** have been replaced this way, with a **51,467-row ledger**
  recording every swap.

So "a newer take supersedes an older one" is a true statement about this system. It is just not a
true statement about every way of putting a new take in.

---

## Why the recorder paths fail

When a clip's audio is replaced, the app decides what a learner hears from a short reference
string — either the clip's plain id, or the id with a version marker on the end. **Seven of the
eight caches between the database and the ear key off that string.** Change the string and
everything moves; leave it alone and nothing does.

The version marker only appears when the replacement bumps the clip's revision counter. Searching
the recording upload service and the pod registration code for that counter returns **zero hits in
both**.

So a re-recorded clip keeps its old reference string, and:

- the learner's offline audio store (keyed by that exact string, no expiry, never re-checked)
  keeps handing back the old blob;
- and on a miss, the browser's own cache holds the response for **a year**, marked unchangeable.

Old bytes twice over. The only escapes are a full app reset, the cache randomly evicting the clip,
or a hand-operated estate-wide flag — and even that last one clears neither of those two caches.

There is a partial safety net that fires and does not help: replacing the audio does update a
per-course "the audio changed" timestamp, which makes the app throw away its cached lesson script.
But the rebuilt script produces **the same plain reference string again**, so the learner lands
back on the same stale bytes. The learning app's own source says this in as many words.

**A second, quieter failure.** If the volunteer's recording is registered under a different voice
from the clip currently in the slot — which is the normal case when a real person replaces a
placeholder — the system writes a brand-new row rather than replacing the old one. But every piece
of automatic linking in the estate only fills a slot that is **currently empty**. The slot still
points at the placeholder. In that case the new recording is not merely cached-over; it is never
reachable at all.

---

## The path that does work

`services/audio-repair-core.cjs` — the audio repair mechanism — does it correctly, and it already
accepts human uploads as a first-class case (`source: 'upload'`), mastering them through the same
chain as generated audio so a human take and a machine take arrive at the learner equally levelled.
It is exposed over HTTP today at `/api/audio/repair/:course/:clip/propose` and `/accept`, and the
upload route is deliberately gated at ordinary-dashboard-user level rather than admin, because an
upload costs no money.

What it does per swap: writes the ledger entry first, keeps the clip's id, bumps the revision,
checks the new bytes are really in the bucket before pointing anything at them, keeps the old
object so a mistake can be undone for free, and leaves the reference string changed so every cache
downstream moves by itself.

That is precisely the behaviour Kai's plan assumes. **It exists. The recorder just doesn't call it.**

---

## What I'd tell Kai to do

The beta-placeholder approach is sound in principle and the estate is closer to supporting it than
it looks. Three things stand between here and safe:

1. **Route volunteer takes through the repair path** (propose/accept), or make the recorder's
   upload bump the revision and write the ledger the same way. Without this, progressive
   replacement is invisible to everyone already learning.
2. **Mark placeholder clips as placeholders.** One column. It is what makes "how much of this
   course is still glued?" answerable and what lets a real recording automatically win.
3. **Decide what glued audio is actually made of**, because gluing the TTS clips we already have
   is not currently possible in any tool that writes to the database.

Worth adding, since it makes the whole class of bug impossible: a database rule that refuses (or
auto-corrects) an audio replacement that leaves the revision counter untouched. About ten lines.

---

## Explicit gaps

- **No real example of a human recording durably replacing a machine clip exists in the ledger.**
  The one candidate is a deliberate 16-second verification probe from 2026-08-05, immediately
  reverted. So the human-replaces-machine case is proven by code and by an equivalent machine swap,
  not by a live human precedent.
- The stale-bytes behaviour was traced through code and live schema; it was **not** reproduced on a
  real device.
- Whether a redeploy purges the edge cache is platform behaviour and not determinable from the
  repository.
- One long-lived cached route (the round map) is genuinely un-bustable from code. It does **not**
  pin audio. It could pin a *structural* change — newly added rounds — for up to a year.
- `supabase/schema.sql` does not exist in Popty (CLAUDE.md's pointer is stale) and the copy in the
  learning app is out of date. Every schema claim above was verified against the live database
  instead.

---

*Supporting detail from the four investigations: the recording write path, the cache layers, what
glued audio actually is, and the database evidence — each published separately.*
