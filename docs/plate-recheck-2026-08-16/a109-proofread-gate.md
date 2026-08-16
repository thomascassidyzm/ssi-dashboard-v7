# The renderer still has no proofread gate — re-checked today

Re-checked against the running code and the live database on **2026-08-16**.
A-109 used to link to a Spanish casting document. That document happened to contain this
finding, but it was not about it, and its tables are two days old — which is why the numbers
in it did not match where you thought we were. This doc is about the gate and nothing else.
The Spanish figure you challenged is answered at the bottom.

## The finding, and it is still true

When the audio renderer is asked to fill in a course's missing pod audio, it decides what to
render by asking one question of every line: **does this line have audio yet?** If not, it
renders it.

It never asks whether the words have been proofread. A line that is still a machine-translated
draft, that no human has read, renders exactly like a finished one.

I checked this in the code that is actually running on the server today, not in a document.
The marker that says "this line is an unread draft" appears **zero times** in the audio
service, in both the development copy and the production copy the live server runs from.

## What is standing between drafts and a render right now

One thing, and it is not the gate: a **voice approval** per course. A bulk render is refused
unless you have listened to samples and approved that course's casting. That check is doing
its job — every course except Spanish is currently refused.

But a voice approval says "these voices sound right". It says nothing about whether the words
are finished. Once a course is approved, whatever is unrendered gets rendered, drafts included,
unless whoever runs it narrows the scope by hand.

Spanish is the live example. It is approved. It has **128 unproofread draft lines** waiting in
one pod (up from 112 two days ago). None of them has rendered — but only because the render
that ran on 14 August was hand-scoped to a different pod. Nothing in the code would have
stopped them.

## What I recommend

**Fix it.** One condition in one place — skip any line still marked as an unread draft —
and this cannot happen again by accident in any course. It is cheaper than the alternative,
which is remembering to hand-scope every render forever and re-rendering whatever slips
through. Nothing needs to be redesigned; the marker already exists on every line and is
already used elsewhere in the system.

Say **fix** and I add the gate. Say **leave** and hand-scoping stays the only protection.

## Your challenge: "there can't be 6 English voices"

You were reading a two-day-old table. Here is what the live database says today.

The stored Spanish casting really does name **six** different English voices across its 55
character seats. But **only three of them have ever been heard**:

| English voice | seats | clips actually rendered |
|---|---|---|
| Tom — your cloned voice | 38 | 310 |
| Olivia | 10 | 440 |
| Leo | 4 | 112 |
| Sonia (Azure) | 1 | **0** |
| Libby (Azure) | 1 | **0** |
| Hollie (Azure) | 1 | **0** |

The last three sit on one character each in a single pod — *travel-situations* — which has no
audio at all, in either language. So six is what the casting table says and **three is what
exists**. Your ear was right; the table was counting seats nobody has recorded.

The rest of that Spanish snapshot is still accurate: the male seats are still Manuel, all 37 of
them, Elvira still holds her 18, and your approval still matches the live casting exactly.
The trap that document named is also still open — the Spanish voice **pool** still lists Alvaro
and has no entry for Manuel at all, so re-syncing Spanish from its markdown would still undo
the recast.

## Gaps

- Nothing was changed by this check. No audio was rendered, no cast touched, no code edited.
- The approved Spanish render was for two pods; only one of them ran on 14 August.
  *travel-situations* is still entirely unrendered. Flagging it, not acting on it.
