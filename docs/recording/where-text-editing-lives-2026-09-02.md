# Where "edit the text" lives — and why it is not a box in the booth

**2026-09-02. Decision needed from Tom: one word.**

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
