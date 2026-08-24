# The messages that meet a new learner

For whoever is editing. These are the seven messages the app sends someone in their
first week or two: five emails and two little tips that appear inside the app. They
run from the hour they sign up to the moment they reach the end of the free part.

None of them is sending yet — the sender does not exist. This is the copy waiting for
it, so the words are worth getting right before a single one goes out.

**Edit the words freely.** The `##`/`###` headings and the little `key` lines under
them are how we map your edits back, so please leave those alone — everything else is
yours to change.

Two things that are not words and are not yours to change here: **when it fires** and
**why it is worded this way** are printed under each message as context only. If a
message should fire at a different moment, say so in your edit and we will move it —
that part is wiring.

Anything in `{{double braces}}` is filled in per learner when the message is sent —
leave the braces and the name between them exactly as they are.

A few lines are governed by settled rulings and are fine to raise, but we will come
back to Tom on them rather than silently applying or reverting your edit:

- The names **Easy** and **Fast** for the two paces.
- The **no-streaks, no-points, no-leaderboard** framing — the decision, not just the words.
- The **honest thirty-hours arc**: that the first thirty hours are hard, and we say so.
- No learner-facing line says **lego** or **seed** — those are our words, not theirs.
- British English throughout.

Source: the `onboarding_messages` table, which the retired `/admin/onboarding` editor
used to write to. This page replaces it.

---

## 1. Verify your email

*Email. Fires: ~1 hour after signup, needs_verification still true. Resend once more at 24h if still unverified, then stop.*

*Why it is worded this way: Copy deliberately says learning is NOT blocked — possession-onboarded accounts work fine unverified; the verify is framed as protecting progress, which is the true stake.*

### What we call it
`verify_email / title`

Verify your email

### The subject line
`verify_email / subject`

One tap to secure your SSi account

### The preview line under the subject
`verify_email / preheader`

So your progress is yours on any device.

### The message itself
`verify_email / body`

Hi,

You're in — your course is ready and nothing is blocking you from learning right now.

One small thing: tap below to confirm this email address. It's how we make sure your progress belongs to you — so you can pick up exactly where you left off on any phone, tablet or computer, and get back in if you ever lose a device.

**[Confirm my email]**

That's it. No account settings to fill in, no profile to build. Go and say some things out loud instead.

— the SSi team

---

## 2. Welcome / the one rule

*Email. Fires: Day 1, everyone (verified or not).*

### What we call it
`welcome_day1 / title`

Welcome / the one rule

### The subject line
`welcome_day1 / subject`

The only rule at SSi

### The preview line under the subject
`welcome_day1 / preheader`

Say it out loud. Everything else is optional.

### The message itself
`welcome_day1 / body`

Hi,

Welcome to SSi. Before the usual "getting started" tips, here's the only one that actually matters:

**Say it out loud.** Not in your head. Out loud.

The app plays you a phrase in English, gives you a pause, and you speak — before you hear the answer. That pause is where the learning happens. It will feel too soon. It's supposed to. Wrong, half-right, mumbled into your coffee — all of it counts, all of it works.

A few things you don't have to do:

- You don't have to remember anything. The course brings everything back at the right moment — that's its job, not yours.
- You don't have to keep a streak. Miss a day, miss a week — the app waits exactly where you left it.
- You don't have to "study". No grammar tables, no vocabulary lists. Just press play and speak.

Ten minutes today is a real session. See you in there.

— the SSi team

**[Continue learning]**

---

## 3. Gentle re-open (not-yet-played only)

*Email. Fires: Day 3, zero sessions since signup. Never sent to anyone who has played.*

*Why it is worded this way: That last line is a promise the trigger model keeps — message 3 fires once, ever. It's the anti-Duolingo move and worth stating outright.*

### What we call it
`reopen_day3 / title`

Gentle re-open (not-yet-played only)

### The subject line
`reopen_day3 / subject`

Your course is still sitting there, ready

### The preview line under the subject
`reopen_day3 / preheader`

Ten minutes counts. No catching up required.

### The message itself
`reopen_day3 / body`

Hi,

You signed up a few days ago and haven't had a chance to start yet — which is fine. Life does that.

Just so you know what's actually waiting: no setup, no placement test, no lesson plan. You press play, hear a phrase, and say it out loud. Ten minutes in you'll have said your first sentences in a new language — actually said them, with your mouth.

