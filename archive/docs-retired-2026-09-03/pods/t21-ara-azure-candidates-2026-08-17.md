# T-21 — where your casting decisions stand

You've now ruled as far as Korean — twenty-four languages. This page shows what's locked, what needs
one word from you, and — for Arabic MSA, which you rejected — eight fresh Azure voices for your ear.

**Rendering is stopped.** You told me the click fix failed your ear, so no bulk clip production is
happening on any locked language until the click job gives you a render you pass. Locking carries on.

**What needs you is in one place, at the bottom.** Everything above it is the state of the board.

---

## Your six screenshots — matched, and here's the full list to check

You asked me to match the voices in your pictures to their languages and to list everything I locked
so you can spot a mis-match at a glance. **All six matched to exactly one language each** — by clip
count and by pool name, both unique in every case. **Nothing here is a guess.**

| Your screenshot | Language | Locked as | What I rejected alongside it |
|---|---|---|---|
| `41321eb41295` + `3a7889066fa2` (133 + 130 clips) | **German** | Moritz (m) + **Lena (f)** | pool Felix + Sonja |
| `89q2pnko` + `ara` (99 + 65 clips) | **Hindi** | Karan (m) + **Ara (f)** | pool Vihaan + Priya |
| Leon + Giulia (pool) | **Italian** | Leon (m) + Giulia (f) | production `x7avnu1k` + Eve |
| Naoki + Mayu (pool) | **Japanese** | Naoki (m) + Mayu (f) | production `b1a7441b97a1` + Ara |
| `bf9fe5b5f981` (87 clips) | **Korean** | Jun-seo (m) | pool male Hyun-woo |
| YuJin (pool female) | **Korean** | YuJin (f) | production Ji-yeon |

**Your last two pictures are the same language.** Jun-seo and YuJin together give Korean a complete
pair — male from production, female from the pool, crossing the two blocks exactly like Chinese did.
So no gender is left open, and I didn't have to guess one.

Both mislabelled voices you'd have been shown as male — **Lena** in German and **Ji-yeon** in Korean
— behaved exactly as the label bug predicted. You picked Lena and rejected Ji-yeon, both on your ear.

### The rest of that stretch, approved as sampled

Five languages between German and Korean had no screenshot and no competing set of voices, so their
single pool pair stands:

| Language | Locked as |
|---|---|
| German — Austrian | Felix (m) + Sonja (f) |
| Greek | Nestoras (m) + Athina (f) |
| Hebrew | Avri (m) + Hila (f) |
| Icelandic | Gunnar (m) + Gudrun (f) |
| Irish | Colm (m) + Orla (f) |

Every one of those genders was re-checked against Azure's own records before locking, not taken from
the page you were shown.

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

Across the whole casting page, the "In production now" block called **all 41 voices male**. Not one
was labelled female. **Twenty of those 41 are actually women.**

**It wasn't our records — those were right all along.** We have a proper voice table with genders
taken straight from xAI's own system, and it correctly says these voices are female. Three other
places we store voice data agree. The page that was built for you simply never asked any of them: it
printed "male" for every production voice because it had nothing to go on and defaulted.

The giveaway is that the *other* half of the same page — the "official pool" voices — is 100%
correct. There, the gender is built into how the data is stored, so it came for free. Where it had
to be looked up, it was wrong every single time.

**Seven voices were mislabelled. You caught four by ear. Three more turned up when we checked:**

| Voice | Called | Actually | Where it shows up |
|---|---|---|---|
| Ara | male | **female** | 10 languages — Chinese, Danish, French, Japanese, Thai and more |
| Eve | male | **female** | 5 — Egyptian Arabic, Italian, Spanish and more |
| Noor | male | **female** | Dutch |
| Lena | male | **female** | German |
| **Ji-yeon** | male | **female** | **Korean** |
| **Aleksandra** | male | **female** | **Polish** |
| Alba | male | **female** | Catalan |

Corrected, the page reads 21 male and 20 female — roughly a pair per language, which is what you'd
expect and is itself a check that the answer is right.

This matters more than a paperwork tidy: **Ara and Eve alone carry pod work across 35 and 37
courses.** Judging voices off those male labels means reasoning about the wrong half of the estate.

**German proved the point.** Its production pair is **Moritz (male) and Lena (female)** — and the
old page showed you two males. You picked them anyway and called Lena female by ear, which is the
third time your ear has beaten the paperwork. Korean was the same: you rejected Ji-yeon, who is the
other voice that page mislabelled.

