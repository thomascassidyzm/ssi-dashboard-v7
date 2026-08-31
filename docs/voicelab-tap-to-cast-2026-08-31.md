# Casting a Cartesia voice, in one tap

2026-08-31. Popty → Admin → Configs → Voice Lab → **Languages**. Live on the watson-1 backend now.

## What you can do that you could not this morning

Open a language and you get **the candidate voices as a list, not a dropdown**. Each row has a play
button and a Cast button. Tap play, hear that voice saying a **real line from a real course** in
that language — the line and the course it came from are printed above the list. Tap Cast, and that
voice is cast. No confirm dialog: `Clear` undoes it in one tap.

The **guide slot** — instructions and encouragements — casts through the identical control. It was
the slot you named as existing with nothing in it.

Nine languages are warmed, so opening them plays immediately. Nothing renders when you open a page.

## The thing that was actually broken

You told me not to take the docs' word that generation reads the language cast. Reading the
generation code says: **it does, but on the estate as it actually stands it could not reach what you
asked for.** Two counts from the live database today:

- **0 of 150 courses** carry an `instruction` or `encouragement` block in their stored voice config.
  The resolver skipped any role a course did not already store — so **every guide cast was a write
  that no render could ever read.** The guide slot was dead on arrival, in every language.
- **56 of 150 courses** carry no voices block at all. The resolver returned early on those, so a
  phrase cast **silently skipped 56 courses**.

Both were the same mistake: absence read as "leave this alone" rather than "nothing here yet". Fixed
— the cast now seeds a role a course has never stored, and builds a config for a course that stores
none. No migration was needed; the language-level table and the reader both already existed.

**Your acceptance test, proved on live data.** I cast Spanish once, read what the render path
resolves for every Spanish course, and removed the probe rows:

| course | target voice before | after one cast |
|---|---|---|
| spa_for_eng | es-ES-ElviraNeural | the cast voice |
| spa_for_jpn | es-ES-LaiaNeural | the cast voice |
| spa_for_zho | es-ES-ElviraNeural | the cast voice |
| spa_mx_for_eng | es-MX-CarlotaNeural | the cast voice |
| spa_for_cym | *nothing configured* | the cast voice |
| spa_mx_for_jpn | *nothing configured* | the cast voice |
| spa_mx_for_zho | *nothing configured* | the cast voice |

One write, seven courses, nothing else to do anywhere. The last three are the ones the old code
could not reach.

## Voice per language, text per course

The page says this out loud, in one line above the voice list: casting decides **who speaks** across
every course in the language, and **what is said** stays each course's own. Nothing in this work
shares or dedupes text across courses on the strength of a shared language, and I found nothing
existing that does.

Because there is no canonical line for a language, the audition line is **named**: it comes from one
course and the course is printed beside it.

## Two defaults I chose rather than was told

**1. Which line you hear.** The plainest course teaching that language — no regional prefix
(`deu_for_eng` over `deu_at_for_eng`), then an English-known one, then the biggest — and from its
first 200 seeds, the plainly-punctuated line of typical length for that corpus. Both halves are
written that way because the first version got it wrong on real data: it offered German an
**Austrian** line and Welsh a **Yoruba-known** one because those courses happened to be biggest, and
it returned **nothing at all for Chinese** because a 25-character floor is a fact about Latin script,
not about how long a sentence takes to say.

Welsh still draws its line from `cym_for_yor`, because no plain `cym_for_eng` course exists — the
course is labelled on screen, so you can see it.

**2. The 20,000-character warm cap.** It did not stop me. I spent **3,646 characters on 110 clips**
in total, read back from the ledger, not estimated.

## What is warm, and what is not

Warmed 12 voices each: **spa, deu, fra, por, ita, zho, jpn, kor, eng** — 108 clips, 3,564 characters.
Reads land in about 300ms.

- **fin — not warm, and it cannot be.** The lab refuses to render Finnish: `params.cjs` has no
  steering entry for it. Finnish can still be cast; it just cannot be previewed here. One line of
  configuration would fix it and I have not touched it.
- **pdc** is human-voiced, so it has no synthetic candidates and needs none.
- Each language has more candidates than 12 (Spanish has 81). The rest show a "prepare" button
  saying exactly how many characters it will cost before you press it. Anything already rendered is
  cached forever and free to replay; anything the estate already owns a take of plays free and is
  marked `free`.
- Voices that are **castable but not previewable** — Azure voices, human recordists — say so in
  those words. This lab renders Cartesia only, and pushing an Azure id through a Cartesia config
  would render a stranger and call it an audition.

## Things worth your ruling, one line each

1. **Regional variants share a cast.** `deu` covers `deu_at` and `deu_ch`; `spa` covers `spa_mx`. One
   cast on `spa` puts a Castilian voice on the Mexican courses. Should the cast key on dialect?
2. **Finnish cannot be auditioned** until `params.cjs` learns to steer it. Add it?
3. **Human-voice courses.** The human recording splicer resolves a slot from the *stored* per-course
   config, not the cast. Casting a synthetic voice onto a language that has human recordings could
   confuse that path. I have not touched it; flagging it rather than meddling.