There's nothing to catch up on. The course starts wherever you are.

**[Press play]**

— the SSi team

*(If you've decided this isn't for you, that's fine too — you won't get a stream of these. This is the only nudge.)*

---

## 4. Listening mode tip

*A card inside the app. Fires: ≥3 completed sessions AND listening mode never activated. Dismissible card on the player resting state, before a session starts.*

*Why it is worded this way: Matches the existing in-app description "Passive review — let phrases wash over you while you relax". "Not now" dismisses permanently — a tip that re-nags is a nag.*

### What we call it
`tip_listening_mode / title`

Listening mode tip

### The message itself
`tip_listening_mode / body`

**For the times you can't speak out loud**
Listening mode replays what you've learned while you do something else — walking, driving, washing up. No pauses, no pressure. It's in the mode tray, next to play.

[Try listening mode] · [Not now]

---

## 5. Speed / turbo tip

*A card inside the app. Fires: ≥5 completed sessions AND playback speed never changed AND turbo never used. Same in-app card surface as the listening mode tip.*

### What we call it
`tip_speed_turbo / title`

Speed / turbo tip

### The message itself
`tip_speed_turbo / body`

**Feeling comfortable? Make it harder.**
If the pauses are starting to feel roomy, nudge the speed up in Settings — or try Turbo in the mode tray. Struggling to keep up is the point; comfortable means ready for more.

[Okay] · [Not now]

---

## 6. What you can already say

*Email. Fires: Day 7, ≥2 sessions in the first week. Personalised: pulls the learner's latest LEGO played, both languages, plus minutes practised.*

*Why it is worded this way: This is the "position is the last LEGO played, displayed as its own content" ruling made into an email. No seed numbers, no percentages, no belt mechanics — the phrase IS the progress report. If the latest LEGO's text isn't cleanly fetchable server-side at send time, this message is not worth sending in a degraded numbers-only form — hold it until the data path exists.*

### What we call it
`day7_what_you_can_say / title`

What you can already say

### The subject line
`day7_what_you_can_say / subject`

A week ago you couldn't say this

### The preview line under the subject
`day7_what_you_can_say / preheader`

{{target_phrase}}

### The message itself
`day7_what_you_can_say / body`

Hi,

One week in. Here's the most recent thing your course handed you — and you said:

> **{{target_phrase}}**
> *{{known_phrase}}*

Read that again. A week ago that was noise. Now it's yours — not memorised, not revised, just built up from everything underneath it, said out loud in a pause that felt too short.

That's the whole method, and it keeps working exactly like this: what you can say keeps growing, sentence by sentence, whether or not it feels like it's going in.

You've put in {{minutes_practised}} minutes so far. Keep going exactly as you are.

**[Continue learning]**

— the SSi team

---

## 7. Before the wall (premium)

*Email. Fires: Progress reaches ~seed 17 (two seeds before the free preview ends at end-of-yellow), OR immediately after first paywall hit if they got there before the email fired. Sent once. Never sent to already-subscribed, school-channel, or code-holding learners.*

*Why it is worded this way: "No discount countdown" is a voice bet — it reads as trustworthy and very SSi, but it does close the door on ever running intro offers to this cohort.*

### What we call it
`premium_before_wall / title`

Before the wall (premium)

### The subject line
`premium_before_wall / subject`

You're about to finish the free part

### The preview line under the subject
`premium_before_wall / preheader`

Here's exactly what happens next — no surprises.

### The message itself
`premium_before_wall / body`

Hi,

You've nearly finished the free preview — which, given where you started, is worth pausing on. That's real spoken language you didn't have a few weeks ago.

Here's the honest picture of what happens next:

- **The free preview ends** at the end of the yellow belt. You'll hit a subscribe screen in the app when you get there.
- **Premium is £15/month.** That's every course we have — 65+ languages — plus downloads so you can learn offline, with new courses added all the time. Cancel anytime, and everything you've learned stays yours.
- **Not ready? Also fine.** Your progress doesn't expire. Come back next month or next year and you'll be exactly where you left off.

No discount countdown, no "offer ends Friday". The price is the price and the course will wait.

**[Go Premium — £15/month]**

— the SSi team

---
