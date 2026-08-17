# T-21 — where your casting decisions stand

You've ruled on fourteen languages so far. This page shows you what's locked, what's rendering, what
needs one word from you, and — for Arabic MSA, which you rejected — eight fresh Azure voices for
your ear.

**What needs you, in one place, at the bottom.** Everything above it is just the state of the board.

---

## Arabic MSA — you rejected all four, here are Azure alternatives

Your words:

> "Arabic MSA - all bad to my ears. None sound authentic to me.
>
> We may need to choose Azure for some of these"

All four previous candidates are rejected and stay rejected — Youssef and Yasmin from the pool, and
the two xAI voices in production. Not re-scored, not argued with.

These are Azure instead. Same sentence, same words, so the comparison is honest:

> **هذِهِ فِكْرَةٌ سَيِّئَةٌ.**
>
> That's a bad idea.

Azure has no locale called "MSA". These are the four locales that read Modern Standard Arabic as
written and are the usual MSA-capable choices. I deliberately left out Syrian and Lebanese Arabic —
those two are already cast for the Syrian and Lebanese courses, and offering them here would muddy
both decisions.

### Male

**Hamed** — Saudi (ar-SA), the closest Azure has to MSA
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/EC0CABB7-3459-431B-931A-204A516F1871.mp3

**Taim** — Jordanian (ar-JO), neutral Levantine, a common MSA read
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/66DB8A2F-D3E0-4655-A677-9B0398BF4FBB.mp3

**Hamdan** — Emirati (ar-AE), Gulf-neutral
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/0D05679F-FF52-41C0-ACB5-E19F254549B6.mp3

**Shakir** — Egyptian (ar-EG), the most-heard broadcast MSA accent
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/D8B31532-C04B-40B2-A30B-72027D98854E.mp3

### Female

**Zariyah** — Saudi (ar-SA)
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B39302B7-AE65-457C-AD00-BB3B863EFBBC.mp3

**Sana** — Jordanian (ar-JO)
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/D3ED64C0-2562-43DB-947A-C2EEA3F4FA3B.mp3

**Fatima** — Emirati (ar-AE)
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/05B8FDCE-D490-4741-BA52-0970EB2ADFD2.mp3

**Salma** — Egyptian (ar-EG)
https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/4540070F-44C0-41E4-BBED-DDF1A7CDBBE3.mp3

Eight clips, throwaway, linked to no course. Four of each because a wall of sixteen is worse for you
than a well-chosen eight — ask and there are more locales available.

**Azure is now a standing fallback lane.** Any language you reject from here on gets Azure candidates
produced on exactly this pattern, without asking you again.

---

## The labelling bug you caught — you were right, and it was bigger than Catalan

You caught Alba being called male in Catalan. That wasn't a typo.

Across the whole casting page, the "In production now" block carries **41 male labels and 0 female
ones**. Not one production voice in the entire document was labelled female. The gender wasn't being
read per voice at all.

So far **four** voices are proven mislabelled, and our own records already had them right:

| Voice | Called | Actually | Languages it affects |
|---|---|---|---|
| `ara` | male | **female** | 10 — including Chinese, Danish, French, Japanese, Thai |
| `eve` | male | **female** | 5 — including Egyptian Arabic, Italian, Spanish |
| Noor `247783ebdd51` | male | **female** | Dutch |
| Lena `3a7889066fa2` | male | **female** | German |

You spotted `ara` and Alba by ear. Noor and Lena were found by checking the records afterwards.

**German matters most, because it's next for you.** Its two production voices are **Moritz (male) and
Lena (female)** — a proper pair — and the old page was about to show you two males. That's the same
trap you hit on Catalan and Chinese. Don't judge German off the old page.

---

## Catalan — solved without spending anything

Checked against Azure's own records and by measuring the actual audio:

- **Enric is genuinely male** — and genuinely a different voice from Alba. The proof is a clean A/B:
  both have a clip of the *same Catalan sentence*. Enric reads at 128 Hz, Alba at 190 Hz. Two
  different people, not one voice under two names.
- **Alba is genuinely female** — exactly as you heard.
- Enric's clips are alive and real — 132 of them already in the course.

So Catalan doesn't need new voices rendered. It needs **your ear on Enric** as the male half, next to
Alba as the female. If he's good, Catalan locks as Enric + Alba and the audio never moves.

---

## The board

Every lock now records **how it was established** — your ear, or locked-unverified pending someone
else's. You can't personally referee 41 languages, and that field is what lets an unverified lock be
revisited later without anyone having to remember.

