# Voice preview in Popty — does it work?

2026-08-28. You asked whether there is a simple way to preview voices from admin/configs, and thought there was a voice lab. There is, and it works. I logged in, clicked through it and made it speak. Two things it cannot do are worth a minute of your time at the end.

**Tap this: https://popty.app/admin/configs/voice**

Or from the site: **Admin → Configs → Voice Lab**.

---

## How to use it

Pick a voice. Pick a language. Type a sentence — or press **"or pull one from a course"**, choose the course, and tap a real line out of it. Press **Generate**.

Before you press it, it tells you what the clip will cost — mine said *"1 clip · $0.0006 · 60,000 characters left today"*. It has its own daily spending ceiling and refuses rather than quietly spending. It writes nothing into any course.

The clip plays a second or two later, with a **▶ Play it again** button. Sliders for loudness and detail sit beside it; anything the voice cannot do is greyed out and says why.

---

## Hear it

Both of these are the actual first line of the French course — *"Je veux parler français avec toi maintenant"* — generated through that page just now, on two different French voices. This is the whole point of the tool: same real line, two candidates, one after the other.

Camille:

https://watson-1.tail4968cb.ts.net/evidence/voice-lab-preview-2026-08-28/camille-fra-seed1.mp3

Hugo:

https://watson-1.tail4968cb.ts.net/evidence/voice-lab-preview-2026-08-28/hugo-fra-seed1.mp3

The lab checked its own work on the first one: loudness, tail shape, and a transcription that came back word for word, no errors. It passed everything.

---

## Two things it cannot do

**1. You cannot audition an Azure voice or a Cartesia voice in it.** The voice menu offers 151 voices and every single one is xAI — the provider we have just retired. There is meant to be a group called "In the estate today" holding our real Azure voices, and it is empty. The reason is small and dull: the machine running the API is missing one credentials file, so it cannot read the voice list out of the database. Copying that file across is minutes of work, not a project. Cartesia is a different matter — we have no Cartesia voices cast anywhere except your English clone, so there is nothing for the lab to offer even once it can see the database. That is a casting decision, not a coding one.

This matters right now because of your own ruling today: prefer Cartesia over Azure where a Cartesia voice exists. The lab, as it stands, is the only place to listen before choosing — and it cannot play either of the two providers that decision is between.

**2. It is invisible from where a course's voices are actually chosen.** Kai picks Voice 1 and Voice 2 on the course's own audio page. That page never mentions the Voice Lab and does not link to it — you have to already know it exists. Worse, that page has a button labelled **Preview**, and it does not play anything: it tells you how many clips *would* be regenerated. Adding a link is a few minutes.

It also covers 16 languages, not the whole estate.

---

## What I would do

Two small fixes make this the tool you thought it already was: copy the credentials file so the Azure voices appear, and put a link on the course audio page. Half a day, generously. Cartesia auditioning needs voices cast first, which is a separate call.

**Shall I do those two? yes / no / more**
