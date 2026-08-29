# S-345 — the two answers

## 1. Is the Voice Lab now the single place a voice is chosen?

**Yes, for everything that makes audio, and the Phase 8 screen now says so out loud.**

The cast reader landed this morning and two call sites used it. Seven other
handlers were still reading the course's own row — so a voice you cast in the
Voice Lab was the voice `/generate` used and **not** the voice the Regenerate
Role, Regenerate Clip, Regenerate Phrase, Regenerate LEGO or Regenerate
Components buttons used. One screen, two answers, and nothing in the log to tell
you which you got. That is now closed: everything about to mint audio resolves
through the one reader.

Also closed: `/plan` and `/needs` (they decide copy-vs-render off the same
config, so an unresolved plan was not the plan `/generate` acts on), the reuse
planner, and the regenerate preview that names a voice to somebody about to
approve a spend.

**The Phase 8 screen** now carries one line per role saying where that voice came
from — *"From the French cast"*, *"Course override"*, or *"This course's own
setting — nothing cast for this language yet"* — and the Test Voice button plays
the voice that will actually render, not the one the row happens to store.

**Nothing changes today.** `voice_language_roles` holds zero rows, so resolution
returns the stored config byte for byte. Verified against the live database.

Left alone on purpose: the four presentation paths (your clone is the presenter,
so presentation is out of the cast) and the config editors, which must show and
save the stored row.

---

## 2. Do voices actually differ in natural pace?

**Yes — and your premise needs one correction, which is the more useful finding.**

**We are not minting everything at 1.0×.** Thirty courses carry a baked speed of
0.8, 0.85 or 0.9 — twenty of them at 0.8 on target1 — and every single one is an
Azure voice, which bakes the speed into the mp3. The first measurement over
`course_audio` reported a 3× pace spread between voices; its ten "slowest voices"
were, exactly and in order, the ten Azure voices rendered at 0.8×. It was
measuring a decision somebody had already made.

**Restricted to clips genuinely rendered at 1.0×, the spread is real and smaller:
0.65× to 1.32× across 140 voices.** Within English `known` alone, fifteen voices
span 0.78× to 1.41× of the median.

So your instinct was right, and here is why it is right:

- a **white belt** on the fastest English voice plays at **1.13** of median pace;
- a **green belt** on the slowest plays at **0.78**.

**The beginner hears faster speech than the intermediate.** The ladder multiplies,
so 0.8× of a brisk voice and 0.8× of a measured one land nowhere near each other.

**Landed:** pace stored per voice on `voices` (measurement and your nudge in
separate columns, so a re-measurement can never delete your ear), the arithmetic
in one tested module, a read endpoint for the player, and the Voice Lab now shows
`1.28x pace` on every cast slot with a box to nudge it. 76 voices measured.

---

## Three things that need one word from you

**A. The override marker.** When someone picks a voice on the Phase 8 screen, I now
mark that role as "this course keeps its own voice". It seemed to be exactly what
that click means. **Keep / drop?**

**B. The belt ladder.** I kept your four steps and boundaries and changed only what
the number *means* — from "80% of whatever this voice does" to "the pace a white
belt should hear". A median-paced voice still plays at exactly 0.8, so nothing
familiar moves. **Right shape?**

**C. Normalising against the language's median.** A voice's pace is measured
relative to the other voices speaking the same language, never across languages.
**Agreed?**

---

## Two things I found that you did not ask about

- **64 voice ids appear in `course_audio` with no row in the `voices` registry at
  all.** I refused to invent rows for them. Worth a look.
- **The pause trap.** The player infers the belt *from the playback speed*
  (0.8 → White … 1.0 → Green). The instant per-voice pace changes what a speed
  number means, every beginner's pause moves silently — a white belt on a slow
  voice would bake 1.0 and be read as **Green**. That has to be broken first, as
  its own change, before any pace work reaches the player. It is written up in the
  handover.
