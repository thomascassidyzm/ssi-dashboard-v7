# You mark which takes were read straight through — I don't guess

**deu_at_for_eng · 2026-08-25 · for Kai**

Your call: *"give me a button in that last page to mark a set of takes as that."*
That is the better design and it is now what is built. Sascha uses they/them.

**The page:** https://watson-1.tail4968cb.ts.net:8450

---

## The finding: the flow is not recorded anywhere

I looked for a stored field before building anything, and there isn't one.

| where I looked | what is actually there |
|---|---|
| `recording_provenance` columns | 18 of them — no mode, no session, no order |
| the JSON context in `quality_notes` | carries `mode`, but its values are `'script' \| 'pod' \| 'regeneration'` — the upload seam. Every deu_at take is `'script'` |
| what the recorder sends | `AutocueStudio.vue` sends `provenance.mode = 'continuous'`, which names the VAD cutter `useContinuousRecorder`. **Both** reading orders use it, and it is dropped on insert for want of a column |
| the reading order itself | `ModeSelector.vue` offers "the course itself, straight through from the start" vs "a shorter set of lines, cut up afterwards". **It is never sent with the upload** |
| S3 | everything is `mastered/` and `raw/`. There is no third store |

So there is **nothing to pre-fill from**, and nothing is pre-filled. I had built a
classifier from the shape of the takes; it is gone. Your marks are now the only
record of the flow that exists anywhere, and the page says that above the control
rather than in a footnote.

## What you mark, and how

**Sittings.** `script_session_id` — the stretch of recording the tool logged as
one session — **is** recorded. A sitting is one reading order from beginning to
end, so it is the natural set, and it is a fact rather than a deduction. There
are **17** of them, from a single take on 7 Aug to an 82-take run on Sunday
evening.

Tap **Mark which sittings…** and each one is a card: the day and time, how many
takes, which seeds, and whether it is marked, part-marked or untouched. Two
thumb-sized buttons carry the count — *Start to finish, all 82* / *Cut up, all
82* — so what a tap will do is legible before you make it. Two smaller sets are
there too: the button pair at the foot of a line group marks just that line, and
the last card in the sittings view marks **everything currently on screen**,
sized to whatever filters you have set.

Every action confirms first, and then an **Undo** bar appears carrying the
previous value of every take it touched. Undoing a mark that overwrote an
earlier mark restores *that earlier mark*, not a blank — I tested exactly that
case: three takes went back to start-to-finish and two back to unmarked.

Marks persist like the Good/Bad verdicts: written to disk atomically, survive a
reload and a service restart (verified), and leave in the export both per-line
and as a whole block.

## Two axes, kept apart

The flow mark and the Good/Bad verdict never touch each other. A take can be
start-to-finish and bad, or cut up and good. The **Start-to-finish** and
**Spliced** filters at the top read your marks and nothing else — the counts on
them move as you mark. The default view is *Every take*, because on a fresh page
nothing is marked yet and a filter that hid everything would look broken rather
than empty.

## Your taps still land in the course

Unchanged. A **Good tap, and only an explicit Good tap**, repoints that line at
that take — never a whisper transcript, a duration, "newest take", or an opinion
of mine. The flow mark has no vote in it; the filter is for your ear, not a veto.

The button shows you the plan first, read back from the live database. Each
change is one `swapClipInPlace`: bytes proven in the bucket before the row moves,
rollback row written first, `audio_revision` bumped so learners actually get the
new audio, row id never moved, nothing deleted, row read back afterwards. The
whole batch reverses with one command.

It refuses out loud rather than guessing, in four cases: a slow read (never filed
as a clip), a refused take (no line to point it at), a line with no clip to swap,
and two Good takes on one line with neither of them live — that last is a
question for you, not a coin toss.

**Nothing has been applied.** Your Good verdicts so far are all already what
learners hear, so the plan is empty and says so.

## The takes with no database row — and a correction

I had folded 31 orphan objects into this page on the strength of the upload
window alone. **Five of them are Welsh.** Job #628 read the thing I never did:
each S3 object carries its own `coursecode` in object metadata. 26 are
`deu_at_for_eng`; 5 are `cym_n_for_eng`. Left as they were, you would have been
listening to Welsh takes inside an Austrian German review. They are now excluded
by coursecode and named on the page rather than silently dropped.

I verified that independently before changing anything, and it holds.

**And one of the 26 is not an orphan at all.** `46D88EDD` has a mastered copy
whose metadata names its course line outright — `deu_at_for_eng:S0009L01U02`, *"i
red heit mit wem aundern"*. It now sits in that line's group beside the take
learners actually hear, as a candidate you can rule on and bind, badged as having
no database record with its line coming from the audio file itself.

That leaves **25 true orphans**: their files name the course but not the line, so
nothing can say what they were. They keep their own group saying exactly that.
30 of the objects were still `raw/*.webm`, which no iPhone will play, so those are
transcoded once and cached. No speech generated — a container change on bytes we
already had.

## The one line pinned for your ear

`wir mechatn heit auf d'Nocht an Tisch für vier reservieren` sits at the top
whatever filter is on. What learners hear today is a take of a different
sentence; a good read of the right line is in the bucket eight seconds earlier
and was never bound. Both are on the card. Rule on it and press the button.
