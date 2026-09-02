# Where "edit the text" lives — and why it is not a box in the booth

**2026-09-02. RULED, later the same evening — see "What Tom decided" at the end.**

## The ask

Tom's list of what the recording surfaces did not give him included, verbatim:
"no way to edit the text". It is a real gap and it is not being dropped. This
says where it should go.

## What the recordist is actually reading

Every line in a recordist's queue is a row in `listening_pod_sentences` — live
pod content that learners are being served today. The booth shows
`target_text`; the take is filed against that sentence's slot.

## Why a text box in the booth would be a silent data fault

Two standing rules in this repo, both adopted before this job:

1. **Never edit a live pod in place.** (CLAUDE.md, 2026-08-16, plate A-111 —
   protocol at `docs/pods/pod-migration-protocol.md`.) Learner progress is filed
   under a sentence's SLOT, not its text. Change the text underneath and a
   learner is silently credited with a sentence they never heard. No error, no
   alarm, nothing in a log.
2. **Pod audio is never rendered from unread drafted text.**
   (`docs/pods/text-approval-policy-2026-08-16.md`, Tom's A-109 ruling.) A line
   only renders once a human edit clears the draft flag or an independent
   verifier approves it.

A free-text field wired to `UPDATE listening_pod_sentences.text` breaks both, on
live learner data, from a phone, in a no-login page whose whole security model is
"whoever holds the link is that voice". The booth is the one surface in the
estate where an edit has the least accountability and the most blast radius.

There is also a plainer point. The recordist is the wrong person for the
decision. Catrin is not asking to rewrite the course; she is saying "this line is
wrong" — a report, not a write.

## Recommendation

**Split the ask in two, and put each half where it belongs.**

- **In the booth: a flag, not an editor.** One control on the line being read —
  "this line is wrong" — with an optional spoken or typed note. It writes a
  REPORT against the line id. It does not touch `listening_pod_sentences`, so no
  migration is triggered and no learner progress moves. The recordist gets to
  say the thing and carry on reading, which is what they actually want mid-take.
- **On the admin side: the edit.** `/admin/recording`
  (`src/views/AdminRecording.vue`) or the pods surface (`src/views/PodsView.vue`),
  behind the migration protocol — the edit creates a new slot, migrates progress,
  and queues the re-record, which is what the protocol already does properly. The
  flagged lines land there as a queue for whoever owns the language.

## What was built today, and what was not

**Not built: the flag.** It needs somewhere to write to — there is no report
endpoint and no table for it (`services/voice-engine/recordist-router.cjs` has
`/mine`, `/voice/:id`, `/take`, `/clip`, `/coverage`, `/languages`, and nothing
else). That is a small API + one table + one control, and it is a separate piece
of work rather than something to bolt on at the end of a UX pass. It was left
out on purpose and reported rather than quietly dropped.

**The decision Tom owes, in one word:** should the flag be built next — YES or NO?


---

## What Tom decided (same evening)

**Editing is IN for the test course.** His standing ruling: "it is a TEST course
so it can have any rules we like." A test fixture has no learners, so the
migration protocol's objection does not exist there — and the relaxation is for
CONTENT and PEDAGOGY rules only; consent and data-safety rules bind everywhere.

So the booth now has real inline text editing, gated to `zzz_` courses:

- `PATCH /api/recording/voice/:voiceId/line/:lineId/text` rewrites the line.
  Anything that is not a `zzz_` course gets a 403 and **nothing is written** —
  the gate is on the server, because the booth has no login and a screen-side
  check would be a suggestion. Proven on the live site against a real Welsh line:
  `{"reason":"live_course"}`.
- The queue carries `canEditText` per line, so the control is drawn only where
  the write would be allowed. Catrin's 161 Welsh rows show **zero** edit buttons.
- Editing is offered in two places: the line being read, and any row of the
  roster.

**What happens to the audio when the text changes** — the question worth being
explicit about. A clip's identity is `(language, text_normalized, voice)`. So:

1. Nothing is deleted and nothing is unlinked.
2. The new text simply has no take, so the line reads as OUTSTANDING again,
   immediately, on the screen and on the server.
3. The old clip stays in `course_audio` exactly where it was, and the sentence's
   `target_audio_id` still points at it until a new take lands.
4. The next take upserts a clip under the NEW text and repoints the sentence.

That is make-before-break by construction rather than by remembering to do it —
there is no window in which the line has neither the old audio nor the new.

**The flag idea is therefore parked**, not built. For a LIVE course the
recommendation above still stands: report from the booth, edit on the admin side
under the migration protocol.
