# What an edit breaks — and how we'd know before it breaks

You said it this morning: a seed text edit reaches the legos, the phrases, every phrase anywhere in the course that uses something from that seed, and all of that audio — presentations included. And that it's a general problem.

It is. Here's what's true today, what I've built, and the one thing I need a yes or no on.

---

## The bit that's actually dangerous

When you edit a **lego** or a **phrase**, the database notices and re-points the audio. Sometimes to nothing — the slot goes silent, which is annoying but visible. Sometimes to a clip we already have that happens to match the new words — which can be a **different voice**, and nobody is told.

When you edit a **seed**, the database does nothing at all. The audio link stays exactly where it was, still pointing at the recording of the **old** sentence. No error. No silent slot. No missing-audio warning. The learner just keeps hearing the sentence you thought you'd fixed, and there is no sweep anywhere that can find it.

That's the shape of what happened on the Sinhala repairs today. The worker doing them had to trip over it mid-job and repair the links by hand.

---

## What I built

A check you can run **before** an edit, that tells you everything it will touch. It only reads — it can't write, and it never makes audio.

For any edit, to any seed, lego or phrase, in any course, it tells you:

- what happens to every audio clip attached — will it go silent, will it quietly swap to another voice, or will it be left pointing at the old recording
- when a link is going stale, **which clip it should point at instead**, so the warning is also the fix
- every phrase anywhere else in the course that stops working because of it
- words this edit uses that the course doesn't teach until later — or never teaches at all
- which intro/presentation recordings now say the wrong thing
- whether learner progress needs migrating, and roughly how many clips would need re-recording

**Does it actually work?** I tested it by replaying the edits that already happened today — asking it what it would have said beforehand, and checking that against what really went wrong. It found the stale-seed-audio problem 32 times on its own, in under a minute, without being told to look for it. On one single-word change to a lego in Sinhala seed 1, it found **304 broken phrases** spread across the rest of the course. That's your sentence, measured.

---

## What I've deliberately not done

Anything that changes how edits get written. No new database rules, nothing that can refuse someone's work. Designed and costed, not shipped — that's your call, not mine.

---

## The one decision

There are two pieces worth adding, and I'd do both:

1. **Give seeds the same audio rule legos and phrases already have**, so a seed edit stops failing silently. Half a day. It will surface a backlog of missing audio that's currently hiding — that's the point, but it won't look tidy on day one.
2. **Show this report automatically when someone saves an edit**, as information only — never blocking anyone.

There's a third option I'd leave alone: making it *refuse* an edit that looks dangerous. Blocking gates get switched off in a hurry when something's urgent, and then stay off.

**My recommendation: yes to both. Fix the silent one, show the report, don't block anyone.**

Yes / no / more?
