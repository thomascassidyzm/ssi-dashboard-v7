# Pod-1 scene review pack — for Tom's approval

**Status: DRAFT, pending review.** These 14 scenes are seeded into `canonical_pod_scenarios`
(`pod_slug='pod-1'`) as a working draft only — not yet canon. No audio has been generated for
any of it, and no other language has been (fully) flexed from it (see note at the end). Nothing
downstream renders until this set is approved. Full text of every scene is below; edit requests
can be scene-by-scene — a `sync` re-flex only touches changed scenes.

Source: `docs/pods/pod-ladder-proposal.md` §4 (the approved scenario slate) + §5 (2 of these 14
scenes — "The Weekend", "Making Plans" — were already fully scripted there as taste-check samples
and are reused verbatim below). The other 12 were authored fresh against the same slate's
title/difficulty/content-note and the §2 ramp table (friendly-informal register, 1–4 sentence
turns, past narration + future plans + feelings, two speakers, concrete personal-experience
content only — no 3-way discussion, no irony/teasing, no abstract argument; that's pod-2).

---

## 1. The Journey In — *Terrible weather again* (beginner)
**Situation:** two colleagues cross paths arriving at work on a wet Monday — small-talk about
weather and the commute, with a mild shared complaint.
- "Morning! Awful out there, isn't it?"
- "Ten minutes, and packed like a tin of sardines. There was a signal problem, apparently."
- "Anyway, coffee first, I think, before I do anything else."

## 2. The Weekend — *What did you get up to?* (beginner)
**Situation:** the classic Monday "how was your weekend" exchange — past narration with feelings,
a small shared recommendation (a book) at the end.
- "Really good, thanks. We went to the coast on Saturday."
- "Not much, to be honest. I was really tired after last week, so I stayed at home and read my book."
- "I loved it. I cried at the end, actually. You can borrow it if you like."

## 3. Making Plans — *Saturday, half past one* (beginner)
**Situation:** proposing a get-together, adjusting a time, confirming numbers — a future
arrangement worked out live.
- "A few of us are going to that new place by the river for lunch. Do you want to come?"
- "One might be a bit tight for me. Could we say half past?"
- "I'll book for six, just in case. What's Katie doing these days?"

## 4. Family — *Two sisters and a dog* (beginner)
**Situation:** describing people from a photo — ages, resemblance, personality comparisons, ending
on the family dog.
- "That's Grace, yes. Everyone says that, but I think she looks more like my mum."
- "She's more like Grace, actually — quiet, and really good at school. I was always the loud one."
- "Some sort of retriever. He's soft as anything, though — completely useless as a guard dog."

## 5. Under the Weather — *You should go home* (intermediate)
**Situation:** a colleague is clearly unwell; sympathy, a practical offer to cover for them, gentle
advice.
- "You should go home, Sam. You look exhausted."
- "You're not asking, I'm offering. Go home, get some rest, drink something warm."
- "Try honey and lemon when you get in. My mum swears by it."

## 6. How's the New Job? — *Better than the last one* (intermediate)
**Situation:** catching up on a recent job change — comparing new vs old, opinions about people and
hours, a clear net-positive verdict.
- "Six weeks, actually. And honestly, so much better than the last place."
- "The people, mostly. Everyone's friendly, and my manager actually listens when I say something's not working."
- "Never. Honestly, I think I made the right move leaving."

## 7. The New Flat — *More space, less light* (intermediate)
**Situation:** weighing the pros and cons of a flat just viewed — space vs light vs commute — a
real, undecided trade-off talked through out loud.
- "Two bedrooms, a proper kitchen, and there's a little balcony as well."
- "There's always a catch. It doesn't get much light, especially in the afternoon."
- "So, more space and less light, but a shorter commute."

## 8. Photos on the Phone — *And this is the beach* (intermediate)
**Situation:** showing holiday photos on a phone — pointing, reacting, narrating each picture in
turn.
- "That water looks incredible. Was it actually that blue?"
- "That's my cousin, Dan. He came out for the last few days."
- "That's just the view from our balcony at sunset. I took about fifty of that exact shot."

## 9. Last Night's Film — *I nearly cried* (intermediate)
**Situation:** two friends disagree gently about a film they both watched — stating and defending
opinions without falling out.
- "I did, last night. I loved it, actually. I nearly cried at the ending."
- "The acting was good, I'll give you that. I just found the story a bit slow."
- "We'll just have to agree to disagree on that one."

## 10. Where I Grew Up — *A small town by the sea* (intermediate)
**Situation:** describing a childhood place — habitual past ("we used to…"), and an unexpected
admission of missing it now.
- "A small town by the sea, in the north. You wouldn't have heard of it."
- "Not much, if I'm honest. We used to just sit on the wall and watch the boats come in."
- "More than I thought I would. I used to want to leave so badly."

## 11. Holiday Stories — *The wrong bus* (advanced)
**Situation:** a calm, complete recounted anecdote — a small travel mishap that turned into the
best part of the trip.
- "One thing, actually, and it was completely my fault. We got on the wrong bus on the first day."
- "We ended up in this tiny village we'd never have seen otherwise, and had the best coffee of the whole holiday."
- "Funny how it's always the mistakes that make the best stories."

## 12. What Are You Learning? — *A little every day* (advanced)
**Situation:** hobbies and intentions — a friend's new hobby (guitar), habits, hopes for the
future.
- "I am, yes. I started learning the guitar, actually, a couple of months ago."
- "Honestly, I always wanted to, but I never had the time before. Now I've just decided to make the time."
- "There's one I really love, but it's still way beyond me. I'm hoping by Christmas, maybe."

## 13. Good News — *You're joking!* (advanced)
**Situation:** announcing exciting news (a house purchase), congratulating, future plans mixed with
present feeling.
- "We got the house! The one by the park, the one we've been after for months."
- "Not until September, but still. I've already started thinking about paint colours."
- "You deserve it. Right, this definitely calls for a celebration drink."

## 14. Catching Up — *It must be two years* (advanced)
**Situation:** the capstone — an old friend met by chance, mixed past/future across longer turns:
a job change, a new relationship, a baby, a promise to properly catch up.
- "Hannah! I don't believe it. It must be two years, at least."
- "I actually met my partner there as well, which nobody expected, least of all me."
- "Thank you. It's exhausting, but honestly the best thing that's ever happened to us."

---

## What Tom should know before approving

- **Casting fix, unrelated to content but relevant to this set:** authoring introduced several
  female character names (Ruth, Nadia, Grace, Ellie, Rosie) that the voice-gender heuristic
  (`tools/pod-sync.cjs`) didn't recognise — it silently defaults unrecognised names to a MALE
  voice. Fixed in the same commit as the segmentation rule (added those names, plus the
  correctly-defaulted-by-luck male names, to the gender lists) so casting will be right whenever
  this set is approved and rendered.
- **Partial Croatian flex already ran before this hold landed:** 13 of the 14 scenes (180
  sentences, scene 14 incomplete) were already flexed into Croatian draft text in
  `listening_pod_sentences` (`hrv_for_eng:pod-1`) before your hold message arrived — the process
  has now been killed. This is text-only, no audio, not visible to any learner (the player skips
  ungenerated audio), and cheap to either leave in place or wipe — your call, no action taken
  either way pending your decision on the scene set itself.
- Nothing else has been generated for any other language.
