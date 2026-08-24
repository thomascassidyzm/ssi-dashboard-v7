# The audio pipeline, designed from scratch

**2026-08-06. Design only — nothing built, nothing changed.**

> **A clip is named after its own sound. The same sound always gets the same name, and a different
> sound can never wear an old name — so a fix you have made is a fix you will hear.**

That one sentence is the whole system. Everything below is what it forces.

---

## Why the German bug would not die

Two days, four fixes, all of them real, none of them audible. The reason is one line long: **an audio
clip in this estate has a name that does not depend on what it sounds like.** New bytes can be
written behind an old name, and every phone, browser and CDN holding the old bytes has no way to
find out. We are even telling them not to look — every audio object goes to S3 with
`public, max-age=31536000, immutable` (`services/shared/audio-cache-control.cjs`), a promise that
the file will never change, made about a file the system permits anyone to change. On 3 August, ten
of the clips Tom played had had their bytes rewritten 160 days after their row was written. Nothing
in the database can even see that happen, because the row did not change.

Name the clip after its sound and that entire class of bug stops being forbidden and starts being
**impossible to express**.

---

## What a clip is

A clip has two names, and keeping them apart is what makes everything else work.

**Its address is its content hash** — the hash of its own mastered bytes. That is where it lives and
how it is fetched, and it is what makes the sentence at the top true: a different sound hashes
differently, so it can never wear an old name.

**Its identity is the language, the text and the voice.** `(language, normalised text, voice)` is the
question *does this clip need to exist yet?*, and it is asked before a penny of TTS is spent. One
identity resolves to exactly one current address. Two courses wanting the same English sentence in
the same voice get the same object — not because their bytes happened to match, but because the
second one was never rendered.

**Neither the course nor the side is part of either name.** "I want to learn as much as possible"
exists once in English, and every course that needs that English sentence uses that clip, whether
English is that course's known language or its target. The estate half-does this already, by
accident: 81,686 files are shared between courses today, but sharing is de facto and by course side,
so the known and target populations of the same language are rendered twice over. Deduplication stops
being a happy consequence of byte-identity and becomes the property the store is built on.

Measured on the live estate today, that is not a rounding error. 2,532,679 rows sit on 2,336,018
distinct keys but resolve to only **2,099,110 identities** — **236,908 objects that exist because the
same sentence was rendered again for a different course or a different side**. Sharing roughly
doubles: 196,661 rows ride a shared file today, 433,569 would ride a shared address.

**Why voice stays in the identity.** This is the one question the constraint does not settle, so I
settled it against the estate and I am flagging it as mine. It stays in. On **658,984** texts the
`target1` and `target2` sides carry *different* voices, against **13,275** where they match: two
target voices is a deliberate feature of the course, not drift. Take voice out of the identity and
those two sides collapse onto one object and one voice — a mass revoice of 659,000 slots that nobody
asked for and nobody approved, which is the exact opposite of make-before-break. *Better*: every
course side keeps the voice it declared. *Simpler*: the identity is the unique key `course_audio`
already carries, minus the two columns this constraint removes —
`(course_code, text_normalized, language, role, voice_id)` becomes
`(language, text_normalized, voice_id)`, a weakening of an existing constraint rather than a new
concept to learn. *Cheaper*: the win is the 236,908 renders above, and dropping voice would buy a
further 804,000 only by spending Tom's taste on a revoice — that is not a saving.

The gap it leaves is real and is closed elsewhere: 88,205 texts carry three or more voices, and at
most ~197,000 identities beyond the two-voice shape are recoverable. That is drift, and **step 2 is
what removes it, not the key**. The number is an upper bound and not a measurement — a language that
is known in one course and target in another legitimately carries more than two voices.

**What counts as identical text.** The estate already has an answer and this design takes it rather
than inventing one: `normalize_text`, the function behind `course_audio.text_normalized`, which
lowercases, trims outer whitespace and strips bookend sentence punctuation —
`rtrim(lower(trim(text)), '.?!¿¡。？！')`. It is the same shape as the intake normalisation the course
pipeline uses, and `lower()` is a no-op on non-cased scripts, so it is safe estate-wide.

One deliberate departure from the ZUT rule: **diacritics are not stripped.** ZUT compares intentions,
where an accent is noise. This compares sounds, where an accent *is* the sound. `sale` and `salé` are
one intention apart and two clips apart.

Two narrow holes are worth naming now rather than discovering later. Internal whitespace is not
collapsed, so "je  suis" and "je suis" are two identities and one sound. And `rtrim` strips only
trailing marks, so a leading Spanish `¿` survives and "¿cómo estás?" parts company with "cómo
estás?". Both are candidate tightenings rather than blockers, and they are safe to make later for a
reason worth understanding: **a normalisation miss costs one extra render, never a wrong clip.**
A miss renders a second object that is correct in its own right; tightening the rule afterwards
merges two identities onto one address that already holds valid bytes. The storage address carries
the correctness guarantee, which is precisely what frees the lookup key to get better over time.

