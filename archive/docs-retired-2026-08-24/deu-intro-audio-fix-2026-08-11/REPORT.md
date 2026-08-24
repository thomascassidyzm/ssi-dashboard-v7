# German Intros — what was wrong, what I changed, and who gets the fix

## For Deborah

We found and fixed it. The German course had **two Intros where the voice said a different English word than the one written on the screen** — one said "the German for *to achieve*" while the screen said **to know**, and the other said "the German for *to him*" while the screen said **it**. Both are now pointing at the correct recordings, and I have confirmed by listening to the audio through the live app that the right words now play. Separately, the woman's voice you heard is genuinely out of date: every Intro in the German course was re-recorded in the new voice on 7–8 August, but a cache key in the app was never updated, so browsers that had already loaded the course kept replaying the old woman's-voice version. I have updated that key, so the new voice will now reach people. One honest caveat below on how quickly that happens for everyone.

---

## How many clips were wrong

I checked **every single audio reference in the German course — 43,197 of them**, held by 1,570 lego cards and 13,926 practice phrases. Not a sample.

| What I looked for | Found |
|---|---|
| Intro whose spoken script names a different English word than the written one | **2** |
| References pointing at rows that a 6 August regeneration had marked as superseded | **4** (2 recordings) |
| Written German word not matching the recording's word | 0 |
| Written English word not matching the recording's word | 0 |
| References pointing at a recording that doesn't exist, or belongs to another course | 0 |

So: **2 audible defects, 4 bookkeeping defects.** Everything else in the German course lines up.

## What a learner heard versus what they should have heard

I transcribed the actual audio rather than trusting the database.

**Card 1 — screen says "to know / wissen".** Heard: *"The German for 'to achieve', as in 'we don't know what they're trying to achieve', is…"* then the German word **wissen**. Should hear, and now does: *"The German for 'to know', as in 'I don't need to know everything', is…"* then **wissen**.

**Card 2 — screen says "it / es".** Heard: *"The German for 'to him', as in 'I said to him that I need more time today', is…"* then the German word **es**. Should hear, and now does: *"The German for 'it', is…"* then **es**.

In both cases the German word being taught was always correct — it was the English introduction around it that belonged to a different word in the same seed. Both were mislinked to the Intro of a neighbouring card.

**The 4 bookkeeping ones (the "ich will" card, lesson 1):** these pointed at recordings that a regeneration on 6 August had marked as dead. I transcribed all four — old and new — and **all four say "ich will" correctly**. So nobody heard the wrong words here. I fixed it anyway, because a live pointer to a row marked dead is a trap for the next repair pass.

## What I changed

Eight database writes, plus one cache key. **No audio was generated — the correct recordings already existed. Nothing was deleted.** Every row was photographed before it was touched, so any of it can be put back line by line.

1. Two Intro cards re-pointed to the correct existing recordings — the very same Intro clips already in service on the cards that first teach "to know" and "it", so the word being introduced is identical and the voice is the current one.
2. Four references moved off the superseded rows onto the 6 August regeneration's own recordings (both quality-checked, zero error rate).
3. **The revision number was bumped on all four replacement recordings — yes, explicitly.** This is the part that makes the fix visible rather than invisible. It moved the course's audio timestamp from 8 August to today, which is the only thing that forces a learner's device to throw away its cached copy of the course script.
4. I also bumped the course version number. See below — this is the actual answer to the woman's voice.

I verified the fix by fetching the audio **through the deployed learner route, not the database**, and transcribing what came back. All five clips returned correctly and said the right words.

## Will a learner who already played the wrong clip now get the right one?

**Mostly yes, and the honest answer has two parts.**

**Yes, for the main path.** The way a returning learner actually loads the course, their device now throws away its cached script on the next time they open the app while online, and re-reads the corrected version. That is **seconds, on their next session.** The corrected clips also carry brand-new addresses that no device has ever cached, so there is no possibility of an old copy being replayed.

**Not yet guaranteed, for one narrow path — and this is why the woman's voice persisted.** The app has a second, faster start-up path that caches the opening round in the browser. That cache is keyed to the course version number, and I found the reason it never cleared: **the database rule that bumps that number deliberately ignores audio changes.** So when every German Intro was re-voiced on 7–8 August, the number never moved, and browsers kept serving the old woman's-voice Intros — for three days, and indefinitely. I have now bumped it.

**But there is a genuine blocker on top of that, and I could not clear it.** The route that publishes this version number to browsers is cached at the CDN edge for **up to a year**, and I measured it live: it is still serving the old number right now. Nothing in the system purges it. Clearing it needs either a redeploy of the app or a manual CDN purge — **both are deployment actions, which this job explicitly excluded**. Until one of those happens, learners who already have the course cached may keep hearing the old voice on the opening round. I did not do it and I am not guessing that someone else will.

**So, plainly:** the wrong *words* are fixed and will reach learners on their next session. The old *voice* is fixed in the database and at the server, but reaching every already-cached learner needs someone to redeploy the app or purge the CDN cache.

## Other courses

Counts only — **I changed nothing outside German**, as instructed.

I ran the same detector across all 16 released courses. Raw hits are scored down twice: once for differences that are not real faults (contractions like "it's" versus "it is", and Welsh's different Intro format), and once for cards that never actually play an Intro.

| Course | Audible Intro mismatches |
|---|---|
| Croatian | 31 |
| Chinese | 18 |
| Welsh (southern) | 10 |
| Portuguese | 11 |
| Welsh (northern) | 7 |
| Italian | 7 |
| Spanish | 4 |
| Bengali, Kannada, Marathi, Telugu, Galician, Japanese, Korean, French, Welsh anthem | 0 |

**88 in total outside German.** Some will be judgement calls on phrasing rather than clear faults; the clear-cut ones look exactly like the German pair, e.g. a Spanish card written "the dog" whose Intro says "young". Separately, 3 cards across French and Spanish have a written target word that doesn't match its recording.

Only two courses in the whole estate carry rows marked superseded: German (now clean) and French (57 rows, but **none of them are referenced by anything**, so no learner is affected).

## Explicit gaps — things I could not settle

1. **I could not clear the CDN cache.** Measured live, still serving the pre-fix version number, cached for up to a year. Needs a redeploy or a manual purge. Out of scope here, and it is the one thing standing between this fix and every already-cached learner.
2. **I did not identify what overwrote a large slice of German audio on 3 August.** An earlier investigation found 25 of 25 sampled February clips had their audio files silently replaced with no record. I confirmed the affected lesson-1 clip still says the right words, so it is not causing today's complaint — but the writer is unidentified and could do it again.
3. **One Intro now quotes the wrong example sentence.** The "to know" card's new Intro says "as in 'I don't need to know everything'" — correct English and correct German, but the example comes from a different seed than its own. Fixing that properly needs one new recording. **I did not generate it and did not seek approval to spend money.** One clip.
4. **170 German cards and 12,954 practice phrases have no Intro recording at all.** Not a mismatch; recorded so the scope is known.
5. **The 88 other-course counts are detector output, not human judgement.** Nobody has listened to them. I would not quote them to a learner without a review pass.
6. **I could not measure how many learners are actually stuck on the old cached voice.** There is no telemetry I can reach for that.