**The honest gap: I couldn't fix the page's builder, because it doesn't exist any more.** It was
never saved into the repo — only the page it produced was. There's nothing to recover and no other
live code doing the same thing. So the fix is a written requirement for whoever builds the next one:
read gender from the voice table, and show unknown as *unknown*, never as male. That last part is
what caused this — Azure voices currently have no gender recorded, and blank became "male".

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

Every lock records **how it was established** — your ear, or locked-unverified pending someone
else's. You can't personally referee 41 languages, and that field is what lets an unverified lock be
revisited later without anyone having to remember.

| Language | Cast | State |
|---|---|---|
| Armenian | Hayk + Anahit | locked, approved, **rendered** |
| Basque | Ander + Ainhoa | locked, approved, **rendered** |
| Bulgarian | Borislav + Kalina | locked, approved, **rendered** |
| Estonian | Kert + Anu | locked, approved, **rendered** |
| Greek | Nestoras + Athina | **locked, approved** — render held |
| Hebrew | Avri + Hila | **locked, approved** — render held |
| Icelandic | Gunnar + Gudrun | **locked, approved** — render held |
| Irish | Colm + Orla | **locked, approved** — render held |
| German — Austrian | Felix + Sonja | **locked, approved** — but see the German clash |
| Hindi | Karan + Ara | **locked** — needs a tidy-up pass first |
| Korean | Jun-seo + YuJin | **locked** — needs a tidy-up pass first |
| Italian | Leon + Giulia | **locked** — needs a tidy-up pass first |
| Japanese | Naoki + Mayu | **locked** — needs a tidy-up pass first |
| Chinese | Wei + Ara | **locked** — needs a tidy-up pass first |
| Danish | Kasper + Ara | **locked** — needs a tidy-up pass first |
| Croatian | Srecko + Gabrijela | **locked** — needs a tidy-up pass first |
| German | Moritz + Lena | ruled, **can't be locked yet** — clash below |
| Finnish | Harri + Selma | locked — its cast is unresolved, see below |
| French — Québécois | Antoine + Sylvie | locked, **unverified by ear** (your "no idea") |
| Dutch | Bas + Lieke | locked, render held; A-131 clash below |
| French | Henri + Celeste | locked, **needs one word from you** |
| Egyptian Arabic | Rex + Eve | ruled, **can't be locked yet** — clash below |
| Syrian Arabic | Laith + Amany | ruled, **can't be locked yet** — clash below |
| Arabic MSA | — | rejected; Azure candidates above |
| Catalan | Enric + Alba? | needs your ear on Enric |
| Everything else | — | waiting for your listen |

**Four languages are fully rendered** — 435 clips, about 28 cents, every clip on exactly your pair.
That was done before you ruled on the click, and it stands.

**Nothing else will render until you pass a click.** I've stopped bulk production everywhere. The
locks, the label fixes and small check-slices carry on, so no time is being lost.

I should correct something I told you earlier: I measured those first clips' endings and reported
them clean, and I said that meant Azure languages were safe from the click. **Your ear says
otherwise, so that measurement isn't a good enough release test.** The hold now covers everything,
not just xAI.

**"Needs a tidy-up pass" means:** the language is cast on three to six voices when a pod should have
exactly two. Italian and Japanese don't currently use your chosen voices *at all*. It's mechanical
work to converge them onto your pair — no decision needed from you.

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

### 2. Regional variants can't hold separate casts — and German just hit it

I flagged this last time as something that *would* bite when you ruled on German. **It just did.**

You've ruled German onto the production pair (Moritz + Lena) and Austrian German onto the pool pair
(Felix + Sonja) — opposite choices. But the system stores one casting slot for both, because it's
keyed on the base language rather than the course. Locking German's choice would recast Austrian
German onto Moritz and Lena, and vice versa.

Same problem, same cause, for Arabic MSA / Egyptian / Syrian — **three** different rulings from you
sharing **one** slot — and for French / Québécois.

So I locked nothing for those six. Locking one silently miscasts its siblings.

There's a small mercy on Austrian German: its stored voices happen to be Felix and Sonja already, so
it's currently correct — which is a second reason not to touch that slot.

Three ways out, and it's your call:

- **Give regional variants their own language tag.** Cleanest, kills the whole class of bug, but it
  touches a field other code reads, so it wants its own careful pass.
- **Make manual voice picks stick.** The mechanism is half-built already — the picking works, it
  just isn't saved anywhere that survives a re-sync.
- **Leave it and re-fix after every sync.** That's today's behaviour, and it's exactly the
  "remember to redo it" step the approval system was built to remove.

My recommendation is the first one, as its own scoped job. It's now blocking six languages rather
than four, so it's earned its place.

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