**Speed is not part of either name, because speed is not a property of a clip.** The store never
holds a slow copy and a fast copy of the same sentence. A rate is applied at playback, on the way to
the ear, and one stored object can play at one rate on the known side and another on the target side.
The machinery exists: `SimplePlayer.setPlaybackRate` sets `audio.playbackRate` on the element before
each clip, Listening already offers 1, 1.2, 1.5 and 2×, and `playback_speed` is a field on each
mode's row in `algorithm_config`, so a rate change is a Supabase edit and not a deploy.

Worth stating exactly where that stands rather than implying more than is true. Easy and Fast both
sit at `playback_speed: 1.0` today, and Easy's own comment gives the reason — it buys its gentleness
with thinking time and repetition rather than slowed audio, because "slowed speech teaches a register
nobody speaks". A per-role rate does not exist yet either: `playback_speed` is per mode, and giving it
a per-role dimension is a new field on rows that already exist. What this design settles is the
**layer** — speed lives in the player's config and never in the store. What rate each side should
actually run at is a taste call on top of that, it is cheap to change, and the standing ruling is the
default until Tom's ear says otherwise.

---

## The pipeline, end to end

Eight steps. Each one is only allowed to hand its work to the next.

**1 · Ask.** One queue is the only way a clip is ever born — new text, a voice change, or a gate
failure. Three doors, one corridor. The existing `audio_pass_requests` queue is that corridor; the
work is closing the side doors (today 35 files can write clips directly).

The first thing the corridor does is **look the clip up**. The request carries a language, a text and
a voice; if that identity already resolves to an address, the answer is a link and the request is
finished. Only an identity that resolves to nothing reaches step 3. The cheapest render is the one
that never happens, and on today's estate that is 236,908 of them.

**2 · Choose the voice.** Each course side has exactly one voice, declared on the course, and the
renderer cannot be handed another. Today `deu_for_eng` has **ten** different voice ids on its German
side and the English voice `eve` appears on German rows; 200 course-sides across the estate carry
more than two voices. That is drift, not choice.

Two rules meet at this step and they do not collide, which is worth showing rather than asserting. A
course side has exactly one voice. A clip is shared by anyone wanting that language, text and voice.
Those are orthogonal: the side's rule decides what a slot *asks for*, and the store's rule decides how
many times that ask is *rendered*. Two sides sharing a clip is two sides having independently declared
the same voice — agreement, not compromise — and a side declaring a different voice simply resolves to
a different object and is untouched. Sharing across roles is possible only *because* voice is in the
identity; drop it and the two rules would genuinely fight.

What does change is ownership. A course side no longer owns its clips, so changing its voice is a
relink and never a rewrite: the rows point at the objects for the new voice and the old objects stay
valid for whoever else uses them. That closes a hazard which is live right now — with 81,686 files
already shared between courses, revoicing one course by rewriting bytes at a shared key silently
revoices another. Under this design that is not a rule anyone has to remember. It cannot be expressed.

**3 · Render.** TTS produces the raw take. This is the only step that costs money and it stays
behind Tom's approval, exactly as now.

**4 · Master.** Normalise to the estate's level. Do it *before* judging, so what gets judged is what
a learner would hear.

**5 · Listen — and this is the new part.** Three cheap measurements on the mastered bytes:

| | question | catches |
|---|---|---|
| **Size it** | how fast would this voice have to talk to fit those syllables in? | the 1.0-second take of a phrase that needs 1.4 |
| **Read the ending** | did the voice stop, or was it cut? | mid-word chops |
| **Read the words** | are the right words in there? (whisper, as today) | wrong words, silence, gross truncation |

Whisper alone passed *both* takes of "as often as possible" with zero errors. Sizing it against the
voice's own speaking rate separates them at a glance. **Tom's ear was the only instrument in the
system that could hear this; these three measurements are its replacement.** They are already
written — `services/audio-intelligence/` in this working tree — and unfinished.

**One note on the sizing gate, so nobody later reads it as speed-dependent.** It measures the stored
clip at its natural rate, and that is exactly the point: it asks whether the *render* is complete, not
whether the delivery is comfortable. Playback rate is applied afterwards and uniformly, so it can
neither turn a clipped take into a whole one nor a whole one into a clipped one. A floor of nine
syllables per second is a statement about damaged bytes, not about what a learner can follow at 2×.

**6 · Admit to the store.** A clip that passes gets hashed and stored under its hash. A clip that
fails is never stored and never named, so it cannot be linked by accident later. Sharing is not a
happy consequence at this step: an identity that already existed was resolved back at step 1 and
never reached the renderer. The store holds **one object per `(language, normalised text, voice)`**,
and the hash is what guarantees that object can never change underneath the courses sharing it.

**7 · Link, and prove it.** The course row is repointed at the new address, then the app is asked
for that slot and the bytes it hands back are compared against the bytes we meant. **Verified at
generation time, on served bytes** — not discovered stale two days later by a man in headphones.