| Language | Cast | State |
|---|---|---|
| Armenian | Hayk + Anahit | **locked, approved, RENDERED ✓** |
| Basque | Ander + Ainhoa | **locked, approved, RENDERED ✓** |
| Bulgarian | Borislav + Kalina | **locked, approved, RENDERED ✓** |
| Estonian | Kert + Anu | **locked, approved, RENDERED ✓** |
| Chinese | Wei + Ara | locked — needs a recast first, see below |
| Danish | Kasper + Ara | locked — needs a recast first |
| Croatian | Srecko + Gabrijela | locked — needs a recast first |
| Finnish | Harri + Selma | locked — but its cast is unresolved, see below |
| French — Québécois | Antoine + Sylvie | locked, **unverified by ear** (your "no idea" on Québécois) |
| Dutch | Bas + Lieke | locked, **render deliberately held** behind the click bug |
| French | Henri + Celeste | locked, **full render held — needs one word from you** |
| Egyptian Arabic | Rex + Eve | **blocked** — see the collision below |
| Syrian Arabic | Laith + Amany | **blocked** — same collision |
| Arabic MSA | — | rejected, candidates above |
| Catalan | Enric + Alba? | needs your ear on Enric |
| Everything else | — | waiting for your listen |

**Four languages are done — locked, approved and rendered.** 435 clips for about 28 cents. Every
single clip is on exactly the pair you picked, with no stray voices leaking in.

**I checked for your click before releasing any of it.** I rendered a handful first and measured the
end of every clip: they finish in true silence, with no hard cut. No click. That fits what we already
knew — the click is an xAI-and-compressor problem, and these four are Azure. Nothing was repaired,
trimmed or patched; that lane stays abolished.

**Your Egyptian pair is confirmed.** Rex measures male, Eve measures female — exactly "the male and
the female" you described. The old page calling them both male was the labelling bug, not your ear.

---

## Three things that need you

### 1. French — did you mean the pool or production? (one word)

French is the only language in that batch with two competing sets of voices, and "approved as
sampled" didn't say which.

**My recommendation: the official pool pair, Henri + Celeste.** Every time you've meant the
production voices you've said so outright — Danish, Chinese. Every time you've meant the pool you've
said so too — Dutch. A bare "approved" has otherwise only ever landed on languages where the pool
pair was the *only* pair.

Worth knowing before you answer: the French production pair was **shown to you wrong**. It's Remi
(male) and Ara (female) — a proper pair — displayed as two males.

French has 284 existing clips, so I've locked the pool pair but **held the full render** until you
say. That costs one word; guessing wrong costs real money and a cleanup.

### 2. Regional variants can't hold separate casts — a real structural problem

Arabic MSA, Egyptian and Syrian are **three different rulings from you** that the system can only
store as **one**. They share a single casting slot, because it's keyed on the base language rather
than the course. Same for French and Québécois. German and Austrian German will collide the moment
you rule on German.

So I locked nothing for those four — locking one silently miscasts the others.

Three ways out, and it's your call:

- **Give regional variants their own language tag.** Cleanest, kills the whole class of bug, but it
  touches a field other code reads, so it wants its own careful pass.
- **Make manual voice picks stick.** The mechanism is half-built already — the picking works, it
  just isn't saved anywhere that survives a re-sync.
- **Leave it and re-fix after every sync.** That's today's behaviour, and it's exactly the
  "remember to redo it" step the approval system was built to remove.

My recommendation is the first one, as its own scoped job.

### 3. Dutch — your two rulings collide, and I've touched nothing

You ruled Dutch onto Bas + Lieke, which means re-rendering ~173 clips currently on the rejected
voices.

But under A-131 you also ruled, about one specific Dutch clip:

> "these are all correct but the original - which I don't believe I marked as wrong sounds best. All
> the others have a slight click off"

and that original was kept, permanently. It sits on one of the voices Dutch has now rejected. A
wholesale Dutch re-render would replace the exact clip you said must stay.

Those were two different decisions — one about a click on one clip, one about the language's voices —
and either reading is defensible. **It's your call.** Nothing about that clip has been touched.

Dutch is held behind the click bug anyway, exactly as you asked, so there's no rush on this.

---

## Also worth knowing

**Finnish's cast is unresolved.** Every speaker slot reads "deferred" — it was never actually cast.
It can't render until that's fixed, regardless of the voices being right.

**Chinese, Danish and Croatian carry extra voices.** Pods are meant to be one voice per gender, but
these have three or four, and Croatian has several seats on a completely different provider
(ElevenLabs) from the Azure pair you approved. They need a tidy-up pass onto your chosen pair before
they render — not a new decision from you, just work.

**Dutch is cheap, so cost isn't the reason to wait.** The whole Dutch re-render is between **9 and
37 cents**, measured from the pipeline's own pricing. The reasons to hold it are the click bug and
the A-131 clip above — both correctness, not money.

**Two content defects turned up while rendering.** One sentence (SC15-S012) has empty text in *all
four* languages — one defect copied across the pod source, not four coincidences. And there's a
second gate, separate from voice approval, that blocks unproofread target text from rendering; it
only caught a handful of lines here, but it will bite any bigger render.

**One voice to check with your ear: Bas.** He measures male, but by the narrowest margin of anyone
in the set. Worth thirty seconds before Dutch renders, since you're relying on him for the male half.

**No click repair will ever be done.** Your ruling stands: that lane is abolished. If fresh clips
carry the click, that's reported as a pipeline defect and stopped, never patched.