Under a shared store the proof splits cleanly in two, and both halves get cheaper.
**Byte-correctness is a property of the object**: prove once that this address serves these bytes, and
it is proved for every row that will ever point at it, because the address cannot come to mean
anything else. **Link-correctness is a property of the row**: asked for this course's slot, does the
app hand back the address we meant? That is a metadata read, and it is the half that must run per row.
On a 2.5-million-row estate, the difference between proving 2.1 million objects once and re-proving
every link's bytes forever is most of the cost.

Make-before-break (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b) survives intact and gets easier in two
specific ways. Its fourth step, deleting the old clip, becomes optional — and in a shared store it
becomes something firmer than optional. An object one course has stopped using may still be in use by
another course or another role, so **no course may delete an object on its own authority**. Deletion
stops being a per-course decision and can only ever be a store-wide one, which is the gated garbage
collection the appendix mentions once and proposes nowhere.

Second, the genuinely dangerous shape in §6b disappears. `tools/repair-silent-clips.cjs` is *forced*
to delete before it inserts, because a same-voice re-render collides with the old row on
`unique_course_audio_per_voice`, and it survives that only by holding the deleted row in memory to
restore on failure. Under this design a same-voice re-render produces different bytes, therefore a
different hash, therefore a different object — and the row is **updated** to point at it. The unique
key is untouched, nothing is deleted, and the one irreversible step in the whole procedure is gone.
The incident that created §6b could not have taken the shape it took.

**8 · Serve.** Nothing to invalidate, ever. `immutable` becomes an honest header. No revision
counter, no cache-busting suffix, no `audio_stamp` bump needed for the bytes to be right — an
address that can only ever mean one thing cannot go stale. Offline bundles become a plain list of
permanent addresses: a downloaded bundle is never *wrong*, only ever *short of a newer list*. And
because addresses do not carry a course, a learner taking two courses downloads their shared audio
once — the two bundles name the same addresses.

---

## Better × simpler × cheaper — honestly

**Better.** A whole class of bug becomes inexpressible. Not "less likely with more discipline" —
gone. Four fixes that landed correctly and were inaudible could not have happened. And a sentence is
one clip, so fixing "I want to learn as much as possible" is one render and one query over the rows
that share its identity, rather than a job per course that has to be remembered.

**Simpler.** Delete the machinery invented to work around mutable names: the revision counter, the
`.v2` suffix, the two cache layers keyed differently, and the standing worry about which fix needs
which stamp bumped. Sharing stops needing a strategy — it is the same unique key `course_audio`
already enforces with two columns taken out. And the one procedure in the estate that is forced to
delete before it inserts stops being forced.

**Cheaper.** No re-download of unchanged audio, no cache-busting churn, no TTS spent regenerating
clips that were already good — tonight's real fix cost nothing to render, because the good audio
already existed and only the link was missing. **Storage falls rather than grows**, which is the one
place this design has changed its own mind: keeping superseded objects instead of overwriting them
costs the estate almost nothing, because only 1,131 clips in its entire life have ever been revised,
while deduplication removes 236,908 objects outright. On today's numbers the saving is a bit over two
orders of magnitude larger than the retention cost, and the 236,908 is a floor — it is measured at
key level, and true byte-level duplication can only be higher. The honest asymmetry: the saving is
one-off and the retention cost accrues, so at today's revision rate the crossover is centuries away
and at some future rate it would not be. It is worth watching, not worth pricing in.

**The leg I will not oversell:** the migration is real work, and until a course is fully through it
both models are live at once. That cost is in the appendix, stated plainly, including what happens
if it stalls half-done.

---

## What stays Tom's

Spend. TTS generation stays approval-gated and passes still end by queueing a request. Nothing here
changes who says go.

## Three things I would like a word on

1. **Keep the per-course row?** Today every course has its own row pointing at a shared file. I say
   **keep it** — it is the link layer, it is what the serve path already reads, and the census
   proved there is no central table to lose. Deduplication hardens this from a preference into a
   requirement: once course and side are out of the clip's identity, the per-course row is the only
   place course, side and slot live at all. *Yes/no.*
2. **Recorded pod audio — in or out?** The gates are designed for TTS. Human recordings have real
   pauses and breaths and would flag. I say **out for now**, stated openly rather than silently.
   *Agree?*
3. **Delete anything?** I propose **no deletions at all** in this design. The 107 superseded German
   rows and their files stay exactly where they are. Garbage collection is mentioned once in the
   appendix as a future, gated option and nothing more. Sharing gives this a second and structural
   reason, beyond caution: an object a course has finished with may be in use by another course or
   another role, so "delete what my course no longer needs" is now simply the wrong question.

*One judgement call above is mine and not Tom's: **voice stays in the clip's identity**. The estate
argued it — 658,984 texts carry different voices on their two target sides — but it is the one place
this design decided something the constraint did not settle.*

*Migration path, per-piece adopt-or-replace of the existing tooling, gate settings and the live
numbers behind every claim here: the companion appendix.*
